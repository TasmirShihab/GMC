'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'

import { ScrollTrigger, useGSAP } from '@/lib/gsap'
import { chapterProgress } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import type { ChapterId } from '@/story/chapters'

interface ChapterProps {
  id: ChapterId
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** ScrollTrigger range for 0..1 progress. Default: while the section is pinned-through. */
  start?: string
  end?: string
}

/**
 * A story chapter. It publishes its 0..1 scroll progress to `chapterProgress[id]` for WebGL
 * (read it in useFrame with getChapterProgress) and marks itself active when centred.
 *
 * Pattern for scroll-told scenes: make the section tall (e.g. 300vh) with a `position: sticky`
 * child; the 3D world animates against this chapter's progress while the text stays in view.
 */
export function Chapter({ id, children, className, style, start = 'top top', end = 'bottom bottom' }: ChapterProps) {
  const ref = useRef<HTMLElement>(null)
  const setActive = useExperience((s) => s.setActiveChapter)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      ScrollTrigger.create({
        trigger: el,
        start,
        end,
        onUpdate: (self) => {
          chapterProgress[id] = self.progress
        },
        onRefresh: (self) => {
          chapterProgress[id] = self.progress
        },
      })
      ScrollTrigger.create({
        trigger: el,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => self.isActive && setActive(id),
      })
    },
    { scope: ref, dependencies: [id, start, end] },
  )

  return (
    <section ref={ref} id={id} data-chapter={id} className={className} style={style}>
      {children}
    </section>
  )
}
