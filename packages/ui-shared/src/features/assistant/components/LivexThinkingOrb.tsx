import React from 'react';
import { type AssistantState, useSettingsStore } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface LivexThinkingOrbProps {
  size?: number;
  state?: AssistantState;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LivexThinkingOrb
 *
 * Minimalist, calm ambient breathing ring for thinking/streaming states.
 * Replaces distracting multi-colored spinning particle orbits with an elegant
 * studio-grade status aura (Kimi / Grok inspired).
 */
export const LivexThinkingOrb: React.FC<LivexThinkingOrbProps> = ({
  size = 48,
  state = 'thinking',
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

  const isActive =
    state === 'thinking' ||
    state === 'searching' ||
    state === 'composing' ||
    state === 'responding';

  if (!isActive) return null;

  return (
    <div
      className={`livex-thinking-halo ${className}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'absolute',
        inset: 0,
        margin: 'auto',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: isLight
            ? '1.5px solid rgba(15, 23, 42, 0.25)'
            : '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: isLight
            ? '0 0 12px rgba(15, 23, 42, 0.08)'
            : '0 0 16px rgba(255, 255, 255, 0.12)',
          animation: prefersReduced ? 'none' : 'livex-halo-breathe 2.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes livex-halo-breathe {
          0% { transform: scale(0.92); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(0.92); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default LivexThinkingOrb;
