import { useState } from 'react'
import { useFoodStore } from '../stores/food-store.js'
import { tokens } from '../design-system/tokens.js'

export default function FoodLog() {
  const { entries, submitting, error, logFood, clearError } = useFoodStore()
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'text' | 'photo'>('text')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    const result = await logFood({ inputType: 'text', text: text.trim() })
    if (result) setText('')
  }

  // Compute today's totals
  const today = new Date().toISOString().slice(0, 10)
  const todayEntries = entries.filter((e) => e.loggedAt.startsWith(today))
  const totals = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.macros.calories ?? 0),
      proteinG: acc.proteinG + (e.macros.proteinG ?? 0),
      carbsG: acc.carbsG + (e.macros.carbsG ?? 0),
      fatG: acc.fatG + (e.macros.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )

  return (
    <div
      style={{
        padding: `${tokens.space[6]} ${tokens.space[4]}`,
        maxWidth: tokens.layout.contentMaxWidth,
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.bold,
          fontFamily: tokens.font.family.heading,
          marginBottom: tokens.space[6],
        }}
      >
        Food Log
      </h1>

      {/* Daily totals */}
      {todayEntries.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: tokens.space[2],
            marginBottom: tokens.space[5],
          }}
        >
          {[
            { label: 'kcal', value: Math.round(totals.calories) },
            { label: 'Protein', value: `${Math.round(totals.proteinG)}g` },
            { label: 'Carbs', value: `${Math.round(totals.carbsG)}g` },
            { label: 'Fat', value: `${Math.round(totals.fatG)}g` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: tokens.color.surface.raised,
                borderRadius: tokens.radius.md,
                padding: tokens.space[3],
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
                {stat.value}
              </div>
              <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log form */}
      <div
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.lg,
          padding: tokens.space[5],
          marginBottom: tokens.space[5],
        }}
      >
        <div style={{ display: 'flex', gap: tokens.space[2], marginBottom: tokens.space[4] }}>
          {(['text', 'photo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: tokens.space[2],
                background: mode === m ? tokens.color.brand.primary : tokens.color.surface.base,
                color: mode === m ? '#fff' : tokens.color.text.secondary,
                border: 'none',
                borderRadius: tokens.radius.md,
                cursor: 'pointer',
                fontFamily: tokens.font.family.body,
                fontSize: tokens.font.size.sm,
              }}
            >
              {m === 'text' ? 'Describe meal' : 'Photo'}
            </button>
          ))}
        </div>

        {error && (
          <div
            style={{
              padding: tokens.space[3],
              background: `${tokens.color.feedback.error}15`,
              borderRadius: tokens.radius.md,
              color: tokens.color.feedback.error,
              fontSize: tokens.font.size.sm,
              marginBottom: tokens.space[3],
            }}
            onClick={clearError}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
          {mode === 'text' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. 200g chicken breast, 150g rice, mixed salad"
              rows={3}
              style={{
                padding: `${tokens.space[2]} ${tokens.space[3]}`,
                background: tokens.color.surface.base,
                border: `1px solid ${tokens.color.text.disabled}40`,
                borderRadius: tokens.radius.md,
                color: tokens.color.text.primary,
                fontSize: tokens.font.size.md,
                fontFamily: tokens.font.family.body,
                resize: 'vertical',
              }}
            />
          ) : (
            <div
              style={{
                padding: tokens.space[6],
                background: tokens.color.surface.base,
                border: `1px dashed ${tokens.color.text.disabled}40`,
                borderRadius: tokens.radius.md,
                textAlign: 'center',
                color: tokens.color.text.secondary,
                fontSize: tokens.font.size.sm,
              }}
            >
              Photo upload coming soon — use text mode for now
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !text.trim() || mode === 'photo'}
            style={{
              padding: tokens.space[3],
              background: tokens.color.brand.primary,
              color: '#fff',
              border: 'none',
              borderRadius: tokens.radius.md,
              cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !text.trim() ? 0.6 : 1,
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.medium,
            }}
          >
            {submitting ? 'Estimating…' : 'Log Meal'}
          </button>
        </form>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: tokens.color.surface.raised,
                borderRadius: tokens.radius.md,
                padding: tokens.space[4],
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.space[2] }}>
                <div
                  style={{
                    fontSize: tokens.font.size.sm,
                    color: tokens.color.text.primary,
                    flex: 1,
                    marginRight: tokens.space[3],
                  }}
                >
                  {entry.rawInput}
                </div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, flexShrink: 0 }}>
                  {new Date(entry.loggedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: tokens.space[3] }}>
                {[
                  { label: 'kcal', value: Math.round(entry.macros.calories) },
                  { label: 'P', value: `${Math.round(entry.macros.proteinG)}g` },
                  { label: 'C', value: `${Math.round(entry.macros.carbsG)}g` },
                  { label: 'F', value: `${Math.round(entry.macros.fatG)}g` },
                ].map((m) => (
                  <span key={m.label} style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
                    {m.label}: {m.value}
                  </span>
                ))}
              </div>
              {entry.estimateNotes && (
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.disabled, marginTop: tokens.space[1] }}>
                  {entry.estimateNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: tokens.space[8],
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
          }}
        >
          No meals logged today. Fuel well!
        </div>
      )}
    </div>
  )
}
