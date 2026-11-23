'use client'

import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import { useEffect } from 'react'

import { SectionView } from '@/components/canvas/SectionView'
import { useExperience } from '@/lib/store'
import { Lattice } from '@/webgl/objects/Lattice'
import { PALETTE } from '@/webgl/palette'

function LabContent() {
  const { fill, rise, n, gap } = useControls('Lattice', {
    fill: { value: 0.6, min: 0, max: 1, step: 0.01 },
    rise: { value: 0.5, min: 0, max: 1, step: 0.01 },
    n: { value: 9, min: 3, max: 25, step: 2 },
    gap: { value: 0.1, min: 0, max: 0.4, step: 0.01 },
  })
  return (
    <>
      <color attach="background" args={[PALETTE.ink]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 8, 10]} intensity={1.6} color={PALETTE.gold} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 8]} scale={[10, 4, 1]} color={PALETTE.cloth} />
      </Environment>
      <group rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <Lattice key={n} n={n} gap={gap} getFill={() => fill} getRise={() => rise} />
      </group>
      <Grid args={[40, 40]} position={[0, -0.01, 0]} cellColor="#2a2621" sectionColor="#3a342d" fadeDistance={40} />
      <OrbitControls makeDefault enableDamping />
    </>
  )
}

export function LabScene() {
  // The lab always shows the Leva panel and GPU stats.
  useEffect(() => {
    useExperience.setState({ debug: true })
  }, [])

  return (
    <SectionView style={{ position: 'absolute', inset: 0 }} position={[12, 11, 12]} fov={35}>
      <LabContent />
    </SectionView>
  )
}
