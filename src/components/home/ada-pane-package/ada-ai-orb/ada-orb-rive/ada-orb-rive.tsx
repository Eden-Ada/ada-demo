import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';
import { useEffect } from 'react';
import type { FC } from 'react';
import './ada-orb-rive.css';
import '../../../../../styles/glass-pane.css';

type AdaOrbRiveProps = {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  colorTheme?: number; // Add color theme prop
  className?: string;
};

const onLoad = (rive: any) => {
  console.log('Ada Rive Orb loaded successfully');
  console.log('Rive instance:', rive);
  
  // Log all available properties and methods
  if (rive) {
    console.log('Rive artboard:', rive.artboard);
    console.log('Rive bounds:', rive.artboard?.bounds);
    console.log('Rive state machines:', rive.stateMachineNames);
    
    // Try to access the artboard and its properties
    const artboard = rive.artboard;
    if (artboard) {
      console.log('Artboard width:', artboard.width);
      console.log('Artboard height:', artboard.height);
      console.log('Artboard bounds:', artboard.bounds);
    }
    
    // Try to access state machine inputs
    const stateMachine = rive.stateMachineInputs('default');
    if (stateMachine) {
      console.log('State machine inputs:', stateMachine);
      stateMachine.forEach((input: any) => {
        console.log(`Input: ${input.name}, Type: ${input.type}, Value: ${input.value}`);
      });
    }
  }
};

export const AdaOrbRive: FC<AdaOrbRiveProps> = ({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  colorTheme = 3, // Default to orange
  className = '',
}) => {
  
  // The state machine name is always 'default' for Elements AI visuals
  const stateMachine = 'default';
  const { rive, RiveComponent } = useRive({
    // Using your orb-1.2.riv file
    src: '/orb-1.2.riv',
    stateMachines: stateMachine,
    autoplay: true,
    onLoad,
  });

  const listeningInput = useStateMachineInput(rive, stateMachine, 'listening');
  const thinkingInput = useStateMachineInput(rive, stateMachine, 'thinking');
  const speakingInput = useStateMachineInput(rive, stateMachine, 'speaking');
  // Try common color input names one at a time
  const colorInput = useStateMachineInput(rive, stateMachine, 'color');

  useEffect(() => {
    // Set Rive state machine inputs
    if (listeningInput) {
      listeningInput.value = isListening;
    }
    if (thinkingInput) {
      thinkingInput.value = isThinking;
    }
    if (speakingInput) {
      speakingInput.value = isSpeaking;
    }
    if (colorInput) {
      colorInput.value = colorTheme;
    }
  }, [
    isListening,
    isThinking,
    isSpeaking,
    colorTheme,
    listeningInput,
    thinkingInput,
    speakingInput,
    colorInput,
  ]);

  return (
    <div className={`ada-orb-rive-container ${className}`}>
      <RiveComponent className="ada-orb-rive" />
    </div>
  );
};

export default AdaOrbRive;
