import React, { useCallback, useMemo, useRef, useState, useLayoutEffect } from 'react'
import TaskStack, { TaskStackItem } from '../components/task-stack'
import TaskBlock from '../../task-block/task-block'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../../sandbox-env'
import '../../../vision-primitive/vision-harness.css'
import { computeRevealTransforms } from '../mods/stack-reveal'
import TaskItemCard from '../../task-item/components/task-item'
import { computeNodeSpace } from '../utils/node-space'

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
  const [variant, setVariant] = useState<1 | 2>(2)
  const [stackVariant, setStackVariant] = useState<1 | 2 | 3>(1)
  const [revealOpen, setRevealOpen] = useState(false)

  // Reveal layout controls
  const NODE_SCALE = 0.70 // visual scale applied to each revealed task item
  const NODE_GAP_PX = -48 // slightly looser than before
  const NODE_TRIM_TOP_PX = 0 // adjust if first gap visually differs due to halo

  const items = useMemo(() => makeItems(count), [count])
  const blockRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 245, h: 260 })
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [itemH, setItemH] = useState<number>(260)
  useLayoutEffect(() => {
    const el = blockRef.current
    if (!el) return
    // Use untransformed layout size to avoid double-scaling under viewport transforms
    const w = Math.round(el.offsetWidth)
    const h = Math.round(el.offsetHeight)
    if (w && h) setDims({ w, h })
  }, [descriptor, progress, variant, open])
  useLayoutEffect(() => {
    if (!revealOpen) return
    const el = measureRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h && Math.abs(h - itemH) > 2) setItemH(h)
  }, [revealOpen, count])

  return (
    <div className="vision-harness">
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
          <div style={{ position: 'relative', width: dims.w }}>
            {!revealOpen && open && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <TaskStack items={items} width={dims.w} height={dims.h} radius={30} variant={(stackVariant === 3 ? 2 : stackVariant) as 1 | 2} />
              </div>
            )}
            <div
              ref={blockRef}
              style={{ position: 'relative', zIndex: 1, cursor: 'pointer' }}
              onClick={() => setRevealOpen((v) => !v)}
            >
              <TaskBlock descriptor={descriptor} percent={progress} variant={variant} />
            </div>
            {revealOpen && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2 }}>
                <div style={{ position: 'relative', width: dims.w, height: dims.h, pointerEvents: 'auto' }}>
                  {(() => {
                    const ns = computeNodeSpace({
                      blockHeight: dims.h,
                      nodeHeight: itemH,
                      scale: NODE_SCALE,
                      gap: NODE_GAP_PX,
                      trimTop: NODE_TRIM_TOP_PX,     // set >0 to compensate for block halo
                      trimBetween: 0,                // keep between equal to top by default
                    })
                    return computeRevealTransforms(items, 1, {
                      liftPx: ns.liftPx,
                      spacingPx: ns.spacingPx,
                      fanSidePx: 0,
                      fanStepDeg: 0,
                      startSide: 1,
                      baseMinAbs: 0,
                      baseMaxAbs: 0,
                      opacityMin: 1,
                      opacityMax: 1,
                    }).map((t, i) => (
                      <div key={items[i].id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.tx}px, ${t.ty}px)` }}>
                        <div style={{ transform: `scale(${ns.scale})`, transformOrigin: 'center center' }}>
                          <TaskItemCard descriptor={items[i].state ? items[i].state.toUpperCase() : items[i].id} />
                        </div>
                      </div>
                    ))
                  })()}
                  {/* hidden measurer */}
                  <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
                    <TaskItemCard descriptor="MEASURE" />
                  </div>
                </div>
              </div>
            )}
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
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Items: {count}</label>
          <input type="range" min={1} max={8} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Open stack</label>
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Descriptor</label>
          <input
            type="text"
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Progress: {progress}%</label>
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Arc Style</label>
          <select
            value={variant}
            onChange={(e) => setVariant(parseInt(e.target.value, 10) as 1 | 2)}
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%'
            }}
          >
            <option value={1}>Style 1 — Solid</option>
            <option value={2}>Style 2 — Thin + Glow</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85, minWidth: 90 }}>Stack Style</label>
          <select
            value={stackVariant}
            onChange={(e) => setStackVariant(parseInt(e.target.value, 10) as 1 | 2 | 3)}
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%'
            }}
          >
            <option value={1}>Style 1 — Edges Only</option>
            <option value={2}>Style 2 — Filled (Balanced)</option>
            <option value={3}>Style 3 — Filled (Strong)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default TaskStackHarness
