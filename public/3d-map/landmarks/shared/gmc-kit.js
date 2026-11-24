// ─────────────────────────────────────────────────────────────────────────────
// GMC shared 3D kit · v1.0.0
// The single source of truth in code for design.md: colour tokens, procedural
// textures, the M_* material library, the DUSK/DAY lighting rig, background,
// renderer + post, a review stage, and hand-off helpers (validator, GLB export).
//
// Both designers import this file. Never copy values out of it into a model:
// import them, so a change here reaches every model.
//
// three.js 0.160.0 via importmap:  "three" + "three/addons/"
// Units: 1 unit = 1 metre. Axes: +Y up, −Z north, +X east (design.md §8).
// UV convention: UVs are in METRES. Every texture knows its real tile size, so
// a 0.3 m shingle is 0.3 m on every model. Use metricUV() on geometries whose
// built-in UVs are 0..1 (Box, RoundedBox, Cylinder, Lathe, Sphere...).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// 1.9.0: tokens, noise and texture recipes live in gmc-recipes.js (no three.js) so Web Workers can build them;
// everything is re-exported here, so models keep importing from 'gmc-kit'.
import { SEED, TOKENS, GLOW_RAMP, mulberry, createNoise, paint, heightToNormal, RECIPES, makeCanvas, foliagePixels, textureJobs, recipeKey,
  rgb, mix, clamp, sstep, idbOpen, idbGet } from './gmc-recipes.js';
export { SEED, TOKENS, GLOW_RAMP, mulberry, createNoise, paint, heightToNormal, RECIPES, makeCanvas, textureJobs };

export const KIT_VERSION = '1.9.0';   // 1.9.0: fast load: textures painted in parallel Web Workers and cached in IndexedDB (prepareTextures), recipes split into gmc-recipes.js · 1.8.0: river water shader (3-scale chop on the current, clear shallows + caustics, drifting foam, Fresnel), reeds + cattails, broad-leaf river plants · 1.7.0: + M_people (scale figures, gmc-people.js) · 1.6.0: + M_cloud (hero clouds, gmc-hero-clouds.js) · 1.5.0: GOLDEN HOUR mood (key, sky, environment, background) · 1.4.0: nature kit (trees, grass, rocks, river surface, wet banks; M_bark, M_foliage, M_rock; flowing M_water) · 1.3.0: + M_textile_block, 7 textile tokens · 1.2.0: + M_glulam · 1.1.0: + M_steel_dark, clay keeps hidden meshes hidden


// ══════════════════════════════════════════════════════════════ 2. MOODS ════
// design.md §4. Exactly three moods (DUSK, GOLDEN, DAY). Never tune per model.
export const MOODS = Object.freeze({
  dusk: {
    key: { color: TOKENS.marigold, intensity: 3.0, azimuth: 255, elevation: 18 },
    hemi: { sky: 0x3a4a6e, ground: 0x221208, intensity: 0.9 },
    envIntensity: 0.85, exposure: 1.05,
    bloom: { strength: 0.32, radius: 0.5, threshold: 0.9 },
    glow: { color: TOKENS.honey, scale: 2.2 },          // HDR so bloom catches it
    fog: { color: 0x1a1d2a, density: 0.00004 },
    background: { top: 0x0b0e18, bottom: 0x18130f, mist: 0xc9cfd6 },
  },
  // GOLDEN HOUR (1.5.0): the hour before dusk. Low warm sun from the same WSW quarter as the cloud kit's golden
  // (az 250); the sky still blue overhead and amber at the horizon; lamps already on but soft (below most of the bloom).
  golden: {
    key: { color: 0xffbf7c, intensity: 3.7, azimuth: 250, elevation: 11 },
    hemi: { sky: 0x86a0cc, ground: 0x66492f, intensity: .95 },
    envIntensity: 1.0, exposure: 1.02,
    bloom: { strength: 0.2, radius: 0.5, threshold: 0.93 },
    glow: { color: TOKENS.honey, scale: 1.35 },
    fog: { color: 0xe9d9c4, density: 0.00003 },
    background: { top: 0x4f86c4, bottom: 0xf3cf9e, mist: 0xffe3bd },
  },
  day: {
    key: { color: TOKENS.glowCream, intensity: 3.2, azimuth: 215, elevation: 45 },
    hemi: { sky: 0xdfe6ee, ground: 0x7a736a, intensity: 0.9 },
    envIntensity: 1.0, exposure: 1.05,
    bloom: { strength: 0.12, radius: 0.4, threshold: 0.97 },
    glow: { color: 0x2a241f, scale: 1.0 },              // unlit interior tone
    fog: { color: 0xc9cfd6, density: 0.00003 },
    background: { top: 0xdce1e6, bottom: 0xb9bec2, mist: 0xffffff },
  },
});

const DEG = Math.PI / 180;
/** Unit vector from the target toward the sun. Azimuth clockwise from north (−Z). */
export function sunDirection(azimuthDeg, elevationDeg) {
  const a = azimuthDeg * DEG, e = elevationDeg * DEG;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

// ═══════════════════════════════════ 3–4. NOISE, CANVAS + TEXTURE RECIPES ════
// In gmc-recipes.js (1.9.0), re-exported above. prepareTextures() builds them in Web Workers
// and caches them in IndexedDB; createMaterials() falls back to painting on the page.

/** Foliage atlas (1.4.0) as DataTextures, from foliagePixels() (worker-built when prepared). */
const _foliageCache = new Map();
function foliageAtlas(S) {
  if (!_foliageCache.has(S)) _foliageCache.set(S, foliagePixels(S));
  const { col, alpha } = _foliageCache.get(S);
  const mk = (data, srgb) => { const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };
  return { map: mk(col, true), alpha: mk(alpha, false) };
}


// ═════════════════════════════════════════════════════════ 5. MATERIALS ════
/** Every allowed material name (design.md §3.2). The validator rejects anything else. */
export const MATERIAL_NAMES = Object.freeze([
  'M_timber_cedar', 'M_timber_dark', 'M_glulam', 'M_timber_painted', 'M_medallion', 'M_bamboo_slat', 'M_lime_wall',
  'M_stone_masonry', 'M_slate_roof', 'M_gold', 'M_steel_dark', 'M_glass', 'M_window_glow', 'M_textile_tile', 'M_textile_block', 'M_clay', 'M_clay_roof',
  'M_terrain', 'M_skirt', 'M_water', 'M_gravel', 'M_paddy', 'M_paddy_flooded', 'M_canopy', 'M_anchor',
  'M_bark', 'M_foliage', 'M_rock',   // 1.4.0 nature kit
  'M_cloud',                          // 1.6.0 hero clouds (shared/gmc-hero-clouds.js)
  'M_people',                         // 1.7.0 scale figures (shared/gmc-people.js)
]);

const _canvasCache = new Map();
function recipe(name, S, opts = {}) {
  const key = recipeKey(name, S, opts);
  if (!_canvasCache.has(key)) _canvasCache.set(key, RECIPES[name](createNoise(SEED), S, opts));
  return _canvasCache.get(key);
}

// ═══════════════════════════ 5a. PARALLEL + CACHED TEXTURE BUILD (1.9.0) ════
// Call `await prepareTextures({ quality })` before createStage()/createMaterials(): it fills the recipe
// cache from IndexedDB (decoded off the main thread) or paints the missing ones in a pool of Web
// Workers, so the page never freezes for the ~10 s the recipes take on one thread. Optional: without it
// createMaterials() paints on the page exactly as before.
const BITMAP = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
function toCanvas(bmp) { const c = makeCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.(); return c; }
async function hydrate(job, rec) {
  if (job.kind === 'foliage') { _foliageCache.set(job.S, rec.foliage); return; }
  const out = { ...rec.meta };
  await Promise.all(Object.entries(rec.blobs).map(async ([k, b]) => { out[k] = toCanvas(await createImageBitmap(b, BITMAP)); }));
  _canvasCache.set(job.key, out);
}
function buildInWorkers(jobs, ver, n) {
  return new Promise((resolve, reject) => {
    let workers;
    try { workers = Array.from({ length: Math.min(n, jobs.length) }, () => new Worker(new URL('./gmc-textures-worker.js', import.meta.url), { type: 'module' })); }
    catch (e) { return reject(e); }
    const queue = jobs.slice().sort((a, b) => b.S - a.S), byId = new Map(); let next = 0, done = 0, stored = 0;
    const feed = w => { if (next >= queue.length) return; const j = queue[next]; j.id = next++; byId.set(j.id, j); w.busy = j;
      w.postMessage({ id: j.id, kind: j.kind, name: j.name, S: j.S, opts: j.opts, cacheKey: ver + j.key }); };
    const finish = () => { if (stored >= queue.length) workers.forEach(w => w.terminate()); };
    for (const w of workers) {
      w.onmessage = ({ data }) => {
        const j = byId.get(data.id);
        if (data.stored) { stored++; finish(); return; }
        if (data.error) { _canvasCache.delete(j.key); stored++; console.warn('[kit] texture worker:', j.key, data.error); }   // painted on the page later, by createMaterials()
        else if (j.kind === 'foliage') _foliageCache.set(j.S, data.foliage);
        else { const out = { ...data.meta }; for (const [k, b] of Object.entries(data.bitmaps)) out[k] = toCanvas(b); _canvasCache.set(j.key, out); }
        if (++done === queue.length) resolve(); feed(w); finish();
      };
      w.onerror = e => { e.preventDefault?.(); workers.forEach(x => x.terminate()); reject(e.error || new Error(e.message || 'texture worker failed')); };
      feed(w);
    }
  });
}
/**
 * Build (or load from cache) every texture createMaterials() needs, off the main thread.
 * @returns {Promise<{cached:number, built:number, ms:number}>}
 */
export async function prepareTextures({ quality = 'high', workers = Math.max(1, Math.min(6, (globalThis.navigator?.hardwareConcurrency || 4) - 1)) } = {}) {
  const t0 = performance.now(), jobs = [];
  for (const [name, S, opts] of Object.values(textureJobs(quality))) { const key = recipeKey(name, S, opts); if (!_canvasCache.has(key) && !jobs.some(j => j.key === key)) jobs.push({ kind: 'recipe', name, S, opts, key }); }
  const FS = quality === 'low' ? 512 : 1024; if (!_foliageCache.has(FS)) jobs.push({ kind: 'foliage', S: FS, key: 'foliage:' + FS });
  if (!jobs.length) return { cached: 0, built: 0, ms: 0 };
  const ver = KIT_VERSION + '|', db = await idbOpen().catch(() => null), todo = []; let cached = 0;
  await Promise.all(jobs.map(async j => { const rec = db && await idbGet(db, ver + j.key); if (rec) { try { await hydrate(j, rec); cached++; return; } catch { /* stale entry: rebuild */ } } todo.push(j); }));
  if (todo.length) { try { await buildInWorkers(todo, ver, workers); } catch (e) { console.warn('[kit] texture workers unavailable, painting on the page:', e?.message || e); } }
  return { cached, built: todo.length, ms: Math.round(performance.now() - t0) };
}
function toTex(canvas, { srgb = false, tile = [1, 1], aniso = 8, clampV = false, decal = false }) {
  if (!canvas) return null;
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = decal ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapT = decal || clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(1 / tile[0], 1 / tile[1]); t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
function texSet(r, aniso) {
  const o = { tile: r.tile, aniso, clampV: r.clampV, decal: r.decal };
  return { map: toTex(r.map, { ...o, srgb: true }), normalMap: toTex(r.normal, o), roughnessMap: toTex(r.rough, o) };
}
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

/**
 * Build the full M_* library. Call once per scene; textures are cached.
 * @param {{renderer?:THREE.WebGLRenderer, quality?:'high'|'low'}} opts
 * @returns {Record<string, THREE.Material>}
 */
export function createMaterials({ renderer = null, quality = 'high' } = {}) {
  const J = textureJobs(quality), R = id => recipe(...J[id]), aniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;   // the same job list prepareTextures() pre-builds
  const P = (name, params) => new THREE.MeshPhysicalMaterial({ name, ...clean(params) });
  const St = (name, params) => new THREE.MeshStandardMaterial({ name, ...clean(params) });
  const nrm = s => new THREE.Vector2(s, s);
  const M = {};

  M.M_timber_cedar = P('M_timber_cedar', { ...texSet(R('wood'), aniso), roughness: 1, metalness: 0, clearcoat: .12, clearcoatRoughness: .5 });
  M.M_timber_dark = P('M_timber_dark', { ...texSet(R('woodDark'), aniso), roughness: 1, metalness: 0 });
  M.M_glulam = P('M_glulam', { ...texSet(R('glulam'), aniso), roughness: 1, metalness: 0, clearcoat: .08, clearcoatRoughness: .6 });
  M.M_timber_painted = P('M_timber_painted', { ...texSet(R('painted'), aniso), roughness: 1, clearcoat: .2, clearcoatRoughness: .4 });
  M.M_medallion = P('M_medallion', { ...texSet(R('medallion'), aniso), roughness: .5, clearcoat: .2, alphaTest: .35, side: THREE.DoubleSide });
  M.M_bamboo_slat = P('M_bamboo_slat', { ...texSet(R('bamboo'), aniso), roughness: 1, sheen: .3, sheenColor: new THREE.Color(0xffd28c), sheenRoughness: .6 });
  M.M_lime_wall = P('M_lime_wall', { ...texSet(R('lime'), aniso), roughness: 1, normalScale: nrm(.15) });
  M.M_stone_masonry = P('M_stone_masonry', { ...texSet(R('stone'), aniso), roughness: 1, normalScale: nrm(.6) });
  M.M_slate_roof = P('M_slate_roof', { ...texSet(R('shingle'), aniso), roughness: 1, clearcoat: .25, clearcoatRoughness: .5, normalScale: nrm(.5) });
  M.M_gold = P('M_gold', { color: TOKENS.gold, metalness: .65, roughness: .3, clearcoat: .3 });
  // dark bronze steel. Not darker than this: at dusk a darker metal reads as a black hole (skill rule).
  M.M_steel_dark = P('M_steel_dark', { color: 0x5a5048, metalness: .7, roughness: 1, roughnessMap: toTex(R('brushed').rough, { tile: [1, 1], aniso }), anisotropy: .5, clearcoat: .3, clearcoatRoughness: .35 });
  M.M_glass = P('M_glass', { color: 0x1d2a30, roughness: .05, metalness: 0, ior: 1.5, envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: .03 });
  M.M_window_glow = new THREE.MeshBasicMaterial({ name: 'M_window_glow', map: toTex(R('glow').map, { srgb: true }) });
  M.M_textile_tile = P('M_textile_tile', { ...texSet(R('textile'), aniso), roughness: 1, clearcoat: .35, clearcoatRoughness: .2 });
  // colour per block comes from instanceColor (the textile pattern); the texture is the glazed cladding grain
  M.M_textile_block = P('M_textile_block', { ...texSet(R('block'), aniso), roughness: 1, clearcoat: .3, clearcoatRoughness: .3 });
  M.M_clay = St('M_clay', { color: TOKENS.sand, roughness: .85 });
  M.M_clay_roof = St('M_clay_roof', { color: 0xd9d3c8, roughness: .8 });
  M.M_terrain = St('M_terrain', { ...texSet(R('ground'), aniso), roughness: 1 });
  M.M_skirt = St('M_skirt', { ...texSet(R('skirt'), aniso), roughness: 1, normalScale: nrm(.6) });
  // two ripple layers (base normal + clearcoat normal) drift downstream at different scales and speeds (animateNature)
  M.M_water = P('M_water', { color: TOKENS.riverWater, normalMap: toTex(R('ripple').normal, { tile: [8, 8], aniso }), normalScale: nrm(.25), roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1,
    clearcoatNormalMap: toTex(R('ripple').normal, { tile: [2.6, 3.4], aniso }), clearcoatNormalScale: nrm(.32) });
  M.M_gravel = St('M_gravel', { ...texSet(R('gravel'), aniso), roughness: .95 });
  M.M_paddy = St('M_paddy', { ...texSet(R('paddy'), aniso), roughness: 1 });
  M.M_paddy_flooded = P('M_paddy_flooded', { ...texSet(R('paddyFlooded'), aniso), roughness: 1, clearcoat: .6, clearcoatRoughness: .1 });
  M.M_canopy = St('M_canopy', { color: 0xffffff, roughness: .9 });   // colour comes from instanceColor (jitterInstanceColors)
  M.M_anchor = new THREE.MeshBasicMaterial({ name: 'M_anchor', color: TOKENS.saffron, transparent: true, opacity: .9, depthWrite: false });
  // 1.4.0 nature kit
  M.M_bark = P('M_bark', { ...texSet(R('bark'), aniso), roughness: 1 });
  M.M_rock = P('M_rock', { ...texSet(R('rock'), aniso), roughness: 1, vertexColors: true });   // vertex colour = moss on top, wet at the base
  const atlas = foliageAtlas(quality === 'low' ? 512 : 1024); atlas.map.anisotropy = aniso;
  M.M_foliage = St('M_foliage', { map: atlas.map, alphaTest: .5, side: THREE.DoubleSide, vertexColors: true, roughness: .8 });
  // leaf cards carry rounded "crown" normals: don't flip them on back faces, or the far side of every card goes dark
  M.M_foliage.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;')); };
  M.M_foliage.customProgramCacheKey = () => 'gmc_foliage';
  M.M_foliage.userData.clay = new THREE.MeshStandardMaterial({ name: 'M_clay', color: TOKENS.sand, roughness: .85, alphaMap: atlas.alpha, alphaTest: .5, side: THREE.DoubleSide });

  for (const k of Object.keys(M)) M[k].userData.gmc = true;
  return M;
}
/** Variant materials that keep their library name, e.g. ripe paddy: variant(M.M_paddy, {color: TOKENS.paddyGold}). */
export function variant(material, params) { const m = material.clone(); m.setValues(params); m.name = material.name; return m; }

/** Canopy colour jitter between forest and canopy-light (design.md §3.2). */
export function jitterInstanceColors(mesh, { seed = SEED, amount = .08 } = {}) {
  const r = mulberry(seed), a = new THREE.Color(TOKENS.forest), b = new THREE.Color(TOKENS.canopyLight), c = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) {
    c.copy(a).lerp(b, .35 + r() * .4); const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, clamp(hsl.l * (1 + (r() * 2 - 1) * amount), 0, 1));
    mesh.setColorAt(i, c);
  }
  mesh.instanceColor.needsUpdate = true; return mesh;
}

// ══════════════════════════════════════════════════ 5b. NATURE KIT (1.4.0) ═══
// design.md §7 E1/E3/E4/E9. Trees grow from a seeded branching skeleton (bark tubes)
// with leaf-cluster cards from the foliage atlas. Cards get rounded crown normals and
// a baked self-shadow in vertex colour, so a crown reads as a volume, not as planes.
// LOD0 (≈1–1.6k tris) for trees near the hero, LOD1 (≈100–250 tris) for the forest.
/** Species, real size. `color` is the canopy mid tone (hue 75–110°, sat ≤ 40 %, design.md §2.3). */
export const TREE_SPECIES = Object.freeze({
  broadleaf: { height: 13, color: 0x4d6b3f, cell: 0 },   // lowland subtropical broadleaf: round, layered crown
  sal:       { height: 18, color: 0x55703f, cell: 2 },   // sal-like tall broadleaf: narrow crown high up
  chirPine:  { height: 17, color: 0x5b6d45, cell: 1 },   // chir pine: straight trunk, open tufted crown
  bluePine:  { height: 14, color: 0x3d5848, cell: 1 },   // blue pine: conical, drooping whorls
  shrub:     { height: 2.6, color: 0x5d7a45, cell: 0 },  // understory / bank shrubs
});
const deg = a => a * DEG;
function treeLevels(sp, lod) {
  const L0 = lod === 0;
  // per level: n children [a,b], spawn range along parent, branch angle (deg), length (abs m or f(t)), radius ratio, segments, radial, upward bend, leaves
  switch (sp) {
    case 'broadleaf': return { trunk: { len: 6.2, rad: .36, segs: 4, radial: L0 ? 8 : 5, bend: 0 }, levels: [
      { n: [4, 5], at: [.6, 1], ang: [28, 52], lenR: [4, 5.2], rad: .55, segs: L0 ? 3 : 2, radial: L0 ? 6 : 4, bend: .06, leaves: !L0 },
      ...(L0 ? [{ n: [3, 4], at: [.35, 1], ang: [25, 50], lenR: [2.2, 3.1], rad: .5, segs: 2, radial: 4, bend: .04, leaves: true }] : [])],
      cards: L0 ? { per: 14, size: 2.6, spread: 1.15 } : { per: 10, size: 4.4, spread: 1.9 } };
    case 'sal': return { trunk: { len: 11, rad: .4, segs: 5, radial: L0 ? 8 : 5, bend: 0 }, levels: [
      { n: [5, 6], at: [.62, 1], ang: [16, 32], lenR: [3.4, 4.8], rad: .5, segs: L0 ? 3 : 2, radial: L0 ? 6 : 4, bend: .05, leaves: !L0 },
      ...(L0 ? [{ n: [3, 3], at: [.4, 1], ang: [24, 44], lenR: [1.8, 2.6], rad: .5, segs: 2, radial: 4, bend: .04, leaves: true }] : [])],
      cards: L0 ? { per: 12, size: 2.6, spread: 1.05 } : { per: 8, size: 4.2, spread: 1.6 } };
    case 'chirPine': return { trunk: { len: 16, rad: .33, segs: 6, radial: L0 ? 8 : 5, bend: 0 }, levels: [
      { n: L0 ? [11, 14] : [7, 8], at: [.48, .97], ang: [62, 82], lenR: [2.4, 3.4], lenT: .55, rad: .22, segs: 2, radial: 4, bend: .09, leaves: !L0 },
      ...(L0 ? [{ n: [2, 3], at: [.4, 1], ang: [28, 48], lenR: [1, 1.5], rad: .5, segs: 1, radial: 3, bend: .05, leaves: true }] : [])],
      cards: L0 ? { per: 6, size: 1.8, spread: .5 } : { per: 6, size: 3.1, spread: .8 } };
    case 'bluePine': return { trunk: { len: 13.5, rad: .3, segs: 6, radial: L0 ? 7 : 5, bend: 0 }, levels: [
      { n: L0 ? [20, 24] : [10, 12], at: [.12, .97], ang: [92, 108], lenR: [3.8, 4.6], lenT: .9, rad: .2, segs: L0 ? 3 : 2, radial: 3, bend: -.02, leaves: true }],
      cards: L0 ? { per: 9, size: 1.6, spread: .4, along: true } : { per: 6, size: 2.6, spread: .5, along: true } };
    default: return { trunk: { len: .35, rad: .09, segs: 1, radial: 5, bend: 0 }, levels: [   // shrub
      { n: [4, 6], at: [.8, 1], ang: [22, 55], lenR: [1.5, 2.2], rad: .7, segs: 2, radial: 3, bend: .05, leaves: true }],
      cards: L0 ? { per: 5, size: 1.25, spread: .55 } : { per: 3, size: 1.8, spread: .7 } };
  }
}
const _treeCache = new Map();
/** Grow one tree: { wood, leaves } geometries in metres, base at the origin. */
export function growTree(species = 'broadleaf', { lod = 0, seed = SEED } = {}) {
  const key = species + lod + ':' + seed; if (_treeCache.has(key)) return _treeCache.get(key);
  const sp = TREE_SPECIES[species], cfg = treeLevels(species, lod), r = mulberry(seed + species.length * 97 + lod * 7);
  if (lod > 0) {   // forest LOD: wood is barely seen through the crowns, keep it to a handful of triangles
    cfg.trunk.segs = Math.min(cfg.trunk.segs, 2); cfg.trunk.radial = 4;
    cfg.levels.forEach(l => { l.segs = 1; l.radial = 3; });
  }
  const R = (a, b) => a + (b - a) * r(), wood = [], tips = [];
  const UPV = new THREE.Vector3(0, 1, 0);
  const tube = (a, b, ra, rb, radial) => {
    const len = a.distanceTo(b); if (len < 1e-3) return;
    const g = scaleUV(new THREE.CylinderGeometry(rb, ra, len, radial, 1, true), 2 * Math.PI * ra, len);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(UPV, b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1)));
    wood.push(g);
  };
  function limb(p0, dir, len, rad, lv, def) {
    const pts = [p0.clone()], rads = [rad], v = dir.clone(); let p = p0.clone();
    for (let i = 1; i <= def.segs; i++) {
      v.y += def.bend; v.x += (r() - .5) * .18; v.z += (r() - .5) * .18; v.normalize();
      p = p.clone().addScaledVector(v, len / def.segs); pts.push(p); rads.push(rad * (1 - .55 * i / def.segs));
    }
    for (let i = 0; i < def.segs; i++) tube(pts[i], pts[i + 1], rads[i], rads[i + 1], def.radial);
    const along = t => { const f = t * def.segs, i = Math.min(def.segs - 1, Math.floor(f)), k = f - i; return { p: pts[i].clone().lerp(pts[i + 1], k), d: pts[i + 1].clone().sub(pts[i]).normalize(), r: rads[i] + (rads[i + 1] - rads[i]) * k }; };
    if (def.leaves) tips.push({ along, len });
    const next = cfg.levels[lv]; if (!next) return;
    const n = Math.round(R(next.n[0], next.n[1]));
    let az = r() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const t = next.at[0] + (next.at[1] - next.at[0]) * (n === 1 ? .5 : k / (n - 1)) + (r() - .5) * .06, a = along(clamp(t));
      az += 2.39996 + (r() - .5) * .5;                                         // golden-angle phyllotaxis
      const ax = Math.abs(a.d.y) < .9 ? UPV : new THREE.Vector3(1, 0, 0), e1 = new THREE.Vector3().crossVectors(a.d, ax).normalize(), e2 = new THREE.Vector3().crossVectors(a.d, e1);
      const perp = e1.multiplyScalar(Math.cos(az)).add(e2.multiplyScalar(Math.sin(az))), an = deg(R(next.ang[0], next.ang[1]));
      const cd = a.d.clone().multiplyScalar(Math.cos(an)).add(perp.multiplyScalar(Math.sin(an))).normalize();
      const cl = R(next.lenR[0], next.lenR[1]) * (next.lenT ? 1 - next.lenT * (t - next.at[0]) / (1 - next.at[0]) : 1);
      limb(a.p, cd, cl, Math.max(a.r * next.rad, .03), lv + 1, next);
    }
  }
  const T = cfg.trunk, lean = new THREE.Vector3((r() - .5) * .08, 1, (r() - .5) * .08).normalize();
  limb(new THREE.Vector3(), lean, T.len, T.rad, 0, { ...T, leaves: false });
  // leaf cards
  const C = cfg.cards, cards = [];
  for (const tp of tips) {
    const n = Math.max(1, Math.round(C.per * (C.along ? tp.len / 3 : 1)));
    for (let i = 0; i < n; i++) {
      const a = tp.along(C.along ? .15 + .85 * (i + r()) / n : .3 + .7 * r());
      cards.push(a.p.clone().add(new THREE.Vector3(R(-1, 1), R(-.6, 1), R(-1, 1)).multiplyScalar(C.spread)));
    }
  }
  const box = new THREE.Box3().setFromPoints(cards.length ? cards : [new THREE.Vector3()]), ctr = box.getCenter(new THREE.Vector3()), half = box.getSize(new THREE.Vector3()).multiplyScalar(.5).addScalar(.01);
  const pos = [], nor = [], uv = [], col = [], idx = [], S = 2, cell = sp.cell, ox = (cell % 2) * .5, oy = Math.floor(cell / 2) * .5;
  cards.forEach((p, ci) => {
    const rel = p.clone().sub(ctr).divide(half), out = rel.clone().normalize();
    const nrm = out.clone().add(new THREE.Vector3(R(-.5, .5), R(-.3, .6), R(-.5, .5))).normalize();
    let right = new THREE.Vector3().crossVectors(UPV, nrm); if (right.lengthSq() < 1e-4) right.set(1, 0, 0); right.normalize();
    let up = new THREE.Vector3().crossVectors(nrm, right).normalize();
    const roll = R(-.6, .6) + (species.includes('Pine') ? R(-2, 2) : 0), cr = Math.cos(roll), sr = Math.sin(roll);
    [right, up] = [right.clone().multiplyScalar(cr).addScaledVector(up, sr), up.clone().multiplyScalar(cr).addScaledVector(right, -sr)];
    const s = C.size * R(.8, 1.15), base = ci * 4;
    for (const [u, t] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const v = p.clone().addScaledVector(right, (u - .5) * s).addScaledVector(up, (t - .35) * s);
      pos.push(v.x, v.y, v.z);
      const sph = v.clone().sub(ctr).divide(half).normalize(), nn = sph.multiplyScalar(.75).addScaledVector(nrm, .25).normalize();
      nor.push(nn.x, nn.y, nn.z);
      uv.push(ox + u * .5, oy + (1 - t) * .5);
      const d = clamp(v.clone().sub(ctr).divide(half).length()), ao = (.42 + .58 * Math.pow(d, 1.3)) * (.82 + .18 * clamp((v.y - box.min.y) / (2 * half.y)));
      col.push(ao, ao, ao);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); leaves.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); leaves.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); leaves.setIndex(idx);
  const out = { wood: mergeGeometries(wood, false), leaves, height: Math.max(box.max.y, T.len) };
  _treeCache.set(key, out); return out;
}

/**
 * Instanced trees. list: [{ x, y, z, height?, species?, yaw?, lod? }] (y = ground).
 * LOD0 inside `nearRadius` of `near` (Vector3), else LOD1 — or pass lod per item.
 * Returns a Group (draw calls: 2 per species per LOD per variant).
 */
export function createTrees(materials, list, { near = null, nearRadius = 0, name = 'trees', castShadow = true, seed = SEED, jitter = .1 } = {}) {
  const group = new THREE.Group(); group.name = name;
  const r = mulberry(seed + 5), buckets = new Map(), d = new THREE.Object3D(), c = new THREE.Color(), hsl = {};
  for (const t of list) {
    const sp = t.species ?? 'broadleaf', lod = t.lod ?? (near && Math.hypot(t.x - near.x, t.z - near.z) < nearRadius ? 0 : 1);
    const v = lod === 0 ? (r() < .5 ? 0 : 1) : 0, key = sp + ':' + lod + ':' + v;
    if (!buckets.has(key)) buckets.set(key, { sp, lod, v, items: [] }); buckets.get(key).items.push(t);
  }
  for (const { sp, lod, v, items } of buckets.values()) {
    const geo = growTree(sp, { lod, seed: seed + v * 1013 }), base = TREE_SPECIES[sp];
    const wood = new THREE.InstancedMesh(geo.wood, materials.M_bark, items.length), leaf = new THREE.InstancedMesh(geo.leaves, materials.M_foliage, items.length);
    wood.name = `${name}_${sp}_lod${lod}_wood`; leaf.name = `${name}_${sp}_lod${lod}_leaves`;
    items.forEach((t, i) => {
      const s = (t.height ?? base.height) / geo.height, sx = s * (1 + (r() - .5) * .16);
      d.position.set(t.x, t.y, t.z); d.rotation.set(0, t.yaw ?? r() * Math.PI * 2, 0); d.scale.set(sx, s, sx * (1 + (r() - .5) * .1)); d.updateMatrix();
      wood.setMatrixAt(i, d.matrix); leaf.setMatrixAt(i, d.matrix);
      c.set(t.color ?? base.color); c.getHSL(hsl);
      c.setHSL(hsl.h + (r() - .5) * .03, hsl.s * (1 + (r() - .5) * .2), clamp(hsl.l * (1 + (r() * 2 - 1) * jitter), 0, 1)); leaf.setColorAt(i, c);
    });
    leaf.instanceColor.needsUpdate = true;
    wood.castShadow = leaf.castShadow = castShadow; wood.receiveShadow = leaf.receiveShadow = true;
    group.add(wood, leaf);
  }
  return group;
}

/** Grass tufts (instanced, foliage atlas cell 3). list: [{ x, y, z, s? }]. */
export function createGrass(materials, list, { name = 'grass', color = 0x6f8a4e, seed = SEED } = {}) {
  const pos = [], nor = [], uv = [], col = [], idx = [];
  for (let q = 0; q < 3; q++) {
    const a = q * Math.PI / 3, dx = Math.cos(a) * .45, dz = Math.sin(a) * .45, b = q * 4;
    for (const [u, t] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      pos.push(dx * (u * 2 - 1), t * .55, dz * (u * 2 - 1)); nor.push(0, 1, 0); uv.push(.5 + u * .5, .5 + (1 - t) * .5);
      const k = .45 + .55 * t; col.push(k, k, k);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const m = new THREE.InstancedMesh(g, materials.M_foliage, list.length); m.name = name;
  const r = mulberry(seed + 9), d = new THREE.Object3D(), c = new THREE.Color(), hsl = {};
  list.forEach((p, i) => {
    const s = (p.s ?? 1) * (.7 + r() * .6); d.position.set(p.x, p.y - .02, p.z); d.rotation.set(0, r() * Math.PI, 0); d.scale.set(s, s * (.8 + r() * .5), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    c.set(color); c.getHSL(hsl); c.setHSL(hsl.h + (r() - .5) * .04, hsl.s, clamp(hsl.l * (.85 + r() * .3))); m.setColorAt(i, c);
  });
  m.instanceColor.needsUpdate = true; m.castShadow = false; m.receiveShadow = true; return m;
}

/**
 * Reed clumps for river banks and shallows (1.8.0): tall leaf blades (foliage atlas, grass cell) plus cattail
 * stalks with brown seed heads. list: [{ x, y, z, s? }] (y = ground or water level). Returns a Group.
 */
export function createReeds(materials, list, { name = 'reeds', seed = SEED, cattails = .6 } = {}) {
  const r = mulberry(seed + 61), group = new THREE.Group(); group.name = name;
  // blades: 6 tall, narrow crossed cards leaning a little outward
  const pos = [], nor = [], uv = [], col = [], idx = [];
  for (let q = 0; q < 6; q++) {
    const a = q / 6 * Math.PI + (q % 2) * .3, lean = .16, b = q * 4, dx = Math.cos(a) * .24, dz = Math.sin(a) * .24, h = 1.45 + (q % 3) * .25;
    for (const [u, t] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      pos.push(dx * (u * 2 - 1) + Math.cos(a + 1.57) * lean * t, t * h, dz * (u * 2 - 1) + Math.sin(a + 1.57) * lean * t);
      nor.push(0, 1, 0); uv.push(.5 + (.18 + u * .32) * .5 / .5 * .5, .5 + (1 - t) * .5); const k = .4 + .6 * t; col.push(k, k, k);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setIndex(idx);
  // cattails: thin green stalks with brown velvety heads and a fine spike on top
  const parts = [], GREEN = new THREE.Color(0x5f7a3c), BROWN = new THREE.Color(0x5a3620), TIP = new THREE.Color(0x8a7a5a);
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1, ox = Math.cos(a) * .12, oz = Math.sin(a) * .12, h = 1.55 + k * .22, tilt = .05 + k * .03;
    const m = new THREE.Matrix4().makeRotationZ(tilt * Math.cos(a)).multiply(new THREE.Matrix4().makeRotationX(tilt * Math.sin(a)));
    const add = (g, c) => { g.applyMatrix4(m); g.translate(ox, 0, oz); parts.push(paint(g, c)); };
    add(new THREE.CylinderGeometry(.007, .01, h, 4, 1, true).translate(0, h / 2, 0), GREEN);
    add(new THREE.CylinderGeometry(.026, .026, .2, 7).translate(0, h + .1, 0), BROWN);
    add(new THREE.CylinderGeometry(.002, .006, .14, 3, 1, true).translate(0, h + .27, 0), TIP);
  }
  const cg = mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; }), false);
  const blades = new THREE.InstancedMesh(bg, materials.M_foliage, list.length); blades.name = `${name}_blades`;
  const withTails = list.filter(() => r() < cattails);
  const tails = new THREE.InstancedMesh(cg, variant(materials.M_canopy, { vertexColors: true, roughness: .75 }), Math.max(1, withTails.length)); tails.name = `${name}_cattails`; tails.count = withTails.length;
  const d = new THREE.Object3D(), c = new THREE.Color(), hsl = {};
  list.forEach((p, i) => { const s = (p.s ?? 1) * (.75 + r() * .5); d.position.set(p.x, p.y, p.z); d.rotation.set(0, r() * 6.28, 0); d.scale.set(s, s * (.85 + r() * .3), s); d.updateMatrix(); blades.setMatrixAt(i, d.matrix);
    c.set(0x6f8a4a); c.getHSL(hsl); c.setHSL(hsl.h + (r() - .5) * .05, hsl.s, clamp(hsl.l * (.85 + r() * .35))); blades.setColorAt(i, c); });
  withTails.forEach((p, i) => { const s = (p.s ?? 1) * (.8 + r() * .4); d.position.set(p.x, p.y, p.z); d.rotation.set(0, r() * 6.28, 0); d.scale.set(s, s, s); d.updateMatrix(); tails.setMatrixAt(i, d.matrix); });
  blades.instanceColor.needsUpdate = true; blades.castShadow = true; blades.receiveShadow = true; tails.castShadow = true; tails.receiveShadow = true;
  group.add(blades, tails); return group;
}

/**
 * Broad-leaf riverside plants (taro / elephant-ear, common along Bhutanese streams) (1.8.0): 4–6 cupped,
 * heart-shaped leaves on long stalks; midrib and veins lighter, edges darker (vertex colour). list: [{ x, y, z, s? }]
 */
export function createBroadLeaves(materials, list, { name = 'broad_leaves', seed = SEED } = {}) {
  const r = mulberry(seed + 71), parts = [];
  const leafShape = new THREE.Shape(); { const P = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, x = Math.sin(t) * .3 * (1 - .15 * Math.cos(t)), y = .3 - Math.cos(t) * .32 - .1 * Math.pow(Math.max(0, Math.cos(t)), 6); P.push(new THREE.Vector2(x, y)); }
    leafShape.setFromPoints(P); }
  const GREEN = new THREE.Color(0x4e6e34), LIGHT = new THREE.Color(0x8aa65a), EDGE = new THREE.Color(0x33502a), c = new THREE.Color();
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + r() * .5, h = .55 + r() * .45, out = .18 + r() * .12, tilt = .5 + r() * .35;
    const leaf = new THREE.ShapeGeometry(leafShape, 6), p = leaf.attributes.position, colA = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {   // cup the blade along its midrib and droop the tip; colour veins and edges
      const x = p.getX(i), y = p.getY(i); p.setZ(i, x * x * 1.1 + Math.max(0, y - .2) ** 2 * .35);
      const mid = sstep(.03, 0, Math.abs(x)), vein = sstep(.012, 0, Math.abs(Math.sin((y + Math.abs(x) * 1.4) * 22))) * .4, edge = sstep(.2, .3, Math.hypot(x, y - .15));
      c.copy(GREEN).lerp(LIGHT, Math.max(mid, vein) * .7).lerp(EDGE, edge * .5); colA.set([c.r, c.g, c.b], i * 3);
    }
    leaf.setAttribute('color', new THREE.BufferAttribute(colA, 3)); leaf.computeVertexNormals();
    leaf.rotateX(-Math.PI / 2 + tilt); leaf.rotateY(a); leaf.translate(Math.sin(a) * out, h, Math.cos(a) * out);
    const stalk = new THREE.CylinderGeometry(.012, .02, h, 5, 1, true);
    const sc = new Float32Array(stalk.attributes.position.count * 3); for (let i = 0; i < sc.length; i += 3) sc.set([LIGHT.r * .9, LIGHT.g * .9, LIGHT.b * .8], i);
    stalk.setAttribute('color', new THREE.BufferAttribute(sc, 3)); stalk.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), Math.atan2(out, h) * .9)); stalk.translate(Math.sin(a) * out / 2, h / 2, Math.cos(a) * out / 2);
    for (const g of [leaf, stalk]) { g.deleteAttribute('uv'); parts.push(g.index ? g.toNonIndexed() : g); }
  }
  const geo = mergeGeometries(parts, false);
  const m = new THREE.InstancedMesh(geo, variant(materials.M_canopy, { vertexColors: true, roughness: .42, side: THREE.DoubleSide }), list.length); m.name = name;
  const d = new THREE.Object3D(), hsl = {};
  list.forEach((p, i) => { const s = (p.s ?? 1) * (.75 + r() * .6); d.position.set(p.x, p.y, p.z); d.rotation.set(0, r() * 6.28, 0); d.scale.set(s, s, s); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    c.set(0xffffff); c.getHSL(hsl); c.setHSL(.25 + (r() - .5) * .06, .15, .85 + r() * .15); m.setColorAt(i, c); });
  m.instanceColor.needsUpdate = true; m.castShadow = true; m.receiveShadow = true; return m;
}

const _rockCache = new Map();
/** Boulder shapes: noise-displaced, flat-bottomed, moss on the up-facing parts, darker wet base. */
export function rockGeometry(shape = 0) {
  if (_rockCache.has(shape)) return _rockCache.get(shape);
  const N = createNoise(SEED + 31 + shape * 17), sq = [[1.15, .72, .95], [1, .9, 1.05], [1.35, .55, .9]][shape % 3];
  let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n3 = (x, y) => N.fbm(x, y, 4);
    const k = 1 + (n3(v.x * 1.3 + 4, v.y * 1.3) + n3(v.y * 1.3, v.z * 1.3 + 9) + n3(v.z * 1.3 + 2, v.x * 1.3)) * .32
      + Math.max(0, N.noise(v.x * 3 + 7, v.z * 3)) * .08;
    v.multiplyScalar(k); v.set(v.x * sq[0], v.y * sq[1], v.z * sq[2]);
    if (v.y < -.25) v.y = -.25 + (v.y + .25) * .25;                                    // settled, flat-ish bottom
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const nrm = g.attributes.normal, col = [], MOSS = new THREE.Color(0x56643f), WET = new THREE.Color(0x5a554d), BASE = new THREE.Color(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const ny = nrm.getY(i), y = p.getY(i), moss = sstep(.55, .85, ny) * (.55 + .45 * clamp(N.fbm(p.getX(i) * 2, p.getZ(i) * 2, 3) + .5));
    c.copy(BASE).lerp(MOSS, moss * .8).lerp(WET, sstep(-.05, -.25, y) * .7); col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g = metricUV(g, { scale: 1 });   // non-indexed, box-projected UVs (normals and colours carried over)
  _rockCache.set(shape, g); return g;
}
/** Instanced boulders. list: [{ x, y, z, size, yaw?, tilt? }] — y is the ground; rocks sink ~25 % in. */
export function createRocks(materials, list, { name = 'rocks', castShadow = true, seed = SEED } = {}) {
  const group = new THREE.Group(); group.name = name; const r = mulberry(seed + 41), d = new THREE.Object3D(), by = [[], [], []];
  list.forEach(t => by[Math.floor(r() * 3)].push(t));
  by.forEach((items, s) => {
    if (!items.length) return;
    const m = new THREE.InstancedMesh(rockGeometry(s), materials.M_rock, items.length); m.name = `${name}_${s}`;
    items.forEach((t, i) => { const k = t.size; d.position.set(t.x, t.y + k * .12, t.z); d.rotation.set((r() - .5) * (t.tilt ?? .3), t.yaw ?? r() * 6.28, (r() - .5) * (t.tilt ?? .3)); d.scale.set(k * (.85 + r() * .3), k * (.8 + r() * .4), k * (.85 + r() * .3)); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = castShadow; m.receiveShadow = true; group.add(m);
  });
  return group;
}

/**
 * River / reservoir / pool surface over a ground function (1.8.0 water shader):
 *  · choppy ripples at three scales (the `chop` normal) moving along the local current
 *  · clear shallows (the bed shows through) with caustic shimmer, turning dark and opaque with depth,
 *    and mirror-like at grazing angles (Fresnel)
 *  · foam that drifts downstream: at the shoreline, on shallow riffles, and in wakes behind obstacles
 *  · sun sparkle from a near-mirror physical surface on the wavy normal
 * Triangles fully under the ground are dropped. groundAt(x,z) in metres. flow: [dx,dz] or flowAt(x,z) → [dx,dz].
 * speed: current in m/s-ish · chop: ripple strength · clarity: 0 opaque … 1 clear shallows.
 * mesh.userData.setFlow(k) scales speed and chop (e.g. released water).
 */
const _waterMats = new Set();
let _chopTex = null;
const WATER_GLSL = /* glsl */`
uniform float uTime; uniform float uSpeed; uniform float uChop; uniform float uClarity;
uniform sampler2D tReflect; uniform float uReflOn;
varying vec4 vW; varying vec3 vWPos; varying vec4 vRefl;
float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(wHash(i), wHash(i + vec2(1., 0.)), u.x), mix(wHash(i + vec2(0., 1.)), wHash(i + vec2(1., 1.)), u.x), u.y); }
float wCaustic(vec2 p, float t){ float c = 0.; vec2 q = p;
  for (int i = 0; i < 3; i++) { q += vec2(sin(q.y * 1.7 + t * .9), sin(q.x * 1.4 - t * .7)) * .55; c += 1. / (1. + 14. * abs(sin(q.x * 2.2) * sin(q.y * 2.4))); }
  return pow(c / 3., 3.); }`;
export function createWaterSurface(materials, { x0, x1, z0, z1, level, groundAt, res = 1, deep = 2.2, name = 'water', seed = SEED,
  flow = [0, 1], flowAt = null, speed = .6, chop = 1, clarity = 1, obstacles = [] } = {}) {
  const N = createNoise(seed + 77), nx = Math.max(2, Math.round((x1 - x0) / res)), nz = Math.max(2, Math.round((z1 - z0) / res));
  const pos = [], uv = [], col = [], wd = [], idx = [], dry = [];
  const DEEP = new THREE.Color(TOKENS.riverWater).multiplyScalar(.5), SHAL = new THREE.Color(0x4f6f63), c = new THREE.Color();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, h = level - groundAt(x, z), f = flowAt ? flowAt(x, z) : flow, fl = Math.hypot(f[0], f[1]) || 1;
    pos.push(x, level, z); uv.push(x, z); dry.push(h < -.04);
    const depth = clamp(h / deep), shore = h > -.05 ? sstep(.13, .0, h) * (.35 + .65 * clamp(.5 + N.fbm(x * .3, z * .3, 2))) : 0;
    c.copy(SHAL).lerp(DEEP, sstep(0, 1, depth)); col.push(c.r, c.g, c.b);
    wd.push(depth, shore, f[0] / fl, f[1] / fl);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, dd = cc + 1;
    if (!(dry[a] && dry[cc] && dry[b])) idx.push(a, cc, b);
    if (!(dry[b] && dry[cc] && dry[dd])) idx.push(b, cc, dd);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('wdata', new THREE.Float32BufferAttribute(wd, 4)); g.setIndex(idx); g.computeVertexNormals();
  if (!_chopTex) { _chopTex = toTex(recipe('chop', 512).normal, { tile: [1, 1], aniso: 8 }); }
  const U = { uTime: { value: 0 }, uSpeed: { value: speed }, uChop: { value: chop }, uClarity: { value: clarity },
    tReflect: { value: null }, uTexMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 } };
  // one specular layer only (no clearcoat): two stacked glossy layers blew the sun glitter out under bloom
  const mat = new THREE.MeshPhysicalMaterial({ name: 'M_water', color: 0xffffff, vertexColors: true, normalMap: _chopTex, roughness: .06, metalness: 0, ior: 1.333,
    specularIntensity: .8, envMapIntensity: 1.15, transparent: true, depthWrite: true, side: THREE.FrontSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 wdata; uniform mat4 uTexMat; varying vec4 vW; varying vec3 vWPos; varying vec4 vRefl;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW = wdata; vWPos = (modelMatrix * vec4(transformed, 1.)).xyz; vRefl = uTexMat * vec4(vWPos, 1.);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WATER_GLSL)
      .replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
{ vec2 fl = normalize(vW.zw + 1e-5), wp = vWPos.xz, side = vec2(-fl.y, fl.x); float tt = uTime * uSpeed, dep = vW.x;
  // three ripple scales riding the current (the small ones faster), choppier over shallow riffles
  vec3 n1 = texture2D(normalMap, (wp - fl * tt * .35) / 6.5).xyz * 2. - 1.;
  vec3 n2 = texture2D(normalMap, (wp - fl * tt * .62 + side * tt * .05) / 2.1 + .37).xyz * 2. - 1.;
  vec3 n3 = texture2D(normalMap, (wp - fl * tt * 1.15) / .72 + .71).xyz * 2. - 1.;
  float k = mix(2.1, 1.05, smoothstep(0., .8, dep)) * uChop;
  vec2 gr = (n1.xy * .5 + n2.xy * .45 + n3.xy * .3) * k;
  vec3 wn = normalize(vec3(gr.x, 1., gr.y));
  normal = normalize((viewMatrix * vec4(wn, 0.)).xyz);
  #ifdef USE_CLEARCOAT
    clearcoatNormal = normal;
  #endif
  // foam: shoreline + obstacle wakes (vertex), shallow riffles, torn into drifting flecks
  float fn = wNoise(wp * 1.25 - fl * tt * .9) * .55 + wNoise(wp * 4.3 - fl * tt * 1.7) * .3 + wNoise(wp * 11. - fl * tt * 2.6) * .15;
  float src = clamp(vW.y + (1. - smoothstep(0., .35, dep)) * .45 * uChop, 0., 1.);
  float foam = smoothstep(.62, .82, fn + src * .38) * smoothstep(.05, .35, src);
  // caustic light dancing on the bed, seen through the shallows
  float ca = wCaustic(wp * .85 - fl * tt * .3, uTime * .8) * (1. - smoothstep(0., .7, dep));
  diffuseColor.rgb += vec3(.85, .95, .9) * ca * .22 * uClarity;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.9, .93, .92), foam * .92);
  roughnessFactor = mix(roughnessFactor, .75, foam);
  // clear where shallow, opaque where deep, mirror-like at grazing angles
  vec3 vd = normalize(cameraPosition - vWPos); float fres = pow(1. - clamp(dot(vd, wn), 0., 1.), 5.);
  float a = mix(.52, .96, smoothstep(0., 1., dep)); a = mix(a, 1., clamp(fres * 1.4, 0., 1.) * .9); a = max(a, foam);
  diffuseColor.a = mix(1., a, uClarity);
  // planar reflection of the banks, trees and buildings, broken up by the ripples (enableWaterReflections)
  if (uReflOn > .5) {
    vec4 rc = vRefl; rc.xy += gr * .13 * rc.w;                                    // ripples break the mirror image apart
    vec3 refl = min(texture2DProj(tReflect, rc).rgb, vec3(2.2));
    float F = .03 + .97 * fres, crest = clamp(.5 + (gr.x + gr.y) * .9, 0., 1.);   // facets tilted away from the viewer reflect less
    totalEmissiveRadiance += refl * (F * .8 + .03) * mix(.55, 1.25, crest) * (1. - foam);
    diffuseColor.rgb *= 1. - F * .6;
  }
}`);
  };
  mat.customProgramCacheKey = () => 'gmc_water_v2';
  mat.userData.gmc = true; mat.userData.U = U; _waterMats.add(mat);
  const m = new THREE.Mesh(g, mat); m.name = name; m.receiveShadow = true; m.castShadow = false; m.renderOrder = 1;
  m.userData.flowAt = flowAt ?? (() => flow);
  m.userData.setFlow = k => { U.uSpeed.value = speed * k; U.uChop.value = chop * Math.min(k, 2.2); };
  if (obstacles.length) addWaterObstacles(m, obstacles);
  return m;
}

/**
 * Planar reflections for every kit water surface in the stage (1.8.0). One mirror per water level
 * (rivers and pools at different heights get their own). The scene is rendered once more from the
 * mirrored camera at `scale` × screen size; the water samples it, distorted by its ripples.
 * Water meshes move to layer 1 (the main camera sees them, the mirror camera doesn't, so no feedback).
 * Switched off automatically when the stage drops to low quality.
 */
const _mirrors = new Set();
export function enableWaterReflections(stage, { scale = .5 } = {}) {
  const waters = []; stage.content.traverse(o => { if (o.isMesh && o.material?.name === 'M_water' && o.material.userData?.U) waters.push(o); });
  const byLevel = new Map();
  for (const w of waters) {
    w.geometry.computeBoundingBox(); const bb = w.geometry.boundingBox.clone().applyMatrix4(w.matrixWorld), lv = Math.round(bb.max.y * 4) / 4;
    if (!byLevel.has(lv)) byLevel.set(lv, { box: bb.clone(), list: [], y: bb.max.y }); const e = byLevel.get(lv); e.box.union(bb); e.list.push(w);
  }
  const W = stage.renderer.domElement.width, H = stage.renderer.domElement.height;
  for (const [, { box, list, y: lv }] of byLevel) {
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const mirror = new Reflector(new THREE.PlaneGeometry(Math.max(size.x, 1), Math.max(size.z, 1)), { textureWidth: Math.round(W * scale), textureHeight: Math.round(H * scale), clipBias: .02, multisample: 0 });
    const texMat = mirror.material.uniforms.textureMatrix.value, rt = mirror.getRenderTarget();
    mirror.material = new THREE.MeshBasicMaterial({ name: '__mirror', colorWrite: false, depthWrite: false });   // draws nothing; its onBeforeRender renders the mirror view
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(ctr.x, lv - .002, ctr.z); mirror.name = '__water_mirror'; mirror.renderOrder = -10;
    stage.scene.add(mirror); _mirrors.add({ mirror, list });
    for (const w of list) { const U = w.material.userData.U; U.tReflect.value = rt.texture; U.uTexMat.value = texMat; U.uReflOn.value = 1; w.layers.set(1); w.material.envMapIntensity = .5; }
  }
  stage.camera.layers.enable(1);
  return [..._mirrors];
}
/** Turn the water mirrors on/off (the stage calls this from setQuality). */
export function setWaterReflections(on) { for (const { mirror, list } of _mirrors) { mirror.visible = on; for (const w of list) { w.material.userData.U.uReflOn.value = on ? 1 : 0; w.material.envMapIntensity = on ? .5 : 1.15; } } }

/** Foam rings around obstacles (boulders, piers) and a wake trailing downstream. list: [{ x, z, r }] */
export function addWaterObstacles(mesh, list) {
  const p = mesh.geometry.attributes.position, w = mesh.geometry.attributes.wdata, flowAt = mesh.userData.flowAt;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let f = w.getY(i);
    for (const o of list) {
      const dx = x - o.x, dz = z - o.z; if (Math.abs(dx) > o.r * 8 || Math.abs(dz) > o.r * 8) continue;
      const fl = flowAt(o.x, o.z), l = Math.hypot(fl[0], fl[1]) || 1, ax = fl[0] / l, az = fl[1] / l;
      const along = dx * ax + dz * az, across = Math.abs(dx * az - dz * ax), ring = sstep(o.r * 1.5 + .4, o.r * .9, Math.hypot(dx, dz));
      const wake = along > 0 ? sstep(o.r * 1.3, o.r * .2, across) * sstep(o.r * 7, 0, along) : 0;
      f = Math.max(f, ring, wake * .85);
    }
    w.setY(i, f);
  }
  w.needsUpdate = true; return mesh;
}

/** Darken ground near a water level (wet banks). Adds a vertex colour; the material needs vertexColors: true. */
export function wetBanks(geometry, level, { band = .7, dark = .6, under = .34 } = {}) {
  const p = geometry.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = 1 - (1 - dark) * sstep(level + band, level - .05, y);
    const sub = sstep(level - .02, level - .45, y), kk = k * (1 - (1 - under / dark) * sub);       // submerged bed: darker, a little green (algae, wet stone)
    col[i * 3] = kk * (.97 - sub * .1); col[i * 3 + 1] = kk; col[i * 3 + 2] = kk * (1.02 - sub * .08);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geometry;
}

/** Drift the water ripple layers (called by the stage every frame; time in seconds). */
export function animateNature(materials, t) {
  const w = materials.M_water; if (!w) return;
  w.normalMap.offset.set(t * .006, -t * .03); w.clearcoatNormalMap.offset.set(-t * .011, -t * .055);
  for (const m of _waterMats) m.userData.U.uTime.value = t;   // 1.8.0 water shader
}

// ═════════════════════════════════════════════════════ 6. UV IN METRES ═════
/**
 * Replace UVs with box-projected UVs in metres (non-indexed result).
 * along: 'x' | 'y' | 'z' — the axis that should run along U when possible
 * (use the member's long axis for timber, so the grain follows it).
 */
export function metricUV(geometry, { along = null, scale = 1 } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const ax = { x: 0, y: 1, z: 2 };
  for (let t = 0; t < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
    n.subVectors(b, a).cross(c.clone().sub(a)); const an = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    const dom = an[0] >= an[1] && an[0] >= an[2] ? 0 : an[1] >= an[2] ? 1 : 2;
    let [iu, iv] = dom === 0 ? [2, 1] : dom === 1 ? [0, 2] : [0, 1];
    if (along && ax[along] !== dom && ax[along] === iv) [iu, iv] = [iv, iu];
    for (let k = 0; k < 3; k++) { const p = [pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k)]; uv[(t + k) * 2] = p[iu] * scale; uv[(t + k) * 2 + 1] = p[iv] * scale; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
/** Scale existing 0..1 UVs to metres (cylinders, lathes): u × uMetres, v × vMetres. */
export function scaleUV(geometry, uMetres, vMetres) {
  const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uMetres, uv.getY(i) * vMetres);
  uv.needsUpdate = true; return geometry;
}

// ════════════════════════════════════════════════ 7. ENVIRONMENT + RIG ═════
/** design.md §4.1 — the GMC PMREM environment (skill studio recipe, re-tinted). */
export function gmcEnvironment(pmrem, mood = 'dusk') {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: { dusk: 0x161a26, golden: 0x3a3f52 }[mood] ?? 0x8a8f96, side: THREE.BackSide })));
  const panel = (w, h, i, pos, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); s.add(m); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  if (mood === 'dusk') {
    panel(14, 4, 4.0, V(-12, 3, 4), 0xffb978); panel(16, 6, 1.2, V(0, 14, 0), 0x3a4a6e);
    panel(1.2, 14, 2.0, V(11, 2, -6), 0x7cc8f2); panel(16, 1, 1.0, V(0, -7, 8), 0xffc450);
  } else if (mood === 'golden') {
    panel(18, 5, 4.6, V(-12, 2, 3), 0xffc98a);   // low golden sun band (WSW)
    panel(18, 8, 1.7, V(0, 14, 0), 0x8fa9d4);    // blue sky dome
    panel(1.2, 14, 1.6, V(11, 2, -6), 0x9cc4ea); // cool rim
    panel(16, 1, 1.2, V(0, -7, 8), 0xd29a5e);    // warm ground bounce
  } else {
    panel(18, 10, 3.0, V(-6, 12, 6), 0xfff3dc); panel(18, 10, 1.6, V(6, 12, -6), 0xdfe6ee);
    panel(1.2, 14, 2.0, V(11, 2, -6), 0xffffff); panel(16, 1, 1.2, V(0, -7, 8), 0xa9b865);
  }
  const tex = pmrem.fromScene(s, 0.02).texture;
  s.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}

/** Key DirectionalLight (shadow caster) + HemisphereLight, driven by a mood. */
export function createRig(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(key, key.target, hemi);
  const center = new THREE.Vector3(); let radius = 10, mood = 'dusk';
  function place() {
    const m = MOODS[mood], d = sunDirection(m.key.azimuth, m.key.elevation);
    key.target.position.copy(center); key.position.copy(center).addScaledVector(d, radius * 3);
    const cam = key.shadow.camera, r = radius * 1.1;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = radius * .1; cam.far = radius * 6; cam.updateProjectionMatrix();
  }
  return {
    key, hemi,
    setMood(name) {
      mood = name; const m = MOODS[name];
      key.color.set(m.key.color); key.intensity = m.key.intensity;
      hemi.color.set(m.hemi.sky); hemi.groundColor.set(m.hemi.ground); hemi.intensity = m.hemi.intensity; place();
    },
    /** Fit the shadow frustum to a Box3 (+10 %). mapSize 4096 for the map model. */
    fit(box, mapSize = 2048) {
      box.getCenter(center); radius = Math.max(box.getSize(new THREE.Vector3()).length() * .5, .5);
      if (key.shadow.mapSize.x !== mapSize) { key.shadow.mapSize.set(mapSize, mapSize); key.shadow.map?.dispose(); key.shadow.map = null; }
      place();
    },
  };
}

/** design.md §4.4 — the void: night→umber gradient, radial lift, mist band. Authored ~2× bright for ACES. */
export function createBackground(mood = 'dusk', w = 1024, h = 1024) {
  const m = MOODS[mood].background, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), k = mood === 'dusk' ? 2 : 1;
  const hex = (v, kk = 1) => { const [r, gg, b] = rgb(v).map(x => Math.min(255, Math.round(x * kk))); return `rgb(${r},${gg},${b})`; };
  const lin = g.createLinearGradient(0, 0, 0, h); lin.addColorStop(0, hex(m.top, k)); lin.addColorStop(1, hex(m.bottom, k));
  g.fillStyle = lin; g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(w * .5, h * .55, 0, w * .5, h * .55, w * .6);
  rad.addColorStop(0, 'rgba(255,255,255,0.06)'); rad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rad; g.fillRect(0, 0, w, h);
  const mist = g.createLinearGradient(0, h * .3, 0, h * .5); const mc = rgb(m.mist).join(',');
  mist.addColorStop(0, `rgba(${mc},0)`); mist.addColorStop(.5, `rgba(${mc},0.06)`); mist.addColorStop(1, `rgba(${mc},0)`);
  g.fillStyle = mist; g.fillRect(0, h * .3, w, h * .2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Apply a mood to materials: window glow colour + environment intensity
 * (three r160 has no scene.environmentIntensity, so it is set per material).
 * Pass the library and/or any extra materials found in the scene.
 */
export function applyMoodToMaterials(materials, mood, extra = []) {
  const m = MOODS[mood], all = new Set([...Object.values(materials), ...extra]);
  for (const mt of all) {
    if (mt.name === 'M_window_glow') { mt.color.set(m.glow.color).multiplyScalar(m.glow.scale); continue; }
    if (mt.envMapIntensity === undefined) continue;
    if (mt.userData.envBase === undefined) mt.userData.envBase = mt.envMapIntensity;
    mt.envMapIntensity = mt.userData.envBase * m.envIntensity;
  }
}

// ═══════════════════════════════════════════════ 8. PRESENTATION PIECES ════
/**
 * Terrain skirt: vertical strata wall under a closed outline.
 * outline: Vector2[] in (x, z) metres. heightAt(x,z) gives the top edge.
 * bottomY defaults to (lowest top − depth). U = perimeter metres, V = 0 top → 1 bottom.
 */
export function createSkirt(outline, { depth, heightAt = () => 0, bottomY = null, material }) {
  const n = outline.length, tops = outline.map(p => heightAt(p.x, p.y));
  const bot = bottomY ?? Math.min(...tops) - depth;
  const pos = [], uv = [], idx = []; let len = 0;
  for (let i = 0; i <= n; i++) {
    const p = outline[i % n], t = tops[i % n];
    if (i > 0) len += p.distanceTo(outline[i - 1]);
    pos.push(p.x, t, p.y, p.x, bot, p.y); uv.push(len, 0, len, 1);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  // make faces point outward
  const c = outline.reduce((s, p) => s.add(p), new THREE.Vector2()).multiplyScalar(1 / n);
  const p0 = outline[0], p1 = outline[1], edge = new THREE.Vector3(p1.x - p0.x, 0, p1.y - p0.y), face = new THREE.Vector3().crossVectors(new THREE.Vector3(0, -1, 0), edge);
  const out = new THREE.Vector3((p0.x + p1.x) / 2 - c.x, 0, (p0.y + p1.y) / 2 - c.y);
  if (face.dot(out) < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; g.setIndex(idx); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.name = 'skirt'; m.receiveShadow = true; m.castShadow = true; return m;
}

/** Rounded-rectangle outline in (x,z), centred on the origin. */
export function roundedRect(w, d, r, seg = 12) {
  const pts = [], hw = w / 2, hd = d / 2, rr = Math.min(r, hw, hd);
  const corners = [[hw - rr, hd - rr, 0], [-hw + rr, hd - rr, 90], [-hw + rr, -hd + rr, 180], [hw - rr, -hd + rr, 270]];
  for (const [cx, cz, a0] of corners) for (let i = 0; i <= seg; i++) { const a = (a0 + 90 * i / seg) * DEG; pts.push(new THREE.Vector2(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr)); }
  return pts;
}

/**
 * Floating-diorama plinth (design.md §6.3). Top surface at y = 0.
 * width/depth in metres; corner radius and skirt depth as fractions of the shorter side.
 */
export function createPlinth(materials, { width, depth = width, corner = .12, skirt = .10, top = 'M_terrain' } = {}) {
  const side = Math.min(width, depth), outline = roundedRect(width, depth, side * corner);
  const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, -p.y)));
  const topGeo = new THREE.ShapeGeometry(shape, 12); topGeo.rotateX(-Math.PI / 2);   // (x, y) → (x, 0, -y); UVs stay in metres
  const topMesh = new THREE.Mesh(topGeo, materials[top]); topMesh.name = 'plinth_top'; topMesh.receiveShadow = true;
  const group = new THREE.Group(); group.name = 'L_plinth';
  group.add(topMesh, createSkirt(outline, { depth: side * skirt, material: materials.M_skirt }));
  group.userData = { width, depth, skirtDepth: side * skirt };
  return group;
}

/** Map anchor ring + optional leader line up to a floating hero (design.md §5.3 / §6.3). */
export function createAnchor(materials, { radius = 60, width = 12, leader = 0, lift = 2 } = {}) {
  const g = new THREE.Group(); g.name = 'L_anchor';
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + width, 96), materials.M_anchor);
  ring.rotation.x = -Math.PI / 2; ring.position.y = lift; ring.name = 'anchor_ring'; g.add(ring);
  if (leader > 0) {
    const mat = materials.M_anchor.clone(); mat.name = 'M_anchor'; mat.opacity = .6;
    mat.alphaMap = toTex(recipe('fade', 128).map, {}); mat.alphaMap.wrapT = THREE.ClampToEdgeWrapping;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(radius * .02, radius * .02, leader, 8, 1, true), mat);
    line.position.y = lift + leader / 2; line.name = 'anchor_leader'; g.add(line);
  }
  return g;
}

/** Soft ghost shadow under a floating hero: umber at 18 %, size = 1.2 × footprint. */
export function createGhostShadow(footprintW, footprintD = footprintW) {
  const tex = toTex(recipe('radial', 128).map, {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(footprintW * 1.2, footprintD * 1.2),
    new THREE.MeshBasicMaterial({ name: 'M_anchor', color: TOKENS.umber, alphaMap: tex, transparent: true, opacity: .18, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .5; m.name = 'ghost_shadow'; m.renderOrder = 1; return m;
}

// ═══════════════════════════════════════════════ 9. VALIDATE + HAND-OFF ═════
export const BUDGETS = Object.freeze({ map: 1_200_000, obj: 150_000, env: 30_000 });
const NAME_RE = /^gmc_(map|obj|env)_[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function countTriangles(root) {
  let n = 0;
  root.traverse(o => {
    if (!o.isMesh) return; const g = o.geometry, c = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    n += c * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}

/**
 * Check a model against design.md §8–§9. Returns { ok, errors, warnings, stats }.
 * @param {THREE.Object3D} root  the model root (not the scene)
 */
export function validateModel(root, { budget = null } = {}) {
  const errors = [], warnings = [], mats = new Set(), unknown = new Set();
  const m = NAME_RE.exec(root.name || '');
  if (!m) errors.push(`Root name "${root.name}" must match gmc_<map|obj|env>_<id-name> (lowercase, hyphens).`);
  const cat = m ? m[1] : 'obj';
  if (!root.position.equals(new THREE.Vector3()) || !root.quaternion.equals(new THREE.Quaternion()) || !root.scale.equals(new THREE.Vector3(1, 1, 1)))
    errors.push('Root has a transform. Apply transforms before export (design.md §9.5).');
  for (const c of root.children) if (!c.name.startsWith('L_')) warnings.push(`Top-level child "${c.name || c.type}" should be a layer named L_*.`);
  root.traverse(o => {
    if (o.isLight || o.isCamera) errors.push(`"${o.name || o.type}" is a ${o.isLight ? 'light' : 'camera'}. No lights or cameras inside model files.`);
    if (!o.isMesh) return;
    for (const mt of [].concat(o.material)) { mats.add(mt.name); if (!MATERIAL_NAMES.includes(mt.name)) unknown.add(mt.name || '(unnamed)'); }
  });
  if (unknown.size) errors.push(`Materials not in the library: ${[...unknown].join(', ')}. Add to design.md §3.2 first.`);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), tris = countTriangles(root);
  // pivot check ignores the plinth skirt (plinth pivot = centre of its top surface, §8.3)
  const ground = new THREE.Box3(); root.children.forEach(c => { if (c.name !== 'L_plinth') ground.expandByObject(c); });
  if (ground.isEmpty()) ground.copy(box);
  const lim = budget ?? BUDGETS[cat];
  if (tris > lim) errors.push(`${tris.toLocaleString()} triangles > budget ${lim.toLocaleString()} (design.md §8.4).`);
  const big = Math.max(size.x, size.y, size.z);
  if (cat !== 'map' && big > 20000) warnings.push(`Largest dimension ${Math.round(big)} m: are units metres?`);
  if (big < .05) warnings.push(`Largest dimension ${big.toFixed(3)} m: are units metres?`);
  if (cat !== 'map' && Math.abs(ground.min.y) > Math.max(.05, size.y * .02)) warnings.push(`Lowest point is at y = ${ground.min.y.toFixed(2)} m. Pivot should be at ground contact (design.md §8.3).`);
  return { ok: errors.length === 0, errors, warnings, stats: { category: cat, triangles: tris, size: size.toArray().map(v => +v.toFixed(2)), materials: [...mats].sort() } };
}

/** design.md §9.4 metadata sidecar, pre-filled from the model. */
export function createMeta(root, { version = 1, author = 'A', status = 'review', sourceRefs = [], notes = '', heroYaw = 0, lods = {} } = {}) {
  const r = validateModel(root), cat = { map: 'map', obj: 'object', env: 'environment' }[r.stats.category];
  return { id: root.name, version, category: cat, author, status, anchorUTM46N: [0, 0], anchorMapXZ: [0, 0],
    footprintM: [r.stats.size[0], r.stats.size[2]], heightM: r.stats.size[1], heroScale: null, heroYaw,
    tris: { lod0: r.stats.triangles, lod1: lods.lod1 ?? 0, lod2: lods.lod2 ?? 0 }, materials: r.stats.materials, sourceRefs, notes, kitVersion: KIT_VERSION };
}

function download(blob, filename) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
/** Export a model root to GLB (design.md §9.5) and trigger a download. Returns the ArrayBuffer. */
export async function exportGLB(root, filename = `${root.name || 'model'}.glb`) {
  const buf = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
  download(new Blob([buf], { type: 'model/gltf-binary' }), filename); return buf;
}
export function downloadJSON(obj, filename) { download(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), filename); }

// ══════════════════════════════════════════════════════════════ 10. STAGE ═══
/**
 * The shared review stage: renderer, post, rig, environment, background,
 * shadow catcher, orbit controls (zoom to cursor), DUSK/DAY, MATERIAL/CLAY,
 * the five standard views (design.md §8.5) and FPS auto-downgrade.
 * Every model preview should be built on this, so every review looks the same.
 */
export function createStage({ container = document.body, mood = 'dusk', quality = 'high' } = {}) {
  const W = () => container.clientWidth || innerWidth, H = () => container.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1)); renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const persp = new THREE.PerspectiveCamera(30, W() / H(), .1, 20000);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50000);
  let camera = persp;
  const controls = new OrbitControls(persp, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, zoomToCursor: true, screenSpacePanning: true, maxPolarAngle: Math.PI * .495 });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envs = { dusk: gmcEnvironment(pmrem, 'dusk'), golden: gmcEnvironment(pmrem, 'golden'), day: gmcEnvironment(pmrem, 'day') };
  const backgrounds = { dusk: createBackground('dusk'), golden: createBackground('golden'), day: createBackground('day') };
  const rig = createRig(scene), materials = createMaterials({ renderer, quality });
  const content = new THREE.Group(); content.name = '__content'; scene.add(content);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: TOKENS.umber, opacity: .38 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; catcher.name = '__shadowCatcher'; scene.add(catcher);

  const rt = new THREE.WebGLRenderTarget(W(), H(), { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera), bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), .3, .5, .9);
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
  // every render (the stage loop or a model's own loop) advances the nature animation
  { const base = composer.render.bind(composer); composer.render = (...a) => { animateNature(materials, performance.now() / 1000); return base(...a); }; }

  let current = mood, clay = false, lowQ = quality === 'low';
  const bounds = new THREE.Box3(), center = new THREE.Vector3(), sizeV = new THREE.Vector3();
  let radius = 10;

  function setMood(name) {
    current = name; const m = MOODS[name];
    scene.environment = envs[name]; scene.background = backgrounds[name];
    renderer.toneMappingExposure = m.exposure; rig.setMood(name);
    Object.assign(bloom, { strength: m.bloom.strength, radius: m.bloom.radius, threshold: m.bloom.threshold });
    const extra = []; content.traverse(o => { if (o.isMesh) extra.push(...[].concat(o.userData.__mat ?? o.material)); });
    applyMoodToMaterials(materials, name, extra);
  }
  function setClay(on) {
    clay = on;
    content.traverse(o => {
      if (!o.isMesh) return;
      if (on) {
        if (o.userData.__mat === undefined) { o.userData.__mat = o.material; o.userData.__ic = o.instanceColor ?? null; o.userData.__vis = o.visible; }
        const glow = [].concat(o.userData.__mat).some(m => m.name === 'M_window_glow' || m.name === 'M_anchor'), m0 = [].concat(o.userData.__mat)[0];
        if (glow) o.visible = false; else o.material = m0.userData.clay ?? (/roof/.test(m0.name) ? materials.M_clay_roof : materials.M_clay);
        if (o.isInstancedMesh) o.instanceColor = null;            // clay is uniform
      } else if (o.userData.__mat !== undefined) {
        o.material = o.userData.__mat; if (o.isInstancedMesh) o.instanceColor = o.userData.__ic;
        o.visible = o.userData.__vis ?? true; delete o.userData.__mat; delete o.userData.__ic; delete o.userData.__vis;
      }
    });
  }
  function enableShadows(obj) { obj.traverse(o => { if (o.isMesh && !['M_window_glow', 'M_anchor'].includes([].concat(o.material)[0].name)) { o.castShadow = true; o.receiveShadow = true; } }); }

  function measure() {
    bounds.setFromObject(content); if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 5, 5));
    bounds.getCenter(center); bounds.getSize(sizeV); radius = Math.max(sizeV.length() * .5, .5);
    rig.fit(bounds, radius > 2000 ? 4096 : 2048);
    catcher.scale.setScalar(radius * 12); catcher.position.set(center.x, bounds.min.y - .01, center.z);
    for (const c of [persp, ortho]) { c.near = Math.max(.05, radius / 2000); c.far = radius * 60; c.updateProjectionMatrix(); }
  }
  function useCamera(c) { camera = c; renderPass.camera = c; controls.object = c; controls.enableRotate = c === persp; }
  function place(az, el, dist, target = center) {
    const d = sunDirection(az, el); persp.position.copy(target).addScaledVector(d, dist); controls.target.copy(target); persp.lookAt(target);
  }
  /** V1 overview · V2 hero 3/4 · V3 plan (ortho, north up) · V4 eye level · V5 detail. opts: { heroYaw, target:Vector3 } */
  function setView(name = 'V2', { heroYaw = 0, target = null } = {}) {
    measure(); const half = 15 * DEG;
    persp.fov = name === 'V4' ? 40 : 30; persp.updateProjectionMatrix(); useCamera(persp); persp.up.set(0, 1, 0);
    if (name === 'V1') place(160, 45, radius / Math.sin(half) * 1.05);
    else if (name === 'V2') place(215 + heroYaw, 25, radius * 3.6);   // ≈ 70 % of frame height at FOV 30
    else if (name === 'V4') {
      // frame the object, not its plinth; ground = y 0 when a plinth/skirt reaches below it (§8.3)
      const subj = new THREE.Box3(); content.traverse(o => { if (o.isMesh && !o.parent?.name.startsWith('L_plinth') && o.name !== 'skirt') subj.expandByObject(o); });
      if (subj.isEmpty()) subj.copy(bounds);
      const gy = bounds.min.y < 0 ? 0 : bounds.min.y, sc = subj.getCenter(new THREE.Vector3()), ss = subj.getSize(new THREE.Vector3());
      persp.position.set(sc.x, gy + 1.7, subj.max.z + Math.max(ss.y * 1.5, 6));
      controls.target.set(sc.x, gy + Math.min(ss.y * .45, 12), sc.z); persp.lookAt(controls.target);
    } else if (name === 'V5') {
      const t = target ?? new THREE.Vector3(center.x, bounds.min.y + sizeV.y * .7, bounds.max.z - sizeV.z * .15);
      place(215 + heroYaw, 25, radius * 3.6 * .25, t);                // the skill's 25 % close-up
    } else if (name === 'V3') {
      const m = 1.1, aspect = W() / H(), hw = Math.max(sizeV.x, sizeV.z * aspect) * m / 2;
      Object.assign(ortho, { left: -hw, right: hw, top: hw / aspect, bottom: -hw / aspect, zoom: 1 });
      ortho.position.set(center.x, bounds.max.y + radius * 2, center.z); ortho.up.set(0, 0, -1); ortho.lookAt(center.x, center.y, center.z);
      ortho.updateProjectionMatrix(); useCamera(ortho); controls.target.copy(center);
    }
    controls.update();
  }
  function add(obj) { content.add(obj); enableShadows(obj); if (clay) setClay(true); setMood(current); setView('V2'); return obj; }
  function setQuality(q) {
    lowQ = q === 'low'; renderer.setPixelRatio(lowQ ? 1 : Math.min(devicePixelRatio, 2)); bloom.enabled = !lowQ; resize();
  }
  function resize() {
    const w = W(), h = H(); renderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w, h);
    persp.aspect = w / h; persp.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  // loop + FPS
  const clock = new THREE.Clock(); let frames = 0, acc = 0, fps = 60, started = performance.now(), checked = false;
  const listeners = [];
  function render() { controls.update(); composer.render(); }
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta(); frames++; acc += dt;
    if (acc >= .5) { fps = frames / acc; frames = 0; acc = 0; listeners.forEach(f => f({ fps })); }
    if (!checked && performance.now() - started > 3500) { checked = true; if (fps < 34 && !lowQ) setQuality('low'); }
    render();
  });

  setMood(mood); setView('V2');
  return {
    THREE, renderer, scene, controls, rig, materials, content, composer, bloom,
    get camera() { return camera; }, get mood() { return current; }, get clay() { return clay; }, get quality() { return lowQ ? 'low' : 'high'; }, get fps() { return fps; },
    setMood, setClay, setView, setQuality, add, render, measure,
    onStats: f => listeners.push(f),
    validate: (root, o) => validateModel(root, o),
    exportGLB: async root => { const was = clay; if (was) setClay(false); const b = await exportGLB(root); if (was) setClay(true); return b; },
    screenshot(filename = 'preview.png') { render(); renderer.domElement.toBlob(b => download(b, filename)); },
  };
}
