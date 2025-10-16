import React, { useCallback, useRef, useState } from 'react'

export type UseRefreshActivationOptions = {
  durationMs?: number
  onComplete?: () => void
}

export function useRefreshActivation({ durationMs = 500, onComplete }: UseRefreshActivationOptions) {
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const lastLogRef = useRef(-1)
  const downRef = useRef(false)
  const blockUpUntilRef = useRef(0)

  const stop = useCallback((complete: boolean) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
    downRef.current = false
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
    setActive(true)
    setProgress(0)
    startRef.current = performance.now()
    lastLogRef.current = 0
    // Give React a tiny window to mount the halo before honoring pointerup
    blockUpUntilRef.current = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) + 140
    try { console.log('[refresh-activation] arcIsPlaying:', true, '(start)') } catch {}
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const cancel = useCallback((e?: React.PointerEvent<HTMLElement>) => {
    try {
      console.log('[refresh-activation] cancel', e?.type)
      e?.stopPropagation()
      // Ignore spurious early ups inside the small grace window
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      if (now < blockUpUntilRef.current) {
        console.log('[refresh-activation] cancel ignored (grace window)')
        return
      }
      downRef.current = false
      if (e) {
        try { (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId) } catch {}
      }
    } catch {}
    try { console.log('[refresh-activation] arcIsPlaying:', false, '(cancel)') } catch {}
    stop(false)
  }, [stop])


  const handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void,
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void,
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void,
  } = { onPointerDown, onPointerUp: cancel, onPointerCancel: cancel }

  return { active, progress, handlers, cancel }
}
