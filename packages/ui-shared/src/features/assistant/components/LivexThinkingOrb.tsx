import React from 'react';
import { type AssistantState } from '@workspace/livex-core';
import { LivexAssistantMascot } from './LivexAssistantMascot';

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
 * Re-exports the unified LivexAssistantMascot thinking-orbs implementation.
 */
export const LivexThinkingOrb: React.FC<LivexThinkingOrbProps> = ({
  size = 48,
  state = 'thinking',
  className = '',
  style = {},
}) => {
  return (
    <LivexAssistantMascot
      size={size}
      state={state}
      className={className}
      style={style}
      interactive={false}
      mode="chat"
    />
  );
};

export default LivexThinkingOrb;
