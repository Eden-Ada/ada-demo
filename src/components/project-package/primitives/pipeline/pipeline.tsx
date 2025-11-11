import React, { useCallback, useRef, useState, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './styles/pipeline.css'
import TaskBlock from './mods/task-block/task-block'
import type { TaskEntry } from './utils/types'
import ThreeWayBar from './mods/three-way-bar/three-way-bar'
import RefreshProgress from './mods/refresh-progress'
import OrganizationPanel, { type OrgMember } from './mods/organization-panel'
import { initialModes, setMode, type TaskBlockMode } from './utils/conditionals'
import { runSequentialRefresh, type RefreshSnapshot } from './utils/refresh'
import { twoKnotPath } from '../connector/utils/geometry'

export type PipelineProps = {
  entries: TaskEntry[]
  className?: string
  spacing?: 'compact' | 'default' | 'roomy'
  onRefresh?: () => void
  progressById?: Record<string, number>
  enabledIds?: string[]
  animatingIds?: string[]
  canvasTransform?: { pan: { x: number; y: number }; scale: number }
}

const Pipeline: React.FC<PipelineProps> = ({ entries, className, spacing = 'default', onRefresh, progressById, enabledIds, animatingIds, canvasTransform }) => {
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

  // --- Profile assignment state ---
  const [selectedProfile, setSelectedProfile] = useState<OrgMember | null>(null)
  const [taskAssignments, setTaskAssignments] = useState<Record<string, OrgMember>>({}) // taskId -> OrgMember
  const [, setLineUpdate] = useState(0) // Force re-render for line positions
  const [orgPanelExpanded, setOrgPanelExpanded] = useState(false)
  const taskBlockRefs = useRef<Record<string, HTMLDivElement | number | null>>({})
  const orgPanelRef = useRef<HTMLDivElement | null>(null)

  // Debug: Log when selectedProfile changes
  useEffect(() => {
    console.log('🎯 Pipeline selectedProfile changed to:', selectedProfile)
  }, [selectedProfile])

  const handleTaskAssignment = useCallback((taskId: string) => {
    console.log('🔵 handleTaskAssignment called for task:', taskId, 'selectedProfile:', selectedProfile)
    if (selectedProfile) {
      setTaskAssignments(prev => {
        const updated = { ...prev, [taskId]: selectedProfile }
        console.log('✅ Task assignments updated:', updated)
        return updated
      })
      console.log(`✅ Assigned ${selectedProfile.name} to task ${taskId}`)
      // Deselect profile after assignment (via OrganizationPanel callback)
      setSelectedProfile(null)
      // Force line update
      setTimeout(() => setLineUpdate(n => n + 1), 50)
    } else {
      console.log('❌ No selected profile - cannot assign')
    }
  }, [selectedProfile])

  // Build taskId -> index mapping
  useEffect(() => {
    entries.forEach((e, index) => {
      taskBlockRefs.current[e.id] = index
    })
  }, [entries])

  // Update lines on scroll/resize AND canvas transform changes
  useEffect(() => {
    if (Object.keys(taskAssignments).length === 0) return
    
    console.log('🔄 Canvas transform changed:', canvasTransform)
    setLineUpdate(n => n + 1)
    
    const handleUpdate = () => setLineUpdate(n => n + 1)
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [taskAssignments, canvasTransform])

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

  // Render connection lines in viewport portal - only when org panel is expanded
  const connectionLines = Object.keys(taskAssignments).length > 0 && orgPanelExpanded ? createPortal(
    <>
      <style>{`
        @keyframes connector-flow {
          to { stroke-dashoffset: 10; }
        }
      `}</style>
      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 60,
        }}
      >
      {Object.entries(taskAssignments).map(([taskId]) => {
        const containerRef = taskBlockRefs.current['__container__']
        const taskIndex = taskBlockRefs.current[taskId]
        
        if (!orgPanelRef.current || !containerRef || taskIndex === undefined || typeof taskIndex !== 'number') return null
        
        const container = containerRef as HTMLDivElement
        const taskEl = container.children[taskIndex] as HTMLElement
        
        if (!taskEl) return null
        
        // Get VIEWPORT coordinates (absolute screen position)
        const taskRect = taskEl.getBoundingClientRect()
        const orgRect = orgPanelRef.current.getBoundingClientRect()
        
        // Task bottom center
        const x1 = taskRect.left + taskRect.width / 2
        const y1 = taskRect.bottom
        
        // Org panel top center  
        const x2 = orgRect.left + orgRect.width / 2
        const y2 = orgRect.top
        
        // Create curved path using same logic as inter-task connectors
        const pathData = twoKnotPath(
          { x: x1, y: y1 },
          { x: x2, y: y2 },
          { radius: 18, orientation: 'vertical' }
        )
        
        return (
          <path
            key={taskId}
            d={pathData}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.5"
            strokeDasharray="5,5"
            opacity="1"
            fill="none"
            className="connector-flow-animation"
            style={{
              strokeDashoffset: 0,
              animation: 'connector-flow 2s linear infinite',
            }}
          />
        )
      })}
      </svg>
    </>,
    document.body
  ) : null

  return (
    <div ref={rootRef} className={cls.join(' ')} aria-label="Pipeline" onPointerDown={onPointerDown} onPointerLeave={onPointerLeave} style={{ position: 'relative' }}>
      {connectionLines}
      
      <div className={listCls.join(' ')} ref={(el) => {
        // Store pipeline container for position calculations
        if (el) taskBlockRefs.current['__container__'] = el
      }}>
        {entries.map((e) => {
          const percent = progressById?.[e.id] ?? 0
          const isComplete = percent >= 100
          const isAssignable = !!selectedProfile && !isComplete
          
          if (isAssignable) {
            console.log('🟢 Task block', e.id, 'is ASSIGNABLE (selectedProfile exists, not complete)')
          }
          
          return (
            <TaskBlock 
              key={e.id}
              descriptor={e.descriptor} 
              percent={percent}
              enabled={enabledIds ? enabledIds.includes(e.id) : true}
              animating={animatingIds ? animatingIds.includes(e.id) : false}
              isAssignable={isAssignable}
              onClick={() => {
                console.log('🖱️ Task block clicked:', e.id, 'isAssignable:', isAssignable)
                handleTaskAssignment(e.id)
              }}
            />
          )
        })}
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
      
      {/* Organization panel - bottom right */}
      <div
        ref={orgPanelRef}
        className={barVisible ? 'is-visible' : undefined}
        style={{
          position: 'absolute',
          right: 'calc(var(--shell-pad-h, 64px) / 2 - 28px)',
          bottom: 'calc(var(--shell-pad-v, 88px) / 2 - 63px)',
          opacity: 1, // Always visible
          transition: 'opacity 300ms ease',
          pointerEvents: 'auto', // Always interactive
          zIndex: 100,
        }}
      >
        <OrganizationPanel 
          onProfileSelected={setSelectedProfile}
          externalSelectedMember={selectedProfile}
          onExpandedChange={setOrgPanelExpanded}
        />
      </div>
    </div>
  )
}

export default Pipeline
