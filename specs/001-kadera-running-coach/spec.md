# Feature Specification: Kadera Running Coach — v1

**Feature Branch**: `001-kadera-running-coach`
**Created**: 2026-04-14
**Status**: Draft
**Input**: Full product specification for the Kadera AI running coach web application

## Strategic Context

The core philosophy is that **the Specification (Intention) is eternal; the Code (Execution) is ephemeral**.
When a business need evolves beyond the current app's threshold, we do not refactor — we renew.
The spec remains the source of truth; the running application is an expression of it at a point in time.

Kadera begins as a single running coach application. Future renewals are built as successor apps
(v2, v3…) sharing the same shell and UI/UX conventions while potentially using different features
and data structures. Agility is achieved by updating this spec and regenerating — not by accumulating
change on top of legacy code.

## User Scenarios & Testing

### User Story 1 — Invited Athlete Joins and Completes Onboarding (Priority: P1)

A prospective athlete hears about Kadera and submits their email on the public waitlist. An admin
later adds their email to the invites list. The athlete signs in with Google, is recognised as
invited, and is guided through an AI intake conversation. On completing intake, a personalised
training plan is generated and immediately accessible.

**Why this priority**: The entire product depends on this flow. No other feature is reachable
without a completed onboarding.

**Independent Test**: Seed an email into the invites store. Sign in with that Google account.
Complete the AI intake. Verify a training plan with VDOT-scaled paces, HR zones, and weekly
volumes is visible.

**Acceptance Scenarios**:

1. **Given** a user visits the app with an email NOT in the invites store, **When** they attempt
   to sign in, **Then** they are shown a clear "not yet invited" message and offered a link to
   the waitlist signup.
2. **Given** an unauthenticated visitor arrives on the waitlist page, **When** they submit their
   email, **Then** the email is saved as a waitlist entry and they receive an on-screen
   confirmation.
3. **Given** an invited user signs in for the first time, **When** they complete the AI intake
   conversation, **Then** a training plan personalised to their profile is saved and displayed
   without any manual step.
4. **Given** an intake is in progress and the athlete closes the app, **When** they reopen it,
   **Then** intake resumes from the last completed step with no data lost.
5. **Given** the AI provider is unavailable during intake, **When** the athlete attempts to
   proceed, **Then** they are shown a service-unavailable message and their progress so far is
   preserved.

---

### User Story 2 — Athlete Uses the Daily Coaching Loop (Priority: P1)

Each day, an athlete with an active plan opens the app, reads their morning brief, chats with
their AI coach, logs how their session felt, and accesses post-run or weekly reviews when due.

**Why this priority**: The daily loop is the primary retention mechanism and the product's
core delivered value.

**Independent Test**: Given a seeded athlete with an active plan, verify: morning brief is
generated and visible; coach chat accepts messages and returns contextually relevant responses;
feel score can be logged against a session; post-run review is available once a session is
logged; weekly review is available on the prompt day.

**Acceptance Scenarios**:

1. **Given** an athlete opens the app on a training day, **When** a morning brief has been
   generated for that day, **Then** a summary card shows the session, its rationale, and
   relevant athlete context.
2. **Given** an athlete sends a message in coach chat, **When** the coach responds, **Then**
   the response is contextually informed by the athlete's plan, history, feel scores, and
   detected behavioural patterns.
3. **Given** an athlete completes a session and logs a feel score (1–5), **When** the score
   is saved, **Then** it is accessible to the coach as ongoing context in future conversations.
4. **Given** the athlete's daily message cap for their tier is reached, **When** they attempt
   to send another message, **Then** they see their cap limit, how many messages remain today,
   and a clear upgrade path.
5. **Given** the weekly review prompt day arrives (default: Sunday), **When** the athlete
   opens the app, **Then** a weekly review is available covering the past week's sessions,
   feel scores, and coaching observations.
6. **Given** an athlete manually triggers a post-run review, **When** the review is generated,
   **Then** it reflects the specific session just completed and any feel score logged.

---

### User Story 3 — Athlete Manages and Adapts Their Training Plan (Priority: P2)

An athlete views their full 7-phase training plan, swaps a session for a cross-training
alternative, and responds to a coach-proposed adjustment — accepting it and seeing the plan
update immediately.

**Why this priority**: Plan interaction differentiates Kadera from static plan generators and
drives deeper engagement; it is not required for the initial coaching value but essential for
long-term retention.

**Independent Test**: Given a seeded plan, verify: all phases are viewable; a session can be
swapped; a coach adjustment card appears in chat; accepting an adjustment updates the plan
permanently; rejecting leaves the plan unchanged.

**Acceptance Scenarios**:

1. **Given** an athlete opens their training plan, **When** they select any session, **Then**
   they see the session type, target paces, target HR zone, planned distance, and scheduled date.
2. **Given** an athlete requests a cross-training swap for a session, **When** they confirm the
   swap, **Then** the session is replaced with a cross-training alternative of equivalent
   training load and the plan is updated.
3. **Given** the coach proposes a plan adjustment during chat, **When** the athlete sees the
   confirmation card, **Then** they can accept or reject it; acceptance stores the adjustment
   and updates the relevant session(s) permanently.
4. **Given** a plan adjustment is rejected, **When** the conversation continues, **Then** the
   original plan is completely unchanged.

---

### User Story 4 — Athlete Explores the Knowledge Galaxy (Priority: P3)

An athlete opens the Knowledge Galaxy screen and navigates an interactive 3D visualisation
showing the master coaching knowledge graph and their own personal nodes as orbiting satellites,
with cross-links displayed as bridges between the two graphs.

**Why this priority**: A meaningful differentiator and engagement feature; not required for
core coaching but central to the product's distinctive identity.

**Independent Test**: Given a seeded master graph and a user with at least intake-derived nodes,
verify: 3D scene loads; master nodes are organised in topic clusters; user nodes orbit; cross-links
are visible; hovering a node shows its label and description.

**Acceptance Scenarios**:

1. **Given** an athlete opens the Knowledge Galaxy, **When** the visualisation loads, **Then**
   all master knowledge nodes (~160) are visible, organised by topic cluster, within 5 seconds
   on a mid-range mobile on a 4G connection.
2. **Given** an athlete hovers over any node, **When** the tooltip appears, **Then** it shows
   the node's title and a short description.
3. **Given** the athlete has personal nodes (from intake or coach-detected patterns), **When**
   they view the galaxy, **Then** those nodes orbit the master graph with cross-link bridges to
   related master nodes.

---

### User Story 5 — Athlete Logs Food and Uploads Activity Data (Priority: P3)

An athlete submits a meal as a photo or text; the coach returns a macro estimate which is logged.
Separately, the athlete uploads a Garmin activity CSV and the activities are parsed and stored in
their history.

**Why this priority**: Enriches the coaching context over time; does not block any core
functionality.

**Independent Test**: Submit a text meal description; verify macro estimate is returned and
stored. Upload a valid Garmin CSV; verify activities appear in activity history. Upload the same
CSV again; verify no duplicates are created.

**Acceptance Scenarios**:

1. **Given** an athlete submits a meal description (photo or text), **When** it is processed,
   **Then** an estimated macro breakdown (protein, carbs, fat, total calories) is shown and
   logged against the athlete's profile.
2. **Given** an athlete uploads a Garmin activity CSV, **When** the file is processed, **Then**
   each activity is parsed and visible in their activity history within 30 seconds for up to
   500 activities.
3. **Given** an athlete re-uploads a CSV already imported, **When** processing completes, **Then**
   no duplicate activities are created and existing records are unchanged.
4. **Given** an uploaded CSV is malformed or empty, **When** processing fails, **Then** the
   athlete receives a clear error message and no partial data is stored.

---

### User Story 6 — Admin Manages the Platform (Priority: P1)

An admin signs in, views platform-level stats and AI cost tracking, manages email invites,
toggles the AI kill switch, configures spend caps, and reviews user accounts and history.

**Why this priority**: Required before launch — without invite management no users can access
the product; without the kill switch and spend caps, cost exposure is uncapped.

**Independent Test**: Given an admin email account, verify: admin panel is accessible with 4
tabs; adding an invite allows that user to sign in; enabling the kill switch blocks all
subsequent AI calls; a spend cap is enforced when the threshold is reached; user list shows
correct tiers and login history.

**Acceptance Scenarios**:

1. **Given** an admin signs in, **When** they navigate to the admin panel, **Then** they see
   exactly 4 tabs: Dashboard, Invites, Settings, and Users.
2. **Given** an admin adds an email to invites, **When** a user with that email next signs in,
   **Then** they pass the invite gate and can begin onboarding.
3. **Given** an admin enables the kill switch, **When** any user sends a coach message, **Then**
   the AI call is blocked server-side and the user sees a service-temporarily-unavailable notice.
4. **Given** a spend cap threshold is reached, **When** any further AI call is attempted,
   **Then** it is blocked server-side, the user sees an appropriate message, and the admin
   dashboard reflects the cap-reached status.
5. **Given** an admin views the Users tab, **When** they select a specific user, **Then** they
   see the user's tier, total and daily message counts, and login history.

---

### Edge Cases

- What happens when an invited athlete's Google account email differs from the invited email?
- How does the system behave if the AI provider goes unavailable mid-intake conversation?
- What happens when a message cap is reached mid-conversation (e.g., 2 messages sent, cap is 3, coach response would be the 4th event)?
- How are concurrent admin changes to the kill switch handled?
- What happens if a Garmin CSV contains activities already imported (duplicate detection)?
- What occurs if the weather data provider is unavailable — does the morning brief still generate?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST block sign-in for any Google account whose email is not present in
  the invites store.
- **FR-002**: The system MUST allow unauthenticated users to submit their email to a public
  waitlist without any sign-in requirement.
- **FR-003**: The system MUST enforce daily message caps per user tier: Free (3/day),
  Starter (15/day), Elite (40/day). Caps reset at midnight in the athlete's local timezone.
- **FR-004**: The system MUST restrict admin panel access to users whose email appears in the
  designated admins store.
- **FR-005**: The system MUST guide first-time athletes through an AI intake conversation
  collecting: name, weight, target race, target finish time, current weekly km, max HR,
  most recent race result (for VDOT derivation), active injuries, and behavioural patterns.
- **FR-006**: On intake completion, the system MUST generate and persist a personalised training
  plan with VDOT-derived pace targets, HR-zone ranges derived from max HR, and session volumes
  scaled to current weekly km.
- **FR-007**: The system MUST generate a daily morning brief for each athlete with an active plan,
  covering the day's session, its rationale, and relevant athlete context.
- **FR-008**: The system MUST provide a persistent coach chat where athletes can send messages and
  receive AI-generated responses, subject to their daily message cap.
- **FR-009**: The coach MUST detect behavioural patterns from chat conversations and persist them
  as nodes in the athlete's personal knowledge graph.
- **FR-010**: The system MUST support post-run reviews (manually triggered by the athlete after
  completing a session) and weekly reviews (auto-prompted on the configured day, also manually
  triggerable any day of that week).
- **FR-011**: The training plan MUST follow a 7-phase, 3+1 mesocycle structure parameterised
  per athlete — not selected from a library of fixed plans.
- **FR-012**: Athletes MUST be able to swap any planned session for a cross-training alternative;
  the system MUST suggest an alternative of equivalent training load.
- **FR-013**: Athletes MUST be able to log a feel score (integer 1–5) against any completed
  session.
- **FR-014**: The coach MUST be able to propose plan adjustments via a confirmation card surfaced
  in the chat; athlete acceptance MUST update the stored plan; rejection MUST leave the plan
  unchanged.
- **FR-015**: The system MUST maintain a master knowledge graph (~160 nodes) covering coaching
  methodology, injuries, nutrition, science, race intelligence, and recovery. This graph MUST be
  immutable at runtime and editable only by admin or developer action.
- **FR-016**: The system MUST maintain a per-athlete knowledge graph seeded at intake and growing
  automatically via coach-detected patterns, session completions, and accepted plan adjustments.
- **FR-017**: The system MUST render a 3D interactive galaxy visualisation combining the master
  and per-athlete knowledge graphs, with the athlete's nodes orbiting the master graph and
  cross-links shown as bridges between related nodes.
- **FR-018**: Athletes MUST be able to submit a meal as a photo or text description; the system
  MUST return a macro estimate (protein, carbs, fat, total calories) and log the entry.
- **FR-019**: Athletes MUST be able to upload a Garmin activity CSV export; the system MUST parse
  and store the contained activities, deduplicating against previously imported records.
- **FR-020**: The system MUST fetch weather data relevant to the athlete's location and surface it
  as context in the morning brief and coach chat. When the weather provider is unavailable, brief
  generation MUST still succeed without weather data.
- **FR-021**: Admins MUST be able to add and revoke email invites via the Invites tab of the
  admin panel.
- **FR-022**: Admins MUST be able to toggle a kill switch that disables all AI calls globally
  without requiring a code deployment; the effect MUST take hold within 60 seconds of toggling.
- **FR-023**: Admins MUST be able to configure daily and monthly AI spend caps enforced
  server-side; when a cap is reached, no further AI calls MUST be processed until the period
  resets or the cap is raised.
- **FR-024**: Admins MUST be able to view all user accounts with their tier, total and daily
  message counts, and login history from the Users tab.
- **FR-025**: Athletes MUST be able to select from four coaching personality styles; the selection
  MUST alter the tone and language of AI responses without changing the underlying coaching
  knowledge, plan structure, or logic.

### Key Entities

- **Athlete**: A registered user who passed the invite gate. Holds profile (name, weight, goals,
  fitness metrics, injuries, behavioural patterns), tier (Free / Starter / Elite), daily message
  count, and onboarding status.
- **Invite**: A pre-seeded email record gating access. Status: pending / accepted / revoked.
- **Waitlist Entry**: An unauthenticated email submission expressing interest. Not an invite;
  not linked to an auth account.
- **Training Plan**: The athlete's personalised 7-phase plan containing phases, weeks, and
  individual sessions with type, target paces, target HR zone, and planned volume.
- **Session**: A single planned or completed workout. Has type (threshold / VO2max / long run /
  easy / cross-training / etc.), targets, scheduled date, feel score, completion status, and
  swap history.
- **Conversation**: The persistent coach chat for an athlete. Contains ordered messages (athlete
  + coach), timestamps, and a reference to detected patterns.
- **Morning Brief**: A daily AI-generated document per athlete, tied to their current training
  day and generated fresh each morning.
- **Review**: A post-run or weekly structured AI-generated reflection, linked to the athlete and
  the relevant session(s) or week.
- **Plan Adjustment**: A coach-proposed change to the training plan. Carries proposed changes,
  status (pending / accepted / rejected), and the conversation turn that triggered it.
- **Master Knowledge Node**: A node in the immutable coaching knowledge graph. Has topic cluster,
  title, description, and weighted edges to related master nodes.
- **Athlete Knowledge Node**: A node in the athlete's personal graph. Has type (profile / goal /
  fitness / injury / trap / pattern), value, source (intake / coach-detected / plan-adjustment),
  and edges to related master nodes (cross-links).
- **Food Log Entry**: A single meal submission with input type (photo / text), raw input,
  macro estimate, and timestamp.
- **Activity**: A parsed wearable data record with source (Garmin CSV), activity type, distance,
  duration, HR data, date, and a deduplication hash.
- **Admin**: A user whose email is in the admins store. Access is limited to the admin panel.
- **Spend Cap**: A configurable daily/monthly AI cost threshold with current usage tracking and
  enforcement status.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An invited athlete can complete the full onboarding intake and view a personalised
  training plan within a single session, without any support or manual intervention.
- **SC-002**: 90% of coach chat responses are visible to the athlete within 10 seconds under
  normal mobile network conditions.
- **SC-003**: An athlete's daily message cap is enforced with zero over-cap AI calls processed.
- **SC-004**: The AI kill switch takes effect within 60 seconds of being toggled, blocking all
  AI calls from that point until re-enabled.
- **SC-005**: The knowledge galaxy visualisation is fully loaded and interactive within 5 seconds
  on a mid-range mobile device on a 4G connection.
- **SC-006**: A Garmin CSV of up to 500 activities is fully parsed, deduplicated, and stored
  within 30 seconds of upload.
- **SC-007**: Server-side spend caps prevent any AI expenditure beyond the configured threshold
  within the same billing period, with zero over-cap calls served.
- **SC-008**: An athlete can complete the session swap flow (select session → choose alternative
  → confirm) in under 60 seconds.
- **SC-009**: All core athlete flows (morning brief, coach chat, plan view, food log) are fully
  usable as a mobile-first PWA on screens 320px wide and above, with no horizontal scrolling.
- **SC-010**: Admin invite changes (add or revoke) take effect for the target user on their next
  sign-in attempt, with no deployment required.

## Assumptions

- VDOT is calculated automatically from the athlete's most recent race result (distance +
  finish time) entered during intake; athletes do not manually enter a raw VDOT number.
- Converting a waitlist entry to an invite is a manual action performed by an admin; there is
  no automated waitlist-to-invite pipeline in v1.
- Admin identity is determined by the presence of the authenticated email in a designated admins
  data store; there is no self-service admin registration path.
- The weekly review is auto-prompted on Sunday (configurable) and also manually triggerable by
  the athlete any day from Monday of that week onwards.
- Post-run review is manually triggered by the athlete after a session is logged; it is not
  time-scheduled or automatically prompted.
- The four coaching personality styles affect only the tone and language of AI responses; all
  coaching logic, knowledge graph content, and plan structures are identical across styles.
- The Strava and Terra wearable integrations are present in the codebase but not user-facing in
  v1; they require an explicit admin activation step to become accessible.
- Weather data is fetched using the athlete's stored location; athletes do not manually enter
  their location each time. When the weather provider is unavailable, the morning brief still
  generates without weather context.
- Cross-training swaps are available for any session type; the suggested alternative is
  determined by the coach based on the original session's training load equivalence.
- Garmin activity deduplication is based on a hash of activity timestamp + distance + duration;
  re-uploading the same CSV file does not create duplicate records.
- The master knowledge graph (~160 nodes) is seeded at deployment time; additions or edits
  require a developer or admin action outside the normal athlete-facing app.
- An invited athlete MUST sign in using the exact same Google account email that was added to
  the invites store; mismatched emails are treated as uninvited.
