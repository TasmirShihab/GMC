'use client'

import { useRef } from 'react'

import { people } from '@/content/home'
import { gsap, useGSAP } from '@/lib/gsap'
import { headerZone } from '@/lib/headerTheme'
import { tilt } from '@/lib/tilt'

import { drawTopo } from '../intro/topo'
import s from './People.module.css'

/**
 * Chapter 06 · The People, "Woven by many hands" (laid out after the team-page reference): the heading
 * on the left, then each group of the GMCA board as a row — the group's name on the left, its people on
 * the right as tall rounded portraits with the name and role underneath.
 */
export function People() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const q = gsap.utils.selector(el)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const draw = () => {
        const t = topo.current
        if (t) drawTopo(t, t.clientWidth, t.clientHeight)
      }
      draw()
      window.addEventListener('resize', draw)

      // Cream page: dark header while this section is under it.
      const offZone = headerZone(el, 'dark')

      if (!reduced) {
        q(`.${s.grid}`).forEach((grid) => {
          gsap.from(grid.children, {
            autoAlpha: 0,
            y: 40,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
          })
        })
      }

      // Hover tilt on each portrait.
      const offTilt = tilt(q(`.${s.portrait}`))

      return () => {
        offTilt()
        offZone()
        window.removeEventListener('resize', draw)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="people" className={s.people}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <div className={s.inner}>
        <header className={s.head}>
          <p className={s.script}>{people.script}</p>
          <h2 className={s.title}>
            {people.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className={s.chair}>{people.chair}</p>
          <p className={s.body}>{people.body}</p>
        </header>

        {people.groups.map((g) => (
          <div key={g.id} className={s.group}>
            <h3 className={s.groupTitle}>
              {g.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h3>
            <ul className={s.grid}>
              {people.members
                .filter((m) => m.group === g.id)
                .map((m) => (
                  <li key={m.name} className={s.person}>
                    <div className={s.portrait}>
                      {m.portrait && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.portrait} alt={`Portrait of ${m.name}`} loading="lazy" />
                      )}
                    </div>
                    <p className={s.name}>{m.name}</p>
                    <p className={s.role}>{m.role}</p>
                  </li>
                ))}
            </ul>
          </div>
        ))}

      </div>
    </section>
  )
}
