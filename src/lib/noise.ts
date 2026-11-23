/**
 * Seeded 2D simplex noise + fbm, for procedural textures drawn on the CPU
 * (topographic contours, dissolve masks). Output of noise2 is roughly -1..1.
 */

const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
] as const

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createNoise(seed = 1) {
  const rand = mulberry32(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = p[i]!
    p[i] = p[j]!
    p[j] = t
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!

  function corner(gi: number, x: number, y: number) {
    const t = 0.5 - x * x - y * y
    if (t < 0) return 0
    const g = GRAD[gi & 7]!
    const t2 = t * t
    return t2 * t2 * (g[0] * x + g[1] * y)
  }

  function noise2(xin: number, yin: number) {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    const n0 = corner(perm[ii + perm[jj]!]!, x0, y0)
    const n1 = corner(perm[ii + i1 + perm[jj + j1]!]!, x1, y1)
    const n2 = corner(perm[ii + 1 + perm[jj + 1]!]!, x2, y2)
    return 70 * (n0 + n1 + n2)
  }

  function fbm(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5) {
    let sum = 0
    let amp = 0.5
    let freq = 1
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise2(x * freq, y * freq)
      freq *= lacunarity
      amp *= gain
    }
    return sum
  }

  return { noise2, fbm }
}
