'use client'

import { useRef, useState } from 'react'

import { weave } from '@/content/home'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'

import { drawTopo } from '../intro/topo'
import { GAP, OUTLINE, quadrants, RIVER, riverPath, saffron, SIZE, tiles, WATER } from './mark'
import s from './Weave.module.css'

/**
 * "The weave opens onto the city" (seventh reference recording): the GMC mark redrawn, its four woven
 * quadrants playing video, a river flowing down the S-curve between them. Hovering a quadrant draws a
 * yellow line just inside its edge. Sits on the terra ground between the Welcome and About pages.
 */
export function Weave() {
  const root = useRef<HTMLElement>(null)
  const topo = useRef<HTMLCanvasElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const control = useRef<((p: boolean) => void) | null>(null)

  useGSAP(
    () => {
      const el = root.current
      const c = canvas.current
      const v = video.current
      const ctx = c?.getContext('2d')
      if (!el || !c || !v || !ctx) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        pausedRef.current = true
        setPaused(true)
      }

      const drawBg = () => {
        const t = topo.current
        if (t) drawTopo(t, t.clientWidth, t.clientHeight, '246, 237, 211')
      }
      drawBg()

      // The video is drawn into each quadrant's shape, each showing a different part of the frame.
      const clips = quadrants.map((q) => new Path2D(q.d))
      const poster = new Image()
      poster.src = weave.video.poster
      let scale = 1
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        c.width = Math.round(c.clientWidth * dpr)
        c.height = Math.round(c.clientHeight * dpr)
        scale = c.width / SIZE
        draw()
      }
      const draw = () => {
        const live = v.readyState >= 2
        const src: CanvasImageSource | null = live ? v : poster.complete && poster.naturalWidth ? poster : null
        if (!src) return
        // Crops are given for the 1280-wide video; scale them for the poster.
        const k = live ? v.videoWidth / 1280 : poster.naturalWidth / 1280
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, c.width, c.height)
        quadrants.forEach((q, i) => {
          const [x, y, w, h] = q.box
          const [sx, sy, sw, sh] = q.crop
          ctx.save()
          ctx.setTransform(scale, 0, 0, scale, 0, 0)
          ctx.clip(clips[i]!)
          ctx.drawImage(src, sx * k, sy * k, sw * k, sh * k, x, y, w, h)
          ctx.restore()
        })
      }
      poster.onload = draw
      v.addEventListener('loadeddata', draw)
      v.addEventListener('seeked', draw)
      size()
      const onResize = () => {
        drawBg()
        size()
      }
      window.addEventListener('resize', onResize)

      // Play (and redraw every frame) only while the mark is on screen.
      let visible = false
      const tick = () => {
        if (!v.paused) draw()
      }
      gsap.ticker.add(tick)
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          visible = self.isActive
          if (visible && !pausedRef.current) v.play().catch(() => {})
          else v.pause()
        },
      })
      control.current = (p: boolean) => {
        pausedRef.current = p
        if (p) v.pause()
        else if (visible) v.play().catch(() => {})
      }

      return () => {
        st.kill()
        gsap.ticker.remove(tick)
        window.removeEventListener('resize', onResize)
        v.removeEventListener('loadeddata', draw)
        v.removeEventListener('seeked', draw)
        v.pause()
      }
    },
    { scope: root },
  )

  const toggle = () => {
    const next = !paused
    setPaused(next)
    control.current?.(next)
  }

  return (
    <section ref={root} id="weave" className={s.weave}>
      <canvas ref={topo} className={s.topo} aria-hidden />

      <div className={s.text}>
        <p className={s.kicker}>{weave.script}</p>
        <h2 className={s.heading}>
          {weave.heading.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        {weave.body.map((p) => (
          <p key={p} className={s.body}>
            {p}
          </p>
        ))}
      </div>

      <figure className={s.card} data-paused={paused}>
        <div className={s.art}>
          <canvas ref={canvas} className={s.video} aria-hidden />
          <video ref={video} className={s.source} src={weave.video.src} muted loop playsInline preload="metadata" aria-hidden />

          <svg className={s.mark} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="The GMC mark">
            <defs>
              {quadrants.map((q) => (
                <clipPath key={q.id} id={`weave-${q.id}`}>
                  <path d={q.d} />
                </clipPath>
              ))}
              <pattern id="weave-triangles" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M0,0 H50 M0,0 V50 M0,0 L50,50" />
              </pattern>
              <pattern id="weave-basket" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path className={s.basket} d="M4,7 H16 M4,13 H16 M27,4 V16 M33,4 V16 M7,24 V36 M13,24 V36 M24,27 H36 M24,33 H36" />
              </pattern>
              <pattern id="weave-tees" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M6,12 H44 M25,12 V40 M0,40 H14 M36,40 H50" />
              </pattern>
              <pattern id="weave-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M0,0 H44 M0,0 V44" />
              </pattern>
            </defs>

            {/* Faint weave over each picture: the figure that quadrant is drawn with in the logo. */}
            <g className={s.weaves}>
              {quadrants.map((q) => (
                <path key={q.id} d={q.d} fill={`url(#weave-${q.pattern})`} />
              ))}
            </g>

            <g className={s.saffron}>
              <rect x={saffron.x} y={saffron.y} width={saffron.size} height={saffron.size} />
              <path d={`M${saffron.x},${saffron.y} l${saffron.size},${saffron.size}`} />
            </g>

            {/* Hover: a yellow line just inside the quadrant (the gaps drawn over it hide its outer half). */}
            {quadrants.map((q) => (
              <g key={q.id} className={s.outline} data-on={active === q.id} clipPath={`url(#weave-${q.id})`}>
                <path d={q.edges} strokeWidth={GAP + OUTLINE * 2} />
                <path d={q.bank} strokeWidth={RIVER + OUTLINE * 2} />
              </g>
            ))}

            <g className={s.tiles}>
              {tiles.map((t) => (
                <polygon key={t.points} points={t.points} data-tone={t.tone} strokeWidth={GAP} />
              ))}
              {quadrants.map((q) => (
                <path key={q.id} d={q.edges} fill="none" strokeWidth={GAP} />
              ))}
            </g>

            {/* The river: cream banks, pale water, light running down it. */}
            <g className={s.river}>
              <path d={riverPath} className={s.bank} strokeWidth={RIVER} />
              <path d={riverPath} className={s.water} strokeWidth={WATER} />
              <path d={riverPath} className={s.flow} strokeWidth={WATER * 0.34} />
              <path d={riverPath} className={`${s.flow} ${s.flowSlow}`} strokeWidth={WATER * 0.22} />
            </g>

            {quadrants.map((q, i) => (
              <path
                key={q.id}
                d={q.d}
                className={s.hit}
                tabIndex={0}
                role="img"
                aria-label={weave.quadrants[i]}
                onPointerEnter={() => setActive(q.id)}
                onPointerLeave={() => setActive((a) => (a === q.id ? null : a))}
                onFocus={() => setActive(q.id)}
                onBlur={() => setActive((a) => (a === q.id ? null : a))}
              />
            ))}
          </svg>
        </div>

        <button type="button" className={s.pause} onClick={toggle} aria-label={paused ? weave.play : weave.pause}>
          {paused ? (
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </figure>
    </section>
  )
}
