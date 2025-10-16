import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './selection-tooltip.css'
import './tooltip-animation.css'
import { createCarouselController } from './util/carousel-logic'
import { CurvedStateLabel } from './util/text-state-curve'

export type SelectionKind = 'automation' | 'manual' | 'outsource'

export type SelectionTooltipProps = {
  open: boolean
  anchorEl: HTMLElement | null
  onSelect: (next: SelectionKind) => void
  onClose: () => void
  current?: SelectionKind
  variant?: 'circle' | 'rect' | 'plain'
  onExited?: () => void
}

// Center icon for each selection kind (rendered above curved text)
const IconForSelection: React.FC<{ kind: SelectionKind }> = ({ kind }) => {
  if (kind === 'automation') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
        <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
        <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
        <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
        <path d="M6 18a4 4 0 0 1-1.967-.516"/>
        <path d="M12 13h4"/>
        <path d="M12 18h6a2 2 0 0 1 2 2v1"/>
        <path d="M12 8h8"/>
        <path d="M16 8V5a2 2 0 0 1 2-2"/>
        <circle cx="16" cy="13" r=".5"/>
        <circle cx="18" cy="3" r=".5"/>
        <circle cx="20" cy="21" r=".5"/>
        <circle cx="20" cy="8" r=".5"/>
      </svg>
    )
  }
  if (kind === 'manual') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
        <path d="M20 2v4"/>
        <path d="M22 4h-4"/>
        <circle cx="4" cy="20" r="2"/>
      </svg>
    )
  }
  if (kind === 'outsource') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/>
        <path d="M8 15H7a4 4 0 0 0-4 4v2"/>
        <circle cx="10" cy="7" r="4"/>
      </svg>
    )
  }
  return null
}

const OPTIONS: { key: SelectionKind; label: string }[] = [
  { key: 'automation', label: 'Automation' },
  { key: 'manual', label: 'Manual' },
  { key: 'outsource', label: 'Outsource' },
]

const INNER_ICON_PX = 45 // default plus icon size in TaskItem default state
const CARET_GAP_PX = 6   // desired base gap between caret tip and inner plus icon top
const GAP_TWEAK_PX = 4   // additional upward shift (increase gap) in px

// Animation toggles (easy switches; no API change)
const FADE_ONLY = false // set true to remove translate and zoom
const NO_ZOOM = false   // set true to keep translate but remove zoom

const SelectionTooltip: React.FC<SelectionTooltipProps> = ({ open, anchorEl, onSelect, onClose, current, variant = 'circle', onExited }) => {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const posRef = useRef<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [prevIdx, setPrevIdx] = useState<number | null>(null)
  const [dir, setDir] = useState<'left' | 'right' | null>(null)
  const actionRef = useRef(0)
  const [prevToken, setPrevToken] = useState<number | null>(null)
  const [curToken, setCurToken] = useState<number>(0)
  const leftRef = useRef<HTMLButtonElement | null>(null)
  const rightRef = useRef<HTMLButtonElement | null>(null)
  const [rendered, setRendered] = useState(false) // keep mounted for exit animation
  const [isExiting, setIsExiting] = useState(false)
  const curCircleRef = useRef<HTMLDivElement | null>(null)
  const prevCircleRef = useRef<HTMLDivElement | null>(null)


  // Initialize selected index from current state if provided
  useLayoutEffect(() => {
    if (!current) return
    const idx = OPTIONS.findIndex(o => o.key === current)
    if (idx >= 0) setSelectedIdx(idx)
  }, [current])

  // Manage mount/unmount to allow exit animation
  useEffect(() => {
    if (open) {
      setRendered(true)
      setIsExiting(false)
    } else if (rendered) {
      // trigger exit animation
      setIsExiting(true)
    }
    // no cleanup; we keep mounted until exit animation ends
  }, [open])

  // Carousel controls via shared util
  const { prev, next } = createCarouselController({
    actionRef,
    getIndex: () => selectedIdx,
    setIndex: setSelectedIdx,
    setPrevIdx,
    setDir,
    setPrevToken,
    setCurToken,
    leftRef,
    rightRef,
    length: OPTIONS.length,
  })
  

  const recalc = () => {
    if (!anchorEl || !rootRef.current) return
    const rect = anchorEl.getBoundingClientRect()
    const panel = rootRef.current.getBoundingClientRect()
    // Target the caret tip (panel bottom) to sit CARET_GAP_PX above the inner plus icon top
    const innerPlusTopY = rect.top + rect.height / 2 - INNER_ICON_PX / 2
    const caretTargetY = innerPlusTopY - (CARET_GAP_PX + GAP_TWEAK_PX)
    const top = Math.max(8, caretTargetY - panel.height)
    const left = rect.left + rect.width / 2 - panel.width / 2
    // Only update when movement is noticeable to avoid re-render thrash on RAF
    if (Math.abs(posRef.current.top - top) > 0.5 || Math.abs(posRef.current.left - left) > 0.5) {
      posRef.current = { top, left }
      setPos(posRef.current)
    }
    console.log('[SelectionTooltip] recalc', {
      anchor: { top: rect.top, left: rect.left, w: rect.width, h: rect.height },
      panel: { w: panel.width, h: panel.height },
      pos: { top, left },
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    console.log('[SelectionTooltip] open=true, anchorEl present?', !!anchorEl)
    recalc()
    // Recalculate on the next frame to ensure the portal panel has final size
    const id = requestAnimationFrame(() => recalc())
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl])

  // (circle geometry measured inside CurvedStateLabel util)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      console.log('[SelectionTooltip] key', e.key)
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Enter') onSelect(OPTIONS[selectedIdx].key)
    }
    const onWin = () => recalc()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIdx])

  // Recompute when the option changes (panel height may change later)
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => recalc())
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx])

  // Follow-loop: keep tooltip coupled to anchor even when the canvas pans via CSS transforms
  useEffect(() => {
    if (!open || !anchorEl) return
    let raf = 0
    const step = () => {
      recalc()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      console.log('[SelectionTooltip] document mousedown', { target: (t as HTMLElement)?.className || t?.nodeName })
      if (rootRef.current && !rootRef.current.contains(t)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onClose])

  if (!rendered) return null

  const animBase = `selection-tooltip ${isExiting ? 'anim-fade-zoom-out' : 'anim-fade-zoom-in'}`
  const animMods = FADE_ONLY ? ' fade-only' : (NO_ZOOM ? ' no-zoom' : '')
  const content = (
    <div
      ref={rootRef}
      className={`${animBase}${animMods}`}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-modal="false"
      onPointerDown={(e) => { e.stopPropagation() }}
      onPointerUp={(e) => { e.stopPropagation() }}
      onMouseDown={(e) => { e.stopPropagation(); console.log('[SelectionTooltip] panel mousedown') }}
      onClick={(e) => { e.stopPropagation(); console.log('[SelectionTooltip] panel click') }}
      onAnimationEnd={() => {
        if (isExiting) {
          setRendered(false)
          setIsExiting(false)
          try { onExited && onExited() } catch {}
        }
      }}
    >
      {/* Inline defs for cross-browser clip-path reference */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="tooltip-clip" clipPathUnits="userSpaceOnUse">
            <path d="M180 0C191.046 0 200 8.95431 200 20V180C200 191.046 191.046 200 180 200H117.897L100 231L82.1025 200H20C8.95431 200 0 191.046 0 180V20C0 8.95431 8.95431 0 20 0H180Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="selection-tooltip__clip-blur" aria-hidden="true" />
      <div className="selection-tooltip__bg" aria-hidden="true">
        <div className="selection-tooltip__glass" />
      </div>
      <div className="selection-tooltip__menu" aria-label="Choose task mode">
        <div className="selection-tooltip__viewport">
          <div className="selection-tooltip__stack">
            <div className="selection-tooltip__carousel">
              <button ref={leftRef} className="selection-tooltip__chev" aria-label="Previous" onClick={prev}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="selection-tooltip__circle-stage" aria-label={OPTIONS[selectedIdx].label}>
                {prevIdx !== null && (
                  <div
                    key={`prev-${prevIdx}-${dir ?? 'idle'}-${prevToken ?? 'none'}`}
                    className={`st-item ${dir === 'right' ? 'st-out-left' : 'st-out-right'}`}
                    onAnimationEnd={() => {
                      if (prevToken === actionRef.current) {
                        setPrevIdx(null)
                        setDir(null)
                      }
                    }}
                  >
                    {variant === 'circle' ? (
                      <div ref={prevCircleRef} className="selection-tooltip__circle" data-kind={OPTIONS[prevIdx].key}>
                        <div className="selection-tooltip__center-icon" style={{ top: '44%' }}>
                          <IconForSelection kind={OPTIONS[prevIdx].key} />
                        </div>
                        <CurvedStateLabel circleRef={prevCircleRef} label={OPTIONS[prevIdx].label} />
                      </div>
                    ) : variant === 'rect' ? (
                      <div ref={prevCircleRef} className="selection-tooltip__rect" data-kind={OPTIONS[prevIdx].key}>
                        <div className="selection-tooltip__rect-stack">
                          <div className="selection-tooltip__center-icon selection-tooltip__center-icon--rect">
                            <IconForSelection kind={OPTIONS[prevIdx].key} />
                          </div>
                          <div className="selection-tooltip__rect-text">{OPTIONS[prevIdx].label}</div>
                        </div>
                      </div>
                    ) : (
                      <div ref={prevCircleRef} className="selection-tooltip__plain" data-kind={OPTIONS[prevIdx].key}>
                        <div className="selection-tooltip__rect-stack">
                          <div className="selection-tooltip__center-icon selection-tooltip__center-icon--rect">
                            <IconForSelection kind={OPTIONS[prevIdx].key} />
                          </div>
                          <div className="selection-tooltip__rect-text">{OPTIONS[prevIdx].label}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div
                  key={`cur-${selectedIdx}-${curToken}`}
                  className={`st-item ${dir === 'right' ? 'st-in-right' : dir === 'left' ? 'st-in-left' : 'st-center'}`}
                >
                  {variant === 'circle' ? (
                    <div ref={curCircleRef} className="selection-tooltip__circle" data-kind={OPTIONS[selectedIdx].key}>
                      <div className="selection-tooltip__center-icon" style={{ top: '44%' }}>
                        <IconForSelection kind={OPTIONS[selectedIdx].key} />
                      </div>
                      <CurvedStateLabel circleRef={curCircleRef} label={OPTIONS[selectedIdx].label} />
                    </div>
                  ) : variant === 'rect' ? (
                    <div ref={curCircleRef} className="selection-tooltip__rect" data-kind={OPTIONS[selectedIdx].key}>
                      <div className="selection-tooltip__rect-stack">
                        <div className="selection-tooltip__center-icon selection-tooltip__center-icon--rect">
                          <IconForSelection kind={OPTIONS[selectedIdx].key} />
                        </div>
                        <div className="selection-tooltip__rect-text">{OPTIONS[selectedIdx].label}</div>
                      </div>
                    </div>
                  ) : (
                    <div ref={curCircleRef} className="selection-tooltip__plain" data-kind={OPTIONS[selectedIdx].key}>
                      <div className="selection-tooltip__rect-stack">
                        <div className="selection-tooltip__center-icon selection-tooltip__center-icon--rect">
                          <IconForSelection kind={OPTIONS[selectedIdx].key} />
                        </div>
                        <div className="selection-tooltip__rect-text">{OPTIONS[selectedIdx].label}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button ref={rightRef} className="selection-tooltip__chev" aria-label="Next" onClick={next}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>
            <div className="selection-tooltip__confirm-wrap">
              <button
                className="selection-tooltip__confirm"
                aria-label="Confirm selection"
                onClick={() => { console.log('[SelectionTooltip] confirm', OPTIONS[selectedIdx].key); onSelect(OPTIONS[selectedIdx].key) }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default SelectionTooltip
