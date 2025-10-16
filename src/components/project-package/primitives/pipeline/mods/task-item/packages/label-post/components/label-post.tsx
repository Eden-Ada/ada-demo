import React, { useMemo } from 'react'
import '../styles/label-post.css'
import { computeLabelSizing } from '../utils/label-sizing'

export type LabelPostProps = {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'default' | 'soft' | 'strong' | 'info' | 'success' | 'warning'
  className?: string
  style?: React.CSSProperties
}

const LabelPost: React.FC<LabelPostProps> = ({ text = 'Task Item', size = 'md', tone = 'default', className, style }) => {
  const sizing = useMemo(() => computeLabelSizing({ text, size, targetCharsPerLine: 30 }), [text, size])

  const cls = ['label-post', 'label-post--block', `label-post--${size}`, `label-post--tone-${tone}`]
  if (className) cls.push(className)

  return (
    <div className={cls.join(' ')} style={{ width: sizing.width, marginLeft: sizing.marginLeft, marginRight: sizing.marginRight, ...style }} aria-label="Label Post">
      <div className="label-post__lines" style={{ lineHeight: `${sizing.lineHeight}px` }}>
        {sizing.lines.map((ln, i) => (
          <div className="label-post__line" key={i}>{ln}</div>
        ))}
      </div>
    </div>
  )
}

export default LabelPost
