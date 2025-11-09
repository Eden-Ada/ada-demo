import React from 'react'
import ProgMeter from '../../project-package/primitives/pipeline/mods/task-block/prog-meter/prog-meter'

export type ResearchProps = {
  title?: string
  description?: string
  onStart?: () => void
  width?: number
  stages?: string[]
}

const Research: React.FC<ResearchProps> = ({
  title = 'Research',
  description = 'Style & Creative Direction',
  onStart,
  width = 100,
  stages,
}) => {
  const [showInfo, setShowInfo] = React.useState(false)
  const btnRef = React.useRef<HTMLButtonElement | null>(null)
  const [diam, setDiam] = React.useState<number | null>(null)
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const [dir, setDir] = React.useState<'left' | 'right'>('right')
  const [showDots, setShowDots] = React.useState(false)
  const dotsTimerRef = React.useRef<number | null>(null)
  const lastGestureAtRef = React.useRef<number>(0)
  const [progress, setProgress] = React.useState(0)
  const [isRunning, setIsRunning] = React.useState(false)
  const [stageIdx, setStageIdx] = React.useState(0)
  const [exiting, setExiting] = React.useState(false)
  const rafRef = React.useRef<number | null>(null)
  const exitTimerRef = React.useRef<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const runCfgRef = React.useRef<{
    start: number
    duration: number
    amp: number
    phase: number
    stageIndex?: number
    gate?: { start: number; dur: number; factor: number }
    prevPct?: number
  } | null>(null)

  const revealInfo = React.useCallback((incomingDir: 'left' | 'right') => {
    setDir(incomingDir)
    if (!isRunning) setShowInfo(true)
    // show paginator briefly
    if (dotsTimerRef.current) window.clearTimeout(dotsTimerRef.current)
    setShowDots(true)
    dotsTimerRef.current = window.setTimeout(() => setShowDots(false), 2000)
    lastGestureAtRef.current = Date.now()
  }, [isRunning])

  const hideInfo = React.useCallback((outDir: 'left' | 'right') => {
    setDir(outDir)
    if (!isRunning) setShowInfo(false)
    // show paginator briefly
    if (dotsTimerRef.current) window.clearTimeout(dotsTimerRef.current)
    setShowDots(true)
    dotsTimerRef.current = window.setTimeout(() => setShowDots(false), 2000)
    lastGestureAtRef.current = Date.now()
  }, [])

  const start = (x?: number, y?: number) => {
    if (typeof x === 'number' && typeof y === 'number') startRef.current = { x, y }
  }

  const finish = (x?: number, y?: number) => {
    const s = startRef.current
    startRef.current = null
    if (!s || typeof x !== 'number' || typeof y !== 'number') return
    const dx = x - s.x
    const dy = y - s.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    const SWIPE_THRESHOLD = 16
    const TAP_THRESHOLD = 22
    if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD) {
      // tap toggles view (acts like a swipe)
      showInfo ? hideInfo('left') : revealInfo('right')
      return
    }
    if (absX > SWIPE_THRESHOLD && absX > absY) {
      if (dx < 0) {
        // left
        showInfo ? hideInfo('left') : revealInfo('left')
      } else {
        // right
        showInfo ? hideInfo('right') : revealInfo('right')
      }
    }
  }

  const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
    const x = e.clientX
    const y = e.clientY
    start(x, y)
  }, [])

  const handlePointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    finish(e.clientX, e.clientY)
  }, [hideInfo, revealInfo, showInfo])

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); start(e.clientX, e.clientY) }, [])
  const handleMouseUp = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); finish(e.clientX, e.clientY) }, [])
  const handleTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => { e.stopPropagation(); start(e.touches?.[0]?.clientX, e.touches?.[0]?.clientY) }, [])
  const handleTouchEnd = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => { e.stopPropagation(); finish(e.changedTouches?.[0]?.clientX, e.changedTouches?.[0]?.clientY) }, [])

  // Smooth progress runner via RAF and eased curve
  const easeOutCubic = React.useCallback((t: number) => 1 - Math.pow(1 - t, 3), [])

  const tick = React.useCallback(() => {
    const cfg = runCfgRef.current
    if (!cfg) return
    const now = performance.now()
    const t = Math.min(1, (now - cfg.start) / cfg.duration)
    // micro variability on time to create natural speed-ups/slow-downs, but stay monotonic
    const s = Math.min(1, Math.max(0, t + cfg.amp * Math.sin(2 * Math.PI * (t + cfg.phase))))
    const basePct = easeOutCubic(s) * 100
    // Bracket-relative modulation: slow near center of each copy stage, slight micro-variation inside bracket
    const B = [0, 30, 55, 80, 100]
    let i = 0
    for (; i < B.length - 1; i++) {
      if (basePct >= B[i] && basePct <= B[i + 1]) break
    }
    const b0 = B[i] ?? 0
    const b1 = B[i + 1] ?? 100
    const width = Math.max(1, b1 - b0)
    const u = Math.min(1, Math.max(0, (basePct - b0) / width)) // 0..1 within stage
    // Slow at stage center; faster at edges
    const slowCenter = 0.45 + 0.55 * Math.abs(u - 0.5) * 2 // [0.45..1]
    // Stage-specific baseline factor (some stages generally slower)
    const stageFactors = [0.95, 0.9, 0.92, 0.9]
    const stageFactor = stageFactors[Math.min(stageFactors.length - 1, i)] ?? 0.92
    const micro = 0.95 + 0.05 * Math.sin(2 * Math.PI * (u + cfg.phase))
    const cfgAny = runCfgRef.current as any
    const prev = (typeof (cfgAny?.prevPct) === 'number') ? cfgAny.prevPct : 0
    let scale0 = slowCenter * stageFactor * micro
    const stageOf = (v: number) => {
      let j = 0; for (; j < B.length - 1; j++) { if (v >= B[j] && v < B[j + 1]) break } return j
    }
    const prevStage = stageOf(prev)
    // apply existing gate (if any) first
    let gateFactorNow = 1
    if (cfgAny.gate) {
      const gElapsed = now - cfgAny.gate.start
      if (gElapsed < cfgAny.gate.dur) {
        const gt = Math.min(1, Math.max(0, gElapsed / cfgAny.gate.dur))
        const gEase = easeOutCubic(gt)
        gateFactorNow = cfgAny.gate.factor + (1 - cfgAny.gate.factor) * gEase
      } else {
        cfgAny.gate = undefined
      }
    }
    let scale = scale0 * gateFactorNow
    let candidate = prev + (basePct - prev) * scale
    const candidateStage = stageOf(candidate)
    if (cfgAny.displayIdx == null) cfgAny.displayIdx = prevStage
    if (candidateStage !== cfgAny.displayIdx) {
      const gateFactors = [0.5, 0.45, 0.6]
      const gateDurations = [1100, 1300, 1000]
      const gi = Math.min(gateFactors.length - 1, cfgAny.displayIdx)
      cfgAny.gate = { start: now, dur: gateDurations[gi], factor: gateFactors[gi] }
      cfgAny.displayIdx = candidateStage
      // keep React-visible stage in sync with slowdown gate start
      setStageIdx(candidateStage)
      // apply new gate immediately for this frame
      gateFactorNow = cfgAny.gate.factor
      scale = scale0 * gateFactorNow
      candidate = prev + (basePct - prev) * scale
    }
    // ensure we minimally cross the stage boundary so text updates now
    const boundary = B[Math.min(prevStage + 1, B.length - 1)]
    if (candidateStage !== prevStage && candidate > prev) {
      const minNext = boundary + 0.2
      if (candidate < minNext) candidate = minNext
    }
    scale = Math.max(0.35, Math.min(1.0, scale))
    const easedPct = Math.min(100, Math.max(prev, candidate))
    const pct = Math.round(Math.min(100, Math.max(prev, easedPct)))
    if (runCfgRef.current) (runCfgRef.current as any).prevPct = pct
    setProgress(pct)
    if (t < 1) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      setIsRunning(false)
      rafRef.current = null
      setExiting(true)
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current)
      // After exit animation (~380–420ms), announce panel open with current circle rect
      exitTimerRef.current = window.setTimeout(() => {
        try {
          const r = containerRef.current?.getBoundingClientRect()
          window.dispatchEvent(new CustomEvent('ada-vibe-open', { detail: { rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null } }))
        } catch {}
      }, 420)
    }
  }, [easeOutCubic])

  const startProgress = React.useCallback(() => {
    if (isRunning || progress >= 100) return
    setShowInfo(false)
    setIsRunning(true)
    setProgress(0)
    setStageIdx(0)
    // Randomize duration slightly to feel real without jitter
    const base = 15000
    const jitter = 0.95 + Math.random() * 0.2 // 95%..115%
    const amp = 0.05 + Math.random() * 0.03 // 0.05..0.08
    const phase = Math.random() // 0..1
    runCfgRef.current = {
      start: performance.now() + 120,
      duration: base * jitter,
      amp,
      phase,
      stageIndex: 0,
      gate: undefined,
      prevPct: 0,
    } as any
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [isRunning, progress, tick])

  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (dotsTimerRef.current) window.clearTimeout(dotsTimerRef.current)
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current)
  }, [])

  // Measure button and compute tight circle with ~24px radial margin
  React.useLayoutEffect(() => {
    if (width) return // explicit override
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const base = Math.max(r.width, r.height)
    const radialMargin = 24
    const next = Math.round(base + radialMargin * 2)
    if (!diam || Math.abs(next - diam) > 1) setDiam(next)
  }, [width, diam])

  // Staged copy for creative direction run
  const copyStages = React.useMemo(
    () => (stages && stages.length ? stages : [
      "Checking sources for optimal branding style",
      "Cross-referencing styles and assigning probability",
      "Figuring out cost effectiveness",
      "Creating your brand’s vibe board",
    ]),
    [stages],
  )

  const stageText = React.useMemo(() => copyStages[Math.min(copyStages.length - 1, Math.max(0, stageIdx))], [copyStages, stageIdx])

  const showPlay = (!isRunning && progress === 0 && !showInfo)

  // Vibe data (AI-style placeholders)
  // vibe presentation decoupled; no local vibes here

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        // Fallback: if no swipe just occurred, treat click as toggle
        if (Date.now() - lastGestureAtRef.current > 150) {
          if (isRunning) return
          showInfo ? hideInfo('left') : revealInfo('right')
        }
      }}
      role="button"
      aria-label="Research"
      style={{
        width: (width ?? diam ?? 120),
        height: (width ?? diam ?? 120),
        maxWidth: (width ?? diam ?? 120),
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.30)',
        WebkitBackdropFilter: 'blur(5px)',
        backdropFilter: 'blur(5px)',
        willChange: 'backdrop-filter, opacity, transform',
        boxShadow:
          'inset 1px 1px 2px rgba(255, 255, 255, 0.50),\
           inset -3px -3px 8px rgba(0, 0, 0, 0.085),\
           0 8px 24px rgba(0, 0, 0, 0.12),\
           0 16px 40px rgba(0, 0, 0, 0.15)',
        color: 'rgba(255,255,255,0.92)',
        border: 'none',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        touchAction: 'none',
        transition: 'transform 380ms ease, opacity 380ms ease',
        transform: exiting ? 'translateY(-64px) scale(0.96)' : 'translateY(0)',
        opacity: exiting ? 0 : 1,
      }}
    >
      <button
        ref={btnRef}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); startProgress() }}
        style={{
          width: 72,
          height: 72,
          padding: 0,
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          transition: 'opacity 200ms ease, transform 240ms ease',
          opacity: showPlay ? 1 : 0,
          pointerEvents: showPlay ? 'auto' : 'none',
          transform: showInfo ? (dir === 'left' ? 'translateX(-22px)' : 'translateX(22px)') : 'translateX(0)'
        }}
      >
        <svg
          width={56}
          height={56}
          viewBox="0 0 24 24"
          style={{ display: 'block' }}
          aria-hidden
          focusable="false"
        >
          <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
        </svg>
      </button>

      {/* Info view (two-fold paginator: shows when toggled) */}
      {(!isRunning && progress === 0 && showInfo) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            opacity: 1,
            transition: 'opacity 220ms ease',
          }}
          aria-hidden
        >
          {(() => {
            const circleSize = (width ?? diam ?? 120)
            const maxW = Math.max(76, circleSize - 38)
            return (
              <div style={{ textAlign: 'center', transform: 'translateY(2px)', width: maxW }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 0.2, marginBottom: 3 }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 10, lineHeight: 1.2, letterSpacing: 0.2, wordBreak: 'break-word', overflowWrap: 'anywhere' as any, hyphens: 'auto' as any }}>{description}</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Progress meter (shows when running or after started) */}
      {(isRunning || progress > 0) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            opacity: 1,
          }}
          aria-hidden
        >
          <ProgMeter
            percent={progress}
            size={Math.max(96, (width ?? diam ?? 120) - 10)}
            variant={2}
            stroke={2}
            trackColor={'transparent'}
            alpha={0.95}
            filmOpacity={0}
            className="prog-meter--bare"
          />
          {progress < 100 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transition: 'opacity 220ms ease' }}>
              {(() => {
                const circleSize = (width ?? diam ?? 120)
                const maxW = Math.max(76, circleSize - 38)
                return (
                  <div style={{ textAlign: 'center', transform: 'translateY(2px)', width: maxW }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 0.2, marginBottom: 3 }}>{progress}%</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 10, lineHeight: 1.2, letterSpacing: 0.2, wordBreak: 'break-word', overflowWrap: 'anywhere' as any, hyphens: 'auto' as any }}>{stageText}</div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* vibe panel decoupled and moved to its own component */}

      {/* dotted paginator (appears briefly after switching views) */}
      <div
        style={{
          position: 'absolute',
          bottom: 19,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'grid',
          gridAutoFlow: 'column',
          gap: 6,
          pointerEvents: 'none',
          opacity: showDots ? 1 : 0,
          transition: 'opacity 220ms ease',
          willChange: 'opacity',
        }}
        aria-hidden
      >
        <div style={{ width: 6, height: 6, borderRadius: 999, background: showInfo ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)', boxShadow: showInfo ? 'none' : '0 0 4px rgba(255,255,255,0.45)' }} />
        <div style={{ width: 6, height: 6, borderRadius: 999, background: showInfo ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', boxShadow: showInfo ? '0 0 4px rgba(255,255,255,0.45)' : 'none' }} />
      </div>
    </div>
  )
}

export default Research
