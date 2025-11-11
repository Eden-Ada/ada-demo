import React, { useState, useRef, useEffect, useCallback } from 'react'
import OrganizationMenu from './organization-menu/organization-menu'

export type OrgMember = {
  id: string
  type: 'person' | 'bot'
  name: string
  color: string
}

type OrganizationPanelProps = {
  onProfileSelected?: (member: OrgMember | null) => void
  externalSelectedMember?: OrgMember | null
  onExpandedChange?: (expanded: boolean) => void
}

const OrganizationPanel: React.FC<OrganizationPanelProps> = ({ onProfileSelected, externalSelectedMember, onExpandedChange }) => {
  const [orgMenuVisible, setOrgMenuVisible] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [pressingProfileId, setPressingProfileId] = useState<string | null>(null)
  const [longPressActive, setLongPressActive] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<number | null>(null)

  const handleAddMember = (member: { type: 'person' | 'bot', name: string, color: string }) => {
    setOrgMembers(prev => [...prev, { ...member, id: Date.now().toString() }])
    setOrgMenuVisible(false)
  }

  // Calculate caret offset to position over people picker button
  // Panel width changes based on expanded state
  const panelWidth = isExpanded && orgMembers.length > 0 
    ? 56 + (orgMembers.length * 66) 
    : 56 + (orgMembers.length * 20)
  // People picker is at right: 0, menu is centered, so offset = (panelWidth/2) - 28px
  const caretOffset = (panelWidth / 2) - 28

  // Notify parent when profile selection changes
  useEffect(() => {
    if (onProfileSelected) {
      const selectedMember = orgMembers.find(m => m.id === selectedProfileId) || null
      console.log('📤 Notifying parent of profile selection:', selectedMember)
      onProfileSelected(selectedMember)
    }
  }, [selectedProfileId, orgMembers, onProfileSelected])

  // Notify parent when expanded state changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded)
    }
  }, [isExpanded, onExpandedChange])

  // Sync with external selection (deselect after assignment)
  // Only deselect when parent explicitly sets to null AFTER we had a selection
  const prevExternalRef = useRef<OrgMember | null | undefined>(undefined)
  useEffect(() => {
    // If parent had a member and now has null, deselect
    if (prevExternalRef.current !== undefined && prevExternalRef.current !== null && externalSelectedMember === null) {
      console.log('✅ Parent cleared selection (after assignment) - deselecting')
      setSelectedProfileId(null)
      setLongPressActive(false)
    }
    prevExternalRef.current = externalSelectedMember
  }, [externalSelectedMember])

  // Debug: Log when long press timer starts
  const handleLongPressStart = useCallback((memberId: string, memberName: string) => {
    console.log('🟡 Long press timer started for:', memberName, 'ID:', memberId)
    longPressTimerRef.current = window.setTimeout(() => {
      console.log('✅ Long press activated for:', memberName)
      setLongPressActive(true)
      setSelectedProfileId(memberId)
      console.log('✅ Selected profile ID set to:', memberId)
    }, 500)
  }, [])

  // Debug: Log selection changes
  useEffect(() => {
    console.log('📍 selectedProfileId changed to:', selectedProfileId)
  }, [selectedProfileId])

  // Handle click outside to collapse immediately
  // BUT: Keep long press mode active during panning
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Only collapse if no profile is selected (not in assignment mode)
        if (!selectedProfileId) {
          setIsExpanded(false)
        }
        // If profile selected, keep expanded for assignment
      }
    }

    document.addEventListener('pointerdown', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true)
    }
  }, [isExpanded, selectedProfileId])

  return (
    <>
      <style>{`
        @keyframes profile-pulse {
          0%, 100% { 
            box-shadow: 0 0 40px var(--pulse-color, #8B5CF6), 0 0 80px var(--pulse-color-light, #8B5CF688), 0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.3);
          }
          50% { 
            box-shadow: 0 0 60px var(--pulse-color, #8B5CF6), 0 0 100px var(--pulse-color-light, #8B5CF688), 0 8px 32px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,255,255,0.5);
          }
        }
      `}</style>
      {/* Organization Menu */}
      <OrganizationMenu 
        visible={orgMenuVisible} 
        onClose={() => setOrgMenuVisible(false)}
        onAddMember={handleAddMember}
        caretOffset={caretOffset}
      />
      
      {/* Profile Stack Container */}
      <div 
        ref={panelRef}
        style={{
          position: 'relative',
          width: isExpanded && orgMembers.length > 0 
            ? 56 + (orgMembers.length * 66) // 56px circle + 10px gap = 66px per profile
            : 56 + (orgMembers.length * 20), // collapsed: 20px overlap
          height: 56,
          cursor: 'pointer',
          transition: 'width 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => {
          e.stopPropagation()
          // Only expand if profiles exist and not already expanded
          if (orgMembers.length > 0 && !isExpanded) {
            setIsExpanded(true)
          }
        }}
      >
        {/* Profile Circles - Dynamic (behind, overlapping) */}
        {orgMembers.map((member, index) => (
          <div 
            key={member.id}
            style={{
              position: 'absolute',
              right: isExpanded ? (index + 1) * 66 : (index + 1) * 20, // 66px = 56px circle + 10px gap
              top: 0,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: selectedProfileId === member.id 
                ? `linear-gradient(135deg, ${member.color}, ${member.color}dd)` 
                : member.color,
              border: pressingProfileId === member.id
                ? '6px solid #FF0000'
                : selectedProfileId === member.id 
                ? '4px solid #FFFFFF' 
                : '2px solid rgba(255,255,255,0.2)',
              boxShadow: selectedProfileId === member.id 
                ? `0 0 40px ${member.color}, 0 0 80px ${member.color}88, 0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.3)` 
                : '0 4px 16px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              zIndex: selectedProfileId === member.id ? 1000 : orgMembers.length - index,
              pointerEvents: 'auto',
              transform: selectedProfileId === member.id ? 'scale(1.3)' : 'scale(1)',
              filter: selectedProfileId === member.id ? 'brightness(1.3) saturate(1.5)' : 'none',
              animation: selectedProfileId === member.id ? 'profile-pulse 1s ease-in-out infinite' : 'none',
            }}
            title={member.name}
            onPointerDown={(e) => {
              e.stopPropagation()
              console.log('🔴 POINTER DOWN on profile:', member.name, 'isExpanded:', isExpanded)
              setPressingProfileId(member.id)
              // Only allow long press when expanded
              if (isExpanded) {
                handleLongPressStart(member.id, member.name)
              } else {
                console.log('⚠️ Stack is NOT expanded - long press disabled')
              }
            }}
            onPointerUp={() => {
              console.log('⬆️ Pointer up on profile')
              setPressingProfileId(null)
              if (longPressTimerRef.current) {
                console.log('❌ Cancelling long press timer (pointer up)')
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
              }
            }}
            onPointerLeave={() => {
              console.log('👋 Pointer leave on profile')
              setPressingProfileId(null)
              if (longPressTimerRef.current) {
                console.log('❌ Cancelling long press timer (pointer leave)')
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
              }
            }}
          >
            {member.type === 'bot' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
          </div>
        ))}

        {/* People Picker Button (front, on right) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            
            // If collapsed with profiles, expand
            if (!isExpanded && orgMembers.length > 0) {
              setIsExpanded(true)
            }
            // If no profiles OR already expanded, open menu
            else if ((orgMembers.length === 0 || isExpanded) && !orgMenuVisible) {
              setOrgMenuVisible(true)
            }
          }}
          style={{
            position: 'absolute',
            right: 0, // Always at the right edge
            top: 0,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
          }}
        >
          <svg width="25" height="29" viewBox="0 0 25 29" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 26C18 23.8783 17.1571 21.8434 15.6569 20.3431C14.1566 18.8429 12.1217 18 10 18C7.87827 18 5.84344 18.8429 4.34315 20.3431C2.84285 21.8434 2 23.8783 2 26" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 18C12.7614 18 15 15.7614 15 13C15 10.2386 12.7614 8 10 8C7.23858 8 5 10.2386 5 13C5 15.7614 7.23858 18 10 18Z" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 5H24" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 1V9" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </>
  )
}

export default OrganizationPanel
