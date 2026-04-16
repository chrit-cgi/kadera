/**
 * galaxy/scene.ts — Set up the Three.js scene, camera, renderer, and animation loop.
 *
 * Exported `initScene` returns controls for the Galaxy React component.
 * Uses window.THREE (CDN-loaded r128).
 */

import type * as ThreeTypes from 'three'
import type { NodePosition } from './layout.js'
import { createNodeMesh, createEdge } from './nodes.js'
import type { UserNode } from '../../types/index.js'

// THREE is on window — global augmentation declared in nodes.ts (re-exported via window.THREE)

export interface SceneControls {
  dispose: () => void
  focusNode: (id: string) => void
}

export function initScene(
  canvas: HTMLCanvasElement,
  positions: NodePosition[],
  userNodes: UserNode[],
  onNodeClick: (nodeId: string, label: string) => void,
): SceneControls {
  const THREE = window.THREE

  // ── Scene setup ────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f172a) // surface.base
  scene.fog = new THREE.FogExp2(0x0f172a, 0.004)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
  camera.position.set(0, 0, 200)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)

  // ── Lighting ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(1, 1, 1)
  scene.add(dirLight)

  // ── Star field background ──────────────────────────────────────────────────
  const starGeo = new THREE.BufferGeometry()
  const starCount = 800
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount * 3; i++) starPositions[i] = (Math.random() - 0.5) * 800
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.5, transparent: true, opacity: 0.6 })
  scene.add(new THREE.Points(starGeo, starMat))

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodeMap = new Map<string, ThreeTypes.Mesh>()
  const masterPositions = positions.filter((p) => p.type === 'master')
  const userPositions = positions.filter((p) => p.type === 'user')

  for (const pos of positions) {
    const { mesh } = createNodeMesh(pos)
    scene.add(mesh)
    nodeMap.set(pos.id, mesh)
  }

  // ── Edges: user → master ───────────────────────────────────────────────────
  const masterPosById = new Map(masterPositions.map((p) => [p.id, p]))
  for (const uNode of userNodes) {
    const uPos = userPositions.find((p) => p.id === uNode.id)
    if (!uPos) continue
    const refId = uNode.masterNodeRefs?.[0]
    if (!refId) continue
    const mPos = masterPosById.get(refId)
    if (!mPos) continue
    scene.add(createEdge(uPos, mPos))
  }

  // ── Orbit controls (manual drag) ───────────────────────────────────────────
  let isDragging = false
  let prevX = 0
  let prevY = 0
  let rotX = 0
  let rotY = 0

  function onPointerDown(e: PointerEvent) {
    isDragging = true
    prevX = e.clientX
    prevY = e.clientY
  }
  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return
    const dx = e.clientX - prevX
    const dy = e.clientY - prevY
    rotY += dx * 0.005
    rotX += dy * 0.005
    prevX = e.clientX
    prevY = e.clientY
  }
  function onPointerUp() { isDragging = false }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)

  // ── Click to select ────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  function onCanvasClick(e: MouseEvent) {
    if (isDragging) return
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const meshes = Array.from(nodeMap.values())
    const intersects = raycaster.intersectObjects(meshes)
    if (intersects.length > 0) {
      const hit = intersects[0].object
      const { nodeId, label } = hit.userData as { nodeId: string; label: string }
      if (nodeId) onNodeClick(nodeId, label)
    }
  }
  canvas.addEventListener('click', onCanvasClick)

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    camera.position.z = Math.max(50, Math.min(400, camera.position.z + e.deltaY * 0.1))
  }
  canvas.addEventListener('wheel', onWheel, { passive: true })

  // ── Resize observer ────────────────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(() => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })
  resizeObserver.observe(canvas)

  // ── Animation loop ─────────────────────────────────────────────────────────
  let animFrameId: number
  const pivot = new THREE.Object3D()
  scene.add(pivot)

  function animate() {
    animFrameId = requestAnimationFrame(animate)
    // Apply manual rotation
    scene.rotation.x += (rotX - scene.rotation.x) * 0.05
    scene.rotation.y += (rotY - scene.rotation.y) * 0.05
    rotX *= 0.95
    rotY *= 0.95
    // Gentle auto-rotate when not dragging
    if (!isDragging) scene.rotation.y += 0.0005
    renderer.render(scene, camera)
  }
  animate()

  // ── Exports ────────────────────────────────────────────────────────────────
  function focusNode(id: string) {
    const mesh = nodeMap.get(id)
    if (!mesh) return
    // Animate camera toward the node (simple direct set for now)
    const target = mesh.position.clone()
    camera.position.set(target.x, target.y, target.z + 30)
    camera.lookAt(target)
  }

  function dispose() {
    cancelAnimationFrame(animFrameId)
    renderer.dispose()
    resizeObserver.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('click', onCanvasClick)
    canvas.removeEventListener('wheel', onWheel)
    // Suppress unused variable warning
    void pivot
  }

  return { dispose, focusNode }
}
