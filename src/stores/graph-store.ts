import { create } from 'zustand'
import { getGraph } from '../lib/api.js'
import type { MasterNode, UserNode } from '../types/index.js'

interface GraphState {
  masterNodes: MasterNode[]
  userNodes: UserNode[]
  isLoading: boolean
  error: string | null
  fetchGraph: () => Promise<void>
}

export const useGraphStore = create<GraphState>((set, get) => ({
  masterNodes: [],
  userNodes: [],
  isLoading: false,
  error: null,

  async fetchGraph() {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const { masterNodes, userNodes } = await getGraph()
      set({ masterNodes, userNodes, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
