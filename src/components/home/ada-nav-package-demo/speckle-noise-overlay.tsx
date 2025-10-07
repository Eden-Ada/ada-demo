import React, { CSSProperties, useMemo, useEffect } from 'react'

export type SpeckleNoiseOverlayProps = {
  /** 0..1 overall layer opacity; default 1 for tuning */
  opacity?: number
  /** 0..1 probability a pixel becomes a speckle (use 0.02..0.15). Default 0.12 */
  density?: number
  /** Optional seed for stable noise across renders; if omitted, random */
  seed?: number
  /** Mix blend mode; for black speckles use 'multiply'. Default 'multiply' */
  blendMode?: CSSProperties['mixBlendMode']
  /** Generation resolution (texture size). Higher = finer grain per pixel. Default 512 */
  width?: number
  height?: number
  /** Alpha range for individual specks [min,max], 0..1. Default [0.75, 1] */
  alphaRange?: [number, number]
  /** Brightness (gray) range for specks [min,max] on 0..255. Default [0, 40] (very dark) */
  brightnessRange?: [number, number]
  /** Color jitter magnitude (0..1 of 255) applied per channel around gray. Default 0.06 */
  chroma?: number
  /** Speck radius range in texture pixels. Default [0.6, 1.6] */
  speckRadiusRange?: [number, number]
  /** Optional explicit speck count. If omitted, derived from density and area. */
  count?: number
  /** Bias exponent (>1 biases alpha toward lower values). Default 2.0 */
  alphaBiasExp?: number
  /** Fraction of specks drawn as bright/near-white. Default 0.08 (8%) */
  whiteFraction?: number
  /** Bright speck brightness range [min,max] 0..255; default [230,255] */
  whiteBrightnessRange?: [number, number]
  /** Grey speck brightness range [min,max] 0..255; default [150,215] */
  greyBrightnessRange?: [number, number]
  /** Alpha range for bright specks; default [0.7,1] */
  whiteAlphaRange?: [number, number]
  /** Alpha range for grey specks; default [0.45,0.9] */
  greyAlphaRange?: [number, number]
  /** When true, logs regeneration details to console for debugging */
  debug?: boolean
  /** Generation mode: 'dots' (stamped circles), 'pixel' (per-pixel noise), or 'correlated' (clustered). Default 'pixel' */
  mode?: 'dots' | 'pixel' | 'correlated'
  /** For 'correlated' mode: approximate correlation block size in px (3..8 typical). Default 4 */
  correlationPx?: number
  /** For 'correlated' mode: small extra jitter 0..1 added to break uniformity. Default 0.12 */
  detailJitter?: number
  /** For 'correlated' mode: speck fill color ('black' | 'white'). Default 'black' */
  correlatedFill?: 'black' | 'white'
}

function makeRng(seed: number) {
  // Simple LCG for deterministic randomness when seed provided
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff
}

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v }
function clamp255(v: number) { return v < 0 ? 0 : v > 255 ? 255 : v | 0 }

function generateSpeckleDataURL(
  width: number,
  height: number,
  density: number,
  seeded: number | undefined,
  alphaRange: [number, number] = [0.75, 1],
  brightnessRange: [number, number] = [0, 40],
  chroma: number = 0.06,
  speckRadiusRange: [number, number] = [0.6, 1.6],
  count: number | undefined,
  alphaBiasExp: number = 2.0,
  whiteFraction: number = 0.08,
  whiteBrightnessRange: [number, number] = [230, 255],
  greyBrightnessRange: [number, number] = [150, 215],
  whiteAlphaRange: [number, number] = [0.7, 1],
  greyAlphaRange: [number, number] = [0.45, 0.9],
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const rand = seeded != null ? makeRng(seeded) : Math.random
  // Global clamps from provided ranges
  const [globalAlphaMin, globalAlphaMax] = alphaRange
  const [globalBrightMin, globalBrightMax] = brightnessRange
  const jitter = Math.max(0, Math.min(1, chroma)) * 255
  const rMin = Math.max(0.25, speckRadiusRange[0])
  const rMax = Math.max(rMin, speckRadiusRange[1])
  const area = width * height
  // derive default count ~ proportional to density and area. Increased factor for higher coverage.
  const defaultCount = Math.round(area * clamp01(density) * 0.15)
  const N = Math.max(0, count ?? defaultCount)

  for (let i = 0; i < N; i++) {
    const x = (typeof rand === 'function' ? rand() : Math.random()) * width
    const y = (typeof rand === 'function' ? rand() : Math.random()) * height
    const rad = rMin + ((typeof rand === 'function' ? rand() : Math.random()) * (rMax - rMin))
    // Choose bright (white-ish) vs grey speck
    const isWhite = (typeof rand === 'function' ? rand() : Math.random()) < whiteFraction
    // Clamp class ranges by global brightness bounds
    const [classBMinRaw, classBMaxRaw] = isWhite ? whiteBrightnessRange : greyBrightnessRange
    const bMin = Math.max(globalBrightMin, classBMinRaw)
    const bMax = Math.min(globalBrightMax, classBMaxRaw)
    const base = bMin + ((typeof rand === 'function' ? rand() : Math.random()) * Math.max(0, (bMax - bMin)))
    const jr = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
    const jg = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
    const jb = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
    const R = clamp255(base + jr * jitter)
    const G = clamp255(base + jg * jitter)
    const B = clamp255(base + jb * jitter)
    const u = (typeof rand === 'function' ? rand() : Math.random())
    // Clamp by global alpha bounds
    const [classAMinRaw, classAMaxRaw] = isWhite ? whiteAlphaRange : greyAlphaRange
    const arMin = Math.max(globalAlphaMin, classAMinRaw)
    const arMax = Math.min(globalAlphaMax, classAMaxRaw)
    const aRand = (arMin + (Math.pow(u, alphaBiasExp) * Math.max(0, (arMax - arMin))))
    const A = clamp255(aRand * 255)
    ctx.fillStyle = `rgba(${R},${G},${B},${A / 255})`
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toDataURL('image/png')
}

// Per-pixel Photoshop-like noise, high coverage option
function generatePixelNoiseDataURL(
  width: number,
  height: number,
  coverage: number, // 0..1 fraction of pixels drawn as specks
  seeded: number | undefined,
  whiteFraction: number = 0.0,
  whiteBrightnessRange: [number, number] = [235, 255],
  greyBrightnessRange: [number, number] = [160, 220],
  alphaRange: [number, number] = [0.85, 1],
  alphaBiasExp: number = 1.6,
  chroma: number = 0.03,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) return ''

  const img = ctx.createImageData(width, height)
  const data = img.data
  const rand = seeded != null ? makeRng(seeded) : Math.random
  const p = clamp01(coverage)
  const jitter = Math.max(0, Math.min(1, chroma)) * 255
  const [aMin, aMax] = alphaRange

  let ptr = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (typeof rand === 'function' ? rand() : Math.random())
      if (u < p) {
        const isWhite = ((typeof rand === 'function' ? rand() : Math.random())) < whiteFraction
        const [bMin, bMax] = isWhite ? whiteBrightnessRange : greyBrightnessRange
        const base = bMin + ((typeof rand === 'function' ? rand() : Math.random()) * (bMax - bMin))
        const jr = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
        const jg = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
        const jb = (typeof rand === 'function' ? rand() : Math.random()) * 2 - 1
        const R = clamp255(base + jr * jitter)
        const G = clamp255(base + jg * jitter)
        const B = clamp255(base + jb * jitter)
        const aU = (typeof rand === 'function' ? rand() : Math.random())
        const A = clamp255((aMin + Math.pow(aU, alphaBiasExp) * (aMax - aMin)) * 255)
        data[ptr] = R
        data[ptr + 1] = G
        data[ptr + 2] = B
        data[ptr + 3] = A
      } else {
        data[ptr] = 0
        data[ptr + 1] = 0
        data[ptr + 2] = 0
        data[ptr + 3] = 0
      }
      ptr += 4
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// Clustered/correlated noise: coarse grid + bilinear interpolation + threshold
function generateCorrelatedNoiseDataURL(
  width: number,
  height: number,
  coverage: number, // 0..1 fraction of pixels that should appear (after threshold)
  seeded: number | undefined,
  correlationPx: number = 4,
  detailJitter: number = 0.12,
  fill: 'black' | 'white' = 'black',
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) return ''

  const rng = seeded != null ? makeRng(seeded) : Math.random
  const cell = Math.max(2, Math.min(16, Math.round(correlationPx)))
  const gw = Math.floor(width / cell) + 2
  const gh = Math.floor(height / cell) + 2
  const grid: number[] = new Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const n = (typeof rng === 'function' ? rng() : Math.random())
      grid[gy * gw + gx] = n
    }
  }

  const img = ctx.createImageData(width, height)
  const data = img.data
  const thr = 1 - clamp01(coverage) // higher coverage -> lower threshold
  const jitterAmp = Math.max(0, Math.min(1, detailJitter)) * 0.2

  let ptr = 0
  for (let y = 0; y < height; y++) {
    const fy = (y % cell) / cell
    const gy = Math.floor(y / cell)
    for (let x = 0; x < width; x++) {
      const fx = (x % cell) / cell
      const gx = Math.floor(x / cell)
      const g00 = grid[gy * gw + gx]
      const g10 = grid[gy * gw + (gx + 1)]
      const g01 = grid[(gy + 1) * gw + gx]
      const g11 = grid[(gy + 1) * gw + (gx + 1)]
      const a = g00 * (1 - fx) + g10 * fx
      const b = g01 * (1 - fx) + g11 * fx
      let v = a * (1 - fy) + b * fy
      // slight jitter to avoid visible bands
      const j = ((typeof rng === 'function' ? rng() : Math.random()) - 0.5) * jitterAmp
      v = Math.max(0, Math.min(1, v + j))
      if (v > thr) {
        // speck pixel (opaque here; overall layer opacity handled by wrapper)
        if (fill === 'white') {
          data[ptr] = 255
          data[ptr + 1] = 255
          data[ptr + 2] = 255
          data[ptr + 3] = 255
        } else {
          data[ptr] = 0
          data[ptr + 1] = 0
          data[ptr + 2] = 0
          data[ptr + 3] = 255
        }
      } else {
        data[ptr] = 0
        data[ptr + 1] = 0
        data[ptr + 2] = 0
        data[ptr + 3] = 0
      }
      ptr += 4
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

const SpeckleNoiseOverlay: React.FC<SpeckleNoiseOverlayProps> = ({
  opacity = 1,
  density = 0.12,
  seed,
  blendMode = 'multiply',
  width = 512,
  height = 512,
  alphaRange = [0.75, 1],
  brightnessRange = [0, 40],
  chroma = 0.06,
  speckRadiusRange = [0.6, 1.6],
  count,
  alphaBiasExp = 2.0,
  whiteFraction = 0.08,
  whiteBrightnessRange = [230, 255],
  greyBrightnessRange = [150, 215],
  whiteAlphaRange = [0.7, 1],
  greyAlphaRange = [0.45, 0.9],
  debug = false,
  mode = 'pixel',
  correlationPx = 4,
  detailJitter = 0.12,
  correlatedFill = 'black',
}) => {
  const url = useMemo(() => {
    if (mode === 'pixel') {
      return generatePixelNoiseDataURL(
        width,
        height,
        density,
        seed,
        whiteFraction,
        whiteBrightnessRange,
        greyBrightnessRange,
        alphaRange,
        alphaBiasExp,
        chroma,
      )
    }
    if (mode === 'correlated') {
      return generateCorrelatedNoiseDataURL(
        width,
        height,
        density,
        seed,
        correlationPx,
        detailJitter,
        correlatedFill,
      )
    }
    return generateSpeckleDataURL(
      width,
      height,
      density,
      seed,
      alphaRange,
      brightnessRange,
      chroma,
      speckRadiusRange,
      count,
      alphaBiasExp,
      whiteFraction,
      whiteBrightnessRange,
      greyBrightnessRange,
      whiteAlphaRange,
      greyAlphaRange,
    )
  }, [
    mode,
    width,
    height,
    density,
    seed,
    alphaRange,
    brightnessRange,
    chroma,
    speckRadiusRange,
    count,
    alphaBiasExp,
    whiteFraction,
    whiteBrightnessRange,
    greyBrightnessRange,
    whiteAlphaRange,
    greyAlphaRange,
    correlationPx,
    detailJitter,
    correlatedFill,
  ])

  useEffect(() => {
    if (debug) {
      // eslint-disable-next-line no-console
      console.debug('[SpeckleNoiseOverlay] regen', {
        width,
        height,
        density,
        seed,
        count,
        urlLength: url?.length ?? 0,
        ts: Date.now(),
      })
    }
  }, [url, width, height, density, seed, count, debug])

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: 'inherit',
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    opacity,
    mixBlendMode: debug ? 'normal' : blendMode,
    zIndex: 30,
  }

  return <div aria-hidden={true} style={style} />
}

export default SpeckleNoiseOverlay
