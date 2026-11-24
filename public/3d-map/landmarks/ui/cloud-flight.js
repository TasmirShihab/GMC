// ─────────────────────────────────────────────────────────────────────────────
// GMC UI · cloud flight (golden only): a soft cloud you fly through, not chunks.
// One full-screen raymarch through a Perlin-Worley density field (the cloud sea's own noise, 64³),
// lit by a low golden sun with beer-powder shading and a forward-scatter silver lining. Rendered at
// ~half resolution (clouds are soft) and written as premultiplied alpha over the landmark below.
//   A field of separate cumulus (references/clouds.mp4) between z = back … front, sky between;
//   the camera dollies over and into it (whiteout), the model swaps, then it drops out below.
// Tween with GSAP: cam {px,py,pz,tx,ty,tz,fov}, look {cover, fill, erode, density}, bank {front, back}.
//   cover 0..1 how much cloud · fill 0..1 inside-the-cloud whiteout · erode 0..1 dissolve to wisps.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { sunVector, buildCloudNoise } from 'gmc-clouds';

const FLIGHT_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const FLIGHT_FRAG = /* glsl */`
precision highp float; precision highp sampler3D;
#define STEPS 56
uniform sampler3D tBase, tDetail;
uniform vec3 uPos, uRight, uUp, uFwd, uSun, uLit, uShade, uAmb, uFillA, uFillB, uHaze;
uniform float uTan, uAspect, uTime, uCover, uFill, uErode, uDensity, uZFront, uZBack;
varying vec2 vUv;

float field(vec3 p, bool det) {
  vec3 w = vec3(uTime * 14., uTime * 3., uTime * 5.);                       // slow wind: the cloud keeps billowing
  // a field of separate cumulus with sky between (clouds.mp4)
  float hgt = (p.y + 700.) / 2900.;                                          // the cumulus layer: y −700 … +2200
  if (hgt <= 0. || hgt >= 1.) return 0.;                                     // (early outs return exactly what the full maths would: zero)
  float lo = texture(tBase, (p + w) / 2600.).r;                              // where the cumulus are
  float top = .18 + .82 * lo;                                                // bigger clouds tower higher: separate heaps, sky between
  if (hgt >= top) return 0.;
  float lo2 = texture(tBase, (p + w * .6) / 1050. + .21).r;                  // their billows
  float hs = smoothstep(0., .05, hgt) * (1. - smoothstep(top * .5, top, hgt));   // flat bases, rounded tops
  float disp = (lo2 - .35) * 900.;
  float slab = smoothstep(0., 700., uZFront - p.z + disp) * smoothstep(0., 700., p.z - uZBack + disp);
  float s = lo * (.7 + .6 * lo2) * hs;                                       // separate puffs: placement × billows
  float d = clamp((s + uCover * slab - 1.) * 4., 0., 1.);
  if (d <= 0.) return 0.;
  if (det) {                                                                 // cauliflower billows, then fine wisps, cut into the edges
    float b3 = texture(tBase, (p + w * 1.3) / 460. + .63).r;
    d = clamp(d - (1. - b3) * .42 * (1. - d * .45), 0., 1.);
    float hi = texture(tDetail, (p + w * 1.7) / 210.).r;
    d = clamp(d - (1. - hi) * .4 * (1. - d * .6), 0., 1.);
  }
  return clamp((d - uErode) / (1. - uErode * .95), 0., 1.) * (1. - uErode * uErode * uErode);
}

vec2 slabT(float o, float d, float lo, float hi) {
  if (abs(d) < 1e-5) return (o > lo && o < hi) ? vec2(-1e9, 1e9) : vec2(1., -1.);
  float a = (lo - o) / d, b = (hi - o) / d; return vec2(min(a, b), max(a, b));
}

void main() {
  vec2 ndc = vUv * 2. - 1.;
  vec3 ro = uPos, rd = normalize(uFwd + ndc.x * uTan * uAspect * uRight + ndc.y * uTan * uUp);
  vec2 sz = slabT(ro.z, rd.z, uZBack - 800., uZFront + 800.), sy = slabT(ro.y, rd.y, -800., 2300.);   // z-slab ∩ the cumulus layer
  float t0 = max(max(sz.x, sy.x), 0.), t1 = min(min(sz.y, sy.y), t0 + 5200.);
  float mu = dot(rd, uSun);
  vec3 col = vec3(0.); float T = 1.;
  if (t1 > t0 && uFill < .995) {                                            // fully inside the white: nothing to march
    float L = t1 - t0, j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
    float phase = .78 + 1.5 * pow(max(mu, 0.), 8.) + .22 * mu;               // silver lining towards the sun
    for (int i = 0; i < STEPS; i++) {
      float f0 = (float(i) + j) / float(STEPS), f1 = (float(i) + 1. + j) / float(STEPS);
      float ta = t0 + L * f0 * f0, dt = L * (f1 * f1 - f0 * f0);             // finer steps near the eye: wisps rush past crisply
      vec3 p = ro + rd * ta;
      float d = field(p, true);
      if (d > .003) {
        // sun: three samples towards the sun (self-shadowed billows) · sky: open sky above brightens the tops, darkens the bellies
        float x = field(p + uSun * 80., false) * .8 + field(p + uSun * 220., false) * .8 + field(p + uSun * 520., false) * .6;
        float Tl = exp(-x * 3.) * .7 + exp(-x * .6) * .45;                  // + multiple scattering: deep inside a cloud is bright, not grey
        float sky = .62 + .38 * exp(-field(p + vec3(0., 200., 0.), false) * 2.2);
        float powder = 1. - exp(-d * 6.);
        vec3 c = min(uShade * sky + uLit * phase * Tl * (.35 + .65 * powder) + uAmb * .05, vec3(1.));
        float far = exp(-ta / 4200.);                                      // aerial depth: far cumulus soften and thin into the sky
        c = mix(uHaze, c, far);
        float a = 1. - exp(-d * uDensity * dt * (.25 + .75 * far));
        col += T * a * c; T *= 1. - a;
        if (T < .015) break;
      }
    }
  }
  vec4 o = vec4(col, 1. - T);
  vec3 fillC = mix(uFillA, uFillB, .5 + .5 * mu);                            // inside the cloud: bright towards the sun
  gl_FragColor = mix(o, vec4(fillC, 1.), uFill);
}`;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rgb = h => V(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);   // display-space, no colour management

export async function createCloudFlight(host, { scale = .6, onProgress = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  const PR = () => Math.min(devicePixelRatio, 1.5) * scale;
  renderer.setPixelRatio(PR()); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  // the sky behind the clouds (its own layer, so it can fade separately from the clouds)
  const sky = document.createElement('div');
  sky.style.cssText = 'position:absolute;inset:0;opacity:0;background:linear-gradient(180deg,#3f86d4 0%,#6fb0e8 38%,#a9d2f2 66%,#f4dcb6 100%)';
  host.appendChild(sky);
  renderer.domElement.style.position = 'relative';
  host.appendChild(renderer.domElement);
  const noise = await buildCloudNoise({ onProgress });   // the cloud sea's own 128³ volumes: shared, built once
  // smoothness: this full-screen march samples its noise many times per pixel, so it uses a half-size copy
  // (128³ → 64³, 64³ → 32³, 2×2×2 average, ~10 ms): 8× less memory per lookup, far fewer texture-cache misses
  const half3 = tex => { const n = tex.image.width, m = n / 2, s = tex.image.data, o = new Uint8Array(m * m * m);
    for (let z = 0; z < m; z++) for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) { let a = 0;
      for (let k = 0; k < 8; k++) a += s[((2 * z + (k >> 2)) * n + 2 * y + ((k >> 1) & 1)) * n + 2 * x + (k & 1)];
      o[(z * m + y) * m + x] = a >> 3; }
    const t = new THREE.Data3DTexture(o, m, m, m); t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true; return t; };
  const U = {
    tBase: { value: half3(noise.base) }, tDetail: { value: half3(noise.detail) },
    uPos: { value: V(0, 0, 0) }, uRight: { value: V(1, 0, 0) }, uUp: { value: V(0, 1, 0) }, uFwd: { value: V(0, 0, -1) },
    uSun: { value: sunVector(200, 26) },                     // sun behind the viewer: bright, sunlit faces
    // high-key, like clouds.mp4: near-white sunlit faces with a warm golden tint, pale blue-grey shade
    uLit: { value: rgb(0xfff6e6).multiplyScalar(1.15) }, uShade: { value: rgb(0xcdd3df) }, uAmb: { value: rgb(0xf4e3c8) },
    uFillA: { value: rgb(0xf3ede6) }, uFillB: { value: rgb(0xfffaf0) }, uHaze: { value: rgb(0xdbe8f5) },
    uTan: { value: .5 }, uAspect: { value: 1 }, uTime: { value: 0 },
    uCover: { value: .9 }, uFill: { value: 0 }, uErode: { value: 0 }, uDensity: { value: .02 }, uZFront: { value: -700 }, uZBack: { value: -3400 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: FLIGHT_VERT, fragmentShader: FLIGHT_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad); const ocam = new THREE.Camera();
  function resize() { const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; renderer.setPixelRatio(PR()); renderer.setSize(w, h); U.uAspect.value = w / h; }
  addEventListener('resize', resize); resize();
  const cam = { px: 0, py: 0, pz: 400, tx: 0, ty: 0, tz: -600, fov: 55 };
  const look = { cover: .9, fill: 0, erode: 0, density: .08 };
  const bank = { front: -900, back: -9000 };
  const P = new THREE.Vector3(), F = new THREE.Vector3(), R = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let running = false; const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), .05); U.uTime.value += dt;
    P.set(cam.px, cam.py, cam.pz); F.set(cam.tx, cam.ty, cam.tz).sub(P).normalize(); R.crossVectors(F, UP).normalize();
    U.uPos.value.copy(P); U.uFwd.value.copy(F); U.uRight.value.copy(R); U.uUp.value.crossVectors(R, F);
    U.uTan.value = Math.tan(cam.fov * Math.PI / 360);
    U.uCover.value = look.cover; U.uFill.value = look.fill; U.uErode.value = look.erode; U.uDensity.value = look.density;
    U.uZFront.value = bank.front; U.uZBack.value = bank.back;
    renderer.render(scene, ocam);
  }
  renderer.setAnimationLoop(() => { if (running) frame(); });
  // compile + upload now (host is still invisible), not on the first frame of the first transition
  renderer.compile(scene, ocam); frame(); renderer.clear();
  return {
    cam, look, bank, sky,
    setRunning(v) { running = v; if (v) { clock.getDelta(); frame(); } },
  };
}
