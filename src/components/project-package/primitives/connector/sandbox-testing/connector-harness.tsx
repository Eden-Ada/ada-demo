import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import Connector from '../connector'
import VisionPrimitive from '../../vision-primitive/vision-primitive'
import TaskBlock from '../../pipeline/task-block/task-block'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../sandbox-env'
import { startPathAutoUpdate, type PathPoints } from '../utils/update-path'
import '../../vision-primitive/vision-harness.css'

const ConnectorHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const visionRef = useRef<HTMLDivElement | null>(null)
  const taskRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const [points, setPoints] = useState<PathPoints | null>(null)
  // Node wrappers are static; primitives handle their own long-press/move internally.
  // We observe their transformed positions and recompute connectors continuously.

  const onViewChange = useCallback((v: any) => {
    setView({ pan: v.pan, scale: v.scale })
  }, [])

  useLayoutEffect(() => {
    const stage = stageRef.current
    const a = visionRef.current
    const b = taskRef.current
    if (!stage || !a || !b) return
    const stop = startPathAutoUpdate({ stage, a, b, onChange: setPoints })
    return stop
  }, [view.pan.x, view.pan.y, view.scale])

  // No handlers here: primitives manage long-press/move internally; we only observe.

  return (
    <div className="vision-harness">
      <video className="vision-harness__bg" src="/magenta-mystic-swell.mp4" autoPlay muted loop playsInline preload="metadata" />
      <SandboxViewport ref={sandRef as any} onViewChange={onViewChange}>
        <div ref={stageRef} style={{ position: 'relative', width: 900, height: 600 }}>
          {/* Connectors (behind nodes) */}
          {points ? <Connector orientation={points.orientation} from={points.from} to={points.to} radius={18} width={2.5} color="rgba(255,255,255,0.9)" /> : null}
          {/* Nodes */}
          <div ref={visionRef} data-node-id="vision" style={{ position: 'absolute', left: 220, top: 80 }}>
            <VisionPrimitive state="active" />
          </div>
          <div ref={taskRef} data-node-id="task" style={{ position: 'absolute', left: 560, top: 280 }}>
            <TaskBlock descriptor="DEFAULT" />
          </div>
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Connector Harness" />
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

export default ConnectorHarness
