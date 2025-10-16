import React, { useEffect, useState } from 'react'
import FeedbackProgression from './feedback-progression'
import { FeedbackLoop, type FeedbackLoopEvent } from '../../task-deliverable/utils/feedback-loop'

export type FeedbackLoopModProps = {
  size: number
}

const FeedbackLoopMod: React.FC<FeedbackLoopModProps> = ({ size }) => {
  const [ev, setEv] = useState<FeedbackLoopEvent | null>(null)

  useEffect(() => {
    const offProgress = FeedbackLoop.on('progress', setEv)
    const offComplete = FeedbackLoop.on('complete', setEv)
    return () => { offProgress(); offComplete() }
  }, [])

  if (!ev || !ev.active) return null
  return (
    <FeedbackProgression size={size} phaseIndex={ev.phaseIndex} phaseProgress={ev.phaseProgress} />
  )
}

export default FeedbackLoopMod
