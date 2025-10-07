export type TierKey = 'low' | 'medium' | 'high'

export type TierSegment = {
  key: TierKey
  start: number // degrees
  end: number   // degrees
  path: string  // SVG path for a donut slice
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcTo(p: { x: number; y: number }, r: number, largeArc: number, sweep: number) {
  return `A ${r} ${r} 0 ${largeArc} ${sweep} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
}

function wedgePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number
) {
  const startOuter = polar(cx, cy, rOuter, startDeg)
  const endOuter = polar(cx, cy, rOuter, endDeg)
  const startInner = polar(cx, cy, rInner, endDeg) // note: reverse at inner arc
  const endInner = polar(cx, cy, rInner, startDeg)
  const largeOuter = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  const largeInner = largeOuter
  const outerSweep = 1
  const innerSweep = 0
  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    arcTo(endOuter, rOuter, largeOuter, outerSweep),
    `L ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    arcTo(endInner, rInner, largeInner, innerSweep),
    'Z',
  ].join(' ')
}

export function renderThreeTiers(
  size: number,
  rOuter: number,
  rInner: number,
  padDeg = 0
): TierSegment[] {
  const cx = size / 2
  const cy = size / 2
  // Three equal 120° slices, starting at -90° (top center)
  const spans: Array<{ key: TierKey; start: number; end: number }> = [
    { key: 'low', start: -90, end: 30 },
    { key: 'medium', start: 30, end: 150 },
    { key: 'high', start: 150, end: 270 },
  ]
  return spans.map(({ key, start, end }) => {
    const s = start + padDeg / 2
    const e = end - padDeg / 2
    return {
      key,
      start: s,
      end: e,
      path: wedgePath(cx, cy, rOuter, rInner, s, e),
    }
  })
}
