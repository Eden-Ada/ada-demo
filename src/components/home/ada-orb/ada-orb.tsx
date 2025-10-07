import React from 'react'
import './ada-orb.css'
import AdaOrbSwitcher from './ada-orb-switcher'

/*
  AdaOrb: renders the circular-nav SVG and clips a looping video inside the inner grey circle.
  - Uses a responsive wrapper sized from the SVG viewBox (480x480)
  - Overlays the video and clips it with a CSS circle() that matches the inner circle geometry
    r = 187.5px, center ~ (239.5px, 239.5px) on a 480x480 canvas
    Percent equivalents: r 187.5/480 = 39.0625%, cx 49.9%, cy 49.9%
*/

type AdaOrbProps = {
  className?: string
  videoSrc?: string
}

const AdaOrb: React.FC<AdaOrbProps> = ({ className = '', videoSrc = '/magenta-mystic-swell.mp4' }) => {
  const [showTriangle, setShowTriangle] = React.useState(false)
  const [video, setVideo] = React.useState<string>(videoSrc)
  const [glassSize, setGlassSize] = React.useState<number>(225)
  const [glassInteractive, setGlassInteractive] = React.useState<boolean>(false)
  const [glassVisible, setGlassVisible] = React.useState<boolean>(true)

  // Listen for debug events to toggle the triangle visibility
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>
      if (ce.detail && typeof ce.detail.triangle === 'boolean') {
        setShowTriangle(ce.detail.triangle)
      }
      if (ce.detail && typeof ce.detail.video === 'string') {
        setVideo(ce.detail.video)
      }
    }
    window.addEventListener('ada-orb-debug' as any, handler as any)
    return () => window.removeEventListener('ada-orb-debug' as any, handler as any)
  }, [])

  // Listen for layout directives to adjust the glass pane sizing and pointer behavior.
  React.useEffect(() => {
    const onLayout = (e: Event) => {
      const ce = e as CustomEvent<{ glassSize?: number; glassInteractive?: boolean; glassVisible?: boolean }>
      if (ce.detail?.glassSize && Number.isFinite(ce.detail.glassSize)) setGlassSize(ce.detail.glassSize!)
      if (typeof ce.detail?.glassInteractive === 'boolean') setGlassInteractive(ce.detail.glassInteractive)
      if (typeof ce.detail?.glassVisible === 'boolean') setGlassVisible(ce.detail.glassVisible)
    }
    window.addEventListener('ada-orb-layout' as any, onLayout as any)
    return () => window.removeEventListener('ada-orb-layout' as any, onLayout as any)
  }, [])

  const styleVars = { ['--orb-glass-size' as any]: `${glassSize}px` } as React.CSSProperties
  return (
    <div className={`ada-orb ${glassInteractive ? 'ada-orb--glass-interactive' : ''} ${className}`} style={styleVars}>
      {/* Base ring artwork */}
      <img className="ada-orb__svg" src="/assets/circular-nav.svg" alt="Ada Orb" draggable={false} />
      {/* HTML circular overlay that clips content (video + glass) */}
      <div className="ada-orb__circle">
        <video
          className="ada-orb__video"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        {/* True glass pane over the video only (conditionally rendered) */}
        {glassVisible && <div className="ada-orb__glass-pane" aria-hidden />}
        {/* Equilateral triangle inside the circular glass pane (beneath Rive) */}
        {showTriangle && (
          <svg className="ada-orb__triangle" viewBox="0 0 225 225" aria-hidden>
            {/**
             * Perfectly inscribed equilateral triangle inside a 225x225 circle.
             * Center: (112.5,112.5). Radius reduced to 112 to avoid 1px stroke clipping.
             * Vertices at angles: -90°, 150°, 30°.
             * Computed points (rounded to 3 decimals):
             *  Top:   (112.5, 0.5)
             *  Left:  (15.105, 168.5)
             *  Right: (209.895, 168.5)
             */}
            <polygon
              points="112.5,0.5 15.105,168.5 209.895,168.5"
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeOpacity={1}
            />
          </svg>
        )}
        {/* Clipped overlay for switcher/interactive content so animations obey the circle viewport */}
        <div className="ada-orb__circle-overlay">
          <AdaOrbSwitcher />
        </div>
      </div>
      {/* Orb content switcher moved inside circle overlay */}
    </div>
  )
}

export default AdaOrb
