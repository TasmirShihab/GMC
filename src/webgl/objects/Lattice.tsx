'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, type InstancedMesh, Object3D } from 'three'

import { CELL_COLOURS, PALETTE } from '../palette'

interface LatticeProps {
  /** Cells per side. */
  n?: number
  cell?: number
  gap?: number
  /** 0..1 how much of the lattice is woven in (cells appear from the centre outward). */
  getFill: () => number
  /** 0..1 how far cells rise into 3D "buildings". */
  getRise: () => number
  seed?: number
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

function mulberry(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The GMC lattice: a square grid turned 45° into diamonds, like the logo, a mandala, a city
 * plan and a weave at once. Empty cells show only their thread outline; filled cells appear from
 * the centre outward and can rise into blocks. Driven entirely by the getters, so chapters, the
 * lab and the CMS (e.g. milestones completed) can all control it.
 */
export function Lattice({ n = 9, cell = 1, gap = 0.1, getFill, getRise, seed = 7 }: LatticeProps) {
  const mesh = useRef<InstancedMesh>(null)
  const count = n * n
  const dummy = useMemo(() => new Object3D(), [])

  const data = useMemo(() => {
    const r = mulberry(seed)
    const half = ((n - 1) * cell) / 2
    const maxD = Math.hypot(half, half)
    const cells = Array.from({ length: count }, (_, i) => {
      const x = (i % n) * cell - half
      const y = Math.floor(i / n) * cell - half
      const d = Math.hypot(x, y) / maxD
      return {
        x,
        y,
        // Fill order: centre first, like a mandala, with a little hand-woven irregularity.
        order: Math.min(0.98, d * 0.8 + r() * 0.2),
        height: 0.35 + Math.pow(r(), 2) * 2.4 * (1.1 - d * 0.6),
        colour: CELL_COLOURS[Math.floor(r() * CELL_COLOURS.length)] ?? PALETTE.cloth,
      }
    })
    return { cells, half }
  }, [n, cell, count, seed])

  const threads = useMemo(() => {
    const g = new BufferGeometry()
    const pts: number[] = []
    const h = data.half + cell / 2
    for (let k = 0; k <= n; k++) {
      const p = -h + k * cell
      pts.push(-h, p, 0, h, p, 0, p, -h, 0, p, h, 0)
    }
    g.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return g
  }, [data.half, cell, n])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const c = new Color()
    data.cells.forEach((cellData, i) => m.setColorAt(i, c.set(cellData.colour)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [data])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const fill = getFill()
    const rise = getRise()
    const size = cell - gap
    for (let i = 0; i < count; i++) {
      const c = data.cells[i]!
      const k = smooth((fill * 1.2 - c.order) / 0.2)
      const h = 0.05 + rise * c.height * k
      dummy.position.set(c.x, c.y, h / 2)
      dummy.scale.set(size * k, size * k, h)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <lineSegments geometry={threads}>
        <lineBasicMaterial color={PALETTE.cloth} transparent opacity={0.28} />
      </lineSegments>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.55} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
