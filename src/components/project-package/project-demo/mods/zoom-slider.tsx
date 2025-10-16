import React, { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/zoom-slider.css'

export type ZoomSliderProps = {
  min?: number
  max?: number
  defaultValue?: number
  onChange?: (value: number) => void
  className?: string
  style?: React.CSSProperties
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const ZoomSlider: React.FC<ZoomSliderProps> = ({ min = -1.25, max = 1.25, defaultValue = 0, onChange, className, style }) => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [value, setValue] = useState(defaultValue)
  const draggingRef = useRef(false)

  useEffect(() => { setValue(defaultValue) }, [defaultValue])

  const notify = useCallback((v: number) => { onChange && onChange(v) }, [onChange])

  const valueToRatio = (v: number) => (v - min) / (max - min)
  const ratioToValue = (r: number) => min + r * (max - min)

  const setFromClientY = (clientY: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const r = clamp((clientY - rect.top) / rect.height, 0, 1)
    const v = ratioToValue(1 - r)
    setValue(v)
    notify(v)
  }

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    draggingRef.current = true
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    setFromClientY(e.clientY)
  }

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current) return
    setFromClientY(e.clientY)
  }

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId) } catch {}
  }

  const ratio = valueToRatio(value)
  const thumbOffset = (1 - ratio) * 100

  return (
    <div className={`zoom-slider${className ? ' ' + className : ''}`} role="group" aria-label="Zoom slider" style={style}>
      <div
        ref={trackRef}
        className="zoom-slider__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="zoom-slider__mid" />
        <div className="zoom-slider__thumb" style={{ top: `${thumbOffset}%` }} aria-hidden />
      </div>
      <div className="zoom-slider__labels" aria-hidden>
        <span className="zoom-slider__label zoom-slider__label--top">+</span>
        <span className="zoom-slider__label zoom-slider__label--center">1x</span>
        <span className="zoom-slider__label zoom-slider__label--bottom">−</span>
      </div>
    </div>
  )
}

export default ZoomSlider
