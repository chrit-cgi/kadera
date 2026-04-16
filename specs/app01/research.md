# Research: Kadera Running Coach — v1

**Input**: Implementation plan for `specs/app01`
**Date**: 2026-04-14

## Decision Log

---

### D-01: VDOT Derivation Method

**Decision**: Implement a TypeScript VDOT lookup in `api/_lib/vdot.ts` using the
Jack Daniels / Purdy Points formula. Derive VDOT from the athlete's self-reported
most recent race (distance in km + finish time in seconds) during intake.

**Rationale**: No external library is needed — the formula is deterministic and the
lookup table is small (~50 rows). Keeping it internal removes a dependency and makes
it trivially testable. Athletes are not expected to know their VDOT number; asking for
a race result is the standard coaching intake question.

**Alternatives considered**:
- Ask athlete to enter raw VDOT: Rejected — creates friction; most athletes do not know
  their VDOT.
- Use an npm VDOT library: Rejected — dormant dependency risk; formula is well-known
  and trivial to implement correctly.

---

### D-02: Three.js Galaxy Layout Strategy

**Decision**: Pre-compute master node positions offline (stored in the seed JSON from
`scripts/seed-graph.mjs`). Orbital positions for user nodes are computed at read time
relative to their connected master node's stored coordinates.

**Rationale**: Running a force-directed simulation on 160+ nodes at scene load is
prohibitive on mobile — observed 2-5s freeze on mid-range Android devices in prior
testing. Pre-seeded positions eliminate this entirely. User nodes are sparse (< 30
typically) so their orbital placement is O(n) arithmetic.

**Alternatives considered**:
- D3-force / custom force simulation at runtime: Rejected — CPU-intensive, poor mobile
  performance, introduces non-determinism (different layouts per session).
- Static fixed positions for all nodes: Partially adopted — master nodes use fixed
  positions; only user node orbits are dynamic.

---

### D-03: Claude Prompt Architecture for Coaching

**Decision**: Use a layered context injection strategy with structured XML tags in
responses. Each call to `POST /api/coach/chat` assembles:

1. **System prompt** (cached, rarely changes): coaching persona + methodology summary
   (from master graph), safety guidelines, response format instructions.
2. **User context block** (per call): athlete profile, plan summary (current phase/week,
   today's session), recent feel scores (last 7 days), active injuries/traps.
3. **Conversation window** (rolling): last 8 message pairs (16 messages). Older messages
   are summarised into a compressed history block on first overflow.
4. **Relevant knowledge nodes** (per call): top-5 master nodes by cosine similarity to
   the incoming message topic (simple keyword → cluster mapping, no embeddings in v1).
5. **Structured tag spec**: Claude is instructed to emit optional structured tags in
   responses: `<plan_adjustment>`, `<pattern_detected>`, `<session_complete>`. The server
   strips and processes these before returning natural text to the client.

**Rationale**: Maximises coaching quality without fine-tuning (constitution II). The
caching of the system prompt via Anthropic's cache_control reduces per-call cost by
~70% for stable context (tested against Claude Sonnet pricing). In v1 we avoid
embeddings to keep the stack simple; topic-to-cluster keyword mapping is sufficient
for coaching context relevance.

**Alternatives considered**:
- Full conversation history (no windowing): Rejected — cost grows unbounded; 40-message
  histories at Elite tier = ~60K tokens/call.
- Embeddings for knowledge node retrieval: Deferred to v2 — requires a vector store
  (Redis / Pinecone) which would breach current tier dependency policy.
- Fine-tuning: Rejected explicitly by constitution II.

---

### D-04: Firestore Graph Storage Pattern

**Decision**: Store master knowledge nodes in a flat top-level collection
`masterGraph/{nodeId}`. Store per-user nodes in a subcollection
`users/{uid}/userGraph/{nodeId}`. Cross-links are stored as `masterNodeRefs[]` on each
user node. At read time, `GET /api/graph` fetches both collections and computes cross-links
client-side before returning the merged payload.

**Rationale**: Firestore does not support graph queries. Flat collections enable
efficient batch reads. Merging in the API function (not the client) keeps the client
payload clean and avoids leaking master node data the user should not see directly.
Keeping cross-links as IDs on user nodes avoids bidirectional denormalization.

**Alternatives considered**:
- Store edges as a separate collection: Rejected — adds a third read per graph fetch;
  edges are lightweight enough to embed.
- Neo4j for graph queries: Deferred explicitly per constitution II (activated only when
  graph queries become the primary access pattern).

---

### D-05: Local Dev Authentication Bypass

**Decision**: When `DEV_BYPASS_AUTH=true` is set in the local environment:

- `api/_lib/auth.ts` skips token verification and returns a hardcoded stub user
  `{ uid: 'dev-user-001', email: 'dev@kadera.local', tier: 'Elite' }`.
- The React app detects `VITE_DEV_BYPASS_AUTH=true` (Vite env var) and skips
  Firebase SDK initialisation entirely, injecting the same stub user into the auth store.
- In production (`VERCEL_ENV === 'production'`): any request with this flag present
  is rejected with 403.

**Rationale**: Chromebook local development has intermittent issues with Google OAuth
pop-ups in Chromium. The bypass allows a single dummy user to develop all authenticated
features without any Firebase dependency in the local environment.

**Alternatives considered**:
- Service account emulator: Considered but requires Docker/JVM (not suitable for
  Chromebook Linux environment).
- Firebase Emulator Suite: Also requires JVM; Firebase Auth emulator has known issues
  on Chrome OS.

---

### D-06: Garmin CSV Parsing Strategy

**Decision**: Parse the standard Garmin Connect activity export CSV format.
Key columns extracted: Activity Type, Date, Distance, Time (duration), Avg HR, Max HR,
Calories, Title. Deduplication hash = SHA-256 of `date + activity_type + distance + duration`.
Parsing happens server-side in `api/garmin.ts` using Node.js built-in CSV parsing
(no external library — Garmin CSVs are well-structured, comma-delimited, UTF-8).

**Rationale**: The Garmin export format is stable and documented. A custom parser
avoids a CSV library dependency. SHA-256 deduplication is collision-resistant for
practical purposes and ensures re-upload of the same file is idempotent.

**Alternatives considered**:
- Use `csv-parse` npm library: Rejected — Garmin format is simple enough; adding a
  library for a single file type conflicts with the dependency-minimisation policy.
- Use Garmin Connect API directly: Deferred — the Garmin OAuth integration is in scope
  with the Strava/Terra deferred integrations.

---

### D-07: GDPR Right to Erasure Implementation

**Decision**: Account deletion is immediate and hard (no grace period in v1).
On `DELETE /api/account`:

1. Firestore Admin SDK batch-deletes all subcollections under `users/{uid}` in order:
   `sessions`, `conversations`, `briefs`, `reviews`, `adjustments`, `userGraph`,
   `meals`, `activities`, `profile`, then the root `users/{uid}` document.
2. Firebase Admin Auth deletes the Firebase user record.
3. The `invites/{email}` document is updated to `status: 'deleted'` (retained for
   audit only; no PII beyond email remains).
4. A structured log event is emitted to `auditLog` (no content, no feel scores).
5. Response: 204 No Content.

**Rationale**: Immediate deletion is simpler to reason about for v1 GDPR compliance.
A grace period (soft delete) is a v2 enhancement if churn analysis requires it.
The invite record is kept in degraded form to prevent re-registration abuse.

**Alternatives considered**:
- 30-day soft-delete window: Deferred to v2.
- Anonymisation instead of deletion: Rejected — athlete data (name, weight, race goals,
  HR profiles) is personal data under GDPR; anonymisation is harder to guarantee than
  deletion.

---

### D-08: AI Spend Cost Tracking

**Decision**: After each Claude API call, the server calculates cost from the response
`usage` object using the current Sonnet 4 token pricing:
`input_cost = (input_tokens / 1_000_000) × 3.00` USD,
`output_cost = (output_tokens / 1_000_000) × 15.00` USD.
Costs are written atomically to `costs/{YYYY-MM-DD}` (Firestore increment) and to
`globalConfig/settings` (running daily/monthly totals). If a call would exceed the
configured cap, it is blocked before the Anthropic request is made.

**Rationale**: Pre-call cap enforcement (not post-call) is the only reliable way to
prevent overspend — checking after the call is too late. Storing per-day aggregates in
Firestore gives the admin dashboard a low-read-cost summary without scanning all logs.

**Alternatives considered**:
- Use Anthropic usage dashboard only: Rejected — no server-side kill capability.
- Per-user cost tracking: Added for admin reporting, but spend caps are global in v1.

---

### D-09: Audit Logging Schema

**Decision**: All compliance-relevant events are written to a Firestore
`auditLog/{logId}` collection with deny-all client access. The log document schema
varies by event type but always includes `eventType`, `timestamp`, and
`actingUserId` (or `"anonymous"` for pre-auth events).

**Auth failure / access-denied events**:
```json
{
  "eventType": "auth_failure",
  "timestamp": "ISO-8601",
  "userId": "uid or null",
  "path": "/api/...",
  "reason": "token_expired | invite_not_found | admin_required | ...",
  "ip": "hashed"
}
```

**Account deletion events**:
```json
{
  "eventType": "account_deleted",
  "timestamp": "ISO-8601",
  "userId": "uid",
  "tablesCleared": ["sessions","conversations","briefs","reviews",
                    "adjustments","userGraph","meals","activities","profile","user"]
}
```
Note: no content fields, no feel scores, no message text.

**Data export events**:
```json
{
  "eventType": "data_export",
  "timestamp": "ISO-8601",
  "userId": "uid",
  "exportScope": ["profile","sessions","meals","activities"]
}
```

**Admin status-change events**:
```json
{
  "eventType": "admin_action",
  "timestamp": "ISO-8601",
  "actingAdminId": "uid",
  "affectedUserId": "uid or null",
  "action": "invite_add | invite_revoke | kill_switch_on | kill_switch_off | tier_change | spend_cap_update",
  "params": { "...action-specific fields..." }
}
```

**Rationale**: Structured JSON logs allow programmatic compliance queries without
exposing personal content. Hashed IP avoids additional PII storage. The schema is
intentionally minimal per data-minimisation principles.

---

### D-10: Vercel Function Count Budget

**Decision**: 11 of the 12 allowed Vercel Hobby functions are allocated as follows.
One spare slot is held in reserve.

| # | File | Routes served |
|---|------|---------------|
| 1 | `api/waitlist.ts` | POST /api/waitlist |
| 2 | `api/intake.ts` | POST /api/intake |
| 3 | `api/coach.ts` | POST /api/coach/{brief\|chat\|review} |
| 4 | `api/plan.ts` | GET\|PATCH /api/plan, PATCH /api/plan/session/:id |
| 5 | `api/graph.ts` | GET /api/graph |
| 6 | `api/food.ts` | POST /api/food |
| 7 | `api/garmin.ts` | POST /api/garmin/import |
| 8 | `api/admin.ts` | GET\|POST\|PATCH /api/admin/:section |
| 9 | `api/weather.ts` | GET /api/weather |
| 10 | `api/account.ts` | GET\|PATCH\|DELETE /api/account; GET\|PATCH /api/account/prefs |
| 11 | `api/export.ts` | GET /api/export |
| 12 | *(spare)* | Reserved |

Shared code in `api/_lib/` and sub-handlers in `api/_handlers/` are not counted as
Vercel functions (underscore prefix convention).

**Alternatives considered**:
- Combine food + garmin into one function: Possible if spare is needed; noted for v2
  refactor if a new route is required.
