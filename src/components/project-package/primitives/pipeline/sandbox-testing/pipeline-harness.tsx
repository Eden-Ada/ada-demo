import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import Pipeline from '../pipeline'
import Connector from '../../connector/connector'
import { SandboxViewport, ZoomSlider, GridOverlay, TestBadge, sliderValueToScale } from '../../sandbox-env'
import '../../vision-primitive/vision-harness.css'
import { makeSequence } from '../utils/sequence'

const PipelineHarness: React.FC = () => {
  const sandRef = useRef<{ setScaleAnchored: (next: number) => void; getView: () => { pan: { x: number; y: number }; scale: number } } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<{ pan: { x: number; y: number }; scale: number }>({ pan: { x: 0, y: 0 }, scale: 1 })
  const onViewChange = useCallback((v: any) => setView({ pan: v.pan, scale: v.scale }), [])

  // Sample sequence
  const entries = makeSequence([
    'Define core app scope',
    'Design UI + flows',
    'Build MVP',
    'Recruit alpha users',
  ])

  // Element pairs to connect (computed from DOM)
  const [pairs, setPairs] = useState<Array<{ a: HTMLElement; b: HTMLElement }>>([])

  // Compute adjacent element pairs whenever the DOM or view changes
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const els = Array.from(stage.querySelectorAll<HTMLElement>('.pipeline .task-block'))
    const nextPairs: Array<{ a: HTMLElement; b: HTMLElement }> = []
    for (let i = 0; i < els.length - 1; i++) nextPairs.push({ a: els[i], b: els[i + 1] })
    setPairs(nextPairs)
  }, [entries.length, view.pan.x, view.pan.y, view.scale])

  return (
    <div className="vision-harness">
      <video className="vision-harness__bg" src="/magenta-mystic-swell.mp4" autoPlay muted loop playsInline preload="metadata" />
      <SandboxViewport ref={sandRef as any} onViewChange={onViewChange}>
        <div ref={stageRef} style={{ position: 'relative', width: 1100, minHeight: 360 }}>
          {/* Connectors (auto mode) */}
          {pairs.map((pair, i) => (
            <Connector
              key={i}
              stageEl={stageRef.current}
              fromEl={pair.a}
              toEl={pair.b}
              radius={18}
              width={2.5}
              color="rgba(255,255,255,0.9)"
            />
          ))}
          {/* Nodes (left-to-right) */}
          <Pipeline entries={entries} spacing="roomy" />
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Pipeline Harness" />
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

export default PipelineHarness
