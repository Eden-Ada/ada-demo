import React from 'react'
import { createPortal } from 'react-dom'
import Pipeline from '../../../primitives/pipeline/pipeline'
import Connector from '../../../primitives/connector/connector'
import TaskTreeOverlay from './task-tree-overlay'
import { createAnchorsBucket } from '../../../primitives/pipeline/mods/task-item/utils/instance'
import VisionPrimitive from '../../../primitives/vision-primitive/vision-primitive'
import { deriveVisionProps } from '../../utils/vision-primitive'
import Research from '../../../../ada-demo-again/one-ada-proj/research'
import VibePanel from '../../../../ada-demo-again/one-ada-proj/vibe-panel'

export type OverlayStageProps = {
  stageRef: React.RefObject<HTMLDivElement>
  paneContainerRef: React.RefObject<HTMLDivElement>
  pipelineRef: React.RefObject<HTMLDivElement>
  visionRef: React.RefObject<HTMLDivElement>
  anchorsRef: React.MutableRefObject<any>

  worldPos: { pipeline?: { x: number; y: number }; vision?: { x: number; y: number } }
  s: number
  paneLeftLocal: number
  paneTopLocal: number
  compPaneWLocal: number
  compPaneHLocal: number
  PIPELINE_SCALE: number

  pipeProgress: Record<string, number>
  pipePairs: Array<{ a: HTMLElement; b: HTMLElement }>
  pipelinePoweredOn: boolean
  setPipelinePoweredOn: (on: boolean) => void
  enabledBlocks: string[]

  treeOpen: boolean
  treeForIndex: number | null
  treeAnchor: { x: number; y: number } | null
  anchorsVersion: number
  itemH: number
  lockedT0: { tx: number; ty: number; scale: number } | null
  seqIndex: number
  setSeqIndex: React.Dispatch<React.SetStateAction<number>>
  showResearch: boolean
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
  onExposeAnchors: (index: number, anchors: any) => void
  measureRef: React.RefObject<HTMLDivElement>

  setTreeOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTreeForIndex: React.Dispatch<React.SetStateAction<number | null>>
  setTreeAnchor: (pos: { x: number; y: number }) => void
  setAnchorsVersion: React.Dispatch<React.SetStateAction<number>>

  activeBlockElRef: React.MutableRefObject<HTMLElement | null>

  TASK_TREE_DECOUPLED: boolean

  spawnCircle: { x: number; y: number; entering: boolean } | null
  spawnRef: React.RefObject<HTMLDivElement>
  spawnSelectorVisible: boolean
  secondPaneCollapsing: boolean
  secondPaneDone: boolean

  VISION_OFFSET_X: number
  VISION_OFFSET_Y: number
  VISION_BASE_SCALE: number
  vision: any

  children?: React.ReactNode
}

export default function OverlayStage(props: OverlayStageProps) {
  const {
    stageRef,
    paneContainerRef,
    pipelineRef,
    visionRef,
    anchorsRef,
    worldPos,
    s,
    paneLeftLocal,
    paneTopLocal,
    compPaneWLocal,
    compPaneHLocal,
    PIPELINE_SCALE,
    pipeProgress,
    pipePairs,
    pipelinePoweredOn,
    setPipelinePoweredOn,
    enabledBlocks,
    treeOpen,
    treeForIndex,
    itemH,
    lockedT0,
    seqIndex,
    setSeqIndex,
    showResearch,
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
    onExposeAnchors,
    measureRef,
    setTreeOpen,
    setTreeForIndex,
    setTreeAnchor,
    setAnchorsVersion,
    activeBlockElRef,
    TASK_TREE_DECOUPLED,
    spawnCircle,
    spawnRef,
    spawnSelectorVisible,
    secondPaneCollapsing,
    secondPaneDone,
    VISION_OFFSET_X,
    VISION_OFFSET_Y,
    VISION_BASE_SCALE,
    treeAnchor,
    anchorsVersion,
    vision,
    children,
  } = props

  const [paymentDropArmed, setPaymentDropArmed] = React.useState(false)
  const [paymentPlaced, setPaymentPlaced] = React.useState(false)
  const [showTimeTooltip, setShowTimeTooltip] = React.useState(false)
  const [tooltipHasPlayed, setTooltipHasPlayed] = React.useState(false)
  
  React.useEffect(() => {
    const onBudgetConfirmed = () => setPaymentDropArmed(true)
    const onAgentSelected = () => setPaymentDropArmed(false)
    const onModeSelected = (e: any) => { if (e?.detail?.mode === 'outsource') setPaymentDropArmed(false) }
    const onPaymentAdded = () => { 
      setPaymentDropArmed(false)
      setPaymentPlaced(true)
    }
    try {
      window.addEventListener('ada-task-outsource-budget-confirmed' as any, onBudgetConfirmed as any)
      window.addEventListener('ada-task-outsource-agent-selected' as any, onAgentSelected as any)
      window.addEventListener('ada-task-mode-selected' as any, onModeSelected as any)
      window.addEventListener('ada-task-payment-added' as any, onPaymentAdded as any)
    } catch {}
    return () => {
      try {
        window.removeEventListener('ada-task-outsource-budget-confirmed' as any, onBudgetConfirmed as any)
        window.removeEventListener('ada-task-outsource-agent-selected' as any, onAgentSelected as any)
        window.removeEventListener('ada-task-mode-selected' as any, onModeSelected as any)
        window.removeEventListener('ada-task-payment-added' as any, onPaymentAdded as any)
      } catch {}
    }
  }, [])

  // Auto-hide tooltip after 4.5 seconds
  React.useEffect(() => {
    if (!showTimeTooltip) return
    const timer = setTimeout(() => {
      setShowTimeTooltip(false)
      // Dispatch event to signal asset delivery completed
      window.dispatchEvent(new CustomEvent('ada-asset-delivered'))
    }, 4500)
    return () => clearTimeout(timer)
  }, [showTimeTooltip])

  // Handle click on stage to show tooltip after payment placed
  React.useEffect(() => {
    if (!paymentPlaced) return
    
    const handleStageClick = () => {
      if (tooltipHasPlayed) return // Only play once
      console.log('🕒 Stage clicked - showing time passage tooltip')
      setShowTimeTooltip(true)
      setTooltipHasPlayed(true)
    }
    
    const stage = stageRef.current
    if (stage) {
      stage.addEventListener('click', handleStageClick)
    }
    
    return () => {
      if (stage) {
        stage.removeEventListener('click', handleStageClick)
      }
    }
  }, [paymentPlaced, stageRef, tooltipHasPlayed])

  return (
    <>
      <div 
        ref={paneContainerRef} 
        style={{ 
          position: 'absolute', 
          left: paneLeftLocal, 
          top: paneTopLocal, 
          width: compPaneWLocal, 
          height: compPaneHLocal
        }}
      >
        <div
          ref={pipelineRef}
          style={{
            position: 'absolute',
            left: (worldPos.pipeline ? worldPos.pipeline.x - paneLeftLocal : 32),
            top: (worldPos.pipeline ? worldPos.pipeline.y - paneTopLocal : 24),
            transform: `scale(${PIPELINE_SCALE})`,
            transformOrigin: 'top left',
            ['--pipeline-gap-roomy' as any]: '80px',
          }}
          onPointerDownCapture={(e) => {
            const root = pipelineRef.current
            if (!root) return
            const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pipeline .task-block'))
            const t = e.target as HTMLElement
            const idx = blocks.findIndex((b) => b.contains(t))
            if (idx < 0) return
            const stage = stageRef.current
            if (!stage) return
            const sr = stage.getBoundingClientRect()
            const blk = blocks[idx]
            activeBlockElRef.current = blk
            const br = blk.getBoundingClientRect()
            const ax = (br.left + br.width / 2 - sr.left) / s - paneLeftLocal
            const ay = (br.top - sr.top) / s - paneTopLocal
            setTreeForIndex(idx)
            setTreeAnchor({ x: Math.round(ax), y: Math.round(ay) })
            setTreeOpen((prev) => !prev || treeForIndex !== idx)
            anchorsRef.current = createAnchorsBucket(4)
            setAnchorsVersion((v) => v + 1)
          }}
        >
          <Pipeline
            className={`${treeOpen ? 'pipeline-shell--tree-open' : ''} ${!pipelinePoweredOn ? 'pipeline-shell--powered-off' : ''}`.trim()}
            entries={[
              { id: 'b1', descriptor: 'Branding' },
              { id: 'b2', descriptor: 'Design' },
              { id: 'b3', descriptor: 'Production' },
              { id: 'b4', descriptor: 'Marketing' },
              { id: 'b5', descriptor: 'Distribution' },
            ]}
            spacing="roomy"
            progressById={pipeProgress}
            enabledIds={enabledBlocks}
          />
        </div>
        {/* Task tree overlay anchored above selected block (branding path handled in component) */}
        {treeOpen && treeAnchor && (
          <TaskTreeOverlay
            left={treeAnchor.x}
            top={treeAnchor.y}
            treeForIndex={treeForIndex}
            anchorsVersion={anchorsVersion}
            itemH={itemH}
            lockedT0={lockedT0}
            secondPaneCollapsing={secondPaneCollapsing}
            secondPaneDone={secondPaneDone}
            vibeVisible={vibeVisible}
            firstBadge={firstBadge}
            logoTaskMounted={logoTaskMounted}
            logoTaskShown={logoTaskShown}
            typoTaskMounted={typoTaskMounted}
            typoTaskShown={typoTaskShown}
            logoTipMounted={logoTipMounted}
            logoTipShown={logoTipShown}
            logoTipEverShown={logoTipEverShown}
            onCloseLogoTip={onCloseLogoTip}
            seqIndex={seqIndex}
            setSeqIndex={setSeqIndex}
            onExposeAnchors={onExposeAnchors}
            measureRef={measureRef}
            showResearch={showResearch}
            TASK_TREE_DECOUPLED={TASK_TREE_DECOUPLED}
            dropArmed={paymentDropArmed}
            onPaymentPlaced={() => { /* keep armed true for now so other UI stays hidden until next step */ }}
          />
        )}
      </div>

      {/* Spawned Research circle (after vibe collapse) */}
      {spawnCircle && (
        <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 6, pointerEvents: (spawnSelectorVisible || secondPaneCollapsing) ? 'auto' : 'none' }}>
          <div ref={spawnRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate3d(-50%, -50%, 0) translate3d(${spawnCircle.x}px, ${spawnCircle.y}px, 0) translateY(${spawnCircle.entering ? 0 : -64}px)`,
              transition: 'transform 380ms ease, opacity 380ms ease',
              opacity: spawnCircle.entering ? 1 : 0,
            }}
          >
            {!(secondPaneCollapsing || secondPaneDone) && (
              <Research
                title="Research"
                description="Name Check"
                width={150}
                stages={[
                  'Scouting trends and finding names',
                  'Checking domains and social handles',
                  'Flagging conflicts and risk levels',
                  'Preparing your shortlist',
                ]}
              />
            )}
            {(spawnSelectorVisible || secondPaneCollapsing) && (
              <VibePanel
                anchorRect={null as any}
                visible={(spawnSelectorVisible || secondPaneCollapsing) && !secondPaneDone}
                usePortal={false}
                anchorCircleSize={150}
                panelId="second"
                spawnOnConfirm={false}
                collapseToCircle={true}
                collapseGhost={true}
                collapseOffsetY={10}
                chipItems={[ 'Brushline', 'Studio Loom', 'Pigment & Thread', 'Best Fit' ]}
                chipPrefix="Name"
              />
            )}
          </div>
        </div>
      )}

      <div
        ref={visionRef}
        style={{
          position: 'absolute',
          left: (worldPos.vision ? worldPos.vision.x - paneLeftLocal + VISION_OFFSET_X : 8 + VISION_OFFSET_X),
          top: (worldPos.vision ? worldPos.vision.y - paneTopLocal + VISION_OFFSET_Y : 24 + 260 + VISION_OFFSET_Y),
          transform: `scale(${VISION_BASE_SCALE})`,
          transformOrigin: 'top left',
          opacity: treeOpen ? 0.5 : 1,
          transition: 'opacity 300ms ease',
        }}
      >
        <VisionPrimitive state={deriveVisionProps(vision).state} onPowerToggle={(next) => setPipelinePoweredOn(next === 'active')} />
      </div>

      {/* Connectors between blocks (stage overlay, clipped with pane) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
        {pipePairs.map((pair, i) => {
          const stage = stageRef.current
          if (!stage || !pair.a || !pair.b) return null
          const sr = stage.getBoundingClientRect()
          const ar = pair.a.getBoundingClientRect()
          const br = pair.b.getBoundingClientRect()
          const from = { x: (ar.right - sr.left) / s - paneLeftLocal, y: (ar.top + ar.height / 2 - sr.top) / s - paneTopLocal }
          const to   = { x: (br.left - sr.left)  / s - paneLeftLocal, y: (br.top + br.height / 2 - sr.top) / s - paneTopLocal }
          return (
            <Connector
              key={`pconn-${i}`}
              from={from}
              to={to}
              radius={18}
              width={1.4}
              dashArray="2 5"
              overlay="stage"
              color="rgba(255,255,255,0.9)"
              flow="forward"
              svgStyle={{ ['--conn-dash-period' as any]: '7px', opacity: pipelinePoweredOn ? (treeOpen ? 0.5 : 1) : 0, transition: 'opacity 300ms ease' }}
            />
          )
        })}
        {(() => {
          const stage = stageRef.current
          const p = pipelineRef.current
          const v = visionRef.current
          if (!stage || !p || !v) return null
          const sr = stage.getBoundingClientRect()
          const pr = p.getBoundingClientRect()
          const vr = v.getBoundingClientRect()
          const from = { x: (vr.left + vr.width / 2 - sr.left) / s - paneLeftLocal, y: (vr.top - sr.top) / s - paneTopLocal }
          const to   = { x: (pr.left - sr.left) / s - paneLeftLocal, y: (pr.top + pr.height / 2 - sr.top) / s - paneTopLocal }
          const visOpacity = pipelinePoweredOn ? (treeOpen ? 0.5 : 1) : 0
          return (
            <Connector
              key="pconn-vision"
              from={from}
              to={to}
              radius={24}
              width={2.5}
              dashArray="3 9"
              overlay="stage"
              color="rgba(255,255,255,0.9)"
              fromAxis="vertical"
              toAxis="horizontal"
              svgStyle={{ opacity: visOpacity, transition: 'opacity 300ms ease' }}
            />
          )
        })()}
      </div>

      {/* Full viewport blur backdrop */}
      {showTimeTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'backdrop-filter 300ms ease',
          }}
        />,
        document.body
      )}

      {/* Time passage tooltip */}
      {showTimeTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(3)',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          <style>
            {`
              @keyframes fadeInOut {
                0% { opacity: 0; transform: scale(0.9); }
                10% { opacity: 1; transform: scale(1); }
                90% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.95); }
              }
              @keyframes rotateClock {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.88))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16,
              padding: '20px 32px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              animation: 'fadeInOut 4.5s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {/* Animated clock icon */}
              <div style={{ position: 'relative', width: 24, height: 24 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.9)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    animation: 'rotateClock 2s linear infinite',
                    transformOrigin: '12px 12px'
                  }}
                >
                  <path d="M12 6v6"/>
                </svg>
              </div>
              {/* Text */}
              <div style={{ 
                color: 'rgba(255,255,255,0.95)', 
                fontSize: 16, 
                fontWeight: 600, 
                letterSpacing: 0.3,
                whiteSpace: 'nowrap'
              }}>
                Two days later...
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {children}
    </>
  )
}
