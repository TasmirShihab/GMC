// ─────────────────────────────────────────────────────────────────────────────
// GMC Landmarks · UI director (GSAP)
// Golden only. Each landmark is its model page in an iframe (?embed=1); the shell
// drives its camera (__api.director.cam) and its component mode with GSAP.
//   Idea 1 · descent through the golden cloud sea  (soft cloud fly-throughs between landmarks)
//   Idea 3 · the video's own transition: continuous oblique glides over the map,
//            outlines that draw on, stats that rise in (no cloud wipes)
// ─────────────────────────────────────────────────────────────────────────────
import { createCloudSea } from './clouds.js';
import { createCornerMap } from './corner-map.js';
import { createCloudFlight } from './cloud-flight.js';

const gsap = window.gsap; gsap.registerPlugin(window.Observer, window.CustomEase);
window.CustomEase.create('settle', '.16,1,.3,1'); window.CustomEase.create('cinema', '.76,0,.24,1');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search), INTRO = 1, EMBED = params.get('embed') === 'gmc';   // EMBED: inside the Gelephu story, started by its click
//   // this bundle is locked to idea 1   // two ideas: 1 (cloud sea) and 3 (the video's glide)
const wait = s => new Promise(r => gsap.delayedCall(s, r));
const fail = e => { console.error(e); const er = $('#err'); er.hidden = false; er.textContent = 'UI error: ' + (e.message || e); };

// ── chapters (7 dots, like the reference; 3 are built; user's order: healthcare → temple-dam → airport) ──────────────────────
const M = 'models/objects/';   // iframe URLs resolve against the page, which sits at the bundle root
const CHAPTERS = [
  { id: 'health', kind: 'Gelephu Mindfulness City', name: 'HEALTHCARE', dot: 'Healthcare<br>Centre', url: M + 'gmc_obj_o4-healthcare-centre_v02.html', live: true, pin: { zone: 'health' } },
  { id: 'dam', kind: 'Temple-Dam', name: 'SANKOSH', dot: 'Sankosh<br>Temple-Dam', url: M + 'gmc_obj_o2-temple-dam_v02.html', live: true, pin: { zone: 'dam' } },
  { id: 'airport', kind: 'International Airport', name: 'GELEPHU', dot: 'International<br>Airport', url: M + 'gmc_obj_o1-airport_v03.html', live: true, pin: { zone: 'airport' } },
  { id: 'university', kind: 'University', name: 'UNIVERSITY', dot: 'University', live: false, pin: { zone: 'university' } },
  { id: 'market', kind: 'Market', name: 'MARKET', dot: 'Market', live: false, pin: { zone: 'market' } },
  { id: 'culture', kind: 'Cultural Centre', name: 'CULTURE', dot: 'Cultural<br>Centre', live: false, pin: { zone: 'culture' } },
  { id: 'agri', kind: 'Agricultural Exhibit', name: 'AGRICULTURE', dot: 'Agricultural<br>Exhibit', live: false, pin: { zone: 'agri' } },
];
const LIVE = CHAPTERS.filter(c => c.live);

// ── state ────────────────────────────────────────────────────────────────────
let corner = null, state = 'loading', cur = null, catIdx = -1, busy = false, drift = null, handles = [], sea = null, fl = null, mini = null;

// ── model frames (current + one preloaded) ───────────────────────────────────
const frames = new Map();
function loadFrame(ch) {
  if (frames.has(ch.id)) return frames.get(ch.id).ready;
  const el = document.createElement('iframe'); el.title = ch.kind; el.src = ch.url + '?embed=1'; el.setAttribute('allow', 'autoplay');
  $('#frames').appendChild(el);
  const rec = { el, api: null, ch };
  rec.ready = new Promise((res, rej) => {
    const t0 = performance.now();
    const poll = () => { try { const w = el.contentWindow; if (w && w.__ok) { rec.api = w.__api; prepare(ch, rec.api); return res(rec); } if (w && w.__err) return rej(new Error(ch.id + ': ' + w.__err)); } catch (e) { /* not ready */ }
      if (performance.now() - t0 > 120000) return rej(new Error('timeout loading ' + ch.id)); setTimeout(poll, 150); };
    el.addEventListener('load', poll, { once: true });
  });
  frames.set(ch.id, rec); return rec.ready;
}
// ambience (user's choice, 350 %): 3.5 × the component-mode umber, √3.5 × the scene's fill light, in every landmark,
// for the whole journey (arrival views and the component / detail views)
const AMB = 3.5;
const applyAmbience = api => api?.director?.setAmbient?.(AMB);
/** per-landmark zoom-out of every framing (arrival, overview and each component view): 1.15 = 15% further out */
const ZOOM_OUT = { health: 1.15 };
function prepare(ch, api) {
  const d = api.director, z = ZOOM_OUT[ch.id];
  if (z) [d.hero, d.overview, ...(d.components || []).map(c => c.view)].forEach(v => { if (v?.half) v.half *= z; });
  d.director(true); d.setCamera({ ...d.hero }); applyAmbience(api);
  if (ch.id === 'airport') for (let i = 0; i < api.gables; i++) api.setGableLevel(i, 0);   // dark until the gradual light-up
}
function showFrame(id) { for (const [k, r] of frames) { const on = k === id; r.el.classList.toggle('on', on); r.api?.pause(!on); } }
function trimFrames(keep) { for (const k of [...frames.keys()]) if (!keep.includes(k)) { frames.get(k).el.remove(); frames.delete(k); } }
const api = () => frames.get(cur?.id)?.api;
const nextLive = ch => LIVE[(LIVE.indexOf(ch) + 1) % LIVE.length];
/** smoothness: the next landmark builds only once the page is idle (never on top of a transition), then renders
 *  one hidden frame so its textures are on the GPU before its reveal, then sleeps */
function preloadNext(ch) {
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  setTimeout(() => idle(() => loadFrame(nextLive(ch)).then(r => { if (r.ch !== cur) { r.api.warm?.(); r.api.pause(true); } }).catch(fail), { timeout: 2500 }), 1200);
}
/** smoothness: a landmark that is fully covered (opaque sky or full-screen map) stops rendering */
const sleepFrame = ch => { if (ch) frames.get(ch.id)?.api?.pause(true); };

// ── title (reference image) ──────────────────────────────────────────────────
function setTitle(ch) {
  $('#title .kind').textContent = ch.kind.toUpperCase();
  $('#title .name').innerHTML = [...ch.name].map(c => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
}
function titleIn(ch) {
  setTitle(ch); const tl = gsap.timeline();
  tl.to('#title .scrim', { opacity: 1, duration: 1.4, ease: 'power1.out' }, 0).fromTo('#title .kind', { y: 18, opacity: 0, letterSpacing: '.3em' }, { y: 0, opacity: 1, letterSpacing: '.14em', duration: 1.6, ease: 'settle' }, 0)
    .fromTo('#title .ch', { yPercent: 70, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, stagger: .06, ease: 'settle' }, '-=1.25')
    .fromTo('#explore', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'settle' }, '-=.7');
  return tl;
}
function titleOut() { return gsap.timeline().to('#title .ch', { yPercent: -60, opacity: 0, duration: .6, stagger: .025, ease: 'power2.in' })
  .to('#title .scrim', { opacity: 0, duration: .7, ease: 'power1.in' }, 0).to('#title .kind', { opacity: 0, y: -14, duration: .5, ease: 'power2.in' }, 0).to('#explore', { autoAlpha: 0, y: -14, duration: .5, ease: 'power2.in' }, 0); }

// ── chapter dots + mini-map ──────────────────────────────────────────────────
function buildDots() {
  $('#dots').innerHTML = CHAPTERS.map((c, i) => `<button type="button" data-i="${i}" class="${c.live ? '' : 'soon'}" aria-label="${c.kind}"><span class="ring"></span><span class="lab">${c.dot}</span></button>`).join('');
  $$('#dots button').forEach(b => b.onclick = () => go(CHAPTERS[+b.dataset.i]));
}
function setDot(ch) { $$('#dots button').forEach(b => b.classList.toggle('on', CHAPTERS[+b.dataset.i] === ch)); mini?.setActive(ch.id); corner?.select(ch.id); }
function mapCorner() { const w = Math.min(470, Math.max(260, innerWidth * .31)), h = w * 280 / 623,   /* the static map's aspect */ g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 32;
  return { left: innerWidth - w - g * .6, top: innerHeight - h - g * .5, width: w, height: h }; }
function placeMap(big) { gsap.set('#map', big ? { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0 } : { ...mapCorner(), borderRadius: 18 }); }
function toast(msg) { gsap.timeline().set('#toast', { textContent: msg }).to('#toast', { opacity: 1, y: -6, duration: .4 }).to('#toast', { opacity: 0, y: 0, duration: .5 }, '+=1.8'); }

// ── map overview / video glide ───────────────────────────────────────────────
const MAP_HOME = { az: 152, el: 36, dist: 20, tx: 0, ty: -.2, tz: .2, fov: 26 };
function mapExpand(on, dur = 1.1) {
  const tl = gsap.timeline();
  if (on) { $('#map').classList.add('big'); tl.to('#map', { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, duration: dur, ease: 'cinema' })
    .to(mini.cam, { ...MAP_HOME, az: 160, el: 50, dist: 16, duration: dur * 1.3, ease: 'cinema' }, 0); }
  else tl.to('#map', { ...mapCorner(), borderRadius: 18, duration: dur, ease: 'cinema', onComplete: () => $('#map').classList.remove('big') })
    .to(mini.cam, { ...MAP_HOME, duration: dur, ease: 'cinema' }, 0);
  return tl;
}
/** the video's camera move on the map: pull back to the oblique angle, glide sideways while turning, settle on the pin */
function mapGlideTo(ch, dur = 2.4) {
  const p = mini.pinPos(ch.id), side = Math.sign((p.tx - mini.cam.tx) || 1);
  return gsap.timeline()
    .to(mini.cam, { el: 46, dist: 14, duration: dur * .35, ease: 'power2.out' })
    .to(mini.cam, { tx: p.tx, tz: p.tz + .2, ty: p.ty, az: '+=' + (28 * side), duration: dur, ease: 'power3.inOut' }, 0)
    .to(mini.cam, { el: 50, dist: 6, fov: 24, duration: dur * .55, ease: 'power3.inOut' }, dur * .45);
}

// ── chapter reveal (camera descends onto the hero view; airport lights gable by gable) ──
function arrive(ch, { from = 'above' } = {}) {
  const a = frames.get(ch.id).api, d = a.director, h = d.hero;
  d.setCamera(from === 'above' ? { ...h, el: h.el + 26, half: h.half * 1.55, az: h.az - 14 } : { ...h, half: h.half * 1.2 });
  showFrame(ch.id); a.pause(false);
  const tl = gsap.timeline();
  tl.to(d.cam, { el: h.el, half: h.half, az: h.az, duration: 3.2, ease: 'settle' }, 0);
  tl.add(titleIn(ch), .9);
  tl.add(() => lightUp(ch), 1.1);
  tl.add(() => { drift?.kill(); drift = gsap.to(d.cam, { az: h.az + 4, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }); });
  return tl;
}
function lightUp(ch) {
  const a = frames.get(ch.id).api;
  if (ch.id === 'airport') {   // the user's choice: a gradual light-up, west → east, each gable easing on
    for (let i = 0; i < a.gables; i++) { const o = { v: 0 }; gsap.to(o, { v: 1, duration: 1.2, delay: i * .35, ease: 'power2.inOut', onUpdate: () => a.setGableLevel(i, o.v) }); }
  } else if (a.cascade) a.cascade(true); else if (a.lamps) a.lamps(true);
}

// ── going to a landmark ──────────────────────────────────────────────────────
async function go(ch) {
  if (!ch.live) { toast(ch.kind + ' · being modelled'); return; }
  if (state === 'intro') { if (!EMBED) startStory(); return; }
  if (state === 'loading') return;
  if (busy || ch === cur) { if (state === 'map' && ch === cur) closeMap(); return; }
  busy = true;
  try {
    const leaving = cur, wasExplore = state === 'explore', wasMap = state === 'map';
    if (wasExplore) { if (EMBED) leaveExploreQuiet(); else await exitExplore(true); }
    $('#map').classList.remove('pick');
    drift?.kill(); setDot(ch);
    if (INTRO === 3 || wasMap) await glideTransition(leaving, ch, wasMap);
    else if (EMBED) await veilTransition(leaving, ch);
    else await cloudTransition(leaving, ch);
    cur = ch; state = 'hero'; trimFrames([ch.id, nextLive(ch).id]); preloadNext(ch);
  } catch (e) { fail(e); } finally { busy = false; }
}
/** clouds.mp4: we rise into an open sky and push forward through a field of bright cumulus — they swell and
 *  slide past the edges of the frame, blue sky between them — until one engulfs us in a soft white */
const FIELD = .4;                                               // how much of the sky is cumulus while we fly
function cloudsIn({ start = 0, dur = 3.6, fade = .9 } = {}) {
  const end = start - 3800;
  return gsap.timeline()
    .add(() => {   // set up when the timeline reaches this point, not when it's built (no invisible frames before the fade-in)
      Object.assign(fl.look, { cover: 0, fill: 0, erode: 0 }); fl.bank.front = start - 600; fl.bank.back = start - 20000;
      Object.assign(fl.cam, { px: 0, py: 1550, pz: start, tx: 0, ty: 1350, tz: start - 1000, fov: 58 });   // skimming the cumulus tops
      gsap.set('#fx', { opacity: 0, background: 'none' }); gsap.set(fl.sky, { opacity: 0 }); fl.setRunning(true);
    }, 0)
    .to('#fx', { opacity: 1, duration: fade, ease: 'power1.out' }, 0)
    .to(fl.sky, { opacity: 1, duration: fade * 1.2, ease: 'power1.inOut' }, 0)
    .to(fl.look, { cover: FIELD, duration: dur * .35, ease: 'power1.out' }, 0)
    // a steady dolly with a slight drift, sinking into the tops so the clouds swell and slide past the frame edges
    .to(fl.cam, { pz: end, tz: end - 1000, px: 260, tx: 420, py: 880, ty: 860, duration: dur, ease: 'power1.in' }, 0)
    .to(fl.look, { cover: .8, duration: dur * .3, ease: 'power2.in' }, dur * .7)
    .to(fl.look, { fill: 1, duration: dur * .25, ease: 'power2.in' }, dur * .75);
}
/** out of the white: we sink through the cloud base, the sky dissolves and the clouds thin over the landmark */
function cloudsOut() {
  const z = fl.cam.pz;
  return gsap.timeline()
    .to(fl.cam, { pz: z - 2600, tz: z - 3300, px: '+=200', tx: '+=200', py: -1000, ty: -1700, duration: 3.6, ease: 'power2.out' }, 0)
    .to(fl.look, { fill: 0, duration: 1.0, ease: 'power2.out' }, 0)
    .to(fl.look, { cover: FIELD, duration: 1.2, ease: 'power2.out' }, 0)
    .to(fl.sky, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, .5)
    .to(fl.look, { erode: .7, duration: 2.0, ease: 'power1.in' }, 1.2)
    .to('#fx', { opacity: 0, duration: .8, ease: 'power1.inOut' }, 2.6)
    .add(() => fl.setRunning(false));
}
/** ideas 1 & 2: rise into a cloud bank, swap the model inside the whiteout, fly out over the next landmark */
async function cloudTransition(from, to) {
  const rec = loadFrame(to);
  const tl = gsap.timeline();
  if (from) { const d = frames.get(from.id).api.director; tl.to(d.cam, { el: '+=22', half: d.cam.half * 1.5, duration: 2.4, ease: 'power2.in' }, 0); }
  tl.add(titleOut(), 0).add(cloudsIn(), .1)
    .add(() => sleepFrame(from), .1 + .9 * 1.2 + .05);         // the sky layer is opaque from here: the old landmark stops drawing
  await tl;
  await rec;                                                    // usually preloaded already
  await gsap.timeline().add(arrive(to), 0).add(cloudsOut(), 0);
}
/** EMBED: the story draws the clouds (its fly-through, over this page). Ask it for a step and wait. */
const askStory = type => new Promise(res => {
  const h = e => { if (e.origin === location.origin && e.data?.type === type + ':done') { removeEventListener('message', h); res(); } };
  addEventListener('message', h); parent.postMessage({ type }, location.origin);
});
/** EMBED: the story's cloud transition between landmarks: we fly into its clouds over the old
 *  landmark, the model swaps while the view is all cloud, and we fly on out over the new one */
async function veilTransition(from, to) {
  const rec = loadFrame(to);
  const tl = gsap.timeline();
  if (from) { const d = frames.get(from.id).api.director; tl.to(d.cam, { el: '+=14', half: d.cam.half * 1.3, duration: 2.0, ease: 'power2.in' }, 0); }
  tl.add(titleOut(), 0);
  await Promise.all([tl, askStory('gmc:cover')]);
  pendingReset?.(); pendingReset = null;   // the old landmark leaves component mode out of sight
  sleepFrame(from);
  await rec;
  await Promise.all([arrive(to), askStory('gmc:clear')]);
}
/** idea 3 (and "back to the map"): the video's continuous glide over the map, then a dive into the landmark */
async function glideTransition(from, to, alreadyBig) {
  const rec = loadFrame(to);
  const tl = gsap.timeline();
  tl.add(titleOut(), 0);
  if (!alreadyBig) tl.add(mapExpand(true, 1.2), .2);
  tl.add(() => sleepFrame(from), alreadyBig ? 0 : 1.45);         // the full-screen map covers it: stop drawing the old landmark
  tl.add(mapGlideTo(to, 2.4), alreadyBig ? 0 : .9);
  await tl; const r = await rec;
  showFrame(to.id); gsap.set(r.el, { opacity: 0 });
  // dive: the map dissolves while the landmark fades up beneath the descending camera, then the map returns to its corner
  const dive = gsap.timeline();
  dive.to(mini.cam, { dist: 3.2, el: 62, duration: 1.0, ease: 'power2.in' }, 0)
      .to('#map', { opacity: 0, duration: .8, ease: 'power2.in' }, .15)
      .to(r.el, { opacity: 1, duration: 1.2, ease: 'power2.out' }, .35)
      .add(arrive(to, { from: 'above' }), .35)
      .add(() => { $('#map').classList.remove('big'); placeMap(false); Object.assign(mini.cam, MAP_HOME); }, 1.1)
      .to('#map', { opacity: 1, duration: .9, ease: 'power2.out' }, 2.2);
  $('#back .txt').innerHTML = 'Back to<br>the map';
  await dive;
}
function openMap() {
  if (busy || state !== 'hero') return; busy = true; state = 'map'; drift?.kill();
  gsap.timeline({ onComplete: () => { busy = false; } }).add(titleOut(), 0).add(mapExpand(true, 1.2), .15).add(() => sleepFrame(cur), 1.4)
    .to('#back', { opacity: 1, duration: .5 }, .8);
  $('#back').classList.add('on'); $('#back .txt').innerHTML = 'Close<br>the map'; $('#map').classList.add('pick');
}
function closeMap() {
  if (state !== 'map') return; busy = true; $('#map').classList.remove('pick');
  api()?.pause(false);                                          // it comes back into view as the map shrinks
  gsap.timeline({ onComplete: () => { busy = false; state = 'hero'; } }).add(mapExpand(false, 1.1), 0).add(titleIn(cur), .5);
  $('#back .txt').innerHTML = 'Back to<br>the map';
}

// ── component mode (the video) ───────────────────────────────────────────────
function exposure(a, to, dur) { const o = { k: a._k ?? 1 }; return gsap.to(o, { k: to, duration: dur, ease: 'power2.inOut', onUpdate: () => { a._k = o.k; a.setExposure(o.k); } }); }
async function enterExplore() {
  if (busy || state !== 'hero') return; busy = true; state = 'explore'; drift?.kill();
  const a = api(), d = a.director, comps = d.components;
  $('#cats .head').textContent = cur.kind;
  $('#cats ul').innerHTML = comps.map((c, i) => `<li><button type="button" data-i="${i}">${c.label}</button></li>`).join('');
  $$('#cats li button').forEach(b => b.onclick = () => { if (!busy) { busy = true; focusCat(+b.dataset.i).finally(() => { busy = false; }); } });
  const tl = gsap.timeline();
  tl.add(titleOut(), 0).add(exposure(a, .06, .45), 0).add(() => d.enterComponents(), .45).add(exposure(a, 1, .7), .47)
    .to(d.cam, { ...d.overview, duration: 1.9, ease: 'cinema' }, .2)
    .fromTo('#cats', { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: 'settle' }, .9)
    .fromTo('#cats li', { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: .8, stagger: .06, ease: 'settle' }, 1)
    .to('#back', { opacity: 1, duration: .6 }, 1.1);
  $('#cats').classList.add('on'); $('#back').classList.add('on'); $('#back .txt').innerHTML = 'Back to<br>the overview';
  await tl; await focusCat(0); busy = false;
}
async function focusCat(i) {
  const a = api(), d = a.director, c = d.components[i]; if (!c) return;
  const prev = handles.slice(); catIdx = i;
  // rail: the dot slides along the line; the active label brightens
  const li = $$('#cats li')[i], railTop = $('#cats .rail').getBoundingClientRect().top;
  $$('#cats li').forEach((l, k) => l.classList.toggle('on', k === i));
  gsap.to('#cats .slider', { y: li.getBoundingClientRect().top + li.offsetHeight / 2 - railTop - 3.5, duration: .9, ease: 'settle' });
  const tl = gsap.timeline();
  // 1 · old outlines thin out and fade first
  for (const h of prev) { const o = { v: 1 }; tl.to(o, { v: 0, duration: .45, ease: 'power2.in', onUpdate: () => h.setOpacity(o.v), onComplete: () => d.clear(h) }, 0); }
  handles = [];
  // 2 · the camera glides and turns to the component (one continuous move, slight FOV breathing)
  tl.to(d.cam, { az: c.view.az, el: c.view.el, tx: c.view.tx, ty: c.view.ty, tz: c.view.tz, half: c.view.half, duration: 2.2, ease: 'power3.inOut' }, .1)
    .to(d.cam, { keyframes: [{ fov: 33, duration: 1.1, ease: 'sine.in' }, { fov: 30, duration: 1.1, ease: 'sine.out' }] }, .1);
  // 3 · stats: old lines slide down and fade, new ones rise in
  tl.to('#stat .lines > *', { y: 22, opacity: 0, duration: .35, ease: 'power2.in', stagger: .05 }, 0)
    .add(() => { $('#stat .big').textContent = c.stat.big; $('#stat .small').textContent = c.stat.small; }, .4)
    .to('#stat', { opacity: 1, duration: .4 }, .4)
    .fromTo('#stat .lines > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'settle' }, 1.35);
  // 4 · new outlines draw on along the component, then brighten into their glow
  tl.add(() => { const h = d.show(c.id); if (!h) return; handles.push(h); h.setOpacity(.55); const o = { p: 0, op: .55 };
    gsap.to(o, { p: 1, duration: 1.7, ease: 'power2.inOut', onUpdate: () => h.setProgress(o.p) });
    gsap.to(o, { op: 1, duration: .8, delay: 1.3, ease: 'power1.out', onUpdate: () => h.setOpacity(o.op) }); }, .7);
  await tl;
}
/** EMBED: from a component view straight into the clouds; the old landmark is reset under cover */
let pendingReset = null;
function leaveExploreQuiet() {
  const a = api(), d = a.director, hs = handles;
  handles = []; catIdx = -1; $('#cats').classList.remove('on'); $('#back').classList.remove('on');
  gsap.to(['#cats', '#stat', '#back'], { opacity: 0, duration: .45 });
  pendingReset = () => { for (const h of hs) d.clear(h); d.exitComponents(); a._k = 1; a.setExposure?.(1); };
}
async function exitExplore(quick = false) {
  const a = api(), d = a.director;
  const tl = gsap.timeline();
  for (const h of handles) { const o = { v: 1 }; tl.to(o, { v: 0, duration: .35, onUpdate: () => h.setOpacity(o.v), onComplete: () => d.clear(h) }, 0); }
  handles = []; catIdx = -1; $('#cats').classList.remove('on'); $('#back').classList.remove('on');
  tl.to(['#cats', '#stat', '#back'], { opacity: 0, duration: .45 }, 0)
    .add(exposure(a, .06, .4), .1).add(() => d.exitComponents(), .5).add(exposure(a, 1, .7), .52);
  if (!quick) tl.to(d.cam, { ...d.hero, duration: 2.0, ease: 'cinema' }, .3).add(titleIn(cur), 1.2)
    .add(() => { drift?.kill(); drift = gsap.to(d.cam, { az: d.hero.az + 4, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }); });
  await tl; state = 'hero';
}

// ── input: scroll / swipe / keys step through the story ──────────────────────
function step(dirn) {
  if (busy) return;
  if (state === 'intro') { if (dirn > 0 && !EMBED) startStory(); return; }
  if (state === 'map') { if (dirn < 0) closeMap(); return; }
  if (state === 'hero') { if (dirn > 0) enterExplore(); return; }
  if (state === 'explore') {
    const n = api().director.components.length;
    if (dirn > 0) { if (catIdx < n - 1) { busy = true; focusCat(catIdx + 1).finally(() => { busy = false; }); } else go(nextLive(cur)); }
    else { if (catIdx > 0) { busy = true; focusCat(catIdx - 1).finally(() => { busy = false; }); } else { busy = true; exitExplore().finally(() => { busy = false; }); } }
  }
}
window.Observer.create({ target: window, type: 'wheel,touch', wheelSpeed: -1, tolerance: 12, preventDefault: false,
  onUp: () => step(1), onDown: () => step(-1) });   // wheelSpeed −1: wheel down = forward
addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  else if (e.key === 'Escape') { if (state === 'explore' && !busy) { busy = true; exitExplore().finally(() => { busy = false; }); } else if (state === 'map') closeMap(); }
  else if (e.key === 'ArrowRight' && state !== 'intro') go(nextLive(cur || LIVE[0]));
});
$('#explore').onclick = () => enterExplore();
$('#back').onclick = () => { if (busy) return; if (state === 'explore') { busy = true; exitExplore().finally(() => { busy = false; }); } else if (state === 'map') closeMap(); };

// ── intros (the 3 live ideas) ────────────────────────────────────────────────
async function startStory() {
  if (state !== 'intro' || busy) return; busy = true;
  try {
    // the descent starts at once; the airport may still be building behind it, and is only needed at the reveal
    const air = LIVE[0]; cur = air; setDot(air);
    const preparing = () => toast('Preparing the ' + air.dot.replace('<br>', ' ')), holdForAirport = async () => { if (!frames.get(air.id)?.api) preparing(); await loadFrame(air); };   // (air = the first live chapter)
    if (INTRO === 1) {        // descend through the golden cloud sea; the deck turns to mist; the airport appears below
      const tl = gsap.timeline();
      tl.to(['#title .kind', '#title .ch', '#title .scrim'], { opacity: 0, duration: .6 }, 0)
        .to(sea.cam, { px: 1500, py: 700, pz: -600, tx: -2600, ty: -1600, tz: 2200, fov: 50, duration: 4.4, ease: 'cinema' }, 0)
        .add(cloudsIn({ start: -300, dur: 2.4, fade: .6 }), 2.0)           // the deck closes around us as one soft cloud
        .add(() => { gsap.set('#sky', { opacity: 0 }); sea.setRunning(false); }, 2.0 + .6 * 1.2 + .05);   // the overlay's sky is opaque: stop the sea
      await tl; await holdForAirport();                                    // (held inside the white cloud if it isn't ready yet)
      gsap.set('#sky', { opacity: 0 }); sea.setRunning(false);
      await gsap.timeline().add(arrive(air), 0).add(cloudsOut(), 0);
    } else {                  // idea 3: from the cloud sea onto the map, glide like the video, dive into the airport
      const tl = gsap.timeline();
      tl.to(['#title .kind', '#title .ch', '#title .scrim'], { opacity: 0, duration: .6 }, 0)
        .to(sea.cam, { py: 9000, ty: 0, tx: 0, tz: 0, px: 0, pz: 3000, duration: 2.2, ease: 'power2.in' }, 0)
        .add(() => { placeMap(true); $('#map').classList.add('big'); Object.assign(mini.cam, { ...MAP_HOME, az: 120, el: 70, dist: 26 }); }, 1.5)
        .to('#sky', { opacity: 0, duration: 1.0 }, 1.5).add(() => sea.setRunning(false), 2.6)
        .to(mini.cam, { az: 160, el: 50, dist: 13.5, duration: 2.0, ease: 'cinema' }, 1.6);
      await tl; if (!frames.get(air.id)?.api) preparing();
      await glideTransition(null, air, true);                              // waits for the airport after the glide
    }
    state = 'hero';
    preloadNext(air);
  } catch (e) { fail(e); } finally { busy = false; }
}

const EMBED_DONE = Symbol('embed');
/** EMBED: the first landmark rises out of the story's clouds (the story clears its clouds over it). */
async function startEmbedded() {
  if (state !== 'intro' || busy) return; busy = true;
  try {
    const first = LIVE[0]; cur = first; setDot(first);
    await loadFrame(first);
    await arrive(first, { from: 'above' });
    state = 'hero'; preloadNext(first);
  } catch (e) { fail(e); } finally { busy = false; }
}
// ── boot ─────────────────────────────────────────────────────────────────────
try {
  $$('#ideas button').forEach(b => { b.setAttribute('aria-pressed', String(+b.dataset.intro === INTRO)); b.onclick = () => { location.search = '?intro=' + b.dataset.intro; }; });
  buildDots();
  const lap = n => console.info(`[UI] ${n}: ${(performance.now() / 1000).toFixed(2)} s`);   // load timing
  loadFrame(LIVE[0]).then(r => { lap(LIVE[0].id + ' ready'); if (state !== 'hero') { r.api.warm?.(); r.api.pause(true); } }).catch(fail);   // first: it's the longest build
  // A static map in the corner (the interactive mini-map is retired): no picking, no expand.
  $('#map').classList.add('static'); corner = createCornerMap($('#map-gl'), 'ui/gmc-map.svg');
  $('#map-tip')?.remove(); $('#map .hint')?.remove();
  placeMap(false); addEventListener('resize', () => placeMap(state === 'map' || $('#map').classList.contains('big')));
  gsap.set(['#cats', '#stat', '#back'], { opacity: 0 }); gsap.set('#explore', { autoAlpha: 0 });

  // build in parallel: the first landmark (behind everything) + this idea's clouds. The gate only waits for the
  // clouds; the airport keeps building behind the welcome screen (startStory waits for it if you're quick).
  if (EMBED) {
    // Inside the Gelephu story: no gate, no welcome and no cloud-sea intro. The story's own clouds
    // part straight onto the first landmark, and it draws the clouds between landmarks too.
    $('#loader').remove(); state = 'intro';
    $('#top').style.display = 'none';   // the story carries no title bar
    addEventListener('message', e => { if (e.origin === location.origin && e.data?.type === 'gmc:start') startEmbedded(); });
    loadFrame(LIVE[0]).then(() => {
      if (parent !== window) parent.postMessage({ type: 'gmc:ready' }, location.origin);
    }).catch(fail);
    throw EMBED_DONE;
  }
  let pc = 0; const bar = () => { const el = $('#loader .bar i'); if (el) el.style.width = Math.round(pc * 100) + '%'; };
  const cloudsReady = (async () => {
    sea = await createCloudSea($('#sky'), { onProgress: f => { pc = f * .7; bar(); } }); gsap.set('#sky', { opacity: 1 }); lap('cloud sea ready');
    if (INTRO !== 3) { fl = await createCloudFlight($('#fx'), { onProgress: f => { pc = .7 + f * .3; bar(); } }); }
    pc = 1; bar(); lap('clouds ready');
  })();
  await cloudsReady; lap('gate open');

  // the opening title (in the clouds) and the Enter gate
  setTitle({ kind: 'Bhutan', name: 'GELEPHU' }); $('#title .kind').textContent = 'GELEPHU MINDFULNESS CITY'; $('#title .name').innerHTML = [...'WELCOME'].map(c => `<span class="ch">${c}</span>`).join('');
  $('#loader .start').classList.add('on');
  await new Promise(r => { $('#loader .start').onclick = r; setTimeout(r, params.has('auto') ? 50 : 1e9); });
  await gsap.to('#loader', { opacity: 0, duration: .9, ease: 'power2.inOut' }); $('#loader').remove();
  state = 'intro';
  await gsap.timeline()
    .to('#title .scrim', { opacity: 1, duration: 1.4 }, 0).fromTo('#title .kind', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: 'settle' }, .2)
    .fromTo('#title .ch', { yPercent: 70, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, stagger: .07, ease: 'settle' }, .5);
  if (INTRO === 1) gsap.to(sea.cam, { px: 8200, tx: -11500, duration: 30, ease: 'sine.inOut', yoyo: true, repeat: -1 });
} catch (e) { if (e !== EMBED_DONE) fail(e); }

window.__ui = { get state() { return state; }, get cur() { return cur?.id; }, get catIdx() { return catIdx; }, go: id => go(CHAPTERS.find(c => c.id === id)), step, startStory, enterExplore, focusCat, exitExplore, openMap, closeMap, frames, get mini() { return mini; }, get fl() { return fl; } };
