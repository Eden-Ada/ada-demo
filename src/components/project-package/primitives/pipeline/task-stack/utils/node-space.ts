// node-space: utility to compute reveal spacing for stacked nodes above the block
// Keeps the first node at a precise gap above the block, and every subsequent
// node separated by the same gap (after scaling), with optional visual trims.

export type NodeSpaceConfig = {
  blockHeight: number
  nodeHeight: number
  scale?: number       // visual downscale applied to each node (default 0.75)
  gap?: number         // target visual gap in px between block top ↔ first node, and between nodes (default 4)
  trimTop?: number     // subtract from the top gap (compensate for shadows/glow) default 0
  trimBetween?: number // subtract from the inter-node gap (compensate for shadows/glow) default 0
}

export type NodeSpace = {
  scale: number
  gap: number
  liftPx: number      // center-to-center upward shift for the first node from the block center
  spacingPx: number   // center-to-center spacing between successive nodes
  scaledNodeHeight: number
}

export function computeNodeSpace(cfg: NodeSpaceConfig): NodeSpace {
  const scale = cfg.scale ?? 0.75
  const gap = cfg.gap ?? 4
  const trimTop = cfg.trimTop ?? 0
  const trimBetween = cfg.trimBetween ?? 0

  const scaledNodeHeight = Math.round(cfg.nodeHeight * scale)
  // Allow negative effective gaps to compensate for visual extensions (shadows/glow)
  const effectiveTopGap = gap - trimTop
  const effectiveBetweenGap = gap - trimBetween

  // Place first node so its bottom edge is exactly 'effectiveTopGap' above the block's top edge.
  // With our centered coordinate system:
  // lift = blockH/2 + scaledH/2 + effectiveTopGap
  const liftPx = Math.round(cfg.blockHeight / 2 + scaledNodeHeight / 2 + effectiveTopGap)

  // Maintain the same visual gap between nodes after scaling
  const spacingPx = Math.round(scaledNodeHeight + effectiveBetweenGap)

  return { scale, gap, liftPx, spacingPx, scaledNodeHeight }
}
