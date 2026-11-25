import { createNoise } from '@/lib/noise'

/** Share of the screen opened up at time t (0..1) of the dissolve. Fast start, soft landing. */
export const openAt = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 1.9))

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/**
 * The loader's dissolve: ragged fbm islands that open from the centre outward.
 * The noise field is built once in small chunks (so the loading counter never stutters);
 * each frame it is thresholded into a small mask canvas that the paper canvas cuts out with
 * destination-out. Nothing is encoded per frame, so it runs live at full frame rate.
 */
export class Dissolve {
  readonly w: number
  readonly h: number
  readonly mask: HTMLCanvasElement
  private field: Float32Array
  private sorted: Float32Array | null = null
  private img: ImageData
  private ctx: CanvasRenderingContext2D

  private constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.field = new Float32Array(w * h)
    this.mask = document.createElement('canvas')
    this.mask.width = w
    this.mask.height = h
    const ctx = this.mask.getContext('2d')
    if (!ctx) throw new Error('2d canvas unavailable')
    this.ctx = ctx
    this.img = ctx.createImageData(w, h)
  }

  /** bias 'center': islands open from the middle out (loader); 'bottom': they rise from the bottom edge. */
  static async prepare(viewW: number, viewH: number, isCancelled: () => boolean, bias: 'center' | 'bottom' = 'center') {
    // An element measured before layout settles can report 0: fall back to the window's shape.
    if (!(viewW > 0 && viewH > 0)) {
      viewW = window.innerWidth || 16
      viewH = window.innerHeight || 9
    }
    const area = 960 * 540
    const w = Math.round(Math.sqrt((area * viewW) / viewH))
    const h = Math.round(area / w)
    const d = new Dissolve(w, h)
    const { fbm } = createNoise(23)
    const scale = 3.1 / w
    const rowsPerChunk = 36
    for (let y0 = 0; y0 < h; y0 += rowsPerChunk) {
      if (isCancelled()) return null
      const y1 = Math.min(h, y0 + rowsPerChunk)
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x / w - 0.5
          const dy = (y / h - 0.5) * (h / w)
          const r = Math.sqrt(dx * dx + dy * dy) / 0.6
          const lean = bias === 'center' ? 0.32 * (1 - Math.min(1, r)) : 0.55 * (y / h)
          d.field[y * w + x] = fbm(x * scale + 11, y * scale - 4, 7, 2.05, 0.6) + lean
        }
      }
      await nextFrame()
    }
    d.sorted = Float32Array.from(d.field).sort()
    return d
  }

  /** Field value above which a pixel is open, for a given open share. */
  private threshold(open: number) {
    if (open <= 0 || !this.sorted) return Infinity
    if (open >= 1) return -Infinity
    return this.sorted[Math.floor((1 - open) * (this.sorted.length - 1))]!
  }

  /**
   * Writes the mask for an open share into this.mask.
   * holes = true: opaque where open (for destination-out); false: opaque where still covered (CSS mask).
   */
  render(open: number, holes = true) {
    const thr = this.threshold(open)
    const data = this.img.data
    const f = this.field
    const eps = 0.02
    for (let i = 0, n = f.length; i < n; i++) {
      const covered = Math.max(0, Math.min(1, (thr - f[i]!) / eps))
      data[i * 4 + 3] = (holes ? 1 - covered : covered) * 255
    }
    this.ctx.putImageData(this.img, 0, 0)
    return this.mask
  }

  /** A one-off CSS mask image (covered = opaque) for the loader's text layer. */
  async cssMask(open: number) {
    this.render(open, false)
    const blob = await new Promise<Blob | null>((r) => this.mask.toBlob(r, 'image/png'))
    return blob ? URL.createObjectURL(blob) : null
  }
}
