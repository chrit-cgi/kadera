import type { IncomingMessage } from 'http'
import { getAuth } from 'firebase-admin/auth'
import { getDb } from './firestore.js'
import { writeAuditLog } from './audit.js'
import type { UserTier } from '../../src/types/index.js'

// ── Dev bypass stub ───────────────────────────────────────────────────────────

const DEV_STUB = {
  uid: 'dev-user-001',
  email: 'dev@kadera.local',
  tier: 'elite' as UserTier,
}

function isBypassAllowed(): boolean {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error('[auth] DEV_BYPASS_AUTH is not allowed in production')
    }
    return true
  }
  return false
}

// ── Token extraction ──────────────────────────────────────────────────────────

function extractBearerToken(req: IncomingMessage): string | null {
  const auth = (req as IncomingMessage & { headers: Record<string, string | string[] | undefined> })
    .headers['authorization']
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// ── verifyAuth ────────────────────────────────────────────────────────────────

export interface VerifiedUser {
  uid: string
  email: string
  displayName: string
  tier: UserTier
  isAdmin: boolean
}

export async function verifyAuth(req: IncomingMessage): Promise<VerifiedUser> {
  if (isBypassAllowed()) return { ...DEV_STUB, displayName: 'Dev User', isAdmin: true }

  const token = extractBearerToken(req)

  if (!token) {
    await writeAuditLog({
      eventType: 'auth_failure',
      timestamp: new Date().toISOString(),
      userId: null,
      actingAdminId: null,
      affectedUserId: null,
      path: (req as { url?: string }).url ?? null,
      reason: 'missing_token',
      action: null,
      params: null,
      tablesCleared: null,
    })
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
  }

  try {
    const db = getDb() // ensures Firebase Admin is initialized before getAuth()
    const decoded = await getAuth().verifyIdToken(token)
    const [userDoc, adminDoc] = await Promise.all([
      db.collection('users').doc(decoded.uid).get(),
      db.collection('admins').doc(decoded.email ?? '').get(),
    ])
    const tier: UserTier = (userDoc.data()?.tier as UserTier | undefined) ?? 'free'
    const isAdmin = adminDoc.exists && adminDoc.data()?.active === true

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? decoded.email ?? '',
      tier,
      isAdmin,
    }
  } catch (err) {
    console.error('[auth] verifyIdToken error:', err)
    await writeAuditLog({
      eventType: 'auth_failure',
      timestamp: new Date().toISOString(),
      userId: null,
      actingAdminId: null,
      affectedUserId: null,
      path: (req as { url?: string }).url ?? null,
      reason: 'invalid_token',
      action: null,
      params: null,
      tablesCleared: null,
    })
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
  }
}

// ── verifyAdmin ───────────────────────────────────────────────────────────────

export async function verifyAdmin(req: IncomingMessage): Promise<VerifiedUser> {
  const user = await verifyAuth(req)

  if (!user.isAdmin) {
    await writeAuditLog({
      eventType: 'admin_action',
      timestamp: new Date().toISOString(),
      userId: user.uid,
      actingAdminId: null,
      affectedUserId: null,
      path: (req as { url?: string }).url ?? null,
      reason: 'not_admin',
      action: 'admin_access_denied',
      params: null,
      tablesCleared: null,
    })
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
  }

  return user
}
