/**
 * api/plan.ts — Training plan management
 *
 * Routes:
 *   GET  /api/plan                           → Fetch plan + upcoming sessions
 *   PATCH /api/plan/session/:sessionId       → Swap or complete a session
 *   GET  /api/plan/adjustment/:id            → Get adjustment proposal
 *   PATCH /api/plan/adjustment/:id           → Accept or reject adjustment
 *   POST /api/plan/adjustment                → Request a new adjustment
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { patchSession, handleAdjustmentDecision, generateAdjustmentProposal } from './_handlers/plan-adjustment.js'
import type { AthleteProfile } from '../src/types/index.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parsePath(url: string): string[] {
  return url.split('?')[0].replace(/^\/api\/plan\/?/, '').split('/').filter(Boolean)
}

export default async function handler(req: Req, res: ServerResponse) {
  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  const db = getDb()
  const segments = parsePath(req.url ?? '')

  // ── GET /api/plan ──────────────────────────────────────────────────────────
  if (req.method === 'GET' && segments.length === 0) {
    const [planSnap, sessionsSnap] = await Promise.all([
      db.collection('users').doc(user.uid).collection('plan').doc('current').get(),
      db
        .collection('users')
        .doc(user.uid)
        .collection('sessions')
        .orderBy('scheduledDate')
        .limit(100)
        .get(),
    ])

    if (!planSnap.exists) return send(res, 404, { error: 'No training plan found. Complete onboarding first.' })

    const plan = planSnap.data()
    const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return send(res, 200, { plan: { ...plan, sessions } })
  }

  // ── PATCH /api/plan/session/:sessionId ─────────────────────────────────────
  if (req.method === 'PATCH' && segments[0] === 'session' && segments[1]) {
    const sessionId = segments[1]
    const body = req.body ?? {}
    const action = typeof body.action === 'string' ? body.action : ''

    if (action !== 'swap' && action !== 'complete') {
      return send(res, 400, { error: 'action must be "swap" or "complete"' })
    }

    try {
      const result = await patchSession(db, user.uid, sessionId, body as unknown as Parameters<typeof patchSession>[3])
      return send(res, 200, result)
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  // ── GET /api/plan/adjustment/:id ───────────────────────────────────────────
  if (req.method === 'GET' && segments[0] === 'adjustment' && segments[1]) {
    const adjId = segments[1]
    const snap = await db.collection('users').doc(user.uid).collection('adjustments').doc(adjId).get()
    if (!snap.exists) return send(res, 404, { error: 'Adjustment not found' })
    return send(res, 200, { id: adjId, ...snap.data() })
  }

  // ── PATCH /api/plan/adjustment/:id ─────────────────────────────────────────
  if (req.method === 'PATCH' && segments[0] === 'adjustment' && segments[1]) {
    const adjId = segments[1]
    const body = req.body ?? {}
    const decision = typeof body.decision === 'string' ? body.decision : ''

    if (decision !== 'accepted' && decision !== 'rejected') {
      return send(res, 400, { error: 'decision must be "accepted" or "rejected"' })
    }

    try {
      const result = await handleAdjustmentDecision(db, user.uid, adjId, decision as 'accepted' | 'rejected')
      return send(res, 200, result)
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  // ── POST /api/plan/adjustment ──────────────────────────────────────────────
  if (req.method === 'POST' && segments[0] === 'adjustment' && !segments[1]) {
    const body = req.body ?? {}
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return send(res, 400, { error: 'reason is required' })

    const profileSnap = await db.collection('users').doc(user.uid).collection('profile').doc('current').get()
    if (!profileSnap.exists) return send(res, 404, { error: 'Profile not found' })
    const profile = profileSnap.data() as AthleteProfile

    try {
      const result = await generateAdjustmentProposal(db, user.uid, profile, reason)
      return send(res, 200, result)
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  return send(res, 404, { error: 'Not found' })
}
