# SentinelForge Policies (RBAC + ABAC)

This document defines the **Zero-Trust policy model** in SentinelForge:

-   **RBAC** (roles) for coarse access control
-   **ABAC** (attributes) for contextual decisions
-   **Policy decisions are explainable** (allow/deny + reason)
-   **Policies are versioned** and support **simulation** before applying changes

---

## 1) Goals

-   Enforce access control consistently across the system
-   Provide **clear reasons** for allow/deny decisions
-   Support **safe change management** via:
    -   version history
    -   diff/audit
    -   simulation (“what would happen if we change this?”)
-   Keep a **small, comprehensible DSL** that is easy to implement and test

---

## 2) Core Concepts

### Subject

The actor making a request (typically a user).
Example attributes:

-   `subject.user_id`
-   `subject.org_id`
-   `subject.roles[]` (e.g. `admin`, `analyst`, `viewer`)
-   `subject.team_id` (optional)
-   `subject.is_oncall` (optional)
-   `subject.mfa_enabled` (optional)

### Resource

The object being accessed.
Examples:

-   Incident, Evidence, Integration, Playbook, Policy, Audit logs

Common resource attributes:

-   `resource.org_id`
-   `resource.owner_id`
-   `resource.team_id`
-   `resource.severity` (for incidents)
-   `resource.status`

### Action

An operation being attempted.
Examples:

-   `incident.read`
-   `incident.update`
-   `evidence.read`
-   `playbook.run`
-   `integration.manage`
-   `policy.manage`
-   `policy.simulate`

### Context

Additional runtime info:

-   `context.ip`
-   `context.user_agent`
-   `context.time`
-   `context.request_id / trace_id`
-   `context.environment` (local/dev/prod)
-   `context.auth_strength` (e.g. `password`, `mfa`)

---

## 3) Decision Model

A policy evaluation returns:

-   `decision`: `allow` | `deny`
-   `reason`: a short, human-readable explanation
-   `rule_id`: which rule matched (for auditing & debugging)

**Default behavior:** `deny` (Zero-Trust default deny)

**Order:** rules are evaluated top-to-bottom (first match wins), unless stated otherwise.

---

## 4) Policy Units

SentinelForge uses two layers:

1. **RBAC baseline**
    - Quick deny/allow based on role + org
2. **ABAC rules**
    - Fine-grained decisions based on incident severity, ownership, team, on-call, etc.

RBAC is not enough for Zero-Trust. ABAC handles rules like:

-   “Analysts may run playbooks only for severity <= High”
-   “Viewers can read incidents but cannot view evidence content”
-   “Only on-call analysts can set severity to Critical”
-   “Only admins can manage integrations and policies”

---

## 5) Actions Catalog (MVP)

### Incidents

-   `incident.read`
-   `incident.update` (status/severity/assignee)
-   `incident.export`

### Evidence

-   `evidence.read`
-   `evidence.add`

### Playbooks

-   `playbook.read`
-   `playbook.run`

### Integrations

-   `integration.read`
-   `integration.manage`

### Policies

-   `policy.read`
-   `policy.manage`
-   `policy.simulate`

### Audit

-   `audit.read`

---

## 6) Policy DSL (Minimal JSON)

Policies are stored as JSON documents.

### 6.1 Policy structure

```json
{
    "policy_id": "policy-001",
    "name": "Default SentinelForge Policy",
    "enabled": true,
    "version": 1,
    "rules": [
        {
            "rule_id": "r-1",
            "description": "Admins can do anything in their org",
            "effect": "allow",
            "when": {
                "all": [
                    { "eq": ["subject.org_id", "resource.org_id"] },
                    { "includes": ["subject.roles", "admin"] }
                ]
            }
        }
    ],
    "default": {
        "effect": "deny",
        "reason": "No matching policy rule"
    }
}
```

### 6.2 Condition operators

Supported operators (MVP):

**Comparison**

-   `eq: [left, right]` — equals
-   `ne: [left, right]` — not equals
-   `lt: [left, right]` — less than
-   `lte: [left, right]` — less than or equal
-   `gt: [left, right]` — greater than
-   `gte: [left, right]` — greater than or equal

**Set / membership**

-   `includes: [arrayPath, value]` — array contains value  
    Example: `{ "includes": ["subject.roles", "admin"] }`
-   `in: [valueOrPath, arrayOrPath]` — value in array  
    Example: `{ "in": ["action", ["incident.read", "incident.update"]] }`

**Logical**

-   `all: [cond1, cond2, ...]` — AND
-   `any: [cond1, cond2, ...]` — OR
-   `not: cond` — NOT

**Paths**
Paths use dotted notation:

-   `subject.roles`
-   `resource.severity`
-   `context.auth_strength`

Notes:

-   `left` can be a path (`resource.severity`) or a literal (`4`)
-   `right` can be a path or a literal
-   If a path is missing, treat it as `null` (recommended) and evaluate safely

---

## 7) Example Policies (MVP-ready)

### 7.1 Viewer access (read-only incidents, no evidence content)

-   Viewer can read incidents in org
-   Viewer cannot read evidence content

```json
{
    "rule_id": "r-viewer-incidents-read",
    "description": "Viewers can read incidents in their org",
    "effect": "allow",
    "when": {
        "all": [
            { "eq": ["subject.org_id", "resource.org_id"] },
            { "includes": ["subject.roles", "viewer"] },
            { "eq": ["action", "incident.read"] }
        ]
    }
}
```

```json
{
    "rule_id": "r-viewer-evidence-deny",
    "description": "Viewers cannot read evidence content",
    "effect": "deny",
    "reason": "Viewers are not allowed to access evidence",
    "when": {
        "all": [
            { "includes": ["subject.roles", "viewer"] },
            { "eq": ["action", "evidence.read"] }
        ]
    }
}
```

### 7.2 Analyst can run playbooks only up to High severity

Assume severity scale: `1=Low ... 4=High ... 5=Critical`

```json
{
    "rule_id": "r-analyst-run-playbook-max-high",
    "description": "Analysts can run playbooks only for severity <= 4",
    "effect": "allow",
    "when": {
        "all": [
            { "eq": ["subject.org_id", "resource.org_id"] },
            { "includes": ["subject.roles", "analyst"] },
            { "eq": ["action", "playbook.run"] },
            { "lte": ["resource.severity", 4] }
        ]
    }
}
```

### 7.3 Only on-call analysts can set severity to Critical

```json
{
    "rule_id": "r-analyst-critical-oncall-only",
    "description": "Only on-call analysts can set severity to Critical",
    "effect": "allow",
    "when": {
        "all": [
            { "eq": ["subject.org_id", "resource.org_id"] },
            { "includes": ["subject.roles", "analyst"] },
            { "eq": ["action", "incident.update"] },
            { "eq": ["context.requested_severity", 5] },
            { "eq": ["subject.is_oncall", true] }
        ]
    }
}
```

---

## 8) Enforcement Points (Where policies are applied)

### Gateway as Policy Enforcement Point (PEP)

`sf-gateway` is the primary **Policy Enforcement Point**:

-   receives user requests from UI
-   loads subject/resource/context
-   calls policy engine
-   allows/denies and returns reason
-   records `PolicyDecision` and `AuditLog`

### Policy Engine as PDP

Policy engine acts as **Policy Decision Point**:

-   evaluates policy document against (subject, action, resource, context)
-   returns decision + reason + rule_id

---

## 9) Policy Decisions & Auditing

Every evaluated critical action should record:

-   `policy_decision_id`
-   `occurred_at`
-   `org_id`
-   `subject.user_id`
-   `action`
-   `resource_type`, `resource_id`
-   `decision` (allow/deny)
-   `reason`
-   `rule_id`
-   `trace_id` / `request_id`

**Do not store secrets** in decision records.

---

## 10) Policy Versioning

Policies are immutable once published:

-   Each edit creates a new version: `version = version + 1`
-   `enabled` flag applies per version (only one active version per policy_id)
-   History is kept for:
    -   diffs
    -   rollback
    -   compliance/audit

Minimal version metadata:

-   `version`
-   `created_at`
-   `created_by`
-   `change_summary`

---

## 11) Policy Simulation

Simulation answers:

> “If we apply this policy version, what decisions will it produce for these scenarios?”

### Simulation input

A simulation request contains:

-   a candidate policy document (draft version)
-   a list of scenarios:
    -   `subject`, `action`, `resource`, `context`

### Simulation output

For each scenario:

-   `decision`
-   `reason`
-   `rule_id`

**Simulation never writes audit logs as real decisions** (it may have a separate simulation log).

---

## 12) Implementation Notes (Practical)

### Default deny

Always enforce:

-   if policy engine errors → deny + safe reason
-   if resource cannot be loaded → deny (or not found, depending on API semantics)

### Performance

-   Cache the active policy version per org
-   Invalidate cache when policies change

### Simplicity

Keep DSL small.
Most “power” comes from:

-   good action taxonomy
-   consistent subject/resource context building

---

## 13) Checklist for Adding a New Protected Action

-   [ ] Define the new `action` string
-   [ ] Define what resource attributes are needed for ABAC
-   [ ] Add enforcement in gateway (PEP)
-   [ ] Add at least one policy rule + tests
-   [ ] Ensure decision is recorded (PolicyDecision + AuditLog)
-   [ ] Add simulation scenarios for the new action

---
