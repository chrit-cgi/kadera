import { useEffect } from 'react'
import { useBriefStore } from '../stores/brief-store.js'
import { usePlanStore } from '../stores/plan-store.js'
import { tokens } from '../design-system/tokens.js'
import type { MorningBrief as MorningBriefType } from '../types/index.js'

type BriefSession = NonNullable<MorningBriefType['session']>

function SessionCard({ session }: { session: BriefSession }) {
  const typeColors: Record<string, string> = {
    easy: tokens.color.session.easy,
    threshold: tokens.color.session.threshold,
    vo2max: tokens.color.session.vo2max,
    long_run: tokens.color.session.long_run,
    recovery: tokens.color.session.recovery,
    cross_training: tokens.color.session.cross_training,
    race: tokens.color.session.race,
  }

  const paceMin = Math.floor(session.targetPaceMinPerKm / 60)
  const paceSec = session.targetPaceMinPerKm % 60

  const zoneColors: Record<number, string> = {
    1: tokens.color.hrZone.z1,
    2: tokens.color.hrZone.z2,
    3: tokens.color.hrZone.z3,
    4: tokens.color.hrZone.z4,
    5: tokens.color.hrZone.z5,
  }

  return (
    <div
      style={{
        background: tokens.color.surface.raised,
        borderRadius: tokens.radius.lg,
        padding: tokens.space[5],
        borderLeft: `4px solid ${typeColors[session.type] ?? tokens.color.brand.primary}`,
      }}
    >
      <div
        style={{
          fontSize: tokens.font.size.xs,
          color: tokens.color.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: tokens.space[1],
        }}
      >
        Today's Session
      </div>
      <div
        style={{
          fontSize: tokens.font.size.xl,
          fontWeight: tokens.font.weight.bold,
          color: tokens.color.text.primary,
          marginBottom: tokens.space[3],
        }}
      >
        {session.title}
      </div>
      <div
        style={{
          display: 'flex',
          gap: tokens.space[4],
          flexWrap: 'wrap',
          marginBottom: tokens.space[3],
        }}
      >
        <div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>Distance</div>
          <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
            {session.plannedDistanceKm} km
          </div>
        </div>
        <div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>Target pace</div>
          <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
            {paceMin}:{String(paceSec).padStart(2, '0')} /km
          </div>
        </div>
      </div>
      <span
        style={{
          display: 'inline-block',
          padding: `${tokens.space[1]} ${tokens.space[2]}`,
          borderRadius: tokens.radius.sm,
          background: zoneColors[session.targetHRZone] ?? tokens.color.surface.raised,
          color: '#fff',
          fontSize: tokens.font.size.xs,
          fontWeight: tokens.font.weight.medium,
        }}
      >
        HR Zone {session.targetHRZone}
      </span>
    </div>
  )
}

export default function MorningBrief() {
  const { brief, isLoading, error, fetchBrief } = useBriefStore()
  const { sessions } = usePlanStore()

  useEffect(() => {
    void fetchBrief()
  }, [fetchBrief])

  const today = new Date().toISOString().slice(0, 10)
  const todayCompleted = sessions.filter(
    (s) => s.scheduledDate === today && s.status === 'completed',
  ).length

  return (
    <div
      style={{
        padding: `${tokens.space[6]} ${tokens.space[4]}`,
        maxWidth: tokens.layout.contentMaxWidth,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: tokens.space[6] }}>
        <div
          style={{
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.secondary,
            marginBottom: tokens.space[1],
          }}
        >
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1
          style={{
            fontSize: tokens.font.size['3xl'],
            fontWeight: tokens.font.weight.bold,
            color: tokens.color.text.primary,
            fontFamily: tokens.font.family.heading,
            margin: 0,
          }}
        >
          Good morning
        </h1>
      </div>

      {isLoading && (
        <div
          style={{
            padding: tokens.space[6],
            textAlign: 'center',
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
          }}
        >
          Loading your brief…
        </div>
      )}

      {error && (
        <div
          style={{
            padding: tokens.space[4],
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

      {brief && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[4] }}>
          {/* Pep talk */}
          <div
            style={{
              background: tokens.color.surface.raised,
              borderRadius: tokens.radius.lg,
              padding: tokens.space[5],
            }}
          >
            <p
              style={{
                fontSize: tokens.font.size.md,
                lineHeight: tokens.line.height.relaxed,
                color: tokens.color.text.primary,
                margin: 0,
              }}
            >
              {brief.content}
            </p>
          </div>

          {/* Weather */}
          {brief.weatherContext && (
            <div
              style={{
                background: tokens.color.surface.raised,
                borderRadius: tokens.radius.lg,
                padding: tokens.space[4],
                display: 'flex',
                gap: tokens.space[4],
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: tokens.font.size['2xl'] }}>
                {brief.weatherContext.condition.toLowerCase().includes('rain')
                  ? '🌧'
                  : brief.weatherContext.condition.toLowerCase().includes('cloud')
                  ? '☁️'
                  : brief.weatherContext.condition.toLowerCase().includes('clear')
                  ? '☀️'
                  : '🌤'}
              </div>
              <div>
                <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
                  {brief.weatherContext.tempC}°C · {brief.weatherContext.condition}
                </div>
                <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
                  Wind {brief.weatherContext.windKmh} km/h · {brief.weatherContext.humidity}% humidity · {brief.weatherContext.location}
                </div>
              </div>
            </div>
          )}

          {/* Today's session */}
          {brief.session ? (
            <SessionCard session={brief.session} />
          ) : (
            <div
              style={{
                background: tokens.color.surface.raised,
                borderRadius: tokens.radius.lg,
                padding: tokens.space[5],
                textAlign: 'center',
                color: tokens.color.text.secondary,
              }}
            >
              Rest day — recovery is training too.
            </div>
          )}

          {/* Completed today badge */}
          {todayCompleted > 0 && (
            <div
              style={{
                padding: tokens.space[3],
                background: `${tokens.color.feedback.success}15`,
                borderRadius: tokens.radius.md,
                color: tokens.color.feedback.success,
                fontSize: tokens.font.size.sm,
                textAlign: 'center',
              }}
            >
              ✓ Session completed today — great work!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
