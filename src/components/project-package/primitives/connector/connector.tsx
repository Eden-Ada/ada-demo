import React from 'react'
import './styles/connector.css'
import './styles/connector-animations.css'
import { twoKnotPath } from './utils/geometry'

export type ConnectorProps = {
  from: { x: number; y: number }
  to: { x: number; y: number }
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
}) => {
  const d = twoKnotPath(from, to, { radius, orientation })
  const flowClass = flow === 'none' ? '' : flow === 'reverse' ? ' connector--flow-reverse' : ' connector--flow-forward'
  return (
    <svg className={"connector " + (className || '') + flowClass} aria-hidden="true">
      <path d={d} style={{ stroke: color, strokeWidth: width, strokeDasharray: dashArray }} />
    </svg>
  )
}

export default Connector
