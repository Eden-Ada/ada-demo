import React from 'react'
import { createPortal } from 'react-dom'

export type Vibe = { name: string; bg: string }

export type VibePanelProps = {
  anchorRect: { left: number; top: number; width: number; height: number } | null
  visible: boolean
  onClose?: () => void
  onSelect?: (vibe: Vibe, index: number) => void
  vibes?: Vibe[]
  widthFactor?: number
  heightFactor?: number
  position?: 'auto' | 'above' | 'below'
  usePortal?: boolean
  anchorCircleSize?: number // when usePortal=false, compute size from circle
  chipItems?: string[]
  chipPrefix?: string
  badgeText?: string
  panelId?: string
  spawnOnConfirm?: boolean
  collapseToCircle?: boolean
  collapseGhost?: boolean
  collapseTargetSelector?: string
  collapseOffsetY?: number
}

const DEFAULT_VIBES: Vibe[] = [
  { name: 'Minimal Clean', bg: 'radial-gradient(120px 120px at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%), linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%)' },
  { name: 'Bold Neon', bg: 'radial-gradient(140px 140px at 65% 35%, rgba(255,255,255,0.25), rgba(255,255,255,0) 70%), linear-gradient(135deg, #ff00cc 0%, #333399 100%)' },
  { name: 'Organic Earthy', bg: 'radial-gradient(120px 120px at 35% 60%, rgba(255,255,255,0.2), rgba(255,255,255,0) 70%), linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)' },
  { name: 'Retro Pop', bg: 'radial-gradient(120px 120px at 70% 65%, rgba(255,255,255,0.28), rgba(255,255,255,0) 70%), linear-gradient(135deg, #f953c6 0%, #b91d73 100%)' },
  { name: 'Luxury Serif', bg: 'radial-gradient(150px 150px at 45% 35%, rgba(255,255,255,0.28), rgba(255,255,255,0) 70%), linear-gradient(135deg, #434343 0%, #000 100%)' },
]

const TIP_IMAGES: Record<string, string> = {
  Artsy: '/vibes/artsy.png',
  Retro: '/vibes/retro.png',
  Minimal: '/vibes/minimal.png',
}

const VibePanel: React.FC<VibePanelProps> = ({
  anchorRect,
  visible,
  onClose,
  onSelect,
  vibes = DEFAULT_VIBES,
  widthFactor = 1.1,
  heightFactor = 0.9,
  position = 'auto',
  usePortal = true,
  anchorCircleSize,
  chipItems,
  chipPrefix,
  badgeText,
  panelId,
  spawnOnConfirm = true,
  collapseToCircle = true,
  collapseGhost = false,
  collapseTargetSelector,
  collapseOffsetY = 0,
}) => {
  const chipNames = React.useMemo(() => (chipItems && chipItems.length ? chipItems : ['Artsy', 'Retro', 'Minimal', 'Best Fit']), [chipItems])
  const prefix = chipPrefix || 'Vibe'
  const isNameMode = (chipPrefix || '').toLowerCase().startsWith('name')
  const suffixWeight: 400 | 500 | 600 = isNameMode ? 500 : 600
  const suffixOpacity = isNameMode ? 0.85 : 0.95
  const [selected, setSelected] = React.useState<string | null>(null)
  const [hovering, setHovering] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [targetPos, setTargetPos] = React.useState<{ x: number; y: number } | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = React.useState<{ show: boolean; x: number; y: number; name: string; caret: number }>({ show: false, x: 0, y: 0, name: '', caret: 110 })
  const lastTapRef = React.useRef<{ name: string; time: number; x: number; y: number } | null>(null)
  const [cycle, setCycle] = React.useState<{ name: string | null; stage: 0 | 1 | 2 }>({ name: null, stage: 0 })
  const [phase, setPhase] = React.useState<'idle' | 'confirming' | 'collapsed'>('idle')
  const [showOne, setShowOne] = React.useState(false)
  const handleSelect = React.useCallback((name: string) => {
    setSelected(name)
    const payload = { id: name.toLowerCase().replace(/\s+/g, '-'), name }
    try { window.dispatchEvent(new CustomEvent('ada-vibe-selected', { detail: payload })) } catch {}
    try { onSelect?.({ name, bg: '' } as any, chipNames.indexOf(name)) } catch {}
  }, [onSelect, chipNames])

  const onEnter = React.useCallback((e: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>, name: string) => {
    console.log('[VibePanel] hover enter', { name, type: e.type })
    try { console.log('[VibePanel] computed transform ->', window.getComputedStyle(e.currentTarget).transform) } catch {}
    setHovering((prev) => (prev === name ? prev : name))
  }, [])

  const showTipAt = React.useCallback((target: HTMLElement, name: string) => {
    try {
      const cr = target.getBoundingClientRect()
      const width = 220, height = 120
      const chipCenter = cr.left + cr.width / 2
      let x = Math.round(chipCenter - width / 2)
      let y = Math.round(cr.top - height - 5) // 5px gap above chip
      const maxX = Math.max(0, window.innerWidth - width - 8)
      if (x < 8) x = 8
      if (x > maxX) x = maxX
      if (y < 8) y = 8
      const caretW = 14
      let caret = Math.round(chipCenter - x - caretW / 2)
      if (caret < 6) caret = 6
      if (caret > width - caretW - 6) caret = width - caretW - 6
      setTip({ show: true, x, y, name, caret })
    } catch {}
  }, [])

  const hideTip = React.useCallback(() => setTip((t) => ({ ...t, show: false })), [])

  const onConfirm = React.useCallback(() => {
    if (!selected) return
    setPhase('confirming')
    try {
      window.dispatchEvent(new CustomEvent('ada-vibe-confirming', { detail: { panelId, name: selected } }))
    } catch {}
    setShowOne(false)
    // Stagger showing the "1"
    const t1 = window.setTimeout(() => setShowOne(true), 350)
    // Fire confirm at end of morph
    const t2 = window.setTimeout(() => {
      try {
        const id = selected.toLowerCase().replace(/\s+/g, '-')
        window.dispatchEvent(new CustomEvent('ada-vibe-confirmed', { detail: { id, name: selected } }))
      } catch {}
      setPhase('collapsed')
    }, 700)
    let t3: number | null = null
    if (spawnOnConfirm) {
      t3 = window.setTimeout(() => {
        try {
          const r = panelRef.current?.getBoundingClientRect()
          if (r) {
            const center = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
            window.dispatchEvent(new CustomEvent('ada-research-spawn', { detail: { center } }))
          }
        } catch {}
      }, 1300)
    }
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); if (t3) window.clearTimeout(t3) }
  }, [selected, spawnOnConfirm])

  const onChipClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>, name: string) => {
    e.stopPropagation()
    if (!visible) return
    const isBestFit = name.toLowerCase().includes('best')
    if (isBestFit) {
      const willExpand = cycle.name !== name || cycle.stage === 0
      setExpanded(willExpand ? name : null)
      hideTip()
      setCycle(willExpand ? { name, stage: 1 } : { name: null, stage: 0 })
      lastTapRef.current = null
      if (willExpand) handleSelect(name); else setSelected(null)
      return
    }
    // Deterministic 0->1->2->0 cycle per chip
    if (cycle.name !== name || cycle.stage === 0) {
      // Stage 0 -> 1: expand
      setExpanded(name)
      hideTip()
      setCycle({ name, stage: 1 })
      lastTapRef.current = null
      handleSelect(name)
      return
    }
    if (cycle.stage === 1) {
      // Stage 1 -> 2: show tooltip
      showTipAt(e.currentTarget, name)
      setCycle({ name, stage: 2 })
      lastTapRef.current = null
      return
    }
    // Stage 2 -> 0: collapse and hide tooltip
    hideTip()
    setExpanded(null)
    setSelected(null)
    setCycle({ name: null, stage: 0 })
    lastTapRef.current = null
  }, [visible, cycle, hideTip, showTipAt, handleSelect])

  const onLeave = React.useCallback((e?: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) => {
    console.log('[VibePanel] hover leave', { type: e?.type })
    setHovering((prev) => (prev ? null : prev))
  }, [])

  const onFocusIn = React.useCallback((name: string) => {
    console.log('[VibePanel] focus in', name)
    setHovering(name)
  }, [])

  const onFocusOut = React.useCallback(() => {
    console.log('[VibePanel] focus out')
    setHovering(null)
  }, [])

  React.useEffect(() => { console.log('[VibePanel] hovering ->', hovering) }, [hovering])
  React.useEffect(() => {
    if (!visible) {
      setExpanded(null)
      setTip((t) => ({ ...t, show: false }))
    }
  }, [visible])

  // Listen for badge pulse requests to momentarily shrink the collapsed circle (inline only)
  React.useEffect(() => {
    const onPulse = (evt: any) => {
      const tgt = evt?.detail?.target
      if (tgt && tgt !== panelId) return
      const el = panelRef.current
      if (!el) return
      try {
        const base = el.style.transform || window.getComputedStyle(el).transform || ''
        const orig = base
        el.style.transition = (el.style.transition || '') + ', transform 220ms ease'
        el.style.transform = `${orig} scale(0.94)`
        window.setTimeout(() => { el.style.transform = orig }, 230)
      } catch {}
    }
    window.addEventListener('ada-badge-pulse', onPulse as any)
    return () => window.removeEventListener('ada-badge-pulse', onPulse as any)
  }, [panelId])

  // When collapsing and a collapse target selector is provided, compute the target center in viewport space
  React.useEffect(() => {
    if (!collapseToCircle || !collapseTargetSelector) return
    const el = panelRef.current
    if (!el) return
    const isCollapsing = phase !== 'idle'
    if (!isCollapsing) return
    try {
      const t = document.querySelector(collapseTargetSelector) as HTMLElement | null
      if (!t) return
      const tr = t.getBoundingClientRect()
      const cx = Math.round(tr.left + tr.width / 2 - 22)
      const cy = Math.round(tr.top + tr.height / 2 - 22)
      setTargetPos({ x: cx, y: cy })
    } catch {}
  }, [phase, collapseToCircle, collapseTargetSelector])

  const applyHoverStyles = React.useCallback((el: HTMLButtonElement, active: boolean) => {
    try {
      el.style.transition = 'transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease'
      el.style.transformOrigin = 'center'
      el.style.transform = active ? 'scale(1.12)' : 'scale(1)'
      el.style.borderColor = active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.20)'
      el.style.background = active ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.14)'
      el.style.boxShadow = active ? '0 6px 16px rgba(0,0,0,0.28)' : '0 1px 3px rgba(0,0,0,0.12)'
      el.style.zIndex = active ? '2' : '1'
    } catch {}
  }, [])
  // Tooltip portal (always render above everything else)
  const tipPortal = tip.show
    ? createPortal(
        <div style={{ position: 'fixed', left: tip.x, top: tip.y, width: 220, height: 120, zIndex: 20000, overflow: 'visible', pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {TIP_IMAGES[tip.name] ? (
              <img src={TIP_IMAGES[tip.name]} alt={`${tip.name} vibe`} style={{ width: '88%', height: '76%', objectFit: 'cover', objectPosition: 'center', borderRadius: 8 }} />
            ) : (
              <div style={{ width: '88%', height: '76%', borderRadius: 8, background: 'linear-gradient(180deg, #1a1a1a, #0f0f0f)' }} />
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              left: tip.caret,
              top: 120 - 1,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '8px solid rgba(0,0,0,0.92)',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
            }}
          />
        </div>,
        document.body,
      )
    : null

  // Inline mode: render relative to parent without portal
  if (!usePortal) {
    const base = Math.round((anchorCircleSize || 120))
    const panelW = 236
    const panelH = 270
    const collapsed = (phase !== 'idle') && collapseToCircle
    const usingTarget = collapsed && !!targetPos
    return (
      <>
      <div
        role="dialog"
        aria-label="Vibe board selector"
        data-panel-id={panelId || undefined}
        style={{
          position: usingTarget ? 'fixed' : 'absolute',
          left: usingTarget ? `${targetPos!.x}px` : '50%',
          top: usingTarget
            ? `${targetPos!.y}px`
            : collapsed
            ? `${(base - panelH + 10) + (panelH / 2 - 22 + 120) + collapseOffsetY}px`
            : `${base - panelH + 10}px`,
          width: collapsed ? 44 : panelW,
          height: collapsed ? 44 : panelH,
          borderRadius: collapsed ? 9999 : 16,
          background: collapsed ? (collapseGhost ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.92)') : 'rgba(0,0,0,0.30)',
          WebkitBackdropFilter: (collapsed && collapseGhost) ? undefined : 'blur(5px)',
          backdropFilter: (collapsed && collapseGhost) ? undefined : 'blur(5px)',
          boxShadow: (collapsed && collapseGhost)
            ? 'none'
            : 'inset 1px 1px 2px rgba(255,255,255,0.50), inset -3px -3px 8px rgba(0,0,0,0.085), 0 8px 24px rgba(0,0,0,0.12), 0 16px 40px rgba(0,0,0,0.15)',
          border: 'none',
          color: 'rgba(255,255,255,0.92)',
          display: 'grid',
          gridTemplateRows: '1fr',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transform: visible
            ? (usingTarget ? 'translateX(0) translateY(0) scale(1)' : 'translateX(-50%) translateY(0) scale(1)')
            : (usingTarget ? 'translateX(0) translateY(8px) scale(0.98)' : 'translateX(-50%) translateY(8px) scale(0.98)'),
          transition: 'opacity 240ms ease, left 620ms cubic-bezier(.2,.8,.2,1), top 620ms cubic-bezier(.2,.8,.2,1), width 620ms cubic-bezier(.2,.8,.2,1), height 620ms cubic-bezier(.2,.8,.2,1), border-radius 620ms cubic-bezier(.2,.8,.2,1), background 400ms ease',
          pointerEvents: visible ? 'auto' : 'none',
          transformOrigin: 'center center',
        }}
        ref={panelRef}
      >
        <style>{`
          .vibe-chip { transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease; transform-origin: center; will-change: transform, box-shadow, background, border-color; outline: none; position: relative; }
          .vibe-chip.is-expanded, .vibe-chip:focus-visible { transform: scale(1.16); background: rgba(255,255,255,0.24) !important; border-color: rgba(255,255,255,0.35) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.28) !important; z-index: 2; }
        `}</style>
        <div
          ref={contentRef}
          style={{ position: 'relative', width: '100%', height: '100%' }}
          onPointerDownCapture={(e) => {
            const t = e.target as HTMLElement
            const insideButton = !!t.closest('button')
            if (!insideButton) {
              hideTip()
              lastTapRef.current = null
            }
          }}
        >
          {/* Chip selector (vertical list) */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 12,
              right: 12,
              bottom: 64,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignContent: 'flex-start',
              justifyContent: 'flex-start',
              opacity: phase !== 'idle' ? 0 : 1,
              transition: 'opacity 250ms ease',
            }}
          >
            {chipNames.map((name, i) => (
              <button
                key={name}
                onClick={(e) => onChipClick(e, name)}
                type="button"
                aria-pressed={selected === name}
                aria-expanded={expanded === name}
                disabled={!visible}
                className={`vibe-chip${expanded === name ? ' is-expanded' : ''}`}
                style={{
                  padding: '10px 14px',
                  borderRadius: 16,
                  border: `1px solid ${expanded === name ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.20)'}`,
                  background: expanded === name
                    ? 'rgba(255,255,255,0.24)'
                    : (selected === name ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)'),
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.2,
                  boxShadow: expanded === name
                    ? '0 6px 16px rgba(0,0,0,0.28)'
                    : (selected === name ? '0 2px 8px rgba(0,0,0,0.24)' : '0 1px 3px rgba(0,0,0,0.12)'),
                  cursor: 'pointer',
                  width: 'calc(100% - 16px)',
                  margin: '0 auto',
                  textAlign: 'left',
                  transition: 'transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                  transform: expanded === name ? 'scale(1.16)' : 'scale(1)',
                  willChange: 'transform',
                  pointerEvents: visible ? 'auto' : 'none',
                  position: 'relative',
                  zIndex: expanded === name ? 2 : 1,
                  outline: 'none',
                }}
              >
                {i < chipNames.length - 1 ? (
                  <>
                    <span style={{ fontWeight: 900 }}>{`${prefix} ${i + 1}`}</span>
                    <span style={{ fontWeight: suffixWeight, opacity: suffixOpacity }}>{` — ${name}`}</span>
                  </>
                ) : (
                  <span style={{ fontWeight: 800 }}>Let Ada choose. Best fit.</span>
                )}
              </button>
            ))}
          </div>
          {phase === 'idle' && (
          <button
            type="button"
            aria-label="Confirm selection"
            onClick={onConfirm}
            disabled={!selected}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 22,
              transform: 'translateX(-50%)',
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.20)',
              boxShadow: 'none',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: selected ? 'pointer' : 'default',
              opacity: selected ? 1 : 0.5,
              pointerEvents: selected ? 'auto' : 'none',
              transition: 'opacity 160ms ease',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          )}
        </div>
        {collapsed && !collapseGhost && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <span style={{ opacity: showOne ? 1 : 0, transition: 'opacity 200ms ease', color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{badgeText || '1'}</span>
          </div>
        )}
      </div>
      {tipPortal}
      </>
    )
  }

  if (!anchorRect) return null
  const panelW = 236
  const panelH = 270

  // Default: align panel bottom to anchor bottom then shift down to yield ~20px gap to block
  let panelTop = Math.round(anchorRect.top + anchorRect.height - panelH + 10)
  let placeBelow = false
  if (position === 'below' || (position === 'auto' && panelTop < 8)) {
    panelTop = Math.round(anchorRect.top + anchorRect.height + 12)
    placeBelow = true
  }
  const panelLeft = Math.round(anchorRect.left + anchorRect.width / 2 - panelW / 2)

  const collapsedPortal = (phase !== 'idle') && collapseToCircle
  const panelElement = (
    <div
      role="dialog"
      aria-label="Vibe board selector"
      style={{
        position: 'fixed',
        left: collapsedPortal ? Math.round(panelLeft + panelW / 2 - 22) : panelLeft,
        top: collapsedPortal ? Math.round(panelTop + panelH / 2 - 22 + 120) : panelTop,
        width: collapsedPortal ? 44 : panelW,
        height: collapsedPortal ? 44 : panelH,
        zIndex: 10000,
        borderRadius: collapsedPortal ? 9999 : 16,
        background: collapsedPortal ? (collapseGhost ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.92)') : 'rgba(0,0,0,0.30)',
        WebkitBackdropFilter: 'blur(5px)',
        backdropFilter: 'blur(5px)',
        boxShadow:
          'inset 1px 1px 2px rgba(255,255,255,0.50), inset -3px -3px 8px rgba(0,0,0,0.085), 0 8px 24px rgba(0,0,0,0.12), 0 16px 40px rgba(0,0,0,0.15)',
        border: 'none',
        color: 'rgba(255,255,255,0.92)',
        display: 'grid',
        gridTemplateRows: '1fr',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : `translateY(${placeBelow ? -8 : 8}px) scale(0.98)`,
        transition: 'opacity 260ms ease, left 620ms cubic-bezier(.2,.8,.2,1), top 620ms cubic-bezier(.2,.8,.2,1), width 620ms cubic-bezier(.2,.8,.2,1), height 620ms cubic-bezier(.2,.8,.2,1), border-radius 620ms cubic-bezier(.2,.8,.2,1), background 400ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      ref={panelRef}
    >
      <style>{`
        .vibe-chip { transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease; transform-origin: center; will-change: transform, box-shadow, background, border-color; outline: none; position: relative; }
        .vibe-chip.is-expanded, .vibe-chip:focus-visible { transform: scale(1.16); background: rgba(255,255,255,0.24) !important; border-color: rgba(255,255,255,0.35) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.28) !important; z-index: 2; }
      `}</style>
      <div ref={contentRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 12,
            right: 12,
            bottom: 64,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignContent: 'flex-start',
            justifyContent: 'flex-start',
            opacity: phase !== 'idle' ? 0 : 1,
            transition: 'opacity 250ms ease',
          }}
        >
          {chipNames.map((name, i) => (
            <button
              key={name}
              onClick={(e) => onChipClick(e, name)}
              type="button"
              aria-pressed={selected === name}
              aria-expanded={expanded === name}
              disabled={!visible}
              className={`vibe-chip${expanded === name ? ' is-expanded' : ''}`}
              style={{
                padding: '10px 14px',
                borderRadius: 16,
                border: `1px solid ${expanded === name ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.20)'}`,
                background: expanded === name
                  ? 'rgba(255,255,255,0.24)'
                  : (selected === name ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)'),
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 0.2,
                boxShadow: expanded === name
                  ? '0 6px 16px rgba(0,0,0,0.28)'
                  : (selected === name ? '0 2px 8px rgba(0,0,0,0.24)' : '0 1px 3px rgba(0,0,0,0.12)'),
                cursor: 'pointer',
                width: 'calc(100% - 24px)',
                margin: '0 12px',
                textAlign: 'left',
                transition: 'transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                transform: expanded === name ? 'scale(1.16)' : 'scale(1)',
                willChange: 'transform',
                pointerEvents: visible ? 'auto' : 'none',
                position: 'relative',
                zIndex: expanded === name ? 2 : 1,
                outline: 'none',
              }}
            >
              {i < chipNames.length - 1 ? (
                <>
                  <span style={{ fontWeight: 900 }}>{`${prefix} ${i + 1}`}</span>
                  <span style={{ fontWeight: suffixWeight, opacity: suffixOpacity }}>{` — ${name}`}</span>
                </>
              ) : (
                <span style={{ fontWeight: 800 }}>Let Ada choose. Best fit.</span>
              )}
            </button>
          ))}
          <button
            type="button"
            aria-label="Confirm selection"
            onClick={onConfirm}
            disabled={!selected}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 26,
              transform: 'translateX(-50%)',
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.14)',
              WebkitBackdropFilter: 'blur(28px) saturate(1)',
              backdropFilter: 'blur(28px) saturate(1)',
              border: 'none',
              boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: selected ? 'pointer' : 'default',
              opacity: selected ? 1 : 0.5,
              pointerEvents: selected ? 'auto' : 'none',
              transition: 'opacity 160ms ease',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
          </button>
        </div>
      </div>
      {collapsedPortal && !collapseGhost && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <span style={{ opacity: showOne ? 1 : 0, transition: 'opacity 200ms ease', color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{badgeText || '1'}</span>
        </div>
      )}
    </div>
  )
  const panelPortal = createPortal(panelElement, document.body)
  return <>{panelPortal}{tipPortal}</>
}

export default VibePanel
