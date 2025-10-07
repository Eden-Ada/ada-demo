export function updateDrag(
  tx: number,
  ty: number,
  last: { x: number; y: number },
  e: any
) {
  const cx = (e as any).clientX as number
  const cy = (e as any).clientY as number
  const dx = cx - last.x
  const dy = cy - last.y
  return {
    tx: tx + dx,
    ty: ty + dy,
    last: { x: cx, y: cy },
  }
}
