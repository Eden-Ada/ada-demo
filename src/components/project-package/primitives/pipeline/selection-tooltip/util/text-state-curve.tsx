import React from 'react'
import { buildBottomArcPath } from '../../task-chip/utils/circular-text'

export type CurvedStateLabelProps = {
  circleRef: React.RefObject<HTMLElement | null>
  label: string
  className?: string
}

// Renders the label along a concentric bottom arc inside the provided circle element.
// - Uses a fixed pixel gap from the ring so the radius matches visually with no side offset
// - Computes the minimum span required so the full word fits, and centers it at the bottom
export const CurvedStateLabel: React.FC<CurvedStateLabelProps> = ({ circleRef, label, className = 'selection-tooltip__curve-text' }) => {
  const [size, setSize] = React.useState<number>(0)
  const [insetExtra, setInsetExtra] = React.useState<number>(0)
  const [pathD, setPathD] = React.useState<string>('')
  const [startPx, setStartPx] = React.useState<string>('50%')
  const [fitLen, setFitLen] = React.useState<number | null>(null)
  const [fontSizePx, setFontSizePx] = React.useState<number | null>(null)
  const pathRef = React.useRef<SVGPathElement | null>(null)
  const textMeasureRef = React.useRef<SVGTextElement | null>(null)
  const pathId = React.useMemo(() => `tsc-${Math.random().toString(36).slice(2)}`, [])
  const display = React.useMemo(() => label.toUpperCase(), [label])

  // 1) Measure circle once it mounts
  React.useLayoutEffect(() => {
    const el = circleRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const w = Math.round(rect.width)
    if (w > 0) setSize(w)
    // Read optional CSS var to fine-tune bottom spacing beneath the curved text
    const css = window.getComputedStyle(el)
    const raw = css.getPropertyValue('--curve-inset-extra') || '0'
    const extra = parseFloat(raw) || 0
    setInsetExtra(extra)
  }, [circleRef])

  // 2) Build the exact bottom arc path using task-item's buildBottomArcPath (defaults: inset=24, yOffset=4)
  React.useLayoutEffect(() => {
    if (!size) return
    // First, create default path so initial paint works (respect extra inset)
    setPathD(buildBottomArcPath({ size, inset: 24 + insetExtra }))

    // Then measure text and analytically widen the arc if necessary:
    // L = r_text * (PI - 2*asin(yOffset / r_text)) with r_text = size/2 - inset
    queueMicrotask(() => {
      const m = textMeasureRef.current
      if (!m) return
      try {
        const textLen = m.getComputedTextLength()
        const PI = Math.PI
        const margin = 6
        let inset = 24 + insetExtra
        let y = 4
        const minInset = 4

        const arcLen = (insetVal: number, yVal: number) => {
          const rText = size / 2 - insetVal
          if (rText <= 0) return 0
          const ratio = Math.min(1, Math.max(-1, yVal / rText))
          const theta = PI - 2 * Math.asin(ratio)
          return rText * theta
        }

        // Step A: drop y toward 0 (up to a semicircle) if needed
        if (arcLen(inset, y) < textLen + margin) {
          y = 0
        }

        // Step B: expand radius by decreasing inset until it fits or hits minInset
        let guard = 0
        while (guard < 8 && arcLen(inset, y) < textLen + margin && inset > minInset) {
          inset = Math.max(minInset, inset - 2)
          guard++
        }

        setPathD(buildBottomArcPath({ size, inset, yOffset: y }))
      } catch {
        // ignore and keep default path
      }
    })
  }, [size, display, insetExtra])

  // 3) Center text along that path using px startOffset for exact centering
  React.useLayoutEffect(() => {
    const p = pathRef.current
    const m = textMeasureRef.current
    if (!p || !m) return
    try {
      const pathLen = p.getTotalLength()
      let textLen = m.getComputedTextLength()
      // Prefer scaling font-size to keep glyphs readable before applying textLength compression
      const baseFontPx = parseFloat(getComputedStyle(m).fontSize || '13') || 13
      if (textLen > pathLen) {
        const target = Math.max(0, pathLen - 6)
        const scale = Math.max(0.7, Math.min(1, target / Math.max(1, textLen)))
        const newPx = Math.round(baseFontPx * scale)
        if (!fontSizePx || Math.abs(newPx - fontSizePx) >= 1) {
          setFontSizePx(newPx)
          // let the DOM update font-size, then this effect will re-run and re-measure
          return
        }
        // If we already scaled and still don't fit, fallback to compression
        if (textLen > pathLen) {
          setFitLen(target)
          setStartPx('50%')
          return
        }
      } else {
        setFitLen(null)
      }
      // re-measure if we just scaled
      if (fontSizePx) {
        textLen = m.getComputedTextLength()
      }
      setStartPx('50%')
    } catch {
      setStartPx('50%')
    }
  }, [pathD, display, fontSizePx])

  if (!size) return null

  return (
    <svg className="selection-tooltip__curve-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path ref={pathRef} id={pathId} d={pathD} fill="none" stroke="none" />
      {/* Hidden straight text to measure exact length with same font */}
      <text ref={textMeasureRef} className={className} opacity={0} style={fontSizePx ? { fontSize: `${fontSizePx}px` } : undefined}>{display}</text>
      <text className={className} style={fontSizePx ? { fontSize: `${fontSizePx}px` } : undefined}>
        <textPath
          href={`#${pathId}`}
          xlinkHref={`#${pathId}`}
          startOffset={startPx}
          textAnchor="middle"
          {...(fitLen ? { textLength: fitLen, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
        >
          {display}
        </textPath>
      </text>
    </svg>
  )
}
