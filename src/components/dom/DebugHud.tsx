'use client'

import { useEffect, useRef } from 'react'

import { chapterProgress, scroll } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { CHAPTERS } from '@/story/chapters'

/** `?debug` only: live tier, active chapter and per-chapter progress, for choreographing scenes. */
export function DebugHud() {
  const debug = useExperience((s) => s.debug)
  const tier = useExperience((s) => s.tier)
  const active = useExperience((s) => s.activeChapter)
  const out = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!debug) return
    let raf = 0
    const tick = () => {
      if (out.current) {
        const rows = CHAPTERS.map((c) => `${c.id.padEnd(10)} ${(chapterProgress[c.id] ?? 0).toFixed(3)}`)
        out.current.textContent = [`page      ${scroll.progress.toFixed(3)}`, `velocity  ${scroll.velocity.toFixed(1)}`, ...rows].join('\n')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [debug])

  if (!debug) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 100,
        background: 'rgba(0,0,0,.78)',
        color: '#e3a857',
        padding: '10px 12px',
        borderRadius: 8,
        font: '11px/1.5 var(--font-code)',
      }}
    >
      <div>
        tier {tier ?? '…'} · chapter {active ?? '—'}
      </div>
      <pre ref={out} style={{ margin: 0 }} />
    </div>
  )
}
