// Usage: node scripts/import-3d-map.mjs <unzipped 'GMC City 3D Section'/dist> <folder with our cloud webps> <repo root>
// Re-run when a new build of the 3D section arrives. Our own cloud layers live in public/3d-map/clouds/morning
// (generated, original); pass that folder (or a copy of it) as the second argument.
// Brings the zip's built 3D site into public/3d-map, with our own clouds and every library/font served
// from our own origin (no CDNs).
import fs from 'node:fs'
import path from 'node:path'
const [SRC, CLOUDS, ROOT] = process.argv.slice(2)
const OUT = path.join(ROOT, 'public/3d-map')
fs.rmSync(OUT, { recursive: true, force: true })
fs.cpSync(SRC, OUT, { recursive: true, filter: (p) => !p.includes(`${path.sep}ref-clouds`) })
// our clouds
fs.mkdirSync(path.join(OUT, 'clouds/morning'), { recursive: true })
for (const f of ['far', 'mid', 'near', 'front', 'puff', 'wisp']) fs.copyFileSync(path.join(CLOUDS, `${f}.webp`), path.join(OUT, `clouds/morning/${f}.webp`))

// main page + bundle: paths now live under /3d-map/
const idx = path.join(OUT, 'index.html')
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('src="/assets/', 'src="/3d-map/assets/'))
const bundleDir = path.join(OUT, 'assets')
for (const f of fs.readdirSync(bundleDir).filter((f) => /^index-.*\.js$/.test(f))) {
  const p = path.join(bundleDir, f)
  let s = fs.readFileSync(p, 'utf8')
  const before = s
  s = s.replaceAll('`/ref-clouds/morning/`', '`/3d-map/clouds/morning/`')
  s = s.replaceAll('`ref-clouds/morning/${', '`clouds/morning/${')
  s = s.replaceAll('`/fallback.webp`', '`/3d-map/fallback.webp`')
  s = s.replaceAll('`/landmarks/index.html?embed=gmc`', '`/3d-map/landmarks/index.html?embed=gmc`')
  if (s === before) throw new Error('bundle patch did nothing')
  if (/ref-clouds/.test(s)) throw new Error('ref-clouds still referenced in ' + f)
  fs.writeFileSync(p, s)
}

// vendor: three (+ the addons the landmark pages import, with everything they import in turn)
const TH = path.join(ROOT, 'node_modules/.pnpm/three@0.187.0/node_modules/three')
const V = path.join(OUT, 'vendor')
fs.mkdirSync(path.join(V, 'three/build'), { recursive: true })
for (const f of ['three.module.js', 'three.core.js']) fs.copyFileSync(path.join(TH, 'build', f), path.join(V, 'three/build', f))
const entries = ['controls/OrbitControls.js', 'exporters/GLTFExporter.js', 'geometries/ConvexGeometry.js', 'geometries/RoundedBoxGeometry.js', 'loaders/FBXLoader.js', 'loaders/GLTFLoader.js', 'objects/Reflector.js', 'postprocessing/EffectComposer.js', 'postprocessing/OutputPass.js', 'postprocessing/Pass.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js', 'utils/BufferGeometryUtils.js']
const seen = new Set()
const walk = (rel) => {
  if (seen.has(rel)) return
  seen.add(rel)
  const src = path.join(TH, 'examples/jsm', rel)
  const code = fs.readFileSync(src, 'utf8')
  for (const m of code.matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/g)) walk(path.normalize(path.join(path.dirname(rel), m[1])))
}
entries.forEach(walk)
for (const rel of seen) {
  const dst = path.join(V, 'three/addons', rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(path.join(TH, 'examples/jsm', rel), dst)
}
// gsap (UMD builds, as the page loaded them from cdnjs)
const GS = path.join(ROOT, 'node_modules/.pnpm/gsap@3.15.1/node_modules/gsap/dist')
fs.mkdirSync(path.join(V, 'gsap'), { recursive: true })
for (const f of ['gsap.min.js', 'Observer.min.js', 'CustomEase.min.js']) fs.copyFileSync(path.join(GS, f), path.join(V, 'gsap', f))
// fonts: our faces, served under the family names the pages ask for
fs.mkdirSync(path.join(V, 'fonts'), { recursive: true })
const F = [
  ['src/styles/fonts/Belleza-Regular.ttf', 'Belleza-Regular.ttf'],
  ['src/styles/fonts/CentraNo2-Extrabold.ttf', 'CentraNo2-Extrabold.ttf'],
  ['.next/static/media/c0680f1bdb3a2e90-s.p.1gsd1jahc5dg_.woff2', 'Outfit-latin.woff2'],
  ['.next/static/media/53897e768d329f66-s.p.3t6q91iet4nsy.woff2', 'JetBrainsMono-latin.woff2'],
]
for (const [from, to] of F) fs.copyFileSync(path.join(ROOT, from), path.join(V, 'fonts', to))
const face = (family, file, weight = '400', fmt = 'truetype') => `@font-face{font-family:'${family}';src:url('${file}') format('${fmt}');font-weight:${weight};font-style:normal;font-display:swap}`
fs.writeFileSync(path.join(V, 'fonts/fonts.css'), [
  '/* The 3D pages ask for Marcellus, Jost, Alegreya Sans, Belleza and JetBrains Mono; they get the site\'s own faces. */',
  face('Belleza', 'Belleza-Regular.ttf'),
  face('Marcellus', 'Belleza-Regular.ttf'),
  face('Jost', 'Outfit-latin.woff2', '100 900', 'woff2'),
  face('Alegreya Sans', 'Outfit-latin.woff2', '100 900', 'woff2'),
  face('JetBrains Mono', 'JetBrainsMono-latin.woff2', '100 800', 'woff2'),
].join('\n'))

// landmark pages: point the import map, preloads, gsap and font links at our copies
const pages = [path.join(OUT, 'landmarks/index.html'), ...fs.readdirSync(path.join(OUT, 'landmarks/models/objects')).filter((f) => f.endsWith('.html')).map((f) => path.join(OUT, 'landmarks/models/objects', f))]
for (const p of pages) {
  let s = fs.readFileSync(p, 'utf8')
  s = s.replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/3d-map/vendor/three/build/three.module.js')
  s = s.replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/3d-map/vendor/three/addons/')
  s = s.replace(/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net" crossorigin>\n?/g, '')
  s = s.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/g, '')
  s = s.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2[^"]*">/g, '<link rel="stylesheet" href="/3d-map/vendor/fonts/fonts.css">')
  s = s.replaceAll('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/', '/3d-map/vendor/gsap/')
  if (/https:\/\/(cdn|fonts)/.test(s)) throw new Error('external link left in ' + p)
  fs.writeFileSync(p, s)
}
// anything else still reaching out?
const left = []
const scan = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) scan(p); else if (/\.(html|js|css)$/.test(f.name) && !p.includes(`${path.sep}vendor${path.sep}`)) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/https:\/\/(cdn\.jsdelivr|cdnjs|fonts\.g[a-z]+)[^"'`) ]*/g)) left.push(path.relative(OUT, p) + ': ' + m[0]) } } }
scan(OUT)
console.log('addons copied:', seen.size, '| external links left:', left.length ? left : 'none')
