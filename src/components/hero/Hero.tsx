'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { PillButton } from '@/components/ui/PillButton'
import { hero } from '@/content/home'
import { gsap, useGSAP } from '@/lib/gsap'
import { setHeroGone } from '@/lib/headerTheme'
import { useExperience } from '@/lib/store'

import s from './Hero.module.css'

/** Full-screen hero under the loader. The scroll cue and sound toggle arrive as the loader dissolves. */
export function Hero() {
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const soundBtn = useRef<HTMLButtonElement>(null)
  const [muted, setMuted] = useState(true)
  /** Once the visitor uses the Mute / Unmute button, their choice wins over the automatic start. */
  const userChose = useRef(false)
  const stopWaiting = useRef<() => void>(() => undefined)

  const toggleSound = () => {
    const v = video.current
    if (!v) return
    userChose.current = true
    stopWaiting.current()
    v.muted = !v.muted
    if (!v.muted && v.paused) v.play().catch(() => undefined)
    setMuted(v.muted)
  }

  /**
   * The hero starts with sound. Browsers only allow that after the visitor has interacted with the page
   * (or on sites they use often); if it's refused, the video keeps playing muted and the sound comes on at
   * the first click, tap or key press anywhere. The Mute button is always there to turn it off.
   */
  const startWithSound = useCallback(() => {
    const v = video.current
    if (!v || userChose.current) return
    v.muted = false
    v.play()
      .then(() => setMuted(false))
      .catch(() => {
        v.muted = true
        v.play().catch(() => undefined)
        setMuted(true)
        const events = ['pointerdown', 'keydown', 'touchend'] as const
        const onFirst = (e: Event) => {
          stopWaiting.current()
          // A click on the sound button is handled by the button itself.
          if ((e.target as Element | null)?.closest?.(`.${s.sound}`) || userChose.current) return
          v.muted = false
          v.play().catch(() => undefined)
          setMuted(v.muted)
        }
        events.forEach((ev) => window.addEventListener(ev, onFirst, true))
        stopWaiting.current = () => events.forEach((ev) => window.removeEventListener(ev, onFirst, true))
      })
  }, [])

  useEffect(() => () => stopWaiting.current(), [])

  // Server HTML can't carry React's `muted`, so some browsers block the autoplay; start it here.
  useEffect(() => {
    const v = video.current
    if (!v) return
    v.muted = true
    v.play().catch(() => undefined)
  }, [])

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const cue = [...q(`.${s.cue}, .${s.actions}`), soundBtn.current].filter(Boolean)
      const card = q(`.${s.card}`)

      // Scrolling out: the hero holds still, then shrinks, tilts and flies up like a postcard,
      // uncovering the welcome page underneath (it scrolls up beneath the pinned hero).
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=100%',
            scrub: true,
            pin: true,
            pinSpacing: false,
            onUpdate: (self) => setHeroGone(self.progress > 0.55),
            // The sound toggle stays fixed bottom-left while the hero is on screen, and goes with it.
            onLeave: () => {
              video.current?.pause()
              gsap.to(soundBtn.current, { autoAlpha: 0, duration: 0.3 })
            },
            onEnterBack: () => {
              video.current?.play().catch(() => undefined)
              gsap.to(soundBtn.current, { autoAlpha: 1, duration: 0.3 })
            },
          },
        })
        .to(card, { '--frame': '10px', scale: 0.92, rotate: -2, duration: 0.3, ease: 'power1.in' })
        .to(card, { scale: 0.62, rotate: -7, yPercent: -118, duration: 0.7, ease: 'power2.in' })

      const enter = () => {
        startWithSound()
        gsap.fromTo(cue, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, delay: 0.8, ease: 'power1.out' })
      }

      const phase = useExperience.getState().intro
      if (phase !== 'loading') {
        gsap.set(cue, { autoAlpha: 1 })
        startWithSound()
        return
      }
      const unsub = useExperience.subscribe((st, prevSt) => {
        if (st.intro === 'reveal' && prevSt.intro === 'loading') {
          enter()
          unsub()
        }
      })
      return unsub
    },
    { scope: root, dependencies: [startWithSound] },
  )

  const media = hero.media
  return (
    <>
      <section ref={root} id="top" className={s.hero}>
        <div className={s.card}>
          <div className={s.media}>
            {media?.type === 'video' && (
              <video
                ref={video}
                src={media.src}
                poster={media.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                data-intro-wait
              />
            )}
            {media?.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.src} alt="" data-intro-wait />
            )}
            {!media && <div className={s.placeholder} aria-hidden />}
          </div>
          {/* Shades the top, middle and bottom so header, title and cue stay readable on any footage. */}
          <div className={s.shade} aria-hidden />

          {/* One heading in three voices: small spaced caps, the big display word, a script flourish. */}
          <div className={s.center}>
            <h1 className={s.heading}>
              <span className={s.welcome}>{hero.welcome}</span> <span className={s.title}>{hero.title}</span>{' '}
              <span className={s.subtitle}>{hero.subtitle}</span>
            </h1>
            <div className={s.actions}>
              <PillButton href={hero.actions.primary.href}>{hero.actions.primary.label}</PillButton>
              <PillButton href={hero.actions.secondary.href} variant="secondary" icon="play">
                {hero.actions.secondary.label}
              </PillButton>
            </div>
          </div>

          <div className={s.cue}>
            <span className={s.chevrons} aria-hidden>
              <svg
                viewBox="0 0 12 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 2l4 4 4-4" />
              </svg>
              <svg
                viewBox="0 0 12 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 2l4 4 4-4" />
              </svg>
            </span>
            <span className={s.cueLabel}>{hero.scrollCue}</span>
          </div>
        </div>
      </section>

      {/* Sound on: the bars move like a level meter. Off: they lie flat as a row of dashes. */}
      {media?.type === 'video' && (
        <button
          ref={soundBtn}
          type="button"
          className={s.sound}
          data-muted={muted}
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={hero.sound}
          title={muted ? hero.unmute : hero.mute}
        >
          <span className={s.bars} aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} />
            ))}
          </span>
        </button>
      )}
    </>
  )
}
