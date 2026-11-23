'use client'

import { useRef } from 'react'

import { RevealText } from '@/components/dom/RevealText'
import { PillButton } from '@/components/ui/PillButton'
import { vision } from '@/content/home'
import { ScrollTrigger, useGSAP } from '@/lib/gsap'
import { setOnCream } from '@/lib/headerTheme'

import { drawTopo } from '../intro/topo'
import s from './Vision.module.css'

/**
 * The Vision, rebuilt from the third reference recording:
 *   the whole About section dissolves away (About.tsx) while this page waits still underneath it
 *   → script line, small caps, big two-line title, the rounded image, the quote.
 * The image is shown whole and still (BIG render rule).
 */
export function Vision() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const draw = () => {
        const t = topo.current
        if (t) drawTopo(t, t.clientWidth, t.clientHeight)
      }
      draw()
      window.addEventListener('resize', draw)

      // Waits underneath the About section, still, for the screen of scrolling it takes to dissolve
      // (About.tsx); CSS pulls this section up behind it so the two pins line up.
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight}`,
          pin: true,
          invalidateOnRefresh: true,
        })
      }

      // The header goes brown over the cream (About turns it on as its dissolve ends); off past this section.
      ScrollTrigger.create({
        trigger: el,
        start: 'top top+=40',
        // Its own pin adds one screen of scrolling before the section's bottom gets to the top.
        end: () => `+=${el.offsetHeight + (reduced ? 0 : window.innerHeight)}`,
        invalidateOnRefresh: true,
        onEnter: () => reduced && setOnCream(true),
        onLeave: () => setOnCream(false),
        onEnterBack: () => setOnCream(true),
        onLeaveBack: () => reduced && setOnCream(false),
      })

      return () => window.removeEventListener('resize', draw)
    },
    { scope: root },
  )

  const img = vision.image
  return (
    <section ref={root} id="vision" className={s.vision}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <div className={s.inner}>
        <p className={s.lead}>
          <span className={s.script}>{vision.script}</span>
          <span className={s.kicker}>{vision.kicker}</span>
        </p>
        <h2 className={s.title}>
          {vision.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>

        <figure className={s.figure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} width={img.width} height={img.height} alt={img.alt} loading="lazy" />
          <figcaption className={s.credit}>{img.credit}</figcaption>
        </figure>

        <blockquote className={s.quote}>
          <RevealText className={s.quoteText}>&ldquo;{vision.quote}&rdquo;</RevealText>
          <footer className={s.attribution}>{vision.attribution}</footer>
        </blockquote>

        <PillButton href={vision.cta.href} className={s.cta}>
          {vision.cta.label}
        </PillButton>
      </div>

    </section>
  )
}
