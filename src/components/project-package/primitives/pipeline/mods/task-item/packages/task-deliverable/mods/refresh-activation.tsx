import React, { useEffect, useMemo, useRef } from 'react'
import '../styles/refresh-activation.css'
import { useRefreshActivation } from '../utils/refresh-activation'

export type RefreshActivationProps = {
  diameter: number
  onComplete?: () => void
  className?: string
  children: React.ReactNode
  onActiveChange?: (active: boolean) => void
}

const RefreshActivation: React.FC<RefreshActivationProps> = ({ diameter, onComplete, className, children, onActiveChange }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const { active, progress, handlers, cancel } = useRefreshActivation({ durationMs: 1500, onComplete })

  // Ensure cancellation only on unmount (not on each render)
  useEffect(() => {
    return () => cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notify parent about active state changes (for pausing connector flow)
  useEffect(() => {
    onActiveChange?.(active)
  }, [active, onActiveChange])

  const { r, c, stroke } = useMemo(() => {
    const strokeW = 2 // match ProgressArc variant 2
    const radius = (diameter - strokeW) / 2
    const circ = 2 * Math.PI * radius
    return { r: radius, c: circ, stroke: strokeW }
  }, [diameter])

  return (
    <div
      ref={wrapRef}
      className={"refresh-activation " + (className || '')}
      style={{ ['--rf-d' as any]: `${diameter}px` }}
      data-active={active ? '1' : '0'}
      data-pan-block="1"
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
      onPointerLeave={undefined}
    >
      {/* Child content (the refresh orb) */}
      {children}
      {/* Visual activation arc: only visible while long-press is active */}
      {active && (
        <svg className="refresh-activation__halo" viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden>
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            className="refresh-activation__progress"
            strokeWidth={stroke}
            strokeDasharray={`${c * progress} ${c}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  )
}

export default RefreshActivation
