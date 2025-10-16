import React, { useCallback, useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react'
import TaskStack, { TaskStackItem } from '../components/task-stack'
import TaskBlock from '../../task-block/task-block'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../../../sandbox-env'
import '../../../../vision-primitive/vision-harness.css'
import TaskItem from '../../task-item/components/task-item'
import { createAnchorsBucket, setInstanceAnchors, computeInterInstanceLinks } from '../../task-item/utils/instance'
import Connector from '../../../../connector/connector'

const allStates: Array<'default' | 'automation' | 'manual' | 'outsource'> = ['default', 'automation', 'manual', 'outsource']

function makeItems(n: number): TaskStackItem[] {
  return Array.from({ length: n }).map((_, i) => ({ id: `it-${i + 1}`, state: allStates[(i + 1) % allStates.length] }))
}

const TaskStackHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const onViewChange = useCallback((v: any) => { setView({ pan: v.pan, scale: v.scale }) }, [])

  const [count, setCount] = useState(4)
  const [open, setOpen] = useState(true)
  const [descriptor, setDescriptor] = useState('Design the UX + Flow')
  const [progress, setProgress] = useState(0)
  // TaskItem visual controls (match TaskItem harness)
  const [tooltipVariant, setTooltipVariant] = useState<'circle' | 'rect' | 'plain'>('circle')
  const [revealOpen, setRevealOpen] = useState(false)
  // Gate connector mount to avoid transient, flat paths on re-open
  const [connectorsVisible, setConnectorsVisible] = useState(false)
  // Removed stackReady gating; visibility-only strategy avoids mid-state

  // Layout identical to TaskItem harness
  const NODE_SCALE = 1.0
  const STACK_GAP_PX = 80         // spacing between successive TaskItem instances
  const FIRST_GAP_PX = 160        // spacing between TaskBlock top and bottom-most TaskItem bottom
  // No animations

  const items = useMemo(() => makeItems(count), [count])
  const blockRef = useRef<HTMLDivElement | null>(null)
  const blockInnerRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 245, h: 260 })
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [itemH, setItemH] = useState<number>(260)
  const instStageRef = useRef<HTMLDivElement | null>(null)
  const [blockTop, setBlockTop] = useState<number>(0)
  // Stable anchor: we will keep a fixed moat above the TaskBlock (FIRST_GAP_PX)
  const anchorsRef = useRef(createAnchorsBucket(count))
  const [anchorsVersion, setAnchorsVersion] = useState(0)
  // Connector pair identity maps for runtime de-duplication
  const nodeIdRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap())
  const nextIdRef = useRef<number>(1)
  const pairSeenRef = useRef<Set<string>>(new Set())
  // Pointer gesture state to differentiate pan vs tap
  const ptrRef = useRef<{ active: boolean; startX: number; startY: number; moved: boolean; outsideStart: boolean }>({
    active: false, startX: 0, startY: 0, moved: false, outsideStart: false,
  })
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
  useLayoutEffect(() => {
    const el = blockRef.current
    if (!el) return
    // Resolve the real TaskBlock root element for accurate anchors
    try {
      blockInnerRef.current = el.querySelector('.task-block') as HTMLElement | null
    } catch {}
    // Use untransformed layout size to avoid double-scaling under viewport transforms
    const w = Math.round((blockInnerRef.current ?? el).offsetWidth)
    const h = Math.round((blockInnerRef.current ?? el).offsetHeight)
    if (w && h) setDims({ w, h })
    // Anchor stage to the visual top of the TaskBlock in local container coords
    const br = (blockInnerRef.current ?? el).getBoundingClientRect()
    const cr = containerRef.current?.getBoundingClientRect()
    setBlockTop(Math.round(cr ? (br.top - cr.top) : br.top))
  }, [descriptor, progress, open, count, tooltipVariant, view])
  useLayoutEffect(() => {
    if (!revealOpen) return
    const el = measureRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h && Math.abs(h - itemH) > 2) setItemH(h)
  }, [revealOpen, count, descriptor, tooltipVariant])

  // Reinitialize anchors bucket when count changes
  useLayoutEffect(() => {
    anchorsRef.current = createAnchorsBucket(count)
    setAnchorsVersion((v) => v + 1)
  }, [count])

  // No runtime calibration: keep anchor stable and deterministic

  // Debug/selection gating removed to minimize layout thrash during toggle

  // No equalizer management; visibility-only strategy ensures no mid-state

  // No proxy guard; stabilization handled by compositing and removing overlay placeholder

  // Removed readiness tracking; not needed for visibility-only approach

  // When opening, wait two animation frames before showing connectors so the
  // DOM has settled (prevents a momentary horizontal connector on re-open)
  useLayoutEffect(() => {
    if (!revealOpen) { setConnectorsVisible(false); return }
    setConnectorsVisible(false)
    const id1 = window.requestAnimationFrame(() => {
      const id2 = window.requestAnimationFrame(() => setConnectorsVisible(true))
      ;(setConnectorsVisible as any)._id2 = id2
    })
    return () => {
      try { window.cancelAnimationFrame(id1) } catch {}
      try { window.cancelAnimationFrame((setConnectorsVisible as any)._id2) } catch {}
    }
  }, [revealOpen])

  // Document-level pointer listener: close only on true click-out (no drag)
  useEffect(() => {
    if (!revealOpen) return
    const THRESH = 6 // px
    const isPrimary = (ev: PointerEvent) => ev.isPrimary && (ev.button === 0 || ev.button === undefined)
    const onPointerDown = (e: PointerEvent) => {
      if (!isPrimary(e)) return
      const target = e.target as Node | null
      const blockEl = blockRef.current
      const stageEl = instStageRef.current
      if (!target || !blockEl || !stageEl) return
      const insideBlock = blockEl.contains(target)
      const insideStage = stageEl.contains(target)
      ptrRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        outsideStart: !(insideBlock || insideStage),
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      const s = ptrRef.current
      if (!s.active) return
      if (Math.abs(e.clientX - s.startX) > THRESH || Math.abs(e.clientY - s.startY) > THRESH) {
        s.moved = true
      }
    }
    const finish = (e: PointerEvent) => {
      const s = ptrRef.current
      if (!s.active) return
      if (s.outsideStart && !s.moved) {
        setRevealOpen(false)
      }
      s.active = false
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', finish, true)
    document.addEventListener('pointercancel', finish, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', finish, true)
      document.removeEventListener('pointercancel', finish, true)
    }
  }, [revealOpen])

  return (
    <div
      className="vision-harness"
      style={{ WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <video
        className="vision-harness__bg"
        src="/magenta-mystic-swell.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <SandboxViewport ref={sandRef as any} onViewChange={onViewChange}>
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
          <div ref={containerRef} style={{ position: 'relative', width: dims.w }}>
            {/* Keep the stack DOM mounted; toggle visibility only to avoid any mid-state flicker */}
            <div
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                visibility: open && !revealOpen ? 'visible' : 'hidden',
              }}
            >
              <TaskStack items={items} width={dims.w} height={dims.h} radius={30} variant={2} />
            </div>
            <div
              ref={blockRef}
              style={{
                position: 'relative', zIndex: 100, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
                userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' as any,
              }}
              onMouseDown={(e) => { e.preventDefault() }}
              onDragStart={(e) => { e.preventDefault() }}
              onClick={() => {
                const next = !revealOpen
                setRevealOpen(next)
                // eslint-disable-next-line no-console
                console.log('[TaskStack] toggle', { to: next ? 'ON' : 'OFF' })
              }}
            >
              <TaskBlock descriptor={descriptor} percent={progress} variant={2} />
            </div>
            {/* Stage anchored to the block top in local container coordinates; visibility-only */}
            <div
              ref={instStageRef}
              style={{
                position: 'absolute', left: '50%', top: blockTop, transform: 'translateX(-50%)', width: dims.w, height: 0,
                pointerEvents: revealOpen ? 'auto' : 'none',
                visibility: revealOpen ? 'visible' : 'hidden',
                WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none',
                zIndex: 50,
              }}
            >
                  {/* Inter-instance connectors (label -> next chip), viewport overlay (match TaskItem harness) */}
                  {(() => {
                    const links = computeInterInstanceLinks(anchorsRef.current as any)
                    const first = anchorsRef.current?.[0]
                    // Scale connector visuals with current viewport scale so they don't look thicker when zoomed out
                    const BASE_W = 2.5
                    const BASE_D0 = 3
                    const BASE_D1 = 9
                    const sw = Math.max(1, BASE_W * view.scale)
                    const dash = `${(BASE_D0 * view.scale).toFixed(3)} ${(BASE_D1 * view.scale).toFixed(3)}`
                    // Flow helper: ensure dots move upwards on screen
                    const flowFor = (a?: HTMLElement | null, b?: HTMLElement | null) => {
                      if (!a || !b) return 'reverse' as const
                      try {
                        const ar = a.getBoundingClientRect()
                        const br = b.getBoundingClientRect()
                        return br.top < ar.top ? 'forward' : 'reverse'
                      } catch {
                        return 'reverse' as const
                      }
                    }
                    // Render connectors immediately (no animation gating)
                    // Optional manual block->first segment (viewport coords), trimmed 1px above chip top
                    const manualTop: { from?: {x:number;y:number}, to?: {x:number;y:number} } = {}
                    if ((blockInnerRef.current || blockRef.current) && first?.chipEl) {
                      const br = (blockInnerRef.current ?? blockRef.current)!.getBoundingClientRect()
                      const cr = first.chipEl.getBoundingClientRect()
                      const cx = Math.round(cr.left + cr.width / 2)
                      manualTop.from = { x: cx, y: Math.round(br.top) }
                      manualTop.to   = { x: cx, y: Math.round(cr.top - 2) }
                    }

                    // Build connector candidates and then emit with de-duplication
                    const candidates: Array<{
                      key: string,
                      fromEl: HTMLElement,
                      toEl: HTMLElement,
                      fromSide?: any,
                      toSide?: any,
                      className?: string,
                    }> = []
                    // Self label->chip per item
                    anchorsRef.current?.forEach((a, idx) => {
                      if (a?.labelEl && a?.chipEl) {
                        candidates.push({ key: `self-${idx}`, fromEl: a.labelEl, toEl: a.chipEl, fromSide: 'bottom', toSide: 'top', className: idx === 0 ? 'connector--no-shadow' : undefined })
                      }
                    })
                    // Inter-instance links
                    links.forEach((ln, idx) => {
                      if (ln.fromEl && ln.toEl) {
                        candidates.push({ key: `inst-${idx}`, fromEl: ln.fromEl, toEl: ln.toEl, fromSide: ln.fromSide, toSide: ln.toSide })
                      }
                    })

                    // De-duplicate by element identity pair
                    pairSeenRef.current.clear()
                    const emitted = candidates.filter(c => {
                      const k = pairKey(c.fromEl, c.toEl)
                      if (!k || pairSeenRef.current.has(k)) return false
                      pairSeenRef.current.add(k)
                      return true
                    })

                    // Render connectors only when all anchors we need exist and the gate is open
                    const allReady = Boolean(anchorsRef.current && anchorsRef.current.every(a => a?.labelEl && a?.chipEl))
                    return (
                      <div key={`links-${anchorsVersion}-${connectorsVisible ? 'on' : 'off'}`} style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
                        {connectorsVisible && allReady && (blockInnerRef.current || blockRef.current) && first?.chipEl && (
                          <Connector
                            key="block-first"
                            stageEl={instStageRef.current!}
                            fromEl={(blockInnerRef.current ?? blockRef.current)!}
                            toEl={first.chipEl}
                            fromSide="top"
                            toSide="top"
                            orientation="vertical"
                            flow={flowFor((blockInnerRef.current ?? blockRef.current)!, first.chipEl)}
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
                  {(() => {
                    const h = Math.round(itemH * NODE_SCALE)
                    // Bottom-most instance center at exactly FIRST_GAP_PX above the TaskBlock top
                    const y0 = -(FIRST_GAP_PX + h / 2)
                    // Each subsequent instance stacks upward by (h + GAP)
                    const out = [] as Array<{ tx: number; ty: number; scale: number }>
                    for (let i = 0; i < items.length; i++) {
                      out.push({ tx: 0, ty: y0 - i * (h + STACK_GAP_PX), scale: NODE_SCALE })
                    }
                    return out.map((t, i) => (
                      <div
                        key={items[i].id}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          transform: `translateX(-50%) translateY(${t.ty}px) scale(${t.scale})`,
                          transformOrigin: 'center center',
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none', WebkitUserSelect: 'none',
                        }}
                      >
                        <TaskItem
                          text={descriptor}
                          gap={64}
                          mode={"chain"}
                          tooltipVariant={tooltipVariant}
                          progressPercent={progress}
                          exposeAnchors={(a) => {
                            setInstanceAnchors(anchorsRef.current, i, a as any)
                            setAnchorsVersion((v) => v + 1)
                          }}
                        />
                      </div>
                    ))
                  })()}
                  {/* hidden measurer */}
                  <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
                    <TaskItem text={descriptor} gap={64} tooltipVariant={tooltipVariant} progressPercent={progress} mode="chain" />
                  </div>
                </div>
            </div>
          </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Task Stack Harness" />
      <ZoomSlider
        onChange={(delta: number) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 360,
          background: 'rgba(15,15,15,0.45)',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          backdropFilter: 'blur(10px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
          zIndex: 20,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Instances: {count}</label>
          <input type="range" min={1} max={8} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Open stack</label>
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Text</label>
          <input
            type="text"
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Tooltip Style</label>
          <select
            value={tooltipVariant}
            onChange={(e) => setTooltipVariant(e.target.value as 'circle' | 'rect' | 'plain')}
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%'
            }}
          >
            <option value="circle">Style 1: Circle (curved text)</option>
            <option value="rect">Style 2: Rect (straight text)</option>
            <option value="plain">Style 3: Plain (no rect)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Progress: {progress}% (floor 1% when active)</label>
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  )
}

export default TaskStackHarness
