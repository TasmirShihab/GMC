'use client'

import type { ReactNode } from 'react'

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
  return <stage.In>{children}</stage.In>
}
