// Copies the Draco + Basis (KTX2) decoders and GPU benchmarks from three into /public so 3D assets
// decode from our own origin. GMCA wants local hosting, so no CDN dependency.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const libs = join(process.cwd(), 'node_modules/three/examples/jsm/libs')
const targets = [
  [join(libs, 'draco/gltf'), 'public/decoders/draco'],
  [join(libs, 'basis'), 'public/decoders/basis'],
  // GPU benchmark data for detect-gpu (quality tiers), served locally.
  [join(process.cwd(), 'node_modules/detect-gpu/dist/benchmarks'), 'public/decoders/gpu-benchmarks'],
]

for (const [src, to] of targets) {
  if (!existsSync(src)) continue
  mkdirSync(to, { recursive: true })
  cpSync(src, to, { recursive: true })
}
console.log('[decoders] draco, basis and gpu benchmarks copied to public/decoders')
