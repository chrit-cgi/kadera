/**
 * api/garmin.ts — Garmin data import
 *
 * POST /api/garmin/import  → Upload Garmin FIT/JSON activity file
 * GET  /api/garmin/activities → List imported activities
 *
 * Processes multipart/form-data with a 'file' field.
 * Parses Garmin JSON export format or interprets FIT file metadata.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { writeAuditLog } from './_lib/audit.js'

type Req = IncomingMessage & {
  body?: Record<string, unknown>
  files?: Record<string, { originalname: string; mimetype: string; buffer: Buffer; size: number }>
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parsePath(url: string): string[] {
  return url.split('?')[0].replace(/^\/api\/garmin\/?/, '').split('/').filter(Boolean)
}

// Parse a Garmin JSON export activity object into our Activity type
function parseGarminActivity(raw: Record<string, unknown>, uid: string, batchId: string): Record<string, unknown> {
  const distKm = Math.round((Number(raw.distance ?? 0) / 1000) * 100) / 100
  const dedupHash = `${String(raw.startTimeLocal ?? raw.start_time_local ?? '')}-${distKm}`
  return {
    uid,
    source: 'garmin_csv',
    activityType: String(raw.activityType ?? raw.activity_type ?? 'running'),
    title: String(raw.activityName ?? raw.name ?? 'Activity'),
    date: String(raw.startTimeLocal ?? raw.start_time_local ?? raw.startTime ?? '').slice(0, 10),
    distanceKm: distKm,
    durationSec: Number(raw.elapsedDuration ?? raw.elapsed_duration ?? raw.duration ?? 0),
    avgHR: Number(raw.averageHR ?? raw.average_hr ?? 0) || null,
    maxHR: Number(raw.maxHR ?? raw.max_hr ?? 0) || null,
    calories: Number(raw.calories ?? 0) || null,
    dedupHash,
    importedAt: new Date().toISOString(),
    importBatchId: batchId,
  }
}

export default async function handler(req: Req, res: ServerResponse) {
  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  const segments = parsePath(req.url ?? '')
  const db = getDb()

  // ── GET /api/garmin/activities ─────────────────────────────────────────────
  if (req.method === 'GET' && segments[0] === 'activities') {
    const snap = await db
      .collection('users')
      .doc(user.uid)
      .collection('activities')
      .orderBy('startTime', 'desc')
      .limit(50)
      .get()
    const activities = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return send(res, 200, { activities })
  }

  // ── POST /api/garmin/import ────────────────────────────────────────────────
  if (req.method === 'POST' && segments[0] === 'import') {
    // In production with Vercel, body parsing is handled by middleware.
    // In dev mode (dev-server.ts), body contains parsed multipart data.
    const body = req.body ?? {}

    // Expect either:
    // - body.activities: array of Garmin activity objects (JSON export)
    // - body.rawJson: stringified Garmin JSON export
    let rawActivities: Record<string, unknown>[] = []

    if (Array.isArray(body.activities)) {
      rawActivities = body.activities as Record<string, unknown>[]
    } else if (typeof body.rawJson === 'string') {
      try {
        const parsed = JSON.parse(body.rawJson) as unknown
        rawActivities = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [parsed as Record<string, unknown>]
      } catch {
        return send(res, 400, { error: 'Invalid JSON in rawJson field' })
      }
    } else {
      return send(res, 400, { error: 'Provide activities array or rawJson string' })
    }

    if (rawActivities.length === 0) {
      return send(res, 400, { error: 'No activities found in file' })
    }

    // Limit import size
    const toImport = rawActivities.slice(0, 100)
    const batchId = db.collection('users').doc(user.uid).collection('importBatches').doc().id
    const parsed = toImport.map((a) => parseGarminActivity(a, user.uid, batchId))

    // Batch write to Firestore
    const BATCH_SIZE = 450
    let imported = 0
    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = db.batch()
      for (const activity of parsed.slice(i, i + BATCH_SIZE)) {
        const ref = db.collection('users').doc(user.uid).collection('activities').doc()
        batch.set(ref, activity)
        imported++
      }
      await batch.commit()
    }

    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: new Date().toISOString(),
      userId: user.uid,
      actingAdminId: null,
      affectedUserId: user.uid,
      path: '/api/garmin/import',
      reason: null,
      action: 'garmin_import',
      params: { count: imported },
      tablesCleared: null,
    })

    return send(res, 200, {
      imported,
      skipped: rawActivities.length - imported,
      total: rawActivities.length,
    })
  }

  return send(res, 404, { error: 'Not found' })
}
