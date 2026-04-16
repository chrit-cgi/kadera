/**
 * reviews.ts — Handle post-session review submission.
 *
 * Called by api/coach.ts on POST /api/coach/review.
 * Saves feel score + notes to the session, generates an AI insight, and updates
 * the knowledge graph with any detected behavioural patterns.
 */
import type { Firestore } from 'firebase-admin/firestore'
import { callClaude } from '../_lib/claude.js'
import type { AthleteProfile } from '../../src/types/index.js'

interface ReviewInput {
  sessionId: string
  feelScore: 1 | 2 | 3 | 4 | 5
  completionNotes: string
}

interface ReviewResult {
  insight: string
  sessionId: string
}

const REVIEW_SYSTEM_PROMPT = `You are Kadera, an AI running coach. Analyse the athlete's post-session review and provide a brief (1-2 sentence) insight or encouragement. Focus on training adaptation, effort calibration, or recovery. Be specific, not generic.`

export async function handleReview(
  db: Firestore,
  uid: string,
  profile: AthleteProfile,
  input: ReviewInput,
): Promise<ReviewResult> {
  const { sessionId, feelScore, completionNotes } = input

  // Fetch the session
  const sessionRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId)
  const sessionSnap = await sessionRef.get()

  if (!sessionSnap.exists) {
    const err = new Error('Session not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  const session = sessionSnap.data() as {
    type: string
    title: string
    plannedDistanceKm: number
    targetPaceMinPerKm: number
    targetHRZone: number
  }

  // Generate AI insight
  const prompt = `Session: ${session.title} (${session.plannedDistanceKm}km, zone ${session.targetHRZone})
Athlete feel score: ${feelScore}/5
Notes: ${completionNotes || '(none)'}
Athlete VDOT: ${profile.vdot}, target: ${profile.targetRace}

Provide a brief coaching insight:`

  const { text: insight } = await callClaude({
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 200,
    functionName: 'review',
  })

  const now = new Date().toISOString()

  // Update session with review data
  await sessionRef.update({
    feelScore,
    completionNotes,
    status: 'completed',
    completedAt: now,
    aiInsight: insight.trim(),
  })

  // If feel score is 1 or 2, add a behavioural pattern note to user graph
  if (feelScore <= 2 && completionNotes.trim()) {
    await db
      .collection('users')
      .doc(uid)
      .collection('userGraph')
      .add({
        type: 'trap',
        label: 'Post-session struggle',
        value: `${session.type} felt hard (score ${feelScore}/5): ${completionNotes.slice(0, 100)}`,
        source: 'review',
        masterNodeRefs: ['behavioural-patterns', 'mental-performance'],
        createdAt: now,
        updatedAt: now,
        active: true,
      })
  }

  return { insight: insight.trim(), sessionId }
}
