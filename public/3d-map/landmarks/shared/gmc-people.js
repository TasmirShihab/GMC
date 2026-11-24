// ─────────────────────────────────────────────────────────────────────────────
// GMC people · v1.0.0   (environment kit E14, design.md §7)
// Scale figures for every model: adults and children in Bhutanese dress (gho,
// kira), maroon robes and everyday clothes, in four poses (stand, talk, walk,
// sit cross-legged). Code-built bodies (head + hair, torso, sleeves with white
// cuffs, hands, legs, shoes), instanced, two LODs.
//
// One material (M_people) colours every part per instance: skin, woven cloth
// (check / stripe weave drawn in the shader), accent (belt, jacket), hair,
// shoes, white cuffs. So hundreds of varied people stay a handful of draw calls.
//
// Usage:
//   group.add(createPeople(M, [{ x, y, z, yaw, pose:'walk', outfit:'gho', child:false, lod:0 }, …], { name: 'people' }));
// Units: metres; y is the floor the person stands (or sits) on; they face +Z before yaw.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry, SEED } from './gmc-kit.js';

export const PEOPLE_VERSION = '1.1.0';   // 1.1.0: painted faces, hair strands, fabric folds, contact shading, shoulders, noses, buns, koma brooches, backpacks, pray/behind poses, body builds
export const POSES = Object.freeze(['stand', 'talk', 'walk', 'sit', 'pray', 'behind']);
export const OUTFITS = Object.freeze(['gho', 'kira', 'robe', 'modern']);
const P = { skin: 0, clothA: 1, clothB: 2, hair: 3, dark: 4, white: 5, face: 6, gold: 7 };

// ═══════════════════════════════════════════════════════════════ palettes ═══
// muted, woven-textile colours in the GMC palette family (design.md §2); [main, accent]
const SKIN = [0x8a5a3c, 0x9c6644, 0xab734c, 0xb98157, 0x7a4c33, 0xa26a48, 0x8f5e40];
const HAIR = [0x17120f, 0x1e1713, 0x271e18, 0x120f0d];
const CLOTH = {
  gho:    [[0x7a2a2e, 0x2f2226], [0x2f3f63, 0x1c2234], [0x6b5a2e, 0x2e2618], [0x4a5a3a, 0x232b1c], [0x8a3a32, 0x3c4f6e], [0x5a4048, 0x221a1f], [0x34435a, 0x9c2f3a]],
  kira:   [[0xa8333a, 0xd9a84a], [0x2e5fa8, 0xd8c8a8], [0x8a2a4a, 0xe0b25a], [0xd4532f, 0x34435a], [0x3e7e4e, 0xe0b84a], [0xc98a86, 0x4a5c7a], [0x7a3a6a, 0xd9c08a]],
  robe:   [[0x6d1a22, 0xd29a2e], [0x7a2226, 0xc9902a]],
  modern: [[0x3a4a5e, 0x2b2a31], [0xc9c3b6, 0x34435a], [0x7a2a2e, 0x3a3a3a], [0x5e6a4a, 0x5a4c3e], [0xe0ddd5, 0x2a2f3a], [0x9c6a3a, 0x2b2a31]],
};
const PATTERN = { gho: [1, 9], kira: [2, 15], robe: [0, 1], modern: [0, 1] };   // [type, repeats per metre]: 0 plain · 1 check · 2 stripes

// ═══════════════════════════════════════════════════════════════ skeleton ═══
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function joints(pose) {
  const j = { pelvis: V(0, .95, 0), chest: V(0, 1.3, 0), neck: V(0, 1.5, 0), head: V(0, 1.61, 0),
    shL: V(-.19, 1.42, 0), shR: V(.19, 1.42, 0), elL: V(-.23, 1.14, -.01), elR: V(.23, 1.14, -.01), wrL: V(-.24, .88, .03), wrR: V(.24, .88, .03),
    hipL: V(-.095, .92, 0), hipR: V(.095, .92, 0), knL: V(-.1, .5, .02), knR: V(.1, .5, .02), anL: V(-.1, .09, 0), anR: V(.1, .09, 0) };
  if (pose === 'talk') { j.elR = V(.21, 1.13, .06); j.wrR = V(.12, 1.2, .22); j.elL = V(-.22, 1.13, .03); j.wrL = V(-.18, .92, .14); }
  if (pose === 'pray') { j.elL = V(-.17, 1.17, .12); j.elR = V(.17, 1.17, .12); j.wrL = V(-.025, 1.29, .21); j.wrR = V(.025, 1.29, .21); j.head.z += .015; }   // hands together at the chest
  if (pose === 'behind') { j.elL = V(-.22, 1.13, -.08); j.elR = V(.22, 1.13, -.08); j.wrL = V(-.07, .99, -.14); j.wrR = V(.07, .99, -.14); }        // hands clasped behind the back
  if (pose === 'walk') {
    j.knL = V(-.1, .51, .15); j.anL = V(-.1, .08, .24); j.knR = V(.1, .49, -.07); j.anR = V(.1, .14, -.26);
    j.elR = V(.22, 1.14, .09); j.wrR = V(.22, .89, .18); j.elL = V(-.22, 1.14, -.08); j.wrL = V(-.22, .9, -.17);
  }
  if (pose === 'sit') {   // cross-legged on the floor, hands resting on the knees
    for (const k of ['pelvis', 'chest', 'neck', 'head', 'shL', 'shR', 'hipL', 'hipR']) j[k].y -= .79;
    j.elL = V(-.24, .37, .1); j.elR = V(.24, .37, .1); j.wrL = V(-.3, .2, .25); j.wrR = V(.3, .2, .25);
    j.knL = V(-.36, .12, .2); j.knR = V(.36, .12, .2); j.anL = V(.1, .07, .3); j.anR = V(-.1, .07, .3);
  }
  return j;
}

// ═══════════════════════════════════════════════════════════════ geometry ═══
const UPV = V(0, 1, 0);
const _geo = new Map();
/** One person: merged geometry with attributes position, normal, cuv (cloth UV, metres), part. */
export function personGeometry(pose = 'stand', outfit = 'gho', { lod = 0, child = false, bag = false } = {}) {
  const key = [pose, outfit, lod, child, bag].join('|'); if (_geo.has(key)) return _geo.get(key);
  const j = joints(pose), L0 = lod === 0, L2 = lod >= 2, R = L0 ? 7 : L2 ? 3 : 4, list = [], sit = pose === 'sit';
  const add = (g, part) => {
    const n = g.attributes.position.count;
    if (!g.attributes.part) g.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1));
    g.setAttribute('cuv', g.attributes.uv.clone()); g.deleteAttribute('uv');
    list.push(g.index ? g.toNonIndexed() : g);
  };
  const seg = (a, b, ra, rb, part, r = R) => {
    const len = a.distanceTo(b); if (len < 1e-3) return;
    const g = new THREE.CylinderGeometry(rb, ra, len, r, 1, true), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * ra, uv.getY(i) * len);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(UPV, b.clone().sub(a).normalize()), V(1, 1, 1)));
    add(g, part);
  };
  const ball = (c, r, part, ws, hs, s = [1, 1, 1]) => { const g = new THREE.SphereGeometry(r, ws, hs); g.scale(...s); g.translate(c.x, c.y, c.z); add(g, part); };
  /** garment/torso shell: profile rows [radius, y, part], elliptical (depth = sz × width) */
  const shell = (prof, segs, sz = .72, cz = 0) => {
    if (L2) { prof = prof.filter((_, i) => i % 2 === 0 || i === prof.length - 1); segs = 5; }   // far LOD: half the rings, 5 sides
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, .002), y)), segs);
    g.scale(1, 1, sz); g.translate(0, 0, cz);
    const n = g.attributes.position.count, pa = new Float32Array(n), uv = g.attributes.uv, h = prof[prof.length - 1][1] - prof[0][1];
    for (let i = 0; i < n; i++) pa[i] = prof[i % prof.length][2];
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * .18, uv.getY(i) * h);
    g.setAttribute('part', new THREE.Float32BufferAttribute(pa, 1)); add(g);
  };
  const A = P.clothA, B = P.clothB, W = P.white;
  const sleeve = outfit === 'kira' ? B : A, cuffs = outfit === 'gho' || outfit === 'kira';

  // head + hair (children get a bigger head for their size)
  const hs = child ? 1.22 : 1, hc = j.head;
  ball(hc, .1 * hs, P.face, L0 ? 10 : L2 ? 5 : 6, L0 ? 8 : L2 ? 3 : 4, [.92, 1.1, 1]);                    // face features are painted in the shader
  ball(hc.clone().add(V(0, .036 * hs, -.03 * hs)), .107 * hs, P.hair, L0 ? 9 : L2 ? 5 : 6, L0 ? 5 : L2 ? 2 : 3, [.98, .82, 1.02]);
  if (L0) {
    ball(hc.clone().add(V(0, -.012 * hs, .094 * hs)), .017 * hs, P.skin, 5, 3, [.8, 1.3, 1]);                 // nose
    for (const sx of [-1, 1]) ball(hc.clone().add(V(sx * .09 * hs, -.004, -.005)), .018 * hs, P.skin, 4, 3, [.5, 1.2, .9]);   // ears
    if (outfit === 'kira' && !child) ball(hc.clone().add(V(0, .03 * hs, -.105 * hs)), .045, P.hair, 6, 4, [1, .9, .85]);   // hair bun
  }
  if (!L2) seg(j.neck.clone().add(V(0, -.07, 0)), hc.clone().add(V(0, -.07 * hs, 0)), .048, .042, P.skin, L0 ? 6 : 4);

  // torso + garment shell
  const S = L0 ? 10 : 6, d = sit ? -.79 : 0, y = v => v + d, hem = pose === 'walk' ? .235 : .2;
  const top = [[.2, y(1.22)], [.18, y(1.38)], [.12, y(1.45)], [.05, y(1.5)]];
  if (sit) {
    const torsoA = outfit === 'kira' ? B : A, beltP = outfit === 'modern' ? A : B;
    shell([[.19, .12, A], [.175, .2, A], [.165, .27, beltP], [.17, .31, torsoA], ...top.map(([r, yy]) => [r, yy, torsoA])], S);
    ball(V(0, .11, .12), .3, outfit === 'modern' ? B : A, L0 ? 10 : 6, L0 ? 5 : 3, [1.25, .34, 1]);   // the lap: robe/kira/gho folds over the crossed legs
  } else if (outfit === 'gho') {
    shell([[hem, .5, A], [.2, .62, A], [.175, .86, A], [.158, .92, B], [.158, .97, B], [.168, 1.0, A], [.2, 1.22, A], [.18, 1.38, A], [.12, 1.45, A], [.05, 1.5, W]], S);
  } else if (outfit === 'kira') {
    shell([[.2, .08, A], [.19, .4, A], [.175, .86, A], [.16, .97, A], [.152, 1.0, B], [.2, 1.22, B], [.18, 1.38, B], [.12, 1.45, B], [.05, 1.5, W]], S);
  } else if (outfit === 'robe') {
    shell([[.215, .12, A], [.2, .5, A], [.19, .9, A], [.178, .98, B], [.18, 1.02, A], [.205, 1.24, A], [.185, 1.38, A], [.12, 1.45, B], [.05, 1.5, B]], S);
  } else {   // modern: shirt or jacket over trousers
    shell([[.17, .8, A], [.163, .92, A], [.17, 1.04, A], [.198, 1.24, A], [.18, 1.38, A], [.12, 1.45, A], [.05, 1.5, A]], S);
  }

  if (L0) {
    for (const s of ['L', 'R']) ball(j['sh' + s].clone().add(V(s === 'L' ? .012 : -.012, -.012, 0)), .053, sleeve, 7, 5, [1, .82, .95]);   // rounded shoulders (just filling the joint)
    if (outfit === 'kira') for (const sx of [-1, 1]) ball(j.chest.clone().add(V(sx * .11, .09, .115)), .018, P.gold, 6, 4);   // koma brooches
  }
  if (bag && lod < 2) { const g = new THREE.BoxGeometry(.27, .33, .13, 1, 1, 1); g.translate(0, j.chest.y - .02, -.16); add(g, B); }   // backpack (worn on the back)
  // arms: sleeve to the cuff, white cuff (gho lagey, kira wonju), hand
  for (const s of ['L', 'R']) {
    const sh = j['sh' + s], el = j['el' + s], wr = j['wr' + s], cuff = el.clone().lerp(wr, .72);
    if (L2) { seg(sh, el, .052, .046, sleeve); seg(el, wr, .046, .042, cuffs ? W : sleeve); continue; }   // far LOD: two segments, cuff colour on the forearm
    seg(sh, el, .052, .046, sleeve); seg(el, cuffs ? cuff : wr, .046, .04, sleeve);
    if (cuffs) seg(cuff, wr, .049, .047, W);
    if (L0) ball(wr.clone().add(wr.clone().sub(el).normalize().multiplyScalar(.045)), .038, P.skin, 6, 4, [.9, 1.25, .75]);
  }
  // legs + shoes (hidden under long garments; trousers / gho socks show)
  if (!sit) for (const s of ['L', 'R']) {
    const hp = j['hip' + s], kn = j['kn' + s], an = j['an' + s];
    if (outfit === 'modern') { seg(hp, kn, .078, .064, B); seg(kn, an, .064, .052, B); }
    else if (outfit === 'gho') { seg(kn.clone().add(V(0, .06, 0)), an, .056, .044, P.dark); }   // knee socks under the gho
    if (!L2 && (L0 || outfit === 'gho' || outfit === 'modern')) ball(an.clone().add(V(0, -.04, .06)), .05, P.dark, L0 ? 6 : 4, L0 ? 4 : 3, [.8, .55, 1.9]);
  } else if (L0) for (const s of ['L', 'R']) ball(j['an' + s].clone().add(V(0, -.01, .03)), .045, P.dark, 6, 4, [.8, .55, 1.7]);   // feet peeking out of the lap

  const g = mergeGeometries(list, false); g.computeBoundingSphere();
  _geo.set(key, g); return g;
}

// ═══════════════════════════════════════════════════════════════ material ═══
const _mat = new WeakMap();
/** M_people: one Standard material; per-part colour comes from per-instance attributes. */
export function peopleMaterial(materials) {
  if (_mat.has(materials)) return _mat.get(materials);
  const m = new THREE.MeshStandardMaterial({ name: 'M_people', roughness: .82, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float part; attribute vec2 cuv; attribute vec3 iSkin; attribute vec3 iClothA; attribute vec3 iClothB; attribute vec3 iHair; attribute vec2 iPat;
varying float vPart; varying vec2 vCuv; varying vec3 vSkin; varying vec3 vA; varying vec3 vB; varying vec3 vHair; varying vec2 vPat; varying float vLy;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vPart = part; vCuv = cuv; vSkin = iSkin; vA = iClothA; vB = iClothB; vHair = iHair; vPat = iPat; vLy = position.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vPart; varying vec2 vCuv; varying vec3 vSkin; varying vec3 vA; varying vec3 vB; varying vec3 vHair; varying vec2 vPat; varying float vLy;
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
vec3 cc;
if (vPart < .5) cc = vSkin;
else if (vPart < 1.5) {                                   // woven cloth: check (gho) or stripes (kira), with a fine weft line
  vec2 q = vCuv * vPat.y; float bx = step(fract(q.x), .3), by = step(fract(q.y), .3), fine = step(fract(q.y * 3.), .12);
  if (vPat.x < .5) cc = vA;
  else if (vPat.x < 1.5) cc = mix(vA, vB, max(bx, by) * .8) * (1. - fine * .12);
  else cc = mix(vA, min(vA * 1.9 + .06, vec3(1.)), by * .7) * (1. - fine * .1);
}
else if (vPart < 2.5) cc = vB;
else if (vPart < 3.5) {                                   // hair: fine strands, a little lighter on the crown
  float st = h1(floor(vCuv.x * 110.)); cc = vHair * (.78 + .38 * st) * (.92 + .22 * smoothstep(.55, 1., vCuv.y));
}
else if (vPart < 4.5) cc = vec3(.028, .024, .022);
else if (vPart < 5.5) cc = vec3(.82, .79, .73);          // white cuffs and collar
else if (vPart < 6.5) {                                   // face: painted features on the head sphere (front of the head is u = .25)
  vec2 f = vCuv; float du = f.x - .25, ad = abs(du);
  cc = vSkin;
  cc = mix(cc, cc * vec3(1.1, .9, .88), (1. - smoothstep(.02, .065, length(vec2(ad - .062, f.y - .45)))) * .4);          // warm cheeks
  cc *= 1. - .14 * (1. - smoothstep(.0, .035, length(vec2(du - .014, (f.y - .47) * .8))));                              // shadow beside the nose
  cc *= 1. - .18 * (1. - smoothstep(.0, .05, length(vec2(ad - .046, (f.y - .54) * 1.6))));                              // eye sockets
  cc = mix(cc, vec3(.03, .026, .024), 1. - smoothstep(.006, .015, length(vec2(ad - .046, (f.y - .537) * 1.5))));         // eyes
  cc = mix(cc, vHair * .9, (1. - smoothstep(.004, .009, abs(f.y - .586 + (ad - .046) * .25))) * (1. - smoothstep(.02, .032, abs(ad - .046))));   // brows
  cc = mix(cc, vSkin * vec3(.66, .44, .42), (1. - smoothstep(.003, .007, abs(f.y - .405))) * (1. - smoothstep(.013, .026, ad)));       // lips
}
else cc = vec3(.86, .62, .24);                            // gold (koma brooches)
if (vPart > .5 && vPart < 2.5) cc *= 1. - .16 * pow(abs(sin(vCuv.x * 23. + sin(vCuv.y * 2.7) * 1.6)), 8.) * smoothstep(1.25, .6, vLy);   // fabric folds, deepest on skirts
cc *= mix(.6, 1., smoothstep(.0, .24, vLy));             // contact shading where the body meets the ground
vec4 diffuseColor = vec4( cc * diffuse, opacity );`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
if (vPart < .5 || (vPart > 5.5 && vPart < 6.5)) roughnessFactor = .62; else if (vPart > 2.5 && vPart < 3.5) roughnessFactor = .48; else if (vPart > 6.5) roughnessFactor = .32;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
if (vPart > 6.5) metalnessFactor = .8;`);
  };
  m.customProgramCacheKey = () => 'gmc_people_v1.1';
  m.userData.gmc = true;
  _mat.set(materials, m); return m;
}

// ══════════════════════════════════════════════════════════════ placement ═══
/**
 * Instanced people. list: [{ x, y, z, yaw?, pose?, outfit?, child?, lod?, scale?, bag? }]
 * Defaults: pose 'stand' (a third of standing adults clasp their hands behind them), outfit picked
 * (gho 40 % · kira 35 % · modern 20 % · robe 5 %), lod from opts, body build varied per person.
 */
export function createPeople(materials, list, { name = 'people', seed = SEED, lod = 0, castShadow = true } = {}) {
  const r = mulberry(seed * 3 + 7), pick = a => a[Math.floor(r() * a.length)], group = new THREE.Group(); group.name = name;
  const mat = peopleMaterial(materials), buckets = new Map();
  for (const t of list) {
    const u = r(), outfit = t.outfit ?? (u < .4 ? 'gho' : u < .75 ? 'kira' : u < .95 ? 'modern' : 'robe');
    let pose = t.pose ?? 'stand'; if (pose === 'stand' && !t.child && !t.pose && r() < .35) pose = 'behind';
    if (t.pose === 'stand' && !t.child && r() < .3) pose = 'behind';
    const p = { ...t, pose, outfit, child: !!t.child, lod: t.lod ?? lod, bag: !!t.bag };
    const key = [p.pose, p.outfit, p.child, p.lod, p.bag].join('|'); if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(p);
  }
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (const [key, items] of buckets) {
    const [pose, outfit, child, l, bag] = key.split('|'), geo = personGeometry(pose, outfit, { lod: +l, child: child === 'true', bag: bag === 'true' }).clone(), n = items.length;
    const att = (k, s) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * s), s); geo.setAttribute(k, a); return a; };
    const aSkin = att('iSkin', 3), aA = att('iClothA', 3), aB = att('iClothB', 3), aHair = att('iHair', 3), aPat = att('iPat', 2);
    const m = new THREE.InstancedMesh(geo, mat, n); m.name = `${name}_${pose}_${outfit}${child === 'true' ? '_child' : ''}`;
    items.forEach((t, i) => {
      const s = t.scale ?? (t.child ? .66 + r() * .12 : .94 + r() * .12), build = .9 + r() * .2;   // slim ↔ broad
      d.position.set(t.x, t.y, t.z); d.rotation.set(0, t.yaw ?? r() * Math.PI * 2, 0); d.scale.set(s * build, s, s * (.95 + (build - 1) * .7)); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      const skin = pick(SKIN); c.set(skin); aSkin.setXYZ(i, c.r, c.g, c.b);
      const [ca, cb] = pick(CLOTH[outfit]); c.set(ca); aA.setXYZ(i, c.r, c.g, c.b); c.set(cb); aB.setXYZ(i, c.r, c.g, c.b);
      if (outfit === 'robe') c.set(skin).multiplyScalar(.62); else c.set(pick(HAIR));                  // monks: shaved heads
      aHair.setXYZ(i, c.r, c.g, c.b);
      const [pt, pf] = PATTERN[outfit]; aPat.setXY(i, pt, pf * (.8 + r() * .5));
    });
    m.castShadow = castShadow; m.receiveShadow = true; group.add(m);
  }
  return group;
}

/** Helper: people seated in rows facing a point (a class, a gathering). Returns list items. */
export function seatedGroup({ x, y, z, faceX, faceZ, rows = 3, perRow = 5, spacing = 1.05, rowGap = 1.1, child = true, jitter = .18, seed = SEED } = {}) {
  const r = mulberry(seed + 51), yaw = Math.atan2(faceX - x, faceZ - z), out = [], cs = Math.cos(yaw), sn = Math.sin(yaw);
  for (let row = 0; row < rows; row++) for (let k = 0; k < perRow - (row % 2); k++) {
    const lx = (k - (perRow - 1 - (row % 2)) / 2) * spacing + (r() - .5) * jitter, lz = -row * rowGap + (r() - .5) * jitter;
    out.push({ x: x + lx * cs + lz * sn, y, z: z - lx * sn + lz * cs, yaw: yaw + (r() - .5) * .3, pose: 'sit', child });
  }
  return out;
}
