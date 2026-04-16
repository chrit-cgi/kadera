import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/admin-store.js'
import { tokens } from '../../design-system/tokens.js'
import type { Invite } from '../../types/index.js'

const STATUS_COLORS: Record<Invite['status'], string> = {
  pending: tokens.color.feedback.warning,
  accepted: tokens.color.feedback.success,
  revoked: tokens.color.text.disabled,
  deleted: tokens.color.feedback.error,
}

export default function AdminInvites() {
  const { invites, isLoading, error, fetchInvites, addInvite, revokeInvite } = useAdminStore()
  const [emailInput, setEmailInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    void fetchInvites()
  }, [fetchInvites])

  async function handleAddInvite(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      await addInvite(emailInput.trim())
      setEmailInput('')
    } catch (err) {
      setAddError((err as Error).message)
    } finally {
      setAdding(false)
    }
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
        Invite Management
      </h1>

      {/* Add invite form */}
      <form
        onSubmit={(e) => void handleAddInvite(e)}
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.md,
          padding: tokens.space[4],
          marginBottom: tokens.space[6],
          display: 'flex',
          gap: tokens.space[3],
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <label
            htmlFor="invite-email"
            style={{
              display: 'block',
              fontSize: tokens.font.size.sm,
              color: tokens.color.text.secondary,
              marginBottom: tokens.space[1],
            }}
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="athlete@example.com"
            required
            style={{
              width: '100%',
              padding: `${tokens.space[2]} ${tokens.space[3]}`,
              background: tokens.color.surface.base,
              border: `1px solid ${tokens.color.text.disabled}40`,
              borderRadius: tokens.radius.md,
              color: tokens.color.text.primary,
              fontSize: tokens.font.size.md,
              fontFamily: tokens.font.family.body,
              minHeight: '44px',
            }}
          />
          {addError && (
            <div style={{ color: tokens.color.feedback.error, fontSize: tokens.font.size.sm, marginTop: tokens.space[1] }}>
              {addError}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={adding || !emailInput}
          style={{
            background: tokens.color.brand.primary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.radius.md,
            padding: `${tokens.space[2]} ${tokens.space[4]}`,
            cursor: adding ? 'not-allowed' : 'pointer',
            opacity: adding || !emailInput ? 0.6 : 1,
            fontFamily: tokens.font.family.body,
            fontSize: tokens.font.size.md,
            fontWeight: tokens.font.weight.medium,
            minHeight: '44px',
            alignSelf: 'flex-end',
          }}
        >
          {adding ? 'Adding…' : 'Add Invite'}
        </button>
      </form>

      {/* Invite list */}
      {isLoading && !invites.length ? (
        <div style={{ color: tokens.color.text.secondary }}>Loading…</div>
      ) : error ? (
        <div style={{ color: tokens.color.feedback.error }}>{error}</div>
      ) : !invites.length ? (
        <div
          style={{
            textAlign: 'center',
            padding: tokens.space[10],
            color: tokens.color.text.secondary,
          }}
        >
          No invites yet. Add one above to grant access.
        </div>
      ) : (
        <div style={{ background: tokens.color.surface.raised, borderRadius: tokens.radius.md, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 140px 1fr 80px',
              padding: `${tokens.space[2]} ${tokens.space[4]}`,
              fontSize: tokens.font.size.xs,
              color: tokens.color.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: `1px solid ${tokens.color.text.disabled}20`,
            }}
          >
            <span>Email</span>
            <span>Status</span>
            <span>Created</span>
            <span>Accepted</span>
            <span></span>
          </div>

          {invites.map((invite) => (
            <div
              key={invite.email}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 140px 1fr 80px',
                padding: `${tokens.space[3]} ${tokens.space[4]}`,
                alignItems: 'center',
                borderBottom: `1px solid ${tokens.color.text.disabled}10`,
                fontSize: tokens.font.size.sm,
              }}
            >
              <span style={{ fontFamily: tokens.font.family.mono, wordBreak: 'break-all' }}>
                {invite.email}
              </span>
              <span style={{ color: STATUS_COLORS[invite.status], textTransform: 'capitalize' }}>
                {invite.status}
              </span>
              <span style={{ color: tokens.color.text.secondary }}>
                {invite.createdAt?.slice(0, 10) ?? '—'}
              </span>
              <span style={{ color: tokens.color.text.secondary }}>
                {invite.acceptedAt?.slice(0, 10) ?? '—'}
              </span>
              {invite.status === 'pending' || invite.status === 'accepted' ? (
                <button
                  onClick={() => void revokeInvite(invite.email)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${tokens.color.feedback.error}60`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.color.feedback.error,
                    cursor: 'pointer',
                    padding: `${tokens.space[1]} ${tokens.space[2]}`,
                    fontSize: tokens.font.size.xs,
                    fontFamily: tokens.font.family.body,
                    minHeight: '32px',
                  }}
                >
                  Revoke
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
