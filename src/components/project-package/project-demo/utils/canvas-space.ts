// Project Demo - Canvas Space Utility (single util file)
// Computes stage/pane sizing in local content coordinates and helps
// map viewport metrics to content space so components pan/zoom smoothly.

export type CanvasView = {
  viewportW: number
  viewportH: number
  scale: number
}

export type StageLocal = { w: number; h: number }
export type PaneLocal = { w: number; h: number; cx: number; cy: number; left: number; top: number }

/**
 * Compute stage size in LOCAL content coordinates given the current viewport
 * size and canvas scale. Side padding is applied in viewport space, then
 * converted to local by dividing by the scale.
 */
export function computeStageLocal(view: CanvasView, sidePaddingRatio: number, fallback: { w: number; h: number }): StageLocal {
  const s = Math.max(0.0001, view.scale)
  const wLocal = view.viewportW ? (view.viewportW * (1 - 2 * sidePaddingRatio)) / s : fallback.w
  const hLocal = view.viewportH ? view.viewportH / s : fallback.h
  return { w: Math.max(1, Math.round(wLocal)), h: Math.max(1, Math.round(hLocal)) }
}

/**
 * Compute pane size in LOCAL coordinates as a ratio of the stage width,
 * preserving the given aspect ratio (height/width). Pane is centered within
 * the stage.
 */
export function computePaneLocal(stage: StageLocal, paneWidthRatio: number, aspect: number): PaneLocal {
  const w = Math.max(1, Math.round(stage.w * paneWidthRatio))
  const h = Math.max(1, Math.round(w * aspect))
  const cx = Math.round(stage.w / 2)
  const cy = Math.round(stage.h / 2)
  return { w, h, cx, cy, left: Math.round(cx - w / 2), top: Math.round(cy - h / 2) }
}

/** Map viewport center into local coordinates (useful for content placement). */
export function viewportCenterToLocal(pan: { x: number; y: number }, scale: number, viewportW: number, viewportH: number): { x: number; y: number } {
  const s = Math.max(0.0001, scale)
  const x = viewportW ? (viewportW / 2 - pan.x) / s : 0
  const y = viewportH ? (viewportH / 2 - pan.y) / s : 0
  return { x: Math.round(x), y: Math.round(y) }
}
