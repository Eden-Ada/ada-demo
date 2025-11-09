import React, { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SandboxViewport, GridOverlay, TestBadge, sliderValueToScale, clamp } from '../../primitives/sandbox-env'
import ZoomSlider from './zoom-slider'
import TaskPane from './canvas-space/task-pane'
import VisionPrimitive from '../../primitives/vision-primitive/vision-primitive'
import { createVisionState, deriveVisionProps, updateScale } from '../utils/vision-primitive'
import Pipeline from '../../primitives/pipeline/pipeline'
import Connector from '../../primitives/connector/connector'
import '../../primitives/vision-primitive/vision-harness.css'
import '../../primitives/pipeline/mods/task-item/packages/task-deliverable/styles/task-deliverable.css'
// Task tree (task-stack harness pieces)
import TaskItem from '../../primitives/pipeline/mods/task-item/components/task-item'
import { createAnchorsBucket, setInstanceAnchors } from '../../primitives/pipeline/mods/task-item/utils/instance'
import { taskTreeTransforms } from '../../primitives/pipeline/mods/task-stack/mods/task-tree'
import Research from '../../../ada-demo-again/one-ada-proj/research'
import VibePanel from '../../../ada-demo-again/one-ada-proj/vibe-panel'

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

const CanvasSpace = React.forwardRef(function CanvasSpace(
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
  }: CanvasSpaceProps,
  ref: React.Ref<CanvasSpaceHandle>,
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
  const paneContainerRef = useRef<HTMLDivElement | null>(null)
  const visionRef = useRef<HTMLDivElement | null>(null)
  const suppressVibeOpenRef = useRef<number>(0)
  const bgVideoRef = useRef<HTMLVideoElement | null>(null)
  const [curBg, setCurBg] = useState<string>(bgSrc)
  const [dir, setDir] = useState<'forward' | 'backward'>('forward')
  const reverseRAF = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  // Task tree overlay state (sourced from task-stack harness but embedded inline)
  const [treeOpen, setTreeOpen] = useState(false)
  const [treeForIndex, setTreeForIndex] = useState<number | null>(null)
  const activeBlockElRef = useRef<HTMLElement | null>(null)
  const [itemH, setItemH] = useState<number>(240)
  const [lockedT0, setLockedT0] = useState<{ tx: number; ty: number; scale: number } | null>(null)
  const [_anchorsVersion, setAnchorsVersion] = useState(0)
  const anchorsRef = useRef(createAnchorsBucket(4))
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [treeAnchor, setTreeAnchor] = useState<{ x: number; y: number } | null>(null) // stage-local coords
  // Sequential mode: show only current + next (faded)
  const [seqIndex, setSeqIndex] = useState(0)
  const [showResearch, setShowResearch] = useState(false)
  const [vibeRect, setVibeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [vibeVisible, setVibeVisible] = useState(false)
  const [instancePaneOpen, setInstancePaneOpen] = useState(false)
  const [panePage, setPanePage] = useState(0)
  const [chipOk, setChipOk] = useState(true)
  const paneSwipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const paneSwipeDidSwipeRef = useRef(false)
  const paneContentRef = useRef<HTMLDivElement | null>(null)
  const [paneContentW, setPaneContentW] = useState(0)
  const [paneDragging, setPaneDragging] = useState(false)
  const [paneDragDX, setPaneDragDX] = useState(0)
  const [spawnSelectorVisible, setSpawnSelectorVisible] = useState(false)
  const [firstBadge, setFirstBadge] = useState<'1' | '2'>('1')
  const [logoTaskMounted, setLogoTaskMounted] = useState(false)
  const [logoTaskShown, setLogoTaskShown] = useState(false)
  const [typoTaskMounted, setTypoTaskMounted] = useState(false)
  const [typoTaskShown, setTypoTaskShown] = useState(false)
  const [logoTipMounted, setLogoTipMounted] = useState(false)
  const [logoTipShown, setLogoTipShown] = useState(false)
  const [logoTipEverShown, setLogoTipEverShown] = useState(false)
  const [logoTaskPos, setLogoTaskPos] = useState<{ x: number; y: number } | null>(null)
  const [secondPaneDone, setSecondPaneDone] = useState(false)
  const [secondPaneCollapsing, setSecondPaneCollapsing] = useState(false)
  const [spawnCircle, setSpawnCircle] = useState<{ x: number; y: number; entering: boolean } | null>(null)
  const spawnRef = useRef<HTMLDivElement | null>(null)
  const spawnBaseRef = useRef<{ yStage: number } | null>(null)
  // Vision power state controls Pipeline visibility
  const [pipelinePoweredOn, setPipelinePoweredOn] = useState(true)
  const [pipeProgress, setPipeProgress] = useState<Record<string, number>>({})
  const [worldPos, setWorldPos] = useState<{ pipeline?: { x: number; y: number }; vision?: { x: number; y: number } }>({})
  const onViewChange = useCallback((v: any) => {
    setView({ pan: v.pan, scale: v.scale })
    setVision((prev) => updateScale(prev, v.scale))
    try {
      const vpEl = v.viewport as HTMLDivElement | null
      if (vpEl) setVpSize({ w: vpEl.clientWidth, h: vpEl.clientHeight })
    } catch {}
  }, [])

  // Measure pane content width for carousel math
  React.useEffect(() => {
    const onResize = () => { const el = paneContentRef.current; if (el) setPaneContentW(el.clientWidth) }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [instancePaneOpen])


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

  // Background video pool (full URLs under /public). Extend this list as needed.
  const BG_VIDEOS: string[] = React.useMemo(() => {
    const list = [
      bgSrc,
      '/magenta-mystic-swell.mp4',
      '/merge-color-blend.mp4',
      '/rainbow-flow.mp4',
      '/aqua-swirl.mp4',
      '/orb-swirl-flow-two.mp4',
    ].filter(Boolean) as string[]
    return Array.from(new Set(list))
  }, [bgSrc])

  // Per-video visual profiles
  const baseName = React.useCallback((p: string) => {
    try { const u = new URL(p, window.location.origin); const path = u.pathname; return path.substring(path.lastIndexOf('/') + 1) } catch { return p.substring(p.lastIndexOf('/') + 1) }
  }, [])
  const videoProfile = React.useMemo((): { filter: string; overlay?: { background: string } } => {
    const n = baseName(curBg)
    if (n === 'rainbow-flow.mp4') return { filter: 'saturate(0.75)' }
    if (n === 'aqua-swirl.mp4') return { filter: 'brightness(0.90) saturate(0.85) hue-rotate(-6deg)', overlay: { background: 'rgba(200,0,200,0.08)' } }
    return { filter: 'none' }
  }, [curBg, baseName])

  React.useEffect(() => {
    const v = bgVideoRef.current
    if (!v) return
    try {
      v.pause()
      v.currentTime = 0
      const onCanPlay = () => {
        try { const pr = v.play(); if ((pr as any)?.catch) (pr as any).catch(() => {}) } catch {}
        v.removeEventListener('canplay', onCanPlay)
      }
      v.addEventListener('canplay', onCanPlay)
      v.load()
    } catch {}
  }, [curBg])

  // Forward/backward ping-pong loop
  React.useEffect(() => {
    const v = bgVideoRef.current
    if (!v) return
    if (reverseRAF.current) { cancelAnimationFrame(reverseRAF.current); reverseRAF.current = null }
    lastTsRef.current = null
    if (dir === 'forward') {
      try { v.playbackRate = 1 } catch {}
      try { const pr = v.play(); if ((pr as any)?.catch) (pr as any).catch(() => {}) } catch {}
    } else {
      try { v.pause() } catch {}
      const tick = (ts: number) => {
        const last = lastTsRef.current ?? ts
        const dt = (ts - last) / 1000
        lastTsRef.current = ts
        try { v.currentTime = Math.max(0, v.currentTime - dt) } catch {}
        if (!isFinite(v.duration) || v.duration <= 0) { reverseRAF.current = requestAnimationFrame(tick); return }
        if (v.currentTime <= 0.001) {
          setDir('forward')
          return
        }
        reverseRAF.current = requestAnimationFrame(tick)
      }
      reverseRAF.current = requestAnimationFrame(tick)
    }
    return () => { if (reverseRAF.current) cancelAnimationFrame(reverseRAF.current); reverseRAF.current = null; lastTsRef.current = null }
  }, [dir])

  // Measure TaskItem height for spacing
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h && Math.abs(h - itemH) > 1) setItemH(h)
  }, [treeOpen, _anchorsVersion, itemH])

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

  // (moved below after derived sizing variables)

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


  // Listen for research completion to open selector panes
  React.useEffect(() => {
    const onVibeOpen = (e: any) => {
      // Global suppression right after confirm to avoid flicker or re-open
      if (performance.now() < suppressVibeOpenRef.current) return
      // Only open the spawned selector if the second pane hasn't completed yet and isn't currently collapsing
      if (spawnCircle && !secondPaneDone && !secondPaneCollapsing) {
        setSpawnSelectorVisible(true)
      } else if (!spawnCircle && !secondPaneDone && !secondPaneCollapsing) {
        // Open the first panel only if the flow hasn't completed
        setVibeVisible(true)
      }
    }
    window.addEventListener('ada-vibe-open', onVibeOpen as any)
    return () => window.removeEventListener('ada-vibe-open', onVibeOpen as any)
  }, [spawnCircle, secondPaneDone, secondPaneCollapsing])

  // Advance Branding progress when research panels confirm (1/5 then 2/5)
  React.useEffect(() => {
    const onConfirming = (evt: any) => {
      const pid = evt?.detail?.panelId
      if (pid === 'first') setPipeProgress((p) => ({ ...p, b1: Math.max(p.b1 ?? 0, 20) }))
      if (pid === 'second') setPipeProgress((p) => ({ ...p, b1: Math.max(p.b1 ?? 0, 40) }))
    }
    window.addEventListener('ada-vibe-confirming', onConfirming as any)
    return () => window.removeEventListener('ada-vibe-confirming', onConfirming as any)
  }, [])

  // Advance Branding progress only after the chip automation completes (3/5)
  React.useEffect(() => {
    const onAutomationComplete = (evt: any) => {
      setPipeProgress((p) => ({ ...p, b1: Math.max(p.b1 ?? 0, 60) }))
    }
    window.addEventListener('ada-task-automation-complete', onAutomationComplete as any)
    return () => window.removeEventListener('ada-task-automation-complete', onAutomationComplete as any)
  }, [])

  // When the second pane confirms, pulse and update the first pane's badge to '2'
  React.useEffect(() => {
    const onConfirmed = (e: any) => {
      if (!spawnSelectorVisible) return
      setSecondPaneCollapsing(true)
      suppressVibeOpenRef.current = performance.now() + 4000
      try { window.dispatchEvent(new CustomEvent('ada-badge-pulse', { detail: { target: 'first' } })) } catch {}
      window.setTimeout(() => setFirstBadge('2'), 260)
      // Ensure the overlay opens on the first block so anchored items (like Logo task) use the correct origin
      try {
        const root = pipelineRef.current
        if (root) {
          const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pipeline .task-block'))
          if (blocks[0]) {
            activeBlockElRef.current = blocks[0]
            setTreeForIndex(0)
            setTreeOpen(true)
            anchorsRef.current = createAnchorsBucket(4)
            setAnchorsVersion((v) => v + 1)
          }
        }
      } catch {}
      // Fade out the second pane shortly after shrink completes (and keep it gated from reopening)
      window.setTimeout(() => {
        setSpawnSelectorVisible(false)
        setSecondPaneCollapsing(false)
        setSecondPaneDone(true)
        // Remove the spawned research container entirely so nothing can resurface or block stacking
        setSpawnCircle(null)
      }, 820)
      // After confirm + collapse, reveal the first task item in the overlay
      window.setTimeout(() => {
        setLogoTaskMounted(true)
        requestAnimationFrame(() => setLogoTaskShown(true))
      }, 900)
    }
    window.addEventListener('ada-vibe-confirmed', onConfirmed as any)
    return () => window.removeEventListener('ada-vibe-confirmed', onConfirmed as any)
  }, [spawnSelectorVisible])

  // When the task item becomes visible, gently reveal the tooltip overlay
  React.useEffect(() => {
    if (!logoTaskShown) return
    setLogoTipMounted(true)
    const TASK_ANIM_MS = 380
    const EXTRA_DELAY_MS = 2000
    const t = window.setTimeout(
      () => requestAnimationFrame(() => setLogoTipShown(true)),
      TASK_ANIM_MS + EXTRA_DELAY_MS,
    )
    return () => window.clearTimeout(t)
  }, [logoTaskShown])

  // Once the tooltip has shown once, keep transform at 0 on hide so it fades out only (no fly-out)
  React.useEffect(() => {
    if (logoTipShown && !logoTipEverShown) setLogoTipEverShown(true)
  }, [logoTipShown, logoTipEverShown])

  // Listen for first chip sealing to spawn the next task item
  React.useEffect(() => {
    const onSealed = () => {
      if (typoTaskMounted) return
      setTimeout(() => {
        setTypoTaskMounted(true)
        requestAnimationFrame(() => setTypoTaskShown(true))
      }, 220)
    }
    window.addEventListener('ada-task-chip-sealed', onSealed as any)
    return () => window.removeEventListener('ada-task-chip-sealed', onSealed as any)
  }, [typoTaskMounted])

  // Spawn a new Research circle at the reported screen center; animate fly-down + fade
  React.useEffect(() => {
    const onSpawn = (e: any) => {
      try {
        const center = e?.detail?.center as { x: number; y: number } | undefined
        const stage = stageRef.current
        if (!center || !stage) return
        const cr = paneContainerRef.current?.getBoundingClientRect()
        if (!cr) return
        const x = Math.round(center.x - cr.left)
        // Place new research circle 20px above the collapsed 44px circle (unscaled)
        const COLLAPSED_DIAM = 44
        const NEW_DIAM = 150
        const GAP = 20
        const yStage = Math.round(center.y - cr.top)
        const actualOffsetY = (COLLAPSED_DIAM / 2) + GAP + (NEW_DIAM / 2)
        const y = Math.round(yStage - actualOffsetY)
        setSpawnCircle({ x, y, entering: false })
        // tick to start transition
        setTimeout(() => setSpawnCircle((s) => (s ? { ...s, entering: true } : s)), 20)
      } catch {}
    }
    window.addEventListener('ada-research-spawn', onSpawn as any)
    return () => window.removeEventListener('ada-research-spawn', onSpawn as any)
  }, [])

  // Hide vibe panel when tree closes or pivots away
  React.useEffect(() => {
    if (!treeOpen || treeForIndex !== 0) setVibeVisible(false)
  }, [treeOpen, treeForIndex])

  useImperativeHandle(ref, () => ({
    setScale: (next: number) => sandRef.current?.setScaleAnchored(next),
    getView: () => ({ ...view }),
  }), [view])

  // Derived sizes and center in local coordinates
  // Right-side pane constants (keep visuals in sync)
  const SIDE_PANE_RESERVED = 350 // total gap reserved at right when open
  const SIDE_PANE_WIDTH = 300    // actual glass pane width (must be <= reserved)
  const SLOT_CENTER_BIAS_X = 19  // manual right bias inside the slot (px)
  const SIDE_PANE_V_INSET = 40   // match canvas frame gap (top & bottom)
  const CANVAS_FRAME_GAP = 40    // visible BG gap around canvas when pane is open
  const PUBLIC_BASE = ((import.meta as any)?.env?.BASE_URL) || '/'
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
  // For overlay, fill the full viewport (width and height) regardless of side padding/ratio
  const overlayLocalW = Math.max(1, Math.round(((vpSize.w || 0)) / s))
  const overlayLocalH = Math.max(1, Math.round(((vpSize.h || 0)) / s))
  const compPaneWLocal = panePlacement === 'overlay' ? overlayLocalW : paneWLocal
  const compPaneHLocal = panePlacement === 'overlay' ? overlayLocalH : Math.round(compPaneWLocal * aspect)
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
  // UX decoupling flag: when true, never render task-item tree in the overlay
  const TASK_TREE_DECOUPLED = true

  // Freeze the overlay transform once the second pane begins collapsing to avoid any drift
  React.useEffect(() => {
    if ((secondPaneCollapsing || secondPaneDone) && treeOpen && treeForIndex === 0 && !lockedT0) {
      const T = taskTreeTransforms({ count: 4, itemHeight: itemH, nodeScale: 1.0, firstGapPx: 50, stackGapPx: 50 })
      if (T.length) setLockedT0({ tx: T[0].tx, ty: T[0].ty, scale: T[0].scale })
    }
  }, [secondPaneCollapsing, secondPaneDone, treeOpen, treeForIndex, itemH, lockedT0])

  // Compute logo task position aligned to the first panel's black badge circle (after derived sizing is available)
  React.useEffect(() => {
    if (!logoTaskMounted || !treeOpen || treeForIndex !== 0 || !treeAnchor) return
    try {
      const stage = stageRef.current
      const pane = paneContainerRef.current
      const badge = pane?.querySelector('[data-panel-id="first"]') as HTMLElement | null
      if (!stage || !pane || !badge) return
      const sr = stage.getBoundingClientRect()
      const br = badge.getBoundingClientRect()
      const sNow = Math.max(0.0001, view.scale)
      // Convert badge center to stage-local, then to pane-local
      const cxStage = (br.left + br.width / 2 - sr.left) / sNow - paneLeftLocal
      const cyStage = (br.top + br.height / 2 - sr.top) / sNow - paneTopLocal
      // Translate to tree overlay local (origin at treeAnchor)
      const X = Math.round(cxStage - treeAnchor.x)
      // Place task slightly below the badge circle center for visual spacing
      const LOGO_Y_OFFSET = -120
      const Y = Math.round(cyStage - treeAnchor.y + LOGO_Y_OFFSET)
      setLogoTaskPos({ x: X, y: Y })
    } catch {}
  }, [logoTaskMounted, treeOpen, treeForIndex, treeAnchor, view.scale, paneLeftLocal, paneTopLocal])

  // Keep the task-tree overlay anchored to its selected block during pan/zoom
  useLayoutEffect(() => {
    if (!treeOpen) return
    const stage = stageRef.current
    const blk = activeBlockElRef.current
    if (!stage || !blk) return
    try {
      const sr = stage.getBoundingClientRect()
      const br = blk.getBoundingClientRect()
      const ax = (br.left + br.width / 2 - sr.left) / s - paneLeftLocal
      const ay = (br.top - sr.top) / s - paneTopLocal
      setTreeAnchor({ x: Math.round(ax), y: Math.round(ay) })
    } catch {}
  }, [treeOpen, view.scale, view.pan.x, view.pan.y, paneLeftLocal, paneTopLocal])

  // Reset sequence on tree open/pivot and show research prelude on first block
  useLayoutEffect(() => {
    if (!treeOpen) {
      setShowResearch(false)
      return
    }
    setSeqIndex(0)
    setShowResearch(treeForIndex === 0)
  }, [treeOpen, treeForIndex])

  return (
    <div className={`vision-harness${className ? ' ' + className : ''}`}>
      {/* Top-right toggle for Instance Picker (decoupled from TaskItem) */}
      <button
        type="button"
        onClick={() => { const n = !instancePaneOpen; setInstancePaneOpen(n); try { window.dispatchEvent(new CustomEvent('ada-instance-pane-toggled', { detail: { open: n } })) } catch {} }}
        style={{ position: 'fixed', top: 16, right: 16, width: 28, height: 28, borderRadius: 14, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(18px) saturate(1)', WebkitBackdropFilter: 'blur(18px) saturate(1)', color: '#FFFFFF', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 6 }}
        aria-label="Open instance picker"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/></svg>
      </button>
      {/* Animated background */}
      <video
        ref={bgVideoRef as any}
        className="vision-harness__bg"
        src={curBg}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onEnded={() => setDir('backward')}
        style={{ filter: videoProfile.filter, WebkitFilter: videoProfile.filter }}
      />

      {videoProfile.overlay && (
        <div
          aria-label="Video color overlay"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, ...videoProfile.overlay, mixBlendMode: 'multiply' as any }}
        />
      )}

      {/* Eden wordmark at top-left; offset 20px from canvas clip edges */}
      <div aria-label="Eden wordmark" style={{ position: 'fixed', top: (instancePaneOpen ? CANVAS_FRAME_GAP : 0) + 15, left: (instancePaneOpen ? CANVAS_FRAME_GAP : 0) + 40, zIndex: 3, pointerEvents: 'none' }}>
        <div style={{
          fontFamily: '"Qwitcher Grypen", cursive',
          fontWeight: 400,
          fontStyle: 'normal',
          fontSize: 100,
          lineHeight: 1,
          color: '#ffffff',
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}>eden</div>
      </div>

      {/* Pan/zoom sandbox viewport */}
      {panePlacement === 'overlay' ? (
        <div
          ref={paneClipRef}
          style={{
            position: 'fixed',
            top: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            left: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            bottom: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            right: instancePaneOpen ? (SIDE_PANE_RESERVED + CANVAS_FRAME_GAP) : 0,
            overflow: 'hidden',
            borderRadius: 0,
            zIndex: 2,
            pointerEvents: 'auto',
            transition: 'top 220ms ease, left 220ms ease, bottom 220ms ease, right 220ms ease',
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
              <div ref={paneContainerRef} style={{ position: 'absolute', left: paneLeftLocal, top: paneTopLocal, width: compPaneWLocal, height: compPaneHLocal }}>
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
                      { id: 'b1', descriptor: 'Branding' },
                      { id: 'b2', descriptor: 'Design' },
                      { id: 'b3', descriptor: 'Production' },
                      { id: 'b4', descriptor: 'Marketing' },
                      { id: 'b5', descriptor: 'Distribution' },
                    ]}
                    spacing="roomy"
                    progressById={pipeProgress}
                  />
                </div>
                {/* right-gap slot will be rendered via portal below */}
                {/* Task tree overlay anchored above selected block (stage-local coordinates) */}
                {treeOpen && treeAnchor && (
                  <div
                    key={`tree-${treeForIndex}-${_anchorsVersion}`}
                    style={{
                      position: 'absolute',
                      left: treeAnchor.x,
                      top: treeAnchor.y,
                      zIndex: 5,
                      pointerEvents: 'auto',
                      transform: 'translateZ(0)',
                      willChange: 'transform',
                      backfaceVisibility: 'hidden',
                      overflow: 'visible',
                    }}
                  >
                    <div style={{ position: 'relative', width: 0, height: 0, overflow: 'visible' }}>
                      {(() => {
                        const T = taskTreeTransforms({ count: 4, itemHeight: itemH, nodeScale: 1.0, firstGapPx: 50, stackGapPx: 50 })
                        if (!T.length) return null
                        return (
                          <>
                            {treeForIndex === 0 && showResearch && (() => {
                              const t0 = T[0]
                              const base = lockedT0 || t0
                              const circleSize = 150
                              const radius = circleSize / 2
                              const OFFSET_Y = -(40 + radius) // keep bottom of big circle 40px above block top
                              const OFFSET_X = 0
                              const BADGE_RADIUS = 22
                              const BADGE_GAP = 8
                              const BADGE_OFFSET_Y = - (BADGE_GAP + BADGE_RADIUS) // keep bottom of 44px badge ~8px above block top
                              const BADGE_Y_NUDGE = -4 // manual correction to counter tiny post-confirm drift
                              return (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                transform: `translate3d(-50%, -50%, 0) translate3d(${base.tx + OFFSET_X}px, ${OFFSET_Y}px, 0) scale(${base.scale})`,
                                transformOrigin: 'center center',
                                zIndex: 3,
                                opacity: 1,
                              }}
                            >
                              {!(secondPaneCollapsing || secondPaneDone) && (
                                <Research title="Research" description="Style & Creative Direction" width={150} />
                              )}
                              <VibePanel
                                anchorRect={null as any}
                                visible={vibeVisible && !secondPaneDone && !secondPaneCollapsing}
                                usePortal={false}
                                anchorCircleSize={circleSize}
                                panelId="first"
                                badgeText={firstBadge}
                              />
                              {(secondPaneCollapsing || secondPaneDone) && (
                                <div
                                  aria-label="research-progress-badge"
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${(BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE}px, 0) scale(${base.scale})`,
                                    transformOrigin: 'center center',
                                    width: 44,
                                    height: 44,
                                    borderRadius: 9999,
                                    background: 'rgba(0,0,0,0.92)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    lineHeight: 1,
                                    zIndex: 4,
                                    pointerEvents: 'none',
                                  }}
                                >
                                  <span>{firstBadge}</span>
                                </div>
                              )}
                              {logoTaskMounted && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    // Align horizontally with center, place above the badge by 16px gap
                                    transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (132 / 2))}px, 0) scale(${base.scale}) translateY(${logoTaskShown ? 0 : -64}px)`,
                                    transformOrigin: 'center center',
                                    opacity: logoTaskShown ? 1 : 0,
                                    transition: 'transform 380ms ease, opacity 380ms ease',
                                    zIndex: 5,
                                  }}
                                >
                                  <TaskItem
                                    text="Logo Generation"
                                    gap={64}
                                    tooltipVariant="circle"
                                    mode="chain"
                                    variant="unified"
                                    progressPercent={0}
                                    chipOnly
                                    enableSwipeInfo
                                    labelVisibility="auto"
                                    infoTitle="Logo Generation"
                                    infoText="Let's generate the logo for your brand."
                                  />
                                </div>
                              )}

                              {typoTaskMounted && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    // Same anchored placement as first chip, reuse fly-in
                                    transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (132 / 2))}px, 0) scale(${base.scale}) translateY(${typoTaskShown ? 0 : -64}px)`,
                                    transformOrigin: 'center center',
                                    opacity: typoTaskShown ? 1 : 0,
                                    transition: 'transform 380ms ease, opacity 380ms ease',
                                    zIndex: 5,
                                  }}
                                >
                                  <TaskItem
                                    text="Typography & Color"
                                    gap={64}
                                    tooltipVariant="circle"
                                    mode="chain"
                                    variant="unified"
                                    progressPercent={0}
                                    chipOnly
                                    morphOnOutsource
                                    enableSwipeInfo
                                    labelVisibility="auto"
                                    infoTitle="Typography & Color"
                                    infoText="Set type styles and color palette for your brand."
                                  />
                                </div>
                              )}

                              {/* Right-side action UI removed; actions now live inside the chip via swipe */}

                              {/* Tooltip overlay explaining the TaskItem */}
                              {logoTipMounted && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (itemH / 2))}px, 0) scale(${base.scale}) translateY(${(!logoTipEverShown && !logoTipShown) ? -64 : 0}px)`,
                                    transformOrigin: 'center center',
                                    opacity: logoTipShown ? 1 : 0,
                                    transition: 'transform 380ms ease, opacity 380ms ease',
                                    zIndex: 7,
                                    pointerEvents: logoTipShown ? 'auto' : 'none',
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '10px 14px',
                                      borderRadius: 30,
                                      background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
                                      color: '#fff',
                                      border: '1px solid rgba(255,255,255,0.14)',
                                      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                                      WebkitBackdropFilter: 'blur(6px)',
                                      backdropFilter: 'blur(6px)',
                                      width: 185,
                                      height: 240,
                                      display: 'grid',
                                      placeItems: 'center',
                                      placeContent: 'center',
                                      position: 'relative',
                                      textAlign: 'center' as const,
                                    }}
                                  >
                                    <button
                                      aria-label="Close"
                                      onClick={(e) => { e.stopPropagation(); setLogoTipShown(false); window.setTimeout(() => setLogoTipMounted(false), 420) }}
                                      style={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 10,
                                        width: 24,
                                        height: 24,
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'grid',
                                        placeItems: 'center',
                                        cursor: 'pointer',
                                        lineHeight: 0,
                                      }}
                                    >
                                      <svg
                                        width={16}
                                        height={16}
                                        viewBox="0 0 24 24"
                                        aria-hidden
                                        focusable="false"
                                        style={{ display: 'block' }}
                                      >
                                        <path d="M6 6l12 12M6 18L18 6" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                    <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.3, marginBottom: 5 }}>Task Items</div>
                                    <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.25, color: 'rgba(255,255,255,0.92)' }}>
                                      A Task Item is the pearl in your pipeline—an asset your project needs, crafted by Ada to a shine. Choose how it’s made: Ada automates, freelancers build, or your team insources.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {!TASK_TREE_DECOUPLED && T.length > 0 && (() => {
                          const items = ['Define sub-goal', 'Research options', 'Design component', 'Draft deliverable']
                          const showIdxs = [seqIndex, Math.min(seqIndex + 1, T.length - 1)]
                          return (
                            <>
                              {showIdxs.map((ii, k) => {
                                const t = T[ii]
                                const isActive = k === 0
                                return (
                                <div
                                  key={`ti-${ii}`}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: `translate3d(-50%, -50%, 0) translate3d(${t.tx}px, ${t.ty}px, 0) scale(${t.scale})`,
                                    transformOrigin: 'center center',
                                    zIndex: isActive ? 2 : 1,
                                    opacity: isActive ? 1 : 0.35,
                                    transition: 'opacity 180ms ease',
                                  }}
                                  onClick={isActive ? () => setSeqIndex((v) => Math.min(v + 1, T.length - 1)) : undefined}
                                >
                                  <TaskItem
                                    text={items[ii]}
                                    gap={64}
                                    tooltipVariant="circle"
                                    mode="chain"
                                    variant="unified"
                                    progressPercent={0}
                                    exposeAnchors={(a) => {
                                      setInstanceAnchors(anchorsRef.current as any, ii, a as any)
                                      setAnchorsVersion((v) => v + 1)
                                    }}
                                  />
                                </div>
                              )
                            })}
                            </>
                          )
                        })()}
                        {/* Hidden measurer */}
                        <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
                          <TaskItem text="Measure" gap={64} variant="unified" />
                        </div>
                      </>
                    )
                  })()}
                    </div>
                  </div>
                )}
                {/* Spawned Research circle (after vibe collapse) */}
                {spawnCircle && (
                  <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 6, pointerEvents: (spawnSelectorVisible || secondPaneCollapsing) ? 'auto' : 'none' }}>
                    <div ref={spawnRef}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate3d(-50%, -50%, 0) translate3d(${spawnCircle.x}px, ${spawnCircle.y}px, 0) translateY(${spawnCircle.entering ? 0 : -64}px)`,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        opacity: spawnCircle.entering ? 1 : 0,
                      }}
                    >
                      {!(secondPaneCollapsing || secondPaneDone) && (
                        <Research
                          title="Research"
                          description="Name Check"
                          width={150}
                          stages={[
                            'Scouting trends and finding names',
                            'Checking domains and social handles',
                            'Flagging conflicts and risk levels',
                            'Preparing your shortlist',
                          ]}
                        />
                      )}
                      {/* Inline selector pane for second instance (same format) */}
                      {(spawnSelectorVisible || secondPaneCollapsing) && (
                        <VibePanel
                          anchorRect={null as any}
                          visible={(spawnSelectorVisible || secondPaneCollapsing) && !secondPaneDone}
                          usePortal={false}
                          anchorCircleSize={150}
                          panelId="second"
                          spawnOnConfirm={false}
                          collapseToCircle={true}
                          collapseGhost={true}
                          collapseOffsetY={10}
                          chipItems={[
                            'Brushline',
                            'Studio Loom',
                            'Pigment & Thread',
                            'Best Fit',
                          ]}
                          chipPrefix="Name"
                        />
                      )}
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
                  {/* Stage-level bitmap div removed; canvas handles the spine now. */}
                  {/* Stage-level spine removed; using overlay-local rods to avoid cross-space re-sampling. */}
                  
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
                  {/* Spine removed per request. Node-based connectors only. */}
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
                        { id: 'b1', descriptor: 'Branding' },
                        { id: 'b2', descriptor: 'Design' },
                        { id: 'b3', descriptor: 'Production' },
                        { id: 'b4', descriptor: 'Marketing' },
                        { id: 'b5', descriptor: 'Distribution' },
                      ]}
                      spacing="roomy"
                      progressById={pipeProgress}
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
            position: 'fixed',
            top: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            left: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            bottom: instancePaneOpen ? CANVAS_FRAME_GAP : 0,
            right: instancePaneOpen ? (SIDE_PANE_RESERVED + CANVAS_FRAME_GAP) : 0,
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.42)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
            boxShadow: '0 14px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            backdropFilter: 'blur(48px)',
            WebkitBackdropFilter: 'blur(48px)',
            display: 'block',
            color: 'rgba(255,255,255,0.9)',
            font: '600 18px/1.2 ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial',
            letterSpacing: 0.2,
            pointerEvents: 'none',
            zIndex: 1,
            transition: 'top 220ms ease, left 220ms ease, bottom 220ms ease, right 220ms ease',
          }}
          aria-label="Canvas central pane"
        >
        </div>
      )}

      {/* Portal: render the right-gap slot moved into TaskPane */}
      <TaskPane open={instancePaneOpen} CANVAS_FRAME_GAP={CANVAS_FRAME_GAP} SIDE_PANE_RESERVED={SIDE_PANE_RESERVED} SIDE_PANE_WIDTH={SIDE_PANE_WIDTH} SIDE_PANE_V_INSET={SIDE_PANE_V_INSET} SLOT_CENTER_BIAS_X={SLOT_CENTER_BIAS_X} />
      {false && createPortal(
        <div aria-label="right-gap-slot" style={{ position: 'fixed', top: 0, right: CANVAS_FRAME_GAP, width: SIDE_PANE_RESERVED, height: '100vh', pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
          <div aria-label="right-gap-pane" style={{ position: 'absolute', top: SIDE_PANE_V_INSET, left: '50%', width: SIDE_PANE_WIDTH, height: `calc(100vh - ${SIDE_PANE_V_INSET * 2}px)`, transform: instancePaneOpen ? `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X}px))` : `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X + SIDE_PANE_RESERVED}px))`, pointerEvents: instancePaneOpen ? 'auto' : 'none', transition: 'transform 260ms ease', willChange: 'transform' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,0.42)', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(1.1)', WebkitBackdropFilter: 'blur(28px) saturate(1.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
            <div
              style={{ position: 'absolute', inset: 0, padding: '16px 14px 18px 14px', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 8, touchAction: 'none' as any }}
              onPointerDownCapture={(e) => {
                paneSwipeStartRef.current = { x: e.clientX, y: e.clientY }
                paneSwipeDidSwipeRef.current = false
                setPaneDragging(false)
                setPaneDragDX(0)
                try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
              }}
              onPointerMoveCapture={(e) => {
                const s = paneSwipeStartRef.current
                if (!s) return
                const dx = e.clientX - s.x
                const dy = e.clientY - s.y
                const horiz = Math.abs(dx) > 8 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 2
                if (!paneDragging && horiz) setPaneDragging(true)
                if (paneDragging || horiz) {
                  let adj = dx
                  // edge friction when pulling past ends
                  if ((panePage === 0 && dx > 0) || (panePage === 1 && dx < 0)) adj = dx * 0.35
                  const W = paneContentW || (e.currentTarget as HTMLElement).clientWidth
                  const lim = Math.max(120, Math.min(800, W))
                  if (adj >  lim) adj =  lim
                  if (adj < -lim) adj = -lim
                  setPaneDragDX(adj)
                  paneSwipeDidSwipeRef.current = true
                  e.preventDefault()
                }
              }}
              onPointerUpCapture={(e) => {
                const s = paneSwipeStartRef.current
                try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId) } catch {}
                paneSwipeStartRef.current = null
                const didDrag = paneDragging
                const dx = didDrag && s ? (e.clientX - s.x) : 0
                const W = paneContentW || (e.currentTarget as HTMLElement).clientWidth
                const TH = Math.max(50, Math.min(240, Math.round(W * 0.22)))
                if (didDrag) {
                  if (dx <= -TH && panePage < 1) setPanePage(1)
                  else if (dx >= TH && panePage > 0) setPanePage(0)
                  // snap back animation
                  setPaneDragging(false)
                  setPaneDragDX(0)
                  window.setTimeout(() => { paneSwipeDidSwipeRef.current = false }, 220)
                } else if (s) {
                  // tap without drag
                  paneSwipeDidSwipeRef.current = false
                }
              }}
              onPointerCancelCapture={() => { paneSwipeStartRef.current = null; setPaneDragging(false); setPaneDragDX(0); paneSwipeDidSwipeRef.current = false }}
              onClickCapture={(e) => { if (paneSwipeDidSwipeRef.current || paneDragging) { e.preventDefault(); e.stopPropagation(); paneSwipeDidSwipeRef.current = false } }}
            >
              <div style={{ position: 'relative', height: 0 }} />
              <div ref={paneContentRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'row', alignItems: 'stretch',
                    width: '200%',
                    transform: `translate3d(${(-panePage * (paneContentW || 0)) + (paneDragging ? paneDragDX : 0)}px,0,0)`,
                    transition: paneDragging ? 'none' : 'transform 280ms ease',
                    willChange: 'transform'
                  }}
                >
                  {/* Slide 1: Instances */}
                  <div style={{ flex: '0 0 50%', width: '50%', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      <div style={{ opacity: 0.85 }}>Instances — Page 1</div>
                    </div>
                  </div>
                  {/* Slide 2: Payment */}
                  <div style={{ flex: '0 0 50%', width: '50%', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 0 }}>
                      {/* Shadow wrapper holds outer drop-shadow so inner card can keep overflow:hidden */}
                      <div style={{ width: '90%', maxWidth: 280, height: 160, borderRadius: 22, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.14)) drop-shadow(0 16px 40px rgba(0,0,0,0.18))', willChange: 'filter' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: 22, position: 'relative',
                          // TaskItem-style glass fill + rim
                          border: '1px solid rgba(255,255,255,0.42)',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10)',
                          backdropFilter: 'blur(28px) saturate(1.05)', WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
                          overflow: 'hidden', contain: 'paint', transform: 'translateZ(0)', backfaceVisibility: 'hidden', isolation: 'isolate'
                        }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'radial-gradient(140px 120px at 20% 10%, rgba(255,255,255,0.08), transparent 60%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: 12, right: 12, width: 42, height: 32, opacity: 1 }}>
                          <svg width="42" height="32" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.18))' }}>
                            <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37259 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V19.8222C42 26.4496 36.6274 31.8222 30 31.8222H12C5.37258 31.8222 0 26.4496 0 19.8222V12ZM2.05447 10.9389C2.57926 5.90956 6.83177 1.98889 12 1.98889H20V12.9278H22V1.98889H30C35.1682 1.98889 39.4207 5.90956 39.9455 10.9389H32.01L28.9966 6.96224L27.3993 8.15919L31 12.9109V12.9278H40V18.8944H31V18.9091L27.3993 23.6608L28.9966 24.8577L32.0082 20.8833H39.9455C39.4207 25.9127 35.1682 29.8333 30 29.8333H22V18.8944H20V29.8333H12C6.83177 29.8333 2.57925 25.9127 2.05447 20.8833H9.99857L13.0102 24.8577L14.6075 23.6608L11 18.9001V18.8944H2V12.9278H11V12.9199L14.6075 8.15919L13.0102 6.96224L9.99686 10.9389H2.05447Z" fill="#FFFFFF" fill-opacity="0.60"/>
                          </svg>
                        </div>
                        <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.86)', fontWeight: 600, letterSpacing: 2.2, fontSize: 11 }}>EDEN</div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.96)' }} />
                          <div style={{ color: 'rgba(255,255,255,0.96)', fontWeight: 600, fontSize: 44, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums lining-nums' }}>8123</div>
                        </div>
                        <div style={{ position: 'absolute', right: 16, bottom: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 14, letterSpacing: 1 }}>01/22</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', height: 0 }} />
              <div aria-label="pane-dots" style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
                {[0,1].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPanePage(i) }}
                    aria-label={`Go to page ${i+1}`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      border: 'none',
                      padding: 0,
                      background: (panePage === i) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                      boxShadow: (panePage === i) ? '0 0 4px rgba(255,255,255,0.45)' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}

      {/* Overlays */}
      {showGrid && <GridOverlay />}
      {showBadge && <TestBadge label={badgeLabel} />}

      {/* Vibe Panel now rendered inline within the Research overlay */}

      {(!showPane) && (
        <ZoomSlider
          onChange={(delta) => {
            const next = sliderValueToScale(delta, initialScale, minScale, maxScale)
            sandRef.current?.setScaleAnchored(next)
          }}
        />
      )}

      {/* Debug */}
      <div className="vision-harness__debug" style={{ right: 16, left: 'auto', top: 56 }}>x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>

    </div>
  )
})

export default CanvasSpace
