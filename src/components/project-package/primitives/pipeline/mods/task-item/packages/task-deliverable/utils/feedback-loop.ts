// Simple feedback loop orchestrator for Research -> Evaluation -> Refinement
// Uses an EventTarget to broadcast progress and phase changes so any mod can subscribe.

export type FeedbackPhase = 'research' | 'evaluation' | 'refinement'

export type FeedbackLoopEvent = {
  id: string
  active: boolean
  phase: FeedbackPhase
  phaseIndex: number // 0..2
  phaseProgress: number // 0..1
  totalProgress: number // 0..1 across all phases
}

export type StartOptions = {
  id?: string
  perPhaseMs?: number
}

const PHASES: FeedbackPhase[] = ['research', 'evaluation', 'refinement']

class FeedbackLoopController {
  private target = new EventTarget()
  private raf: number | null = null
  private startTs: number | null = null
  private opts: Required<StartOptions> = { id: 'default', perPhaseMs: 800 }
  private running = false

  on(type: 'progress' | 'complete', handler: (e: FeedbackLoopEvent) => void) {
    const wrapped = (ev: Event) => handler((ev as CustomEvent<FeedbackLoopEvent>).detail)
    this.target.addEventListener(type, wrapped)
    return () => this.target.removeEventListener(type, wrapped)
  }

  private emit(type: 'progress' | 'complete', detail: FeedbackLoopEvent) {
    this.target.dispatchEvent(new CustomEvent(type, { detail }))
  }

  start(opts?: StartOptions) {
    if (this.running) this.stop()
    this.opts = { id: opts?.id ?? 'default', perPhaseMs: opts?.perPhaseMs ?? 800 }
    this.running = true
    this.startTs = performance.now()
    const tick = (now: number) => {
      if (!this.running || this.startTs == null) return
      const elapsed = now - this.startTs
      const totalMs = this.opts.perPhaseMs * 3
      const clamped = Math.min(elapsed, totalMs)
      const totalProgress = clamped / totalMs
      const phaseFloat = (clamped / this.opts.perPhaseMs)
      const phaseIndex = Math.min(2, Math.floor(phaseFloat))
      const phaseProgress = Math.min(1, phaseFloat - phaseIndex)
      const phase = PHASES[phaseIndex]
      const payload: FeedbackLoopEvent = { id: this.opts.id, active: true, phase, phaseIndex, phaseProgress, totalProgress }
      this.emit('progress', payload)
      if (clamped >= totalMs) {
        this.emit('complete', { ...payload, active: false, phaseProgress: 1, totalProgress: 1 })
        this.stop()
        return
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = null
    this.running = false
    this.startTs = null
  }
}

export const FeedbackLoop = new FeedbackLoopController()
