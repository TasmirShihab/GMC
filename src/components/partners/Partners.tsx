'use client'

import { type CSSProperties, useRef } from 'react'

import { partners } from '@/content/home'
import { useGSAP } from '@/lib/gsap'
import { headerZone } from '@/lib/headerTheme'

import { drawTopo } from '../intro/topo'
import s from './Partners.module.css'

/**
 * Partners: the house heading, centred, and under it the partner logos drifting slowly sideways in an
 * endless loop (the row is drawn twice so it wraps without a seam). One colour, no tiles, evened-out sizes
 * and equal gaps. Hovering pauses it.
 */
export function Partners() {
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
      const offZone = headerZone(el, 'dark')
      return () => {
        offZone()
        window.removeEventListener('resize', draw)
      }
    },
    { scope: root },
  )

  const row = (copy: number) =>
    partners.logos.map((logo) => (
      <li
        key={`${copy}-${logo.name}`}
        className={s.logo}
        style={{ '--s': logo.scale } as CSSProperties}
        aria-hidden={copy > 0 || undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.src} alt={copy > 0 ? '' : logo.name} loading="lazy" />
      </li>
    ))

  return (
    <section ref={root} id="partners" className={s.partners}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <header className={s.head}>
        <p className={s.lead}>
          <span className={s.script}>{partners.script}</span>
        </p>
        <h2 className={s.title}>
          {partners.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      </header>

      <div className={s.marquee}>
        <ul className={s.track} aria-label="Partners">
          {row(0)}
          {row(1)}
        </ul>
      </div>
    </section>
  )
}
