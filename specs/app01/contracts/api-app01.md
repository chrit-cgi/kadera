# API Contract: Kadera Running Coach — App01 Routes

**Scope**: All authenticated routes for the Kadera v1 running coach application.
**Auth**: All endpoints require `Authorization: Bearer <firebase-id-token>` unless noted.
Server verifies token via Firebase Admin SDK. Returns 401 on any invalid/expired token.
**Base URL**: `https://kaderarunning.ai/api` (production) | `http://localhost:3001/api` (local dev)
**Date**: 2026-04-14

Auth failures and access-denied responses MUST be logged to `auditLog` per D-09 in research.md.

---

## Intake — `api/intake.ts`

### POST /api/intake

Submit one step of the AI-guided intake conversation.

**Request body**:
```json
{
  "step": "number (0-based, current intake step)",
  "message": "string (athlete's message or answer)",
  "conversationHistory": [
    { "role": "user | assistant", "content": "string" }
  ]
}
```

**Response** (step not final):
```json
{
  "step": "number (next step index)",
  "message": "string (coach's next question)",
  "isComplete": false
}
```

**Response** (final step — intake complete):
```json
{
  "isComplete": true,
  "profile": { "...extracted profile fields..." },
  "planSummary": {
    "phases": 7,
    "startDate": "ISO date",
    "currentWeeklyKm": 40,
    "vdot": 48.2
  }
}
```

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `invalid_step` | Step out of sequence |
| 503 | `ai_unavailable` | Kill switch active or AI error |
| 402 | `cap_exceeded` | Daily message cap reached |

**Side effects** (on `isComplete: true`):
- Writes `users/{uid}/profile` document.
- Writes `users/{uid}/plan` document with all sessions.
- Writes `users/{uid}/userGraph` intake nodes.
- Sets `users/{uid}.onboardingStatus = 'complete'`.

---

## Coach — `api/coach.ts`

### POST /api/coach/brief

Generate or retrieve today's morning brief.

**Request body**: `{}` (empty; user context resolved server-side from uid)

**Response**:
```json
{
  "date": "YYYY-MM-DD",
  "content": "string (markdown morning brief)",
  "session": {
    "sessionId": "string",
    "type": "threshold",
    "title": "Threshold Run 10km",
    "targetPaceMinPerKm": 285,
    "targetHRZone": 4,
    "plannedDistanceKm": 10
  },
  "weatherContext": { "condition": "string", "tempC": 14, "windKmh": 12 } | null,
  "cached": "boolean (true if already generated today)"
}
```

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 503 | `ai_unavailable` | Kill switch active |
| 404 | `no_session_today` | No session scheduled for today |

**Side effects**: Creates or returns `users/{uid}/briefs/{date}` document.

---

### POST /api/coach/chat

Send a message to the coach and receive a response.

**Request body**:
```json
{
  "message": "string (athlete message, max 2000 chars)",
  "conversationId": "string"
}
```

**Response**:
```json
{
  "reply": "string (coach text response, stripped of structured tags)",
  "conversationId": "string",
  "actions": [
    {
      "type": "plan_adjustment | pattern_detected | session_complete",
      "data": { "...type-specific payload..." }
    }
  ],
  "remainingMessages": "number (cap - used today)",
  "costUSD": "number (this call's cost, for admin audit)"
}
```

**Plan adjustment action payload**:
```json
{
  "adjustmentId": "string",
  "summary": "string (human-readable description of proposed change)",
  "affectedSessions": ["sessionId", "..."]
}
```

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 402 | `cap_exceeded` | Daily message cap reached |
| 503 | `ai_unavailable` | Kill switch active or Claude API error |
| 404 | `conversation_not_found` | Invalid conversationId |

**Side effects**:
- Appends message + reply to `conversations/{conversationId}/messages`.
- If `plan_adjustment` tag detected: creates `adjustments/{adjustmentId}` with `status: pending`.
- If `pattern_detected` tag: creates/updates `userGraph/{nodeId}`.
- Increments `users/{uid}.dailyMessageCount`.
- Writes cost delta to `globalConfig/settings.spendCaps` and `costs/{date}`.

---

### POST /api/coach/review

Generate a post-run or weekly review.

**Request body**:
```json
{
  "type": "post_run | weekly",
  "sessionId": "string | null (required if type=post_run)"
}
```

**Response**:
```json
{
  "reviewId": "string",
  "type": "post_run | weekly",
  "content": "string (review markdown)",
  "generatedAt": "ISO-8601"
}
```

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 503 | `ai_unavailable` | Kill switch active |
| 400 | `session_not_found` | sessionId invalid for post_run review |

---

## Training Plan — `api/plan.ts`

### GET /api/plan

Retrieve the athlete's full training plan with all sessions.

**Response**:
```json
{
  "plan": {
    "version": 3,
    "currentPhase": 2,
    "currentWeek": 1,
    "startDate": "YYYY-MM-DD",
    "phases": [ { "phaseNumber": 1, "name": "Base Building", "durationWeeks": 4 }, "..." ],
    "sessions": [ { "sessionId": "...", "...all session fields..." } ]
  }
}
```

---

### PATCH /api/plan/session/:sessionId

Update a session (swap or log completion).

**Request body** (swap):
```json
{
  "action": "swap",
  "crossTrainingType": "cycling | swimming | yoga | strength | walking"
}
```

**Request body** (log completion):
```json
{
  "action": "complete",
  "feelScore": "number 1-5",
  "notes": "string | null (max 500 chars)"
}
```

**Response**: `{ "session": { "...updated session..." } }`

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 404 | `session_not_found` | |
| 400 | `invalid_action` | |
| 409 | `already_completed` | Session already has completion |

---

### PATCH /api/plan/adjustment/:adjustmentId

Accept or reject a pending plan adjustment.

**Request body**:
```json
{ "decision": "accepted | rejected" }
```

**Response**: `{ "adjustmentId": "string", "status": "accepted | rejected" }`

**Side effects** (accepted): Updates affected session documents. Increments `plan.version`.

---

## Knowledge Graph — `api/graph.ts`

### GET /api/graph

Fetch the merged graph (master + user nodes + cross-links).

**Response**:
```json
{
  "masterNodes": [
    {
      "id": "string",
      "topicCluster": "string",
      "title": "string",
      "description": "string",
      "positionX": 1.23, "positionY": -0.45, "positionZ": 0.87,
      "color": "#hex",
      "edges": [ { "targetId": "string", "weight": 0.8 } ]
    }
  ],
  "userNodes": [
    {
      "id": "string",
      "type": "profile | goal | fitness | injury | trap | pattern | completion",
      "label": "string",
      "value": "string",
      "masterNodeRefs": ["masterNodeId", "..."]
    }
  ]
}
```

**Note**: Client computes 3D orbital positions for user nodes from their
`masterNodeRefs` and the master nodes' stored coordinates.

---

## Food Logging — `api/food.ts`

### POST /api/food

Log a meal and receive macro estimates.

**Request body**:
```json
{
  "inputType": "text | photo",
  "text": "string | null (required if inputType=text)",
  "photoBase64": "string | null (required if inputType=photo, max 3MB, JPEG/PNG)"
}
```

**Response**:
```json
{
  "mealId": "string",
  "macros": {
    "proteinG": 32,
    "carbsG": 65,
    "fatG": 18,
    "calories": 550
  },
  "estimateNotes": "string (brief coach note on estimate confidence)"
}
```

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 413 | `image_too_large` | Photo > 4MB |
| 503 | `ai_unavailable` | Kill switch active |

---

## Garmin Import — `api/garmin.ts`

### POST /api/garmin/import

Upload and parse a Garmin activity CSV export.

**Request**: `multipart/form-data` with field `file` (CSV, max 4MB).

**Response**:
```json
{
  "importBatchId": "string",
  "imported": 42,
  "skipped": 3,
  "errors": 0,
  "total": 45
}
```

**`skipped`** = duplicate activities (already imported, same dedup hash).
**`errors`** = rows that could not be parsed.

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `invalid_format` | File is not a valid Garmin CSV |
| 413 | `file_too_large` | File > 4MB |

---

## Account & Preferences — `api/account.ts`

### GET /api/account

Retrieve current user profile + preferences.

**Response**:
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "tier": "free | starter | elite",
  "dailyMessageCount": 2,
  "dailyMessageCap": 3,
  "coachStyle": "motivator | analytical | gentle | challenger",
  "onboardingStatus": "complete",
  "profile": { "...all profile fields..." }
}
```

---

### PATCH /api/account/prefs

Update coaching preferences.

**Request body**:
```json
{
  "coachStyle": "motivator | analytical | gentle | challenger"
}
```

**Response**: `{ "coachStyle": "analytical" }`

---

### DELETE /api/account

Delete the authenticated user's account and all associated data (GDPR right to erasure).

**Request body**: `{ "confirmation": "DELETE MY ACCOUNT" }` (exact string required)

**Response**: `204 No Content`

**Side effects** (in order, atomic where possible):
1. Deletes all Firestore subcollections: `sessions`, `conversations/*/messages`, `conversations`, `briefs`, `reviews`, `adjustments`, `userGraph`, `meals`, `activities`, `profile`.
2. Deletes `users/{uid}` root document.
3. Updates `invites/{email}.status` to `'deleted'`.
4. Deletes Firebase Auth record.
5. Writes to `auditLog` (userId, timestamp, tablesCleared — no content).

**Errors**:

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `confirmation_required` | Confirmation string missing or wrong |

---

## Data Export — `api/export.ts`

### GET /api/export

Export all athlete data as a JSON file (GDPR right to portability).

**Response**: `application/json` download.

```json
{
  "exportedAt": "ISO-8601",
  "userId": "uid",
  "profile": { "..." },
  "sessions": [ "..." ],
  "meals": [ "..." ],
  "activities": [ "..." ],
  "reviews": [ "..." ]
}
```

**Note**: Conversation content is excluded from export in v1 (message history is
ephemeral coaching content; portability scope covers structured athlete data only).
This may be revisited in v2.

**Side effects**: Writes `auditLog` event (userId, timestamp, exportScope).

---

## Admin — `api/admin.ts`

All routes require admin role. Non-admin authenticated users receive 403 with
`auditLog` entry.

### GET /api/admin/dashboard

**Response**:
```json
{
  "userCount": 42,
  "activeToday": 18,
  "dailyCostUSD": 12.34,
  "monthlyCostUSD": 189.50,
  "killSwitchEnabled": false,
  "spendCaps": { "dailyUSD": 50, "monthlyUSD": 500 },
  "recentAuditEvents": [ "...last 10 auditLog entries..." ]
}
```

---

### GET /api/admin/invites

**Response**: `{ "invites": [ { "email", "status", "createdAt", "acceptedAt" } ] }`

### POST /api/admin/invites

**Request**: `{ "email": "string" }`
**Response**: `{ "invite": { "email", "status": "pending", "createdAt" } }`
**Side effects**: Creates `invites/{email}`. Writes `auditLog` admin_action event.

### PATCH /api/admin/invites/:email

**Request**: `{ "action": "revoke" }`
**Response**: `{ "invite": { "email", "status": "revoked" } }`
**Side effects**: Updates invite status. Writes `auditLog` admin_action event.

---

### GET /api/admin/users

**Response**:
```json
{
  "users": [
    {
      "uid": "string",
      "email": "string",
      "tier": "string",
      "dailyMessageCount": 5,
      "lastLoginAt": "ISO-8601",
      "onboardingStatus": "complete",
      "createdAt": "ISO-8601"
    }
  ]
}
```

### PATCH /api/admin/users/:uid

Change a user's tier.

**Request**: `{ "tier": "free | starter | elite" }`
**Response**: `{ "uid": "string", "tier": "elite" }`
**Side effects**: Writes `auditLog` admin_action event (actingAdminId, affectedUserId, action: "tier_change", params: {newTier}).

---

### PATCH /api/admin/settings

Update kill switch or spend caps.

**Request body** (kill switch):
```json
{ "killSwitch": true | false }
```

**Request body** (spend caps):
```json
{ "spendCaps": { "dailyUSD": 50, "monthlyUSD": 500 } }
```

**Response**: `{ "settings": { "killSwitch": { "enabled": true, "enabledAt": "ISO-8601" }, "spendCaps": { "..." } } }`

**Side effects**: Writes `auditLog` admin_action events. Kill switch change takes effect within 60 seconds (next Firestore read cycle by all functions).

---

## Weather Proxy — `api/weather.ts`

### GET /api/weather

Fetch current weather for the authenticated user's location.

**Response**:
```json
{
  "condition": "Partly cloudy",
  "tempC": 14,
  "feelsLikeC": 12,
  "windKmh": 18,
  "humidity": 72,
  "location": "Amsterdam, NL"
}
```

**On provider failure**: Returns `null` (graceful degradation; brief generation continues without weather).
