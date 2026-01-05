# SentinelForge Security Guide

This document describes the security model and implementation rules for SentinelForge.
It is intentionally **practical** and mapped to common security expectations for backend/fullstack interviews.

SentinelForge is a demo platform, but it should behave like a production-grade system:

-   **default deny**
-   strong **authentication**
-   strict **authorization**
-   consistent **input validation**
-   safe **secrets handling**
-   auditable actions
-   predictable **rate limits**
-   hardened HTTP defaults

---

## 1) Threat Model (Light)

### Assets we protect

-   user accounts (sessions, refresh tokens)
-   incidents, evidence, playbook runs
-   policy definitions and policy history
-   integration credentials (even if mocked)

### Primary attackers

-   anonymous internet user
-   authenticated low-privilege user (viewer) trying to escalate
-   token/session theft attempt
-   abuse via webhook endpoints (spam, oversized payloads)

### High-risk areas

-   auth endpoints (login/refresh)
-   integration webhooks (untrusted input)
-   evidence access (sensitive data)
-   playbook runs (actions with side effects)
-   policy management (authorization & tampering)

---

## 2) Authentication (AuthN)

### 2.1 Sessions and tokens

SentinelForge uses:

-   access token (short TTL) for API calls
-   refresh token (longer TTL) stored as **HttpOnly cookie**

**Rules**

-   Refresh token must be:
    -   `HttpOnly`
    -   `Secure` (in real HTTPS)
    -   `SameSite=Lax` or `Strict` (choose based on UI hosting plan)
-   Access token should be short-lived (e.g. 5–15 minutes)
-   Refresh rotation:
    -   refresh token is replaced on every refresh
    -   previous refresh token is invalidated

### 2.2 Passwords

-   store only password hashes (bcrypt/argon2)
-   enforce basic password policy (length, common password checks optional)
-   lockout or rate limiting on repeated failures

### 2.3 CSRF

If using cookie-based auth for API:

-   protect state-changing routes with:
    -   `SameSite` + CSRF token (double-submit) OR
    -   only allow same-origin requests + strict CORS

---

## 3) Authorization (AuthZ): RBAC + ABAC

### 3.1 Default deny

If no rule matches → deny.
If policy engine errors → deny with safe reason.

### 3.2 Enforced at the Gateway (PEP)

All sensitive operations must be enforced server-side in `sf-gateway`:

-   viewing evidence content
-   exporting incidents
-   running playbooks
-   managing integrations
-   managing policies

### 3.3 Explainability

Every decision should include:

-   allow/deny
-   reason
-   matched rule_id (internal)
-   should be recorded in PolicyDecision/Audit for sensitive actions

---

## 4) Input Validation & Data Handling

### 4.1 Validate all untrusted input

-   Webhooks: always validate schema, size, types
-   API requests: DTO validation (Nest) / Pydantic (FastAPI)
-   Query params: pagination filters, sorting keys must be whitelisted

### 4.2 Payload size limits

To prevent abuse:

-   set max JSON body size on webhooks and APIs
-   reject oversized payloads with clear errors

### 4.3 Output encoding

-   avoid returning raw HTML
-   sanitize user-supplied text before rendering in UI if it can contain markup

---

## 5) OWASP Top 10 Mapping (Practical)

This is not an exhaustive OWASP paper—just the core areas SentinelForge should demonstrate.

### A01: Broken Access Control

-   RBAC + ABAC enforced server-side
-   deny by default
-   verify `org_id` boundaries on every resource access
-   do not rely on UI state for permissions

### A02: Cryptographic Failures

-   HttpOnly cookies
-   avoid storing secrets in logs
-   use TLS in real deployment (local can be HTTP)

### A03: Injection

-   parameterized DB access (ORM/Prisma/SQLAlchemy)
-   never string-concatenate SQL
-   validate and whitelist query params (sort/filter)

### A05: Security Misconfiguration

-   safe defaults (helmet, secure headers)
-   no stack traces in production mode
-   environment-based configs

### A07: Identification and Authentication Failures

-   refresh rotation
-   rate limits for login
-   password hashing

### A09: Security Logging and Monitoring Failures

-   audit log for sensitive actions
-   structured logs with trace_id/request_id
-   track policy decisions

---

## 6) HTTP Security Defaults

### 6.1 Security headers

Gateway and web should enforce:

-   `X-Content-Type-Options: nosniff`
-   `X-Frame-Options: DENY` (or SAMEORIGIN if needed)
-   `Referrer-Policy: no-referrer` (or strict-origin-when-cross-origin)
-   `Content-Security-Policy` (later; can be minimal for MVP)

### 6.2 CORS

-   allow only the UI origin
-   do not use `*` with credentials
-   keep preflight behavior predictable

---

## 7) Rate Limiting & Abuse Prevention

### 7.1 Rate limit critical endpoints

-   `/auth/login`: strict
-   `/auth/refresh`: moderate
-   `/webhooks/*`: strict per org/provider/source ip

### 7.2 Brute force protection

-   incremental backoff on login failures
-   temporary lockouts (optional)
-   audit suspicious activity

---

## 8) Secrets Handling

### Rules

-   no secrets committed to git
-   `.env.example` is committed, `.env` is not
-   integration secrets (if introduced) must be stored encrypted or mocked
-   never log:
    -   access tokens
    -   refresh tokens
    -   credentials
    -   API keys

---

## 9) Audit Trail

### What to audit (minimum)

-   login/logout/refresh events (at least login failures)
-   evidence read (sensitive)
-   playbook run requests + outcomes
-   policy changes and simulations
-   role changes / user management

Audit fields:

-   who (user_id / actor)
-   what (action)
-   resource (type/id)
-   when (timestamp)
-   trace_id/request_id
-   outcome (allowed/denied, reason)

---

## 10) Event Security (RabbitMQ)

-   Do not publish secrets in event payloads
-   Keep event schema minimal: references over raw sensitive content
-   Validate message schema on consumer side
-   Use DLQ for poison messages
-   For critical events, use durable idempotency (DB unique key)

---

## 11) AI Safety (Mock LLM still needs guardrails)

Even with a mock model, follow the correct mental model:

-   AI output is **untrusted**
-   store AI results as **draft**
-   require user confirmation for actions with side effects
-   always provide **citations** to evidence IDs
-   store generation metadata (who requested, trace_id, time)

---

## 12) Security Checklist (MVP)

-   [ ] Cookie-based refresh rotation implemented
-   [ ] CORS restricted to UI origin
-   [ ] RBAC + ABAC enforced server-side (default deny)
-   [ ] Input validation on all endpoints (including webhooks)
-   [ ] Body size limits set
-   [ ] Rate limiting on login and webhooks
-   [ ] Audit log for sensitive actions
-   [ ] No secrets in git, no secrets in logs
-   [ ] DLQ configured for MQ consumers
-   [ ] AI output stored as draft + citations

---
