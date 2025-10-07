import type { Point } from './geometry'
import { getAnchorCenters } from './anchor-point'

export type PathPoints = { orientation: 'horizontal' | 'vertical'; from: Point; to: Point }

// Decide anchor sides based on dominant separation axis between node centers.
// - If |dx| >= |dy|: use horizontal connection: right of leftmost -> left of rightmost
// - Else: use vertical connection: bottom of topmost -> top of bottommost
function computeNearestAnchors(stage: DOMRect, a: DOMRect, b: DOMRect): PathPoints {
  const acx = a.left + a.width / 2
  const acy = a.top + a.height / 2
  const bcx = b.left + b.width / 2
  const bcy = b.top + b.height / 2
  const dx = bcx - acx
  const dy = bcy - acy

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal preference
    const leftRect = acx <= bcx ? a : b
    const rightRect = acx <= bcx ? b : a
    const leftAnchors = getAnchorCenters(leftRect)
    const rightAnchors = getAnchorCenters(rightRect)
    const from = { x: leftAnchors.right.x - stage.left, y: leftAnchors.right.y - stage.top }
    const to = { x: rightAnchors.left.x - stage.left, y: rightAnchors.left.y - stage.top }
    return { orientation: 'horizontal', from, to }
  } else {
    // Vertical preference
    const topRect = acy <= bcy ? a : b
    const bottomRect = acy <= bcy ? b : a
    const topAnchors = getAnchorCenters(topRect)
    const bottomAnchors = getAnchorCenters(bottomRect)
    const from = { x: topAnchors.bottom.x - stage.left, y: topAnchors.bottom.y - stage.top }
    const to = { x: bottomAnchors.top.x - stage.left, y: bottomAnchors.top.y - stage.top }
    return { orientation: 'vertical', from, to }
  }
}

// Attempts to read a more accurate inner rect when nodes are transformed internally
// by returning the firstElementChild's bounding box; falls back to wrapper.
function getEffectiveRect(wrap: HTMLElement): DOMRect {
  const inner = wrap.firstElementChild as HTMLElement | null
  return (inner || wrap).getBoundingClientRect()
}

// Start an animation loop that watches node positions (including CSS transforms)
// and calls onChange with new stage-relative anchor points whenever they change.
export function startPathAutoUpdate(args: {
  stage: HTMLElement
  a: HTMLElement
  b: HTMLElement
  onChange: (pts: PathPoints) => void
  epsilon?: number
}): () => void {
  const { stage, a, b, onChange, epsilon = 0.25 } = args
  let raf = 0
  let last: PathPoints | null = null

  const near = (x: number, y: number) => Math.abs(x - y) < epsilon

  const tick = () => {
    const sRect = stage.getBoundingClientRect()
    const aRect = getEffectiveRect(a)
    const bRect = getEffectiveRect(b)
    const next = computeNearestAnchors(sRect, aRect, bRect)
    if (
      !last ||
      !(
        last.orientation === next.orientation &&
        near(last.from.x, next.from.x) &&
        near(last.from.y, next.from.y) &&
        near(last.to.x, next.to.x) &&
        near(last.to.y, next.to.y)
      )
    ) {
      last = next
      onChange(next)
    }
    raf = window.requestAnimationFrame(tick)
  }

  raf = window.requestAnimationFrame(tick)
  return () => {
    if (raf) cancelAnimationFrame(raf)
  }
}
