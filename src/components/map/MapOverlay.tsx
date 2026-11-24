'use client'

import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { map3d } from '@/content/home'
import { useExperience } from '@/lib/store'

import s from './MapOverlay.module.css'

/**
 * The 3D map, as a full-screen layer over the home page. Any link to "#map" (the header's 3D Map, the
 * footer's Masterplan & 3D map) opens it; "Back to GMC", Escape or the browser's back button close it and
 * the visitor is exactly where they were. While it is open the home page's own 3D, video and scroll
 * pause, and the 3D site is only loaded (and its WebGL only alive) while the layer is open.
 */
export function MapOverlay() {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const lenis = useLenis()
  const lenisRef = useRef(lenis)
  const backRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const paused = useRef<HTMLVideoElement[]>([])
  const pushed = useRef(false)

  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])

  const close = useCallback((fromHistory = false) => {
    setShown(false)
    // let the fade play, then drop the 3D site (frees its GPU memory)
    window.setTimeout(() => setOpen(false), 450)
    if (pushed.current && !fromHistory) history.back()
    pushed.current = false
  }, [])

  // Open from any "#map" link.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#map"]')
      if (!a) return
      e.preventDefault()
      opener.current = a as HTMLElement
      history.pushState({ gmcMap: true }, '', '#map')
      pushed.current = true
      setOpen(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    }
    const onPop = () => {
      if (pushed.current) close(true)
    }
    document.addEventListener('click', onClick)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPop)
    }
  }, [close])

  // While open: pause the page under it, take focus, Escape closes.
  useEffect(() => {
    if (!open) return
    useExperience.getState().setMapOpen(true)
    lenisRef.current?.stop()
    document.documentElement.style.overflow = 'hidden'
    paused.current = [...document.querySelectorAll('main video')].filter((v) => !(v as HTMLVideoElement).paused) as HTMLVideoElement[]
    paused.current.forEach((v) => v.pause())
    backRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      useExperience.getState().setMapOpen(false)
      lenisRef.current?.start()
      document.documentElement.style.overflow = ''
      paused.current.forEach((v) => v.play().catch(() => undefined))
      paused.current = []
      opener.current?.focus()
    }
  }, [open, close])

  if (!open) return null
  return (
    <div className={s.layer} data-shown={shown} role="dialog" aria-modal="true" aria-label={map3d.title}>
      <iframe className={s.frame} src={map3d.src} title={map3d.title} allow="fullscreen" />
      <button ref={backRef} type="button" className={s.back} onClick={() => close()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M13 8H3m4-4L3 8l4 4" />
        </svg>
        <span>{map3d.back}</span>
      </button>
    </div>
  )
}
