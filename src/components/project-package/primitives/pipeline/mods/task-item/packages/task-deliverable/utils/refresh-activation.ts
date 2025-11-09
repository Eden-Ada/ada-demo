import React, { useCallback, useRef, useState } from 'react'

export type UseRefreshActivationOptions = {
  durationMs?: number
  onComplete?: () => void
  onTap?: () => void
  tapMs?: number
  visualDelayMs?: number
}

export function useRefreshActivation({ durationMs = 500, onComplete, onTap, tapMs = 260, visualDelayMs = 200 }: UseRefreshActivationOptions) {
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const lastLogRef = useRef(-1)
  const downRef = useRef(false)
  const blockUpUntilRef = useRef(0)
  const armTimerRef = useRef<number | null>(null)

  const stop = useCallback((complete: boolean) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
    downRef.current = false
    if (armTimerRef.current) { window.clearTimeout(armTimerRef.current); armTimerRef.current = null }
    setActive(false)
    setProgress(0)
    try { console.log('[refresh-activation] arcIsPlaying:', false, complete ? '(complete)' : '(cancel)') } catch {}
    if (complete) onComplete?.()
  }, [onComplete])

  const tick = useCallback((now: number) => {
    if (startRef.current == null || !downRef.current) return
    const elapsed = now - startRef.current
    const p = Math.min(1, elapsed / durationMs)
    setProgress(p)
    // Throttled progress logging at ~5% intervals
    try {
      if (p === 1 || p - lastLogRef.current >= 0.05) {
        lastLogRef.current = p
        console.log('[refresh-activation] progress', Math.round(p * 100) + '%')
      }
    } catch {}
    if (p >= 1) {
      console.log('[refresh-activation] complete: firing onComplete')
      stop(true)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [durationMs, stop])

  const onPointerDown = useCallback((e?: React.PointerEvent<HTMLElement>) => {
    try {
      console.log('[refresh-activation] pointerdown', e?.type, (e as any)?.pointerType)
      e?.stopPropagation()
      if (e) {
        try { (e.currentTarget as any)?.setPointerCapture?.(e.pointerId) } catch {}
      }
    } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    downRef.current = true
    setActive(false)
    setProgress(0)
    startRef.current = performance.now()
    lastLogRef.current = 0
    // Give React a tiny window to mount the halo before honoring pointerup
    blockUpUntilRef.current = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) + 140
    try { console.log('[refresh-activation] arcIsPlaying:', true, '(start)') } catch {}
    if (armTimerRef.current) window.clearTimeout(armTimerRef.current)
    armTimerRef.current = window.setTimeout(() => {
      if (!downRef.current) return
      setActive(true) // show arc only after a short delay so taps don't flash it
    }, Math.max(0, visualDelayMs))
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, visualDelayMs])

  const cancel = useCallback((e?: React.PointerEvent<HTMLElement>) => {
    try {
      console.log('[refresh-activation] cancel', e?.type)
      e?.stopPropagation()
      // Do not ignore early ups; we want taps to register immediately
      downRef.current = false
      if (e) {
        try { (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId) } catch {}
      }
    } catch {}
    try { console.log('[refresh-activation] arcIsPlaying:', false, '(cancel)') } catch {}
    // Determine if this was a short tap
    const started = startRef.current
    const elapsed = started != null ? (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - started : Number.POSITIVE_INFINITY
    stop(false)
    if (elapsed <= tapMs) {
      try { onTap?.() } catch {}
    }
  }, [stop, tapMs, onTap])

  const handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void,
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void,
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void,
  } = { onPointerDown, onPointerUp: cancel, onPointerCancel: cancel }

  return { active, progress, handlers, cancel }
}
