import { useEffect } from 'react'

// Bridges prompt typing lifecycle to the Rive orb state via existing debug bus.
// When text starts, set speaking=true; when done, set speaking=false.

const PromptOrbSync = () => {
  useEffect(() => {
    let speakTimer: number | null = null
    const onStart = () => {
      // offset to allow first glyphs to appear before orb changes to speaking
      if (speakTimer) window.clearTimeout(speakTimer)
      speakTimer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { speaking: true, listening: false, thinking: false } }))
      }, 400)
    }
    const onDone = () => {
      if (speakTimer) {
        window.clearTimeout(speakTimer)
        speakTimer = null
      }
      window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { speaking: false } }))
    }
    window.addEventListener('ada-prompt-start' as any, onStart as any)
    window.addEventListener('ada-prompt-done' as any, onDone as any)
    return () => {
      if (speakTimer) window.clearTimeout(speakTimer)
      window.removeEventListener('ada-prompt-start' as any, onStart as any)
      window.removeEventListener('ada-prompt-done' as any, onDone as any)
    }
  }, [])
  return null
}

export default PromptOrbSync
