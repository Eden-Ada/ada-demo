import React, { useRef, useState, useEffect } from 'react'
import TaskChip from '../task-chip'
import SelectionTooltip from '../../../../selection-tooltip/selection-tooltip'

export type TaskChipTooltipMenuProps = {
  state?: 'default' | 'automation' | 'manual' | 'outsource'
  iconStrokeWidth?: number
  iconAlpha?: number
  className?: string
  style?: React.CSSProperties
  tooltipVariant?: 'circle' | 'rect' | 'plain'
  showProgress?: boolean
  progressPercent?: number
}

const TaskChipTooltipMenu: React.FC<TaskChipTooltipMenuProps> = ({
  state = 'default',
  iconStrokeWidth = 0.8,
  iconAlpha = 0.8,
  className,
  style,
  tooltipVariant = 'circle',
  showProgress,
  progressPercent,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false) // show icon+label without opening tooltip
  const [cur, setCur] = useState<'default' | 'automation' | 'manual' | 'outsource'>(state)
  const [pendingNext, setPendingNext] = useState<'automation' | 'manual' | 'outsource' | null>(null)
  const previewTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const [showReset, setShowReset] = useState(false)

  useEffect(() => { setAnchorEl(wrapperRef.current) }, [])

  const showPreviewBriefly = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setPreview(true)
    previewTimerRef.current = window.setTimeout(() => {
      setPreview(false)
      previewTimerRef.current = null
    }, 750)
  }

  const handleActivate = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    if (longPressTriggeredRef.current || showReset) {
      // If long-press is active or reset overlay shown, do not open tooltip or preview
      return
    }
    if (!open && cur !== 'default') {
      // Show preview (icon+label) without opening the tooltip, then fade back to arc
      showPreviewBriefly()
      return
    }
    // For default state or other cases, open the tooltip as before
    setOpen(true)
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTriggeredRef.current = false
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setShowReset(true)
    }, 650)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    const wasLong = longPressTriggeredRef.current
    clearLongPress()
    if (wasLong) return // do not activate on long-press release
    handleActivate(e)
  }

  const onPointerLeave = () => {
    clearLongPress()
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Revert to default state; close overlays/tooltip
    setCur('default')
    setShowReset(false)
    setPreview(false)
    setOpen(false)
  }

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', ...style }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onClick={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={open}
    >
      <TaskChip
        state={cur}
        iconStrokeWidth={iconStrokeWidth}
        iconAlpha={iconAlpha}
        showStateVisuals={open || preview}
        showProgress={
          typeof showProgress === 'boolean'
            ? showProgress
            : (cur !== 'default' && !open && !preview)
        }
        progress={typeof progressPercent === 'number' ? Math.max(0, Math.min(1, progressPercent / 100)) : undefined}
        dimProgress={showReset}
      />
      {/* Long-press reset overlay */}
      <div className="task-item__reset-overlay" data-visible={showReset ? '1' : '0'} onClick={() => { setShowReset(false); longPressTriggeredRef.current = false }}>
        <button className="task-item__reset-btn" aria-label="Reset task chip" onClick={handleReset}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <SelectionTooltip
        open={open}
        anchorEl={anchorEl}
        onSelect={(next: 'automation' | 'manual' | 'outsource') => {
          // Collapse tooltip and defer state change until exit completes
          setOpen(false)
          setPreview(false)
          if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current)
            previewTimerRef.current = null
          }
          setPendingNext(next)
        }}
        onClose={() => setOpen(false)}
        current={cur as any}
        variant={tooltipVariant}
        onExited={() => {
          if (pendingNext) {
            setCur(pendingNext)
            setPendingNext(null)
          }
        }}
      />
    </div>
  )
}

export default TaskChipTooltipMenu
