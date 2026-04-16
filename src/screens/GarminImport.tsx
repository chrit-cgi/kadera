import { useEffect, useRef } from 'react'
import { useGarminStore } from '../stores/garmin-store.js'
import { tokens } from '../design-system/tokens.js'

export default function GarminImport() {
  const { activities, importing, importResult, error, importFile, fetchActivities, clearError } = useGarminStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await importFile(file)
    void fetchActivities()
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
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
          marginBottom: tokens.space[2],
        }}
      >
        Garmin Import
      </h1>
      <p style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm, marginBottom: tokens.space[6] }}>
        Upload a Garmin JSON activity export to sync your runs.
      </p>

      {/* Upload button */}
      <div style={{ marginBottom: tokens.space[6] }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.fit"
          onChange={(e) => void handleFileChange(e)}
          disabled={importing}
          style={{ display: 'none' }}
          id="garmin-file-input"
        />
        <label
          htmlFor="garmin-file-input"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: tokens.space[2],
            padding: `${tokens.space[3]} ${tokens.space[5]}`,
            background: importing ? tokens.color.surface.raised : tokens.color.brand.primary,
            color: importing ? tokens.color.text.secondary : '#fff',
            borderRadius: tokens.radius.md,
            cursor: importing ? 'not-allowed' : 'pointer',
            fontSize: tokens.font.size.md,
            fontWeight: tokens.font.weight.medium,
          }}
        >
          {importing ? 'Importing…' : 'Choose file to import'}
        </label>
      </div>

      {/* Import result */}
      {importResult && (
        <div
          style={{
            padding: tokens.space[4],
            background: `${tokens.color.feedback.success}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.feedback.success,
            fontSize: tokens.font.size.sm,
            marginBottom: tokens.space[5],
          }}
        >
          ✓ Imported {importResult.imported} activities
          {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: tokens.space[4],
            background: `${tokens.color.feedback.error}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.feedback.error,
            fontSize: tokens.font.size.sm,
            marginBottom: tokens.space[5],
            cursor: 'pointer',
          }}
          onClick={clearError}
        >
          {error}
        </div>
      )}

      {/* Activities list */}
      {activities.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.bold,
              marginBottom: tokens.space[3],
            }}
          >
            Imported Activities
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[2] }}>
            {activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  background: tokens.color.surface.raised,
                  borderRadius: tokens.radius.md,
                  padding: `${tokens.space[3]} ${tokens.space[4]}`,
                  display: 'flex',
                  gap: tokens.space[3],
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: tokens.radius.full,
                    background: tokens.color.session.easy,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.font.size.sm,
                      fontWeight: tokens.font.weight.medium,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activity.title}
                  </div>
                  <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
                    {activity.date
                      ? new Date(activity.date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </div>
                </div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary, textAlign: 'right', flexShrink: 0 }}>
                  <div>{activity.distanceKm} km</div>
                  <div>{formatDuration(activity.durationSec)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && !importing && (
        <div
          style={{
            textAlign: 'center',
            padding: tokens.space[8],
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
          }}
        >
          No activities imported yet. Export your Garmin data and upload the JSON file.
        </div>
      )}
    </div>
  )
}
