/**
 * chat.ts — Handle coach chat messages.
 *
 * Called by api/coach.ts on POST /api/coach/chat.
 * Maintains conversation history in Firestore and streams a response via Claude.
 */
import type { Firestore } from 'firebase-admin/firestore'
import { callClaude } from '../_lib/claude.js'
import { checkAndIncrementCap } from '../_lib/rate-limit.js'
import type { AthleteProfile, Message } from '../../src/types/index.js'

const COACH_SYSTEM_PROMPT = `You are Kadera, an expert AI running coach. You are having a conversation with your athlete.

Guidelines:
- Be warm, concise, and practical. Avoid lengthy lists unless necessary.
- Reference the athlete's training data when relevant (VDOT, upcoming sessions, race goal).
- When asked about paces, always convert VDOT to concrete min/km values.
- When asked about adjustments, clarify what specifically would change and why.
- Never suggest seeing a doctor unless the athlete mentions acute injury symptoms.
- Keep responses under 200 words unless a detailed explanation is clearly needed.`

export async function handleChat(
  db: Firestore,
  uid: string,
  profile: AthleteProfile,
  message: string,
  conversationId: string | undefined,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ message: string; conversationId: string }> {
  // Rate limit check
  const capResult = await checkAndIncrementCap(uid)
  if (!capResult.allowed) {
    const err = new Error("Daily message cap reached") as Error & { statusCode: number }
    err.statusCode = 402
    throw err
  }

  // Resolve or create conversation
  const convoId = conversationId ?? db.collection('users').doc(uid).collection('conversations').doc().id
  const convoRef = db.collection('users').doc(uid).collection('conversations').doc(convoId)

  // Fetch existing messages from Firestore if no history provided
  let messages: Array<{ role: 'user' | 'assistant'; content: string }> = history

  if (messages.length === 0 && conversationId) {
    const snap = await convoRef.collection('messages').orderBy('createdAt').limitToLast(40).get()
    messages = snap.docs.map((d) => {
      const data = d.data() as Message
      return { role: data.role, content: data.content }
    })
  }

  // Add athlete context to first message if no history
  const contextPrefix =
    messages.length === 0
      ? `[Athlete context: Name=${profile.name}, VDOT=${profile.vdot}, Target=${profile.targetRace} on ${profile.targetDate}, Weekly km=${profile.currentWeeklyKm}]\n\n`
      : ''

  const allMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...messages,
    { role: 'user', content: contextPrefix + message },
  ]

  const { text } = await callClaude({
    systemPrompt: COACH_SYSTEM_PROMPT,
    messages: allMessages,
    maxTokens: 512,
    functionName: 'chat',
  })

  const now = new Date().toISOString()

  // Persist both messages to Firestore
  const batch = db.batch()
  const userMsgRef = convoRef.collection('messages').doc()
  batch.set(userMsgRef, {
    role: 'user',
    content: message,
    createdAt: now,
  })
  const assistantMsgRef = convoRef.collection('messages').doc()
  batch.set(assistantMsgRef, {
    role: 'assistant',
    content: text,
    createdAt: now,
  })
  batch.set(
    convoRef,
    { lastMessageAt: now, updatedAt: now, uid },
    { merge: true },
  )
  await batch.commit()

  return { message: text, conversationId: convoId }
}
