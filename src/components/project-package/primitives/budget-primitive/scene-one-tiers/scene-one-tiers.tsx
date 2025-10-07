import React from 'react'
import type { TierSegment, TierKey } from './utils/render-three-tiers'

export type SceneOneTiersProps = {
  size: number
  segments: TierSegment[]
  selected: TierKey | null
  onPick: (tier: TierKey) => void
}

const SceneOneTiers: React.FC<SceneOneTiersProps> = ({ size, segments, selected, onPick }) => {
  return (
    <svg className="budget-primitive__tiers" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {segments.map((seg) => (
        <path
          key={seg.key}
          d={seg.path}
          className={`budget-primitive__tier${selected === seg.key ? ' is-selected' : ''}`}
          onClick={() => onPick(seg.key)}
          role="button"
          aria-label={`${seg.key} budget tier`}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

export default SceneOneTiers
