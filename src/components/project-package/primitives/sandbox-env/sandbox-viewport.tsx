import React, { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import './sandbox-viewport.css'
import { clamp, zoomAtViewportCenter } from './utils/zoom-util'

export type SandboxViewportHandle = {
  setScaleAnchored: (nextScale: number) => void
  getView: () => { pan: { x: number; y: number }; scale: number; panning: boolean; viewport: HTMLDivElement | null }
}

export type SandboxViewportProps = {
  initialPan?: { x: number; y: number }
  initialScale?: number
  minScale?: number
  maxScale?: number
  onViewChange?: (view: { pan: { x: number; y: number }; scale: number; panning: boolean; viewport: HTMLDivElement | null }) => void
  children?: React.ReactNode
}

const SandboxViewport = React.forwardRef<SandboxViewportHandle, SandboxViewportProps>(function SandboxViewport(
  { initialPan = { x: 0, y: 0 }, initialScale = 1, minScale = 0.25, maxScale = 2.25, onViewChange, children },
  ref
) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const itemRef = useRef<HTMLDivElement | null>(null)

  const [s, setS] = useState(initialScale)
  const [pan, setPan] = useState(initialPan)
  const [panning, setPanning] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const vp = viewportRef.current
    const item = itemRef.current
    if (!vp || !item) return
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const iw = item.offsetWidth
    const ih = item.offsetHeight
    setPan({ x: (vw - iw * s) / 2, y: (vh - ih * s) / 2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    onViewChange?.({ pan, scale: s, panning, viewport: viewportRef.current })
  }, [pan.x, pan.y, s, panning, onViewChange])

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    const factor = Math.exp(-e.deltaY * 0.0012)
    const next = clamp(s * factor, minScale, maxScale)
    if (next === s) return

    const localX = (cx - pan.x) / s
    const localY = (cy - pan.y) / s
    const nextPanX = cx - localX * next
    const nextPanY = cy - localY * next
    setS(next)
    setPan({ x: nextPanX, y: nextPanY })
  }, [s, pan.x, pan.y, minScale, maxScale])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Block panning if interacting with any primitive in editing/moving state
    const target = e.target as HTMLElement
    const blocked = target.closest("[class*='--editing'], [class*='--moving']")
    if (blocked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    setPanning(true)
  }, [pan.x, pan.y])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    const nx = e.clientX - dragStart.current.x
    const ny = e.clientY - dragStart.current.y
    setPan({ x: nx, y: ny })
  }, [panning])

  const endPan = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    setPanning(false)
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    }
  }, [panning])

  useImperativeHandle(ref, () => ({
    setScaleAnchored: (nextScale: number) => {
      const vp = viewportRef.current
      if (!vp) return
      const next = clamp(nextScale, minScale, maxScale)
      const { pan: nextPan, scale } = zoomAtViewportCenter(vp, pan, s, next)
      setS(scale)
      setPan(nextPan)
    },
    getView: () => ({ pan, scale: s, panning, viewport: viewportRef.current }),
  }), [pan, s, panning, minScale, maxScale])

  return (
    <div
      ref={viewportRef}
      className={`sandbox-viewport__viewport${panning ? ' sandbox-viewport__viewport--panning' : ''}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <div className="sandbox-viewport__pan" style={{ ['--vh-pan-x' as any]: `${pan.x}px`, ['--vh-pan-y' as any]: `${pan.y}px` }}>
        <div className="sandbox-viewport__scale" style={{ ['--vh-scale' as any]: s }}>
          <div ref={itemRef} className="sandbox-viewport__item">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})

export default SandboxViewport
