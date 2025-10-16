// instance.ts — utility for rendering multiple TaskItem instances and preparing
// connector-friendly metadata (anchors and link planning).
// Kebab-case filename per user preference.

export type InstanceLayoutInput = {
  count: number
  itemHeight: number // measured TaskItem height (unscaled)
  scale?: number // visual scale applied uniformly to each instance (default 1)
  spacing?: number // vertical spacing in px between scaled instances (default 80)
  origin?: { x: number; y: number } // stack center in stage coords (default 0,0)
}

export type InstanceTransform = { tx: number; ty: number; scale: number }

/**
 * Compute a centered vertical stack of TaskItem instances. Returns per-instance
 * transforms that you can apply to each instance container:
 *   style={{ transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})` }}
 */
export function computeInstanceLayout(inp: InstanceLayoutInput): InstanceTransform[] {
  const count = Math.max(0, Math.floor(inp.count))
  const s = inp.scale ?? 1
  const spacing = inp.spacing ?? 80
  const h = Math.max(1, inp.itemHeight) * s
  const origin = inp.origin ?? { x: 0, y: 0 }

  const totalHeight = count * h + Math.max(0, count - 1) * spacing
  const topOffset = -totalHeight / 2 + h / 2

  const out: InstanceTransform[] = []
  for (let i = 0; i < count; i++) {
    const ty = topOffset + i * (h + spacing)
    out.push({ tx: origin.x, ty: origin.y + ty, scale: s })
  }
  return out
}

// Anchor types mirrored from TaskItem.exposeAnchors payload
export type TaskInstanceAnchors = {
  stageEl?: HTMLElement | null
  chipEl: HTMLElement | null
  labelEl: HTMLElement | null
}

export type AnchorSide = 'left' | 'right' | 'top' | 'bottom'

export type InterInstanceLink = {
  ai: number // index of source instance
  bi: number // index of target instance (typically ai+1)
  fromEl: HTMLElement
  toEl: HTMLElement
  fromSide: AnchorSide
  toSide: AnchorSide
}

/**
 * Plan vertical links between successive instances using the same semantics as
 * the internal TaskItem connector: label(bottom) -> next chip(top).
 * Only returns links when both elements are present and connected in DOM.
 */
export function computeInterInstanceLinks(
  anchors: Array<TaskInstanceAnchors | undefined>
): InterInstanceLink[] {
  const links: InterInstanceLink[] = []
  const n = anchors.length
  for (let i = 0; i < n - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    const fromEl = a?.labelEl ?? null
    const toEl = b?.chipEl ?? null
    if (!fromEl || !toEl) continue
    if (!fromEl.isConnected || !toEl.isConnected) continue
    links.push({ ai: i, bi: i + 1, fromEl, toEl, fromSide: 'bottom', toSide: 'top' })
  }
  return links
}

/**
 * Helper: create an empty anchors bucket sized for `count` instances.
 */
export function createAnchorsBucket(count: number): Array<TaskInstanceAnchors | undefined> {
  return Array.from({ length: Math.max(0, Math.floor(count)) })
}

/**
 * Helper: set anchors for a given instance index.
 */
export function setInstanceAnchors(
  bucket: Array<TaskInstanceAnchors | undefined>,
  index: number,
  a: TaskInstanceAnchors
): void {
  bucket[index] = a
}

/**
 * Usage example (inside a sandbox/harness):
 *
 * const anchorsRef = useRef(createAnchorsBucket(count))
 * <TaskItem exposeAnchors={(a) => { setInstanceAnchors(anchorsRef.current, i, a); setVersion(v=>v+1) }} />
 * const links = computeInterInstanceLinks(anchorsRef.current)
 * // Render <Connector> for each link with fromSide/toSide per link record.
 */
