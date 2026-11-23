// Optimises every .glb/.gltf in assets/source/models into public/models:
// dedupe, weld, simplify-safe, meshopt geometry compression, WebP textures resized to ≤2048.
// Usage: pnpm assets:optimize            (all models)
//        pnpm assets:optimize city.glb   (one model)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const SRC = 'assets/source/models'
const OUT = 'public/models'
const only = process.argv[2]

mkdirSync(OUT, { recursive: true })
const files = readdirSync(SRC).filter((f) => ['.glb', '.gltf'].includes(extname(f)) && (!only || f === only))
if (!files.length) {
  console.log(`[assets] nothing to optimise in ${SRC}`)
  process.exit(0)
}

const bin = join('node_modules', '.bin', 'gltf-transform')
if (!existsSync(bin)) throw new Error('gltf-transform not installed: run pnpm install')

for (const f of files) {
  const out = join(OUT, `${basename(f, extname(f))}.glb`)
  console.log(`[assets] ${f} → ${out}`)
  execFileSync(
    bin,
    ['optimize', join(SRC, f), out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '2048'],
    { stdio: 'inherit' },
  )
}
