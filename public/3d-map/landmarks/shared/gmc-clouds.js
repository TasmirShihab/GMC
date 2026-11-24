// ─────────────────────────────────────────────────────────────────────────────
// GMC volumetric clouds · v1.2.0   (environment kit E5, design.md §7)
// Raymarched cumulus at map scale (metres), depth-aware so it can sit over the
// GMC map. No interactive wind physics: clouds only drift and billow slowly.
//
// Texture: 128³ Perlin-Worley base + 64³ Worley detail, two-scale erosion with
//   swirl distortion (crisp cauliflower tops, wispy bases).
// Depth:   Beer–Lambert sun light-march (self-shadowing), sky-light occlusion
//   (dark crevices and bellies), dual-lobe Henyey–Greenstein + multiple-scattering
//   octaves (silver lining), powder darkening, a high cirrus layer above the
//   cumulus, and aerial perspective that tints distance towards the horizon.
//
// Usage:
//   const clouds = await createCloudLayer(renderer, { onProgress });
//   each frame: clouds.update(dt, camera); render your scene into a target with
//   a DepthTexture; clouds.render(camera, target.depthTexture); composite with
//   new ShaderPass(clouds.compositeShader(target.texture)) — then set
//   pass.uniforms.tScene.value = target.texture again (ShaderPass drops RT textures).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { MOODS, TOKENS } from './gmc-kit.js';
import { idbOpen, idbGet } from './gmc-recipes.js';
import { cloudNoiseData } from './gmc-cloud-noise.js';

export const CLOUDS_VERSION = '1.3.0';   // 1.3.0: noise volumes built in a Web Worker, cached in IndexedDB and shared by every caller · 1.2.0: cauliflower billows (3-scale erosion), crease shading, warm belly bounce, sharper reconstruction

// ═══════════════════════════════════════════════════════════════ moods ═════
// GOLDEN follows the Columbus hero; DUSK / DAY take the sun from the GMC kit.
const C = h => new THREE.Color(h);
export const CLOUD_MOODS = {
  golden: { sun: { az: 250, el: 6, color: 0xffe0b4, intensity: 3.4 },
    sky: { zenith: 0x4f86c4, mid: 0x93b8dd, horizon: 0xf6d8ae, deck: 0x9c94b4, glow: 0xffd08a, glowStr: 1 },
    amb: { top: 0x8fa9d4, bottom: 0x5c5684 }, bounce: 0x7a4a2c, haze: 0xe9d9c4, hazeDist: 55000, exposure: .85,
    bloom: { strength: .16, radius: .55, threshold: 1.2 } },
  dusk: { sun: { az: MOODS.dusk.key.azimuth, el: MOODS.dusk.key.elevation, color: TOKENS.marigold, intensity: 2.8 },
    sky: { zenith: 0x10162a, mid: 0x262a44, horizon: 0x6b4a3a, deck: 0x221b24, glow: 0xffb978, glowStr: .85 },
    amb: { top: 0x3a4a72, bottom: 0x22161c }, bounce: 0x4a2a18, haze: 0x3b3038, hazeDist: 40000, exposure: 1.05, cirrus: .35,
    bloom: { strength: .22, radius: .5, threshold: 1.1 } },
  day: { sun: { az: MOODS.day.key.azimuth, el: MOODS.day.key.elevation, color: TOKENS.glowCream, intensity: 3.6 },
    sky: { zenith: 0x7fa3c8, mid: 0xb4c8dc, horizon: 0xdce1e6, deck: 0xa9b0ba, glow: 0xfff3dc, glowStr: .6 },
    amb: { top: 0xa9bcd2, bottom: 0x6c7482 }, bounce: 0x4e4a3e, haze: 0xd3d9df, hazeDist: 65000, exposure: .95, cirrus: .8,
    bloom: { strength: .1, radius: .4, threshold: 1.3 } },
};
export function sunVector(az, el) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

// ═════════════════════════════════════════════════════════ noise volumes ═══
// 1.3.0: the volumes are plain byte arrays from gmc-cloud-noise.js, built in a Web Worker (off the main
// thread), cached in IndexedDB per CLOUDS_VERSION, and shared: every caller in a page gets the same textures.
const _noise = new Map();
function noiseArrays(size, detail, onProgress) {
  const cacheKey = `clouds-${CLOUDS_VERSION}|noise:${size}:${detail}`;
  return (async () => {
    const db = await idbOpen().catch(() => null), hit = db && await idbGet(db, cacheKey);
    if (hit?.base) { onProgress(1); return hit; }
    try {
      return await new Promise((resolve, reject) => {
        const w = new Worker(new URL('./gmc-cloud-noise-worker.js', import.meta.url), { type: 'module' });
        w.onmessage = ({ data }) => {
          if (data.progress != null) onProgress(data.progress);
          else if (data.data) resolve(data.data);
          else if (data.stored) w.terminate();
          else if (data.error) { w.terminate(); reject(new Error(data.error)); }
        };
        w.onerror = e => { e.preventDefault?.(); w.terminate(); reject(e.error || new Error(e.message || 'cloud noise worker failed')); };
        w.postMessage({ size, detail, cacheKey });
      });
    } catch (e) {
      console.warn('[clouds] noise worker unavailable, building on the page:', e?.message || e);
      return cloudNoiseData({ size, detail, onProgress });
    }
  })();
}
export function buildCloudNoise({ size = 128, detail = 64, onProgress = () => {} } = {}) {
  const key = size + ':' + detail;
  if (!_noise.has(key)) _noise.set(key, noiseArrays(size, detail, onProgress).then(d => {
    const tex3 = (data, n) => { const t = new THREE.Data3DTexture(data, n, n, n); t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
      t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    const weather = new THREE.DataTexture(d.weather, 256, 256, THREE.RGBAFormat, THREE.UnsignedByteType);
    weather.wrapS = weather.wrapT = THREE.RepeatWrapping; weather.minFilter = weather.magFilter = THREE.LinearFilter; weather.needsUpdate = true;
    return { base: tex3(d.base, size), detail: tex3(d.det, detail), weather };
  }));
  else onProgress(1);
  return _noise.get(key);
}

// ════════════════════════════════════════════════════════════════ shaders ══
const FS_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const CLOUD_FRAG = /* glsl */`
precision highp float; precision highp sampler3D;
varying vec2 vUv;
uniform sampler3D tBase; uniform sampler3D tDetail; uniform sampler2D tWeather; uniform sampler2D tDepth;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos; uniform float uNear; uniform float uFar; uniform float uUseDepth;
uniform vec3 uBoxMin; uniform vec3 uBoxMax;
uniform float uTime; uniform vec2 uDrift;
uniform float uCoverage; uniform float uDensity; uniform float uExt;
uniform float uBaseScale; uniform float uDetailScale; uniform float uWeatherScale; uniform float uDetailAmt; uniform float uRise;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uAmbTop; uniform vec3 uAmbBot; uniform vec3 uBounce; uniform vec3 uHaze; uniform vec3 uHorizon; uniform float uHazeDist;
uniform float uMaxSteps; uniform float uLightSteps; uniform float uFrame; uniform float uCirrus; uniform float uCirrusY; uniform float uCirrusGain;
#define PI 3.14159265
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / max(b - a, 1e-5) * (d - c); }
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / (4. * PI * pow(max(1. + g2 - 2. * g * c, 1e-4), 1.5)); }
vec2 boxHit(vec3 ro, vec3 rd){ vec3 inv = 1. / rd; vec3 a = (uBoxMin - ro) * inv, b = (uBoxMax - ro) * inv; vec3 mn = min(a, b), mx = max(a, b);
  return vec2(max(max(mn.x, mn.y), mn.z), min(min(mx.x, mx.y), mx.z)); }

float density(vec3 p, float cheap){
  float H = uBoxMax.y - uBoxMin.y, h = clamp((p.y - uBoxMin.y) / H, 0., 1.);
  float w = texture2D(tWeather, (p.xz + uDrift * .55) / uWeatherScale).r;
  float cov = clamp(remap(w, 1. - uCoverage, 1., 0., 1.), 0., 1.);
  if (cov <= .001) return 0.;
  float top = .45 + .55 * sqrt(cov);                                      // 1.2.0: even small cells heap up (cumulus, not sheets)
  float prof = smoothstep(0., .06, h) * (1. - smoothstep(top * .55, top, h)); // flat base, rounded top
  if (prof <= 0.) return 0.;
  vec3 q = vec3(p.x + uDrift.x, (p.y - uBoxMin.y) * 1.6, p.z + uDrift.y) / uBaseScale;
  float b = texture(tBase, q).r;
  float covH = cov * (1. - .55 * smoothstep(.1, top, h));                 // cells narrow as they rise → rounded domes
  float d = clamp(remap(b * prof, 1. - covH, 1., 0., 1.), 0., 1.) * cov;
  if (d <= 0.) return 0.;
  if (cheap < .5) {
    vec3 dq = (p + vec3(uDrift.x, 0., uDrift.y) * 1.2) / uDetailScale + vec3(0., -uTime * uRise, 0.);
    vec3 sw = vec3(texture(tDetail, dq * .31 + 7.1).r, texture(tDetail, dq * .31 + 3.7).r, texture(tDetail, dq * .31 + 1.3).r) - .5;
    dq += sw * .3;                                                        // light swirl: non-repeating, but lobes stay round (1.2.0: was .55, read as curls)
    // three-scale erosion (1.2.0): big lobes, lobes-on-lobes, and fine cauliflower curls
    float dn = texture(tDetail, dq).r * .5 + texture(tDetail, dq * 2.9 + .37).r * .3 + texture(tDetail, dq * 7.3 + .71).r * .2;
    float m = mix(dn, 1. - dn, smoothstep(.0, .09, h));                  // wisps only at the very base; the whole cloud billows above it
    d = clamp(remap(d, m * uDetailAmt, 1., 0., 1.), 0., 1.);
    d = d * smoothstep(0., .12, d);                                       // firmer boundary: lobes read as crisp, rounded forms
  }
  return d * uDensity * mix(.75, 1.15, smoothstep(.0, .45, h));          // denser cores read as solid forms
}
float lightOD(vec3 p){
  float H = uBoxMax.y - uBoxMin.y, st = H * .07, od = 0.;
  for (int i = 0; i < 7; i++) { if (float(i) >= uLightSteps) break; float s = st * (1. + float(i) * .85); p += uSunDir * s; od += density(p, i < 2 ? 0. : 1.) * s; }
  return od * uExt;
}
float skyOD(vec3 p){                                                     // how buried this point is under cloud above it
  return (density(p + vec3(0., 140., 0.), 1.) * 140. + density(p + vec3(0., 420., 0.), 1.) * 280.) * uExt;
}
// thin high cirrus sheet: gives the sky a second depth layer
vec4 cirrus(vec3 ro, vec3 rd){
  if (uCirrus <= 0. || rd.y <= 0.002 || ro.y > uCirrusY) return vec4(0.);
  float t = (uCirrusY - ro.y) / rd.y; vec3 p = ro + rd * t;
  float c = texture2D(tWeather, (p.xz + uDrift * 1.6) / (uWeatherScale * 1.6)).g;
  c = smoothstep(.6, 1., c) * uCirrus * (1. - smoothstep(30000., 90000., t));
  vec3 col = uSunColor * (.08 + .3 * hg(dot(rd, uSunDir), .6) * 4. * PI * .25) + uAmbTop * .75;
  col = mix(col, uHorizon, 1. - exp(-t / (uHazeDist * 1.4)));
  c *= uCirrusGain; return vec4(col * c, c);
}
void main(){
  vec4 vp = uInvProj * vec4(vUv * 2. - 1., 1., 1.); vp.xyz /= vp.w;
  vec3 dv = normalize(vp.xyz), rd = normalize((uCamWorld * vec4(dv, 0.)).xyz), ro = uCamPos;
  float sceneT = 1e9;
  if (uUseDepth > .5) { float z = texture2D(tDepth, vUv).r; if (z < 1.) sceneT = ((uNear * uFar) / ((uFar - uNear) * z - uFar)) / dv.z; }
  vec4 ci = sceneT > 1e8 ? cirrus(ro, rd) : vec4(0.);
  vec2 tb = boxHit(ro, rd); float t0 = max(tb.x, 0.), t1 = min(tb.y, sceneT);
  if (t1 <= t0) { gl_FragColor = ci; return; }
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))) + uFrame * .61803);
  float cosT = dot(rd, uSunDir), H = uBoxMax.y - uBoxMin.y;
  vec3 col = vec3(0.); float T = 1., t = t0, tw = 0., wsum = 0.;
  // finer steps (1.2.0) so small lobes stay sharp; empty space is still skipped quickly
  t += clamp(t0 * .006 + 10., 10., 420.) * jit;
  for (int i = 0; i < 300; i++) {
    if (float(i) >= uMaxSteps || t > t1 || T < .01) break;
    float dt = clamp(t * .006 + 10., 10., 420.);
    vec3 p = ro + rd * t; float d = density(p, 0.);
    if (d > .0005) {
      float od = lightOD(p), h = clamp((p.y - uBoxMin.y) / H, 0., 1.);
      vec3 sunL = vec3(0.); float a = 1., bb = 1., cc = 1.;
      for (int o = 0; o < 3; o++) { float ph = mix(hg(cosT, .72 * cc), hg(cosT, -.22 * cc), .28) * 4. * PI; sunL += a * exp(-od * bb) * ph; a *= .5; bb *= .3; cc *= .55; }
      float powder = 1. - exp(-od * 2.4);
      sunL *= mix(1., mix(.25, 1., powder), clamp(.7 - .7 * cosT, 0., 1.));
      float ao = exp(-skyOD(p) * .55);                                     // sky light is blocked under cloud
      // crease occlusion (1.2.0): how deep this point sits inside its own lobe → the grey-violet folds between billows
      float crease = exp(-(density(p + uSunDir * 60. + vec3(0., 40., 0.), 1.) + density(p - uSunDir * 60. + vec3(0., 40., 0.), 1.)) * 40. * uExt);
      vec3 amb = mix(uAmbBot, uAmbTop, pow(h, .65)) * (.32 + .68 * ao) * (.6 + .4 * crease);
      vec3 bounce = uBounce * pow(1. - h, 2.) * (.4 + .6 * ao);           // warm light thrown up from the land onto the bellies
      vec3 S = uSunColor * sunL + amb + bounce;
      float Tr = exp(-d * uExt * dt);
      col += S * (1. - Tr) * T;
      float wgt = (1. - Tr) * T; tw += t * wgt; wsum += wgt;
      T *= Tr; t += dt;
    } else t += dt * 2.4;
  }
  float tAvg = wsum > 0. ? tw / wsum : t0;
  float fog = 1. - exp(-tAvg / uHazeDist);
  col = mix(col, mix(uHaze, uHorizon, fog) * (1. - T), fog);             // aerial perspective, bluer/warmer far away
  // cirrus sits behind the cumulus
  gl_FragColor = vec4(col + ci.rgb * T, 1. - T * (1. - ci.a));
}`;

// Denoise: 9-tap tent filter over the jittered raymarch (hides the dither pattern), then blend with history.
// 1.2.0: the spatial blur fades out while the camera holds still (uBlur → low); temporal history does the denoising then, so lobes stay sharp.
const ACCUM_FRAG = /* glsl */`precision highp float; varying vec2 vUv; uniform sampler2D tCur; uniform sampler2D tPrev; uniform float uAlpha; uniform vec2 uTexel; uniform float uBlur;
void main(){
  vec2 o = uTexel;
  vec4 ctr = texture2D(tCur, vUv);
  vec4 c = ctr * 4.
    + (texture2D(tCur, vUv + vec2(o.x, 0.)) + texture2D(tCur, vUv - vec2(o.x, 0.)) + texture2D(tCur, vUv + vec2(0., o.y)) + texture2D(tCur, vUv - vec2(0., o.y))) * 2.
    + texture2D(tCur, vUv + o) + texture2D(tCur, vUv - o) + texture2D(tCur, vUv + vec2(o.x, -o.y)) + texture2D(tCur, vUv + vec2(-o.x, o.y));
  gl_FragColor = mix(texture2D(tPrev, vUv), mix(ctr, c / 16., uBlur), uAlpha);
}`;

export const SKY_VERT = /* glsl */`varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
export const SKY_FRAG = /* glsl */`precision highp float; varying vec3 vDir;
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uDeck; uniform vec3 uGlow; uniform vec3 uSunDir; uniform float uGlowStr;
void main(){
  vec3 d = normalize(vDir); float e = d.y;
  // below the horizon: a hazy lavender lower deck (more cloud and haze beneath), not a flat ground colour
  vec3 c = e > 0. ? mix(uHorizon, mix(uMid, uZenith, smoothstep(.12, .75, e)), smoothstep(0., .22, e)) : mix(uHorizon, uDeck, smoothstep(0., -.12, e));
  float cs = max(dot(d, uSunDir), 0.);
  // sun: soft aureole, tight halo, bright core and disc (falls off fast so facing the sun doesn't wash out the sky)
  c += uGlow * uGlowStr * (pow(cs, 24.) * .16 + pow(cs, 160.) * .55 + pow(cs, 1800.) * 3.5 + smoothstep(.99988, .99996, cs) * 16.);
  c += uGlow * uGlowStr * .12 * pow(cs, 4.) * (1. - smoothstep(0., .22, abs(e)));   // warm band along the horizon
  gl_FragColor = vec4(c, 1.);
}`;

/** Sky dome (follows the camera). setMood(name) recolours it. */
export function createSky() {
  const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
    uniforms: { uZenith: { value: C(0) }, uMid: { value: C(0) }, uHorizon: { value: C(0) }, uDeck: { value: C(0) }, uGlow: { value: C(0) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uGlowStr: { value: 1 } } });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90000, 48, 24), mat); mesh.frustumCulled = false; mesh.renderOrder = -1; mesh.name = 'sky';
  mesh.onBeforeRender = (r, s, cam) => mesh.position.copy(cam.position);
  mesh.setMood = name => { const m = CLOUD_MOODS[name], u = mat.uniforms;
    u.uZenith.value.set(m.sky.zenith); u.uMid.value.set(m.sky.mid); u.uHorizon.value.set(m.sky.horizon); u.uDeck.value.set(m.sky.deck); u.uGlow.value.set(m.sky.glow); u.uGlowStr.value = m.sky.glowStr;
    u.uSunDir.value.copy(sunVector(m.sun.az, m.sun.el)); };
  return mesh;
}

// ═══════════════════════════════════════════════════════════ cloud layer ═══
/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ min?:number[], max?:number[], quality?:'high'|'low', drift?:number, onProgress?:(f:number)=>void }} opts
 *   min/max: cloud volume in world metres (default 60 × 60 km field, 1.5–3.8 km altitude)
 *   drift:   slow drift speed in m/s of screen motion (0 = frozen clouds)
 */
export async function createCloudLayer(renderer, { min = [-30000, 1500, -30000], max = [30000, 3800, 30000], quality = 'high', drift = 40, onProgress } = {}) {
  const tex = await buildCloudNoise({ onProgress });
  const boxMin = new THREE.Vector3(...min), boxMax = new THREE.Vector3(...max);
  const mk = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const raw = mk(); let histA = mk(), histB = mk();
  const U = {
    tBase: { value: tex.base }, tDetail: { value: tex.detail }, tWeather: { value: tex.weather }, tDepth: { value: null },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uNear: { value: 1 }, uFar: { value: 1e5 }, uUseDepth: { value: 0 }, uBoxMin: { value: boxMin }, uBoxMax: { value: boxMax },
    uTime: { value: 0 }, uDrift: { value: new THREE.Vector2() },
    // 1.2.0: denser (crisper edges), finer and stronger erosion (cauliflower billows)
    uCoverage: { value: .72 }, uDensity: { value: 1 }, uExt: { value: .1 },
    uBaseScale: { value: 7000 }, uDetailScale: { value: 1050 }, uWeatherScale: { value: 22000 }, uDetailAmt: { value: .6 }, uRise: { value: .004 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: C(0xffffff) }, uAmbTop: { value: C(0) }, uAmbBot: { value: C(0) }, uBounce: { value: C(0) },
    uHaze: { value: C(0) }, uHorizon: { value: C(0) }, uHazeDist: { value: 50000 }, uMaxSteps: { value: 260 }, uLightSteps: { value: 6 }, uFrame: { value: 0 },
    uCirrus: { value: .4 }, uCirrusY: { value: 9500 }, uCirrusGain: { value: 1 },
  };
  const cloudQuad = new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: CLOUD_FRAG, uniforms: U }));
  const accumMat = new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: ACCUM_FRAG, uniforms: { tCur: { value: raw.texture }, tPrev: { value: null }, uAlpha: { value: 1 }, uTexel: { value: new THREE.Vector2(1, 1) }, uBlur: { value: 1 } } });
  const accumQuad = new FullScreenQuad(accumMat);

  let mood = 'golden', scale = .66, frame = 0, speed = drift; const lastCam = new THREE.Matrix4(); let moving = 1;
  const driftDir = new THREE.Vector2(Math.sin(70 * Math.PI / 180), -Math.cos(70 * Math.PI / 180));
  function setMood(name) {
    mood = name; const m = CLOUD_MOODS[name];
    U.uSunDir.value.copy(sunVector(m.sun.az, m.sun.el)); U.uSunColor.value.set(m.sun.color).multiplyScalar(m.sun.intensity);
    U.uAmbTop.value.set(m.amb.top); U.uAmbBot.value.set(m.amb.bottom); U.uBounce.value.set(m.bounce ?? 0);
    U.uHaze.value.set(m.haze); U.uHorizon.value.set(m.sky.horizon); U.uHazeDist.value = m.hazeDist; U.uCirrusGain.value = m.cirrus ?? 1; moving = 1;
  }
  let lastW = 4, lastH = 4;
  function setSize(w, h) { lastW = w; lastH = h; const W = Math.max(4, Math.round(w * scale)), H = Math.max(4, Math.round(h * scale)); raw.setSize(W, H); histA.setSize(W, H); histB.setSize(W, H); accumMat.uniforms.uTexel.value.set(1 / W, 1 / H); moving = 1; }
  function setQuality(q) { scale = q === 'high' ? .8 : .5; U.uMaxSteps.value = q === 'high' ? 260 : 130; U.uLightSteps.value = q === 'high' ? 6 : 4; setSize(lastW, lastH); }

  function update(dt, camera) {
    U.uDrift.value.addScaledVector(driftDir, speed * dt); U.uTime.value += dt;
    camera.updateMatrixWorld();
    const diff = camera.matrixWorld.elements.reduce((s, v, i) => s + Math.abs(v - lastCam.elements[i]), 0);
    moving = Math.max(moving * Math.exp(-dt * 6), diff > .5 ? 1 : 0); lastCam.copy(camera.matrixWorld);
    U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld); U.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    U.uNear.value = camera.near; U.uFar.value = camera.far;
  }
  /** Raymarch the clouds and accumulate over frames. depthTexture: the scene's depth, so clouds stop at the map. */
  function render(camera, depthTexture = null) {
    const prev = renderer.getRenderTarget();
    U.tDepth.value = depthTexture; U.uUseDepth.value = depthTexture ? 1 : 0; U.uFrame.value = (frame++ % 64);
    renderer.setRenderTarget(raw); cloudQuad.render(renderer);
    accumMat.uniforms.tPrev.value = histA.texture; accumMat.uniforms.uAlpha.value = moving > .05 ? .55 : .14;   // always average a little, even while moving
    accumMat.uniforms.uBlur.value = moving > .05 ? 1 : .25;                                                      // still camera: sharp, history denoises
    renderer.setRenderTarget(histB); accumQuad.render(renderer); [histA, histB] = [histB, histA];
    renderer.setRenderTarget(prev); return histA.texture;
  }
  function compositeShader(sceneTexture) {
    return { uniforms: { tScene: { value: sceneTexture }, tClouds: { value: null } }, vertexShader: FS_VERT,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tClouds;
        void main(){ vec4 s = texture2D(tScene, vUv); vec4 c = texture2D(tClouds, vUv); gl_FragColor = vec4(s.rgb * (1. - c.a) + c.rgb, 1.); }` };
  }
  setMood('golden'); setQuality(quality);
  return { uniforms: U, boxMin, boxMax, setMood, setQuality, setSize, update, render, compositeShader,
    get mood() { return mood; }, setCoverage: c => { U.uCoverage.value = c; }, setDrift: s => { speed = s; }, setCirrus: c => { U.uCirrus.value = c; } };
}
