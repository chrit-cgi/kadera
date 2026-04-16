import { create } from 'zustand'
import { postChat } from '../lib/api.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatState {
  messages: ChatMessage[]
  conversationId: string | null
  sending: boolean
  error: string | null
  remainingMessages: number | null
  sendMessage: (text: string) => Promise<void>
  clearConversation: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversationId: null,
  sending: false,
  error: null,
  remainingMessages: null,

  async sendMessage(text) {
    if (get().sending) return
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ messages: [...s.messages, userMsg], sending: true, error: null }))

    try {
      const res = await postChat(text, get().conversationId ?? '')
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
      }
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        conversationId: res.conversationId ?? s.conversationId,
        remainingMessages: res.remainingMessages,
        sending: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, sending: false })
    }
  },

  clearConversation() {
    set({ messages: [], conversationId: null, error: null })
  },
}))
