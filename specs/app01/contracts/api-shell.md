# API Contract: Shell-Level Routes

**Scope**: Routes accessible without authentication (unauthenticated or pre-auth).
**Base URL**: `https://kaderarunning.ai/api` (production) | `http://localhost:3001/api` (local dev)
**Date**: 2026-04-14

---

## POST /api/waitlist

Add an email address to the public waitlist.

**Auth**: None required.

**Request body**:
```json
{
  "email": "string (valid email, max 254 chars)"
}
```

**Responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `{"status": "added"}` | Email recorded; confirmation sent |
| 200 OK | `{"status": "already_registered"}` | Email already on waitlist (idempotent) |
| 400 Bad Request | `{"error": "invalid_email"}` | Malformed email |
| 429 Too Many Requests | `{"error": "rate_limited"}` | > 3 submissions from same IP in 1h |

**Side effects**:
- Creates or no-ops `waitlist/{email}` Firestore document.
- Sends confirmation email via Resend (subject to 100/day cap).
- Does NOT create an invite; invite creation is a separate admin action.

---

## POST /api/intake (Step 0 — pre-auth profile stub)

*This endpoint is listed under shell routes because the first step of intake
(topic: email availability check) runs before onboarding is complete, though
the user must be authenticated via Bearer token.*

See `api-app01.md` for the full intake contract.

---

## GET /api/health

Internal health check. Returns platform status.

**Auth**: None.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "ISO-8601",
  "killSwitch": false
}
```

Used by Vercel uptime monitoring and local dev verification.
