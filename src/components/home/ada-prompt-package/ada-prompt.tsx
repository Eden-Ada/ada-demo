import React from 'react';
import './ada-prompt.css';
import { useRpgWordReveal } from './ada-prompt-animation';

interface AdaPromptProps {
  className?: string;
  text?: string; // optional external text to render
  animate?: boolean; // external control: animate typing or render instantly
}

const AdaPrompt: React.FC<AdaPromptProps> = ({ className = '', text, animate }) => {
  const [enabled, setEnabled] = React.useState(false);
  // Listen to global start/done so staged transitions and store navigation can toggle typing
  React.useEffect(() => {
    const onStart = () => setEnabled(true);
    window.addEventListener('ada-prompt-start' as any, onStart as any);
    return () => {
      window.removeEventListener('ada-prompt-start' as any, onStart as any);
    };
  }, []);
  // External prop only disables animation when false; starting is driven by 'ada-prompt-start'
  React.useEffect(() => {
    if (animate === false) setEnabled(false);
  }, [animate]);
  const promptText =
    text || 'Hello Patricio, my name is Ada.<br/>I’m your personal AI assistant<br/>here on Eden‑OS!';
  const { content, done } = useRpgWordReveal({
    text: promptText,
    enabled,
    intervalMs: 40, // target pacing per request
    startDelayMs: 300,
    loop: false,
    mode: 'char',
  });
  React.useEffect(() => {
    if (done) {
      const evt = new CustomEvent('ada-prompt-done');
      window.dispatchEvent(evt);
    }
  }, [done]);

  // If this is the instance-invitation prompt and it has just finished animating (new prompt),
  // switch the orb to the instance picker. We guard so it only fires once per render.
  const firedPickerRef = React.useRef(false);
  React.useEffect(() => {
    if (!done) return;
    if (animate === false) return; // revisited prompts do not trigger
    if (firedPickerRef.current) return;
    const isInstanceInvite = /creating a new instance/i.test(promptText) || /project,\s*research,\s*or\s*autonomous/i.test(promptText);
    if (isInstanceInvite) {
      firedPickerRef.current = true;
      window.dispatchEvent(new CustomEvent('ada-orb-content', { detail: { mode: 'instance-picker' } }));
    }
  }, [done, animate, promptText]);

  // When not animating, render full text immediately with preserved <br/>
  const fullText = React.useMemo(() => {
    const parts = promptText.split(/<br\s*\/??\s*>/gi);
    const nodes: React.ReactNode[] = [];
    parts.forEach((seg, i) => {
      if (i > 0) nodes.push(React.createElement('br', { key: `br-full-${i}` }));
      nodes.push(seg);
    });
    return nodes;
  }, [promptText]);
  const shouldAnimate = animate !== false; // default: animate unless explicitly disabled
  return (
    <div className={`ada-prompt ${className}`}>
      <img
        className="ada-prompt__bubble"
        src="/assets/test-container.png"
        alt="Speech container"
      />
      <div className="ada-prompt__text">
        <p aria-live="polite">{shouldAnimate ? ((enabled || done) ? content : null) : fullText}</p>
      </div>
    </div>
  );
};

export default AdaPrompt;
