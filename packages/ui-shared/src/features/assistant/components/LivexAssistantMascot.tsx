import React, { useEffect, useRef, useState } from 'react';
import { type AssistantState, useSettingsStore } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexAssistantMascotProps {
  size?: number;
  mode?: 'dock' | 'chat';
  state?: AssistantState;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LivexBotEmblem (LivexAssistantMascot)
 *
 * Professional, minimalist studio intelligence emblem inspired by Kimi and Grok.
 * Replaces cartoon mascot tropes with a high-precision sound resonance mark
 * that subtly responds to assistant states (idle, thinking, streaming, error).
 */
export const LivexAssistantMascot: React.FC<LivexAssistantMascotProps> = ({
  size = 28,
  mode = 'dock',
  state = 'idle',
  interactive = false,
  className = '',
  style = {},
}) => {
  const prefersReduced = useAppReducedMotion();
  const theme = useSettingsStore((s) => s.settings?.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  const [barScales, setBarScales] = useState<[number, number, number, number, number]>([
    0.4, 0.75, 1.0, 0.75, 0.4,
  ]);
  const isVisibleRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDock = mode === 'dock';
  const isAnimated =
    !prefersReduced &&
    (state === 'thinking' ||
      state === 'searching' ||
      state === 'composing' ||
      state === 'responding' ||
      state === 'listening');

  // Pause when offscreen via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lightweight frame loop only active during dynamic states (0% idle CPU)
  useEffect(() => {
    if (!isAnimated) {
      if (state === 'error') {
        setBarScales([0.3, 0.3, 0.3, 0.3, 0.3]);
      } else if (state === 'sleeping') {
        setBarScales([0.2, 0.25, 0.3, 0.25, 0.2]);
      } else {
        setBarScales([0.4, 0.75, 1.0, 0.75, 0.4]);
      }
      return;
    }

    let animFrameId: number;
    let startTime = performance.now();

    const loop = (now: number) => {
      if (isVisibleRef.current) {
        const t = (now - startTime) / 1000;

        if (state === 'thinking' || state === 'searching' || state === 'composing') {
          // Hypnotic, calm wave undulation (Kimi / Grok inspired)
          const b0 = 0.35 + Math.sin(t * 3.2 + 0.0) * 0.25;
          const b1 = 0.45 + Math.sin(t * 3.2 + 0.8) * 0.35;
          const b2 = 0.55 + Math.sin(t * 3.2 + 1.6) * 0.45;
          const b3 = 0.45 + Math.sin(t * 3.2 + 2.4) * 0.35;
          const b4 = 0.35 + Math.sin(t * 3.2 + 3.2) * 0.25;
          setBarScales([b0, b1, b2, b3, b4]);
        } else if (state === 'responding') {
          // Dynamic studio audio meter rhythm
          const b0 = 0.3 + Math.abs(Math.sin(t * 7.5)) * 0.4;
          const b1 = 0.4 + Math.abs(Math.cos(t * 8.2)) * 0.55;
          const b2 = 0.6 + Math.abs(Math.sin(t * 9.0)) * 0.4;
          const b3 = 0.4 + Math.abs(Math.cos(t * 7.8)) * 0.55;
          const b4 = 0.3 + Math.abs(Math.sin(t * 8.6)) * 0.4;
          setBarScales([b0, b1, b2, b3, b4]);
        } else if (state === 'listening') {
          // Attentive rhythmic breathing
          const pulse = 0.5 + Math.sin(t * 5.0) * 0.3;
          setBarScales([pulse * 0.5, pulse * 0.8, pulse, pulse * 0.8, pulse * 0.5]);
        }
      }
      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [isAnimated, state]);

  // Dimensions & geometry
  const borderRadius = Math.max(6, Math.round(size * 0.28));

  // Bar colors
  let barColor = isDock
    ? isLight ? '#0f172a' : '#ffffff'
    : '#ffffff';

  if (state === 'error') {
    barColor = '#f87171';
  } else if (state === 'listening') {
    barColor = '#38bdf8';
  }

  return (
    <div
      ref={containerRef}
      className={`livex-bot-emblem ${className}`}
      data-state={state}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: isDock
          ? 'transparent'
          : isLight
            ? '#0f172a'
            : '#090d16',
        border: isDock
          ? 'none'
          : isLight
            ? '1px solid rgba(15, 23, 42, 0.15)'
            : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: isDock
          ? 'none'
          : isLight
            ? '0 2px 8px rgba(0, 0, 0, 0.12)'
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 4px 16px rgba(0, 0, 0, 0.4)',
        transition: 'transform 180ms ease, border-color 180ms ease',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width={isDock ? Math.round(size * 0.82) : Math.round(size * 0.62)}
        height={isDock ? Math.round(size * 0.82) : Math.round(size * 0.62)}
        style={{
          display: 'block',
          overflow: 'visible',
        }}
      >
        {/* Harmonic Audio Frequency Resonance Bars (Studio / Kimi / Grok style) */}
        {[
          { x: 5, scale: barScales[0] },
          { x: 10.5, scale: barScales[1] },
          { x: 16, scale: barScales[2] },
          { x: 21.5, scale: barScales[3] },
          { x: 27, scale: barScales[4] },
        ].map((bar, i) => {
          const maxH = 20;
          const h = Math.max(3, maxH * bar.scale);
          const y = 16 - h / 2;

          return (
            <rect
              key={i}
              x={bar.x - 1.25}
              y={y}
              width={2.5}
              height={h}
              rx={1.25}
              fill={barColor}
              opacity={isDock ? 0.95 : 0.88 + i * 0.02}
              style={{
                transition: prefersReduced ? 'none' : 'height 80ms ease, y 80ms ease',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const LivexBotEmblem = LivexAssistantMascot;
export default LivexAssistantMascot;
