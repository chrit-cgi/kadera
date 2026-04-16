import { create } from 'zustand'
import type { TrainingPlan, Session } from '../types/index.js'
import { getPlan, patchSession, patchAdjustment } from '../lib/api.js'

interface PlanState {
  plan: TrainingPlan | null
  sessions: Session[]
  isLoading: boolean
  error: string | null

  fetchPlan(): Promise<void>
  updateSession(id: string, partial: Partial<Session>): void
  applyAdjustment(adjustmentId: string): Promise<void>
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  sessions: [],
  isLoading: false,
  error: null,

  async fetchPlan() {
    set({ isLoading: true, error: null })
    try {
      const { plan } = await getPlan()
      set({
        plan,
        sessions: plan.sessions ?? [],
        isLoading: false,
      })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  updateSession(id, partial) {
    set({
      sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    })
  },

  async applyAdjustment(adjustmentId) {
    await patchAdjustment(adjustmentId, 'accepted')
    // Re-fetch plan to get updated session fields
    await get().fetchPlan()
  },
}))
