import React, { useMemo } from 'react'
import '../styles/feedback-progression.css'

export type FeedbackProgressionProps = {
  size: number
  phaseIndex: number // 0..2
  phaseProgress: number // 0..1
  visible?: boolean
  staticOnly?: boolean
  rotationDeg?: number // rotate the track; default puts a gap at 12 o'clock
  seamEpsilon?: number // tiny nudge to center the top gap visually (px)
  selectedArc?: 'research' | 'evaluation' | 'deliverable' | null
  totalProgress?: number // 0..1, used for center percentage
  arcProgress?: [number, number, number]
}

const FeedbackProgression: React.FC<FeedbackProgressionProps> = ({ size, phaseIndex: _phaseIndex, phaseProgress: _phaseProgress, visible = true, staticOnly: _staticOnly = true, rotationDeg = -90, seamEpsilon = 0.25, selectedArc = null, totalProgress = 0, arcProgress = [0,0,0] }) => {
  const { r, stroke, sFrac, gFrac, baseOffsetFrac } = useMemo(() => {
    const ringStroke = 2
    const radius = size / 2 - 10 - ringStroke / 2 // match outerGap 10
    const circum = 2 * Math.PI * radius
    const gapDeg = 8 // fixed visual gap between segments
    const gFrac = gapDeg / 360
    const sFrac = (1 - 3 * gFrac) / 3
    // Center the seam at 12 o'clock: start the first arc just after half the gap,
    // and compensate for round caps by subtracting half a stroke (as fraction of path length).
    const strokeFrac = ringStroke / circum
    const baseOffsetFrac = (gFrac / 2) - (strokeFrac / 2) + (seamEpsilon / circum)
    return { r: radius, stroke: ringStroke, sFrac, gFrac, baseOffsetFrac }
  }, [size, seamEpsilon])

  // Arc positions (clockwise from the top seam):
  // 0 -> research (top-right)
  // 1 -> evaluation (bottom)
  // 2 -> deliverable (left)
  // If the second and third arcs appear swapped on-screen due to
  // stroke/rotation nuances, swap their offsets to match the visual layout.
  const offsets = [
    baseOffsetFrac,
    baseOffsetFrac + 2 * (sFrac + gFrac), // evaluation (second clockwise)
    baseOffsetFrac + (sFrac + gFrac),     // deliverable (third clockwise)
  ]

  if (!visible) return null

  const segments = [0, 1, 2]

  return (
    <div className="feedback-progression" style={{ width: size, height: size }} aria-hidden>
      <svg className="feedback-progression__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ transform: `rotate(${rotationDeg}deg)`, transformOrigin: '50% 50%' }}>
        {segments.map((i) => {
          const fallbackSel = _phaseIndex ?? 0
          const selIdx = selectedArc === 'research' ? 0 : selectedArc === 'evaluation' ? 1 : selectedArc === 'deliverable' ? 2 : fallbackSel
          const cls = `feedback-progression__seg${selIdx === i ? ' is-selected' : ''}`
          return (
            <circle
              key={`seg-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              className={cls}
              strokeWidth={stroke}
              strokeDasharray={`${sFrac} ${1 - sFrac}`}
              strokeDashoffset={offsets[i]}
              strokeLinecap="round"
              pathLength={1}
              fill="none"
            />
          )
        })}
        {/* Per-arc progress overlays */}
        {segments.map((i) => {
          const prog = Math.max(0, Math.min(1, arcProgress[i] ?? 0))
          if (prog <= 0) return null
          const fallbackSel = _phaseIndex ?? 0
          const selIdx = selectedArc === 'research' ? 0 : selectedArc === 'evaluation' ? 1 : selectedArc === 'deliverable' ? 2 : fallbackSel
          const pCls = `feedback-progression__progress${selIdx === i ? ' is-selected' : ''}`
          return (
            <circle
              key={`prog-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              className={pCls}
              strokeWidth={stroke}
              strokeDasharray={`${sFrac * prog} ${1 - sFrac * prog}`}
              strokeDashoffset={offsets[i]}
              strokeLinecap="round"
              pathLength={1}
              fill="none"
            />
          )
        })}
      </svg>
      {/* Center text overlay */}
      <div className="feedback-progression__center">
        {(() => {
          const selIdx = selectedArc === 'research' ? 0 : selectedArc === 'evaluation' ? 1 : selectedArc === 'deliverable' ? 2 : null
          const pct = selIdx !== null
            ? Math.round(Math.max(0, Math.min(1, (arcProgress[selIdx] ?? 0))) * 100)
            : Math.round(Math.max(0, Math.min(1, totalProgress)) * 100)
          return (
            <>
              <div className="fp-pct">{pct}%</div>
              <div className="fp-task">Task {selectedArc === 'research' ? 1 : selectedArc === 'evaluation' ? 2 : selectedArc === 'deliverable' ? 3 : '—'}/3</div>
              <div className="fp-label">{selectedArc === 'research' ? 'Research' : selectedArc === 'evaluation' ? 'Evaluation' : selectedArc === 'deliverable' ? 'Deliverable' : '—'}</div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default FeedbackProgression
