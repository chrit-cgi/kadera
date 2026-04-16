/**
 * intake-plan.ts — Generate a personalised training plan from an athlete profile.
 *
 * Called by api/intake.ts on the final intake step.
 */
import type { Firestore } from 'firebase-admin/firestore'
import { deriveVdot, getPaceForZone, getHRZones } from '../_lib/vdot.js'
import type { AthleteProfile } from '../../src/types/index.js'

// ── Phase structure ───────────────────────────────────────────────────────────

const PHASE_DEFINITIONS = [
  { phaseNumber: 1, name: 'Base Building', focus: 'Aerobic foundation' },
  { phaseNumber: 2, name: 'Early Development', focus: 'Volume increase + aerobic efficiency' },
  { phaseNumber: 3, name: 'Threshold Development', focus: 'Lactate threshold' },
  { phaseNumber: 4, name: 'Race-Specific 1', focus: 'Race-pace work + VO2max' },
  { phaseNumber: 5, name: 'Race-Specific 2', focus: 'Sharpening + speed' },
  { phaseNumber: 6, name: 'Peak & Taper', focus: 'Maintaining fitness, reducing load' },
  { phaseNumber: 7, name: 'Recovery', focus: 'Active recovery + reflection' },
]

// Sessions per week per phase (training week = 5 sessions, recovery = 3)
const SESSIONS_PER_WEEK = [5, 5, 5, 6, 6, 4, 3]

// Session type distribution per phase (rough template)
type SessionType = 'easy' | 'threshold' | 'vo2max' | 'long_run' | 'recovery' | 'cross_training'

const PHASE_SESSION_TYPES: SessionType[][] = [
  ['easy', 'easy', 'easy', 'long_run', 'recovery'],                           // Phase 1
  ['easy', 'easy', 'threshold', 'long_run', 'recovery'],                      // Phase 2
  ['easy', 'threshold', 'threshold', 'long_run', 'recovery'],                 // Phase 3
  ['easy', 'threshold', 'vo2max', 'long_run', 'recovery', 'easy'],            // Phase 4
  ['easy', 'threshold', 'vo2max', 'long_run', 'recovery', 'easy'],            // Phase 5
  ['easy', 'threshold', 'easy', 'long_run'],                                  // Phase 6
  ['recovery', 'easy', 'recovery'],                                           // Phase 7
]

// ── Plan generation ────────────────────────────────────────────────────────────

interface PlanDocument {
  generatedAt: string
  version: number
  currentPhase: number
  currentWeek: number
  startDate: string
  phases: typeof PHASE_DEFINITIONS
  vdotAtGeneration: number
  weeklyKmAtGeneration: number
}

interface SessionDocument {
  phase: number
  week: number
  dayOfWeek: number
  scheduledDate: string
  type: SessionType | 'race'
  title: string
  targetPaceMinPerKm: number
  targetHRZone: number
  plannedDistanceKm: number
  plannedDurationMin: number
  status: 'planned'
  feelScore: null
  completionNotes: null
  completedAt: null
  swappedForType: null
  adjustmentId: null
  createdAt: string
}

function sessionTitle(type: SessionType, distKm: number): string {
  const map: Record<SessionType, string> = {
    easy: `Easy Run ${distKm}km`,
    threshold: `Threshold Run ${distKm}km`,
    vo2max: `VO2max Intervals ${distKm}km`,
    long_run: `Long Run ${distKm}km`,
    recovery: `Recovery Run ${distKm}km`,
    cross_training: `Cross Training`,
  }
  return map[type]
}

function hrZoneForSessionType(type: SessionType): number {
  const map: Record<SessionType, number> = {
    easy: 2,
    threshold: 4,
    vo2max: 5,
    long_run: 3,
    recovery: 1,
    cross_training: 2,
  }
  return map[type]
}

function paceZoneForSessionType(type: SessionType): Parameters<typeof getPaceForZone>[1] {
  const map: Record<SessionType, Parameters<typeof getPaceForZone>[1]> = {
    easy: 'easy',
    threshold: 'threshold',
    vo2max: 'interval',
    long_run: 'marathon',
    recovery: 'easy',
    cross_training: 'easy',
  }
  return map[type]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Exports ───────────────────────────────────────────────────────────────────

export interface GeneratedPlan {
  plan: PlanDocument
  sessions: SessionDocument[]
}

export function generatePlan(profile: AthleteProfile): GeneratedPlan {
  const vdot =
    profile.vdot ||
    deriveVdot(profile.mostRecentRaceDistanceKm, profile.mostRecentRaceTimeSec)

  const startDate = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const weeklyKm = profile.currentWeeklyKm

  const plan: PlanDocument = {
    generatedAt: now,
    version: 1,
    currentPhase: 1,
    currentWeek: 1,
    startDate,
    phases: PHASE_DEFINITIONS.map((p) => ({ ...p, durationWeeks: 4 })),
    vdotAtGeneration: vdot,
    weeklyKmAtGeneration: weeklyKm,
  }

  const sessions: SessionDocument[] = []
  let dayOffset = 0

  for (let phaseIdx = 0; phaseIdx < 7; phaseIdx++) {
    const phase = phaseIdx + 1
    const sessionTypes = PHASE_SESSION_TYPES[phaseIdx]
    const sessionsPerWeek = SESSIONS_PER_WEEK[phaseIdx]

    // 4 weeks per phase (3 training + 1 recovery)
    for (let week = 1; week <= 4; week++) {
      const isRecoveryWeek = week === 4
      const volumeMultiplier = isRecoveryWeek ? 0.6 : 1 + (week - 1) * 0.05
      const weeklyTarget = weeklyKm * volumeMultiplier

      // Distribute volume across sessions in the week
      const weekTypes = sessionTypes.slice(0, sessionsPerWeek)

      weekTypes.forEach((type, sessionIdx) => {
        const dayOfWeek = Math.floor((sessionIdx / sessionsPerWeek) * 7) + 1 // Spread across week

        // Volume per session (long run gets ~35%, easy gets remaining split)
        let distKm: number
        if (type === 'long_run') {
          distKm = Math.round(weeklyTarget * 0.35 * 10) / 10
        } else if (type === 'recovery') {
          distKm = Math.round(weeklyTarget * 0.08 * 10) / 10
        } else {
          distKm = Math.round((weeklyTarget * 0.57) / Math.max(weekTypes.filter((t) => t !== 'long_run' && t !== 'recovery').length, 1) * 10) / 10
        }

        distKm = Math.max(3, distKm) // Minimum 3km

        const paceZone = paceZoneForSessionType(type)
        const paceSec = getPaceForZone(vdot, paceZone)
        const durationMin = Math.round((distKm * paceSec) / 60)

        const scheduledDate = addDays(startDate, dayOffset + (dayOfWeek - 1))

        sessions.push({
          phase,
          week,
          dayOfWeek,
          scheduledDate,
          type: isRecoveryWeek && type !== 'recovery' ? 'recovery' : type,
          title: sessionTitle(isRecoveryWeek && type !== 'recovery' ? 'recovery' : type, distKm),
          targetPaceMinPerKm: paceSec,
          targetHRZone: hrZoneForSessionType(type),
          plannedDistanceKm: distKm,
          plannedDurationMin: durationMin,
          status: 'planned',
          feelScore: null,
          completionNotes: null,
          completedAt: null,
          swappedForType: null,
          adjustmentId: null,
          createdAt: now,
        })
      })

      dayOffset += 7
    }
  }

  return { plan, sessions }
}

export async function writePlanToFirestore(
  db: Firestore,
  uid: string,
  plan: PlanDocument,
  sessions: SessionDocument[],
): Promise<void> {
  const userRef = db.collection('users').doc(uid)
  const planRef = userRef.collection('plan').doc('current')

  // Write plan metadata
  await planRef.set(plan)

  // Write sessions in batches of 450
  const BATCH_SIZE = 450
  for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const slice = sessions.slice(i, i + BATCH_SIZE)
    for (const session of slice) {
      const ref = userRef.collection('sessions').doc()
      batch.set(ref, session)
    }
    await batch.commit()
  }
}
