import { create } from 'zustand'
import { postBrief } from '../lib/api.js'
import type { MorningBrief } from '../types/index.js'

interface BriefState {
  brief: MorningBrief | null
  isLoading: boolean
  error: string | null
  fetchBrief: () => Promise<void>
}

export const useBriefStore = create<BriefState>((set, get) => ({
  brief: null,
  isLoading: false,
  error: null,

  async fetchBrief() {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const brief = await postBrief()
      set({ brief, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
