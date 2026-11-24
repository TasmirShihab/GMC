// ─────────────────────────────────────────────────────────────────────────────
// GMC UI · masterplan island for the mini-map
// The user's reference map (references/build-3d-interactive-map: the round island,
// zone pads, roads from a central hub with traffic, glowing rim, hill ring), ported
// to vanilla three.js, with every zone remodelled as a GMC landmark in miniature:
//   airport     nine timber diagrid gables + runway          (models/objects O1)
//   health      the sweeping saddle roof on bamboo fins       (O4)
//   dam         the woven textile face between two hills      (O2)
//   university · market · culture · agri — Bhutanese placeholders until modelled
//   centre      a chorten with prayer-flag poles (the hub the roads meet at)
// Native units (island radius 56); the caller scales the group. Lit for GOLDEN hour:
// windows and gold trims glow a little (`GLOW`).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const GLOW = .3;
const PAD_TOP = .3;

export function makeRng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** zones, keyed by chapter id: position on the ground [x, z], pad accent, marker height (reference layout) */
export const ZONES = {
  centre:     { pos: [0, 0],     color: '#f0c070', markerY: 8,  pad: { radius: 8.5 } },
  dam:        { pos: [-18, -13], color: '#c9a070', markerY: 9,  pad: { radius: 7.8 } },
  university: { pos: [18, -14],  color: '#e58f7a', markerY: 9,  pad: { radius: 9 } },
  market:     { pos: [0, 17],    color: '#7ec8e3', markerY: 5,  pad: { rect: true, size: [22, 8.4] } },
  agri:       { pos: [-27, 5],   color: '#9fcf7a', markerY: 5,  pad: { radius: 10 } },
  culture:    { pos: [26, 6],    color: '#b49be8', markerY: 11, pad: { radius: 8 } },
  health:     { pos: [26, 28],   color: '#f2a65a', markerY: 7,  pad: { radius: 10 } },
  airport:    { pos: [0, -26],   color: '#8fb3ff', markerY: 5,  pad: { rect: true, size: [20, 7] } },
};

// ── materials ─────────────────────────────────────────────────────────────────
const plainMats = new Map(), glowMats = new Map();
function plainMat(color, roughness = .8, metalness = .05, flat = false) {
  const key = `${color}|${roughness}|${metalness}|${flat}`;
  if (!plainMats.has(key)) plainMats.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: flat }));
  return plainMats.get(key);
}
function glowMat(color, day = .1, night = 2.2) {
  const key = `${color}|${day}|${night}`;
  if (!glowMats.has(key)) glowMats.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day + (night - day) * GLOW, roughness: .4 }));
  return glowMats.get(key);
}
const GOLD = () => glowMat('#f0c070', .25, 2.4), WATER = () => glowMat('#4fc3e8', .3, 1.2);
const GILT = () => plainMat('#d9b66b', .35, .5);
const ROOF = () => plainMat('#7b4a2e', .85, .05, true), ROOF_DARK = () => plainMat('#6a4a34', .8, .05, true);
const KEMAR = () => plainMat('#7a2e1c', .9);                       // the red-brown band under Bhutanese roofs
const FOREST = () => plainMat('#4e6b3a', 1, 0, true);

function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
}
const once = f => { let v; return () => v ?? (v = f()); };
// white lime-washed wall with timber-framed windows (lit warm at golden hour)
const WALL = once(() => {
  const win = (x, w, h, lit) => { x.fillStyle = lit ? '#ffcf8a' : '#5a2a18'; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const px = 14 + c * 38, py = 34 + r * 44; if (!lit) x.fillRect(px - 3, py - 3, 26, 24); else x.fillRect(px, py, 20, 18); } };
  const map = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#f3ede2'; x.fillRect(0, 0, w, h); win(x, w, h, false); x.fillStyle = '#3a2a22'; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) x.fillRect(14 + c * 38, 34 + r * 44, 20, 18); });
  const emi = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); win(x, w, h, true); });
  return new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: emi, emissiveIntensity: .5 + GLOW, roughness: .85 });
});
// the airport gables: a timber diagrid over warm glazing
const DIAGRID = once(() => {
  const draw = lit => (x, w, h) => { x.fillStyle = lit ? '#ff9a40' : '#e3a25e'; x.fillRect(0, 0, w, h); x.strokeStyle = lit ? '#000' : '#3a2516'; x.lineWidth = 9;
    for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * w / 2, 0); x.lineTo(i * w / 2 + w, h); x.stroke(); x.beginPath(); x.moveTo(i * w / 2 + w, 0); x.lineTo(i * w / 2, h); x.stroke(); } };
  return new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, draw(false), { repeat: [.9, .9] }), emissive: '#ffffff', emissiveMap: canvasTex(128, 128, draw(true), { repeat: [.9, .9] }), emissiveIntensity: .55 + GLOW, roughness: .7 });
});
// the dam face: a woven Bhutanese textile in bands of chevrons
const TEXTILE = once(() => {
  const P = ['#b8322a', '#2c4f8c', '#e08a2e', '#f1e6cf', '#1f6b5a', '#b8322a', '#e0b84a', '#2c4f8c'];
  const map = canvasTex(128, 128, (x, w, h) => { const bh = 16;
    P.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * bh, w, bh); x.fillStyle = P[(i + 3) % P.length];
      for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 16, i * bh + bh); x.lineTo(k * 16 + 8, i * bh + 3); x.lineTo(k * 16 + 16, i * bh + bh); x.fill(); } });
  }, { repeat: [.55, .55] });
  return new THREE.MeshStandardMaterial({ map, roughness: .9 });
});
// the healthcare roof: orange timber slats
const SLATS = once(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .75,
  map: canvasTex(64, 8, (x, w, h) => { x.fillStyle = '#d0813e'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a4320'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 2, h); }, { repeat: [22, 1] }) }));

// ── primitives ────────────────────────────────────────────────────────────────
function mesh(geo, mat, { pos = [0, 0, 0], rotX = 0, rotY = 0, rotZ = 0, scale, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(rotX, rotY, rotZ); if (scale) m.scale.set(...scale);
  m.castShadow = cast; m.receiveShadow = receive; return m;
}
const box = (pos, size, mat, opts = {}) => mesh(new THREE.BoxGeometry(...size), mat, { ...opts, pos: [pos[0], pos[1] + size[1] / 2, pos[2]] });
/** an A-frame: triangle of base w and height h, extruded d along z (groups: 0 = gable ends, 1 = roof slopes) */
function prism(w, h, d) { const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2); }
/** a hipped roof over w × d with a small overhang */
const hipRoof = (w, h, d) => new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, .5, 0).scale(w * 1.14, h, d * 1.14);
/** a Bhutanese block: lime-washed walls, the red-brown kemar band, a hipped roof, optional gilt finial */
function bhutanBlock(pos, [w, h, d], { roofH = Math.min(w, d) * .42, finial = false, roof = ROOF() } = {}) {
  const g = new THREE.Group(); g.position.set(...pos);
  g.add(box([0, 0, 0], [w, h, d], WALL()), box([0, h * .78, 0], [w + .06, h * .16, d + .06], KEMAR()), mesh(hipRoof(w, roofH, d), roof, { pos: [0, h, 0] }));
  if (finial) g.add(mesh(new THREE.ConeGeometry(.16, .7, 8), GILT(), { pos: [0, h + roofH + .25, 0] }));
  return g;
}
/** a tiered utse roof: stacked hipped roofs, gilt finial */
function tieredRoof(w, d, y, tiers = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < tiers; i++) { const k = 1 - i * .28, hh = .7; g.add(mesh(hipRoof(w * k, hh, d * k), ROOF(), { pos: [0, y + i * .62, 0] })); }
  g.add(mesh(new THREE.ConeGeometry(.2, .9, 8), GILT(), { pos: [0, y + tiers * .62 + .45, 0] }));
  return g;
}
function trees(g, list, rng) {
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.3, 1, 6), plainMat('#5b4630', 1), list.length);
  const fol = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.85, 0), new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), list.length), o = new THREE.Object3D();
  list.forEach(([x, z, s], i) => { o.position.set(x, PAD_TOP + .5 * s + .25, z); o.scale.set(.12 * s, s * .9, .12 * s); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix);
    o.position.set(x, PAD_TOP + 1.1 * s + .5, z); o.scale.setScalar(s); o.updateMatrix(); fol.setMatrixAt(i, o.matrix); fol.setColorAt(i, new THREE.Color().setHSL(.25 + rng() * .06, .42, .26 + rng() * .1)); });
  trunks.castShadow = fol.castShadow = fol.receiveShadow = true; g.add(trunks, fol);
}
function pad({ rect, radius = 8, size = [20, 7] }, color) {
  const g = new THREE.Group(), padColor = new THREE.Color('#cdbd9f').lerp(new THREE.Color(color), .18);
  const glow = new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0, depthWrite: false });
  if (rect) { g.add(mesh(new THREE.BoxGeometry(size[0] + .9, .2, size[1] + .9), glow, { pos: [0, .12, 0], cast: false, receive: false }));
    g.add(mesh(new THREE.BoxGeometry(size[0], PAD_TOP, size[1]), new THREE.MeshStandardMaterial({ color: padColor, roughness: .9 }), { pos: [0, PAD_TOP / 2, 0] })); }
  else { g.add(mesh(new THREE.CylinderGeometry(radius + .5, radius + .7, .2, 64), glow, { pos: [0, .12, 0], cast: false, receive: false }));
    g.add(mesh(new THREE.CylinderGeometry(radius, radius + .25, PAD_TOP, 64), new THREE.MeshStandardMaterial({ color: padColor, roughness: .9 }), { pos: [0, PAD_TOP / 2, 0] })); }
  return { g, glow };
}

// ── the GMC landmarks in miniature ───────────────────────────────────────────
/** O1 · Gelephu International Airport: nine timber diagrid gables in a row, a forecourt, the runway behind */
function airport() {
  const g = new THREE.Group(), y = PAD_TOP;
  g.add(box([0, y, 2.7], [19, .05, 1.4], plainMat('#d8ccb4')));                                   // forecourt
  g.add(box([0, y, -2.9], [19.6, .04, 1.1], plainMat('#4a4846', .95)));                           // runway
  for (let i = 0; i < 9; i++) g.add(box([-8.4 + i * 2.1, y + .045, -2.9], [.9, .01, .08], plainMat('#efe6d0'), { cast: false }));
  g.add(box([0, y, .4], [18.6, .55, 3.2], plainMat('#cdbfa8')));                                  // podium
  const gw = 2.1, gh = 2.4;
  for (let i = 0; i < 9; i++) {
    const h = gh * (.86 + .14 * Math.sin(i / 8 * Math.PI));                                        // the roofline swells to the centre
    g.add(mesh(prism(gw * 1.02, h, 3), [DIAGRID(), ROOF_DARK()], { pos: [-8.4 + i * gw, y + .55, .4] }));
  }
  g.add(box([0, y + .55, 2.05], [18.6, .08, .12], GOLD(), { cast: false }));                      // canopy edge
  return g;
}
/** O4 · Healthcare Centre: a sweeping saddle roof on bamboo fins, a reflecting pool and herb beds */
function health() {
  const g = new THREE.Group(), y0 = PAD_TOP, L = 14, D = 6;
  const roofY = (x, z) => { const u = x / (L / 2), v = z / (D / 2); return y0 + 1.9 + 2.4 * u * u + .9 * u - .35 * v * v; };
  { const nx = 48, nz = 8, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -L / 2 + L * i / nx, z = -D / 2 + D * j / nz; pos.push(x, roofY(x, z), z); uv.push(i / nx, j / nz); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    g.add(mesh(geo, SLATS())); }
  // bamboo fins on both long faces, each reaching the roof
  const xs = []; for (let x = -L / 2 + .45; x <= L / 2 - .45; x += .34) xs.push(x);
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, 1, .16), plainMat('#d49a5a', .7), xs.length * 2), o = new THREE.Object3D(); let n = 0;
  for (const zf of [D / 2 - .5, -(D / 2 - .5)]) for (const x of xs) { const top = roofY(x, zf) - .05; o.position.set(x, (y0 + top) / 2, zf); o.scale.set(1, top - y0, 1); o.updateMatrix(); fins.setMatrixAt(n++, o.matrix); }
  fins.castShadow = fins.receiveShadow = true; g.add(fins);
  g.add(box([0, y0, 0], [L - 1.2, 1.7, D - 1.4], glowMat('#ffcf8a', .25, 1.2), { cast: false }));   // the glazed halls behind the fins
  g.add(mesh(new THREE.BoxGeometry(11, .06, 1.3), WATER(), { pos: [.5, y0 + .04, D / 2 + 1.3], cast: false }));   // reflecting pool / river
  for (let i = 0; i < 6; i++) g.add(box([-5 + i * 2, y0, -(D / 2 + 1.3)], [1.5, .2, 1], plainMat(i % 2 ? '#6f9a5a' : '#8aa860', 1)));   // herb beds
  const rng = makeRng(hashStr('health')); trees(g, Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + .3; return [Math.cos(a) * 8.6, Math.sin(a) * 8.6, .6 + rng() * .4]; }), rng);
  return g;
}
/** O2 · Sankosh Temple-Dam: the woven textile face filling a V between forested hills, temples on the crest, the reservoir behind */
function dam() {
  const g = new THREE.Group(), y0 = PAD_TOP, top = y0 + 6;
  for (const sx of [-1, 1]) g.add(mesh(new THREE.IcosahedronGeometry(1, 1), FOREST(), { pos: [sx * 6.2, y0 + 2.6, -1.2], scale: [2.8, 4.4, 4.2] }));   // valley sides frame the face, never cover it
  const s = new THREE.Shape([new THREE.Vector2(-4.4, 6), new THREE.Vector2(4.4, 6), new THREE.Vector2(.5, 0), new THREE.Vector2(-.5, 0)]);
  const face = new THREE.ExtrudeGeometry(s, { depth: .8, bevelEnabled: false }).translate(0, 0, -.4);
  g.add(mesh(face, [TEXTILE(), plainMat('#cdbfa8', .9)], { pos: [0, y0, .3] }));
  g.add(box([0, y0, .78], [.55, 5.9, .06], plainMat('#efe4cf'), { cast: false }));               // the stair down the face
  g.add(box([0, top, .2], [9.2, .22, 1.1], plainMat('#d8ccb4')));                               // crest
  for (let i = 0; i < 5; i++) g.add(bhutanBlock([-3.2 + i * 1.6, top + .22, .2], [.7, .45, .7], { finial: i === 2 }));
  g.add(mesh(new THREE.BoxGeometry(8.6, .1, 4.8), WATER(), { pos: [0, top - .35, -2.6], cast: false }));   // reservoir
  g.add(mesh(new THREE.BoxGeometry(1.1, .05, 5.6), WATER(), { pos: [0, y0 + .04, 3.6], cast: false }));    // river below
  return g;
}
/** university (placeholder): a Bhutanese campus round a courtyard, a central utse */
function university() {
  const g = new THREE.Group(), y = PAD_TOP;
  g.add(box([0, y, 0], [9, .04, 9], plainMat('#e6d9bb'), { cast: false }));
  for (const [x, z, w, d] of [[0, -4, 9, 1.8], [0, 4, 9, 1.8], [-4, 0, 1.8, 6.2], [4, 0, 1.8, 6.2]]) g.add(bhutanBlock([x, y, z], [w, 1.6, d], { roofH: .8 }));
  g.add(box([0, y, 0], [2.6, 3.6, 2.6], WALL()), box([0, y + 2.9, 0], [2.66, .5, 2.66], KEMAR()), tieredRoof(2.6, 2.6, y + 3.6));
  const rng = makeRng(hashStr('uni')); trees(g, [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].map(([x, z]) => [x, z, .55 + rng() * .2]), rng);
  return g;
}
/** market (placeholder): a long gabled market hall, stalls along both sides, strings of prayer flags */
function market(anim) {
  const g = new THREE.Group(), y = PAD_TOP, FL = ['#2c6fc4', '#f4efe4', '#c8352b', '#3f8f4a', '#e8c23a'];
  g.add(box([0, y, 0], [21, .03, 2.4], plainMat('#efe3c8'), { cast: false }));
  g.add(box([0, y, 0], [16, 1.1, 2], WALL()), mesh(prism(2.8, 1.3, 17).rotateY(Math.PI / 2), [WALL(), ROOF()], { pos: [0, y + 1.1, 0] }));
  for (const zs of [-1, 1]) for (let i = 0; i < 7; i++) { const x = -9 + i * 3;
    g.add(box([x, y, zs * 3.2], [2, .8, 1.3], WALL()), mesh(prism(1.5, .55, 2.2).rotateY(Math.PI / 2), [WALL(), plainMat(FL[(i + (zs > 0 ? 2 : 0)) % 5], .8)], { pos: [x, y + .8, zs * 3.2] })); }
  // prayer flags on two sagging strings (they flutter)
  const per = 26, flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(.42, .3), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .9 }), per * 2), o = new THREE.Object3D(), base = [];
  for (let k = 0; k < 2; k++) for (let i = 0; i < per; i++) { const u = i / (per - 1), x = -10 + u * 20, yy = y + 3.1 - Math.sin(u * Math.PI) * .7, z = k ? 1.7 : -1.7; base.push([x, yy, z]); flags.setColorAt(k * per + i, new THREE.Color(FL[i % 5])); }
  g.add(flags); for (const x of [-10.2, 10.2]) for (const z of [-1.7, 1.7]) g.add(box([x, y, z], [.08, 3.2, .08], plainMat('#efe4cf')));
  anim.push(t => { base.forEach(([x, yy, z], i) => { o.position.set(x, yy - .17, z); o.rotation.set(Math.sin(t * 3 + i) * .25, 0, 0); o.updateMatrix(); flags.setMatrixAt(i, o.matrix); }); flags.instanceMatrix.needsUpdate = true; });
  return g;
}
/** cultural centre (placeholder): a dzong — battered white walls round a courtyard, a tall utse with a tiered roof */
function culture() {
  const g = new THREE.Group(), y = PAD_TOP;
  for (const [x, z, w, d] of [[0, -4.2, 9.4, 1.4], [0, 4.2, 9.4, 1.4], [-4.2, 0, 1.4, 7], [4.2, 0, 1.4, 7]]) g.add(bhutanBlock([x, y, z], [w, 2.2, d], { roofH: .7 }));
  const utse = new THREE.CylinderGeometry(1.9 * Math.SQRT1_2 * 1.0, 2.2 * Math.SQRT1_2 * 1.4, 5, 4, 1).rotateY(Math.PI / 4);   // battered (tapering) walls
  g.add(mesh(utse, WALL(), { pos: [0, y + 2.5, 0] }), box([0, y + 4.2, 0], [2.2, .5, 2.2], KEMAR()), tieredRoof(2.2, 2.2, y + 5));
  for (const [x, z] of [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]]) g.add(bhutanBlock([x, y, z], [1.6, 3, 1.6], { finial: true }));
  return g;
}
/** agricultural exhibit (placeholder): ripe paddy terraces stepping up a knoll, a farmhouse on top */
function agri() {
  const g = new THREE.Group(), y = PAD_TOP, C = ['#9aa84a', '#b8b24e', '#7f9a46', '#c4b45a', '#a3ad52', '#8ea04a'];
  for (let k = 0; k < 6; k++) { const r = 9.4 - k * 1.25, geo = new THREE.CylinderGeometry(r, r + .05, .38, 72, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), w = 1 + .05 * Math.sin(a * 3 + k) + .03 * Math.sin(a * 7 + k * 2); p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * w); }
    geo.computeVertexNormals(); g.add(mesh(geo, plainMat(C[k], .95), { pos: [0, y + .19 + k * .38, 0] }));
    g.add(mesh(new THREE.TorusGeometry(r * .98, .04, 4, 72), WATER(), { pos: [0, y + .39 + k * .38, 0], rotX: Math.PI / 2, cast: false, receive: false })); }   // water glint on each bund
  g.add(bhutanBlock([0, y + 6 * .38, 0], [2.2, 1.3, 1.6], { roofH: .7 }));
  trees(g, [[1.8, .9, .4], [-1.7, -.8, .4]], makeRng(hashStr('agri')));
  g.children.slice(-2).forEach(m => { m.position.y += 6 * .38; });   // the two trees stand on the top terrace
  return g;
}
/** centre: a white chorten on a stepped base, gilt spire, prayer-flag poles (darshing) round the plaza */
function centre() {
  const g = new THREE.Group(), y = PAD_TOP, white = plainMat('#f3ede2', .85);
  for (const r of [2.7, 4.8]) g.add(mesh(new THREE.RingGeometry(r, r + .18, 64), GOLD(), { pos: [0, y + .01, 0], rotX: -Math.PI / 2, cast: false }));
  let h = y; for (const [w, t] of [[3.6, .45], [3, .4], [2.4, .4]]) { g.add(box([0, h, 0], [w, t, w], white)); h += t; }
  g.add(mesh(new THREE.SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white, { pos: [0, h, 0], scale: [1, .9, 1] })); h += 1.05;
  g.add(box([0, h, 0], [.8, .45, .8], white), box([0, h + .3, 0], [.86, .12, .86], KEMAR())); h += .45;
  g.add(mesh(new THREE.CylinderGeometry(.08, .42, 1.8, 16), GILT(), { pos: [0, h + .9, 0] }), mesh(new THREE.SphereGeometry(.14, 12, 12), GOLD(), { pos: [0, h + 1.9, 0], cast: false }));
  const FL = ['#f4efe4', '#2c6fc4', '#f4efe4', '#c8352b', '#f4efe4', '#3f8f4a', '#f4efe4', '#e8c23a'];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 6.3, z = Math.sin(a) * 6.3;
    g.add(box([x, y, z], [.07, 3.4, .07], plainMat('#efe4cf')), mesh(new THREE.PlaneGeometry(.45, 2.4), new THREE.MeshStandardMaterial({ color: FL[i], side: THREE.DoubleSide, roughness: .9 }), { pos: [x + .26 * Math.cos(a + Math.PI / 2), y + 2.05, z + .26 * Math.sin(a + Math.PI / 2)], rotY: -a, cast: false })); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(.13, 10, 10), glowMat('#ffd9a0', .3, 3), { pos: [Math.cos(a) * 4.4, y + .5, Math.sin(a) * 4.4], cast: false })); }
  return g;
}
const MODELS = { centre, dam, university, market, agri, culture, health, airport };

// ── roads + traffic (reference Scene.tsx) ─────────────────────────────────────
function roads(anim) {
  const g = new THREE.Group(), hub = ZONES.centre.pos, others = Object.entries(ZONES).filter(([k]) => k !== 'centre').map(([, z]) => z.pos);
  const segs = others.map(p => [hub, p]);
  const sorted = [...others].sort((p, q) => Math.atan2(p[1] - hub[1], p[0] - hub[0]) - Math.atan2(q[1] - hub[1], q[0] - hub[0]));
  sorted.forEach((p, i) => segs.push([p, sorted[(i + 1) % sorted.length]]));
  const asphalt = new THREE.MeshStandardMaterial({ color: '#58565c', roughness: .95 }), line = new THREE.MeshBasicMaterial({ color: '#e8d9a8', transparent: true, opacity: .55 });
  const head = glowMat('#fff2c4', .3, 3.2), tail = glowMat('#ff5a4a', .3, 3), car = new THREE.BoxGeometry(.6, .2, .3);
  segs.forEach(([a, b], index) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), s = new THREE.Group();
    s.position.set((a[0] + b[0]) / 2, .04, (a[1] + b[1]) / 2); s.rotation.y = -Math.atan2(dz, dx);
    s.add(mesh(new THREE.PlaneGeometry(1, 1), asphalt, { rotX: -Math.PI / 2, scale: [len, 1.7, 1], cast: false }));
    s.add(mesh(new THREE.PlaneGeometry(1, 1), line, { pos: [0, .01, 0], rotX: -Math.PI / 2, scale: [len, .07, 1], cast: false, receive: false }));
    const r = makeRng(index * 97 + 3), cars = Array.from({ length: 3 }, (_, i) => ({ off: r(), speed: .018 + r() * .02, lane: i % 2 ? .38 : -.38 }));
    const ms = cars.map(p => { const m = mesh(car, p.lane > 0 ? head : tail, { pos: [0, .12, p.lane], cast: false, receive: false }); s.add(m); return m; });
    anim.push(t => cars.forEach((p, i) => { let u = (p.off + t * p.speed) % 1; if (p.lane < 0) u = 1 - u; ms[i].position.x = (u - .5) * len; }));
    g.add(s);
  });
  return g;
}

/** Build the island. Returns { group, zones: { id: { group, lift, glow, selected, hovered, … } }, update(t, dt) } */
export function createMasterplan() {
  const group = new THREE.Group(), anim = [];
  group.add(mesh(new THREE.CircleGeometry(56, 96), new THREE.MeshStandardMaterial({ color: '#e9dbbd', roughness: 1 }), { pos: [0, 0, 2], rotX: -Math.PI / 2, cast: false }));
  { const rim = new THREE.Mesh(new THREE.CylinderGeometry(56, 54.5, 3, 96, 1, true), new THREE.MeshStandardMaterial({ color: '#b8996c', roughness: 1, side: THREE.DoubleSide }));
    rim.position.set(0, -1.5, 2); group.add(rim); }
  group.add(mesh(new THREE.RingGeometry(56, 56.5, 128), glowMat('#f0c070', .2, 1.8), { pos: [0, .02, 2], rotX: -Math.PI / 2, cast: false }));
  // a ring of low hills on the island's edge, kept clear of the pads
  { const r = makeRng(77), hill = new THREE.MeshStandardMaterial({ color: '#c7a97b', roughness: 1, flatShading: true });
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2 + r() * .12, d = 47 + r() * 5, rad = 4 + r() * 4, h = 3 + r() * 7;
      const hx = Math.cos(a) * d, hz = Math.sin(a) * d + 2;
      if (Object.values(ZONES).some(z => Math.hypot(hx - z.pos[0], hz - z.pos[1]) < (z.pad.radius ?? z.pad.size[0] / 2) + rad + 1.5)) continue;
      group.add(mesh(new THREE.ConeGeometry(rad, h, 7), hill, { pos: [hx, h / 2 - .3, hz], rotY: r() * Math.PI })); } }
  group.add(roads(anim));
  const zones = {};
  for (const [id, z] of Object.entries(ZONES)) {
    const zg = new THREE.Group(); zg.position.set(z.pos[0], 0, z.pos[1]);
    const lift = new THREE.Group(), p = pad(z.pad, z.color); lift.add(p.g, MODELS[id](anim)); zg.add(lift); group.add(zg);
    zones[id] = { group: zg, lift, glow: p.glow, selected: false, hovered: false, ...z };
  }
  function update(t, dt) {
    for (const f of anim) f(t);
    const k = 1 - Math.exp(-6 * dt), kg = 1 - Math.exp(-8 * dt), pulse = .75 + .25 * Math.sin(t * 3);
    for (const z of Object.values(zones)) {
      z.lift.position.y += ((z.selected ? .6 : z.hovered ? .25 : 0) - z.lift.position.y) * k;
      z.glow.opacity += ((z.selected ? .95 * pulse : z.hovered ? .6 : 0) - z.glow.opacity) * kg;
    }
  }
  return { group, zones, update };
}
