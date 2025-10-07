import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * RPG-like word-by-word reveal hook.
 * - Scopes animation to the consumer component only (no globals, no timers outside).
 * - Accepts raw text with optional <br/> tokens; preserves them while revealing words.
 */
export function useRpgWordReveal(options: {
  text: string;
  enabled?: boolean;
  intervalMs?: number; // time between ticks
  startDelayMs?: number; // initial delay
  loop?: boolean; // restart when finished
  mode?: 'word' | 'char';
}) {
  const {
    text,
    enabled = true,
    intervalMs = 70,
    startDelayMs = 0,
    loop = false,
    mode = 'char',
  } = options;

  // Normalize text into an array of tokens, preserving <br/> as hard breaks.
  const tokens = useMemo(() => {
    // Replace <br/> or <br> with a sentinel then branch by mode
    const sentinel = '\\u0001';
    const t = text.replace(/<br\s*\/?\s*>/gi, `${sentinel}`);
    const out: Array<{ type: 'word' | 'char' | 'space' | 'br'; value: string }> = [];

    if (mode === 'word') {
      const raw = t.split(/\s+/);
      raw.forEach((r) => {
        if (!r) return;
        const parts = r.split(sentinel);
        parts.forEach((p, idx) => {
          if (p) out.push({ type: 'word', value: p });
          if (idx < parts.length - 1) out.push({ type: 'br', value: '' });
        });
        // insert a space token between words
        out.push({ type: 'space', value: ' ' });
      });
      // remove trailing space if any
      if (out.length && out[out.length - 1].type === 'space') out.pop();
    } else {
      // char mode: walk each character preserving spaces and breaks
      const parts = t.split(sentinel);
      parts.forEach((segment, segIdx) => {
        for (let i = 0; i < segment.length; i++) {
          const ch = segment[i];
          if (ch === ' ') out.push({ type: 'space', value: ' ' });
          else out.push({ type: 'char', value: ch });
        }
        if (segIdx < parts.length - 1) out.push({ type: 'br', value: '' });
      });
    }
    return out;
  }, [text, mode]);

  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(enabled);
  const delayRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Reset when text changes or enabled changes
  useEffect(() => {
    setIndex(0);
    setRunning(enabled);
    // clear any previous timers on re-run
    if (delayRef.current) window.clearTimeout(delayRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    delayRef.current = null;
    intervalRef.current = null;
    return () => {
      if (delayRef.current) window.clearTimeout(delayRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      delayRef.current = null;
      intervalRef.current = null;
    };
  }, [text, enabled]);

  useEffect(() => {
    if (!running) return;
    // Start after optional delay, then tick on a fixed interval
    delayRef.current = window.setTimeout(() => {
      // safety: clear any previous interval
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setIndex((prev) => {
          if (prev >= tokens.length) return prev;
          const next = prev + 1;
          if (next >= tokens.length) {
            // finished
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (loop) {
              // restart after a brief pause
              if (delayRef.current) window.clearTimeout(delayRef.current);
              delayRef.current = window.setTimeout(() => setIndex(0), 800);
            }
          }
          return next;
        });
      }, intervalMs);
    }, startDelayMs);

    return () => {
      if (delayRef.current) window.clearTimeout(delayRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      delayRef.current = null;
      intervalRef.current = null;
    };
  }, [running, tokens.length, intervalMs, startDelayMs, loop]);

  // Build the displayed JSX preserving <br/>
  const content = useMemo<React.ReactNode[]>(() => {
    const visible = tokens.slice(0, index);
    const nodes: React.ReactNode[] = [];
    visible.forEach((t, i) => {
      if (t.type === 'br') {
        nodes.push(React.createElement('br', { key: `br-${i}` }));
      } else if (t.type === 'space') {
        nodes.push(' ');
      } else {
        nodes.push(
          React.createElement(
            'span',
            { key: `w-${i}` },
            t.value,
            ''
          )
        );
      }
    });
    return nodes;
  }, [tokens, index]);

  const done = index >= tokens.length && tokens.length > 0;

  return { content, done, reset: () => setIndex(0), skip: () => setIndex(tokens.length) };
}
