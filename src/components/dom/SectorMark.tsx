'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

import { SectionView } from '@/components/canvas/SectionView'
import { Lattice } from '@/webgl/objects/Lattice'

function Spinning() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.4
  })
  return (
    <group ref={g} rotation={[0, 0, Math.PI / 4]}>
      <Lattice n={3} getFill={() => 1} getRise={() => 0.5} seed={3} />
    </group>
  )
}

/** Proof of the SectionView pattern: a 3D object laid out by a DOM box, in the shared canvas. */
export function SectorMark({ className }: { className?: string }) {
  return (
    <SectionView className={className} distance={7}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <Spinning />
    </SectionView>
  )
}
