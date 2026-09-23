import React, { useState, useEffect, useRef } from 'react';
import { ThinkingOrb, type OrbState } from 'thinking-orbs';
import { type AssistantState, useSettingsStore } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import { motion } from 'motion/react';

export interface LivexAssistantMascotProps {
  size?: number;
  mode?: 'dock' | 'chat';
  state?: AssistantState;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function mapAssistantStateToOrbState(state: AssistantState): OrbState {
  switch (state) {
    case 'composing':
    case 'responding':
      return 'composing';
    case 'searching':
      return 'searching';
    case 'solving':
      return 'solving';
    case 'working':
    case 'thinking':
      return 'working';
    case 'listening':
      return 'listening';
    case 'success':
      return 'solving';
    case 'error':
    case 'interrupted':
    case 'sleeping':
    case 'idle':
    default:
      return 'breathing';
  }
}

/**
 * LivexAssistantMascot
 *
 * Minimal, premium animated circular orb inspired by Kimi AI and Grok.
 * Powered by thinking-orbs mathematical state engine:
 * - Idle / sleeping: calm breathing ring ('breathing')
 * - Thinking: tilted orbital particles ('working')
 * - Searching: equatorial meridian scan ('searching')
 * - Composing / Responding: harmonic multi-band sash ('composing')
 * - Listening: resonant latitude waves ('listening')
 * - Tap interaction: fluid state morph ('shaping' / 'solving') with gentle spring feedback
 * - Auto theme synchronization (Light / Dark)
 * - 0% idle CPU waste via built-in IntersectionObserver canvas throttling
 */
export const LivexAssistantMascot: React.FC<LivexAssistantMascotProps> = ({
  size = 32,
  mode = 'dock',
  state = 'idle',
  interactive = false,
  className = '',
  style = {},
  onClick,
}) => {
  const prefersReduced = useAppReducedMotion();
  const theme = useSettingsStore((s) => s.settings?.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  const [temporaryState, setTemporaryState] = useState<OrbState | null>(null);
  const tempTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseOrbState = mapAssistantStateToOrbState(state);
  const activeOrbState = temporaryState || baseOrbState;

  // Determine preset size: 20 (dock / inline) or 64 (hero / chat)
  const presetSize: 20 | 64 = size <= 28 ? 20 : 64;
  const scale = size / presetSize;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      if (tempTimerRef.current) clearTimeout(tempTimerRef.current);
      // Playful state shift on tap: cycle to 'shaping' or 'solving'
      setTemporaryState(activeOrbState === 'shaping' ? 'solving' : 'shaping');
      tempTimerRef.current = setTimeout(() => {
        setTemporaryState(null);
      }, 1200);
    }
    onClick?.();
  };

  useEffect(() => {
    return () => {
      if (tempTimerRef.current) clearTimeout(tempTimerRef.current);
    };
  }, []);

  return (
    <motion.div
      className={`livex-assistant-mascot ${className}`}
      onClick={handleClick}
      whileTap={interactive ? { scale: 0.92 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: interactive || onClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
        ...style,
      }}
      role="img"
      aria-label="Livex AI Assistant"
    >

      {/* Sized ThinkingOrb Container */}
      <div
        style={{
          width: presetSize,
          height: presetSize,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <ThinkingOrb
          size={presetSize}
          state={activeOrbState}
          theme={isLight ? 'light' : 'dark'}
          speed={prefersReduced ? 0.5 : 1}
        />
      </div>
    </motion.div>
  );
};

export default LivexAssistantMascot;
