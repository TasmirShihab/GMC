import type { Metadata } from 'next'

import { LabScene } from './LabScene'

export const metadata: Metadata = { title: 'Lab', robots: { index: false } }

/** /lab: a sandbox for building and tuning 3D pieces in isolation before they join the story. */
export default function LabPage() {
  return (
    <main style={{ height: '100svh' }}>
      <LabScene />
    </main>
  )
}
