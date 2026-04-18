/**
 * api/admin.ts — Admin panel Vercel function
 *
 * All routes use query params to avoid Vercel sub-path routing issues:
 *   GET  /api/admin?resource=dashboard
 *   GET  /api/admin?resource=invites
 *   POST /api/admin?resource=invites
 *   PATCH /api/admin?resource=invites&email=:email
 *   GET  /api/admin?resource=users
 *   PATCH /api/admin?resource=users&uid=:uid
 *   PATCH /api/admin?resource=settings
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAdmin } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { writeAuditLog } from './_lib/audit.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseQuery(url: string): Record<string, string> {
  const qs = url.split('?')[1] ?? ''
  return Object.fromEntries(new URLSearchParams(qs).entries())
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function handleDashboard(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })

  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)

  const [configSnap, todayCostSnap, usersCount] = await Promise.all([
    db.collection('globalConfig').doc('settings').get(),
    db.collection('costs').doc(today).get(),
    db.collection('users').count().get(),
  ])

  const config = configSnap.data() ?? {}
  const todayCost = todayCostSnap.data() ?? {}

  const monthSnaps = await db
    .collection('costs')
    .where('date', '>=', `${thisMonth}-01`)
    .where('date', '<=', `${thisMonth}-31`)
    .get()

  const monthlyCostUSD = monthSnaps.docs.reduce(
    (sum, d) => sum + ((d.data().totalCostUSD as number) ?? 0),
    0,
  )

  const todayStart = new Date(`${today}T00:00:00Z`)
  const activeTodaySnap = await db
    .collection('users')
    .where('lastLoginAt', '>=', todayStart.toISOString())
    .count()
    .get()

  const recentAuditSnap = await db
    .collection('auditLog')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get()

  return send(res, 200, {
    userCount: usersCount.data().count,
    activeToday: activeTodaySnap.data().count,
    dailyCostUSD: todayCost.totalCostUSD ?? 0,
    monthlyCostUSD,
    killSwitchEnabled: config.killSwitch?.enabled ?? false,
    spendCaps: config.spendCaps ?? { dailyUSD: 50, monthlyUSD: 500 },
    recentAuditEvents: recentAuditSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  })
}

// ── Invites ───────────────────────────────────────────────────────────────────

async function handleInvites(req: Req, res: ServerResponse, uid: string, emailParam?: string) {
  const db = getDb()

  if (req.method === 'GET' && !emailParam) {
    const snap = await db.collection('invites').orderBy('createdAt', 'desc').get()
    return send(res, 200, { invites: snap.docs.map((d) => d.data()) })
  }

  if (req.method === 'POST' && !emailParam) {
    const email = ((req.body?.email as string) ?? '').toLowerCase().trim()
    if (!email || !email.includes('@')) return send(res, 400, { error: 'invalid_email' })

    const invite = {
      email,
      status: 'pending',
      addedByAdminId: uid,
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      revokedAt: null,
    }
    await db.collection('invites').doc(email).set(invite)
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: new Date().toISOString(),
      userId: null,
      actingAdminId: uid,
      affectedUserId: null,
      path: null,
      reason: null,
      action: 'invite_add',
      params: { email },
      tablesCleared: null,
    })
    return send(res, 201, { invite })
  }

  if (req.method === 'PATCH' && emailParam) {
    const action = req.body?.action
    if (action !== 'revoke') return send(res, 400, { error: 'invalid_action' })

    const email = decodeURIComponent(emailParam)
    await db.collection('invites').doc(email).update({ status: 'revoked', revokedAt: new Date().toISOString() })
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: new Date().toISOString(),
      userId: null,
      actingAdminId: uid,
      affectedUserId: null,
      path: null,
      reason: null,
      action: 'invite_revoke',
      params: { email },
      tablesCleared: null,
    })
    const updated = await db.collection('invites').doc(email).get()
    return send(res, 200, { invite: updated.data() })
  }

  return send(res, 405, { error: 'Method not allowed' })
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function handleUsers(req: Req, res: ServerResponse, adminUid: string, targetUid?: string) {
  const db = getDb()

  if (req.method === 'GET' && !targetUid) {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get()
    return send(res, 200, { users: snap.docs.map((d) => ({ uid: d.id, ...d.data() })) })
  }

  if (req.method === 'PATCH' && targetUid) {
    const tier = req.body?.tier as string
    const validTiers = ['free', 'starter', 'elite']
    if (!validTiers.includes(tier)) return send(res, 400, { error: 'invalid_tier' })

    await db.collection('users').doc(targetUid).update({ tier })
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: new Date().toISOString(),
      userId: null,
      actingAdminId: adminUid,
      affectedUserId: targetUid,
      path: null,
      reason: null,
      action: 'tier_change',
      params: { newTier: tier },
      tablesCleared: null,
    })
    return send(res, 200, { uid: targetUid, tier })
  }

  return send(res, 405, { error: 'Method not allowed' })
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function handleSettings(req: Req, res: ServerResponse, uid: string) {
  if (req.method !== 'PATCH') return send(res, 405, { error: 'Method not allowed' })

  const db = getDb()
  const settingsRef = db.collection('globalConfig').doc('settings')
  const now = new Date().toISOString()

  if (req.body?.killSwitch !== undefined) {
    const enabled = Boolean(req.body.killSwitch)
    await settingsRef.set(
      { killSwitch: { enabled, enabledAt: enabled ? now : null, enabledByAdminId: enabled ? uid : null } },
      { merge: true },
    )
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: now,
      userId: null,
      actingAdminId: uid,
      affectedUserId: null,
      path: null,
      reason: null,
      action: enabled ? 'kill_switch_on' : 'kill_switch_off',
      params: null,
      tablesCleared: null,
    })
  }

  if (req.body?.spendCaps) {
    const caps = req.body.spendCaps as { dailyUSD: number; monthlyUSD: number }
    await settingsRef.set({ spendCaps: { ...caps } }, { merge: true })
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: now,
      userId: null,
      actingAdminId: uid,
      affectedUserId: null,
      path: null,
      reason: null,
      action: 'spend_cap_update',
      params: { caps },
      tablesCleared: null,
    })
  }

  const updated = await settingsRef.get()
  return send(res, 200, { settings: updated.data() })
}

// ── Router ────────────────────────────────────────────────────────────────────

export default async function handler(req: Req, res: ServerResponse) {
  try {
    const admin = await verifyAdmin(req)
    const q = parseQuery(req.url ?? '')
    const resource = q.resource ?? 'dashboard'

    switch (resource) {
      case 'dashboard': return handleDashboard(req, res)
      case 'invites': return handleInvites(req, res, admin.uid, q.email)
      case 'users': return handleUsers(req, res, admin.uid, q.uid)
      case 'settings': return handleSettings(req, res, admin.uid)
      default: return send(res, 404, { error: 'Not found' })
    }
  } catch (err) {
    const e = err as { statusCode?: number; message?: string }
    if (!res.headersSent) send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
  }
}
