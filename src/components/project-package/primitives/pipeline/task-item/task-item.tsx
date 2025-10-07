import React, { useEffect, useId, useRef, useState } from 'react'
import { buildBottomArcPath } from './utils/circular-text'
import './task-item.css'
import SelectionTooltip from '../selection-tooltip/selection-tooltip'

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
}

const TaskItem: React.FC<TaskItemProps> = ({ state = 'default', iconStrokeWidth = 1, iconAlpha = 0.8 }) => {
  const id = useId()
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [internalState, setInternalState] = useState<TaskItemState>(state)
  useEffect(() => { setInternalState(state) }, [state])

  const openMenu = (e?: React.SyntheticEvent) => {
    if (e) {
      const ne: any = (e as any).nativeEvent
      console.log('[TaskItem] openMenu', {
        type: (e as any).type,
        cancelable: !!ne?.cancelable,
        target: (e.target as HTMLElement)?.className || (e.target as any)?.nodeName,
      })
      // Avoid warnings: only preventDefault on cancelable events
      if (ne && ne.cancelable) (e as any).preventDefault()
      if (typeof (e as any).stopPropagation === 'function') (e as any).stopPropagation()
    } else {
      console.log('[TaskItem] openMenu (no event)')
    }
    setMenuOpen(true)
  }

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

  useEffect(() => {
    console.log('[TaskItem] anchorEl set?', !!anchorEl)
  }, [anchorEl])
  useEffect(() => {
    console.log('[TaskItem] menuOpen =', menuOpen)
  }, [menuOpen])
  useEffect(() => {
    console.log('[TaskItem] state =', internalState)
  }, [internalState])

  return (
    <>
      <div
        ref={(el) => { anchorRef.current = el; if (el) setAnchorEl(el) }}
        className="task-item"
        aria-label="Task item"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onPointerUp={openMenu}
        onClick={openMenu}
        onKeyDown={(e) => {
          console.log('[TaskItem] keydown', e.key)
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenuOpen((o) => !o) }
        }}
        style={{ ['--film-opacity' as any]: String(containerAlpha) }}
      >
      <div className="task-item__icon-wrap" style={{ transform: `translateY(${iconDy}px)` }}>
        {cfg.renderIcon(iconStrokeWidth, iconAlpha)}
      </div>
      {cfg.label && (
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
      </div>
      <SelectionTooltip
        open={menuOpen}
        anchorEl={anchorEl}
        onSelect={(next) => {
          console.log('[TaskItem] onSelect ->', next)
          setInternalState(next as TaskItemState)
          setMenuOpen(false)
        }}
        onClose={() => setMenuOpen(false)}
      />
    </>
  )
}

export default TaskItem
