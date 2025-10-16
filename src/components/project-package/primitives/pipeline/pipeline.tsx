import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './styles/pipeline.css'
import TaskBlock from './mods/task-block/task-block'
import type { TaskEntry } from './utils/types'
import ThreeWayBar from './mods/three-way-bar/three-way-bar'
import RefreshProgress from './mods/refresh-progress'
import { initialModes, setMode, type TaskBlockMode } from './utils/conditionals'
import { runSequentialRefresh, type RefreshSnapshot } from './utils/refresh'

export type PipelineProps = {
  entries: TaskEntry[]
  className?: string
  spacing?: 'compact' | 'default' | 'roomy'
  onRefresh?: () => void
}

const Pipeline: React.FC<PipelineProps> = ({ entries, className, spacing = 'default', onRefresh }) => {
  const cls = ['pipeline-shell']
  if (className) cls.push(className)
  const listCls = ['pipeline']
  if (spacing === 'compact') listCls.push('pipeline--compact')
  if (spacing === 'roomy') listCls.push('pipeline--roomy')

  // Interaction-based visibility for the three-way bar (tap anywhere inside the shell)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [barVisible, setBarVisible] = useState(false)
  const hideTimerRef = useRef<number | null>(null)
  const revealBar = useCallback(() => {
    setBarVisible(true)
    if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current) }
    hideTimerRef.current = window.setTimeout(() => setBarVisible(false), 5000)
  }, [])
  const onPointerDown = useCallback(() => {
    // Do not stop propagation so TaskBlock clicks still work
    revealBar()
  }, [revealBar])
  const onPointerLeave = useCallback(() => {
    // Do not hide early; allow timer to control visibility so dots persist >= 5s
  }, [])
  useEffect(() => () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current) }, [])

  // --- Refresh demo state ---
  const [modes, setModes] = useState<TaskBlockMode[]>(initialModes(entries.length))
  const [snaps, setSnaps] = useState<Array<RefreshSnapshot | null>>(
    Array.from({ length: entries.length }).map(() => null),
  )
  useEffect(() => {
    setModes(initialModes(entries.length))
    setSnaps(Array.from({ length: entries.length }).map(() => null))
  }, [entries.length])

  // Measure per-block ProgMeter rects for overlay placement
  const [pmRects, setPmRects] = useState<Array<{ left: number; top: number; size: number }>>([])
  const measurePmRects = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const rects = blocks.map((blk) => {
      const pm = blk.querySelector('.prog-meter') as HTMLElement | null
      if (!pm) return { left: 0, top: 0, size: 0 }
      const r = pm.getBoundingClientRect()
      const size = Math.floor(Math.min(r.width, r.height))
      return { left: r.left - rootRect.left, top: r.top - rootRect.top, size }
    })
    setPmRects(rects)
  }, [])

  useLayoutEffect(() => {
    measurePmRects()
    const onResize = () => measurePmRects()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measurePmRects, entries.length])

  const refreshCancelRef = useRef<null | (() => void)>(null)
  useEffect(() => () => { if (refreshCancelRef.current) refreshCancelRef.current() }, [])

  const startRefresh = useCallback(() => {
    // cancel existing run
    if (refreshCancelRef.current) { refreshCancelRef.current(); refreshCancelRef.current = null }
    // clear prior
    setSnaps(Array.from({ length: entries.length }).map(() => null))
    setModes(initialModes(entries.length))
    // run demo sequence
    const cancel = runSequentialRefresh(
      entries.length,
      (i, snap) => {
        setSnaps((prev) => { const next = prev.slice(); next[i] = snap; return next })
      },
      (i) => {
        setModes((cur) => setMode(cur, i, 'refresh'))
        measurePmRects()
      },
      (i) => {
        // revert after a brief pause
        window.setTimeout(() => {
          setModes((cur) => setMode(cur, i, 'normal'))
          setSnaps((prev) => { const next = prev.slice(); next[i] = null; return next })
        }, 200)
      },
      { perPhaseMs: 600, delayBetweenBlocksMs: 320 },
    )
    refreshCancelRef.current = cancel
    // keep dots visible during the action
    revealBar()
  }, [entries.length, measurePmRects, revealBar])

  // (Task tree overlay removed — TaskStack will be integrated at a higher level)

  return (
    <div ref={rootRef} className={cls.join(' ')} aria-label="Pipeline" onPointerDown={onPointerDown} onPointerLeave={onPointerLeave}>
      <div className={listCls.join(' ')}>
        {entries.map((e) => (
          <TaskBlock key={e.id} descriptor={e.descriptor} />
        ))}
      </div>
      {/* Refresh overlays for blocks in 'refresh' mode */}
      {pmRects.map((r, i) => {
        const s = snaps[i]
        const active = modes[i] === 'refresh' && s && r.size > 0
        if (!active) return null
        const pct = Math.round(Math.max(0, Math.min(1, s!.totalProgress ?? 0)) * 100)
        const status = (() => {
          if (pct < 20) return 'Figuring out task block…'
          if (pct < 60) return 'Configuring pipeline…'
          if (pct < 90) return 'Connecting dependencies…'
          if (pct < 100) return 'Finalizing…'
          return 'Finalized'
        })()
        return (
          <div key={`rp-${i}`} style={{ position: 'absolute', left: r.left, top: r.top, width: r.size, height: r.size, pointerEvents: 'none', zIndex: 5 }}>
            <RefreshProgress
              size={r.size}
              percent={pct}
              statusText={status}
              seamEpsilon={0}
            />
          </div>
        )
      })}
      {/* Mod: three-way-bar */}
      <ThreeWayBar
        className={barVisible ? 'is-visible' : undefined}
        onAction={(a) => {
          if (a === 'refresh') {
            if (onRefresh) onRefresh()
            else startRefresh()
          }
        }}
      />
    </div>
  )
}

export default Pipeline
