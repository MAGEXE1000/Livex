import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAssistantStore, useSettingsStore, useBackHandler, NavigationDispatcher } from '@workspace/livex-core';
import { LivexAssistantMascot } from '../components/LivexAssistantMascot';
import { AssistantMessageItem } from '../components/AssistantMessageItem';
import { AssistantInputBar } from '../components/AssistantInputBar';
import { Music, Sliders, Disc, Mic2, RotateCcw, ArrowLeft } from 'lucide-react';

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
  const language = useSettingsStore((s) => s.settings?.language);
  const isSpanish = language === 'es';

  // Canonical Livex theme awareness (WHITE, BLACK, AMOLED)
  const theme = useSettingsStore((s) => s.settings?.theme);
  const amoledMode = useSettingsStore((s) => s.settings?.amoledMode);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(amoledMode);
  const isDark = !isLight && !isAmoled;

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

  const handleBack = () => {
    if (NavigationDispatcher.canGoBack()) {
      NavigationDispatcher.pop();
    } else {
      NavigationDispatcher.push({ app: 'hub', tab: 'home' });
    }
    return true;
  };

  // Android hardware and gesture back button integration
  useBackHandler('panel', handleBack);

  return (
    <motion.div
      data-assistant-chat-view="true"
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
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
        background: isAmoled ? '#000000' : isLight ? 'var(--app-bg, #f4f4f5)' : 'var(--app-bg, #141414)',
        color: isLight ? '#0f172a' : '#f8fafc',
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
        transformOrigin: 'calc(50% + 120px) calc(100% - 40px)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Floating Back Action (Headerless open canvas design) */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleBack}
        title={isSpanish ? 'Volver a Livex' : 'Back to Livex'}
        aria-label={isSpanish ? 'Volver a Livex' : 'Back to Livex'}
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-area-inset-top, 12px) + 12px)',
          left: 18,
          zIndex: 30,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: isLight ? '#ffffff' : isAmoled ? '#000000' : 'rgba(255, 255, 255, 0.08)',
          border: isLight
            ? '1px solid rgba(0, 0, 0, 0.1)'
            : isAmoled
              ? '1px solid rgba(255, 255, 255, 0.18)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: isLight ? '#0f172a' : '#f8fafc',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 16px rgba(0, 0, 0, 0.4)',
          transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
        }}
      >
        <ArrowLeft size={16} />
      </motion.button>

      {/* Floating Reset Action */}
      <AnimatePresence>
        {hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.15 }}
            onClick={clearConversation}
            title={isSpanish ? 'Reiniciar conversación' : 'Clear conversation'}
            aria-label={isSpanish ? 'Reiniciar historial de chat' : 'Clear chat history'}
            style={{
              position: 'absolute',
              top: 'calc(var(--safe-area-inset-top, 12px) + 12px)',
              right: 18,
              zIndex: 30,
              background: isLight ? '#ffffff' : isAmoled ? '#000000' : 'rgba(255, 255, 255, 0.08)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.1)'
                : isAmoled
                  ? '1px solid rgba(255, 255, 255, 0.18)'
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
              boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 16px rgba(0, 0, 0, 0.4)',
              transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
            }}
          >
            <RotateCcw size={12} />
            <span>{isSpanish ? 'Reiniciar' : 'Reset'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Top Gradient Header Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'calc(var(--safe-area-inset-top, 12px) + 58px)',
          background: isLight
            ? 'linear-gradient(to bottom, var(--app-bg, #f4f4f5) 65%, rgba(244, 244, 245, 0.85) 85%, transparent 100%)'
            : isAmoled
              ? 'linear-gradient(to bottom, #000000 65%, rgba(0, 0, 0, 0.85) 85%, transparent 100%)'
              : 'linear-gradient(to bottom, var(--app-bg, #141414) 65%, rgba(20, 20, 20, 0.85) 85%, transparent 100%)',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 20px',
          paddingTop: 'calc(var(--safe-area-inset-top, 12px) + 54px)',
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
              {isSpanish ? '¿En qué puedo ayudarte hoy?' : 'How can I assist your sound?'}
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
              {isSpanish
                ? 'Haz consultas de teoría musical, tonos de guitarra, progresiones de acordes o crea ritmos.'
                : 'Ask music theory questions, dial in signal chain tones, explore harmonic voicings, or build rhythm section grooves.'}
            </p>

            {/* Actionable Capability Cards Grid */}
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
              {STUDIO_CAPABILITY_CARDS.map((card) => {
                const cardTitle =
                  isSpanish && card.id === 'chords'
                    ? 'Analizar progresión de acordes'
                    : isSpanish && card.id === 'tones'
                      ? 'Receta de sonido de guitarra'
                      : isSpanish && card.id === 'drums'
                        ? 'Crear ritmo de batería'
                        : isSpanish && card.id === 'vocals'
                          ? 'Rutina vocal de calentamiento'
                          : card.title;
                const cardDesc =
                  isSpanish && card.id === 'chords'
                    ? 'Intercambio modal, dominantes secundarias y sustituciones'
                    : isSpanish && card.id === 'tones'
                      ? 'Orden de pedales, EQ de amplificador y reverb'
                      : isSpanish && card.id === 'drums'
                        ? 'Patrón rítmico de 16 pasos con swing y síncopa'
                        : isSpanish && card.id === 'vocals'
                          ? '5 minutos de agilidad y calentamiento previo al show'
                          : card.description;
                const cardPrompt =
                  isSpanish && card.id === 'chords'
                    ? 'Sugiere una progresión de acordes sofisticada de Neo-soul en Eb mayor con dominantes secundarias.'
                    : isSpanish && card.id === 'tones'
                      ? 'Dame la cadena de pedales y ajustes de amplificador para el sonido solista de Comfortably Numb de David Gilmour.'
                      : isSpanish && card.id === 'drums'
                        ? 'Crea un ritmo de batería funk con shuffle a 96 BPM y notas fantasma en semicorcheas.'
                        : isSpanish && card.id === 'vocals'
                          ? 'Guíame en una rutina de 5 minutos de calentamiento vocal para rango y soporte de respiración.'
                          : card.prompt;
                return (
                  <button
                    key={card.id}
                    onClick={() => sendMessage(cardPrompt)}
                    style={{
                      background: isLight
                        ? '#ffffff'
                        : isAmoled
                          ? '#000000'
                          : 'rgba(255, 255, 255, 0.03)',
                      border: isLight
                        ? '1px solid rgba(0, 0, 0, 0.08)'
                        : isAmoled
                          ? '1px solid rgba(255, 255, 255, 0.14)'
                          : '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      cursor: 'pointer',
                      boxShadow: isLight
                        ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                        : isAmoled
                          ? '0 2px 10px rgba(0, 0, 0, 0.5)'
                          : '0 2px 10px rgba(0, 0, 0, 0.2)',
                      transition: 'border-color 140ms ease, background 140ms ease, transform 140ms ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isLight
                        ? 'rgba(0, 0, 0, 0.2)'
                        : isAmoled
                          ? 'rgba(255, 255, 255, 0.28)'
                          : 'rgba(255, 255, 255, 0.18)';
                      e.currentTarget.style.background = isLight
                        ? 'rgba(0, 0, 0, 0.02)'
                        : isAmoled
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isLight
                        ? 'rgba(0, 0, 0, 0.08)'
                        : isAmoled
                          ? '1px solid rgba(255, 255, 255, 0.14)'
                          : 'rgba(255, 255, 255, 0.07)';
                      e.currentTarget.style.background = isLight
                        ? '#ffffff'
                        : isAmoled
                          ? '#000000'
                          : 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.transform = 'translateY(0)';
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
                        {cardTitle}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: isLight ? '#64748b' : '#94a3b8',
                        lineHeight: 1.45,
                      }}
                    >
                      {cardDesc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message bubbles list */}
        {messages.map((msg) => (
          <AssistantMessageItem key={msg.id} message={msg} isLight={isLight} isAmoled={isAmoled} />
        ))}
      </div>

      {/* Floating Input Dock */}
      <div
        style={{
          padding: '10px 18px',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, 14px) + 14px)',
          background: isLight
            ? 'linear-gradient(to top, var(--app-bg, #f4f4f5) 0%, rgba(244, 244, 245, 0.8) 70%, transparent 100%)'
            : isAmoled
              ? 'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0.8) 70%, transparent 100%)'
              : 'linear-gradient(to top, var(--app-bg, #141414) 0%, rgba(20, 20, 20, 0.8) 70%, transparent 100%)',
          zIndex: 10,
        }}
      >
        <AssistantInputBar showQuickPrompts={false} />
      </div>
    </motion.div>
  );
};

export default AssistantChatView;
