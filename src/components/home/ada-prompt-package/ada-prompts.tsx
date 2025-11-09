import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

// Centralized prompt storage + navigation for the Home view
// Provides: current prompt text, 1-based index, canGoBack/Forward, and handlers

export type AdaPromptsContextShape = {
  prompts: string[]
  index: number // 0-based
  displayIndex: number // 1-based
  text: string
  animate: boolean // whether current prompt should animate typing
  canGoBack: boolean
  canGoForward: boolean
  next: () => void
  prev: () => void
}

const AdaPromptsContext = createContext<AdaPromptsContextShape | null>(null)

export const AdaPromptsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const seed: string[] = useMemo(
    () => [
      // 1) Greeting
      'Hello Patricio, my name is Ada.<br/>I’m your personal AI assistant<br/>here on Eden‑OS!',
      // 2) Instance invitation
      "Let’s begin by creating a new instance. Would you like a project, research, or autonomous instance?",
    ],
    []
  )

  // Prompts become mutable so we can append from the harness
  const [prompts, setPrompts] = useState<string[]>(seed)
  const [idx, setIdx] = useState(0)
  const [animate, setAnimate] = useState(true)
  const [revealed, setRevealed] = useState<boolean[]>(() => seed.map(() => false))

  const canGoBack = idx > 0
  const canGoForward = idx < prompts.length - 1

  const next = useCallback(() => {
    setIdx((i) => {
      const ni = i < prompts.length - 1 ? i + 1 : i
      const already = revealed[ni]
      setAnimate(!already)
      window.dispatchEvent(new CustomEvent(already ? 'ada-prompt-done' : 'ada-prompt-start'))
      return ni
    })
  }, [prompts.length, revealed])

  const prev = useCallback(() => {
    setIdx((i) => {
      const ni = i > 0 ? i - 1 : i
      const already = revealed[ni]
      setAnimate(!already ? true : false)
      window.dispatchEvent(new CustomEvent(already ? 'ada-prompt-done' : 'ada-prompt-start'))
      return ni
    })
  }, [revealed])

  // When typing completes, mark current index as revealed
  React.useEffect(() => {
    const onDone = () => {
      setRevealed((prevArr) => {
        if (prevArr[idx]) return prevArr
        const nextArr = prevArr.slice()
        nextArr[idx] = true
        return nextArr
      })
    }
    window.addEventListener('ada-prompt-done', onDone as any)
    return () => window.removeEventListener('ada-prompt-done', onDone as any)
  }, [idx])

  // Allow external code (harness) to append a prompt and optionally advance to it
  React.useEffect(() => {
    const onAppend = (e: Event) => {
      const ce = e as CustomEvent<{ text: string; advance?: boolean; animate?: boolean }>
      const text = ce?.detail?.text
      if (!text || typeof text !== 'string') return
      setPrompts((prev) => {
        const next = prev.concat(text)
        // Expand revealed map for the new item
        setRevealed((prevRev) => prevRev.concat(false))
        // Optionally advance to newly appended prompt
        if (ce.detail?.advance) {
          const nextIndex = next.length - 1
          setIdx(nextIndex)
          setAnimate(ce.detail?.animate !== false)
          window.dispatchEvent(new CustomEvent('ada-prompt-start'))
        }
        return next
      })
    }
    window.addEventListener('ada-prompts:append', onAppend as any)
    return () => window.removeEventListener('ada-prompts:append', onAppend as any)
  }, [])

  const value = useMemo<AdaPromptsContextShape>(() => ({
    prompts,
    index: idx,
    displayIndex: idx + 1,
    text: prompts[idx],
    animate,
    canGoBack,
    canGoForward,
    next,
    prev,
  }), [prompts, idx, animate, canGoBack, canGoForward, next, prev])

  return <AdaPromptsContext.Provider value={value}>{children}</AdaPromptsContext.Provider>
}

export const useAdaPrompts = () => {
  const ctx = useContext(AdaPromptsContext)
  if (!ctx) throw new Error('useAdaPrompts must be used within AdaPromptsProvider')
  return ctx
}
