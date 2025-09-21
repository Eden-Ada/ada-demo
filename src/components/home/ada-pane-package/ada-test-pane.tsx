import React, { useState } from 'react';
import './ada-test-pane.css';
import '../../../styles/glass-pane.css';
import AdaOrbRive from './ada-ai-orb/ada-orb-rive/ada-orb-rive';

interface AdaTestPaneProps {
  children?: React.ReactNode;
  className?: string;
}

const presetColors = [
  { index: 0, name: 'Black', color: '#000000' },
  { index: 1, name: 'White', color: '#FFFFFF' },
  { index: 2, name: 'Red', color: '#FF0000' },
  { index: 3, name: 'Orange', color: '#FF6B35' },
  { index: 4, name: 'Yellow', color: '#FFD700' },
  { index: 5, name: 'Green', color: '#00C851' },
  { index: 6, name: 'Cyan', color: '#00BCD4' },
  { index: 7, name: 'Blue', color: '#2196F3' },
  { index: 8, name: 'Purple', color: '#9C27B0' },
  { index: 9, name: 'Pink', color: '#E91E63' },
];

const AdaTestPane: React.FC<AdaTestPaneProps> = ({ children, className = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [colorTheme, setColorTheme] = useState(3);

  const handleStateChange = (state: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    setIsListening(state === 'listening');
    setIsThinking(state === 'thinking');
    setIsSpeaking(state === 'speaking');
  };

  const getCurrentState = () => {
    if (isListening) return 'listening';
    if (isThinking) return 'thinking';
    if (isSpeaking) return 'speaking';
    return 'idle';
  };

  return (
    <div className={`ada-test-pane glass-pane ${className}`}>
      {children || (
        <div className="ada-test-pane__content">
          {/* Orb Display */}
          <div style={{ width: '100%', height: '300px', position: 'relative' }}>
            <AdaOrbRive
              isListening={isListening}
              isThinking={isThinking}
              isSpeaking={isSpeaking}
              colorTheme={colorTheme}
            />
          </div>

          {/* Controls */}
          <div className="ada-orb-controls">
            <div className="control-group">
              <label>State</label>
              <div className="control-buttons">
                <button onClick={() => handleStateChange('idle')} className={getCurrentState() === 'idle' ? 'active' : ''}>Idle</button>
                <button onClick={() => handleStateChange('listening')} className={getCurrentState() === 'listening' ? 'active' : ''}>Listening</button>
                <button onClick={() => handleStateChange('thinking')} className={getCurrentState() === 'thinking' ? 'active' : ''}>Thinking</button>
                <button onClick={() => handleStateChange('speaking')} className={getCurrentState() === 'speaking' ? 'active' : ''}>Speaking</button>
              </div>
            </div>
            <div className="control-group">
              <label>Preset Colors</label>
              <div className="color-palette">
                {presetColors.map(({ index, color }) => (
                  <button
                    key={index}
                    className={`color-swatch ${colorTheme === index ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setColorTheme(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaTestPane;
