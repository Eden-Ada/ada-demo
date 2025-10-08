import React, { useMemo } from 'react'
import '../styles/task-stack.css'
import { computeRotations } from '../utils/stack-logic'

export type TaskStackItem = {
  id: string
  state?: 'default' | 'automation' | 'manual' | 'outsource'
}

export type TaskStackProps = {
  items: TaskStackItem[]
  className?: string
  width?: number
  height?: number
  radius?: number
  variant?: 1 | 2
}

const TaskStack: React.FC<TaskStackProps> = ({ items, className, width, height, radius, variant = 1 }) => {
  const cls = ['task-stack']
  if (className) cls.push(className)
  // Only support 1 and 2
  const v: 1 | 2 = variant as 1 | 2

  // Build rotation values (baseline)
  const rotations = useMemo(
    () => computeRotations(items, { maxAbs: 4, minAbs: 1.5, alternateSign: true, uniqueTolerance: 0.25 }),
    [items]
  )
  return (
    <div
      className={cls.join(' ')}
      aria-label="Task stack"
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        ['--stack-width' as any]: width ? `${width}px` : undefined,
        ['--stack-height' as any]: height ? `${height}px` : undefined,
        ['--stack-radius' as any]: radius ? `${radius}px` : undefined,
      }}
    >
      {items.map((it, i) => {
        const rot = rotations[i] ?? 0
        const isBottom = i === items.length - 1
        // Shadow tuning
        // v1: only bottom layer casts a shadow
        const shadowA_v1 = isBottom ? 0.12 : 0
        const shadowB_v1 = isBottom ? 0.08 : 0
        // v2: gentle attenuation from bottom to top; keep some bleed
        const idxFromBottom = (items.length - 1) - i
        const a0 = 0.10, b0 = 0.07, decay = 0.78, floor = 0.04
        const shadowA_v2 = Math.max(floor, a0 * Math.pow(decay, idxFromBottom))
        const shadowB_v2 = Math.max(floor, b0 * Math.pow(decay, idxFromBottom))
        return (
          <div
            key={it.id}
            className="task-stack__layer"
            style={{
              zIndex: items.length - i,
              opacity: 1,
            }}
          >
            <div
              className={
                "stack-card" + (v === 2 ? ' stack-card--filled' : '')
              }
              style={{
                transform: `rotate(${rot}deg)`,
                ...(v === 1
                  ? {
                      ['--shadow-a' as any]: shadowA_v1,
                      ['--shadow-b' as any]: shadowB_v1,
                    }
                  : {
                      ['--shadow-a' as any]: shadowA_v2,
                      ['--shadow-b' as any]: shadowB_v2,
                    }),
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default TaskStack
