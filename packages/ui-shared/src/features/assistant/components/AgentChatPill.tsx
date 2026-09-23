import React, { useRef, useEffect, useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip,
  Mic,
  Headphones,
  ArrowUp,
  Square,
  X,
  AlertCircle,
} from 'lucide-react';
import { useSettingsStore } from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export interface AgentChatPillAttachment {
  id: string;
  name: string;
  size?: number;
  type?: string;
}

export interface AgentChatPillModelOption {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface AgentChatPillProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onStop?: () => void;
  placeholder?: string;
  isStreaming?: boolean;
  isStopping?: boolean;
  isDisabled?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;

  // Model selector affordance
  models?: AgentChatPillModelOption[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;

  // Attachment affordance
  attachments?: AgentChatPillAttachment[];
  onAddAttachment?: () => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  attachmentsEnabled?: boolean;

  // Audio / Dictation affordance
  dictationEnabled?: boolean;
  isListening?: boolean;
  onToggleDictation?: () => void;

  // Conversational Voice affordance
  voiceChatEnabled?: boolean;
  onStartVoiceChat?: () => void;

  // Callbacks
  onFocus?: () => void;
  onBlur?: () => void;

  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_MODELS: AgentChatPillModelOption[] = [
  {
    id: 'livex-music-ai',
    name: 'Livex Music AI v1',
    description: 'Specialized in theory, chords, tone & grooves (Hybrid Edge/Offline)',
    badge: 'Default',
  },
  {
    id: 'livex-theory-engine',
    name: 'Theory Engine v1.2',
    description: 'Direct mathematical harmony & fretboard geometry',
    badge: 'Offline',
  },
];

export const AgentChatPill: React.FC<AgentChatPillProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = 'Ask music theory, guitar tones, chord progressions, grooves...',
  isStreaming = false,
  isStopping = false,
  isDisabled = false,
  errorMessage = null,
  onClearError,

  models = DEFAULT_MODELS,
  selectedModelId = 'livex-music-ai',
  onSelectModel,

  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  attachmentsEnabled = false,

  dictationEnabled = false,
  isListening = false,
  onToggleDictation,

  voiceChatEnabled = false,
  onStartVoiceChat,

  onFocus,
  onBlur,

  className = '',
  style = {},
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useAppReducedMotion();
  const inputId = useId();

  const theme = useSettingsStore((s) => s.settings?.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  const [isFocused, setIsFocused] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const hasText = value.trim().length > 0;

  // Auto-resize textarea smoothly up to 128px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(128, Math.max(36, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
  }, [value]);

  // Dismiss feedback badge after 3 seconds
  useEffect(() => {
    if (!statusFeedback) return;
    const timer = setTimeout(() => {
      setStatusFeedback(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [statusFeedback]);



  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        onStop?.();
      } else if (hasText && !isDisabled) {
        onSubmit(value);
      }
    }
  };

  const handlePrimaryClick = () => {
    if (isStreaming) {
      onStop?.();
    } else if (hasText && !isDisabled) {
      onSubmit(value);
    }
  };

  const handleAttachClick = () => {
    if (attachmentsEnabled && onAddAttachment) {
      onAddAttachment();
    } else {
      setStatusFeedback('Audio & preset attachments coming in v1.1');
    }
  };

  const handleDictationClick = () => {
    if (dictationEnabled && onToggleDictation) {
      onToggleDictation();
    } else {
      setStatusFeedback('Voice dictation requires microphone permission');
    }
  };

  const handleVoiceChatClick = () => {
    if (voiceChatEnabled && onStartVoiceChat) {
      onStartVoiceChat();
    } else {
      setStatusFeedback('Conversational voice mode active in Livex Pro');
    }
  };

  // Restrained, professional neutral borders
  const getBorderColor = () => {
    if (errorMessage) return 'rgba(239, 68, 68, 0.45)';
    if (isFocused) {
      return isLight ? 'rgba(15, 23, 42, 0.28)' : 'rgba(255, 255, 255, 0.28)';
    }
    return isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  };

  // Subtle elevation without AI neon glows
  const getBoxShadow = () => {
    if (errorMessage) {
      return '0 6px 24px -4px rgba(239, 68, 68, 0.15)';
    }
    if (isFocused) {
      return isLight
        ? '0 6px 24px -4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
        : '0 8px 30px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
    }
    return isLight
      ? '0 4px 20px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
      : '0 6px 24px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
  };

  return (
    <div
      ref={containerRef}
      className={`agent-chat-pill-root ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <style>{`
        .agent-chat-pill-textarea::placeholder {
          color: ${isLight ? 'rgba(100, 116, 139, 0.7)' : 'rgba(148, 163, 184, 0.6)'};
        }
        .agent-chat-pill-textarea:focus {
          outline: none;
        }
      `}</style>


      {/* Floating Status / Gated Feedback Toast */}
      <AnimatePresence>
        {statusFeedback && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.95)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: 600,
              color: isLight ? '#0f172a' : '#f8fafc',
              boxShadow: isLight
                ? '0 6px 20px rgba(0, 0, 0, 0.1)'
                : '0 8px 24px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              whiteSpace: 'nowrap',
              zIndex: 40,
              pointerEvents: 'none',
            }}
          >
            {statusFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Continuous Pill Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 24,
          background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.88)',
          border: `1px solid ${getBorderColor()}`,
          boxShadow: getBoxShadow(),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          padding: '10px 12px 10px 16px',
          boxSizing: 'border-box',
          transition: shouldReduceMotion
            ? 'none'
            : 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
          opacity: isDisabled ? 0.6 : 1,
          pointerEvents: isDisabled ? 'none' : 'auto',
        }}
      >
        {/* Error Contextual Strip */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px 8px',
              marginBottom: 4,
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#64748b' : '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Attachment Chips Strip */}
        {attachments.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              paddingBottom: 8,
              marginBottom: 4,
              borderBottom: isLight
                ? '1px solid rgba(0, 0, 0, 0.05)'
                : '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 11,
                  color: isLight ? '#334155' : '#e2e8f0',
                }}
              >
                <Paperclip size={11} style={{ opacity: 0.7 }} />
                <span
                  style={{
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.name}
                </span>
                {onRemoveAttachment && (
                  <button
                    onClick={() => onRemoveAttachment(att.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isLight ? '#64748b' : '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Entry Area */}
        <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
          <textarea
            ref={textareaRef}
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            placeholder={placeholder}
            disabled={isDisabled || isStreaming}
            rows={1}
            className="agent-chat-pill-textarea"
            style={{
              width: '100%',
              minHeight: 36,
              maxHeight: 128,
              border: 'none',
              background: 'transparent',
              color: isLight ? '#0f172a' : '#f8fafc',
              fontSize: 14,
              lineHeight: '22px',
              fontFamily: 'inherit',
              resize: 'none',
              overflowY: 'auto',
              padding: '6px 4px 6px 0',
              boxSizing: 'border-box',
              scrollbarWidth: 'thin',
            }}
          />
        </div>

        {/* Bottom Integrated Controls Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 6,
            marginTop: 2,
            borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.04)' : '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Left Actions Group: Attach & Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Attachment Button */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handleAttachClick}
              title={attachmentsEnabled ? 'Add audio or preset' : 'Attachments coming soon'}
              aria-label="Add attachment"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Paperclip size={13} />
            </motion.button>


          </div>

          {/* Right Actions Group: Dictation, Voice Chat & Primary Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Dictation (Speech-to-Text) Button */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handleDictationClick}
              title={dictationEnabled ? 'Voice dictation' : 'Speech input requires permission'}
              aria-label="Voice input"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isListening
                  ? 'rgba(239, 68, 68, 0.2)'
                  : isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isListening ? '#f87171' : isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Mic size={13} />
            </motion.button>

            {/* Conversational Voice Chat Button */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handleVoiceChatClick}
              title="Conversational Voice Mode"
              aria-label="Conversational voice chat"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Headphones size={13} />
            </motion.button>

            {/* Primary Submit ⟷ Stop Morphing Button (Kimi / Grok style high-contrast circle) */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handlePrimaryClick}
              disabled={(!hasText && !isStreaming) || isDisabled || isStopping}
              aria-label={isStreaming ? 'Stop response' : 'Send message'}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isStreaming
                  ? isLight ? '#0f172a' : '#ffffff'
                  : hasText
                    ? isLight ? '#0f172a' : '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: isStreaming
                  ? isLight ? '#ffffff' : '#0a0f1d'
                  : hasText
                    ? isLight ? '#ffffff' : '#0a0f1d'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.25)',
                boxShadow: hasText || isStreaming
                  ? isLight
                    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                    : '0 2px 8px rgba(255, 255, 255, 0.15)'
                  : 'none',
                cursor: hasText || isStreaming ? 'pointer' : 'default',
                transition: shouldReduceMotion
                  ? 'none'
                  : 'background 160ms ease, color 160ms ease, box-shadow 160ms ease',
                flexShrink: 0,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isStreaming ? (
                  <motion.div
                    key="stop-icon"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Square size={10} fill="currentColor" strokeWidth={0} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send-icon"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowUp size={15} strokeWidth={2.4} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPill;
