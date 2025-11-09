import React from 'react'
import { createPortal } from 'react-dom'

export type TaskPaneProps = {
  open: boolean
  CANVAS_FRAME_GAP: number
  SIDE_PANE_RESERVED: number
  SIDE_PANE_WIDTH: number
  SIDE_PANE_V_INSET: number
  SLOT_CENTER_BIAS_X: number
}

export default function TaskPane({
  open,
  CANVAS_FRAME_GAP,
  SIDE_PANE_RESERVED,
  SIDE_PANE_WIDTH,
  SIDE_PANE_V_INSET,
  SLOT_CENTER_BIAS_X,
}: TaskPaneProps) {
  const paneSwipeStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const paneSwipeDidSwipeRef = React.useRef(false)
  const paneContentRef = React.useRef<HTMLDivElement | null>(null)
  const [paneContentW, setPaneContentW] = React.useState(0)
  const [paneDragging, setPaneDragging] = React.useState(false)
  const [paneDragDX, setPaneDragDX] = React.useState(0)
  const [panePage, setPanePage] = React.useState(0)

  React.useEffect(() => {
    if (!open) return
    const el = paneContentRef.current
    const onResize = () => { if (el) setPaneContentW(el.clientWidth) }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  if (!open) return null

  return createPortal(
    <div aria-label="right-gap-slot" style={{ position: 'fixed', top: 0, right: CANVAS_FRAME_GAP, width: SIDE_PANE_RESERVED, height: '100vh', pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
      <div aria-label="right-gap-pane" style={{ position: 'absolute', top: SIDE_PANE_V_INSET, left: '50%', width: SIDE_PANE_WIDTH, height: `calc(100vh - ${SIDE_PANE_V_INSET * 2}px)`, transform: open ? `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X}px))` : `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X + SIDE_PANE_RESERVED}px))`, pointerEvents: open ? 'auto' : 'none', transition: 'transform 260ms ease', willChange: 'transform' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,0.42)', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(1.1)', WebkitBackdropFilter: 'blur(28px) saturate(1.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
        <div
          style={{ position: 'absolute', inset: 0, padding: '16px 14px 18px 14px', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 8, touchAction: 'none' as any }}
          onPointerDownCapture={(e) => {
            paneSwipeStartRef.current = { x: e.clientX, y: e.clientY }
            paneSwipeDidSwipeRef.current = false
            setPaneDragging(false)
            setPaneDragDX(0)
            try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
          }}
          onPointerMoveCapture={(e) => {
            const s = paneSwipeStartRef.current
            if (!s) return
            const dx = e.clientX - s.x
            const dy = e.clientY - s.y
            const horiz = Math.abs(dx) > 8 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 2
            if (!paneDragging && horiz) setPaneDragging(true)
            if (paneDragging || horiz) {
              let adj = dx
              // edge friction when pulling past ends
              if ((panePage === 0 && dx > 0) || (panePage === 1 && dx < 0)) adj = dx * 0.35
              const W = paneContentW || (e.currentTarget as HTMLElement).clientWidth
              const lim = Math.max(120, Math.min(800, W))
              if (adj >  lim) adj =  lim
              if (adj < -lim) adj = -lim
              setPaneDragDX(adj)
              paneSwipeDidSwipeRef.current = true
              e.preventDefault()
            }
          }}
          onPointerUpCapture={(e) => {
            const s = paneSwipeStartRef.current
            try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId) } catch {}
            paneSwipeStartRef.current = null
            const didDrag = paneDragging
            const dx = didDrag && s ? (e.clientX - s.x) : 0
            const W = paneContentW || (e.currentTarget as HTMLElement).clientWidth
            const TH = Math.max(50, Math.min(240, Math.round(W * 0.22)))
            if (didDrag) {
              if (dx <= -TH && panePage < 1) setPanePage(1)
              else if (dx >= TH && panePage > 0) setPanePage(0)
              // snap back animation
              setPaneDragging(false)
              setPaneDragDX(0)
              window.setTimeout(() => { paneSwipeDidSwipeRef.current = false }, 220)
            } else if (s) {
              // tap without drag
              paneSwipeDidSwipeRef.current = false
            }
          }}
          onPointerCancelCapture={() => { paneSwipeStartRef.current = null; setPaneDragging(false); setPaneDragDX(0); paneSwipeDidSwipeRef.current = false }}
          onClickCapture={(e) => { if (paneSwipeDidSwipeRef.current || paneDragging) { e.preventDefault(); e.stopPropagation(); paneSwipeDidSwipeRef.current = false } }}
        >
          <div style={{ position: 'relative', height: 0 }} />
          <div ref={paneContentRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'row', alignItems: 'stretch',
                width: '200%',
                transform: `translate3d(${(-panePage * (paneContentW || 0)) + (paneDragging ? paneDragDX : 0)}px,0,0)`,
                transition: paneDragging ? 'none' : 'transform 280ms ease',
                willChange: 'transform'
              }}
            >
              {/* Slide 1: Instances */}
              <div style={{ flex: '0 0 50%', width: '50%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  <div style={{ opacity: 0.85 }}>Instances — Page 1</div>
                </div>
              </div>
              {/* Slide 2: Payment */}
              <div style={{ flex: '0 0 50%', width: '50%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 0 }}>
                  {/* Shadow wrapper holds outer drop-shadow so inner card can keep overflow:hidden */}
                  <div style={{ width: '90%', maxWidth: 280, height: 160, borderRadius: 22, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.14)) drop-shadow(0 16px 40px rgba(0,0,0,0.18))', willChange: 'filter' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 22, position: 'relative',
                      // TaskItem-style glass fill + rim
                      border: '1px solid rgba(255,255,255,0.42)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                      boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10)',
                      backdropFilter: 'blur(28px) saturate(1.05)', WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
                      overflow: 'hidden', contain: 'paint', transform: 'translateZ(0)', backfaceVisibility: 'hidden', isolation: 'isolate'
                    }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'radial-gradient(140px 120px at 20% 10%, rgba(255,255,255,0.08), transparent 60%)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: 12, right: 12, width: 42, height: 32, opacity: 1 }}>
                        <svg width="42" height="32" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.18))' }}>
                          <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37259 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V19.8222C42 26.4496 36.6274 31.8222 30 31.8222H12C5.37258 31.8222 0 26.4496 0 19.8222V12ZM2.05447 10.9389C2.57926 5.90956 6.83177 1.98889 12 1.98889H20V12.9278H22V1.98889H30C35.1682 1.98889 39.4207 5.90956 39.9455 10.9389H32.01L28.9966 6.96224L27.3993 8.15919L31 12.9109V12.9278H40V18.8944H31V18.9091L27.3993 23.6608L28.9966 24.8577L32.0082 20.8833H39.9455C39.4207 25.9127 35.1682 29.8333 30 29.8333H22V18.8944H20V29.8333H12C6.83177 29.8333 2.57925 25.9127 2.05447 20.8833H9.99857L13.0102 24.8577L14.6075 23.6608L11 18.9001V18.8944H2V12.9278H11V12.9199L14.6075 8.15919L13.0102 6.96224L9.99686 10.9389H2.05447Z" fill="#FFFFFF" fillOpacity="0.60"/>
                        </svg>
                      </div>
                      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.86)', fontWeight: 600, letterSpacing: 2.2, fontSize: 11 }}>EDEN</div>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.96)' }} />
                        <div style={{ color: 'rgba(255,255,255,0.96)', fontWeight: 600, fontSize: 44, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums lining-nums' }}>8123</div>
                      </div>
                      <div style={{ position: 'absolute', right: 16, bottom: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 14, letterSpacing: 1 }}>01/22</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 0 }} />
          <div aria-label="pane-dots" style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
            {[0,1].map((i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setPanePage(i) }}
                aria-label={`Go to page ${i+1}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  background: (panePage === i) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                  boxShadow: (panePage === i) ? '0 0 4px rgba(255,255,255,0.45)' : 'none',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
