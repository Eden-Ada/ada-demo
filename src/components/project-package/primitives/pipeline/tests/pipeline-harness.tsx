import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Pipeline from '../pipeline'
import TaskStack from '../mods/task-stack/components/task-stack'
import Connector from '../../connector/connector'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../sandbox-env'
import '../../vision-primitive/vision-harness.css'
import { makeSequence } from '../utils/sequence'
import TaskItem from '../mods/task-item/components/task-item'
import { createAnchorsBucket, setInstanceAnchors, computeInterInstanceLinks } from '../mods/task-item/utils/instance'
import RefreshProgress from '../mods/refresh-progress'

const PipelineHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const instStageRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const onViewChange = useCallback((v: any) => setView({ pan: v.pan, scale: v.scale }), [])

  // Sample sequence
  const entries = makeSequence([
    'Define core app scope',
    'Design UI + flows',
    'Build MVP',
    'Recruit alpha users',
  ])

  // Element pairs to connect (computed from DOM)
  const [pairs, setPairs] = useState<Array<{ a: HTMLElement; b: HTMLElement }>>([])
  // Static stack rects under each TaskBlock
  const [blockRects, setBlockRects] = useState<Array<{ cx: number; top: number; w: number; h: number }>>([])
  // Snapshot of rects taken at flow start to keep sizes/positions stable
  const [stableRects, setStableRects] = useState<Array<{ cx: number; top: number; w: number; h: number }> | null>(null)

  // Per-block TaskItem tree state
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const revealOpen = activeIndex !== null
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 245, h: 260 })
  const measureRef = useRef<HTMLDivElement | null>(null)
  // Fixed baseline TaskItem height for invariant spacing
  const ITEM_H = 260
  const [blockPos, setBlockPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [connectorsVisible, setConnectorsVisible] = useState(false)
  const [anchorsVersion, setAnchorsVersion] = useState(0)
  const count = 4
  const NODE_SCALE = 1.0
  const STACK_GAP_PX = 80
  const FIRST_GAP_PX = 160
  const items = useMemo(() => Array.from({ length: count }).map((_, i) => ({ id: `it-${i + 1}` })), [])
  const anchorsRef = useRef(createAnchorsBucket(count))
  const tooltipVariant = 'circle'
  const progress = 0
  const nodeIdRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap())
  const nextIdRef = useRef<number>(1)
  const pairSeenRef = useRef<Set<string>>(new Set())
  const pairKey = (a?: HTMLElement | null, b?: HTMLElement | null) => {
    if (!a || !b) return ''
    const getId = (el: HTMLElement) => {
      const m = nodeIdRef.current
      let id = m.get(el)
      if (!id) { id = nextIdRef.current++; m.set(el, id) }
      return id
    }
    return `${getId(a)}->${getId(b)}`
  }

  // Compute adjacent element pairs whenever the DOM or view changes
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const nextPairs: Array<{ a: HTMLElement; b: HTMLElement }> = []
    for (let i = 0; i < els.length - 1; i++) nextPairs.push({ a: els[i], b: els[i + 1] })
    setPairs(nextPairs)
    // Compute rects for stacks under each block (relative to stage)
    const sr = stage.getBoundingClientRect()
    const sx = view.scale || 1
    const rects = els.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        cx: Math.round((r.left - sr.left + r.width / 2) / sx),
        top: Math.round((r.top - sr.top) / sx),
        w: Math.round(r.width / sx),
        h: Math.round(r.height / sx),
      }
    })
    setBlockRects(rects)
  }, [entries.length, view.pan.x, view.pan.y, view.scale])

  // Debug: sequential refresh flow controls (single-arc, percent + status)
  const [debugRefreshOn, setDebugRefreshOn] = useState(false)
  const [flowIdx, setFlowIdx] = useState<number | null>(null) // current active block index
  const [flowFinalized, setFlowFinalized] = useState(0)      // number of finalized blocks
  const [percent, setPercent] = useState(0)
  const [statusText, setStatusText] = useState<string>('')
  const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; size: number } | null>(null)
  const flowCancelRef = useRef<null | (() => void)>(null)
  const [fadeMetersOnEnd, setFadeMetersOnEnd] = useState(false)
  const measureOverlayFor = useCallback((idx: number) => {
    const stage = stageRef.current
    if (!stage) return null
    // Use the active block's rect as the stack container proxy; center the ring there
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const el = els[idx]
    if (!el) return null
    const sr = stage.getBoundingClientRect()
    const br = el.getBoundingClientRect()
    const sx = view.scale || 1
    const cx = (br.left - sr.left + br.width / 2) / sx
    const cy = (br.top - sr.top + br.height / 2) / sx
    // Base size: approx previous meter size (if present) * 1.33; fallback to block size fraction
    const pm = el.querySelector('.prog-meter') as HTMLElement | null
    let base = pm ? Math.min(pm.getBoundingClientRect().width, pm.getBoundingClientRect().height) / sx : Math.min(br.width, br.height) / sx * 0.5
    const size = Math.round(base * 1.33)
    return { left: Math.round(cx - size / 2), top: Math.round(cy - size / 2), size }
  }, [view.scale])
  useLayoutEffect(() => {
    if (!debugRefreshOn) return
    const idx = typeof flowIdx === 'number' ? flowIdx : null
    if (idx === null) return
    // measure on next frame to allow visibility toggles to apply
    const id = requestAnimationFrame(() => {
      const m = measureOverlayFor(idx)
      if (m) setOverlayRect(m)
    })
    return () => cancelAnimationFrame(id)
  }, [debugRefreshOn, flowIdx, measureOverlayFor, view.pan.x, view.pan.y, view.scale])
  useEffect(() => () => { if (flowCancelRef.current) flowCancelRef.current() }, [])
  // Hide ACTIVE TaskBlock inner content while overlay is active (keep placeholders for finalized)
  useEffect(() => {
    if (!debugRefreshOn) return
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const el = typeof flowIdx === 'number' ? els[flowIdx] : null
    if (!el) return
    const hide = (sel: string) => {
      const n = el.querySelector(sel) as HTMLElement | null
      if (n) { (n as any).__prev_opacity = n.style.opacity; n.style.opacity = '0' }
    }
    hide('.task-block__name')
    hide('.task-block__pill')
    return () => {
      const restore = (sel: string) => {
        const n = el.querySelector(sel) as HTMLElement | null
        if (n && (n as any).__prev_opacity !== undefined) { n.style.opacity = (n as any).__prev_opacity; delete (n as any).__prev_opacity }
      }
      restore('.task-block__name')
      restore('.task-block__pill')
    }
  }, [debugRefreshOn, flowIdx])
  // Keep only finalized blocks and current active visible during the flow
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const blocks = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    blocks.forEach((el, i) => {
      if (debugRefreshOn) {
        const isFinal = i < flowFinalized
        const isActive = typeof flowIdx === 'number' && i === flowIdx
        if (!isFinal && !isActive) {
          ;(el as any).__prev_vis = el.style.visibility
          ;(el as any).__prev_opacity = el.style.opacity
          ;(el as any).__prev_pe = el.style.pointerEvents
          el.style.visibility = 'hidden'
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        } else {
          if ((el as any).__prev_vis !== undefined) { el.style.visibility = (el as any).__prev_vis; delete (el as any).__prev_vis }
          if ((el as any).__prev_opacity !== undefined) { el.style.opacity = (el as any).__prev_opacity; delete (el as any).__prev_opacity }
          if ((el as any).__prev_pe !== undefined) { el.style.pointerEvents = (el as any).__prev_pe; delete (el as any).__prev_pe }
        }
      } else {
        if ((el as any).__prev_vis !== undefined) { el.style.visibility = (el as any).__prev_vis; delete (el as any).__prev_vis }
        if ((el as any).__prev_opacity !== undefined) { el.style.opacity = (el as any).__prev_opacity; delete (el as any).__prev_opacity }
        if ((el as any).__prev_pe !== undefined) { el.style.pointerEvents = (el as any).__prev_pe; delete (el as any).__prev_pe }
      }
    })
    return () => {
      blocks.forEach((el) => {
        if ((el as any).__prev_vis !== undefined) { el.style.visibility = (el as any).__prev_vis; delete (el as any).__prev_vis }
        if ((el as any).__prev_opacity !== undefined) { el.style.opacity = (el as any).__prev_opacity; delete (el as any).__prev_opacity }
        if ((el as any).__prev_pe !== undefined) { el.style.pointerEvents = (el as any).__prev_pe; delete (el as any).__prev_pe }
      })
    }
  }, [debugRefreshOn, flowIdx, flowFinalized])
  // Style the built-in prog-meter: hide for ACTIVE, show GREY placeholder for FINALIZED, restore otherwise
  useEffect(() => {
    if (!debugRefreshOn) return
    const stage = stageRef.current
    if (!stage) return
    const blocks = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    blocks.forEach((el, i) => {
      const pm = el.querySelector('.prog-meter') as HTMLElement | null
      if (!pm) return
      // store baselines once
      if ((pm as any).__prev_opacity === undefined) (pm as any).__prev_opacity = pm.style.opacity
      if ((pm as any).__prev_filter === undefined) (pm as any).__prev_filter = pm.style.filter
      if ((pm as any).__prev_transition === undefined) (pm as any).__prev_transition = pm.style.transition
      pm.style.transition = 'opacity 200ms ease'
      const isActive = typeof flowIdx === 'number' && i === flowIdx
      if (isActive) {
        pm.style.opacity = '0'
        pm.style.filter = (pm as any).__prev_filter
      } else if (i < flowFinalized) {
        // grey placeholder look
        pm.style.opacity = '0.35'
        pm.style.filter = 'grayscale(100%) brightness(0.85)'
      } else {
        // restore for not-yet-started (kept hidden via visibility rule)
        pm.style.opacity = (pm as any).__prev_opacity
        pm.style.filter = (pm as any).__prev_filter
      }
    })
  }, [debugRefreshOn, flowFinalized, flowIdx])

  // On flow end, fade meters to full and restore original styles
  useEffect(() => {
    if (!fadeMetersOnEnd) return
    const stage = stageRef.current
    if (!stage) return
    const blocks = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    blocks.forEach((el) => {
      const pm = el.querySelector('.prog-meter') as HTMLElement | null
      if (!pm) return
      pm.style.transition = 'opacity 220ms ease'
      pm.style.opacity = '1'
      pm.style.filter = (pm as any).__prev_filter
    })
    const id = window.setTimeout(() => {
      blocks.forEach((el) => {
        const pm = el.querySelector('.prog-meter') as HTMLElement | null
        if (!pm) return
        if ((pm as any).__prev_opacity !== undefined) { pm.style.opacity = (pm as any).__prev_opacity; delete (pm as any).__prev_opacity }
        if ((pm as any).__prev_filter !== undefined) { pm.style.filter = (pm as any).__prev_filter; delete (pm as any).__prev_filter }
        if ((pm as any).__prev_transition !== undefined) { pm.style.transition = (pm as any).__prev_transition; delete (pm as any).__prev_transition }
      })
      setFadeMetersOnEnd(false)
    }, 240)
    return () => window.clearTimeout(id)
  }, [fadeMetersOnEnd])

  const startDebugRefresh = useCallback(() => {
    // cancel previous run if any
    if (flowCancelRef.current) { flowCancelRef.current(); flowCancelRef.current = null }
    setDebugRefreshOn(true)
    // Freeze rects at flow start to avoid size/position jitter while revealing
    setStableRects(blockRects.slice())
    setFlowFinalized(0)
    setFlowIdx(0)
    setPercent(0)
    // Runner
    let cancelled = false
    flowCancelRef.current = () => { cancelled = true }
    const N = count
    const runBlock = (idx: number) => {
      setFlowIdx(idx)
      setPercent(0)
      setStatusText('Figuring out task block…')
      // double-RAF to ensure DOM styles (visibility/display) have applied
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const m = measureOverlayFor(idx)
          if (m) setOverlayRect(m)
        })
      })
      const base = 4000
      const dur = base * (0.65 + Math.random() * 0.70) // 4s ±35%
      const t0 = performance.now()
      const tick = () => {
        if (cancelled) return
        const t = performance.now()
        const p = Math.max(0, Math.min(1, (t - t0) / dur))
        const pct = Math.round(p * 100)
        setPercent(pct)
        // update status text by percent window
        if (pct < 20) setStatusText('Figuring out task block…')
        else if (pct < 60) setStatusText('Configuring pipeline…')
        else if (pct < 90) setStatusText('Connecting dependencies…')
        else if (pct < 100) setStatusText('Finalizing…')
        if (p < 1) {
          requestAnimationFrame(tick)
        } else {
          // finalize current
          setFlowFinalized((v) => v + 1)
          // proceed or finish
          if (idx + 1 < N) {
            runBlock(idx + 1)
          } else {
            setFlowIdx(null)
            // cross-fade meters back to full then end debug mode
            setFadeMetersOnEnd(true)
            window.setTimeout(() => setDebugRefreshOn(false), 240)
            setStableRects(null)
            flowCancelRef.current = null
          }
        }
      }
      requestAnimationFrame(tick)
    }
    runBlock(0)
  }, [count, measureOverlayFor])

  // Attach click handler to each TaskBlock to open the anchored tree
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const offs: Array<() => void> = []
    els.forEach((el, i) => {
      const onClick = (e: Event) => {
        e.preventDefault()
        setActiveIndex((cur) => (cur === i ? null : i))
      }
      el.addEventListener('click', onClick as any)
      offs.push(() => el.removeEventListener('click', onClick as any))
    })
    return () => offs.forEach((fn) => fn())
  }, [entries.length])

  // Recompute block anchor position and dims on selection or view change
  useLayoutEffect(() => {
    if (!revealOpen) return
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const el = typeof activeIndex === 'number' ? els[activeIndex] : null
    if (!el) return
    const br = el.getBoundingClientRect()
    const cr = stage.getBoundingClientRect()
    const sx = view.scale || 1
    setBlockPos({ x: Math.round((br.left - cr.left + br.width / 2) / sx), y: Math.round((br.top - cr.top) / sx) })
    setDims({ w: Math.round(br.width / sx), h: Math.round(br.height / sx) })
  }, [revealOpen, activeIndex, view.pan.x, view.pan.y, view.scale])

  // Dynamic measurement disabled to keep spacing constant across zoom levels
  useLayoutEffect(() => { /* no-op */ }, [revealOpen, view.scale])

  // Two-rAF gate for connectors under the tree
  useLayoutEffect(() => {
    if (!revealOpen) { setConnectorsVisible(false); return }
    setConnectorsVisible(false)
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setConnectorsVisible(true))
      ;(setConnectorsVisible as any)._id2 = id2
    })
    return () => {
      cancelAnimationFrame(id1)
      try { cancelAnimationFrame((setConnectorsVisible as any)._id2) } catch {}
    }
  }, [revealOpen, activeIndex])

  // Close on outside click but ignore drags (using Pointer events)
  useEffect(() => {
    if (!revealOpen) return
    const THRESH = 6
    const state = { active: false, x: 0, y: 0, moved: false, startedOutside: false }
    const isPrimary = (ev: PointerEvent) => ev.isPrimary && (ev.button === 0 || ev.button === undefined)
    const onDown = (e: PointerEvent) => {
      if (!isPrimary(e)) return
      const t = e.target as Node | null
      const stage = stageRef.current!
      const insideStage = stage.contains(t)
      state.active = true
      state.x = e.clientX
      state.y = e.clientY
      state.moved = false
      state.startedOutside = !insideStage
    }
    const onMove = (e: PointerEvent) => {
      if (!state.active) return
      if (Math.abs(e.clientX - state.x) > THRESH || Math.abs(e.clientY - state.y) > THRESH) state.moved = true
    }
    const finish = () => {
      if (!state.active) return
      if (state.startedOutside && !state.moved) setActiveIndex(null)
      state.active = false
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', finish, true)
    document.addEventListener('pointercancel', finish, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', finish, true)
      document.removeEventListener('pointercancel', finish, true)
    }
  }, [revealOpen])

  // UX polish: remove shell chrome (bg/border/shadow) and dim non-active blocks when a tree is open
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // pipeline-shell: make chrome transparent while open without hiding children
    const shell = stage.querySelector('.pipeline-shell') as HTMLElement | null
    if (shell) {
      shell.style.transition = 'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease'
      if (revealOpen) {
        shell.style.background = 'transparent'
        shell.style.borderColor = 'transparent'
        shell.style.boxShadow = 'none'
      } else {
        shell.style.background = ''
        shell.style.borderColor = ''
        shell.style.boxShadow = ''
      }
    }
    // dim neighbor blocks
    const blocks = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    if (!blocks.length) return () => {}
    const idx = typeof activeIndex === 'number' ? activeIndex : -1
    blocks.forEach((el, i) => {
      el.style.transition = 'opacity 180ms ease'
      el.style.willChange = 'opacity'
      el.style.opacity = revealOpen ? (i === idx ? '1' : '0.5') : '1'
    })
    // cleanup: restore baseline
    return () => {
      if (shell) {
        shell.style.background = ''
        shell.style.borderColor = ''
        shell.style.boxShadow = ''
        shell.style.transition = ''
      }
      blocks.forEach((el) => { el.style.opacity = ''; el.style.transition = ''; el.style.willChange = '' })
    }
  }, [revealOpen, activeIndex, entries.length])

  return (
    <div className="vision-harness">
      <video className="vision-harness__bg" src="/magenta-mystic-swell.mp4" autoPlay muted loop playsInline preload="metadata" />
      <SandboxViewport ref={sandRef as any} onViewChange={onViewChange}>
        <div ref={stageRef} style={{ position: 'relative', width: 1100, minHeight: 360 }}>
          {/* Connectors (auto mode) - scale-invariant stroke/dash */}
          {(() => {
            const BASE_W = 2.5
            const BASE_D0 = 3
            const BASE_D1 = 9
            const sw = Math.max(1, BASE_W * view.scale)
            const dash = `${(BASE_D0 * view.scale).toFixed(3)} ${(BASE_D1 * view.scale).toFixed(3)}`
            // During debug refresh, reveal connectors after each finalize
            const filtered = debugRefreshOn ? pairs.filter((_, i) => i < flowFinalized) : pairs
            return filtered.map((pair, i) => (
              <Connector
                key={i}
                stageEl={stageRef.current}
                fromEl={pair.a}
                toEl={pair.b}
                radius={18}
                width={sw}
                dashArray={dash}
                overlay="viewport"
                color="rgba(255,255,255,0.9)"
                svgStyle={{ opacity: revealOpen ? 0.5 : 1, transition: 'opacity 180ms ease' }}
              />
            ))
          })()}
          {/* Static visual stacks beneath blocks (always mounted) */}
          {(stableRects ?? blockRects).map((r, i) => {
            // During debug refresh: render stacks only for finalized blocks
            if (debugRefreshOn) {
              const isFinal = i < flowFinalized
              if (!isFinal) return null
            }
            const stackItems = items as any
            return (
              <div
                key={`stk-${i}`}
                style={{
                  position: 'absolute', left: r.cx - r.w / 2, top: r.top,
                  width: r.w, height: r.h, pointerEvents: 'none', zIndex: 0,
                  visibility: revealOpen && activeIndex === i ? 'hidden' : 'visible',
                  opacity: revealOpen ? (activeIndex === i ? 0 : 1) : 1,
                  transition: 'opacity 180ms ease',
                }}
              >
                <TaskStack items={stackItems} width={r.w} height={r.h} radius={30} variant={2} />
              </div>
            )
          })}
          {/* Nodes (left-to-right) */}
          <Pipeline entries={entries} spacing="roomy" onRefresh={startDebugRefresh} />
          {/* Debug refresh overlay centered in active block container */}
          {debugRefreshOn && overlayRect && typeof flowIdx === 'number' && (
            <div style={{ position: 'absolute', left: overlayRect.left, top: overlayRect.top, width: overlayRect.size, height: overlayRect.size, pointerEvents: 'none', zIndex: 5 }}>
              <RefreshProgress
                size={overlayRect.size}
                percent={percent}
                statusText={statusText}
                seamEpsilon={0}
              />
            </div>
          )}
          {/* Per-block TaskItem tree stage (visibility-only) */}
          <div
            ref={instStageRef}
            style={{
              position: 'absolute', left: blockPos.x, top: blockPos.y, transform: 'translateX(-50%)',
              width: dims.w, height: 0, visibility: revealOpen ? 'visible' : 'hidden', pointerEvents: revealOpen ? 'auto' : 'none',
            }}
          >
            {(() => {
              const h = Math.round(ITEM_H * NODE_SCALE)
              // Baseline-local gaps: viewport scaling will handle the visual transform.
              const G0 = FIRST_GAP_PX
              const G = STACK_GAP_PX
              const y0 = -(G0 + h / 2)
              const out = [] as Array<{ tx: number; ty: number; scale: number }>
              for (let i = 0; i < items.length; i++) out.push({ tx: 0, ty: y0 - i * (h + G), scale: NODE_SCALE })
              return out.map((t, i: number) => (
                <div
                  key={items[i].id}
                  style={{ position: 'absolute', left: '50%', top: 0, transform: `translateX(-50%) translateY(${t.ty}px) scale(${t.scale})`, transformOrigin: 'center center' }}
                >
                  <TaskItem
                    text={entries[activeIndex ?? 0]?.descriptor || ''}
                    gap={64}
                    mode="chain"
                    tooltipVariant={tooltipVariant as any}
                    progressPercent={progress}
                    exposeAnchors={(a: any) => {
                      setInstanceAnchors(anchorsRef.current, i, a as any)
                      setAnchorsVersion((v) => v + 1)
                    }}
                  />
                </div>
              ))
            })()}
            {/* hidden measurer */}
            <div ref={measureRef} style={{ display: 'none' }} />
            {/* Self and inter-instance connectors for the tree */}
            {(() => {
              const links = computeInterInstanceLinks(anchorsRef.current as any)
              const first = anchorsRef.current?.[0]
              const BASE_W = 2.5
              const BASE_D0 = 3
              const BASE_D1 = 9
              const sw = Math.max(1, BASE_W * view.scale)
              const dash = `${(BASE_D0 * view.scale).toFixed(3)} ${(BASE_D1 * view.scale).toFixed(3)}`
              const flowFor = (a?: HTMLElement | null, b?: HTMLElement | null) => {
                if (!a || !b) return 'reverse' as const
                try {
                  const ar = a.getBoundingClientRect()
                  const br = b.getBoundingClientRect()
                  return br.top < ar.top ? 'forward' : 'reverse'
                } catch { return 'reverse' as const }
              }
              const candidates: Array<{ key: string; fromEl: HTMLElement; toEl: HTMLElement; fromSide?: any; toSide?: any; className?: string }> = []
              anchorsRef.current?.forEach((a: any, idx: number) => { if (a?.labelEl && a?.chipEl) candidates.push({ key: `self-${idx}`, fromEl: a.labelEl, toEl: a.chipEl, fromSide: 'bottom', toSide: 'top', className: idx === 0 ? 'connector--no-shadow' : undefined }) })
              links.forEach((ln: any, idx: number) => { if (ln.fromEl && ln.toEl) candidates.push({ key: `inst-${idx}`, fromEl: ln.fromEl, toEl: ln.toEl, fromSide: ln.fromSide, toSide: ln.toSide }) })
              pairSeenRef.current.clear()
              const emitted = candidates.filter(c => { const k = pairKey(c.fromEl, c.toEl); if (!k || pairSeenRef.current.has(k)) return false; pairSeenRef.current.add(k); return true })
              const allReady = Boolean(anchorsRef.current && anchorsRef.current.every(a => a?.labelEl && a?.chipEl))
              return (
                <div key={`links-${anchorsVersion}-${connectorsVisible ? 'on' : 'off'}`} style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
                  {connectorsVisible && allReady && (stageRef.current) && first?.chipEl && (
                    <Connector
                      key="block-first"
                      stageEl={instStageRef.current!}
                      fromEl={(stageRef.current!.querySelectorAll('.pipeline .task-block')[activeIndex ?? 0]) as HTMLElement}
                      toEl={first.chipEl}
                      fromSide="top"
                      toSide="top"
                      orientation="vertical"
                      flow={flowFor((stageRef.current!.querySelectorAll('.pipeline .task-block')[activeIndex ?? 0]) as HTMLElement, first.chipEl)}
                      epsilon={0.5}
                      overlay="viewport"
                      color="rgba(255,255,255,0.9)"
                      width={sw}
                      dashArray={dash}
                    />
                  )}
                  {connectorsVisible && allReady && emitted.map((c) => (
                    <Connector
                      key={c.key}
                      stageEl={instStageRef.current!}
                      fromEl={c.fromEl}
                      toEl={c.toEl}
                      fromSide={c.fromSide}
                      toSide={c.toSide}
                      orientation="vertical"
                      flow={flowFor(c.fromEl, c.toEl)}
                      epsilon={0.5}
                      overlay="viewport"
                      className={c.className}
                      color="rgba(255,255,255,0.9)"
                      width={sw}
                      dashArray={dash}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Pipeline Harness" />
      {/* Debug panel */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2000, background: 'rgba(0,0,0,0.35)', color: '#fff', borderRadius: 10, padding: '10px 12px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', gap: 8 }}>
        <button onClick={startDebugRefresh} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Refresh</button>
      </div>
      <ZoomSlider
        onChange={(delta) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
    </div>
  )
}

export default PipelineHarness
