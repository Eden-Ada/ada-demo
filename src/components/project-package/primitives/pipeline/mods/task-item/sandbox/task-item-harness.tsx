import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import TaskItem from '../components/task-item'
import { SandboxViewport, GridOverlay, TestBadge } from '../../../../sandbox-env'
import ConnectorRender from '../utils/connector-render'
import Connector from '../../../../connector/connector'
import '../../../vision-primitive/vision-harness.css'
import {
  computeInstanceLayout,
  createAnchorsBucket,
  setInstanceAnchors,
  computeInterInstanceLinks,
  type TaskInstanceAnchors,
} from '../utils/instance'

const TaskItemHarness: React.FC = () => {
  const [text, setText] = useState("Design and market an app's UX")
  const [count, setCount] = useState(3)
  const [scale] = useState(1)
  const [tooltipVariant, setTooltipVariant] = useState<'circle' | 'rect' | 'plain'>('circle')
  const [progressPct, setProgressPct] = useState<number>(0)

  const measureRef = useRef<HTMLDivElement | null>(null)
  const [itemH, setItemH] = useState<number>(260)
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h && Math.abs(h - itemH) > 1) setItemH(h)
  }, [text])

  // Layout instances using the new instance.ts utility
  const instances = useMemo(
    () => computeInstanceLayout({ count, itemHeight: itemH, scale, spacing: 80, origin: { x: 0, y: 0 } }),
    [count, itemH, scale]
  )
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => { setStageEl(stageRef.current) }, [])
  const anchorsRef = useRef<Array<TaskInstanceAnchors | undefined>>(createAnchorsBucket(count))
  // Preserve existing anchors across count changes (extend or shrink without wiping)
  useLayoutEffect(() => {
    const cur = anchorsRef.current
    if (count > cur.length) {
      anchorsRef.current = cur.concat(Array.from({ length: count - cur.length }))
    } else if (count < cur.length) {
      anchorsRef.current = cur.slice(0, count)
    }
    setLinkVersion((v) => v + 1)
  }, [count])
  const [linkVersion, setLinkVersion] = useState(0)

  // Shallow identity compare for anchors
  const sameAnchors = (a?: TaskInstanceAnchors, b?: TaskInstanceAnchors) => {
    if (!a || !b) return false
    return a.stageEl === b.stageEl && a.chipEl === b.chipEl && a.labelEl === b.labelEl
  }

  return (
    <div className="vision-harness">
      <video
        className="vision-harness__bg"
        src="/magenta-mystic-swell.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <SandboxViewport>
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
          <div ref={stageRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            {instances.map((t, i) => (
              <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`, transformOrigin: 'center center' }}>
                <TaskItem
                  text={text}
                  gap={64}
                  mode="internal"
                  tooltipVariant={tooltipVariant}
                  progressPercent={progressPct}
                  exposeAnchors={(a) => {
                    const prev = anchorsRef.current[i]
                    if (!sameAnchors(prev, a)) {
                      setInstanceAnchors(anchorsRef.current, i, a)
                      setLinkVersion((v) => v + 1)
                    }
                  }}
                />
              </div>
            ))}

            {/* Inter-instance connectors using the same Connector primitive */}
            {(() => {
              if (!stageEl) return null
              if (count < 2) return null
              const links = computeInterInstanceLinks(anchorsRef.current)
              if (!links.length) {
                // Fallback: use ConnectorRender deterministic composition
                const havePairs = anchorsRef.current.filter(a => a?.chipEl && a?.labelEl).length >= 2
                if (!havePairs) return null
                return (
                  <ConnectorRender
                    stageEl={stageEl}
                    anchors={anchorsRef.current}
                    zIndex={9999}
                    stroke="rgba(255,255,255,0.9)"
                    width={2.5}
                    dashArray="3 9"
                    version={linkVersion}
                  />
                )
              }
              return (
                <div key={`links-${linkVersion}`} style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
                  {links.map((ln, idx) => (
                    <Connector
                      key={`inst-link-${idx}`}
                      stageEl={stageEl}
                      fromEl={ln.fromEl}
                      toEl={ln.toEl}
                      fromSide={ln.fromSide}
                      toSide={ln.toSide}
                      orientation="vertical"
                      flow="reverse"
                      epsilon={0.5}
                      overlay="viewport"
                    />
                  ))}
                </div>
              )
            })()}

            {/* Hidden measurer for instance height */}
            <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden' }}>
              <TaskItem text={text} />
            </div>
          </div>
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Task Item Harness" />

      {/* Controls: keep minimal */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 360,
          background: 'rgba(15,15,15,0.45)',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          backdropFilter: 'blur(10px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
          zIndex: 20,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Text</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Task text"
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Instances: {count}</label>
          <input type="range" min={1} max={6} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))} />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Tooltip Style</label>
          <select
            value={tooltipVariant}
            onChange={(e) => setTooltipVariant(e.target.value as 'circle' | 'rect' | 'plain')}
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none'
            }}
          >
            <option value="circle">Style 1: Circle (curved text)</option>
            <option value="rect">Style 2: Rect (straight text)</option>
            <option value="plain">Style 3: Plain (no rect)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Progress: {progressPct}% (floor 1% when active)</label>
          <input type="range" min={0} max={100} value={progressPct} onChange={(e) => setProgressPct(parseInt(e.target.value, 10))} />
        </div>
      </div>
    </div>
  )
}

export default TaskItemHarness
