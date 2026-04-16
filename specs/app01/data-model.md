# Data Model: Kadera Running Coach — v1

**Input**: spec.md + research.md
**Date**: 2026-04-14

All collections are Firestore. Client access is deny-all by default;
all reads/writes go through server-side Admin SDK. Subcollections are
listed under their parent document.

---

## Top-Level Collections

### `users/{uid}`

Root user document. `uid` matches Firebase Auth UID.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Google account email |
| `displayName` | string | From Google profile |
| `tier` | enum | `free` \| `starter` \| `elite` |
| `dailyMessageCount` | number | Messages sent today |
| `dailyMessageDate` | string | ISO date of last count reset |
| `onboardingStatus` | enum | `not_started` \| `in_progress` \| `complete` |
| `onboardingStep` | number | Last completed intake step (0-based) |
| `coachStyle` | enum | `motivator` \| `analytical` \| `gentle` \| `challenger` |
| `createdAt` | timestamp | First login |
| `lastLoginAt` | timestamp | Most recent login |
| `isDeleted` | boolean | Set true during deletion (pre-cleanup) |

**Tier message caps** (defined in `src/types/index.ts`, referenced server-side):

| Tier | Cap/day |
|------|---------|
| `free` | 3 |
| `starter` | 15 |
| `elite` | 40 |

---

### `users/{uid}/profile` (single document)

Detailed athlete intake data.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Athlete's preferred name |
| `weightKg` | number | Body weight in kg |
| `targetRace` | string | e.g. "Marathon Amsterdam 2026" |
| `targetDistanceKm` | number | Race distance |
| `targetFinishTimeSec` | number | Goal finish time in seconds |
| `targetDate` | string | ISO date of race |
| `currentWeeklyKm` | number | Weekly training volume at intake |
| `maxHR` | number | Max heart rate (bpm) |
| `vdot` | number | Derived from most recent race result |
| `mostRecentRaceDistanceKm` | number | Used for VDOT derivation |
| `mostRecentRaceTimeSec` | number | Used for VDOT derivation |
| `activeInjuries` | string[] | Free-text injury descriptions |
| `behaviouralTraps` | string[] | Coach-identified behavioural patterns at intake |
| `location` | string | City/region for weather context |
| `timezone` | string | IANA timezone string |
| `updatedAt` | timestamp | Last profile update |

**HR Zone Derivation** (server-side, stored on plan generation):

| Zone | % of maxHR |
|------|-----------|
| Z1 Easy | 50–60% |
| Z2 Aerobic | 60–70% |
| Z3 Tempo | 70–80% |
| Z4 Threshold | 80–90% |
| Z5 VO2max | 90–100% |

---

### `users/{uid}/plan` (single document)

Training plan metadata and phase structure.

| Field | Type | Description |
|-------|------|-------------|
| `generatedAt` | timestamp | When plan was first created |
| `version` | number | Increments on each accepted adjustment |
| `currentPhase` | number | 1–7 |
| `currentWeek` | number | Week within phase |
| `startDate` | string | ISO date plan started |
| `phases` | Phase[] | See Phase schema below |
| `vdotAtGeneration` | number | VDOT used when plan was generated |
| `weeklyKmAtGeneration` | number | Weekly km used for volume scaling |

**Phase** (embedded array):

| Field | Type | Description |
|-------|------|-------------|
| `phaseNumber` | number | 1–7 |
| `name` | string | e.g. "Base Building", "Threshold Development" |
| `durationWeeks` | number | 3 (training) + 1 (recovery) = mesocycle |
| `focus` | string | Primary training adaptation target |

---

### `users/{uid}/sessions/{sessionId}`

Individual planned or completed training sessions.

| Field | Type | Description |
|-------|------|-------------|
| `phase` | number | 1–7 |
| `week` | number | Week within phase |
| `dayOfWeek` | number | 1=Mon … 7=Sun |
| `scheduledDate` | string | ISO date |
| `type` | enum | `easy` \| `threshold` \| `vo2max` \| `long_run` \| `recovery` \| `cross_training` \| `race` |
| `title` | string | e.g. "Threshold Run 8km" |
| `targetPaceMinPerKm` | number | Target pace in seconds/km |
| `targetHRZone` | number | 1–5 |
| `plannedDistanceKm` | number | |
| `plannedDurationMin` | number | |
| `status` | enum | `planned` \| `completed` \| `swapped` \| `skipped` |
| `feelScore` | number \| null | 1–5 (athlete-reported) |
| `completionNotes` | string \| null | Free text from athlete |
| `completedAt` | timestamp \| null | |
| `swappedForType` | string \| null | If status=swapped, the cross-training type |
| `adjustmentId` | string \| null | If modified by an accepted adjustment |
| `createdAt` | timestamp | |

---

### `users/{uid}/conversations/{conversationId}`

Coach chat session. One active conversation per user; new docs on weekly boundary
or manual reset.

| Field | Type | Description |
|-------|------|-------------|
| `startedAt` | timestamp | |
| `lastMessageAt` | timestamp | |
| `messageCount` | number | Total messages in conversation |
| `summaryContext` | string \| null | Compressed history when window overflows |
| `messages` | Message[] | See Message schema — stored as subcollection for large chats |

**Note**: For conversations > 50 messages, messages move to
`users/{uid}/conversations/{conversationId}/messages/{msgId}` subcollection.

**Message** (subcollection document):

| Field | Type | Description |
|-------|------|-------------|
| `role` | enum | `user` \| `assistant` |
| `content` | string | Message text |
| `timestamp` | timestamp | |
| `tokenCount` | number | For cost accounting |
| `detectedPatterns` | string[] | Patterns extracted from this message |
| `triggeredAdjustmentId` | string \| null | If this message led to a plan adjustment |

---

### `users/{uid}/briefs/{date}`

Daily morning brief. Key is ISO date string (YYYY-MM-DD).

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | ISO date |
| `sessionId` | string | The session this brief covers |
| `content` | string | Full brief text from Claude |
| `weatherContext` | object \| null | `{condition, tempC, windKmh}` |
| `generatedAt` | timestamp | |
| `readAt` | timestamp \| null | When athlete first opened it |

---

### `users/{uid}/reviews/{reviewId}`

Post-run and weekly reviews.

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | `post_run` \| `weekly` |
| `content` | string | Review text from Claude |
| `sessionIds` | string[] | Sessions covered |
| `weekNumber` | number \| null | ISO week (for weekly reviews) |
| `generatedAt` | timestamp | |
| `triggeredBy` | enum | `athlete` \| `schedule` |

---

### `users/{uid}/adjustments/{adjustmentId}`

Coach-proposed plan adjustment proposals.

| Field | Type | Description |
|-------|------|-------------|
| `proposedChanges` | Change[] | See Change schema below |
| `status` | enum | `pending` \| `accepted` \| `rejected` |
| `conversationId` | string | Parent conversation |
| `messageIndex` | number | Message position within conversation |
| `proposedAt` | timestamp | |
| `resolvedAt` | timestamp \| null | |
| `resolvedBy` | enum \| null | `athlete` \| `system_timeout` |

**Change** (embedded array):

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session to modify |
| `field` | string | Field being changed |
| `oldValue` | any | |
| `newValue` | any | |
| `rationale` | string | Coach's explanation |

---

### `users/{uid}/userGraph/{nodeId}`

Personal knowledge graph nodes.

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | `profile` \| `goal` \| `fitness` \| `injury` \| `trap` \| `pattern` \| `completion` |
| `label` | string | Short display label |
| `value` | string | Node content |
| `source` | enum | `intake` \| `coach_detected` \| `plan_adjustment` \| `session_completion` |
| `masterNodeRefs` | string[] | IDs of related master graph nodes |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `active` | boolean | false = soft-deleted / no longer relevant |

---

### `users/{uid}/meals/{mealId}`

Food log entries.

| Field | Type | Description |
|-------|------|-------------|
| `inputType` | enum | `photo` \| `text` |
| `rawInput` | string | Text description (or photo caption) |
| `photoUrl` | string \| null | If inputType=photo, storage URL |
| `macros` | object | `{proteinG, carbsG, fatG, calories}` |
| `loggedAt` | timestamp | |
| `estimatedBy` | string | Model version used for estimate |

---

### `users/{uid}/activities/{activityId}`

Parsed Garmin activities.

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | `garmin_csv` |
| `activityType` | string | e.g. "Running", "Cycling" |
| `title` | string | Activity name from Garmin |
| `date` | string | ISO date |
| `distanceKm` | number | |
| `durationSec` | number | |
| `avgHR` | number \| null | |
| `maxHR` | number \| null | |
| `calories` | number \| null | |
| `dedupHash` | string | SHA-256(date+type+distance+duration) |
| `importedAt` | timestamp | |
| `importBatchId` | string | Groups all activities from one upload |

---

## Top-Level Collections (continued)

### `invites/{email}`

Invite gate. Document key is the lowercase email address.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Lowercase |
| `status` | enum | `pending` \| `accepted` \| `revoked` \| `deleted` |
| `addedByAdminId` | string | Admin UID who created the invite |
| `createdAt` | timestamp | |
| `acceptedAt` | timestamp \| null | |
| `revokedAt` | timestamp \| null | |

---

### `waitlist/{email}`

Public waitlist entries. Document key is the lowercase email address.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | |
| `createdAt` | timestamp | |
| `source` | string | `web_form` |

---

### `admins/{email}`

Admin email list. Document key is the lowercase email address.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | |
| `grantedByAdminId` | string | Admin who granted access |
| `grantedAt` | timestamp | |
| `revokedAt` | timestamp \| null | |
| `active` | boolean | |

---

### `masterGraph/{nodeId}`

Immutable coaching knowledge nodes. Seeded via `scripts/seed-graph.mjs`.
Admin SDK read-only after seeding (enforced by Firestore security rules).

| Field | Type | Description |
|-------|------|-------------|
| `topicCluster` | string | e.g. "injury_prevention", "nutrition", "training_science" |
| `title` | string | Short display title |
| `description` | string | Detailed content for AI context injection |
| `tags` | string[] | Keywords for topic detection |
| `edges` | Edge[] | Connections to related master nodes |
| `positionX` | number | Pre-computed 3D X coordinate |
| `positionY` | number | Pre-computed 3D Y coordinate |
| `positionZ` | number | Pre-computed 3D Z coordinate |
| `color` | string | Hex color per cluster |

**Edge** (embedded):

| Field | Type | Description |
|-------|------|-------------|
| `targetId` | string | Target master node ID |
| `weight` | number | 0.0–1.0 relatedness score |

---

### `globalConfig/settings` (single document)

Platform-wide configuration.

| Field | Type | Description |
|-------|------|-------------|
| `killSwitch` | object | `{enabled: bool, enabledAt: ts, enabledByAdminId: string}` |
| `spendCaps` | object | `{dailyUSD: number, monthlyUSD: number, currentDailyUSD: number, currentMonthlyUSD: number, lastDailyReset: string, lastMonthlyReset: string}` |
| `weeklyReviewDay` | number | ISO weekday (1=Mon, 7=Sun; default 7) |
| `updatedAt` | timestamp | |

---

### `costs/{YYYY-MM-DD}` (daily documents)

Per-day AI cost aggregates.

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | ISO date |
| `totalCostUSD` | number | |
| `callCount` | number | |
| `inputTokens` | number | |
| `outputTokens` | number | |
| `byFunction` | object | `{coach: {cost, calls}, intake: {cost, calls}, ...}` |
| `updatedAt` | timestamp | |

---

### `auditLog/{logId}`

Structured compliance event log. Admin-read-only. Auto-ID documents.

| Field | Type | Notes |
|-------|------|-------|
| `eventType` | string | See D-09 in research.md |
| `timestamp` | timestamp | Server time |
| `userId` | string \| null | Firebase UID if known |
| `actingAdminId` | string \| null | For admin action events |
| `affectedUserId` | string \| null | For admin action events |
| `path` | string \| null | For auth failure events |
| `reason` | string \| null | For auth failure events |
| `action` | string \| null | For admin action events |
| `params` | object \| null | Action-specific params |
| `tablesCleared` | string[] \| null | For account deletion events |

**Never stored in auditLog**: message content, feel scores, meal content, session notes.

---

## State Transitions

### Session status FSM

```
planned → swapped (athlete swaps before scheduled date)
planned → completed (athlete logs completion)
planned → skipped (athlete marks as missed)
completed ← (terminal; feel score may be added after)
swapped ← (terminal)
skipped ← (terminal)
```

### Plan Adjustment status FSM

```
pending → accepted (athlete taps Accept)
pending → rejected (athlete taps Reject)
pending → rejected (system: conversation ends without action, 7-day timeout)
```

### Invite status FSM

```
pending → accepted (user first login)
pending → revoked (admin revokes)
accepted → revoked (admin revokes post-signup)
accepted → deleted (user deletes account)
```

---

## Indexing Notes

Firestore composite indexes required:

1. `users/{uid}/sessions`: `(scheduledDate ASC, status ASC)` — plan view
2. `users/{uid}/sessions`: `(phase ASC, week ASC, dayOfWeek ASC)` — plan structure view
3. `users/{uid}/briefs`: `(date DESC)` — briefs list
4. `users/{uid}/reviews`: `(generatedAt DESC)` — reviews list
5. `costs`: `(date DESC)` — admin cost dashboard
6. `auditLog`: `(eventType ASC, timestamp DESC)` — compliance queries
