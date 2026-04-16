<!--
SYNC IMPACT REPORT
===================
Version change:      (template) → 1.0.0
Change type:         Initial ratification — first population of all placeholders.

Principles added:
  I.   Frontend Philosophy (new)
  II.  Dependency Policy (new)
  III. Platform & Deployment (new)

Sections added:
  - Core Principles (I, II, III)
  - Known Constraints & Technical Debt
  - Scaling Policy
  - Governance

Sections removed:
  - PRINCIPLE_4 slot (not applicable to this project)
  - PRINCIPLE_5 slot (not applicable to this project)
  - SECTION_2 generic placeholder → replaced by "Known Constraints & Technical Debt"
  - SECTION_3 generic placeholder → replaced by "Scaling Policy"

Templates reviewed:
  - .specify/templates/plan-template.md  ✅ (Constitution Check section is dynamically
    filled per-feature; no structural changes required)
  - .specify/templates/spec-template.md  ✅ (no constitution-specific references)
  - .specify/templates/tasks-template.md ✅ (no constitution-specific references)

Deferred TODOs:
  - None. All placeholders resolved.
-->

# Kadera Constitution

## Core Principles

### I. Frontend Philosophy

The Kadera frontend MUST be a React SPA with mobile-first design. The single `MobileShell`
component is the sole handler of all responsive layout: bottom tab bar on mobile (<768px),
fixed sidebar on desktop. All screens MUST be lazy-loaded with chunk-failure recovery via
`lazyRetry`.

State management MUST use Zustand. Redux and React Context API are prohibited for
application state. Stores MUST be scoped, flat, and limited to the established set; any
new store requires a documented rationale. Cross-store dependencies MUST be made explicit,
never implicit.

The app is a PWA delivered via CDN. There is no SSR and no hydration complexity. Server
interaction is strictly through REST API calls to serverless functions.

Design tokens are the single source of truth for visual identity (colors, fonts, spacing),
centralised in `design-system/tokens.ts`. Inline style values for these concerns are
prohibited; all visual decisions MUST flow from the token system. The token scale is finite
and intentionally constrained — implementers MUST NOT reference token keys outside the
documented set (e.g. `tokens.space[20]` when the scale stops at `12`). When a required
value falls outside the scale, use a CSS literal (e.g. `'5rem'`) with an inline comment
noting the deviation. The token file MUST NOT be extended without a design review.

### II. Dependency Policy

Managed services (Firebase, Vercel, Anthropic API, Resend) MUST be preferred over
self-hosted infrastructure. Operational simplicity outweighs marginal cost or customisation
at current scale.

Heavy optional dependencies MUST be loaded via CDN script tag rather than bundled (e.g.,
Three.js r128). This keeps the core bundle lean and load-time predictable.

The AI coaching layer MUST use structured context injection — not fine-tuning — so the
underlying LLM can be swapped without retraining. Claude Sonnet 4 is the current provider
on quality/cost grounds. Swapping the model MUST NOT require a code change beyond the
model identifier.

No dormant production dependency may exist without a documented activation trigger. The
Strava integration, Terra wearables integration, and Neo4j client are explicitly deferred.
Each MUST remain behind a clear activation gate; enabling them requires a documented trigger
condition before any feature branch may be merged.

Infrastructure scaling MUST proceed in tiers (Hobby → Pro → Cloud Run), not rewrites.
Architectural changes (Redis, Neo4j, WebSockets) are triggered by explicit user-count
thresholds — not anticipated prematurely. See Scaling Policy section.

### III. Platform & Deployment

- **Platform**: Vercel Hobby tier. Hard limit of 12 serverless functions and 30s per
  invocation timeout. The router pattern on `coach-tools.ts` is the mandated approach
  to stay within the function limit. Auto-deploy is from the GitHub main branch.
- **Database**: Firestore (Spark tier). Document-oriented; no server-side joins.
  Deny-all security rules MUST be the default. All writes MUST go via the server-side
  Admin SDK. No client-side writes to Firestore are permitted.
- **Auth**: Firebase Authentication with Google OAuth. Every API endpoint MUST verify a
  Bearer token server-side. Auth bypass MUST be blocked in production even if
  misconfigured at the environment level.
- **AI**: Anthropic Claude Sonnet 4, pay-per-token. Per-call cost tracking is mandatory.
  A kill switch and spend caps MUST be enforced server-side before any request reaches
  the Anthropic API.
- **Email**: Resend (free tier). The 100 emails/day cap is an operational constraint
  that MUST be accounted for in any feature that sends transactional email.
- **Deployment target**: `kaderarunning.ai`. Security headers (HSTS, X-Frame-Options,
  CSP, etc.) MUST be set in `vercel.json`.

### IV. TypeScript & Build Tooling

The following are mandatory for every TypeScript/React feature and MUST be verified before implementation begins:

- `@types/react` and `@types/react-dom` MUST exist in `devDependencies`. They are never optional for a React + TypeScript project.
- `src/vite-env.d.ts` containing `/// <reference types="vite/client" />` MUST exist. Any file using `import.meta.env` depends on it; its absence silently defers errors to build time.
- The Vite build `target` MUST be `es2022` or higher when the codebase uses top-level `await`. Using `es2020` allows top-level await in dev (esbuild skips it) but breaks production builds.
- CDN-loaded libraries (e.g. Three.js) MUST have a corresponding `@types/<pkg>` devDependency for type safety even though the runtime module is not bundled. The mandated pattern is `import type * as X from '<pkg>'` for type references; `window.X` handles the runtime reference.

## Known Constraints & Technical Debt

Several Zustand stores currently persist to `localStorage` only, causing cross-device
sync gaps. Firestore migration is the declared target state. Features that depend on
cross-device data consistency MUST NOT be built on localStorage-only stores until
migration is complete — or MUST be explicitly scoped and documented as single-device only.

The 12-function hard limit on Vercel Hobby is a permanent API design constraint for the
current tier. New serverless entry-points MUST NOT be created if they would breach this
limit; new routes MUST be added to existing router functions instead.

## Scaling Policy

Architectural upgrades are threshold-triggered, not anticipatory:

| Threshold | Triggered change |
|-----------|-----------------|
| >1 000 MAU | Evaluate Vercel Pro upgrade |
| >10 000 MAU | Evaluate Cloud Run migration |
| Coach AI response p95 > 5 s | Evaluate streaming / WebSocket transport |
| AI spend > defined monthly cap | Evaluate response caching layer (Redis) |
| Graph queries become primary access pattern | Activate Neo4j client |

No upgrade may be initiated solely on anticipated future need. Each tier transition
requires a documented trigger event and a migration plan reviewed before the branch is
opened.

## Governance

This constitution supersedes all other informal practices. Any amendment requires:

1. A pull request updating `.specify/memory/constitution.md`.
2. A version bump per the policy below.
3. A propagation check against `.specify/templates/` files and any agent guidance docs.

**Versioning policy**:
- MAJOR: Removal or backward-incompatible redefinition of a principle.
- MINOR: Addition of a new principle, section, or material expansion of an existing one.
- PATCH: Clarifications, wording fixes, or non-semantic refinements.

All feature plans MUST include a Constitution Check (see `.specify/templates/plan-template.md`)
before Phase 0 research begins. Any compliance violation MUST be justified in the Complexity
Tracking table before work proceeds.

**Version**: 1.0.0 | **Ratified**: 2026-04-14 | **Last Amended**: 2026-04-14
