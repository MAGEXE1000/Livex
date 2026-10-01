import React, { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DetailFretboardDiagram } from '../diagrams/DetailFretboardDiagram';
import { Button } from '../../../shared/design-system/buttons';
import ElasticSlider from '../../../shared/progress/ElasticSlider';
import {
  type LiveModeState,
  type LiveDisplayMode,
  type VisualStyle,
  type TeleprompterFontFamily,
  type TeleprompterLineHeight,
  type TeleprompterAlignment,
  type TeleprompterWord,
} from './useLiveModeState';
import {
  useSettingsStore,
  useChordStore,
  getChordById,
  getChordByName,
  transposeChordId,
  type LyricTextSpan,
  type GuitarChordData,
  formatDurationMmSs,
  parseDurationMmSs,
} from '@workspace/livex-core';

/* ── STYLES & KEYFRAMES INJECTION ────────────────────────────── */
const liveModeStyles = `
@keyframes live-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

@keyframes chord-bloom {
  0% { transform: scale(0.85); opacity: 0; }
  50% { opacity: 0.6; }
  100% { transform: scale(1.15); opacity: 0; }
}

/* Discrete stage chord alignment styling (Stitch Section 2) */
.chord-cell {
  display: inline-flex;
  flex-direction: column;
  vertical-align: top;
  margin-right: 0.65rem;
  cursor: pointer;
  position: relative;
  transition: transform 0.25s ease;
}

/* Chords typography */
.chord-tag {
  font-family: var(--studio-font-mono, monospace);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 0.25rem;
  min-height: 1.25rem;
  color: var(--c-text-secondary, #94a3b8);
  transition: color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
              transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.karaoke-word,
.lyric-word {
  display: inline-block;
  color: var(--lyric-unfilled, var(--c-text-secondary, #94a3b8));
  -webkit-text-fill-color: var(--lyric-unfilled, var(--c-text-secondary, #94a3b8));
  font-family: var(--studio-font-body, "Inter Tight", sans-serif);
  letter-spacing: -0.015em;
  transform-origin: left center;
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
              opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Active Word in Sung Focus: Butter-Smooth Sliding Highlight across Letters */
.chord-cell.active .karaoke-word,
.karaoke-word.active,
.lyric-word.word-active {
  font-weight: 800 !important;
  transform: scale(1.05) translateY(-1px);
  background: linear-gradient(
    90deg,
    var(--lyric-fill, var(--c-text-primary, #ffffff)) 0%,
    var(--lyric-fill, var(--c-text-primary, #ffffff)) 45%,
    var(--lyric-glow, var(--c-accent-from, #3b82f6)) 48%,
    var(--lyric-unfilled, var(--c-text-secondary, rgba(255, 255, 255, 0.45))) 52%,
    var(--lyric-unfilled, var(--c-text-secondary, rgba(255, 255, 255, 0.45))) 100%
  );
  background-size: 220% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  will-change: background-position;
  animation: lyric-word-wipe var(--word-duration, 350ms) linear forwards;
  filter: drop-shadow(0 2px 12px var(--lyric-glow-shadow, rgba(59, 130, 246, 0.3)));
}

/* Active Chord Highlight */
.chord-cell.active .chord-tag {
  color: var(--c-primary, #2563eb) !important;
  font-weight: 800;
  transform: translateY(-2px);
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s ease;
}

/* Passed words in current/prior context */
.chord-cell.passed .karaoke-word,
.karaoke-word.passed,
.lyric-word.word-past {
  font-weight: 600;
  color: var(--lyric-fill, var(--c-text-primary, #ffffff));
  -webkit-text-fill-color: var(--lyric-fill, var(--c-text-primary, #ffffff));
  background: none;
  opacity: 0.95;
  filter: none;
  transform: none;
}
.chord-cell.passed .chord-tag {
  color: var(--c-primary, #3b82f6);
  opacity: 0.8;
}

/* Upcoming words */
.lyric-word.word-upcoming,
.karaoke-word:not(.active):not(.passed) {
  opacity: 0.55;
  font-weight: 500;
  color: var(--lyric-unfilled, var(--c-text-secondary, rgba(255, 255, 255, 0.45)));
  -webkit-text-fill-color: var(--lyric-unfilled, var(--c-text-secondary, rgba(255, 255, 255, 0.45)));
  background: none;
  filter: none;
  transform: none;
}

/* Active line focus */
.lyric-line.active-line {
  opacity: 1 !important;
  transform: scale(1.01);
}

.beat-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--surface-topbar-border, rgba(255,255,255,0.2));
  transition: all 0.2s ease;
}

.beat-dot.beat-dot-active {
  background: var(--c-primary, #2563eb) !important;
  transform: scale(1.35);
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
}
`;

/* ── CANONICAL TOP APP BAR ─────────────────────────────────────── */
export function LiveModeHeader({ state }: { state: LiveModeState }) {
  const {
    preset,
    accent,
    autoPlay,
    bpmOverride,
    handleClose,
    displayMode,
    currentSectionName,
    setShowSettings,
  } = state;

  const isLyricsMode = displayMode === 'lyrics_only';
  const isHybridMode =
    displayMode === 'lyrics_chord_diagram' ||
    displayMode === 'lyrics_chord_name';

  const elapsedSec = Math.round(state.elapsedMs / 1000);
  const totalSec = Math.round((state.timingSchedule?.effectiveDurationMs || 0) / 1000);
  const durationText = `${formatDurationMmSs(elapsedSec)} / ${formatDurationMmSs(totalSec)}`;
  const currentSpeed = state.speed || state.bpmOverride;

  const durationBadge = (
    <button
      type="button"
      data-testid="live-header-duration"
      onClick={() => setShowSettings(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '0',
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        font: 'inherit',
      }}
      title="Adjust song duration"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
        timer
      </span>
      <span>{durationText}</span>
    </button>
  );

  const bpmBadge = (
    <span
      data-testid="header-bpm-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 7px',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--c-text-primary, #ffffff)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ color: accent.from, fontWeight: 800 }}>BPM</span>
      <span>{currentSpeed}</span>
    </span>
  );

  const subtitle = (() => {
    if (isHybridMode) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: accent.from, fontWeight: 700 }}>CHORDS + LYRICS</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>KEY {preset.key || 'C'}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          {bpmBadge}
          <span style={{ opacity: 0.4 }}>•</span>
          {durationBadge}
        </span>
      );
    }
    if (isLyricsMode) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: accent.from, fontWeight: 700 }}>LYRICS</span>
          <span style={{ opacity: 0.4 }}>•</span>
          {bpmBadge}
          <span style={{ opacity: 0.4 }}>•</span>
          {durationBadge}
          {preset.artist ? (
            <>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ opacity: 0.7 }}>{preset.artist}</span>
            </>
          ) : null}
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: autoPlay ? '#22c55e' : accent.from,
                boxShadow: autoPlay ? '0 0 6px #22c55e' : `0 0 6px ${accent.from}`,
              }}
            />
            {currentSectionName || 'Lyrics'}
          </span>
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: accent.from, fontWeight: 700 }}>CHORDS</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span>KEY {preset.key || 'C'}</span>
        <span style={{ opacity: 0.4 }}>•</span>
        {bpmBadge}
        <span style={{ opacity: 0.4 }}>•</span>
        {durationBadge}
      </span>
    );
  })();

  return (
    <>
      <style>{liveModeStyles}</style>
      <header
        data-purpose="live-mode-topbar"
        data-testid="live-mode-topbar"
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
          left: '50%',
          transform: state.isHeaderHidden ? 'translate(-50%, -125%)' : 'translate(-50%, 0)',
          opacity: state.isHeaderHidden ? 0 : 1,
          pointerEvents: state.isHeaderHidden ? 'none' : 'auto',
          transition: 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 100,
          width: 'calc(100% - 32px)',
          maxWidth: '560px',
          minHeight: '50px',
          borderRadius: '26px',
          padding: '6px 12px 6px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-container-high, rgba(30, 30, 30, 0.72))',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36), 0 2px 8px rgba(0, 0, 0, 0.2)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Back button */}
        <button
          type="button"
          data-testid="live-mode-back-btn"
          onClick={handleClose}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'var(--c-text-primary, #ffffff)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title="Exit Live Mode"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
            arrow_back
          </span>
        </button>

        {/* Center: Song title & Live status subtitle */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            padding: '0 10px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: autoPlay ? '#22c55e' : accent.from,
                boxShadow: autoPlay ? '0 0 8px #22c55e' : `0 0 8px ${accent.from}`,
                animation: autoPlay ? 'live-dot-pulse 1.5s infinite' : 'none',
                flexShrink: 0,
              }}
            />
            <h1
              data-testid="live-mode-title"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--c-text-primary, #ffffff)',
                fontFamily: 'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
                padding: 0,
              }}
            >
              {preset.name}
            </h1>
          </div>
          <div
            data-testid="live-mode-subtitle"
            style={{
              fontSize: '11px',
              color: 'var(--c-text-secondary, #94a3b8)',
              fontFamily: 'var(--studio-font-body, "Inter", sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              marginTop: '2px',
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Right: Live Sync Pill (when locked as spectator) + Settings button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {state.hasActiveBand && state.isLockedToLeader && (
            <button
              type="button"
              data-testid="live-follow-toggle"
              onClick={() => state.setIsLockedToLeader(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '16px',
                background: 'rgba(59, 130, 246, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(59, 130, 246, 0.28)',
                transition: 'all 0.2s ease',
              }}
              title="Locked to Leader's Live Session (Tap to Unlock)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                link
              </span>
              <span>SYNCED</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            data-testid="live-mode-settings-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--c-text-primary, #ffffff)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            title="Live Settings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              tune
            </span>
          </button>
        </div>
      </header>
    </>
  );
}

/* ── HERO STAGE CHORD CARD (Stitch Section 3) ──────────────────── */
export function StageChordCard({
  chord,
  accent,
  visualStyle = 'both',
  size = 'standard',
  maxWidth,
  onPlay,
}: {
  chord: any;
  accent: { from: string; to: string };
  visualStyle?: VisualStyle;
  size?: 'standard' | 'large';
  maxWidth?: string | number;
  onPlay?: () => void;
}) {
  if (!chord || !chord.name) {
    return (
      <div
        data-testid="stage-chord-empty"
        className="flex flex-col items-center justify-center w-full max-w-xs mx-auto py-5 px-4 rounded-3xl select-none"
        style={{
          background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
          border: '1px dashed var(--surface-topbar-border, rgba(255,255,255,0.12))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <span
          className="material-symbols-outlined mb-1.5"
          style={{ fontSize: '24px', opacity: 0.35, color: 'var(--c-text-secondary)' }}
        >
          music_off
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--c-text-secondary)',
            opacity: 0.7,
            fontFamily: 'var(--studio-font-body, "Inter", sans-serif)',
          }}
        >
          No chord at this position
        </span>
      </div>
    );
  }

  const chordName = chord.name || '';
  const rootMatch = chordName.match(/^([A-G][#b]?)(.*)$/);
  const root = rootMatch ? rootMatch[1] : chordName;
  const suffix = rootMatch ? rootMatch[2] : '';

  // If Name Only mode or chord has no guitar voicing: render clean hero typography with note badges
  if (visualStyle === 'name' || !chord.guitar) {
    return (
      <div
        onClick={onPlay}
        data-testid="stage-chord-card"
        data-visual-style="name"
        className="relative flex flex-col items-center w-full mx-auto py-5 px-6 rounded-3xl cursor-pointer select-none transition-transform active:scale-98"
        style={{
          maxWidth: maxWidth ?? (size === 'large' ? 'clamp(320px, 92vw, 420px)' : '320px'),
          background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
          border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.1))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
        title="Tap to hear chord"
      >
        <div data-purpose="stage-chord-title" className="flex items-baseline gap-1.5 mb-2">
          <span
            className={`${size === 'large' ? 'text-7xl sm:text-8xl' : 'text-5xl sm:text-6xl'} font-extrabold tracking-tight`}
            style={{
              fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
              color: accent.from,
              textShadow: `0 0 24px ${accent.from}44`,
            }}
          >
            {root}
          </span>
          {suffix && (
            <span
              className={`${size === 'large' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} font-bold opacity-85`}
              style={{
                fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                color: 'var(--c-text-primary)',
              }}
            >
              {suffix}
            </span>
          )}
        </div>
        {chord.notes && chord.notes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
            {chord.notes.map((n: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--c-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onPlay}
      data-testid="stage-chord-card"
      data-visual-style={visualStyle}
      className="relative flex flex-col items-center w-full mx-auto p-4 sm:p-5 rounded-3xl cursor-pointer select-none transition-transform active:scale-98"
      style={{
        maxWidth: maxWidth ?? (size === 'large' ? 'clamp(320px, 92vw, 420px)' : '360px'),
        background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
        border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.1))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
      title="Tap to hear chord"
    >
      {/* Chord Name Header (rendered in 'both' style, or compact in 'diagram' style) */}
      {visualStyle === 'both' ? (
        <div data-purpose="stage-chord-title" className="flex items-baseline gap-1.5 mb-2.5">
          <span
            className={`${size === 'large' ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'} font-black tracking-tight`}
            style={{
              fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
              color: accent.from,
              textShadow: `0 0 24px ${accent.from}33`,
            }}
          >
            {root}
          </span>
          {suffix && (
            <span
              className={`${size === 'large' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} font-bold opacity-85`}
              style={{
                fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                color: 'var(--c-text-primary)',
              }}
            >
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full"
          style={{ background: `${accent.from}1a`, border: `1px solid ${accent.from}33` }}
        >
          <span
            className="text-lg font-black tracking-tight"
            style={{
              fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
              color: accent.from,
            }}
          >
            {chordName}
          </span>
        </div>
      )}

      {/* High Fidelity Clean Fretboard Diagram from Library */}
      <DetailFretboardDiagram
        chordData={chord.guitar}
        maxWidth="100%"
        accentColor={accent.from}
        displayMode="notes"
      />
    </div>
  );

}

/* ── MODE 1: CHORDS LIVE VIEW (Reference Grid / Cheat-Sheet) ────── */
export function ChordsLiveView({ state }: { state: LiveModeState }) {
  const {
    preset,
    accent,
    playChordSound,
    setShowSettings,
    displayMode,
    transposeOffset = 0,
    chordDiagramScale = 'large',
  } = state;

  const customChords = useChordStore((s) => s.customChords);

  // Extract all sections and chords for the reference grid
  const sections = useMemo(() => {
    // 1. If preset has sections defined with chords
    if (preset.sections && preset.sections.length > 0) {
      return preset.sections.map((sec) => {
        const rawChords = (sec.chords || []).map((chordId) => {
          const isCustom = chordId.startsWith('custom-');
          const customChord = isCustom
            ? (customChords || []).find((c) => c.id === chordId) ?? null
            : null;
          const displayId =
            !isCustom && transposeOffset !== 0
              ? transposeChordId(chordId, transposeOffset)
              : chordId;
          const chord = isCustom
            ? null
            : (getChordById(displayId) ??
               getChordById(chordId) ??
               getChordByName(displayId) ??
               getChordByName(chordId));
          return {
            id: chordId,
            chord,
            customChord,
            name: isCustom
              ? customChord?.name || 'Custom'
              : chord?.name.replace(/\s/g, '') || chordId,
          };
        });
        return {
          id: sec.id,
          name: sec.name,
          chords: rawChords,
        };
      });
    }

    // 2. If flat chords list
    if (preset.chords && preset.chords.length > 0) {
      const rawChords = preset.chords.map((chordId) => {
        const isCustom = chordId.startsWith('custom-');
        const customChord = isCustom
          ? (customChords || []).find((c) => c.id === chordId) ?? null
          : null;
        const displayId =
          !isCustom && transposeOffset !== 0
            ? transposeChordId(chordId, transposeOffset)
            : chordId;
        const chord = isCustom
          ? null
          : (getChordById(displayId) ??
             getChordById(chordId) ??
             getChordByName(displayId) ??
             getChordByName(chordId));
        return {
          id: chordId,
          chord,
          customChord,
          name: isCustom
            ? customChord?.name || 'Custom'
            : chord?.name.replace(/\s/g, '') || chordId,
        };
      });
      return [
        {
          id: 'progression',
          name: 'Chord Progression',
          chords: rawChords,
        },
      ];
    }

    // 3. If chords from lyrics
    if (preset.lyrics?.sections) {
      const extracted: { id: string; chord: any; customChord: any; name: string }[] = [];
      const seen = new Set<string>();
      preset.lyrics.sections.forEach((sec) => {
        sec.lines?.forEach((line) => {
          (line.chords || []).forEach((c) => {
            if (c.chord && !seen.has(c.chord)) {
              seen.add(c.chord);
              const isCustom = c.chord.startsWith('custom-');
              const customChord = isCustom
                ? (customChords || []).find((cc) => cc.id === c.chord) ?? null
                : null;
              const displayId =
                !isCustom && transposeOffset !== 0
                  ? transposeChordId(c.chord, transposeOffset)
                  : c.chord;
              const chord = isCustom
                ? null
                : (getChordById(displayId) ??
                   getChordById(c.chord) ??
                   getChordByName(displayId) ??
                   getChordByName(c.chord));
              extracted.push({
                id: c.chord,
                chord,
                customChord,
                name: isCustom
                  ? customChord?.name || 'Custom'
                  : chord?.name.replace(/\s/g, '') || c.chord,
              });
            }
          });
        });
      });
      return [{ id: 'lyrics-chords', name: 'Song Chords', chords: extracted }];
    }

    return [];
  }, [preset.sections, preset.chords, preset.lyrics, customChords, transposeOffset]);

  const totalChords = sections.reduce((acc, s) => acc + s.chords.length, 0);

  const scaleConfig = useMemo(() => {
    switch (chordDiagramScale) {
      case 'small':
        return {
          gridTemplate: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: '6px',
          cardPadding: '6px 4px 5px',
          nameSize: '13px',
          nameMarginBottom: '3px',
          diagramMaxWidth: '68px',
          diagramPadding: '2px',
          noteMarginTop: '3px',
          noteFontSize: '8px',
          notePadding: '1px 3px',
          showNotes: false,
          cardRadius: '12px',
        };
      case 'medium':
        return {
          gridTemplate: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '8px',
          cardPadding: '8px 6px 6px',
          nameSize: '15px',
          nameMarginBottom: '4px',
          diagramMaxWidth: '96px',
          diagramPadding: '4px',
          noteMarginTop: '4px',
          noteFontSize: '8.5px',
          notePadding: '1px 4px',
          showNotes: true,
          cardRadius: '14px',
        };
      case 'large':
      default:
        return {
          gridTemplate: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
          cardPadding: '12px 10px 10px',
          nameSize: '18px',
          nameMarginBottom: '6px',
          diagramMaxWidth: '136px',
          diagramPadding: '5px',
          noteMarginTop: '6px',
          noteFontSize: '9px',
          notePadding: '1px 5px',
          showNotes: true,
          cardRadius: '18px',
        };
    }
  }, [chordDiagramScale]);

  return (
    <div
      data-purpose="live-chords-grid-view"
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        padding: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 76px) 16px calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 80px)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-3xl"
          style={{ background: `${accent.from}10` }}
        />
        <div
          className="absolute bottom-10 left-1/4 w-[380px] h-[280px] rounded-full blur-2xl"
          style={{ background: `${accent.to}14` }}
        />
      </div>

      {/* Main Grid Container */}
      <div
        style={{
          zIndex: 1,
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {totalChords === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--c-text-secondary)',
              fontFamily: 'var(--font-headline)',
              fontSize: '15px',
            }}
          >
            No chords found for this song.
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.id} style={{ width: '100%' }}>
              {/* Section Header */}
              {sections.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: accent.from,
                      background: `${accent.from}1a`,
                      border: `1px solid ${accent.from}33`,
                    }}
                  >
                    {section.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                    {section.chords.length} {section.chords.length === 1 ? 'chord' : 'chords'}
                  </span>
                </div>
              )}

              {/* Grid of Chord Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: scaleConfig.gridTemplate,
                  gap: scaleConfig.gap,
                  width: '100%',
                  transition: 'grid-template-columns 0.25s ease, gap 0.25s ease',
                }}
              >
                {section.chords.map((chordItem, cIdx) => {
                  const guitarData =
                    chordItem.chord?.guitar ||
                    (chordItem.customChord?.frets
                      ? {
                          frets: chordItem.customChord.frets,
                          fingers: [],
                          barres: chordItem.customChord.barres || [],
                          baseFret: chordItem.customChord.baseFret || 1,
                        }
                      : null);

                  return (
                    <motion.div
                      key={`${chordItem.id}-${cIdx}`}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        if (guitarData) playChordSound(guitarData);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: scaleConfig.cardPadding,
                        borderRadius: scaleConfig.cardRadius,
                        background: 'var(--c-surface-card, var(--app-surface-card, rgba(255,255,255,0.05)))',
                        border: '1px solid var(--c-border-subtle, var(--c-border, rgba(255,255,255,0.08)))',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        position: 'relative',
                        userSelect: 'none',
                        transition: 'border-color 0.2s ease, transform 0.15s ease, padding 0.2s ease',
                      }}
                    >
                      {/* Chord Name Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          marginBottom: scaleConfig.nameMarginBottom,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-headline, sans-serif)',
                            fontWeight: 900,
                            fontSize: scaleConfig.nameSize,
                            letterSpacing: '-0.02em',
                            color: 'var(--c-text-primary, currentColor)',
                            textAlign: 'center',
                          }}
                        >
                          {chordItem.name}
                        </span>
                      </div>

                      {/* Canonical DetailFretboardDiagram */}
                      {displayMode !== 'chords_name' && (
                        <div style={{ width: '100%', maxWidth: scaleConfig.diagramMaxWidth, pointerEvents: 'none', transition: 'max-width 0.2s ease' }}>
                          <DetailFretboardDiagram
                            chordData={guitarData}
                            maxWidth="100%"
                            accentColor={accent.from}
                            displayMode="notes"
                            surfaceStyle={{
                              backgroundColor: 'var(--c-surface-lowest, var(--app-surface-lowest, rgba(0,0,0,0.05)))',
                              borderColor: 'var(--c-border-subtle, var(--c-border, rgba(0,0,0,0.08)))',
                              padding: scaleConfig.diagramPadding,
                              borderRadius: scaleConfig.cardRadius === '18px' ? '12px' : '8px',
                            }}
                          />
                        </div>
                      )}

                      {/* Note badges (if present) */}
                      {scaleConfig.showNotes && chordItem.chord?.notes && chordItem.chord.notes.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '3px',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            marginTop: scaleConfig.noteMarginTop,
                          }}
                        >
                          {chordItem.chord.notes.map((note: string, nIdx: number) => (
                            <span
                              key={nIdx}
                              style={{
                                fontSize: scaleConfig.noteFontSize,
                                fontWeight: 700,
                                color: 'var(--c-text-secondary, #6B7280)',
                                background: 'var(--c-surface-low, rgba(128,128,128,0.1))',
                                padding: scaleConfig.notePadding,
                                borderRadius: '4px',
                                border: '1px solid var(--c-border-subtle, rgba(128,128,128,0.15))',
                              }}
                            >
                              {note.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Settings FAB in Bottom-Right Corner */}
      <button
        type="button"
        data-testid="chords-grid-settings-btn"
        onClick={() => setShowSettings(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 20px)',
          right: '20px',
          zIndex: 50,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'var(--surface-topbar-bg, rgba(20, 20, 24, 0.9))',
          border: 'var(--surface-topbar-border, 1px solid rgba(255, 255, 255, 0.15))',
          backdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
          WebkitBackdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
          boxShadow: 'var(--surface-topbar-shadow, 0 8px 32px rgba(0, 0, 0, 0.45))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-primary, #ffffff)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, background 0.15s ease',
        }}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onPointerCancel={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Song Live Settings"
        aria-label="Song Live Settings"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
          settings
        </span>
      </button>
    </div>
  );
}

/* ── MODE 2: LYRICS LIVE VIEW (Stitch Section 2) ───────────────── */
export function LyricsLiveView({ state }: { state: LiveModeState }) {
  const {
    teleprompterLines,
    currentLineIdx,
    currentWordIdx,
    displayMode,
    accent,
    handleLineClick,
    setCurrentWordIdx,
    teleprompterFontSize,
    teleprompterFontFamily,
    teleprompterLineHeight,
    teleprompterAlignment,
    teleprompterMirror,
    teleprompterContainerRef,
    showQuickActions,
    playbackSpeed,
    cyclePlaybackSpeed,
    goToPrevSection,
    goToNextSection,
    setTeleprompterFontSize,
    setDisplayMode,
    compatibleModes,
    autoPlay,
    setAutoPlay,
    nextPhrase,
    prevPhrase,
    setShowSettings,
    setShowQuickActions,
  } = state;

  const fontSizes = {
    normal: { text: '22px', chord: '13px', lineGap: '20px' },
    large: { text: '26px', chord: '15px', lineGap: '26px' },
    huge: { text: '32px', chord: '17px', lineGap: '32px' },
  }[teleprompterFontSize] || { text: '22px', chord: '13px', lineGap: '20px' };

  const resolvedFontFamily = (() => {
    switch (teleprompterFontFamily) {
      case 'sans':
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'serif':
        return 'Georgia, Cambria, "Times New Roman", Times, serif';
      case 'mono':
        return 'var(--studio-font-mono, "SF Mono", Consolas, monospace)';
      case 'studio':
      default:
        return 'var(--studio-font-body, system-ui, sans-serif)';
    }
  })();

  const isCentered = teleprompterAlignment === 'center';

  React.useEffect(() => {
    const el = teleprompterContainerRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollTop = el.scrollTop;
      const diff = currentScrollTop - lastScrollTop;
      lastScrollTop = currentScrollTop;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (diff > 12 && currentScrollTop > 40) {
            state.setIsHeaderHidden(true);
          } else if (diff < -12) {
            state.setIsHeaderHidden(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [state]);

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 64px)',
          zIndex: 90,
          pointerEvents: state.isHeaderHidden ? 'auto' : 'none',
        }}
        onClick={() => state.setIsHeaderHidden(false)}
      />
      {/* Main Teleprompter Canvas */}
      <div
        ref={teleprompterContainerRef}
        data-testid="teleprompter-container"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '780px',
          margin: '0 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 76px)',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 100px)',
          paddingLeft: '20px',
          paddingRight: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: fontSizes.lineGap,
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          transform: teleprompterMirror ? 'scaleX(-1)' : 'none',
          boxSizing: 'border-box',
        }}
      >
        {teleprompterLines.map((item, idx) => {
          const isActive = idx === currentLineIdx;
          const isPast = idx < currentLineIdx;

          const isTextColorWhite =
            !item.color ||
            item.color.toLowerCase() === '#ffffff' ||
            item.color.toLowerCase() === '#fff' ||
            item.color.toLowerCase().startsWith('rgb(255');
          const highlightBorderColor = isTextColorWhite ? 'var(--c-accent-from, #3b82f6)' : item.color;
          const highlightBg = isTextColorWhite
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.05)';
          const highlightBorder = isActive
            ? `1px solid ${isTextColorWhite ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)'}`
            : '1px solid transparent';
          const highlightShadow = isActive
            ? '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.06)'
            : 'none';

          return (
            <div
              key={item.id}
              id={`live-line-${idx}`}
              data-testid={`teleprompter-line-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                handleLineClick(idx);
              }}
              className={`lyric-line ${isActive ? 'active-line' : ''}`}
              style={{
                position: 'relative',
                borderRadius: '16px',
                padding: '12px 16px',
                background: isActive ? highlightBg : 'transparent',
                border: highlightBorder,
                borderLeft: isActive ? `4px solid ${highlightBorderColor}` : '4px solid transparent',
                boxShadow: highlightShadow,
                opacity: isActive ? 1 : isPast ? 0.42 : 0.75,
                transition:
                  'background 250ms ease, opacity 250ms ease, transform 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
                cursor: 'pointer',
                textAlign: isCentered ? 'center' : 'left',
              }}
            >
              {/* Section Header if first line of section */}
              {item.isFirstLineOfSection && (Boolean(item.sectionName && item.sectionName.trim().length > 0) || Boolean(item.sectionVocalRole)) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCentered ? 'center' : 'flex-start',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  {Boolean(item.sectionName && item.sectionName.trim().length > 0) && (
                    <span
                      style={{
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 800,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: `${accent.from}24`,
                        border: `1px solid ${accent.from}44`,
                        color: accent.from,
                      }}
                    >
                      {item.sectionName}
                    </span>
                  )}

                  {item.sectionVocalRole && (
                    <span
                      style={{
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 9px',
                        borderRadius: '9999px',
                        background: 'var(--surface-container-low, rgba(255,255,255,0.06))',
                        border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.1))',
                        color: 'var(--c-text-primary)',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: item.sectionVocalRole.color || accent.from,
                        }}
                      />
                      {item.sectionVocalRole.label || item.sectionVocalRole.type}
                    </span>
                  )}
                </div>
              )}

              {/* Interlude Rendering */}
              {item.line.type === 'interlude' ? (
                <div
                  className="w-full flex flex-col items-center justify-center p-6 rounded-2xl border"
                  style={{
                    backgroundColor: isActive
                      ? `color-mix(in srgb, ${accent.from} 12%, rgba(255,255,255,0.03))`
                      : 'var(--surface-container-low, rgba(255,255,255,0.02))',
                    borderColor: isActive ? accent.from : 'var(--surface-topbar-border, rgba(255,255,255,0.08))',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="material-symbols-rounded"
                      style={{
                        fontSize: '32px',
                        color: isActive ? accent.from : 'var(--c-text-secondary)',
                        animation: isActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                      }}
                    >
                      hourglass_bottom
                    </span>
                    <div className="flex flex-col">
                      <span
                        style={{
                          fontFamily: 'var(--studio-font-display)',
                          fontSize: '28px',
                          fontWeight: 800,
                          color: isActive ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {item.line.text || '(Solo)'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--studio-font-mono)',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isActive ? accent.from : 'var(--c-text-secondary)',
                          marginTop: '2px',
                        }}
                      >
                        {isActive && state.interludeRemainingSec !== null
                          ? `${state.interludeRemainingSec}s remaining`
                          : `${Math.round((item.line.explicitDurationMs || 0) / 1000)}s`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  justifyContent: isCentered ? 'center' : 'flex-start',
                  lineHeight: 1.45,
                }}
              >
                {displayMode === 'lyrics_chord_name' ? (
                  item.words.map((w) => {
                    const lyricFill = w.color || 'var(--c-text-primary, #ffffff)';
                    const isWordActive = isActive && w.globalWordIdx === currentWordIdx;
                    return (
                      <div
                        key={w.id}
                        className={`chord-cell ${isWordActive ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLineClick(idx);
                        }}
                      >
                        <span
                          className="chord-tag"
                          style={{
                            fontSize: fontSizes.chord,
                            color: isActive ? accent.from : 'var(--c-text-secondary)',
                            fontWeight: 700,
                          }}
                        >
                          {w.chord || '\u00A0'}
                        </span>
                        <span
                          className={`karaoke-word ${isWordActive ? 'active' : ''}`}
                          style={{
                            fontFamily: resolvedFontFamily,
                            fontSize: fontSizes.text,
                            cursor: 'pointer',
                            color: isActive ? lyricFill : 'inherit',
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {w.text}&nbsp;
                        </span>
                      </div>
                    );
                  })
                ) : (
                  item.words.map((w) => {
                    const lyricFill = w.color || 'var(--c-text-primary, #ffffff)';
                    const isWordActive = isActive && w.globalWordIdx === currentWordIdx;
                    return (
                      <span
                        key={w.id}
                        className={`lyric-word ${isWordActive ? 'word-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLineClick(idx);
                        }}
                        style={{
                          fontFamily: resolvedFontFamily,
                          fontSize: fontSizes.text,
                          cursor: 'pointer',
                          color: isActive ? lyricFill : 'inherit',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {w.text}&nbsp;
                      </span>
                    );
                  })
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preferences / Quick Controls HUD Bar (Anchored directly above Bottom Transport Dock) */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            data-testid="lyrics-quick-controls-hud"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            style={{
              position: 'fixed',
              bottom: 'calc(max(24px, env(safe-area-inset-bottom, 24px)) + 58px)',
              left: '50%',
              x: '-50%',
              zIndex: 48,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'var(--surface-topbar-bg)',
              border: 'var(--surface-topbar-border)',
              backdropFilter: 'var(--surface-topbar-backdrop)',
              WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
              boxShadow: 'var(--surface-topbar-shadow)',
            }}
          >
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                color: accent.from,
                background: `${accent.from}22`,
                border: 'none',
                cursor: 'pointer',
              }}
              title="Auto-scroll Speed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                speed
              </span>
              <span>{playbackSpeed}x</span>
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--surface-topbar-border)' }} />

            <button
              type="button"
              onClick={goToPrevSection}
              style={{
                padding: '4px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
              }}
              title="Previous Section"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                fast_rewind
              </span>
            </button>

            <button
              type="button"
              onClick={goToNextSection}
              style={{
                padding: '4px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
              }}
              title="Next Section"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                fast_forward
              </span>
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--surface-topbar-border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (teleprompterFontSize === 'huge') setTeleprompterFontSize('large');
                  else if (teleprompterFontSize === 'large') setTeleprompterFontSize('normal');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Decrease text size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => {
                  if (teleprompterFontSize === 'normal') setTeleprompterFontSize('large');
                  else if (teleprompterFontSize === 'large') setTeleprompterFontSize('huge');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Increase text size"
              >
                A+
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Transport Dock */}
      <nav
        style={{
          position: 'fixed',
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'var(--surface-topbar-bg)',
          border: 'var(--surface-topbar-border)',
          backdropFilter: 'var(--surface-topbar-backdrop)',
          WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
          boxShadow: 'var(--surface-topbar-shadow)',
        }}
      >
        <button
          type="button"
          data-testid="lyrics-live-settings-btn"
          onClick={() => setShowSettings(true)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Song Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            settings
          </span>
        </button>

        <button
          type="button"
          onClick={prevPhrase}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Rewind Phrase"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
            fast_rewind
          </span>
        </button>

        <button
          type="button"
          data-testid="lyrics-play-pause-btn"
          onClick={() => setAutoPlay((a) => !a)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${accent.from}66`,
          }}
          title="Toggle Auto-Scroll"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {autoPlay ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          type="button"
          onClick={nextPhrase}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Forward Phrase"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
            fast_forward
          </span>
        </button>

        <button
          type="button"
          data-testid="lyrics-live-preferences-btn"
          onClick={() => setShowQuickActions((q) => !q)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showQuickActions ? `${accent.from}28` : 'transparent',
            border: 'none',
            color: showQuickActions ? accent.from : 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Toggle Quick Actions"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            tune
          </span>
        </button>
      </nav>
    </div>
  );
}

/* ── MODE 3: HYBRID LIVE VIEW (Stitch Section 3: Lyrics + Chords) ── */
export function HybridLiveView({ state }: { state: LiveModeState }) {
  const {
    activeHybridChord,
    accent,
    currentBar,
    currentBeat,
    teleprompterLines,
    currentLineIdx,
    currentWordIdx,
    setCurrentWordIdx,
    nextPreviewChord,
    nextPreviewLyrics,
    autoPlay,
    setAutoPlay,
    nextPhrase,
    prevPhrase,
    stepWordForward,
    stepWordBackward,
    playChordSound,
    setShowSettings,
    showQuickActions,
    setShowQuickActions,
    cyclePlaybackSpeed,
    playbackSpeed,
    goToPrevSection,
    goToNextSection,
    teleprompterFontSize,
    setTeleprompterFontSize,
    displayMode,
    setDisplayMode,
    visualStyle,
    setVisualStyle,
  } = state;

  const currentLine = teleprompterLines[currentLineIdx];

  React.useEffect(() => {
    const el = state.teleprompterContainerRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollTop = el.scrollTop;
      const diff = currentScrollTop - lastScrollTop;
      lastScrollTop = currentScrollTop;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (diff > 12 && currentScrollTop > 40) {
            state.setIsHeaderHidden(true);
          } else if (diff < -12) {
            state.setIsHeaderHidden(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [state]);

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 64px)',
          zIndex: 90,
          pointerEvents: state.isHeaderHidden ? 'auto' : 'none',
        }}
        onClick={() => state.setIsHeaderHidden(false)}
      />
      {/* Scrollable Stage Area */}
      <div
        ref={state.teleprompterContainerRef}
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 76px)',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 104px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Centered Stage Presentation Wrapper */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          margin: 'auto 0',
          zIndex: 1,
        }}
      >
        {/* Top Hero Stage Chord Card */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0 auto 16px' }}>
          <StageChordCard
            chord={activeHybridChord}
            accent={accent}
            visualStyle={visualStyle}
            onPlay={() => playChordSound(activeHybridChord?.guitar)}
          />
        </div>

        {/* Synchronized Stage Teleprompter */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            margin: '0 auto',
          }}
        >
          {/* Timing Pulse & Bar Counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--c-text-secondary)',
            }}
          >
            BAR {currentBar} OF {state.barsPerLine || 2} • BEAT {currentBeat + 1}
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[0, 1, 2, 3].map((b) => (
              <div
                key={b}
                className={`beat-dot ${b === currentBeat ? 'beat-dot-active' : ''}`}
                style={{
                  background:
                    b === currentBeat ? accent.from : 'var(--surface-topbar-border, rgba(255,255,255,0.2))',
                }}
              />
            ))}
          </div>
        </div>

        {/* Hero Synced Lyric Line Container (Apple Music Bloom) */}
        <div
          style={{
            minHeight: '4.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            lineHeight: 1.4,
          }}
        >
          {currentLine?.line.type === 'interlude' ? (
            <div className="flex flex-col items-center justify-center py-4">
              <span
                className="material-symbols-rounded mb-2"
                style={{
                  fontSize: '40px',
                  color: accent.from,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              >
                hourglass_bottom
              </span>
              <span
                style={{
                  fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                  fontSize: 'clamp(28px, 6vw, 42px)',
                  fontWeight: 800,
                  color: 'var(--c-text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentLine.line.text || '(Solo)'}
              </span>
              <div className="mt-3 px-4 py-1.5 rounded-full" style={{ background: `${accent.from}1a`, border: `1px solid ${accent.from}33` }}>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: accent.from,
                  }}
                >
                  {state.interludeRemainingSec !== null
                    ? `${state.interludeRemainingSec}s remaining`
                    : `${Math.round((currentLine.line.explicitDurationMs || 0) / 1000)}s`}
                </span>
              </div>
            </div>
          ) : currentLine?.words && currentLine.words.length > 0 ? (
            currentLine.words.map((w) => {
              const isWordActive = w.globalWordIdx === currentWordIdx;
              const isWordPassed = w.globalWordIdx < currentWordIdx;
              const wordDuration = Math.max(100, Math.round((w.durationMs || 350) / (playbackSpeed || 1)));
              const lyricFill = w.color || 'var(--c-text-primary, #ffffff)';
              const lyricGlow = w.color || accent.from;
              const lyricGlowShadow = w.color ? `${w.color}55` : `${accent.from}55`;
              const lyricUnfilled = w.color ? `${w.color}88` : 'var(--c-text-secondary, rgba(255, 255, 255, 0.45))';

              return (
                <span
                  key={w.id}
                  onClick={() => setCurrentWordIdx(w.globalWordIdx)}
                  className={`lyric-word ${
                    isWordActive
                      ? 'word-active'
                      : isWordPassed
                      ? 'word-past'
                      : 'word-upcoming'
                  }`}
                  style={{
                    fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                    fontSize: 'clamp(24px, 5.5vw, 36px)',
                    cursor: 'pointer',
                    '--word-duration': autoPlay ? `${wordDuration}ms` : '180ms',
                    '--lyric-fill': lyricFill,
                    '--lyric-glow': lyricGlow,
                    '--lyric-glow-shadow': lyricGlowShadow,
                    '--lyric-unfilled': lyricUnfilled,
                    animationPlayState: autoPlay ? 'running' : 'paused',
                  } as React.CSSProperties}
                >
                  {w.text}
                </span>
              );
            })
          ) : (
            <span
              style={{
                fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
                fontSize: '28px',
                fontWeight: 700,
                color: currentLine?.color || 'var(--c-text-secondary)',
              }}
            >
              {currentLine?.line.text || '...'}
            </span>
          )}
        </div>

        {/* Cue Next Line Preview Pill */}
        {nextPreviewLyrics && (
          <button
            type="button"
            onClick={nextPhrase}
            style={{
              marginTop: '20px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'var(--surface-topbar-bg)',
              border: 'var(--surface-topbar-border)',
              backdropFilter: 'var(--surface-topbar-backdrop)',
              WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
              boxShadow: 'var(--surface-topbar-shadow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: accent.from }}
            >
              fast_forward
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--c-text-secondary)',
                }}
              >
                Next
              </span>
              {nextPreviewChord && (
                <span style={{ fontWeight: 800, color: accent.from }}>
                  {nextPreviewChord.name}
                </span>
              )}
              <span style={{ opacity: 0.4 }}>•</span>
              <span
                style={{
                  fontStyle: 'italic',
                  color: 'var(--c-text-secondary)',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                “{nextPreviewLyrics}”
              </span>
            </div>
          </button>
        )}
      </div>
      </div>
      </div>

      {/* Preferences / Quick Controls HUD Bar */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            style={{
              position: 'fixed',
              bottom: 'calc(max(24px, env(safe-area-inset-bottom, 24px)) + 58px)',
              left: '50%',
              x: '-50%',
              zIndex: 48,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'var(--surface-topbar-bg)',
              border: 'var(--surface-topbar-border)',
              backdropFilter: 'var(--surface-topbar-backdrop)',
              WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
              boxShadow: 'var(--surface-topbar-shadow)',
            }}
          >
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                color: accent.from,
                background: `${accent.from}22`,
                border: 'none',
                cursor: 'pointer',
              }}
              title="Auto-scroll Speed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                speed
              </span>
              <span>{playbackSpeed}x</span>
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--surface-topbar-border)' }} />

            <button
              type="button"
              onClick={goToPrevSection}
              style={{
                padding: '4px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
              }}
              title="Previous Section"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                fast_rewind
              </span>
            </button>

            <button
              type="button"
              onClick={goToNextSection}
              style={{
                padding: '4px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
              }}
              title="Next Section"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                fast_forward
              </span>
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--surface-topbar-border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                type="button"
                onClick={() => {
                  if (teleprompterFontSize === 'huge') setTeleprompterFontSize('large');
                  else if (teleprompterFontSize === 'large') setTeleprompterFontSize('normal');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Decrease text size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => {
                  if (teleprompterFontSize === 'normal') setTeleprompterFontSize('large');
                  else if (teleprompterFontSize === 'large') setTeleprompterFontSize('huge');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Increase text size"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => {
                  if (visualStyle === 'both') setVisualStyle('diagram');
                  else if (visualStyle === 'diagram') setVisualStyle('name');
                  else setVisualStyle('both');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent.from,
                  background: `${accent.from}22`,
                  border: 'none',
                  cursor: 'pointer',
                }}
                title={`Chords Focus: ${
                  visualStyle === 'both'
                    ? 'Diagram + Name'
                    : visualStyle === 'diagram'
                    ? 'Diagram Only'
                    : 'Name Only'
                } (Tap to cycle)`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {visualStyle === 'both' ? 'tune' : visualStyle === 'diagram' ? 'grid_on' : 'title'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Minimalist Stage Playback Controls */}
      <footer
        style={{
          position: 'fixed',
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'var(--surface-topbar-bg)',
          border: 'var(--surface-topbar-border)',
          backdropFilter: 'var(--surface-topbar-backdrop)',
          WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
          boxShadow: 'var(--surface-topbar-shadow)',
        }}
      >
        <button
          type="button"
          data-testid="hybrid-live-settings-btn"
          onClick={() => setShowSettings(true)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Song Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            settings
          </span>
        </button>

        <button
          type="button"
          onClick={prevPhrase}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Previous Phrase"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            skip_previous
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAutoPlay((a) => !a)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${accent.from}66`,
          }}
          title="Toggle Playback"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
            {autoPlay ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          type="button"
          onClick={nextPhrase}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Next Phrase"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            skip_next
          </span>
        </button>

        <button
          type="button"
          data-testid="hybrid-live-preferences-btn"
          onClick={() => setShowQuickActions((q) => !q)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showQuickActions ? `${accent.from}28` : 'transparent',
            border: 'none',
            color: showQuickActions ? accent.from : 'var(--c-text-primary)',
            cursor: 'pointer',
          }}
          title="Toggle Quick Preferences"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            tune
          </span>
        </button>
      </footer>
    </div>
  );
}

/* ── BACKWARD COMPATIBILITY DISPATCHERS ───────────────────────── */
export function LiveModeVisualizer({ state }: { state: LiveModeState }) {
  const isChordsOnly =
    state.contentCategory === 'chords_only' ||
    state.displayMode === 'chords_both' ||
    state.displayMode === 'chords_diagram' ||
    state.displayMode === 'chords_name';

  const isHybrid =
    state.displayMode === 'lyrics_chord_diagram' ||
    state.displayMode === 'lyrics_chord_name';

  if (isChordsOnly) {
    return <ChordsLiveView state={state} />;
  }
  if (isHybrid) {
    return <HybridLiveView state={state} />;
  }
  return <LyricsLiveView state={state} />;
}

export function LiveModeProgress({ state: _ }: { state: LiveModeState }) {
  return null;
}

export function LiveModeControls({ state: _ }: { state: LiveModeState }) {
  return null;
}

/* ── SETTINGS SHEET ──────────────────────────────────────────── */
export function LiveModeSettings({ state }: { state: LiveModeState }) {
  const {
    setShowSettings,
    displayMode,
    setDisplayMode,
    visualStyle,
    setVisualStyle,
    bpmOverride,
    setBpmOverride,
    beatsPerChord,
    setBeatsPerChord,
    beatsPerLine,
    setBeatsPerLine,
    showContext,
    setShowContext,
    teleprompterFontSize,
    setTeleprompterFontSize,
    teleprompterFontFamily,
    setTeleprompterFontFamily,
    teleprompterLineHeight,
    setTeleprompterLineHeight,
    teleprompterAlignment,
    setTeleprompterAlignment,
    teleprompterMirror,
    setTeleprompterMirror,
    chordDiagramScale,
    setChordDiagramScale,
    hasChords,
    hasLyrics,
    isTeleprompterMode,
    accent,
  } = state;

  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationInputVal, setDurationInputVal] = useState('');
  const durationInputRef = useRef<HTMLInputElement | null>(null);

  const startDurationEdit = () => {
    const currentSec =
      state.targetDurationSeconds ||
      Math.round((state.timingSchedule?.effectiveDurationMs || 0) / 1000);
    setDurationInputVal(formatDurationMmSs(currentSec));
    setIsEditingDuration(true);
    setTimeout(() => {
      durationInputRef.current?.focus();
      durationInputRef.current?.select();
    }, 50);
  };

  const applyDurationInput = () => {
    const clean = durationInputVal.trim();
    if (!clean || clean.toLowerCase() === 'auto') {
      state.setTargetDurationSeconds(undefined);
      setIsEditingDuration(false);
      return;
    }
    const parsed = parseDurationMmSs(clean);
    if (parsed !== null && parsed >= 10 && parsed <= 3600) {
      state.setTargetDurationSeconds(parsed);
    }
    setIsEditingDuration(false);
  };

  const isChordsActive =
    displayMode === 'chords_both' ||
    displayMode === 'chords_diagram' ||
    displayMode === 'chords_name';
  const isLyricsActive = displayMode === 'lyrics_only';
  const isBothActive =
    displayMode === 'lyrics_chord_diagram' ||
    displayMode === 'lyrics_chord_name';

  const CHORD_OPTIONS: { value: LiveDisplayMode; label: string; icon: string }[] = [
    { value: 'chords_both', label: 'Diagram + Name', icon: 'tune' },
    { value: 'chords_diagram', label: 'Diagram Only', icon: 'grid_on' },
    { value: 'chords_name', label: 'Name Only', icon: 'title' },
  ];

  const LYRIC_OPTIONS: {
    value: LiveDisplayMode;
    label: string;
    icon: string;
    requiresChords?: boolean;
  }[] = [
    { value: 'lyrics_chord_name', label: 'Lyrics + Chords', icon: 'music_note', requiresChords: true },
    {
      value: 'lyrics_chord_diagram',
      label: 'Lyrics + Diagrams',
      icon: 'auto_stories',
      requiresChords: true,
    },
    { value: 'lyrics_only', label: 'Lyrics Only', icon: 'description' },
  ];

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowSettings(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 90,
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="live-settings-sheet"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100% - var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) - 68px)',
          background: 'var(--surface-dialog-bg, var(--app-surface-high, #131318))',
          borderTop: '1px solid var(--c-border, rgba(255,255,255,0.15))',
          borderLeft: '1px solid var(--c-border, rgba(255,255,255,0.1))',
          borderRight: '1px solid var(--c-border, rgba(255,255,255,0.1))',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          zIndex: 95,
          boxShadow: 'var(--shadow-elevation-high, 0 -10px 40px rgba(0,0,0,0.5))',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Grabber handle */}
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--c-border-strong, rgba(255, 255, 255, 0.2))',
            margin: '12px auto 2px',
            flexShrink: 0,
          }}
        />

        {/* Scrollable content container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 24px)',
          }}
        >
          {/* Title row */}
        <div
          style={{
            padding: '18px 20px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 800,
                fontSize: '18px',
              }}
            >
              Song Live Settings
            </p>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'Inter',
                fontSize: '12px',
                marginTop: '1px',
              }}
            >
              Display mode, pacing, and typography options
            </p>
          </div>
          <Button
            data-testid="close-live-settings-btn"
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(false)}
            style={{ color: 'var(--c-text-secondary)' }}
            icon="close"
          />
        </div>

        <div
          style={{
            padding: '8px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* ── 0. TOP 3-MODE SELECTOR ───────────────────────── */}
          <div>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '8px',
              }}
            >
              Live Experience
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                padding: '4px',
                background: 'var(--surface-container-low, rgba(255,255,255,0.05))',
                borderRadius: '16px',
                border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
              }}
            >
              <button
                type="button"
                data-testid="live-settings-mode-chords"
                onClick={() => setDisplayMode('chords_both')}
                disabled={!hasChords}
                style={{
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isChordsActive ? accent.from : 'transparent',
                  color: isChordsActive ? '#ffffff' : hasChords ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                  opacity: !hasChords ? 0.4 : 1,
                  cursor: !hasChords ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: 'var(--studio-font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'background 200ms ease, color 200ms ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>music_note</span>
                Chords
              </button>
              <button
                type="button"
                data-testid="live-settings-mode-lyrics"
                onClick={() => setDisplayMode('lyrics_only')}
                disabled={!hasLyrics}
                style={{
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isLyricsActive ? accent.from : 'transparent',
                  color: isLyricsActive ? '#ffffff' : hasLyrics ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                  opacity: !hasLyrics ? 0.4 : 1,
                  cursor: !hasLyrics ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: 'var(--studio-font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'background 200ms ease, color 200ms ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                Lyrics
              </button>
              <button
                type="button"
                data-testid="live-settings-mode-both"
                onClick={() => setDisplayMode('lyrics_chord_diagram')}
                disabled={!hasChords || !hasLyrics}
                style={{
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isBothActive ? accent.from : 'transparent',
                  color: isBothActive ? '#ffffff' : (hasChords && hasLyrics) ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                  opacity: (!hasChords || !hasLyrics) ? 0.4 : 1,
                  cursor: (!hasChords || !hasLyrics) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: 'var(--studio-font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'background 200ms ease, color 200ms ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_stories</span>
                Both
              </button>
            </div>
          </div>
          {/* ── 1. PRESENTATION MODE: CHORDS FOCUS ───────────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Chords Focus
              </p>
              {!hasChords && (
                <span
                  style={{
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  No chords in song
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                opacity: hasChords ? 1 : 0.35,
                pointerEvents: hasChords ? 'all' : 'none',
              }}
            >
              {CHORD_OPTIONS.map((opt) => {
                const isSelected = isBothActive
                  ? (opt.value === 'chords_both' && visualStyle === 'both') ||
                    (opt.value === 'chords_diagram' && visualStyle === 'diagram') ||
                    (opt.value === 'chords_name' && visualStyle === 'name')
                  : displayMode === opt.value;
                const handleClick = () => {
                  if (isBothActive) {
                    const nextStyle =
                      opt.value === 'chords_diagram'
                        ? 'diagram'
                        : opt.value === 'chords_name'
                        ? 'name'
                        : 'both';
                    setVisualStyle(nextStyle);
                  } else {
                    setDisplayMode(opt.value);
                  }
                };
                return (
                  <button
                    key={opt.value}
                    onClick={handleClick}
                    data-testid={`mode-option-${opt.value}`}
                    className="btn-smooth"
                    style={{
                      padding: '12px 6px',
                      borderRadius: '1rem',
                      background: isSelected ? `${accent.from}22` : 'var(--surface-container-low, rgba(255,255,255,0.04))',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'var(--c-border, rgba(255,255,255,0.08))'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '20px',
                        color: isSelected ? accent.from : 'var(--c-text-secondary)',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Diagram Scale Selector */}
            <div
              style={{
                marginTop: '12px',
                opacity: hasChords ? 1 : 0.35,
                pointerEvents: hasChords ? 'all' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  Diagram Scale
                </p>
                <span
                  style={{
                    color: accent.from,
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                  }}
                >
                  {chordDiagramScale}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  padding: '4px',
                  background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
                  borderRadius: '14px',
                  border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
                }}
              >
                {(['large', 'medium', 'small'] as const).map((sc) => {
                  const isCurrent = chordDiagramScale === sc;
                  return (
                    <button
                      key={sc}
                      type="button"
                      data-testid={`setting-scale-${sc}`}
                      onClick={() => setChordDiagramScale(sc)}
                      className="btn-smooth"
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isCurrent ? accent.from : 'transparent',
                        color: isCurrent ? '#ffffff' : 'var(--c-text-primary)',
                        fontWeight: 700,
                        fontSize: '11px',
                        fontFamily: 'var(--studio-font-body)',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'background 200ms ease, color 200ms ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {sc === 'large' ? 'view_agenda' : sc === 'medium' ? 'grid_view' : 'apps'}
                      </span>
                      {sc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 2. PRESENTATION MODE: LYRICS & TELEPROMPTER FOCUS ─── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Lyrics & Teleprompter Focus
              </p>
              {!hasLyrics && (
                <span
                  style={{
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  No lyrics in song
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                opacity: hasLyrics ? 1 : 0.35,
                pointerEvents: hasLyrics ? 'all' : 'none',
              }}
            >
              {LYRIC_OPTIONS.map((opt) => {
                const isSelected = displayMode === opt.value;
                const isOptionDisabled = Boolean(opt.requiresChords && !hasChords);

                return (
                  <button
                    key={opt.value}
                    onClick={() => setDisplayMode(opt.value)}
                    data-testid={`mode-option-${opt.value}`}
                    disabled={isOptionDisabled}
                    className="btn-smooth"
                    style={{
                      padding: '12px 6px',
                      borderRadius: '1rem',
                      background: isSelected ? `${accent.from}22` : 'var(--surface-container-low, rgba(255,255,255,0.04))',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'var(--c-border, rgba(255,255,255,0.08))'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                      opacity: isOptionDisabled ? 0.35 : 1,
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '20px',
                        color: isSelected ? accent.from : 'var(--c-text-secondary)',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. BPM ────────────────────────────────────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                BPM
              </p>
              <p
                style={{
                  color: accent.from,
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {state.speed || state.bpmOverride}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                aria-label="Decrease BPM"
                onClick={() => (state.setSpeed || state.setBpmOverride)((b: number) => Math.max(40, b - 1))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--surface-container-low, rgba(255,255,255,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--c-border, transparent)',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  remove
                </span>
              </button>
              <ElasticSlider
                min={40}
                max={400}
                step={1}
                value={state.speed || state.bpmOverride}
                onChange={(state.setSpeed || state.setBpmOverride) as any}
                accentColor={accent.from}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                aria-label="Increase BPM"
                onClick={() => (state.setSpeed || state.setBpmOverride)((b: number) => Math.min(400, b + 1))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--surface-container-low, rgba(255,255,255,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--c-border, transparent)',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  add
                </span>
              </button>
            </div>
          </div>

          {/* ── BARS PER LINE ─────────────── */}
          <div
            data-testid="live-settings-bars-per-line-card"
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p
                  style={{
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Bars per Line
                </p>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontSize: '11px',
                    fontFamily: 'Inter',
                    marginTop: '2px',
                  }}
                >
                  Measures per lyric line
                </p>
              </div>
              <div
                data-testid="bars-per-line-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  background: `${accent.from}15`,
                  border: `1px solid ${accent.from}30`,
                  color: accent.from,
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {(state.barsPerLine || 2) === 1 ? '1 Bar (4 beats)' : `${state.barsPerLine || 2} Bars (${(state.barsPerLine || 2) * 4} beats)`}
              </div>
            </div>

            <div
              role="radiogroup"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                width: '100%',
              }}
            >
              {[1, 2, 3, 4].map((bars) => {
                const isActive = (state.barsPerLine || 2) === bars;
                return (
                  <button
                    key={bars}
                    data-testid={`bars-per-line-option-${bars}`}
                    onClick={() => state.setBarsPerLine(bars)}
                    className="btn-smooth"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 4px',
                      borderRadius: '12px',
                      background: isActive
                        ? accent.from
                        : 'var(--surface-container-low, rgba(255, 255, 255, 0.05))',
                      border: `1px solid ${
                        isActive ? accent.from : 'var(--c-border, rgba(255, 255, 255, 0.08))'
                      }`,
                      color: isActive ? '#ffffff' : 'var(--c-text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isActive ? 800 : 600,
                        letterSpacing: '-0.02em',
                        marginBottom: '2px',
                      }}
                    >
                      {bars} Bar{bars > 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. SONG DURATION (MINUTES : SECONDS) ─────────────── */}
          <div
            data-testid="live-settings-duration-card"
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p
                  style={{
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Song Duration
                </p>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontSize: '11px',
                    fontFamily: 'Inter',
                    marginTop: '2px',
                  }}
                >
                  Target presentation duration
                </p>
              </div>
            </div>

            {/* Stepper + Direct Editable Input Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                aria-label="Decrease target duration"
                data-testid="duration-decrease-btn"
                onClick={() => {
                  const current =
                    state.targetDurationSeconds ||
                    Math.round(state.timingSchedule.effectiveDurationMs / 1000);
                  const next = Math.max(30, current - 15);
                  state.setTargetDurationSeconds(next);
                }}
                className="btn-smooth"
                style={{
                  width: '42px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--surface-container-low, rgba(255, 255, 255, 0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--c-border, rgba(255, 255, 255, 0.15))',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                -15s
              </button>

              {isEditingDuration ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: `${accent.from}18`,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1.5px solid ${accent.from}`,
                  }}
                >
                  <input
                    ref={durationInputRef}
                    type="text"
                    inputMode="text"
                    data-testid="live-duration-inline-input"
                    value={durationInputVal}
                    onChange={(e) => setDurationInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyDurationInput();
                      if (e.key === 'Escape') setIsEditingDuration(false);
                    }}
                    onBlur={applyDurationInput}
                    placeholder="3:45"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--c-text-primary)',
                      fontFamily: 'var(--studio-font-mono, monospace)',
                      fontSize: '18px',
                      fontWeight: 800,
                      textAlign: 'center',
                      width: '80px',
                      letterSpacing: '0.05em',
                    }}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={applyDurationInput}
                    style={{
                      background: accent.from,
                      border: 'none',
                      borderRadius: '8px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-rounded text-sm">check</span>
                  </button>
                </div>
              ) : (
                <div
                  data-testid="duration-display-box"
                  onClick={startDurationEdit}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--surface-container-low, rgba(255, 255, 255, 0.08))',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--c-border, rgba(255, 255, 255, 0.15))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Tap to type duration directly"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '18px',
                      color: accent.from,
                    }}
                  >
                    timer
                  </span>
                  <span
                    data-testid="current-target-duration-text"
                    style={{
                      fontFamily: 'var(--studio-font-mono, monospace)',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--c-text-primary)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {formatDurationMmSs(
                      state.targetDurationSeconds ||
                        Math.round(state.timingSchedule.effectiveDurationMs / 1000)
                    )}
                  </span>
                  <span
                    className="material-symbols-rounded text-sm"
                    style={{ color: 'var(--c-text-secondary)', marginLeft: '2px' }}
                  >
                    edit
                  </span>
                </div>
              )}

              <button
                type="button"
                aria-label="Increase target duration"
                data-testid="duration-increase-btn"
                onClick={() => {
                  const current =
                    state.targetDurationSeconds ||
                    Math.round(state.timingSchedule.effectiveDurationMs / 1000);
                  const next = Math.min(1800, current + 15);
                  state.setTargetDurationSeconds(next);
                }}
                className="btn-smooth"
                style={{
                  width: '42px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--surface-container-low, rgba(255, 255, 255, 0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--c-border, rgba(255, 255, 255, 0.15))',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                +15s
              </button>
            </div>

            {/* Quick presets row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {[
                { label: 'Auto', sec: undefined },
                { label: '2:30', sec: 150 },
                { label: '3:00', sec: 180 },
                { label: '4:00', sec: 240 },
                { label: '5:00', sec: 300 },
              ].map((p) => {
                const isSelected =
                  p.sec === undefined
                    ? !state.targetDurationSeconds
                    : state.targetDurationSeconds === p.sec;

                return (
                  <button
                    key={p.label}
                    type="button"
                    data-testid={`duration-preset-${p.label.replace(':', '-')}`}
                    onClick={() => state.setTargetDurationSeconds(p.sec)}
                    className="btn-smooth"
                    style={{
                      padding: '8px 2px',
                      borderRadius: '10px',
                      background: isSelected
                        ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                        : 'var(--surface-container-low, rgba(255, 255, 255, 0.06))',
                      color: isSelected ? '#ffffff' : 'var(--c-text-secondary)',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: isSelected ? 'none' : '1px solid var(--c-border, transparent)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 2px 10px ${accent.to}33` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STAGE BAND LIVE SYNC CARD ────────────────────────── */}
          {state.hasActiveBand && (
            <div
              data-testid="live-settings-band-sync-card"
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--surface-container-lowest, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '17px', color: accent.from }}>
                      groups
                    </span>
                    <p
                      style={{
                        color: 'var(--c-text-primary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}
                    >
                      Stage Band Live Sync
                    </p>
                  </div>
                  <p
                    style={{
                      color: 'var(--c-text-secondary)',
                      fontSize: '11px',
                      fontFamily: 'Inter',
                      marginTop: '2px',
                    }}
                  >
                    Synchronize teleprompters & cues in real time
                  </p>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: accent.from,
                    fontFamily: 'var(--studio-font-mono, monospace)',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {state.bandName}
                </span>
              </div>

              {/* Mode Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* Broadcast Toggle (Leader) */}
                <button
                  type="button"
                  data-testid="band-sync-broadcast-btn"
                  onClick={() => {
                    const next = !state.isBroadcasting;
                    state.setIsBroadcasting(next);
                    if (next) state.setIsLockedToLeader(false);
                  }}
                  className="btn-smooth"
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    background: state.isBroadcasting
                      ? 'rgba(34, 197, 94, 0.16)'
                      : 'var(--surface-container-low, rgba(255, 255, 255, 0.06))',
                    border: `1px solid ${state.isBroadcasting ? 'rgba(34, 197, 94, 0.4)' : 'var(--c-border, transparent)'}`,
                    color: state.isBroadcasting ? '#4ade80' : 'var(--c-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    sensors
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>
                    {state.isBroadcasting ? 'Broadcasting ON' : 'Broadcast Live'}
                  </span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>Leader session</span>
                </button>

                {/* Follower Toggle (Member) */}
                <button
                  type="button"
                  data-testid="band-sync-follow-btn"
                  onClick={() => {
                    const next = !state.isLockedToLeader;
                    state.setIsLockedToLeader(next);
                    if (next) state.setIsBroadcasting(false);
                  }}
                  className="btn-smooth"
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    background: state.isLockedToLeader
                      ? 'rgba(59, 130, 246, 0.16)'
                      : 'var(--surface-container-low, rgba(255, 255, 255, 0.06))',
                    border: `1px solid ${state.isLockedToLeader ? 'rgba(59, 130, 246, 0.4)' : 'var(--c-border, transparent)'}`,
                    color: state.isLockedToLeader ? '#60a5fa' : 'var(--c-text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    link
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>
                    {state.isLockedToLeader ? 'Locked to Leader' : 'Follow Leader'}
                  </span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>Band member</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 5. VIEW & TELEPROMPTER OPTIONS ─────────────────────── */}
          {isTeleprompterMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Font Family */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Font Style
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'studio', label: 'Studio' },
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serif' },
                    { id: 'mono', label: 'Mono' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setTeleprompterFontFamily(font.id as TeleprompterFontFamily)}
                      className="btn-smooth"
                      style={{
                        padding: '10px 4px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterFontFamily === font.id
                            ? `${accent.from}22`
                            : 'var(--surface-container-low, rgba(255,255,255,0.06))',
                        border: `1px solid ${teleprompterFontFamily === font.id ? accent.from + '66' : 'var(--c-border, transparent)'}`,
                        color: teleprompterFontFamily === font.id ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily:
                          font.id === 'mono'
                            ? 'var(--studio-font-mono, monospace)'
                            : font.id === 'serif'
                              ? 'Georgia, serif'
                              : 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Font Size
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['normal', 'large', 'huge'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeleprompterFontSize(size)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterFontSize === size
                            ? `${accent.from}22`
                            : 'var(--surface-container-low, rgba(255,255,255,0.06))',
                        border: `1px solid ${teleprompterFontSize === size ? accent.from + '66' : 'var(--c-border, transparent)'}`,
                        color: teleprompterFontSize === size ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Line Spacing
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['compact', 'normal', 'relaxed'] as const).map((spacing) => (
                    <button
                      key={spacing}
                      onClick={() => setTeleprompterLineHeight(spacing)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterLineHeight === spacing
                            ? `${accent.from}22`
                            : 'var(--surface-container-low, rgba(255,255,255,0.06))',
                        border: `1px solid ${teleprompterLineHeight === spacing ? accent.from + '66' : 'var(--c-border, transparent)'}`,
                        color: teleprompterLineHeight === spacing ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {spacing}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Alignment
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['left', 'center'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTeleprompterAlignment(align)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterAlignment === align
                            ? `${accent.from}22`
                            : 'var(--surface-container-low, rgba(255,255,255,0.06))',
                        border: `1px solid ${teleprompterAlignment === align ? accent.from + '66' : 'var(--c-border, transparent)'}`,
                        color: teleprompterAlignment === align ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Mirror Mode */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <div>
                  <p
                    style={{
                      color: 'var(--c-text-primary)',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    Hardware Mirror Mode
                  </p>
                  <p
                    style={{
                      color: 'var(--c-text-secondary)',
                      fontFamily: 'Inter',
                      fontSize: '11px',
                      marginTop: '2px',
                    }}
                  >
                    Horizontal flip for beam splitter glass
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeleprompterMirror((m: boolean) => !m)}
                  className="btn-smooth"
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '9999px',
                    background: teleprompterMirror
                      ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                      : 'var(--surface-container-high, rgba(255,255,255,0.12))',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 300ms ease',
                    boxShadow: teleprompterMirror ? `0 2px 10px ${accent.to}44` : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: teleprompterMirror ? '23px' : '3px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p
                  style={{
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  Surrounding Chords
                </p>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    marginTop: '2px',
                  }}
                >
                  Show prev / next at the sides
                </p>
              </div>
              <button
                onClick={() => setShowContext((c: boolean) => !c)}
                className="btn-smooth"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '9999px',
                  background: showContext
                    ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                    : 'var(--surface-container-high, rgba(255,255,255,0.12))',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 300ms ease',
                  boxShadow: showContext ? `0 2px 10px ${accent.to}44` : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: showContext ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);
}
