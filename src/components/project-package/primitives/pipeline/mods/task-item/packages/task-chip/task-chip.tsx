import React, { useEffect, useId, useState } from 'react'
import { buildBottomArcPath } from './utils/circular-text'
import ProgressArc from './mods/progress-arc'
import FeedbackProgression from '../task-deliverable/mods/feedback-progression'
import { FeedbackLoop, type FeedbackLoopEvent } from '../task-deliverable/utils/feedback-loop'
import { getDefaultProgress } from './utils/state-handler'
import './task-chip.css'

type TaskItemState = 'default' | 'automation' | 'manual' | 'outsource'

type StateConfig = {
  label?: string
  renderIcon: (strokeWidth: number, alpha: number) => JSX.Element
  containerAlpha?: number
  iconPx?: number
  labelFontSizePx?: number
}

const STATE_CONFIG: Record<TaskItemState, StateConfig> = {
  default: {
    label: 'ADD TASK',
    containerAlpha: 0.7,
    iconPx: 45,
    labelFontSizePx: 11,
    renderIcon: (strokeWidth: number, alpha: number) => (
      <svg
        className="task-item__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="45"
        height="45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        opacity={alpha}
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    ),
  },
  automation: {
    label: 'AUTOMATION',
    iconPx: 55,
    renderIcon: (strokeWidth: number, _alpha: number) => (
      <svg
        className="task-item__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="55"
        height="55"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        opacity={1}
      >
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
        <path d="M9 13a4.5 4.5 0 0 0 3-4" />
        <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
        <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
        <path d="M6 18a4 4 0 0 1-1.967-.516" />
        <path d="M12 13h4" />
        <path d="M12 18h6a2 2 0 0 1 2 2v1" />
        <path d="M12 8h8" />
        <path d="M16 8V5a2 2 0 0 1 2-2" />
        <circle cx="16" cy="13" r="0.5" />
        <circle cx="18" cy="3" r="0.5" />
        <circle cx="20" cy="21" r="0.5" />
        <circle cx="20" cy="8" r="0.5" />
      </svg>
    ),
  },
  manual: {
    label: 'MANUAL',
    iconPx: 55,
    renderIcon: (strokeWidth: number, _alpha: number) => (
      <svg
        className="task-item__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="55"
        height="55"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        opacity={1}
      >
        <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
        <path d="M20 2v4" />
        <path d="M22 4h-4" />
        <circle cx="4" cy="20" r="2" />
      </svg>
    ),
  },
  outsource: {
    label: 'OUTSOURCE',
    iconPx: 55,
    renderIcon: (strokeWidth: number, _alpha: number) => (
      <svg
        className="task-item__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="55"
        height="55"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        opacity={1}
      >
        <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z" />
        <path d="M8 15H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
      </svg>
    ),
  },
}

export type TaskItemProps = {
  state?: TaskItemState
  iconStrokeWidth?: number
  iconAlpha?: number
  // Label rendering style: 'arc' uses curved bottom path; 'rect' shows straight text in a rounded rectangle.
  labelMode?: 'arc' | 'rect'
  showProgress?: boolean
  progress?: number // 0..1; if undefined, will use default per-state
  showStateVisuals?: boolean
  forceArc?: boolean
  dimProgress?: boolean
  progressLabel?: string
}

const TaskItem: React.FC<TaskItemProps> = ({ state = 'default', iconStrokeWidth = 1, iconAlpha = 0.8, labelMode = 'arc', showProgress, progress, showStateVisuals = true, forceArc = false, dimProgress = false, progressLabel }) => {
  const id = useId()
  const [internalState, setInternalState] = useState<TaskItemState>(state)
  useEffect(() => { setInternalState(state) }, [state])
  const [flEv, setFlEv] = useState<FeedbackLoopEvent | null>(null)
  useEffect(() => {
    const offP = FeedbackLoop.on('progress', setFlEv)
    const offC = FeedbackLoop.on('complete', setFlEv)
    return () => { offP(); offC() }
  }, [])

  const size = 132
  // State configuration and whether we render a curved label
  const cfg = STATE_CONFIG[internalState]
  const hasLabel = !!cfg.label
  // Equidistant spacing (radial): distance to outer rim equals distance to icon circle
  const r = size / 2
  const iconSize = (STATE_CONFIG[internalState].iconPx ?? 90) // state-specific icon px
  const iconViewBox = 24 // viewBox width/height
  const iconCircleRInIcon = 10 // r=10 in the provided SVG
  const iconR = (iconSize / iconViewBox) * iconCircleRInIcon
  const inset = (r - iconR) / 2
  // Apply slight lowering only for labeled states to give top breathing room
  const extraLowering = hasLabel ? 3 : 0
  const adjInset = Math.max(0, inset - extraLowering)
  const d = buildBottomArcPath({ size, inset: adjInset, yOffset: 0 })

  const containerAlpha = cfg.containerAlpha ?? 1
  const deltaUp = hasLabel ? 6 : 0
  const iconDy = hasLabel ? -extraLowering / 2 - deltaUp : 0
  const textDy = -deltaUp
  const textOpacity = hasLabel ? (internalState === 'default' ? iconAlpha : 1) : 1

  // Progress arc wiring (floor at 1% when state is active)
  const progressValue = typeof progress === 'number' ? progress : getDefaultProgress(internalState)
  const percentValue = internalState !== 'default' ? Math.max(1, Math.round(progressValue * 100)) : Math.round(progressValue * 100)
  const isActive = internalState !== 'default'
  const shouldShowProgress = forceArc || ((showProgress ?? isActive) && !showStateVisuals)
  const visualsVisible = forceArc ? false : (showStateVisuals || !isActive) // always visible in default unless forceArc

  useEffect(() => {
    console.log('[TaskItem] state =', internalState)
  }, [internalState])

  return (
    <>
      <div
        className="task-item"
        aria-label="Task item"
        role="button"
        tabIndex={0}
        style={{ ['--film-opacity' as any]: String(containerAlpha) }}
      >
      {/* Deliverable feedback loop segmented arc overlay (shows only when active) */}
      {flEv?.active && (
        <FeedbackProgression size={size} phaseIndex={flEv.phaseIndex} phaseProgress={flEv.phaseProgress} />
      )}
      {shouldShowProgress && (
        <ProgressArc
          size={size}
          percent={percentValue}
          variant={2}
          outerGap={10}
          dimmed={dimProgress}
          showValue={!progressLabel}
        />
      )}
      {shouldShowProgress && progressLabel && (
        <div aria-live="polite" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 3, pointerEvents: 'none', color: '#FFFFFF', fontSize: 11, fontWeight: 500, letterSpacing: 0.3, textAlign: 'center', padding: '0 18px', opacity: 0.95 }}>
          {progressLabel}
        </div>
      )}
      <div className="task-item__state-visuals" data-visible={visualsVisible ? '1' : '0'}>
        <div className="task-item__icon-wrap" style={{ transform: `translateY(${iconDy}px)` }}>
          {cfg.renderIcon(iconStrokeWidth, iconAlpha)}
        </div>
        {cfg.label && labelMode === 'arc' && (
          <svg className="task-item__text-svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" style={{ transform: `translateY(${textDy}px)` }}>
            <defs>
              <path id={`task-item-arc-${id}`} d={d} />
            </defs>
            <text
              className="task-item__text"
              dominantBaseline="middle"
              textAnchor="middle"
              style={{
                fontSize: cfg.labelFontSizePx ? `${cfg.labelFontSizePx}px` : undefined,
                opacity: textOpacity,
              }}
            >
              <textPath href={`#task-item-arc-${id}`} startOffset="50%">{cfg.label}</textPath>
            </text>
          </svg>
        )}
        {cfg.label && labelMode === 'rect' && (
          <div className="task-item__label-rect" aria-hidden="true">
            <div className="task-item__label-rect-bg" />
            <div className="task-item__label-rect-text">{cfg.label}</div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}

export default TaskItem
