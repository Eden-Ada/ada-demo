// Stacking logic utilities: rotations, offsets, and deterministic jitter
// This module centralizes how we generate visual variation for stack layers.

export type StackItemRef = { id: string }

export type RotationOptions = {
  maxAbs?: number // max absolute rotation in degrees
  minAbs?: number // min absolute rotation in degrees (avoid imperceptible values)
  alternateSign?: boolean // alternate + / - by index
  uniqueTolerance?: number // avoid adjacent magnitudes being too similar
}

// Simple deterministic hash + PRNG so visual jitter is stable per item
export function hash32(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function computeRotations(
  items: StackItemRef[],
  opts: RotationOptions = {}
): number[] {
  const {
    maxAbs = 4,
    minAbs = 1.5,
    alternateSign = true,
    uniqueTolerance = 0.25,
  } = opts

  const list: number[] = []
  for (let i = 0; i < items.length; i++) {
    const sign = alternateSign ? (i % 2 === 0 ? 1 : -1) : 1
    const seed = hash32(String(items[i]?.id ?? i) + '|' + items.length + '|' + i)
    const rnd = mulberry32(seed)()
    let mag = minAbs + (maxAbs - minAbs) * rnd
    if (i > 0 && Math.abs(mag - Math.abs(list[i - 1])) < uniqueTolerance) {
      mag = Math.min(maxAbs, Math.max(minAbs, mag + 1))
    }
    list.push(sign * mag)
  }
  return list
}

// Optional: seed-based offset jitter (not currently used by the component)
export type Offset = { dx: number; dy: number; rot: number; scale: number }
export type OffsetOptions = {
  dxRange?: number // max +/- px
  dyRange?: number // max +/- px
  scaleDecay?: number // per-index scale decay
}

export function computeOffsets(
  items: StackItemRef[],
  opts: OffsetOptions = {}
): Offset[] {
  const { dxRange = 4, dyRange = 5, scaleDecay = 0.015 } = opts
  return items.map((it, idx) => {
    const sign = idx % 2 === 0 ? 1 : -1
    const dx = Math.round(((idx * 7) % (dxRange + 1)) * sign)
    const dy = Math.round(((idx * 11) % (dyRange + 1)))
    const scale = 1 - Math.min(0.06, idx * scaleDecay)
    return { dx, dy, rot: 0, scale }
  })
}

// ------------------------------------------------------------
// No-overlap layout: enforced sign alternation and monotonic magnitude
// so that each successive sheet reveals edges without being covered.

export type NoOverlapConfig = {
  minAbs?: number      // minimum absolute rotation in degrees (e.g., 1.5)
  maxAbs?: number      // maximum absolute rotation in degrees (e.g., 4)
  step?: number        // per-layer magnitude increment (e.g., 0.5)
  jitter?: number      // small random jitter added to magnitude (e.g., 0.25)
  startSign?: 1 | -1   // which side reveals first; default +1 (right)
  dxBase?: number      // base horizontal nudge in px (e.g., 0.5)
  dxStep?: number      // per-layer dx growth in px (e.g., 0.5)
  dxMax?: number       // max dx in px (e.g., 4)
}

export type LayerLayout = { rot: number; dx: number; dy: number }

export function computeLayoutNoOverlap(
  items: StackItemRef[],
  cfg: NoOverlapConfig = {}
): LayerLayout[] {
  const {
    minAbs = 1.5,
    maxAbs = 4,
    step = 0.5,
    jitter = 0.25,
    startSign = 1,
    dxBase = 0.5,
    dxStep = 0.5,
    dxMax = 3,
  } = cfg

  const n = items.length
  if (n === 0) return []

  // Build magnitudes that increase with depth to keep deeper edges visible
  const mags: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const seed = hash32(String(items[i]?.id ?? i) + '|mag|' + n + '|' + i)
    const r = mulberry32(seed)()
    const j = (r * 2 - 1) * jitter // symmetric jitter in [-jitter, +jitter]
    const base = minAbs + i * step + j
    mags[i] = Math.max(minAbs, Math.min(maxAbs, base))
  }

  // Enforce sign alternation and compute dx nudges per layer
  const layouts: LayerLayout[] = []
  for (let i = 0; i < n; i++) {
    const sign = (i % 2 === 0 ? 1 : -1) * startSign
    const rot = sign * mags[i]
    const dx = Math.max(0, Math.min(dxMax, dxBase + dxStep * i)) * sign
    layouts.push({ rot, dx, dy: 0 })
  }

  return layouts
}
