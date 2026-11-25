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
  // Dev only: lets the console pause/scrub every animation (gsap.globalTimeline) and list the scroll
  // triggers (__st.getAll()) when checking motion.
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __gsap: gsap, __st: ScrollTrigger })
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
