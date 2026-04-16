# Implementation Plan: Kadera Running Coach — v1

**Branch**: `master` (pre-feature-branch; init phase)
**Date**: 2026-04-14
**Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/app01/spec.md`

---

## Summary

Kadera is a mobile-first AI running coach PWA. The v1 build delivers an end-to-end
coaching experience: invite-gated access, AI-guided onboarding, a daily coaching loop
(morning brief + chat + reviews), a personalised 7-phase training plan with athlete-driven
adaptations, a 3D knowledge galaxy, food logging, Garmin activity import, and a
4-tab admin panel — all on a Vercel Hobby + Firestore + Firebase Auth stack.

The app is the first "micro app" within the Kadera shell architecture. The shell and
shared UI/UX conventions are defined in `specs/ux-dna.md`. Future renewals (app02, app03)
reuse the shell and may diverge in features and data.

---

## Technical Context

**Language/Version**: TypeScript (React 18, Node.js 18+)
**Primary Dependencies**: React 18, Vite 5, Zustand 5, Three.js r128 (CDN), Firebase Admin SDK, Anthropic SDK, Resend SDK
**Storage**: Firestore (Spark tier)
**Testing**: No formal test suite in v1 scope — gap documented; integration smoke tests recommended before each deploy
**Target Platform**: Web PWA, mobile-first (Vercel Hobby, `kaderarunning.ai`)
**Project Type**: web-service + mobile-first PWA
**Performance Goals**: Coach responses p90 < 10s; Galaxy load < 5s (mid-range mobile, 4G); CSV import < 30s/500 activities
**Constraints**: Vercel 12 functions (11 used); 30s per function timeout; Firestore deny-all; auth bypass blocked in production; Resend 100 emails/day
**Scale/Scope**: Beta scale 0-200 MAU; single monorepo; 11 API serverless functions

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### I. Frontend Philosophy ✅

| Rule | Status | Note |
|------|--------|------|
| React SPA, no SSR | ✅ PASS | Vite SPA, PWA delivered via Vercel CDN |
| Single `MobileShell` layout | ✅ PASS | Bottom tab bar <768px, sidebar ≥768px |
| All screens lazy-loaded + `lazyRetry` | ✅ PASS | Vite dynamic imports with chunk recovery |
| State via Zustand only (no Redux, no Context) | ✅ PASS | 10 scoped Zustand stores |
| Design tokens in `design-system/tokens.ts` | ✅ PASS | No inline visual values |
| PWA, CDN delivery | ✅ PASS | `vercel.json` configures headers + service worker |

### II. Dependency Policy ✅

| Rule | Status | Note |
|------|--------|------|
| Prefer managed services | ✅ PASS | Firebase, Vercel, Anthropic, Resend |
| CDN-load heavy optional deps | ✅ PASS | Three.js r128 via CDN script tag |
| Model-agnostic AI layer | ✅ PASS | Context injection only; model ID is the only swap point |
| No dormant deps without activation gate | ✅ PASS | Strava, Terra, Neo4j gated per constitution |
| Tiered scaling (not premature rewrites) | ✅ PASS | Thresholds defined in constitution |

### III. Platform & Deployment ✅

| Rule | Status | Note |
|------|--------|------|
| Vercel Hobby ≤ 12 functions | ✅ PASS | 11 functions (1 spare) |
| Router pattern for sub-routes | ✅ PASS | `api/coach.ts` and `api/admin.ts` are routers |
| Firestore deny-all + Admin SDK only | ✅ PASS | No client-side writes |
| Firebase Auth + server-side token verification | ✅ PASS | Bypass hard-blocked in production |
| Per-call cost tracking + kill switch + spend caps | ✅ PASS | `api/_lib/claude.ts` wraps all AI calls |
| Security headers in `vercel.json` | ✅ PASS | HSTS, X-Frame-Options, CSP |

### Compliance (GDPR + Audit Logging) ✅

| Requirement | Implementation |
|-------------|---------------|
| GDPR right to erasure | `DELETE /api/account` hard-deletes all user data + Firebase Auth |
| GDPR right to portability | `GET /api/export` returns structured JSON of all athlete data |
| Auth failure / access-denied audit log | `api/_lib/auth.ts` writes to `auditLog` |
| Account deletion audit log (no content) | `DELETE /api/account` per D-09 schema |
| Data export audit log | `GET /api/export` writes to `auditLog` |
| Admin status-change audit log | All `PATCH /api/admin/*` writes to `auditLog` |

---

## Project Structure

### Documentation (this feature)

```text
specs/app01/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-app01.md     # Authenticated API endpoints
│   └── api-shell.md     # Unauthenticated endpoints
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── pre-tasks.md     # Pre-tasks checklist
├── wireframes/          # Visual designs (added separately)
└── tasks.md             # Phase 2 output (/speckit.tasks)

specs/
├── ux-dna.md            # UI/UX DNA — global design rules
└── constitution.md      # Symlink to .specify/memory/constitution.md
```

### Source Code (repository root)

```text
kadera/
├── api/                        # Vercel serverless functions (11 of 12 slots used)
│   ├── _lib/                   # Shared helpers (not counted as Vercel functions)
│   │   ├── auth.ts             # Token verification + dev bypass
│   │   ├── firestore.ts        # Firestore Admin SDK client
│   │   ├── claude.ts           # Anthropic client + cost tracking + kill switch
│   │   ├── rate-limit.ts       # Daily message cap enforcement
│   │   ├── vdot.ts             # Jack Daniels VDOT formula
│   │   └── audit.ts            # Structured audit log writer
│   ├── _handlers/              # Sub-handlers (not counted as Vercel functions)
│   │   ├── morning-brief.ts    # Brief generation logic
│   │   ├── chat.ts             # Coach chat + structured tag parsing
│   │   ├── reviews.ts          # Post-run and weekly review generation
│   │   └── plan-adjustment.ts  # Adjustment proposal + acceptance logic
│   ├── waitlist.ts             # UC-01
│   ├── intake.ts               # UC-03
│   ├── coach.ts                # UC-04, 05, 06, 07, 08 (router)
│   ├── plan.ts                 # Training plan CRUD + swaps
│   ├── graph.ts                # Knowledge graph fetch + merge
│   ├── food.ts                 # UC-09 food logging
│   ├── garmin.ts               # UC-10 Garmin CSV import
│   ├── admin.ts                # UC-12 admin panel (router)
│   ├── weather.ts              # OpenWeatherMap proxy
│   ├── account.ts              # Profile, prefs, GDPR deletion
│   └── export.ts               # GDPR data export
│
├── src/                        # React frontend
│   ├── main.tsx                # App entry + Firebase init (or bypass)
│   ├── App.tsx                 # Root router
│   ├── components/
│   │   └── MobileShell.tsx     # SOLE layout handler (constitution I)
│   ├── screens/                # All lazy-loaded via lazyRetry()
│   │   ├── Waitlist.tsx
│   │   ├── Onboarding.tsx
│   │   ├── MorningBrief.tsx
│   │   ├── CoachChat.tsx
│   │   ├── TrainingPlan.tsx
│   │   ├── SessionDetail.tsx
│   │   ├── Galaxy.tsx
│   │   ├── FoodLog.tsx
│   │   ├── GarminImport.tsx
│   │   ├── Settings.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminInvites.tsx
│   │       ├── AdminSettings.tsx
│   │       └── AdminUsers.tsx
│   ├── stores/                 # 10 Zustand stores (constitution I)
│   │   ├── auth-store.ts
│   │   ├── profile-store.ts
│   │   ├── plan-store.ts
│   │   ├── chat-store.ts
│   │   ├── brief-store.ts
│   │   ├── graph-store.ts
│   │   ├── food-store.ts
│   │   ├── garmin-store.ts
│   │   ├── admin-store.ts
│   │   └── profile-prefs-store.ts
│   ├── design-system/
│   │   └── tokens.ts           # Design tokens — sole source of truth
│   ├── lib/
│   │   ├── lazyRetry.ts        # Chunk-failure recovery wrapper
│   │   ├── api.ts              # Typed fetch wrappers
│   │   └── galaxy/
│   │       ├── scene.ts        # Three.js scene setup + lifecycle
│   │       ├── nodes.ts        # Node mesh + hover
│   │       └── layout.ts       # User node orbital position calculation
│   └── types/
│       └── index.ts            # Shared TypeScript interfaces + tier definitions
│
├── scripts/
│   ├── dev-server.ts           # Express proxy mirroring Vercel routing
│   └── seed-graph.mjs          # Populate masterGraph from seed JSON
│
├── .specify/
│   ├── data/
│   │   └── master-graph.json   # 352KB master knowledge graph seed
│   └── memory/
│       └── constitution.md
│
├── vercel.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Structure Decision**: Web application with React SPA in `src/` and serverless
functions in `api/` (Vercel convention, co-located at repo root).

---

## Complexity Tracking

> No constitution violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | | |

---

## Phase 0: Research Summary

All technical unknowns resolved. See `research.md` for full decision log.

| Decision | Summary |
|----------|---------|
| D-01 | VDOT derived from race result via Jack Daniels formula (TS impl, no library) |
| D-02 | Three.js galaxy uses pre-seeded positions; no runtime force simulation |
| D-03 | Claude context: layered injection + structured XML tags for structured output |
| D-04 | Firestore graph: flat collections; cross-links as IDs on user nodes |
| D-05 | Dev auth bypass: stub user when `DEV_BYPASS_AUTH=true`; blocked in production |
| D-06 | Garmin CSV: custom parser, SHA-256 dedup |
| D-07 | GDPR erasure: immediate hard delete + audit log (no content) |
| D-08 | Spend tracking: pre-call cap enforcement via Firestore `globalConfig` |
| D-09 | Audit log: 4 structured event types (auth_failure, account_deleted, data_export, admin_action) |
| D-10 | Function budget: 11 of 12 Vercel functions used (1 spare) |

---

## Phase 1: Design Summary

### Data Model (`data-model.md`)

Top-level Firestore collections:

| Collection | Purpose |
|------------|---------|
| `users/{uid}` + 10 subcollections | All per-athlete data |
| `invites/{email}` | Invite gate |
| `waitlist/{email}` | Pre-invite interest |
| `admins/{email}` | Admin role |
| `masterGraph/{nodeId}` | Immutable coaching knowledge (~160 nodes) |
| `globalConfig/settings` | Kill switch + spend caps |
| `costs/{date}` | Daily AI cost aggregates |
| `auditLog/{logId}` | Compliance event log |

### API Contracts (`contracts/`)

11 Vercel functions serving 13 use cases. All auth via Firebase token verification.
All writes via Firestore Admin SDK. See `contracts/api-app01.md` and `contracts/api-shell.md`.

### Key Implementation Patterns

**Auth middleware** (`api/_lib/auth.ts`):
```
verify Bearer token → resolve uid → check invite status → check admin if required
on failure: write auditLog(auth_failure) → return 401/403
on dev bypass (non-production only): return stub user
```

**Claude wrapper** (`api/_lib/claude.ts`):
```
check kill switch → 503 if enabled
check spend cap (pre-call: currentDailyUSD + estimated > dailyUSD) → 402 if exceeded
call Anthropic API with cache_control on system prompt
post-call: increment costs/{date} + globalConfig spendCaps counters
```

**Layered coaching prompt** (D-03):
```
[system — cached]    Persona + methodology + XML tag spec
[user context]       Profile summary + plan + feel scores (7 days)
[conversation]       Last 8 message pairs (or compressed history)
[knowledge nodes]    Top-5 master nodes matching message topic
[user message]       Athlete's current message
```

**Chromebook dev mode** (D-05):
```
VITE_DEV_BYPASS_AUTH=true  → React uses stub auth store, skips Firebase init
DEV_BYPASS_AUTH=true       → API functions return stub user without token check
Both flags blocked in production (VERCEL_ENV === 'production' check in auth.ts)
```

---

## Next Step

Run `/speckit.tasks` to generate `specs/app01/tasks.md` with phased, independently
testable tasks organised by user story priority.
