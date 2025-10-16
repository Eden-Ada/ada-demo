import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import './styles/connector.css'
import './styles/connector-animations.css'
import { twoKnotPath } from './utils/geometry'
import { startPathAutoUpdate, type PathPoints } from './utils/update-path'
import { getAnchorCenters, type AnchorSide } from './utils/anchor-point'

export type ConnectorProps = {
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  // Legacy prop (ignored with rounded orth): kept for harness/back-compat
  curvature?: number
  color?: string
  width?: number
  dashArray?: string
  className?: string
  radius?: number
  offset?: number
  flow?: 'forward' | 'reverse' | 'none'
  orientation?: 'horizontal' | 'vertical'
  // Auto mode (plug-and-play): if these are provided, the connector will compute
  // and track anchors between elements automatically.
  stageEl?: HTMLElement | null
  fromEl?: HTMLElement | null
  toEl?: HTMLElement | null
  epsilon?: number
  // Optional hard anchor selection when using auto elements
  fromSide?: AnchorSide
  toSide?: AnchorSide
  // Overlay target: draw inside the stage element (default) or as a viewport-fixed overlay.
  // Use 'viewport' when ancestors apply CSS transforms (pan/zoom) so coordinates remain coherent.
  overlay?: 'stage' | 'viewport'
  // Optional extra style for the outer svg element (e.g., to pass CSS vars for intro animations)
  svgStyle?: React.CSSProperties
  // Optional per-end axis to force orthogonal plug direction
  fromAxis?: 'horizontal' | 'vertical'
  toAxis?: 'horizontal' | 'vertical'
}

// Build a mixed-orientation Manhattan path (single rounded elbow) when
// start/end axes differ, e.g. start vertical (top/bottom) and end horizontal (left/right).
function mixedOrthPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts: { radius?: number; start: 'horizontal' | 'vertical'; end: 'horizontal' | 'vertical' }
): string | null {
  const sx = from.x, sy = from.y
  const tx = to.x, ty = to.y
  const dx = tx - sx, dy = ty - sy
  const adx = Math.abs(dx), ady = Math.abs(dy)
  const sdx = dx === 0 ? 1 : Math.sign(dx)
  const sdy = dy === 0 ? 1 : Math.sign(dy)
  const desiredR = Math.max(2, opts.radius ?? 18)
  const r = Math.max(2, Math.min(desiredR, adx, ady))

  if (opts.start === opts.end) return null
  if (adx === 0 && ady === 0) return `M ${sx} ${sy} L ${tx} ${ty}`

  if (opts.start === 'vertical' && opts.end === 'horizontal') {
    // Leave vertically from start, arrive horizontally at end
    const p1 = { x: sx, y: ty - sdy * r }
    const qCtrl = { x: sx, y: ty }
    const qEnd = { x: sx + sdx * r, y: ty }
    return [
      `M ${sx} ${sy}`,
      `L ${p1.x} ${p1.y}`,
      `Q ${qCtrl.x} ${qCtrl.y} ${qEnd.x} ${qEnd.y}`,
      `L ${tx} ${ty}`,
    ].join(' ')
  }

  if (opts.start === 'horizontal' && opts.end === 'vertical') {
    // Leave horizontally from start, arrive vertically at end
    const p1 = { x: tx - sdx * r, y: sy }
    const qCtrl = { x: tx, y: sy }
    const qEnd = { x: tx, y: sy + sdy * r }
    return [
      `M ${sx} ${sy}`,
      `L ${p1.x} ${p1.y}`,
      `Q ${qCtrl.x} ${qCtrl.y} ${qEnd.x} ${qEnd.y}`,
      `L ${tx} ${ty}`,
    ].join(' ')
  }

  return null
}

const Connector: React.FC<ConnectorProps> = ({
  from,
  to,
  curvature: _curvature = 0.25, // ignored
  color = 'rgba(255,255,255,0.7)',
  width = 2,
  dashArray,
  className,
  radius,
  offset: _offset,
  flow = 'forward',
  orientation,
  stageEl,
  fromEl,
  toEl,
  epsilon,
  fromSide,
  toSide,
  overlay,
  svgStyle,
  fromAxis,
  toAxis,
}) => {
  // Auto mode state (if element props are provided)
  const [auto, setAuto] = useState<PathPoints | null>(null)

  const useAuto = !!(stageEl && fromEl && toEl)
  const overlayMode = overlay ?? 'stage'

  useEffect(() => {
    if (!useAuto) return
    const stop = startPathAutoUpdate({ stage: stageEl!, a: fromEl!, b: toEl!, onChange: setAuto, epsilon, useViewportCoords: overlayMode === 'viewport' })
    return stop
  }, [useAuto, stageEl, fromEl, toEl, epsilon, overlayMode])

  const actualOrientation = orientation ?? (auto ? auto.orientation : undefined)
  const fromPt = from ?? { x: 0, y: 0 }
  const toPt = to ?? { x: 0, y: 0 }
  const pathD = useMemo(() => {
    // Mixed-orientation manual mode takes precedence when numeric points are provided
    if (!useAuto && (fromAxis || toAxis)) {
      const startAxis = (fromAxis ?? (orientation as any)) as 'horizontal' | 'vertical' | undefined
      const endAxis = (toAxis ?? (orientation as any)) as 'horizontal' | 'vertical' | undefined
      if (startAxis && endAxis) {
        if (startAxis === endAxis) {
          return twoKnotPath(fromPt, toPt, { radius, orientation: startAxis })
        }
        const mixed = mixedOrthPath(fromPt, toPt, { radius, start: startAxis, end: endAxis })
        if (mixed) return mixed
      }
    }
    // If in auto mode and explicit sides are requested, compute stage-relative points
    if (useAuto && stageEl && fromEl && toEl && (fromSide || toSide)) {
      try {
        const s = stageEl.getBoundingClientRect()
        // Use effective rects that account for inner transforms if present
        const getEffectiveRect = (el: HTMLElement): DOMRect => {
          const inner = el.firstElementChild as HTMLElement | null
          if (inner) {
            const t = getComputedStyle(inner).transform
            if (t && t !== 'none') return inner.getBoundingClientRect()
          }
          return el.getBoundingClientRect()
        }
        const fr = getEffectiveRect(fromEl)
        const tr = getEffectiveRect(toEl)
        const fC = getAnchorCenters(fr)
        const tC = getAnchorCenters(tr)
        const fSide = (fromSide ?? 'right') as AnchorSide
        const tSide = (toSide ?? 'left') as AnchorSide
        const fPt = (fC as any)[fSide]
        const tPt = (tC as any)[tSide]
        const aFrom = overlayMode === 'viewport' ? { x: fPt.x, y: fPt.y } : { x: fPt.x - s.left, y: fPt.y - s.top }
        const aTo   = overlayMode === 'viewport' ? { x: tPt.x, y: tPt.y } : { x: tPt.x - s.left, y: tPt.y - s.top }
        const aOrient = orientation ?? 'vertical'
        return twoKnotPath(aFrom, aTo, { radius, orientation: aOrient })
      } catch {
        // fallback to defaults below
      }
    }
    const aFrom = useAuto && auto ? auto.from : fromPt
    const aTo = useAuto && auto ? auto.to : toPt
    const aOrient = actualOrientation
    return twoKnotPath(aFrom, aTo, { radius, orientation: aOrient })
  }, [useAuto, auto, fromPt.x, fromPt.y, toPt.x, toPt.y, radius, actualOrientation, orientation, stageEl, fromEl, toEl, fromSide, toSide, overlayMode])

  const flowClass = flow === 'none' ? '' : flow === 'reverse' ? ' connector--flow-reverse' : ' connector--flow-forward'
  const baseSvgStyle = overlayMode === 'viewport' ? { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', pointerEvents: 'none' } as React.CSSProperties : undefined
  const svg = (
    <svg className={"connector " + (className || '') + flowClass} aria-hidden="true" style={{ ...(baseSvgStyle || {}), ...(svgStyle || {}) }}>
      <path d={pathD} style={{ stroke: color, strokeWidth: width, strokeDasharray: dashArray }} />
    </svg>
  )
  if (overlayMode === 'viewport') {
    return createPortal(svg, document.body)
  }
  return svg
}

export default Connector
