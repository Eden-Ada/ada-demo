import React, { useMemo } from 'react'
import '../../../../task-block/prog-meter/styles/prog-meter.css'
import '../../../../task-block/prog-meter/styles/prog-animations.css'
import { isComplete } from '../../../../task-block/utils/task-completion'

export type ProgressArcProps = {
  size: number
  // preferred API: percent 0..100; fallback: progress 0..1
  percent?: number
  progress?: number
  variant?: 1 | 2
  outerGap?: number
  dimmed?: boolean
  showValue?: boolean
}

const ProgressArc: React.FC<ProgressArcProps> = ({
  size,
  percent,
  progress,
  variant = 2,
  outerGap = 10,
  dimmed = false,
  showValue = true,
}) => {
  const p = useMemo(() => {
    if (typeof percent === 'number') return Math.max(0, Math.min(100, Math.round(percent)))
    if (typeof progress === 'number') return Math.max(0, Math.min(100, Math.round(progress * 100)))
    return 0
  }, [percent, progress])

  const { r, ringStroke, dashArray, segLen, cx, cy } = useMemo(() => {
    const s = (variant === 1) ? 9 : 2
    const inset = (variant === 2) ? outerGap : 0
    const radius = size / 2 - inset - s / 2
    const c = 2 * Math.PI * radius
    const seg = (c * p) / 100
    return { r: radius, ringStroke: s, dashArray: c, segLen: seg, cx: size / 2, cy: size / 2 }
  }, [size, p, variant, outerGap])

  const strokeColor = '#FFFFFF'
  const progressStyle: React.CSSProperties = (variant === 2)
    ? { filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.35)) drop-shadow(0 0 6px rgba(255,255,255,0.25))' }
    : {}
  const completed = isComplete(p)

  return (
    <div
      className={`prog-meter ${completed ? 'is-complete' : ''}`.trim()}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'transparent', boxShadow: 'none', borderRadius: 9999, width: size, height: size, backdropFilter: 'none', WebkitBackdropFilter: 'none', opacity: dimmed ? 0 : 1, transition: 'opacity 200ms ease' }}
      aria-hidden="true"
    >
      <svg className="prog-meter__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="prog-meter__progress"
          cx={cx}
          cy={cy}
          r={r}
          stroke={strokeColor}
          strokeWidth={ringStroke}
          fill="none"
          {...(p >= 100 ? {} : { strokeDasharray: `${segLen} ${dashArray}` })}
          strokeDashoffset={0}
          pathLength={dashArray}
          style={progressStyle}
        />
      </svg>
      {completed || !showValue ? null : <div className="prog-meter__value">{p}</div>}
    </div>
  )
}

export default ProgressArc
