'use client'

import { useRef, type ElementType, type ReactNode } from 'react'

import { DURATION } from '@/lib/motion'
import { gsap, SplitText, useGSAP } from '@/lib/gsap'
import { useExperience } from '@/lib/store'

interface RevealTextProps {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  /** 'load' plays on mount; 'scroll' plays once when the text enters the viewport. */
  on?: 'load' | 'scroll'
}

/**
 * Line-masked text reveal with GSAP SplitText. Re-splits automatically when fonts load or the
 * layout changes. Hidden until split (see .reveal in globals.css) so there is no flash.
 * Reduced motion: shown immediately, no movement.
 */
export function RevealText({ children, as: Tag = 'p', className, delay = 0, on = 'scroll' }: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)
  const reducedMotion = useExperience((s) => s.reducedMotion)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (reducedMotion) {
        gsap.set(el, { visibility: 'visible' })
        return
      }
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' })
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: DURATION.slow,
            ease: 'settle',
            stagger: 0.09,
            delay,
            scrollTrigger: on === 'scroll' ? { trigger: el, start: 'top 85%', once: true } : undefined,
          })
        },
      })
    },
    { scope: ref, dependencies: [reducedMotion] },
  )

  return (
    <Tag ref={ref} className={['reveal', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  )
}
