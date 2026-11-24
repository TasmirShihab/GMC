'use client'

import { useRef } from 'react'

import { thread } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { headerZone } from '@/lib/headerTheme'
import { tilt } from '@/lib/tilt'

import s from './Thread.module.css'

function Arrow({ external }: { external?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {external ? <path d="M5 11 11 5M6 5h5v5" /> : <path d="M3 8h10M9 4l4 4-4 4" />}
    </svg>
  )
}

/**
 * Chapter 07 · Take part, "Your thread starts here": one still render filling the screen (no scroll
 * effects), the heading on it, and the six ways in as cream cards in two offset rows.
 */
export function Thread() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Over the picture: light header while this section is under it.
      const offZone = headerZone(el, 'light')

      // Waits pinned for one screen while the Zhabtog section above dissolves away over it.
      const mm = gsap.matchMedia()
      mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight}`,
          pin: true,
          invalidateOnRefresh: true,
        })
      })

      // The cards settle in once, one after another; nothing moves with the scroll.
      if (!reduced) {
        gsap.from(q(`.${s.card}`), {
          autoAlpha: 0,
          y: 30,
          duration: 0.9,
          ease: 'power3.out',
          stagger: { each: 0.09, from: 'random' },
          scrollTrigger: { trigger: el, start: 'top 55%', once: true },
        })
      }

      // Hover tilt: each card leans toward the pointer.
      const offTilt = tilt(q(`.${s.link}`), 9)

      return () => {
        mm.revert()
        offZone()
        offTilt()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="take-part" className={s.thread}>
      <div className={s.back} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thread.image} alt="" loading="lazy" />
      </div>
      <div className={s.shade} aria-hidden />

      <header className={s.head}>
        <p className={s.script}>{thread.script}</p>
        <h2 className={s.title}>
          {thread.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      </header>

      <ul className={s.cards}>
        {thread.doors.map((d, i) => (
          <li key={d.title} className={`${s.card} ${s[`c${i + 1}`]}`}>
            <a
              className={s.link}
              href={d.href}
              target={d.site ? '_blank' : undefined}
              rel={d.site ? 'noopener noreferrer' : undefined}
            >
              <span className={s.cardTitle}>{d.title}</span>
              {d.site && <span className={s.site}>{d.site}</span>}
              <span className={s.foot}>
                <span className={s.text}>{d.text}</span>
                <span className={s.diamond} aria-hidden>
                  <Arrow external={Boolean(d.site)} />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
