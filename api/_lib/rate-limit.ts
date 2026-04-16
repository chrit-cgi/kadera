import { getDb } from './firestore.js'
import { TIER_CAPS } from '../../src/types/index.js'
import type { UserTier } from '../../src/types/index.js'
import { FieldValue } from 'firebase-admin/firestore'

export interface CapResult {
  allowed: boolean
  remaining: number
}

/**
 * Check the athlete's daily message cap and increment if allowed.
 * Uses a Firestore transaction for atomic read-modify-write.
 * Resets the counter if the stored date differs from today in the user's timezone.
 */
export async function checkAndIncrementCap(uid: string): Promise<CapResult> {
  const db = getDb()
  const userRef = db.collection('users').doc(uid)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    const data = snap.data() ?? {}

    const tier: UserTier = (data.tier as UserTier | undefined) ?? 'free'
    const cap = TIER_CAPS[tier]

    // Determine today's date in UTC (timezone-aware reset handled here as UTC;
    // CHK039 is a known open item — full timezone handling deferred to v1.1)
    const todayStr = new Date().toISOString().slice(0, 10)
    const storedDate: string = data.dailyMessageDate ?? ''
    const storedCount: number = data.dailyMessageCount ?? 0

    const count = storedDate === todayStr ? storedCount : 0

    if (count >= cap) {
      return { allowed: false, remaining: 0 }
    }

    tx.update(userRef, {
      dailyMessageCount: FieldValue.increment(storedDate === todayStr ? 1 : 1),
      dailyMessageDate: todayStr,
      ...(storedDate !== todayStr ? { dailyMessageCount: 1 } : {}),
    })

    return { allowed: true, remaining: cap - count - 1 }
  })
}
