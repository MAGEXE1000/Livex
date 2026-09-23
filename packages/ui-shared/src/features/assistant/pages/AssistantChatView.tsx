import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAssistantStore, useSettingsStore } from '@workspace/livex-core';
import { LivexAssistantMascot } from '../components/LivexAssistantMascot';
import { AssistantMessageItem } from '../components/AssistantMessageItem';
import { AssistantInputBar } from '../components/AssistantInputBar';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { Music, Sliders, Disc, Mic2, Sparkles, RotateCcw } from 'lucide-react';

interface StudioQuickCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

const STUDIO_CAPABILITY_CARDS: StudioQuickCard[] = [
  {
    id: 'chords',
    icon: <Music size={16} />,
    title: 'Analyze Chord Progression',
    description: 'Modal interchange, secondary dominants & substitutions',
    prompt: 'Suggest a sophisticated Neo-soul chord progression in Eb major with secondary dominants.',
  },
  {
    id: 'tones',
    icon: <Sliders size={16} />,
    title: 'Guitar Tone Recipe',
    description: 'Pedal chain order, amp EQ & reverb decay',
    prompt: "Give me the exact pedal chain and amp settings for David Gilmour's Comfortably Numb lead tone.",
  },
  {
    id: 'drums',
    icon: <Disc size={16} />,
    title: 'Build Drum Groove',
    description: '16-step pocket beat with swing and syncopation',
    prompt: 'Create a funk drum groove with a half-time shuffle at 96 BPM with 16th note ghost notes.',
  },
  {
    id: 'vocals',
    icon: <Mic2 size={16} />,
    title: 'Vocal Warmup Routine',
    description: '5-minute pre-show agility and resonance workout',
    prompt: 'Guide me through a 5-minute pre-show vocal warmup routine for breath support and range.',
  },
];

export const AssistantChatView: React.FC = () => {
  const messages = useAssistantStore((s) => s.messages);
  const mascotState = useAssistantStore((s) => s.mascotState);
  const status = useAssistantStore((s) => s.status);
  const clearConversation = useAssistantStore((s) => s.clearConversation);
  const sendMessage = useAssistantStore((s) => s.sendMessage);

  const theme = useSettingsStore((s) => s.settings?.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on message updates or streaming tokens
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: status === 'streaming' ? 'auto' : 'smooth',
    });
  }, [messages, status]);

  const hasMessages = messages.length > 0;
  const isStreaming = status === 'streaming';

  return (
    <div
      data-assistant-chat-view="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
      }}
    >
      {/* Floating Reset Action (Headerless open canvas design) */}
      <AnimatePresence>
        {hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.15 }}
            onClick={clearConversation}
            title="Clear conversation"
            aria-label="Clear chat history"
            style={{
              position: 'absolute',
              top: 'calc(var(--safe-area-inset-top, 12px) + 12px)',
              right: 18,
              zIndex: 30,
              background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.85)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 20,
              padding: '6px 12px',
              color: isLight ? '#64748b' : '#94a3b8',
              fontSize: 12,
              fontWeight: 550,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isLight
                ? '0 4px 12px rgba(0, 0, 0, 0.06)'
                : '0 4px 16px rgba(0, 0, 0, 0.4)',
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 20px',
          paddingTop: 'calc(var(--safe-area-inset-top, 12px) + 20px)',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Welcome Empty State Hero & Capability Cards */}
        {!hasMessages && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              padding: '24px 8px 16px',
              textAlign: 'center',
            }}
          >
            {/* Animated Minimal Orb Hero (ThinkingOrb engine) */}
            <div style={{ marginBottom: 20 }}>
              <LivexAssistantMascot
                size={64}
                mode="chat"
                state={mascotState}
                interactive={true}
              />
            </div>

            <h2
              style={{
                fontSize: 21,
                fontWeight: 650,
                color: isLight ? '#0f172a' : '#f8fafc',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              How can I assist your sound?
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: isLight ? '#64748b' : '#94a3b8',
                maxWidth: 420,
                lineHeight: 1.5,
                margin: '0 0 28px',
              }}
            >
              Ask music theory questions, dial in signal chain tones, explore harmonic voicings, or build rhythm section grooves.
            </p>

            {/* Actionable Capability Cards Grid (better-layout: Group with Space) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 10,
                width: '100%',
                maxWidth: 580,
                textAlign: 'left',
              }}
            >
              {STUDIO_CAPABILITY_CARDS.map((card) => (
                <button
                  key={card.id}
                  onClick={() => sendMessage(card.prompt)}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                    border: isLight
                      ? '1px solid rgba(0, 0, 0, 0.08)'
                      : '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
                    transition: 'border-color 140ms ease, background 140ms ease, transform 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isLight
                      ? 'rgba(0, 0, 0, 0.18)'
                      : 'rgba(255, 255, 255, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isLight
                      ? 'rgba(0, 0, 0, 0.08)'
                      : 'rgba(255, 255, 255, 0.07)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: isLight ? '#0284c7' : '#38bdf8',
                    }}
                  >
                    {card.icon}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isLight ? '#0f172a' : '#f1f5f9',
                      }}
                    >
                      {card.title}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: isLight ? '#64748b' : '#94a3b8',
                      lineHeight: 1.45,
                    }}
                  >
                    {card.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles list */}
        {messages.map((msg) => (
          <AssistantMessageItem key={msg.id} message={msg} />
        ))}
      </div>

      {/* Floating Input Dock (Positioned above bottom navbar) */}
      <div
        style={{
          padding: '10px 18px',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, 14px) + 76px)',
          background: isLight
            ? 'linear-gradient(to top, rgba(248, 250, 252, 0.98) 0%, rgba(248, 250, 252, 0.6) 75%, transparent 100%)'
            : 'linear-gradient(to top, rgba(10, 15, 29, 0.98) 0%, rgba(10, 15, 29, 0.6) 75%, transparent 100%)',
          zIndex: 10,
        }}
      >
        <AssistantInputBar showQuickPrompts={false} />
      </div>
    </div>
  );
};

export default AssistantChatView;
