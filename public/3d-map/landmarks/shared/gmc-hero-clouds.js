// ─────────────────────────────────────────────────────────────────────────────
// GMC hero clouds · v1.0.0   (environment kit E13, design.md §7)
// Individual close-up cumulus clouds: the "studio cloud" look (dense cauliflower
// billows, grey-violet folds, warm bellies) for floating around hero objects and
// for close views. The map-scale cloud SEA stays in gmc-clouds.js (E5).
//
// Sculpt (CPU, once per cloud): ~400 spheres in three generations — big lobes
// along the cloud, lobes on lobes, small curls — blended with a smooth union,
// a flat-ish base, and noise fuzz near the surface → a 128 × 64 × 80 density
// grid. A blurred copy of the density (G channel) marks the folds between lobes.
// Render (GPU): one box per cloud, raymarched in local metres: Beer–Lambert sun
// light-march (self-shadow) with a forward/back phase and multi-scatter terms,
// sky ambient darkened in the folds, warm bounce under the belly.
//
// Usage:
//   const clouds = await createHeroClouds(list, { onProgress });   // list: [{ seed, length, x, y, z, yaw }]
//   scene.add(clouds); setHeroCloudMood(clouds, 'golden');       // 'dusk' | 'golden' | 'day' (sun from MOODS)
// Material name M_cloud (design.md §3.2). Pivot: centre of the cloud base.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { MOODS, SEED, mulberry, sunDirection } from './gmc-kit.js';
import { CLOUD_MOODS } from './gmc-clouds.js';

export const HERO_CLOUDS_VERSION = '1.0.0';
export const HERO_CLOUD_DIMS = Object.freeze([128, 64, 80]);   // voxels: length × height × depth

// ═════════════════════════════════════════════════════════════ sculpting ═══
function valueNoise3(seed) {
  const h = (x, y, z) => { let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1442695041) ^ Math.imul(seed, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), su), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), su), sv),
             l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), su), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), su), sv), sw);
  };
}
/** separable box blur (running sums), radius r, along all three axes */
function blur3(src, NX, NY, NZ, r) {
  const a = new Float32Array(src), b = new Float32Array(src.length), idx = (x, y, z) => (z * NY + y) * NX + x;
  const pass = (from, to, n, at) => {
    for (let o = 0; o < at.count; o++) {
      let s = 0; for (let k = -r; k <= r; k++) s += from[at.i(o, Math.min(n - 1, Math.max(0, k)))];
      for (let k = 0; k < n; k++) { to[at.i(o, k)] = s / (2 * r + 1); s += from[at.i(o, Math.min(n - 1, k + r + 1))] - from[at.i(o, Math.max(0, k - r))]; }
    }
  };
  pass(a, b, NX, { count: NY * NZ, i: (o, k) => idx(k, o % NY, Math.floor(o / NY)) });
  pass(b, a, NY, { count: NX * NZ, i: (o, k) => idx(o % NX, k, Math.floor(o / NX)) });
  pass(a, b, NZ, { count: NX * NY, i: (o, k) => idx(o % NX, Math.floor(o / NX), k) });
  return b;
}

/**
 * Sculpt one cumulus. Returns { data: Uint8Array RG (density, folds), dims, spheres }.
 * shape: 0..1 extra tower height in the middle (0 = flat, long cloud; 1 = heaped).
 */
export function sculptCloud({ seed = SEED, dims = HERO_CLOUD_DIMS, shape = null } = {}) {
  const [NX, NY, NZ] = dims, r = mulberry(seed * 7919 + 17), R = (a, b) => a + (b - a) * r();
  const tower = shape ?? R(.15, 1), base = NY * R(.12, .18);
  // generation 0: big lobes strung along the length, taller towards the middle
  // two staggered rows of big lobes (front/back, high/low) so the mass reads as one heaped body, not a string of beads
  const L0 = [], n0 = Math.round(R(6, 9));
  for (let i = 0; i < n0; i++) {
    const t = n0 === 1 ? .5 : i / (n0 - 1), mid = 1 - Math.abs(t - .5) * 2, rad = NY * (.18 + .15 * mid * tower + R(0, .07));
    L0.push({ x: NX * (.22 + .56 * t) + R(-5, 5), y: base + rad * R(.55, .95) + mid * tower * NY * .1, z: NZ * .5 + (i % 2 ? 1 : -1) * R(.04, .16) * NZ, r: rad });
  }
  for (let i = 0; i < 3; i++) { const t = R(.3, .7); L0.push({ x: NX * t, y: base + NY * R(.3, .42) * (.7 + tower * .5), z: NZ * R(.4, .6), r: NY * R(.16, .22) }); }   // crown lobes riding on top
  // generations 1 and 2: lobes on lobes, mostly on the upper and outer sides (billows rise and bulge out)
  const kids = (list, [a, b], [s0, s1], spread) => {
    const out = [];
    for (const p of list) for (let j = 0, k = Math.round(R(a, b)); j < k; j++) {
      let dx = R(-1, 1), dy = R(-.3, 1), dz = R(-1, 1); const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      out.push({ x: p.x + dx * p.r * spread, y: p.y + dy * p.r * spread, z: p.z + dz * p.r * spread, r: p.r * R(s0, s1) });
    }
    return out;
  };
  // children sit further out (they bulge past the parent's surface) and come in a wider range of sizes
  const L1 = kids(L0, [9, 13], [.3, .55], .9), L2 = kids(L1, [5, 8], [.3, .48], .95);
  const spheres = [...L0, ...L1, ...L2];
  const M = 3;                                                     // keep a clear margin so light-marches leave through empty voxels
  for (const s of spheres) s.r = Math.min(s.r, s.x - M, NX - M - s.x, NY - M - s.y, s.z - M, NZ - M - s.z);
  // smooth union of sphere distance fields
  const N = NX * NY * NZ, F = new Float32Array(N).fill(99), K = 1.8;
  for (const s of spheres) {
    if (s.r < 1) continue;
    const ext = s.r + K, x0 = Math.max(0, Math.floor(s.x - ext)), x1 = Math.min(NX - 1, Math.ceil(s.x + ext)),
          y0 = Math.max(0, Math.floor(s.y - ext)), y1 = Math.min(NY - 1, Math.ceil(s.y + ext)), z0 = Math.max(0, Math.floor(s.z - ext)), z1 = Math.min(NZ - 1, Math.ceil(s.z + ext));
    for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
      const row = (z * NY + y) * NX, dyz = (y - s.y) ** 2 + (z - s.z) ** 2;
      for (let x = x0; x <= x1; x++) {
        const d = Math.sqrt((x - s.x) ** 2 + dyz) - s.r, i = row + x, a = F[i], h = Math.max(K - Math.abs(a - d), 0) / K;
        F[i] = Math.min(a, d) - h * h * K * .25;
      }
    }
  }
  // flat-ish base, then noise fuzz in a shell around the surface (cheap: only where it matters)
  const n1 = valueNoise3(seed + 11), n2 = valueNoise3(seed + 23), n3 = valueNoise3(seed + 37), D = new Float32Array(N);
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const i = (z * NY + y) * NX + x; let f = Math.max(F[i], (base + (n3(x * .07, 0, z * .07) - .5) * 3 - y) * .9);
    if (f < 6) f += (n1(x * .16, y * .16, z * .16) - .5) * 2.8 + (n2(x * .42, y * .42, z * .42) - .5) * 1.2;
    D[i] = Math.min(1, Math.max(0, .5 - f / 1.6));                 // ~3-voxel edge: soft, but each lobe keeps a readable outline
  }
  const B = blur3(blur3(D, NX, NY, NZ, 3), NX, NY, NZ, 3);         // ≈ gaussian, radius ~5 voxels: high in the folds between lobes
  const data = new Uint8Array(N * 2);
  for (let i = 0; i < N; i++) { data[i * 2] = Math.round(D[i] * 255); data[i * 2 + 1] = Math.round(Math.min(1, B[i]) * 255); }
  return { data, dims: [NX, NY, NZ], spheres: spheres.length };
}

// ═════════════════════════════════════════════════════════════ rendering ═══
const VERT = /* glsl */`varying vec3 vLocal; void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = /* glsl */`
precision highp float; precision highp sampler3D;
#define PI 3.14159265
uniform sampler3D tVol; uniform vec3 uSize; uniform float uVox; uniform float uExt; uniform float uStep;
uniform vec3 uCamLocal; uniform vec3 uSunLocal; uniform vec3 uSunColor; uniform vec3 uAmbTop; uniform vec3 uAmbBot; uniform vec3 uBounce; uniform float uHover;
varying vec3 vLocal;
vec3 bMin(){ return vec3(-uSize.x * .5, 0., -uSize.z * .5); }
vec2 vol(vec3 p){ return texture(tVol, (p - bMin()) / uSize).rg; }
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / (4. * PI * pow(max(1. + g2 - 2. * g * c, 1e-4), 1.5)); }
void main(){
  vec3 ro = uCamLocal, rd = normalize(vLocal - ro), mn = bMin(), mx = mn + uSize;
  vec3 inv = 1. / rd, a = (mn - ro) * inv, b = (mx - ro) * inv, lo = min(a, b), hi = max(a, b);
  float t0 = max(max(max(lo.x, lo.y), lo.z), 0.), t1 = min(min(hi.x, hi.y), hi.z);
  if (t1 <= t0) discard;
  float st = uVox * uStep, t = t0 + st * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  float cosT = dot(rd, uSunLocal), ph = mix(hg(cosT, .55), hg(cosT, -.2), .3) * 4. * PI;
  vec3 col = vec3(0.); float T = 1.;
  for (int i = 0; i < 320; i++) {
    if (t > t1 || T < .012) break;
    vec3 p = ro + rd * t; vec2 s = vol(p);
    if (s.r > .004) {
      float od = 0., ls = uVox * 1.6; vec3 q = p;
      for (int j = 0; j < 6; j++) { q += uSunLocal * ls; od += vol(q).r * ls; ls *= 1.75; }
      od *= uExt;
      float h = clamp(p.y / uSize.y, 0., 1.), fold = smoothstep(.42, .86, s.g);
      // direct + two multiple-scattering octaves (light still glows a little through thick lobes)
      vec3 sun = uSunColor * (exp(-od) * ph + .3 * exp(-od * .3) * mix(1., ph, .5) + .08 * exp(-od * .08)) * mix(1., .45, fold);
      vec3 amb = mix(uAmbBot, uAmbTop, smoothstep(.0, .9, h)) * mix(.9, .14, fold);   // grey-violet folds
      vec3 bnc = uBounce * pow(1. - h, 1.6) * mix(1., .55, fold);                       // warm belly
      float tr = exp(-s.r * uExt * st);
      col += (sun + amb + bnc) * (1. + uHover * .14) * (1. - tr) * T; T *= tr; t += st;
    } else t += st * 2.2;
  }
  if (T > .995) discard;
  gl_FragColor = vec4(col, 1. - T);                                                     // premultiplied
}`;

/** One hero cloud mesh (box raymarched). opts: { seed, length (m), shape } */
export function createHeroCloud({ seed = SEED, length = 900, shape = null } = {}) {
  const { data, dims, spheres } = sculptCloud({ seed, shape });
  const [NX, NY, NZ] = dims, vox = length / NX, size = new THREE.Vector3(NX * vox, NY * vox, NZ * vox);
  const tex = new THREE.Data3DTexture(data, NX, NY, NZ); tex.format = THREE.RGFormat; tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping; tex.unpackAlignment = 1; tex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    name: 'M_cloud', vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { tVol: { value: tex }, uSize: { value: size }, uVox: { value: vox }, uExt: { value: .9 / vox }, uStep: { value: .85 },
      uCamLocal: { value: new THREE.Vector3() }, uSunLocal: { value: new THREE.Vector3(0, 1, 0) }, uSunWorld: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) }, uAmbTop: { value: new THREE.Color() }, uAmbBot: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHover: { value: 0 } },
  });
  mat.userData.clay = mat;                                         // clay mode keeps clouds as they are (they are already white)
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z).translate(0, size.y / 2, 0);   // pivot: centre of the base
  const mesh = new THREE.Mesh(geo, mat); mesh.name = `hero_cloud_${seed}`; mesh.castShadow = mesh.receiveShadow = false;
  const inv = new THREE.Matrix4();
  mesh.onBeforeRender = (r, s, camera) => {
    inv.copy(mesh.matrixWorld).invert();
    mat.uniforms.uCamLocal.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    mat.uniforms.uSunLocal.value.copy(mat.uniforms.uSunWorld.value).transformDirection(inv);
  };
  mesh.userData = { seed, length, spheres, size: size.clone() };
  return mesh;
}

/**
 * Build many clouds (yields between them so a loader can paint).
 * list: [{ seed, length?, shape?, x?, y?, z?, yaw? }] → Group 'L_clouds'
 */
export async function createHeroClouds(list, { onProgress = () => {}, name = 'L_clouds' } = {}) {
  const g = new THREE.Group(); g.name = name;
  for (let i = 0; i < list.length; i++) {
    const c = list[i], m = createHeroCloud(c);
    m.position.set(c.x ?? 0, c.y ?? 0, c.z ?? 0); m.rotation.y = c.yaw ?? 0; g.add(m);
    onProgress((i + 1) / list.length); await new Promise(r => setTimeout(r, 0));
  }
  return g;
}

/** Light hero clouds for a mood: sun from the kit's MOODS (same light as the objects), sky colours from the cloud kit. */
export function setHeroCloudMood(root, mood = 'golden') {
  const k = MOODS[mood].key, cm = CLOUD_MOODS[mood], sun = sunDirection(k.azimuth, k.elevation);
  const sunCol = new THREE.Color(k.color).multiplyScalar(k.intensity * .62);
  root.traverse(o => {
    const u = o.material?.name === 'M_cloud' ? o.material.uniforms : null; if (!u) return;
    u.uSunWorld.value.copy(sun); u.uSunColor.value.copy(sunCol);
    u.uAmbTop.value.set(cm.amb.top).multiplyScalar(mood === 'dusk' ? 1.1 : 1); u.uAmbBot.value.set(cm.amb.bottom).multiplyScalar(1.15);
    u.uBounce.value.set(cm.bounce ?? 0).multiplyScalar(1.6);
  });
}

/** Ray-march step in voxels (0.85 high quality, 1.4 low). */
export function setHeroCloudQuality(root, q = 'high') { root.traverse(o => { if (o.material?.name === 'M_cloud') o.material.uniforms.uStep.value = q === 'high' ? .85 : 1.4; }); }
