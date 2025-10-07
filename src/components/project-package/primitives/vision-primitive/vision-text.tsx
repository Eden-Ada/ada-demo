import React from 'react'

type VisionTextProps = {
  text?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

const VisionText: React.FC<VisionTextProps> = ({ text = 'Build a shippable prototype.', onClick }) => {
  return (
    <div className="vision-primitive__text" aria-label="Vision text" onClick={onClick}>
      {text}
    </div>
  )
}

export default VisionText
