import { create } from 'zustand'
import type { AthleteProfile, OnboardingStatus } from '../types/index.js'
import { getAccount, patchPrefs } from '../lib/api.js'
import type { CoachStyle } from '../types/index.js'

interface ProfileState {
  profile: AthleteProfile | null
  onboardingStatus: OnboardingStatus
  isLoading: boolean
  error: string | null

  fetchProfile(): Promise<void>
  updateProfile(partial: Partial<AthleteProfile>): void
  setOnboardingStatus(status: OnboardingStatus): void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  onboardingStatus: 'not_started',
  isLoading: false,
  error: null,

  async fetchProfile() {
    set({ isLoading: true, error: null })
    try {
      const account = await getAccount()
      set({
        profile: account.profile,
        onboardingStatus: account.onboardingStatus,
        isLoading: false,
      })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  updateProfile(partial) {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    }))
  },

  setOnboardingStatus(status) {
    set({ onboardingStatus: status })
  },
}))
