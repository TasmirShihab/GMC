// ─────────────────────────────────────────────────────────────────────────────
// GMC UI · mini-map (bottom-right corner)
// The user's reference masterplan (references/build-3d-interactive-map), ported
// in masterplan-map.js: a round island with a model on each zone pad, roads with
// traffic and a ring of hills. Each GMC chapter sits on one zone and carries the
// diamond marker (leader line + ground pulse); the active zone lifts and glows.
// No box, no background: the island floats on a transparent canvas and the host
// fades its edges into the page (ui.css). Its camera can glide across the map
// when the host is expanded full screen.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { createMasterplan, ZONES } from './masterplan-map.js';

const S = .1;   // reference units → mini-map units (island radius 56 → 5.6)

export function createMiniMap(host, { pins = [], onSelect = () => {}, onHover = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, .05, 300);

  // golden-hour light: the reference's warm hemisphere + a lower, warmer sun for long soft shadows
  const hemi = new THREE.HemisphereLight('#fff6e8', '#c9ac80', .8);
  const sun = new THREE.DirectionalLight('#ffd9a8', 2.6); sun.position.set(-3.2, 4.2, 2.6).multiplyScalar(2.2);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 40 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(hemi, sun);

  // ── the island
  const slab = new THREE.Group(); scene.add(slab);
  const plan = createMasterplan(); plan.group.scale.setScalar(S); slab.add(plan.group);
  // a soft contact shadow under the floating island, fading to nothing (no hard edge anywhere)
  { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(10,7,5,.55)'); g.addColorStop(.6, 'rgba(10,7,5,.3)'); g.addColorStop(1, 'rgba(10,7,5,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c), m = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -.75, .2); scene.add(m); }

  // ── pins: the user's diamond marker: dark-teal halo diamond → teal diamond with a bright edge → glowing white core
  const teal = new THREE.Color(0x46c8b4), cream = new THREE.Color(0x2c6a63), grey = new THREE.Color(0x4a5654);   // leader lines: dark teal on the cream island
  function diamondTex(kind) {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    x.translate(N / 2, N / 2); x.rotate(Math.PI / 4);
    const sq = (s, fill, stroke, glow) => { x.save(); if (glow) { x.shadowColor = glow; x.shadowBlur = 16; } x.fillStyle = fill; x.fillRect(-s / 2, -s / 2, s, s);
      if (stroke) { x.shadowBlur = 0; x.lineWidth = 2; x.strokeStyle = stroke; x.strokeRect(-s / 2, -s / 2, s, s); } x.restore(); };
    if (kind === 'on') { sq(78, 'rgba(18,92,86,.55)'); sq(52, 'rgba(20,112,102,.9)', 'rgba(70,200,180,.95)', 'rgba(60,191,170,.6)'); sq(18, '#ffffff', null, 'rgba(200,255,245,1)'); sq(18, '#ffffff'); }
    else if (kind === 'live') { sq(44, 'rgba(20,112,102,.75)', 'rgba(70,200,180,.85)'); sq(14, '#ffffff', null, 'rgba(200,255,245,.9)'); }
    else { sq(30, 'rgba(28,44,44,.82)', 'rgba(70,200,180,.5)'); sq(10, 'rgba(240,232,215,.95)'); }   // dark so it reads on the cream island
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const TEX = { on: diamondTex('on'), live: diamondTex('live'), soon: diamondTex('soon') }, PIN = { on: .16, live: .1, soon: .08 };
  const pulseTex = (() => { const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    x.translate(N / 2, N / 2); x.rotate(Math.PI / 4); x.strokeStyle = '#fff'; x.lineWidth = 5; x.strokeRect(-40, -40, 80, 80);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const pinObjs = pins.map(p => {
    const z = ZONES[p.zone], zone = plan.zones[p.zone], g = new THREE.Group(), len = Math.min(2.4, z.markerY * S + .5);   // tall zones: the marker rides on the model rather than far above it
    const lineMat = new THREE.MeshBasicMaterial({ color: p.live ? cream : grey, transparent: true, opacity: .55, toneMapped: false });
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, len, 6).translate(0, len / 2, 0), lineMat);
    const mat = new THREE.SpriteMaterial({ map: p.live ? TEX.live : TEX.soon, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false, opacity: p.live ? 1 : .8 });
    const head = new THREE.Sprite(mat); head.position.y = len; head.scale.setScalar(PIN.live); head.renderOrder = 2;   // fixed on-screen size, at any zoom
    const pr = (z.pad.radius ?? Math.hypot(...z.pad.size) / 2) * S;
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(pr * 2.2, pr * 2.2).rotateX(-Math.PI / 2).translate(0, .05, 0),
      new THREE.MeshBasicMaterial({ map: pulseTex, color: teal, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    // pick by the marker or by the whole zone (pad + model)
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6).translate(0, len, 0), hitMat), hitZone = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, len, 16).translate(0, len / 2, 0), hitMat);
    g.add(line, head, ring, hit, hitZone); g.position.set(z.pos[0] * S, 0, z.pos[1] * S); slab.add(g); hit.userData.pin = hitZone.userData.pin = p;
    return { p, g, head, mat, lineMat, ring, hits: [hit, hitZone], zone };
  });

  // ── camera: corner view (oblique from the south-east) or a glide target when expanded
  const cam = { az: 152, el: 36, dist: 20, tx: 0, ty: -.2, tz: .2, fov: 26 };
  const dirV = new THREE.Vector3(), T = new THREE.Vector3();
  function place() { const a = cam.az * Math.PI / 180, e = cam.el * Math.PI / 180; dirV.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
    T.set(cam.tx, cam.ty, cam.tz); camera.position.copy(T).addScaledVector(dirV, cam.dist); camera.lookAt(T); camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  function resize() { const r = host.getBoundingClientRect(), w = Math.max(2, r.width), hh = Math.max(2, r.height); renderer.setSize(w, hh, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / hh; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host); resize();

  // ── interaction
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hover = null, active = null;
  const pick = e => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pinObjs.flatMap(o => o.hits), false)[0]?.object.userData.pin ?? null; };
  const setHover = p => { hover = p; for (const o of pinObjs) if (o.zone) o.zone.hovered = o.p === p; };
  renderer.domElement.addEventListener('pointermove', e => { const p = pick(e); if (p !== hover) { setHover(p); onHover(p, e); } renderer.domElement.style.cursor = p ? 'pointer' : 'default'; });
  renderer.domElement.addEventListener('pointerleave', () => { setHover(null); onHover(null); });
  renderer.domElement.addEventListener('click', e => { const p = pick(e); if (p) onSelect(p); });

  function setActive(id) {
    active = id;
    for (const o of pinObjs) { const on = o.p.id === id; o.mat.map = on ? TEX.on : o.p.live ? TEX.live : TEX.soon; o.mat.needsUpdate = true;
      o.base = on ? PIN.on : o.p.live ? PIN.live : PIN.soon; o.lineMat.color.copy(on ? teal : o.p.live ? cream : grey); o.lineMat.opacity = on ? .95 : .5;
      if (o.zone) o.zone.selected = on; }
  }
  /** world position of a pin's zone (for the camera glide) */
  const pinPos = id => { const o = pinObjs.find(o => o.p.id === id); return o ? { tx: o.g.position.x, ty: o.g.position.y, tz: o.g.position.z } : null; };

  // smoothness: in the corner the map draws at 30 fps (its slow float can't show the difference) and its shadow map
  // only refreshes when a zone lifts (plus a slow keep-alive); full screen it draws every frame
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  let running = true, frame = 0, lastLift = 0; const clock = new THREE.Clock(); let last = 0;
  renderer.setAnimationLoop(() => {
    if (!running) return;
    if (host.clientHeight < 420 && (frame++ & 1)) return;
    const t = clock.getElapsedTime(), dt = Math.min(t - last, .1); last = t;
    let lift = 0; for (const z of Object.values(plan.zones)) lift += z.lift.position.y;
    if (Math.abs(lift - lastLift) > 1e-3 || frame % 24 === 0) { renderer.shadowMap.needsUpdate = true; lastLift = lift; }
    slab.position.y = Math.sin(t * .7) * .06; slab.rotation.y = Math.sin(t * .13) * .03;   // a slow float, like a held object
    plan.update(t, dt);
    const kk = Math.min(1, Math.pow(250 / Math.max(1, host.clientHeight), .7));   // pins stay marker-sized when the map goes full screen
    for (const o of pinObjs) { const on = o.p.id === active; const k = (t * .8) % 1; o.head.scale.setScalar((o.base ?? PIN.live) * kk);
      o.g.position.y = o.zone ? o.zone.lift.position.y * S : 0;
      o.ring.material.opacity = on ? (1 - k) * .8 : 0; o.ring.scale.setScalar(on ? 1 + k * .6 : 1); o.head.material.opacity = o.p.live || on ? 1 : .8; }
    place(); renderer.render(scene, camera);
  });
  return { el: renderer.domElement, cam, setActive, pinPos, resize, place, setRunning(v) { running = v; }, get active() { return active; } };
}
