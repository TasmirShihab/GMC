'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PillButton } from '@/components/ui/PillButton'
import { header, stories } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { setOnCream } from '@/lib/headerTheme'
import type { Outline } from '@/lib/outline'
import { ridgeProfile } from '@/lib/pathPoints'

import { Dissolve, openAt } from '../intro/dissolve'
import { drawTopo } from '../intro/topo'
import s from './Stories.module.css'

const items = stories.items
const N = items.length
/** Seconds each story stays before the next one comes in (the dash at the top fills over this time). */
const AUTOPLAY = 7
/** Pathway geometry, in SVG units: one stop is UNIT wide; the line is H tall with PAD above and below. */
const UNIT = 100
const H = 80
const PAD = 14
/** Ridge samples per period (one period = one pass of all N stops: the ridge west → east, then back). */
const HALF = 90
const COPIES = 3

const mod = (a: number, n: number) => ((a % n) + n) % n

function Arrow({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === 'prev' ? <path d="M13 8H3m4-4L3 8l4 4" /> : <path d="M3 8h10M9 4l4 4-4 4" />}
    </svg>
  )
}

/** Draw an image into a canvas the way object-fit: cover would show it. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth || 1
  const ih = img.naturalHeight || 1
  const sc = Math.max(w / iw, h / ih)
  const dw = iw * sc
  const dh = ih * sc
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

/**
 * Stories: what each of the eight sectors could look like. Rebuilt from the sixth reference recording:
 *   cream heading block, then a rounded card that fills the screen with the story's picture,
 *   the GMC mark (the section's signature), the sector as a big title, Read the story, Prev / Next,
 *   progress dashes on top, and along the bottom a pathway (the GMC outline's ridge, in the yellow
 *   route line) with a round stop per story; the current stop sits large in the middle.
 *   Changing story dissolves the picture away in islands, as the loader does.
 * It waits pinned underneath while the Investor block above dissolves away (Invest.tsx).
 */
export function Stories({ outline }: { outline: Outline }) {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLCanvasElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // Mutable state used by the imperative parts.
  const st = useRef({ pos: N, busy: false, dissolve: null as Dissolve | null, inView: false, hover: false })
  const timer = useRef<gsap.core.Tween | null>(null)
  const goRef = useRef<(d: number, to?: number) => void>(() => undefined)

  // ── The pathway: the ridge of the GMC outline, run west → east then back, repeated ──
  const { linePath, stopY } = useMemo(() => {
    const ridge = ridgeProfile(outline.boundary, HALF)
    const period = [...ridge, ...ridge.slice().reverse()] // seamless: ends meet
    const P = period.length
    const yAt = (u: number) => {
      // u in stops (0..N), position along one period
      const f = (mod(u, N) / N) * P
      const i = Math.floor(f)
      const t = f - i
      const a = period[i % P]!
      const b = period[(i + 1) % P]!
      return PAD + (a + (b - a) * t) * (H - PAD * 2)
    }
    const total = N * COPIES
    const steps = P * COPIES
    let d = ''
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * total
      d += `${k ? 'L' : 'M'}${(u * UNIT).toFixed(1)} ${yAt(u).toFixed(1)} `
    }
    return { linePath: d, stopY: (k: number) => yAt(k + 0.5) }
  }, [outline.boundary])

  // Slide the strip so stop `pos` sits in the middle of the card.
  const placeStrip = useCallback((instant: boolean) => {
    const c = card.current
    const el = strip.current
    if (!c || !el) return
    const sp = parseFloat(getComputedStyle(el).getPropertyValue('--sp')) || 200
    const x = c.clientWidth / 2 - (st.current.pos + 0.5) * sp
    gsap.to(el, {
      x,
      duration: instant ? 0 : 1,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => {
        // Keep the position in the middle copy, so the path never runs out either way.
        const p = st.current.pos
        if (p < N || p >= 2 * N) {
          st.current.pos = N + mod(p, N)
          placeStrip(true)
        }
      },
    })
  }, [])

  // Restart the progress dash for the current story (autoplay), unless paused.
  const restartTimer = useCallback(() => {
    timer.current?.kill()
    const dash = root.current?.querySelector<HTMLElement>(`.${s.dash}[data-on="true"] i`)
    root.current?.querySelectorAll<HTMLElement>(`.${s.dash} i`).forEach((i) => gsap.set(i, { scaleX: 0 }))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!dash || reduced) return
    timer.current = gsap.fromTo(
      dash,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: AUTOPLAY,
        ease: 'none',
        paused: !st.current.inView || st.current.hover,
        onComplete: () => goRef.current(1),
      },
    )
  }, [])

  /** Move by d stories (or to an index with `to`). The picture dissolves away into the next one. */
  const go = useCallback(
    (d: number, to?: number) => {
      const S = st.current
      const c = card.current
      const cv = veil.current
      const from = mod(S.pos, N)
      const target = to ?? mod(from + d, N)
      if (target === from || S.busy) return
      // shortest way round along the path
      let delta = target - from
      if (delta > N / 2) delta -= N
      if (delta < -N / 2) delta += N
      S.pos += delta

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const oldImg = c?.querySelector<HTMLImageElement>(`.${s.photo}[data-i="${from}"] img`)
      const ctx = cv?.getContext('2d')
      if (!reduced && S.dissolve && c && cv && ctx && oldImg?.complete) {
        S.busy = true
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        cv.width = Math.round(c.clientWidth * dpr)
        cv.height = Math.round(c.clientHeight * dpr)
        const dissolve = S.dissolve
        const paint = (t: number) => {
          ctx.globalCompositeOperation = 'source-over'
          ctx.clearRect(0, 0, cv.width, cv.height)
          drawCover(ctx, oldImg, cv.width, cv.height)
          if (t > 0) {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.imageSmoothingEnabled = true
            ctx.drawImage(dissolve.render(openAt(t)), 0, 0, cv.width, cv.height)
          }
        }
        paint(0)
        cv.style.visibility = 'visible'
        const p = { t: 0 }
        gsap.to(p, {
          t: 1,
          duration: 1,
          ease: 'none',
          onUpdate: () => paint(p.t),
          onComplete: () => {
            cv.style.visibility = 'hidden'
            S.busy = false
          },
        })
      }
      setActive(target)
      placeStrip(reduced)
    },
    [placeStrip],
  )

  useEffect(() => {
    goRef.current = go
  }, [go])

  // Each new story: text comes in, the strip moves, the dash restarts.
  useEffect(() => {
    const t = textRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (t && !reduced) {
      gsap.fromTo(
        t.children,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.25 },
      )
    }
    restartTimer()
  }, [active, restartTimer])

  useGSAP(
    () => {
      const el = root.current
      const c = card.current
      if (!el || !c) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let cancelled = false

      const draw = () => {
        const t = topo.current
        if (t) drawTopo(t, t.clientWidth, t.clientHeight)
        const sp = Math.max(150, c.clientWidth * 0.2)
        strip.current?.style.setProperty('--sp', `${sp}px`)
        placeStrip(true)
      }
      draw()
      window.addEventListener('resize', draw)

      // Wait pinned, still, under the Investor block while it dissolves away (CSS pulls this section up).
      if (!reduced) {
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight}`,
          pin: true,
          invalidateOnRefresh: true,
        })
      }

      // Build the islands field for the picture changes once the section is close.
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom+=100%',
        once: true,
        onEnter: () => {
          if (reduced) return
          Dissolve.prepare(c.clientWidth, c.clientHeight, () => cancelled, 'center').then((d) => {
            st.current.dissolve = d
          })
        },
      })

      // Autoplay only while the card is on screen. Header: brown over the cream heading, light over the card.
      ScrollTrigger.create({
        trigger: c,
        pinnedContainer: reduced ? undefined : el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          st.current.inView = self.isActive
          if (self.isActive && !st.current.hover) timer.current?.play()
          else timer.current?.pause()
        },
      })
      ScrollTrigger.create({
        trigger: c,
        pinnedContainer: reduced ? undefined : el,
        start: 'top top+=40',
        onEnter: () => setOnCream(false),
        onLeaveBack: () => setOnCream(true),
      })

      const onEnterCard = () => {
        st.current.hover = true
        timer.current?.pause()
      }
      const onLeaveCard = () => {
        st.current.hover = false
        if (st.current.inView) timer.current?.play()
      }
      c.addEventListener('pointerenter', onEnterCard)
      c.addEventListener('pointerleave', onLeaveCard)

      return () => {
        cancelled = true
        timer.current?.kill()
        window.removeEventListener('resize', draw)
        c.removeEventListener('pointerenter', onEnterCard)
        c.removeEventListener('pointerleave', onLeaveCard)
      }
    },
    { scope: root },
  )

  const story = items[active]!
  return (
    <section ref={root} id="stories" className={s.stories}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <header className={s.head}>
        <p className={s.lead}>
          <span className={s.script}>{stories.script}</span>
          <span className={s.kicker}>{stories.kicker}</span>
        </p>
        <h2 className={s.title}>
          {stories.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p className={s.body}>{stories.body}</p>
      </header>

      <div ref={card} className={s.card} aria-roledescription="carousel" aria-label="Sector stories">
        {/* All pictures stacked; the current one on top. */}
        {items.map((it, i) => (
          <div key={it.name} className={s.photo} data-i={i} data-on={i === active} aria-hidden={i !== active}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt="" loading={i < 2 ? 'eager' : 'lazy'} />
          </div>
        ))}
        {/* The outgoing picture, cut away in islands over the new one. */}
        <canvas ref={veil} className={s.veil} aria-hidden />
        <div className={s.shade} aria-hidden />

        {/* Progress: one dash per story; the current one fills while it plays. */}
        <div className={s.dashes}>
          {items.map((it, i) => (
            <button
              key={it.name}
              type="button"
              className={s.dash}
              data-on={i === active}
              aria-label={`Story ${i + 1}: ${it.name}`}
              aria-current={i === active}
              onClick={() => go(0, i)}
            >
              <i />
            </button>
          ))}
        </div>

        <div ref={textRef} className={s.text} aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.mark} src={header.logo} alt="" />
          <h3 className={s.storyTitle}>{story.name}</h3>
          <PillButton href={story.href}>{stories.read}</PillButton>
        </div>

        <button type="button" className={`${s.nav} ${s.prev}`} onClick={() => go(-1)}>
          <span className={s.diamond}>
            <Arrow dir="prev" />
          </span>
          {stories.prev}
        </button>
        <button type="button" className={`${s.nav} ${s.next}`} onClick={() => go(1)}>
          {stories.next}
          <span className={s.diamond}>
            <Arrow dir="next" />
          </span>
        </button>

        {/* The pathway: the GMC outline's ridge with a stop per story (three copies, so it never ends). */}
        <div className={s.path}>
          <div ref={strip} className={s.strip}>
            <svg
              className={s.line}
              viewBox={`0 0 ${N * COPIES * UNIT} ${H}`}
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <path d={linePath} vectorEffect="non-scaling-stroke" />
            </svg>
            {Array.from({ length: N * COPIES }, (_, k) => {
              const i = k % N
              const it = items[i]!
              return (
                <button
                  key={k}
                  type="button"
                  className={s.stop}
                  data-on={i === active}
                  tabIndex={k >= N && k < 2 * N ? 0 : -1}
                  aria-hidden={k < N || k >= 2 * N}
                  aria-label={it.name}
                  style={{ left: `calc(var(--sp) * ${k + 0.5})`, top: `${(stopY(k) / H) * 100}%` }}
                  onClick={() => go(0, i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt="" loading="lazy" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
