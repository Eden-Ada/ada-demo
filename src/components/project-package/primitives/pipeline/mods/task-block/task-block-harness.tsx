import React, { useCallback, useRef, useState } from 'react'
import TaskBlock from './task-block'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../../sandbox-env'
import '../../../vision-primitive/vision-harness.css'

const TaskBlockHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const [descriptor, setDescriptor] = useState<string>('DEFAULT')
  const [variant, setVariant] = useState<1 | 2>(1)
  const [progress, setProgress] = useState<number>(0)
  const onViewChange = useCallback((v: any) => { setView({ pan: v.pan, scale: v.scale }) }, [])

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
        <TaskBlock descriptor={descriptor} percent={progress} variant={variant} />
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Task Block" />
      <ZoomSlider
        onChange={(delta) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
      {/* Side widget for descriptor editing and progress control */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 320,
          background: 'rgba(15,15,15,0.45)',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          backdropFilter: 'blur(10px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Descriptor</div>
        <input
          type="text"
          value={descriptor}
          onChange={(e) => setDescriptor(e.target.value)}
          placeholder="Enter descriptor text"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            outline: 'none',
          }}
        />
        <div style={{ height: 10 }} />
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Arc Style</div>
        <select
          value={variant}
          onChange={(e) => setVariant(parseInt(e.target.value, 10) as 1 | 2)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            outline: 'none',
            width: '100%',
          }}
        >
          <option value={1}>Style 1 — Solid</option>
          <option value={2}>Style 2 — Glow</option>
          {/* Removed Style 3 to match TaskBlock types (1 | 2) */}
        </select>
        <div style={{ height: 10 }} />
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Progress: {progress}%</div>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

export default TaskBlockHarness
