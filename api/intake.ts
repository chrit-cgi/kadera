/**
 * api/intake.ts — AI-guided onboarding intake conversation
 *
 * POST /api/intake
 *
 * Manages a multi-step intake Q&A via Claude. On the final step, generates
 * the training plan, writes all Firestore documents, and returns isComplete: true.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { callClaude } from './_lib/claude.js'
import { getDb } from './_lib/firestore.js'
import { generatePlan, writePlanToFirestore } from './_handlers/intake-plan.js'
import { initUserGraph } from './_handlers/intake-graph.js'
import { deriveVdot } from './_lib/vdot.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

// ── Intake questions ───────────────────────────────────────────────────────────
// The system prompt drives the conversation; Claude decides when each field is collected.

const INTAKE_SYSTEM_PROMPT = `You are Kadera, an expert AI running coach conducting an athlete intake interview.

Your goal is to collect the following information through natural conversation:
1. Athlete's preferred name
2. Body weight (kg)
3. Target race (name, distance in km, and goal finish time)
4. Target race date
5. Current weekly training volume (km/week)
6. Maximum heart rate (bpm) — ask if they know it; estimate from age if not
7. Most recent race result (distance and finish time) — for VDOT calculation
8. Active injuries (if any)
9. Behavioural patterns or traps (e.g. "goes out too fast", "skips easy days")

Guidelines:
- Ask one or two questions at a time — do not overwhelm.
- Be warm, encouraging, and professional.
- When you have ALL required information, respond with a JSON block in this EXACT format:
<intake_complete>
{
  "name": "string",
  "weightKg": number,
  "targetRace": "string",
  "targetDistanceKm": number,
  "targetFinishTimeSec": number,
  "targetDate": "YYYY-MM-DD",
  "currentWeeklyKm": number,
  "maxHR": number,
  "mostRecentRaceDistanceKm": number,
  "mostRecentRaceTimeSec": number,
  "activeInjuries": ["string"],
  "behaviouralTraps": ["string"],
  "location": "string",
  "timezone": "UTC"
}
</intake_complete>
- Before the JSON block, write a brief warm closing message.
- If the athlete's location is not mentioned, use "Unknown" for location.`

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  const body = req.body ?? {}
  const step: number = typeof body.step === 'number' ? body.step : 0
  const message: string = typeof body.message === 'string' ? body.message : ''
  const conversationHistory = Array.isArray(body.conversationHistory)
    ? (body.conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }>)
    : []

  try {
    // Build message list: history + current user message
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      ...(message ? [{ role: 'user' as const, content: message }] : []),
    ]

    // If no messages yet, send the opening prompt
    if (messages.length === 0) {
      const { text } = await callClaude({
        systemPrompt: INTAKE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: 'Hello! I want to start my running journey with Kadera.' }],
        maxTokens: 512,
        functionName: 'intake',
      })
      return send(res, 200, { isComplete: false, step: 0, message: text })
    }

    const { text } = await callClaude({
      systemPrompt: INTAKE_SYSTEM_PROMPT,
      messages,
      maxTokens: 1024,
      functionName: 'intake',
    })

    // Check if Claude has completed the intake (returned <intake_complete> block)
    const completeMatch = text.match(/<intake_complete>([\s\S]+?)<\/intake_complete>/)

    if (completeMatch) {
      // Parse the profile JSON
      let profileData: Record<string, unknown>
      try {
        profileData = JSON.parse(completeMatch[1].trim()) as Record<string, unknown>
      } catch {
        // JSON parse failed — continue conversation
        const cleanText = text.replace(/<intake_complete>[\s\S]*<\/intake_complete>/, '').trim()
        return send(res, 200, { isComplete: false, step: step + 1, message: cleanText || text })
      }

      // Derive VDOT from race result
      const vdot = deriveVdot(
        (profileData.mostRecentRaceDistanceKm as number) || 10,
        (profileData.mostRecentRaceTimeSec as number) || 3600,
      )

      const profile = { ...profileData, vdot, updatedAt: new Date().toISOString() }

      // Write all Firestore documents
      const db = getDb()
      const userRef = db.collection('users').doc(user.uid)

      // Write profile
      await userRef.collection('profile').doc('current').set(profile)

      // Generate and write training plan + sessions
      const { plan, sessions } = generatePlan(profile as Parameters<typeof generatePlan>[0])
      await writePlanToFirestore(db, user.uid, plan, sessions)

      // Initialise user knowledge graph
      await initUserGraph(db, user.uid, profile as Parameters<typeof initUserGraph>[2])

      // Mark onboarding complete
      await userRef.update({ onboardingStatus: 'complete', onboardingStep: step + 1 })

      // Return closing message (text before the JSON block)
      const closingText = text.replace(/<intake_complete>[\s\S]*<\/intake_complete>/, '').trim()

      return send(res, 200, {
        isComplete: true,
        profile,
        planSummary: {
          phases: 7,
          startDate: plan.startDate,
          currentWeeklyKm: profileData.currentWeeklyKm as number,
          vdot,
        },
        message: closingText,
      })
    }

    // Persist current step number
    await getDb()
      .collection('users')
      .doc(user.uid)
      .update({ onboardingStatus: 'in_progress', onboardingStep: step + 1 })

    return send(res, 200, { isComplete: false, step: step + 1, message: text })
  } catch (err) {
    const e = err as { statusCode?: number; message?: string; error?: string }
    const status = e.statusCode ?? 500
    return send(res, status, { error: e.error ?? e.message ?? 'Internal error' })
  }
}
