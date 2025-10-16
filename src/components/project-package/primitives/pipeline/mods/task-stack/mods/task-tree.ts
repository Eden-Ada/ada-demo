// Task Tree + Reveal utilities (source of truth).
// This file supersedes the previous 'stack-reveal.ts'.
// A backward-compat shim in 'stack-reveal.ts' re-exports from here.

import { computeRotations } from '../utils/stack-logic'

export type RevealState = 'closed' | 'preview' | 'expanded'

export type RevealConfig = {
  // geometry and motion
  liftPx?: number
  spacingPx?: number
  fanSidePx?: number
  fanStepDeg?: number
  startSide?: 1 | -1

  // rotation seeding
  baseMaxAbs?: number
  baseMinAbs?: number

  // timing / easing
  easing?: (t: number) => number

  // z-order
  topOnLast?: boolean

  // opacity ramp
  opacityMin?: number
  opacityMax?: number
}

export type RevealTransform = {
  tx: number
  ty: number
  rot: number
  opacity: number
  z: number
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 1, 3) / 2)

// Pure transform generator for stack reveal
export function computeRevealTransforms(
  items: { id: string }[],
  progress: number,
  cfg: RevealConfig = {},
): RevealTransform[] {
  const p = clamp01(progress)
  const ease = cfg.easing ?? easeInOutCubic
  const q = ease(p)

  const {
    liftPx = 120,
    spacingPx = 24,
    fanSidePx = 3,
    fanStepDeg = 2,
    startSide = 1,
    baseMaxAbs = 4,
    baseMinAbs = 1.5,
    topOnLast = true,
    opacityMin = 0.85,
    opacityMax = 1.0,
  } = cfg

  // Seed rotations (alternating sign) so the reveal inherits the same character
  const baseRot = computeRotations(items, {
    maxAbs: baseMaxAbs,
    minAbs: baseMinAbs,
    alternateSign: true,
    uniqueTolerance: 0.25,
  })

  const transforms: RevealTransform[] = []
  const n = items.length
  for (let i = 0; i < n; i++) {
    const sign = (i % 2 === 0 ? 1 : -1) * startSide

    // Per-item placement across the reveal timeline
    const ty = -q * (liftPx + i * spacingPx)
    const tx = q * (fanSidePx * i) * sign
    const rot = baseRot[i] + q * (fanStepDeg * i) * sign

    const z = topOnLast ? i + 1 : n - i
    const opacity = opacityMin + (opacityMax - opacityMin) * q

    transforms.push({ tx, ty, rot, opacity, z })
  }

  return transforms
}

// Imperative reveal controller
export type StackRevealController = {
  getState(): RevealState
  open(): void
  close(): void
  setProgress(p: number): void
  getProgress(): number
  getTransforms(items: { id: string }[], cfg?: RevealConfig): RevealTransform[]
  onProgress(cb: (p: number) => void): () => void
  onState(cb: (s: RevealState) => void): () => void
}

export function createStackRevealController(initial: RevealState = 'closed'): StackRevealController {
  let state: RevealState = initial
  let progress = 0
  const progressSubs = new Set<(p: number) => void>()
  const stateSubs = new Set<(s: RevealState) => void>()

  const notifyProgress = () => progressSubs.forEach((fn) => fn(progress))
  const notifyState = () => stateSubs.forEach((fn) => fn(state))

  function setProgress(p: number) {
    const clamped = clamp01(p)
    if (progress !== clamped) {
      progress = clamped
      notifyProgress()
      // update state edges
      if (progress === 0 && state !== 'closed') { state = 'closed'; notifyState() }
      else if (progress > 0 && progress < 1 && state !== 'preview') { state = 'preview'; notifyState() }
      else if (progress === 1 && state !== 'expanded') { state = 'expanded'; notifyState() }
    }
  }

  return {
    getState: () => state,
    open: () => setProgress(1),
    close: () => setProgress(0),
    setProgress,
    getProgress: () => progress,
    getTransforms: (items, cfg) => computeRevealTransforms(items, progress, cfg),
    onProgress: (cb) => { progressSubs.add(cb); return () => progressSubs.delete(cb) },
    onState: (cb) => { stateSubs.add(cb); return () => stateSubs.delete(cb) },
  }
}

// --- Task Tree Utilities (harness-grade) ---
export type TaskTreeLayoutConfig = {
  count: number
  itemHeight: number
  nodeScale?: number
  firstGapPx?: number
  stackGapPx?: number
}

export type TaskTreeTransform = { tx: number; ty: number; scale: number }

// Deterministic vertical stack placement used by the harness
export function taskTreeTransforms(cfg: TaskTreeLayoutConfig): TaskTreeTransform[] {
  const count = Math.max(0, Math.floor(cfg.count))
  const s = cfg.nodeScale ?? 1
  const firstGap = cfg.firstGapPx ?? 160
  const gap = cfg.stackGapPx ?? 80
  const h = Math.round(cfg.itemHeight * s)
  const y0 = -(firstGap + h / 2)
  const out: TaskTreeTransform[] = []
  for (let i = 0; i < count; i++) out.push({ tx: 0, ty: y0 - i * (h + gap), scale: s })
  return out
}

export type TaskTreeStyle = { width: number; dash: string; period: string }

export function taskTreeStyleForScale(scale: number): TaskTreeStyle {
  const s = Math.max(0.0001, scale)
  const BASE_W = 2.5, BASE_D0 = 3, BASE_D1 = 9
  const width = Math.max(1, +(BASE_W * s).toFixed(3))
  const dash = `${+(BASE_D0 * s).toFixed(3)} ${+(BASE_D1 * s).toFixed(3)}`
  const period = `${(BASE_D0 + BASE_D1) * s}px`
  return { width, dash, period }
}

export function taskTreeFlowFor(a: HTMLElement | null | undefined, b: HTMLElement | null | undefined): 'forward' | 'reverse' {
  if (!a || !b) return 'reverse'
  try {
    const ar = a.getBoundingClientRect()
    const br = b.getBoundingClientRect()
    return br.top < ar.top ? 'forward' : 'reverse'
  } catch {
    return 'reverse'
  }
}
