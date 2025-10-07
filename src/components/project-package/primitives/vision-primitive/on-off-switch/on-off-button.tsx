import React, { useState } from 'react'
import './on-off-switch.css'

// Simple circular on/off button sized to match the height of the Vision pill
// The circle color matches the pill background via --vision-pill-bg
// Size is computed as calc(var(--vision-pill-font-size) + 12px) so it equals
// font-size (24px) + vertical padding (6px top + 6px bottom) = 36px by default.
type OnOffButtonProps = { status?: 'active' | 'deactive'; onClick?: () => void }

const OnOffButton: React.FC<OnOffButtonProps>= ({ status = 'active', onClick }) => {
  const [stateStatus, setStateStatus] = useState<'active' | 'deactive'>(status)
  const toggle = () => {
    setStateStatus((prev) => (prev === 'active' ? 'deactive' : 'active'))
    onClick?.()
  }
  return (
    <button
      type="button"
      className={`on-off-button on-off-button--${stateStatus}`}
      aria-label="Toggle"
      onPointerDown={(e) => { e.stopPropagation() }}
      onPointerUp={(e) => { e.stopPropagation() }}
      onClick={(e) => { e.stopPropagation(); toggle() }}
    />
  )
}

export default OnOffButton
