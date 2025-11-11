import React from 'react'

export type PaymentBlockProps = {
  width?: number
  style?: React.CSSProperties
}

const PaymentBlock: React.FC<PaymentBlockProps> = ({ width = 220, style }) => {
  const h = Math.round(width * 0.59) // 130 for 220 width
  const scale = width / 220
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.42)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
        boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.85), inset -3px -3px 8px rgba(0,0,0,0.10), 0 12px 28px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(28px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.05)',
        position: 'relative',
        overflow: 'hidden',
        color: '#FFFFFF',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'radial-gradient(140px 120px at 20% 10%, rgba(255,255,255,0.08), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 18 * scale, left: 0, right: 46 * scale, color: 'rgba(255,255,255,0.86)', fontWeight: 700, letterSpacing: 1.8, fontSize: 15 * scale, pointerEvents: 'none', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', 'Helvetica Condensed', sans-serif" }}>EDEN-EXPRESS</div>
      {/* Chip icon in top-right */}
      <div style={{ position: 'absolute', top: 14 * scale, right: 14 * scale, width: 32 * scale, height: 26 * scale, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37259 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V19.8222C42 26.4496 36.6274 31.8222 30 31.8222H12C5.37258 31.8222 0 26.4496 0 19.8222V12ZM2.05447 10.9389C2.57926 5.90956 6.83177 1.98889 12 1.98889H20V12.9278H22V1.98889H30C35.1682 1.98889 39.4207 5.90956 39.9455 10.9389H32.01L28.9966 6.96224L27.3993 8.15919L31 12.9109V12.9278H40V18.8944H31V18.9091L27.3993 23.6608L28.9966 24.8577L32.0082 20.8833H39.9455C39.4207 25.9127 35.1682 29.8333 30 29.8333H22V18.8944H20V29.8333H12C6.83177 29.8333 2.57925 25.9127 2.05447 20.8833H9.99857L13.0102 24.8577L14.6075 23.6608L11 18.9001V18.8944H2V12.9278H11V12.9199L14.6075 8.15919L13.0102 6.96224L9.99686 10.9389H2.05447Z" fill="rgba(255,255,255,0.5)"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', display: 'flex', alignItems: 'center', gap: 12 * scale }}>
        <div style={{ width: 8 * scale, height: 8 * scale, borderRadius: 999, background: 'rgba(255,255,255,0.96)' }} />
        <div style={{ color: 'rgba(255,255,255,0.96)', fontWeight: 600, fontSize: 44 * scale, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums lining-nums' }}>8123</div>
      </div>
      <div style={{ position: 'absolute', right: 14 * scale, bottom: 10 * scale, color: 'rgba(255,255,255,0.92)', fontWeight: 500, fontSize: 14 * scale, letterSpacing: 1 }}>01/22</div>
    </div>
  )
}

export default PaymentBlock
