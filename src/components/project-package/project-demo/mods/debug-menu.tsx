import React, { useState } from 'react'

export type DebugMenuProps = {
  onCompleteTaskBlock: (blockId: string) => void
  onCompleteBrandingSection: (section: string) => void
}

const DebugMenu: React.FC<DebugMenuProps> = ({ onCompleteTaskBlock, onCompleteBrandingSection }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [brandingExpanded, setBrandingExpanded] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        top: 84,
        right: 16,
        zIndex: 10000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '6px 12px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 8,
            color: '#FF4444',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            letterSpacing: '0.5px',
          }}
        >
          🐛 DEBUG
        </button>
      )}

      {/* Debug Menu Panel */}
      {isOpen && (
        <div
          style={{
            width: 280,
            maxHeight: '80vh',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 0, 0, 0.5)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            padding: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ color: '#FF0000', fontSize: 14, fontWeight: 700 }}>🐛 DEBUG MENU</div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF0000',
                fontSize: 18,
                cursor: 'pointer',
                padding: 0,
                width: 24,
                height: 24,
              }}
            >
              ×
            </button>
          </div>

          {/* Task Blocks Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
              COMPLETE TASK BLOCKS
            </div>
            
            {/* Branding Block */}
            <div style={{ marginBottom: 4 }}>
              <div
                onClick={() => setBrandingExpanded(!brandingExpanded)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <span>Branding</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{brandingExpanded ? '▼' : '▶'}</span>
              </div>
              
              {/* Branding Sub-sections */}
              {brandingExpanded && (
                <div style={{ paddingLeft: 16, marginBottom: 8 }}>
                  <button
                    onClick={() => onCompleteBrandingSection('research')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      marginBottom: 4,
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: 4,
                      color: '#A78BFA',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ✓ Complete Research
                  </button>
                  <button
                    onClick={() => onCompleteBrandingSection('task1')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      marginBottom: 4,
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: 4,
                      color: '#A78BFA',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ✓ Complete Task 1 (Logo)
                  </button>
                  <button
                    onClick={() => onCompleteBrandingSection('task2')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      marginBottom: 4,
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: 4,
                      color: '#A78BFA',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ✓ Complete Task 2 (Vibe)
                  </button>
                  <button
                    onClick={() => onCompleteBrandingSection('task3')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      marginBottom: 4,
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: 4,
                      color: '#A78BFA',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ✓ Complete Task 3 (Manual Upload)
                  </button>
                  <button
                    onClick={() => onCompleteBrandingSection('all')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 4,
                      color: '#4ADE80',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ✓✓ Complete ALL Branding
                  </button>
                </div>
              )}
            </div>

            {/* Other Task Blocks */}
            {['Design', 'Production', 'Marketing', 'Distribution'].map((block, idx) => (
              <button
                key={block}
                onClick={() => onCompleteTaskBlock(`b${idx + 2}`)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: 4,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {block}
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div
            style={{
              padding: 10,
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: 6,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 10,
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#FF6B6B' }}>Debug Mode:</strong> Use these shortcuts to skip ahead during testing. Click sections to simulate completion.
          </div>
        </div>
      )}
    </div>
  )
}

export default DebugMenu
