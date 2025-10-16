// label-sizing: computes outer block sizing and margins for the glassmorphic label
// Also performs text wrapping via text-render so callers can render lines directly.

import { renderTextWrap } from './text-render'

export type LabelSize = 'sm' | 'md' | 'lg'

export type LabelSizingOptions = {
  text: string
  size?: LabelSize
  width?: number            // desired outer width in px (excluding margins)
  hPadding?: number         // horizontal padding applied inside the block (px)
  marginX?: number          // left/right margin (px) to keep around the block (default 5)
  maxLines?: number         // max wrapped lines
  fontWeight?: number       // weight for wrapping metrics
  balanceTwoLines?: boolean // if true and maxLines>=2, prefer a 2-line split that balances widths
  targetCharsPerLine?: number // preferred char cap per line
}

export type LabelSizingResult = {
  width: number                 // outer width (excluding margins)
  contentWidth: number          // width available to text after padding
  marginLeft: number
  marginRight: number
  lines: string[]
  lineHeight: number
  fontSize: number
}

const SIZE_TO_FONT: Record<LabelSize, number> = { sm: 12, md: 14, lg: 16 }

// local measurement to compute pixel width of a string given font
let _canvas: HTMLCanvasElement | null = null
let _ctx: CanvasRenderingContext2D | null = null
function measureWidth(text: string, font: string): number {
  if (!_canvas) {
    _canvas = document.createElement('canvas')
    _canvas.width = 1
    _canvas.height = 1
    _ctx = _canvas.getContext('2d')
  }
  const ctx = _ctx!
  ctx.font = font
  return ctx.measureText(text).width
}

function buildFont(fontSize: number, fontWeight?: number): string {
  const family = `'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, sans-serif`
  const weight = fontWeight ?? 320
  return `${weight} ${fontSize}px ${family}`
}

export function computeLabelSizing(opts: LabelSizingOptions): LabelSizingResult {
  const size: LabelSize = opts.size ?? 'md'
  const hPadding = 15 // must match CSS .label-post--block padding (uniform 15px)
  const marginX = opts.marginX ?? 0
  const fontSize = SIZE_TO_FONT[size]
  const font = buildFont(fontSize, opts.fontWeight)
  const letterSpacingPx = 0.2 // must match CSS .label-post letter-spacing
  const rawText = String(opts.text ?? '').trim()
  // Delegate wrapping to text-render with balanced two-line logic by default
  const wrap = renderTextWrap({
    text: rawText,
    maxWidth: Number.POSITIVE_INFINITY,
    fontSize,
    fontWeight: opts.fontWeight ?? 320,
    lineHeight: Math.round(fontSize * 1.25),
    maxLines: opts.maxLines, // undefined => unlimited rows
    balanceTwoLines: opts.balanceTwoLines ?? false,
    targetCharsPerLine: opts.targetCharsPerLine ?? 20,
    ellipsis: false,
  })
  const lines = wrap.lines

  // Determine the maximum line width in pixels
  let maxLineW = 0
  for (const ln of lines) {
    const base = measureWidth(ln, font)
    const extra = Math.max(0, ln.length - 1) * letterSpacingPx
    maxLineW = Math.max(maxLineW, base + extra)
  }

  const contentWidth = Math.ceil(maxLineW)
  const width = contentWidth + hPadding * 2

  return {
    width,
    contentWidth,
    marginLeft: marginX,
    marginRight: marginX,
    lines,
    lineHeight: wrap.lineHeight,
    fontSize,
  }
}
