// ─────────────────────────────────────────────────────────────────────────────
// GMC component mode · v1.0.0   (Phase 4 UI, design.md §14)
// "Masar component mode" in GMC gold: the whole scene drops to a warm, dark umber
// and one component (a layer or a set of meshes) is drawn in glowing outlines,
// drawn on as a sweep along the building, with a faint lit fill.
//
//   const cm = createComponentMode(stage);
//   cm.enter();                                   // dim everything (call while the exposure is dipped)
//   const h = cm.show(meshes, { color: 0xffc450 }); h.setProgress(0..1); h.setOpacity(0..1);
//   cm.clear(h);  cm.exit();                     // restore
// Outlines: EdgesGeometry (≥ 25°) per mesh, cached; LineDashedMaterial with a custom
// lineDistance (sweep coordinate along the component) so dashSize = progress × length
// reveals it in order. Colours are HDR (× 3) so the kit bloom gives the glow.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const COMPONENT_MODE_VERSION = '1.1.0';   // 1.1.0: setAmbient(k) — lifts the dimmed umber and the hemisphere fill (shell AMBIENCE control)
export const COMPONENT_COLORS = Object.freeze({ honey: 0xffc450, amber: 0xf29a2e, rose: 0xe8a48a, cream: 0xfff3dc, copper: 0xc8743a });

const _edges = new WeakMap();   // geometry → { geo, len, min, max } (edges in mesh space with sweep distances)

function edgesFor(mesh, axis) {
  const key = mesh.geometry; if (_edges.has(key) && _edges.get(key).axis === axis) return _edges.get(key);
  const eg = new THREE.EdgesGeometry(mesh.geometry, 25), p = eg.attributes.position, n = p.count / 2;
  const ax = { x: 0, y: 1, z: 2 }[axis], a = new THREE.Vector3(), b = new THREE.Vector3();
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < p.count; i++) { const v = p.getComponent(i, ax); if (v < min) min = v; if (v > max) max = v; }
  const ld = new Float32Array(p.count);
  for (let s = 0; s < n; s++) {
    a.fromBufferAttribute(p, s * 2); b.fromBufferAttribute(p, s * 2 + 1);
    const start = Math.min(a.getComponent(ax), b.getComponent(ax)) - min, len = a.distanceTo(b);
    const first = a.getComponent(ax) <= b.getComponent(ax);
    ld[s * 2] = first ? start : start + len; ld[s * 2 + 1] = first ? start + len : start;   // each edge draws from its low end outwards
  }
  eg.setAttribute('lineDistance', new THREE.BufferAttribute(ld, 1));
  const out = { geo: eg, len: (max - min) + 1, axis }; _edges.set(key, out); return out;
}

/** @param stage the kit stage (createStage) — everything in stage.content is dimmed */
export function createComponentMode(stage, { dimColor = 0x1b130d, dimEmissive = 0x0a0604 } = {}) {
  const dim = new THREE.MeshStandardMaterial({ name: 'M_clay', color: dimColor, roughness: .92, metalness: 0, emissive: dimEmissive });
  const dimFoliage = new Map();   // per alpha map
  let active = false, savedBg = null, ambK = 1;
  const dimC = new THREE.Color(dimColor), dimE = new THREE.Color(dimEmissive);
  /** ambience: k × the dimmed umber (colour + emissive); 1 = the original look */
  function setAmbient(k) { ambK = k; for (const m of [dim, ...dimFoliage.values()]) { m.color.copy(dimC).multiplyScalar(k); m.emissive.copy(dimE).multiplyScalar(k); } }
  // the component-mode void: warm umber fading to near-black (authored ~2× bright for ACES, like the kit backgrounds)
  const voidBg = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 512);
    lg.addColorStop(0, '#0c0907'); lg.addColorStop(.55, '#2a1c12'); lg.addColorStop(1, '#120c08'); g.fillStyle = lg; g.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dimFor = m => {
    if (m.name === 'M_foliage') { const a = m.userData.clay?.alphaMap; if (!a) return dim;
      if (!dimFoliage.has(a)) dimFoliage.set(a, new THREE.MeshStandardMaterial({ name: 'M_clay', color: dimC.clone().multiplyScalar(ambK), roughness: .95, alphaMap: a, alphaTest: .5, side: THREE.DoubleSide, emissive: dimE.clone().multiplyScalar(ambK) }));
      return dimFoliage.get(a); }
    return dim;
  };
  function enter() {
    if (active) return; active = true;
    savedBg = stage.scene.background; stage.scene.background = voidBg;
    stage.content.traverse(o => {
      if (!o.isMesh || o.userData.__cm) return;
      const m0 = [].concat(o.material)[0];
      o.userData.__cm = { mat: o.material, vis: o.visible, ic: o.instanceColor ?? null };
      if (['M_window_glow', 'M_anchor'].includes(m0.name) || m0.name === 'M_water' || o.name === '__mirror') { o.visible = m0.name === 'M_water'; if (m0.name === 'M_water') o.material = dim; return; }
      o.material = Array.isArray(o.material) ? o.material.map(dimFor) : dimFor(m0);
      if (o.isInstancedMesh) o.instanceColor = null;
    });
  }
  function exit() {
    if (!active) return; active = false;
    for (const h of [...handles]) clear(h);
    if (savedBg !== null) stage.scene.background = savedBg; savedBg = null;
    stage.content.traverse(o => { const s = o.userData.__cm; if (!s) return; o.material = s.mat; o.visible = s.vis; if (o.isInstancedMesh) o.instanceColor = s.ic; delete o.userData.__cm; });
  }
  const handles = new Set();
  /**
   * Outline + fill a component. meshes: Mesh[] (instanced meshes get the fill only).
   * opts: { color, axis: 'x'|'y'|'z' (sweep direction), fill: 0..1 }
   */
  function show(meshes, { color = COMPONENT_COLORS.honey, axis = 'x', fill = .1, xray = false } = {}) {
    const c = new THREE.Color(color), lines = [], mats = [];
    const fillMat = new THREE.MeshStandardMaterial({ name: 'M_clay', color: c.clone().multiplyScalar(.07), emissive: c.clone(), emissiveIntensity: fill * .9, roughness: .8, transparent: false });
    let maxLen = 1;
    for (const m of meshes) {
      if (!m?.isMesh) continue;
      if (m.userData.__cm) { m.userData.__cmFill = true; m.material = fillMat; }
      if (m.isInstancedMesh) continue;
      const e = edgesFor(m, axis); maxLen = Math.max(maxLen, e.len);
      // xray: interiors seen through the dimmed shell, much quieter (dense battens would saturate to white)
      const mat = new THREE.LineDashedMaterial({ color: c.clone().multiplyScalar(xray ? .9 : 3), dashSize: 0, gapSize: 1e6, transparent: true, opacity: 1, depthWrite: false, depthTest: !xray });
      mat.userData.maxOpacity = xray ? .45 : 1;
      const ls = new THREE.LineSegments(e.geo, mat); ls.name = '__cm_outline'; ls.renderOrder = 5; ls.frustumCulled = false;
      m.add(ls); lines.push(ls); mats.push(mat);
    }
    const h = {
      meshes, lines, fillMat,
      /** 0 → nothing drawn, 1 → fully drawn (sweep along the axis) */
      setProgress(p) { const d = Math.max(0, p) * (maxLen + 2); for (const mt of mats) mt.dashSize = d; },
      setOpacity(o) { for (const mt of mats) mt.opacity = o * (mt.userData.maxOpacity ?? 1); fillMat.emissiveIntensity = fill * .9 * o; },
    };
    h.setProgress(0); handles.add(h); return h;
  }
  function clear(h) {
    if (!h || !handles.has(h)) return; handles.delete(h);
    for (const ls of h.lines) { ls.parent?.remove(ls); ls.material.dispose(); }
    for (const m of h.meshes) if (m?.userData.__cmFill) { delete m.userData.__cmFill; const s = m.userData.__cm; if (s) m.material = Array.isArray(s.mat) ? s.mat.map(dimFor) : dimFor([].concat(s.mat)[0]); }
    h.fillMat.dispose();
  }
  return { enter, exit, show, clear, setAmbient, get active() { return active; } };
}

/**
 * Director (for the UI shell): a camera the shell tweens, component lookup by layer/mesh name, embed flag.
 * A model calls `director.drive(camera)` at the end of its own camera update; when the director is on it
 * overrides the model's rig. Views are { az, el, tx, ty, tz, half, fov } — `half` is the half-width in metres
 * to frame, turned into a distance for the current aspect (so the same view works on any screen).
 * components: [{ id, label, layers:[names], color, axis, xray, stat:{ big, small }, view }]
 */
export function createDirector(stage, { hero, overview, components = [] } = {}) {
  const cam = { az: 200, el: 30, tx: 0, ty: 0, tz: 0, half: 100, fov: 30, ...(hero ?? {}) };
  let on = false, tick = 0; const cm = createComponentMode(stage), V = new THREE.Vector3(), T = new THREE.Vector3();
  const sm = stage.renderer.shadowMap;
  const meshesOf = names => { const out = []; for (const n of names) stage.content.getObjectByName(n)?.traverse(o => { if (o.isMesh && o.name !== '__cm_outline') out.push(o); }); return out; };
  const dir = (az, el) => { const a = az * Math.PI / 180, e = el * Math.PI / 180; return V.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };
  return {
    cam, hero, overview, components, stage,
    get on() { return on; },
    // in the shell the buildings and the sun hold still, only the camera moves: shadow maps don't depend on the camera,
    // so refresh them every 4th frame instead of every frame (static scenes: pixel-identical; moving parts lag ≤ 3 frames)
    director(v = true) { on = v; sm.autoUpdate = !v; sm.needsUpdate = true; },
    setCamera(o) { Object.assign(cam, o); },
    /** distance that frames `half` metres of width (or 0.62 × half of height) at the current aspect */
    distFor(half, fov = cam.fov) { const asp = innerWidth / innerHeight, vf = fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp); return Math.max((asp < 1 ? half * .62 : half) / Math.tan(hf / 2), half * .5 / Math.tan(vf / 2)); },
    drive(camera) {
      if (!on) return false;
      if ((tick++ & 3) === 0) sm.needsUpdate = true;
      const d = this.distFor(cam.half, cam.fov); T.set(cam.tx, cam.ty, cam.tz);
      camera.position.copy(T).addScaledVector(dir(cam.az, cam.el), d); camera.lookAt(T);
      camera.fov = cam.fov; camera.near = Math.max(.2, d / 1500); camera.far = Math.max(9000, d * 25); camera.updateProjectionMatrix();
      return true;
    },
    enterComponents() { cm.enter(); }, exitComponents() { cm.exit(); },
    /** ambience k (1 = original): k × the component-mode umber, √k × the hemisphere fill light (hero view too) */
    setAmbient(k) { cm.setAmbient(k); const h = stage.rig?.hemi; if (h) { if (h.userData.base === undefined) h.userData.base = h.intensity; h.intensity = h.userData.base * Math.sqrt(k); } },
    /** outline a component by id → handle { setProgress, setOpacity } (the shell tweens them) */
    show(id) { const c = components.find(k => k.id === id); if (!c) return null; return cm.show(meshesOf(c.layers), { color: c.color, axis: c.axis ?? 'x', xray: !!c.xray }); },
    clear(h) { cm.clear(h); },
  };
}

/** True when the model page is loaded inside the UI shell (?embed=1). Adds body.embed so the model hides its own chrome. */
export function isEmbedded() {
  const e = new URLSearchParams(location.search).has('embed');
  if (e) { document.body.classList.add('embed'); const s = document.createElement('style'); s.textContent = 'body.embed .panel, body.embed #tip, body.embed #loader { display: none !important; }'; document.head.appendChild(s); }
  return e;
}
