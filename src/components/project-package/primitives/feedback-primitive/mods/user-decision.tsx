import React from 'react'

export type UserDecisionProps = {
  onDecision?: (accepted: boolean) => void
}

const UserDecision: React.FC<UserDecisionProps> = ({ onDecision }) => {
  return (
    <div className="fp-decision" role="dialog" aria-label="Confirm or reject">
      <div className="fp-decision__panel">
        <button
          type="button"
          className="fp-decision__btn is-reject"
          aria-label="Reject"
          onClick={() => onDecision?.(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          className="fp-decision__btn is-accept"
          aria-label="Accept"
          onClick={() => onDecision?.(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default UserDecision
