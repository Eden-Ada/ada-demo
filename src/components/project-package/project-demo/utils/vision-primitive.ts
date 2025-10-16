// Project Demo - Vision Primitive Orchestrator (single util file)
// Centralizes interaction state, sizing hints, and guards for the Vision Primitive
// used within the Canvas Space.

export type VisionMode = 'active' | 'locked' | 'done'

export type VisionOrchestratorState = {
  mode: VisionMode
  // Editing and movement gates (UI-level toggles)
  editing: boolean
  locked: boolean
  // Local offsets inside the pane (content coordinates)
  tx: number
  ty: number
  // External scale hint (Canvas Space scale)
  scale: number
}

export type VisionOptions = Partial<Pick<VisionOrchestratorState, 'mode' | 'editing' | 'locked' | 'tx' | 'ty' | 'scale'>>

export function createVisionState(options: VisionOptions = {}): VisionOrchestratorState {
  return {
    mode: options.mode ?? 'active',
    editing: options.editing ?? false,
    locked: options.locked ?? false,
    tx: options.tx ?? 0,
    ty: options.ty ?? 0,
    scale: options.scale ?? 1,
  }
}

export function clampOffsets(tx: number, ty: number, paneW: number, paneH: number, pad = 0): { tx: number; ty: number } {
  const maxX = Math.max(0, (paneW / 2) - pad)
  const maxY = Math.max(0, (paneH / 2) - pad)
  return {
    tx: Math.max(-maxX, Math.min(maxX, tx)),
    ty: Math.max(-maxY, Math.min(maxY, ty)),
  }
}

export function deriveVisionProps(state: VisionOrchestratorState): { state: VisionMode } {
  if (state.locked) return { state: 'locked' }
  return { state: state.mode }
}

export function updateScale(prev: VisionOrchestratorState, scale: number): VisionOrchestratorState {
  return { ...prev, scale }
}
