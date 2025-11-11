import React from 'react'
import { createPortal } from 'react-dom'

export type TaskPaneProps = {
  open: boolean
  CANVAS_FRAME_GAP: number
  SIDE_PANE_RESERVED: number
  SIDE_PANE_WIDTH: number
  SIDE_PANE_V_INSET: number
  SLOT_CENTER_BIAS_X: number
  showPaymentDropZone?: boolean
}

export default function TaskPane({
  open,
  CANVAS_FRAME_GAP,
  SIDE_PANE_RESERVED,
  SIDE_PANE_WIDTH,
  SIDE_PANE_V_INSET,
  SLOT_CENTER_BIAS_X,
  showPaymentDropZone = false,
}: TaskPaneProps): React.ReactPortal | null {
  const paneSwipeStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const paneSwipeDidSwipeRef = React.useRef(false)
  const paneContentRef = React.useRef<HTMLDivElement | null>(null)
  const [paneContentW, setPaneContentW] = React.useState(0)
  const [paneDragging, setPaneDragging] = React.useState(false)
  const [paneDragDX, setPaneDragDX] = React.useState(0)
  const [panePage, setPanePage] = React.useState(0)
  const [paneDropActive, setPaneDropActive] = React.useState(false)
  const [panePaymentAccepted, setPanePaymentAccepted] = React.useState(false)
  const paymentBlockRef = React.useRef<HTMLDivElement | null>(null)
  const [paymentDragging, setPaymentDragging] = React.useState(false)
  const [paymentGhostPos, setPaymentGhostPos] = React.useState<{ x: number; y: number } | null>(null)
  const ghostPosRef = React.useRef<{ x: number; y: number } | null>(null)

  // Track pointer movement when dragging
  React.useEffect(() => {
    if (!paymentDragging) return
    
    console.log('🚀 PAYMENT DRAG MODE ACTIVE - move cursor to drag, click anywhere to drop')
    document.body.style.cursor = 'grabbing'
    
    const handleMove = (e: PointerEvent) => {
      const pos = { x: e.clientX, y: e.clientY }
      ghostPosRef.current = pos
      setPaymentGhostPos(pos)
    }
    
    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      console.log('🎯 GLOBAL CLICK - ATTEMPTING DROP!')
      
      // Check if we're dropping on the payment drop zone
      // Use the GHOST POSITION (where the card visually is) from the ref for the most recent position
      const dropZone = document.getElementById('payment-drop-zone')
      const currentGhostPos = ghostPosRef.current
      let isValidDrop = false
      
      if (dropZone && currentGhostPos) {
        const rect = dropZone.getBoundingClientRect()
        // Check if the CENTER of the ghost card is within the drop zone
        const inBounds = (
          currentGhostPos.x >= rect.left &&
          currentGhostPos.x <= rect.right &&
          currentGhostPos.y >= rect.top &&
          currentGhostPos.y <= rect.bottom
        )
        console.log('📍 DROP ZONE CHECK:', { 
          inBounds, 
          ghostPos: currentGhostPos,
          dropZone: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          visible: dropZone.offsetParent !== null,
          distance: {
            fromLeft: currentGhostPos.x - rect.left,
            fromRight: rect.right - currentGhostPos.x,
            fromTop: currentGhostPos.y - rect.top,
            fromBottom: rect.bottom - currentGhostPos.y
          }
        })
        isValidDrop = inBounds
      } else {
        if (!dropZone) console.log('⚠️ Drop zone element not found!')
        if (!currentGhostPos) console.log('⚠️ Ghost position not set!')
      }
      
      // Immediately clear dragging state
      setPaymentDragging(false)
      setPaymentGhostPos(null)
      ghostPosRef.current = null
      document.body.style.cursor = ''
      
      // Only dispatch event if dropped in valid zone
      if (isValidDrop) {
        console.log('✅ VALID DROP! Dispatching payment-added event')
        try {
          window.dispatchEvent(new CustomEvent('ada-task-payment-added', { 
            detail: { source: 'tap-drag', x: e.clientX, y: e.clientY } 
          }))
        } catch (err) {
          console.error('Error dispatching event:', err)
        }
      } else {
        console.log('❌ INVALID DROP - payment returned to task pane')
      }
    }
    
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('click', handleClick, { capture: true, once: true })
    
    return () => {
      document.body.style.cursor = ''
      ghostPosRef.current = null
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('click', handleClick, true)
    }
  }, [paymentDragging])

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
    <div aria-label="right-gap-slot" style={{ position: 'fixed', top: 0, right: CANVAS_FRAME_GAP, width: SIDE_PANE_RESERVED, height: '100vh', pointerEvents: 'auto', overflow: 'hidden', zIndex: 6 }}>
      <div aria-label="right-gap-pane" style={{ position: 'absolute', top: SIDE_PANE_V_INSET, left: '50%', width: SIDE_PANE_WIDTH, height: `calc(100vh - ${SIDE_PANE_V_INSET * 2}px)`, transform: open ? `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X}px))` : `translateX(calc(-50% + ${SLOT_CENTER_BIAS_X + SIDE_PANE_RESERVED}px))`, pointerEvents: open ? 'auto' : 'none', transition: 'transform 260ms ease', willChange: 'transform' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,0.42)', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(1.1)', WebkitBackdropFilter: 'blur(28px) saturate(1.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
        <div
          style={{ position: 'absolute', inset: 0, padding: '16px 14px 18px 14px', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 8, touchAction: 'none', pointerEvents: paymentDragging ? 'none' : 'auto' }}
          onPointerDown={(e) => {
            if (paymentDragging) return
            const t = e.target as HTMLElement
            const isPayment = t && t.closest('[data-dnd="payment"]')
            console.log('📱 PARENT onPointerDown (bubble phase)', { isPayment, target: t })
            if (isPayment) {
              console.log('✅ Parent: Detected payment block - NOT capturing pointer, NOT handling event')
              return
            }
            console.log('⚠️ Parent: Setting up pane swipe')
            paneSwipeStartRef.current = { x: e.clientX, y: e.clientY }
            paneSwipeDidSwipeRef.current = false
            setPaneDragging(false)
            setPaneDragDX(0)
            try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
          }}
          onPointerMove={(e) => {
            const t = e.target as HTMLElement
            if (t && t.closest('[data-dnd="payment"]')) return
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
          onPointerUp={(e) => {
            const t = e.target as HTMLElement
            if (t && t.closest('[data-dnd="payment"]')) return
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
          onPointerCancel={() => { paneSwipeStartRef.current = null; setPaneDragging(false); setPaneDragDX(0); paneSwipeDidSwipeRef.current = false }}
          onClickCapture={(e) => {
            const t = e.target as HTMLElement
            if (t && t.closest('[data-dnd="payment"]')) return
            if (paneSwipeDidSwipeRef.current || paneDragging) { e.preventDefault(); e.stopPropagation(); paneSwipeDidSwipeRef.current = false }
          }}
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
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 0, gap: 9 }}>
                  {/* Shadow wrapper holds outer drop-shadow so inner card can keep overflow:hidden */}
                  <div
                    ref={paymentBlockRef}
                    data-dnd="payment"
                    onClick={() => {
                      if (!paymentDragging) {
                        console.log('✅ TAP - ACTIVATING DRAG MODE')
                        setPaymentDragging(true)
                        const rect = paymentBlockRef.current?.getBoundingClientRect()
                        if (rect) {
                          setPaymentGhostPos({ 
                            x: rect.left + rect.width / 2, 
                            y: rect.top + rect.height / 2 
                          })
                        }
                      }
                    }}
                    style={{ 
                      width: '90%', 
                      maxWidth: 280, 
                      height: 160, 
                      borderRadius: 22, 
                      filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.14)) drop-shadow(0 16px 40px rgba(0,0,0,0.18))', 
                      willChange: 'filter', 
                      cursor: paymentDragging ? 'grabbing' : 'grab',
                      opacity: paymentDragging ? 0.3 : 1,
                      transition: 'opacity 200ms ease',
                      border: '1px solid rgba(255,255,255,0.42)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                      boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10)',
                      backdropFilter: 'blur(28px) saturate(1.05)', WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
                      overflow: 'hidden', contain: 'paint', backfaceVisibility: 'hidden', isolation: 'isolate',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'auto'
                    } as React.CSSProperties}
                  >
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'radial-gradient(140px 120px at 20% 10%, rgba(255,255,255,0.08), transparent 60%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: 22, left: 0, right: 56, color: 'rgba(255,255,255,0.86)', fontWeight: 700, letterSpacing: 1.8, fontSize: 15, pointerEvents: 'none', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', 'Helvetica Condensed', sans-serif" }}>EDEN-EXPRESS</div>
                    {/* Chip icon in top-right */}
                    <div style={{ position: 'absolute', top: 18, right: 16, width: 40, height: 32, pointerEvents: 'none' }}>
                      <svg width="100%" height="100%" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37259 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V19.8222C42 26.4496 36.6274 31.8222 30 31.8222H12C5.37258 31.8222 0 26.4496 0 19.8222V12ZM2.05447 10.9389C2.57926 5.90956 6.83177 1.98889 12 1.98889H20V12.9278H22V1.98889H30C35.1682 1.98889 39.4207 5.90956 39.9455 10.9389H32.01L28.9966 6.96224L27.3993 8.15919L31 12.9109V12.9278H40V18.8944H31V18.9091L27.3993 23.6608L28.9966 24.8577L32.0082 20.8833H39.9455C39.4207 25.9127 35.1682 29.8333 30 29.8333H22V18.8944H20V29.8333H12C6.83177 29.8333 2.57925 25.9127 2.05447 20.8833H9.99857L13.0102 24.8577L14.6075 23.6608L11 18.9001V18.8944H2V12.9278H11V12.9199L14.6075 8.15919L13.0102 6.96224L9.99686 10.9389H2.05447Z" fill="rgba(255,255,255,0.5)"/>
                      </svg>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.96)' }} />
                      <div style={{ color: 'rgba(255,255,255,0.96)', fontWeight: 600, fontSize: 44, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums lining-nums' }}>8123</div>
                    </div>
                    <div style={{ position: 'absolute', right: 16, bottom: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 14, letterSpacing: 1, pointerEvents: 'none' }}>01/22</div>
                  </div>
                  {/* Payment Block label */}
                  <div style={{ color: 'rgba(255,255,255,1)', fontSize: 13, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: 0.3 }}>Payment Block</div>
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
      
      {/* Floating ghost when dragging */}
      {paymentDragging && paymentGhostPos && (
        <div
          style={{
            position: 'fixed',
            left: paymentGhostPos.x,
            top: paymentGhostPos.y,
            transform: 'translate(-50%, -50%)',
            width: 220,
            height: 130,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.42)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10), 0 12px 28px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(28px) saturate(1.05)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'radial-gradient(140px 120px at 20% 10%, rgba(255,255,255,0.08), transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 18, left: 0, right: 46, color: 'rgba(255,255,255,0.86)', fontWeight: 700, letterSpacing: 1.8, fontSize: 15, whiteSpace: 'nowrap', textAlign: 'center', fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', 'Helvetica Condensed', sans-serif" }}>EDEN-EXPRESS</div>
          {/* Chip icon in top-right */}
          <div style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 26, pointerEvents: 'none' }}>
            <svg width="100%" height="100%" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37259 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V19.8222C42 26.4496 36.6274 31.8222 30 31.8222H12C5.37258 31.8222 0 26.4496 0 19.8222V12ZM2.05447 10.9389C2.57926 5.90956 6.83177 1.98889 12 1.98889H20V12.9278H22V1.98889H30C35.1682 1.98889 39.4207 5.90956 39.9455 10.9389H32.01L28.9966 6.96224L27.3993 8.15919L31 12.9109V12.9278H40V18.8944H31V18.9091L27.3993 23.6608L28.9966 24.8577L32.0082 20.8833H39.9455C39.4207 25.9127 35.1682 29.8333 30 29.8333H22V18.8944H20V29.8333H12C6.83177 29.8333 2.57925 25.9127 2.05447 20.8833H9.99857L13.0102 24.8577L14.6075 23.6608L11 18.9001V18.8944H2V12.9278H11V12.9199L14.6075 8.15919L13.0102 6.96224L9.99686 10.9389H2.05447Z" fill="rgba(255,255,255,0.5)"/>
            </svg>
          </div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.96)' }} />
            <div style={{ color: 'rgba(255,255,255,0.96)', fontWeight: 600, fontSize: 44, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums lining-nums' }}>8123</div>
          </div>
          <div style={{ position: 'absolute', right: 14, bottom: 10, color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 14, letterSpacing: 1 }}>01/22</div>
        </div>
      )}
    </div>,
    document.body
  )
}
