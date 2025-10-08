import React, { useMemo } from 'react'
import '../styles/task-item.css'
import TaskChip from '../../task-chip/task-chip'
import { renderDescriptorText } from '../utils/descriptor-text-render'

export type TaskItemCardProps = {
  descriptor?: string
}

const BASE_WIDTH = 245

const TaskItemCard: React.FC<TaskItemCardProps> = ({ descriptor = 'DEFAULT' }) => {
  const fit = useMemo(() => {
    return renderDescriptorText({
      text: descriptor,
      blockWidth: BASE_WIDTH,
    })
  }, [descriptor])

  const rows = fit.rows

  return (
    <div className="task-item-card" aria-label="Task item card" style={{ width: BASE_WIDTH }}>
      <TaskChip state="default" iconStrokeWidth={0.8} iconAlpha={0.5} />
      <div className="task-item-card__name">
        {rows.map((r, i) => (
          <div key={i}>{r}</div>
        ))}
      </div>
      <div className="task-item-card__pill" role="button" aria-label="Type: Task Item">Task Item</div>
    </div>
  )
}

export default TaskItemCard
