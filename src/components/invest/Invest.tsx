'use client'

import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'

import { PillButton } from '@/components/ui/PillButton'
import { invest } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { setOnCream } from '@/lib/headerTheme'
import { tilt } from '@/lib/tilt'

import { Dissolve } from '../intro/dissolve'
import { drawTopo } from '../intro/topo'
import s from './Invest.module.css'

/** Hidden below its own bottom edge; wipes up to fully shown. */
const CLOSED = 'inset(100% 0% 0% 0%)'
const OPEN = 'inset(0% 0% 0% 0%)'

function Arrow({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === 'prev' ? <path d="M13 8H3m4-4L3 8l4 4" /> : <path d="M3 8h10M9 4l4 4-4 4" />}
    </svg>
  )
}

/**
 * Invest, for investors.
 *   1 · the numbers (fourth reference recording): pinned; at each step a new full-screen picture wipes up
 *       from the bottom, and with it the card on the right (inset photo, big number, label).
 *   2 · the eight sectors (fifth reference recording), on the terra ground: heading, card row and button pin
 *       as one block and the row pages sideways, four at a time; then the block dissolves into the Stories page.
 */
export function Invest() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const ground = useRef<HTMLCanvasElement>(null)
  const lenis = useLenis()
  const lenisRef = useRef(lenis)
  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])
  const stats = invest.stats
  const sectors = invest.sectors

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const draw = () => {
        const c = topo.current
        if (c) drawTopo(c, c.clientWidth, c.clientHeight, '246, 237, 211')
      }
      draw()
      window.addEventListener('resize', draw)

      // ── 1 · Numbers: hold, then the next picture and card wipe up together ──
      const backs = q(`.${s.back}`)
      const slides = q(`.${s.slide}`)
      // The card is rounded, so its wipe keeps the same corner radius.
      const r = slides[0] ? getComputedStyle(slides[0]).borderTopLeftRadius : '0px'
      const cardClosed = `inset(100% 0% 0% 0% round ${r})`
      const cardOpen = `inset(0% 0% 0% 0% round ${r})`
      gsap.set(backs.slice(1), { clipPath: CLOSED })
      gsap.set(slides.slice(1), { clipPath: cardClosed })
      const HOLD = 0.4
      const tl = gsap.timeline({
        defaults: { ease: reduced ? 'steps(1)' : 'power2.inOut' },
        scrollTrigger: {
          trigger: q(`.${s.stats}`)[0],
          start: 'top top',
          end: () => `+=${(stats.length - 1) * window.innerHeight}`,
          scrub: reduced ? true : 0.6,
          pin: true,
          invalidateOnRefresh: true,
        },
      })
      for (let i = 1; i < stats.length; i++) {
        const at = (i - 1) * (1 + HOLD) + HOLD
        tl.to(backs[i] ?? {}, { clipPath: OPEN, duration: 1 }, at)
        tl.to(slides[i] ?? {}, { clipPath: cardOpen, duration: 1 }, at)
      }
      tl.to({}, { duration: HOLD })

      // ── 2 · Sectors: the row pins in the middle and pages sideways, a page per stretch of scroll ──
      const track = q(`.${s.track}`)[0] as HTMLElement
      const cards = q(`.${s.card}`) as HTMLElement[]
      const prev = q(`.${s.prev}`)[0] as HTMLButtonElement
      const next = q(`.${s.next}`)[0] as HTMLButtonElement
      const perView = () => Number(getComputedStyle(track).getPropertyValue('--per')) || 4
      const pages = () => Math.max(1, Math.ceil(cards.length / perView()))
      let page = -1

      const goTo = (k: number, instant = false) => {
        const last = pages() - 1
        k = Math.max(0, Math.min(last, k))
        prev.disabled = k === 0
        next.disabled = k === last
        if (k === page && !instant) return
        page = k
        const x = -(cards[k * perView()]?.offsetLeft ?? 0)
        gsap.to(track, { x, duration: instant || reduced ? 0 : 0.9, ease: 'power3.inOut', overwrite: true })
      }

      // The heading and the row pin together as one block (so nothing drifts apart). It is laid out to
      // fit one screen; if a short screen can't fit it, it pins once its bottom reaches the bottom.
      // After the last page it stays pinned one more screen and dissolves away (like About → Vision):
      // the contents fade, then the terra ground breaks into islands over the Stories page waiting below.
      const block = q(`.${s.sectors}`)[0] as HTMLElement
      const pagesLen = () => (pages() - 1) * window.innerHeight
      const total = () => pagesLen() + (reduced ? 0 : window.innerHeight)

      const gc = ground.current
      const gctx = gc?.getContext('2d')
      const content = q(`.${s.head}, .${s.stage}, .${s.cta}, .${s.topo}`)
      let dissolve: Dissolve | null = null
      let cancelled = false
      let lastOpen = -1
      const sizeGround = () => {
        if (!gc) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        gc.width = Math.round(block.clientWidth * dpr)
        gc.height = Math.round(block.clientHeight * dpr)
        lastOpen = -1
      }
      sizeGround()
      window.addEventListener('resize', sizeGround)

      const dissolveTo = (d: number) => {
        gsap.set(content, { autoAlpha: 1 - Math.min(1, d / 0.15) })
        if (d > 0) setOnCream(d > 0.75)
        const open = Math.min(1, d)
        if (!gc || !gctx || open === lastOpen) return
        lastOpen = open
        if (open <= 0) {
          block.style.background = ''
          gc.style.visibility = 'hidden'
          return
        }
        block.style.background = 'transparent'
        gc.style.visibility = open >= 1 ? 'hidden' : 'visible'
        gctx.globalCompositeOperation = 'source-over'
        gctx.fillStyle = getComputedStyle(gc).color
        gctx.fillRect(0, 0, gc.width, gc.height)
        if (!dissolve) {
          gc.style.opacity = String(1 - open)
          return
        }
        gc.style.opacity = '1'
        gctx.globalCompositeOperation = 'destination-out'
        gctx.imageSmoothingEnabled = true
        gctx.imageSmoothingQuality = 'high'
        gctx.drawImage(dissolve.render(open), 0, 0, gc.width, gc.height)
      }

      if (!reduced) {
        ScrollTrigger.create({
          trigger: block,
          start: 'top bottom+=100%',
          once: true,
          onEnter: () => {
            Dissolve.prepare(block.clientWidth, block.clientHeight, () => cancelled, 'bottom').then((d) => {
              dissolve = d
              lastOpen = -1
            })
          },
        })
      }

      const pin = ScrollTrigger.create({
        trigger: block,
        start: () => (block.offsetHeight > window.innerHeight + 1 ? 'bottom bottom' : 'top top'),
        end: () => `+=${total()}`,
        pin: !reduced,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const px = self.progress * total()
          const len = pagesLen()
          goTo(Math.round(Math.min(1, len ? px / len : 1) * (pages() - 1)))
          if (!reduced) dissolveTo(Math.max(0, (px - len) / window.innerHeight))
        },
        onRefresh: (self) => goTo(Math.round(Math.min(1, (self.progress * total()) / (pagesLen() || 1)) * (pages() - 1)), true),
      })

      // Prev / Next scroll to that page's spot in the pin (in reduced motion they just switch the page).
      const step = (d: number) => {
        const k = Math.max(0, Math.min(pages() - 1, page + d))
        if (reduced || pages() < 2) return goTo(k)
        const y = pin.start + (k / (pages() - 1)) * pagesLen()
        if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1 })
        else window.scrollTo({ top: y, behavior: 'smooth' })
      }
      const onPrev = () => step(-1)
      const onNext = () => step(1)
      prev.addEventListener('click', onPrev)
      next.addEventListener('click', onNext)

      // Hover tilt on each sector card.
      const offTilt = tilt(cards)

      return () => {
        offTilt()
        cancelled = true
        window.removeEventListener('resize', draw)
        window.removeEventListener('resize', sizeGround)
        prev.removeEventListener('click', onPrev)
        next.removeEventListener('click', onNext)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="invest" className={s.invest}>
      {/* 1 · The numbers */}
      <div className={s.stats}>
        <div className={s.backs} aria-hidden>
          {stats.map((st, i) => (
            <div key={i} className={s.back}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={st.background} alt="" loading="lazy" />
            </div>
          ))}
        </div>
        <div className={s.shade} aria-hidden />

        <div className={s.statCard}>
          {stats.map((st, i) => (
            <article key={i} className={s.slide}>
              <div className={s.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={st.photo} alt="" loading="lazy" />
              </div>
              <div className={s.info}>
                <p className={s.value}>
                  {st.value}
                  {st.unit && <span className={s.unit}>{st.unit}</span>}
                </p>
                <div className={s.meta}>
                  <p className={s.label}>{st.label}</p>
                  <p className={s.source}>
                    Source: {st.source} · as of {st.asOf}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 2 · The eight sectors */}
      <div className={s.sectors}>
        {/* The terra ground, cut into islands when the block dissolves into the Stories page. */}
        <canvas ref={ground} className={s.ground} aria-hidden />
        <canvas ref={topo} className={s.topo} aria-hidden />

        <header className={s.head}>
          <p className={s.lead}>
            <span className={s.script}>{sectors.script}</span>
            <span className={s.kicker}>{sectors.kicker}</span>
          </p>
          <h2 className={s.title}>
            {sectors.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className={s.body}>{sectors.body}</p>
        </header>

        <div className={s.stage}>
          <button type="button" className={`${s.nav} ${s.prev}`} aria-label="Previous sectors">
            <span className={s.diamond}>
              <Arrow dir="prev" />
            </span>
            {sectors.prev}
          </button>

          <div className={s.window}>
            <ul className={s.track}>
              {sectors.items.map((it) => (
                <li key={it.name} className={s.card}>
                  <div className={s.cardImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image} alt="" loading="lazy" />
                  </div>
                  <h3 className={s.cardTitle}>{it.name}</h3>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" className={`${s.nav} ${s.next}`} aria-label="Next sectors">
            <span className={s.diamond}>
              <Arrow dir="next" />
            </span>
            {sectors.next}
          </button>
        </div>

        <div className={s.cta}>
          <PillButton href={sectors.cta.href}>
            {sectors.cta.label}
          </PillButton>
        </div>
      </div>
    </section>
  )
}
