import React, { useEffect, useRef, useState } from 'react'
import './vision-primitive.css'
import VisionText from './vision-text'
import OnOffButton from './on-off-switch/on-off-button'
// Edit-mode utils
import { enterEdit } from './utils/edit-mode/enter-edit'
import { cancelEdit as utilCancelEdit } from './utils/edit-mode/cancel-edit'
import { commitEdit as utilCommitEdit } from './utils/edit-mode/commit-edit'
import { updateDraft as utilUpdateDraft } from './utils/edit-mode/update-draft'
import { editClass } from './utils/edit-mode/edit-class'
// Move-mode utils
import { scheduleMoveActivation } from './utils/move-mode/schedule-move'
import { updateDrag as utilUpdateDrag } from './utils/move-mode/update-drag'
import { bindOutsideDrop } from './utils/move-mode/bind-outside-drop'
import { moveClass } from './utils/move-mode/move-class'
import { wiggleVars } from './utils/move-mode/wiggle-vars'
import { finalizeMove } from './utils/move-mode/finalize-move'
// Guards
import { canEdit } from './utils/state-guards/can-edit'
import { canMove } from './utils/state-guards/can-move'
// Transforms
import { transformVars } from './utils/transforms/transform-vars'

export type VisionState = 'active' | 'locked' | 'done'

type VisionPrimitiveProps = {
  state?: VisionState
}

const VisionPrimitive: React.FC<VisionPrimitiveProps> = ({ state = 'active' }) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [savedText, setSavedText] = useState('Build a shippable prototype.')
  const [draftText, setDraftText] = useState(savedText)
  // Movement state
  const [isMoving, setIsMoving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const longPressCancelRef = useRef<null | (() => void)>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const isEditingRef = useRef(isEditing)
  useEffect(() => { isEditingRef.current = isEditing }, [isEditing])

  const onEnterEdit = () => {
    if (!canEdit(state)) return
    const res = enterEdit(savedText)
    setDraftText(res.draft)
    setIsEditing(res.isEditing)
  }

  const onCancelEdit = () => {
    const res = utilCancelEdit(savedText)
    setDraftText(res.draft)
    setIsEditing(res.isEditing)
  }

  const onCommitEdit = () => {
    const res = utilCommitEdit(draftText, savedText)
    setSavedText(res.saved)
    setIsEditing(res.isEditing)
  }

  // Begin long-press detection for move mode
  const onPointerDownRoot: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!canMove(state)) return
    if (isEditing) return
    if (e.button !== 0) return
    // Ignore taps on the status light to prevent false wiggle activations
    const t = e.target as HTMLElement | null
    if (t && t.closest('.on-off-button')) {
      return
    }
    // If already in move mode, begin dragging immediately
    if (isMoving) {
      setDragging(true)
      startRef.current = { x: e.clientX, y: e.clientY }
      activePointerIdRef.current = e.pointerId
      try { rootRef.current?.setPointerCapture(e.pointerId) } catch {}
      return
    }
    // Otherwise, schedule long-press (3s) to enter move mode
    if (longPressCancelRef.current) longPressCancelRef.current()
    longPressCancelRef.current = scheduleMoveActivation(e, (info) => {
      if (isEditingRef.current) return
      setIsMoving(true)
      setDragging(true)
      startRef.current = { x: info.x, y: info.y }
      activePointerIdRef.current = info.pointerId
      try { rootRef.current?.setPointerCapture(info.pointerId) } catch {}
    })
  }

  const onPointerMoveRoot: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragging || !isMoving) return
    const res = utilUpdateDrag(tx, ty, startRef.current, e)
    if (res.tx !== tx || res.ty !== ty) {
      setTx(res.tx)
      setTy(res.ty)
      startRef.current = res.last
    }
  }

  const clearLongPress = () => {
    if (longPressCancelRef.current) {
      longPressCancelRef.current()
      longPressCancelRef.current = null
    }
  }

  const onPointerUpRoot: React.PointerEventHandler<HTMLDivElement> = () => {
    clearLongPress()
    if (dragging) {
      setDragging(false)
      if (activePointerIdRef.current !== null) {
        try { rootRef.current?.releasePointerCapture(activePointerIdRef.current) } catch {}
        activePointerIdRef.current = null
      }
    }
  }

  // Click outside finalizes placement via util: end drag and exit move mode
  useEffect(() => {
    if (!isMoving) return
    const el = rootRef.current
    if (!el) return
    const unbind = bindOutsideDrop(el, () => {
      const res = finalizeMove({ tx, ty })
      setDragging(res.dragging)
      setIsMoving(res.isMoving)
    })
    return unbind
  }, [isMoving])

  return (
    <div
      ref={rootRef}
      className={`vision-primitive vision-primitive--${state} ${editClass(isEditing)} ${moveClass(isMoving)}`}
      onPointerDown={onPointerDownRoot}
      onPointerMove={onPointerMoveRoot}
      onPointerUp={onPointerUpRoot}
      style={{
        ...(transformVars(tx, ty) as React.CSSProperties),
        ...(isMoving ? wiggleVars(270, 5) : {}),
      }}
    >
      <div className="vision-primitive__inner" aria-hidden />

      {/* View mode text (hidden during edit) */}
      <VisionText text={savedText} onClick={!isEditing ? onEnterEdit : undefined} />

      {/* Edit overlay (contentEditable) */}
      <div
        className={`vision-primitive__editor ${draftText.trim().length === 0 ? 'is-empty' : ''}`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={(e) => setDraftText(utilUpdateDraft(e.currentTarget.textContent || ''))}
        aria-label="Edit vision statement"
      >
        {draftText ? draftText : null}
      </div>

      {/* View mode Vision pill (hidden during edit) */}
      <div className="vision-primitive__label">
        <div className="vision-primitive__label-inner">
          <OnOffButton />
          <span className="vision-primitive__badge">Vision</span>
        </div>
      </div>

      {/* Bottom controls: X Vision ✓ */}
      <div className="vision-primitive__controls">
        <button type="button" className="vision-primitive__btn vision-primitive__btn--cancel" onClick={onCancelEdit} aria-label="Cancel edit">×</button>
        <div className="vision-primitive__pill"><span className="vision-primitive__badge">Vision</span></div>
        <button type="button" className="vision-primitive__btn vision-primitive__btn--confirm" onClick={onCommitEdit} aria-label="Commit edit">✓</button>
      </div>
    </div>
  )
}

export default VisionPrimitive
