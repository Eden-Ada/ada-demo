import React, { useEffect, useRef, useState } from 'react'
import TaskChipTooltipMenu from '../packages/task-chip/mods/tooltip-menu'
import LabelPost from '../packages/label-post/components/label-post'
import Connector from '../../../../connector/connector'

export type TaskItemProps = {
  text?: string
  gap?: number
  className?: string
  style?: React.CSSProperties
  mode?: 'internal' | 'chain'
  exposeAnchors?: (a: { stageEl: HTMLElement | null; chipEl: HTMLElement | null; labelEl: HTMLElement | null }) => void
  tooltipVariant?: 'circle' | 'rect' | 'plain'
  progressPercent?: number
}

const TaskItem: React.FC<TaskItemProps> = ({ text = 'Task Item', gap = 64, className, style, mode = 'internal', exposeAnchors, tooltipVariant = 'circle', progressPercent }) => {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const chipRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const exposeRef = useRef<typeof exposeAnchors>(exposeAnchors)
  useEffect(() => { exposeRef.current = exposeAnchors }, [exposeAnchors])
  // One-time expose after mount to avoid update loops
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const fn = exposeRef.current
      if (fn) fn({ stageEl: stageRef.current, chipEl: chipRef.current, labelEl: labelRef.current })
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cls = ['task-item-node']
  if (className) cls.push(className)

  return (
    <div ref={stageRef} className={cls.join(' ')} style={{ position: 'relative', display: 'grid', placeItems: 'center', ...style }} aria-label="Task Item">
      <div style={{ display: 'grid', placeItems: 'center', gap }}>
        {/* Top: TaskChip (with modular tooltip menu) */}
        <div ref={chipRef}>
          <TaskChipTooltipMenu state="default" iconStrokeWidth={0.8} iconAlpha={0.8} tooltipVariant={tooltipVariant} progressPercent={progressPercent} />
        </div>
        {/* Bottom: LabelPost */}
        <div ref={labelRef}>
          <LabelPost text={text} />
        </div>
      </div>
      {/* Internal connector only in internal mode */}
      {mode === 'internal' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          <Connector
            stageEl={mounted ? stageRef.current! : null}
            fromEl={mounted ? labelRef.current! : null}
            toEl={mounted ? chipRef.current! : null}
            orientation="vertical"
            flow="reverse"
            overlay="viewport"
            color="rgba(255,255,255,0.9)"
            width={2.0}
            dashArray="2 5"
            svgStyle={{ zIndex: 99999, ['--conn-dash-period' as any]: '7px' }}
          />
        </div>
      )}
    </div>
  )
}

export default TaskItem
