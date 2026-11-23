'use client'

import { PerspectiveCamera, View } from '@react-three/drei'
import type { CSSProperties, ReactNode } from 'react'

import { RENDER_PRIORITY } from './renderOrder'

interface SectionViewProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Camera z distance (ignored when `position` is given). */
  distance?: number
  /** Explicit camera position, e.g. [12, 12, 12] for an angled view of a flat scene. */
  position?: [number, number, number]
  fov?: number
}

/**
 * 3D that is laid out by the DOM: the view tracks this element's box and renders its own scene
 * and camera into the shared canvas (scissored). Good for project cards, sector panels, inline models.
 * Each view is a separate scene, so global post-processing does not apply to it.
 */
export function SectionView({ children, className, style, distance = 6, position, fov = 35 }: SectionViewProps) {
  return (
    <View className={className} style={style} index={RENDER_PRIORITY.views}>
      <PerspectiveCamera makeDefault position={position ?? [0, 0, distance]} fov={fov} />
      {children}
    </View>
  )
}
