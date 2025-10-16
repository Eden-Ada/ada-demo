import React from 'react'
import '../../styles/three-way-bar.css'
import { performAction, type ThreeWayActionHandlers } from './utils/actions'

export type ThreeWayBarProps = {
  className?: string
  style?: React.CSSProperties
  sizeDefault?: number
  gap?: number
  actions?: ThreeWayActionHandlers
  onAction?: (action: 'trash' | 'refresh' | 'check') => void
}

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
)

const Trash2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const ThreeWayBar: React.FC<ThreeWayBarProps> = ({
  className,
  style,
  sizeDefault = 32, // increased size
  gap = 6,
  actions,
  onAction,
}) => {
  const cls = ['three-way-bar']
  if (className) cls.push(className)
  const cssVars: React.CSSProperties = {
    ...(style || {}),
    ['--twb-size-default' as any]: `${sizeDefault}px`,
    ['--twb-gap' as any]: `${gap}px`,
  }
  return (
    <div className={cls.join(' ')} style={cssVars} aria-label="Three Way Bar">
      <div className="three-way-bar__chrome">
        <div className="three-way-bar__dots">
          <span
            role="button"
            tabIndex={0}
            aria-label="trash"
            onClick={() => { performAction('trash', actions); onAction?.('trash') }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); performAction('trash', actions); onAction?.('trash') } }}
          >
            <Trash2Icon />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="refresh"
            onClick={() => { performAction('refresh', actions); onAction?.('refresh') }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); performAction('refresh', actions); onAction?.('refresh') } }}
          >
            <RefreshCwIcon />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="check"
            onClick={() => { performAction('check', actions); onAction?.('check') }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); performAction('check', actions); onAction?.('check') } }}
          >
            <CheckIcon />
          </span>
        </div>
      </div>
    </div>
  )
}

export default ThreeWayBar
