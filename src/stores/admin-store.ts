import { create } from 'zustand'
import type { Invite, User } from '../types/index.js'
import type { DashboardResponse } from '../lib/api.js'
import {
  getAdminDashboard,
  getAdminInvites,
  postAdminInvite,
  patchAdminInvite,
  getAdminUsers,
  patchAdminUser,
  patchAdminSettings,
} from '../lib/api.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminSettings {
  killSwitch: { enabled: boolean; enabledAt: string | null }
  spendCaps: { dailyUSD: number; monthlyUSD: number; currentDailyUSD: number; currentMonthlyUSD: number }
}

interface AdminState {
  stats: DashboardResponse | null
  invites: Invite[]
  users: User[]
  settings: AdminSettings | null
  isLoading: boolean
  error: string | null

  fetchDashboard(): Promise<void>
  fetchInvites(): Promise<void>
  addInvite(email: string): Promise<void>
  revokeInvite(email: string): Promise<void>
  fetchUsers(): Promise<void>
  changeUserTier(uid: string, tier: User['tier']): Promise<void>
  fetchSettings(): Promise<void>
  toggleKillSwitch(enabled: boolean): Promise<void>
  updateSpendCaps(caps: { dailyUSD: number; monthlyUSD: number }): Promise<void>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  invites: [],
  users: [],
  settings: null,
  isLoading: false,
  error: null,

  async fetchDashboard() {
    set({ isLoading: true, error: null })
    try {
      const stats = await getAdminDashboard()
      set({ stats, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  async fetchInvites() {
    set({ isLoading: true, error: null })
    try {
      const { invites } = await getAdminInvites()
      set({ invites, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  async addInvite(email: string) {
    const { invite } = await postAdminInvite(email)
    set({ invites: [...get().invites, invite] })
  },

  async revokeInvite(email: string) {
    const { invite } = await patchAdminInvite(email, 'revoke')
    set({ invites: get().invites.map((i) => (i.email === email ? invite : i)) })
  },

  async fetchUsers() {
    set({ isLoading: true, error: null })
    try {
      const { users } = await getAdminUsers()
      set({ users, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  async changeUserTier(uid: string, tier: User['tier']) {
    await patchAdminUser(uid, tier)
    set({ users: get().users.map((u) => (u.uid === uid ? { ...u, tier } : u)) })
  },

  async fetchSettings() {
    // Settings are embedded in the dashboard response
    const stats = get().stats
    if (stats) {
      set({
        settings: {
          killSwitch: { enabled: stats.killSwitchEnabled, enabledAt: null },
          spendCaps: {
            dailyUSD: stats.spendCaps.dailyUSD,
            monthlyUSD: stats.spendCaps.monthlyUSD,
            currentDailyUSD: stats.dailyCostUSD,
            currentMonthlyUSD: stats.monthlyCostUSD,
          },
        },
      })
    } else {
      await get().fetchDashboard()
      await get().fetchSettings()
    }
  },

  async toggleKillSwitch(enabled: boolean) {
    await patchAdminSettings({ killSwitch: enabled })
    const settings = get().settings
    if (settings) {
      set({ settings: { ...settings, killSwitch: { ...settings.killSwitch, enabled } } })
    }
    if (get().stats) {
      set({ stats: { ...get().stats!, killSwitchEnabled: enabled } })
    }
  },

  async updateSpendCaps(caps: { dailyUSD: number; monthlyUSD: number }) {
    await patchAdminSettings({ spendCaps: caps })
    const settings = get().settings
    if (settings) {
      set({ settings: { ...settings, spendCaps: { ...settings.spendCaps, ...caps } } })
    }
  },
}))
