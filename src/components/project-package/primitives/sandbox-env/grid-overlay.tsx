import React from 'react'
import './grid-overlay.css'

type GridOverlayProps = {
  step?: number // px between lines
  opacity?: number
  color?: string
}

const GridOverlay: React.FC<GridOverlayProps> = ({ step = 48, opacity = 0.25, color = 'rgba(255,255,255,0.6)' }) => {
  const style: React.CSSProperties = {
    ['--grid-step' as any]: `${step}px`,
    ['--grid-color' as any]: color,
    ['--grid-opacity' as any]: String(opacity),
  }
  return <div className="grid-overlay" style={style} aria-hidden />
}

export default GridOverlay
