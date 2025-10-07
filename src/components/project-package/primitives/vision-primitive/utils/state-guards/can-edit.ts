export type VisionState = 'active' | 'locked' | 'done'
export function canEdit(state: VisionState) {
  return state === 'active'
}
