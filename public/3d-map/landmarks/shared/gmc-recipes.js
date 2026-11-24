// ─────────────────────────────────────────────────────────────────────────────
// GMC kit · texture recipes (no three.js, no DOM required)
// The kit's colour tokens, seeded noise and procedural texture recipes, split out of
// gmc-kit.js (1.9.0) so they can run in Web Workers (gmc-textures-worker.js) as well
// as on the page. gmc-kit.js re-exports everything here: import from 'gmc-kit' as before.
// Canvases are <canvas> on a page and OffscreenCanvas in a worker (makeCanvas).
// ─────────────────────────────────────────────────────────────────────────────
export const SEED = 1337;

// ═════════════════════════════════════════════════════════════ 1. TOKENS ════
// design.md §2. Core tokens are Yoeja's exact CSS values; the rest are derived.
export const TOKENS = Object.freeze({
  // core (Yoeja)
  night: 0x0b0e18, umber: 0x18130f, umberEarth: 0x221208, umberDeep: 0x180c05,
  maroon: 0x6d0033, saffron: 0xfe6417, marigold: 0xffb978, honey: 0xffc450,
  glowCream: 0xfff3dc, sand: 0xefece6, stone: 0x7a736a, forest: 0x2f4a38,
  sky: 0x0081c4, skyLight: 0x7cc8f2,
  // materials (derived from BIG renders)
  timberCedar: 0x8a5a3c, timberDark: 0x5e4130, bamboo: 0xc9a46a, slateRoof: 0x3a3b40,
  canopyMid: 0x3e5a3a, canopyLight: 0x6e8a4c, paddyYoung: 0xa9b865, paddyGold: 0xc8b46a,
  paddyWater: 0x5e7f86, riverWater: 0x2c5560, gravel: 0xb8b0a2, mist: 0xc9cfd6,
  textileMadder: 0x9c2f3a, textileSlate: 0x4a5c7a, textileRose: 0xc98a86, textileCharcoal: 0x2b2a31,
  // Temple-Dam face, sampled from the user's dam references (1.3.0)
  textileVermilion: 0xd4532f, textileApricot: 0xe58a5e, textilePeach: 0xedb38e, textileCream: 0xf1d2ae,
  textileSky: 0x9cb2bf, textileNavy: 0x34435a, textileAsh: 0x8d8b88,
  gold: 0xf0c86a,
  // prayer flags (traditional order)
  flagBlue: 0x2e5fa8, flagWhite: 0xf4f1ea, flagRed: 0xb8322a, flagGreen: 0x3e8e4e, flagYellow: 0xe8b931,
});
// Yoeja's warm glow ramp, light → deep. The ONLY colours allowed in emissive gradients.
export const GLOW_RAMP = Object.freeze([0xfff8ec, 0xfff3dc, 0xffd28c, 0xffc450, 0xffaa3c, 0xfe7828]);

/** A 2D canvas that works on a page (<canvas>) and in a worker (OffscreenCanvas). */
export function makeCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}

// ═════════════════════════════════════════════════════ 3. NOISE + CANVAS ════
export function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/**
 * Seeded value noise. noise(x,y,px,py) tiles with period px/py when given.
 * tfbm(u,v,fx,fy,oct) is fbm over the unit square that tiles seamlessly
 * (fx, fy must be integers). fbm(x,y,oct) is the skill's plain fbm.
 */
export function createNoise(seed = SEED) {
  const rnd = mulberry(seed), perm = new Uint16Array(512), grad = new Float32Array(256);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) grad[i] = rnd() * 2 - 1;
  const lat = (x, y, px, py) => {
    if (px) x = ((x % px) + px) % px;
    if (py) y = ((y % py) + py) % py;
    return grad[perm[(x & 255) + perm[y & 255]]];
  };
  function noise(x, y, px = 0, py = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = lat(xi, yi, px, py), b = lat(xi + 1, yi, px, py), c = lat(xi, yi + 1, px, py), d = lat(xi + 1, yi + 1, px, py);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
  function tfbm(u, v, fx, fy, o = 4) {
    let s = 0, a = .5, f = 1;
    for (let i = 0; i < o; i++) { s += a * noise(u * fx * f + i * 31.7, v * fy * f + i * 11.3, fx * f, fy * f); f *= 2; a *= .5; }
    return s;
  }
  const hash = (a, b = 0) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + seed, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  return { rnd, noise, fbm, tfbm, hash };
}

/** Paint a canvas per pixel. fn(x,y,i) returns [r,g,b] or [r,g,b,a] in 0..255. */
export function paint(w, h, fn) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4, col = fn(x, y, i);
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col[3] ?? 255;
  }
  g.putImageData(im, 0, 0); return c;
}
/** Height field (Float32Array w*h) → tangent-space normal map canvas. Wraps at edges. */
export function heightToNormal(H, w, h, s) {
  return paint(w, h, (x, y) => {
    const l = H[y * w + (x - 1 + w) % w], r = H[y * w + (x + 1) % w], u = H[((y - 1 + h) % h) * w + x], dn = H[((y + 1) % h) * w + x];
    const nx = (l - r) * s, ny = (dn - u) * s, il = 1 / Math.hypot(nx, ny, 1);
    return [(nx * il * .5 + .5) * 255, (ny * il * .5 + .5) * 255, (il * .5 + .5) * 255];
  });
}
export const rgb = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const grey = v => { const g = clamp(v) * 255; return [g, g, g]; };

// ══════════════════════════════════════════════════ 4. TEXTURE RECIPES ══════
// Each recipe returns { map, normal, rough, tile:[uMetres, vMetres], bump }.
// Canvases only; createMaterials() turns them into textures. All tile seamlessly.
export const RECIPES = {
  /** Timber. Grain runs along U. Skill wood recipe, made tileable. */
  wood(N, S, { dark = 0x5e4130, light = 0xa8754e, lines = 22, warp = .22, contrast = 1.0, pore = .08, bump = 2.0, tile = 2 } = {}) {
    const H = new Float32Array(S * S), R = new Float32Array(S * S), D = rgb(dark), L = rgb(light);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S;
      const w = N.tfbm(u, v, 3, 12, 3) * warp;
      const ring = Math.pow(.5 + .5 * Math.sin(2 * Math.PI * (lines * v + w) + N.tfbm(u, v, 2, 4, 2) * 5), contrast);
      const fib = .5 + .5 * N.tfbm(u, v, 6, 160, 2);
      let t = ring * .68 + fib * .32;
      const pr = N.noise(u * 48 + 50, v * 400, 48, 400) > .55 ? pore : 0;
      t = clamp(t - pr);
      H[i] = t; R[i] = .55 + (1 - t) * .12 + pr * 1.2;
      return mix(D, L, t);
    });
    return { map, normal: heightToNormal(H, S, S, bump), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /**
   * Glued-laminated timber: grain along U, lamellae (~45 mm) stacked across V with thin
   * dark glue lines and a tone shift per lamella. Tile 1.2 m along the member × 0.6 m across.
   */
  glulam(N, S, { dark = 0x2e2017, light = 0x664833, tile = .6, lam = .046 } = {}) {
    const n = Math.round(tile / lam), D = rgb(dark), L = rgb(light), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, lv = v * n, li = Math.floor(lv), f = lv - li;
      const glue = Math.min(f, 1 - f) < .05, tone = .78 + N.hash(li, 5) * .44;
      const grain = .5 + .5 * Math.sin(2 * Math.PI * (v * n * 3 + N.tfbm(u, v, 3, n * 2, 3) * 1.4));
      const fib = .5 + .5 * N.tfbm(u, v, 4, 160, 2), knot = Math.max(0, N.tfbm(u, v, 6, n, 2) - .32) * 2.5;
      const t = clamp((grain * .5 + fib * .5) * tone - knot * .35);
      H[i] = glue ? 0 : .75 + t * .25; R[i] = glue ? .82 : .56 + (1 - t) * .12;
      return glue ? shade(D, .55) : mix(D, L, t * .85);
    });
    return { map, normal: heightToNormal(H, S, S, 2.5), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile * 2, tile] };
  },

  /** Lime-wash: vertical streaks (V = up on walls) + soft mottling, ±4 %. */
  lime(N, S, { base = TOKENS.sand, tile = 4 } = {}) {
    const H = new Float32Array(S * S), B = rgb(base), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S;
      const streak = N.tfbm(u, v, 22, 2, 3), mott = N.tfbm(u, v, 6, 6, 4), fine = N.tfbm(u, v, 64, 64, 2);
      const k = 1 + clamp(streak * .05 + mott * .035 + fine * .012, -.04, .04);
      H[i] = mott * .6 + fine * .4; R[i] = .9 + fine * .05;
      const c = shade(B, k); return [c[0], c[1] * (1 - streak * .006), c[2] * (1 - streak * .012)];
    });
    return { map, normal: heightToNormal(H, S, S, 1.2), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Coursed stone masonry, blocks 0.4–0.9 m, 2 cm mortar. */
  stone(N, S, { base = TOKENS.stone, mortar = 0x5c564f, tile = 4 } = {}) {
    const rows = 6, rnd = mulberry(SEED + 7), Hs = [];
    let acc = 0; for (let r = 0; r < rows; r++) { const h = .7 + rnd() * .6; Hs.push(h); acc += h; }
    const rowEdge = [0]; Hs.forEach(h => rowEdge.push(rowEdge[rowEdge.length - 1] + h / acc));
    const rowBlocks = Hs.map(() => {
      const lens = []; let s = 0; while (s < 1) { const l = (.4 + rnd() * .5) / tile; lens.push(l); s += l; }
      const k = 1 / s, off = rnd(), edges = []; let e = off; lens.forEach(l => { edges.push(e % 1); e += l * k; });
      return edges.sort((a, b) => a - b);
    });
    const mw = .02 / tile, B = rgb(base), M = rgb(mortar), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S; let r = 0; while (r < rows - 1 && v >= rowEdge[r + 1]) r++;
      const E = rowBlocks[r]; let b = E.length - 1; for (let j = 0; j < E.length; j++) if (u >= E[j]) b = j;
      const left = E[b], right = b + 1 < E.length ? E[b + 1] : E[0] + 1;
      const uu = u < left ? u + 1 : u;
      const d = Math.min(uu - left, right - uu, v - rowEdge[r], rowEdge[r + 1] - v);
      const surf = N.tfbm(u, v, 16, 16, 3), tone = 1 + (N.hash(r, b) - .5) * .16;
      const h = d < mw ? 0 : sstep(mw, mw + .006, d) * (.85 + surf * .3);
      H[i] = h; R[i] = d < mw ? .95 : .84 + surf * .06;
      return d < mw ? shade(M, 1 + surf * .1) : shade(B, tone * (1 + surf * .12));
    });
    return { map, normal: heightToNormal(H, S, S, 6), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Overlapping shingles, 0.3 m rows (8 rows per 2.4 m), staggered. Rows run along U. */
  shingle(N, S, { base = TOKENS.slateRoof, tile = 2.4 } = {}) {
    const rows = 8, cols = 8, B = rgb(base), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, rv = v * rows, r = Math.floor(rv), fv = rv - r;
      const cu = u * cols + (r % 2) * .5, c = Math.floor(cu), fu = cu - c;
      const gap = Math.min(fu, 1 - fu) < .03, tone = 1 + (N.hash(r, ((c % cols) + cols) % cols) - .5) * .18;
      const surf = N.tfbm(u, v, 24, 24, 2);
      H[i] = gap ? 0 : (1 - fv) * .9 + surf * .1; R[i] = gap ? .8 : .5 + surf * .08;
      return gap ? shade(B, .45) : shade(B, tone * (.82 + (1 - fv) * .25));
    });
    return { map, normal: heightToNormal(H, S, S, 4), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Vertical bamboo slats, 8 cm, nodes every 0.4 m. Slats run along V (up). */
  bamboo(N, S, { base = TOKENS.bamboo, tile = 1.2 } = {}) {
    const slats = 15, B = rgb(base), G = rgb(TOKENS.umber), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, su = u * slats, s = Math.floor(su), fu = su - s;
      if (fu > .86) { H[i] = 0; R[i] = .9; return G; }
      const lu = fu / .86, prof = Math.sin(Math.PI * lu);
      const nv = (v * 3 + N.hash(s, 3)) % 1, node = Math.exp(-Math.pow(Math.min(nv, 1 - nv) / .012, 2));
      const fib = N.tfbm(u, v, 120, 3, 2), tone = 1 + (N.hash(s, 9) - .5) * .14;
      H[i] = prof * .8 + node * .35 + fib * .05; R[i] = .46 + node * .1 + fib * .04;
      return shade(B, tone * (.86 + prof * .16 - node * .18 + fib * .05));
    });
    return { map, normal: heightToNormal(H, S, S, 3), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Temple-Dam diamond tiles in the 4 textile colours (madder 35 / slate 30 / rose 20 / charcoal 15). */
  textile(N, S, { diamond = 4, count = 16 } = {}) {
    const C = [TOKENS.textileMadder, TOKENS.textileSlate, TOKENS.textileRose, TOKENS.textileCharcoal].map(rgb);
    const W = [.35, .65, .85, 1], H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, p = (u + v) * count, q = (u - v) * count;
      const ip = Math.floor(p), iq = Math.floor(q), fp = p - ip, fq = q - iq;
      const h = N.hash(((ip % count) + count) % count, ((iq % count) + count) % count);
      const col = C[W.findIndex(w => h < w)];
      const e = Math.min(fp, 1 - fp, fq, 1 - fq), bev = sstep(0, .08, e), surf = N.tfbm(u, v, 48, 48, 2);
      H[i] = bev * .9 + surf * .1; R[i] = e < .02 ? .8 : .42 + surf * .05;
      return e < .02 ? shade(C[3], .7) : shade(col, (.9 + bev * .1) * (1 + surf * .08 + (N.hash(ip, iq) - .5) * .08));
    });
    const t = diamond * count; return { map, normal: heightToNormal(H, S, S, 3), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [t, t] };
  },

  /** Temple-Dam cladding: glazed ceramic tiles 1.0 × 0.5 m in running bond, near-white so instanceColor sets the hue. */
  block(N, S, { tile = 2 } = {}) {
    const cols = 2, rows = 4, H = new Float32Array(S * S), R = new Float32Array(S * S), B = rgb(0xf4f1ec);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, ry = v * rows, ir = Math.floor(ry), fy = ry - ir;
      const rx = u * cols + (ir % 2) * .5, ix = Math.floor(rx), fx = rx - ix;
      const d = Math.min(Math.min(fx, 1 - fx) * 1.0, Math.min(fy, 1 - fy) * .5);      // metres to the nearest joint
      const joint = d < .009, bev = sstep(.009, .035, d), id = N.hash(ix % cols, ir), surf = N.tfbm(u, v, 12, 12, 3);
      H[i] = joint ? 0 : .55 + bev * .45 + surf * .06; R[i] = joint ? .86 : .3 + id * .14 + surf * .06;
      return joint ? shade(B, .58) : shade(B, (.9 + (id - .5) * .09 + surf * .05) * (.97 + bev * .03));
    });
    return { map, normal: heightToNormal(H, S, S, 2.5), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Painted bands for bracket ends & trim: sand / maroon / saffron with dark separators. Bands vary along V. */
  painted(N, S, { tile = .6 } = {}) {
    const bands = [[.0, TOKENS.sand], [.2, TOKENS.maroon], [.52, TOKENS.saffron], [.66, TOKENS.sand], [.78, TOKENS.timberDark], [1, 0]];
    const H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S; let b = 0; while (v >= bands[b + 1][0]) b++;
      const edge = Math.min(v - bands[b][0], bands[b + 1][0] - v), sep = edge < .008;
      const grain = N.tfbm(u, v, 4, 40, 2);
      H[i] = sep ? 0 : .6 + grain * .1; R[i] = sep ? .7 : .5 + grain * .05;
      return sep ? rgb(0x1c140f) : shade(rgb(bands[b][1]), 1 + grain * .06);
    });
    return { map, normal: heightToNormal(H, S, S, 2), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Beam-end medallion decal (not tiling; UV 0..1 across the disc). Alpha-tested. */
  medallion(N, S) {
    const G = rgb(TOKENS.gold), M = rgb(TOKENS.maroon), F = rgb(TOKENS.saffron), D = rgb(TOKENS.sand);
    const H = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const dx = x / S - .5, dy = y / S - .5, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      let c, h = .6;
      if (r < .1) { c = G; h = 1; } else if (r < .17) c = M;
      else if (r < .2) c = D;
      else if (r < .36) { const pet = Math.cos(th * 8) > ((r - .2) / .16) * 2 - 1; c = pet ? F : M; h = pet ? .8 : .5; }
      else if (r < .4) c = D; else if (r < .47) c = M; else { H[i] = 0; return [0, 0, 0, 0]; }
      H[i] = h; return [...c, 255];
    });
    return { map, normal: heightToNormal(H, S, S, 2), rough: null, tile: [1, 1], decal: true };
  },

  /** Paddy rows (along U) every 0.25 m + a bund at the tile edge. */
  paddy(N, S, { base = TOKENS.paddyYoung, flooded = false, tile = 4 } = {}) {
    const B = rgb(base), W = rgb(TOKENS.paddyWater), BU = rgb(0x8c8a5a), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, row = .5 + .5 * Math.sin(2 * Math.PI * 16 * v + N.tfbm(u, v, 3, 2, 2) * 2);
      const patch = N.tfbm(u, v, 5, 5, 3), bund = Math.min(v, 1 - v) < .012;
      if (bund) { H[i] = 1; R[i] = .9; return shade(BU, 1 + patch * .1); }
      if (flooded) { H[i] = row * .15; R[i] = .12 + row * .3; return mix(W, shade(B, .8), row * .35); }
      H[i] = row * .5 + patch * .2; R[i] = .78 + patch * .05;
      return shade(B, (.86 + row * .16) * (1 + patch * .1));
    });
    return { map, normal: heightToNormal(H, S, S, flooded ? 1 : 2.5), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** River gravel: cellular pebbles. */
  gravel(N, S, { base = TOKENS.gravel, tile = 2 } = {}) {
    const G = 28, B = rgb(base), ST = rgb(TOKENS.stone), H = new Float32Array(S * S);
    const pt = (cx, cy) => { const wx = ((cx % G) + G) % G, wy = ((cy % G) + G) % G; return [cx + .15 + N.hash(wx, wy) * .7, cy + .15 + N.hash(wy + 99, wx) * .7, N.hash(wx * 7, wy * 13)]; };
    const map = paint(S, S, (x, y, i) => {
      const px = x / S * G, py = y / S * G, cx = Math.floor(px), cy = Math.floor(py);
      let d1 = 9, d2 = 9, id = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const p = pt(cx + ox, cy + oy), d = Math.hypot(px - p[0], py - p[1]);
        if (d < d1) { d2 = d1; d1 = d; id = p[2]; } else if (d < d2) d2 = d;
      }
      const e = sstep(0, .35, d2 - d1); H[i] = e * (1 - d1 * .5);
      return shade(mix(B, ST, id < .2 ? .6 : id * .25), .72 + e * .32);
    });
    return { map, normal: heightToNormal(H, S, S, 5), rough: null, tile: [tile, tile] };
  },

  /** Brushed-metal roughness streaks along U (structural steel connectors, rails). */
  brushed(N, S, { tile = 1 } = {}) {
    const rough = paint(S, S, (x, y) => { const u = x / S, v = y / S; return grey(.34 + N.tfbm(u, v, 2, 180, 2) * .12 + N.tfbm(u, v, 8, 8, 2) * .05); });
    return { map: null, normal: null, rough, tile: [tile, tile] };
  },

  /** Water ripple (normal only). */
  ripple(N, S, { tile = 8 } = {}) {
    const H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const u = x / S, v = y / S; H[y * S + x] = N.tfbm(u, v, 6, 6, 2) + .5 * N.tfbm(u, v, 16, 10, 2); }
    return { map: null, normal: heightToNormal(H, S, S, 2), rough: null, tile: [tile, tile] };
  },

  /**
   * Choppy stream ripples (1.8.0): 14 crossing wave trains with sharpened crests ((1−|sin|)^2.2, integer
   * frequencies so it tiles) plus fine fbm. Normal only; the water shader samples it at three scales.
   */
  chop(N, S, { tile = 1 } = {}) {
    const H = new Float32Array(S * S), r = mulberry(SEED + 91), waves = [];
    for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, f = 2 + Math.floor(r() * 8), fx = Math.round(Math.cos(a) * f), fy = Math.round(Math.sin(a) * f); if (fx || fy) waves.push([fx, fy, r() * 6.283, .55 + r() * .6]); }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S; let h = 0;
      for (const [fx, fy, ph, amp] of waves) h += amp * Math.pow(1 - Math.abs(Math.sin(Math.PI * (fx * u + fy * v) + ph)), 2.2) / Math.pow(Math.hypot(fx, fy), .55);
      H[y * S + x] = h + N.tfbm(u, v, 10, 10, 3) * .7;
    }
    return { map: null, normal: heightToNormal(H, S, S, 3.2), rough: null, tile: [tile, tile] };
  },

  /** Generic ground (plinth tops, preview terrain): grass / meadow / bare earth. */
  ground(N, S, { tile = 8 } = {}) {
    // muted, slightly cool meadow: canopy-mid ↔ canopy-light, a little paddy-young, sparse bare earth
    const CM = rgb(TOKENS.canopyMid), A = rgb(TOKENS.canopyLight), P = rgb(TOKENS.paddyYoung), E = rgb(0x8c7a62), F = rgb(TOKENS.forest);
    const H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, m = N.tfbm(u, v, 4, 4, 4), c = N.tfbm(u, v, 24, 24, 3), f = N.tfbm(u, v, 96, 96, 2);
      let col = mix(CM, A, clamp(.55 + m * 1.0)); col = mix(col, P, sstep(.22, .45, m) * .3);
      col = mix(col, E, sstep(.25, .45, -m) * .45); col = mix(col, F, sstep(.18, .4, c) * .35);
      H[i] = c * .6 + f * .4; R[i] = .93 + f * .04;
      return shade(col, .95 + f * .08);
    });
    return { map, normal: heightToNormal(H, S, S, 2.5), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },

  /** Terrain skirt strata. U tiles along the perimeter (metres); V = 0 top → 1 bottom (normalised). */
  skirt(N, S, { tile = 40 } = {}) {
    const SO = rgb(0x4a3a2c), LINE = rgb(0x5e4b39), E = rgb(TOKENS.umberEarth), D = rgb(TOKENS.umberDeep), H = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, strata = N.tfbm(u, v * .5, 3, 24, 3), grit = N.tfbm(u, v, 64, 64, 2);
      H[i] = strata * .7 + grit * .3;
      if (v < .006) return LINE;
      if (v < .08) return shade(SO, 1 + strata * .2 + grit * .1);
      return shade(mix(E, D, sstep(.1, 1, v)), 1 + strata * .35 + grit * .08);
    });
    return { map, normal: heightToNormal(H, S, S, 2), rough: null, tile: [tile, 1], clampV: true };
  },

  /** Window glow gradient (warm at the bottom), multiplied by the mood glow colour. */
  glow(N, S) {
    const ramp = GLOW_RAMP.map(rgb);
    const map = paint(16, S, (x, y) => { const t = y / (S - 1) * (ramp.length - 1), k = Math.floor(t), f = t - k; return mix(ramp[k], ramp[Math.min(k + 1, ramp.length - 1)], f); });
    return { map, normal: null, rough: null, tile: [1, 1] };
  },

  /** Soft radial alpha (ghost shadows, halos). */
  // alphaMaps are read from the GREEN channel, so these encode alpha as grey.
  radial(N, S) { const map = paint(S, S, (x, y) => grey(Math.pow(clamp(1 - Math.hypot(x / S - .5, y / S - .5) * 2), 1.8))); return { map, tile: [1, 1] }; },

  /** Leader-line fade: opaque at the bottom, transparent in the top 30 %. */
  fade(N, S) { const map = paint(4, S, (x, y) => grey(1 - sstep(.7, 1, 1 - y / (S - 1)))); return { map, tile: [1, 1] }; },

  /** Tree bark (1.4.0): vertical plates split by deep fissures, cross-breaks, lichen patches. U = around (1 m), V = along (2 m). */
  bark(N, S, { dark = 0x2b2019, light = 0x6e5b4a, tile = 1 } = {}) {
    const D = rgb(dark), L = rgb(light), LI = rgb(0x7d8468), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, w = N.tfbm(u, v, 4, 3, 3) * .45;
      const fis = Math.abs(Math.sin(Math.PI * (u * 7 + w))), plate = sstep(.06, .4, fis);
      const brk = sstep(.1, .3, Math.abs(N.tfbm(u, v, 9, 14, 2))), grit = N.tfbm(u, v, 48, 48, 2);
      const lich = sstep(.18, .42, N.tfbm(u + .3, v, 5, 3, 3)) * plate;
      const t = clamp(plate * (.55 + brk * .35) + grit * .15 + .08);
      H[i] = plate * .8 + brk * .15 + grit * .1; R[i] = .82 + (1 - plate) * .14;
      return mix(mix(shade(D, .7), L, t), LI, lich * .38);
    });
    return { map, normal: heightToNormal(H, S, S, 5), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile * 2] };
  },

  /** Boulder rock (1.4.0): granite-like speckle, fine cracks, weathered tone. Tile 2 m. */
  rock(N, S, { base = 0x8a8378, tile = 2 } = {}) {
    const B = rgb(base), DK = rgb(0x4d4740), LT = rgb(0xb3aca0), H = new Float32Array(S * S), R = new Float32Array(S * S);
    const map = paint(S, S, (x, y, i) => {
      const u = x / S, v = y / S, big = N.tfbm(u, v, 3, 3, 4), mid = N.tfbm(u, v, 12, 12, 3), sp = N.tfbm(u, v, 96, 96, 2);
      const crack = sstep(.035, 0, Math.abs(N.tfbm(u, v, 6, 6, 3) + mid * .15));
      let c = mix(B, big > 0 ? LT : DK, Math.min(Math.abs(big) * 1.2, .55));
      c = shade(c, .92 + sp * .35 + mid * .12); c = mix(c, DK, crack * .3);   // 1.8.0: fainter cracks (read as drawn lines up close)
      H[i] = big * .5 + mid * .35 + sp * .15 - crack * .25; R[i] = .78 + sp * .1 + crack * .05;
      return c;
    });
    return { map, normal: heightToNormal(H, S, S, 7), rough: paint(S, S, (x, y, i) => grey(R[i])), tile: [tile, tile] };
  },
};

/**
 * Foliage atlas (1.4.0): 2 × 2 cells of leaf clusters with alpha, painted with the canvas API.
 * cell 0 broadleaf twig · 1 pine needle tufts · 2 large-leaf twig (sal) · 3 grass tuft.
 * Leaves are near-white greens (mean ≈ 0.85): the hue comes from instanceColor per tree.
 * Returns RGBA pixel arrays (colour + alpha-as-grey); the kit wraps them in DataTextures so the
 * transparent texels keep a leaf colour (no dark mip fringes).
 */
export function foliagePixels(S) {
  const C = S / 2, cv = makeCanvas(S, S);
  const g = cv.getContext('2d'), r = mulberry(SEED + 21);
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  function leaf(x, y, ang, len, wid, col, vein) {
    g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(len * .28, -wid, len * .78, -wid * .75, len, 0); g.bezierCurveTo(len * .78, wid * .75, len * .28, wid, 0, 0);
    g.fillStyle = col; g.fill(); g.strokeStyle = vein; g.lineWidth = Math.max(1, wid * .14); g.beginPath(); g.moveTo(len * .04, 0); g.lineTo(len * .86, 0); g.stroke(); g.restore();
  }
  function twigCell(ox, oy, n, lmin, lmax, wk) {
    const bx = ox + C / 2, by = oy + C * .97, tips = [];
    g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {   // a branching twig from the bottom centre
      const a = -Math.PI / 2 + (k - 3) * .32 + (r() - .5) * .2, l = C * (.55 + r() * .3);
      const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l * .95;
      g.strokeStyle = hsl(28, 25, 30 + r() * 10); g.lineWidth = C * .012 * (k === 3 ? 1.6 : 1);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo((bx + ex) / 2 + (r() - .5) * C * .1, (by + ey) / 2, ex, ey); g.stroke();
      for (let t = .25; t <= 1; t += .08) tips.push([bx + (ex - bx) * t, by + (ey - by) * t, a]);
    }
    const L = [];
    for (let i = 0; i < n; i++) { const [x, y, a] = tips[Math.floor(r() * tips.length)], side = r() < .5 ? -1 : 1; L.push([x, y, a + side * (.5 + r() * .7), r()]); }
    L.sort((p, q) => p[3] - q[3]);                                   // back to front: back leaves darker
    for (const [x, y, a, d] of L) {
      const len = C * (lmin + r() * (lmax - lmin)), l = 58 + d * 30 + (r() - .5) * 8;
      leaf(x, y, a, len, len * wk, hsl(78 + r() * 26, 22 + r() * 18, Math.min(l, 92)), hsl(80, 20, Math.max(l - 16, 30)));
    }
  }
  twigCell(0, 0, 150, .1, .15, .36);                                // broadleaf
  twigCell(0, C, 70, .17, .25, .3);                                 // sal (canvas row 2 = cell 2)
  { // pine needle tufts
    const ox = C, oy = 0; g.lineCap = 'round';
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .3; g.strokeStyle = hsl(25, 22, 32); g.lineWidth = C * .014;
      g.beginPath(); g.moveTo(ox + C / 2, oy + C * .97); g.lineTo(ox + C / 2 + Math.cos(a) * C * .62, oy + C * .97 + Math.sin(a) * C * .62); g.stroke(); }
    for (let t = 0; t < 46; t++) {
      const a = -Math.PI / 2 + (r() - .5) * 2.1, d = C * (.18 + r() * .5), cx = ox + C / 2 + Math.cos(a) * d, cy = oy + C * .97 + Math.sin(a) * d, depth = r();
      for (let k = 0; k < 34; k++) {
        const b = a + (r() - .5) * 2.4, len = C * (.07 + r() * .07), l = 55 + depth * 30 + (r() - .5) * 10;
        g.strokeStyle = hsl(92 + r() * 22, 20 + r() * 14, Math.min(l, 90)); g.lineWidth = Math.max(1.2, C * .0045);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(b) * len, cy + Math.sin(b) * len); g.stroke();
      }
    }
  }
  { // grass tuft: tapered curved blades, darker at the base
    const ox = C, oy = C;
    for (let i = 0; i < 90; i++) {
      const x0 = ox + C * (.12 + r() * .76), h = C * (.45 + r() * .5), lean = (r() - .5) * C * .35, w = C * (.008 + r() * .01), l = 60 + r() * 26;
      const gr = g.createLinearGradient(0, oy + C, 0, oy + C - h); gr.addColorStop(0, hsl(70, 22, 34)); gr.addColorStop(1, hsl(70 + r() * 25, 25 + r() * 15, l));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, oy + C); g.quadraticCurveTo(x0 + lean * .3, oy + C - h * .55, x0 + lean, oy + C - h);
      g.quadraticCurveTo(x0 + lean * .3 + w, oy + C - h * .55, x0 + w, oy + C); g.fill();
    }
  }
  // un-premultiply + fill transparent texels with the cell's mean colour; alpha as grey for clay mode
  const im = g.getImageData(0, 0, S, S).data, col = new Uint8Array(S * S * 4), alpha = new Uint8Array(S * S * 4);
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = cy * C; y < (cy + 1) * C; y++) for (let x = cx * C; x < (cx + 1) * C; x++) { const o = (y * S + x) * 4; if (im[o + 3] > 200) { sr += im[o]; sg += im[o + 1]; sb += im[o + 2]; n++; } }
    const m = [sr / Math.max(n, 1), sg / Math.max(n, 1), sb / Math.max(n, 1)];
    for (let y = cy * C; y < (cy + 1) * C; y++) for (let x = cx * C; x < (cx + 1) * C; x++) {
      const o = (y * S + x) * 4, a = im[o + 3] / 255;
      for (let k = 0; k < 3; k++) col[o + k] = Math.round(im[o + k] * a + m[k] * (1 - a));
      col[o + 3] = im[o + 3]; alpha[o] = alpha[o + 1] = alpha[o + 2] = im[o + 3]; alpha[o + 3] = 255;
    }
  }
  return { col, alpha };
}

// ══════════════════════════════════════════════ 4b. THE TEXTURE JOB LIST ════
/** Every recipe createMaterials() uses, per quality: id → [recipe, size, opts]. Workers pre-build exactly these. */
export function textureJobs(quality = 'high') {
  const S = quality === 'low' ? 512 : 1024;
  return {
    wood: ['wood', S, {}], woodDark: ['wood', S, { dark: 0x3b281d, light: 0x6a4a36, contrast: 1.2 }], glulam: ['glulam', S, {}],
    painted: ['painted', S / 2, {}], medallion: ['medallion', 512, {}], bamboo: ['bamboo', S, {}], lime: ['lime', S, {}],
    stone: ['stone', S, {}], shingle: ['shingle', S, {}], brushed: ['brushed', S / 2, {}], glow: ['glow', 128, {}],
    textile: ['textile', S, {}], block: ['block', S / 2, {}], ground: ['ground', S, {}], skirt: ['skirt', S / 2, {}],
    ripple: ['ripple', S / 2, {}], gravel: ['gravel', S / 2, {}], paddy: ['paddy', S / 2, {}], paddyFlooded: ['paddy', S / 2, { flooded: true }],
    bark: ['bark', S / 2, {}], rock: ['rock', S / 2, {}],
    chop: ['chop', 512, {}],   // createWaterSurface()'s ripple normal
  };
}
/** Cache key of one recipe result (stable across page, workers and IndexedDB). */
export const recipeKey = (name, S, opts = {}) => name + ':' + S + ':' + JSON.stringify(opts);

// ══════════════════════════════════════════════ 4c. INDEXEDDB CACHE (1.9.0) ═══
// Built textures and noise volumes are cached per KIT_VERSION, so a revisit (or the next landmark's
// iframe) decodes them instead of repainting. Works on pages and in workers.
const IDB_NAME = 'gmc-kit-cache', IDB_STORE = 'assets';
export function idbOpen() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no IndexedDB'));
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export const idbGet = (db, key) => new Promise(res => {
  try { const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch { res(undefined); }
});
export const idbPut = (db, key, value) => new Promise(res => {
  try { const t = db.transaction(IDB_STORE, 'readwrite'); t.objectStore(IDB_STORE).put(value, key); t.oncomplete = () => res(true); t.onerror = t.onabort = () => res(false); } catch { res(false); }
});
