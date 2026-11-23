'use client'

import { useFrame } from '@react-three/fiber'

import { RENDER_PRIORITY, renderFlags } from './renderOrder'

/**
 * Renders the global stage scene each frame, unless the EffectComposer is already doing it.
 *
 * drei's <View> sets the GL viewport/scissor to its own box and does not restore the viewport,
 * so before anything full-screen renders we reset it to the whole canvas (priority 0.5 runs
 * before the stage at 1 and the views at 2).
 */
export function StageRender() {
  useFrame(({ gl, size }) => {
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
  }, RENDER_PRIORITY.reset)

  useFrame(({ gl, scene, camera }) => {
    if (renderFlags.composer) return
    gl.autoClear = true
    gl.render(scene, camera)
  }, RENDER_PRIORITY.stage)

  return null
}
