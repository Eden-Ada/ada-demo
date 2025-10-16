// Defines and composes TaskChip state behavior and visuals
// Keep this minimal and focused on reusable state-driven logic.

export type TaskChipState = 'default' | 'automation' | 'manual' | 'outsource'

export type ProgressVisuals = {
  show: boolean
  trackColor: string
  progressColor: string
  strokeWidth: number
}

export function getProgressVisuals(state: TaskChipState): ProgressVisuals {
  // Show progress for all non-default states
  const show = state !== 'default'
  // Subtle per-state tinting (can be refined later)
  switch (state) {
    case 'automation':
      return { show, trackColor: 'rgba(255,255,255,0.18)', progressColor: 'rgba(255,255,255,0.95)', strokeWidth: 4 }
    case 'manual':
      return { show, trackColor: 'rgba(255,255,255,0.18)', progressColor: 'rgba(255,255,255,0.95)', strokeWidth: 4 }
    case 'outsource':
      return { show, trackColor: 'rgba(255,255,255,0.18)', progressColor: 'rgba(255,255,255,0.95)', strokeWidth: 4 }
    default:
      return { show, trackColor: 'rgba(255,255,255,0.18)', progressColor: 'rgba(255,255,255,0.95)', strokeWidth: 4 }
  }
}

// Provide a sensible default progress per state for demo/testing.
// This can be replaced by real task runtime progress when available.
export function getDefaultProgress(state: TaskChipState): number {
  switch (state) {
    case 'automation':
      return 0.45
    case 'manual':
      return 0.25
    case 'outsource':
      return 0.15
    default:
      return 0
  }
}
