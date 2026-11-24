'use client'

import { useRef } from 'react'

import { PillButton } from '@/components/ui/PillButton'
import { footer, header } from '@/content/home'
import { useGSAP } from '@/lib/gsap'
import { headerZone } from '@/lib/headerTheme'

import { drawTopo } from '../intro/topo'

import s from './Footer.module.css'

function Social({ name }: { name: 'Facebook' | 'X' | 'Instagram' }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  if (name === 'Facebook')
    return (
      <svg viewBox="0 0 24 24" {...line} aria-hidden>
        <path d="M14.5 8.5H16V5.5h-2a3.5 3.5 0 0 0-3.5 3.5v2H8.5v3h2v6h3v-6h2l.5-3h-2.5V9.5a1 1 0 0 1 1-1z" />
      </svg>
    )
  if (name === 'X')
    return (
      <svg viewBox="0 0 24 24" {...line} aria-hidden>
        <path d="M5 5l14 14M19 5l-14 14" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" {...line} aria-hidden>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M16.6 7.4h.01" />
    </svg>
  )
}

/**
 * Footer (layout from the references: a landscape behind and around a rounded cream card). In the card:
 * four titled link groups (the city · take part · stay informed · the Authority) and a Connect column
 * (social, language, the call to action); then the GMC mark and name set large along the bottom-left as
 * the signature, with the legal links and rights small at the bottom-right.
 * The picture fades in from the cream of the FAQ above, so there is no edge between them.
 */
export function Footer() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      // the site's faint topo lines, inside the card
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

  return (
    <footer ref={root} className={s.footer}>
      <div className={s.back} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={footer.image} alt="" loading="lazy" />
      </div>
      <div className={s.fade} aria-hidden />

      <div className={s.card}>
        <canvas ref={topo} className={s.topo} aria-hidden />
        <div className={s.top}>
          <nav className={s.links} aria-label="Footer">
            {footer.columns.map((col) => (
              <div key={col.title} className={s.group}>
                <h2 className={s.groupTitle}>{col.title}</h2>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className={s.actions}>
            <h2 className={s.groupTitle}>{footer.connect}</h2>
            <ul className={s.social}>
              {footer.social.map((x) => (
                <li key={x.name}>
                  <a href={x.href} aria-label={`GMC on ${x.name}`}>
                    <Social name={x.name} />
                  </a>
                </li>
              ))}
            </ul>
            <ul className={s.langs} aria-label="Language">
              {footer.languages.map((l) => (
                <li key={l.lang}>
                  <a href={`?lang=${l.lang}`} lang={l.lang} aria-current={l.current ? 'true' : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <PillButton href={footer.cta.href}>{footer.cta.label}</PillButton>
          </div>
        </div>

        <div className={s.bottom}>
          <a className={s.signature} href="#top" aria-label="Gelephu Mindfulness City, back to top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={header.logoOnLight} alt="" width={238} height={240} />
            <span className={s.wordmark} aria-hidden>
              {footer.wordmark.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </a>

          <div className={s.small}>
            <ul className={s.legal}>
              {footer.legal.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
            <p className={s.place}>{footer.place}</p>
            <p className={s.rights}>{footer.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
