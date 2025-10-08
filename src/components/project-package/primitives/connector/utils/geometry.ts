export type Point = { x: number; y: number }

// Two-knot connector path. Ensures the connector leaves and enters anchors orthogonally.
// orientation: 'horizontal' => horizontal at ends, vertical in middle (left/right anchors)
// orientation: 'vertical'   => vertical at ends, horizontal in middle (top/bottom anchors)
export function twoKnotPath(
  from: Point,
  to: Point,
  opts: { radius?: number; orientation?: 'horizontal' | 'vertical'; alignedEps?: number } = {}
): string {
  const sx = from.x, sy = from.y
  const tx = to.x, ty = to.y
  const dx = tx - sx, dy = ty - sy
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  const sdx = dx === 0 ? 1 : Math.sign(dx)
  const sdy = dy === 0 ? 1 : Math.sign(dy)
  const orientation = opts.orientation ?? (Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical')
  const desiredR = Math.max(2, opts.radius ?? 18)
  const alignedEps = opts.alignedEps ?? 12

  if (orientation === 'horizontal') {
    // If vertical separation is negligible, draw a straight horizontal line to avoid degenerate knots.
    if (ady <= alignedEps) {
      return `M ${sx} ${sy} L ${tx} ${ty}`
    }
    // Vertical trunk at midX. Always produce two knots when there is vertical separation.
    const midX = sx + dx / 2
    const r = Math.max(4, Math.min(desiredR, Math.abs(midX - sx), Math.abs(tx - midX)))
    const p1a = { x: midX - sdx * r, y: sy }
    const p1b = { x: midX, y: sy + sdy * r }
    const p2a = { x: midX, y: ty - sdy * r }
    const p2b = { x: midX + sdx * r, y: ty }
    return [
      `M ${sx} ${sy}`,
      `L ${p1a.x} ${p1a.y}`,
      `Q ${midX} ${sy} ${p1b.x} ${p1b.y}`,
      `L ${p2a.x} ${p2a.y}`,
      `Q ${midX} ${ty} ${p2b.x} ${p2b.y}`,
      `L ${tx} ${ty}`,
    ].join(' ')
  } else {
    // Horizontal trunk at midY
    if (Math.abs(dx) <= alignedEps) {
      // Perfect (or near) vertical alignment: straight line
      return `M ${sx} ${sy} L ${tx} ${ty}`
    }
    const midY = sy + dy / 2
    const r = Math.min(desiredR, Math.abs(midY - sy), Math.abs(ty - midY), adx / 2)
    if (r <= 0) return `M ${sx} ${sy} L ${tx} ${ty}`
    const p1a = { x: sx, y: midY - sdy * r }
    const p1b = { x: sx + sdx * r, y: midY }
    const p2a = { x: tx - sdx * r, y: midY }
    const p2b = { x: tx, y: midY + sdy * r }
    return [
      `M ${sx} ${sy}`,
      `L ${p1a.x} ${p1a.y}`,
      `Q ${sx} ${midY} ${p1b.x} ${p1b.y}`,
      `L ${p2a.x} ${p2a.y}`,
      `Q ${tx} ${midY} ${p2b.x} ${p2b.y}`,
      `L ${tx} ${ty}`,
    ].join(' ')
  }
}

// Back-compat export name. Defaults to the horizontal two-knot path when no orientation is provided.
export function smoothStepPath(
  from: Point,
  to: Point,
  opts: { radius?: number; offset?: number } = {}
): string {
  return twoKnotPath(from, to, { radius: opts.radius, orientation: 'horizontal' })
}

// FigJam-like "knot" path: a horizontal run, two opposing quarter-circle arcs (S-step) producing
// a vertical offset of 2r, then a final horizontal run to the target. No orthogonal trunk.
export function knotPath(from: Point, to: Point, opts: { radius?: number; margin?: number } = {}): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const sdx = dx === 0 ? 1 : Math.sign(dx)
  const sdy = dy === 0 ? 0 : Math.sign(dy)
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  if (ady === 0) {
    // Same row: straight segment
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  }

  const margin = Math.max(0, opts.margin ?? 16)
  let rDesired = opts.radius ?? 18
  // Ensure the S-step can achieve the vertical offset: 2r = |dy| -> r = |dy|/2
  rDesired = Math.min(rDesired, ady / 2)
  // Also ensure we have enough horizontal room: total step width = 2r + margin in front
  const maxRByDx = Math.max(4, (adx - margin) / 2)
  let r = clamp(rDesired, 4, maxRByDx)
  // If still impossible (very small dx), degrade to straight line
  if (r <= 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`

  const x0 = from.x + sdx * margin

  const p0 = { x: from.x, y: from.y }
  const p1 = { x: x0, y: from.y }
  const p2 = { x: x0 + sdx * r, y: from.y + sdy * r }
  const p3 = { x: x0 + 2 * sdx * r, y: from.y + 2 * sdy * r }
  const p4 = { x: to.x, y: to.y }

  // Sweep selection for the two opposing quarter arcs
  const sweep1: 0 | 1 = (sdx > 0 ? (sdy > 0 ? 1 : 0) : (sdy > 0 ? 0 : 1)) as 0 | 1
  const sweep2: 0 | 1 = (sweep1 ? 0 : 1) as 0 | 1

  const arc = (toX: number, toY: number, sweep: 0 | 1) => `A ${r} ${r} 0 0 ${sweep} ${toX} ${toY}`

  return [
    `M ${p0.x} ${p0.y}`,
    `L ${p1.x} ${p1.y}`,
    arc(p2.x, p2.y, sweep1),
    arc(p3.x, p3.y, sweep2),
    `L ${p4.x} ${p4.y}`,
  ].join(' ')
}

// Utility helpers
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

// Build a smooth cubic-bezier path between two points (kept for reference/fallback)
export function cubicPath(from: Point, to: Point, curvature = 0.25): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const handle = Math.max(24, dist * curvature * 0.5)
  const theta = Math.atan2(dy, dx)
  const hx = Math.cos(theta) * handle
  const hy = Math.sin(theta) * handle
  const c1 = { x: from.x + hx, y: from.y + hy }
  const c2 = { x: to.x - hx, y: to.y - hy }
  return `M ${from.x},${from.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`
}

