# Ada Orb Rive

Rive-based AI orb component using the orb-1.2.riv animation file.

## Features
- Interactive state machine with listening, thinking, and speaking states
- Responsive sizing
- WebGL2 rendering via @rive-app/react-webgl2

## Files
- `orb-1.2.riv` - Main Rive animation file (in public folder)
- `orb-1.2.rev` - Rive project file (in public folder)

## Usage
```tsx
<AdaOrbRive
  isListening={false}
  isThinking={true}
  isSpeaking={false}
/>
```

## State Machine Inputs
- `listening` - Boolean input for listening state
- `thinking` - Boolean input for thinking state  
- `speaking` - Boolean input for speaking state
