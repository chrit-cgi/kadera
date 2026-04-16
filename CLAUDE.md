# kadera Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-14

## Active Technologies

- TypeScript (React 18, Node.js 18+) + React 18, Vite 5, Zustand 5, Firebase Admin SDK, Anthropic SDK, Resend SDK (app01)
- Firestore (Spark tier) (app01)

## Project Structure

```text
kadera/
├── api/          # Vercel serverless functions (11 of 12 slots)
│   ├── _lib/     # Shared auth, Firestore, Claude, rate-limit, audit helpers
│   └── _handlers/# Sub-handlers for coaching logic
├── src/          # React SPA
│   ├── components/MobileShell.tsx   # Sole layout handler
│   ├── screens/  # All lazy-loaded via lazyRetry()
│   ├── stores/   # 10 Zustand stores
│   ├── design-system/tokens.ts      # Design token source of truth
│   └── types/    # Shared TypeScript interfaces
├── scripts/      # dev-server.ts, seed-graph.mjs
└── specs/        # Spec-Kit artifacts
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite (port 5173) + dev-server proxy (port 3001)
npm run build        # Production build
node scripts/seed-graph.mjs  # Seed master knowledge graph (run once per env)
```

## Code Style

TypeScript: strict mode, no implicit any. Use types from `src/types/index.ts`.
React: functional components only, no class components.
State: Zustand stores only — no React Context API, no Redux.
Styling: design tokens from `design-system/tokens.ts` — no inline style values for color/spacing/font.

## Key Conventions

- All API writes go through Firestore Admin SDK (`api/_lib/firestore.ts`); no client-side writes.
- All authenticated API calls verify Bearer token via `api/_lib/auth.ts`.
- All Claude API calls go through `api/_lib/claude.ts` (handles kill switch + cost tracking).
- All compliance events are written to `auditLog` via `api/_lib/audit.ts`.
- `DEV_BYPASS_AUTH=true` enables dev stub user (Chromebook mode); MUST NOT be set in production.
- Three.js (r128) is CDN-loaded; import it via `window.THREE`, not npm.
- New Vercel functions MUST NOT be created without checking the 12-function budget (currently 11 used).

## Recent Changes

- app01 (kadera-running-coach v1): Full stack — React 18 + TypeScript + Vite + Zustand + Firestore + Claude Sonnet 4

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
