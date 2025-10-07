import React from 'react'
import './prompt-paginator.css'

export type PromptPaginatorProps = {
  canGoBack?: boolean
  canGoForward?: boolean
  onBack?: () => void
  onForward?: () => void
  index?: number;   // 1-based current index
}

const PromptPaginator: React.FC<PromptPaginatorProps> = ({
  canGoBack = false,
  canGoForward = true,
  index = 1,
  onBack,
  onForward,
}) => {
  return (
    <div className="prompt-paginator" role="navigation" aria-label="Prompt history navigation">
      <button
        className={`paginator-btn prev ${canGoBack ? '' : 'is-disabled'}`}
        onClick={canGoBack ? onBack : undefined}
        aria-disabled={!canGoBack}
        title={canGoBack ? 'Previous' : 'No previous prompts'}
      >
        <span aria-hidden>←</span>
      </button>

      <div className="paginator-count" aria-live="polite">( {index} )</div>

      <button
        className={`paginator-btn next ${canGoForward ? '' : 'is-disabled'}`}
        onClick={canGoForward ? onForward : undefined}
        aria-disabled={!canGoForward}
        title={canGoForward ? 'Next' : 'No next prompts'}
      >
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}

export default PromptPaginator
