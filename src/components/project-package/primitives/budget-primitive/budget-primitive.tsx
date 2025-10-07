import React, { useMemo, useState } from 'react'
import './budget-primitive.css'
import { renderThreeTiers } from './scene-one-tiers/utils/render-three-tiers'
import SceneOneTiers from './scene-one-tiers/scene-one-tiers'

export type BudgetTier = 'low' | 'medium' | 'high'

export type BudgetPrimitiveProps = {
  initialTier?: BudgetTier | null
  onSelect?: (tier: BudgetTier) => void
}

type BudgetScene = 'tiers'

const SIZE = 360
const OUTER_R = 148
const WEDGE_OUTER_R = OUTER_R - 18 // leave even margin from the glass rim
const INNER_R = 64 // larger inner radius so tips do not meet at center
const PAD_DEG = 12

const BudgetPrimitive: React.FC<BudgetPrimitiveProps> = ({ initialTier = null, onSelect }) => {
  // Scene and selection state
  const [scene, _setScene] = useState<BudgetScene>('tiers')
  const [tier, setTier] = useState<BudgetTier | null>(initialTier)

  // Precompute tier segments for Scene One (not rendered yet)
  const tierSegments = useMemo(() => {
    if (scene !== 'tiers') return []
    return renderThreeTiers(SIZE, WEDGE_OUTER_R, INNER_R, PAD_DEG)
  }, [scene])

  return (
    <div className="budget-primitive" aria-label="Budget primitive" style={{ width: SIZE, height: SIZE }}>
      <div className="budget-primitive__glass" />
      {scene === 'tiers' && (
        <SceneOneTiers
          size={SIZE}
          segments={tierSegments}
          selected={tier as any}
          onPick={(key) => {
            setTier(key)
            onSelect?.(key)
          }}
        />
      )}
    </div>
  )
}

export default BudgetPrimitive
