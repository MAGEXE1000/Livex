import React, { useRef, useEffect, useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip,
  Mic,
  Camera,
  Image as ImageIcon,
  FileText,
  ArrowUp,
  Square,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  useSettingsStore,
  useAssistantStore,
  type AssistantAttachment,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

export type AgentChatPillAttachment = AssistantAttachment;

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
  attachments?: AssistantAttachment[];
  onAddAttachment?: (attachment: AssistantAttachment) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  attachmentsEnabled?: boolean;

  // Audio / Dictation affordance
  dictationEnabled?: boolean;
  isListening?: boolean;
  onToggleDictation?: () => void;

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
  attachmentsEnabled = true,

  dictationEnabled = true,
  isListening,
  onToggleDictation,

  onFocus,
  onBlur,

  className = '',
  style = {},
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const attachBtnRef = useRef<HTMLButtonElement | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const photosInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

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
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isInternalListening, setIsInternalListening] = useState(false);

  const speechRecognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>('');

  const activeListening = isListening !== undefined ? isListening : isInternalListening;
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

  // Click-outside listener for attachment popover
  useEffect(() => {
    if (!isAttachmentMenuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        attachBtnRef.current &&
        !attachBtnRef.current.contains(target)
      ) {
        setIsAttachmentMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAttachmentMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAttachmentMenuOpen]);

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

  const handleToggleAttachmentMenu = () => {
    if (!attachmentsEnabled) {
      setStatusFeedback('Attachments not supported here');
      return;
    }
    setIsAttachmentMenuOpen((prev) => !prev);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAttachment: AssistantAttachment = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    if (file.size <= 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newAttachment.dataUrl = ev.target?.result as string;
        onAddAttachment?.(newAttachment);
      };
      reader.readAsDataURL(file);
    } else {
      onAddAttachment?.(newAttachment);
    }

    // Reset input value so re-selecting identical filename works
    e.target.value = '';
    setIsAttachmentMenuOpen(false);
  };

  const handleMicClick = () => {
    if (onToggleDictation) {
      onToggleDictation();
      return;
    }

    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      setStatusFeedback('Voice input not supported in this browser');
      return;
    }

    if (activeListening) {
      try {
        speechRecognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      setIsInternalListening(false);
      useAssistantStore.getState().setMascotState('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      speechRecognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      const lang = useSettingsStore.getState().settings?.language;
      recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';

      currentTranscriptRef.current = '';

      recognition.onstart = () => {
        setIsInternalListening(true);
        useAssistantStore.getState().setMascotState('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscriptRef.current += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const combined = (currentTranscriptRef.current + ' ' + interim).trim();
        if (combined) {
          onChange(combined);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[AgentChatPill] Speech recognition error:', event.error);
        setIsInternalListening(false);
        useAssistantStore.getState().setMascotState('idle');
        if (event.error !== 'no-speech') {
          setStatusFeedback(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsInternalListening(false);
        const finalTranscribed = currentTranscriptRef.current.trim();
        if (finalTranscribed) {
          onSubmit(finalTranscribed);
        } else {
          useAssistantStore.getState().setMascotState('idle');
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('[AgentChatPill] Could not start speech recognition:', err);
      setIsInternalListening(false);
      useAssistantStore.getState().setMascotState('idle');
      setStatusFeedback('Microphone permission denied');
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

      {/* Hidden File Inputs for Camera, Photos, and Files */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <input
        ref={photosInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <input
        ref={filesInputRef}
        type="file"
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

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
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            {statusFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Popover Menu */}
      <AnimatePresence>
        {isAttachmentMenuOpen && (
          <motion.div
            ref={popoverRef}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 12,
              background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.96)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: '6px',
              boxShadow: isLight
                ? '0 12px 28px rgba(0, 0, 0, 0.12)'
                : '0 16px 36px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minWidth: 140,
            }}
          >
            {/* Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'transparent',
                border: 'none',
                color: isLight ? '#1e293b' : '#f1f5f9',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Camera size={15} style={{ opacity: 0.8 }} />
              <span>Camera</span>
            </button>

            {/* Photos */}
            <button
              type="button"
              onClick={() => photosInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'transparent',
                border: 'none',
                color: isLight ? '#1e293b' : '#f1f5f9',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ImageIcon size={15} style={{ opacity: 0.8 }} />
              <span>Photos</span>
            </button>

            {/* Files */}
            <button
              type="button"
              onClick={() => filesInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'transparent',
                border: 'none',
                color: isLight ? '#1e293b' : '#f1f5f9',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <FileText size={15} style={{ opacity: 0.8 }} />
              <span>Files</span>
            </button>
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
                type="button"
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
                {att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt=""
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Paperclip size={11} style={{ opacity: 0.7 }} />
                )}
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
                    type="button"
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
          {/* Left Actions Group: Attach Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.button
              ref={attachBtnRef}
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={handleToggleAttachmentMenu}
              title={attachmentsEnabled ? 'Add attachment (Camera, Photos, Files)' : 'Attachments coming soon'}
              aria-label="Add attachment"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isAttachmentMenuOpen
                  ? isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)'
                  : isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isAttachmentMenuOpen
                  ? isLight ? '#0f172a' : '#ffffff'
                  : isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Paperclip size={14} />
            </motion.button>
          </div>

          {/* Right Actions Group: Unified Mic & Primary Submit/Stop Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Unified Speech-to-Text Button */}
            {dictationEnabled && (
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                onClick={handleMicClick}
                title={activeListening ? 'Stop listening' : 'Voice input'}
                aria-label={activeListening ? 'Stop voice input' : 'Start voice input'}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: activeListening
                    ? 'rgba(239, 68, 68, 0.22)'
                    : isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                  border: activeListening
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: activeListening ? '#f87171' : isLight ? '#64748b' : '#94a3b8',
                  cursor: 'pointer',
                  boxShadow: activeListening ? '0 0 12px rgba(239, 68, 68, 0.35)' : 'none',
                  transition: 'all 140ms ease',
                }}
              >
                <Mic size={14} />
              </motion.button>
            )}

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
