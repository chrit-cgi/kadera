// ─── Tier caps ───────────────────────────────────────────────────────────────

export const TIER_CAPS: Record<'free' | 'starter' | 'elite', number> = {
  free: 3,
  starter: 15,
  elite: 40,
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserTier = 'free' | 'starter' | 'elite'
export type OnboardingStatus = 'not_started' | 'in_progress' | 'complete'
export type CoachStyle = 'motivator' | 'analytical' | 'gentle' | 'challenger'

export interface User {
  uid: string
  email: string
  displayName: string
  tier: UserTier
  dailyMessageCount: number
  dailyMessageDate: string
  onboardingStatus: OnboardingStatus
  onboardingStep: number
  coachStyle: CoachStyle
  createdAt: string
  lastLoginAt: string
  isDeleted: boolean
}

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  tier: UserTier
  isAdmin: boolean
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface AthleteProfile {
  name: string
  weightKg: number
  targetRace: string
  targetDistanceKm: number
  targetFinishTimeSec: number
  targetDate: string
  currentWeeklyKm: number
  maxHR: number
  vdot: number
  mostRecentRaceDistanceKm: number
  mostRecentRaceTimeSec: number
  activeInjuries: string[]
  behaviouralTraps: string[]
  location: string
  timezone: string
  updatedAt: string
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export type SessionType =
  | 'easy'
  | 'threshold'
  | 'vo2max'
  | 'long_run'
  | 'recovery'
  | 'cross_training'
  | 'race'

export type SessionStatus = 'planned' | 'completed' | 'swapped' | 'skipped'

export interface Session {
  id: string
  phase: number
  week: number
  dayOfWeek: number
  scheduledDate: string
  type: SessionType
  title: string
  targetPaceMinPerKm: number
  targetHRZone: number
  plannedDistanceKm: number
  plannedDurationMin: number
  status: SessionStatus
  feelScore: number | null
  completionNotes: string | null
  completedAt: string | null
  swappedForType: string | null
  adjustmentId: string | null
  createdAt: string
}

// ─── Training Plan ───────────────────────────────────────────────────────────

export interface Phase {
  phaseNumber: number
  name: string
  durationWeeks: number
  focus: string
}

export interface TrainingPlan {
  generatedAt: string
  version: number
  currentPhase: number
  currentWeek: number
  startDate: string
  phases: Phase[]
  vdotAtGeneration: number
  weeklyKmAtGeneration: number
  sessions?: Session[]
}

// ─── Conversation / Message ───────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  tokenCount: number
  detectedPatterns: string[]
  triggeredAdjustmentId: string | null
}

export interface Conversation {
  id: string
  startedAt: string
  lastMessageAt: string
  messageCount: number
  summaryContext: string | null
  messages?: Message[]
}

// ─── Plan Adjustment ──────────────────────────────────────────────────────────

export type AdjustmentStatus = 'pending' | 'accepted' | 'rejected'
export type AdjustmentTrigger = 'athlete' | 'system_timeout'

export interface Change {
  sessionId: string
  field: string
  oldValue: unknown
  newValue: unknown
  rationale: string
}

export interface Adjustment {
  id: string
  proposedChanges: Change[]
  status: AdjustmentStatus
  conversationId: string
  messageIndex: number
  proposedAt: string
  resolvedAt: string | null
  resolvedBy: AdjustmentTrigger | null
}

export interface AdjustmentAction {
  adjustmentId: string
  summary: string
  affectedSessions: string[]
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────────

export type UserNodeType =
  | 'profile'
  | 'goal'
  | 'fitness'
  | 'injury'
  | 'trap'
  | 'pattern'
  | 'completion'

export type UserNodeSource =
  | 'intake'
  | 'coach_detected'
  | 'plan_adjustment'
  | 'session_completion'

export interface Edge {
  targetId: string
  weight: number
}

export interface MasterNode {
  id: string
  topicCluster: string
  title: string
  description: string
  tags: string[]
  edges: Edge[]
  positionX: number
  positionY: number
  positionZ: number
  color: string
}

export interface UserNode {
  id: string
  type: UserNodeType
  label: string
  value: string
  source: UserNodeSource
  masterNodeRefs: string[]
  createdAt: string
  updatedAt: string
  active: boolean
}

// ─── Food ─────────────────────────────────────────────────────────────────────

export type FoodInputType = 'photo' | 'text'

export interface Macros {
  proteinG: number
  carbsG: number
  fatG: number
  calories: number
}

export interface FoodEntry {
  id: string
  inputType: FoodInputType
  rawInput: string
  photoUrl: string | null
  macros: Macros
  loggedAt: string
  estimatedBy: string
  estimateNotes: string
}

// ─── Activity (Garmin) ────────────────────────────────────────────────────────

export interface Activity {
  id: string
  source: 'garmin_csv'
  activityType: string
  title: string
  date: string
  distanceKm: number
  durationSec: number
  avgHR: number | null
  maxHR: number | null
  calories: number | null
  dedupHash: string
  importedAt: string
  importBatchId: string
}

export interface ImportResult {
  importBatchId: string
  imported: number
  skipped: number
  errors: number
  total: number
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'deleted'

export interface Invite {
  email: string
  status: InviteStatus
  addedByAdminId: string
  createdAt: string
  acceptedAt: string | null
  revokedAt: string | null
}

// ─── Global Config ────────────────────────────────────────────────────────────

export interface SpendCaps {
  dailyUSD: number
  monthlyUSD: number
  currentDailyUSD: number
  currentMonthlyUSD: number
  lastDailyReset: string
  lastMonthlyReset: string
}

export interface KillSwitch {
  enabled: boolean
  enabledAt: string | null
  enabledByAdminId: string | null
}

export interface GlobalConfig {
  killSwitch: KillSwitch
  spendCaps: SpendCaps
  weeklyReviewDay: number
  updatedAt: string
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'auth_failure'
  | 'account_deleted'
  | 'data_export'
  | 'admin_action'

export interface AuditEvent {
  eventType: AuditEventType
  timestamp: string
  userId: string | null
  actingAdminId: string | null
  affectedUserId: string | null
  path: string | null
  reason: string | null
  action: string | null
  params: Record<string, unknown> | null
  tablesCleared: string[] | null
}

// ─── Morning Brief ────────────────────────────────────────────────────────────

export interface WeatherContext {
  condition: string
  tempC: number
  feelsLikeC: number
  windKmh: number
  humidity: number
  location: string
}

export interface MorningBrief {
  date: string
  content: string
  session: {
    sessionId: string
    type: SessionType
    title: string
    targetPaceMinPerKm: number
    targetHRZone: number
    plannedDistanceKm: number
  } | null
  weatherContext: WeatherContext | null
  cached: boolean
}

// ─── Review ───────────────────────────────────────────────────────────────────

export type ReviewType = 'post_run' | 'weekly'
export type ReviewTrigger = 'athlete' | 'schedule'

export interface Review {
  id: string
  type: ReviewType
  content: string
  sessionIds: string[]
  weekNumber: number | null
  generatedAt: string
  triggeredBy: ReviewTrigger
}

// ─── Coach Chat ───────────────────────────────────────────────────────────────

export type CoachActionType = 'plan_adjustment' | 'pattern_detected' | 'session_complete'

export interface CoachAction {
  type: CoachActionType
  data: Record<string, unknown>
}

export interface ChatResponse {
  reply: string
  conversationId: string
  actions: CoachAction[]
  remainingMessages: number
  costUSD: number
}

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
  ) {
    super(error)
    this.name = 'ApiError'
  }
}
