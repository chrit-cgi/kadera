import { create } from 'zustand'
import { getAccount, patchPrefs } from '../lib/api.js'
import type { CoachStyle } from '../types/index.js'

interface ProfilePrefsState {
  coachStyle: CoachStyle
  isLoading: boolean
  error: string | null
  fetchPrefs: () => Promise<void>
  updateCoachStyle: (style: CoachStyle) => Promise<void>
}

export const useProfilePrefsStore = create<ProfilePrefsState>((set) => ({
  coachStyle: 'motivator',
  isLoading: false,
  error: null,

  async fetchPrefs() {
    set({ isLoading: true, error: null })
    try {
      const account = await getAccount()
      set({ coachStyle: account.coachStyle, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  async updateCoachStyle(style) {
    set({ isLoading: true, error: null })
    try {
      const result = await patchPrefs(style)
      set({ coachStyle: result.coachStyle, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
