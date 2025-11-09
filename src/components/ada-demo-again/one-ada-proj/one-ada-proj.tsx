import React, { Suspense } from 'react'
import './harness.css'

// Default demo view comes from the existing Home component (no source changes)
import Home from '../../home'

// Optional alternate: lazy-load the pipeline demo to avoid any side effects unless explicitly requested
const ProjectDemo = React.lazy(() => import('../../project-package/project-demo/components/project-demo'))

// Map simple view keys to components for easy swapping without editing sources
const viewMap = {
  home: Home,
  'project-demo': ProjectDemo,
} as const

type ViewKey = keyof typeof viewMap

// Read ?view=home|project-demo from the URL, fallback to 'home'
function getViewFromQuery(): ViewKey {
  try {
    const p = new URLSearchParams(window.location.search)
    let v = (p.get('view') || '').toLowerCase().trim()
    // Normalize common aliases; demo should start at home
    if (v === 'demo' || v === '') v = 'home'
    if (v in viewMap) return v as ViewKey
  } catch {}
  return 'home'
}

const OneAdaProj: React.FC = () => {
  const [view, setView] = React.useState<ViewKey>(() => getViewFromQuery())

  // Respect ?view param on reload; do not force back to 'home'
  React.useEffect(() => { /* no-op: preserve desired view */ }, [])

  React.useEffect(() => {
    const onPop = () => setView(getViewFromQuery())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Console confirmation: which harness and which view resolved.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = (params.get('view') || '').toLowerCase()
      // eslint-disable-next-line no-console
      console.log('[one-ada-proj] loaded', { search: window.location.search, viewRaw: raw || null, viewResolved: view })
    } catch {
      // eslint-disable-next-line no-console
      console.log('[one-ada-proj] loaded (no search available)', { viewResolved: view })
    }
  }, [view])

  // Keep view in sync with URL (handles HMR preserving prior state)
  React.useEffect(() => {
    const desired = getViewFromQuery()
    if (desired !== view) setView(desired)
  }, [view])

  // Harness-side tweak layer for Home without touching its source. Controlled via query params.
  // Supported params:
  // - homeVideo: filename in /public (e.g., rainbow-flow.mp4) or absolute /path
  // - triangle: 1|0 or true|false
  // - riveSrc: override Rive file path
  // - glassVisible: 1|0 or true|false
  const HomeHarnessMods: React.FC = () => {
    React.useEffect(() => {
      const cleanups: Array<() => void> = []
      try {
        const p = new URLSearchParams(window.location.search)
        const coerceBool = (v: string | null) => (v ? /^(1|true)$/i.test(v) : null)
        const video = p.get('homeVideo')
        const triangle = coerceBool(p.get('triangle'))
        const riveSrc = p.get('riveSrc')
        const glassVisible = coerceBool(p.get('glassVisible'))

        if (video) {
          const src = video.startsWith('/') ? video : `/${video}`
          window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { video: src } }))
        }
        if (typeof triangle === 'boolean') {
          window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { triangle } }))
        }
        if (riveSrc) {
          window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { src: riveSrc } }))
        }
        if (typeof glassVisible === 'boolean') {
          window.dispatchEvent(new CustomEvent('ada-orb-layout', { detail: { glassVisible } }))
        }
        // Sync orb state with prompt typing: speaking while text animates, idle after
        const onPromptTypingStart = () => {
          try { window.dispatchEvent(new CustomEvent('ada-orb-content', { detail: { mode: 'rive' } } as any)) } catch {}
          try { window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { listening: false, thinking: false, speaking: true } })) } catch {}
        }
        const onPromptTypingDone = () => {
          try { window.dispatchEvent(new CustomEvent('ada-orb-debug', { detail: { listening: false, thinking: false, speaking: false, preset: 'default' } })) } catch {}
        }
        window.addEventListener('ada-prompt-start', onPromptTypingStart as any)
        window.addEventListener('ada-prompt-done', onPromptTypingDone as any)
        // When loader completes, navigate to the project demo sandbox
        const onPipelineReady = () => {
          try {
            const url = new URL(window.location.href)
            url.searchParams.set('view', 'project-demo')
            sessionStorage.setItem('eden:from-staging', '1')
            window.history.pushState({}, '', url.toString())
            window.dispatchEvent(new PopStateEvent('popstate'))
          } catch {}
        }
        window.addEventListener('eden-pipeline:ready', onPipelineReady as any)
        cleanups.push(() => {
          window.removeEventListener('ada-prompt-start', onPromptTypingStart as any)
          window.removeEventListener('ada-prompt-done', onPromptTypingDone as any)
          window.removeEventListener('eden-pipeline:ready', onPipelineReady as any)
        })
        // Drop-in for InstancePicker (without editing source): observe DOM and apply classes once
        const applyDrop = () => {
          const ip = document.querySelector('.instance-picker') as HTMLElement | null
          if (!ip) return false
          if (!ip.classList.contains('ip-harness-drop')) {
            ip.classList.remove('ip-harness-fade', 'ip-harness-visible')
            ip.classList.add('ip-harness-drop')
            requestAnimationFrame(() => requestAnimationFrame(() => {
              // eslint-disable-next-line no-console
              console.log('[one-ada-proj] picker drop start')
              // Listen for the first transitioning child to finish (transform)
              const target = (ip.querySelector('.ip-group > *:not(.ip-glass-200), .ip-label, .ip-icon-center, .ip-chevron') as HTMLElement | null) || ip
              const onEnd = () => {
                // eslint-disable-next-line no-console
                console.log('[one-ada-proj] picker drop end')
              }
              target?.addEventListener('transitionend', onEnd, { once: true })
              ip.classList.add('ip-harness-drop-visible')
            }))
          }
          // Selection wiring (harness-only):
          // Track current highlight from InstancePicker; seed from current DOM
          let currentType: string | null = null
          const labelText = (ip.querySelector('.ip-label')?.textContent || '').toLowerCase()
          if (labelText.includes('project')) currentType = 'project'
          else if (labelText.includes('research')) currentType = 'research'
          else if (labelText.includes('autonomous')) currentType = 'autonomous'
          else currentType = 'project' // default to first entry
          const onHighlight = (e: Event) => {
            try { currentType = (e as CustomEvent<any>).detail?.type ?? null } catch {}
          }
          window.addEventListener('ada-instance-highlight' as any, onHighlight as any)
          cleanups.push(() => window.removeEventListener('ada-instance-highlight' as any, onHighlight as any))

          const selectProject = () => {
            if (ip.classList.contains('ip-selected')) return
            if (currentType !== 'project') return
            ip.classList.add('ip-selected')
            const glass = ip.querySelector('.ip-glass-200') as HTMLElement | null
            if (glass && !glass.querySelector('.ip-checkmark')) {
              const wrap = document.createElement('div')
              wrap.className = 'ip-checkmark'
              wrap.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M4 12 9 17 20 6" />
                </svg>
              `
              glass.appendChild(wrap)
            }
            // Force chevrons hidden and disable immediately
            ip.querySelectorAll('.ip-chevron').forEach((btn) => {
              const el = btn as HTMLElement
              el.style.opacity = '0'
              el.style.pointerEvents = 'none'
            })
            // Dim icon inside the glass immediately to match CSS
            const icon = glass?.querySelector('.ip-icon-center') as HTMLElement | null
            if (icon) icon.style.opacity = '0.5'
            // After the checkmark finishes drawing, wait 300ms, then append and advance to Prompt 3
            const startPrompt3 = () => {
              window.dispatchEvent(new CustomEvent('ada-prompts:append', {
                detail: {
                  text: 'Awesome—project it is!<br/>In a few sentences, describe what you’re creating.',
                  advance: true,
                  animate: true,
                }
              }))
            }
            const path = glass?.querySelector('.ip-checkmark path') as SVGPathElement | null
            let started = false
            const beginAfterDelay = () => { if (started) return; started = true; window.setTimeout(startPrompt3, 300) }
            if (path) {
              const onAnimEnd = () => { path.removeEventListener('animationend', onAnimEnd); beginAfterDelay() }
              path.addEventListener('animationend', onAnimEnd)
              // Fallback if animationend never fires (800ms anim + 300ms gap)
              window.setTimeout(beginAfterDelay, 1100)
            } else {
              // No path/animation; simple 300ms delay
              window.setTimeout(startPrompt3, 300)
            }
            // Convert to input mode via paginator Next (keep count at 3)
            let inputPhase: 'idle' | 'input' | 'advanced' = 'idle'
            const targetSnippetA = 'Awesome—project it is!'
            const targetSnippetB = 'In a few sentences, describe what you’re creating.'
            const sanitize = (html: string) => html
              .replace(/<br\s*\/??\s*>/gi, ' ')
              .replace(/<[^>]*>/g, '')
              .replace(/\s+/g, ' ')
              .trim()
            const isPrompt3Now = () => {
              const bubble = document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null
              if (!bubble) return false
              if (inputPhase === 'advanced') return false
              // If we're already in input-mode, this is still the Prompt 3 step
              if (bubble.classList.contains('ada-input-mode')) return true
              const p = (bubble.querySelector('p:not(.ada-input-header)') as HTMLElement | null) || (bubble.querySelector('p') as HTMLElement | null)
              if (!p) return false
              const s = sanitize(p.innerHTML || '')
              return s.includes(sanitize(targetSnippetA)) || s.includes(sanitize(targetSnippetB))
            }
            const enterInputMode = () => {
              const b = document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null
              if (!b) return
              if (inputPhase !== 'idle') return
              if (!b.classList.contains('ada-input-mode')) b.classList.add('ada-input-mode')
              let hdr = b.querySelector('.ada-input-header') as HTMLParagraphElement | null
              if (!hdr) {
                hdr = document.createElement('p')
                hdr.className = 'ada-input-header'
                hdr.textContent = 'Detail your project.'
                b.insertBefore(hdr, b.firstChild)
              }
              if (!b.querySelector('.ada-input-wrap')) {
                const wrap = document.createElement('div')
                wrap.className = 'ada-input-wrap'
                wrap.innerHTML = '<textarea class="ada-input-area" rows="5" placeholder=""></textarea>'
                b.appendChild(wrap)
              }
              inputPhase = 'input'
              // Animate header drop-in using existing fade-seed flyby
              if (!hdr.classList.contains('fade-seed')) hdr.classList.add('fade-seed')
              // Force reflow to ensure transition applies
              void hdr.offsetWidth
              hdr.classList.add('is-visible')

              // After header drops in, type the placeholder char-by-char with 300ms delay
              const ta = b.querySelector('.ada-input-area') as HTMLTextAreaElement | null
              const targetText = 'Type your project summary here'
              const typePlaceholder = (el: HTMLTextAreaElement, text: string, startDelayMs = 300, stepMs = 20) => {
                if (!el || (el as any)._typing) return
                ;(el as any)._typing = true
                el.placeholder = ''
                let i = 0
                const start = () => {
                  const timer = window.setInterval(() => {
                    el.placeholder = text.slice(0, ++i)
                    if (i >= text.length) window.clearInterval(timer)
                  }, stepMs)
                }
                window.setTimeout(start, startDelayMs)
              }
              const onHdrEnd = (ev: Event) => {
                const te = ev as TransitionEvent
                if (!te.propertyName || te.propertyName === 'opacity') {
                  hdr.removeEventListener('transitionend', onHdrEnd)
                  if (ta) typePlaceholder(ta, targetText, 300, 20)
                }
              }
              hdr.addEventListener('transitionend', onHdrEnd)
              // Fallback if transitionend doesn’t fire
              window.setTimeout(() => {
                hdr.removeEventListener('transitionend', onHdrEnd)
                if (ta) typePlaceholder(ta, targetText, 300, 20)
              }, 1000)
              // Enable Next when user types
              if (ta) {
                const onInput = () => { try { (updatePaginatorState as any)() } catch {} }
                ta.addEventListener('input', onInput)
                cleanups.push(() => ta.removeEventListener('input', onInput))
              }
              // Ensure state reflects we are now in input mode
              try { (updatePaginatorState as any)() } catch {}
              // eslint-disable-next-line no-console
              console.log('[one-ada-proj] prompt input mode activated (via Next)')
            }
            const updatePaginatorState = () => {
              const pag = document.querySelector('.prompt-paginator') as HTMLElement | null
              if (!pag) return
              const bubble = (document.querySelector('.ada-prompt .ada-prompt__text.ada-input-mode') as HTMLElement | null) || (document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null)
              const inInput = !!bubble && bubble.classList.contains('ada-input-mode')
              const ta = bubble?.querySelector('.ada-input-area') as HTMLTextAreaElement | null
              const hasText = !!ta && ta.value.trim().length > 0
              if (isPrompt3Now()) {
                if (!inInput) {
                  pag.classList.add('ada-harness-enable-next')
                } else {
                  if (hasText) pag.classList.add('ada-harness-enable-next')
                  else pag.classList.remove('ada-harness-enable-next')
                }
              } else {
                pag.classList.remove('ada-harness-enable-next')
              }
              // Bind a direct handler to Next to ensure our logic runs
              const nextBtn = document.querySelector('.prompt-paginator .paginator-btn.next') as HTMLButtonElement | null
              if (nextBtn && !nextBtn.dataset.harnessBound) {
                nextBtn.style.pointerEvents = 'auto'
                const onDirectClick = (e: Event) => {
                  // eslint-disable-next-line no-console
                  console.log('[one-ada-proj] next:direct click', { p3: isPrompt3Now(), inInput: !!document.querySelector('.ada-prompt .ada-prompt__text.ada-input-mode') })
                  if (!isPrompt3Now()) return
                  // If not yet in input, let the document-level handler open it
                  const b = document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null
                  const inInputNow = !!b?.classList.contains('ada-input-mode')
                  if (!inInputNow) return
                  // Try to advance (will only proceed when text present)
                  advanceFromInput(e)
                }
                nextBtn.addEventListener('click', onDirectClick, true)
                nextBtn.addEventListener('pointerup', onDirectClick, true)
                cleanups.push(() => nextBtn.removeEventListener('click', onDirectClick, true))
                cleanups.push(() => nextBtn.removeEventListener('pointerup', onDirectClick, true))
                nextBtn.dataset.harnessBound = '1'
              }
            }
            // Factor advancing logic so both handlers can reuse it
            const showOrbLoader = () => {
              try { window.dispatchEvent(new CustomEvent('ada-orb-layout', { detail: { glassVisible: true, glassSize: 225, glassInteractive: false } })) } catch {}
              const overlay = document.querySelector('.ada-orb__circle-overlay') as HTMLElement | null
              if (!overlay) return
              if (overlay.querySelector('.orb-loader')) return
              // fade out rive underlay (visual replacement by icon)
              const riveWrap = overlay.querySelector('.ada-orb__rive-wrap') as HTMLElement | null
              riveWrap?.classList.add('is-hidden')
              const wrap = document.createElement('div')
              wrap.className = 'orb-loader orb-loader--inset fade-seed is-once'
              wrap.innerHTML = `
                <svg class="orb-loader__ring" viewBox="0 0 240 240" aria-hidden="true">
                  <circle class="bg" cx="120" cy="120" r="110" />
                  <circle class="fg" cx="120" cy="120" r="110" />
                </svg>
                <div class="orb-loader__icon" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard">
                    <rect width="7" height="9" x="3" y="3" rx="1"/>
                    <rect width="7" height="5" x="14" y="3" rx="1"/>
                    <rect width="7" height="9" x="14" y="12" rx="1"/>
                    <rect width="7" height="5" x="3" y="16" rx="1"/>
                  </svg>
                </div>
                <div class="orb-loader__labels">
                  <div class="label-top">Eden Project</div>
                  <div class="label-bottom">T-shirt Brand</div>
                </div>
              `
              wrap.style.pointerEvents = 'none'
              overlay.appendChild(wrap)
              void wrap.offsetWidth
              wrap.classList.add('is-visible')
              // notify when progress completes (one-shot)
              const fg = wrap.querySelector('.fg')
              const onDone = () => {
                try { window.dispatchEvent(new CustomEvent('eden-pipeline:ready')) } catch {}
                fg?.removeEventListener('animationend', onDone)
              }
              fg?.addEventListener('animationend', onDone)
              cleanups.push(() => { try { wrap.remove() } catch {} })
            }
            const advanceFromInput = (ev?: Event) => {
              const bubble = document.querySelector('.ada-prompt .ada-prompt__text.ada-input-mode') as HTMLElement | null
              if (!bubble) return false
              const ta = bubble.querySelector('.ada-input-area') as HTMLTextAreaElement | null
              const val = (ta?.value || '').trim()
              if (!val) return false
              if (ev) { ev.preventDefault(); ev.stopImmediatePropagation() }
              // eslint-disable-next-line no-console
              console.log('[one-ada-proj] next:advanceFromInput', { valueLen: val.length })
              try { window.dispatchEvent(new CustomEvent('ada-input:project-summary', { detail: { value: val } })) } catch {}
              try {
                // Remove current input UI
                bubble.classList.remove('ada-input-mode')
                bubble.querySelector('.ada-input-header')?.remove()
                bubble.querySelector('.ada-input-wrap')?.remove()
                // Defensive: remove any other stray input bubbles if present
                document.querySelectorAll('.ada-prompt .ada-prompt__text.ada-input-mode').forEach((el) => {
                  const eb = el as HTMLElement
                  eb.classList.remove('ada-input-mode')
                  eb.querySelector('.ada-input-header')?.remove()
                  eb.querySelector('.ada-input-wrap')?.remove()
                })
              } catch {}
              inputPhase = 'advanced'
              const p4Html = "T‑shirts—perfect canvas for ideas.<br/>I’m mapping styles and fits already.<br/>Configuring your project view."
              window.dispatchEvent(new CustomEvent('ada-prompts:append', {
                detail: {
                  text: p4Html,
                  advance: true,
                  animate: true,
                }
              }))
              // After Prompt 4 finishes typing, wait 0.4s, then show the orb loader
              const p4CheckA = 'T‑shirts—perfect canvas for ideas.'
              const p4CheckB = 'Configuring your project view.'
              const onP4Done = () => {
                const bubble = document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null
                const p = bubble?.querySelector('p') as HTMLElement | null
                if (!bubble || !p) return
                const s = (p.textContent || '').replace(/\s+/g, ' ').trim()
                if (!(s.includes(p4CheckA) || s.includes(p4CheckB))) return
                window.removeEventListener('ada-prompt-done', onP4Done as any)
                window.setTimeout(showOrbLoader, 400)
              }
              window.addEventListener('ada-prompt-done', onP4Done as any)
              updatePaginatorState()
              return true
            }
            const onPagClick = (ev: Event) => {
              const target = ev.target as HTMLElement | null
              if (!target) return
              const isNextBtn = !!target.closest('.prompt-paginator .paginator-btn.next')
              if (!isNextBtn) return
              if (!isPrompt3Now()) return
              const bubble = document.querySelector('.ada-prompt .ada-prompt__text') as HTMLElement | null
              const inInput = !!bubble?.classList.contains('ada-input-mode')
              if (!inInput) {
                ev.preventDefault(); ev.stopImmediatePropagation();
                enterInputMode();
                updatePaginatorState();
                return
              }
              // Try to advance
              if (advanceFromInput(ev)) return
            }
            document.addEventListener('click', onPagClick, true)
            cleanups.push(() => document.removeEventListener('click', onPagClick, true))
            const onPromptEvt = () => updatePaginatorState()
            window.addEventListener('ada-prompt-start', onPromptEvt as any)
            window.addEventListener('ada-prompt-done', onPromptEvt as any)
            cleanups.push(() => {
              window.removeEventListener('ada-prompt-start', onPromptEvt as any)
              window.removeEventListener('ada-prompt-done', onPromptEvt as any)
            })
            // Initial state
            updatePaginatorState()
            // eslint-disable-next-line no-console
            console.log('[one-ada-proj] project instance selected')
          }
          const onClick = (e: Event) => {
            const t = e.target as HTMLElement | null
            if (t && t.closest('.ip-chevron')) return
            selectProject()
          }
          ip.addEventListener('click', onClick)
          cleanups.push(() => ip.removeEventListener('click', onClick))
          // After selection, also block chevron clicks defensively
          const blockChevron = (ev: Event) => {
            if (ip.classList.contains('ip-selected')) { ev.stopImmediatePropagation(); ev.preventDefault() }
          }
          ip.querySelectorAll('.ip-chevron').forEach((btn) => {
            btn.addEventListener('click', blockChevron, true)
            cleanups.push(() => btn.removeEventListener('click', blockChevron, true))
          })
          // (legacy ensureInputUI removed; input UI is created explicitly by enterInputMode)
          return true
        }
        // Try immediately; if not present, observe until it mounts
        if (!applyDrop()) {
          const mo = new MutationObserver(() => { if (applyDrop()) mo.disconnect() })
          mo.observe(document.body, { childList: true, subtree: true })
          // Clean up observer on unmount
          cleanups.push(() => mo.disconnect())
        }
      } catch {}
      return () => { cleanups.forEach((fn) => { try { fn() } catch {} }) }
    }, [])
    return null
  }

  // ProjectHarnessMods: wrapper to stage sandbox entrance (bg -> glass -> content) without touching source
  function ProjectHarnessMods() {
    React.useEffect(() => {
      const cleanups: Array<() => void> = []
      let mo: MutationObserver | null = null
      let applied = false
      const apply = () => {
        if (applied) return true
        const root = document.querySelector('.vision-harness') as HTMLElement | null
        if (!root) return false
        const video = root.querySelector('.vision-harness__bg') as HTMLVideoElement | null
        const glass = root.querySelector('[aria-label="Canvas central pane"]') as HTMLElement | null
        const clip  = root.querySelector('[aria-label="Canvas pane clip"]') as HTMLElement | null
        if (!video || !glass || !clip) return false
        applied = true
        // Skip harness viewport overrides; CanvasSpace manages layout and right-gap itself
        try { /* intentional no-op */ } catch {}
        // seed transitions + initial opacity
        const seed = (el: HTMLElement | null, dur: number) => { if (!el) return; el.style.transition = `opacity ${dur}ms ease`; el.style.opacity = '0' }
        seed(video as any, 380); seed(glass, 300); seed(clip, 300)
        const advance = (n: number) => { if (n === 1) (video as any).style.opacity = '1'; if (n === 2) glass.style.opacity = '1'; if (n === 3) clip.style.opacity = '1' }
        const onReady = () => { advance(1); const t1 = window.setTimeout(() => advance(2), 300); const t2 = window.setTimeout(() => advance(3), 600); cleanups.push(() => { window.clearTimeout(t1); window.clearTimeout(t2) }) }
        video.addEventListener('loadeddata', onReady, { once: true })
        video.addEventListener('canplay', onReady, { once: true })
        video.addEventListener('canplaythrough', onReady, { once: true })
        const tf = window.setTimeout(onReady, 800)
        cleanups.push(() => { window.clearTimeout(tf) })
        // Set default vision prompt to match staging
        const setVisionText = (text: string) => {
          try {
            const viewText = root.querySelector('.vision-primitive__text') as HTMLElement | null
            if (!viewText) return
            if ((viewText.textContent || '').trim() === text.trim()) return
            // Enter edit
            viewText.click()
            const editor = root.querySelector('.vision-primitive__editor') as HTMLElement | null
            const confirm = root.querySelector('.vision-primitive__btn--confirm') as HTMLButtonElement | null
            if (editor) {
              editor.textContent = text
              const ev = new Event('input', { bubbles: true })
              editor.dispatchEvent(ev)
            }
            confirm?.click()
          } catch {}
        }
        window.setTimeout(() => setVisionText('Build a T‑shirt brand.'), 50)

        // Lightweight API to edit pipeline and task items via harness
        const splitFriendly = (s: string, max = 24) => {
          const words = s.split(/\s+/)
          const lines: string[] = []
          let cur = ''
          for (const w of words) {
            if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w } else { cur = (cur ? cur + ' ' : '') + w }
          }
          if (cur) lines.push(cur)
          return lines
        }
        const applyPipeline = (detail: any) => {
          try {
            const blocks: Array<{ index?: number; text?: string; items?: string[] }> = Array.isArray(detail?.blocks) ? detail.blocks : []
            const blockEls = Array.from(document.querySelectorAll<HTMLElement>('.pipeline .task-block'))
            blocks.forEach((b, i) => {
              const idx = typeof b.index === 'number' ? b.index : i
              const el = blockEls[idx]
              if (!el) return
              if (typeof b.text === 'string') {
                const name = el.querySelector('.task-block__name') as HTMLElement | null
                if (name) {
                  name.innerHTML = ''
                  splitFriendly(b.text).forEach((ln) => {
                    const d = document.createElement('div'); d.textContent = ln; name.appendChild(d)
                  })
                }
              }
            })
            if (Array.isArray(detail?.items)) {
              const itemTexts: string[] = detail.items
              const labelLines = Array.from(document.querySelectorAll<HTMLElement>('.task-item-node .label-post .label-post__lines'))
              itemTexts.forEach((t, i) => {
                const linesEl = labelLines[i]
                if (!linesEl) return
                linesEl.innerHTML = ''
                splitFriendly(t, 30).forEach((ln) => {
                  const d = document.createElement('div'); d.className = 'label-post__line'; d.textContent = ln; linesEl.appendChild(d)
                })
              })
            }
          } catch {}
        }
        const onPipeEvt = (e: Event) => applyPipeline((e as CustomEvent<any>).detail)
        window.addEventListener('eden-demo:pipeline', onPipeEvt as any)
        cleanups.push(() => window.removeEventListener('eden-demo:pipeline', onPipeEvt as any))
        cleanups.push(() => {
          try {
            video.removeEventListener('loadeddata', onReady as any)
            video.removeEventListener('canplay', onReady as any)
            video.removeEventListener('canplaythrough', onReady as any)
          } catch {}
        })
        return true
      }
      if (!apply()) {
        mo = new MutationObserver(() => { if (apply() && mo) { mo.disconnect(); mo = null } })
        mo.observe(document.body, { childList: true, subtree: true })
      }
      return () => { if (mo) mo.disconnect(); cleanups.forEach(fn => { try { fn() } catch {} }) }
    }, [])
    return null
  }

  const Comp = viewMap[view]
  return (
    <div className="one-ada-proj-root" style={{ minHeight: '100vh', background: '#0B0B0B' }}>
      {view === 'home' && <HomeHarnessMods />}
      {view === 'project-demo' && <ProjectHarnessMods />}
      <Suspense fallback={null}>
        <Comp />
      </Suspense>
    </div>
  )
}

export default OneAdaProj
