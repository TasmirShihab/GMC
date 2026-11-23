'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useRef } from 'react'
import { Color, type Group } from 'three'

import { DAMP } from '@/lib/motion'
import { getChapterProgress, pointer } from '@/lib/scroll'
import { useExperience } from '@/lib/store'

import { Effects } from '../Effects'
import { Lattice } from '../objects/Lattice'
import { PALETTE } from '../palette'

/**
 * PROOF SCENE for the environment, not final art direction.
 * Shows the full pipeline: chapter scroll progress → damped 3D choreography → post-processing.
 *
 *   arrival    the mark, mostly empty threads: the city is beginning
 *   what       tilts back into a plan; cells rise into blocks: the mark becomes a city
 *   happening  the weave fills in: progress
 *   take-part  camera pulls back, the whole city in view
 */
export function LatticeWorld() {
  const world = useRef<Group>(null)
  const reducedMotion = useExperience((s) => s.reducedMotion)
  const state = useRef({ fill: 0.12, rise: 0 })

  useFrame(({ camera }, dt) => {
    const g = world.current
    if (!g) return
    const what = getChapterProgress('what')
    const happening = getChapterProgress('happening')
    const takePart = getChapterProgress('take-part')

    const targetFill = 0.12 + 0.28 * what + 0.6 * happening
    const targetRise = Math.min(1, what * 1.4)
    easing.damp(state.current, 'fill', targetFill, DAMP.object, dt)
    easing.damp(state.current, 'rise', targetRise, DAMP.object, dt)

    // Tilt from facing camera (a mark) to lying back (a plan).
    const tilt = -1.05 * Math.min(1, what * 1.2)
    easing.dampE(g.rotation, [tilt, 0, Math.PI / 4], DAMP.camera, dt)
    easing.damp3(g.position, [what > 0 ? 1.6 * (1 - takePart) : 0, -0.6 * what, 0], DAMP.camera, dt)

    const px = reducedMotion ? 0 : pointer.x * 0.6
    const py = reducedMotion ? 0 : pointer.y * 0.4
    // Far enough on arrival to read the whole mark; closer once it becomes a city.
    const z = 26 - 12 * Math.min(1, what * 1.2) + 5 * takePart
    easing.damp3(camera.position, [px, py + 2.5 * takePart, z], DAMP.camera, dt)
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <color attach="background" args={[new Color(PALETTE.ink)]} />
      <fog attach="fog" args={[PALETTE.ink, 30, 60]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 10]} intensity={1.6} color={PALETTE.gold} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 8]} scale={[10, 4, 1]} color={PALETTE.cloth} />
        <Lightformer form="ring" intensity={1.2} position={[-6, -2, 4]} scale={4} color={PALETTE.terracotta} />
      </Environment>
      <group ref={world}>
        <Lattice getFill={() => state.current.fill} getRise={() => state.current.rise} />
      </group>
      <Effects />
    </>
  )
}
