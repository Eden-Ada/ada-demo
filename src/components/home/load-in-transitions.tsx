import React, { useEffect } from 'react'
import './load-in-transitions.css'

// Adds timed fade-in transitions to key home elements after initial mount
// New sequence per request:
// 1) Fade in ORB first.
// 2) After orb fade completes, wait 1s, then fade in PROMPT container.
// 3) After prompt container is visible, trigger the prompt text animation.
// Eden mark fades independently.

const LoadInTransitions: React.FC = () => {
  useEffect(() => {
    const q = {
      eden: () => document.querySelector('.eden-mark') as HTMLElement | null,
      prompt: () => document.querySelector('.home__prompt') as HTMLElement | null,
      orb: () => document.querySelector('.home__orb') as HTMLElement | null,
      rive: () => document.querySelector('.ada-orb__rive-wrap') as HTMLElement | null,
    }

    const timers: number[] = []
    const addTimer = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timers.push(id)
      return id
    }

    // Seed fade classes (idempotent)
    q.eden()?.classList.add('fade-seed')
    q.prompt()?.classList.add('fade-seed')
    q.orb()?.classList.add('fade-seed')
    q.rive()?.classList.add('fade-seed') // may be null initially; we'll re-seed later as needed

    // Fade in ORB immediately
    const orbEl = q.orb()
    if (orbEl) addTimer(() => orbEl.classList.add('is-visible'), 0)

    // Fade in EDEN mark slightly after (decorative)
    const edenEl = q.eden()
    if (edenEl) addTimer(() => edenEl.classList.add('is-visible'), 400)

    const startPrompt = () => {
      const promptEl = q.prompt()
      if (!promptEl) return
      if (!promptEl.classList.contains('fade-seed')) promptEl.classList.add('fade-seed')
      // Ensure transition by forcing reflow before making visible
      void promptEl.offsetWidth
      const onPromptEnd = (ev2: Event) => {
        const te2 = ev2 as TransitionEvent
        if (!te2.propertyName || te2.propertyName === 'opacity') {
          promptEl.removeEventListener('transitionend', onPromptEnd)
          window.dispatchEvent(new CustomEvent('ada-prompt-start'))
        }
      }
      promptEl.addEventListener('transitionend', onPromptEnd)
      promptEl.classList.add('is-visible')
      // Fallback if transitionend doesn’t fire
      addTimer(() => {
        promptEl.removeEventListener('transitionend', onPromptEnd)
        window.dispatchEvent(new CustomEvent('ada-prompt-start'))
      }, 1200)
    }

    const startRive = () => {
      const riveEl = q.rive()
      if (!riveEl) {
        // Retry shortly until Rive overlay mounts
        addTimer(startRive, 50)
        return
      }
      if (!riveEl.classList.contains('fade-seed')) riveEl.classList.add('fade-seed')
      // Force reflow to ensure transition applies
      void riveEl.offsetWidth
      const onRiveEnd = (ev: Event) => {
        const te = ev as TransitionEvent
        if (!te.propertyName || te.propertyName === 'opacity') {
          riveEl.removeEventListener('transitionend', onRiveEnd)
          // After Rive fades in, delay then reveal prompt
          addTimer(startPrompt, 1000)
        }
      }
      riveEl.addEventListener('transitionend', onRiveEnd)
      riveEl.classList.add('is-visible')
      // Fallback if transitionend doesn’t fire
      addTimer(() => {
        riveEl.removeEventListener('transitionend', onRiveEnd)
        addTimer(startPrompt, 200)
      }, 1200)
    }

    // Orb transition duration is 600ms; wait for end, then delay before starting Rive
    if (orbEl) {
      const onOrbEnd = (ev: Event) => {
        const te = ev as TransitionEvent
        if (!te.propertyName || te.propertyName === 'opacity') {
          orbEl.removeEventListener('transitionend', onOrbEnd)
          addTimer(startRive, 500)
        }
      }
      orbEl.addEventListener('transitionend', onOrbEnd)
      // Safety: if transitionend doesn’t fire, proceed anyway
      addTimer(() => {
        orbEl.removeEventListener('transitionend', onOrbEnd)
        startRive()
      }, 1200)
    } else {
      // Fallback if orb not found: schedule Rive after 1600ms
      addTimer(startRive, 1600)
    }

    return () => {
      timers.forEach(t => window.clearTimeout(t))
    }
  }, [])

  return null
}

export default LoadInTransitions
