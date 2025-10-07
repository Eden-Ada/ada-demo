import React, { useCallback, useRef, useState } from 'react'
import VisionPrimitive from './vision-primitive'
import { SandboxViewport } from '../sandbox-env'
import { ZoomSlider } from '../sandbox-env'
import { GridOverlay } from '../sandbox-env'
import { TestBadge } from '../sandbox-env'
import { sliderValueToScale } from '../sandbox-env'
import './vision-harness.css'

// Fullscreen harness with background video + centralized sandbox viewport
const VisionHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const onViewChange = useCallback((v: any) => {
    setView({ pan: v.pan, scale: v.scale })
  }, [])

  return (
    <div className="vision-harness">
      <video
        className="vision-harness__bg"
        src="/magenta-mystic-swell.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <SandboxViewport ref={sandRef as any} onViewChange={onViewChange}>
        <VisionPrimitive state="active" />
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Vision Primitive" />
      {/* Right-side zoom slider */}
      <ZoomSlider
        onChange={(delta) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      {/* Debug overlay for pan values */}
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
    </div>
  )
}

export default VisionHarness
