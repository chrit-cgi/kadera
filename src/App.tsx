import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { MobileShell } from './components/MobileShell.js'
import { useAuthStore } from './stores/auth-store.js'
import { lazyRetry } from './lib/lazyRetry.js'
import { tokens } from './design-system/tokens.js'

// ── Lazy screens ──────────────────────────────────────────────────────────────

const Waitlist = lazyRetry(() => import('./screens/Waitlist.js'))
const Onboarding = lazyRetry(() => import('./screens/Onboarding.js'))
const MorningBrief = lazyRetry(() => import('./screens/MorningBrief.js'))
const CoachChat = lazyRetry(() => import('./screens/CoachChat.js'))
const TrainingPlan = lazyRetry(() => import('./screens/TrainingPlan.js'))
const SessionDetail = lazyRetry(() => import('./screens/SessionDetail.js'))
const Galaxy = lazyRetry(() => import('./screens/Galaxy.js'))
const FoodLog = lazyRetry(() => import('./screens/FoodLog.js'))
const GarminImport = lazyRetry(() => import('./screens/GarminImport.js'))
const Settings = lazyRetry(() => import('./screens/Settings.js'))
const AdminDashboard = lazyRetry(() => import('./screens/admin/AdminDashboard.js'))
const AdminInvites = lazyRetry(() => import('./screens/admin/AdminInvites.js'))
const AdminSettings = lazyRetry(() => import('./screens/admin/AdminSettings.js'))
const AdminUsers = lazyRetry(() => import('./screens/admin/AdminUsers.js'))

// ── Tab definitions (per UX DNA §5) ──────────────────────────────────────────

const TABS = [
  {
    path: '/brief',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/coach',
    label: 'Coach',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: '/plan',
    label: 'Plan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    path: '/galaxy',
    label: 'Galaxy',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'More',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
      </svg>
    ),
  },
]

// ── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/welcome', { replace: true, state: { from: location } })
    }
  }, [user, isLoading, navigate, location])

  if (isLoading) return <ScreenLoader />
  if (!user) return null
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/brief', { replace: true })
    }
  }, [user, isAdmin, isLoading, navigate])

  if (isLoading) return <ScreenLoader />
  if (!user || !isAdmin) return null
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/welcome', { replace: true })
    }
    // If onboarding already complete, redirect to brief
    // (profile-store will handle this once loaded)
  }, [user, isLoading, navigate])

  if (isLoading) return <ScreenLoader />
  if (!user) return null
  return <>{children}</>
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function ScreenLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: tokens.color.surface.base,
        color: tokens.color.text.secondary,
        fontSize: tokens.font.size.md,
      }}
    >
      Loading…
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const { initialize, isAdmin } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/welcome" element={<Waitlist />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/brief" replace />} />

        {/* Onboarding (auth required, no complete check) */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <Onboarding />
            </OnboardingRoute>
          }
        />

        {/* Protected app routes inside MobileShell */}
        <Route
          element={
            <ProtectedRoute>
              <MobileShell tabs={TABS} isAdmin={isAdmin} />
            </ProtectedRoute>
          }
        >
          <Route path="/brief" element={<MorningBrief />} />
          <Route path="/coach" element={<CoachChat />} />
          <Route path="/plan" element={<TrainingPlan />} />
          <Route path="/plan/:sessionId" element={<SessionDetail />} />
          <Route path="/galaxy" element={<Galaxy />} />
          <Route path="/food" element={<FoodLog />} />
          <Route path="/garmin" element={<GarminImport />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/invites"
            element={
              <AdminRoute>
                <AdminInvites />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
