export const COMPLETION_THRESHOLD = 100

export function isComplete(percent: number, threshold: number = COMPLETION_THRESHOLD): boolean {
  return (percent ?? 0) >= threshold
}

export function completionTextAlpha(
  percent: number,
  completedAlpha: number = 0.5,
  normalAlpha: number = 1,
  threshold: number = COMPLETION_THRESHOLD,
): number {
  return isComplete(percent, threshold) ? completedAlpha : normalAlpha
}
