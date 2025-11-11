import React from 'react'
import TaskItem from '../../../primitives/pipeline/mods/task-item/components/task-item'
import { taskTreeTransforms } from '../../../primitives/pipeline/mods/task-stack/mods/task-tree'
import Research from '../../../../ada-demo-again/one-ada-proj/research'
import VibePanel from '../../../../ada-demo-again/one-ada-proj/vibe-panel'
import PaymentBlock from '../../../primitives/pipeline/mods/task-item/components/payment-block'
import ProgMeter from '../../../primitives/pipeline/mods/task-block/prog-meter/prog-meter'

export type TaskTreeOverlayProps = {
  left: number
  top: number
  treeForIndex: number | null
  anchorsVersion: number
  itemH: number
  lockedT0: { tx: number; ty: number; scale: number } | null
  secondPaneCollapsing: boolean
  secondPaneDone: boolean
  vibeVisible: boolean
  firstBadge: '1' | '2'
  logoTaskMounted: boolean
  logoTaskShown: boolean
  typoTaskMounted: boolean
  typoTaskShown: boolean
  logoTipMounted: boolean
  logoTipShown: boolean
  logoTipEverShown: boolean
  onCloseLogoTip: () => void
  seqIndex: number
  setSeqIndex: React.Dispatch<React.SetStateAction<number>>
  onExposeAnchors: (index: number, anchors: any) => void
  measureRef: React.RefObject<HTMLDivElement>
  showResearch: boolean
  TASK_TREE_DECOUPLED?: boolean
  dropArmed?: boolean
  onPaymentPlaced?: () => void
}

export default function TaskTreeOverlay(props: TaskTreeOverlayProps) {
  const {
    left,
    top,
    treeForIndex,
    anchorsVersion,
    itemH,
    lockedT0,
    secondPaneCollapsing,
    secondPaneDone,
    vibeVisible,
    firstBadge,
    logoTaskMounted,
    logoTaskShown,
    typoTaskMounted,
    typoTaskShown,
    logoTipMounted,
    logoTipShown,
    logoTipEverShown,
    onCloseLogoTip,
    seqIndex,
    setSeqIndex,
    onExposeAnchors,
    measureRef,
    showResearch,
    TASK_TREE_DECOUPLED = false,
  } = props

  const T = taskTreeTransforms({ count: 4, itemHeight: itemH, nodeScale: 1.0, firstGapPx: 50, stackGapPx: 50 })
  const [paymentDropped, setPaymentDropped] = React.useState(false)
  const [dropActive, setDropActive] = React.useState(false)
  const [assetDelivered, setAssetDelivered] = React.useState(false)
  const [gemClicked, setGemClicked] = React.useState(false)
  const [showAsset, setShowAsset] = React.useState(false)
  const [actionIndex, setActionIndex] = React.useState(0) // 0 = check, 1 = refresh, 2 = x
  const [orbVisible, setOrbVisible] = React.useState(false)
  const [paginatorVisible, setPaginatorVisible] = React.useState(false)
  const [sealed, setSealed] = React.useState(false)
  const [paymentSealed, setPaymentSealed] = React.useState(false)
  const [thirdTaskMounted, setThirdTaskMounted] = React.useState(false)
  const [thirdTaskShown, setThirdTaskShown] = React.useState(false)
  const [manualMode, setManualMode] = React.useState(false)
  const [manualChipShown, setManualChipShown] = React.useState(false)
  const [uploadProcessing, setUploadProcessing] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadProgressText, setUploadProgressText] = React.useState<string | null>(null)
  const [uploadConfirming, setUploadConfirming] = React.useState(false)
  const [uploadSealed, setUploadSealed] = React.useState(false)
  const [resultPaneVisible, setResultPaneVisible] = React.useState(false)
  const [resultPaneShown, setResultPaneShown] = React.useState(false)
  const [paneShrinking, setPaneShrinking] = React.useState(false)
  const [circleFadingOut, setCircleFadingOut] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const uploadProgStartRef = React.useRef<number | null>(null)
  const uploadRafRef = React.useRef<number | null>(null)
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const visTimerRef = React.useRef<number | null>(null)
  const dropMode = !!props.dropArmed && !paymentDropped
  const [dropShown, setDropShown] = React.useState(false)
  React.useEffect(() => {
    if (dropMode) {
      const id = requestAnimationFrame(() => setDropShown(true))
      return () => { cancelAnimationFrame(id); setDropShown(false) }
    } else {
      setDropShown(false)
    }
  }, [dropMode])

  // Sequence: First shrink payment block, then chip, then show third task
  React.useEffect(() => {
    if (sealed) {
      // Payment shrinks immediately when check is clicked
      setPaymentSealed(true)
      // After payment finishes (600ms animation), wait 150ms then show third task
      const timer1 = setTimeout(() => {
        setThirdTaskMounted(true)
      }, 750) // 600ms animation + 150ms delay
      const timer2 = setTimeout(() => {
        setThirdTaskShown(true)
      }, 800) // Mount + 50ms for fly-in
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [sealed])

  React.useEffect(() => {
    const onPaymentAdded = () => { if (dropMode) setPaymentDropped(true) }
    try { window.addEventListener('ada-task-payment-added' as any, onPaymentAdded as any) } catch {}
    return () => { try { window.removeEventListener('ada-task-payment-added' as any, onPaymentAdded as any) } catch {} }
  }, [dropMode])

  React.useEffect(() => {
    const onAssetDelivered = () => { setAssetDelivered(true) }
    try { window.addEventListener('ada-asset-delivered' as any, onAssetDelivered as any) } catch {}
    return () => { try { window.removeEventListener('ada-asset-delivered' as any, onAssetDelivered as any) } catch {} }
  }, [])

  React.useEffect(() => {
    const onModeSelected = (e: any) => { 
      if (e?.detail?.mode === 'manual') {
        setManualMode(true)
        // Reset states to show upload icon
        setShowAsset(false)
        setAssetDelivered(false)
        setGemClicked(false)
        // Show chip with delay for fly-in animation
        setTimeout(() => setManualChipShown(true), 50)
      }
    }
    try { window.addEventListener('ada-task-mode-selected' as any, onModeSelected as any) } catch {}
    return () => { try { window.removeEventListener('ada-task-mode-selected' as any, onModeSelected as any) } catch {} }
  }, [])

  // Handle gem click animation sequence
  React.useEffect(() => {
    if (!gemClicked) return
    // Wait for text fade (0.4s) + gem grow/pulse/shrink (3.4s) = 3.8s total
    const timer = setTimeout(() => {
      setShowAsset(true)
    }, 3800)
    return () => clearTimeout(timer)
  }, [gemClicked])

  // Orb and paginator start hidden - only shown on tap/swipe

  return (
    <div
      key={`tree-${treeForIndex}-${anchorsVersion}`}
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 5,
        pointerEvents: 'auto',
      }}
      onDragOverCapture={(e) => { if (dropMode) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
      onDropCapture={(e) => {
        if (!dropMode) return
        e.preventDefault()
        const okCustom = e.dataTransfer?.getData('text/x-eden-payment') === 'payment-block'
        const okPlain = !!e.dataTransfer?.getData('text/plain')
        if (okCustom || okPlain) {
          setPaymentDropped(true)
          setDropActive(false)
          props.onPaymentPlaced?.()
        }
      }}
    >
      <div style={{ position: 'relative', width: 0, height: 0, overflow: 'visible' }}>
        {T.length > 0 && (
          <>
            {treeForIndex === 0 && showResearch && (() => {
              const t0 = T[0]
              const base = lockedT0 || t0
              const circleSize = 150
              const radius = circleSize / 2
              const OFFSET_Y = -(40 + radius) // keep bottom of big circle 40px above block top
              const OFFSET_X = 0
              const BADGE_RADIUS = 22
              const BADGE_GAP = 8
              const BADGE_OFFSET_Y = - (BADGE_GAP + BADGE_RADIUS) // keep bottom of 44px badge ~8px above block top
              const BADGE_Y_NUDGE = -4 // manual correction to counter tiny post-confirm drift
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translate3d(-50%, -50%, 0) translate3d(${base.tx + OFFSET_X}px, ${OFFSET_Y}px, 0) scale(${base.scale})`,
                    transformOrigin: 'center center',
                    zIndex: 3,
                    opacity: 1,
                  }}
                >
                  {/* Show ONLY the dotted drop zone after Fiverr + Budget selections are done */}
                  {dropMode && (
                    <div id="payment-drop-zone"
                      onDragOverCapture={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                      onDropCapture={(e) => { /* ensure capture-phase handles it even if child steals bubble */ e.preventDefault() }}
                      onDragEnter={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropActive(true) }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropActive(true) }}
                      onDragLeave={() => setDropActive(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        const okCustom = e.dataTransfer?.getData('text/x-eden-payment') === 'payment-block'
                        const okPlain = !!e.dataTransfer?.getData('text/plain')
                        if (okCustom || okPlain) {
                          setPaymentDropped(true)
                          setDropActive(false)
                          props.onPaymentPlaced?.()
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, -25px, 0)`,
                        width: 220,
                        height: 130,
                        borderRadius: 16,
                        border: `2px dashed ${dropActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'}`,
                        background: 'rgba(255,255,255,0.08)',
                        boxShadow: dropActive ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'rgba(255,255,255,0.85)',
                        fontWeight: 700,
                        letterSpacing: 0.6,
                        pointerEvents: dropMode ? 'auto' : 'none',
                        opacity: dropShown ? 1 : 0,
                        transition: 'opacity 260ms ease',
                      }}
                    >
                      <div
                        aria-hidden
                        style={{ position: 'absolute', inset: 0, borderRadius: 16, backdropFilter: 'blur(28px) saturate(1.08)', WebkitBackdropFilter: 'blur(28px) saturate(1.08)', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)', pointerEvents: 'none', zIndex: 0 }}
                      />
                      <div style={{ position: 'relative', zIndex: 1, padding: '6px 10px', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.25, pointerEvents: 'none' }}>Drop Payment Block Here</div>
                    </div>
                  )}
                  {paymentDropped && !manualMode && (
                    <>
                      {/* Connecting chip above payment block */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${manualMode && !manualChipShown ? '-230px' : '-200px'}, 0)`,
                          opacity: manualMode && !manualChipShown ? 0 : 1,
                          transition: 'transform 380ms ease, opacity 380ms ease',
                          zIndex: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                            border: '1px solid rgba(255,255,255,0.42)',
                            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10)',
                            backdropFilter: 'blur(28px) saturate(1.05)',
                            WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            position: 'relative',
                            overflow: 'hidden',
                            padding: '16px',
                            animation: 'wifiFlyDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: assetDelivered && !gemClicked ? 'pointer' : 'default',
                            transform: paymentSealed ? 'translateY(281px) scale(0.02)' : 'none',
                            opacity: paymentSealed ? 0 : 1,
                            transition: 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 600ms ease',
                            touchAction: 'none',
                          }}
                          data-pan-block={showAsset ? "1" : undefined}
                          onPointerDownCapture={(e) => {
                            if (!showAsset) {
                              // Before asset: tap to trigger gem animation
                              if (assetDelivered && !gemClicked) {
                                setGemClicked(true)
                              }
                            } else {
                              // After asset: enable swipe and tap for paginator
                              startRef.current = { x: e.clientX, y: e.clientY }
                              try { 
                                (e.currentTarget as any)?.setPointerCapture?.(e.pointerId)
                              } catch {}
                            }
                          }}
                          onPointerMoveCapture={(e) => {
                            if (!showAsset) return
                            const s = startRef.current
                            if (!s) return
                            const dx = e.clientX - s.x
                            const dy = e.clientY - s.y
                            const absX = Math.abs(dx), absY = Math.abs(dy)
                            const SWIPE = 10
                            if (absX > SWIPE && absX > absY) {
                              setPaginatorVisible(true)
                              setOrbVisible(true)
                              if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
                              visTimerRef.current = window.setTimeout(() => { 
                                setPaginatorVisible(false)
                                setOrbVisible(false)
                              }, 2000)
                            }
                          }}
                          onPointerUpCapture={(e) => {
                            if (!showAsset) return
                            const s = startRef.current
                            startRef.current = null
                            try { 
                              (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId)
                            } catch {}
                            if (!s) return
                            const dx = e.clientX - s.x
                            const dy = e.clientY - s.y
                            const absX = Math.abs(dx), absY = Math.abs(dy)
                            const SWIPE = 10
                            if (absX > SWIPE && absX > absY) {
                              // Swipe detected: change action index
                              setActionIndex((i) => {
                                const next = dx < 0 ? Math.min(2, i + 1) : Math.max(0, i - 1)
                                return next as 0 | 1 | 2
                              })
                              setPaginatorVisible(true)
                              setOrbVisible(true)
                              if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
                              visTimerRef.current = window.setTimeout(() => { 
                                setPaginatorVisible(false)
                                setOrbVisible(false)
                              }, 2000)
                            } else {
                              // Single tap: show paginator and orb
                              setPaginatorVisible(true)
                              setOrbVisible(true)
                              if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
                              visTimerRef.current = window.setTimeout(() => { 
                                setPaginatorVisible(false)
                                setOrbVisible(false)
                              }, 2000)
                            }
                          }}
                          onPointerCancelCapture={(e) => {
                            startRef.current = null
                            try { 
                              (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId)
                            } catch {}
                          }}
                        >
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.08), transparent 60%)' }} />
                          {/* Asset image (shown after gem fades) */}
                          {showAsset && (
                            <>
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 10,
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  zIndex: 4,
                                  animation: 'assetFadeIn 0.8s ease-in-out',
                                }}
                              >
                                <img 
                                  src="/glass-style.svg" 
                                  alt="Generated asset" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              </div>
                              {/* Action orb (check/refresh/x) */}
                              <div 
                                style={{ 
                                  position: 'absolute', 
                                  inset: 10, 
                                  display: 'grid', 
                                  placeItems: 'center', 
                                  zIndex: 6, 
                                  pointerEvents: 'auto', 
                                  opacity: orbVisible ? 1 : 0, 
                                  transition: 'opacity 160ms ease' 
                                }}
                              >
                                <div 
                                  className="refresh-orb" 
                                  style={{ ['--rf-d' as any]: '40px', width: '40px', height: '40px' }} 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (actionIndex === 0) { 
                                      setSealed(true)
                                    } else if (actionIndex === 2) {
                                      // X action - could trigger rejection/removal
                                      console.log('Reject action')
                                    }
                                  }}
                                >
                                  <div className="refresh-orb__icon" aria-hidden style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                                    {actionIndex === 0 ? (
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L9 17L20 6" /></svg>
                                    ) : actionIndex === 1 ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                                    ) : (
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="M6 6 18 18" /></svg>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Paginator dots */}
                              <div aria-hidden style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridAutoFlow: 'column', gap: 6, opacity: paginatorVisible ? 1 : 0, transition: 'opacity 220ms ease', zIndex: 5 }}>
                                {[0,1,2].map((i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 999,
                                      background: (actionIndex === i) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                                      boxShadow: (actionIndex === i) ? '0 0 4px rgba(255,255,255,0.45)' : 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                          {/* Icon */}
                          {!showAsset && (
                            <>
                              {manualMode ? (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="61"
                                  height="61"
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="rgba(255,255,255,0.9)" 
                                  strokeWidth="0.75" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    animation: 'gemGlow 2s ease-in-out infinite',
                                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                                    transformOrigin: 'center',
                                  }}
                                >
                                  <path d="M12 13v8"/>
                                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                                  <path d="m8 17 4-4 4 4"/>
                                </svg>
                              ) : !assetDelivered ? (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="61" 
                                  height="61" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="rgba(255,255,255,0.9)" 
                                  strokeWidth="0.75" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  style={{
                                    position: 'relative',
                                    zIndex: 1,
                                  }}
                                >
                                  <path d="M12 20h.01" style={{ animation: 'wifiRipple 3.5s ease-in-out infinite', animationDelay: '0s' }}/>
                                  <path d="M8.5 16.429a5 5 0 0 1 7 0" style={{ animation: 'wifiRipple 3.5s ease-in-out infinite', animationDelay: '0.5s' }}/>
                                  <path d="M5 12.859a10 10 0 0 1 14 0" style={{ animation: 'wifiRipple 3.5s ease-in-out infinite', animationDelay: '1s' }}/>
                                  <path d="M2 8.82a15 15 0 0 1 20 0" style={{ animation: 'wifiRipple 3.5s ease-in-out infinite', animationDelay: '1.5s' }}/>
                                </svg>
                              ) : (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="61"
                                  height="61"
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="rgba(255,255,255,0.9)" 
                                  strokeWidth="0.75" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    animation: gemClicked ? 'gemGrowPulseShrink 3.4s ease-in-out 0.4s forwards' : 'gemGlow 2s ease-in-out infinite',
                                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                                    transformOrigin: 'center',
                                  }}
                                >
                                  <path d="M10.5 3 8 9l4 13 4-13-2.5-6"/>
                                  <path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/>
                                  <path d="M2 9h20"/>
                                </svg>
                              )}
                            </>
                          )}
                          {/* Text */}
                          {!showAsset && (
                            <div style={{ 
                              position: 'relative',
                              zIndex: 1,
                              color: 'rgba(255,255,255,0.85)', 
                              fontSize: 13, 
                              fontWeight: 500, 
                              letterSpacing: 0.2,
                              animation: manualMode ? 'textPulse 3.5s ease-in-out infinite' : assetDelivered && !gemClicked ? 'none' : assetDelivered && gemClicked ? 'textFadeOut 0.4s ease-out forwards' : 'textPulse 3.5s ease-in-out infinite',
                              animationDelay: manualMode ? '2s' : assetDelivered && gemClicked ? '0s' : '2s',
                              textAlign: 'center',
                              lineHeight: 1.3
                            }}>
                              {manualMode ? (
                                <>
                                  <div>Upload</div>
                                  <div>Asset</div>
                                </>
                              ) : !assetDelivered ? (
                                <>
                                  <div>Outsourcing</div>
                                  <div>talent...</div>
                                </>
                              ) : (
                                <>
                                  <div>Asset</div>
                                  <div>delivered.</div>
                                </>
                              )}
                            </div>
                          )}
                          <style>
                            {`
                              @keyframes wifiRipple {
                                0% { opacity: 0.3; }
                                50% { opacity: 1; }
                                100% { opacity: 0.3; }
                              }
                              @keyframes textPulse {
                                0% { opacity: 0.3; }
                                50% { opacity: 1; }
                                100% { opacity: 0.3; }
                              }
                              @keyframes wifiFlyDown {
                                0% {
                                  opacity: 0;
                                  transform: translateY(-30px) scale(0.9);
                                }
                                100% {
                                  opacity: 1;
                                  transform: translateY(0) scale(1);
                                }
                              }
                              @keyframes gemGlow {
                                0% {
                                  transform: scale(1);
                                  filter: drop-shadow(0 0 12px rgba(255,255,255,0.5));
                                }
                                50% {
                                  transform: scale(1.08);
                                  filter: drop-shadow(0 0 24px rgba(255,255,255,0.95));
                                }
                                100% {
                                  transform: scale(1);
                                  filter: drop-shadow(0 0 12px rgba(255,255,255,0.5));
                                }
                              }
                              @keyframes gemGrowPulseShrink {
                                0% {
                                  transform: translateY(0) scale(1);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 12px rgba(255,255,255,0.5));
                                }
                                20% {
                                  transform: translateY(18px) scale(1.64);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 20px rgba(255,255,255,0.8));
                                }
                                30% {
                                  transform: translateY(18px) scale(1.7);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 32px rgba(255,255,255,1));
                                }
                                40% {
                                  transform: translateY(18px) scale(1.64);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 20px rgba(255,255,255,0.8));
                                }
                                50% {
                                  transform: translateY(18px) scale(1.7);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 32px rgba(255,255,255,1));
                                }
                                60% {
                                  transform: translateY(18px) scale(1.64);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 20px rgba(255,255,255,0.8));
                                }
                                70% {
                                  transform: translateY(18px) scale(1.7);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 32px rgba(255,255,255,1));
                                }
                                80% {
                                  transform: translateY(18px) scale(1.64);
                                  opacity: 1;
                                  filter: drop-shadow(0 0 20px rgba(255,255,255,0.8));
                                }
                                100% {
                                  transform: translateY(18px) scale(0);
                                  opacity: 0;
                                  filter: drop-shadow(0 0 32px rgba(255,255,255,1));
                                }
                              }
                              @keyframes textFadeOut {
                                0% { opacity: 1; }
                                100% { opacity: 0; }
                              }
                              @keyframes assetFadeIn {
                                0% { opacity: 0; transform: scale(0.9); }
                                100% { opacity: 1; transform: scale(1); }
                              }
                            `}
                          </style>
                        </div>
                      </div>
                      {/* Payment block - only show when payment was dropped, not in manual mode */}
                      {paymentDropped && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${sealed ? '111px' : '-30px'}, 0) scale(${sealed ? 0.02 : 1})`,
                            opacity: sealed ? 0 : 1,
                            zIndex: 1,
                            transition: 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 600ms ease',
                          }}
                        >
                          <PaymentBlock width={220} />
                        </div>
                      )}
                    </>
                  )}
                  {!dropMode && !paymentDropped && !(secondPaneCollapsing || secondPaneDone) && (
                    <Research title="Research" description="Style & Creative Direction" width={150} />
                  )}
                  <VibePanel
                    anchorRect={null as any}
                    visible={!dropMode && !paymentDropped && vibeVisible && !secondPaneDone && !secondPaneCollapsing}
                    usePortal={false}
                    anchorCircleSize={circleSize}
                    panelId="first"
                    badgeText={firstBadge}
                  />
                  {(dropMode || secondPaneCollapsing || secondPaneDone || paymentDropped) && (
                    <div
                      aria-label="research-progress-badge"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${(BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE}px, 0) scale(${base.scale})`,
                        transformOrigin: 'center center',
                        width: 44,
                        height: 44,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.92)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1,
                        zIndex: 4,
                        pointerEvents: 'none',
                        opacity: circleFadingOut ? 0 : 1,
                        transition: 'opacity 400ms ease',
                      }}
                    >
                      <span>{firstBadge}</span>
                    </div>
                  )}
                  {!dropMode && !paymentDropped && logoTaskMounted && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        // Align horizontally with center, place above the badge by 16px gap
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (132 / 2))}px, 0) scale(${base.scale}) translateY(${logoTaskShown ? 0 : -64}px)`,
                        transformOrigin: 'center center',
                        opacity: logoTaskShown ? 1 : 0,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        zIndex: 5,
                      }}
                    >
                      <TaskItem
                        text="Logo Generation"
                        gap={64}
                        tooltipVariant="circle"
                        mode="chain"
                        variant="unified"
                        progressPercent={0}
                        chipOnly
                        enableSwipeInfo
                        labelVisibility="auto"
                        infoTitle="Logo Generation"
                        infoText="Let's generate the logo for your brand."
                      />
                    </div>
                  )}

                  {!dropMode && !paymentDropped && typoTaskMounted && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        // Same anchored placement as first chip, reuse fly-in
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (132 / 2))}px, 0) scale(${base.scale}) translateY(${typoTaskShown ? 0 : -64}px)`,
                        transformOrigin: 'center center',
                        opacity: typoTaskShown ? 1 : 0,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        zIndex: 5,
                      }}
                    >
                      <TaskItem
                        text="Typography & Color"
                        gap={64}
                        tooltipVariant="circle"
                        mode="chain"
                        variant="unified"
                        progressPercent={0}
                        chipOnly
                        morphOnOutsource
                        enableSwipeInfo
                        labelVisibility="auto"
                        infoTitle="Typography & Color"
                        infoText="Set type styles and color palette for your brand."
                      />
                    </div>
                  )}

                  {/* Third task item - appears after payment & deliverable shrink */}
                  {!dropMode && paymentSealed && thirdTaskMounted && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        // Same anchored placement as first chip, reuse fly-in
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (132 / 2))}px, 0) scale(${base.scale}) translateY(${thirdTaskShown ? 0 : -64}px)`,
                        transformOrigin: 'center center',
                        opacity: thirdTaskShown ? 1 : 0,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        zIndex: 5,
                      }}
                    >
                      <div style={{ position: 'relative' }} className="third-task-wrapper">
                        <style>{`
                          .third-task-wrapper .label-post {
                            width: auto !important;
                            max-width: fit-content !important;
                            padding-left: 16px !important;
                            padding-right: 16px !important;
                          }
                        `}</style>
                        <div style={{
                          position: 'relative',
                          transform: uploadSealed ? 'translateY(68px) scale(0.02)' : 'scale(1)',
                          transformOrigin: 'center center',
                          transition: 'transform 260ms ease, opacity 260ms ease',
                          opacity: uploadSealed ? 0 : 1,
                          pointerEvents: uploadSealed ? 'none' : 'auto',
                        }}>
                        <TaskItem
                          text="Brand Tagline"
                          gap={64}
                          tooltipVariant="circle"
                          mode="chain"
                          variant="unified"
                          chipOnly
                          morphOnOutsource={!manualMode}
                          enableSwipeInfo
                          labelVisibility="auto"
                          infoTitle={manualMode ? "Brand Tagline (Upload)" : "Brand Tagline"}
                          infoText={manualMode ? "Upload your brand notes document for AI processing." : "Create brand tagline with AI assistance."}
                        />
                        {/* Progress overlay matching Research block format */}
                        {uploadProcessing && !uploadConfirming && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}>
                            <ProgMeter
                              percent={uploadProgress}
                              size={110}
                              variant={2}
                              stroke={2}
                              trackColor={'transparent'}
                              alpha={0.95}
                              filmOpacity={0}
                              className="prog-meter--bare"
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'grid',
                              placeItems: 'center',
                            }}>
                              <div style={{
                                textAlign: 'center',
                                transform: 'translateY(2px)',
                                width: 90,
                              }}>
                                <div style={{
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  letterSpacing: 0.2,
                                  marginBottom: 3,
                                }}>
                                  {uploadProgress}%
                                </div>
                                <div style={{
                                  color: 'rgba(255,255,255,0.9)',
                                  fontWeight: 500,
                                  fontSize: 10,
                                  lineHeight: 1.2,
                                  letterSpacing: 0.2,
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  hyphens: 'auto',
                                }}>
                                  {uploadProgressText}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Upload UI overlay when manual mode is selected */}
                        {manualMode && !uploadProcessing && !uploadConfirming && (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.md"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  console.log('📄 File selected:', file.name, file.type, file.size)
                                  // Start processing animation
                                  setUploadProcessing(true)
                                  setUploadProgress(1)
                                  uploadProgStartRef.current = null
                                  
                                  const DURATION = 6000 // 6 seconds
                                  const step = (ts: number) => {
                                    if (uploadProgStartRef.current == null) uploadProgStartRef.current = ts
                                    const elapsed = ts - uploadProgStartRef.current
                                    const p = Math.min(100, Math.round((elapsed / DURATION) * 100))
                                    setUploadProgress(p)
                                    
                                    // Update progress text based on completion percentage
                                    if (p < 25) {
                                      setUploadProgressText('Reading document...')
                                    } else if (p < 50) {
                                      setUploadProgressText('Analyzing content...')
                                    } else if (p < 75) {
                                      setUploadProgressText('Extracting insights...')
                                    } else if (p < 100) {
                                      setUploadProgressText('Finalizing...')
                                    }
                                    
                                    if (p < 100) {
                                      uploadRafRef.current = requestAnimationFrame(step)
                                    } else {
                                      uploadRafRef.current = null
                                      setUploadProgressText(null)
                                      // Keep processing true briefly to show complete circle, then show checkmark
                                      setTimeout(() => {
                                        setUploadProcessing(false)
                                        setUploadConfirming(true)
                                        // Show checkmark for 2 seconds, then seal
                                        setTimeout(() => {
                                          setUploadConfirming(false)
                                          setUploadSealed(true)
                                          // Wait for seal animation, then show result pane
                                          setTimeout(() => {
                                            setResultPaneVisible(true)
                                            requestAnimationFrame(() => setResultPaneShown(true))
                                          }, 300)
                                        }, 2000)
                                      }, 300)
                                      // Processing complete
                                      try {
                                        window.dispatchEvent(new CustomEvent('ada-manual-file-processed', {
                                          detail: { file, name: file.name, size: file.size, type: file.type }
                                        }))
                                      } catch (err) {
                                        console.error('Error dispatching file processed event:', err)
                                      }
                                    }
                                  }
                                  uploadRafRef.current = requestAnimationFrame(step)
                                  
                                  try {
                                    window.dispatchEvent(new CustomEvent('ada-manual-file-uploaded', {
                                      detail: { file, name: file.name, size: file.size, type: file.type }
                                    }))
                                  } catch (err) {
                                    console.error('Error dispatching file upload event:', err)
                                  }
                                }
                              }}
                            />
                            <div 
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 132,
                                height: 132,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                                zIndex: 10,
                              }}
                              onClick={() => {
                                console.log('🖱️ Upload icon clicked, opening file picker...')
                                fileInputRef.current?.click()
                              }}
                            >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="50" 
                              height="50" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="rgba(255,255,255,0.9)" 
                              strokeWidth="1" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{
                                animation: 'gemGlow 2s ease-in-out infinite',
                                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                              }}
                            >
                              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                              <path d="M12 10v6"/>
                              <path d="m9 13 3-3 3 3"/>
                            </svg>
                            <div style={{
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: 0.3,
                              textAlign: 'center',
                              lineHeight: 1.3,
                            }}>
                              <div>Upload</div>
                              <div>Asset</div>
                            </div>
                          </div>
                          </>
                        )}
                        {/* Checkmark animation on completion (only show when not processing and confirming) */}
                        {!uploadProcessing && uploadConfirming && (
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 20, pointerEvents: 'none' }}>
                            <style>{`@keyframes ada-check-draw{to{stroke-dashoffset:0}}`}</style>
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 12L9 17L20 6" style={{ strokeDasharray: 32, strokeDashoffset: 32, animation: 'ada-check-draw 520ms ease forwards' }} />
                            </svg>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result pane that flies in after upload completes */}
                  {resultPaneVisible && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${paneShrinking ? ((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) : ((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + 132/2 + 90/2 + 16) + 30}px, 0) scale(${base.scale}) translateY(${resultPaneShown ? 0 : -64}px) scale(${paneShrinking ? 0.02 : 1})`,
                        transformOrigin: 'center center',
                        opacity: (resultPaneShown && !paneShrinking) ? 1 : 0,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        zIndex: 6,
                      }}
                    >
                      <div style={{
                        width: 180,
                        minHeight: 140,
                        borderRadius: 14,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        padding: 16,
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.3, textAlign: 'center' }}>All Done Here!</div>
                        <div style={{ fontSize: 14, lineHeight: 1.4, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
                          We've finished this block! Your brand assets are ready for integration in other task blocks.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                          <button
                            onClick={() => {
                              // Start shrinking animation
                              setPaneShrinking(true)
                              // Trigger branding block completion
                              try {
                                window.dispatchEvent(new CustomEvent('ada-branding-block-complete'))
                              } catch (err) {
                                console.error('Error dispatching branding complete event:', err)
                              }
                              // After pane shrinks, fade out circle
                              setTimeout(() => {
                                setCircleFadingOut(true)
                              }, 400)
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
                              border: '1px solid rgba(255,255,255,0.15)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'transform 150ms ease, box-shadow 150ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.08)'
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 12L9 17L20 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tooltip overlay explaining the TaskItem */}
                  {!dropMode && !paymentDropped && logoTipMounted && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate3d(-50%, -50%, 0) translate3d(0px, ${((BADGE_OFFSET_Y - OFFSET_Y) + BADGE_Y_NUDGE) - (BADGE_RADIUS + 16 + (itemH / 2))}px, 0) scale(${base.scale}) translateY(${(!logoTipEverShown && !logoTipShown) ? -64 : 0}px)`,
                        transformOrigin: 'center center',
                        opacity: logoTipShown ? 1 : 0,
                        transition: 'transform 380ms ease, opacity 380ms ease',
                        zIndex: 7,
                        pointerEvents: logoTipShown ? 'auto' : 'none',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 30,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.14)',
                          boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                          WebkitBackdropFilter: 'blur(6px)',
                          backdropFilter: 'blur(6px)',
                          width: 185,
                          height: 240,
                          display: 'grid',
                          placeItems: 'center',
                          placeContent: 'center',
                          position: 'relative',
                          textAlign: 'center' as const,
                        }}
                      >
                        <button
                          aria-label="Close"
                          onClick={(e) => { e.stopPropagation(); onCloseLogoTip() }}
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 24,
                            height: 24,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            lineHeight: 0,
                          }}
                        >
                          <svg
                            width={16}
                            height={16}
                            viewBox="0 0 24 24"
                            aria-hidden
                            focusable="false"
                            style={{ display: 'block' }}
                          >
                            <path d="M6 6l12 12M6 18L18 6" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.3, marginBottom: 5 }}>Task Items</div>
                        <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.25, color: 'rgba(255,255,255,0.92)' }}>
                          A Task Item is the pearl in your pipeline—an asset your project needs, crafted by Ada to a shine. Choose how it’s made: Ada automates, freelancers build, or your team insources.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {!dropMode && !paymentDropped && !TASK_TREE_DECOUPLED && T.length > 0 && (() => {
              const items = ['Define sub-goal', 'Research options', 'Design component', 'Draft deliverable']
              const showIdxs = [seqIndex, Math.min(seqIndex + 1, T.length - 1)]
              return (
                <>
                  {showIdxs.map((ii, k) => {
                    const t = T[ii]
                    const isActive = k === 0
                    return (
                      <div
                        key={`ti-${ii}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          transform: `translate3d(-50%, -50%, 0) translate3d(${t.tx}px, ${t.ty}px, 0) scale(${t.scale})`,
                          transformOrigin: 'center center',
                          zIndex: isActive ? 2 : 1,
                          opacity: isActive ? 1 : 0.35,
                          transition: 'opacity 180ms ease',
                        }}
                        onClick={isActive ? () => setSeqIndex((v) => Math.min(v + 1, T.length - 1)) : undefined}
                      >
                        <TaskItem
                          text={items[ii]}
                          gap={64}
                          tooltipVariant="circle"
                          mode="chain"
                          variant="unified"
                          progressPercent={0}
                          exposeAnchors={(a: any) => {
                            onExposeAnchors(ii, a)
                          }}
                        />
                      </div>
                    )
                  })}
                </>
              )
            })()}

            {/* Hidden measurer */}
            <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
              <TaskItem text="Measure" gap={64} variant="unified" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
