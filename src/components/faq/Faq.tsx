'use client'

import { useId, useRef, useState } from 'react'

import { faq } from '@/content/home'
import { useGSAP } from '@/lib/gsap'
import { headerZone } from '@/lib/headerTheme'

import { drawTopo } from '../intro/topo'
import s from './Faq.module.css'

/**
 * FAQ (layout from the "Fair questions" reference): the house heading on the left, kept in view while the
 * list scrolls; on the right a numbered accordion, one answer open at a time, the first open to start.
 */
export function Faq() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(0)
  const id = useId()

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

  return (
    <section ref={root} id="faq" className={s.faq}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <div className={s.inner}>
        <header className={s.head}>
          <p className={s.script}>{faq.script}</p>
          <h2 className={s.title}>
            {faq.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
        </header>

        <ol className={s.list}>
          {faq.items.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q} className={s.item} data-open={isOpen}>
                <h3 className={s.qWrap}>
                  <button
                    type="button"
                    className={s.q}
                    aria-expanded={isOpen}
                    aria-controls={`${id}-a${i}`}
                    id={`${id}-q${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={s.qText}>{item.q}</span>
                    <span className={s.icon} aria-hidden />
                  </button>
                </h3>
                <div className={s.a} id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`}>
                  <div className={s.aInner}>
                    <p>{item.a}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
