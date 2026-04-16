import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '../stores/plan-store.js'
import { tokens } from '../design-system/tokens.js'
import type { Session, SessionType } from '../types/index.js'

const SESSION_TYPE_LABELS: Record<SessionType | 'race', string> = {
  easy: 'Easy',
  threshold: 'Threshold',
  vo2max: 'VO2max',
  long_run: 'Long Run',
  recovery: 'Recovery',
  cross_training: 'Cross',
  race: 'Race',
}

function sessionColor(type: SessionType | string): string {
  const map: Record<string, string> = {
    easy: tokens.color.session.easy,
    threshold: tokens.color.session.threshold,
    vo2max: tokens.color.session.vo2max,
    long_run: tokens.color.session.long_run,
    recovery: tokens.color.session.recovery,
    cross_training: tokens.color.session.cross_training,
    race: tokens.color.session.race,
  }
  return map[type] ?? tokens.color.brand.primary
}

function SessionRow({ session, onClick }: { session: Session; onClick: () => void }) {
  const paceMin = Math.floor(session.targetPaceMinPerKm / 60)
  const paceSec = session.targetPaceMinPerKm % 60

  const statusBadge: Record<string, { label: string; color: string }> = {
    planned: { label: 'Planned', color: tokens.color.text.secondary },
    completed: { label: 'Done', color: tokens.color.feedback.success },
    swapped: { label: 'Swapped', color: tokens.color.feedback.warning },
    skipped: { label: 'Skipped', color: tokens.color.feedback.error },
  }
  const badge = statusBadge[session.status] ?? statusBadge.planned

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space[3],
        padding: `${tokens.space[3]} ${tokens.space[4]}`,
        background: tokens.color.surface.raised,
        border: 'none',
        borderRadius: tokens.radius.md,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Type dot */}
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: tokens.radius.full,
          background: sessionColor(session.type),
          flexShrink: 0,
        }}
      />
      {/* Date + title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, marginBottom: '2px' }}>
          {new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </div>
        <div
          style={{
            fontSize: tokens.font.size.sm,
            fontWeight: tokens.font.weight.medium,
            color: tokens.color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.title}
        </div>
      </div>
      {/* Pace */}
      <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, flexShrink: 0 }}>
        {paceMin}:{String(paceSec).padStart(2, '0')}
      </div>
      {/* Status */}
      <div
        style={{
          fontSize: tokens.font.size.xs,
          color: badge.color,
          flexShrink: 0,
          minWidth: '50px',
          textAlign: 'right',
        }}
      >
        {badge.label}
      </div>
    </button>
  )
}

export default function TrainingPlan() {
  const { plan, sessions, isLoading, error, fetchPlan } = usePlanStore()
  const navigate = useNavigate()

  useEffect(() => {
    void fetchPlan()
  }, [fetchPlan])

  const today = new Date().toISOString().slice(0, 10)

  // Group sessions by phase and week
  const upcomingSessions = sessions
    .filter((s) => s.scheduledDate >= today)
    .slice(0, 28) // Next 4 weeks

  const pastSessions = sessions
    .filter((s) => s.scheduledDate < today)
    .slice(-14)
    .reverse()

  const currentPhase = plan?.phases.find((p) => p.phaseNumber === plan.currentPhase)

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
          color: tokens.color.text.primary,
          fontFamily: tokens.font.family.heading,
          marginBottom: tokens.space[2],
        }}
      >
        Training Plan
      </h1>

      {isLoading && (
        <div style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm }}>Loading…</div>
      )}

      {error && (
        <div
          style={{
            padding: tokens.space[3],
            background: `${tokens.color.feedback.error}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.feedback.error,
            fontSize: tokens.font.size.sm,
            marginBottom: tokens.space[4],
          }}
        >
          {error}
        </div>
      )}

      {plan && (
        <>
          {/* Phase summary */}
          {currentPhase && (
            <div
              style={{
                background: tokens.color.surface.raised,
                borderRadius: tokens.radius.lg,
                padding: tokens.space[4],
                marginBottom: tokens.space[5],
              }}
            >
              <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
                Phase {currentPhase.phaseNumber} of {plan.phases.length} · Week {plan.currentWeek}
              </div>
              <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
                {currentPhase.name}
              </div>
              <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
                {currentPhase.focus}
              </div>
            </div>
          )}

          {/* Type legend */}
          <div style={{ display: 'flex', gap: tokens.space[3], flexWrap: 'wrap', marginBottom: tokens.space[4] }}>
            {(Object.entries(SESSION_TYPE_LABELS) as [string, string][]).map(([type, label]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: tokens.space[1] }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: tokens.radius.full,
                    background: sessionColor(type),
                  }}
                />
                <span style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming sessions */}
          {upcomingSessions.length > 0 && (
            <section style={{ marginBottom: tokens.space[6] }}>
              <h2
                style={{
                  fontSize: tokens.font.size.md,
                  fontWeight: tokens.font.weight.bold,
                  marginBottom: tokens.space[3],
                  color: tokens.color.text.primary,
                }}
              >
                Upcoming
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[2] }}>
                {upcomingSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onClick={() => navigate(`/session/${s.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past sessions */}
          {pastSessions.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: tokens.font.size.md,
                  fontWeight: tokens.font.weight.bold,
                  marginBottom: tokens.space[3],
                  color: tokens.color.text.secondary,
                }}
              >
                Recent
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[2] }}>
                {pastSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onClick={() => navigate(`/session/${s.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
