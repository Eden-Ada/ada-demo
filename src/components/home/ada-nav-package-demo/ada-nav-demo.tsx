import React from 'react';
import './ada-nav-demo.css';

interface AdaNavDemoProps {
  className?: string;
}

const AdaNavDemo: React.FC<AdaNavDemoProps> = ({ className = '' }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75;
    }
  }, []);
  // Pill geometry (from SVG asset)
  const PILL = { x: 52, y: 48, w: 725, h: 183, r: 30 } as const;
  // Chat rect geometry (within pill)
  const CHAT = { w: 594, h: 54, r: 30, bottom: 28 } as const;
  // Derived chat placement (centered horizontally, bottom offset)
  const CHAT_X = PILL.x + (PILL.w - CHAT.w) / 2;
  const CHAT_Y = PILL.y + (PILL.h - CHAT.bottom - CHAT.h);
  return (
    <div className={`ada-nav-demo ${className}`}>
      {/* iPad 13 Pro Landscape Navigator */}
      <div className="ada-nav-demo__container">
        {/* Base wallpaper clipped to the pill geometry */}
        <div
          className="ada-nav-demo__video-clip-zone"
          style={{
            // feed chat geometry for CSS-only Frame A blur strips
            // @ts-ignore
            '--chat-left': `${CHAT_X - PILL.x}px`,
            // @ts-ignore
            '--chat-top': `${CHAT_Y - PILL.y}px`,
            // @ts-ignore
            '--chat-w': `${CHAT.w}px`,
            // @ts-ignore
            '--chat-h': `${CHAT.h}px`,
            // @ts-ignore unify radius var used by strips
            '--pill-r': `${PILL.r}px`,
          } as React.CSSProperties}
        >
          <video
            ref={videoRef}
            className="ada-nav-demo__video"
            src="/magenta-mystic-swell.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          {/* CSS pill overlay (glassmorphic fill) */}
          <div
            className="pill-css-overlay"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              // @ts-ignore custom properties for precise alignment
              '--chat-left': `${CHAT_X - PILL.x}px`,
              // @ts-ignore
              '--chat-top': `${CHAT_Y - PILL.y}px`,
              // @ts-ignore
              '--chat-w': `${CHAT.w}px`,
              // @ts-ignore
              '--chat-h': `${CHAT.h}px`,
              // @ts-ignore
              '--chat-r': `${CHAT.r}px`,
            } as React.CSSProperties}
          >
            <div className="pill-css-chat">
              <div className="pill-css-content">
                <span className="pill-label">Ask Ada anything...</span>
                <div className="pill-send" aria-hidden>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="pill-send__icon"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    focusable={false}
                    aria-hidden={true}
                  >
                    <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/>
                    <path d="M6 12h16" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Top-left circular glass element (same styling as pill) */}
            <div
              className="pill-css-circle"
              style={{
                // Estimated placement/size; tweak as needed
                // @ts-ignore custom CSS vars
                '--circle-left': '18px',
                // @ts-ignore
                '--circle-top': '18px',
                // @ts-ignore
                '--circle-d': '60px',
                // @ts-ignore icon size
                '--circle-icon': '24px',
              } as React.CSSProperties}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="pill-css-circle__icon"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                focusable={false}
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </div>
          </div>
        </div>
        {/* Static SVG container overlay (no pill inside) */}
        <img
          src="/assets/iPad_Nav.svg"
          alt="Eden Navigator for iPad 13 Pro"
          className="ada-nav-demo__canvas"
        />
      </div>
    </div>
  );
};

export default AdaNavDemo;
