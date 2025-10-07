import React from 'react'
import './test-badge.css'

type TestBadgeProps = {
  label?: string // e.g., 'Vision Primitive' -> renders 'Vision Primitive Test'
}

const TestBadge: React.FC<TestBadgeProps> = ({ label = 'Component' }) => {
  return (
    <div className="sandbox-test-badge" aria-label="Sandbox Test Badge">
      {label} Test
    </div>
  )
}

export default TestBadge
