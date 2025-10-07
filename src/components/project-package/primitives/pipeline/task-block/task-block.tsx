import React, { useMemo } from 'react'
import './task-block.css'
import TaskItem from '../task-item/task-item'
import { renderDescriptorText } from './utils/descriptor-text-render'

export type TaskBlockProps = {
  descriptor?: string
}

const BASE_WIDTH = 245

const TaskBlock: React.FC<TaskBlockProps> = ({ descriptor = 'DEFAULT' }) => {
  const fit = useMemo(() => {
    return renderDescriptorText({
      text: descriptor,
      blockWidth: BASE_WIDTH,
    })
  }, [descriptor])

  const rows = fit.rows

  return (
    <div className="task-block" aria-label="Task block" style={{ width: BASE_WIDTH }}>
      <TaskItem state="default" iconStrokeWidth={0.8} iconAlpha={0.5} />
      <div className="task-block__name">
        {rows.map((r, i) => (
          <div key={i}>{r}</div>
        ))}
      </div>
      <div className="task-block__pill" role="button" aria-label="Type: Task Item">Task Item</div>
    </div>
  )
}

export default TaskBlock
