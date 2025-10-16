import React, { useCallback, useRef, useState } from 'react'
import TaskItem from './task-chip'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../../sandbox-env'
import '../../vision-primitive/vision-harness.css'

const TaskItemHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const onViewChange = useCallback((v: any) => { setView({ pan: v.pan, scale: v.scale }) }, [])
  const [state, setState] = useState<'default' | 'automation' | 'manual' | 'outsource'>('default')

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
        <TaskItem state={state} iconStrokeWidth={0.6} iconAlpha={0.5} />
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Task Item" />
      <ZoomSlider
        onChange={(delta) => {
          const next = sliderValueToScale(delta, 1, 0.25, 2.25)
          sandRef.current?.setScaleAnchored(next)
        }}
      />
      <div className="vision-harness__debug">x: {Math.round(view.pan.x)} | y: {Math.round(view.pan.y)}</div>
      {/* Top toolbar for state selection */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(15,15,15,0.45)',
          color: '#fff',
          backdropFilter: 'blur(10px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.85 }}>Task Item State</span>
        <select
          value={state}
          onChange={(e) => setState(e.target.value as any)}
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
          }}
        >
          <option value="default">default</option>
          <option value="automation">automation</option>
          <option value="manual">manual</option>
          <option value="outsource">outsource</option>
        </select>
      </div>
    </div>
  )
}

export default TaskItemHarness
