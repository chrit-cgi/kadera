/**
 * api/account.ts — Account management
 *
 * Routes:
 *   GET    /api/account          → Fetch account + profile
 *   PATCH  /api/account/prefs    → Update coach style
 *   DELETE /api/account          → Delete account (GDPR)
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { writeAuditLog } from './_lib/audit.js'
import { TIER_CAPS } from '../src/types/index.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parsePath(url: string): string[] {
  return url.split('?')[0].replace(/^\/api\/account\/?/, '').split('/').filter(Boolean)
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

  // ── GET /api/account ───────────────────────────────────────────────────────
  if (req.method === 'GET' && segments.length === 0) {
    const [userSnap, profileSnap] = await Promise.all([
      db.collection('users').doc(user.uid).get(),
      db.collection('users').doc(user.uid).collection('profile').doc('current').get(),
    ])

    const userData = userSnap.data() ?? {}
    const tier = (userData.tier as 'free' | 'starter' | 'elite' | undefined) ?? 'free'
    const profile = profileSnap.exists ? profileSnap.data() : null

    return send(res, 200, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      tier,
      dailyMessageCount: userData.dailyMessageCount ?? 0,
      dailyMessageCap: TIER_CAPS[tier],
      coachStyle: userData.coachStyle ?? 'motivator',
      onboardingStatus: userData.onboardingStatus ?? 'not_started',
      profile,
      isAdmin: user.isAdmin ?? false,
    })
  }

  // ── PATCH /api/account ────────────────────────────────────────────────────
  if (req.method === 'PATCH' && segments.length === 0) {
    const body = req.body ?? {}
    const coachStyle = typeof body.coachStyle === 'string' ? body.coachStyle : ''
    const validStyles = ['motivator', 'analytical', 'gentle', 'challenger']

    if (!validStyles.includes(coachStyle)) {
      return send(res, 400, { error: `coachStyle must be one of: ${validStyles.join(', ')}` })
    }

    await db.collection('users').doc(user.uid).update({ coachStyle, updatedAt: new Date().toISOString() })
    return send(res, 200, { coachStyle })
  }

  // ── DELETE /api/account ────────────────────────────────────────────────────
  if (req.method === 'DELETE' && segments.length === 0) {
    const body = req.body ?? {}
    if (body.confirmation !== 'DELETE MY ACCOUNT') {
      return send(res, 400, { error: 'Confirmation phrase mismatch' })
    }

    // Soft delete — mark as deleted, anonymise PII
    await db.collection('users').doc(user.uid).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      email: `deleted-${user.uid}@kadera.deleted`,
      displayName: 'Deleted User',
    })

    await writeAuditLog({
      eventType: 'account_deleted',
      timestamp: new Date().toISOString(),
      userId: user.uid,
      actingAdminId: null,
      affectedUserId: user.uid,
      path: null,
      reason: 'self_delete',
      action: 'account_delete',
      params: { selfDelete: true },
      tablesCleared: null,
    })

    return send(res, 204, undefined)
  }

  return send(res, 404, { error: 'Not found' })
}
