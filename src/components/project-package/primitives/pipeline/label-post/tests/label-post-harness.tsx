import React, { useState } from 'react'
import LabelPost from '../components/label-post'
import { SandboxViewport, GridOverlay, TestBadge } from '../../../sandbox-env'
import '../../../vision-primitive/vision-harness.css'

const LabelPostHarness: React.FC = () => {
  const [text, setText] = useState('Task Item')

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
        {/* Centered component */}
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
          <LabelPost text={text} />
        </div>
      </SandboxViewport>
      <GridOverlay />
      <TestBadge label="Label Post Harness" />

      {/* Debug menu (top-right), only text field */}
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
            placeholder="Label text"
            style={{
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default LabelPostHarness
