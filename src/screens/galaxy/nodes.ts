/**
 * galaxy/nodes.ts — Create Three.js mesh objects for graph nodes.
 *
 * Uses window.THREE (Three.js r128 CDN-loaded, not bundled).
 * Types come from @types/three (dev dependency).
 */
import type * as THREE from 'three'
import type { Mesh, Line } from 'three'
import type { NodePosition } from './layout.js'
import { tokens } from '../../design-system/tokens.js'

// Declare window.THREE for runtime access (CDN-loaded)
declare global {
  interface Window {
    THREE: typeof THREE
  }
}

const NODE_TYPE_COLORS: Record<string, number> = {
  concept: 0x1a56db,
  training: 0x0e9f6e,
  race: 0xf59e0b,
  nutrition: 0xef4444,
  fitness: 0x3b82f6,
  profile: 0x1a56db,
  goal: 0xf59e0b,
  injury: 0xef4444,
  trap: 0x94a3b8,
}

export interface GalaxyNode {
  mesh: Mesh
  position: NodePosition
}

export function createNodeMesh(pos: NodePosition): GalaxyNode {
  const T = window.THREE
  const isMaster = pos.type === 'master'

  const radius = isMaster ? 2.5 : 1.0
  const color = NODE_TYPE_COLORS[pos.nodeType] ?? 0x475569

  const geometry = new T.SphereGeometry(radius, isMaster ? 16 : 8, isMaster ? 16 : 8)
  const material = new T.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: isMaster ? 0.3 : 0.5,
    shininess: 60,
    transparent: !isMaster,
    opacity: isMaster ? 1 : pos.active === false ? 0.4 : 0.85,
  })

  const mesh = new T.Mesh(geometry, material)
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.userData = { nodeId: pos.id, nodeType: pos.type, label: pos.label }

  return { mesh, position: pos }
}

export function createEdge(from: NodePosition, to: NodePosition): Line {
  const T = window.THREE
  const points = [
    new T.Vector3(from.x, from.y, from.z),
    new T.Vector3(to.x, to.y, to.z),
  ]
  const geometry = new T.BufferGeometry().setFromPoints(points)
  const material = new T.LineBasicMaterial({
    color: parseInt(tokens.color.text.disabled.replace('#', ''), 16),
    transparent: true,
    opacity: 0.3,
  })
  return new T.Line(geometry, material)
}
