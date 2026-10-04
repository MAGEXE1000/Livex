import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  type MetronomeSoundId,
  type MetronomeTimeSignature,
  type MetronomeSubdivision,
  type MetronomeAccentType,
  getBeatsPerMeasure,
  SOUND_LABELS,
  useSettingsStore,
} from '@workspace/livex-core';

export type LiveCountdownMode = 'off' | '1bar' | '2bars' | '3s' | '5s';

export interface LiveTempoMorphPopupProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  accent: { from: string; to: string; mid?: string; id?: string; contrast?: string };
  timeSignature?: MetronomeTimeSignature;
  onTimeSignatureChange?: (sig: MetronomeTimeSignature) => void;
  subdivision?: MetronomeSubdivision;
  onSubdivisionChange?: (sub: MetronomeSubdivision) => void;
  accentPattern?: MetronomeAccentType[];
  onCycleBeatAccent?: (beatIndex: number) => void;
  activeBeat?: number;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (vol: number) => void;
  metronomeSound: MetronomeSoundId;
  onMetronomeSoundChange: (sound: MetronomeSoundId) => void;
  onClose: () => void;
  countdownMode?: LiveCountdownMode;
  onCountdownModeChange?: (mode: LiveCountdownMode) => void;
}

function getTempoName(bpm: number): string {
  if (bpm < 60) return 'Largo / Slow';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 176) return 'Vivace';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}

const SOUND_OPTIONS: { id: MetronomeSoundId; label: string }[] = [
  { id: 'woodblock', label: 'Woodblock' },
  { id: 'click', label: 'Stick Click' },
  { id: 'studioclick', label: 'Studio Click' },
  { id: 'digital', label: 'Digital Click' },
  { id: 'sidestick', label: 'Side Stick' },
  { id: 'drystick', label: 'Dry Stick' },
  { id: 'rimclick', label: 'Rim Click' },
];

export function LiveTempoMorphPopup({
  bpm,
  onBpmChange,
  accent,
  timeSignature = '4/4',
  onTimeSignatureChange,
  subdivision = '1/4',
  onSubdivisionChange,
  accentPattern,
  onCycleBeatAccent,
  activeBeat = -1,
  metronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
  metronomeSound,
  onMetronomeSoundChange,
  onClose,
}: LiveTempoMorphPopupProps) {
  const isLightMode = useSettingsStore((s) => s.settings.theme === 'light');
  const isCustomAccent = Boolean((accent as any)?.id && (accent as any).id !== 'monochrome');
  const activePillBg = isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff');
  const activePillColor = isCustomAccent ? ((accent as any)?.contrast || '#ffffff') : (isLightMode ? '#ffffff' : '#000000');

  const [bpmInputVal, setBpmInputVal] = useState(() => String(bpm));
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const soundPickerRef = useRef<HTMLDivElement | null>(null);

  const tapTimesRef = useRef<number[]>([]);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTapActive, setIsTapActive] = useState(false);

  useEffect(() => {
    setBpmInputVal(String(bpm));
  }, [bpm]);

  // Click outside sound picker to close
  useEffect(() => {
    if (!isSoundPickerOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (soundPickerRef.current && !soundPickerRef.current.contains(e.target as Node)) {
        setIsSoundPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('touchstart', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('touchstart', handleOutside, true);
    };
  }, [isSoundPickerOpen]);

  const handleStep = (delta: number) => {
    const next = Math.max(40, Math.min(280, bpm + delta));
    onBpmChange(next);
  };

  const handleCommitInput = (val: string) => {
    const parsed = parseInt(val.trim(), 10);
    if (!isNaN(parsed) && parsed >= 40 && parsed <= 280) {
      onBpmChange(parsed);
    } else {
      setBpmInputVal(String(bpm));
    }
  };

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    setIsTapActive(true);
    setTimeout(() => setIsTapActive(false), 120);

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapTimesRef.current = [];
    }, 2500);

    const history = [...tapTimesRef.current, now].slice(-5);
    tapTimesRef.current = history;

    if (history.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < history.length; i++) {
        intervals.push(history[i] - history[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgMs > 0) {
        const computedBpm = Math.round(60000 / avgMs);
        const clamped = Math.max(40, Math.min(280, computedBpm));
        onBpmChange(clamped);
      }
    }
  }, [onBpmChange]);

  const beatsCount = getBeatsPerMeasure(timeSignature);
  const resolvedAccentPattern: MetronomeAccentType[] =
    accentPattern && accentPattern.length === beatsCount
      ? accentPattern
      : Array(beatsCount)
          .fill('normal')
          .map((_, i) => (i === 0 ? 'strong' : 'normal'));

  return (
    <div
      data-testid="live-tempo-morph-popup-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px',
        animation: 'popup-backdrop-fade 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes popup-backdrop-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popup-morph-in {
          0% {
            transform: scale(0.9) translateY(12px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes beat-pulse-glow {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 ${accent.from}66; }
          50% { transform: scale(1.04); box-shadow: 0 0 12px 2px ${accent.from}; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 ${accent.from}00; }
        }
      `}</style>

      <div
        data-testid="live-tempo-morph-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
          borderRadius: '26px',
          background: 'var(--surface-dialog-bg, rgba(18, 18, 24, 0.96))',
          border: '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
          boxShadow: 'var(--shadow-elevation-high, 0 24px 64px rgba(0,0,0,0.7))',
          padding: '16px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box',
          animation: 'popup-morph-in 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--c-text-primary, #ffffff)',
                fontFamily: 'var(--studio-font-body, "Inter", sans-serif)',
              }}
            >
              TEMPO & METRONOME
            </span>
          </div>

          <button
            type="button"
            data-testid="live-tempo-popup-close-btn"
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--c-text-secondary, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>close</span>
          </button>
        </div>

        {/* 1. Digital BPM Readout & Fine Steppers */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 12px',
            borderRadius: '18px',
            background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
            border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <input
              type="number"
              value={bpmInputVal}
              onChange={(e) => setBpmInputVal(e.target.value)}
              onBlur={(e) => handleCommitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommitInput((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              style={{
                fontSize: '42px',
                fontWeight: 900,
                fontFamily: 'var(--studio-font-display, "Inter Tight", monospace)',
                color: 'var(--c-text-primary, #ffffff)',
                background: 'transparent',
                border: 'none',
                textAlign: 'center',
                width: '100px',
                outline: 'none',
                padding: 0,
                lineHeight: 1,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: accent.from,
                letterSpacing: '0.04em',
              }}
            >
              BPM
            </span>
          </div>

          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: 'var(--c-text-secondary, #94a3b8)',
              marginTop: '-4px',
            }}
          >
            {getTempoName(bpm)}
          </span>

          {/* Steppers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', width: '100%' }}>
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleStep(delta)}
                style={{
                  height: '30px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--c-text-primary, #ffffff)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.12s, transform 0.1s',
                }}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>

          {/* Range Slider & Tap Tempo in row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginTop: '2px' }}>
            <input
              type="range"
              min={40}
              max={280}
              step={1}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: accent.from,
                height: '16px',
                cursor: 'pointer',
              }}
            />

            <button
              type="button"
              data-testid="live-tap-tempo-btn"
              onClick={handleTapTempo}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '10px',
                border: `1.5px solid ${isTapActive ? (isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff')) : 'rgba(255,255,255,0.14)'}`,
                background: isTapActive ? (isCustomAccent ? `${accent.from}44` : (isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)')) : 'rgba(255,255,255,0.06)',
                color: isTapActive ? (isCustomAccent ? '#ffffff' : (isLightMode ? '#000000' : '#ffffff')) : 'var(--c-text-primary, #ffffff)',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.1s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: isCustomAccent ? accent.from : 'currentColor' }}>
                touch_app
              </span>
              <span>Tap</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Beat Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--c-text-secondary, #94a3b8)',
              }}
            >
              Beat Tracker
            </span>
            <span style={{ fontSize: '9px', color: 'var(--c-text-tertiary, #64748b)' }}>
              Tap pill to cycle accent
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${beatsCount}, 1fr)`,
              gap: '4px',
              width: '100%',
            }}
          >
            {Array.from({ length: beatsCount }).map((_, idx) => {
              const accentType = resolvedAccentPattern[idx] || 'normal';
              const isStrong = accentType === 'strong';
              const isNormal = accentType === 'normal';
              const isMuted = accentType === 'muted';
              const isCurrent = activeBeat === idx;

              let bg = 'rgba(255,255,255,0.06)';
              let borderColor = 'rgba(255,255,255,0.08)';
              let textColor = 'var(--c-text-secondary, #94a3b8)';
              let label = 'NORMAL';

              if (isStrong) {
                bg = isCurrent
                  ? (isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff'))
                  : (isCustomAccent ? `${accent.from}22` : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)'));
                borderColor = isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff');
                textColor = isCurrent
                  ? (isCustomAccent ? '#ffffff' : (isLightMode ? '#ffffff' : '#000000'))
                  : (isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff'));
                label = 'STRONG';
              } else if (isNormal) {
                bg = isCurrent
                  ? (isCustomAccent ? `${accent.from}88` : (isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'))
                  : 'rgba(255,255,255,0.06)';
                borderColor = isCurrent
                  ? (isCustomAccent ? accent.from : (isLightMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'))
                  : 'rgba(255,255,255,0.1)';
                textColor = isCurrent
                  ? (isCustomAccent ? '#ffffff' : (isLightMode ? '#000000' : '#ffffff'))
                  : 'var(--c-text-primary, #ffffff)';
                label = 'NORMAL';
              } else if (isMuted) {
                bg = isCurrent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.02)';
                borderColor = isCurrent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.04)';
                textColor = 'rgba(255,255,255,0.25)';
                label = 'MUTE';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`live-beat-pill-${idx}`}
                  onClick={() => onCycleBeatAccent?.(idx)}
                  style={{
                    height: '42px',
                    borderRadius: '11px',
                    background: bg,
                    border: `1.5px solid ${borderColor}`,
                    color: textColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.12s ease',
                    boxShadow: isCurrent ? (isCustomAccent ? `0 0 10px ${accent.from}66` : (isLightMode ? '0 0 10px rgba(0,0,0,0.2)' : '0 0 10px rgba(255,255,255,0.25)')) : 'none',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 900, lineHeight: 1 }}>
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '7.5px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      marginTop: '2px',
                      opacity: isMuted ? 0.6 : 0.9,
                    }}
                  >
                    {label}
                  </span>
                  {isStrong && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '4px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff'),
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Time Signature & Subdivision (Side by side) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Time Signature */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px 10px',
              borderRadius: '14px',
              background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
              border: '1px solid var(--c-border, rgba(255,255,255,0.06))',
            }}
          >
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--c-text-secondary, #94a3b8)',
              }}
            >
              Meter
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
              {(['4/4', '3/4', '6/8', '2/4'] as MetronomeTimeSignature[]).map((sig) => {
                const isSel = timeSignature === sig;
                return (
                  <button
                    key={sig}
                    type="button"
                    data-testid={`time-sig-btn-${sig.replace('/', '-')}`}
                    onClick={() => onTimeSignatureChange?.(sig)}
                    style={{
                      padding: '5px 0',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSel ? activePillBg : 'rgba(255,255,255,0.05)',
                      color: isSel ? activePillColor : 'var(--c-text-secondary, #94a3b8)',
                      fontSize: '10px',
                      fontWeight: isSel ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {sig}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subdivision */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px 10px',
              borderRadius: '14px',
              background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
              border: '1px solid var(--c-border, rgba(255,255,255,0.06))',
            }}
          >
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--c-text-secondary, #94a3b8)',
              }}
            >
              Subdivision
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
              {(['1/4', '1/8', '1/16', '3let'] as MetronomeSubdivision[]).map((sub) => {
                const isSel = subdivision === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    data-testid={`subdivision-btn-${sub.replace('/', '-')}`}
                    onClick={() => onSubdivisionChange?.(sub)}
                    style={{
                      padding: '5px 0',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSel ? activePillBg : 'rgba(255,255,255,0.05)',
                      color: isSel ? activePillColor : 'var(--c-text-secondary, #94a3b8)',
                      fontSize: '10px',
                      fontWeight: isSel ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Audible Metronome Row & Upward Drop-Up Click Sound Selector */}
        <div
          ref={soundPickerRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '16px',
            background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
            border: '1px solid var(--c-border, rgba(255,255,255,0.06))',
            position: 'relative',
          }}
        >
          {/* Top Switch Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--c-text-primary, #ffffff)' }}>
                Audible Metronome
              </span>
            </div>

            <button
              type="button"
              data-testid="live-metronome-toggle-btn"
              onClick={() => onMetronomeToggle(!metronomeEnabled)}
              style={{
                width: '38px',
                height: '22px',
                borderRadius: '11px',
                background: metronomeEnabled
                  ? (isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff'))
                  : 'rgba(255,255,255,0.15)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                padding: '2px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: metronomeEnabled
                    ? (isCustomAccent ? '#ffffff' : (isLightMode ? '#ffffff' : '#000000'))
                    : '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transform: metronomeEnabled ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </button>
          </div>

          {metronomeEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '2px' }}>
              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--c-text-secondary)' }}>
                  volume_up
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={metronomeVolume}
                  onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff'),
                    height: '14px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '10.5px', color: 'var(--c-text-secondary)', width: '30px', textAlign: 'right' }}>
                  {Math.round(metronomeVolume * 100)}%
                </span>
              </div>

              {/* Click Sound Selector with Upward Drop-Up */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  data-testid="live-click-sound-selector-btn"
                  onClick={() => setIsSoundPickerOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    height: '32px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--c-text-primary, #ffffff)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: isCustomAccent ? accent.from : 'currentColor' }}>
                      graphic_eq
                    </span>
                    <span style={{ color: 'var(--c-text-secondary)', fontSize: '10px', fontWeight: 600 }}>SOUND:</span>
                    <span>{SOUND_LABELS[metronomeSound] || metronomeSound}</span>
                  </div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '16px',
                      color: 'var(--c-text-secondary)',
                      transform: isSoundPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    expand_less
                  </span>
                </button>

                {/* UPWARD Drop-Up Menu */}
                {isSoundPickerOpen && (
                  <div
                    data-testid="live-click-sound-dropup"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--surface-dialog-bg, #16161f)',
                      border: '1px solid var(--c-border, rgba(255,255,255,0.16))',
                      borderRadius: '14px',
                      boxShadow: '0 -12px 36px rgba(0,0,0,0.6)',
                      padding: '4px',
                      zIndex: 120,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transformOrigin: 'bottom center',
                      animation: 'popup-morph-in 0.18s ease-out',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px 8px 2px',
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--c-text-secondary, #94a3b8)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: '2px',
                      }}
                    >
                      Select Click Sound
                    </div>
                    {SOUND_OPTIONS.map((s) => {
                      const isSel = metronomeSound === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onMetronomeSoundChange(s.id);
                            setIsSoundPickerOpen(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isSel ? (isCustomAccent ? `${accent.from}33` : (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)')) : 'transparent',
                            color: isSel ? (isCustomAccent ? '#ffffff' : (isLightMode ? '#000000' : '#ffffff')) : 'var(--c-text-secondary, #cbd5e1)',
                            fontSize: '11px',
                            fontWeight: isSel ? 800 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <span>{s.label}</span>
                          {isSel && (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: isCustomAccent ? accent.from : (isLightMode ? '#000000' : '#ffffff') }}
                            >
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
