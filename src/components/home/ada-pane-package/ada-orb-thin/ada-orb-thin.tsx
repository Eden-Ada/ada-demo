import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, useViewModel, useViewModelInstance, useViewModelInstanceColor } from '@rive-app/react-webgl2';
import type { FC } from 'react';
import './ada-orb-thin.css';

type AdaOrbThinProps = {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  colorTheme?: number;
  className?: string;
  src?: string;
  stateMachine?: string;
  artboard?: string;
  colorInputName?: string;
  colorRgb?: [number, number, number];
  secondaryColorName?: string;
  secondaryColorRgb?: [number, number, number];
};

const onLoad = (rive: any) => {
  // Mirror ada-orb-rive diagnostics to ensure parity
  // eslint-disable-next-line no-console
  console.log('Ada Thin Rive Orb loaded successfully');
  // eslint-disable-next-line no-console
  console.log('Rive instance:', rive);
  if (rive) {
    // eslint-disable-next-line no-console
    console.log('Rive artboard:', rive.artboard);
    // eslint-disable-next-line no-console
    console.log('Rive state machines:', rive.stateMachineNames);
    const artboard = rive.artboard;
    if (artboard) {
      // eslint-disable-next-line no-console
      console.log('Artboard width:', artboard.width);
      // eslint-disable-next-line no-console
      console.log('Artboard height:', artboard.height);
    }
    try {
      const sm = 'default';
      const inputs = rive.stateMachineInputs?.(sm);
      if (inputs) {
        // eslint-disable-next-line no-console
        console.log('State machine inputs:', inputs);
        inputs.forEach((input: any) => {
          // eslint-disable-next-line no-console
          console.log(`Input: ${input.name}, Type: ${input.type}, Value: ${input.value}`);
        });
      }
      // If there are no state machines, try to play a common animation name
      const sms = (rive as any).stateMachineNames;
      if (!sms || (Array.isArray(sms) && sms.length === 0)) {
        const candidates = ['idle', 'Idle', 'IDLE', 'loop', 'Loop', 'Main', 'main'];
        for (const name of candidates) {
          try {
            (rive as any).play?.(name);
            // eslint-disable-next-line no-console
            console.log('Tried playing animation:', name);
          } catch {}
        }
      }
    } catch {}
  }
};

const AdaOrbThin: FC<AdaOrbThinProps> = ({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  colorTheme = 3,
  className = '',
  src = '/assets/rive-orb-thin/halo-2.0.riv',
  stateMachine = 'default',
  artboard,
  colorInputName,
  colorRgb,
  secondaryColorName,
  secondaryColorRgb,
}) => {
  const [localSrc, setLocalSrc] = useState(src);

  const { rive, RiveComponent } = useRive({
    src: localSrc,
    artboard,
    stateMachines: stateMachine,
    animations: ['idle', 'Idle', 'Loop'],
    autoplay: true,
    onLoad,
  });

  // View Model based color control (per vendor docs)
  const viewModel = useViewModel(rive, { useDefault: true });
  const viewModelInstance = useViewModelInstance(viewModel, { rive, useDefault: true });
  const vmPrimaryColor = useViewModelInstanceColor(colorInputName ?? 'color', viewModelInstance);
  const vmSecondaryColor = secondaryColorName
    ? useViewModelInstanceColor(secondaryColorName, viewModelInstance)
    : undefined;

  const listeningInput = useStateMachineInput(rive, stateMachine, 'listening');
  const thinkingInput = useStateMachineInput(rive, stateMachine, 'thinking');
  const speakingInput = useStateMachineInput(rive, stateMachine, 'speaking');
  // Try explicit color input name first, then common conventions
  const explicitColorInput = colorInputName
    ? useStateMachineInput(rive, stateMachine, colorInputName)
    : undefined;
  const colorInput = useStateMachineInput(rive, stateMachine, 'color');
  const themeInput = useStateMachineInput(rive, stateMachine, 'theme');
  const hueInput = useStateMachineInput(rive, stateMachine, 'hue');
  const tintInput = useStateMachineInput(rive, stateMachine, 'tint');
  const variantInput = useStateMachineInput(rive, stateMachine, 'variant');
  const indexInput = useStateMachineInput(rive, stateMachine, 'index');

  useEffect(() => {
    if (!rive) return;
    try { if (listeningInput) listeningInput.value = isListening; } catch {}
    try { if (thinkingInput) thinkingInput.value = isThinking; } catch {}
    try { if (speakingInput) speakingInput.value = isSpeaking; } catch {}
    try { if (explicitColorInput) explicitColorInput.value = colorTheme; else if (colorInput) colorInput.value = colorTheme; } catch {}
    try { if (themeInput) themeInput.value = colorTheme; } catch {}
    try { if (hueInput) hueInput.value = colorTheme; } catch {}
    try { if (tintInput) tintInput.value = colorTheme; } catch {}
    try { if (variantInput) variantInput.value = colorTheme; } catch {}
    try { if (indexInput) indexInput.value = colorTheme; } catch {}
    // ViewModel colors (only if provided by props)
    try {
      if (vmPrimaryColor?.setRgb && Array.isArray(colorRgb)) {
        vmPrimaryColor.setRgb(colorRgb[0], colorRgb[1], colorRgb[2]);
      }
      if (vmSecondaryColor?.setRgb && Array.isArray(secondaryColorRgb)) {
        vmSecondaryColor.setRgb(secondaryColorRgb[0], secondaryColorRgb[1], secondaryColorRgb[2]);
      }
    } catch {}
  }, [
    rive,
    isListening,
    isThinking,
    isSpeaking,
    colorTheme,
    listeningInput,
    thinkingInput,
    speakingInput,
    explicitColorInput,
    colorInput,
    themeInput,
    hueInput,
    tintInput,
    variantInput,
    indexInput,
    vmPrimaryColor,
    vmSecondaryColor,
    colorRgb,
    secondaryColorRgb,
  ]);

  // Log from the actual rive instance when it becomes available
  useEffect(() => {
    if (!rive) return;
    try {
      // eslint-disable-next-line no-console
      console.log('[Thin] rive state machines:', (rive as any).stateMachineNames);
      // eslint-disable-next-line no-console
      console.log('[Thin] rive artboard:', (rive as any).artboard);
    } catch {}
  }, [rive]);

  // Debug listener: respond to global CustomEvent('ada-orb-debug', { detail })
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const d = ce.detail || {};
      if (typeof d.src === 'string') {
        setLocalSrc(d.src);
        return; // early return; Rive will remount with new source
      }
      // Presets
      if (d.preset === 'default') {
        try { if (listeningInput) listeningInput.value = false; } catch {}
        try { if (thinkingInput) thinkingInput.value = false; } catch {}
        try { if (speakingInput) speakingInput.value = false; } catch {}
      }
      // Toggles
      try { if (typeof d.listening === 'boolean' && listeningInput) listeningInput.value = d.listening; } catch {}
      try { if (typeof d.thinking === 'boolean' && thinkingInput) thinkingInput.value = d.thinking; } catch {}
      try { if (typeof d.speaking === 'boolean' && speakingInput) speakingInput.value = d.speaking; } catch {}
      // Theme / color indices
      if (typeof d.theme === 'number') {
        try { if (themeInput) themeInput.value = d.theme; } catch {}
        try { if (hueInput) hueInput.value = d.theme; } catch {}
        try { if (tintInput) tintInput.value = d.theme; } catch {}
        try { if (variantInput) variantInput.value = d.theme; } catch {}
        try { if (indexInput) indexInput.value = d.theme; } catch {}
        try { if (colorInput) colorInput.value = d.theme; } catch {}
      }
      // Direct RGB stroke color via ViewModel if available
      try {
        if (Array.isArray(d.colorRgb) && vmPrimaryColor?.setRgb) {
          vmPrimaryColor.setRgb(d.colorRgb[0], d.colorRgb[1], d.colorRgb[2]);
        }
      } catch {}
    };
    window.addEventListener('ada-orb-debug' as any, handler as any);
    return () => window.removeEventListener('ada-orb-debug' as any, handler as any);
  }, [
    rive,
    listeningInput,
    thinkingInput,
    speakingInput,
    themeInput,
    hueInput,
    tintInput,
    variantInput,
    indexInput,
    colorInput,
    vmPrimaryColor,
  ]);

  return (
    <div className={`ada-orb-thin-container ${className}`} aria-label="Ada Assistant Orb (thin)">
      <RiveComponent key={localSrc} className="ada-orb-thin" />
    </div>
  );
};

export default AdaOrbThin;
