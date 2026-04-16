/**
 * intake-graph.ts — Initialise the athlete's personal knowledge graph at intake completion.
 *
 * Creates nodes in users/{uid}/userGraph for: profile, goal, fitness, injury, and trap data.
 */
import type { Firestore } from 'firebase-admin/firestore'
import type { AthleteProfile } from '../../src/types/index.js'

interface UserGraphNode {
  type: 'profile' | 'goal' | 'fitness' | 'injury' | 'trap'
  label: string
  value: string
  source: 'intake'
  masterNodeRefs: string[]
  createdAt: string
  updatedAt: string
  active: boolean
}

// Master node ID hints — these are best-effort references to well-known clusters.
// Actual IDs come from the seeded masterGraph collection.
const MASTER_NODE_HINTS: Record<string, string[]> = {
  profile: ['runner-identity', 'athlete-profile'],
  goal: ['race-goals', 'marathon-preparation', 'target-setting'],
  fitness: ['vdot', 'training-zones', 'aerobic-fitness'],
  injury: ['injury-prevention', 'injury-management'],
  trap: ['behavioural-patterns', 'mental-performance'],
}

export async function initUserGraph(
  db: Firestore,
  uid: string,
  profile: AthleteProfile,
): Promise<void> {
  const graphRef = db.collection('users').doc(uid).collection('userGraph')
  const now = new Date().toISOString()

  const nodes: UserGraphNode[] = []

  // Profile nodes
  nodes.push({
    type: 'profile',
    label: 'Athlete name',
    value: profile.name,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.profile,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  nodes.push({
    type: 'profile',
    label: 'Body weight',
    value: `${profile.weightKg}kg`,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.profile,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  // Goal nodes
  nodes.push({
    type: 'goal',
    label: 'Target race',
    value: profile.targetRace,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.goal,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  nodes.push({
    type: 'goal',
    label: 'Target finish time',
    value: formatTime(profile.targetFinishTimeSec),
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.goal,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  nodes.push({
    type: 'goal',
    label: 'Target race date',
    value: profile.targetDate,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.goal,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  // Fitness nodes
  nodes.push({
    type: 'fitness',
    label: 'VDOT',
    value: String(profile.vdot),
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.fitness,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  nodes.push({
    type: 'fitness',
    label: 'Max heart rate',
    value: `${profile.maxHR} bpm`,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.fitness,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  nodes.push({
    type: 'fitness',
    label: 'Weekly training volume',
    value: `${profile.currentWeeklyKm} km/week`,
    source: 'intake',
    masterNodeRefs: MASTER_NODE_HINTS.fitness,
    createdAt: now,
    updatedAt: now,
    active: true,
  })

  // Injury nodes (one per injury)
  for (const injury of profile.activeInjuries) {
    if (!injury.trim()) continue
    nodes.push({
      type: 'injury',
      label: 'Active injury',
      value: injury,
      source: 'intake',
      masterNodeRefs: MASTER_NODE_HINTS.injury,
      createdAt: now,
      updatedAt: now,
      active: true,
    })
  }

  // Trap nodes (one per behavioural pattern)
  for (const trap of profile.behaviouralTraps) {
    if (!trap.trim()) continue
    nodes.push({
      type: 'trap',
      label: 'Behavioural pattern',
      value: trap,
      source: 'intake',
      masterNodeRefs: MASTER_NODE_HINTS.trap,
      createdAt: now,
      updatedAt: now,
      active: true,
    })
  }

  // Batch write all nodes
  const BATCH_SIZE = 450
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = db.batch()
    for (const node of nodes.slice(i, i + BATCH_SIZE)) {
      batch.set(graphRef.doc(), node)
    }
    await batch.commit()
  }
}

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}
