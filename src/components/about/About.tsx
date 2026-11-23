'use client'

import { useMemo, useRef } from 'react'

import { about } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { setOnCream } from '@/lib/headerTheme'
import type { Outline } from '@/lib/outline'
import { pointsAlong } from '@/lib/pathPoints'

import { Dissolve } from '../intro/dissolve'
import { drawTopo } from '../intro/topo'
import s from './About.module.css'

const pct = (v: number, of: number) => `${(v / of) * 100}%`
const reachedClass = s.reached ?? 'reached'
const currentClass = s.current ?? 'current'
/** Ring radius and stop-dot radius, in the outline's viewBox units. */
const RING = 15
const DOT = 9
/** Share of each stop's scroll spent holding still before the line moves on. */
const HOLD = 0.35

const pad = (n: number) => String(n).padStart(2, '0')
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * About section. Pinned while you scroll; the eight sectors sit as stops spaced around the GMC outline.
 * Same rule as the loader: the outline is always there and only the yellow line on top moves, in one
 * direction from the ring. At each stop the line pauses, a tag floats above that stop with its sector,
 * and the list on the left lights it up; then the line travels on to the next. After the eighth it closes
 * back at the ring.
 *   left: sector list + count · centre: topo map with the GMC outline · right: about copy
 */
export function About({ outline }: { outline: Outline }) {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const ground = useRef<HTMLCanvasElement>(null)
  const [, , vbW, vbH] = outline.viewBox.split(/[\s,]+/).map(Number) as [number, number, number, number]
  const n = about.stops.length
  const points = useMemo(() => pointsAlong(outline.boundary, n), [outline.boundary, n])

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)

      const draw = () => {
        const c = topo.current
        if (c) drawTopo(c, c.clientWidth, c.clientHeight, '246, 237, 211')
      }
      draw()
      window.addEventListener('resize', draw)

      const line = el.querySelector(`.${s.progress}`) as SVGPathElement
      const len = line.getTotalLength()
      line.style.strokeDasharray = String(len)
      const items = q(`.${s.stop}`)
      const dots = q(`.${s.dot}`)
      const tag = el.querySelector(`.${s.tag}`) as HTMLElement
      const tagNum = el.querySelector(`.${s.tagNum}`) as HTMLElement
      const tagName = el.querySelector(`.${s.tagName}`) as HTMLElement
      const count = el.querySelector(`.${s.count}`) as HTMLElement
      let shown = -1
      const area = new Intl.NumberFormat('en')

      const showStop = (i: number) => {
        if (i === shown) return
        shown = i
        items.forEach((it, j) => {
          it.classList.toggle(reachedClass, j <= i)
          it.classList.toggle(currentClass, j === i)
        })
        dots.forEach((d, j) => d.classList.toggle(reachedClass, j <= i))
        const [x, y] = points[i] ?? [0, 0]
        tagNum.textContent = pad(i + 1)
        tagName.textContent = about.stops[i] ?? ''
        tag.style.left = pct(x, vbW)
        tag.style.top = pct(y, vbH)
        gsap.fromTo(
          tag,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', overwrite: true },
        )
      }

      // Scroll progress p (0..1) → where the line is: hold at stop k, then travel to stop k + 1.
      const update = (p: number) => {
        const x = Math.min(p, 0.99999) * n
        const k = Math.floor(x)
        const local = x - k
        const t = local < HOLD ? 0 : easeInOut((local - HOLD) / (1 - HOLD))
        const f = (k + t) / n
        line.style.strokeDashoffset = String(len * (1 - f))
        // The area counts up with the line and lands on the full figure when the outline closes.
        count.textContent = area.format(Math.round(about.area.value * f))
        showStop(t > 0.97 ? Math.min(n - 1, k + 1) : k)
      }
      update(0)

      // ── After the eighth stop: the whole section dissolves into the Vision page behind it ──
      // The contents fade, then the terra ground breaks into islands rising from the bottom; the
      // Vision section sits still underneath (pinned, see Vision.tsx) and shows through.
      const gc = ground.current
      const gctx = gc?.getContext('2d')
      const content = q(`.${s.rail}, .${s.topo}, .${s.map}, .${s.text}`)
      let dissolve: Dissolve | null = null
      let cancelled = false
      let lastOpen = -1
      const sizeGround = () => {
        if (!gc) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        gc.width = Math.round(el.clientWidth * dpr)
        gc.height = Math.round(el.clientHeight * dpr)
        lastOpen = -1
      }
      sizeGround()
      window.addEventListener('resize', sizeGround)

      const dissolveTo = (d: number) => {
        gsap.set(content, { autoAlpha: 1 - Math.min(1, d / 0.15) })
        setOnCream(d > 0.75)
        // Scroll-driven, so the islands open at the rate you scroll (no time easing).
        const open = Math.min(1, d)
        if (!gc || !gctx || open === lastOpen) return
        lastOpen = open
        if (open <= 0) {
          el.style.background = ''
          gc.style.visibility = 'hidden'
          return
        }
        el.style.background = 'transparent'
        gc.style.visibility = open >= 1 ? 'hidden' : 'visible'
        gctx.globalCompositeOperation = 'source-over'
        gctx.fillStyle = getComputedStyle(gc).color
        gctx.fillRect(0, 0, gc.width, gc.height)
        if (!dissolve) {
          // Islands not built yet: fade the ground instead.
          gc.style.opacity = String(1 - open)
          return
        }
        gc.style.opacity = '1'
        gctx.globalCompositeOperation = 'destination-out'
        gctx.imageSmoothingEnabled = true
        gctx.imageSmoothingQuality = 'high'
        gctx.drawImage(dissolve.render(open), 0, 0, gc.width, gc.height)
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        gsap.to({ p: 0 }, {
          p: 1,
          ease: 'none',
          onUpdate() {
            update(this.targets()[0].p)
          },
          scrollTrigger: { trigger: el, start: 'top 60%', once: true },
        })
      } else {
        // Build the islands while the visitor is on their way down to this section.
        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom+=100%',
          once: true,
          onEnter: () => {
            Dissolve.prepare(el.clientWidth, el.clientHeight, () => cancelled, 'bottom').then((d) => {
              dissolve = d
              lastOpen = -1
            })
          },
        })

        // One pin: the stops take n × 55% of a screen of scrolling, the dissolve one more screen.
        const stopsLen = () => n * 0.55 * window.innerHeight
        const total = () => stopsLen() + window.innerHeight
        gsap.to(
          { p: 0 },
          {
            p: 1,
            ease: 'none',
            onUpdate() {
              const px = this.targets()[0].p * total()
              update(Math.min(1, px / stopsLen()))
              dissolveTo(Math.max(0, (px - stopsLen()) / window.innerHeight))
            },
            scrollTrigger: {
              trigger: el,
              start: 'top top',
              end: () => `+=${total()}`,
              scrub: 0.6,
              pin: true,
              invalidateOnRefresh: true,
            },
          },
        )
      }

      return () => {
        cancelled = true
        window.removeEventListener('resize', draw)
        window.removeEventListener('resize', sizeGround)
        setOnCream(false)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="about" className={s.about}>
      {/* The terra ground, cut into islands when the section dissolves into the next one. */}
      <canvas ref={ground} className={s.ground} aria-hidden />
      {/* Left: the eight sectors, and which one you're at */}
      <div className={s.rail}>
        <ol className={s.stops}>
          {about.stops.map((name, i) => (
            <li key={name} className={`${s.stop} ${i === 0 ? s.flag : ''}`}>
              <span className={s.marker} aria-hidden />
              <span className={s.stopName}>{name}</span>
            </li>
          ))}
        </ol>
        <p className={s.distance}>
          <span className={s.areaLabel}>{about.area.label}</span>
          <span>
            <span className={s.count}>0</span> {about.area.unit}
          </span>
        </p>
        <p className={s.source}>
          Source: {about.area.source} · as of {about.area.asOf}
        </p>
      </div>

      {/* Centre: topo map and the GMC boundary (assets/svg/gmc-outline.svg), as in the loader */}
      <canvas ref={topo} className={s.topo} aria-hidden />
      <div className={s.map} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        <svg viewBox={outline.viewBox} fill="none" aria-hidden>
          <path className={s.base} d={outline.boundary} />
          <path className={s.progress} d={outline.boundary} />
          {/* Stop 1 is the ring (where the line starts and closes); stops 2–8 are dots, in order. */}
          <circle className={`${s.ring} ${s.dot}`} cx={outline.ring[0]} cy={outline.ring[1]} r={RING} />
          {points.slice(1).map(([x, y], i) => (
            <circle key={i} className={s.dot} cx={x} cy={y} r={DOT} />
          ))}
        </svg>
        {/* Floats above the current stop */}
        <div className={s.tag}>
          <p className={s.tagBody} aria-live="polite">
            <span className={s.tagScript}>
              {about.stopLabel} <span className={s.tagNum}>01</span>
            </span>
            <span className={s.tagName}>{about.stops[0]}</span>
          </p>
        </div>
      </div>

      {/* Right: about copy */}
      <div className={s.text}>
        <p className={s.kicker}>{about.script}</p>
        <h2 className={s.heading}>
          {about.heading.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        {about.body.map((para) => (
          <p key={para.slice(0, 24)} className={s.body}>
            {para}
          </p>
        ))}
      </div>
    </section>
  )
}
