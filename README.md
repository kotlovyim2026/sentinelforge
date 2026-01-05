# SentinelForge

**SentinelForge** is a **local-first SecOps platform** that demonstrates a modern security engineering stack:
**alert ingestion → incident triage → evidence-based explanation (RAG + Mock LLM) → SOAR playbooks → Zero-Trust policy enforcement**.

Designed as a **demo-ready** system that runs fully locally with Docker, without paid services.

## Highlights

-   **SOAR Playbooks**: deterministic executor with retries, backoff, and DLQ handling
-   **AI Assistant (Mock LLM)**: incident summaries with **citations** (evidence IDs), stored as **draft** and audited
-   **Zero-Trust Access Control**: RBAC + ABAC policy engine with **reasons** and **simulation**
-   **Event-driven**: RabbitMQ topic exchange, versioned events, idempotent consumers
-   **Production-ish Engineering**: health/readiness, structured logs + correlation IDs, tests (unit/integration/e2e), docs

---

## Architecture

### Services

| Service           | Tech                 | Purpose                                                  | Default Port |
| ----------------- | -------------------- | -------------------------------------------------------- | ------------ |
| `sf-web`          | Next.js (App Router) | UI: incidents, alerts, playbooks, policies, AI summaries | `3000`       |
| `sf-gateway`      | NestJS               | Auth, RBAC/ABAC enforcement, API for the UI, audit       | `3001`       |
| `sf-integrations` | Express              | Webhooks + connector endpoints; publishes events         | `3002`       |
| `sf-orchestrator` | FastAPI              | Playbook execution engine (steps, retries, state)        | `8001`       |
| `sf-ai`           | FastAPI              | RAG retrieval + **Mock LLM** summaries + citations       | `8002`       |

### Infrastructure (local)

-   **Postgres** (optionally with `pgvector`)
-   **Redis** (cache/locks/rate limiting, optional)
-   **RabbitMQ** (topic exchange + DLQ)

---

## Repository Layout

-   `apps/` – services (`sf-web`, `sf-gateway`, `sf-integrations`, `sf-orchestrator`, `sf-ai`)
-   `packages/`
    -   `contracts/` – event and API contracts (schemas + docs)
    -   `shared/` – shared TypeScript utilities (optional)
-   `tools/scripts/` – seed and demo runners
-   `infra/` – local infra config (RabbitMQ/DB init scripts, optional observability)
-   `docs/` – system design and security documentation
-   root – `docker-compose.yml`, `Makefile`, `.env.example`

---

## Quick Start (Local Demo)

### Prerequisites

-   Docker + Docker Compose
-   Node.js (for UI and TS tooling) + pnpm
-   Python (for FastAPI services) if running them outside Docker (optional)

### Run everything

1. Copy environment template:

-   create `.env` from `.env.example`

2. Start:

-   run `up` (via Makefile or your preferred command wrapper)

3. Open:

-   UI: `http://localhost:3000`
-   Gateway health: `http://localhost:3001/health`
-   Integrations health: `http://localhost:3002/health`
-   Orchestrator health: `http://localhost:8001/health`
-   AI health: `http://localhost:8002/health`
-   RabbitMQ UI: `http://localhost:15672` (default: `guest/guest`)

### Demo flow

-   `seed`: load demo data/scenarios
-   `demo`: sends a webhook → creates/updates an incident → generates AI summary → runs a playbook

---

## Core Flows

### 1) Ingestion & Triage

1. `sf-integrations` receives a webhook (`/webhooks/:provider`)
2. It publishes `alert.received.v1` to RabbitMQ
3. A consumer persists the alert, correlates it, and creates/updates an incident
4. UI shows the new incident and timeline events

### 2) Evidence & AI Explanation (Mock LLM)

-   Evidence (notes/log snippets/links) is chunked and indexed for retrieval
-   `sf-ai` returns a deterministic summary + **citations**
-   AI output is treated as **untrusted draft** and is audited

### 3) SOAR Playbooks

-   `sf-orchestrator` runs playbooks with:
    -   step state tracking
    -   retries + exponential backoff
    -   dead-lettering for poison/failing tasks
    -   idempotency on run requests (Idempotency-Key)

### 4) Zero-Trust Policies

-   `sf-gateway` enforces access control for critical actions:
    -   view evidence
    -   run playbook
    -   change severity
    -   manage integrations
    -   export incident
-   Policies are RBAC + ABAC and produce **allow/deny reasons**
-   Simulation endpoint allows checking impact before applying changes

---

## Eventing (RabbitMQ)

-   Exchange: `sf.events` (topic)
-   Events are **versioned** and **idempotent**.

### Example routing keys

-   `alert.received.v1`
-   `incident.created.v1`
-   `incident.updated.v1`
-   `playbook.run.requested.v1`
-   `playbook.step.completed.v1`

### Required event fields

-   `event_id` (unique)
-   `occurred_at` (ISO timestamp)
-   `org_id`
-   `schema_version`
-   `trace_id`

Dead-letter queues (DLQ) are used for messages that repeatedly fail processing.

---

## Security Model (high level)

-   Auth: access + refresh tokens with **HttpOnly cookie refresh rotation**
-   Access control: RBAC + ABAC policy engine with reasons & audit
-   Rate limiting (login, webhooks)
-   Input validation everywhere
-   Audit log for user actions and critical decisions
-   Secrets via environment variables (`.env.example` only committed)

---

## Testing Strategy

-   Unit tests: policy engine, correlator, playbook executor state machine
-   Integration tests: auth flows, ingestion, explain, playbook runs
-   E2E tests: main “webhook → incident → explain → run playbook” scenario

---

## Documentation

-   `docs/system-design.md` – C4 diagrams, bottlenecks, scaling plan
-   `docs/security.md` – threat model (light), OWASP mapping, mitigations
-   `docs/reliability.md` – retries, DLQ, idempotency strategy
-   `docs/policies.md` – policy DSL, examples, simulation semantics
-   `docs/eventing-contract.md` – exchange, routing keys, schemas

---

## Roadmap (MVP → Demo-ready)

-   [ ] Auth + org tenancy
-   [ ] RBAC + audit + correlation IDs
-   [ ] Webhook ingestion → MQ → incidents
-   [ ] Incident timeline + evidence
-   [ ] Playbook execution engine + retries/DLQ/idempotency
-   [ ] RAG retrieval + Mock LLM summaries with citations
-   [ ] ABAC enforcement + policy simulation & versioning
-   [ ] Tests + observability + portfolio packaging

---

## License

MIT (or choose your preferred license)

---

## Contact / Notes

This project is built as a portfolio-grade demonstration of fullstack + distributed systems fundamentals:
**API design, auth, eventing, reliability, security, testing, and system design.**
