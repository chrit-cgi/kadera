/**
 * api/coach.ts — AI coach router
 *
 * Routes:
 *   POST /api/coach/brief   → Morning brief (cached per day)
 *   POST /api/coach/chat    → Freeform coach conversation
 *   POST /api/coach/review  → Post-session review submission
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { generateMorningBrief } from './_handlers/morning-brief.js'
import { handleChat } from './_handlers/chat.js'
import { handleReview } from './_handlers/reviews.js'
import type { AthleteProfile } from '../src/types/index.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function getProfile(uid: string): Promise<AthleteProfile | null> {
  const db = getDb()
  const snap = await db.collection('users').doc(uid).collection('profile').doc('current').get()
  if (!snap.exists) return null
  return snap.data() as AthleteProfile
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  const url = req.url ?? ''
  const path = url.split('?')[0]

  // ── POST /api/coach/brief ──────────────────────────────────────────────────
  if (path.endsWith('/brief')) {
    const db = getDb()
    const today = new Date().toISOString().slice(0, 10)

    // Return cached brief if exists
    const cachedSnap = await db
      .collection('users')
      .doc(user.uid)
      .collection('briefs')
      .doc(today)
      .get()

    if (cachedSnap.exists) {
      return send(res, 200, { ...cachedSnap.data(), cached: true })
    }

    const profile = await getProfile(user.uid)
    if (!profile) return send(res, 404, { error: 'Profile not found. Complete onboarding first.' })

    // Fetch weather (best-effort via weather handler)
    let weather: Record<string, unknown> = { available: false }
    try {
      const { default: weatherHandler } = await import('./weather.js')
      const fakeReq = { ...req, method: 'GET' } as Req
      // Build a mock response to capture weather data
      let weatherData: Record<string, unknown> = { available: false }
      const fakeRes = {
        writeHead: () => {},
        end: (body: string) => { try { weatherData = JSON.parse(body) as Record<string, unknown> } catch {} },
      } as unknown as ServerResponse
      await weatherHandler(fakeReq, fakeRes)
      weather = weatherData
    } catch {
      // Weather unavailable — proceed without it
    }

    try {
      const brief = await generateMorningBrief(db, user.uid, profile, weather as unknown as Parameters<typeof generateMorningBrief>[3])
      return send(res, 200, brief)
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  // ── POST /api/coach/chat ───────────────────────────────────────────────────
  if (path.endsWith('/chat')) {
    const body = req.body ?? {}
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) return send(res, 400, { error: 'message is required' })

    const conversationId = typeof body.conversationId === 'string' && body.conversationId
      ? body.conversationId
      : undefined
    const history = Array.isArray(body.history)
      ? (body.history as Array<{ role: 'user' | 'assistant'; content: string }>)
      : []

    const profile = await getProfile(user.uid)
    if (!profile) return send(res, 404, { error: 'Profile not found. Complete onboarding first.' })

    try {
      const result = await handleChat(
        getDb(),
        user.uid,
        profile,
        message,
        conversationId,
        history,
      )
      // Map to ChatResponse shape
      return send(res, 200, {
        reply: result.message,
        conversationId: result.conversationId,
        actions: [],
        remainingMessages: -1, // populated by rate-limit; -1 = unknown
        costUSD: 0,
      })
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  // ── POST /api/coach/review ─────────────────────────────────────────────────
  if (path.endsWith('/review')) {
    const body = req.body ?? {}
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
    const feelScore = typeof body.feelScore === 'number' ? body.feelScore : null
    const completionNotes = typeof body.completionNotes === 'string' ? body.completionNotes : ''

    // Support the api.ts shape: postReview(type, sessionId?) — type-based review
    if (!sessionId && typeof body.type === 'string') {
      // Weekly review or no-session review — return minimal response
      return send(res, 200, {
        id: crypto.randomUUID(),
        type: body.type,
        content: 'Weekly review noted.',
        sessionIds: [],
        weekNumber: null,
        generatedAt: new Date().toISOString(),
        triggeredBy: 'athlete',
      })
    }

    if (!sessionId) return send(res, 400, { error: 'sessionId is required for post-run review' })
    if (!feelScore || feelScore < 1 || feelScore > 5) return send(res, 400, { error: 'feelScore must be 1–5' })

    const profile = await getProfile(user.uid)
    if (!profile) return send(res, 404, { error: 'Profile not found.' })

    try {
      const result = await handleReview(getDb(), user.uid, profile, {
        sessionId,
        feelScore: feelScore as 1 | 2 | 3 | 4 | 5,
        completionNotes,
      })
      return send(res, 200, {
        id: sessionId,
        type: 'post_run',
        content: result.insight,
        sessionIds: [result.sessionId],
        weekNumber: null,
        generatedAt: new Date().toISOString(),
        triggeredBy: 'athlete',
      })
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
    }
  }

  return send(res, 404, { error: 'Not found' })
}
