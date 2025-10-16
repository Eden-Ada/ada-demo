import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import '../styles/task-deliverable.css'
import '../styles/feedback-animation.css'
import Connector from '../../../../../../connector/connector'
import RefreshActivation from '../mods/refresh-activation'
import { DeliverableState } from '../utils/deliverable-state'
import FeedbackProgression from '../mods/feedback-progression'
import { FeedbackLoop } from '../utils/feedback-loop'

export type TaskDeliverableProps = {
  diameter?: number // px
  label?: string
  demoVideoSrc?: string // demo-only: background video beneath glass pane
  refreshScale?: number // 0..1 fraction of deliverable diameter
  refreshDiameterPx?: number // absolute override
}

const TaskDeliverable: React.FC<TaskDeliverableProps> = ({ diameter = 220, label, demoVideoSrc = '/aqua-swirl.mp4', refreshScale = 0.54, refreshDiameterPx }) => {
  const d = Math.max(120, Math.min(420, diameter))
  const stageRef = useRef<HTMLDivElement | null>(null)
  const leftRef = useRef<HTMLDivElement | null>(null)
  const rightRef = useRef<HTMLDivElement | null>(null)
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => { setStageEl(stageRef.current) }, [])

  const rf = Math.max(48, Math.round(refreshDiameterPx ?? (d * refreshScale))) // tunable or absolute size
  const gap = Math.round(d * 0.5) // visual spacing between orbs

  // Subscribe to deliverable state machine to toggle feedback UI
  const [dlState, setDlState] = useState<'idle' | 'feedback' | 'refined'>(DeliverableState.switcher.state as any)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [selectedArc, setSelectedArc] = useState<'research' | 'evaluation' | 'deliverable' | null>(null)
  const [totalProgress, setTotalProgress] = useState(0)
  const [arcProgress, setArcProgress] = useState<[number, number, number]>([0,0,0])
  const [pressingRefresh, setPressingRefresh] = useState(false)
  const [releasePhase, setReleasePhase] = useState<'none' | 'orb' | 'connector'>('none')
  const [feedbackEntering, setFeedbackEntering] = useState(false)
  useEffect(() => {
    const onChange = (p: any) => {
      setDlState(p.next)
      const ctx = p.context || DeliverableState.switcher.context
      setPhaseIndex(ctx?.phaseIndex ?? 0)
      setPhaseProgress(ctx?.phaseProgress ?? 0)
      setSelectedArc(ctx?.selectedArc ?? null)
      setTotalProgress(ctx?.totalProgress ?? 0)
      setArcProgress(ctx?.arcProgress ?? [0,0,0])
    }
    const onEval = (p: any) => {
      const ctx = p.context || DeliverableState.switcher.context
      setDlState(p.next)
      setPhaseIndex(ctx?.phaseIndex ?? 0)
      setPhaseProgress(ctx?.phaseProgress ?? 0)
      setSelectedArc(ctx?.selectedArc ?? null)
      setTotalProgress(ctx?.totalProgress ?? 0)
      setArcProgress(ctx?.arcProgress ?? [0,0,0])
    }
    const off1 = DeliverableState.switcher.on('change', onChange)
    const off2 = DeliverableState.switcher.on('evaluate', onEval)
    // seed from current
    setDlState(DeliverableState.switcher.state as any)
    const ctx = DeliverableState.switcher.context as any
    setPhaseIndex(ctx?.phaseIndex ?? 0)
    setPhaseProgress(ctx?.phaseProgress ?? 0)
    setSelectedArc(ctx?.selectedArc ?? null)
    setTotalProgress(ctx?.totalProgress ?? 0)
    setArcProgress(ctx?.arcProgress ?? [0,0,0])
    return () => { off1(); off2() }
  }, [])

  return (
    <div
      className="task-deliverable-pair"
      ref={stageRef}
      style={{ ['--pair-td-d' as any]: `${d}px`, ['--rf-d' as any]: `${rf}px`, ['--pair-gap' as any]: `${gap}px` }}
    >
      {/* Left: Deliverable orb */}
      <div ref={leftRef} className="task-deliverable-node pair__left" style={{ ['--td-d' as any]: `${d}px` }} aria-label={label ? `Deliverable ${label}` : 'Deliverable node'}>
        {dlState === 'feedback' ? (
          // Replace inner media and glass with the segmented feedback arc
          <div className={`task-deliverable-node__feedback${feedbackEntering ? ' feedback-enter' : ''}`} aria-hidden style={{ position: 'absolute', left: 15, top: 15, width: d - 30, height: d - 30 }}>
            <FeedbackProgression staticOnly seamEpsilon={0} size={d - 30} phaseIndex={phaseIndex} phaseProgress={phaseProgress} selectedArc={selectedArc} totalProgress={totalProgress} arcProgress={arcProgress} />
          </div>
        ) : (
          <>
            <div className="task-deliverable-node__media" aria-hidden>
              <video
                className="task-deliverable-node__video"
                src={demoVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
            <div className="task-deliverable-node__inner" aria-hidden />
            <div className="task-deliverable-node__label" aria-hidden>
              <span className="task-deliverable-node__label-text">Deliverable Task<br/>Item Asset</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Refresh orb appears before entering feedback; during release it stays visible to animate out */}
      {(dlState !== 'feedback' || releasePhase !== 'none') && (
        <div ref={rightRef} className="pair__right" aria-label="Reiteration">
          <RefreshActivation
            className={releasePhase !== 'none' ? 'release-anim-orb' : ''}
            diameter={rf}
            onComplete={() => {
              // Static feedback mode: no timed auto-progression
              FeedbackLoop.stop()
              // Trigger sequential release: orb first (half), then connector (half)
              setReleasePhase('orb')
              // Apply feedback-enter BEFORE switching so overlay mounts blank (no blink)
              setFeedbackEntering(true)
              // Defer the state switch to the next frame to avoid clashing with release classes
              requestAnimationFrame(() => {
                DeliverableState.switcher.goto('feedback', {
                  phaseIndex: 0,
                  phaseProgress: 0,
                  totalProgress: 0,
                  selectedArc: 'research',
                  arcProgress: [0, 0, 0],
                })
              })
              // After orb shrink completes, clear release entirely (connector fades in tandem)
              const orbMs = 400
              const fadeMs = 2100
              window.setTimeout(() => setReleasePhase('none'), orbMs)
              window.setTimeout(() => setFeedbackEntering(false), fadeMs)
            }}
            onActiveChange={(active) => setPressingRefresh(active)}
          >
            <div className="refresh-orb">
              <div className="refresh-orb__icon" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw-icon lucide-refresh-ccw">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
              </div>
            </div>
          </RefreshActivation>
        </div>
      )}

      {/* Connector: visible until feedback begins; during release it shrinks in tandem with orb */}
      {(dlState !== 'feedback' || releasePhase !== 'none') && stageEl && leftRef.current && rightRef.current && (
        <Connector
          stageEl={stageEl}
          fromEl={leftRef.current}
          toEl={rightRef.current}
          fromSide="right"
          toSide="left"
          orientation="horizontal"
          overlay="stage"
          color="rgba(255,255,255,0.9)"
          width={2.5}
          dashArray="2 6"
          radius={0}
          className={releasePhase !== 'none' ? 'connector-release-anim' : ''}
          flow={pressingRefresh || releasePhase !== 'none' ? 'none' : 'forward'}
        />
      )}
    </div>
  )
}

export default TaskDeliverable
