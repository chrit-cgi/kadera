import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/admin-store.js'
import { tokens } from '../../design-system/tokens.js'

export default function AdminSettings() {
  const { stats, settings, fetchDashboard, toggleKillSwitch, updateSpendCaps } = useAdminStore()

  const [dailyCap, setDailyCap] = useState('')
  const [monthlyCap, setMonthlyCap] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (stats) {
      setDailyCap(String(stats.spendCaps.dailyUSD))
      setMonthlyCap(String(stats.spendCaps.monthlyUSD))
    }
  }, [stats])

  const killSwitchEnabled = stats?.killSwitchEnabled ?? false

  async function handleToggle() {
    setToggling(true)
    try {
      await toggleKillSwitch(!killSwitchEnabled)
    } finally {
      setToggling(false)
    }
  }

  async function handleSaveCaps(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateSpendCaps({ dailyUSD: Number(dailyCap), monthlyUSD: Number(monthlyCap) })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
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
        Platform Settings
      </h1>

      {/* Kill switch */}
      <section style={{ marginBottom: tokens.space[8] }}>
        <h2 style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.medium, marginBottom: tokens.space[3] }}>
          AI Kill Switch
        </h2>
        <div
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.md,
            padding: tokens.space[4],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.space[4],
          }}
        >
          <div>
            <div style={{ fontWeight: tokens.font.weight.medium }}>
              Status:{' '}
              <span
                style={{
                  color: killSwitchEnabled ? tokens.color.feedback.error : tokens.color.feedback.success,
                  fontFamily: tokens.font.family.mono,
                }}
              >
                {killSwitchEnabled ? 'ENABLED — AI calls blocked' : 'DISABLED — AI calls allowed'}
              </span>
            </div>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginTop: tokens.space[1] }}>
              When enabled, all AI calls return 503 within 60 seconds.
            </div>
          </div>
          <button
            onClick={() => void handleToggle()}
            disabled={toggling}
            style={{
              background: killSwitchEnabled ? tokens.color.brand.primary : tokens.color.feedback.error,
              color: '#fff',
              border: 'none',
              borderRadius: tokens.radius.md,
              padding: `${tokens.space[2]} ${tokens.space[5]}`,
              cursor: toggling ? 'not-allowed' : 'pointer',
              opacity: toggling ? 0.7 : 1,
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.medium,
              minHeight: '44px',
              whiteSpace: 'nowrap',
            }}
          >
            {toggling
              ? 'Updating…'
              : killSwitchEnabled
                ? 'Disable Kill Switch'
                : 'Enable Kill Switch'}
          </button>
        </div>
      </section>

      {/* Spend caps */}
      <section>
        <h2 style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.medium, marginBottom: tokens.space[3] }}>
          AI Spend Caps
        </h2>
        <form
          onSubmit={(e) => void handleSaveCaps(e)}
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.md,
            padding: tokens.space[4],
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space[4],
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.space[4] }}>
            <label>
              <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
                Daily cap (USD)
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${tokens.space[2]} ${tokens.space[3]}`,
                  background: tokens.color.surface.base,
                  border: `1px solid ${tokens.color.text.disabled}40`,
                  borderRadius: tokens.radius.md,
                  color: tokens.color.text.primary,
                  fontSize: tokens.font.size.md,
                  fontFamily: tokens.font.family.mono,
                  minHeight: '44px',
                }}
              />
            </label>
            <label>
              <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, marginBottom: tokens.space[1] }}>
                Monthly cap (USD)
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${tokens.space[2]} ${tokens.space[3]}`,
                  background: tokens.color.surface.base,
                  border: `1px solid ${tokens.color.text.disabled}40`,
                  borderRadius: tokens.radius.md,
                  color: tokens.color.text.primary,
                  fontSize: tokens.font.size.md,
                  fontFamily: tokens.font.family.mono,
                  minHeight: '44px',
                }}
              />
            </label>
          </div>

          {saveError && (
            <div style={{ color: tokens.color.feedback.error, fontSize: tokens.font.size.sm }}>{saveError}</div>
          )}
          {saveSuccess && (
            <div style={{ color: tokens.color.feedback.success, fontSize: tokens.font.size.sm }}>
              Spend caps updated.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: tokens.color.brand.primary,
              color: '#fff',
              border: 'none',
              borderRadius: tokens.radius.md,
              padding: `${tokens.space[2]} ${tokens.space[5]}`,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.medium,
              alignSelf: 'flex-start',
              minHeight: '44px',
            }}
          >
            {saving ? 'Saving…' : 'Save Caps'}
          </button>
        </form>
      </section>
    </div>
  )
}
