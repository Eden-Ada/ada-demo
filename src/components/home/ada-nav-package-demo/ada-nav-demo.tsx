import React from 'react';
import './ada-nav-demo.css';

interface AdaNavDemoProps {
  className?: string;
}

const AdaNavDemo: React.FC<AdaNavDemoProps> = ({ className = '' }) => {
  return (
    <div className={`ada-nav-demo ${className}`}>
      {/* iPad 13 Pro Landscape Navigator */}
      <div className="ada-nav-demo__container">
        <img
          src="/assets/iPad_Nav.svg"
          alt="Eden Navigator for iPad 13 Pro"
          className="ada-nav-demo__canvas"
        />
        
        {/* Interactive overlay for navigation elements */}
        <div className="ada-nav-demo__overlay">
          {/* Video clipping zone - targets the grey pill in SVG */}
          <div className="ada-nav-demo__video-clip-zone">
            {/* Video will be clipped to match the grey pill area */}
            <video
              className="ada-nav-demo__video"
              src="/rainbow-flow.mp4"
              autoPlay
              preload="auto"
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaNavDemo;
