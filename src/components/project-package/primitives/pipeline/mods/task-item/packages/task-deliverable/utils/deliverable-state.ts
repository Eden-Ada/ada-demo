import { createStateSwitcher, type Rule } from '../../../utils/state-switcher'
import { FeedbackLoop } from './feedback-loop'

export type DeliverableState = 'idle' | 'feedback' | 'refined'

export type DeliverableContext = {
  phaseIndex: number
  phaseProgress: number
  totalProgress: number
  selectedArc?: 'research' | 'evaluation' | 'deliverable' | null
  arcProgress?: [number, number, number]
}

const initialContext: DeliverableContext = {
  phaseIndex: 0,
  phaseProgress: 0,
  totalProgress: 0,
  selectedArc: null,
  arcProgress: [0, 0, 0],
}

const rules: Rule<DeliverableState, DeliverableContext>[] = [
  { from: ['idle', 'refined'], to: 'feedback', when: (ctx) => ctx.totalProgress > 0 },
  { from: 'feedback', to: 'refined', when: (ctx) => ctx.totalProgress >= 1 },
]

const switcher = createStateSwitcher<DeliverableState, DeliverableContext>('idle', initialContext, rules)

// Bind feedback loop events to the switcher context and evaluation
FeedbackLoop.on('progress', (e) => {
  const arc: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    if (i < e.phaseIndex) arc[i] = 1
    else if (i === e.phaseIndex) arc[i] = Math.max(0, Math.min(1, e.phaseProgress))
    else arc[i] = 0
  }
  switcher.setContext({ phaseIndex: e.phaseIndex, phaseProgress: e.phaseProgress, totalProgress: e.totalProgress, arcProgress: arc })
  switcher.evaluate()
})

FeedbackLoop.on('complete', (e) => {
  switcher.setContext({ phaseIndex: e.phaseIndex, phaseProgress: 1, totalProgress: 1, arcProgress: [1, 1, 1] })
  switcher.evaluate()
})

export const DeliverableState = {
  beginFeedback(perPhaseMs = 900) {
    // Reset context so visuals start clean; state transitions when progress kicks in
    switcher.setContext({ phaseIndex: 0, phaseProgress: 0, totalProgress: 0 })
    FeedbackLoop.start({ perPhaseMs })
  },
  switcher,
}
