import type { Point } from './geometry'

export type AnchorSide = 'left' | 'right' | 'top' | 'bottom'

export type AnchorSet = {
  left: Point
  right: Point
  top: Point
  bottom: Point
}

export function getAnchorCenters(rect: DOMRect): AnchorSet {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return {
    left: { x: rect.left, y: cy },
    right: { x: rect.right, y: cy },
    top: { x: cx, y: rect.top },
    bottom: { x: cx, y: rect.bottom },
  }
}

export function getAnchorPoint(rect: DOMRect, side: AnchorSide): Point {
  const a = getAnchorCenters(rect)
  return a[side]
}

export function pickNearestAnchorSide(source: DOMRect, target: DOMRect): AnchorSide {
  // Vector from source center to target center
  const sx = source.left + source.width / 2
  const sy = source.top + source.height / 2
  const tx = target.left + target.width / 2
  const ty = target.top + target.height / 2
  const dx = tx - sx
  const dy = ty - sy

  // Choose axis with larger absolute separation; then choose facing side
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  } else {
    return dy >= 0 ? 'bottom' : 'top'
  }
}
