import React, { useMemo } from 'react'
import './styles/prog-meter.css'
import './styles/prog-animations.css'
import { isComplete } from '../utils/task-completion'

export type ProgMeterProps = {
  percent?: number
  size?: number
  filmOpacity?: number
  className?: string
  stroke?: number
  trackColor?: string
  alpha?: number
  variant?: 1 | 2
  outerGap?: number
}

const ProgMeter: React.FC<ProgMeterProps> = ({
  percent = 0,
  size = 132,
  filmOpacity = 1,
  className,
  stroke = 8,
  trackColor = 'transparent',
  alpha = 0.7,
  variant = 1,
  outerGap = 10,
}) => {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  const cls = ['prog-meter']
  if (className) cls.push(className)

  const { r, ringStroke, dashArray, segLen, cx, cy } = useMemo(() => {
    // Variant-specific geometry
    // Style 1: 9px, Style 2: 2px
    const s = (variant === 1) ? 9 : 2
    const inset = (variant === 2) ? outerGap : 0 // outer gap only for style 2
    const radius = size / 2 - inset - s / 2
    const c = 2 * Math.PI * radius
    const seg = (c * p) / 100
    return {
      r: radius,
      ringStroke: s,
      dashArray: c,
      segLen: seg,
      cx: size / 2,
      cy: size / 2,
    }
  }, [size, stroke, p, variant, outerGap])

  // Both styles use white stroke color
  const strokeColor = '#FFFFFF'
  const completed = isComplete(p)
  const progressStyle: React.CSSProperties = {
    ...(variant === 2
      ? { filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.35)) drop-shadow(0 0 6px rgba(255,255,255,0.25))' }
      : {}),
  }

  return (
    <div
      className={cls.concat(completed ? 'is-complete' : '').join(' ').replace(/\s+/g,' ').trim()}
      aria-label="Progress meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      style={{ width: size, height: size, ['--film-opacity' as any]: String(filmOpacity), ['--pm-stroke-alpha' as any]: String(alpha) }}
    >
      {/* Circular ring (track + progress) */}
      <svg className="prog-meter__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle
          className="prog-meter__track"
          cx={cx}
          cy={cy}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
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
      {/* Center label */}
      {completed ? (
        <div className="prog-meter__check" aria-label="Completed">
          <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path className="prog-meter__check-path" pathLength={100} d="M4 12L9 17L20 6" />
          </svg>
        </div>
      ) : (
        <div className="prog-meter__value">{p}%</div>
      )}
    </div>
  )
}

export default ProgMeter
