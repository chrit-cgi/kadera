import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlanStore } from '../stores/plan-store.js'
import { patchSession } from '../lib/api.js'
import { tokens } from '../design-system/tokens.js'
import type { SessionType } from '../types/index.js'

const SESSION_TYPE_COLORS: Record<string, string> = {
  easy: tokens.color.session.easy,
  threshold: tokens.color.session.threshold,
  vo2max: tokens.color.session.vo2max,
  long_run: tokens.color.session.long_run,
  recovery: tokens.color.session.recovery,
  cross_training: tokens.color.session.cross_training,
  race: tokens.color.session.race,
}

const ZONE_COLORS: Record<number, string> = {
  1: tokens.color.hrZone.z1,
  2: tokens.color.hrZone.z2,
  3: tokens.color.hrZone.z3,
  4: tokens.color.hrZone.z4,
  5: tokens.color.hrZone.z5,
}

const FEEL_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Hard',
  3: 'OK',
  4: 'Good',
  5: 'Great',
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { sessions, updateSession } = usePlanStore()
  const [feelScore, setFeelScore] = useState<number>(3)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const session = sessions.find((s) => s.id === sessionId)

  if (!session) {
    return (
      <div style={{ padding: tokens.space[6], color: tokens.color.text.secondary }}>
        Session not found.
      </div>
    )
  }

  const paceMin = Math.floor(session.targetPaceMinPerKm / 60)
  const paceSec = session.targetPaceMinPerKm % 60
  const typeColor = SESSION_TYPE_COLORS[session.type] ?? tokens.color.brand.primary
  const zoneColor = ZONE_COLORS[session.targetHRZone] ?? tokens.color.brand.secondary

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const { session: updated } = await patchSession(session!.id, {
        action: 'complete',
        feelScore,
        notes: notes.trim() || null,
      })
      updateSession(session!.id, updated as Partial<import('../types/index.js').Session>)
      navigate(-1)
    } catch {
      setSubmitting(false)
    }
  }

  async function handleSwap(type: string) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { session: updated } = await patchSession(session!.id, {
        action: 'swap',
        crossTrainingType: type,
      })
      updateSession(session!.id, updated as Partial<import('../types/index.js').Session>)
      navigate(-1)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        padding: `${tokens.space[6]} ${tokens.space[4]}`,
        maxWidth: tokens.layout.contentMaxWidth,
        margin: '0 auto',
      }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'transparent',
          border: 'none',
          color: tokens.color.brand.primary,
          fontSize: tokens.font.size.sm,
          cursor: 'pointer',
          padding: 0,
          marginBottom: tokens.space[4],
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space[1],
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div
        style={{
          borderLeft: `4px solid ${typeColor}`,
          paddingLeft: tokens.space[4],
          marginBottom: tokens.space[6],
        }}
      >
        <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
          {new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
        <h1
          style={{
            fontSize: tokens.font.size['2xl'],
            fontWeight: tokens.font.weight.bold,
            color: tokens.color.text.primary,
            fontFamily: tokens.font.family.heading,
            margin: `0 0 ${tokens.space[2]}`,
          }}
        >
          {session.title}
        </h1>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.space[3],
          marginBottom: tokens.space[6],
        }}
      >
        {[
          { label: 'Distance', value: `${session.plannedDistanceKm} km` },
          { label: 'Duration', value: `${session.plannedDurationMin} min` },
          { label: 'Target pace', value: `${paceMin}:${String(paceSec).padStart(2, '0')} /km` },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: tokens.color.surface.raised,
              borderRadius: tokens.radius.md,
              padding: tokens.space[3],
            }}
          >
            <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
              {stat.label}
            </div>
            <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* HR Zone */}
      <div
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.md,
          padding: tokens.space[4],
          marginBottom: tokens.space[6],
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space[3],
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: tokens.radius.full,
            background: zoneColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: tokens.font.weight.bold,
            fontSize: tokens.font.size.lg,
          }}
        >
          {session.targetHRZone}
        </div>
        <div>
          <div style={{ fontWeight: tokens.font.weight.medium }}>Heart Rate Zone {session.targetHRZone}</div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
            Target training zone for this session
          </div>
        </div>
      </div>

      {/* Actions */}
      {session.status === 'planned' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
          <button
            onClick={() => setShowComplete(true)}
            style={{
              width: '100%',
              padding: tokens.space[4],
              background: tokens.color.brand.primary,
              color: '#fff',
              border: 'none',
              borderRadius: tokens.radius.md,
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.medium,
              cursor: 'pointer',
              fontFamily: tokens.font.family.body,
            }}
          >
            Mark as Complete
          </button>

          <button
            onClick={() => void handleSwap('cross_training')}
            disabled={submitting}
            style={{
              width: '100%',
              padding: tokens.space[3],
              background: 'transparent',
              color: tokens.color.brand.primary,
              border: `1px solid ${tokens.color.brand.primary}`,
              borderRadius: tokens.radius.md,
              fontSize: tokens.font.size.md,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              fontFamily: tokens.font.family.body,
            }}
          >
            Swap to Cross Training
          </button>
        </div>
      )}

      {session.status === 'completed' && (
        <div
          style={{
            padding: tokens.space[4],
            background: `${tokens.color.feedback.success}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.feedback.success,
            textAlign: 'center',
          }}
        >
          ✓ Completed
          {session.feelScore !== null && ` · Feel: ${FEEL_LABELS[session.feelScore] ?? session.feelScore}/5`}
        </div>
      )}

      {/* Complete form modal */}
      {showComplete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: tokens.color.surface.overlay,
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 100,
          }}
          onClick={() => setShowComplete(false)}
        >
          <form
            onSubmit={(e) => void handleComplete(e)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: tokens.color.surface.raised,
              borderRadius: `${tokens.radius.lg} ${tokens.radius.lg} 0 0`,
              padding: tokens.space[6],
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.space[4],
            }}
          >
            <h2 style={{ margin: 0, fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold }}>
              How did it go?
            </h2>

            {/* Feel score */}
            <div>
              <label style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, display: 'block', marginBottom: tokens.space[2] }}>
                How did you feel? ({FEEL_LABELS[feelScore]})
              </label>
              <div style={{ display: 'flex', gap: tokens.space[2] }}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setFeelScore(score)}
                    style={{
                      flex: 1,
                      padding: tokens.space[2],
                      background: feelScore === score ? tokens.color.brand.primary : tokens.color.surface.base,
                      color: feelScore === score ? '#fff' : tokens.color.text.secondary,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      cursor: 'pointer',
                      fontFamily: tokens.font.family.body,
                      fontSize: tokens.font.size.sm,
                    }}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, display: 'block', marginBottom: tokens.space[2] }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did the session feel? Any observations?"
                rows={3}
                style={{
                  width: '100%',
                  padding: `${tokens.space[2]} ${tokens.space[3]}`,
                  background: tokens.color.surface.base,
                  border: `1px solid ${tokens.color.text.disabled}40`,
                  borderRadius: tokens.radius.md,
                  color: tokens.color.text.primary,
                  fontSize: tokens.font.size.md,
                  fontFamily: tokens.font.family.body,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: tokens.space[4],
                background: tokens.color.brand.primary,
                color: '#fff',
                border: 'none',
                borderRadius: tokens.radius.md,
                fontSize: tokens.font.size.md,
                fontWeight: tokens.font.weight.medium,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: tokens.font.family.body,
              }}
            >
              {submitting ? 'Saving…' : 'Save Review'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
