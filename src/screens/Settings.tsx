import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfilePrefsStore } from '../stores/profile-prefs-store.js'
import { useAuthStore } from '../stores/auth-store.js'
import { deleteAccount, getExport } from '../lib/api.js'
import { tokens } from '../design-system/tokens.js'
import type { CoachStyle } from '../types/index.js'

const COACH_STYLES: { value: CoachStyle; label: string; description: string }[] = [
  { value: 'motivator', label: 'Motivator', description: 'High energy, positive reinforcement' },
  { value: 'analytical', label: 'Analytical', description: 'Data-driven, detailed explanations' },
  { value: 'gentle', label: 'Gentle', description: 'Supportive, low pressure' },
  { value: 'challenger', label: 'Challenger', description: 'Pushes your limits, direct feedback' },
]

export default function Settings() {
  const { coachStyle, isLoading, fetchPrefs, updateCoachStyle } = useProfilePrefsStore()
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteSheet, setShowDeleteSheet] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPrefs()
  }, [fetchPrefs])

  async function handleStyleChange(style: CoachStyle) {
    await updateCoachStyle(style)
  }

  async function handleExport() {
    setExporting(true)
    try {
      await getExport()
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      await signOut()
      navigate('/welcome', { replace: true })
    } catch (err) {
      setDeleteError((err as Error).message)
      setDeleting(false)
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
      <h1
        style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.bold,
          fontFamily: tokens.font.family.heading,
          marginBottom: tokens.space[6],
        }}
      >
        Settings
      </h1>

      {/* Account info */}
      {user && (
        <div
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.lg,
            padding: tokens.space[5],
            marginBottom: tokens.space[5],
          }}
        >
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
            Signed in as
          </div>
          <div style={{ fontWeight: tokens.font.weight.medium }}>{user.displayName}</div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>{user.email}</div>
          <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, marginTop: tokens.space[1] }}>
            Plan: {user.tier}
          </div>
        </div>
      )}

      {/* Coach style */}
      <div
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.lg,
          padding: tokens.space[5],
          marginBottom: tokens.space[5],
        }}
      >
        <h2
          style={{
            fontSize: tokens.font.size.lg,
            fontWeight: tokens.font.weight.bold,
            marginBottom: tokens.space[1],
          }}
        >
          Coach Style
        </h2>
        <p style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginBottom: tokens.space[4] }}>
          How would you like Kadera to communicate with you?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[2] }}>
          {COACH_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => void handleStyleChange(style.value)}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space[3],
                padding: tokens.space[3],
                background: coachStyle === style.value ? `${tokens.color.brand.primary}15` : tokens.color.surface.base,
                border: `1px solid ${coachStyle === style.value ? tokens.color.brand.primary : tokens.color.text.disabled + '30'}`,
                borderRadius: tokens.radius.md,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: tokens.radius.full,
                  border: `2px solid ${coachStyle === style.value ? tokens.color.brand.primary : tokens.color.text.disabled}`,
                  background: coachStyle === style.value ? tokens.color.brand.primary : 'transparent',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium }}>
                  {style.label}
                </div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
                  {style.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data & Privacy */}
      <div
        style={{
          background: tokens.color.surface.raised,
          borderRadius: tokens.radius.lg,
          padding: tokens.space[5],
          marginBottom: tokens.space[5],
        }}
      >
        <h2
          style={{
            fontSize: tokens.font.size.lg,
            fontWeight: tokens.font.weight.bold,
            marginBottom: tokens.space[4],
          }}
        >
          Data & Privacy
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            style={{
              padding: `${tokens.space[3]} ${tokens.space[4]}`,
              background: 'transparent',
              border: `1px solid ${tokens.color.text.disabled}40`,
              borderRadius: tokens.radius.md,
              color: tokens.color.text.primary,
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.sm,
              textAlign: 'left',
            }}
          >
            {exporting ? 'Preparing export…' : '↓ Export my data (JSON)'}
          </button>

          <button
            onClick={() => void signOut()}
            style={{
              padding: `${tokens.space[3]} ${tokens.space[4]}`,
              background: 'transparent',
              border: `1px solid ${tokens.color.text.disabled}40`,
              borderRadius: tokens.radius.md,
              color: tokens.color.text.primary,
              cursor: 'pointer',
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.sm,
              textAlign: 'left',
            }}
          >
            Sign out
          </button>

          <button
            onClick={() => setShowDeleteSheet(true)}
            style={{
              padding: `${tokens.space[3]} ${tokens.space[4]}`,
              background: 'transparent',
              border: `1px solid ${tokens.color.feedback.error}40`,
              borderRadius: tokens.radius.md,
              color: tokens.color.feedback.error,
              cursor: 'pointer',
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.sm,
              textAlign: 'left',
            }}
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete account bottom sheet */}
      {showDeleteSheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: tokens.color.surface.overlay,
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 100,
          }}
          onClick={() => setShowDeleteSheet(false)}
        >
          <div
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
            <h2 style={{ margin: 0, fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color: tokens.color.feedback.error }}>
              Delete Account
            </h2>
            <p style={{ margin: 0, fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
              This permanently deletes all your data including your training plan, sessions, and profile. This action cannot be undone.
            </p>
            <div>
              <label style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, display: 'block', marginBottom: tokens.space[2] }}>
                Type <strong>DELETE MY ACCOUNT</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                style={{
                  width: '100%',
                  padding: `${tokens.space[2]} ${tokens.space[3]}`,
                  background: tokens.color.surface.base,
                  border: `1px solid ${tokens.color.feedback.error}40`,
                  borderRadius: tokens.radius.md,
                  color: tokens.color.text.primary,
                  fontSize: tokens.font.size.md,
                  fontFamily: tokens.font.family.body,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {deleteError && (
              <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.feedback.error }}>
                {deleteError}
              </div>
            )}
            <button
              onClick={() => void handleDelete()}
              disabled={deleteConfirm !== 'DELETE MY ACCOUNT' || deleting}
              style={{
                padding: tokens.space[4],
                background: deleteConfirm === 'DELETE MY ACCOUNT' ? tokens.color.feedback.error : tokens.color.surface.base,
                color: '#fff',
                border: 'none',
                borderRadius: tokens.radius.md,
                cursor: deleteConfirm === 'DELETE MY ACCOUNT' && !deleting ? 'pointer' : 'not-allowed',
                opacity: deleteConfirm !== 'DELETE MY ACCOUNT' || deleting ? 0.5 : 1,
                fontFamily: tokens.font.family.body,
                fontSize: tokens.font.size.md,
                fontWeight: tokens.font.weight.medium,
              }}
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
