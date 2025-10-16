import React, { useState } from 'react'
import TaskDeliverable from '../components/task-deliverable'
import { SandboxViewport, GridOverlay, TestBadge } from '../../../../../../sandbox-env'
import '../../../../../../vision-primitive/vision-harness.css'
import { DeliverableState } from '../utils/deliverable-state'
import { FeedbackLoop } from '../utils/feedback-loop'
import { keyToIndex, type ArcKey } from '../utils/arc-progress'

const TaskDeliverableHarness: React.FC = () => {
  const [feedbackOn, setFeedbackOn] = useState(false)
  const [selectedArc, setSelectedArc] = useState<'research' | 'evaluation' | 'deliverable'>('research')
  const [arcProgress, setArcProgress] = useState<[number, number, number]>([0,0,0])

  const toggleFeedback = (next: boolean) => {
    setFeedbackOn(next)
    if (next) {
      // Force the UI into feedback state (static), no timed loop
      FeedbackLoop.stop()
      const selIdx = keyToIndex(selectedArc as ArcKey)
      const tp = (arcProgress[0] + arcProgress[1] + arcProgress[2]) / 3
      DeliverableState.switcher.goto('feedback', { phaseIndex: selIdx, phaseProgress: arcProgress[selIdx], totalProgress: tp, selectedArc, arcProgress })
    } else {
      FeedbackLoop.stop()
      setArcProgress([0,0,0])
      DeliverableState.switcher.goto('idle', { phaseIndex: 0, phaseProgress: 0, totalProgress: 0, arcProgress: [0,0,0] })
    }
  }

  const onArcChange = (val: 'research' | 'evaluation' | 'deliverable') => {
    setSelectedArc(val)
    // persist selection into context so downstream mods can react
    DeliverableState.switcher.setContext({ selectedArc: val })
  }

  const onProgressChange = (value: number) => {
    // value is 0..100; drive ONLY the selected arc (no auto-advance)
    const selIdx = keyToIndex(selectedArc as ArcKey)
    const next = [...arcProgress] as [number, number, number]
    next[selIdx] = Math.max(0, Math.min(1, value / 100))
    setArcProgress(next)
    const tp = (next[0] + next[1] + next[2]) / 3
    DeliverableState.switcher.setContext({ selectedArc, arcProgress: next, totalProgress: tp, phaseIndex: selIdx, phaseProgress: next[selIdx] })
  }

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
      {/* Debug panel (fixed, top-right of harness viewport) */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 10, padding: '10px 12px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minWidth: 260 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={feedbackOn} onChange={(e) => toggleFeedback(e.currentTarget.checked)} />
          <span>Feedback Loop (debug)</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ opacity: 0.9, fontSize: 12 }}>Selected Arc:</span>
          <select
            value={selectedArc}
            onChange={(e) => onArcChange(e.currentTarget.value as 'research' | 'evaluation' | 'deliverable')}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}
          >
            <option value="research">research</option>
            <option value="evaluation">evaluation</option>
            <option value="deliverable">deliverable</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ opacity: 0.9, fontSize: 12 }}>Arc progress</span>
            <span style={{ opacity: 0.85, fontSize: 12 }}>selected: {selectedArc}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((arcProgress[keyToIndex(selectedArc as ArcKey)] ?? 0) * 100)}
            onChange={(e) => onProgressChange(e.currentTarget.valueAsNumber)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <SandboxViewport>
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
          <TaskDeliverable diameter={220} demoVideoSrc="/rainbow-flow.mp4" refreshDiameterPx={80} />
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Task Deliverable Harness" />
    </div>
  )
}

export default TaskDeliverableHarness
