import { create } from 'zustand'
import { postFood } from '../lib/api.js'
import type { FoodEntry } from '../types/index.js'

interface FoodState {
  entries: FoodEntry[]
  submitting: boolean
  error: string | null
  logFood: (input: { inputType: 'text'; text: string } | { inputType: 'photo'; photoBase64: string }) => Promise<{ mealId: string; macros: FoodEntry['macros']; estimateNotes: string } | null>
  clearError: () => void
}

export const useFoodStore = create<FoodState>((set) => ({
  entries: [],
  submitting: false,
  error: null,

  async logFood(input) {
    set({ submitting: true, error: null })
    try {
      const result = await postFood(input)
      const entry: FoodEntry = {
        id: result.mealId,
        loggedAt: new Date().toISOString(),
        inputType: input.inputType,
        rawInput: input.inputType === 'text' ? input.text : '[photo]',
        photoUrl: null,
        macros: result.macros,
        estimateNotes: result.estimateNotes,
        estimatedBy: 'claude',
      }
      set((s) => ({ entries: [entry, ...s.entries], submitting: false }))
      return result
    } catch (err) {
      set({ error: (err as Error).message, submitting: false })
      return null
    }
  },

  clearError() {
    set({ error: null })
  },
}))
