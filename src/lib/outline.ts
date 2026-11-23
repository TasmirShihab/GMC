import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Geometry of the GMC boundary outline, read from assets/svg/gmc-outline.svg at build time. */
export interface Outline {
  viewBox: string
  /** One closed path, drawn in a single direction from the ring. */
  boundary: string
  /** Where the line starts and closes. */
  ring: [number, number]
}

const FILE = path.join(process.cwd(), 'assets/svg/gmc-outline.svg')

function attr(svg: string, id: string, name: string) {
  const tag = svg.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`))?.[0]
  const value = tag?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
  if (value === undefined) throw new Error(`gmc-outline.svg: #${id} is missing ${name}`)
  return value
}

/**
 * Edit the SVG in any vector tool; keep the ids #boundary and #ring.
 * Shape comes from the file; colours and sizes come from the loader's CSS.
 */
export function readOutline(): Outline {
  const svg = readFileSync(FILE, 'utf8')
  const viewBox = svg.match(/<svg[^>]*\bviewBox="([^"]*)"/)?.[1]
  if (!viewBox) throw new Error('gmc-outline.svg: missing viewBox')
  return {
    viewBox,
    boundary: attr(svg, 'boundary', 'd'),
    ring: [Number(attr(svg, 'ring', 'cx')), Number(attr(svg, 'ring', 'cy'))],
  }
}
