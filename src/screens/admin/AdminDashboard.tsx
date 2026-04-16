import { useEffect } from 'react'
import { useAdminStore } from '../../stores/admin-store.js'
import { tokens } from '../../design-system/tokens.js'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: tokens.color.surface.raised,
        borderRadius: tokens.radius.md,
        padding: tokens.space[4],
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.space[1],
      }}
    >
      <span style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm }}>
        {label}
      </span>
      <span
        style={{
          color: tokens.color.text.primary,
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.bold,
          fontFamily: tokens.font.family.mono,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default function AdminDashboard() {
  const { stats, isLoading, error, fetchDashboard, toggleKillSwitch } = useAdminStore()

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  if (isLoading && !stats) {
    return (
      <div style={{ padding: tokens.space[6], color: tokens.color.text.secondary }}>
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: tokens.space[6], color: tokens.color.feedback.error }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div style={{ padding: tokens.space[4], maxWidth: tokens.layout.contentMaxWidth, margin: '0 auto' }}>
      <h1
        style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.bold,
          marginBottom: tokens.space[6],
          fontFamily: tokens.font.family.heading,
        }}
      >
        Admin Dashboard
      </h1>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: tokens.space[3],
          marginBottom: tokens.space[6],
        }}
      >
        <StatCard label="Total users" value={stats?.userCount ?? '—'} />
        <StatCard label="Active today" value={stats?.activeToday ?? '—'} />
        <StatCard label="Daily AI cost" value={stats ? `$${stats.dailyCostUSD.toFixed(2)}` : '—'} />
        <StatCard label="Monthly AI cost" value={stats ? `$${stats.monthlyCostUSD.toFixed(2)}` : '—'} />
        <StatCard
          label="Daily spend cap"
          value={stats ? `$${stats.spendCaps.dailyUSD}` : '—'}
        />
      </div>

      {/* Kill switch */}
      <div
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.md,
          padding: tokens.space[4],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.space[6],
        }}
      >
        <div>
          <div style={{ fontWeight: tokens.font.weight.medium }}>AI Kill Switch</div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
            Disables all AI calls globally within 60s
          </div>
        </div>
        <button
          onClick={() => void toggleKillSwitch(!stats?.killSwitchEnabled)}
          style={{
            background: stats?.killSwitchEnabled ? tokens.color.feedback.error : tokens.color.brand.primary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.radius.md,
            padding: `${tokens.space[2]} ${tokens.space[4]}`,
            cursor: 'pointer',
            fontFamily: tokens.font.family.body,
            fontSize: tokens.font.size.sm,
            fontWeight: tokens.font.weight.medium,
            minHeight: '44px',
          }}
        >
          {stats?.killSwitchEnabled ? 'Disable Kill Switch' : 'Enable Kill Switch'}
        </button>
      </div>

      {/* Recent audit events */}
      <h2
        style={{
          fontSize: tokens.font.size.lg,
          fontWeight: tokens.font.weight.medium,
          marginBottom: tokens.space[3],
        }}
      >
        Recent Audit Events
      </h2>

      {!stats?.recentAuditEvents.length ? (
        <div style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm }}>
          No audit events yet.
        </div>
      ) : (
        <div
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
          }}
        >
          {(stats.recentAuditEvents as Array<Record<string, unknown>>).map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: `${tokens.space[3]} ${tokens.space[4]}`,
                borderBottom: i < stats.recentAuditEvents.length - 1
                  ? `1px solid ${tokens.color.text.disabled}20`
                  : 'none',
                fontSize: tokens.font.size.sm,
              }}
            >
              <span style={{ color: tokens.color.text.primary, fontFamily: tokens.font.family.mono }}>
                {String(event.eventType ?? '—')}
              </span>
              <span style={{ color: tokens.color.text.secondary }}>
                {String(event.timestamp ?? '').slice(0, 16).replace('T', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
