/**
 * api/food.ts — AI-powered food logging
 *
 * POST /api/food
 *
 * Accepts text description or base64 photo and returns macro estimates.
 * Uses Claude to parse the meal and estimate calories/protein/carbs/fat.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { callClaude } from './_lib/claude.js'
import { getDb } from './_lib/firestore.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const FOOD_SYSTEM_PROMPT = `You are a sports nutrition expert. Estimate macronutrients for a meal based on the athlete's description. Respond ONLY with a JSON object in this exact format:
{
  "calories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "notes": "brief note about the estimate accuracy"
}
Use realistic portion sizes. If unsure, estimate conservatively.`

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
  const inputType = typeof body.inputType === 'string' ? body.inputType : ''

  if (inputType !== 'text' && inputType !== 'photo') {
    return send(res, 400, { error: 'inputType must be "text" or "photo"' })
  }

  const rawInput =
    inputType === 'text'
      ? typeof body.text === 'string'
        ? body.text.trim()
        : ''
      : typeof body.photoBase64 === 'string'
      ? '[Photo meal description — image not supported in text mode]'
      : ''

  if (!rawInput) return send(res, 400, { error: 'Input is required' })

  try {
    const { text } = await callClaude({
      systemPrompt: FOOD_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: inputType === 'text'
            ? `Estimate macros for: ${rawInput}`
            : `Estimate macros from this meal photo (base64): ${rawInput.slice(0, 100)}...`,
        },
      ],
      maxTokens: 256,
      functionName: 'food',
    })

    // Parse JSON from Claude response
    let macros: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]+\}/)
      macros = JSON.parse(jsonMatch?.[0] ?? '{}') as Record<string, unknown>
    } catch {
      return send(res, 500, { error: 'Failed to parse macro estimate' })
    }

    const db = getDb()
    const mealRef = db.collection('users').doc(user.uid).collection('meals').doc()
    const mealData = {
      loggedAt: new Date().toISOString(),
      inputType,
      rawInput: inputType === 'text' ? rawInput : '[photo]',
      macros: {
        calories: Number(macros.calories) || 0,
        proteinG: Number(macros.proteinG) || 0,
        carbsG: Number(macros.carbsG) || 0,
        fatG: Number(macros.fatG) || 0,
      },
      estimateNotes: typeof macros.notes === 'string' ? macros.notes : '',
    }
    await mealRef.set(mealData)

    return send(res, 200, {
      mealId: mealRef.id,
      macros: mealData.macros,
      estimateNotes: mealData.estimateNotes,
    })
  } catch (err) {
    const e = err as { statusCode?: number; message?: string }
    return send(res, e.statusCode ?? 500, { error: e.message ?? 'Internal error' })
  }
}
