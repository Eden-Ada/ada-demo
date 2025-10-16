import React, { useMemo } from 'react'
// Use the exact same CSS as Task Deliverable's feedback progression to ensure identical visuals
import './task-item/packages/task-deliverable/styles/feedback-progression.css'

export type RefreshProgressProps = {
  size: number
  percent: number // 0..100
  statusText?: string
  visible?: boolean
  rotationDeg?: number // default -90deg (12 o'clock)
  seamEpsilon?: number // px nudge
  className?: string
}

const RefreshProgress: React.FC<RefreshProgressProps> = ({
  size,
  percent,
  statusText,
  visible = true,
  rotationDeg = -90,
  seamEpsilon = 0,
  className,
}) => {
  const { r, stroke } = useMemo(() => {
    const ringStroke = 2
    const radius = size / 2 - 10 - ringStroke / 2
    return { r: radius, stroke: ringStroke }
  }, [size])

  if (!visible) return null

  const p = Math.max(0, Math.min(100, Math.round(percent))) / 100

  return (
    <div className={`feedback-progression${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden>
      <svg className="feedback-progression__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ transform: `rotate(${rotationDeg}deg)`, transformOrigin: '50% 50%' }}>
        {/* Base track (full circle) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="feedback-progression__seg"
          strokeWidth={stroke}
          strokeDasharray="1 0"
          strokeDashoffset={seamEpsilon}
          strokeLinecap="round"
          pathLength={1}
          fill="none"
        />
        {/* Progress overlay */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="feedback-progression__progress"
          strokeWidth={stroke}
          strokeDasharray={`${p} ${1 - p}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          pathLength={1}
          fill="none"
        />
      </svg>
      <div className="feedback-progression__center">
        <div className="fp-pct">{Math.round(p * 100)}%</div>
        {statusText ? <div className="fp-task">{statusText}</div> : null}
      </div>
    </div>
  )
}

export default RefreshProgress
