import React from 'react'
import './styles/pipeline.css'
import TaskBlock from './task-block/task-block'
import type { TaskEntry } from './utils/types'

export type PipelineProps = {
  entries: TaskEntry[]
  className?: string
  spacing?: 'compact' | 'default' | 'roomy'
}

const Pipeline: React.FC<PipelineProps> = ({ entries, className, spacing = 'default' }) => {
  const cls = ['pipeline-shell']
  if (className) cls.push(className)
  const listCls = ['pipeline']
  if (spacing === 'compact') listCls.push('pipeline--compact')
  if (spacing === 'roomy') listCls.push('pipeline--roomy')

  return (
    <div className={cls.join(' ')} aria-label="Pipeline">
      <div className={listCls.join(' ')}>
        {entries.map((e) => (
          <TaskBlock key={e.id} descriptor={e.descriptor} />
        ))}
      </div>
    </div>
  )
}

export default Pipeline
