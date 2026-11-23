/**
 * PROVISIONAL palette, sampled by eye from the GMC lattice mark on gmc.bt.
 * Replace with values from the official logo files once GMCA supplies brand rules.
 * Mirrored as CSS custom properties in src/app/globals.css.
 */
export const PALETTE = {
  cloth: '#F1ECE3',
  ink: '#14120F',
  terracotta: '#D2643A',
  crimson: '#A8322F',
  indigo: '#2C3A66',
  gold: '#E3A857',
  stone: '#8A8178',
} as const

/** Colours the lattice cells cycle through, in logo order. */
export const CELL_COLOURS = [PALETTE.terracotta, PALETTE.crimson, PALETTE.indigo, PALETTE.gold, PALETTE.cloth] as const
