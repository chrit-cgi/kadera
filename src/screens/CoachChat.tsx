import { useRef, useEffect, useState } from 'react'
import { useChatStore } from '../stores/chat-store.js'
import { tokens } from '../design-system/tokens.js'

export default function CoachChat() {
  const { messages, sending, error, remainingMessages, sendMessage, clearConversation } = useChatStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.bold,
              color: tokens.color.text.primary,
            }}
          >
            Coach Kadera
          </div>
          {remainingMessages !== null && remainingMessages >= 0 && (
            <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
              {remainingMessages} messages remaining today
            </div>
          )}
        </div>
        <button
          onClick={clearConversation}
          style={{
            background: 'transparent',
            border: `1px solid ${tokens.color.text.disabled}40`,
            borderRadius: tokens.radius.md,
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
            padding: `${tokens.space[1]} ${tokens.space[3]}`,
            cursor: 'pointer',
          }}
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: `${tokens.space[4]}`,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space[3],
        }}
      >
        {messages.length === 0 && !sending && (
          <div
            style={{
              textAlign: 'center',
              padding: tokens.space[8],
              color: tokens.color.text.secondary,
              fontSize: tokens.font.size.sm,
            }}
          >
            Ask Kadera anything — pace targets, session swaps, recovery tips, race strategy.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '82%',
                padding: `${tokens.space[3]} ${tokens.space[4]}`,
                borderRadius:
                  msg.role === 'user'
                    ? `${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.sm} ${tokens.radius.lg}`
                    : `${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.lg} ${tokens.radius.sm}`,
                background:
                  msg.role === 'user' ? tokens.color.brand.primary : tokens.color.surface.raised,
                color: msg.role === 'user' ? '#fff' : tokens.color.text.primary,
                fontSize: tokens.font.size.md,
                lineHeight: tokens.line.height.normal,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

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
              Kadera is thinking…
            </div>
          </div>
        )}

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
          placeholder="Ask your coach…"
          disabled={sending}
          aria-label="Message"
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
