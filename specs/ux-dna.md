# Kadera UX DNA — Global Design Rules

**Version**: 1.0.0
**Date**: 2026-04-14
**Scope**: All Kadera micro apps (app01, app02, …)

These rules apply to every app built within the Kadera shell. Individual apps
inherit these rules entirely; they may extend them but MUST NOT contradict them.

---

## 1. Shell Architecture

- **`MobileShell`** is the single, immutable layout container for all apps.
- Mobile (<768px): bottom tab bar, 4–5 tabs, icon + label.
- Desktop (≥768px): fixed left sidebar, same nav items.
- Tab bar and sidebar are defined by the active app's route configuration.
  The shell renders whatever routes the current app declares; it does not know
  about app content.
- Screen transitions use a simple fade (150ms ease). No slide animations on
  navigation — reduces motion sickness on long-duration sessions.

---

## 2. Mobile-First Contract

- Design for 320px minimum width. Wider viewports are enhancements.
- Touch targets MUST be ≥ 44×44px (WCAG 2.5.5 AA).
- No horizontal scrolling on any screen at any supported width.
- The app assumes an always-online context. Offline states display a banner;
  no offline-first caching is required in v1.

---

## 3. Design Token System

All visual decisions flow from `design-system/tokens.ts`. Inline style values
for color, font size, font weight, spacing, border radius, and shadow are
**prohibited** in component code.

### Color palette (token names)

| Token | Role |
|-------|------|
| `color.brand.primary` | Main action colour (buttons, links, active states) |
| `color.brand.secondary` | Accent (coaching highlights, plan phase markers) |
| `color.surface.base` | Page / card background |
| `color.surface.raised` | Elevated card (modal, bottom sheet) |
| `color.surface.overlay` | Semi-transparent overlay (Galaxy background) |
| `color.text.primary` | Body text |
| `color.text.secondary` | Supporting text, labels |
| `color.text.disabled` | Placeholder, inactive |
| `color.feedback.success` | Completions, positive states |
| `color.feedback.warning` | Warnings, cap approaching |
| `color.feedback.error` | Errors, blocked states |
| `color.feedback.info` | Informational |

### Typography

| Token | Usage |
|-------|-------|
| `font.family.heading` | Screen titles, card headings |
| `font.family.body` | All body copy |
| `font.family.mono` | Pace values, numbers, data |
| `font.size.xs` … `font.size.4xl` | Fixed scale (12–36px) |
| `font.weight.regular` / `.medium` / `.bold` | |
| `line.height.tight` / `.normal` / `.relaxed` | |

### Spacing

8px base grid. Tokens: `space.1` (4px) → `space.8` (64px) → `space.12` (96px).
All layout gaps, padding, and margins MUST use spacing tokens.

### Border radius

| Token | Usage |
|-------|-------|
| `radius.sm` (4px) | Tags, chips |
| `radius.md` (8px) | Cards, inputs |
| `radius.lg` (16px) | Bottom sheets, modals |
| `radius.full` (9999px) | Pills, avatars |

---

## 4. Component Vocabulary

These components exist in the shared component library and MUST be used instead
of custom implementations:

| Component | Purpose |
|-----------|---------|
| `<Card>` | Content container with optional header + actions |
| `<Button variant="primary|secondary|ghost|danger">` | All interactive buttons |
| `<ActionCard>` | Confirmable action (e.g. plan adjustment proposal) |
| `<BottomSheet>` | Mobile modal anchored to bottom; desktop = centred modal |
| `<Badge variant="tier|status|count">` | User tier, session status, message count |
| `<PaceDisplay>` | Renders pace in mm:ss/km with correct formatting |
| `<HRZoneBar>` | Horizontal HR zone indicator with current-zone highlight |
| `<FeelScorePicker>` | 1-5 feel score input with emoji labels |
| `<CoachBubble>` | AI response bubble with typing indicator |
| `<AthleteBubble>` | Athlete message bubble |
| `<DayPill>` | Compact session-day indicator for plan grid |
| `<PhaseChip>` | Training phase label chip |

---

## 5. Navigation & Routing

App01 bottom tabs (in order):

| Tab | Icon | Screen |
|-----|------|--------|
| Home | house | Morning Brief |
| Coach | message-circle | Coach Chat |
| Plan | calendar | Training Plan |
| Galaxy | sparkles | Knowledge Galaxy |
| More | ellipsis | Settings + Food + Garmin |

Admin users see an additional **Admin** tab (shield icon) appended to the right.

Route structure:
```
/                   → redirect to /brief (authenticated) or /welcome (not)
/welcome            → Waitlist + sign-in entry
/onboarding         → Intake conversation (pre-dashboard)
/brief              → Morning Brief
/coach              → Coach Chat
/plan               → Training Plan overview
/plan/:sessionId    → Session detail + swap + feel
/galaxy             → Knowledge Galaxy
/food               → Food Log
/garmin             → Garmin Import
/settings           → Preferences + account management
/admin              → Admin Dashboard (admin only)
/admin/invites      → Invite management
/admin/settings     → Kill switch + spend caps
/admin/users        → User management
```

All routes except `/welcome` require authentication. `/onboarding` requires auth
but allows incomplete onboarding.

---

## 6. Interaction Patterns

### Loading states

- API calls < 300ms: no loader shown (prevents flash).
- API calls 300ms–2s: skeleton placeholder matching content layout.
- API calls > 2s: skeleton + subtle pulse animation.
- Coach chat responses: `<CoachBubble>` appears immediately with typing indicator;
  replaces with content on arrival.

### Error states

- API errors: inline error message inside the affected section. No full-page errors
  except for auth failures (which redirect to `/welcome`).
- Kill switch active: global banner at top of all authenticated screens;
  coach-specific screens show a `<Card>` explaining temporary unavailability.
- Cap exceeded: inline message with remaining count and upgrade CTA.

### Empty states

- Each screen that can be empty (no sessions, no meals, no activities) MUST have
  an illustrated empty state with a clear call-to-action.

### Confirmation patterns

- Destructive actions (account deletion, session swap, plan adjustment rejection)
  MUST use a `<BottomSheet>` confirmation dialog.
- Plan adjustment proposals use `<ActionCard>` with Accept / Reject buttons.
  Accept is the primary action (brand colour). Reject is ghost.

---

## 7. Accessibility

- Minimum contrast ratio 4.5:1 for body text (WCAG AA).
- All interactive elements are keyboard-navigable.
- All images and icons have `aria-label` or `alt` text.
- Screen reader labels for pace values and HR zones use natural language
  (e.g. "five minutes thirty seconds per kilometre" not "5:30/km").
- Reduce-motion: when `prefers-reduced-motion` is set, disable Three.js
  animation loop (galaxy renders static) and disable all CSS transitions.

---

## 8. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s (mobile 4G) |
| Largest Contentful Paint | < 2.5s (mobile 4G) |
| Core bundle size (gzipped) | < 150KB |
| Per-screen lazy chunk (gzipped) | < 80KB |
| Galaxy Three.js scene init | < 5s (mid-range mobile) |

Three.js (r128) is CDN-loaded and excluded from the bundle measurement.

---

## 9. PWA Requirements

- `manifest.json`: name, short_name, icons (192×192, 512×512), theme_color,
  background_color, display: standalone.
- Service worker: cache shell assets (HTML, CSS, core JS) for instant reload.
  Do NOT cache API responses — data freshness is more important than offline support.
- Install prompt: shown after 2nd session; dismissible; not shown again after dismiss.

---

## 10. App-Specific Extensions

Individual apps (app01, app02, …) MAY extend this DNA by:
- Adding new token values (MUST use the existing naming convention).
- Adding new component variants (MUST follow existing component API patterns).
- Adding new tab items to `MobileShell` (via the app's route config, max 5 tabs
  excluding Admin).

Individual apps MUST NOT:
- Override existing token values.
- Replace `MobileShell` or any core component.
- Introduce inline styles for tokenised properties.
- Change the navigation or routing conventions defined in Section 5.
