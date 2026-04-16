/**
 * Typed fetch wrappers for every API endpoint.
 * All authenticated calls read the Firebase ID token from auth-store.
 * Non-2xx responses throw ApiError.
 */
import { useAuthStore } from '../stores/auth-store.js'
import { ApiError } from '../types/index.js'
import type {
  Invite,
  User,
  TrainingPlan,
  Session,
  Adjustment,
  MorningBrief,
  ChatResponse,
  Review,
  MasterNode,
  UserNode,
  FoodEntry,
  ImportResult,
  Activity,
  AthleteProfile,
  CoachStyle,
} from '../types/index.js'

// ── Token helper ──────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return 'dev-bypass-token'

  const { getAuth } = await import('firebase/auth')
  const user = getAuth().currentUser
  return user ? user.getIdToken() : null
}

// ── Base fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    let errorMsg = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      errorMsg = body.error ?? errorMsg
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, errorMsg)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Waitlist (public) ─────────────────────────────────────────────────────────

export function postWaitlist(email: string) {
  return apiFetch<{ status: 'added' | 'already_registered' }>(
    '/api/waitlist',
    { method: 'POST', body: JSON.stringify({ email }) },
    false,
  )
}

// ── Intake ────────────────────────────────────────────────────────────────────

export interface IntakeStep {
  step: number
  message: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface IntakeResponse {
  isComplete: boolean
  step?: number
  message?: string
  profile?: AthleteProfile
  planSummary?: { phases: number; startDate: string; currentWeeklyKm: number; vdot: number }
}

export function postIntake(body: IntakeStep) {
  return apiFetch<IntakeResponse>('/api/intake', { method: 'POST', body: JSON.stringify(body) })
}

// ── Coach ─────────────────────────────────────────────────────────────────────

export function postBrief() {
  return apiFetch<MorningBrief>('/api/coach/brief', { method: 'POST', body: JSON.stringify({}) })
}

export function postChat(message: string, conversationId: string) {
  return apiFetch<ChatResponse>('/api/coach/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId }),
  })
}

export function postReview(type: 'post_run' | 'weekly', sessionId?: string) {
  return apiFetch<Review>('/api/coach/review', {
    method: 'POST',
    body: JSON.stringify({ type, sessionId: sessionId ?? null }),
  })
}

// ── Training Plan ─────────────────────────────────────────────────────────────

export function getPlan() {
  return apiFetch<{ plan: TrainingPlan }>('/api/plan')
}

export function patchSession(
  sessionId: string,
  body: { action: 'swap'; crossTrainingType: string } | { action: 'complete'; feelScore: number; notes: string | null },
) {
  return apiFetch<{ session: Session }>(`/api/plan/session/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function patchAdjustment(adjustmentId: string, decision: 'accepted' | 'rejected') {
  return apiFetch<{ adjustmentId: string; status: string }>(`/api/plan/adjustment/${adjustmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  })
}

// ── Knowledge Graph ───────────────────────────────────────────────────────────

export function getGraph() {
  return apiFetch<{ masterNodes: MasterNode[]; userNodes: UserNode[] }>('/api/graph')
}

// ── Food ──────────────────────────────────────────────────────────────────────

export function postFood(body: { inputType: 'text'; text: string } | { inputType: 'photo'; photoBase64: string }) {
  return apiFetch<{ mealId: string; macros: FoodEntry['macros']; estimateNotes: string }>('/api/food', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ── Garmin ────────────────────────────────────────────────────────────────────

export async function postGarminImport(file: File): Promise<ImportResult> {
  const headers: Record<string, string> = {}
  const token = await getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/garmin/import', { method: 'POST', headers, body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  return res.json() as Promise<ImportResult>
}

export function getActivities() {
  return apiFetch<{ activities: Activity[] }>('/api/garmin/activities')
}

// ── Account ───────────────────────────────────────────────────────────────────

export interface AccountResponse {
  uid: string
  email: string
  displayName: string
  tier: User['tier']
  dailyMessageCount: number
  dailyMessageCap: number
  coachStyle: CoachStyle
  onboardingStatus: User['onboardingStatus']
  profile: AthleteProfile | null
  isAdmin?: boolean
}

export function getAccount() {
  return apiFetch<AccountResponse>('/api/account')
}

export function patchPrefs(coachStyle: CoachStyle) {
  return apiFetch<{ coachStyle: CoachStyle }>('/api/account/prefs', {
    method: 'PATCH',
    body: JSON.stringify({ coachStyle }),
  })
}

export function deleteAccount() {
  return apiFetch<void>('/api/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
  })
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function getExport(): Promise<void> {
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/export', { headers })
  if (!res.ok) throw new ApiError(res.status, 'Export failed')

  // Trigger browser download
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kadera-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  userCount: number
  activeToday: number
  dailyCostUSD: number
  monthlyCostUSD: number
  killSwitchEnabled: boolean
  spendCaps: { dailyUSD: number; monthlyUSD: number }
  recentAuditEvents: unknown[]
}

export function getAdminDashboard() {
  return apiFetch<DashboardResponse>('/api/admin/dashboard')
}

export function getAdminInvites() {
  return apiFetch<{ invites: Invite[] }>('/api/admin/invites')
}

export function postAdminInvite(email: string) {
  return apiFetch<{ invite: Invite }>('/api/admin/invites', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function patchAdminInvite(email: string, action: 'revoke') {
  return apiFetch<{ invite: Invite }>(`/api/admin/invites/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  })
}

export function getAdminUsers() {
  return apiFetch<{ users: User[] }>('/api/admin/users')
}

export function patchAdminUser(uid: string, tier: User['tier']) {
  return apiFetch<{ uid: string; tier: string }>(`/api/admin/users/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify({ tier }),
  })
}

export function patchAdminSettings(body: { killSwitch?: boolean; spendCaps?: { dailyUSD: number; monthlyUSD: number } }) {
  return apiFetch<{ settings: unknown }>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// ── Weather ───────────────────────────────────────────────────────────────────

export function getWeather() {
  return apiFetch<{ condition: string; tempC: number; feelsLikeC: number; windKmh: number; humidity: number; location: string } | null>('/api/weather')
}

// ── Adjustment ────────────────────────────────────────────────────────────────

export function getAdjustment(adjustmentId: string) {
  return apiFetch<Adjustment>(`/api/plan/adjustment/${adjustmentId}`)
}
