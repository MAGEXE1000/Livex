import React, { useRef, useEffect } from 'react';
import { useAssistantStore, NavigationDispatcher } from '@workspace/livex-core';
import { LivexAssistantMascot } from '../components/LivexAssistantMascot';
import { LivexThinkingOrb } from '../components/LivexThinkingOrb';
import { AssistantMessageItem } from '../components/AssistantMessageItem';
import { AssistantInputBar } from '../components/AssistantInputBar';
import { StudioIcon } from '../../../shared/icons/StudioIcon';

export const AssistantChatView: React.FC = () => {
  const messages = useAssistantStore((s) => s.messages);
  const mascotState = useAssistantStore((s) => s.mascotState);
  const status = useAssistantStore((s) => s.status);
  const clearConversation = useAssistantStore((s) => s.clearConversation);

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
      {/* Liquid Glass Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Header Living Mascot / Thinking Indicator */}
          <div style={{ position: 'relative' }}>
            <LivexAssistantMascot
              size={36}
              mode="chat"
              state={mascotState}
              interactive={true}
            />
            {status === 'streaming' && (
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  pointerEvents: 'none',
                }}
              >
                <LivexThinkingOrb size={44} state={mascotState} />
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                Livex Music AI
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: status === 'streaming'
                    ? 'rgba(168, 85, 247, 0.2)'
                    : 'rgba(56, 189, 248, 0.15)',
                  color: status === 'streaming' ? '#c084fc' : '#38bdf8',
                  border: status === 'streaming'
                    ? '1px solid rgba(168, 85, 247, 0.35)'
                    : '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                {status === 'streaming' ? 'Thinking' : 'Ready'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Theory, Tones, Chords & Grooves
            </div>
          </div>
        </div>

        {/* Header Action: Clear Conversation */}
        {hasMessages && (
          <button
            onClick={clearConversation}
            title="Clear chat history"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '6px 10px',
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <StudioIcon name="delete" size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Welcome Empty State Hero */}
        {!hasMessages && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <LivexAssistantMascot
                size={84}
                mode="chat"
                state={mascotState}
                interactive={true}
              />
            </div>

            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#f8fafc',
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              How can I help your sound today?
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: '#94a3b8',
                maxWidth: 420,
                lineHeight: 1.5,
                margin: '0 0 20px',
              }}
            >
              Ask music theory questions, dial in legendary guitar tones, discover chord voicings, or build rhythm section grooves.
            </p>
          </div>
        )}

        {/* Message bubbles list */}
        {messages.map((msg) => (
          <AssistantMessageItem key={msg.id} message={msg} />
        ))}
      </div>

      {/* Floating Input Area (Positioned above bottom navbar) */}
      <div
        style={{
          padding: '10px 16px',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, 14px) + 72px)',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 75%, transparent 100%)',
          zIndex: 10,
        }}
      >
        <AssistantInputBar showQuickPrompts={!hasMessages} />
      </div>
    </div>
  );
};

export default AssistantChatView;
