'use client'

import { useRef } from 'react'

import { welcome } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { setWelcomeColoured } from '@/lib/headerTheme'

import { Dissolve } from '../intro/dissolve'
import { drawTopo } from '../intro/topo'
import s from './Welcome.module.css'

/** How far each card ends up above its spot (in % of its height); it starts 1.6× that far below. Different speeds = depth. */
const DRIFT = [-60, -35, -80, -25, -45, -70]
/** On the way out, how far each card travels up beyond the scroll itself (× screen height): faster than the text. */
const EXIT = [0.55, 0.7, 0.5, 0.85, 0.75, 0.95]
const leavingClass = s.leaving ?? 'leaving'
/** Space left between the title and the next section on narrow screens (wide screens have about the same). */
const GAP_BELOW = 64

/**
 * Welcome page under the hero, rebuilt from the second reference recording:
 *   cream paper with a faint topo map, "WELCOME to …" and a huge stacked title
 *   → pinned; scrolling breaks the cream into islands rising from the bottom, revealing the
 *     section colour; the title turns cream and the photo cards rise through at different speeds
 *   → fully coloured, it unpins and the About section follows.
 */
export function Welcome() {
  const root = useRef<HTMLElement>(null)
  const paper = useRef<HTMLCanvasElement>(null)

  useGSAP(
    () => {
      const el = root.current
      const pc = paper.current
      const pctx = pc?.getContext('2d')
      if (!el || !pc || !pctx) return
      const q = gsap.utils.selector(el)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let cancelled = false
      let dissolve: Dissolve | null = null
      const state = { t: 0 }

      // The cream "paper": fill + faint topo, with dissolve holes cut out of it.
      const topoCanvas = document.createElement('canvas')
      const paint = () => {
        pctx.globalCompositeOperation = 'source-over'
        pctx.globalAlpha = 1
        pctx.fillStyle = getComputedStyle(el).getPropertyValue('--paper').trim() || '#ece4ce'
        pctx.fillRect(0, 0, pc.width, pc.height)
        pctx.globalAlpha = 0.7
        // skip the topo until it has a size (drawing a 0×0 canvas throws)
        if (topoCanvas.width > 0 && topoCanvas.height > 0) pctx.drawImage(topoCanvas, 0, 0, pc.width, pc.height)
        pctx.globalAlpha = 1
        pc.style.visibility = state.t >= 1 ? 'hidden' : 'visible'
        // Islands not built yet: fade the paper instead.
        pc.style.opacity = dissolve ? '1' : String(1 - state.t)
        if (dissolve && state.t > 0 && pc.width > 0 && pc.height > 0) {
          pctx.globalCompositeOperation = 'destination-out'
          pctx.imageSmoothingEnabled = true
          pctx.drawImage(dissolve.render(state.t), 0, 0, pc.width, pc.height)
        }
      }
      const resize = () => {
        const w = el.clientWidth
        const h = el.clientHeight
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        pc.width = Math.round(w * dpr)
        pc.height = Math.round(h * dpr)
        drawTopo(topoCanvas, w, h)
        paint()
      }
      resize()
      window.addEventListener('resize', resize)

      Dissolve.prepare(el.clientWidth, el.clientHeight, () => cancelled, 'bottom').then((d) => {
        dissolve = d
        paint()
      })

      const inners = q(`.${s.cardInner}`)
      const cards = q(`.${s.card}`)
      const ink = q(`.${s.lead}, .${s.title}`)

      // On narrow screens the title only fills the top half of this full-screen section, which left a
      // half-screen of empty terra before the next section. The next section is pulled up under it so
      // the gap below the title matches wide screens. This section sits above it so the photos still fly
      // out over everything, and its own ground stops where the next section starts (--pull). Behind it,
      // the pin's spacer is painted terra down to the same line, so the two read as one orange ground at
      // every scroll position: nothing moves with the scroll, so nothing can lag a frame and flash.
      const after = el.nextElementSibling instanceof HTMLElement ? el.nextElementSibling : null
      const title = q(`.${s.title}`)[0] as HTMLElement | undefined
      const ground = (p: number) => `linear-gradient(var(--c-terra), var(--c-terra)) top / 100% calc(100% - ${p}px) no-repeat`
      const pullUp = () => {
        if (!after || !title) return
        const spare = el.offsetHeight - (title.getBoundingClientRect().bottom - el.getBoundingClientRect().top) - GAP_BELOW
        const p = spare > 40 ? Math.round(spare) : 0
        el.dataset.pulled = String(p > 0)
        el.style.setProperty('--pull', `${p}px`)
        after.style.marginTop = p ? `${-p}px` : ''
        const spacer = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : null
        if (spacer) spacer.style.background = p ? ground(p) : ''
      }
      pullUp()
      ScrollTrigger.addEventListener('refreshInit', pullUp)
      const offPull = () => {
        ScrollTrigger.removeEventListener('refreshInit', pullUp)
        if (after) after.style.marginTop = ''
      }

      if (reduced) {
        // Same content, no motion: straight to the coloured state once the page arrives.
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          once: true,
          onEnter: () => {
            gsap.set(pc, { autoAlpha: 0 })
            gsap.set(ink, { color: 'var(--c-hero-text)' })
            setWelcomeColoured(true)
          },
        })
        return () => {
          cancelled = true
          offPull()
          window.removeEventListener('resize', resize)
        }
      }

      // Pinned and driven by scroll: the page holds still on the cream paper, then as you scroll the
      // paper breaks into islands rising from the bottom to reveal the terra, the title turns cream,
      // and the photo cards rise through the section at different speeds (depth). Fully terra, it lets
      // go and the About section follows.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=160%',
          scrub: 0.6,
          pin: true,
        },
        onUpdate: () => setWelcomeColoured(state.t > 0.45),
      })
      tl.to(state, { t: 1, duration: 0.6, onUpdate: paint }, 0.08)
      tl.to(ink, { color: 'var(--c-hero-text)', duration: 0.22, ease: 'power1.inOut' }, 0.24)
      tl.fromTo(
        inners,
        { autoAlpha: 0, scale: 0.82 },
        { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'back.out(1.4)', stagger: { each: 0.05, from: 'random' } },
        0.12,
      )
      cards.forEach((card, i) => {
        const drift = DRIFT[i % DRIFT.length]!
        tl.fromTo(card, { yPercent: -drift * 1.6 }, { yPercent: drift, duration: 1 }, 0)
      })

      // ── Leaving: once the pin lets go, the copy scrolls away at normal speed while the photos
      // overtake it, rushing up and out over the title (each at its own pace, for depth).
      const pin = tl.scrollTrigger!
      pullUp() // now that the spacer exists, paint it
      const exit = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: () => pin.end,
          end: () => pin.end + el.offsetHeight,
          scrub: 0.4,
          invalidateOnRefresh: true,
          // all the photos pass in front of the title on the way out
          onUpdate: (self) => el.classList.toggle(leavingClass, self.progress > 0),
          onLeaveBack: () => el.classList.remove(leavingClass),
        },
      })
      cards.forEach((card, i) => {
        exit.fromTo(card, { y: 0 }, { y: () => -window.innerHeight * EXIT[i % EXIT.length]!, duration: 1 }, 0)
      })

      return () => {
        cancelled = true
        offPull()
        window.removeEventListener('resize', resize)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="welcome" className={s.welcome}>
      <canvas ref={paper} className={s.paper} aria-hidden />

      <div className={s.cards} aria-hidden>
        {welcome.cards.map((src, i) => (
          <div key={i} className={`${s.card} ${s[`c${i + 1}`]}`}>
            <div className={s.cardInner}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </div>
          </div>
        ))}
      </div>

      <div className={s.copy}>
        <p className={s.lead}>
          {welcome.lead.before} <span className={s.script}>{welcome.lead.script}</span> {welcome.lead.after}
        </p>
        <h2 className={s.title}>
          {welcome.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      </div>
    </section>
  )
}
