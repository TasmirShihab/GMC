'use client'

import { useRef } from 'react'

import { project108 } from '@/content/home'
import { gsap, useGSAP } from '@/lib/gsap'

import s from './ExplorePill.module.css'

/** The stupa's three parts, as bands of the drawing's height (top edge %, bottom edge %). */
const PARTS = [
  { key: 'base', from: 60, to: 100 },
  { key: 'middle', from: 37, to: 60 },
  { key: 'top', from: 0, to: 37 },
] as const

const band = (from: number, to: number) => `inset(${from}% 0% ${100 - to}% 0%)`

/**
 * The floating stupa, leading to Project 108: a dark disc with the stupa drawn inside it, drifting very
 * slowly, shown once the hero has scrolled away. On its own (no hover needed) the stupa keeps building
 * itself from the ground up (base, then the dome, then the spire), rests, fades and builds again.
 * Hovering shows "Project 108" above it. The drawing is a mask, so its colour (and the disc's) come from
 * CSS variables.
 */
export function ExplorePill() {
  const root = useRef<HTMLAnchorElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      // Each part opens upward from its own bottom edge, one after the other; the finished stupa rests,
      // then softly fades and the cycle starts again. It runs on its own, hover or not.
      const parts = PARTS.map((p) => q(`.${s[p.key]}`))
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 })
      PARTS.forEach((p, i) => {
        tl.fromTo(
          parts[i]!,
          { clipPath: band(p.to, p.to), autoAlpha: 0.2 },
          { clipPath: band(p.from, p.to), autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
          i * 0.7,
        )
      })
      tl.to({}, { duration: 5 })
      tl.to(parts.flat(), { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' })

      // Starts once it first appears (the page marks html[data-past-hero="1"] once the hero has gone).
      const html = document.documentElement
      const start = () => {
        if (html.dataset.pastHero === '1' && !tl.isActive()) tl.play(0)
      }
      start()
      const mo = new MutationObserver(start)
      mo.observe(html, { attributes: true, attributeFilter: ['data-past-hero'] })

      return () => {
        mo.disconnect()
        tl.kill()
      }
    },
    { scope: root },
  )

  return (
    <a ref={root} className={s.orb} href={project108.href} aria-label={project108.label}>
      <span className={s.float}>
        <span className={s.halo} aria-hidden />
        <span className={s.disc} aria-hidden>
          {PARTS.map((p) => (
            <span key={p.key} className={`${s.part} ${s[p.key]}`} style={{ clipPath: band(p.from, p.to) }} />
          ))}
        </span>
      </span>
      <span className={s.label}>{project108.label}</span>
    </a>
  )
}
