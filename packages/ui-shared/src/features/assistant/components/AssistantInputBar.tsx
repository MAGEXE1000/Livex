import React, { useState } from 'react';
import {
  useAssistantStore,
  ASSISTANT_QUICK_PROMPTS,
  type AssistantQuickPrompt,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { AgentChatPill, type AgentChatPillModelOption } from './AgentChatPill';

export interface AssistantInputBarProps {
  onQuickPromptSelected?: (prompt: AssistantQuickPrompt) => void;
  showQuickPrompts?: boolean;
}

const ASSISTANT_MODELS: AgentChatPillModelOption[] = [
  {
    id: 'livex-music-ai',
    name: 'Livex Music AI v1',
    description: 'Theory, Chords, Tone & Grooves (Hybrid Edge / Offline)',
    badge: 'Default',
  },
  {
    id: 'livex-theory-engine',
    name: 'Theory Engine v1.2',
    description: 'Deterministic modal harmony & fretboard geometry',
    badge: 'Offline',
  },
];

export const AssistantInputBar: React.FC<AssistantInputBarProps> = ({
  onQuickPromptSelected,
  showQuickPrompts = true,
}) => {
  const inputText = useAssistantStore((s) => s.inputText);
  const status = useAssistantStore((s) => s.status);
  const mascotState = useAssistantStore((s) => s.mascotState);
  const errorMessage = useAssistantStore((s) => s.errorMessage);
  const setInputText = useAssistantStore((s) => s.setInputText);
  const sendMessage = useAssistantStore((s) => s.sendMessage);
  const stopStreaming = useAssistantStore((s) => s.stopStreaming);
  const wakeMascot = useAssistantStore((s) => s.wakeMascot);

  const [selectedModelId, setSelectedModelId] = useState('livex-music-ai');

  const isStreaming = status === 'streaming';
  const isStopping = mascotState === 'interrupted';

  const handleSubmit = (text: string) => {
    sendMessage(text);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Quick Prompt Carousel Pills */}
      {showQuickPrompts && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          {ASSISTANT_QUICK_PROMPTS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (onQuickPromptSelected) {
                  onQuickPromptSelected(item);
                } else {
                  sendMessage(item.prompt);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: 'rgba(30, 41, 59, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'all 120ms ease',
              }}
            >
              <StudioIcon name={item.icon} size={14} style={{ color: '#38bdf8' }} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* beUI Pro Inspired Agent Chat Pill */}
      <AgentChatPill
        value={inputText}
        onChange={setInputText}
        onSubmit={handleSubmit}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        isStopping={isStopping}
        errorMessage={errorMessage}
        models={ASSISTANT_MODELS}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        onFocus={wakeMascot}
        placeholder="Ask music theory, guitar tones, chord progressions, grooves..."
      />
    </div>
  );
};

export default AssistantInputBar;
