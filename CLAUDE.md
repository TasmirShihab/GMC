# GMC Experience — gmc.bt revamp

The new website for Gelephu Mindfulness City (GMC), a Special Administrative Region of Bhutan.
Goal: an award-level, WebGL-led storytelling site whose every page answers three questions:
**What is GMC? · What's happening now? · How do I take part?** (investors first).
The source brief is the SELISE TXL moodboard "GMC Website Revamp — Moodboard & Redesign Scope" (v0.1, 18 Nov 2026).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 · three r187 · @react-three/fiber 9 ·
@react-three/drei 10 · @react-three/postprocessing 3 · GSAP 3.15 (+ ScrollTrigger, SplitText, CustomEase) ·
Lenis 1.3 · zustand 5 · leva (debug) · detect-gpu · maath · gltf-transform (asset pipeline). pnpm.

TypeScript is pinned to 6.0 and ESLint to 9 because eslint-config-next does not support TS 7 / ESLint 10 yet.

## Commands

- `pnpm dev`: dev server on :3000 (preview config: `.claude/launch.json` → `gmc-dev`)
- `pnpm check`: typecheck + lint. Run before calling work done.
- `pnpm build`: production build
- `pnpm assets:optimize [file]`: `assets/source/models/*.glb` → `public/models/*.glb` (meshopt + WebP)
- `node scripts/copy-decoders.mjs`: copies Draco/Basis decoders and GPU benchmarks to `public/decoders`
  (runs on postinstall; run by hand if `public/decoders` is missing)

URL flags: `?debug` (Leva, GPU stats, chapter HUD) · `?tier=0..3` (force a quality tier) · `/lab` (3D sandbox).

## Architecture

**One WebGL context for the whole site.** `src/components/canvas/WebGLCanvas.tsx` is mounted once in the
root layout (via `Providers`), fixed behind the DOM, client-only, and loaded after the page is usable.
Never create another `<Canvas>`.

Two ways to put 3D on a page:
- **`<Stage>`** (`components/canvas/Stage.tsx`): the global full-screen world, tunnelled into the canvas
  with tunnel-rat. Use it for scroll-choreographed scenes (one camera, post-processing). Example: `webgl/scenes/LatticeWorld.tsx`.
- **`<SectionView>`** (`components/canvas/SectionView.tsx`): 3D laid out by a DOM box (cards, panels),
  rendered scissored with its own scene and camera. No global post-processing.

**Render order is explicit** (`components/canvas/renderOrder.ts`): 0.5 reset viewport → 1 stage (or the
EffectComposer) → 2 views. drei `View` leaves the GL viewport at its own box, so the reset is required.
Any new full-screen pass must use these priorities.

**Scroll pipeline:** GSAP ticker drives Lenis (`providers/SmoothScroll.tsx`) → Lenis writes `scroll` in
`lib/scroll.ts` and updates ScrollTrigger → `<Chapter>` ScrollTriggers write `chapterProgress[id]` (0..1)
→ 3D reads them in `useFrame` via `getChapterProgress(id)` and eases with `maath/easing` + `DAMP` tokens.
Per-frame values are mutable module state, never React state.

**Story engine:** chapters are declared in `src/story/chapters.ts` (each tied to question 1, 2 or 3).
Build a chapter as `<Chapter id>` with a tall section + `position: sticky` child; animate 3D against its progress.

**Quality tiers** (`lib/store.ts`, `providers/DeviceProfile.tsx`): 0 = no WebGL (DOM story only), 1 light,
2 standard (phones max out here), 3 full. Gate expensive things on `QUALITY[tier]`. Reduced motion /
Save-Data → native scroll, no reveal motion, same content.

## Conventions

- Import GSAP only from `@/lib/gsap` (registers plugins + house eases `breath`, `settle`). Use `useGSAP`.
- Motion tokens live in `lib/motion.ts`; colours in `webgl/palette.ts` mirrored in `app/globals.css`.
- Text reveals: `<RevealText>` (SplitText line masks, hidden until split, reduced-motion safe).
- 3D assets: sources in `assets/source`, optimised to `public/models`, loaded with `useModel()` from
  `webgl/utils/loaders.ts`. Everything is served from our own origin (GMCA wants local hosting): no CDNs at runtime.
- The BIG masterplan render is always shown whole, still, unaltered and credited. Never animate, filter,
  crop into motion or wipe-slide over it.
- Every number on screen needs a source and an "as of" date.
- New 3D pieces: build and tune in `/lab` first, then move into a chapter.

## Hidden sections

Home-page sections can be switched off without deleting them: `src/lib/features.ts` holds one flag per
section, and `src/app/page.tsx` renders a section only when its flag is `true`. All code, styles, copy and
assets stay in the repo.

- `weave`: "The weave opens onto the city" (the GMC mark with video quadrants and the river, between
  Welcome and About). Currently on (`weave: true`); set it to `false` to hide it again.

## Verified facts (gmc.bt, checked 23 Nov 2026)

- 4,046 km², about 10% of Bhutan; southern plains bordering Assam (India)
- Established by Royal Charter, February 2024, as a highly autonomous SAR with its own executive,
  legislative and independent judicial powers; "One Country, Two Systems"
- Between Royal Manas National Park and Phibsoo Wildlife Sanctuary
- Announced by His Majesty on National Day, 17 December 2023
- Eight core priority industries: Spiritual · Health and Wellness · Education and Knowledge ·
  Agri-Tech and Forestry · Green Energy and Technologies · Finance and Digital Assets · Aviation and Logistics · Tourism
- Energy: hydropower, solar, geothermal

## Art direction status

Not locked. Leading direction: **"The Woven City"**. GMC's lattice logo is a mandala, a city grid and a
weave at once, and the signature idea is that the logo is unfinished until the city is. Palette and type
in the code are PROVISIONAL (marked as such). `LatticeWorld` is an environment proof scene, not final design.
The old static prototype lives in `_archive/prototype-v0/` for reference only.

## Verifying in the Browser pane

When the pane is hidden, the page gets ~3 rAF/sec, so WebGL and GSAP look frozen or empty right after
load. Wait several seconds before screenshots, or ask the user to show the pane.
