import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  type TakeRecord,
  type TrackEffect,
  createDefaultEffects,
  vocalexRepository,
  useT,
  BackDispatcher,
} from '@workspace/livex-core';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';
import {
  getEffectMeta,
  formatParamValue,
  EFFECT_RANGES,
} from '../services/effectsEngine';

interface TakeEffectsSheetProps {
  take: TakeRecord;
  effects: TrackEffect[];
  isOpen: boolean;
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  isSpanish?: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onUpdateEffects: (effects: TrackEffect[]) => void;
  onOpenHarmonizer: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TakeEffectsSheet({
  take,
  effects: initialEffects,
  isOpen,
  isPlaying,
  currentTimeSec,
  durationSec,
  isSpanish = false,
  onClose,
  onTogglePlay,
  onUpdateEffects,
  onOpenHarmonizer,
}: TakeEffectsSheetProps) {
  const t = useT();

  // Initialize or merge with default effects to guarantee all 6 types are present
  const [effects, setEffects] = useState<TrackEffect[]>(() => {
    const defaults = createDefaultEffects();
    if (!initialEffects || initialEffects.length === 0) return defaults;
    return defaults.map((def) => {
      const existing = initialEffects.find((e) => e.type === def.type);
      return existing || def;
    });
  });

  useEffect(() => {
    if (initialEffects && initialEffects.length > 0) {
      const defaults = createDefaultEffects();
      setEffects(
        defaults.map((def) => {
          const existing = initialEffects.find((e) => e.type === def.type);
          return existing || def;
        })
      );
    }
  }, [initialEffects]);

  // BackDispatcher registration for native Android back button
  useEffect(() => {
    if (!isOpen) return;
    const id = 'vocalex:effects-sheet';
    activeOverlaysRegistry.register('sheet', id);
    const unregisterBack = BackDispatcher.register('sheet', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('sheet', id);
      unregisterBack();
    };
  }, [isOpen, onClose]);

  const activeCount = useMemo(() => {
    return effects.filter((e) => e.enabled).length;
  }, [effects]);

  const handleToggleEffect = (type: string) => {
    const updated = effects.map((e) => {
      if (e.type === type) {
        return { ...e, enabled: !e.enabled };
      }
      return e;
    });
    setEffects(updated);
    onUpdateEffects(updated);
  };

  const handleParamChange = (type: string, key: string, value: number) => {
    const updated = effects.map((e) => {
      if (e.type === type) {
        return {
          ...e,
          params: {
            ...e.params,
            [key]: value,
          },
        };
      }
      return e;
    });
    setEffects(updated);
    onUpdateEffects(updated);
  };

  const handleBypassAll = () => {
    const allDisabled = activeCount === 0;
    const updated = effects.map((e) => ({
      ...e,
      enabled: allDisabled,
    }));
    setEffects(updated);
    onUpdateEffects(updated);
  };

  const handleResetDefaults = () => {
    const defaults = createDefaultEffects();
    setEffects(defaults);
    onUpdateEffects(defaults);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--c-bg-page, #09090b)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--c-bg-card, #121215)',
          borderBottom: '1px solid var(--c-border, rgba(255,255,255,0.08))',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label={isSpanish ? 'Cerrar' : 'Close'}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--c-text-primary, #ffffff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              arrow_back
            </span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  fontFamily: 'var(--studio-font-display, inherit)',
                  color: 'var(--c-text-primary, #ffffff)',
                  letterSpacing: '-0.02em',
                }}
              >
                {isSpanish ? 'Efectos de Pista' : 'Track Effects'}
              </h1>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  background:
                    activeCount > 0
                      ? 'rgba(var(--studio-accent-rgb, 0, 122, 255), 0.16)'
                      : 'rgba(255, 255, 255, 0.08)',
                  color:
                    activeCount > 0
                      ? 'var(--studio-accent, #007aff)'
                      : 'var(--c-text-secondary, #94a3b8)',
                  border:
                    activeCount > 0
                      ? '1px solid rgba(var(--studio-accent-rgb, 0, 122, 255), 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {activeCount > 0
                  ? isSpanish
                    ? `${activeCount} activos`
                    : `${activeCount} active`
                  : isSpanish
                    ? 'Bypass'
                    : 'Bypassed'}
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 11.5,
                color: 'var(--c-text-secondary, #94a3b8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
            >
              {take.name}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleBypassAll}
            style={{
              background: 'transparent',
              border: '1px solid var(--c-border, rgba(255,255,255,0.12))',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--c-text-secondary, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            {activeCount > 0
              ? isSpanish
                ? 'Bypass'
                : 'Bypass'
              : isSpanish
                ? 'Activar'
                : 'Enable'}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            title={isSpanish ? 'Restablecer valores predeterminados' : 'Reset to defaults'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--c-text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              restart_alt
            </span>
          </button>
        </div>
      </header>

      {/* Mini Audition Player Bar */}
      <div
        style={{
          background: 'rgba(var(--studio-accent-rgb, 0, 122, 255), 0.08)',
          borderBottom: '1px solid rgba(var(--studio-accent-rgb, 0, 122, 255), 0.18)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--studio-accent, #007aff)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0, 122, 255, 0.35)',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--c-text-primary, #ffffff)',
                fontFamily: 'var(--studio-font-display, inherit)',
              }}
            >
              {isPlaying
                ? isSpanish
                  ? 'Audicionando en tiempo real...'
                  : 'Auditioning live...'
                : isSpanish
                  ? 'Audicionar efectos'
                  : 'Audition effects'}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--c-text-secondary, #94a3b8)',
                fontFamily: 'var(--studio-font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDuration(currentTimeSec)} / {formatDuration(durationSec)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 16,
              color: 'var(--studio-accent, #007aff)',
              animation: isPlaying ? 'pulse 1.5s infinite' : 'none',
            }}
          >
            graphic_eq
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--studio-accent, #007aff)',
            }}
          >
            DSP Active
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px calc(env(safe-area-inset-bottom, 16px) + 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        className="no-scrollbar"
      >
        {/* Harmonizer Dedicated Feature Card */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(var(--studio-accent-rgb, 0,122,255), 0.12) 0%, rgba(147, 51, 234, 0.12) 100%)',
            border: '1px solid rgba(var(--studio-accent-rgb, 0,122,255), 0.28)',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--studio-accent, #007aff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
              >
                auto_fix_high
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 800,
                  fontFamily: 'var(--studio-font-display, inherit)',
                  color: 'var(--c-text-primary, #ffffff)',
                  marginBottom: 2,
                }}
              >
                {isSpanish ? 'Armonizador Vocal' : 'Vocal Harmonizer'}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--c-text-secondary, #94a3b8)',
                  lineHeight: 1.4,
                }}
              >
                {isSpanish
                  ? 'Genera segundas voces, octavas y coros inteligentes afinados a la escala de la toma.'
                  : 'Generate intelligent harmony layers, octaves, and chorus backings tuned to your take.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHarmonizer}
            data-testid="effects-open-harmonizer-btn"
            style={{
              background: 'var(--studio-accent, #007aff)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--studio-font-display, inherit)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.35)',
            }}
          >
            <span>{isSpanish ? 'Abrir' : 'Open'}</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              arrow_forward
            </span>
          </button>
        </div>

        {/* Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: 'var(--studio-accent, #007aff)' }}
          >
            tune
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            {isSpanish ? 'Procesadores de Audio (DSP)' : 'Audio DSP Processors'}
          </h2>
        </div>

        {/* DSP Effects List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {effects.map((effect) => {
            const meta = getEffectMeta(effect.type, isSpanish);
            const isEnabled = effect.enabled;
            const paramKeys = Object.keys(effect.params);

            return (
              <div
                key={effect.type}
                style={{
                  background: isEnabled
                    ? 'var(--c-bg-card, #121215)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isEnabled
                    ? '1px solid rgba(var(--studio-accent-rgb, 0, 122, 255), 0.3)'
                    : '1px solid var(--c-border, rgba(255, 255, 255, 0.06))',
                  borderRadius: 14,
                  padding: 14,
                  transition: 'all 200ms ease',
                  boxShadow: isEnabled
                    ? '0 4px 16px rgba(0, 0, 0, 0.25)'
                    : 'none',
                }}
              >
                {/* Effect Card Top Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isEnabled
                          ? 'rgba(var(--studio-accent-rgb, 0, 122, 255), 0.18)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: isEnabled
                          ? 'var(--studio-accent, #007aff)'
                          : 'var(--c-text-secondary, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {meta.icon}
                      </span>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: 'var(--studio-font-display, inherit)',
                          color: isEnabled
                            ? 'var(--c-text-primary, #ffffff)'
                            : 'var(--c-text-secondary, #94a3b8)',
                        }}
                      >
                        {meta.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--c-text-secondary, #64748b)',
                          marginTop: 1,
                        }}
                      >
                        {meta.desc}
                      </div>
                    </div>
                  </div>

                  {/* Enable / Disable Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleEffect(effect.type)}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`${meta.label} ${isEnabled ? 'on' : 'off'}`}
                    style={{
                      width: 44,
                      height: 26,
                      borderRadius: 13,
                      background: isEnabled
                        ? 'var(--studio-accent, #007aff)'
                        : 'rgba(255, 255, 255, 0.15)',
                      border: 'none',
                      padding: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'background 200ms ease',
                      flexShrink: 0,
                    }}
                  >
                    <motion.div
                      animate={{ x: isEnabled ? 18 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>

                {/* Sliders Area (Collapsible when enabled) */}
                <AnimatePresence>
                  {isEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {paramKeys.map((paramKey) => {
                        const val = effect.params[paramKey] ?? 0;
                        const [min, max, step] = EFFECT_RANGES[paramKey] || [0, 1, 0.01];
                        const formatted = formatParamValue(paramKey, val);

                        // Human readable param labels
                        const paramLabels: Record<string, { en: string; es: string }> = {
                          mix: { en: 'Mix (Wet/Dry)', es: 'Mezcla (Wet/Dry)' },
                          decay: { en: 'Decay Time', es: 'Tiempo de Decaimiento' },
                          time: { en: 'Delay Time', es: 'Tiempo de Retardo' },
                          feedback: { en: 'Feedback', es: 'Realimentación' },
                          rate: { en: 'Rate / Speed', es: 'Velocidad LFO' },
                          depth: { en: 'Modulation Depth', es: 'Profundidad' },
                          amount: { en: 'Drive / Saturation', es: 'Saturación' },
                          frequency: { en: 'Cutoff Frequency', es: 'Frecuencia de Corte' },
                          q: { en: 'Resonance (Q)', es: 'Resonancia (Q)' },
                        };
                        const pLabel =
                          paramLabels[paramKey]?.[isSpanish ? 'es' : 'en'] || paramKey;

                        return (
                          <div key={paramKey} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 11.5,
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--c-text-secondary, #94a3b8)',
                                  fontWeight: 600,
                                }}
                              >
                                {pLabel}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--studio-font-mono, monospace)',
                                  fontWeight: 700,
                                  color: 'var(--studio-accent, #007aff)',
                                  fontSize: 11.5,
                                }}
                              >
                                {formatted}
                              </span>
                            </div>

                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={val}
                              onChange={(e) =>
                                handleParamChange(
                                  effect.type,
                                  paramKey,
                                  parseFloat(e.target.value)
                                )
                              }
                              style={{
                                width: '100%',
                                accentColor: 'var(--studio-accent, #007aff)',
                                cursor: 'pointer',
                                height: 5,
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
