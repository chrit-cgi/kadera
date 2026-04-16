import { create } from 'zustand'
import { postGarminImport, getActivities } from '../lib/api.js'
import type { Activity, ImportResult } from '../types/index.js'

interface GarminState {
  activities: Activity[]
  importing: boolean
  importResult: ImportResult | null
  error: string | null
  importFile: (file: File) => Promise<void>
  fetchActivities: () => Promise<void>
  clearError: () => void
}

export const useGarminStore = create<GarminState>((set) => ({
  activities: [],
  importing: false,
  importResult: null,
  error: null,

  async importFile(file) {
    set({ importing: true, error: null, importResult: null })
    try {
      const result = await postGarminImport(file)
      set({ importResult: result, importing: false })
    } catch (err) {
      set({ error: (err as Error).message, importing: false })
    }
  },

  async fetchActivities() {
    try {
      const { activities } = await getActivities()
      set({ activities })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  clearError() {
    set({ error: null })
  },
}))
