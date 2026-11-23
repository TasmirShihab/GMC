/**
 * Points spaced evenly along a straight-segment SVG path ("M x y L x y … Z"), like the traced GMC outline.
 * Pure maths, so it runs on the server and the client alike (no DOM needed).
 */
export function pointsAlong(d: string, count: number): [number, number][] {
  const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  )
  if (pts.length < 2) return []
  if (/z\s*$/i.test(d.trim())) pts.push(pts[0]!)

  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    cum.push(cum[i - 1]! + Math.hypot(x1 - x0, y1 - y0))
  }
  const total = cum[cum.length - 1]!

  const out: [number, number][] = []
  let seg = 1
  for (let k = 0; k < count; k++) {
    const target = (total * k) / count
    while (seg < cum.length - 1 && cum[seg]! < target) seg++
    const a = pts[seg - 1]!
    const b = pts[seg]!
    const span = cum[seg]! - cum[seg - 1]! || 1
    const t = (target - cum[seg - 1]!) / span
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

/**
 * The ridge (northern edge) of a closed straight-segment outline, as `count` heights from west to east,
 * each 0 (highest point of the ridge) .. 1 (lowest). Used to draw the GMC outline's profile as a line.
 */
export function ridgeProfile(d: string, count: number): number[] {
  const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  )
  if (pts.length < 3) return Array(count).fill(0.5)
  pts.push(pts[0]!)
  const xs = pts.map((p) => p[0])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const out: number[] = []
  for (let k = 0; k < count; k++) {
    // sample just inside the ends so the vertical line always crosses the outline
    const x = minX + ((maxX - minX) * (k + 0.5)) / count
    let top = Infinity
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!
      const [x1, y1] = pts[i]!
      if ((x0 - x) * (x1 - x) > 0 || x0 === x1) continue
      const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
      if (y < top) top = y
    }
    out.push(top)
  }
  const lo = Math.min(...out)
  const hi = Math.max(...out)
  return out.map((y) => (hi > lo ? (y - lo) / (hi - lo) : 0.5))
}
