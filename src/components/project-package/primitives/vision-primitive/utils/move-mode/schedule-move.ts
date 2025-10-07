export function scheduleMoveActivation(
  e: any,
  onActivate: (info: { x: number; y: number; pointerId: number }) => void
): () => void {
  const LONG_PRESS_MS = 3000
  const px = (e as any).clientX as number
  const py = (e as any).clientY as number
  const pid = (e as any).pointerId as number
  const timer = window.setTimeout(() => {
    onActivate({ x: px, y: py, pointerId: pid })
  }, LONG_PRESS_MS)
  return () => window.clearTimeout(timer)
}
