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

### 2.1 Auth flows & cookies

SentinelForge implements a secure, cookie-based authentication system with refresh token rotation to protect against token theft and replay attacks.

#### Architecture

**Components:**
- **Access Token**: Short-lived JWT (15 minutes) stored in HttpOnly cookie
- **Refresh Token**: Long-lived random token (7 days) stored in HttpOnly cookie, hashed in database
- **Session Model**: Database-backed sessions with rotation tracking

**Token Flow:**

```
1. Registration/Login
   ├─> Create User + Organization (for registration)
   ├─> Generate refresh token (64-byte random)
   ├─> Hash refresh token (SHA-256) → store in DB
   ├─> Create Session record (status: active)
   ├─> Generate Access Token (JWT) with session ID
   └─> Set both as HttpOnly cookies

2. API Request (Protected Endpoint)
   ├─> Extract access_token from cookie
   ├─> Validate JWT signature & expiration
   ├─> Verify user still exists and has org membership
   └─> Allow request with user context

3. Token Refresh (Rotation)
   ├─> Extract refresh_token from cookie
   ├─> Hash token and lookup in DB (status: active)
   ├─> Validate not expired
   ├─> Mark old session as "rotated"
   ├─> Generate NEW refresh token
   ├─> Create NEW session (linked to old via rotatedFromId)
   ├─> Update old session with rotatedToId
   ├─> Generate NEW access token
   └─> Return new cookies

4. Token Reuse Detection (Security)
   ├─> User attempts refresh with OLD token
   ├─> Hash token → find session (status: rotated/revoked)
   ├─> SECURITY BREACH DETECTED
   ├─> Revoke ALL active sessions for user+org (status: compromised)
   ├─> Log audit event
   └─> Return 401 Unauthorized

5. Logout
   ├─> Extract access token to get session ID
   ├─> Mark session as "revoked" (revokedAt: now)
   ├─> Clear cookies
   └─> Log audit event
```

#### Security Properties

**Cookie Configuration:**
```javascript
{
  httpOnly: true,        // No JavaScript access (XSS protection)
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  maxAge: <appropriate>  // 15min (access) / 7days (refresh)
}
```

**Why Refresh Rotation?**
- **Prevents Token Theft**: Stolen refresh token is immediately invalidated on next legitimate use
- **Detects Replay Attacks**: Reuse of rotated token triggers full session revocation
- **Limits Blast Radius**: Only 1 active refresh token per session at any time
- **Audit Trail**: Complete rotation chain tracked via `rotatedFromId` / `rotatedToId`

**Session States:**
- `active`: Currently valid and usable
- `rotated`: Was valid but replaced by rotation
- `revoked`: Explicitly logged out or expired
- `compromised`: Detected reuse attack - all user sessions invalidated

#### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **XSS Token Theft** | HttpOnly cookies prevent JavaScript access |
| **CSRF** | SameSite=Lax + CORS origin validation with credentials |
| **Refresh Token Reuse** | Rotation detection → revoke all sessions |
| **Token Exposure in Logs** | Only hashes stored/logged, never raw tokens |
| **Brute Force** | Rate limiting: 5 login attempts/min |
| **Long-lived Access** | Access tokens expire in 15min |
| **Concurrent Login Abuse** | Each session tracked independently with IP/UA |

#### Database Schema

```prisma
model Session {
  id                String        @id @default(uuid())
  orgId             String
  userId            String
  
  refreshTokenHash  String        // SHA-256 hash of refresh token
  status            SessionStatus @default(active)
  
  rotatedFromId     String?       // Previous session in rotation chain
  rotatedToId       String?       // Next session in rotation chain
  
  ip                String?
  userAgent         String?
  
  createdAt         DateTime      @default(now())
  lastUsedAt        DateTime?
  expiresAt         DateTime
  revokedAt         DateTime?
  
  // Relations for rotation chain
  rotatedFrom       Session?      @relation("SessionRotationFrom")
  rotatedTo         Session?      @relation("SessionRotationTo")
}
```

#### API Endpoints

- **POST /auth/register**: Create org + user, return cookies
- **POST /auth/login**: Authenticate, return cookies
- **POST /auth/refresh**: Rotate tokens (uses refresh_token cookie)
- **POST /auth/logout**: Revoke session, clear cookies
- **GET /auth/me**: Return user info (requires access_token)

All endpoints audit to `AuditLog` with IP, user-agent, and outcome.

### 2.2 Legacy Notes (maintained for reference)

SentinelForge previously used basic session guidelines. The comprehensive implementation is now documented in section 2.1.

**Key Requirements Met:**

-   Refresh token stored as HttpOnly cookie ✓
-   Secure flag enabled in production ✓
-   SameSite=Lax for CSRF protection ✓
-   Access token short-lived (15 minutes) ✓
-   Refresh rotation implemented ✓
-   Previous refresh token invalidated on rotation ✓

### 2.3 Passwords

-   store only password hashes (bcrypt with cost factor 12) ✓
-   enforce password policy: 8+ chars, uppercase, lowercase, number, special character ✓
-   rate limiting on login failures (5 attempts per minute) ✓

### 2.4 CSRF

Cookie-based auth CSRF protection implemented:

-   `SameSite=Lax` cookies ✓
-   CORS restricted to WEB_ORIGIN with credentials: true ✓
-   Only same-origin requests allowed for state-changing operations ✓

**CORS Configuration:**
```typescript
app.enableCors({
  origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

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

### Authentication & Session Management
-   [x] Cookie-based refresh rotation implemented
-   [x] Refresh token stored as hash (SHA-256) in database
-   [x] HttpOnly cookies with SameSite=Lax
-   [x] Secure flag enabled (production)
-   [x] Token reuse detection with session revocation
-   [x] Access token short-lived (15 minutes)
-   [x] Refresh token rotation on every refresh
-   [x] Session audit trail (IP, user-agent, rotation chain)

### Authorization & Access Control
-   [x] RBAC implemented (admin, analyst, viewer)
-   [ ] ABAC/Policy engine for fine-grained control (future)
-   [x] Default deny for protected endpoints
-   [x] Org boundary validation on all resources

### Input Validation & Security
-   [x] CORS restricted to UI origin with credentials
-   [x] Input validation on all endpoints (class-validator DTOs)
-   [x] Body size limits set (NestJS defaults ~100kb)
-   [x] Rate limiting on auth endpoints (5/min login, 10/min refresh)
-   [x] Password policy enforced (8+ chars, complexity rules)

### Logging & Monitoring
-   [x] Audit log for auth events (login, logout, refresh, failures)
-   [x] Audit log includes IP, user-agent, trace context
-   [ ] Audit log for resource access (incidents, evidence, playbooks) - in progress
-   [ ] Policy decisions logged - pending policy engine

### Secrets & Configuration
-   [x] No secrets in git
-   [x] Environment-based configuration
-   [x] No tokens logged (only hashes)
-   [ ] Integration secrets encrypted - future

### Infrastructure Security
-   [x] Security headers (helmet.js)
-   [x] Validation pipe with whitelist
-   [ ] DLQ configured for MQ consumers - pending
-   [ ] AI output stored as draft + citations - pending AI implementation

---
