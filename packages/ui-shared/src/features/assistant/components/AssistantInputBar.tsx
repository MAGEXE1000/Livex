import React, { useRef, useEffect } from 'react';
import {
  useAssistantStore,
  ASSISTANT_QUICK_PROMPTS,
  type AssistantQuickPrompt,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { SnakeLoader } from '../../../shared/loading/SnakeLoader';

export interface AssistantInputBarProps {
  onQuickPromptSelected?: (prompt: AssistantQuickPrompt) => void;
  showQuickPrompts?: boolean;
}

export const AssistantInputBar: React.FC<AssistantInputBarProps> = ({
  onQuickPromptSelected,
  showQuickPrompts = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const inputText = useAssistantStore((s) => s.inputText);
  const status = useAssistantStore((s) => s.status);
  const setInputText = useAssistantStore((s) => s.setInputText);
  const sendMessage = useAssistantStore((s) => s.sendMessage);
  const stopStreaming = useAssistantStore((s) => s.stopStreaming);
  const wakeMascot = useAssistantStore((s) => s.wakeMascot);

  const isStreaming = status === 'streaming';
  const hasText = inputText.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, Math.max(38, el.scrollHeight))}px`;
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasText && !isStreaming) {
        sendMessage();
      }
    }
  };

  const handleAction = () => {
    if (isStreaming) {
      stopStreaming();
    } else if (hasText) {
      sendMessage();
    }
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

      {/* Input Capsule */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          borderRadius: 24,
          padding: '6px 8px 6px 16px',
          background: 'var(--surface-topbar-bg, rgba(15, 23, 42, 0.85))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={wakeMascot}
          onKeyDown={handleKeyDown}
          placeholder="Ask music theory, tones, progressions, grooves..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f8fafc',
            fontSize: 14,
            lineHeight: '20px',
            resize: 'none',
            padding: '6px 0',
            fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
          }}
        />

        {/* Send / Stop Streaming Action Button */}
        <button
          onClick={handleAction}
          disabled={!hasText && !isStreaming}
          aria-label={isStreaming ? 'Stop generation' : 'Send message'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isStreaming
              ? 'rgba(239, 68, 68, 0.25)'
              : hasText
                ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                : 'rgba(255, 255, 255, 0.08)',
            border: isStreaming
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : 'none',
            color: isStreaming ? '#f87171' : hasText ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
            cursor: hasText || isStreaming ? 'pointer' : 'default',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
        >
          {isStreaming ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: '#f87171',
                }}
              />
            </div>
          ) : (
            <StudioIcon name="arrow_upward" size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default AssistantInputBar;
