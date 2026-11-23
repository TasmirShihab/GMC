import localFont from 'next/font/local'
import { JetBrains_Mono, Jomolhari, Outfit } from 'next/font/google'

/**
 * Self-hosted at build time by next/font (no runtime requests to other hosts).
 *
 * Titles: Centra No.2 (Extrabold 800, Black 900). Script: Heldies.
 * Both came with PERSONAL-USE-ONLY licences (see centra-font-family/ and heldies/ in the repo root):
 * buy commercial licences before this site goes live.
 */
export const title = localFont({
  src: [
    { path: './fonts/CentraNo2-Extrabold.ttf', weight: '800', style: 'normal' },
    { path: './fonts/CentraNo2-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-title-face',
  display: 'swap',
})
export const script = localFont({ src: './fonts/Heldies.ttf', variable: '--font-script-face', display: 'swap' })
/** Large display titles (hero). Belleza, single weight, SIL Open Font License (free for commercial use). */
export const big = localFont({ src: './fonts/Belleza-Regular.ttf', weight: '400', variable: '--font-big-face', display: 'swap' })

/** UI text (labels, nav, body) until a text face is chosen. */
export const display = Outfit({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
export const dzongkha = Jomolhari({ weight: '400', subsets: ['latin'], variable: '--font-dz', display: 'swap' })

export const fontVariables = [title.variable, big.variable, script.variable, display.variable, mono.variable, dzongkha.variable].join(' ')
