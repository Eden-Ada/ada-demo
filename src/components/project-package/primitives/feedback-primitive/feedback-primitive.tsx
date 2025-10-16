import React, { useCallback, useEffect, useRef, useState } from 'react'
import './styles/feedback-primitive.css'
import './styles/feedback-animations.css'
import defaultIntroPrompt from './utils/intro-prompt'
import toProceduralText from './utils/procedural-text'
import makeUserMessage, { type ChatMessage } from './utils/text-send'
import UserDecision from './mods/user-decision'

export type FeedbackPrimitiveProps = {
  size?: { width: number; height: number }
  className?: string
  onSend?: (text: string) => void
}

const FeedbackPrimitive: React.FC<FeedbackPrimitiveProps> = ({ size = { width: 360, height: 220 }, className, onSend }) => {
  const [text, setText] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const placeholderFull = 'Type a message for Ada…'
  const [hintStart, setHintStart] = useState(false)
  const [hintDone, setHintDone] = useState(false)
  const introFull = toProceduralText(defaultIntroPrompt)
  const [typedIntro, setTypedIntro] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const panelRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLDivElement | null>(null)
  const [containerH, setContainerH] = useState<number>(size.height)
  const [showDecision, setShowDecision] = useState(false)

  // Per-character fade/slide for the input hint (starts after field expands)
  useEffect(() => {
    const startDelay = 380 // after field expand-in (360ms) + small buffer
    const charDelay = 22
    const charAnim = 260 // duration per char in ms
    const total = startDelay + (placeholderFull.length - 1) * charDelay + charAnim
    const s = window.setTimeout(() => setHintStart(true), startDelay)
    const d = window.setTimeout(() => setHintDone(true), total)
    return () => {
      window.clearTimeout(s)
      window.clearTimeout(d)
    }
  }, [])

  // Typewriter effect for intro bubble (starts after hint completes)
  useEffect(() => {
    let canceled = false
    let i = 0
    setTypedIntro('')
    const stepMs = 28 // character interval
    if (!hintDone) return
    const startDelayMs = 80 // brief pause after hint completes
    let timer: number | undefined
    let decisionDelayTimer: number | undefined
    const delayTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        if (canceled) return
        i += 1
        setTypedIntro(introFull.slice(0, i))
        if (i >= introFull.length) {
          if (timer) window.clearInterval(timer)
          // slight spacing after text completes before decision mod spawns
          decisionDelayTimer = window.setTimeout(() => setShowDecision(true), 160)
        }
      }, stepMs)
    }, startDelayMs)
    return () => {
      canceled = true
      if (timer) window.clearInterval(timer)
      if (decisionDelayTimer) window.clearTimeout(decisionDelayTimer)
      window.clearTimeout(delayTimer)
    }
  }, [introFull, hintDone])

  // Position messages zone between a fixed top margin and the prompt; auto-resize container with content
  useEffect(() => {
    const applyLayout = () => {
      const headroom = 12 // must match CSS padding-top to avoid top clipping
      const top = Math.max(0, 15 - headroom) // renders as 15px visible gap
      panelRef.current?.style.setProperty('--messages-top-px', `${top}px`)
      // bottom spacing uses prompt height dynamically so the zone stays above it
      const bottomPad = 15
      const ph = promptRef.current?.offsetHeight ?? 60
      const bottom = bottomPad + ph
      panelRef.current?.style.setProperty('--messages-bottom-px', `${bottom}px`)
      // auto-resize the outer wrapper height to content (grow with messages)
      const msgScrollH = messagesRef.current?.scrollHeight ?? 0
      const desired = top + msgScrollH + bottom
      const minH = 220 // initial spec baseline
      const viewportCap = typeof window !== 'undefined' ? Math.max(420, Math.floor(window.innerHeight * 0.92)) : 720
      const maxH = viewportCap
      const nextH = Math.max(minH, Math.min(maxH, desired))
      setContainerH(nextH)
    }
    applyLayout()
    const onResize = () => applyLayout()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [typedIntro, messages, showDecision])

  const handleSend = useCallback(() => {
    const t = text.trim()
    if (!t) return
    // add to local message list for visual verification
    setMessages((prev) => [...prev, makeUserMessage(t)])
    onSend?.(t)
    setText('')
    setShowDecision(false)
  }, [text, onSend])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!messagesRef.current) return
    messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight })
  }, [messages, showDecision])

  return (
    <div
      className={`feedback-primitive${className ? ' ' + className : ''}`}
      aria-label="Feedback primitive"
      style={{ width: size.width, height: containerH }}
    >
      <div className="feedback-primitive__panel" ref={panelRef}>
        {/* Messages zone (includes intro and user/assistant bubbles) */}
        <div className="feedback-primitive__messages" ref={messagesRef} aria-live="polite" aria-relevant="additions">
          {typedIntro && (
            <div className="fp-msg is-assistant is-intro">
              <div className="fp-msg__text">{typedIntro}</div>
            </div>
          )}
          {/* Centered decision mod shown after intro */}
          {showDecision && (
            <div className="fp-decision-row">
              <UserDecision onDecision={(ok) => {
                // eslint-disable-next-line no-console
                console.log('decision', ok)
                setShowDecision(false)
              }} />
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`fp-msg ${m.role === 'user' ? 'is-user' : 'is-assistant'}`}>
              <div className="fp-msg__text">{m.content}</div>
            </div>
          ))}
        </div>
        {/* Bottom chat prompt area */}
        <div className="feedback-primitive__prompt" ref={promptRef} role="group" aria-label="Feedback prompt">
          <div className="feedback-primitive__input-wrap">
            {/* Animated hint overlay (per-character fade/slide) */}
            {(!inputFocused && text.length === 0) && (
              <div className="feedback-primitive__hint" aria-hidden>
                {hintStart && (
                  <>
                    {placeholderFull.split('').map((ch, i) => {
                      const display = ch === ' ' ? '\u00A0' : ch
                      return (
                        <span key={i} className="hint-ch" style={{ animationDelay: `${i * 22}ms` }}>
                          {display}
                        </span>
                      )
                    })}
                  </>
                )}
              </div>
            )}
            <input
              className="feedback-primitive__input"
              type="text"
              placeholder=""
              value={text}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSend()
                }
              }}
              aria-label="Message input"
            />
          </div>
          <button
            className="feedback-primitive__send"
            type="button"
            onClick={handleSend}
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
              <path d="M6 12h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackPrimitive
