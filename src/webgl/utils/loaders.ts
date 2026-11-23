'use client'

import { useGLTF, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { WebGLRenderer } from 'three'
import { KTX2Loader } from 'three-stdlib'

/**
 * Asset loading, all from our own origin (GMCA wants local hosting):
 *   - Draco + Meshopt geometry, KTX2 (Basis) textures inside .glb files
 *   - decoders copied to /public/decoders by scripts/copy-decoders.mjs
 *
 * Source files go in /assets/source, run `pnpm assets:optimize`, load from /models/*.glb.
 */
const DRACO_PATH = '/decoders/draco/'
const BASIS_PATH = '/decoders/basis/'

let ktx2: KTX2Loader | null = null
function getKTX2(gl: WebGLRenderer) {
  if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(gl)
  return ktx2
}

/** Load an optimised .glb. Suspends; wrap the caller in <Suspense>. */
export function useModel(url: string) {
  const gl = useThree((s) => s.gl)
  return useGLTF(url, DRACO_PATH, true, (loader) => {
    loader.setKTX2Loader(getKTX2(gl))
  })
}

/** Warm the cache before a chapter needs it, e.g. preloadModel('/models/masterplan.glb'). */
export function preloadModel(url: string) {
  useGLTF.preload(url, DRACO_PATH, true)
}

export { useTexture }
