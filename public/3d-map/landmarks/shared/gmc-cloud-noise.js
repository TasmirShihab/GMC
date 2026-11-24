// ─────────────────────────────────────────────────────────────────────────────
// GMC clouds · noise volumes (no three.js, no DOM): the 128³ Perlin-Worley base, the 64³ Worley
// detail and the 256² weather map as plain byte arrays. Split out of gmc-clouds.js (1.3.0) so a
// Web Worker (gmc-cloud-noise-worker.js) can build them off the main thread.
// ─────────────────────────────────────────────────────────────────────────────
import { createNoise, SEED } from './gmc-recipes.js';

function hash3(x, y, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
const wrap = (i, n) => ((i % n) + n) % n;
/** Tileable Worley with feature points precomputed per cell (fast). Returns f(px,py,pz) in 0..1 (1 = at a point). */
function makeWorley(cells, seed) {
  const pts = new Float32Array(cells ** 3 * 3);
  for (let z = 0; z < cells; z++) for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const i = ((z * cells + y) * cells + x) * 3; pts[i] = hash3(x, y, z, seed); pts[i + 1] = hash3(x, y, z, seed + 1); pts[i + 2] = hash3(x, y, z, seed + 2);
  }
  return (px, py, pz) => {
    const x = px * cells, y = py * cells, z = pz * cells, xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let md = 9;
    for (let dz = -1; dz <= 1; dz++) { const cz = zi + dz, wz = wrap(cz, cells);
      for (let dy = -1; dy <= 1; dy++) { const cy = yi + dy, wy = wrap(cy, cells);
        for (let dx = -1; dx <= 1; dx++) { const cx = xi + dx, i = ((wz * cells + wy) * cells + wrap(cx, cells)) * 3;
          const fx = cx + pts[i] - x, fy = cy + pts[i + 1] - y, fz = cz + pts[i + 2] - z, d = fx * fx + fy * fy + fz * fz; if (d < md) md = d; } } }
    return 1 - Math.min(Math.sqrt(md), 1);
  };
}
function vnoise(px, py, pz, f, seed) {
  const x = px * f, y = py * f, z = pz * f, xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = x - xi, v = y - yi, w = z - zi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
  const h = (a, b, c) => hash3(wrap(a, f), wrap(b, f), wrap(c, f), seed), l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), su), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), su), sv),
           l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), su), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), su), sv), sw);
}

/** All three volumes as Uint8Arrays. onProgress(0..1) is called as slices finish. */
export function cloudNoiseData({ size = 128, detail = 64, onProgress = () => {} } = {}) {
  const base = new Uint8Array(size ** 3), det = new Uint8Array(detail ** 3);
  const w4 = makeWorley(4, SEED + 3), w8 = makeWorley(8, SEED + 5), w16 = makeWorley(16, SEED + 7);
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = x / size, py = y / size, pz = z / size;
      const pf = vnoise(px, py, pz, 4, SEED) * .5 + vnoise(px, py, pz, 8, SEED + 9) * .27 + vnoise(px, py, pz, 16, SEED + 17) * .15 + vnoise(px, py, pz, 32, SEED + 23) * .08;
      const wf = w4(px, py, pz) * .6 + w8(px, py, pz) * .28 + w16(px, py, pz) * .12;
      const pw = Math.min(1, Math.max(0, (pf - (wf - 1)) / (2 - wf)));        // Perlin-Worley
      base[(z * size + y) * size + x] = Math.round(Math.min(1, Math.max(0, (pw - .36) * 1.95)) * 255);
    }
    if (z % 8 === 7) onProgress((z + 1) / size * .8);
  }
  const d4 = makeWorley(4, SEED + 31), d8 = makeWorley(8, SEED + 37), d16 = makeWorley(16, SEED + 41), d32 = makeWorley(32, SEED + 43);
  for (let z = 0; z < detail; z++) {
    for (let y = 0; y < detail; y++) for (let x = 0; x < detail; x++) {
      const px = x / detail, py = y / detail, pz = z / detail;
      det[(z * detail + y) * detail + x] = Math.round((d4(px, py, pz) * .45 + d8(px, py, pz) * .3 + d16(px, py, pz) * .17 + d32(px, py, pz) * .08) * 255);
    }
    if (z % 8 === 7) onProgress(.8 + (z + 1) / detail * .15);
  }
  // 2D weather (coverage) map, tileable; G channel = cirrus streaks
  const N = createNoise(SEED + 101), W = 256, weather = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, i = (y * W + x) * 4;
    weather[i] = Math.round(Math.min(1, Math.max(0, .5 + N.tfbm(u, v, 3, 3, 4) * 1.25 + N.tfbm(u, v, 9, 9, 2) * .25)) * 255);
    weather[i + 1] = Math.round(Math.min(1, Math.max(0, .45 + N.tfbm(u, v, 2, 12, 4) * 1.6)) * 255);   // stretched: wispy cirrus bands
    weather[i + 3] = 255;
  }
  onProgress(1);
  return { size, detail, base, det, weather };
}
