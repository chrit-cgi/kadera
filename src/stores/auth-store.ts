import { create } from 'zustand'
import type { AuthUser, UserTier } from '../types/index.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  isAdmin: boolean
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => void
}

// ── Dev bypass stub ───────────────────────────────────────────────────────────

const DEV_STUB: AuthUser = {
  uid: 'dev-user-001',
  email: 'dev@kadera.local',
  displayName: 'Dev User',
  tier: 'elite' as UserTier,
  isAdmin: true,
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,

  initialize() {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ user: DEV_STUB, isAdmin: DEV_STUB.isAdmin, isLoading: false })
      return
    }

    // Lazy-import Firebase to avoid loading it in bypass mode
    import('firebase/auth').then(async ({ getAuth, onAuthStateChanged, getRedirectResult }) => {
      const auth = getAuth()

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          set({ user: null, isAdmin: false, isLoading: false })
          return
        }

        // Fetch tier + admin status from the backend
        try {
          const token = await firebaseUser.getIdToken()
          const res = await fetch('/api/account', {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (res.ok) {
            const data = (await res.json()) as {
              tier: UserTier
              isAdmin?: boolean
            }

            const user: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? '',
              tier: data.tier,
              isAdmin: data.isAdmin ?? false,
            }

            set({ user, isAdmin: user.isAdmin, isLoading: false })
          } else {
            set({ user: null, isAdmin: false, isLoading: false })
          }
        } catch {
          set({ user: null, isAdmin: false, isLoading: false })
        }
      })
    })
  },

  async signIn() {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ user: DEV_STUB, isAdmin: DEV_STUB.isAdmin, isLoading: false })
      return
    }

    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    const auth = getAuth()
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
    // onAuthStateChanged above will update the store
  },

  async signOut() {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({ user: null, isAdmin: false })
      return
    }

    const { getAuth, signOut: fbSignOut } = await import('firebase/auth')
    await fbSignOut(getAuth())
    set({ user: null, isAdmin: false })
  },
}))
