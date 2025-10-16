import React, { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Connector from '../../../../connector/connector'

export type TaskNodeAnchors = { stageEl?: HTMLElement | null; chipEl: HTMLElement | null; labelEl: HTMLElement | null }

export type ConnectorRenderProps = {
  stageEl: HTMLElement | null
  anchors: Array<TaskNodeAnchors | undefined>
  zIndex?: number
  stroke?: string
  width?: number
  dashArray?: string
  // When true, we force chip TOP -> next label BOTTOM using Connector deterministic sides
  deterministic?: boolean
  // Increment this when anchors mutate to force recalculation (useful when passing anchorsRef.current)
  version?: number
  overlay?: 'stage' | 'viewport'
  svgStyle?: React.CSSProperties
}

// Deterministic: compose Connector with explicit sides
const DeterministicLinks: React.FC<ConnectorRenderProps> = ({ stageEl, anchors, zIndex = 9999, stroke, width, dashArray, overlay = 'stage', svgStyle }) => {
  if (!stageEl) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex, pointerEvents: 'none' }}>
      {anchors.map((a, i) => {
        const b = anchors[i + 1]
        if (!a?.labelEl || !b?.chipEl) return null
        if (!a.labelEl.isConnected || !b.chipEl.isConnected) return null
        return (
          <Connector
            key={`node-link-${i}`}
            stageEl={stageEl}
            fromEl={a.labelEl}
            toEl={b.chipEl}
            fromSide="bottom"
            toSide="top"
            orientation="vertical"
            flow="reverse"
            color={stroke}
            width={width}
            dashArray={dashArray}
            overlay={overlay}
            svgStyle={svgStyle}
          />
        )
      })}
    </div>
  )
}

// Fallback SVG: compute points each frame
const SVGLinks: React.FC<ConnectorRenderProps> = ({ stageEl, anchors, zIndex = 9999, stroke, width, dashArray, version = 0 }) => {
  const [lines, setLines] = useState<Array<{ x: number; y1: number; y2: number }>>([])
  useLayoutEffect(() => {
    let raf = 0
    const tick = () => {
      // We'll draw in viewport coords (portal to body); no stage-space conversion
      const next: Array<{ x: number; y1: number; y2: number }> = []
      const scope: ParentNode = stageEl ?? document
      const nodes = Array.from(scope.querySelectorAll('.task-item-node')) as HTMLElement[]
      const resolvePair = (idx: number): { chip: HTMLElement | null; label: HTMLElement | null } => {
        const a = anchors[idx]
        const b = anchors[idx + 1]
        let chip: HTMLElement | null = a?.chipEl ?? null
        let label: HTMLElement | null = b?.labelEl ?? null
        if (!chip || !label) {
          try {
            const an = nodes[idx]
            const bn = nodes[idx + 1]
            if (!chip && an) chip = an.querySelector('.task-item') as HTMLElement | null
            if (!label && bn) label = bn.querySelector('.label-post') as HTMLElement | null
          } catch {}
        }
        return { chip, label }
      }
      const pairCount = Math.max(0, Math.max(anchors.length, nodes.length) - 1)
      for (let i = 0; i < pairCount; i++) {
        const { chip, label } = resolvePair(i)
        if (!chip || !label) continue
        const cr = chip.getBoundingClientRect()
        const lr = label.getBoundingClientRect()
        const x = cr.left + cr.width / 2
        const y1 = cr.top + 4
        const y2 = lr.bottom - 4
        next.push({ x, y1, y2 })
      }
      setLines(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stageEl, version, anchors])
  if (!lines.length) return null
  const svg = (
    <svg aria-hidden="true" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex }}>
      {lines.map((l, idx) => (
        <path key={`svg-line-${idx}`} d={`M ${l.x} ${l.y1} L ${l.x} ${l.y2}`} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dashArray} />
      ))}
    </svg>
  )
  return createPortal(svg, document.body)
}

// Wrapper that defaults to deterministic Connector usage. The SVG fallback is only
// used when explicitly requested with deterministic={false}.
const ConnectorRender: React.FC<ConnectorRenderProps> = (props) => {
  if (!props.stageEl) return null
  const useDeterministic = props.deterministic !== false
  return useDeterministic ? <DeterministicLinks {...props} /> : <SVGLinks {...props} />
}

export default ConnectorRender
