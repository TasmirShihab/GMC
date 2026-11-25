'use client'

/**
 * Single entry point for GSAP. Import gsap and its plugins from here, never from 'gsap' directly,
 * so plugins are registered exactly once and the house eases exist everywhere.
 */
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

import { EASE, DURATION } from './motion'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP)
  CustomEase.create('breath', EASE.breath)
  CustomEase.create('settle', EASE.settle)
  gsap.defaults({ ease: 'breath', duration: DURATION.base })
  // Lenis drives scrolling; ScrollTrigger only needs to listen.
  ScrollTrigger.config({ ignoreMobileResize: true })
  // One screen as the scroll code measures it (window.innerHeight, taken at every refresh), for CSS that
  // has to line up with a scroll length: sections pulled up under a pinned one by "its dissolve's one
  // screen" (Stories, Vision, Thread). On phones 100vh is the tall viewport (toolbar hidden) and
  // 100svh the short one, and neither has to equal what the JS measured, so they use --screen instead.
  const setScreen = () => document.documentElement.style.setProperty('--screen', `${window.innerHeight}px`)
  setScreen()
  ScrollTrigger.addEventListener('refreshInit', setScreen)
  // Dev only: lets the console pause/scrub every animation (gsap.globalTimeline) and list the scroll
  // triggers (__st.getAll()) when checking motion.
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __gsap: gsap, __st: ScrollTrigger })
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
