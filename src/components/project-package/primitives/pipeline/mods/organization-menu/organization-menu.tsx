import React, { useState, useRef, useEffect } from 'react'
import './organization-menu.css'

export type OrganizationMenuProps = {
  visible: boolean
  onClose: () => void
  onAddMember: (member: { type: 'person' | 'bot', name: string, color: string }) => void
  caretOffset?: number // Offset from center to position caret over people picker
}

const OrganizationMenu: React.FC<OrganizationMenuProps> = ({ visible, onClose, onAddMember, caretOffset = 0 }) => {
  const [activeTab, setActiveTab] = useState<'person' | 'bot' | null>(null)
  const [username, setUsername] = useState('')
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [botName, setBotName] = useState('')
  const [botDescription, setBotDescription] = useState('')
  const [botColor, setBotColor] = useState('#8B5CF6')
  const [botStep, setBotStep] = useState<'form' | 'color'>('form')
  const menuRef = useRef<HTMLDivElement>(null)

  // Reset all state when menu opens
  useEffect(() => {
    if (visible) {
      setActiveTab(null)
      setUsername('')
      setUsernameValid(null)
      setShowProfile(false)
      setInviteSent(false)
      setBotName('')
      setBotDescription('')
      setBotColor('#8B5CF6')
      setBotStep('form')
    }
  }, [visible])

  // Reset bot step when switching tabs
  useEffect(() => {
    setBotStep('form')
  }, [activeTab])

  // Simulate API check for username
  useEffect(() => {
    if (!username || activeTab !== 'person') {
      setUsernameValid(null)
      setShowProfile(false)
      setInviteSent(false)
      return
    }

    // Reset states when username changes
    setInviteSent(false)

    // Simulate API delay
    const timer = setTimeout(() => {
      const isValid = username.toLowerCase() === 'pato_two'
      setUsernameValid(isValid)
      if (isValid) {
        setTimeout(() => setShowProfile(true), 300)
      } else {
        setShowProfile(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username, activeTab])

  // Handle click outside to close menu
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        console.log('Clicked outside menu - closing')
        onClose()
      }
    }

    // Add small delay to prevent immediate closing when opening
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside, true)
    }, 150)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleClickOutside, true)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div ref={menuRef} className="organization-menu">
      {/* Selection Cards */}
      <div className="organization-menu__selection">
        {/* Person Card */}
        <button
          onClick={() => setActiveTab('person')}
          className={`organization-menu__card ${activeTab === 'person' ? 'is-selected' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="organization-menu__card-title">Person</span>
        </button>

        {/* Ada-Bot Card */}
        <button
          onClick={() => setActiveTab('bot')}
          className={`organization-menu__card ${activeTab === 'bot' ? 'is-selected' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            <circle cx="12" cy="16" r="1"></circle>
          </svg>
          <span className="organization-menu__card-title">Ada-Bot</span>
        </button>
      </div>

      {/* Content - Only show when a tab is selected */}
      {activeTab && (
        <div key={activeTab} className="organization-menu__content">
        {activeTab === 'person' ? (
          <div className="organization-menu__person-form">
            <label className="organization-menu__label">
              Eden Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className="organization-menu__input"
                style={{ paddingRight: 40 }}
              />
              {/* Validation indicator */}
              {usernameValid !== null && (
                <div style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'validation-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  {usernameValid ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </div>
              )}
            </div>
            {/* Profile preview */}
            {showProfile && (
              <div className="organization-menu__profile-card">
                <div className="organization-menu__profile-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="organization-menu__profile-info">
                  <div className="organization-menu__profile-handle">@pato_two</div>
                  <div className="organization-menu__profile-name">Patricio Guerra</div>
                </div>
                <button
                  onClick={() => {
                    setInviteSent(true)
                    onAddMember({ type: 'person', name: 'Patricio Guerra', color: '#3B82F6' })
                  }}
                  disabled={inviteSent}
                  className="organization-menu__invite-button-inline"
                >
                  {inviteSent ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Sent!</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <path d="M22 7l-10 7L2 7"></path>
                      </svg>
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="organization-menu__bot-form">
            {botStep === 'color' ? (
              /* Color picker view */
              <div className="organization-menu__color-picker-view">
                <div className="organization-menu__profile-with-back">
                  <button
                    type="button"
                    className="organization-menu__back-button-icon"
                    onClick={() => setBotStep('form')}
                    aria-label="Back to form"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  
                  <div 
                    className="organization-menu__bot-avatar"
                    style={{ backgroundColor: botColor, cursor: 'default' }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      <circle cx="12" cy="16" r="1"></circle>
                    </svg>
                  </div>
                </div>
                
                <div className="organization-menu__color-palette">
                  {[
                    '#8B5CF6', // Purple
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#EF4444', // Red
                    '#F59E0B', // Orange
                    '#EC4899', // Pink
                    '#6366F1', // Indigo
                    '#14B8A6', // Teal
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`organization-menu__color-swatch ${botColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBotColor(color)}
                      aria-label={`Select ${color} color`}
                    >
                      {botColor === color && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="organization-menu__create-button"
                  onClick={() => {
                    onAddMember({ type: 'bot', name: botName, color: botColor })
                  }}
                >
                  Create Bot
                </button>
              </div>
            ) : (
              /* Form view */
              <>
                <label className="organization-menu__label">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="e.g., Designer Ada"
                  className="organization-menu__input"
                  style={{ marginBottom: 16 }}
                />
                <label className="organization-menu__label">
                  Description
                </label>
                <textarea
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  placeholder="What will this bot do?"
                  className="organization-menu__textarea"
                />
                
                <button
                  type="button"
                  className="organization-menu__continue-button"
                  onClick={() => setBotStep('color')}
                  disabled={!botName || !botDescription}
                >
                  Continue
                </button>
              </>
            )}
          </div>
        )}
        </div>
      )}

      {/* Downward pointing caret */}
      <div 
        className="organization-menu__caret" 
        style={{ 
          left: `calc(50% + ${caretOffset}px)` 
        }}
      />
    </div>
  )
}

export default OrganizationMenu
