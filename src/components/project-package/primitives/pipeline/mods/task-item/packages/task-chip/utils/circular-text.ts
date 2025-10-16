export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export type BottomArcOptions = {
  size: number
  inset?: number   // radial inset: larger values lift text inward (toward center)
  yOffset?: number // vertical offset from center; positive pushes the arc downward
}

// Deterministic bottom wrap: horizontal endpoints below center.
// Small-arc (0) with sweep=0 reliably selects the lower arc between points at the same y.
export function buildBottomArcPath({ size, inset = 24, yOffset = 4 }: BottomArcOptions) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2
  const textRadius = r - inset
  const y = cy + yOffset
  const x0 = cx - textRadius
  const x1 = cx + textRadius
  const largeArc = 0
  const sweep = 0
  return `M ${x0.toFixed(2)} ${y.toFixed(2)} A ${textRadius} ${textRadius} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y.toFixed(2)}`
}
