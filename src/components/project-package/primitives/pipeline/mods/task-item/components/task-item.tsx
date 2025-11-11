import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import PaymentBlock from './payment-block'
import RefreshActivation from '../packages/task-deliverable/mods/refresh-activation'
import TaskChipTooltipMenu from '../packages/task-chip/mods/tooltip-menu'
import LabelPost from '../packages/label-post/components/label-post'
import Connector from '../../../../connector/connector'
// no long-press activation; actions appear briefly after swipe
import '../packages/task-deliverable/styles/task-deliverable.css'

export type TaskItemProps = {
  text?: string
  gap?: number
  className?: string
  style?: React.CSSProperties
  mode?: 'internal' | 'chain'
  exposeAnchors?: (a: { stageEl: HTMLElement | null; chipEl: HTMLElement | null; labelEl: HTMLElement | null }) => void
  tooltipVariant?: 'circle' | 'rect' | 'plain'
  progressPercent?: number
  progressLabel?: string
  variant?: 'duo' | 'unified'
  enableSwipeInfo?: boolean
  infoTitle?: string
  infoText?: string
  chipOnly?: boolean
  labelVisibility?: 'auto' | 'always'
  useTooltipMenu?: boolean
  morphOnOutsource?: boolean
}

const TaskItem: React.FC<TaskItemProps> = ({ text = 'Task Item', gap = 64, className, style, mode = 'internal', exposeAnchors, tooltipVariant = 'circle', progressPercent, progressLabel, variant = 'unified', enableSwipeInfo = false, infoTitle, infoText, chipOnly = false, labelVisibility = 'auto', useTooltipMenu = false, morphOnOutsource = false }) => {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const chipRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const exposeRef = useRef<typeof exposeAnchors>(exposeAnchors)
  useEffect(() => { exposeRef.current = exposeAnchors }, [exposeAnchors])
  // One-time expose after mount to avoid update loops
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const fn = exposeRef.current
      if (fn) fn({ stageEl: stageRef.current, chipEl: chipRef.current, labelEl: labelRef.current })
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cls = ['task-item-node']
  if (className) cls.push(className)

  // Chip-only variant: render just the circular TaskChip with overlay label and swipe-to-info
  if (chipOnly) {
    const size = 132
    const PROMPT_W = Math.round(Math.max(size * 1.35, 245))
    const PROMPT_H = 90
    // Outsource panes use stage-specific sizes
    const OUTSOURCE_AGENTS_W = 200
    const OUTSOURCE_AGENTS_H = 216
    const OUTSOURCE_BUDGET_W = 260
    const OUTSOURCE_BUDGET_H = 151
    // paginator is shown only when actionsVisible
    const [labelExpanded, setLabelExpanded] = useState(false)
    const [labelMenuOpen, setLabelMenuOpen] = useState(false)
    const [baseLabelWidth, setBaseLabelWidth] = useState<number | null>(null)
    const [chipProgress, setChipProgress] = useState<number>(0)
    const [assetVisible, setAssetVisible] = useState(false)
    // long-press enlarge (only after asset is visible)
    const [zoomed, setZoomed] = useState(false)
    const longTimerRef = useRef<number | null>(null)
    const longTriggeredRef = useRef(false)
    const suppressClickRef = useRef(false)
    // iteration loop state
    const [assetKey, setAssetKey] = useState(0)
    const [morphRect, setMorphRect] = useState(false)
    const [morphKind, setMorphKind] = useState<null | 'prompt' | 'outsource'>(null)
    const [promptText, setPromptText] = useState('')
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
    const [outsourceStage, setOutsourceStage] = useState<'agents' | 'budget' | 'payment' | 'search' | 'confirm'>('agents')
    const [budget, setBudget] = useState<number>(1)
    const [progressNote, setProgressNote] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [sealed, setSealed] = useState(false)
    const [sealedHidden, setSealedHidden] = useState(false)
    const downOnRefreshRef = useRef(false)
    const [actionIndex, setActionIndex] = useState<0 | 1 | 2>(0) // 0=check,1=refresh,2=x
    const [paginatorVisible, setPaginatorVisible] = useState(false)
    const [orbVisible, setOrbVisible] = useState(false)
    const [hasPayment, setHasPayment] = useState(false)
    
    const visTimerRef = useRef<number | null>(null)
    const budgetInputRef = useRef<HTMLInputElement | null>(null)
    const pillRef = useRef<HTMLDivElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const progStartRef = useRef<number | null>(null)
    const completeFiredRef = useRef(false)
    const sealedFiredRef = useRef(false)
    // compute current morph dimensions (prompt vs outsource)
    const curMorphW = (morphKind === 'outsource')
      ? (outsourceStage === 'budget' ? OUTSOURCE_BUDGET_W : OUTSOURCE_AGENTS_W)
      : PROMPT_W
    const curMorphH = (morphKind === 'outsource')
      ? (outsourceStage === 'budget' ? OUTSOURCE_BUDGET_H : OUTSOURCE_AGENTS_H)
      : PROMPT_H
    // Measure compact scene width once so it stays fixed when toggling scenes
    useLayoutEffect(() => {
      if (!labelExpanded && pillRef.current && baseLabelWidth == null) {
        setBaseLabelWidth(pillRef.current.offsetWidth)
      }
    }, [labelExpanded, baseLabelWidth])
    // Close inline menu on outside click/tap or Escape
    useEffect(() => {
      if (!labelMenuOpen) return
      const onDocDown = (ev: MouseEvent | PointerEvent) => {
        const t = ev.target as Node
        const inLabel = !!labelRef.current && labelRef.current.contains(t)
        const inChip = !!chipRef.current && chipRef.current.contains(t)
        if (!inLabel && !inChip) {
          setLabelMenuOpen(false)
          setLabelExpanded(false)
        }
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setLabelMenuOpen(false)
          setLabelExpanded(false)
        }
      }
      document.addEventListener('pointerdown', onDocDown, true)
      document.addEventListener('mousedown', onDocDown, true)
      window.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('pointerdown', onDocDown, true)
        document.removeEventListener('mousedown', onDocDown, true)
        window.removeEventListener('keydown', onKey)
      }
    }, [labelMenuOpen])
    useEffect(() => { if (outsourceStage === 'payment') setHasPayment(false) }, [outsourceStage])
    // Sync external progressPercent prop with internal chipProgress state
    useEffect(() => {
      if (progressPercent !== undefined && progressPercent >= 0) {
        setChipProgress(progressPercent)
      }
    }, [progressPercent])
    // Sync external progressLabel prop with internal progressNote state
    useEffect(() => {
      if (progressLabel !== undefined) {
        setProgressNote(progressLabel || null)
      }
    }, [progressLabel])
    useEffect(() => {
      const onSidebarDrop = () => {
        if (morphKind === 'outsource' && outsourceStage === 'payment') {
          setHasPayment(true)
          try { window.dispatchEvent(new CustomEvent('ada-task-payment-added', { detail: { source: 'sidebar' } })) } catch {}
          setTimeout(() => setOutsourceStage('search'), 200)
        }
      }
      window.addEventListener('ada-eden-block-dropped', onSidebarDrop as any)
      return () => window.removeEventListener('ada-eden-block-dropped', onSidebarDrop as any)
    }, [morphKind, outsourceStage])
    // Start an animated progress when automation is selected
    useEffect(() => {
      const startProgress = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        progStartRef.current = null
        setChipProgress(1)
        const DURATION = 2400
        const step = (ts: number) => {
          if (progStartRef.current == null) progStartRef.current = ts
          const elapsed = ts - progStartRef.current
          const p = Math.min(100, Math.round((elapsed / DURATION) * 100))
          setChipProgress(p)
          if (p < 100) {
            rafRef.current = requestAnimationFrame(step)
          } else {
            rafRef.current = null
            if (!completeFiredRef.current) {
              completeFiredRef.current = true
              try { window.dispatchEvent(new CustomEvent('ada-task-automation-complete', { detail: { percent: 100 } })) } catch {}
              setAssetVisible(true)
            }
          }
        }
        rafRef.current = requestAnimationFrame(step)
      }
      const onMode = (ev: Event) => {
        const e = ev as CustomEvent<any>
        const mode = e.detail?.mode
        if (mode === 'automation') {
          setLabelMenuOpen(false)
          setLabelExpanded(false)
          startProgress()
        } else if (mode === 'outsource' && morphOnOutsource) {
          setLabelMenuOpen(false)
          setLabelExpanded(false)
          setPaginatorVisible(false)
          setOrbVisible(false)
          setMorphKind('outsource')
          setMorphRect(true)
        }
      }
      window.addEventListener('ada-task-mode-selected', onMode as EventListener)
      return () => {
        window.removeEventListener('ada-task-mode-selected', onMode as EventListener)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }, [])
    const startRef = useRef<{ x: number; y: number } | null>(null)
    useEffect(() => () => {
      if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
      if (longTimerRef.current) window.clearTimeout(longTimerRef.current)
    }, [])
    // After shrink begins (sealed=true), fire an event right after the transform completes
    useEffect(() => {
      if (!sealed || sealedFiredRef.current) return
      const el = chipRef.current
      let fired = false
      const fire = () => {
        if (fired) return
        fired = true
        sealedFiredRef.current = true
        try { window.dispatchEvent(new CustomEvent('ada-task-chip-sealed', { detail: { title: text } })) } catch {}
        setConfirming(false)
        setSealedHidden(true)
      }
      // TransitionEnd path for precise timing
      const onEnd = (ev: any) => {
        if (!ev || ev.propertyName === 'transform') {
          el?.removeEventListener?.('transitionend', onEnd as any)
          fire()
        }
      }
      el?.addEventListener?.('transitionend', onEnd as any)
      // Fallback in case transitionend is skipped
      const t = window.setTimeout(fire, 340)
      return () => {
        el?.removeEventListener?.('transitionend', onEnd as any)
        window.clearTimeout(t)
      }
    }, [sealed, text])
    // When zoomed, collapse on outside tap
    useEffect(() => {
      if (!zoomed) return
      const onDocDown = (ev: MouseEvent | PointerEvent) => {
        const t = ev.target as Node
        const inChip = !!chipRef.current && chipRef.current.contains(t)
        if (!inChip) setZoomed(false)
      }
      document.addEventListener('pointerdown', onDocDown, true)
      document.addEventListener('mousedown', onDocDown, true)
      return () => {
        document.removeEventListener('pointerdown', onDocDown, true)
        document.removeEventListener('mousedown', onDocDown, true)
      }
    }, [zoomed])

    // Collapse morph on outside tap or Escape
    useEffect(() => {
      if (!morphRect) return
      const onDocDown = (ev: MouseEvent | PointerEvent) => {
        const t = ev.target as Node
        const inChip = !!chipRef.current && chipRef.current.contains(t)
        if (!inChip) setMorphRect(false)
      }
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMorphRect(false) }
      document.addEventListener('pointerdown', onDocDown, true)
      document.addEventListener('mousedown', onDocDown, true)
      window.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('pointerdown', onDocDown, true)
        document.removeEventListener('mousedown', onDocDown, true)
        window.removeEventListener('keydown', onKey)
      }
    }, [morphRect])

    // Regeneration: run the progress again and replace asset
    const runRegenerate = (customPrompt?: string) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      progStartRef.current = null
      setAssetVisible(false)
      setChipProgress(1)
      if (customPrompt !== undefined) {
        const t = (customPrompt ?? '').trim()
        setProgressNote(t ? `Customizing asset: '${t}'.` : 'Customizing asset...')
      } else {
        setProgressNote(null)
      }
      const DURATION = customPrompt !== undefined ? 2400 : 1800
      const step = (ts: number) => {
        if (progStartRef.current == null) progStartRef.current = ts
        const elapsed = ts - progStartRef.current
        const p = Math.min(100, Math.round((elapsed / DURATION) * 100))
        setChipProgress(p)
        if (p < 100) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          rafRef.current = null
          try { window.dispatchEvent(new CustomEvent('ada-task-asset-regenerated', { detail: { prompt: customPrompt ?? null } })) } catch {}
          setAssetKey((k) => k + 1)
          setAssetVisible(true)
          setProgressNote(null)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }

    const confirmAsset = () => {
      setConfirming(true)
      setPaginatorVisible(false)
      setOrbVisible(false)
      window.setTimeout(() => setSealed(true), 700)
    }
    const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!assetVisible) return
      if (morphRect) return
      // If interacting with the refresh activation wrapper OR the refresh orb, let it handle hold/tap
      try {
        const tgt = e.target as HTMLElement
        if (tgt.closest('.refresh-activation')) return
        if (actionIndex === 1 && tgt.closest('.refresh-orb')) return
      } catch {}
      if (zoomed) return
      const x = e.clientX, y = e.clientY
      startRef.current = { x, y }
      try { stageRef.current?.setAttribute('data-pan-block', '1') } catch {}
      try { (e.currentTarget as any)?.setPointerCapture?.(e.pointerId) } catch {}
      // seed long-press (enlarge)
      longTriggeredRef.current = false
      // detect if down started on refresh orb (used only for swipe/tap paginator visuals)
      try {
        const tgt = e.target as HTMLElement
        downOnRefreshRef.current = !!tgt?.closest?.('.refresh-orb') && (actionIndex === 1)
      } catch { downOnRefreshRef.current = false }
      if (longTimerRef.current) window.clearTimeout(longTimerRef.current)
      longTimerRef.current = window.setTimeout(() => {
        if (!assetVisible) return
        longTriggeredRef.current = true
        suppressClickRef.current = true
        setPaginatorVisible(false)
        setOrbVisible(false)
        if (downOnRefreshRef.current) {
          // morph the chip to a rounded rectangle on refresh long-press
          setMorphRect(true)
        } else {
          setZoomed(true)
        }
      }, 320)
    }
    const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
      const s = startRef.current
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      const absX = Math.abs(dx), absY = Math.abs(dy)
      const SWIPE = 10
      // cancel long-press if movement exceeds small threshold
      if (longTimerRef.current && (absX > 6 || absY > 6)) {
        window.clearTimeout(longTimerRef.current)
        longTimerRef.current = null
      }
      if (absX > SWIPE && absX > absY) {
        // show UI while moving but do not advance; stepping happens once on pointer up
        setPaginatorVisible(true)
        setOrbVisible(true)
        if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
        visTimerRef.current = window.setTimeout(() => { setPaginatorVisible(false); setOrbVisible(false) }, 2000)
      }
    }
    const onPC = (e: React.PointerEvent<HTMLDivElement>) => {
      // pointer cancelled: reset gesture state
      startRef.current = null
      try { stageRef.current?.removeAttribute('data-pan-block') } catch {}
      try { (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId) } catch {}
      if (longTimerRef.current) { window.clearTimeout(longTimerRef.current); longTimerRef.current = null }
      downOnRefreshRef.current = false
    }
    const onPU = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!assetVisible) return
      const s = startRef.current
      startRef.current = null
      try { stageRef.current?.removeAttribute('data-pan-block') } catch {}
      try { (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId) } catch {}
      if (longTimerRef.current) { window.clearTimeout(longTimerRef.current); longTimerRef.current = null }
      if (longTriggeredRef.current) {
        // swallow swipe/tap logic for a long-press
        longTriggeredRef.current = false
        downOnRefreshRef.current = false
        return
      }
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      const absX = Math.abs(dx), absY = Math.abs(dy)
      const SWIPE = 10
      if (absX > SWIPE && absX > absY) {
        setActionIndex((i) => {
          const next = dx < 0 ? Math.min(2, (i + 1) as 0|1|2) : Math.max(0, (i - 1) as 0|1|2)
          return next as 0|1|2
        })
        setPaginatorVisible(true)
        setOrbVisible(true)
        if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
        visTimerRef.current = window.setTimeout(() => { setPaginatorVisible(false); setOrbVisible(false) }, 2000)
      } else {
        // Single tap: only shows paginator/orb; tap on the refresh orb itself triggers regenerate via its own onClick
        setPaginatorVisible(true)
        setOrbVisible(true)
        if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
        visTimerRef.current = window.setTimeout(() => { setPaginatorVisible(false); setOrbVisible(false) }, 2000)
      }
      downOnRefreshRef.current = false
    }
    // No hover logic: label stays static per spec

    // No zoom mode; no outside tap handling needed

    return (
      <div
        ref={stageRef}
        className={cls.join(' ')}
        style={{ position: 'relative', width: morphRect ? curMorphW : size, height: morphRect ? curMorphH : size, display: 'grid', placeItems: 'center', touchAction: 'none', transition: 'width 220ms ease, height 220ms ease', ...style }}
        aria-label="Task Item (chip)"
        data-pan-block="1"
        onPointerDownCapture={onPD}
        onPointerMoveCapture={onPM}
        onPointerUpCapture={onPU}
        onPointerCancelCapture={onPC}
        onClickCapture={(e) => {
          if (!assetVisible) return
          if (morphRect) return
          // Allow inner orb handlers to run (check/refresh/x)
          try {
            const tgt = e.target as HTMLElement
            if ((orbVisible && tgt.closest('.refresh-orb')) || tgt.closest('.refresh-activation')) return
          } catch {}
          // suppress synthetic click after long-press
          if (suppressClickRef.current) { suppressClickRef.current = false; e.stopPropagation(); e.preventDefault(); return }
          // when morphed, allow interaction inside chip; outside handled by doc listener
          // toggle zoom off when enlarged
          if (zoomed) { setZoomed(false); e.stopPropagation(); return }
          e.stopPropagation()
          setPaginatorVisible(true)
          setOrbVisible(true)
          if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
          visTimerRef.current = window.setTimeout(() => { setPaginatorVisible(false); setOrbVisible(false) }, 2000)
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Chip */}
        <div
          ref={chipRef}
          style={{
            position: 'relative',
            width: morphRect ? curMorphW : size,
            height: morphRect ? curMorphH : size,
            transform: (() => {
              if (sealed) return 'translateY(68px) scale(0.02)'
              if (morphRect) {
                if (morphKind === 'outsource') {
                  const dy = -Math.round(((curMorphH - size) / 2) + 8) // lift by half the delta + 8px gap to match prior suspension
                  return `translateY(${dy}px)`
                }
                return 'translateY(12px)'
              }
              return zoomed ? 'translateY(-28px) scale(1.55)' : 'scale(1)'
            })(),
            transition: 'transform 260ms ease, width 220ms ease, height 220ms ease',
            transformOrigin: 'center center',
            visibility: sealedHidden ? 'hidden' : 'visible',
            pointerEvents: sealedHidden ? 'none' : 'auto',
            ['--task-chip-w' as any]: `${morphRect ? curMorphW : size}px`,
            ['--task-chip-h' as any]: `${morphRect ? curMorphH : size}px`,
            ['--task-chip-r' as any]: (morphRect ? '18px' : '999px')
          }}
        >
          <TaskChipTooltipMenu
            className={morphRect ? 'task-chip--morph' : undefined}
            state="default"
            iconStrokeWidth={0.8}
            iconAlpha={0.85}
            tooltipVariant={tooltipVariant}
            showProgress={morphRect ? false : (!confirming && (!!progressNote || (chipProgress > 0 && chipProgress < 100)))}
            progressPercent={chipProgress}
            progressLabel={progressNote ?? undefined}
            suppressTooltip={!useTooltipMenu}
            onRequestOpen={() => setLabelMenuOpen(true)}
            onModeChange={(m) => {
              if (m === 'outsource' && morphOnOutsource) {
                setMorphKind('outsource')
                setMorphRect(true)
                setPaginatorVisible(false)
                setOrbVisible(false)
                setSelectedAgent(null)
                setOutsourceStage('agents')
                setBudget(1)
              }
            }}
            style={{ ['--task-chip-w' as any]: `${morphRect ? curMorphW : size}px`, ['--task-chip-h' as any]: `${morphRect ? curMorphH : size}px`, ['--task-chip-r' as any]: (morphRect ? '18px' : '999px') }}
          />
          {/* Confirmation animated check overlay (hide after sealed to avoid tiny speck) */}
          {confirming && !morphRect && !sealed && (
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 9, pointerEvents: 'none' }}>
              <style>{`@keyframes ada-check-draw{to{stroke-dashoffset:0}}`}</style>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12L9 17L20 6" style={{ strokeDasharray: 32, strokeDashoffset: 32, animation: 'ada-check-draw 520ms ease forwards' }} />
              </svg>
            </div>
          )}
          {/* Morph content: outsource options (vertical list) */}
          {morphRect && morphKind === 'outsource' && (
            <div
              style={{ position: 'absolute', inset: 0, borderRadius: 'var(--task-chip-r)', overflow: 'hidden', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px', boxSizing: 'border-box' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {(outsourceStage === 'agents' || outsourceStage === 'budget') && (
                <div style={{ width: '100%', textAlign: 'center', color: '#FFFFFF', fontWeight: 650, fontSize: 15, letterSpacing: 0.6, opacity: 0.95, lineHeight: '16px' }}>
                  {outsourceStage === 'budget' ? 'Choose Budget' : 'Choose Outsource Agent'}
                </div>
              )}

              {outsourceStage === 'agents' ? (
                <div style={{ display: 'grid', gap: 8, width: '100%', justifyItems: 'center' }}>
                  {[
                    { key: 'fiverr', label: 'Fiverr' },
                    { key: 'upwork', label: 'Upwork' },
                    { key: 'freelancer', label: 'Freelancer.com' },
                  ].map((opt) => {
                    const active = selectedAgent === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedAgent(opt.key); setOutsourceStage('budget'); try { window.dispatchEvent(new CustomEvent('ada-task-outsource-agent-selected', { detail: { agent: opt.key } })) } catch {} }}
                        style={{
                          appearance: 'none',
                          border: active ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.32)',
                          background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
                          color: '#FFFFFF',
                          borderRadius: 12,
                          height: 40,
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          boxSizing: 'border-box',
                          width: 170,
                          justifyContent: 'flex-start',
                          boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.14)' : 'none',
                        }}
                      >
                        <span aria-hidden style={{ display: 'grid', placeItems: 'center' }}>
                          {opt.key === 'fiverr' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" fill="#00B22D" />
                              <path d="M9 6h8v2h-6v3h3v2h-3v5H9v-5H8v-2h1V8H9z" fill="#FFFFFF" />
                            </svg>
                          ) : opt.key === 'upwork' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" fill="#6FDA44" />
                              <path d="M8 8v5a3 3 0 1 0 6 0V8h-2v5a1 1 0 1 1-2 0V8H8z" fill="#FFFFFF" />
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <rect x="2" y="2" width="20" height="20" rx="10" fill="#29B2FE" />
                              <path d="M5 9l5 1 3-4 3 3-4 3 2 3-3 1-2-3-4-1z" fill="#FFFFFF" opacity="0.95" />
                            </svg>
                          )}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : outsourceStage === 'budget' ? (
                <div style={{ display: 'grid', gap: 12, width: '100%', justifyItems: 'center' }}>
                  <div style={{ position: 'relative', width: '100%', height: 48 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBudget((b) => (b <= 5 ? 1 : b - 5)) }}
                      aria-label="Decrease budget by $5"
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(1)', WebkitBackdropFilter: 'blur(28px) saturate(1)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                    </button>
                    <div
                      onClick={(e) => { e.stopPropagation(); budgetInputRef.current?.focus() }}
                      style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'block', height: 48, lineHeight: '48px', color: '#FFFFFF', fontWeight: 800, fontSize: 32, letterSpacing: 0, fontVariantNumeric: 'tabular-nums lining-nums', whiteSpace: 'nowrap', textAlign: 'center' }}
                    >
                      {`$${budget}.00`}
                      <input
                        ref={budgetInputRef}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={budget}
                        onChange={(e) => { const v = Math.max(1, parseInt(e.target.value || '0', 10) || 1); setBudget(v) }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', border: 'none', background: 'transparent', color: 'transparent', pointerEvents: 'none' }}
                        aria-label="Edit budget"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBudget((b) => (b < 5 ? 5 : b + 5)) }}
                      aria-label="Increase budget by $5"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(1)', WebkitBackdropFilter: 'blur(28px) saturate(1)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new CustomEvent('ada-task-outsource-budget-confirmed', { detail: { agent: selectedAgent, budget } })) } catch {}; setOutsourceStage('payment') }}
                    style={{
                      appearance: 'none',
                      border: '1px solid rgba(255,255,255,0.9)',
                      background: 'rgba(255,255,255,0.14)',
                      backdropFilter: 'blur(28px) saturate(1)',
                      WebkitBackdropFilter: 'blur(28px) saturate(1)',
                      color: '#FFFFFF',
                      borderRadius: 12,
                      width: '100%',
                      height: 34,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                      margin: 0
                    }}
                    aria-label="Confirm budget"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L9 17L20 6" /></svg>
                  </button>
                </div>
              ) : outsourceStage === 'payment' ? (
                <div
                  style={{ position: 'absolute', inset: 0, borderRadius: 'var(--task-chip-r)', overflow: 'hidden', zIndex: 5, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    onDragOver={(e) => { e.preventDefault() }}
                    onDrop={(e) => { e.preventDefault(); setHasPayment(true); try { window.dispatchEvent(new CustomEvent('ada-task-payment-added', { detail: { source: 'drop' } })) } catch {}; setTimeout(() => setOutsourceStage('search'), 200) }}
                    style={{
                      width: '100%',
                      display: 'grid',
                      justifyItems: 'center',
                      gap: 8,
                    }}
                  >
                    {hasPayment ? (
                      <PaymentBlock width={180} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 122,
                          borderRadius: 12,
                          border: '1px dashed rgba(255,255,255,0.45)',
                          background: 'rgba(255,255,255,0.08)',
                          backdropFilter: 'blur(28px) saturate(1)',
                          WebkitBackdropFilter: 'blur(28px) saturate(1)',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#FFFFFF'
                        }}
                        aria-label="Payment drop zone"
                      >
                        <PaymentBlock width={180} style={{ opacity: 0.35, filter: 'grayscale(1)' }} />
                      </div>
                    )}
                    {!hasPayment && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setHasPayment(true); try { window.dispatchEvent(new CustomEvent('ada-task-payment-added', { detail: { source: 'demo' } })) } catch {}; setTimeout(() => setOutsourceStage('search'), 200) }}
                        style={{
                          appearance: 'none',
                          border: '1px solid rgba(255,255,255,0.9)',
                          background: 'rgba(255,255,255,0.14)',
                          backdropFilter: 'blur(28px) saturate(1)',
                          WebkitBackdropFilter: 'blur(28px) saturate(1)',
                          color: '#FFFFFF',
                          borderRadius: 10,
                          height: 32,
                          padding: '0 10px',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer'
                        }}
                        aria-label="Insert demo payment card"
                      >
                        Add Demo Card
                      </button>
                    )}
                    <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, letterSpacing: 0.4, opacity: 0.95, textAlign: 'center', lineHeight: '16px' }}>Add Payment Method</div>
                  </div>
                </div>
              ) : (
                <div
                  style={{ position: 'absolute', inset: 0, borderRadius: 'var(--task-chip-r)', overflow: 'visible', zIndex: 5, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ position: 'relative', width: 120, color: '#FFFFFF' }} aria-label="wifi-ping">
                    <style>{`@keyframes ada-wifi-scan{0%,100%{stroke-opacity:.14}22%,42%{stroke-opacity:.85}}`}</style>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ overflow: 'visible' }}>
                      <path d="M12 20h.01" style={{ strokeOpacity: .14, animation: 'ada-wifi-scan 2600ms ease-in-out infinite', animationDelay: '0ms' }} />
                      <path d="M8.5 16.429a5 5 0 0 1 7 0" style={{ strokeOpacity: .14, animation: 'ada-wifi-scan 2600ms ease-in-out infinite', animationDelay: '520ms' }} />
                      <path d="M5 12.859a10 10 0 0 1 14 0" style={{ strokeOpacity: .14, animation: 'ada-wifi-scan 2600ms ease-in-out infinite', animationDelay: '1040ms' }} />
                      <path d="M2 8.82a15 15 0 0 1 20 0" style={{ strokeOpacity: .14, animation: 'ada-wifi-scan 2600ms ease-in-out infinite', animationDelay: '1560ms' }} />
                    </svg>
                  </div>
                  <div style={{ marginTop: -32, color: '#FFFFFF', fontWeight: 700, fontSize: 13, letterSpacing: 0.4, opacity: 0.95, textAlign: 'center', lineHeight: '16px' }}>Finding<br/>Freelancers…</div>
                </div>
              )}
            </div>
          )}
          {/* Morph content: header + chat input (prompt-only) */}
          {morphRect && morphKind === 'prompt' && (
            <div
              data-prompt-ui="1"
              style={{ position: 'absolute', inset: 0, borderRadius: 'var(--task-chip-r)', overflow: 'hidden', zIndex: 5, display: 'grid', alignContent: 'start', justifyItems: 'center', gap: 10, padding: '10px', boxSizing: 'border-box' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <style>{`[data-prompt-ui] input::placeholder{ color: rgba(255,255,255,0.9); opacity: 1; }`}</style>
              <div style={{ width: '100%', textAlign: 'center', color: '#FFFFFF', fontWeight: 650, fontSize: 15, letterSpacing: 0.6, opacity: 0.95, lineHeight: '16px' }}>
                Custom Prompt
              </div>
              <div
                style={{
                  width: 220,
                  margin: '0 auto',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.14)',
                  borderRadius: 14,
                  height: 40,
                  padding: '8px 44px 8px 12px',
                  boxSizing: 'border-box',
                  boxShadow: 'none',
                }}
              >
                <input
                  type="text"
                  value={promptText}
                  placeholder="Type a prompt…"
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: '#FFFFFF',
                    fontSize: 13,
                    letterSpacing: 0.2,
                    width: '100%',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = (promptText ?? '').trim(); setMorphRect(false); setMorphKind(null); runRegenerate(t) } }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); const t = (promptText ?? '').trim(); setMorphRect(false); setMorphKind(null); runRegenerate(t) }}
                  onPointerUp={(e) => { e.stopPropagation(); const t = (promptText ?? '').trim(); setMorphRect(false); setMorphKind(null); runRegenerate(t) }}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    appearance: 'none',
                    border: '1px solid rgba(255,255,255,0.9)',
                    background: 'rgba(255, 255, 255, 0.14)',
                    backdropFilter: 'blur(28px) saturate(1)',
                    WebkitBackdropFilter: 'blur(28px) saturate(1)',
                    color: '#FFFFFF',
                    borderRadius: 10,
                    width: 30,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                  aria-label="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {/* Asset overlay once automation completes */}
          {assetVisible && !morphRect && (
            <div
              aria-label="chip-asset"
              style={{
                position: 'absolute',
                inset: 10,
                borderRadius: 9999,
                overflow: 'hidden',
                zIndex: 4,
                pointerEvents: 'auto',
                boxShadow: 'inset 0 0 0 0 rgba(0,0,0,0)',
                background: undefined,
                backdropFilter: undefined,
                WebkitBackdropFilter: undefined,
                transform: 'none',
                transition: 'border-radius 220ms ease, background 220ms ease, backdrop-filter 220ms ease, transform 220ms ease'
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation() }}
            >
              <img src={`/glass-style.svg?v=${assetKey}`} alt="Generated asset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {/* In-chip action orb (check/refresh/x) fades in/out based on state; only after asset is visible; hidden during morph */}
          {assetVisible && !morphRect && (
            <div style={{ position: 'absolute', inset: 10, display: 'grid', placeItems: 'center', zIndex: 6, pointerEvents: 'auto', opacity: orbVisible ? 1 : 0, transition: 'opacity 160ms ease' }}>
              {actionIndex === 1 ? (
                <RefreshActivation
                  diameter={50}
                  onComplete={() => {
                    try { window.dispatchEvent(new CustomEvent('ada-task-feedback-hold-complete')) } catch {}
                    suppressClickRef.current = true
                    setPaginatorVisible(false)
                    setOrbVisible(false)
                    setMorphKind('prompt')
                    setMorphRect(true)
                  }}
                  onTap={() => { runRegenerate() }}
                  tapMs={250}
                  onActiveChange={(active) => {
                    if (active) {
                      setOrbVisible(true)
                      setPaginatorVisible(true)
                      if (visTimerRef.current) { window.clearTimeout(visTimerRef.current); visTimerRef.current = null }
                    } else {
                      if (visTimerRef.current) window.clearTimeout(visTimerRef.current)
                      visTimerRef.current = window.setTimeout(() => { setPaginatorVisible(false); setOrbVisible(false) }, 1600)
                    }
                  }}
                >
                  <div className="refresh-orb" style={{ ['--rf-d' as any]: '50px' }}>
                    <div className="refresh-orb__icon" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw-icon lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    </div>
                  </div>
                </RefreshActivation>
              ) : (
                <div className="refresh-orb" style={{ ['--rf-d' as any]: '50px' }} onClick={(e) => { e.stopPropagation(); if (actionIndex === 0) { confirmAsset() } }}>
                  <div className="refresh-orb__icon" aria-hidden>
                    {actionIndex === 0 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L9 17L20 6" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="M6 6 18 18" /></svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          

          {/* Dots paginator at bottom inside chip (post-asset only); hidden during morph */}
          {assetVisible && !morphRect && (
            <div aria-hidden style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridAutoFlow: 'column', gap: 6, opacity: paginatorVisible ? 1 : 0, transition: 'opacity 220ms ease' }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: 999, background: (actionIndex === i) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', boxShadow: (actionIndex === i) ? '0 0 4px rgba(255,255,255,0.45)' : 'none' }} />
              ))}
            </div>
          )}
        </div>
        {/* Static label post above the chip */}
        <div
          ref={labelRef}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 'calc(100% + 7px)',
            transform: sealed ? 'translateX(-50%) translateY(68px) scale(0.02)' : 'translateX(-50%) scale(1.12)',
            transformOrigin: 'bottom center',
            zIndex: 10,
            cursor: 'pointer',
            transition: 'transform 260ms ease, opacity 260ms ease',
            opacity: (zoomed || morphRect) ? 0 : (sealed ? 0 : 1),
            pointerEvents: (zoomed || morphRect) ? 'none' : 'auto',
          }}
          className="chip-label"
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setLabelExpanded((v) => !v) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e as any).stopPropagation?.(); setLabelExpanded((v) => !v) } }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: labelMenuOpen ? '8px 18px 15px 18px' : (labelExpanded ? '8px 18px' : '8.5px 12px'),
              borderRadius: 12,
              color: '#FFFFFF',
              background: 'rgba(255,255,255,0.20)',
              WebkitBackdropFilter: 'none',
              backdropFilter: 'none',
              boxShadow: 'none',
              fontWeight: labelExpanded ? 300 : 500,
              fontSize: 13,
              letterSpacing: 0.6,
              whiteSpace: (labelExpanded || labelMenuOpen) ? 'normal' : 'nowrap',
              maxWidth: labelMenuOpen ? 158 : (labelExpanded ? 260 : undefined),
              minWidth: labelMenuOpen ? 158 : undefined,
              width: labelMenuOpen ? '158px' : (!labelExpanded && !labelMenuOpen && baseLabelWidth != null) ? `${Math.max(0, baseLabelWidth - 5)}px` : undefined,
              boxSizing: labelMenuOpen ? 'border-box' as const : undefined,
              lineHeight: (labelExpanded || labelMenuOpen) ? 1.25 : 1.0,
              textAlign: 'center',
              transition: 'padding 200ms ease, max-width 200ms ease',
            }}
            ref={pillRef}
          >
            {labelMenuOpen ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ opacity: 0.95, fontWeight: 500, fontSize: 12, letterSpacing: 0.3 }}>Choose task mode</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {['automation','manual','outsource'].map((k) => (
                    <button
                      key={k}
                      onClick={(e) => {
                        e.stopPropagation()
                        try { window.dispatchEvent(new CustomEvent('ada-task-mode-selected', { detail: { mode: k } })) } catch {}
                        setLabelMenuOpen(false)
                      }}
                      style={{
                        appearance: 'none',
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: 0.3,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxSizing: 'border-box',
                        width: '130px',
                        justifyContent: 'flex-start',
                        margin: '0 auto',
                      }}
                    >
                      <span aria-hidden style={{ display: 'grid', placeItems: 'center' }}>
                        {k === 'automation' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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
                        ) : k === 'manual' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
                            <path d="M20 2v4"/>
                            <path d="M22 4h-4"/>
                            <circle cx="4" cy="20" r="2"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/>
                            <path d="M8 15H7a4 4 0 0 0-4 4v2"/>
                            <circle cx="10" cy="7" r="4"/>
                          </svg>
                        )}
                      </span>
                      <span>{k === 'automation' ? 'Automation' : k === 'manual' ? 'Manual' : 'Outsource'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : labelExpanded ? (infoText || "Let's generate the logo for your brand.") : text}
          </div>
          <div style={{ display: 'grid', placeItems: 'center', marginTop: 0 }} aria-hidden>
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 8L0 0h14L7 8z" fill="rgba(255,255,255,0.20)" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Unified variant: single rounded rectangle (no internal connector)
  if (variant === 'unified') {
    const ITEM_W = 185
    const ITEM_H = 240
    const PAD = 16
    const SIDE = PAD // no extra side margin
    const [showInfo, setShowInfo] = useState(false)
    const [showDots, setShowDots] = useState(false)
    const startRef = useRef<{ x: number; y: number } | null>(null)
    const dotsTimerRef = useRef<number | null>(null)
    useEffect(() => () => { if (dotsTimerRef.current) window.clearTimeout(dotsTimerRef.current) }, [])
    const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enableSwipeInfo) return
      const x = e.clientX, y = e.clientY
      startRef.current = { x, y }
    }
    const onPU = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enableSwipeInfo) return
      const s = startRef.current
      startRef.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const SWIPE = 16
      if (absX > SWIPE && absX > absY) {
        setShowInfo((v) => !v)
        setShowDots(true)
        if (dotsTimerRef.current) window.clearTimeout(dotsTimerRef.current)
        dotsTimerRef.current = window.setTimeout(() => setShowDots(false), 2000)
      }
    }
    return (
      <div
        ref={stageRef}
        className={cls.join(' ')}
        aria-label="Task Item"
        style={{ position: 'relative', width: ITEM_W, height: ITEM_H, ...style }}
        onPointerDown={onPD}
        onPointerUp={onPU}
      >
        <div
          ref={labelRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 30,
            padding: `${PAD}px ${SIDE}px`,
            background: 'rgba(255,255,255,0.04)',
            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.14), 0 16px 40px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(28px) saturate(1)',
            WebkitBackdropFilter: 'blur(28px) saturate(1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            overflow: 'visible',
            isolation: 'isolate',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: enableSwipeInfo && showInfo ? 0 : 1, transform: enableSwipeInfo && showInfo ? 'translateX(22px)' : 'translateX(0)', transition: 'transform 240ms ease, opacity 220ms ease' }}>
            <div ref={chipRef}>
              <TaskChipTooltipMenu
                state="default"
                iconStrokeWidth={0.8}
                iconAlpha={0.85}
                tooltipVariant={tooltipVariant}
                progressPercent={progressPercent}
              />
            </div>
            <LabelPost
              text={text}
              style={{
                maxWidth: ITEM_W - SIDE * 2 - 8,
                textAlign: 'center',
                margin: '0 auto',
                padding: '7px 16px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.14)',
                WebkitBackdropFilter: 'none',
                backdropFilter: 'none',
                boxShadow: 'none',
                width: 'max-content',
                pointerEvents: 'none',
              }}
            />
          </div>
          {enableSwipeInfo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                opacity: showInfo ? 1 : 0,
                transform: showInfo ? 'translateX(0)' : 'translateX(-22px)',
                transition: 'transform 240ms ease, opacity 220ms ease',
                pointerEvents: 'none',
                zIndex: 2,
              }}
              aria-hidden
            >
              <div style={{ textAlign: 'center', width: ITEM_W - 28 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 0.2, marginBottom: 5 }}>{infoTitle || text}</div>
                <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 11, lineHeight: 1.25, letterSpacing: 0.2 }}>{infoText || 'Task details appear here.'}</div>
              </div>
            </div>
          )}
          {enableSwipeInfo && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'grid',
                gridAutoFlow: 'column',
                gap: 6,
                opacity: showDots ? 1 : 0,
                transition: 'opacity 220ms ease',
                pointerEvents: 'none',
              }}
              aria-hidden
            >
              <div style={{ width: 6, height: 6, borderRadius: 999, background: showInfo ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)', boxShadow: showInfo ? 'none' : '0 0 4px rgba(255,255,255,0.45)' }} />
              <div style={{ width: 6, height: 6, borderRadius: 999, background: showInfo ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', boxShadow: showInfo ? '0 0 4px rgba(255,255,255,0.45)' : 'none' }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default duo variant: chip + label + internal connector (optional)
  return (
    <div ref={stageRef} className={cls.join(' ')} style={{ position: 'relative', display: 'grid', placeItems: 'center', ...style }} aria-label="Task Item">
      <div style={{ display: 'grid', placeItems: 'center', gap }}>
        {/* Top: TaskChip (with modular tooltip menu) */}
        <div ref={chipRef}>
          <TaskChipTooltipMenu state="default" iconStrokeWidth={0.8} iconAlpha={0.8} tooltipVariant={tooltipVariant} progressPercent={progressPercent} />
        </div>
        {/* Bottom: LabelPost */}
        <div ref={labelRef}>
          <LabelPost text={text} />
        </div>
      </div>
      {mode === 'internal' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          <Connector
            stageEl={mounted ? stageRef.current! : null}
            fromEl={mounted ? labelRef.current! : null}
            toEl={mounted ? chipRef.current! : null}
            orientation="vertical"
            flow="reverse"
            overlay="stage"
            fromSide="top"
            toSide="bottom"
            epsilon={1.5}
            color="rgba(255,255,255,0.9)"
            width={2.0}
            dashArray="2 5"
            svgStyle={{ zIndex: 99999, ['--conn-dash-period' as any]: '7px' }}
          />
        </div>
      )}
    </div>
  )
}

export default TaskItem
