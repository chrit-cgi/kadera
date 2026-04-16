/**
 * api/admin.ts — Admin panel Vercel function (router)
 *
 * Routes:
 *   GET  /api/admin/dashboard
 *   GET  /api/admin/invites
 *   POST /api/admin/invites
 *   PATCH /api/admin/invites/:email
 *   GET  /api/admin/users
 *   PATCH /api/admin/users/:uid
 *   PATCH /api/admin/settings
 *
 * All routes require verifyAdmin().
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAdmin } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'
import { writeAuditLog } from './_lib/audit.js'
import { FieldValue } from 'firebase-admin/firestore'

type Req = IncomingMessage & { body?: Record<string, unknown>; query?: Record<string, string> }
type Res = ServerResponse & { json?: (data: unknown) => void }

function send(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

function pathSegments(url: string): string[] {
  return url.replace(/\?.*$/, '').split('/').filter(Boolean)
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function handleDashboard(req: Req, res: ServerResponse, uid: string) {
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

  // Monthly cost: sum all costs/{YYYY-MM-*} docs
  const monthSnaps = await db
    .collection('costs')
    .where('date', '>=', `${thisMonth}-01`)
    .where('date', '<=', `${thisMonth}-31`)
    .get()

  const monthlyCostUSD = monthSnaps.docs.reduce(
    (sum, d) => sum + ((d.data().totalCostUSD as number) ?? 0),
    0,
  )

  // Active today (lastLoginAt >= today 00:00 UTC)
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

  send(res, 200, {
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
    // List all invites
    const snap = await db.collection('invites').orderBy('createdAt', 'desc').get()
    const invites = snap.docs.map((d) => d.data())
    return send(res, 200, { invites })
  }

  if (req.method === 'POST' && !emailParam) {
    // Create invite
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
    // Revoke invite
    const action = req.body?.action
    if (action !== 'revoke') return send(res, 400, { error: 'invalid_action' })

    const email = decodeURIComponent(emailParam)
    const update = { status: 'revoked', revokedAt: new Date().toISOString() }
    await db.collection('invites').doc(email).update(update)
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
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
    return send(res, 200, { users })
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
    const url = (req.url ?? '/api/admin').replace(/^\/api\/admin/, '') || '/'
    const segs = url.split('/').filter(Boolean)
    // segs: [] | ['dashboard'] | ['invites'] | ['invites', ':email'] | ['users'] | ['users', ':uid'] | ['settings']

    const resource = segs[0] ?? 'dashboard'
    const param = segs[1]

    switch (resource) {
      case 'dashboard': return handleDashboard(req, res, admin.uid)
      case 'invites': return handleInvites(req, res, admin.uid, param)
      case 'users': return handleUsers(req, res, admin.uid, param)
      case 'settings': return handleSettings(req, res, admin.uid)
      default: return send(res, 404, { error: 'Not found' })
    }
  } catch (err) {
    const e = err as { statusCode?: number; message?: string }
    const status = e.statusCode ?? 500
    if (!res.headersSent) send(res, status, { error: e.message ?? 'Internal error' })
  }
}
