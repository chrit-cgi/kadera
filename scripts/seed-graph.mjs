/**
 * Seed the master knowledge graph into Firestore.
 *
 * Reads: .specify/data/master-graph.json
 * Writes: masterGraph/{nodeId} (idempotent — safe to re-run)
 *
 * Usage: node scripts/seed-graph.mjs
 * Requires: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Load env from .env.local if dotenv-style loading is available; otherwise
// expect env vars to be set in the shell.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// ── Lazy-load dotenv if present ─────────────────────────────────────────────
try {
  const { config } = await import('dotenv')
  config({ path: path.join(root, '.env.local') })
} catch {
  // dotenv not installed — env vars must be set externally
}

const { initializeApp, cert } = await import('firebase-admin/app')
const { getFirestore } = await import('firebase-admin/firestore')

// ── Firebase init ────────────────────────────────────────────────────────────

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('Missing FIREBASE_PROJECT_ID. Set it in .env.local or your shell.')
  process.exit(1)
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()

// ── Load seed data ────────────────────────────────────────────────────────────

const seedPath = path.join(root, '.specify', 'data', 'master-graph.json')

let nodes
try {
  const raw = readFileSync(seedPath, 'utf-8')
  nodes = JSON.parse(raw)
} catch (error) {
  console.error(`Failed to read master-graph.json at: ${seedPath}`)
  console.error(error.message)
  process.exit(1)
}

if (!Array.isArray(nodes)) {
  console.error('master-graph.json must be a JSON array of node objects.')
  process.exit(1)
}

console.log(`Seeding ${nodes.length} master graph nodes to Firestore...`)

// ── Batch upsert ──────────────────────────────────────────────────────────────
// Firestore batches max 500 writes — use 450 to stay safely under the limit.

const BATCH_SIZE = 450
let written = 0
let skipped = 0

for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
  const batch = db.batch()
  const slice = nodes.slice(i, i + BATCH_SIZE)

  for (const node of slice) {
    if (!node.id) {
      console.warn('  Skipping node without id:', node)
      skipped++
      continue
    }
    const ref = db.collection('masterGraph').doc(String(node.id))
    // Full overwrite (no merge) — ensures stale fields are removed on re-seed
    batch.set(ref, node)
  }

  await batch.commit()
  written += slice.length
  console.log(`  ${written} / ${nodes.length} written`)
}

console.log(`\nDone. ${written} nodes seeded. ${skipped} skipped (missing id).`)
process.exit(0)
