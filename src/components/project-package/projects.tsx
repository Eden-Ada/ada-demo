import React from 'react'
import './projects.css'

const Projects: React.FC = () => {
  return (
    <div className="projects-root">
      <video
        className="projects-bg"
        src="/magenta-mystic-swell.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="projects-panels">
        <div className="glass-pane glass-pane--left" />
        <div className="glass-pane glass-pane--right" />
      </div>
    </div>
  )
}

export default Projects
