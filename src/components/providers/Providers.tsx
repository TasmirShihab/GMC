'use client'

import { Leva } from 'leva'
import dynamic from 'next/dynamic'
import { useRef, type ReactNode } from 'react'

import { useExperience } from '@/lib/store'

import { DeviceProfile } from './DeviceProfile'
import { SmoothScroll } from './SmoothScroll'

// WebGL is client-only and loads after the page is usable (performance guardrail from the brief).
const WebGLCanvas = dynamic(() => import('@/components/canvas/WebGLCanvas'), { ssr: false })

export function Providers({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const debug = useExperience((s) => s.debug)

  return (
    <SmoothScroll>
      <DeviceProfile />
      <div ref={root} className="app-root">
        {children}
        <WebGLCanvas eventSource={root} />
      </div>
      <Leva hidden={!debug} collapsed titleBar={{ title: 'GMC · debug' }} />
    </SmoothScroll>
  )
}
