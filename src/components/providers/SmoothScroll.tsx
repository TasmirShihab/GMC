'use client'

import 'lenis/dist/lenis.css'

import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { gsap, ScrollTrigger } from '@/lib/gsap'
import { pointer, scroll } from '@/lib/scroll'
import { useExperience } from '@/lib/store'

/** Writes Lenis state into the shared mutable scroll object and keeps ScrollTrigger in sync. */
function ScrollBridge() {
  useLenis((lenis) => {
    scroll.y = lenis.scroll
    scroll.progress = lenis.progress
    scroll.velocity = lenis.velocity
    scroll.direction = lenis.direction as -1 | 0 | 1
    ScrollTrigger.update()
  })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return null
}

/**
 * One clock for the whole site: GSAP's ticker drives Lenis, so scroll, ScrollTrigger and
 * DOM tweens advance on the same frame. WebGL reads the results in useFrame.
 * Reduced motion or Save-Data → native scrolling (lerp 1), same story.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null)
  const lite = useExperience((s) => s.lite)

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    return () => gsap.ticker.remove(update)
  }, [])

  // Touch-only devices (phones, tablets): the page scrolls on the same thread as the animations
  // (GSAP's normalizeScroll), so pinned sections and the content around them move on the same frame
  // instead of the pins trailing the native scroll, and the browser's address bar stays put instead of
  // resizing the screen mid-scroll. Sideways scrollers (the sectors row) still pan natively. Off while
  // scrolling is locked (the loader, the map layer), which Lenis marks with html.lenis-stopped.
  useEffect(() => {
    if (lite || ScrollTrigger.isTouch !== 1) return
    const normalizer = ScrollTrigger.normalizeScroll({ type: 'touch', allowNestedScroll: true })
    const html = document.documentElement
    const sync = () => {
      if (html.classList.contains('lenis-stopped')) normalizer?.disable()
      else normalizer?.enable()
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => {
      mo.disconnect()
      ScrollTrigger.normalizeScroll(false)
    }
  }, [lite])

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: lite ? 1 : 0.09, smoothWheel: !lite, anchors: { offset: -80 } }}
    >
      <ScrollBridge />
      {children}
    </ReactLenis>
  )
}
