import React, { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { SandboxViewport, GridOverlay, TestBadge, sliderValueToScale, clamp } from '../../primitives/sandbox-env'
import ZoomSlider from './zoom-slider'
import VisionPrimitive from '../../primitives/vision-primitive/vision-primitive'
import { createVisionState, deriveVisionProps, updateScale } from '../utils/vision-primitive'
import Pipeline from '../../primitives/pipeline/pipeline'
import Connector from '../../primitives/connector/connector'
import '../../primitives/vision-primitive/vision-harness.css'
// Task tree (task-stack harness pieces)
import TaskItem from '../../primitives/pipeline/mods/task-item/components/task-item'
import { createAnchorsBucket, setInstanceAnchors } from '../../primitives/pipeline/mods/task-item/utils/instance'
import { taskTreeTransforms, taskTreeStyleForScale } from '../../primitives/pipeline/mods/task-stack/mods/task-tree'

export type CanvasSpaceHandle = {
  setScale: (next: number) => void
  getView: () => { pan: { x: number; y: number }; scale: number }
}

export type CanvasSpaceProps = {
  bgSrc?: string
  showGrid?: boolean
  showBadge?: boolean
  badgeLabel?: string
  initialScale?: number
  minScale?: number
  maxScale?: number
  stageWidth?: number
  stageMinHeight?: number
  className?: string
  children?: React.ReactNode
  // Center pane controls
  showPane?: boolean
  paneScale?: number // multiplier on baseline 520x360; default 1.65 (65% larger)
  paneBaseWidth?: number
  paneBaseHeight?: number
  responsivePane?: boolean // if true, size from viewport with side padding
  sidePaddingRatio?: number // 0..0.5, default 0.2 (20% each side)
  responsiveStage?: boolean
  responsiveStageHeight?: boolean
  panePlacement?: 'overlay' | 'content' // overlay centers to viewport independent of pan/zoom
  paneWidthRatio?: number // 0..1 override for overlay width (e.g., 0.78 = 78% viewport width)
  paneContentWidthRatio?: number // 0..1 override for content placement sizing from viewport
}

const CanvasSpace = React.forwardRef<CanvasSpaceHandle, CanvasSpaceProps>(function CanvasSpace(
  {
    bgSrc = '/magenta-mystic-swell.mp4',
    showGrid = true,
    showBadge = true,
    badgeLabel = 'Canvas Space',
    initialScale = 1,
    minScale = 0.25,
    maxScale = 2.25,
    stageWidth = 1400,
    stageMinHeight = 800,
    className,
    children,
    showPane = true,
    paneScale = 1.65,
    paneBaseWidth = 520,
    paneBaseHeight = 360,
    responsivePane = true,
    sidePaddingRatio = 0.2,
    responsiveStage = true,
    responsiveStageHeight = true,
    panePlacement = 'overlay',
    paneWidthRatio,
    paneContentWidthRatio,
  },
  ref,
) {
  const sandRef = useRef<{
    setScaleAnchored: (next: number) => void
    getView: () => { pan: { x: number; y: number }; scale: number; viewport: HTMLDivElement | null }
  } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const paneClipRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: initialScale })
  const [vision, setVision] = useState(() => createVisionState({ scale: initialScale }))
  const [pipePairs, setPipePairs] = useState<Array<{ a: HTMLElement; b: HTMLElement }>>([])
  const [vpSize, setVpSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const pipelineRef = useRef<HTMLDivElement | null>(null)
  const visionRef = useRef<HTMLDivElement | null>(null)
  // Task tree overlay state (sourced from task-stack harness but embedded inline)
  const [treeOpen, setTreeOpen] = useState(false)
  const [treeForIndex, setTreeForIndex] = useState<number | null>(null)
  const activeBlockElRef = useRef<HTMLElement | null>(null)
  const [itemH, setItemH] = useState<number>(260)
  const [_anchorsVersion, setAnchorsVersion] = useState(0)
  const anchorsRef = useRef(createAnchorsBucket(4))
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [treeAnchor, setTreeAnchor] = useState<{ x: number; y: number } | null>(null) // stage-local coords
  // Vision power state controls Pipeline visibility
  const [pipelinePoweredOn, setPipelinePoweredOn] = useState(true)
  const [worldPos, setWorldPos] = useState<{ pipeline?: { x: number; y: number }; vision?: { x: number; y: number } }>({})
  const onViewChange = useCallback((v: any) => {
    setView({ pan: v.pan, scale: v.scale })
    setVision((prev) => updateScale(prev, v.scale))
    try {
      const vpEl = v.viewport as HTMLDivElement | null
      if (vpEl) setVpSize({ w: vpEl.clientWidth, h: vpEl.clientHeight })
    } catch {}
  }, [])

  // Measure world (stage-local) coordinates once for stable placement.
  // Default Vision: aligned to Pipeline's left edge, just beneath its bottom.
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const sr = stage.getBoundingClientRect()
    const sNow = Math.max(0.0001, view.scale)

    let changed = false
    const next: { pipeline?: { x: number; y: number }; vision?: { x: number; y: number } } = { ...worldPos }

    // Pipeline world position (top-left)
    if (!next.pipeline && pipelineRef.current) {
      const pr = pipelineRef.current.getBoundingClientRect()
      next.pipeline = { x: (pr.left - sr.left) / sNow, y: (pr.top - sr.top) / sNow }
      changed = true
    }

    // Vision default world position: under pipeline, shifted further to the left (more in Y)
    if (!next.vision && pipelineRef.current) {
      const pr = pipelineRef.current.getBoundingClientRect()
      const GAP_V = 144 // vertical gap below pipeline (increase Y more)
      const GAP_H = 200 // horizontal shift to the LEFT from pipeline's left edge
      const vX = ((pr.left - sr.left) - GAP_H) / sNow
      const vY = ((pr.bottom - sr.top) + GAP_V) / sNow
      next.vision = { x: vX, y: vY }
      changed = true
    }

    if (changed) setWorldPos(next)
  }, [view.scale, view.pan.x, view.pan.y])

  // Discover adjacent TaskBlock pairs inside the Pipeline for connectors
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const pairs: Array<{ a: HTMLElement; b: HTMLElement }> = []
    for (let i = 0; i < els.length - 1; i++) pairs.push({ a: els[i], b: els[i + 1] })
    setPipePairs(pairs)
  }, [view.pan.x, view.pan.y, view.scale])

  // Measure TaskItem height for spacing
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h && Math.abs(h - itemH) > 1) setItemH(h)
  }, [])

  // (removed gating; spine renders with fallback immediately on open/pivot)

  // Dim all non-selected task blocks when tree is open; restore on close
  useLayoutEffect(() => {
    const root = pipelineRef.current
    if (!root) return
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    blocks.forEach((b, i) => {
      if (treeOpen && treeForIndex !== null) {
        if (i === treeForIndex) {
          b.classList.add('is-selected');
          b.classList.remove('is-dimmed')
        } else {
          b.classList.add('is-dimmed');
          b.classList.remove('is-selected')
        }
      } else {
        b.classList.remove('is-dimmed');
        b.classList.remove('is-selected')
      }
    })
  }, [treeOpen, treeForIndex])

  // (No clipPath needed for stage overlay connectors)

  // Recompute viewport size on window resize
  React.useEffect(() => {
    const onResize = () => {
      const gv = sandRef.current?.getView?.()
      if (gv?.viewport) setVpSize({ w: gv.viewport.clientWidth, h: gv.viewport.clientHeight })
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useImperativeHandle(ref, () => ({
    setScale: (next: number) => sandRef.current?.setScaleAnchored(next),
    getView: () => ({ ...view }),
  }), [view])

  // Derived sizes and center in local coordinates
  const s = Math.max(0.0001, view.scale)
  const visualTargetW = vpSize.w ? Math.max(0, vpSize.w * (1 - 2 * sidePaddingRatio)) : paneBaseWidth * paneScale
  const contentTargetLocalW = (panePlacement === 'content' && paneContentWidthRatio)
    ? Math.max(1, Math.round(((responsiveStage && vpSize.w) ? Math.round(visualTargetW / s) : stageWidth) * paneContentWidthRatio))
    : Math.round(visualTargetW / s)
  const paneWLocal = responsivePane ? contentTargetLocalW : Math.round(paneBaseWidth * paneScale)
  const aspect = paneBaseHeight / paneBaseWidth
  // keep aspect for overlay math; comp height is derived from compPaneWLocal below
  // When overlay placement is active, mirror overlay width into local content space so
  // components align exactly with the glass pane.
  const overlayLocalW = Math.max(1, Math.round(((vpSize.w || 0) * (paneWidthRatio ?? (1 - 2 * sidePaddingRatio))) / s))
  const compPaneWLocal = panePlacement === 'overlay' ? Math.max(overlayLocalW, paneWLocal) : paneWLocal
  const compPaneHLocal = Math.round(compPaneWLocal * aspect)
  const stageWLocalBase = (responsiveStage && vpSize.w) ? Math.round(visualTargetW / s) : stageWidth
  const stageHLocalBase = (responsiveStageHeight && vpSize.h) ? Math.round(vpSize.h / s) : stageMinHeight
  const stageWLocal = Math.max(stageWLocalBase, compPaneWLocal)
  const stageHLocal = Math.max(stageHLocalBase, compPaneHLocal)
  // Stage-centered anchoring: components container moves with pan (vector space behavior)
  const stageCenterX = Math.round(stageWLocal / 2)
  const stageCenterY = Math.round(stageHLocal / 2)
  // Layout inside pane: use grid to avoid overlap between components
  const paneLeftLocal = Math.round(stageCenterX - compPaneWLocal / 2)
  const paneTopLocal = Math.round(stageCenterY - compPaneHLocal / 2)
  // Render-time micro-tweak for Vision placement (stage-local units)
  const VISION_OFFSET_X = -96
  const VISION_OFFSET_Y = 84
  const VISION_BASE_SCALE = 0.88
  // Keep a single constant for Pipeline scale so visuals and math stay in sync
  const PIPELINE_SCALE = 0.8

  return (
    <div className={`vision-harness${className ? ' ' + className : ''}`}>
      {/* Animated background */}
      <video className="vision-harness__bg" src={bgSrc} autoPlay muted loop playsInline preload="metadata" />

      {/* Pan/zoom sandbox viewport */}
      {panePlacement === 'overlay' ? (
        <div
          ref={paneClipRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${(paneWidthRatio ?? (1 - 2 * sidePaddingRatio)) * 100}%`,
            aspectRatio: `${paneBaseWidth} / ${paneBaseHeight}`,
            overflow: 'hidden',
            borderRadius: 24,
            zIndex: 2,
            pointerEvents: 'auto',
          }}
          aria-label="Canvas pane clip"
          onWheelCapture={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const factor = Math.exp(-e.deltaY * 0.0012)
            const next = clamp(view.scale * factor, minScale, maxScale)
            sandRef.current?.setScaleAnchored(next)
          }}
        >
          <SandboxViewport ref={sandRef as any} onViewChange={onViewChange} initialScale={initialScale} minScale={minScale} maxScale={maxScale}>
            {/* Stage area where demo components will be placed */}
            <div
              ref={stageRef}
              style={{ position: 'relative', width: stageWLocal, height: stageHLocal }}
            >
              <div style={{ position: 'absolute', left: paneLeftLocal, top: paneTopLocal, width: compPaneWLocal, height: compPaneHLocal }}>
                {/* Absolute-anchored layout for vector-consistent spacing */}
                <div
                  ref={pipelineRef}
                  style={{
                    position: 'absolute',
                    left: (worldPos.pipeline ? worldPos.pipeline.x - paneLeftLocal : 32),
                    top: (worldPos.pipeline ? worldPos.pipeline.y - paneTopLocal : 24),
                    transform: `scale(${PIPELINE_SCALE})`,
                    transformOrigin: 'top left',
                    ['--pipeline-gap-roomy' as any]: '80px',
                  }}
                  onPointerDownCapture={(e) => {
                    // Toggle task tree for tapped TaskBlock using capture so TaskBlock's stopPropagation doesn't block us
                    const root = pipelineRef.current
                    if (!root) return
                    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pipeline .task-block'))
                    const t = e.target as HTMLElement
                    const idx = blocks.findIndex((b) => b.contains(t))
                    if (idx < 0) return
                    const stage = stageRef.current
                    if (!stage) return
                    const sr = stage.getBoundingClientRect()
                    const blk = blocks[idx]
                    activeBlockElRef.current = blk
                    const br = blk.getBoundingClientRect()
                    const ax = (br.left + br.width / 2 - sr.left) / s - paneLeftLocal
                    const ay = (br.top - sr.top) / s - paneTopLocal
                    setTreeForIndex(idx)
                    setTreeAnchor({ x: Math.round(ax), y: Math.round(ay) })
                    // Keep tree open when switching stacks; compute whether this is a pivot
                    setTreeOpen((prev) => !prev || treeForIndex !== idx)
                    // Reset anchors for both fresh open and pivot to avoid stale refs
                    anchorsRef.current = createAnchorsBucket(4)
                    // Trigger re-measure/repaint cycle for connectors
                    setAnchorsVersion((v) => v + 1)
                  }}
                >
                  <Pipeline
                    className={`${treeOpen ? 'pipeline-shell--tree-open' : ''} ${!pipelinePoweredOn ? 'pipeline-shell--powered-off' : ''}`.trim()}
                    entries={[
                      { id: 't1', descriptor: 'Define scope' },
                      { id: 't2', descriptor: 'Draft spec' },
                      { id: 't3', descriptor: 'Implement baseline' },
                      { id: 't4', descriptor: 'Polish UX' },
                    ]}
                    spacing="roomy"
                  />
                </div>
                {/* Task tree overlay anchored above selected block (stage-local coordinates) */}
                {treeOpen && treeAnchor && (
                  <div key={`tree-${treeForIndex}-${_anchorsVersion}`} style={{ position: 'absolute', left: treeAnchor.x, top: treeAnchor.y, zIndex: 5, pointerEvents: 'none' }}>
                    <div style={{ position: 'relative', width: 1, height: 1 }}>
                      {taskTreeTransforms({ count: 4, itemHeight: itemH, nodeScale: 1.0, firstGapPx: 96, stackGapPx: 80 }).map((t, i) => (
                        <div key={`ti-${i}`} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(-50%, -50%) translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`, transformOrigin: 'center center' }}>
                          <TaskItem
                            text={i === 0 ? 'Define sub-goal' : i === 1 ? 'Research options' : i === 2 ? 'Design component' : 'Draft deliverable'}
                            gap={64}
                            tooltipVariant="circle"
                            mode="chain"
                            progressPercent={0}
                            exposeAnchors={(a) => {
                              setInstanceAnchors(anchorsRef.current as any, i, a as any)
                              setAnchorsVersion((v) => v + 1)
                            }}
                          />
                        </div>
                      ))}
                      {/* Hidden measurer */}
                      <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
                        <TaskItem text="Measure" gap={64} />
                      </div>
                    </div>
                  </div>
                )}
                <div
                  ref={visionRef}
                  style={{
                    position: 'absolute',
                    left: (worldPos.vision ? worldPos.vision.x - paneLeftLocal + VISION_OFFSET_X : 8 + VISION_OFFSET_X),
                    top: (worldPos.vision ? worldPos.vision.y - paneTopLocal + VISION_OFFSET_Y : 24 + 260 + VISION_OFFSET_Y),
                    transform: `scale(${VISION_BASE_SCALE})`,
                    transformOrigin: 'top left',
                    opacity: treeOpen ? 0.5 : 1,
                    transition: 'opacity 300ms ease',
                  }}
                >
                  <VisionPrimitive state={deriveVisionProps(vision).state} onPowerToggle={(next) => setPipelinePoweredOn(next === 'active')} />
                </div>
                {/* Connectors between blocks (stage overlay, clipped with pane) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
                  {pipePairs.map((pair, i) => {
                    const stage = stageRef.current
                    if (!stage || !pair.a || !pair.b) return null
                    const sr = stage.getBoundingClientRect()
                    const ar = pair.a.getBoundingClientRect()
                    const br = pair.b.getBoundingClientRect()
                    const from = { x: (ar.right - sr.left) / s - paneLeftLocal, y: (ar.top + ar.height / 2 - sr.top) / s - paneTopLocal }
                    const to   = { x: (br.left - sr.left)  / s - paneLeftLocal, y: (br.top + br.height / 2 - sr.top) / s - paneTopLocal }
                    return (
                      <Connector
                        key={`pconn-${i}`}
                        from={from}
                        to={to}
                        radius={18}
                        width={1.4}
                        dashArray="2 5"
                        overlay="stage"
                        color="rgba(255,255,255,0.9)"
                        flow="forward"
                        svgStyle={{ ['--conn-dash-period' as any]: '7px', opacity: pipelinePoweredOn ? (treeOpen ? 0.5 : 1) : 0, transition: 'opacity 300ms ease' }}
                      />
                    )
                  })}
                  {(() => {
                    const stage = stageRef.current
                    const p = pipelineRef.current
                    const v = visionRef.current
                    if (!stage || !p || !v) return null
                    const sr = stage.getBoundingClientRect()
                    const pr = p.getBoundingClientRect()
                    const vr = v.getBoundingClientRect()
                    const from = { x: (vr.left + vr.width / 2 - sr.left) / s - paneLeftLocal, y: (vr.top - sr.top) / s - paneTopLocal }
                    const to   = { x: (pr.left - sr.left) / s - paneLeftLocal, y: (pr.top + pr.height / 2 - sr.top) / s - paneTopLocal }
                    const visOpacity = pipelinePoweredOn ? (treeOpen ? 0.5 : 1) : 0
                    return (
                      <Connector
                        key="pconn-vision"
                        from={from}
                        to={to}
                        radius={24}
                        width={2.5}
                        dashArray="3 9"
                        overlay="stage"
                        color="rgba(255,255,255,0.9)"
                        fromAxis="vertical"
                        toAxis="horizontal"
                        svgStyle={{ opacity: visOpacity, transition: 'opacity 300ms ease' }}
                      />
                    )
                  })()}
                  {/* Task tree vertical spine (single connector, beneath items) */}
                  {treeOpen && anchorsRef.current && (() => {
                    const stage = stageRef.current
                    const blockEl = activeBlockElRef.current
                    if (!stage || !blockEl) return null
                    // Find extreme top (min Y) among all task items (chip/label)
                    try {
                      const sr = stage.getBoundingClientRect()
                      const br = blockEl.getBoundingClientRect()
                      let minTop = Infinity
                      let midX = 0
                      let haveAnchors = false
                      anchorsRef.current.forEach((a) => {
                        if (!a) return
                        const candidates: HTMLElement[] = []
                        if (a.chipEl) candidates.push(a.chipEl)
                        if (a.labelEl) candidates.push(a.labelEl)
                        candidates.forEach((el) => {
                          const r = el.getBoundingClientRect()
                          haveAnchors = true
                          if (r.top < minTop) {
                            minTop = r.top
                            midX = Math.round(r.left + r.width / 2)
                          }
                        })
                      })
                      // Compute stage-local endpoints
                      let from, to
                      if (haveAnchors && isFinite(minTop) && midX !== 0) {
                        from = {
                          x: Math.round((midX - sr.left) / s - paneLeftLocal),
                          y: Math.round((br.top - sr.top) / s - paneTopLocal),
                        }
                        to = {
                          x: from.x,
                          y: Math.round((minTop - sr.top) / s - paneTopLocal - 2),
                        }
                      } else {
                        // Fallback while anchors are not yet measured (e.g., during pivot):
                        // draw a short segment from the tapped block top upward by firstGapPx
                        const FIRST_GAP_PX = 96
                        from = {
                          x: Math.round((br.left + br.width / 2 - sr.left) / s - paneLeftLocal),
                          y: Math.round((br.top - sr.top) / s - paneTopLocal),
                        }
                        to = { x: from.x, y: Math.round(from.y - FIRST_GAP_PX + 2) }
                      }
                      const style = taskTreeStyleForScale(s * PIPELINE_SCALE)
                      return (
                        <Connector
                          key="tree-spine"
                          from={from}
                          to={to}
                          orientation="vertical"
                          overlay="stage"
                          className="connector--no-shadow"
                          color="rgba(255,255,255,0.9)"
                          width={style.width}
                          dashArray={style.dash}
                          svgStyle={{ ['--conn-dash-period' as any]: style.period }}
                        />
                      )
                    } catch {
                      return null
                    }
                  })()}
                </div>
              </div>
              {children}
            </div>
          </SandboxViewport>

          {/* Localized zoom control inside the pane clip (topmost, small hitbox) */}
          <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
            <ZoomSlider
              min={-2}
              max={2}
              onChange={(delta) => {
                const next = sliderValueToScale(delta, initialScale, minScale, maxScale)
                sandRef.current?.setScaleAnchored(next)
              }}
            />
          </div>
        </div>
      ) : (
        <SandboxViewport ref={sandRef as any} onViewChange={onViewChange} initialScale={initialScale} minScale={minScale} maxScale={maxScale}>
          {/* Stage area where demo components will be placed */}
          <div ref={stageRef} style={{ position: 'relative', width: stageWLocal, height: stageHLocal }}>
            {showPane && (
              <div style={{ position: 'absolute', left: paneLeftLocal, top: paneTopLocal, width: compPaneWLocal, height: compPaneHLocal, pointerEvents: 'auto', zIndex: 2, overflow: 'hidden', borderRadius: 24 }} aria-label="Canvas components container">
                {/* Absolute-anchored layout for vector-consistent spacing */}
                <div style={{ position: 'absolute', left: 32, top: 24, transform: 'scale(0.8)', transformOrigin: 'top left', ['--pipeline-gap-roomy' as any]: '80px' }}>
                  <Pipeline
                    className={!pipelinePoweredOn ? 'pipeline-shell--powered-off' : undefined}
                    entries={[
                      { id: 't1', descriptor: 'Define scope' },
                      { id: 't2', descriptor: 'Draft spec' },
                      { id: 't3', descriptor: 'Implement baseline' },
                      { id: 't4', descriptor: 'Polish UX' },
                    ]}
                    spacing="roomy"
                  />
                </div>
                <div style={{ position: 'absolute', right: 48, bottom: 36, transform: `scale(${VISION_BASE_SCALE})`, transformOrigin: 'top left', opacity: treeOpen ? 0.5 : 1, transition: 'opacity 300ms ease' }}>
                  <VisionPrimitive state={deriveVisionProps(vision).state} onPowerToggle={(next) => setPipelinePoweredOn(next === 'active')} />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
                  {pipePairs.map((pair, i) => {
                    const stage = stageRef.current
                    if (!stage || !pair.a || !pair.b) return null
                    const sr = stage.getBoundingClientRect()
                    const ar = pair.a.getBoundingClientRect()
                    const br = pair.b.getBoundingClientRect()
                    const from = { x: (ar.right - sr.left) / s - paneLeftLocal, y: (ar.top + ar.height / 2 - sr.top) / s - paneTopLocal }
                    const to   = { x: (br.left - sr.left)  / s - paneLeftLocal, y: (br.top + br.height / 2 - sr.top) / s - paneTopLocal }
                    return (
                      <Connector
                        key={`pconn-c-${i}`}
                        from={from}
                        to={to}
                        radius={18}
                        width={1.4}
                        dashArray="2 5"
                        overlay="stage"
                        color="rgba(255,255,255,0.9)"
                        flow="forward"
                        svgStyle={{ opacity: pipelinePoweredOn ? (treeOpen ? 0.5 : 1) : 0, transition: 'opacity 300ms ease' }}
                      />
                    )
                  })}
                </div>
              </div>
            )}
            {children}
          </div>
        </SandboxViewport>
      )}

      {/* Managed central pane (overlay-space) */}
      {showPane && panePlacement === 'overlay' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${(paneWidthRatio ?? (1 - 2 * sidePaddingRatio)) * 100}%`,
            aspectRatio: `${paneBaseWidth} / ${paneBaseHeight}`,
            borderRadius: 24,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
            boxShadow: '0 14px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'block',
            color: 'rgba(255,255,255,0.9)',
            font: '600 18px/1.2 ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial',
            letterSpacing: 0.2,
            pointerEvents: 'none',
            zIndex: 1,
          }}
          aria-label="Canvas central pane"
        >
        </div>
      )}

      {/* Overlays */}
      {showGrid && <GridOverlay />}
      {showBadge && <TestBadge label={badgeLabel} />}

      {(!showPane) && (
        <ZoomSlider
          onChange={(delta) => {
            const next = sliderValueToScale(delta, initialScale, minScale, maxScale)
            sandRef.current?.setScaleAnchored(next)
          }}
        />
      )}

      {/* Debug */}
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
    </div>
  )
})

export default CanvasSpace
