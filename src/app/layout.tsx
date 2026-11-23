import './globals.css'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { DebugHud } from '@/components/dom/DebugHud'
import { Providers } from '@/components/providers/Providers'
import { fontVariables } from '@/styles/fonts'

export const metadata: Metadata = {
  title: { default: 'Gelephu Mindfulness City', template: '%s · Gelephu Mindfulness City' },
  description:
    'Gelephu Mindfulness City (GMC) is a Special Administrative Region in the Kingdom of Bhutan. See what GMC is, what is being built now, and how to take part.',
}

export const viewport: Viewport = {
  themeColor: '#ece4ce',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Marks JS as available before paint, so .reveal text is hidden only when it will animate. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <DebugHud />
      </body>
    </html>
  )
}
