import Anthropic from '@anthropic-ai/sdk'
import { getDb } from './firestore.js'
import { FieldValue } from 'firebase-admin/firestore'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cost per million tokens (claude-sonnet-4 pricing; update if model changes)
const COST_PER_M_INPUT = 3.0   // USD per 1M input tokens
const COST_PER_M_OUTPUT = 15.0 // USD per 1M output tokens

export interface ClaudeParams {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  model?: string
  maxTokens?: number
  functionName?: string // for cost tracking byFunction
}

export interface ClaudeResult {
  text: string
  usage: { inputTokens: number; outputTokens: number }
  costUSD: number
}

export async function callClaude(params: ClaudeParams): Promise<ClaudeResult> {
  const db = getDb()
  const model = params.model ?? 'claude-sonnet-4-6'
  const maxTokens = params.maxTokens ?? 2048
  const fnName = params.functionName ?? 'unknown'

  // ── 1. Kill switch check ────────────────────────────────────────────────────
  const configDoc = await db.collection('globalConfig').doc('settings').get()
  const config = configDoc.data()

  if (config?.killSwitch?.enabled === true) {
    throw Object.assign(new Error('AI temporarily unavailable'), { statusCode: 503, error: 'ai_unavailable' })
  }

  // ── 2. Pre-call spend cap check ─────────────────────────────────────────────
  const currentDailyUSD: number = config?.spendCaps?.currentDailyUSD ?? 0
  const dailyCapUSD: number = config?.spendCaps?.dailyUSD ?? 50

  // Estimate cost conservatively (assumes ~1500 input + maxTokens output)
  const estimatedInputTokens = 1500
  const estimatedCost =
    (estimatedInputTokens / 1_000_000) * COST_PER_M_INPUT +
    (maxTokens / 1_000_000) * COST_PER_M_OUTPUT

  if (currentDailyUSD + estimatedCost > dailyCapUSD) {
    throw Object.assign(new Error('Daily spend cap exceeded'), { statusCode: 402, error: 'cap_exceeded' })
  }

  // ── 3. Call Anthropic API ───────────────────────────────────────────────────
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: params.systemPrompt,
        // Enable prompt caching on the system prompt (reduces cost on repeat calls)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: 'ephemeral' },
      } as unknown as Anthropic.TextBlockParam,
    ],
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
  })

  const text =
    response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('') ?? ''

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const costUSD =
    (inputTokens / 1_000_000) * COST_PER_M_INPUT +
    (outputTokens / 1_000_000) * COST_PER_M_OUTPUT

  // ── 4. Post-call cost tracking ──────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10)
  const costRef = db.collection('costs').doc(dateStr)
  const settingsRef = db.collection('globalConfig').doc('settings')

  const batch = db.batch()

  batch.set(
    costRef,
    {
      date: dateStr,
      totalCostUSD: FieldValue.increment(costUSD),
      callCount: FieldValue.increment(1),
      inputTokens: FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
      [`byFunction.${fnName}.cost`]: FieldValue.increment(costUSD),
      [`byFunction.${fnName}.calls`]: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

  batch.update(settingsRef, {
    'spendCaps.currentDailyUSD': FieldValue.increment(costUSD),
  })

  await batch.commit()

  return { text, usage: { inputTokens, outputTokens }, costUSD }
}
