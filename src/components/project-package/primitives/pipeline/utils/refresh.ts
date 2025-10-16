export type PhaseKey = 'research' | 'evaluation' | 'deliverable'

export type RefreshSnapshot = {
  phaseIndex: number
  phaseProgress: number
  totalProgress: number
  selectedArc: PhaseKey
  arcProgress: [number, number, number]
}

export type RefreshOptions = {
  perPhaseMs?: number
  delayBetweenBlocksMs?: number
}

export type OnUpdate = (index: number, snap: RefreshSnapshot) => void

/**
 * Demo-only sequential refresh across blocks.
 * Advances blocks one-by-one through research → evaluation → deliverable.
 * Returns a cancel function.
 */
export function runSequentialRefresh(
  count: number,
  onUpdate: OnUpdate,
  onBlockStart?: (index: number) => void,
  onBlockComplete?: (index: number) => void,
  opts: RefreshOptions = {}
) {
  const per = opts.perPhaseMs ?? 450
  const between = opts.delayBetweenBlocksMs ?? 350
  let cancelled = false
  let timers: number[] = []

  const clearAll = () => { timers.forEach((t) => clearTimeout(t)); timers = [] }

  const emit = (i: number, phaseIndex: number, phaseProgress: number) => {
    const arcs: [number, number, number] = [0, 0, 0]
    for (let k = 0; k < 3; k++) {
      if (k < phaseIndex) arcs[k] = 1
      else if (k === phaseIndex) arcs[k] = Math.max(0, Math.min(1, phaseProgress))
      else arcs[k] = 0
    }
    const total = (arcs[0] + arcs[1] + arcs[2]) / 3
    const keys: PhaseKey[] = ['research', 'evaluation', 'deliverable']
    onUpdate(i, {
      phaseIndex,
      phaseProgress,
      totalProgress: total,
      selectedArc: keys[phaseIndex],
      arcProgress: arcs,
    })
  }

  const runBlock = (i: number, done: () => void) => {
    if (cancelled) return
    onBlockStart?.(i)
    // 3 phases; simple step animation 0→1
    const steps = 6
    const stepMs = Math.max(1, Math.round(per / steps))
    let phase = 0
    const runPhase = () => {
      if (cancelled) return
      let s = 0
      const tick = () => {
        if (cancelled) return
        emit(i, phase, s / steps)
        if (s >= steps) {
          phase++
          if (phase < 3) timers.push(window.setTimeout(runPhase, 40) as any)
          else {
            onBlockComplete?.(i)
            timers.push(window.setTimeout(done, between) as any)
          }
          return
        }
        s++
        timers.push(window.setTimeout(tick, stepMs) as any)
      }
      tick()
    }
    runPhase()
  }

  // Chain blocks
  const runChain = (i: number) => {
    if (cancelled || i >= count) return
    runBlock(i, () => runChain(i + 1))
  }

  runChain(0)

  return () => { cancelled = true; clearAll() }
}
