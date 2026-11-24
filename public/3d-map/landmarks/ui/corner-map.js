// ─────────────────────────────────────────────────────────────────────────────
// Corner map (replaces the interactive mini-map): the GMC map laid back in an axonometric
// tilt, like a model plate seen from the front, with a diamond on each landmark. The land is a
// sheet of frosted glass (blurred backdrop, sheen, bright rim) hovering over its own soft shadow.
// It is still: the glass and the shadow give the float, nothing moves.
// Pins stand upright on top: each one sits where its spot lands on the tilted plate. The
// selection (podium, leader line and teal diamond) glides to the current landmark, and its
// diamond hides under it. Display only: no picking, no expand.
// ─────────────────────────────────────────────────────────────────────────────
const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';

/** the plate's tilt: laid back about the horizontal axis and turned a little, like the reference axonometric */
export const TILT = 'perspective(1300px) translateY(2%) rotateX(57deg) rotateZ(-7deg)';
/** how far the shadow sits under the plate, along the plate's normal (px) */
const LIFT = 26;
/** ground diamonds are squashed to lie on the tilted plate */
const LAY = .56;

const STYLE = `
.cm-stage { position: absolute; inset: 0; }
.cm-plate, .cm-under { position: absolute; inset: 0; transform-origin: 50% 55%; pointer-events: none; }
.cm-plate { transform: ${TILT}; }
.cm-under { transform: ${TILT} translateZ(-${LIFT}px); filter: blur(11px); opacity: .22; }
.cm-plate svg, .cm-under svg, .cm-pins { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.cm-frost { position: absolute; inset: 0; -webkit-backdrop-filter: blur(4px) saturate(1.2) brightness(1.04); backdrop-filter: blur(4px) saturate(1.2) brightness(1.04);
  -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }
.cm-plate .cm-land { fill: url(#cm-glass); opacity: .16; }
.cm-plate .cm-rim { fill: none; stroke: rgba(196,232,255,.9); stroke-width: 1.1; stroke-linejoin: round; filter: drop-shadow(0 0 3px rgba(110,205,255,.7)); }
.cm-plate .cm-sheen { fill: url(#cm-sheen); opacity: .3; }
.cm-plate .cm-anchor { fill: none; }
.cm-under .cm-land { fill: rgba(16,22,34,.9); stroke: none; }
.cm-pins .cm-pt .cm-shadow { fill: rgba(0,0,0,.22); }
`;

export function createCornerMap(host, url) {
  let pins = null, sel = null, at = null, want = null, spots = [], cur = null, tween = null;
  const plate = Object.assign(document.createElement('div'), { className: 'cm-plate' });
  const under = Object.assign(document.createElement('div'), { className: 'cm-under' });

  /** where each spot on the flat map lands once the plate is tilted, in the pins layer's own units */
  function project() {
    if (!pins) return;
    const inv = pins.getScreenCTM()?.inverse(); if (!inv) return;
    const pt = pins.createSVGPoint();
    spots.forEach(s => {
      const r = s.anchor.getBoundingClientRect(); pt.x = r.left + r.width / 2; pt.y = r.top + r.height / 2;
      const p = pt.matrixTransform(inv); s.x = p.x; s.y = p.y; s.el.setAttribute('transform', `translate(${p.x} ${p.y})`);
    });
    const here = spots.find(s => s.id === at);
    if (here && !tween?.isActive()) { cur = { x: here.x, y: here.y }; sel.setAttribute('transform', `translate(${cur.x} ${cur.y})`); }
  }

  function place(id, animate) {
    const to = spots.find(s => s.id === id); if (!to || !sel) return;
    spots.forEach(s => s.el.classList.toggle('cm-here', s === to));
    at = id;
    if (!animate || !cur) { tween?.kill(); cur = { x: to.x, y: to.y }; sel.setAttribute('transform', `translate(${cur.x} ${cur.y})`); return; }
    tween?.kill();
    tween = gsap.to(cur, { x: to.x, y: to.y, duration: 1.4, ease: 'power3.inOut', onUpdate: () => sel.setAttribute('transform', `translate(${cur.x} ${cur.y})`),
      onComplete: () => { cur = { x: to.x, y: to.y }; } });
  }

  fetch(url).then(r => r.text()).then(text => {
    const src = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    const vb = src.getAttribute('viewBox'), land = src.querySelector('.cm-land');
    const svgWith = (...kids) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', vb); s.setAttribute('preserveAspectRatio', 'xMidYMid meet'); kids.forEach(k => s.append(k)); return s; };

    // the glass plate: frosted backdrop cut to the land, then a sheen and a bright rim over it
    const mask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${NS}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"><g fill="#000">${land.innerHTML}</g></svg>`)}")`;
    const frost = Object.assign(document.createElement('div'), { className: 'cm-frost' });
    frost.style.webkitMaskImage = frost.style.maskImage = mask;
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `
      <linearGradient id="cm-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0f8ff"/><stop offset=".5" stop-color="#bfdcf2"/><stop offset="1" stop-color="#7fa9cc"/></linearGradient>
      <radialGradient id="cm-sheen" cx=".38" cy=".18" r=".7">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
      <clipPath id="cm-clip">${land.innerHTML}</clipPath>`;
    // the land's fill pieces overlap: drawn opaque and faded as one group (group opacity) so overlaps don't speckle
    const glass = land.cloneNode(true);
    // the rim: only the outline (the longest path), not every inner piece
    const outline = [...land.querySelectorAll('path')].reduce((a, b) => (b.getAttribute('d').length > a.getAttribute('d').length ? b : a));
    const rim = outline.cloneNode(); rim.setAttribute('class', 'cm-rim');
    const sheen = document.createElementNS(NS, 'rect'); sheen.setAttribute('class', 'cm-sheen'); sheen.setAttribute('clip-path', 'url(#cm-clip)');
    const [, , w, h] = vb.split(/[ ,]+/).map(Number); Object.entries({ x: 0, y: 0, width: w, height: h }).forEach(([k, v]) => sheen.setAttribute(k, v));
    // an invisible anchor at each spot, tilted with the plate, to read back where the spot lands on screen
    const anchors = document.createElementNS(NS, 'g');
    spots = [...src.querySelectorAll('.cm-pt')].map(el => {
      const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(el.getAttribute('transform'));
      const a = document.createElementNS(NS, 'circle'); a.setAttribute('class', 'cm-anchor'); a.setAttribute('cx', m[1]); a.setAttribute('cy', m[2]); a.setAttribute('r', '.5');
      anchors.append(a);
      return { el, id: el.dataset.id ?? null, anchor: a, x: +m[1], y: +m[2] };
    });
    plate.append(frost, svgWith(defs, glass, sheen, rim, anchors));
    under.append(svgWith(land.cloneNode(true)));

    // the pins layer: flat over the plate, with the spots, the selection and the map's own styles
    pins = svgWith(src.querySelector('style'));
    pins.setAttribute('class', 'cm-pins');
    for (const s of spots) { const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `scale(1 ${LAY})`); g.append(...s.el.childNodes); s.el.append(g); pins.append(s.el); }
    sel = src.querySelector('.cm-sel'); pins.append(sel);

    const css = document.createElement('style'); css.textContent = STYLE;
    const stage = Object.assign(document.createElement('div'), { className: 'cm-stage' });
    stage.append(under, plate, pins);
    host.replaceChildren(css, stage);
    project();
    new ResizeObserver(project).observe(host);
    if (want) place(want, false);
  }).catch(e => console.error('corner map', e));

  return {
    /** moves the selection to this landmark (glides once the map is showing) */
    select(id) { want = id; if (pins) place(id, at !== null); },
  };
}
