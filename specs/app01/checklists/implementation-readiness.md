# Implementation Readiness Checklist: Kadera Running Coach — v1

**Purpose**: Pre-implementation self-check (author gate). Validates that spec, plan,
contracts, and data model are sufficiently complete, clear, and consistent to begin
task generation and coding without ambiguity blockers.
**Created**: 2026-04-14
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)
**Focus areas**: Security & Compliance · API Contract Quality · UX/Interaction Requirements · Data Model Completeness
**Depth**: Standard (pre-implementation author gate)

---

## Security & Compliance Requirements

- [ ] CHK001 — Is the invite gate rejection path fully specified — what happens when an
  email is authenticated but not in the invites collection? [Clarity, Spec §FR-001,
  Contracts api-shell]

- [ ] CHK002 — Are auth bypass rules in production quantified and auditable? Is it
  documented exactly which env-var check blocks bypass (e.g. `VERCEL_ENV === 'production'`),
  and is this the only check, or are there multiple guards? [Completeness, Plan §Auth middleware]

- [ ] CHK003 — Is the structured JSON schema for `auth_failure` audit log events
  complete? Does it specify what value is recorded for `userId` when the token is
  entirely absent (vs. expired vs. invalid)? [Clarity, Research §D-09]

- [ ] CHK004 — Is the `account_deleted` audit log event schema unambiguous about when
  the log is written — before, during, or after the Firestore batch delete? A failure
  mid-delete could produce a log without complete cleanup. [Completeness, Research §D-09]

- [ ] CHK005 — Does the GDPR erasure spec define the behaviour if one subcollection
  delete fails mid-sequence (partial deletion)? Is a retry policy or compensating
  transaction required? [Edge Case, Spec §FR-001, Contracts /api/account DELETE]

- [ ] CHK006 — Are the exact fields excluded from the `auditLog` explicitly listed
  (e.g. message content, feel scores, session notes, meal text)? An enumerated exclusion
  list is safer than a general "no content" rule. [Clarity, Research §D-09]

- [ ] CHK007 — Is the data export scope (`GET /api/export`) unambiguous? The contract
  notes conversation content is excluded. Is this a permanent exclusion or a v1
  deferral? And are all other structured personal data fields (profile, meals,
  activities, sessions) explicitly enumerated? [Completeness, Contracts §export]

- [ ] CHK008 — Are admin role escalation/de-escalation requirements specified? The
  data model shows `admins/{email}.active` but no spec requirement or API endpoint
  covers revoking admin status from another admin. [Gap, Data Model §admins]

- [ ] CHK009 — Is the Resend 100-email/day cap handled gracefully in the waitlist flow?
  Is it documented what happens when the cap is hit — does the signup succeed (with a
  silent email failure) or return an error to the user? [Edge Case, Spec §FR-002,
  Contracts §waitlist]

- [ ] CHK010 — Are session cookie / token storage requirements specified for the PWA?
  Firebase tokens stored in IndexedDB or localStorage have different XSS exposure
  profiles; is the choice and its implications documented? [Gap, Security]

- [ ] CHK011 — Are CORS policy requirements defined for the API functions? The contracts
  do not mention allowed origins — is this to be handled by Vercel automatically or
  explicitly configured per function? [Gap, Contracts]

- [ ] CHK012 — Are the spend cap reset schedule semantics precise? The data model shows
  `lastDailyReset` and `lastMonthlyReset` but does not specify the timezone for reset
  (UTC vs. user timezone vs. admin-configured timezone). [Clarity, Data Model
  §globalConfig]

---

## API Contract Quality

- [ ] CHK013 — Are the `POST /api/intake` step numbers and total step count defined?
  The contract shows `step: number (0-based)` but does not specify the maximum step
  index or what fields are extracted per step. Can implementation infer this without
  additional documentation? [Completeness, Contracts §intake]

- [ ] CHK014 — Is the `conversationHistory` field in the intake request body specified
  with a maximum length or truncation policy? Unbounded history could push the intake
  call over the 30s Vercel timeout. [Clarity, Contracts §intake]

- [ ] CHK015 — Are concurrent intake session requirements defined? If the same user
  opens two browser tabs and submits step 3 from both simultaneously, which write wins?
  [Edge Case, Contracts §intake, Data Model §users]

- [ ] CHK016 — Is the `POST /api/coach/brief` caching behaviour fully specified?
  The contract says `cached: boolean` but does not define the cache invalidation rule —
  does a new brief generate if the cached one was read but the user re-opens the app
  same day? [Clarity, Contracts §coach/brief]

- [ ] CHK017 — Are the structured tag specifications for Claude responses documented
  in the contracts or plan at the level needed for implementation? The plan names
  `<plan_adjustment>`, `<pattern_detected>`, `<session_complete>` but their exact
  payload schemas are not in the contracts. [Gap, Plan §Structured tag parsing]

- [ ] CHK018 — Are error response formats consistent across all 11 API functions?
  The contracts use `{"error": "string"}` in some places and `{"message": "string"}`
  might be inferred elsewhere. Is a single error envelope schema defined? [Consistency,
  Contracts §all]

- [ ] CHK019 — Does `PATCH /api/plan/session/:sessionId` specify what happens when
  an athlete tries to complete a session that is in `swapped` status? The FSM in
  data-model.md shows `swapped` as terminal, but the contract only returns 409 for
  `already_completed`. [Gap, Contracts §plan, Data Model §Session FSM]

- [ ] CHK020 — Are pagination or limit requirements defined for `GET /api/admin/users`?
  At beta scale this is fine without pagination, but the contract does not document
  a maximum return size or pagination mechanism for when user counts grow. [Gap,
  Contracts §admin/users]

- [x] CHK021 — Is the multipart upload size limit for `POST /api/garmin/import` (5MB)
  consistent with Vercel's serverless function request body limits (default 4.5MB)?
  [Conflict, Contracts §garmin, Constitution §Platform]
  **RESOLVED 2026-04-14**: Limit lowered to 4MB in contracts/api-app01.md. Stays within Vercel 4.5MB cap.

- [ ] CHK022 — Are the retry and timeout requirements for external calls (Claude API,
  OpenWeatherMap, Resend) specified? The quickstart documents graceful degradation for
  weather but does not define retry counts, backoff policy, or timeout thresholds for
  any external service. [Gap, Plan §Technical Context]

- [ ] CHK023 — Is the `remainingMessages` field in `POST /api/coach/chat` response
  specified to reflect the cap AFTER this call, or BEFORE? An off-by-one here
  will cause the "0 messages remaining" state to show one message early or late.
  [Clarity, Contracts §coach/chat]

- [ ] CHK024 — Are the `conversationId` lifecycle requirements documented? When is a
  new conversation created vs. continued? What triggers the weekly boundary reset
  mentioned in the data model? [Gap, Data Model §conversations, Contracts §coach/chat]

- [x] CHK025 — Is the maximum photo size for `POST /api/food` (4MB base64) consistent
  with Vercel's request body limit? Base64 encoding inflates binary size by ~33%,
  meaning a 3MB image becomes ~4MB base64, potentially hitting the 4.5MB serverless
  limit. [Conflict, Contracts §food]

---

## UX & Interaction Requirements

- [ ] CHK026 — Is `MobileShell`'s tab bar rendering behaviour specified for the
  onboarding state? The spec says onboarding precedes the dashboard but the UX DNA
  does not define whether the tab bar is hidden, shown empty, or shown with disabled
  tabs during intake. [Gap, UX DNA §Navigation, Spec §US1]

- [ ] CHK027 — Are the four coaching personality style names and their tonal
  differentiation described anywhere beyond "alter the tone"? Without a definition,
  the intake/settings UI cannot be written unambiguously. [Gap, Spec §FR-025]

- [ ] CHK028 — Is the feel score input (1–5) UX requirement specifying the response
  vocabulary? The data model says "emoji labels" in the component name (`FeelScorePicker`)
  but neither the spec nor UX DNA defines what the 5 labels are. [Clarity, UX DNA
  §Component Vocabulary, Spec §FR-013]

- [ ] CHK029 — Are loading state requirements defined specifically for the Galaxy
  screen? Three.js scene initialisation (< 5s target) may show a blank canvas during
  load. Is a placeholder or progress indicator required? [Gap, Spec §SC-005, UX DNA
  §Interaction Patterns]

- [ ] CHK030 — Is the "morning brief not yet generated" state specified? If the daily
  brief generation fails or has not run yet when the athlete opens the app, the Morning
  Brief screen has an indeterminate state. [Edge Case, Spec §US2, Contracts §coach/brief]

- [ ] CHK031 — Are the confirmation dialog requirements for account deletion specified
  in the UX DNA? The contract requires the literal string `"DELETE MY ACCOUNT"` but
  the UX DNA §Confirmation patterns says destructive actions use `<BottomSheet>` —
  is the exact copy and flow defined? [Completeness, UX DNA §Confirmation, Contracts
  §account DELETE]

- [ ] CHK032 — Is the plan adjustment confirmation card UI fully specified? The spec
  says "Accept is primary action (brand colour), Reject is ghost" (UX DNA §Confirmation)
  but does not define: is the rationale displayed? Is there a timeout? Can the card be
  dismissed without deciding? [Clarity, Spec §FR-014, UX DNA §Confirmation]

- [ ] CHK033 — Are the "coach style" preference UI requirements defined for the
  onboarding flow vs. the settings screen? Does the athlete choose a style during
  intake, or only post-onboarding? The spec captures it in UC-13 (settings) but the
  intake flow (UC-03) does not mention it. [Gap, Spec §FR-025, Contracts §intake]

- [ ] CHK034 — Is the upgrade CTA copy and destination specified for the "cap exceeded"
  state? The spec says "clear upgrade path" but does not define whether this links to
  an external Stripe checkout, a contact-us form, or an admin-provisioned tier change.
  [Clarity, Spec §US2 AC4, Spec §FR-003]

- [ ] CHK035 — Are empty-state requirements defined for each screen listed in the UX
  DNA §Empty States rule? The UX DNA mandates illustrated empty states with CTAs but
  no spec section defines what those CTAs do per screen (e.g. empty food log CTA vs.
  empty Garmin activity list CTA). [Gap, UX DNA §Interaction Patterns]

- [ ] CHK036 — Is the Galaxy hover interaction defined for touch devices? The UX DNA
  notes nodes are "hoverable" but hover is a mouse paradigm; are tap/long-press
  equivalents specified for mobile? [Gap, Spec §FR-017, UX DNA §Galaxy]

- [ ] CHK037 — Are the admin panel tab order and label names specified? The spec says
  "4-tab admin panel: Dashboard, Invites, Settings, Users" — does this order and these
  labels match the UX DNA navigation conventions and match the contracts exactly?
  [Consistency, Spec §US6 AC1, Contracts §admin]

---

## Data Model Completeness

- [ ] CHK038 — Is a user's Google email immutability assumption documented? The invite
  gate uses the email as the Firestore document key (`invites/{email}`), but Google
  accounts can change their primary email. Is this edge case out of scope or handled?
  [Gap, Data Model §invites, Spec Assumptions]

- [ ] CHK039 — Is the data model handling for the `dailyMessageCount` reset documented?
  The spec says caps reset at midnight in the athlete's local timezone, but the data
  model stores `dailyMessageDate` (a string). Is the reset logic — comparing
  `dailyMessageDate` to today in the user's timezone — fully specified? [Clarity,
  Data Model §users, Spec §FR-003]

- [ ] CHK040 — Are the Firestore security rules documented at the schema level? The
  constitution requires deny-all default and Admin SDK only, but the data model does
  not document even the top-level rules (e.g. can users READ their own `users/{uid}`
  document client-side, or is all reading also server-side?). [Gap, Data Model, Constitution III]

- [ ] CHK041 — Is the `masterGraph/{nodeId}` write-lock enforcement mechanism
  documented? The spec says immutable at runtime, the constitution says admin-only
  updates, but the data model and contracts do not show a Firestore rule or admin API
  endpoint for making changes. Where and how does an admin update the master graph?
  [Gap, Data Model §masterGraph, Spec §FR-015]

- [ ] CHK042 — Is the `userGraph` node deduplication policy specified? If the coach
  detects the same behavioural pattern multiple times across conversations, does it
  create multiple nodes, update a single node, or silently skip? [Gap, Data Model
  §userGraph, Spec §FR-009]

- [ ] CHK043 — Is the `conversations` subcollection transition to message subcollection
  (at > 50 messages) transparent to the client? The contracts do not mention pagination
  or changed read paths when this threshold is crossed. [Completeness, Data Model
  §conversations]

- [ ] CHK044 — Is a data retention or TTL policy defined for `auditLog`, `costs`, and
  `briefs`? These collections grow unboundedly. Firestore Spark tier has a 1GB storage
  cap; the data model does not define when old documents are pruned. [Gap, Data Model,
  Constitution §Known Constraints]

- [ ] CHK045 — Are the 6 required composite Firestore indexes documented alongside the
  collections they serve? The data model lists them, but it is not specified whether
  these must be created manually in the console or are generated from a
  `firestore.indexes.json` file. [Completeness, Data Model §Indexing Notes]

- [ ] CHK046 — Does the data model define which fields in `users/{uid}/profile` are
  considered PII for GDPR purposes? The erasure spec deletes the entire profile, but
  if a portability export is partial (e.g. excludes conversations), the PII boundary
  should be explicit. [Gap, Data Model §profile, Spec §FR erasure]

- [ ] CHK047 — Is the `activities.dedupHash` collision policy defined? SHA-256 of
  `date + activity_type + distance + duration` could theoretically collide if two
  genuinely different activities share all four values (e.g. two 10km easy runs on
  the same day). Is a counter or secondary hash field needed? [Edge Case, Data Model
  §activities, Research §D-06]

- [ ] CHK048 — Is the `plan.version` increment policy defined for partial adjustments?
  If an accepted adjustment modifies 3 of 5 proposed session changes (e.g. athlete
  accepts some), does version increment once or per changed session? [Clarity, Data
  Model §plan, Contracts §plan/adjustment]

- [ ] CHK049 — Is cross-device sync behaviour for the Zustand localStorage stores
  explicitly scoped as out-of-scope in the spec? The constitution notes this as known
  debt; the spec should document which stores are single-device only so implementers
  do not inadvertently rely on cross-device consistency. [Gap, Constitution §Known
  Constraints, Spec §Assumptions]

---

## Notes

- Check items off as completed: `[x]`
- Add findings or decisions inline after the item
- Items marked `[Gap]` indicate missing requirements — author should decide: add to spec, add to assumptions, or explicitly descope
- Items marked `[Conflict]` require a definitive resolution before implementation
- Items marked `[Clarity]` indicate existing requirements that need rewording or quantification
- Priority order for a pre-implementation gate: `[Conflict]` → `[Gap]` (blocking) → `[Clarity]` → `[Edge Case]`

**Known conflicts resolved:**
- ~~CHK021~~: Garmin CSV limit lowered to 4MB (within Vercel 4.5MB cap)
- ~~CHK025~~: Food photo limit lowered to 3MB raw (≈4MB base64, within Vercel 4.5MB cap)
