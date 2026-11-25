'use client'

import { Preload, StatsGl, View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, type RefObject } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import { QUALITY, useExperience } from '@/lib/store'

import { StageRender } from './StageRender'
import { stage } from './tunnel'

/**
 * The one WebGL context for the whole site. It lives in the root layout, so it survives route
 * changes, and sits fixed behind the DOM with pointer events passed through from the page.
 *
 * Render order (see renderOrder.ts): the global Stage renders first, then DOM-tracked Views on top.
 */
export default function WebGLCanvas({ eventSource }: { eventSource: RefObject<HTMLElement | null> }) {
  const tier = useExperience((s) => s.tier)
  const debug = useExperience((s) => s.debug)
  // Paused (no frames drawn) while the full-screen 3D map layer covers the page.
  const mapOpen = useExperience((s) => s.mapOpen)
  // Nothing 3D mounted on this page (the home page today): draw only on demand (resize and the like)
  // instead of a blank full-screen frame every 1/60 s, which phones pay for while scrolling.
  const scenes = useExperience((s) => s.scenes)

  // Tier 0 or still profiling: render nothing; the DOM story is complete on its own.
  if (tier === null || tier === 0) return null
  const q = QUALITY[tier]

  return (
    <Canvas
      className="webgl-canvas"
      frameloop={mapOpen ? 'never' : scenes > 0 ? 'always' : 'demand'}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      dpr={q.dpr}
      shadows={q.shadows}
      gl={{
        antialias: q.antialias,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
      }}
      camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 14] }}
    >
      <Suspense fallback={null}>
        <stage.Out />
        <StageRender />
        <View.Port />
        <Preload all />
      </Suspense>
      {debug && <StatsGl className="stats-gl" />}
    </Canvas>
  )
}
