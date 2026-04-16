import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store.js'
import { postWaitlist } from '../lib/api.js'
import { tokens } from '../design-system/tokens.js'

export default function Waitlist() {
  const { user, isLoading, signIn } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<'added' | 'already_registered' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  // If authenticated, redirect to onboarding or app
  if (!isLoading && user) {
    navigate('/onboarding', { replace: true })
    return null
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await postWaitlist(email)
      setSubmitted(result.status)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignIn() {
    setSigningIn(true)
    try {
      await signIn()
    } catch (err) {
      setError((err as Error).message)
      setSigningIn(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: tokens.color.surface.base,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.space[6],
      }}
    >
      {/* Logo + tagline */}
      <div style={{ textAlign: 'center', marginBottom: tokens.space[10] }}>
        <div
          style={{
            fontSize: tokens.font.size['4xl'],
            fontWeight: tokens.font.weight.bold,
            color: tokens.color.brand.primary,
            fontFamily: tokens.font.family.heading,
            marginBottom: tokens.space[2],
          }}
        >
          Kadera
        </div>
        <div style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.lg }}>
          Your AI running coach
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space[4],
        }}
      >
        {/* Sign in */}
        <div
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.lg,
            padding: tokens.space[6],
          }}
        >
          <h2
            style={{
              fontSize: tokens.font.size.xl,
              fontWeight: tokens.font.weight.bold,
              marginBottom: tokens.space[2],
            }}
          >
            Sign in
          </h2>
          <p style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm, marginBottom: tokens.space[4] }}>
            Have an invite? Sign in with Google to get started.
          </p>

          {error && (
            <div
              style={{
                color: tokens.color.feedback.error,
                fontSize: tokens.font.size.sm,
                marginBottom: tokens.space[3],
                padding: tokens.space[2],
                background: `${tokens.color.feedback.error}15`,
                borderRadius: tokens.radius.sm,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={() => void handleSignIn()}
            disabled={signingIn || isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.space[2],
              background: tokens.color.brand.primary,
              color: '#fff',
              border: 'none',
              borderRadius: tokens.radius.md,
              padding: `${tokens.space[3]} ${tokens.space[4]}`,
              cursor: signingIn ? 'not-allowed' : 'pointer',
              opacity: signingIn ? 0.7 : 1,
              fontFamily: tokens.font.family.body,
              fontSize: tokens.font.size.md,
              fontWeight: tokens.font.weight.medium,
              minHeight: '44px',
            }}
          >
            {signingIn ? 'Signing in…' : 'Continue with Google'}
          </button>
        </div>

        {/* Waitlist */}
        <div
          style={{
            background: tokens.color.surface.raised,
            borderRadius: tokens.radius.lg,
            padding: tokens.space[6],
          }}
        >
          <h2
            style={{
              fontSize: tokens.font.size.xl,
              fontWeight: tokens.font.weight.bold,
              marginBottom: tokens.space[2],
            }}
          >
            Request access
          </h2>
          <p style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size.sm, marginBottom: tokens.space[4] }}>
            No invite yet? Join the waitlist and we'll reach out when a spot opens.
          </p>

          {submitted ? (
            <div
              style={{
                color: tokens.color.feedback.success,
                padding: tokens.space[3],
                background: `${tokens.color.feedback.success}15`,
                borderRadius: tokens.radius.md,
                fontSize: tokens.font.size.sm,
              }}
            >
              {submitted === 'added'
                ? "You're on the list! We'll be in touch soon."
                : "You're already registered. We'll be in touch soon."}
            </div>
          ) : (
            <form onSubmit={(e) => void handleWaitlist(e)} style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
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
              <button
                type="submit"
                disabled={submitting || !email}
                style={{
                  background: 'transparent',
                  border: `1px solid ${tokens.color.brand.primary}`,
                  color: tokens.color.brand.primary,
                  borderRadius: tokens.radius.md,
                  padding: `${tokens.space[2]} ${tokens.space[4]}`,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !email ? 0.6 : 1,
                  fontFamily: tokens.font.family.body,
                  fontSize: tokens.font.size.md,
                  fontWeight: tokens.font.weight.medium,
                  minHeight: '44px',
                }}
              >
                {submitting ? 'Joining…' : 'Join Waitlist'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
