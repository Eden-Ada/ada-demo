export type ArcKey = 'research' | 'evaluation' | 'deliverable'
export const ARC_ORDER: ArcKey[] = ['research', 'evaluation', 'deliverable']

export type ArcProgress = [number, number, number] // fractions 0..1

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function keyToIndex(key: ArcKey): number {
  return ARC_ORDER.indexOf(key)
}

export function indexToKey(i: number): ArcKey {
  return ARC_ORDER[i] as ArcKey
}

// Enforce sequential gating. You cannot edit arc i unless all previous arcs are complete.
// Returns possibly adjusted index (e.g., 1 -> 0 if arc0 not complete) and updated progress.
export function gateSet(progress: ArcProgress, index: number, value01: number): { index: number, progress: ArcProgress } {
  const p: ArcProgress = [...progress] as ArcProgress
  const v = clamp01(value01)
  // Find first incomplete arc
  const firstOpen = p.findIndex(x => x < 1)
  const active = firstOpen === -1 ? 2 : firstOpen
  if (index !== active) {
    // Only the active arc can be edited
    index = active
  }
  p[index] = v
  return { index, progress: p }
}

// Compute total progress across arcs in sequence
export function totalFrom(progress: ArcProgress): number {
  const firstOpen = progress.findIndex(x => x < 1)
  if (firstOpen === -1) return 1
  const completed = firstOpen
  const frac = progress[firstOpen]
  return clamp01((completed + frac) / 3)
}

export function nextIndex(progress: ArcProgress): number {
  const firstOpen = progress.findIndex(x => x < 1)
  return firstOpen === -1 ? 2 : firstOpen
}
