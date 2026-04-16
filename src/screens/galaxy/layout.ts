/**
 * galaxy/layout.ts — Compute 3D positions for graph nodes.
 *
 * Uses a force-directed layout approximation: master nodes placed on a sphere
 * shell, user nodes clustered near their connected master nodes.
 */
import type { MasterNode, UserNode } from '../../types/index.js'

export interface NodePosition {
  id: string
  x: number
  y: number
  z: number
  type: 'master' | 'user'
  label: string
  nodeType: string
  active?: boolean
}

const MASTER_RADIUS = 80
const USER_RADIUS_SPREAD = 25

/** Fibonacci sphere for even point distribution on a sphere */
function fibonacciSphere(count: number, radius: number): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    })
  }
  return points
}

export function computeLayout(
  masterNodes: MasterNode[],
  userNodes: UserNode[],
): NodePosition[] {
  const positions: NodePosition[] = []

  // Place master nodes on a Fibonacci sphere
  const masterPositions = fibonacciSphere(
    Math.max(masterNodes.length, 1),
    MASTER_RADIUS,
  )

  const masterPosMap = new Map<string, { x: number; y: number; z: number }>()

  masterNodes.forEach((node, i) => {
    const pos = masterPositions[i] ?? { x: 0, y: 0, z: 0 }
    masterPosMap.set(node.id, pos)
    positions.push({
      id: node.id,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      type: 'master',
      label: node.title,
      nodeType: node.topicCluster ?? 'concept',
    })
  })

  // Place user nodes near their first masterNodeRef
  userNodes.forEach((node, i) => {
    const refId = node.masterNodeRefs?.[0] ?? ''
    const anchor = masterPosMap.get(refId) ?? { x: 0, y: 0, z: 0 }

    // Deterministic offset using index
    const angle = (i / Math.max(userNodes.length, 1)) * Math.PI * 2
    const offset = USER_RADIUS_SPREAD
    const x = anchor.x + Math.cos(angle) * offset
    const y = anchor.y + ((i % 3) - 1) * 8
    const z = anchor.z + Math.sin(angle) * offset

    positions.push({
      id: node.id,
      x,
      y,
      z,
      type: 'user',
      label: node.label,
      nodeType: node.type,
      active: node.active,
    })
  })

  return positions
}
