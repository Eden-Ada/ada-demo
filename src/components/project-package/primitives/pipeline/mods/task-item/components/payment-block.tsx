import React from 'react'

export type PaymentBlockProps = {
  width?: number
  style?: React.CSSProperties
}

const PaymentBlock: React.FC<PaymentBlockProps> = ({ width = 180, style }) => {
  const h = Math.round(width / 1.6)
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(26,26,28,0.92), rgba(18,18,20,0.92))',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
        color: '#FFFFFF',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,0.06), rgba(255,255,255,0))' }} />
      <div style={{ position: 'absolute', left: 12, top: 10, display: 'flex', gap: 6, opacity: 0.6 }}>
        <div style={{ width: 20, height: 20, borderRadius: 20, border: '2px solid rgba(255,255,255,0.45)' }} />
        <div style={{ width: 20, height: 20, borderRadius: 20, border: '2px solid rgba(255,255,255,0.35)', transform: 'translateX(-10px)' }} />
      </div>
      <div style={{ position: 'absolute', right: 12, top: 10, width: 28, height: 22, borderRadius: 6, border: '2px solid rgba(255,255,255,0.3)', opacity: 0.7 }} />
      <div style={{ position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)', fontWeight: 600, letterSpacing: 1.8, fontSize: 10, opacity: 0.9 }}>STANDARD</div>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontWeight: 800, fontSize: 26, letterSpacing: 2 }}>
        <span style={{ opacity: 0.7 }}>•</span>
        <span style={{ paddingLeft: 8 }}>8123</span>
      </div>
      <div style={{ position: 'absolute', right: 12, bottom: 10, fontWeight: 600, fontSize: 11, letterSpacing: 1.2, opacity: 0.9 }}>01/22</div>
    </div>
  )
}

export default PaymentBlock
