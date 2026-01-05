# SentinelForge Reliability Guide

This document defines SentinelForge reliability principles and concrete implementation rules:
**retries, backoff, idempotency, dead-lettering, failure handling, and safe recovery**.

The system is built with the expectation that:

-   networks fail,
-   services restart,
-   messages duplicate,
-   dependencies become slow/unavailable.

---

## 1) Reliability Goals

-   Prevent data loss (where possible)
-   Guarantee safe processing under **at-least-once** delivery
-   Ensure failures are **observable**, **actionable**, and **recoverable**
-   Avoid cascading failures (backpressure, timeouts, rate limits)
-   Keep “demo-ready” local behavior close to production patterns

---

## 2) Reliability Pillars

1. **Idempotency**
    - duplicates are expected → processing must be safe
2. **Retries + Backoff**
    - transient errors recover automatically
3. **Dead-letter queues (DLQ)**
    - poison messages don’t block the pipeline
4. **Timeouts + Circuit breakers (lightweight)**
    - fail fast instead of stalling everything
5. **Observability**
    - correlation IDs, structured logs, and metrics

---

## 3) Failure Modes We Must Handle

### Messaging / Eventing

-   duplicate deliveries (redelivery)
-   consumer crash mid-processing
-   broker restart / network partition
-   poison message (bad payload)

### HTTP APIs

-   timeouts
-   429 / rate limits
-   5xx from downstream services
-   partial success (some steps succeed, others fail)

### Database

-   connection exhaustion
-   slow queries
-   migration mismatches
-   unique constraint collisions (often from idempotency)

---

## 4) Idempotency (Mandatory)

### 4.1 Why

RabbitMQ delivery is at-least-once → duplicates happen naturally after retries/redelivery.

### 4.2 Required patterns

#### A) Event consumer idempotency (MQ)

All consumers must:

-   treat `event_id` as **the idempotency key**
-   ensure each `event_id` is processed at most once per org

Recommended strategy:

-   **Durable**: store `(org_id, event_id)` in `processed_events` table with a unique constraint
-   **Fast but not durable**: Redis `SETNX` with TTL (acceptable for non-critical events)

#### B) API idempotency (HTTP)

For mutation endpoints that may be retried by clients:

-   support `Idempotency-Key` header (or request body key)
-   store key + result hash + timestamp
-   return the same result when repeated with the same key

Use cases:

-   playbook run requests
-   incident export
-   evidence creation (if user can double-submit)

---

## 5) Retry Policy (Standard)

### 5.1 When to retry

Retry only on **transient** failures:

-   network errors
-   timeouts
-   429 / rate limits (respect `Retry-After` if provided)
-   5xx errors (if safe)

Do not retry on:

-   validation errors (4xx)
-   auth errors (401/403)
-   schema incompatibility (poison messages)
-   permanently failing business logic (unless compensating strategy exists)

### 5.2 Retry schedule (default)

-   Max attempts: **5**
-   Backoff: exponential with jitter
    -   attempt 1: 1s
    -   attempt 2: 5s
    -   attempt 3: 15s
    -   attempt 4: 60s
    -   attempt 5: 120s

If all attempts fail:

-   **dead-letter** the message/job

---

## 6) DLQ / Dead-Lettering

### 6.1 Purpose

DLQ prevents poison messages from:

-   blocking queues,
-   causing infinite redelivery loops,
-   hiding broken payloads.

### 6.2 Structure (recommended)

-   DLX exchange: `sf.dlx`
-   DLQ queue per consumer queue:
    -   consumer queue: `sf.orchestrator.playbooks.requests.v1`
    -   dlq queue: `sf.dlq.sf.orchestrator.playbooks.requests.v1`

### 6.3 What to do with DLQ messages

-   expose DLQ count in UI/admin page (later)
-   provide “requeue” action (manual) (later)
-   record failure reason and attempt count in logs and/or a DB table

---

## 7) Timeouts and Backpressure

### 7.1 Timeouts (required)

Every outbound HTTP call must set timeouts:

-   connect timeout
-   read timeout
-   total deadline

Every DB operation should avoid unbounded time:

-   ensure indexes for paginated queries
-   avoid full table scans in hot paths

### 7.2 Backpressure

If downstream is slow/unavailable:

-   stop producing more work (where possible)
-   push work to MQ (async) rather than synchronous fan-out
-   use bounded concurrency for consumers/workers

---

## 8) Service Health: Liveness vs Readiness

### Liveness (`/health`)

Answers:

> “Is the process alive?”

Should not depend on external services (DB/MQ). It can be simple.

### Readiness (`/ready`)

Answers:

> “Can this service do real work right now?”

Should check:

-   DB connection (for services that require DB)
-   MQ connection (for consumers/publishers)
-   Redis if used for locks/rate limits

**Kubernetes-like semantics** even in local Docker improves engineering clarity.

---

## 9) Correlation IDs & Structured Logging

### 9.1 Required identifiers

-   `trace_id` — across services (propagate via headers and event payload)
-   `request_id` — for HTTP requests (gateway-generated)
-   `event_id` — for MQ messages

### 9.2 Logging requirements

Every error log must include:

-   service name
-   severity level
-   `trace_id`
-   operation name
-   resource IDs (incident_id, run_id, etc.) if safe
-   error reason

Avoid:

-   secrets
-   access/refresh tokens
-   raw credentials

---

## 10) Playbook Executor Reliability (sf-orchestrator)

Playbooks are long-running and failure-prone by nature.

### 10.1 State machine

Each run must track:

-   run status: `queued | running | succeeded | failed | cancelled`
-   step status per step: `pending | running | succeeded | failed | skipped`
-   timestamps for each transition

### 10.2 Exactly-once _effect_ (not delivery)

We aim for **idempotent effects**, not exactly-once delivery:

-   a step must be safe to re-run
-   side effects should be protected with idempotency keys

### 10.3 Resume / partial retry

Allow:

-   retry from failed step (manual or automatic)
-   continue without repeating succeeded steps (based on stored state)

---

## 11) Incident Triage Reliability

### 11.1 Dedupe rules

Alerts may come in duplicates. Use:

-   `source_event_id` or `event_id` unique constraints
-   incident correlation key (e.g., `org_id + type + entity_id + time_window`)

### 11.2 Safe updates

Incident updates should be:

-   patch-based (store “what changed”)
-   audited (who/why)
-   conflict-safe (optimistic concurrency recommended later)

---

## 12) Data Safety & Consistency

### 12.1 Transaction boundaries

When consuming an event:

-   validate payload
-   run idempotency check
-   write domain data + processed_event record in the same transaction (when possible)

### 12.2 Event vs DB consistency

SentinelForge is **eventually consistent** across services. The UI should:

-   handle brief delays
-   show “processing…” states when needed
-   never assume instant cross-service propagation

---

## 13) Recovery Playbooks (Operational)

### If a queue grows rapidly

-   check consumer is running
-   inspect errors and DLQ counts
-   reduce producer rate (if possible)
-   validate downstream dependencies (DB, external HTTP)

### If DLQ contains messages

-   inspect `event_id`, error reason
-   fix consumer bug or schema mismatch
-   requeue after fix (manual operation)
-   add tests to prevent regression

### If DB becomes slow

-   check query patterns (pagination, sorting)
-   add missing indexes
-   reduce N+1 patterns (gateway)
-   profile hot endpoints

---

## 14) Minimal “Reliability Checklist” per feature

-   [ ] Idempotency key defined (event_id / header)
-   [ ] Retries policy defined for transient errors
-   [ ] DLQ configured and documented
-   [ ] Timeouts added on outbound calls
-   [ ] Structured logs include trace_id/event_id
-   [ ] Health + readiness behavior makes sense
-   [ ] At least one integration test covers failure path

---
