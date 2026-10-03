import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MetronomeSoundId } from '@workspace/livex-core';

export type LiveCountdownMode = 'off' | '1bar' | '2bars' | '3s' | '5s';

export interface LiveTempoMorphPopupProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  accent: { from: string; to: string; mid?: string };
  countdownMode: LiveCountdownMode;
  onCountdownModeChange: (mode: LiveCountdownMode) => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (vol: number) => void;
  metronomeSound: MetronomeSoundId;
  onMetronomeSoundChange: (sound: MetronomeSoundId) => void;
  onClose: () => void;
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

export function LiveTempoMorphPopup({
  bpm,
  onBpmChange,
  accent,
  countdownMode,
  onCountdownModeChange,
  metronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
  metronomeSound,
  onMetronomeSoundChange,
  onClose,
}: LiveTempoMorphPopupProps) {
  const [bpmInputVal, setBpmInputVal] = useState(() => String(bpm));
  const tapTimesRef = useRef<number[]>([]);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTapActive, setIsTapActive] = useState(false);

  useEffect(() => {
    setBpmInputVal(String(bpm));
  }, [bpm]);

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

  const COUNTDOWN_OPTIONS: { id: LiveCountdownMode; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: '1bar', label: '1 Bar' },
    { id: '2bars', label: '2 Bars' },
    { id: '3s', label: '3s' },
    { id: '5s', label: '5s' },
  ];

  const SOUND_OPTIONS: { id: MetronomeSoundId; label: string }[] = [
    { id: 'woodblock', label: 'Woodblock' },
    { id: 'click', label: 'Stick Click' },
    { id: 'studioclick', label: 'Studio Click' },
    { id: 'digital', label: 'Digital' },
  ];

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
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
            transform: scale(0.88) translateY(-10px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div
        data-testid="live-tempo-morph-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          borderRadius: '28px',
          background: 'var(--surface-dialog-bg, rgba(22, 22, 28, 0.94))',
          border: '1px solid var(--c-border, rgba(255, 255, 255, 0.14))',
          boxShadow: 'var(--shadow-elevation-high, 0 20px 60px rgba(0,0,0,0.65))',
          padding: '20px 20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box',
          animation: 'popup-morph-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: accent.from }}
            >
              speed
            </span>
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
              Tempo & Metronome
            </span>
          </div>

          <button
            type="button"
            data-testid="live-tempo-popup-close-btn"
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
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
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Digital BPM Readout & Steppers */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 14px',
            borderRadius: '20px',
            background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
            border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
            gap: '10px',
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
                fontSize: '44px',
                fontWeight: 900,
                fontFamily: 'var(--studio-font-display, "Inter Tight", monospace)',
                color: 'var(--c-text-primary, #ffffff)',
                background: 'transparent',
                border: 'none',
                textAlign: 'center',
                width: '105px',
                outline: 'none',
                padding: 0,
                lineHeight: 1,
              }}
            />
            <span
              style={{
                fontSize: '13px',
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
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--c-text-secondary, #94a3b8)',
              marginTop: '-4px',
            }}
          >
            {getTempoName(bpm)}
          </span>

          {/* Steppers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%' }}>
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleStep(delta)}
                style={{
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--c-text-primary, #ffffff)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.12s, transform 0.1s',
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onPointerCancel={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min={40}
            max={280}
            step={1}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: accent.from,
              height: '20px',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          />

          {/* Tap Tempo Button */}
          <button
            type="button"
            data-testid="live-tap-tempo-btn"
            onClick={handleTapTempo}
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '12px',
              border: `1.5px solid ${isTapActive ? accent.from : 'rgba(255,255,255,0.12)'}`,
              background: isTapActive
                ? `${accent.from}33`
                : 'rgba(255,255,255,0.05)',
              color: isTapActive ? '#ffffff' : 'var(--c-text-primary, #ffffff)',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: accent.from }}>
              touch_app
            </span>
            <span>Tap Tempo</span>
          </button>
        </div>

        {/* Pre-Roll Countdown Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            Pre-Roll Countdown
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '4px',
              padding: '3px',
              background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
              borderRadius: '14px',
              border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
            }}
          >
            {COUNTDOWN_OPTIONS.map((opt) => {
              const isSel = countdownMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onCountdownModeChange(opt.id)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSel ? accent.from : 'transparent',
                    color: isSel ? '#ffffff' : 'var(--c-text-secondary, #94a3b8)',
                    fontWeight: isSel ? 800 : 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Metronome Settings Row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '16px',
            background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
            border: '1px solid var(--c-border, rgba(255,255,255,0.06))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: accent.from }}>
                metronome
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-text-primary, #ffffff)' }}>
                Audible Metronome
              </span>
            </div>

            <button
              type="button"
              data-testid="live-metronome-toggle-btn"
              onClick={() => onMetronomeToggle(!metronomeEnabled)}
              style={{
                width: '42px',
                height: '24px',
                borderRadius: '12px',
                background: metronomeEnabled ? accent.from : 'rgba(255,255,255,0.15)',
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
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transform: metronomeEnabled ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </button>
          </div>

          {metronomeEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              {/* Volume */}
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
                    accentColor: accent.from,
                    height: '16px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', width: '32px', textAlign: 'right' }}>
                  {Math.round(metronomeVolume * 100)}%
                </span>
              </div>

              {/* Sound Select */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {SOUND_OPTIONS.map((s) => {
                  const isSoundSel = metronomeSound === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onMetronomeSoundChange(s.id)}
                      style={{
                        padding: '6px 2px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSoundSel ? `${accent.from}33` : 'rgba(255,255,255,0.05)',
                        borderBottom: isSoundSel ? `2px solid ${accent.from}` : 'none',
                        color: isSoundSel ? '#ffffff' : 'var(--c-text-secondary)',
                        fontSize: '10px',
                        fontWeight: isSoundSel ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
