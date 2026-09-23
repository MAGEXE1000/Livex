import React, { useRef, useEffect, useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip,
  Sparkles,
  ChevronDown,
  Mic,
  Headphones,
  ArrowUp,
  Square,
  X,
  AlertCircle,
  Check,
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
    description: 'Specialized in theory, chords, tone & grooves (Hybrid Edge/Cloud)',
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
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const hasText = value.trim().length > 0;
  const activeModel = models.find((m) => m.id === selectedModelId) || models[0];

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

  // Close model menu on outside click
  useEffect(() => {
    if (!isModelMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isModelMenuOpen]);

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

  // Determine border color based on state and light/dark appearance
  const getBorderColor = () => {
    if (errorMessage) return 'rgba(239, 68, 68, 0.45)';
    if (isStreaming) return 'rgba(168, 85, 247, 0.4)';
    if (isFocused) return 'rgba(56, 189, 248, 0.45)';
    return isLight ? 'rgba(0, 0, 0, 0.09)' : 'rgba(255, 255, 255, 0.12)';
  };

  // Determine shadow based on state and light/dark appearance
  const getBoxShadow = () => {
    if (errorMessage) {
      return '0 8px 30px -4px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
    }
    if (isStreaming) {
      return '0 8px 32px -4px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }
    if (isFocused) {
      return isLight
        ? '0 8px 32px -4px rgba(56, 189, 248, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
        : '0 8px 32px -4px rgba(56, 189, 248, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }
    return isLight
      ? '0 10px 30px -4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
      : '0 10px 30px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
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
      `}</style>

      {/* Model Selection Dropdown Popover */}
      <AnimatePresence>
        {isModelMenuOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 12,
              width: 290,
              maxWidth: 'calc(100vw - 32px)',
              background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.92)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 18,
              boxShadow: isLight
                ? '0 16px 40px -8px rgba(0, 0, 0, 0.15)'
                : '0 16px 40px -8px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              padding: 6,
              zIndex: 50,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isLight ? '#64748b' : '#94a3b8',
                padding: '6px 10px 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Select Assistant Engine
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {models.map((m) => {
                const isSelected = m.id === (activeModel?.id ?? '');
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel?.(m.id);
                      setIsModelMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 12,
                      background: isSelected
                        ? isLight
                          ? 'rgba(2, 132, 199, 0.08)'
                          : 'rgba(56, 189, 248, 0.12)'
                        : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 120ms ease',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        color: isSelected ? (isLight ? '#0284c7' : '#38bdf8') : isLight ? '#64748b' : '#94a3b8',
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    >
                      {m.icon || <Sparkles size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: isSelected
                              ? isLight ? '#0f172a' : '#f8fafc'
                              : isLight ? '#334155' : '#cbd5e1',
                          }}
                        >
                          {m.name}
                        </span>
                        {m.badge && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: isSelected
                                ? isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.25)'
                                : isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected
                                ? isLight ? '#0284c7' : '#38bdf8'
                                : isLight ? '#64748b' : '#94a3b8',
                            }}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: isLight ? '#64748b' : '#64748b',
                            lineHeight: 1.35,
                            marginTop: 2,
                          }}
                        >
                          {m.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        size={14}
                        style={{
                          color: isLight ? '#0284c7' : '#38bdf8',
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)',
              border: isLight ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: 600,
              color: isLight ? '#0284c7' : '#38bdf8',
              boxShadow: isLight
                ? '0 8px 24px rgba(0, 0, 0, 0.12)'
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
          borderRadius: 26,
          background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.82)',
          border: `1px solid ${getBorderColor()}`,
          boxShadow: getBoxShadow(),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          padding: '10px 12px 10px 16px',
          boxSizing: 'border-box',
          transition: shouldReduceMotion
            ? 'none'
            : 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
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
                ? '1px solid rgba(0, 0, 0, 0.06)'
                : '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: 11,
                  color: isLight ? '#0f172a' : '#e2e8f0',
                }}
              >
                <Paperclip size={12} style={{ color: isLight ? '#0284c7' : '#38bdf8' }} />
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
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Auto-expanding Multiline Textarea */}
        <textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="agent-chat-pill-textarea"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: isLight ? '#0f172a' : '#f8fafc',
            fontSize: 14,
            lineHeight: '20px',
            resize: 'none',
            padding: '2px 0 6px',
            boxSizing: 'border-box',
            fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
          }}
        />

        {/* Integrated Bottom Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 4,
            borderTop: isLight
              ? '1px solid rgba(0, 0, 0, 0.05)'
              : '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Left Actions Group: Attachments & Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Attachment Button */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handleAttachClick}
              title={attachmentsEnabled ? 'Attach audio or preset' : 'Attachments coming soon'}
              aria-label="Add attachment"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: attachments.length > 0 ? (isLight ? '#0284c7' : '#38bdf8') : isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Paperclip size={14} />
            </motion.button>

            {/* Model / Engine Selector Badge */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => setIsModelMenuOpen((prev) => !prev)}
              aria-label="Change model"
              aria-expanded={isModelMenuOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 28,
                padding: '0 9px',
                borderRadius: 14,
                background: isModelMenuOpen
                  ? isLight
                    ? 'rgba(2, 132, 199, 0.12)'
                    : 'rgba(56, 189, 248, 0.16)'
                  : isLight
                    ? 'rgba(0, 0, 0, 0.04)'
                    : 'rgba(255, 255, 255, 0.06)',
                border: isModelMenuOpen
                  ? isLight
                    ? '1px solid rgba(2, 132, 199, 0.3)'
                    : '1px solid rgba(56, 189, 248, 0.35)'
                  : isLight
                    ? '1px solid rgba(0, 0, 0, 0.06)'
                    : '1px solid rgba(255, 255, 255, 0.09)',
                color: isModelMenuOpen
                  ? isLight ? '#0284c7' : '#38bdf8'
                  : isLight ? '#334155' : '#cbd5e1',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Sparkles size={12} style={{ color: isLight ? '#0284c7' : '#38bdf8' }} />
              <span
                style={{
                  maxWidth: 130,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeModel.name}
              </span>
              <ChevronDown
                size={12}
                style={{
                  color: isLight ? '#64748b' : '#94a3b8',
                  transform: isModelMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 180ms ease',
                }}
              />
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
                  : isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isListening ? '#f87171' : isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Mic size={14} />
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
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Headphones size={14} />
            </motion.button>

            {/* Primary Submit ⟷ Stop Morphing Button */}
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
                  ? 'rgba(239, 68, 68, 0.25)'
                  : hasText
                    ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.06)'
                      : 'rgba(255, 255, 255, 0.08)',
                border: isStreaming
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : hasText
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : isLight
                      ? '1px solid rgba(0, 0, 0, 0.06)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                color: isStreaming
                  ? '#f87171'
                  : hasText
                    ? '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.3)'
                      : 'rgba(255, 255, 255, 0.3)',
                boxShadow: hasText && !isStreaming
                  ? '0 4px 12px rgba(2, 132, 199, 0.35)'
                  : isStreaming
                    ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                    : 'none',
                cursor: hasText || isStreaming ? 'pointer' : 'default',
                transition: shouldReduceMotion
                  ? 'none'
                  : 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
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
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.22 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Square size={12} fill="currentColor" strokeWidth={0} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send-icon"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.22 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowUp size={16} strokeWidth={2.4} />
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
