# Quickstart: Kadera Running Coach — Local Development

**Target**: Developer on Chromebook (Linux) or any Node 18+ system.
**Date**: 2026-04-14

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18.x | `node --version` to verify |
| npm | ≥ 9.x | Comes with Node 18 |
| Git | Any | For cloning |
| Firebase project | — | See Step 3 (skip for Chromebook bypass mode) |
| Anthropic API key | — | From console.anthropic.com |
| Resend API key | — | From resend.com (optional for local dev) |
| OpenWeatherMap key | — | From openweathermap.org (optional for local dev) |

---

## Step 1 — Clone and install

```bash
git clone https://github.com/kader-ai/kadera.git
cd kadera
npm install
```

---

## Step 2 — Choose your local auth mode

### Option A: Full Firebase (production-equivalent)

Requires a Firebase project with Authentication (Google OAuth) and Firestore enabled.
Skip to Step 3.

### Option B: Chromebook bypass mode (no Firebase)

Set `DEV_BYPASS_AUTH=true` in your `.env.local`. All API calls will use a hardcoded
stub user (`dev@kadera.local`, Elite tier). No Firebase project needed.
Jump to Step 4 — skip Step 3.

---

## Step 3 — Firebase setup (Option A only)

1. In Firebase Console, create a project or reuse an existing one.
2. Enable **Authentication → Google** as a sign-in provider.
3. Enable **Firestore** in Native mode.
4. Download your **Service Account JSON** from Project Settings → Service Accounts.
   Save it as `serviceAccount.json` at the repo root (gitignored).
5. In Authentication → Settings, add `http://localhost:5173` to Authorised domains.

---

## Step 4 — Environment variables

Create `.env.local` at the repo root:

```bash
# ── AI ──────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Firebase (skip if using bypass mode) ────────────
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# ── Client-side Firebase (skip if using bypass mode) ─
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# ── Auth bypass (Chromebook / no Firebase) ───────────
# DEV_BYPASS_AUTH=true
# VITE_DEV_BYPASS_AUTH=true

# ── Optional integrations ────────────────────────────
RESEND_API_KEY=re_...           # Omit to skip email sending in dev
OPENWEATHERMAP_API_KEY=...      # Omit; weather returns null gracefully

# ── Dev server ───────────────────────────────────────
DEV_SERVER_PORT=3001            # Local Express proxy port
```

---

## Step 5 — Seed the master knowledge graph

Run once per environment (dev and production). Not needed in bypass mode unless
you want the Galaxy visualisation to work locally.

```bash
node scripts/seed-graph.mjs
```

This reads `.specify/data/master-graph.json` (352KB) and writes ~160 documents to
`masterGraph/` in Firestore. Safe to re-run (idempotent — overwrites existing docs).

**Skip in bypass mode**: The dev stub user has a synthetic master graph loaded
from a local fixture file instead of Firestore.

---

## Step 6 — Start local development

```bash
npm run dev
```

This starts two processes concurrently:
- **Vite** on `http://localhost:5173` — React SPA with HMR.
- **Dev server** (`scripts/dev-server.ts`) on `http://localhost:3001` — Express proxy
  that mirrors Vercel function routing so `fetch('/api/...')` calls work without
  a Vercel deployment.

---

## Step 7 — Verify the app loads

Open `http://localhost:5173` in the browser.

**Option A (Firebase)**: You should see the Kadera sign-in screen with "Continue with
Google". Sign in using an account whose email is in your `invites` Firestore collection.
If no invite exists yet, seed one:

```bash
# In Firebase Console → Firestore, create:
# Collection: invites  |  Document ID: your-email@gmail.com
# Fields: email (string), status (string: "pending"), addedByAdminId ("dev"), createdAt (timestamp: now)
```

**Option B (bypass mode)**: The app loads directly into the dashboard as the dummy user
`dev@kadera.local`. No sign-in screen appears.

---

## Step 8 — Verify the API

```bash
# Health check (no auth)
curl http://localhost:3001/api/health

# Expected: {"status":"ok","timestamp":"...","killSwitch":false}
```

---

## Common issues

| Problem | Fix |
|---------|-----|
| `FIREBASE_PRIVATE_KEY` newlines | Wrap in double quotes; use `\n` literals in .env.local |
| Port 3001 in use | Change `DEV_SERVER_PORT` in `.env.local` |
| Google OAuth redirect fails | Add `localhost:5173` to Firebase Authorised domains |
| Chromebook: OAuth popup blocked | Use bypass mode (Option B) |
| `seed-graph.mjs` fails | Check Firestore is enabled and `FIREBASE_PROJECT_ID` is set |
| Three.js not rendering | Check browser console for CDN load errors; r128 must load from CDN |

---

## Deploying to Vercel

```bash
# First time (one-off):
vercel link                    # Connect to Vercel project
vercel env pull .env.local     # Pull production env vars for local parity

# Deploy:
git push origin main           # Auto-deploys via GitHub integration
```

Add all env vars from Step 4 to Vercel's Environment Variables panel
(Settings → Environment Variables). Do NOT set `DEV_BYPASS_AUTH` in production.
