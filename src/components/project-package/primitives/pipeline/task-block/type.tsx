import React, { useId } from 'react'
import './type.css'

export type TypeCategory = 'default' | 'logo' | 'automation' | 'app_ui' | 'branding'

export type TypeProps = {
  size?: number // diameter in px, defaults to 132 to fit inside 215x300 block
  category?: TypeCategory
  onChange?: (next: TypeCategory) => void
}

const Type: React.FC<TypeProps> = ({ size = 132, category = 'default' }) => {
  const id = useId()
  const cx = size / 2
  const cy = size / 2
  const r = size / 2
  const textRadius = r - 18 // more space from the circle edge, stays concentric
  const yOffset = 0 // keep concentric with the badge; adjust radius for spacing
  // Bottom semicircle path (left -> right). sweep=0 forces the lower arc for LTR text.
  const d = `M ${cx - textRadius} ${cy + yOffset} A ${textRadius} ${textRadius} 0 0 0 ${cx + textRadius} ${cy + yOffset}`

  return (
    <div className="type-circle" style={{ width: size, height: size }} aria-label={`Type circle (${category})`}>
      <svg className="type-circle__svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <path id={`type-arc-${id}`} d={d} />
        </defs>
        <text className="type-circle__text" dominantBaseline="middle" textAnchor="middle">
          <textPath href={`#type-arc-${id}`} startOffset="50%">
            {category.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </div>
  )
}

export default Type
