export function beginDrag(e: PointerEvent | React.PointerEvent) {
  const last = { x: (e as any).clientX as number, y: (e as any).clientY as number }
  const pointerId = (e as any).pointerId as number
  return { dragging: true as const, last, pointerId }
}
