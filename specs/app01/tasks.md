---
description: "Task list for Kadera Running Coach v1"
---

# Tasks: Kadera Running Coach — v1

**Input**: Design documents from `specs/app01/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Tests**: No formal test suite in v1 scope per plan.md. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. US6 (Admin) precedes US1 (Onboarding) because invite
management must be available before the onboarding flow can be tested end-to-end.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo, install dependencies, configure build tooling,
and create shared utilities required by all subsequent phases.

- [x] T001 Create `package.json` with all production dependencies: react@18, react-dom@18, react-router-dom@6, zustand@5, firebase@10 (client SDK), vite@5, typescript@5, @vitejs/plugin-react, and dev dependencies (concurrently, express, @types/node, @types/express)
- [x] T002 Create `package.json` server dependencies: firebase-admin, @anthropic-ai/sdk, resend, and add npm scripts: `"dev": "concurrently \"vite\" \"tsx scripts/dev-server.ts\""`, `"build": "vite build"`, `"seed": "node scripts/seed-graph.mjs"`
- [x] T003 Create `vite.config.ts` with React plugin, `@` path alias pointing to `src/`, and `build.rollupOptions.output.manualChunks` for code splitting per screen
- [x] T004 Create `vercel.json` with: 12-function rewrites (`/api/:path* → api/:path*`), security headers (HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP, Referrer-Policy), and `functions` config (maxDuration: 30)
- [x] T005 [P] Create `tsconfig.json` with strict mode, path aliases matching vite.config.ts, and include paths for `src/` and `api/`
- [x] T006 [P] Create `src/types/index.ts` with all shared TypeScript interfaces: `User`, `Invite`, `Session`, `TrainingPlan`, `Phase`, `Conversation`, `Message`, `MasterNode`, `UserNode`, `FoodEntry`, `Activity`, `SpendCaps`, `KillSwitch`, `AuditEvent` — and the tier cap constants `TIER_CAPS: Record<'free'|'starter'|'elite', number> = {free:3, starter:15, elite:40}`
- [x] T007 [P] Create `src/design-system/tokens.ts` with all design token constants: color palette (brand.primary, brand.secondary, surface.*, text.*, feedback.*), typography (font.family.*, font.size.xs–4xl, font.weight.*, line.height.*), spacing (space.1–12 on 8px grid), border radius (radius.sm–full)
- [x] T008 [P] Create `src/lib/lazyRetry.ts` implementing chunk-failure recovery: wraps `React.lazy()` with retry logic (3 attempts, 1s delay, forces reload on final failure)
- [x] T009 Create `scripts/dev-server.ts` as an Express server on `process.env.DEV_SERVER_PORT || 3001` that proxies all `/api/*` requests to the corresponding `api/*.ts` handler files using `tsx` dynamic imports, mirroring Vercel's function routing
- [x] T010 Create `scripts/seed-graph.mjs` that reads `.specify/data/master-graph.json`, connects to Firestore via Admin SDK, and upserts each node into `masterGraph/{nodeId}` (idempotent — safe to re-run)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that ALL user stories depend on. No user story
implementation can begin until this phase is complete.

**⚠️ CRITICAL**: Foundational tasks must complete before any Phase 3+ work begins.

- [x] T011 Create `api/_lib/firestore.ts` initializing Firebase Admin SDK using `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` env vars; export a singleton `db: admin.firestore.Firestore` instance; in test/dev environments support a mock db override
- [x] T012 Create `api/_lib/auth.ts` exporting `verifyAuth(req): Promise<{uid, email, tier}>`. Logic: if `process.env.DEV_BYPASS_AUTH === 'true'` AND `process.env.VERCEL_ENV !== 'production'` → return stub `{uid:'dev-user-001', email:'dev@kadera.local', tier:'elite'}`; else verify Bearer token via `admin.auth().verifyIdToken()`; on failure write `auditLog(auth_failure)` and throw 401. Also export `verifyAdmin(req)` which calls `verifyAuth` then checks `admins/{email}` existence
- [x] T013 Create `api/_lib/audit.ts` exporting `writeAuditLog(event: AuditEvent): Promise<void>` that writes a document to `auditLog` collection with auto-ID. Enforce schema per research D-09: `auth_failure` (userId|null, path, reason, timestamp); `account_deleted` (userId, tablesCleared[], timestamp — no content); `data_export` (userId, exportScope[], timestamp); `admin_action` (actingAdminId, affectedUserId|null, action, params, timestamp)
- [x] T014 Create `api/_lib/rate-limit.ts` exporting `checkAndIncrementCap(uid: string): Promise<{allowed: boolean, remaining: number}>`. Reads `users/{uid}.tier` to get cap from `TIER_CAPS`, compares `dailyMessageCount` against cap (resetting if `dailyMessageDate !== today in user's timezone`), increments atomically via Firestore transaction if allowed
- [x] T015 Create `api/_lib/claude.ts` exporting `callClaude(params: ClaudeParams): Promise<{text, usage, costUSD}>`. Logic: (1) read `globalConfig/settings.killSwitch.enabled` → throw 503 if on; (2) estimate call cost and check against `spendCaps.dailyUSD` → throw 402 if exceeded; (3) call `@anthropic-ai/sdk` with `cache_control` on the system prompt message; (4) post-call: increment `costs/{date}` and `globalConfig/settings.spendCaps.currentDailyUSD` via Firestore batch write; return `{text, usage, costUSD}`
- [x] T016 Create `api/_lib/vdot.ts` exporting `deriveVdot(distanceKm: number, timeSeconds: number): number` implementing the Jack Daniels VDOT formula. Also export `getPaceForZone(vdot: number, zone: 'easy'|'marathon'|'threshold'|'interval'|'repetition'): number` returning pace in seconds/km
- [x] T017 Create `src/stores/auth-store.ts` as a Zustand store with: `user: AuthUser | null`, `isAdmin: boolean`, `isLoading: boolean`, `signIn(): Promise<void>` (Firebase Google OAuth or bypass stub), `signOut(): Promise<void>`, `initialize(): void` (attach onAuthStateChanged listener or set bypass stub immediately when `import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'`)
- [x] T018 Create `src/components/MobileShell.tsx` as the sole layout component. Props: `tabs: TabDef[]`, `isAdmin: boolean`. Renders: `<Outlet />` as main content area; bottom tab bar (fixed, z-50) for viewport < 768px; fixed left sidebar (w-64) for viewport ≥ 768px. Tab definitions include icon, label, path. Admin tab appended automatically when `isAdmin === true`. Hides navigation when current route is `/onboarding`
- [x] T019 Create `src/App.tsx` defining all routes using React Router v6 `<Routes>`. Public routes: `/welcome` (Waitlist screen). Protected routes (require auth + invite): wrapped in `<ProtectedRoute>` component that redirects unauthenticated users to `/welcome` and non-invited users to an "access denied" state. Onboarding route: redirects to `/brief` if onboarding already complete. Admin routes: wrapped in `<AdminRoute>` component. All screen imports use `lazyRetry()`
- [x] T020 Create `src/main.tsx` as the application entry point: initializes Firebase app using env vars (or skips Firebase init when `import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'`), calls `auth-store.initialize()`, renders `<App />` inside `<BrowserRouter>` with `React.StrictMode`
- [x] T021 Create `src/lib/api.ts` with typed async functions wrapping `fetch()` for every API endpoint defined in `contracts/api-app01.md` and `contracts/api-shell.md`. Each function: reads the auth token from `auth-store`, sets `Authorization: Bearer <token>` header, throws typed `ApiError` on non-2xx responses

**Checkpoint**: Foundation complete — all user story implementation can now begin.

---

## Phase 3: User Story 6 — Admin Manages the Platform (Priority: P1)

**Goal**: Admin can sign in, manage invites, toggle kill switch, configure spend caps,
and view user data. Required before US1 can be tested end-to-end (invite creation).

**Independent Test**: Sign in with admin email → access `/admin` → add invite for test
email → verify invite appears in list → toggle kill switch on → verify subsequent
`/api/coach/chat` calls return 503 → toggle off → set spend cap to $0.01 → verify
next AI call is blocked → reset cap → view users list.

- [x] T022 [P] [US6] Create `src/stores/admin-store.ts` Zustand store with: `stats`, `invites`, `users`, `settings` state slices; actions: `fetchDashboard()`, `fetchInvites()`, `addInvite(email)`, `revokeInvite(email)`, `fetchUsers()`, `changeUserTier(uid, tier)`, `fetchSettings()`, `toggleKillSwitch(enabled)`, `updateSpendCaps(caps)`
- [x] T023 [US6] Create `api/admin.ts` as a Vercel function that routes by `req.url` path segment: `/api/admin/dashboard` → `handleDashboard`, `/api/admin/invites` → `handleInvites`, `/api/admin/settings` → `handleSettings`, `/api/admin/users` → `handleUsers`. All routes require `verifyAdmin()` from `api/_lib/auth.ts`; non-admins receive 403 + `auditLog(admin_access_denied)`
- [x] T024 [US6] Implement `GET /api/admin/dashboard` in `api/admin.ts`: reads `globalConfig/settings`, latest `costs/{today}` and `costs/{thisMonth}` aggregate, total user count from `users` collection count query, active-today count (lastLoginAt today). Returns combined dashboard payload per `contracts/api-app01.md §admin/dashboard`
- [x] T025 [US6] Implement `GET /api/admin/invites` (list all invites from `invites` collection), `POST /api/admin/invites` (create `invites/{email}` with status `pending`, write `auditLog(admin_action, invite_add)`), and `PATCH /api/admin/invites/:email` (set status to `revoked`, write `auditLog(admin_action, invite_revoke)`) in `api/admin.ts`
- [x] T026 [US6] Implement `GET /api/admin/users` (list `users` collection with tier, dailyMessageCount, lastLoginAt, onboardingStatus — paginated at 100) and `PATCH /api/admin/users/:uid` (update tier field, write `auditLog(admin_action, tier_change)`) in `api/admin.ts`
- [x] T027 [US6] Implement `PATCH /api/admin/settings` in `api/admin.ts`: handle `killSwitch` toggle (update `globalConfig/settings.killSwitch`, write `auditLog(admin_action, kill_switch_on|off)`) and `spendCaps` update (update `globalConfig/settings.spendCaps`, write `auditLog(admin_action, spend_cap_update)`). Kill switch change must propagate within 60s (Firestore real-time read on next Claude call)
- [x] T028 [P] [US6] Create `src/screens/admin/AdminDashboard.tsx` displaying: user count, active today, daily/monthly AI cost (USD), kill switch status toggle, spend cap display, last 10 audit events table. Uses tokens from `design-system/tokens.ts`
- [x] T029 [P] [US6] Create `src/screens/admin/AdminInvites.tsx` with: invite list table (email, status, createdAt, acceptedAt), add-invite form (email input + submit button), revoke action per row. Shows empty state when no invites
- [x] T030 [P] [US6] Create `src/screens/admin/AdminSettings.tsx` with: kill switch toggle `<Button>` (danger variant when active), daily/monthly spend cap inputs, save button. Kill switch state from `admin-store.ts`
- [x] T031 [P] [US6] Create `src/screens/admin/AdminUsers.tsx` with: user table (email, tier badge, daily messages / cap, last login, onboarding status), tier-change dropdown per row. Uses `<Badge variant="tier">` component

**Checkpoint**: Admin panel fully functional. Invites can be created to enable US1 testing.

---

## Phase 4: User Story 1 — Invited Athlete Joins and Completes Onboarding (Priority: P1)

**Goal**: Invited user can sign in (or use dev bypass), complete AI intake conversation,
and land on the dashboard with a personalised training plan.

**Independent Test**: Seed invite via admin panel or directly in Firestore → sign in
(or use DEV_BYPASS_AUTH) → complete multi-step intake → verify `users/{uid}/plan` and
`users/{uid}/sessions` documents exist with VDOT-derived paces and HR zones → verify
`users/{uid}/userGraph` has intake nodes → verify app routes to `/brief`.

- [x] T032 Create `api/waitlist.ts` Vercel function handling `POST /api/waitlist`: validate email format, upsert `waitlist/{email}` (idempotent), send confirmation email via Resend SDK (gracefully skips if `RESEND_API_KEY` absent or 100/day cap hit), return `{status: 'added'|'already_registered'}` per `contracts/api-shell.md`
- [x] T033 [P] [US1] Create `src/stores/profile-store.ts` Zustand store with: `profile: AthleteProfile | null`, `onboardingStatus`, `isLoading`; actions: `fetchProfile()`, `updateProfile(partial)`, `setOnboardingStatus(status)`
- [x] T034 [P] [US1] Create `src/stores/plan-store.ts` Zustand store with: `plan: TrainingPlan | null`, `sessions: Session[]`, `isLoading`; actions: `fetchPlan()`, `updateSession(id, partial)`, `applyAdjustment(adjustmentId)`
- [x] T035 Create `api/intake.ts` Vercel function: routes by `req.body.step` number. Steps 0–N ask intake questions via Claude (collect name, weight, targetRace, targetTime, weeklyKm, maxHR, mostRecentRaceResult, injuries, traps). On final step: call `generatePlan()` in `api/_handlers/intake-plan.ts`, write `users/{uid}/profile`, write plan + sessions, init userGraph nodes, set `onboardingStatus: 'complete'`. Returns `{isComplete, message, step}` or `{isComplete: true, profile, planSummary}`
- [x] T036 Create `api/_handlers/intake-plan.ts` exporting `generatePlan(profile: AthleteProfile): PlanDocument`. Logic: call `deriveVdot()` from `api/_lib/vdot.ts`; compute HR zones from `profile.maxHR`; generate 7 phases × mesocycle (3 training weeks + 1 recovery week); scale session volumes from `profile.currentWeeklyKm`; assign session types (easy/threshold/VO2max/long_run/recovery) per phase; return structured plan with all sessions. Write all sessions as individual `users/{uid}/sessions/{sessionId}` documents
- [x] T037 Create `api/_handlers/intake-graph.ts` exporting `initUserGraph(uid: string, profile: AthleteProfile): Promise<void>`. Creates `users/{uid}/userGraph` documents for: profile nodes (name, weight), goal nodes (targetRace, targetTime, targetDate), fitness nodes (vdot, maxHR, weeklyKm), injury nodes (one per activeInjury), trap nodes (one per behaviouralTrap). Each node sets `source: 'intake'` and maps `masterNodeRefs` to relevant master graph node IDs
- [x] T038 Create `src/screens/Waitlist.tsx` showing: (a) if not signed in — Google sign-in button + waitlist email form; (b) if signed in but not invited — "You're on the waitlist" message + option to re-check; (c) if signed in and invited but onboarding incomplete — redirect to `/onboarding`. Uses `auth-store.ts` and `api.ts`
- [x] T039 Create `src/screens/Onboarding.tsx` intake conversation UI: renders a chat-like interface with coach messages (from `api/intake.ts` responses) and athlete input (text field + submit). Shows progress indicator (step N of total). Handles resume from interrupted session (reads `users/{uid}.onboardingStep`). On `isComplete: true` → redirect to `/brief`

**Checkpoint**: Invited athlete can complete full onboarding and land on the dashboard with a training plan.

---

## Phase 5: User Story 2 — Athlete Uses the Daily Coaching Loop (Priority: P1)

**Goal**: Athlete sees a daily morning brief, chats with the AI coach, logs feel scores,
and generates post-run and weekly reviews.

**Independent Test**: Given seeded athlete with plan → open `/brief` → verify brief
generated (or served from cache) with today's session → send chat message → verify
response returns with `remainingMessages` → log feel score on a session → trigger
post-run review → verify `users/{uid}/reviews` document created.

- [x] T040 [P] [US2] Create `src/stores/brief-store.ts` Zustand store with: `brief: MorningBrief | null`, `isLoading`; action: `fetchBrief()` (calls `POST /api/coach/brief`)
- [x] T041 [P] [US2] Create `src/stores/chat-store.ts` Zustand store with: `messages: Message[]`, `conversationId: string | null`, `isTyping: boolean`, `remainingMessages: number`, `pendingAdjustment: AdjustmentAction | null`; actions: `sendMessage(text)`, `resolveAdjustment(id, decision)`, `fetchConversation()`
- [x] T042 Create `api/weather.ts` Vercel function handling `GET /api/weather`: verify auth, read user's `profile.location`, call OpenWeatherMap API (key from `OPENWEATHERMAP_API_KEY`), return `{condition, tempC, feelsLikeC, windKmh, humidity, location}`. On any error (missing key, API failure, timeout) → return `null` (graceful degradation per research D-03)
- [x] T043 Create `api/_handlers/morning-brief.ts` exporting `generateBrief(uid: string): Promise<BriefDocument>`. Logic: check if brief exists for today (return cached if so); fetch today's session from `users/{uid}/sessions` by `scheduledDate === today`; call OpenWeatherMap directly using `OPENWEATHERMAP_API_KEY` for weather context (return `null` on any error); assemble layered Claude prompt (system: coaching persona, user: profile + plan summary + recent feel scores, context: today's session + weather); call `api/_lib/claude.ts`; write `users/{uid}/briefs/{date}`; return brief
- [x] T044 Create `api/_handlers/chat.ts` exporting `processChat(uid: string, message: string, conversationId: string): Promise<ChatResponse>`. Logic: check/increment cap via `api/_lib/rate-limit.ts`; fetch conversation history (last 8 message pairs or compressed summary); fetch top-5 relevant master graph nodes by keyword-to-cluster matching against `message`; assemble layered prompt (system cached, user context block, conversation window, knowledge nodes, user message); call Claude with structured tag spec; parse `<plan_adjustment>`, `<pattern_detected>`, `<session_complete>` tags from response; write parsed actions to Firestore; append message + reply to `conversations/{conversationId}/messages`; return `{reply, actions, remainingMessages, costUSD}`
- [x] T045 Create `api/_handlers/reviews.ts` exporting `generateReview(uid: string, type: 'post_run'|'weekly', sessionId?: string): Promise<ReviewDocument>`. For post_run: fetch the specific session + feel score; for weekly: fetch all sessions from current week + their feel scores + detected patterns; assemble review prompt; call Claude; write `users/{uid}/reviews/{reviewId}`; return review
- [x] T046 Create `api/coach.ts` Vercel function routing by URL path segment: `POST /api/coach/brief` → `generateBrief()`, `POST /api/coach/chat` → `processChat()`, `POST /api/coach/review` → `generateReview()`. All routes require `verifyAuth()`. Returns 503 with `{error:'ai_unavailable'}` if kill switch active (checked in `api/_lib/claude.ts`)
- [x] T047 Create `src/screens/MorningBrief.tsx` displaying: brief content as formatted markdown (using a lightweight markdown renderer), today's session card (`<Card>` with session type, target pace via `<PaceDisplay>`, target HR zone via `<HRZoneBar>`, distance), weather context chip when available. Shows skeleton loader during generation (> 300ms). Shows "no session today" empty state when `no_session_today` returned
- [x] T048 Create `src/screens/CoachChat.tsx` with: scrolling message list (`<AthleteBubble>` and `<CoachBubble>` components), text input + send button, typing indicator while awaiting response, `<ActionCard>` for pending plan adjustments (Accept / Reject buttons), message cap counter badge, error state for 503 (kill switch) and 402 (cap exceeded with upgrade CTA)

**Checkpoint**: Daily coaching loop fully functional — brief, chat, feel logging, reviews.

---

## Phase 6: User Story 3 — Athlete Manages and Adapts Their Training Plan (Priority: P2)

**Goal**: Athlete can view the full training plan, swap sessions, log completions, and
accept or reject coach-proposed plan adjustments.

**Independent Test**: Given seeded athlete → open `/plan` → verify all 7 phases visible
→ open a session → swap it for cycling → verify session status changes to `swapped` →
receive a plan adjustment proposal in coach chat → accept it → verify affected session
fields updated in plan.

- [x] T049 [P] [US3] Create `api/plan.ts` Vercel function handling: `GET /api/plan` (fetch `users/{uid}/plan` + all `users/{uid}/sessions` ordered by phase/week/day); `PATCH /api/plan/session/:sessionId` (swap action: update status to `swapped`, set `swappedForType`; complete action: update status to `completed`, set `feelScore`, `completionNotes`, `completedAt`); `PATCH /api/plan/adjustment/:adjustmentId` (accept: apply `Change[]` fields to affected sessions, increment `plan.version`; reject: set status `rejected`). All routes require `verifyAuth()`
- [x] T050 [US3] Create `api/_handlers/plan-adjustment.ts` exporting `applyAdjustment(uid: string, adjustmentId: string): Promise<void>`. Fetches `adjustments/{adjustmentId}`, validates status is `pending`, iterates `proposedChanges[]` and writes each `{field, newValue}` to the corresponding `sessions/{sessionId}` document, sets `session.adjustmentId`, updates `plan.version` via Firestore transaction, sets adjustment status to `accepted`
- [x] T051 [P] [US3] Create `src/screens/TrainingPlan.tsx` showing: phase tabs or accordion (Phase 1–7), within each phase a week-by-week grid of `<DayPill>` components coloured by session type (tokens), phase progress indicator. Tapping a session navigates to `/plan/:sessionId`
- [x] T052 [P] [US3] Create `src/screens/SessionDetail.tsx` showing: session title, type chip (`<PhaseChip>`), target pace (`<PaceDisplay>`), HR zone bar (`<HRZoneBar>`), distance, date. Actions: "Mark Complete" button → opens `<BottomSheet>` with `<FeelScorePicker>` + optional notes field; "Swap Session" button → opens `<BottomSheet>` with cross-training type selector. Shows adjustment history if `session.adjustmentId` set

**Checkpoint**: Training plan view and adaptation fully functional.

---

## Phase 7: User Story 4 — Athlete Explores the Knowledge Galaxy (Priority: P3)

**Goal**: Athlete opens the Knowledge Galaxy and sees an interactive 3D scene combining
the master knowledge graph with their personal nodes orbiting it.

**Independent Test**: Given seeded master graph + athlete with intake nodes → open
`/galaxy` → verify scene renders within 5s → hover (or tap) a master node → verify
tooltip shows title + description → verify user nodes orbit near their connected master
nodes → verify cross-link bridges visible.

- [x] T053 [P] [US4] Create `src/stores/graph-store.ts` Zustand store with: `masterNodes: MasterNode[]`, `userNodes: UserNode[]`, `isLoading: boolean`; action: `fetchGraph()` (calls `GET /api/graph`, populates store)
- [x] T054 Create `api/graph.ts` Vercel function handling `GET /api/graph`: verify auth; batch-read all documents from `masterGraph` collection and `users/{uid}/userGraph` collection; return `{masterNodes, userNodes}` per `contracts/api-app01.md §graph`. Requires `verifyAuth()`
- [x] T055 Create `src/lib/galaxy/layout.ts` exporting `computeUserNodePosition(userNode: UserNode, masterNodes: MasterNode[]): {x, y, z}`. For each user node, find its primary `masterNodeRef`'s 3D position, then compute an orbital offset using the node's index and a fixed orbit radius (e.g. 0.8 units). Returns `{x, y, z}` for placement in the Three.js scene
- [x] T056 Create `src/lib/galaxy/nodes.ts` exporting `createMasterNodeMesh(node: MasterNode): THREE.Mesh` (sphere geometry, `MeshPhongMaterial` using node's `color` token, userData for hover detection) and `createUserNodeMesh(node: UserNode): THREE.Mesh` (smaller sphere, brand secondary color). Export `createEdgeLine(from: THREE.Vector3, to: THREE.Vector3, weight: number): THREE.Line` for master edges and cross-link bridges
- [x] T057 Create `src/lib/galaxy/scene.ts` exporting `initScene(canvas: HTMLCanvasElement): GalaxyScene`. Sets up: `THREE.WebGLRenderer` (antialias, pixel ratio), `PerspectiveCamera`, `AmbientLight` + `PointLight`, `OrbitControls` (mouse/touch rotate/zoom/pan). Exports `addNodes(masterNodes, userNodes)`, `startAnimation()`, `stopAnimation()`, `dispose()`. Handles `prefers-reduced-motion`: if set, renders static (no animation loop)
- [x] T058 Create `src/screens/Galaxy.tsx` as the Three.js canvas container. Checks `window.THREE` availability (CDN load). Shows skeleton/spinner while graph data loads (`graph-store.isLoading`). On load: init scene, add all nodes and edges, start animation. On hover (pointermove): raycasts to detect node hover, shows tooltip `<div>` with node title + description. On mobile (touch): tap equivalent to hover. Respects `prefers-reduced-motion` via `src/lib/galaxy/scene.ts`

**Checkpoint**: Knowledge Galaxy renders and is interactive with master + user nodes.

---

## Phase 8: User Story 5 — Athlete Logs Food and Uploads Activity Data (Priority: P3)

**Goal**: Athlete can log a meal (photo or text) and receive macro estimates, and can
upload a Garmin CSV to populate their activity history.

**Independent Test**: Submit text meal → verify macro response returned and
`users/{uid}/meals` document created. Upload valid Garmin CSV (≤ 4MB) → verify import
count returned and activities visible. Re-upload same CSV → verify zero duplicates.
Upload malformed CSV → verify error returned, no partial data.

- [x] T059 [P] [US5] Create `src/stores/food-store.ts` Zustand store with: `meals: FoodEntry[]`, `isLoading: boolean`; actions: `fetchMeals()`, `logMeal(inputType, text?, photoBase64?)`
- [x] T060 [P] [US5] Create `src/stores/garmin-store.ts` Zustand store with: `activities: Activity[]`, `lastImport: ImportResult | null`, `isLoading: boolean`; actions: `fetchActivities()`, `importCsv(file: File)`
- [x] T061 Create `api/food.ts` Vercel function handling `POST /api/food`: verify auth, check kill switch; if `inputType === 'photo'` validate base64 size ≤ 3MB (reject 413 if over); send to Claude vision/text with macro-estimation prompt; write `users/{uid}/meals/{mealId}`; return `{mealId, macros, estimateNotes}` per `contracts/api-app01.md §food`
- [x] T062 Create `api/garmin.ts` Vercel function handling `POST /api/garmin/import`: verify auth; parse `multipart/form-data` file field (reject 413 if > 4MB); parse CSV rows extracting Activity Type, Date, Distance, Time, Avg HR, Max HR, Calories, Title; compute `dedupHash = SHA-256(date+activityType+distance+duration)` per row; batch-read existing hashes from `users/{uid}/activities` to identify duplicates; write new activities to `users/{uid}/activities` in Firestore batch; return `{importBatchId, imported, skipped, errors, total}` per `contracts/api-app01.md §garmin`
- [x] T063 [P] [US5] Create `src/screens/FoodLog.tsx` with: text input area + camera/photo upload button + submit button; response card showing macro breakdown (protein, carbs, fat, calories) with visual bar chart using token colors; scrollable meal history list. Shows empty state with CTA when no meals logged
- [x] T064 [P] [US5] Create `src/screens/GarminImport.tsx` with: file drag-drop / select input (accepts .csv, max 4MB); import progress indicator; results summary card (`imported N, skipped N duplicates`); error state for malformed CSV; link to activity history. Shows empty state when no activities imported yet

**Checkpoint**: Food logging and Garmin import fully functional, including deduplication.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Account management, GDPR compliance endpoints, Firestore configuration,
and PWA setup.

- [x] T065 [P] Create `src/stores/profile-prefs-store.ts` Zustand store with: `coachStyle: CoachStyle`, `isLoading: boolean`; actions: `fetchPrefs()`, `updateCoachStyle(style)`
- [x] T066 [P] Create `api/account.ts` Vercel function handling: `GET /api/account` (fetch `users/{uid}` + `profile` subcollection + computed dailyMessageCap from tier); `PATCH /api/account/prefs` (update `coachStyle` on `users/{uid}`, return updated value). Requires `verifyAuth()`
- [x] T067 Implement `DELETE /api/account` in `api/account.ts`: require `{confirmation: 'DELETE MY ACCOUNT'}` body; delete subcollections in order (`sessions`, `conversations`, `briefs`, `reviews`, `adjustments`, `userGraph`, `meals`, `activities`, `profile`) using Firestore Admin batch operations; delete `users/{uid}` document; update `invites/{email}.status` to `'deleted'`; delete Firebase Auth user via `admin.auth().deleteUser(uid)`; write `auditLog(account_deleted, {userId, tablesCleared})` — no content fields; return 204
- [x] T068 Create `api/export.ts` Vercel function handling `GET /api/export`: verify auth; read `users/{uid}/profile`, all `sessions`, all `meals`, all `activities`, all `reviews`; assemble JSON export object; write `auditLog(data_export, {userId, exportScope})`; return `application/json` with `Content-Disposition: attachment; filename=kadera-export-{date}.json`
- [x] T069 Create `src/screens/Settings.tsx` with: coach style selector (4 options: motivator, analytical, gentle, challenger from `contracts/api-app01.md §prefs`), account section (export data button, delete account button). Delete account opens `<BottomSheet>` confirmation requiring the user to type "DELETE MY ACCOUNT" before the button activates. Uses `profile-prefs-store.ts`
- [x] T070 Create `firestore.rules` with: deny-all default (`allow read, write: if false`); `users/{uid}/**` readable by own uid only (for any future client reads); `masterGraph/**` readable by any authenticated user; `auditLog/**` readable by admins only; `globalConfig/**` readable by authenticated users (kill switch status for client-side indicator). All writes remain server-side (Admin SDK bypasses rules)
- [x] T071 Create `firestore.indexes.json` with all 6 composite indexes from `data-model.md §Indexing Notes`: sessions (scheduledDate ASC, status ASC), sessions (phase ASC, week ASC, dayOfWeek ASC), briefs (date DESC), reviews (generatedAt DESC), costs (date DESC), auditLog (eventType ASC, timestamp DESC)
- [x] T072 Create `public/manifest.json` with: name "Kadera", short_name "Kadera", start_url "/", display "standalone", theme_color (from `tokens.color.brand.primary`), background_color (from `tokens.color.surface.base`), icons (192×192 and 512×512 PNG)
- [x] T073 Create `public/sw.js` service worker that pre-caches shell assets (index.html, core JS bundles, manifest.json) on install; serves cached shell on navigation requests; bypasses cache for all `/api/*` requests (always network)
- [x] T074 [P] Verify in `api/_lib/auth.ts` that `DEV_BYPASS_AUTH` is hard-blocked when `process.env.VERCEL_ENV === 'production'`: throw an explicit error if bypass is attempted in production, ensuring no accidental deployment with auth disabled
- [x] T075 Mobile responsiveness audit: open each screen at 320px viewport width in browser devtools and verify: no horizontal overflow, all touch targets ≥ 44px, tab bar not obscured by content, Galaxy canvas fits viewport, all forms usable on mobile keyboard

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US6 Admin (Phase 3)**: Depends on Foundational — can start after Phase 2
- **US1 Onboarding (Phase 4)**: Depends on Foundational; benefits from US6 (invite creation)
- **US2 Daily Loop (Phase 5)**: Depends on US1 complete (needs athlete + plan in Firestore)
- **US3 Plan Mgmt (Phase 6)**: Depends on US1 + US2 (needs plan + chat for adjustments)
- **US4 Galaxy (Phase 7)**: Depends on Foundational + seeded master graph; largely independent
- **US5 Food/Garmin (Phase 8)**: Depends on Foundational; independent from US1–US3
- **Polish (Phase 9)**: Depends on all user story phases complete

### User Story Dependencies

- **US6 (P1)**: Can start after Foundational — independent of all other stories
- **US1 (P1)**: Can start after Foundational (US6 invite creation aids testing but not required)
- **US2 (P1)**: Requires US1 complete — needs seeded athlete with training plan
- **US3 (P2)**: Requires US1 + US2 — needs plan for session swaps, chat for adjustments
- **US4 (P3)**: Requires Foundational + seeded master graph — independent of US1-US3
- **US5 (P3)**: Requires Foundational — independent of US1-US4

### Within Each User Story

- API functions before UI screens (screens depend on API types and responses)
- Store before screen (screen imports store)
- Shared handlers before function router (function imports handlers)

### Parallel Opportunities

- T005–T008 in Phase 1 are fully parallel
- T011–T016 in Phase 2 are fully parallel (different files)
- T017, T018, T019, T020, T021 in Phase 2 are parallel to T011–T016
- T022 and T023–T027 in Phase 3: store parallel to API implementation
- T028–T031 in Phase 3: all 4 admin screens parallel
- Within each user story: store creation is parallel to API implementation

---

## Parallel Execution Examples

### Phase 3 (US6 Admin)

```
Parallel batch 1 (no inter-dependencies):
  T022 — admin-store.ts
  T023 — api/admin.ts router skeleton

Sequential (T023 must exist first):
  T024 → T025 → T026 → T027 — route implementations

Parallel batch 2 (after T022 + T023–T027):
  T028 — AdminDashboard.tsx
  T029 — AdminInvites.tsx
  T030 — AdminSettings.tsx
  T031 — AdminUsers.tsx
```

### Phase 4 (US1 Onboarding)

```
Parallel batch 1:
  T033 — profile-store.ts
  T034 — plan-store.ts
  T035 — api/intake.ts (depends on T036, T037 — do T036+T037 first)

Sequential:
  T036 — intake-plan.ts handler
  T037 — intake-graph.ts handler
  T035 — api/intake.ts (imports T036, T037)

Parallel batch 2 (after stores + API):
  T038 — Waitlist.tsx
  T039 — Onboarding.tsx
```

### Phase 5 (US2 Daily Loop)

```
Parallel batch 1:
  T040 — brief-store.ts
  T041 — chat-store.ts
  T042 — api/weather.ts
  T043 — morning-brief.ts handler
  T044 — chat.ts handler
  T045 — reviews.ts handler

Sequential:
  T046 — api/coach.ts router (imports T043, T044, T045)

Parallel batch 2:
  T047 — MorningBrief.tsx
  T048 — CoachChat.tsx
```

---

## Implementation Strategy

### MVP First (US6 + US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US6 Admin (create first invite)
4. Complete Phase 4: US1 Onboarding
5. **STOP AND VALIDATE**: Sign in with seeded invite, complete intake, verify plan generated
6. Deploy to Vercel and confirm production auth works

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US6 Admin → Ops team can manage invites
3. US1 Onboarding → First athlete can join (MVP)
4. US2 Daily Loop → Core coaching loop live (retention driver)
5. US3 Plan Management → Plan adaptation live
6. US4 Galaxy → Visualisation live
7. US5 Food/Garmin → Data enrichment live
8. Polish → GDPR, PWA, Firestore rules hardened

### Parallel Team Strategy (if staffed)

Once Foundational (Phase 2) is complete:
- Developer A: US6 Admin + US1 Onboarding
- Developer B: US2 Daily Loop (after US1 complete)
- Developer C: US4 Galaxy (independent, starts immediately after Foundational)

---

## Notes

- `[P]` tasks have no intra-story dependencies — safe to run in parallel
- `[Story]` label maps task to spec.md user story for traceability
- All tasks reference exact file paths — implementable without additional context
- No test tasks included (no formal test suite in v1 per plan.md); smoke-test each story at its checkpoint
- Commit after each phase checkpoint at minimum; prefer per-task commits
- Firestore rules (T070) and indexes (T071) must be deployed before production launch
- Three.js (r128) must be CDN-loaded in `index.html`; import via `window.THREE` in galaxy code
- `VITE_DEV_BYPASS_AUTH=true` in `.env.local` enables Chromebook dev mode for frontend; `DEV_BYPASS_AUTH=true` enables it for API — both are hard-blocked in production
