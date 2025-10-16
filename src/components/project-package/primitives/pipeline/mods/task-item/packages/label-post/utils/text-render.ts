// text-render: simple canvas-based text wrapping for Label Post

export type TextWrapOptions = {
  text: string
  maxWidth: number
  fontFamily?: string
  fontSize?: number // px
  fontWeight?: number | string
  lineHeight?: number // px
  maxLines?: number
  ellipsis?: boolean
  balanceTwoLines?: boolean // when maxLines >= 2, prefer visually balanced 2-line split
  targetCharsPerLine?: number // if set, wrap by character count cap (ignores maxWidth)
}

export type TextWrapResult = {
  lines: string[]
  lineHeight: number
}

// Shared offscreen canvas for measurement
let measureCanvas: HTMLCanvasElement | null = null
let measureCtx: CanvasRenderingContext2D | null = null

function getCtx(font: string): CanvasRenderingContext2D {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas')
    measureCanvas.width = 1
    measureCanvas.height = 1
    measureCtx = measureCanvas.getContext('2d')
  }
  const ctx = measureCtx!
  ctx.font = font
  return ctx
}

function buildFont({ fontFamily, fontSize, fontWeight }: Partial<TextWrapOptions>): string {
  const size = fontSize ?? 16
  const weight = fontWeight ?? 400
  const family = fontFamily ?? `'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, sans-serif`
  return `${weight} ${size}px ${family}`
}

export function renderTextWrap(opts: TextWrapOptions): TextWrapResult {
  const {
    text,
    maxWidth,
    fontFamily,
    fontSize = 16,
    fontWeight,
    lineHeight = Math.round((fontSize ?? 16) * 1.25),
    maxLines,
    ellipsis = true,
    balanceTwoLines = false,
    targetCharsPerLine,
  } = opts

  const font = buildFont({ fontFamily, fontSize, fontWeight })
  const ctx = getCtx(font)

  const words = String(text).split(/\s+/).filter(Boolean)

  // Char-cap wrapping takes precedence and produces unlimited rows unless maxLines is provided
  if (typeof targetCharsPerLine === 'number' && targetCharsPerLine > 0) {
    const cap = Math.max(1, Math.floor(targetCharsPerLine))
    const lines: string[] = []
    let current = ''
    const pushCurrent = () => { if (current) { lines.push(current.trimEnd()); current = '' } }

    const pushWordWithSplit = (w: string) => {
      // split long word into chunks of size cap
      for (let i = 0; i < w.length; i += cap) {
        const chunk = w.slice(i, i + cap)
        if (chunk.length === 0) continue
        if (current.length === 0) {
          current = chunk
        } else if ((current.length + 1 + chunk.length) <= cap) {
          current += ' ' + chunk
        } else {
          pushCurrent()
          current = chunk
        }
      }
    }

    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      if (w.length > cap) {
        pushCurrent()
        pushWordWithSplit(w)
        continue
      }
      if (current.length === 0) {
        current = w
      } else if ((current.length + 1 + w.length) <= cap) {
        current += ' ' + w
      } else {
        pushCurrent()
        current = w
      }
    }
    pushCurrent()

    if (maxLines && lines.length > maxLines) {
      // collapse overflow into last line, optionally ellipsize to maxWidth if finite
      const head = lines.slice(0, maxLines - 1)
      let tail = lines.slice(maxLines - 1).join(' ')
      if (ellipsis && isFinite(maxWidth)) {
        let last = tail
        let w = ctx.measureText(last).width
        const ELL = '…'
        while (last.length > 0 && w > maxWidth) {
          last = last.slice(0, -1)
          w = ctx.measureText(last + ELL).width
        }
        tail = last + ELL
      }
      return { lines: [...head, tail], lineHeight }
    }
    return { lines, lineHeight }
  }

  // Optional: choose the most balanced 2-line split when allowed
  if (balanceTwoLines && (maxLines ?? 1) >= 2 && words.length >= 2) {
    const lambda = 0.25 // weight for width difference
    let best: { left: string; right: string; score: number } | null = null
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(' ')
      const right = words.slice(i).join(' ')
      const w1 = ctx.measureText(left).width
      const w2 = ctx.measureText(right).width
      // If maxWidth is finite, penalize lines exceeding it
      const over1 = isFinite(maxWidth) && w1 > maxWidth
      const over2 = isFinite(maxWidth) && w2 > maxWidth
      const penalty = (over1 ? (w1 - maxWidth) : 0) + (over2 ? (w2 - maxWidth) : 0)
      const score = Math.max(w1, w2) + lambda * Math.abs(w1 - w2) + penalty * 10
      if (!best || score < best.score) best = { left, right, score }
    }
    if (best) {
      return { lines: [best.left, best.right], lineHeight }
    }
  }

  const lines: string[] = []
  let current = ''

  for (let i = 0; i < words.length; i++) {
    const next = current ? current + ' ' + words[i] : words[i]
    const w = ctx.measureText(next).width
    if (w <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = words[i]
    }
    if (maxLines && lines.length === maxLines - 1) {
      // Last allowed line: pack rest, optionally ellipsize
      const remaining = words.slice(i + 1).join(' ')
      let last = current + (remaining ? ' ' + remaining : '')
      let lastW = ctx.measureText(last).width
      if (ellipsis && lastW > maxWidth) {
        const ELL = '…'
        while (last.length > 0 && lastW > maxWidth) {
          last = last.slice(0, -1)
          lastW = ctx.measureText(last + ELL).width
        }
        last = last + ELL
      }
      lines.push(last)
      return { lines, lineHeight }
    }
  }
  if (current) lines.push(current)
  return { lines, lineHeight }
}
