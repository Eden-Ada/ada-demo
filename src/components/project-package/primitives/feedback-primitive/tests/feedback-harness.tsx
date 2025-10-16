import React, { useCallback, useRef, useState } from 'react'
import FeedbackPrimitive from '../feedback-primitive'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../sandbox-env'
import '../../vision-primitive/vision-harness.css'

const FeedbackHarness: React.FC = () => {
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
        <FeedbackPrimitive onSend={(t) => {
          // basic harness hook for manual testing
          // eslint-disable-next-line no-console
          console.log('feedback-send', t)
        }} />
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Feedback Primitive" />
      <ZoomSlider
        onChange={(delta) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
    </div>
  )
}

export default FeedbackHarness
