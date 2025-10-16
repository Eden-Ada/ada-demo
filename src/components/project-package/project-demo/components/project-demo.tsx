import React from 'react'
import CanvasSpace from '../mods/canvas-space'

const ProjectDemo: React.FC = () => {
  // Delegate all orchestration (background, pan/zoom, overlays, central pane)
  // to CanvasSpace. The pane is 65% larger by default inside the mod.
  return (
    <CanvasSpace
      badgeLabel="Canvas Demo"
      panePlacement="overlay"
      paneWidthRatio={0.94}
    />
  )
}

export default ProjectDemo
