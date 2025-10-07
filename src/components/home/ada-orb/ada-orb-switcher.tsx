import React from 'react'
import AdaOrbThin from '../ada-pane-package/ada-orb-thin/ada-orb-thin'
import InstancePicker from './ada-orb-conditionals/instance-picker'

export type OrbContentMode = 'rive' | 'instance-picker'

const AdaOrbSwitcher: React.FC = () => {
  const [mode, setMode] = React.useState<OrbContentMode>('rive')

  React.useEffect(() => {
    const onSwitch = (e: Event) => {
      const ce = e as CustomEvent<{ mode?: OrbContentMode }>
      if (ce.detail && (ce.detail.mode === 'rive' || ce.detail.mode === 'instance-picker')) {
        setMode(ce.detail.mode)
      }
    }
    window.addEventListener('ada-orb-content' as any, onSwitch as any)
    return () => window.removeEventListener('ada-orb-content' as any, onSwitch as any)
  }, [])

  const isPicker = mode === 'instance-picker'

  // Drive the orb's glass visibility based on mode so the Rive-only glass pane is not shown in picker
  React.useEffect(() => {
    const detail = mode === 'instance-picker'
      ? { glassVisible: false }
      : { glassVisible: true, glassSize: 225, glassInteractive: false }
    window.dispatchEvent(new CustomEvent('ada-orb-layout', { detail }))
  }, [mode])

  return (
    <div className={`ada-orb__rive-wrap${isPicker ? ' is-interactive' : ''}`}>
      {mode === 'rive' ? (
        <AdaOrbThin
          isListening={false}
          src="/assets/rive-orb-thin/halo-2.0-simple-white.riv"
          colorRgb={[40, 40, 40]}
          stateMachine="default"
        />
      ) : (
        <InstancePicker />
      )}
    </div>
  )
}

export default AdaOrbSwitcher
