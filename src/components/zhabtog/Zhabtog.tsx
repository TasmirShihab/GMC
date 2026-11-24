'use client'

import { useRef } from 'react'

import { PillButton } from '@/components/ui/PillButton'
import { zhabtog } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { headerZone, refreshHeader } from '@/lib/headerTheme'
import { tilt } from '@/lib/tilt'

import { Dissolve } from '../intro/dissolve'
import { drawTopo } from '../intro/topo'
import s from './Zhabtog.module.css'

/**
 * The people's project (layout from the nonprofit-site reference, copy from the Zhabtog panel):
 * a tall rounded photo on the left; on the right the script line, the big title, the quote and the call to join.
 * On desktop it then dissolves away into the Take part section underneath.
 */
export function Zhabtog() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const ground = useRef<HTMLCanvasElement>(null)

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

      // Cream page: dark header while this section is under it, until its dissolve has mostly opened
      // onto the Take part picture below (then that section's light header takes over).
      let dissolved = 0
      const offZone = headerZone(el, () => (dissolved > 0.75 ? null : 'dark'))

      // ── Dissolve into the Take part section (desktop, with motion) ──
      // Pinned for one more screen: the content fades, then the cream ground breaks into islands rising
      // from the bottom, over the Take part picture waiting (pinned) underneath. Same as About → Vision.
      const mm = gsap.matchMedia()
      let cancelled = false
      mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
        const gc = ground.current
        const gctx = gc?.getContext('2d')
        const content = q(`.${s.inner}, .${s.topo}`)
        let dissolve: Dissolve | null = null
        let lastOpen = -1
        const sizeGround = () => {
          if (!gc) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          gc.width = Math.round(el.clientWidth * dpr)
          gc.height = Math.round(el.clientHeight * dpr)
          lastOpen = -1
        }
        sizeGround()
        window.addEventListener('resize', sizeGround)

        const dissolveTo = (d: number) => {
          dissolved = d
          refreshHeader()
          gsap.set(content, { autoAlpha: 1 - Math.min(1, d / 0.15) })
          const open = Math.min(1, d)
          if (!gc || !gctx || open === lastOpen) return
          lastOpen = open
          if (open <= 0) {
            el.style.background = ''
            gc.style.visibility = 'hidden'
            return
          }
          el.style.background = 'transparent'
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

        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom+=100%',
          once: true,
          onEnter: () => {
            Dissolve.prepare(el.clientWidth, el.clientHeight, () => cancelled, 'bottom').then((d) => {
              dissolve = d
              lastOpen = -1
            })
          },
        })
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight}`,
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => dissolveTo(self.progress),
        })

        return () => {
          window.removeEventListener('resize', sizeGround)
          dissolveTo(0)
          dissolved = 0
        }
      })

      if (!reduced) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
        tl.from(q(`.${s.photo}`), { autoAlpha: 0, y: 40, duration: 1.1, ease: 'power3.out' })
        tl.from(q(`.${s.text} > *`), { autoAlpha: 0, y: 28, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.15)
      }

      // Hover tilt on the photo.
      const offTilt = tilt(q(`.${s.photo}`), 5)

      return () => {
        cancelled = true
        mm.revert()
        offTilt()
        offZone()
        window.removeEventListener('resize', draw)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="zhabtog" className={s.zhabtog}>
      {/* The cream ground, cut into islands when the section dissolves into the Take part picture. */}
      <canvas ref={ground} className={s.ground} aria-hidden />
      <canvas ref={topo} className={s.topo} aria-hidden />

      <div className={s.inner}>
        <figure className={s.figure}>
          <div className={s.photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zhabtog.image.src} alt={zhabtog.image.alt} loading="lazy" />
            <figcaption className={s.credit}>{zhabtog.image.credit}</figcaption>
          </div>
        </figure>

        <div className={s.text}>
          <p className={s.script}>{zhabtog.script}</p>
          <h2 className={s.title}>
            {zhabtog.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className={s.place}>{zhabtog.place}</p>
          <blockquote className={s.quote}>
            <p>“{zhabtog.quote}”</p>
          </blockquote>
          <div className={s.actions}>
            <PillButton href={zhabtog.actions.primary.href}>{zhabtog.actions.primary.label}</PillButton>
          </div>
        </div>
      </div>
    </section>
  )
}
