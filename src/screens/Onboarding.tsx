import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store.js'
import { useProfileStore } from '../stores/profile-store.js'
import { postIntake } from '../lib/api.js'
import { tokens } from '../design-system/tokens.js'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function StepIndicator({ step }: { step: number }) {
  const totalSteps = 12 // Approximate
  const pct = Math.min((step / totalSteps) * 100, 90)
  return (
    <div
      style={{
        background: tokens.color.surface.raised,
        borderRadius: tokens.radius.sm,
        height: '4px',
        margin: `0 ${tokens.space[4]}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: tokens.color.brand.primary,
          height: '100%',
          width: `${pct}%`,
          transition: `width ${tokens.transition.slow}`,
          borderRadius: tokens.radius.sm,
        }}
      />
    </div>
  )
}

export default function Onboarding() {
  const { user } = useAuthStore()
  const { setOnboardingStatus } = useProfileStore()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Kick off the conversation on mount
  useEffect(() => {
    void startIntake()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startIntake() {
    setSending(true)
    setError(null)
    try {
      const res = await postIntake({ step: 0, message: '', conversationHistory: [] })
      if (res.message) {
        setMessages([{ role: 'assistant', content: res.message }])
      }
      setStep(res.step ?? 0)
    } catch (err) {
      const e = err as { status?: number; error?: string }
      if (e.status === 503) {
        setError('The AI coach is temporarily unavailable. Your progress is saved — please try again in a few minutes.')
      } else {
        setError((err as Error).message)
      }
    } finally {
      setSending(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)
    setSending(true)
    setError(null)

    // Build history (exclude current user message — it's sent as `message`)
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await postIntake({
        step,
        message: userMessage,
        conversationHistory: history,
      })

      if (res.message) {
        setMessages([...updatedMessages, { role: 'assistant', content: res.message }])
      }

      if (res.isComplete) {
        setOnboardingStatus('complete')
        // Short pause to let the athlete read the closing message, then navigate
        setTimeout(() => navigate('/brief', { replace: true }), 2000)
        return
      }

      setStep(res.step ?? step + 1)
    } catch (err) {
      const e = err as { status?: number; error?: string }
      if (e.status === 503) {
        setError('AI temporarily unavailable. Your progress is saved.')
      } else if (e.status === 402) {
        setError("You've reached your daily message limit. Come back tomorrow to continue.")
      } else {
        setError((err as Error).message)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: tokens.color.surface.base,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${tokens.space[4]} ${tokens.space[4]} ${tokens.space[2]}`,
          borderBottom: `1px solid ${tokens.color.text.disabled}20`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: tokens.space[2],
          }}
        >
          <span
            style={{
              fontSize: tokens.font.size.xl,
              fontWeight: tokens.font.weight.bold,
              color: tokens.color.brand.primary,
            }}
          >
            Kadera
          </span>
          <span style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
            Athlete Intake
          </span>
        </div>
        <StepIndicator step={step} />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: `${tokens.space[4]} ${tokens.space[4]}`,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space[3],
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: `${tokens.space[3]} ${tokens.space[4]}`,
                borderRadius:
                  msg.role === 'user'
                    ? `${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.sm} ${tokens.radius.lg}`
                    : `${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.sm}`,
                background:
                  msg.role === 'user' ? tokens.color.brand.primary : tokens.color.surface.raised,
                color:
                  msg.role === 'user' ? '#fff' : tokens.color.text.primary,
                fontSize: tokens.font.size.md,
                lineHeight: tokens.line.height.normal,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: `${tokens.space[3]} ${tokens.space[4]}`,
                borderRadius: `${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.sm}`,
                background: tokens.color.surface.raised,
                color: tokens.color.text.secondary,
                fontSize: tokens.font.size.sm,
              }}
            >
              Kadera is typing…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: tokens.space[3],
              background: `${tokens.color.feedback.error}15`,
              borderRadius: tokens.radius.md,
              color: tokens.color.feedback.error,
              fontSize: tokens.font.size.sm,
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => void handleSend(e)}
        style={{
          padding: tokens.space[4],
          borderTop: `1px solid ${tokens.color.text.disabled}20`,
          display: 'flex',
          gap: tokens.space[2],
          background: tokens.color.surface.base,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={sending}
          aria-label="Your answer"
          style={{
            flex: 1,
            padding: `${tokens.space[2]} ${tokens.space[3]}`,
            background: tokens.color.surface.raised,
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
          disabled={sending || !input.trim()}
          aria-label="Send"
          style={{
            background: tokens.color.brand.primary,
            color: '#fff',
            border: 'none',
            borderRadius: tokens.radius.md,
            width: '44px',
            height: '44px',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !input.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}
