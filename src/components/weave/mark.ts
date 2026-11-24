/**
 * The GMC mark, redrawn as geometry (viewBox 0 0 400 400, from the logo file and the reference recording):
 * a diamond with its corners on the middle of each side, split across by the weave gap (y = 200) and down by
 * a river in an S-curve; the four parts are the woven quadrants. The corners outside it are pinwheel tiles.
 */

export const SIZE = 400
/** Cream gap between tiles. */
export const GAP = 8
/** The river: cream banks, water inside. */
export const RIVER = 18
export const WATER = 9
/** Hover outline, drawn just inside a quadrant's edge. */
export const OUTLINE = 2.4

const AMP = 13

/** The river's x at height y: one S-curve per half (it meets the weave gap and the vertices at x = 200). */
const riverX = (y: number) => 200 + AMP * Math.sin((Math.PI * y) / 200)

function river(from: number, to: number) {
  const pts: string[] = []
  const n = 48
  for (let i = 0; i <= n; i++) {
    const y = from + ((to - from) * i) / n
    pts.push(`${riverX(y).toFixed(2)},${y.toFixed(2)}`)
  }
  return pts
}

const L = (pts: string[]) => pts.map((p) => `L${p}`).join(' ')

/** The whole river, top to bottom. */
export const riverPath = `M${river(0, 400).join(' L')}`

export type Quadrant = {
  id: 'tl' | 'tr' | 'bl' | 'br'
  /** Closed outline (clip, hit area, pattern). */
  d: string
  /** The straight edges only, and the river edge only (open), for the hover outline. */
  edges: string
  bank: string
  /** Its box in viewBox units, where the video is drawn. */
  box: [number, number, number, number]
  /** Which part of the 1280×720 placeholder video it shows: sx, sy, sw, sh. */
  crop: [number, number, number, number]
  pattern: 'triangles' | 'basket' | 'tees' | 'grid'
}

export const quadrants: Quadrant[] = [
  {
    id: 'tl',
    d: `M0,200 L200,0 ${L(river(0, 200))} Z`,
    edges: 'M200,0 L0,200 L200,200',
    bank: `M${river(0, 200).join(' L')}`,
    box: [0, 0, 200 + AMP, 200],
    crop: [0, 0, 770, 720],
    pattern: 'triangles',
  },
  {
    id: 'tr',
    d: `M200,0 L400,200 L200,200 ${L(river(200, 0))} Z`,
    edges: 'M200,0 L400,200 L200,200',
    bank: `M${river(0, 200).join(' L')}`,
    box: [200 - AMP, 0, 200 + AMP, 200],
    crop: [510, 0, 770, 720],
    pattern: 'basket',
  },
  {
    id: 'bl',
    d: `M0,200 L200,200 ${L(river(200, 400))} Z`,
    edges: 'M200,200 L0,200 L200,400',
    bank: `M${river(200, 400).join(' L')}`,
    box: [0, 200, 200 + AMP, 200],
    crop: [160, 150, 610, 570],
    pattern: 'tees',
  },
  {
    id: 'br',
    d: `M400,200 L200,400 ${L(river(400, 200))} Z`,
    edges: 'M200,200 L400,200 L200,400',
    bank: `M${river(200, 400).join(' L')}`,
    box: [200 - AMP, 200, 200 + AMP, 200],
    crop: [620, 190, 560, 530],
    pattern: 'grid',
  },
]

/** Pinwheel corners: indigo top-left and bottom-right, slate top-right and bottom-left (as in the logo). */
export const tiles: { points: string; tone: 'indigo' | 'slate' }[] = [
  { points: '0,0 100,0 100,100', tone: 'indigo' },
  { points: '0,0 100,100 0,100', tone: 'indigo' },
  { points: '100,0 200,0 100,100', tone: 'indigo' },
  { points: '0,100 100,100 0,200', tone: 'indigo' },

  { points: '200,0 400,0 300,100', tone: 'slate' },
  { points: '400,0 400,200 300,100', tone: 'slate' },

  { points: '0,200 100,300 0,300', tone: 'slate' },
  { points: '0,300 100,300 100,400 0,400', tone: 'slate' },
  { points: '100,300 200,400 100,400', tone: 'slate' },

  { points: '400,200 400,300 300,300', tone: 'indigo' },
  { points: '300,300 400,300 300,400', tone: 'indigo' },
  { points: '400,300 400,400 300,400', tone: 'indigo' },
  { points: '300,300 300,400 200,400', tone: 'indigo' },
]

/** The one saffron tile, in the top-left quadrant. */
export const saffron = { x: 104, y: 104, size: 42 }
