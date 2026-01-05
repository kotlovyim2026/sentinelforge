# SentinelForge Eventing Contract (RabbitMQ)

This document defines the **event-driven contract** used across SentinelForge services via RabbitMQ.
The goal is to keep eventing **predictable, versioned, idempotent**, and **safe to evolve**.

---

## 1) Goals

-   **Loose coupling** between services (publish/consume via events)
-   **Versioned schemas** so we can evolve without breaking consumers
-   **Idempotency by design** (at-least-once delivery is expected)
-   **Observable and debuggable** (trace/correlation identifiers)
-   **Failure-safe** with DLQ (dead-letter queues)

---

## 2) Messaging Topology

### Exchange

-   **Name:** `sf.events`
-   **Type:** `topic`
-   **Durable:** yes

### Queues (consumer-owned)

Each consuming service owns its own queue(s). Producers never publish directly to a queue.

Recommended naming:

-   `sf.<service>.<domain>.<purpose>.v1`

Examples:

-   `sf.ai.alerts.ingest.v1`
-   `sf.gateway.audit.ingest.v1`
-   `sf.orchestrator.playbooks.requests.v1`

### Bindings

Queues bind to `sf.events` using routing keys (see section 3).

---

## 3) Routing Key Convention

Format:
<domain>.<event>.<version>

Examples:

-   `alert.received.v1`
-   `incident.created.v1`
-   `incident.updated.v1`
-   `evidence.added.v1`
-   `playbook.run.requested.v1`
-   `playbook.step.completed.v1`
-   `policy.decision.recorded.v1`

**Rules**

-   `domain` is a bounded-context noun (alert, incident, playbook, policy, evidence, audit)
-   `event` is a past-tense verb phrase (received, created, updated, requested, completed, failed)
-   `version` is `vN` (start with `v1`)

---

## 4) Delivery Semantics

-   **At-least-once delivery** is expected (duplicates may occur).
-   Consumers **must be idempotent**:
    -   deduplicate by `event_id`
    -   store processed event ids (short TTL cache or DB table), or use unique constraints where possible
-   Ordering is **not guaranteed** globally.
-   A single queue preserves ordering **per consumer**, but retries/redelivery may reorder.

---

## 5) Event Envelope (Required Fields)

All events must include the following fields:

| Field            | Type   | Required | Notes                                                         |
| ---------------- | ------ | -------: | ------------------------------------------------------------- |
| `event_id`       | string |       ✅ | Unique per event. Use a UUID or stable id from source.        |
| `schema_version` | number |       ✅ | Schema version (e.g. `1`). Separate from routing key version. |
| `occurred_at`    | string |       ✅ | ISO-8601 timestamp when the event happened.                   |
| `org_id`         | string |       ✅ | Tenant/org identifier.                                        |
| `trace_id`       | string |       ✅ | End-to-end correlation id across services.                    |
| `producer`       | string |       ✅ | Service name producing the event (`sf-integrations`, etc.).   |

Recommended (optional) fields:

| Field        | Type   | Notes                                         |
| ------------ | ------ | --------------------------------------------- |
| `request_id` | string | If produced in response to an HTTP request.   |
| `actor`      | object | Who/what triggered the action (user/service). |
| `meta`       | object | Debug-only metadata (avoid secrets).          |

---

## 6) Message Properties (RabbitMQ headers)

When publishing, use these RabbitMQ message properties consistently:

-   `contentType`: `application/json`
-   `messageId`: same as `event_id`
-   `timestamp`: publish timestamp (optional)
-   `headers.trace_id`: same as `trace_id` (optional but helpful)
-   `headers.schema_version`: numeric schema version (optional redundancy)

---

## 7) Schema Evolution Rules

### Backward compatibility (default)

When making changes to `v1`:

-   ✅ Add optional fields
-   ✅ Add new routing keys for new event types
-   ✅ Add new consumers/queues without changing producers

Avoid within the same `v1`:

-   ❌ Removing fields
-   ❌ Renaming fields
-   ❌ Changing field meaning/type

### Breaking changes

If you must break:

-   Create `v2` routing key (e.g. `alert.received.v2`)
-   Keep publishing `v1` and `v2` during a transition window
-   Migrate consumers then stop `v1`

---

## 8) Dead-Lettering (DLQ)

### Purpose

DLQ captures messages that repeatedly fail processing (poison messages).

### Recommended setup

-   DLX exchange: `sf.dlx`
-   DLQ queues: `sf.dlq.<consumer-queue-name>`

Example:

-   consumer queue: `sf.ai.alerts.ingest.v1`
-   dlq queue: `sf.dlq.sf.ai.alerts.ingest.v1`

### Retry strategy (guideline)

-   Max attempts: 5 (configurable per consumer)
-   Backoff: exponential (e.g. 1s, 5s, 15s, 60s, 120s)
-   After max attempts: dead-letter the message

**Consumer must log**:

-   `event_id`, `trace_id`, `routing_key`, `queue`, attempt count, error reason

---

## 9) Idempotency Strategy

### Required

Consumers must ensure processing is safe on redelivery.

Acceptable approaches:

1. **DB unique constraint** on `(org_id, event_id)` in a `processed_events` table
2. **Redis SETNX**/cache with TTL for `event_id` (fast, but not durable)
3. **Natural idempotency** via unique keys in domain tables (e.g. alerts unique by `source_event_id`)

Recommendation:

-   Use durable dedup (DB) for core events (`alert.received`, `incident.created/updated`)
-   Use Redis TTL dedup for high-volume, non-critical events

---

## 10) Security & Privacy

-   Never put secrets in event payloads.
-   Avoid raw credentials, tokens, or PII unless strictly required.
-   For sensitive evidence, store the content in DB/object storage and publish only a reference (IDs).

---

## 11) Standard Events (v1)

Below is the initial v1 set. Payload schemas can live under `packages/contracts/`.

### 11.1 `alert.received.v1`

**Producer:** `sf-integrations`  
**Consumers:** incident triage worker (initially can live in gateway or ai-service)

**Intent:** a normalized alert was received.

Payload (minimum):

-   `alert`: normalized alert object
    -   `alert_id` (string) — optional if generated later
    -   `source` (string) — provider name (e.g. `generic`, `siem-mock`)
    -   `type` (string) — category (e.g. `bruteforce`, `suspicious_ip`)
    -   `severity` (number) — 1..5 or similar scale
    -   `summary` (string) — short human text
    -   `raw` (object) — original payload (optional; consider size limits)

### 11.2 `incident.created.v1`

**Producer:** triage worker  
**Consumers:** `sf-gateway` (for timeline), `sf-web` (via API polling)

Payload (minimum):

-   `incident_id` (string)
-   `title` (string)
-   `severity` (number)
-   `status` (string)
-   `related_alert_ids` (string[])

### 11.3 `incident.updated.v1`

**Producer:** triage worker / gateway  
**Consumers:** timeline/audit listeners

Payload (minimum):

-   `incident_id` (string)
-   `changes` (object) — patch-like structure
-   `reason` (string) — optional

### 11.4 `playbook.run.requested.v1`

**Producer:** `sf-gateway`  
**Consumer:** `sf-orchestrator`

Payload (minimum):

-   `run_id` (string) — idempotent run identifier
-   `incident_id` (string)
-   `playbook_id` (string)
-   `idempotency_key` (string)

### 11.5 `playbook.step.completed.v1`

**Producer:** `sf-orchestrator`  
**Consumers:** gateway/timeline

Payload (minimum):

-   `run_id` (string)
-   `step_id` (string)
-   `status` (`success` | `failed`)
-   `output` (object, optional)

---

## 12) Operational Checklist

Before adding a new event:

-   [ ] Define routing key and version
-   [ ] Define payload schema (and where it is stored)
-   [ ] Define producer and consumer(s)
-   [ ] Define idempotency key strategy
-   [ ] Define retry/DLQ behavior
-   [ ] Add logging fields (`event_id`, `trace_id`, routing key)

---

## 13) FAQ

### Why topic exchange?

Topic routing supports clean fan-out patterns and flexible subscriptions without coupling producers to consumer queues.

### Why version in routing key AND schema_version?

-   Routing key version = contract version for consumers (breaking changes).
-   `schema_version` = internal schema iteration, useful for parsers/validators.

### Do we guarantee ordering?

No. Build consumers to handle out-of-order events safely.

---
