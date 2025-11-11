import React, { useMemo } from 'react'
import './styles/task-block.css'
import './styles/tb-animations.css'
import ProgMeter from './prog-meter/prog-meter'
import { renderDescriptorText } from './utils/descriptor-text-render'

export type TaskBlockProps = {
  descriptor?: string
  percent?: number
  variant?: 1 | 2
  alpha?: number
  enabled?: boolean
  animating?: boolean
  onClick?: () => void
  isAssignable?: boolean
}

const BASE_WIDTH = 245

const TaskBlock: React.FC<TaskBlockProps> = ({ descriptor = 'DEFAULT', percent = 0, variant = 1, alpha = 0.7, enabled = true, animating = false, onClick, isAssignable = false }) => {
  const fit = useMemo(() => {
    return renderDescriptorText({
      text: descriptor,
      blockWidth: BASE_WIDTH,
    })
  }, [descriptor])

  const rows = fit.rows
  const completed = percent >= 100

  // Disabled state: flat 2D appearance with dotted border (unless animating in)
  if (!enabled && !animating) {
    return (
      <div
        className="task-block is-disabled"
        aria-label="Task block (disabled)"
        style={{
          width: BASE_WIDTH,
          minHeight: 160,
          borderRadius: 26,
          border: '3px dashed rgba(255, 255, 255, 0.45)',
          background: 'rgba(255, 255, 255, 0.03)',
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          opacity: 0.6,
          pointerEvents: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' as any,
        }}
      >
        <div className="task-block__name" style={{ 
          color: 'rgba(255, 255, 255, 0.6)',
          fontWeight: 350,
          fontSize: 24,
          letterSpacing: 0.2,
          textAlign: 'center',
        }}>
          {rows.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      </div>
    )
  }

  // Enabled state: full 3D appearance with progress circle
  return (
    <div
      className={`task-block${completed ? ' is-complete' : ''}${animating ? ' is-animating-in' : ''}`}
      aria-label="Task block"
      tabIndex={-1}
      onFocus={(e) => { (e.currentTarget as HTMLElement).blur() }}
      onMouseDown={(e) => { e.preventDefault() }}
      onPointerDown={(e) => { 
        e.preventDefault()
        e.stopPropagation()
        // Allow assignment if assignable and not completed
        if (isAssignable && !completed && onClick) {
          onClick()
        }
      }}
      onDragStart={(e) => { e.preventDefault() }}
      style={{
        width: BASE_WIDTH,
        ['--tb-text-alpha' as any]: String(completed ? 0.5 : 1),
        transform: animating ? 'translateX(-100px) scale(0.8)' : 'translateX(0) scale(1)',
        opacity: animating ? 0 : 1,
        animation: animating ? 'task-block-fly-in 600ms ease-out forwards' : 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' as any,
        caretColor: 'transparent',
        outline: 'none',
        cursor: isAssignable && !completed ? 'pointer' : 'default',
        filter: isAssignable && !completed ? 'brightness(1.1)' : 'none',
      }}
    >
      <ProgMeter percent={percent} filmOpacity={0.7} variant={variant} alpha={alpha} outerGap={10} />
      <div className="task-block__name">
        {rows.map((r, i) => (
          <div key={i}>{r}</div>
        ))}
      </div>
      <div
        className="task-block__pill"
        role="button"
        aria-label="Type: Task Block"
        tabIndex={-1}
        onFocus={(e) => { (e.currentTarget as HTMLElement).blur() }}
        onMouseDown={(e) => { e.preventDefault() }}
      >
        Task Block
      </div>
    </div>
  )
}

export default TaskBlock
