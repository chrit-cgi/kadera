import { useEffect, useRef, useState } from 'react'
import { useGraphStore } from '../stores/graph-store.js'
import { computeLayout } from './galaxy/layout.js'
import { initScene } from './galaxy/scene.js'
import type { SceneControls } from './galaxy/scene.js'
import { tokens } from '../design-system/tokens.js'

export default function Galaxy() {
  const { masterNodes, userNodes, isLoading, error, fetchGraph } = useGraphStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneControls | null>(null)
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string } | null>(null)
  const [threeReady, setThreeReady] = useState(typeof window !== 'undefined' && !!window.THREE)

  // Ensure Three.js is loaded (CDN)
  useEffect(() => {
    if (window.THREE) {
      setThreeReady(true)
      return
    }
    const interval = setInterval(() => {
      if (window.THREE) {
        setThreeReady(true)
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    void fetchGraph()
  }, [fetchGraph])

  useEffect(() => {
    if (!threeReady || !canvasRef.current || masterNodes.length === 0) return

    const positions = computeLayout(masterNodes, userNodes)

    sceneRef.current = initScene(
      canvasRef.current,
      positions,
      userNodes,
      (id, label) => setSelectedNode({ id, label }),
    )

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [threeReady, masterNodes, userNodes])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0f172a' }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />

      {/* Overlay header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: `${tokens.space[4]} ${tokens.space[4]}`,
          background: 'linear-gradient(to bottom, rgba(15,23,42,0.8) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: tokens.font.size.xl,
            fontWeight: tokens.font.weight.bold,
            color: tokens.color.text.primary,
            fontFamily: tokens.font.family.heading,
          }}
        >
          Knowledge Galaxy
        </div>
        <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
          {masterNodes.length} concepts · {userNodes.length} personal insights
        </div>
      </div>

      {/* Loading */}
      {(isLoading || !threeReady) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
          }}
        >
          {!threeReady ? 'Loading 3D engine…' : 'Loading graph…'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: '5rem',
            left: tokens.space[4],
            right: tokens.space[4],
            padding: tokens.space[3],
            background: `${tokens.color.feedback.error}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.feedback.error,
            fontSize: tokens.font.size.sm,
          }}
        >
          {error}
        </div>
      )}

      {/* Selected node tooltip */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            bottom: '6rem',
            left: tokens.space[4],
            right: tokens.space[4],
          }}
        >
          <div
            style={{
              background: tokens.color.surface.raised,
              borderRadius: tokens.radius.lg,
              padding: tokens.space[4],
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.bold }}>
                {selectedNode.label}
              </div>
              <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.secondary }}>
                {selectedNode.id}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: tokens.color.text.secondary,
                cursor: 'pointer',
                fontSize: tokens.font.size.lg,
                padding: tokens.space[1],
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      {masterNodes.length > 0 && !selectedNode && (
        <div
          style={{
            position: 'absolute',
            bottom: '6rem',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: tokens.color.text.disabled,
            fontSize: tokens.font.size.xs,
            pointerEvents: 'none',
          }}
        >
          Drag to rotate · Pinch/scroll to zoom · Tap a node to explore
        </div>
      )}
    </div>
  )
}
