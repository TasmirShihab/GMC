// ─────────────────────────────────────────────────────────────────────────────
// GMC UI · clouds for the shell (golden only)
//  createCloudSea(host) — the opening: raymarched golden cloud sea + sky (shared/gmc-clouds.js),
//                         camera = a plain object the shell tweens with GSAP.
//  (the soft fly-through clouds for the landmark transitions live in cloud-flight.js)
// Both stop rendering when their host is hidden (setRunning).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createCloudLayer, createSky, CLOUD_MOODS, sunVector } from 'gmc-clouds';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Golden cloud sea. cam: { px, py, pz, tx, ty, tz, fov } in metres (cloud deck 1.5–3.8 km). */
export async function createCloudSea(host, { onProgress = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const PR = () => Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(PR()); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42, 1, 5, 140000);
  const clouds = await createCloudLayer(renderer, { onProgress });
  const scene = new THREE.Scene(), sky = createSky(); scene.add(sky);
  const m = CLOUD_MOODS.golden, sun = new THREE.DirectionalLight(m.sun.color, m.sun.intensity * .45), hemi = new THREE.HemisphereLight(m.amb.top, m.amb.bottom, 1.1);
  sun.position.copy(sunVector(m.sun.az, m.sun.el)).multiplyScalar(50000); scene.add(sun, hemi); scene.fog = new THREE.FogExp2(m.haze, 1 / m.hazeDist);
  clouds.setMood('golden'); sky.setMood('golden'); clouds.setCoverage(.72); clouds.setCirrus(.4); renderer.toneMappingExposure = m.exposure;
  const sz = () => [Math.max(4, Math.round(host.clientWidth * PR())), Math.max(4, Math.round(host.clientHeight * PR()))];
  const sceneRT = new THREE.WebGLRenderTarget(...sz(), { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(...sz()) });
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(...sz(), { type: THREE.HalfFloatType }));
  const comp = new ShaderPass(clouds.compositeShader(sceneRT.texture)); comp.uniforms.tScene.value = sceneRT.texture;
  const bloom = new UnrealBloomPass(new THREE.Vector2(...sz()), m.bloom.strength, m.bloom.radius, m.bloom.threshold);
  composer.addPass(comp); composer.addPass(bloom); composer.addPass(new OutputPass());
  function resize() { const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; renderer.setPixelRatio(PR()); renderer.setSize(w, h);
    const [W, H] = sz(); sceneRT.setSize(W, H); composer.setPixelRatio(1); composer.setSize(W, H); bloom.resolution.set(W, H); clouds.setSize(W, H);
    camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  // "above": skimming the tops towards the low golden sun (the cloud viewer's hero shot)
  const cam = { px: 9000, py: 4300, pz: 2000, tx: -11000, ty: 2500, tz: 9000, fov: 42 };
  let running = true; const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), .05);
    camera.position.set(cam.px, cam.py, cam.pz); camera.lookAt(cam.tx, cam.ty, cam.tz); if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    clouds.update(dt, camera);
    renderer.setRenderTarget(sceneRT); renderer.render(scene, camera); renderer.setRenderTarget(null);
    comp.uniforms.tClouds.value = clouds.render(camera, null); composer.render();
  });
  return { cam, clouds, setRunning(v) { running = v; if (v) clock.getDelta(); } };
}

