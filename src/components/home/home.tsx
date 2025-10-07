import React, { useEffect, useRef } from 'react'
import './home.css'
import AdaPrompt from './ada-prompt-package/ada-prompt'
import PromptPaginator from './ada-prompt-package/prompt-paginator'
import { AdaPromptsProvider, useAdaPrompts } from './ada-prompt-package/ada-prompts'
import AdaOrb from './ada-orb/ada-orb'
import LoadInTransitions from './load-in-transitions'
import PromptOrbSync from './prompt-orb-sync'
import AdaOrbDebug from './ada-orb/ada-orb-debug'
// import AdaTestPane from './ada-pane-package/ada-test-pane'

const Home: React.FC = () => {
  const homeRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  // No Eden nav on this view; ensure --nav-height is 0 so layout fills viewport.
  useEffect(() => {
    const updateLayout = () => {
      const homeEl = homeRef.current
      if (!homeEl) return
      homeEl.style.setProperty('--nav-height', '0px')
    }
    // Run twice to account for font/images settling
    updateLayout()
    const id = requestAnimationFrame(updateLayout)
    const t = window.setTimeout(updateLayout, 300) // after images/fonts settle
    window.addEventListener('resize', updateLayout)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
      window.removeEventListener('resize', updateLayout)
    }
  }, [])

  const Content = () => {
    const { text, animate, displayIndex, canGoBack, canGoForward, next, prev } = useAdaPrompts()
    return (
      <>
        <div className="eden-mark">eden</div>
        <LoadInTransitions />
        <PromptOrbSync />
        <div ref={homeRef} className="home">
      {/* Main content area */}
      <div className="home__content">
        <div
          ref={heroRef}
          className="orb-and-prompt"
          style={{ '--orb-prompt-gap': '50px', '--hero-offset': '130px' } as React.CSSProperties}
        >
          {/* Ada Orb (SVG + clipped video with embedded Rive orb) */}
          <div className="home__orb">
            <AdaOrb />
          </div>
          {/* Prompt below */}
          <div className="home__prompt">
            <AdaPrompt text={text} animate={animate} />
            <PromptPaginator
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              index={displayIndex}
              onBack={prev}
              onForward={next}
            />
          </div>
          {/* <AdaTestPane /> */}
        </div>
      </div>

        </div>
        {/* Debug menu (fixed, outside orb wrappers) */}
        <AdaOrbDebug />
      </>
    )
  }

  return (
    <AdaPromptsProvider>
      <Content />
    </AdaPromptsProvider>
  )
}

export default Home
