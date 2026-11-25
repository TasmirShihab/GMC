'use client'

import { type ReactNode, useEffect } from 'react'

import { useExperience } from '@/lib/store'

import { stage } from './tunnel'

/**
 * Put 3D into the global, full-screen world from any DOM component:
 *
 *   <Stage><LatticeWorld /></Stage>
 *
 * Use the Stage for the continuous, scroll-choreographed world (one camera, one scene,
 * post-processing). Use <SectionView> instead for 3D that lives inside a DOM box (a card, a panel).
 */
export function Stage({ children }: { children: ReactNode }) {
  useSceneMounted()
  return <stage.In>{children}</stage.In>
}

/** Registers a mounted 3D piece, so the shared canvas keeps drawing while it is on the page. */
export function useSceneMounted() {
  useEffect(() => {
    const { addScene, removeScene } = useExperience.getState()
    addScene()
    return removeScene
  }, [])
}
