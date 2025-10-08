export type DescriptorFitInput = {
  text: string
  blockWidth: number
  options?: {
    sidePaddingX?: number
    fontFamily?: string
    fontSize?: number // px
    fontWeight?: number
    lineHeightFactor?: number // e.g., 1.18
    interRowGap?: number // px
    baseBlockHeight?: number // px
    maxRows?: number // unlimited by default
  }
}

export type DescriptorFitResult = {
  rows: string[]
  requiredHeightDelta: number
  metrics: {
    usableWidth: number
    rowWidths: number[]
  }
}

const DEFAULTS = {
  sidePaddingX: 20,
  fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, sans-serif",
  fontSize: 20,
  fontWeight: 350,
  lineHeightFactor: 1.18,
  interRowGap: 6,
  baseBlockHeight: 255,
  maxRows: Infinity as number,
}

function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 8 // fallback SSR-safe
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * 8
  ctx.font = font
  const metrics = ctx.measureText(text)
  return metrics.width
}

function buildFontString(size: number, family: string, weight: number) {
  return `${weight} ${size}px ${family}`
}

function wrapIntoLines(words: string[], usableWidth: number, font: string, maxRows: number): string[] {
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i++) {
    const candidate = current + ' ' + words[i]
    const w = measureTextWidth(candidate, font)
    if (w <= usableWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
      if (lines.length >= maxRows - 1) {
        // push remainder as last line (may overflow visually but follows no-clamp rule)
        const rest = words.slice(i + 1).join(' ')
        if (rest) current += ' ' + rest
        break
      }
    }
  }
  lines.push(current)
  return lines
}

export function renderDescriptorText({ text, blockWidth, options }: DescriptorFitInput): DescriptorFitResult {
  const cfg = { ...DEFAULTS, ...(options || {}) }
  const { sidePaddingX, fontFamily, fontSize, fontWeight, lineHeightFactor, interRowGap, maxRows } = cfg

  const usableWidth = blockWidth - sidePaddingX * 2
  const font = buildFontString(fontSize, fontFamily, fontWeight)

  const singleWidth = measureTextWidth(text, font)
  let rows: string[] = []

  if (singleWidth <= usableWidth) {
    rows = [text]
  } else {
    const words = text.trim().split(/\s+/)
    rows = wrapIntoLines(words, usableWidth, font, maxRows)
  }

  const lineHeightPx = Math.round(fontSize * lineHeightFactor)
  const extraLines = Math.max(0, rows.length - 1)
  const requiredHeightDelta = extraLines > 0 ? extraLines * lineHeightPx + extraLines * interRowGap : 0

  // compute widths for metrics (best-effort)
  const rowWidths = rows.map((r) => measureTextWidth(r, font))

  return {
    rows,
    requiredHeightDelta,
    metrics: {
      usableWidth,
      rowWidths,
    },
  }
}
