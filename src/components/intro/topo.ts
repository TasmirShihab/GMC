import { createNoise } from '@/lib/noise'

/**
 * Draws a static topographic contour map into a canvas: marching squares over domain-warped
 * noise, every 5th contour heavier, some contours dotted, faded out to an ellipse in the middle.
 */
export function drawTopo(canvas: HTMLCanvasElement, width: number, height: number, color = '75, 62, 45') {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const { fbm } = createNoise(7)
  const cx = width * 0.5
  const cy = height * 0.51
  const rx = Math.max(width * 0.36, 260)
  const ry = Math.max(height * 0.4, 200)

  // Only compute inside the faded ellipse's bounds.
  const x0 = Math.max(0, cx - rx * 1.05)
  const x1 = Math.min(width, cx + rx * 1.05)
  const y0 = Math.max(0, cy - ry * 1.05)
  const y1 = Math.min(height, cy + ry * 1.05)

  const step = 3.5
  const nx = Math.ceil((x1 - x0) / step) + 1
  const ny = Math.ceil((y1 - y0) / step) + 1
  const field = new Float32Array(nx * ny)
  const scale = 2.5 / Math.max(width, 900)
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = (x0 + i * step) * scale
      const y = (y0 + j * step) * scale
      const wx = fbm(x + 3.1, y + 1.7, 2) * 0.55
      const wy = fbm(x - 2.3, y + 5.2, 2) * 0.55
      const v = fbm(x + wx, y + wy, 4, 2, 0.42)
      field[j * nx + i] = v
      if (v < min) min = v
      if (v > max) max = v
    }
  }

  const levels = 34
  for (let l = 1; l < levels; l++) {
    const iso = min + ((max - min) * l) / levels
    const index = l % 5 === 0
    const dotted = !index && l % 3 === 1
    ctx.beginPath()
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = field[j * nx + i]!
        const b = field[j * nx + i + 1]!
        const c = field[(j + 1) * nx + i + 1]!
        const d = field[(j + 1) * nx + i]!
        let k = 0
        if (a > iso) k |= 8
        if (b > iso) k |= 4
        if (c > iso) k |= 2
        if (d > iso) k |= 1
        if (k === 0 || k === 15) continue
        const px = x0 + i * step
        const py = y0 + j * step
        // Edge crossing points: top, right, bottom, left.
        const t = () => [px + step * ((iso - a) / (b - a)), py] as const
        const r = () => [px + step, py + step * ((iso - b) / (c - b))] as const
        const bt = () => [px + step * ((iso - d) / (c - d)), py + step] as const
        const lf = () => [px, py + step * ((iso - a) / (d - a))] as const
        const seg = (p: readonly [number, number], q: readonly [number, number]) => {
          if (dotted) {
            if ((i + j) % 2) return
            const mx = (p[0] + q[0]) / 2
            const my = (p[1] + q[1]) / 2
            ctx.moveTo(mx + 0.55, my)
            ctx.arc(mx, my, 0.55, 0, Math.PI * 2)
          } else {
            ctx.moveTo(p[0], p[1])
            ctx.lineTo(q[0], q[1])
          }
        }
        switch (k) {
          case 1: case 14: seg(lf(), bt()); break
          case 2: case 13: seg(bt(), r()); break
          case 3: case 12: seg(lf(), r()); break
          case 4: case 11: seg(t(), r()); break
          case 6: case 9: seg(t(), bt()); break
          case 7: case 8: seg(lf(), t()); break
          case 5: seg(lf(), t()); seg(bt(), r()); break
          case 10: seg(lf(), bt()); seg(t(), r()); break
        }
      }
    }
    if (dotted) {
      ctx.fillStyle = `rgba(${color}, 0.26)`
      ctx.fill()
    } else {
      ctx.lineWidth = index ? 1.15 : 0.8
      ctx.lineCap = 'round'
      ctx.strokeStyle = `rgba(${color}, ${index ? 0.22 : 0.14})`
      ctx.stroke()
    }
  }

  // Fade everything out towards an ellipse edge.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.translate(cx, cy)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.95)')
  g.addColorStop(0.8, 'rgba(0,0,0,0.35)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
  ctx.restore()
}
