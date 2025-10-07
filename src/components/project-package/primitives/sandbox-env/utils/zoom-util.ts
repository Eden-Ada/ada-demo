export type Pan = { x: number; y: number }

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Convert slider value (delta around base) to absolute scale. */
export function sliderValueToScale(
  sliderValue: number,
  base = 1,
  minScale = 0.25,
  maxScale = 2.25
): number {
  return clamp(base + sliderValue, minScale, maxScale)
}

/**
 * Compute new pan so that the given viewport-space anchor (ax, ay)
 * stays visually fixed when changing scale from s -> sNext.
 */
export function zoomAtPoint(
  pan: Pan,
  s: number,
  sNext: number,
  ax: number,
  ay: number
): { pan: Pan; scale: number } {
  if (sNext === s) return { pan, scale: s }
  const localX = (ax - pan.x) / s
  const localY = (ay - pan.y) / s
  const nextPanX = ax - localX * sNext
  const nextPanY = ay - localY * sNext
  return { pan: { x: nextPanX, y: nextPanY }, scale: sNext }
}

/**
 * Center-anchored zoom: anchor is the center of the provided viewport element.
 */
export function zoomAtViewportCenter(
  viewportEl: HTMLElement,
  pan: Pan,
  s: number,
  sNext: number
): { pan: Pan; scale: number } {
  const rect = viewportEl.getBoundingClientRect()
  const ax = rect.left + rect.width / 2
  const ay = rect.top + rect.height / 2
  return zoomAtPoint(pan, s, sNext, ax, ay)
}
