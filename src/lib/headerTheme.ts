/**
 * The fixed header changes colour with what is behind it:
 *   light (cream text, white logo) over the hero video and the coloured sections,
 *   dark  (brown text, colour logo) over the cream welcome page before it turns colour.
 * Sections report their state here; the header reads html[data-header].
 */
const state = { heroGone: false, welcomeColoured: false, onCream: false }

type Theme = 'dark' | 'light'
/** Sections with a fixed look (no dissolve): whichever one is under the header line decides, outright. */
const zones = new Map<Element, Theme | (() => Theme | null)>()
let zoneTheme: Theme | null = null
const HEADER_LINE = 40

function checkZones() {
  let found: Theme | null = null
  for (const [el, theme] of zones) {
    const r = el.getBoundingClientRect()
    if (r.top <= HEADER_LINE && r.bottom > HEADER_LINE) {
      // a function can step aside (null), e.g. once a dissolving section has opened onto the next one
      const t = typeof theme === 'function' ? theme() : theme
      if (t) {
        found = t
        break
      }
    }
  }
  if (found !== zoneTheme) {
    zoneTheme = found
    apply()
  }
}

let listening = false

/**
 * Registers a section whose header colour never changes: 'dark' over cream pages, 'light' over pictures.
 * While it is under the header it wins over the scroll-driven flags below. Returns an unregister function.
 */
export function headerZone(el: Element, theme: Theme | (() => Theme | null)) {
  zones.set(el, theme)
  if (!listening && typeof window !== 'undefined') {
    listening = true
    window.addEventListener('scroll', checkZones, { passive: true })
    window.addEventListener('resize', checkZones)
  }
  checkZones()
  return () => {
    zones.delete(el)
    checkZones()
  }
}

/** Re-checks the zones now (e.g. while a pinned section dissolves without the page scrolling under it). */
export const refreshHeader = () => checkZones()

function apply() {
  if (typeof document === 'undefined') return
  const theme = zoneTheme ?? ((state.heroGone && !state.welcomeColoured) || state.onCream ? 'dark' : 'light')
  const root = document.documentElement
  if (root.dataset.header !== theme) root.dataset.header = theme
  root.dataset.pastHero = state.heroGone ? '1' : '0'
}

export function setHeroGone(gone: boolean) {
  state.heroGone = gone
  apply()
}

/** A later cream section (e.g. the Vision) is under the header. */
export function setOnCream(cream: boolean) {
  state.onCream = cream
  apply()
}

export function setWelcomeColoured(coloured: boolean) {
  state.welcomeColoured = coloured
  apply()
}
