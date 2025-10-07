import React from 'react'
import './instance-picker.css'

type InstanceType = 'project' | 'research' | 'autonomous'

const INSTANCES: { key: InstanceType; label: string }[] = [
  { key: 'project', label: 'Project' },
  { key: 'research', label: 'Research' },
  { key: 'autonomous', label: 'Autonomous' },
]

const InstancePicker: React.FC = () => {
  const [idx, setIdx] = React.useState(0)
  const [prevIdx, setPrevIdx] = React.useState<number | null>(null)
  const [dir, setDir] = React.useState<'left' | 'right' | null>(null)
  // Token to disambiguate overlapping animations; incremented on each nav action
  const actionRef = React.useRef(0)
  const [prevToken, setPrevToken] = React.useState<number | null>(null)
  const [curToken, setCurToken] = React.useState<number>(0)
  const leftRef = React.useRef<HTMLButtonElement>(null)
  const rightRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    // Development aid: confirm picker is active
    // eslint-disable-next-line no-console
    console.log('[Ada Orb] InstancePicker active')
  }, [])

  // Announce highlight when index changes
  React.useEffect(() => {
    const type = INSTANCES[idx].key
    window.dispatchEvent(new CustomEvent('ada-instance-highlight', { detail: { type } }))
  }, [idx])

  const renderIcon = (type: InstanceType) => {
    // Icons are centered inside the 200px glass via .ip-glass-200 grid centering
    // Size is controlled by .ip-icon-center (96x96), stroke set thin (0.7), color via currentColor (white)
    switch (type) {
      case 'project':
        return (
          <div className="ip-icon-center ip-icon-center--lg" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%" className="lucide lucide-layout-dashboard">
              <rect width="7" height="9" x="3" y="3" rx="1"/>
              <rect width="7" height="5" x="14" y="3" rx="1"/>
              <rect width="7" height="9" x="14" y="12" rx="1"/>
              <rect width="7" height="5" x="3" y="16" rx="1"/>
            </svg>
          </div>
        )
      case 'research':
        return (
          <div className="ip-icon-center" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%" className="lucide lucide-notebook-text">
              <path d="M2 6h4"/>
              <path d="M2 10h4"/>
              <path d="M2 14h4"/>
              <path d="M2 18h4"/>
              <rect width="16" height="20" x="4" y="2" rx="2"/>
              <path d="M9.5 8h5"/>
              <path d="M9.5 12H16"/>
              <path d="M9.5 16H14"/>
            </svg>
          </div>
        )
      case 'autonomous':
        return (
          <div className="ip-icon-center" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%" className="lucide lucide-brain-circuit">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
              <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
              <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
              <path d="M6 18a4 4 0 0 1-1.967-.516"/>
              <path d="M12 13h4"/>
              <path d="M12 18h6a2 2 0 0 1 2 2v1"/>
              <path d="M12 8h8"/>
              <path d="M16 8V5a 2 2 0 0 1 2-2"/>
              <circle cx="16" cy="13" r=".5"/>
              <circle cx="18" cy="3" r=".5"/>
              <circle cx="20" cy="21" r=".5"/>
              <circle cx="20" cy="8" r=".5"/>
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const prev = () => {
    // pulse left chevron
    const el = leftRef.current
    if (el) {
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse')
      el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true })
    }
    const token = ++actionRef.current
    setDir('left')
    setPrevIdx(idx)
    setPrevToken(token)
    setCurToken(token)
    setIdx((i) => (i - 1 + INSTANCES.length) % INSTANCES.length)
  }
  const next = () => {
    // pulse right chevron
    const el = rightRef.current
    if (el) {
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse')
      el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true })
    }
    const token = ++actionRef.current
    setDir('right')
    setPrevIdx(idx)
    setPrevToken(token)
    setCurToken(token)
    setIdx((i) => (i + 1) % INSTANCES.length)
  }

  return (
    <div className="instance-picker" aria-label="Instance picker">
      {/* previous item (animates out) */}
      {prevIdx !== null && (
        <div
          key={`prev-${prevIdx}-${dir ?? 'idle'}-${prevToken ?? 'none'}`}
          className={`ip-item ${dir === 'right' ? 'ip-out-left' : 'ip-out-right'}`}
          onAnimationEnd={() => {
            // Only honor the latest action; ignore stale animationend from prior items
            if (prevToken === actionRef.current) {
              setPrevIdx(null)
              setDir(null)
            }
          }}
        >
          <div className="ip-group">
            <div className="ip-glass-200" aria-hidden>
              {renderIcon(INSTANCES[prevIdx].key)}
            </div>
            <div className="ip-label">{INSTANCES[prevIdx].label}<br/>Instance</div>
          </div>
        </div>
      )}
      {/* current item (animates in) */}
      <div
        key={`cur-${idx}-${curToken}`}
        className={`ip-item ${dir === 'right' ? 'ip-in-right' : dir === 'left' ? 'ip-in-left' : 'ip-center'}`}
      >
        <div className="ip-group">
          <div className="ip-glass-200" aria-hidden>
            {renderIcon(INSTANCES[idx].key)}
          </div>
          <div className="ip-label">{INSTANCES[idx].label}<br/>Instance</div>
        </div>
      </div>
      <button ref={leftRef} className="ip-chevron ip-chevron--left" onClick={prev} aria-label="Previous instance" type="button">
        {/* Left chevron */}
        <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <button ref={rightRef} className="ip-chevron ip-chevron--right" onClick={next} aria-label="Next instance" type="button">
        {/* Right chevron */}
        <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
  )
}

export default InstancePicker
