/**
 * plan-adjustment.ts — Handle training plan session swaps and adjustments.
 *
 * Called by api/plan.ts:
 *   PATCH /api/plan/session/:sessionId  → Swap or complete a session
 *   PATCH /api/plan/adjustment/:id      → Accept or reject a proposed adjustment
 */
import type { Firestore } from 'firebase-admin/firestore'
import { callClaude } from '../_lib/claude.js'
import type { AthleteProfile } from '../../src/types/index.js'

interface SwapInput {
  action: 'swap'
  crossTrainingType: string
}

interface CompleteInput {
  action: 'complete'
  feelScore: number
  notes: string | null
}

type SessionPatchInput = SwapInput | CompleteInput

const ADJUSTMENT_SYSTEM_PROMPT = `You are Kadera, an AI running coach. Generate a brief rationale (1-2 sentences) for a training plan adjustment. Be specific and physiologically sound.`

export async function patchSession(
  db: Firestore,
  uid: string,
  sessionId: string,
  input: SessionPatchInput,
): Promise<{ session: Record<string, unknown> }> {
  const sessionRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId)
  const snap = await sessionRef.get()

  if (!snap.exists) {
    const err = new Error('Session not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  const now = new Date().toISOString()

  if (input.action === 'swap') {
    await sessionRef.update({
      status: 'swapped',
      swappedForType: input.crossTrainingType,
      completedAt: now,
    })
    const updated = { ...snap.data(), status: 'swapped', swappedForType: input.crossTrainingType }
    return { session: updated }
  }

  if (input.action === 'complete') {
    const { feelScore, notes } = input
    await sessionRef.update({
      status: 'completed',
      feelScore,
      completionNotes: notes,
      completedAt: now,
    })
    const updated = { ...snap.data(), status: 'completed', feelScore, completionNotes: notes, completedAt: now }
    return { session: updated }
  }

  const err = new Error('Invalid action') as Error & { statusCode: number }
  err.statusCode = 400
  throw err
}

export async function handleAdjustmentDecision(
  db: Firestore,
  uid: string,
  adjustmentId: string,
  decision: 'accepted' | 'rejected',
): Promise<{ adjustmentId: string; status: string }> {
  const adjRef = db.collection('users').doc(uid).collection('adjustments').doc(adjustmentId)
  const adjSnap = await adjRef.get()

  if (!adjSnap.exists) {
    const err = new Error('Adjustment not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  const now = new Date().toISOString()
  await adjRef.update({ status: decision, decidedAt: now })

  // If accepted, apply changes to sessions
  if (decision === 'accepted') {
    const adjData = adjSnap.data() as { changes?: Array<{ sessionId: string; field: string; newValue: unknown }> }
    const changes = adjData.changes ?? []

    if (changes.length > 0) {
      const batch = db.batch()
      for (const change of changes) {
        const sessionRef = db.collection('users').doc(uid).collection('sessions').doc(change.sessionId)
        batch.update(sessionRef, { [change.field]: change.newValue, adjustmentId, updatedAt: now })
      }
      await batch.commit()
    }
  }

  return { adjustmentId, status: decision }
}

export async function generateAdjustmentProposal(
  db: Firestore,
  uid: string,
  profile: AthleteProfile,
  reason: string,
): Promise<{ adjustmentId: string; rationale: string; changes: unknown[] }> {
  // Get upcoming planned sessions
  const today = new Date().toISOString().slice(0, 10)
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('sessions')
    .where('scheduledDate', '>=', today)
    .where('status', '==', 'planned')
    .orderBy('scheduledDate')
    .limit(7)
    .get()

  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; type: string; plannedDistanceKm: number }))

  const { text: rationale } = await callClaude({
    systemPrompt: ADJUSTMENT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Athlete: ${profile.name}, VDOT: ${profile.vdot}, reason for adjustment: ${reason}. Upcoming sessions: ${JSON.stringify(sessions.slice(0, 3))}. Generate a brief rationale.`,
      },
    ],
    maxTokens: 200,
    functionName: 'adjustment',
  })

  // For now, propose a volume reduction of 10% across upcoming easy sessions
  const changes = sessions
    .filter((s) => s.type === 'easy')
    .slice(0, 2)
    .map((s) => ({
      sessionId: s.id,
      field: 'plannedDistanceKm',
      oldValue: s.plannedDistanceKm,
      newValue: Math.round(s.plannedDistanceKm * 0.9 * 10) / 10,
      rationale: rationale.trim(),
    }))

  const adjRef = db.collection('users').doc(uid).collection('adjustments').doc()
  await adjRef.set({
    status: 'pending',
    reason,
    rationale: rationale.trim(),
    changes,
    createdAt: new Date().toISOString(),
    triggeredBy: 'athlete',
  })

  return { adjustmentId: adjRef.id, rationale: rationale.trim(), changes }
}
