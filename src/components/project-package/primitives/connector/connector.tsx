import React, { useEffect, useMemo, useState } from 'react'
import './styles/connector.css'
import './styles/connector-animations.css'
import { twoKnotPath } from './utils/geometry'
import { startPathAutoUpdate, type PathPoints } from './utils/update-path'

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
}) => {
  // Auto mode state (if element props are provided)
  const [auto, setAuto] = useState<PathPoints | null>(null)

  const useAuto = !!(stageEl && fromEl && toEl)

  useEffect(() => {
    if (!useAuto) return
    const stop = startPathAutoUpdate({ stage: stageEl!, a: fromEl!, b: toEl!, onChange: setAuto, epsilon })
    return stop
  }, [useAuto, stageEl, fromEl, toEl, epsilon])

  const actualOrientation = orientation ?? (auto ? auto.orientation : undefined)
  const fromPt = from ?? { x: 0, y: 0 }
  const toPt = to ?? { x: 0, y: 0 }
  const pathD = useMemo(() => {
    const aFrom = useAuto && auto ? auto.from : fromPt
    const aTo = useAuto && auto ? auto.to : toPt
    const aOrient = actualOrientation
    return twoKnotPath(aFrom, aTo, { radius, orientation: aOrient })
  }, [useAuto, auto, fromPt.x, fromPt.y, toPt.x, toPt.y, radius, actualOrientation])

  const flowClass = flow === 'none' ? '' : flow === 'reverse' ? ' connector--flow-reverse' : ' connector--flow-forward'
  return (
    <svg className={"connector " + (className || '') + flowClass} aria-hidden="true">
      <path d={pathD} style={{ stroke: color, strokeWidth: width, strokeDasharray: dashArray }} />
    </svg>
  )
}

export default Connector
