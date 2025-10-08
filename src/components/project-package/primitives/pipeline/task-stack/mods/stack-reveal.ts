// Stack Reveal "mod" — domain-local controller and transform generator
// This is NOT a React component or hook. It is a small imperative controller
// plus a pure transform function you can wire from the harness or TaskBlock.

import { computeRotations } from '../utils/stack-logic'

export type RevealState = 'closed' | 'preview' | 'expanded'

export type RevealConfig = {
  // geometry and motion
  liftPx?: number          // vertical lift (applied uniformly)
  spacingPx?: number       // additional per-item vertical spacing
  fanSidePx?: number       // per-item horizontal offset (alternating side)
  fanStepDeg?: number      // per-item additional degrees applied during reveal
  startSide?: 1 | -1       // +1 means first item fans to the right, -1 to the left

  // rotation seeding
  baseMaxAbs?: number
  baseMinAbs?: number

  // timing / easing
  easing?: (t: number) => number

  // z-order
  topOnLast?: boolean      // if true, last item gets the highest z (default true)

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

/**
 * Pure transform generator — no React dependency.
 * Given items (with id), a progress 0..1, and config, it returns per-item transforms.
 */
export function computeRevealTransforms(
  items: { id: string }[],
  progress: number,
  cfg: RevealConfig = {}
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

// Minimal imperative controller for reveal
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
