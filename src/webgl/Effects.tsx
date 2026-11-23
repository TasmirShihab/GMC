'use client'

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect } from 'react'

import { RENDER_PRIORITY, renderFlags } from '@/components/canvas/renderOrder'

import { QUALITY, useExperience } from '@/lib/store'

/** Global post-processing for the Stage. Tier-gated: off on light devices. */
export function Effects() {
  const tier = useExperience((s) => s.tier)
  const on = !!tier && QUALITY[tier].postprocessing

  useEffect(() => {
    renderFlags.composer = on
    return () => {
      renderFlags.composer = false
    }
  }, [on])

  if (!on) return null
  return (
    <EffectComposer multisampling={4} renderPriority={RENDER_PRIORITY.stage}>
      <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  )
}
