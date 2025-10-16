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
}

const BASE_WIDTH = 245

const TaskBlock: React.FC<TaskBlockProps> = ({ descriptor = 'DEFAULT', percent = 0, variant = 1, alpha = 0.7 }) => {
  const fit = useMemo(() => {
    return renderDescriptorText({
      text: descriptor,
      blockWidth: BASE_WIDTH,
    })
  }, [descriptor])

  const rows = fit.rows
  const completed = percent >= 100

  return (
    <div
      className={`task-block${completed ? ' is-complete' : ''}`}
      aria-label="Task block"
      tabIndex={-1}
      onFocus={(e) => { (e.currentTarget as HTMLElement).blur() }}
      onMouseDown={(e) => { e.preventDefault() }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onDragStart={(e) => { e.preventDefault() }}
      style={{
        width: BASE_WIDTH,
        ['--tb-text-alpha' as any]: String(completed ? 0.5 : 1),
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' as any,
        caretColor: 'transparent',
        outline: 'none',
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
