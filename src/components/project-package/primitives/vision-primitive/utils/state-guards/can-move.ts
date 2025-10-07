export type VisionState = 'active' | 'locked' | 'done'
export function canMove(state: VisionState) {
  return state !== 'locked'
}
