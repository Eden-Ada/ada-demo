import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import VisionPrimitive from './vision-primitive'
import './sandbox-env.css'

export type SandboxEnvProps = {
  /** Initial scale multiplier */
  scale?: number
  /** Start centered in the viewport */
  center?: boolean
  /** Scale bounds */
  minScale?: number
  maxScale?: number
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const SandboxEnv: React.FC<SandboxEnvProps> = ({ scale = 1, center = true, minScale = 0.5, maxScale = 3 }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const itemRef = useRef<HTMLDivElement | null>(null)
  const [s, setS] = useState(scale)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const startRef = useRef({ x: 0, y: 0 })

  // Baseline center
  useLayoutEffect(() => {
    if (!center) return
    const vp = viewportRef.current
    const item = itemRef.current
    if (!vp || !item) return
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const iw = item.offsetWidth
    const ih = item.offsetHeight
    setPan({ x: (vw - iw * s) / 2, y: (vh - ih * s) / 2 })
  }, [center, s])

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const vp = viewportRef.current
    const item = itemRef.current
    if (!vp || !item) return

    const rect = vp.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    // zoom factor: scroll up -> zoom in, scroll down -> zoom out
    const factor = Math.exp(-e.deltaY * 0.0012)
    const next = clamp(s * factor, minScale, maxScale)
    if (next === s) return

    // keep cursor anchor stable
    const localX = (cx - pan.x) / s
    const localY = (cy - pan.y) / s
    const nextPanX = cx - localX * next
    const nextPanY = cy - localY * next
    setS(next)
    setPan({ x: nextPanX, y: nextPanY })
  }, [s, pan.x, pan.y, minScale, maxScale])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only start panning if background (viewport) is the target
    if (e.currentTarget !== e.target) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    setPanning(true)
  }, [pan.x, pan.y])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    const nx = e.clientX - startRef.current.x
    const ny = e.clientY - startRef.current.y
    setPan({ x: nx, y: ny })
  }, [panning])

  const endPan = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    if (panning) {
      setPanning(false)
      if (e) {
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
      }
    }
  }, [panning])

  return (
    <div className="vision-sandbox">
      <div
        ref={viewportRef}
        className={`vision-sandbox__viewport${panning ? ' vision-sandbox__viewport--panning' : ''}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="vision-sandbox__pan" style={{ ['--pan-x' as any]: `${pan.x}px`, ['--pan-y' as any]: `${pan.y}px` }}>
          <div className="vision-sandbox__scale" style={{ ['--scale' as any]: s }}>
            <div ref={itemRef} className="vision-sandbox__item">
              <VisionPrimitive state="active" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SandboxEnv
