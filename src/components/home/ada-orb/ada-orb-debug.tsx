import React, { useState } from 'react'
import './ada-orb-debug.css'

// Lightweight floating debug menu that emits CustomEvents to control AdaOrbThin
// Does NOT wrap or sit inside the orb/glass containers; it's position:fixed

const AdaOrbDebug: React.FC = () => {
  const [open, setOpen] = useState(false)

  const emit = (detail: any) => {
    const evt = new CustomEvent('ada-orb-debug', { detail })
    window.dispatchEvent(evt)
  }

  return (
    <div className="ada-orb-debug" aria-label="Ada Orb Debug Menu">
      <button className="ada-orb-debug__toggle" onClick={() => setOpen(v => !v)}>
        ⚙︎ Orb Debug
      </button>
      {open && (
        <div className="ada-orb-debug__panel">
          <div className="ada-orb-debug__row">
            <strong>Videos</strong>
            <button onClick={() => emit({ video: '/rainbow-flow.mp4' })}>rainbow-flow.mp4</button>
            <button onClick={() => emit({ video: '/color-zoom-flow-two.mp4' })}>color-zoom-flow-two.mp4</button>
            <button onClick={() => emit({ video: '/merge-color-blend.mp4' })}>merge-color-blend.mp4</button>
            <button onClick={() => emit({ video: '/purple-lava.mp4' })}>purple-lava.mp4</button>
            <button onClick={() => emit({ video: '/aqua-swirl.mp4' })}>aqua-swirl.mp4</button>
            <button onClick={() => emit({ video: '/orb-swirl-flow-two.mp4' })}>orb-swirl-flow-two.mp4</button>
          </div>
          <div className="ada-orb-debug__row">
            <button onClick={() => emit({ src: '/assets/rive-orb-thin/halo-2.0-white.riv' })}>halo-2.0-white.riv</button>
            <button onClick={() => emit({ src: '/assets/rive-orb-thin/halo-2.0-simple-white.riv' })}>halo-2.0-simple-white.riv</button>
          </div>
          <div className="ada-orb-debug__row">
            <button onClick={() => emit({ triangle: true })}>Triangle On</button>
            <button onClick={() => emit({ triangle: false })}>Triangle Off</button>
          </div>
          <div className="ada-orb-debug__row">
            <button onClick={() => emit({ preset: 'default' })}>Default</button>
            <button onClick={() => emit({ listening: true, thinking: false, speaking: false })}>Listening</button>
            <button onClick={() => emit({ listening: false, thinking: true, speaking: false })}>Thinking</button>
            <button onClick={() => emit({ listening: false, thinking: false, speaking: true })}>Speaking</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdaOrbDebug
