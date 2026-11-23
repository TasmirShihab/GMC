/**
 * The fixed header changes colour with what is behind it:
 *   light (cream text, white logo) over the hero video and the coloured sections,
 *   dark  (brown text, colour logo) over the cream welcome page before it turns colour.
 * Sections report their state here; the header reads html[data-header].
 */
const state = { heroGone: false, welcomeColoured: false, onCream: false }

function apply() {
  if (typeof document === 'undefined') return
  const theme = (state.heroGone && !state.welcomeColoured) || state.onCream ? 'dark' : 'light'
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
