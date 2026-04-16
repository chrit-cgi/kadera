/**
 * api/export.ts — GDPR data export
 *
 * GET /api/export
 *
 * Returns all athlete data as a JSON download.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { writeAuditLog } from './_lib/audit.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    res.writeHead(err.statusCode ?? 401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message ?? 'Unauthorized' }))
    return
  }

  try {
    const db = getDb()
    const uid = user.uid
    const userRef = db.collection('users').doc(uid)

    // Collect all data in parallel
    const [
      profileSnap,
      sessionsSnap,
      mealsSnap,
      activitiesSnap,
      reviewsSnap,
      briefsSnap,
    ] = await Promise.all([
      userRef.collection('profile').doc('current').get(),
      userRef.collection('sessions').orderBy('scheduledDate').get(),
      userRef.collection('meals').orderBy('loggedAt', 'desc').get(),
      userRef.collection('activities').orderBy('date', 'desc').get(),
      userRef.collection('reviews').orderBy('generatedAt', 'desc').get(),
      userRef.collection('briefs').orderBy('date', 'desc').limit(30).get(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      uid,
      profile: profileSnap.exists ? profileSnap.data() : null,
      sessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      meals: mealsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      activities: activitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      reviews: reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      briefs: briefsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    }

    await writeAuditLog({
      eventType: 'data_export',
      timestamp: new Date().toISOString(),
      userId: uid,
      actingAdminId: null,
      affectedUserId: uid,
      path: null,
      reason: null,
      action: 'data_export',
      params: {
        exportScope: ['profile', 'sessions', 'meals', 'activities', 'reviews', 'briefs'],
        sessionCount: sessionsSnap.size,
        mealCount: mealsSnap.size,
        activityCount: activitiesSnap.size,
      },
      tablesCleared: null,
    })

    const today = new Date().toISOString().slice(0, 10)
    const body = JSON.stringify(exportData, null, 2)
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=kadera-export-${today}.json`,
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
  } catch (err) {
    const e = err as { message?: string }
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: e.message ?? 'Export failed' }))
  }
}
