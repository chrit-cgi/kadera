import { useEffect } from 'react'
import { useAdminStore } from '../../stores/admin-store.js'
import { tokens } from '../../design-system/tokens.js'
import { TIER_CAPS } from '../../types/index.js'
import type { User } from '../../types/index.js'

const TIER_COLORS: Record<User['tier'], string> = {
  free: tokens.color.text.secondary,
  starter: tokens.color.brand.primary,
  elite: tokens.color.brand.secondary,
}

const ONBOARDING_LABELS: Record<User['onboardingStatus'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
}

export default function AdminUsers() {
  const { users, isLoading, error, fetchUsers, changeUserTier } = useAdminStore()

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  if (isLoading && !users.length) {
    return (
      <div style={{ padding: tokens.space[6], color: tokens.color.text.secondary }}>Loading users…</div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: tokens.space[6], color: tokens.color.feedback.error }}>Error: {error}</div>
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
        Users ({users.length})
      </h1>

      {!users.length ? (
        <div
          style={{
            textAlign: 'center',
            padding: tokens.space[10],
            color: tokens.color.text.secondary,
          }}
        >
          No users yet. Add an invite to get started.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              background: tokens.color.surface.raised,
              borderRadius: tokens.radius.md,
              overflow: 'hidden',
              minWidth: '600px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 90px 120px 110px 120px 100px',
                padding: `${tokens.space[2]} ${tokens.space[4]}`,
                fontSize: tokens.font.size.xs,
                color: tokens.color.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: `1px solid ${tokens.color.text.disabled}20`,
              }}
            >
              <span>Email</span>
              <span>Tier</span>
              <span>Messages</span>
              <span>Last login</span>
              <span>Onboarding</span>
              <span>Change tier</span>
            </div>

            {users.map((user) => (
              <div
                key={user.uid}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 90px 120px 110px 120px 100px',
                  padding: `${tokens.space[3]} ${tokens.space[4]}`,
                  alignItems: 'center',
                  borderBottom: `1px solid ${tokens.color.text.disabled}10`,
                  fontSize: tokens.font.size.sm,
                }}
              >
                <span style={{ wordBreak: 'break-all', color: tokens.color.text.primary }}>
                  {user.email}
                </span>

                {/* Tier badge */}
                <span
                  style={{
                    color: TIER_COLORS[user.tier],
                    fontWeight: tokens.font.weight.medium,
                    textTransform: 'capitalize',
                    fontFamily: tokens.font.family.mono,
                    fontSize: tokens.font.size.xs,
                  }}
                >
                  {user.tier}
                </span>

                {/* Messages / cap */}
                <span style={{ color: tokens.color.text.secondary, fontFamily: tokens.font.family.mono }}>
                  {user.dailyMessageCount} / {TIER_CAPS[user.tier]}
                </span>

                {/* Last login */}
                <span style={{ color: tokens.color.text.secondary }}>
                  {user.lastLoginAt?.slice(0, 10) ?? '—'}
                </span>

                {/* Onboarding */}
                <span style={{ color: tokens.color.text.secondary }}>
                  {ONBOARDING_LABELS[user.onboardingStatus]}
                </span>

                {/* Tier selector */}
                <select
                  value={user.tier}
                  onChange={(e) => void changeUserTier(user.uid, e.target.value as User['tier'])}
                  aria-label={`Change tier for ${user.email}`}
                  style={{
                    background: tokens.color.surface.base,
                    border: `1px solid ${tokens.color.text.disabled}40`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.color.text.primary,
                    padding: `${tokens.space[1]} ${tokens.space[2]}`,
                    fontSize: tokens.font.size.xs,
                    fontFamily: tokens.font.family.body,
                    cursor: 'pointer',
                    minHeight: '32px',
                    width: '100%',
                  }}
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="elite">Elite</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
