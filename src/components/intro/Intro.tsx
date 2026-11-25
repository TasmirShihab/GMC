'use client'

import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'

import { intro } from '@/content/home'
import { gsap, useGSAP } from '@/lib/gsap'
import type { Outline } from '@/lib/outline'
import { useExperience } from '@/lib/store'

import { Dissolve, openAt } from './dissolve'
import s from './Intro.module.css'
import { drawTopo } from './topo'

/**
 * Home loader, rebuilt from the reference recording (4s → end):
 *   topo map fades up with the GMC outline and its ring already in place → counter + "loading the
 *   experience" → fact → the loading line runs over the outline in one direction, following the counter
 *   → at 100 the loader fades and dissolves straight into the hero
 *   → counter creeps to 6, waits for the page to be ready, rushes to 100 (dark stroke follows)
 *   → the number slides into the title, other words fade in → hold → loader fades
 *   → ragged islands dissolve it away to reveal the hero.
 */

/** Wait for fonts and any hero media marked data-intro-wait, capped so a slow file never blocks. */
function pageReady(timeout = 8000) {
  const media = Array.from(
    document.querySelectorAll<HTMLImageElement | HTMLVideoElement>('[data-intro-wait]'),
  ).map(
    (el) =>
      new Promise<void>((resolve) => {
        if (el instanceof HTMLImageElement ? el.complete : el.readyState >= 3) return resolve()
        el.addEventListener(el instanceof HTMLImageElement ? 'load' : 'canplaythrough', () => resolve(), {
          once: true,
        })
        el.addEventListener('error', () => resolve(), { once: true })
      }),
  )
  return Promise.race([
    Promise.all([document.fonts.ready, ...media]).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ])
}

/** Counter steps over the first 3.2s, as in the reference (it creeps, then rushes once loaded). */
const CREEP: [number, number][] = [
  [0.8, 1],
  [1.2, 2],
  [1.8, 3],
  [2.3, 4],
  [2.9, 5],
  [3.2, 6],
]

/** Ring radius in the outline's viewBox units. */
const RING = 15

export function Intro({ outline }: { outline: Outline }) {
  const root = useRef<HTMLDivElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const paper = useRef<HTMLCanvasElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const lenis = useLenis()
  const phase = useExperience((st) => st.intro)

  // Hold the page still until the hero is revealed.
  useEffect(() => {
    if (!lenis) return
    if (phase === 'done') lenis.start()
    else lenis.stop()
  }, [lenis, phase])

  useEffect(() => {
    const draw = () => topo.current && drawTopo(topo.current, window.innerWidth, window.innerHeight)
    draw()
    let t: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(draw, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)
      const setIntro = useExperience.getState().setIntro
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const ready = pageReady()
      let cancelled = false
      let textMask: string | null = null

      const number = q(`.${s.number}`)[0] as HTMLElement
      // The boundary outline is always there; only the loading line on top of it moves, following the counter.
      const progress = Array.from(el.querySelectorAll<SVGPathElement>(`.${s.progress}`)).map((p) => {
        const len = p.getTotalLength()
        p.style.strokeDasharray = String(len)
        p.style.strokeDashoffset = String(len)
        return { p, len }
      })

      const counter = { v: 0 }
      const showCount = () => {
        number.textContent = String(Math.round(counter.v))
        progress.forEach(({ p, len }) => (p.style.strokeDashoffset = String(len * (1 - counter.v / 100))))
      }

      if (reduced) {
        setIntro('loading')
        ready.then(() => {
          if (cancelled) return
          setIntro('reveal')
          gsap.to(el, {
            autoAlpha: 0,
            duration: 0.4,
            onComplete: () => setIntro('done'),
          })
        })
        return () => {
          cancelled = true
        }
      }

      // Build the dissolve field while the counter runs, plus one mask frame for the text layer.
      const dissolvePromise = Dissolve.prepare(window.innerWidth, window.innerHeight, () => cancelled)
        .then(async (d) => {
          if (d) textMask = await d.cssMask(openAt(0.3))
          return d
        })
        .catch(() => null)

      // ── Part 1: fixed opening, up to the creep at 6 ──────────────────────────
      const a = gsap.timeline()
      a.fromTo(topo.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, ease: 'power1.out' }, 0)
      a.fromTo(
        q(`.${s.counter}`),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.5, ease: 'power1.out' },
        0.55,
      )
      CREEP.forEach(([t, v]) => a.call(() => ((counter.v = v), showCount()), undefined, t))
      a.fromTo(q(`.${s.factLabel}`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.4)
      a.fromTo(q(`.${s.factLines}`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.55)
      a.to({}, { duration: 0.3 }, 3.2) // hold on 6 until 3.5s

      const run = async () => {
        await a
        await ready
        if (cancelled) return

        // ── Part 2: rush to 100, hold a beat on the closed outline, then fade into the dissolve ──
        const b = gsap.timeline()
        b.to(counter, { v: 100, duration: 0.6, ease: 'power2.in', onUpdate: showCount })
        const t0 = b.duration()
        // Loader contents fade (about half gone when the dissolve starts).
        b.to(
          [topo.current, number, q(`.${s.loading}`), q(`.${s.route}`), q(`.${s.fact}`)],
          { opacity: 0, duration: 0.9, ease: 'power1.in' },
          t0 + 0.35,
        )
        await b.tweenTo(t0 + 0.8)
        const d = await dissolvePromise
        if (cancelled) return

        // ── Part 3: dissolve into the hero ──────────────────────────────────
        setIntro('reveal')
        const pc = paper.current
        const pctx = pc?.getContext('2d')
        if (!d || !pc || !pctx || !topo.current || !content.current) {
          await gsap.to(el, { autoAlpha: 0, duration: 0.6 })
        } else {
          // The paper (cream + topo) moves into one canvas and islands are cut out of it each frame.
          const topoCanvas = topo.current
          const paperColor = getComputedStyle(el).backgroundColor
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          pc.width = Math.round(window.innerWidth * dpr)
          pc.height = Math.round(window.innerHeight * dpr)
          const topoAlpha = { v: Number(gsap.getProperty(topoCanvas, 'opacity')) }
          const draw = (t: number) => {
            pctx.globalCompositeOperation = 'source-over'
            pctx.globalAlpha = 1
            pctx.fillStyle = paperColor
            pctx.fillRect(0, 0, pc.width, pc.height)
            if (topoAlpha.v > 0.002) {
              pctx.globalAlpha = topoAlpha.v
              if (topoCanvas.width > 0 && topoCanvas.height > 0) pctx.drawImage(topoCanvas, 0, 0, pc.width, pc.height)
              pctx.globalAlpha = 1
            }
            pctx.globalCompositeOperation = 'destination-out'
            pctx.imageSmoothingEnabled = true
            pctx.imageSmoothingQuality = 'high'
            pctx.drawImage(d.render(openAt(t)), 0, 0, pc.width, pc.height)
          }
          draw(0)
          pc.style.visibility = 'visible'
          el.style.background = 'transparent'
          topoCanvas.style.visibility = 'hidden'

          // Text, route and fact are already fading; cut them with an early mask frame so no
          // words float over the hero while they go.
          if (textMask) {
            const cs = content.current.style
            for (const p of ['mask', '-webkit-mask']) {
              cs.setProperty(`${p}-image`, `url(${textMask})`)
              cs.setProperty(`${p}-size`, '100% 100%')
              cs.setProperty(`${p}-repeat`, 'no-repeat')
            }
          }
          b.kill()
          gsap.to(topoAlpha, { v: 0, duration: 0.3, ease: 'power1.in' })
          gsap.to(content.current, { opacity: 0, duration: 0.2, ease: 'power1.in' })
          const p = { t: 0 }
          await gsap.to(p, { t: 1, duration: 0.8, ease: 'none', onUpdate: () => draw(p.t) })
        }
        if (cancelled) return
        gsap.set(el, { display: 'none' })
        setIntro('done')
      }
      run()

      return () => {
        cancelled = true
        if (textMask) URL.revokeObjectURL(textMask)
      }
    },
    { scope: root },
  )

  return (
    <div ref={root} className={s.intro} aria-hidden={phase === 'done'} role="status" aria-label="Loading">
      <canvas ref={topo} className={s.topo} />
      <canvas ref={paper} className={s.paper} aria-hidden />

      <div ref={content} className={s.content}>
        <div className={s.counter}>
          <span className={s.number}>0</span>
          <p className={s.loading}>
            {intro.loading.before} <span className={s.script}>{intro.loading.script}</span>{' '}
            {intro.loading.after}
          </p>
        </div>

        {/* GMC boundary (assets/svg/gmc-outline.svg): one path, one direction, starting and closing at the ring. */}
        <svg className={s.route} viewBox={outline.viewBox} fill="none" aria-hidden>
          <path className={s.base} d={outline.boundary} />
          <path className={s.progress} d={outline.boundary} />
          {/* Where the loading line starts and closes. */}
          <g transform={`translate(${outline.ring[0]} ${outline.ring[1]})`}>
            <circle className={s.ringStart} r={RING} />
          </g>
        </svg>

        <div className={s.fact}>
          <p className={s.factLabel}>{intro.fact.label}</p>
          <p className={s.factLines}>
            {intro.fact.lines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}
