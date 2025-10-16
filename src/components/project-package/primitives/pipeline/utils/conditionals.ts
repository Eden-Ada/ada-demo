export type TaskBlockMode = 'normal' | 'refresh'

export function initialModes(count: number): TaskBlockMode[] {
  return Array.from({ length: count }).map(() => 'normal')
}

export function setMode(modes: TaskBlockMode[], index: number, mode: TaskBlockMode): TaskBlockMode[] {
  const next = modes.slice()
  next[index] = mode
  return next
}
