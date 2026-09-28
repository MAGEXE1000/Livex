import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveDiagram, MiniLiveDiagram } from './LiveDiagrams';
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
  getChordById,
  type LyricTextSpan,
  type GuitarChordData,
  formatDurationMmSs,
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

.karaoke-word {
  display: inline-block;
  color: var(--c-text-secondary, #94a3b8);
  font-family: var(--studio-font-body, "Inter Tight", sans-serif);
  letter-spacing: -0.015em;
  transform-origin: left center;
  transition: color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
              transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
              filter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Active Word in Sung Focus (Apple Music lyric aesthetic) */
.chord-cell.active .karaoke-word,
.lyric-word.word-active {
  color: var(--c-text-primary, #0f172a) !important;
  font-weight: 800 !important;
  transform: scale(1.06) translateY(-1px);
  filter: drop-shadow(0 2px 10px rgba(37, 99, 235, 0.35));
}

/* Active Chord Highlight */
.chord-cell.active .chord-tag {
  color: var(--c-primary, #2563eb) !important;
  font-weight: 800;
  transform: translateY(-2px);
}

/* Passed words in current/prior context */
.chord-cell.passed .karaoke-word,
.lyric-word.word-past {
  color: var(--c-text-primary, #334155);
  font-weight: 600;
  opacity: 0.95;
}
.chord-cell.passed .chord-tag {
  color: var(--c-primary, #3b82f6);
}

/* Upcoming words */
.lyric-word.word-upcoming {
  color: var(--c-text-secondary, #94a3b8);
  opacity: 0.55;
  font-weight: 500;
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

  const isPaced = Boolean(state.timingSchedule?.isDurationPaced);
  const durationText = isPaced
    ? `${formatDurationMmSs(Math.round(state.elapsedMs / 1000))} / ${formatDurationMmSs(Math.round(state.timingSchedule.effectiveDurationMs / 1000))}`
    : `${formatDurationMmSs(Math.round(state.timingSchedule.effectiveDurationMs / 1000))}`;

  const durationBadge = (
    <span
      data-testid="live-header-duration"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: isPaced ? '1px 5px' : '0',
        borderRadius: '5px',
        background: isPaced ? `${accent.from}22` : 'transparent',
        color: isPaced ? accent.from : 'inherit',
        fontWeight: isPaced ? 700 : 'inherit',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
        timer
      </span>
      {durationText}
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
          <span>{bpmOverride} BPM</span>
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
          <span>{bpmOverride} BPM</span>
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
        <span>{bpmOverride} BPM</span>
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
          width: '100%',
          flexShrink: 0,
          position: 'relative',
          zIndex: 100,
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 8px)',
          paddingBottom: '8px',
          paddingLeft: '16px',
          paddingRight: '16px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-topbar-bg, rgba(19, 19, 24, 0.85))',
          backdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
          WebkitBackdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
          borderBottom: 'var(--surface-topbar-border, 1px solid rgba(255, 255, 255, 0.08))',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Back button */}
        <button
          type="button"
          data-testid="live-mode-back-btn"
          onClick={handleClose}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--c-text-primary, #ffffff)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title="Exit Live Mode"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
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
            padding: '0 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
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
                fontSize: '16px',
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

        {/* Right: Settings button */}
        <button
          type="button"
          data-testid="live-topbar-settings-btn"
          onClick={() => setShowSettings(true)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--c-text-primary, #ffffff)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title="Song Live Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            tune
          </span>
        </button>
      </header>
    </>
  );
}

/* ── HERO STAGE CHORD CARD (Stitch Section 3) ──────────────────── */
export function StageChordCard({
  chord,
  accent,
  visualStyle = 'both',
  onPlay,
}: {
  chord: any;
  accent: { from: string; to: string };
  visualStyle?: VisualStyle;
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
        className="relative flex flex-col items-center w-full max-w-xs mx-auto py-5 px-6 rounded-3xl cursor-pointer select-none transition-transform active:scale-98"
        style={{
          background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
          border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.1))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
        title="Tap to hear chord"
      >
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className="text-5xl sm:text-6xl font-extrabold tracking-tight"
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
              className="text-3xl sm:text-4xl font-bold opacity-85"
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

  const { frets, baseFret } = chord.guitar;
  const allPositive = frets.filter((f: number) => f > 0);
  const minActive = allPositive.length ? Math.min(...allPositive) : 1;
  const minF = baseFret > 1 ? baseFret : Math.max(1, minActive);
  const isNutOpen = minF <= 1;

  const stringIndicators = frets.map((f: number) => {
    if (f === -1) return { text: '✕', isMuted: true, isOpen: false };
    if (f === 0) return { text: '○', isMuted: false, isOpen: true };
    return { text: String(f), isMuted: false, isOpen: false };
  });

  const numFrets = 4;
  const numStrings = 6;

  return (
    <div
      onClick={onPlay}
      data-testid="stage-chord-card"
      data-visual-style={visualStyle}
      className="relative flex flex-col items-center w-full max-w-xs mx-auto p-4 rounded-3xl cursor-pointer select-none transition-transform active:scale-98"
      style={{
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
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            style={{
              fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
              color: accent.from,
            }}
          >
            {root}
          </span>
          {suffix && (
            <span
              className="text-2xl sm:text-3xl font-bold opacity-80"
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
          className="flex items-center gap-1 mb-2 px-2.5 py-0.5 rounded-full"
          style={{ background: `${accent.from}1a` }}
        >
          <span
            className="text-base font-extrabold tracking-tight"
            style={{
              fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
              color: accent.from,
            }}
          >
            {chordName}
          </span>
        </div>
      )}

      {/* String Top Indicators */}
      <div className="w-full flex justify-between px-2 mb-1">
        {stringIndicators.map((ind: any, i: number) => (
          <span
            key={i}
            className="w-6 text-center text-xs font-bold"
            style={{
              color: ind.isMuted
                ? '#ef4444'
                : ind.isOpen
                ? accent.from
                : 'var(--c-text-secondary)',
              fontWeight: ind.isOpen ? 800 : 700,
            }}
          >
            {ind.text}
          </span>
        ))}
      </div>

      {/* Fretboard SVG / Matrix */}
      <div className="relative w-full h-36 px-2">
        {isNutOpen && (
          <div
            className="absolute top-0 left-2 right-2 h-1 rounded-sm"
            style={{ background: 'var(--c-text-secondary, #94a3b8)', opacity: 0.8 }}
          />
        )}

        {/* Horizontal fret wires */}
        <div className="absolute inset-x-2 inset-y-0 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: numFrets + 1 }).map((_, fIdx) => (
            <div
              key={fIdx}
              className="w-full h-px"
              style={{ background: 'var(--surface-topbar-border, rgba(255,255,255,0.15))' }}
            />
          ))}
        </div>

        {/* Vertical string wires */}
        <div className="absolute inset-x-2 inset-y-0 flex justify-between pointer-events-none px-3">
          {Array.from({ length: numStrings }).map((_, sIdx) => (
            <div
              key={sIdx}
              className="h-full"
              style={{
                background: 'var(--surface-topbar-border, rgba(255,255,255,0.2))',
                width: sIdx === 0 || sIdx === 1 ? '1.5px' : '1px',
              }}
            />
          ))}
        </div>

        {/* Dynamic Position Dots */}
        <div className="absolute inset-x-2 inset-y-0 pointer-events-none px-3">
          {frets.map((f: number, si: number) => {
            if (f <= 0) return null;
            const fp = f - minF;
            if (fp < 0 || fp >= numFrets) return null;
            const leftPct = (si / (numStrings - 1)) * 100;
            const topPct = ((fp + 0.5) / numFrets) * 100;
            const noteName =
              chord.notes && chord.notes[si % chord.notes.length]
                ? chord.notes[si % chord.notes.length]
                : '';

            return (
              <div
                key={si}
                className="fret-dot absolute flex items-center justify-center rounded-full text-white text-[10px] font-bold shadow-md"
                style={{
                  width: '24px',
                  height: '24px',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  boxShadow: `0 2px 10px ${accent.from}66`,
                }}
              >
                {noteName}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fret Position Numbering Side Label */}
      <div className="w-full flex justify-between items-center px-2 pt-2 text-[11px] font-semibold opacity-60">
        <span>{isNutOpen ? 'Nut (Open)' : `Fret ${minF}`}</span>
        <span>{isNutOpen ? 'Fret 3' : `Fret ${minF + 3}`}</span>
      </div>
    </div>
  );
}

/* ── MODE 1: CHORDS LIVE VIEW (Stitch Section 1) ───────────────── */
export function ChordsLiveView({ state }: { state: LiveModeState }) {
  const {
    shownChord,
    nextChord,
    accent,
    shownIdx,
    sectionLabels,
    chords,
    currentIdx,
    total,
    autoPlay,
    setAutoPlay,
    goNext,
    goPrev,
    setDirection,
    setCurrentIdx,
    playChordSound,
    chordStyle,
    setShowSettings,
    showQuickActions,
    setShowQuickActions,
    bpmOverride,
    setBpmOverride,
    displayMode,
    setDisplayMode,
  } = state;

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '20px 20px 100px',
      }}
    >
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-3xl"
          style={{ background: `${accent.from}12` }}
        />
        <div
          className="absolute bottom-10 left-1/4 w-[380px] h-[280px] rounded-full blur-2xl"
          style={{ background: `${accent.to}18` }}
        />
      </div>

      {/* Centered Chord Display */}
      <div
        style={{
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '540px',
          width: '100%',
          ...chordStyle,
        }}
      >
        {/* Section Label */}
        {sectionLabels[shownIdx] && (
          <span
            style={{
              padding: '3px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: accent.from,
              background: `${accent.from}22`,
              border: `1px solid ${accent.from}44`,
              marginBottom: '10px',
            }}
          >
            {sectionLabels[shownIdx]}
          </span>
        )}

        {/* Hero Chord Name */}
        <h1
          style={{
            fontFamily: 'var(--studio-font-display, "Inter Tight", sans-serif)',
            fontSize: 'clamp(56px, 12vw, 84px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: 'var(--c-text-primary)',
            textShadow: `0 0 24px ${accent.from}33`,
            margin: '0 0 10px 0',
            textAlign: 'center',
          }}
        >
          {shownChord ? shownChord.name.replace(/\s/g, '') : '—'}
        </h1>

        {/* Notes Breakdown Pills */}
        {shownChord?.notes && shownChord.notes.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            {shownChord.notes.map((n: string, i: number) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'var(--surface-container-low, rgba(255,255,255,0.06))',
                    border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.1))',
                    color: 'var(--c-text-primary)',
                  }}
                >
                  {n}
                </span>
                {i < shownChord.notes.length - 1 && (
                  <span style={{ color: 'var(--c-text-secondary)', opacity: 0.5, fontWeight: 'bold' }}>
                    •
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Fretboard Area + Next Chord Cue */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '380px',
            minHeight: '230px',
          }}
        >
          {/* Position label on left */}
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '40px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--c-text-secondary)',
              opacity: 0.7,
            }}
          >
            {shownChord?.guitar?.baseFret && shownChord.guitar.baseFret > 1
              ? `${shownChord.guitar.baseFret}fr`
              : '1fr'}
          </div>

          {/* Main Diagram */}
          <div
            onClick={() => playChordSound(shownChord?.guitar)}
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            title="Tap to hear chord"
          >
            {shownChord?.guitar ? (
              <LiveDiagram
                data={shownChord.guitar}
                accentFrom={accent.from}
                accentTo={accent.to}
              />
            ) : (
              <div
                style={{
                  width: 200,
                  height: 230,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-text-secondary)',
                }}
              >
                No diagram
              </div>
            )}
          </div>

          {/* Next Chord Cue to the Right */}
          {nextChord && (
            <button
              type="button"
              onClick={goNext}
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 6px',
                borderRadius: '16px',
                background: 'var(--surface-container-low, rgba(255,255,255,0.04))',
                border: '1px solid var(--surface-topbar-border, rgba(255,255,255,0.08))',
                cursor: 'pointer',
              }}
              title="Next Chord"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: accent.from }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>
                  Next
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  chevron_right
                </span>
              </div>
              {nextChord.guitar && (
                <div style={{ transform: 'scale(0.85)', margin: '-4px 0' }}>
                  <MiniLiveDiagram
                    data={nextChord.guitar}
                    accentFrom={accent.from}
                    width={56}
                    height={64}
                  />
                </div>
              )}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: accent.from,
                  background: `${accent.from}22`,
                  border: `1px solid ${accent.from}44`,
                }}
              >
                {nextChord.name.replace(/\s/g, '')}
              </span>
            </button>
          )}
        </div>

        {/* Carousel Pagination Dots */}
        {total <= 16 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '20px',
            }}
          >
            {chords.map((_, i) => {
              const isActive = i === currentIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDirection(i > currentIdx ? 'forward' : 'backward');
                    setCurrentIdx(i);
                    playChordSound(getChordById(chords[i])?.guitar);
                  }}
                  style={{
                    width: isActive ? '22px' : '7px',
                    height: '7px',
                    borderRadius: '9999px',
                    background: isActive
                      ? accent.from
                      : 'var(--surface-topbar-border, rgba(255,255,255,0.2))',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: isActive ? `0 0 8px ${accent.from}88` : 'none',
                  }}
                />
              );
            })}
          </div>
        )}
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
            {/* BPM Adjuster */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setBpmOverride((b: number) => Math.max(20, b - 1))}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Decrease BPM"
                aria-label="Decrease BPM"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
              </button>
              <span style={{ fontSize: '11px', fontWeight: 800, color: accent.from, minWidth: '48px', textAlign: 'center' }}>
                {bpmOverride} BPM
              </span>
              <button
                type="button"
                onClick={() => setBpmOverride((b: number) => Math.min(300, b + 1))}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Increase BPM"
                aria-label="Increase BPM"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              </button>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'var(--surface-topbar-border)' }} />

            {/* Display Style Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setDisplayMode('chords_both')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: displayMode === 'chords_both' ? accent.from : 'var(--c-text-secondary)',
                  background: displayMode === 'chords_both' ? `${accent.from}22` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Both Diagram and Name"
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('chords_diagram')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: displayMode === 'chords_diagram' ? accent.from : 'var(--c-text-secondary)',
                  background: displayMode === 'chords_diagram' ? `${accent.from}22` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Diagram Only"
              >
                Diagram
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('chords_name')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: displayMode === 'chords_name' ? accent.from : 'var(--c-text-secondary)',
                  background: displayMode === 'chords_name' ? `${accent.from}22` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Name Only"
              >
                Name
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Symmetrical Bottom Transport Bar */}
      <footer
        style={{
          position: 'fixed',
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'var(--surface-topbar-bg)',
          border: 'var(--surface-topbar-border)',
          backdropFilter: 'var(--surface-topbar-backdrop)',
          WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
          boxShadow: 'var(--surface-topbar-shadow)',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          data-testid="chords-live-settings-btn"
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
          onClick={goPrev}
          disabled={currentIdx === 0}
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
            opacity: currentIdx === 0 ? 0.3 : 1,
            cursor: currentIdx === 0 ? 'default' : 'pointer',
          }}
          title="Previous Chord"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            skip_previous
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAutoPlay((a) => !a)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            color: '#fff',
            fontWeight: 800,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            background: autoPlay
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            boxShadow: autoPlay
              ? '0 4px 16px rgba(34, 197, 94, 0.4)'
              : `0 4px 16px ${accent.from}55`,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {autoPlay ? 'pause' : 'play_arrow'}
          </span>
          <span>{autoPlay ? 'Pause' : 'Auto'}</span>
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={currentIdx >= total - 1 && !autoPlay}
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
            opacity: currentIdx >= total - 1 && !autoPlay ? 0.3 : 1,
            cursor: currentIdx >= total - 1 && !autoPlay ? 'default' : 'pointer',
          }}
          title="Next Chord"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            skip_next
          </span>
        </button>

        <button
          type="button"
          data-testid="chords-live-preferences-btn"
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
          padding: '16px 24px calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 120px)',
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
                background: isActive
                  ? `color-mix(in srgb, ${accent.from} 12%, rgba(255,255,255,0.03))`
                  : 'transparent',
                borderLeft: isActive ? `4px solid ${accent.from}` : '4px solid transparent',
                boxShadow: isActive
                  ? `0 0 24px ${accent.from}1a, inset 0 0 12px ${accent.from}0d`
                  : 'none',
                opacity: isActive ? 1 : isPast ? 0.42 : 0.75,
                transition:
                  'background 250ms ease, opacity 250ms ease, transform 250ms ease, border-color 250ms ease',
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

              {/* Line Words & Chords */}
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
                    const isWordActive = w.globalWordIdx === currentWordIdx;
                    const isWordPassed = w.globalWordIdx < currentWordIdx;

                    return (
                      <div
                        key={w.id}
                        className={`chord-cell ${isWordActive ? 'active' : isWordPassed ? 'passed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentWordIdx(w.globalWordIdx);
                        }}
                      >
                        <span
                          className="chord-tag"
                          style={{
                            fontSize: fontSizes.chord,
                            color: isWordActive
                              ? accent.from
                              : isWordPassed
                              ? `${accent.from}dd`
                              : 'var(--c-text-secondary)',
                          }}
                        >
                          {w.chord || '\u00A0'}
                        </span>
                        <span
                          className="karaoke-word"
                          style={{
                            fontFamily: resolvedFontFamily,
                            fontSize: fontSizes.text,
                            fontWeight: isWordActive ? 800 : 600,
                          }}
                        >
                          {w.text}&nbsp;
                        </span>
                      </div>
                    );
                  })
                ) : (
                  item.words.map((w) => {
                    const isWordActive = w.globalWordIdx === currentWordIdx;
                    const isWordPassed = w.globalWordIdx < currentWordIdx;

                    return (
                      <span
                        key={w.id}
                        className={`karaoke-word ${
                          isWordActive ? 'active' : isWordPassed ? 'passed' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentWordIdx(w.globalWordIdx);
                        }}
                        style={{
                          fontFamily: resolvedFontFamily,
                          fontSize: fontSizes.text,
                          fontWeight: isWordActive ? 800 : 600,
                          color: isWordActive
                            ? 'var(--c-text-primary)'
                            : isWordPassed
                            ? 'var(--c-text-primary)'
                            : 'var(--c-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {w.text}&nbsp;
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preferences / Quick Controls HUD Bar (Anchored directly above Bottom Transport Dock) */}
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
              {compatibleModes.includes('lyrics_chord_name') && (
                <button
                  type="button"
                  onClick={() => {
                    if (displayMode === 'lyrics_only') setDisplayMode('lyrics_chord_name');
                    else setDisplayMode('lyrics_only');
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: displayMode === 'lyrics_chord_name' ? accent.from : 'var(--c-text-secondary)',
                    background: displayMode === 'lyrics_chord_name' ? `${accent.from}22` : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  title="Toggle Chords above Lyrics"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    grid_view
                  </span>
                </button>
              )}
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

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 100px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Hero Stage Chord Card */}
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 1, marginTop: '8px' }}>
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
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          margin: '20px 0',
          zIndex: 1,
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
            BAR {currentBar} / BEAT {currentBeat + 1}
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
          {currentLine?.words && currentLine.words.length > 0 ? (
            currentLine.words.map((w) => {
              const isWordActive = w.globalWordIdx === currentWordIdx;
              const isWordPassed = w.globalWordIdx < currentWordIdx;

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
                    fontWeight: isWordActive ? 800 : isWordPassed ? 600 : 500,
                    color: isWordActive
                      ? accent.from
                      : isWordPassed
                      ? 'var(--c-text-primary)'
                      : 'var(--c-text-secondary)',
                    cursor: 'pointer',
                  }}
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
                color: 'var(--c-text-secondary)',
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
    hasChords,
    hasLyrics,
    isTeleprompterMode,
    accent,
  } = state;

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
          background: '#131318',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          zIndex: 95,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.85)',
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
            background: 'rgba(255, 255, 255, 0.2)',
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
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
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
                      background: isSelected ? `${accent.from}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'rgba(255,255,255,0.08)'}`,
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
                        color: isSelected ? accent.from : '#acabaa',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? '#ffffff' : '#888888',
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
                      background: isSelected ? `${accent.from}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'rgba(255,255,255,0.08)'}`,
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
                        color: isSelected ? accent.from : '#acabaa',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? '#ffffff' : '#888888',
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

          {/* ── 3. SPEED & TEMPO ─────────────────────────────────── */}
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
                Speed
              </p>
              <p
                style={{
                  color: accent.from,
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {bpmOverride} BPM
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                aria-label="Decrease BPM"
                onClick={() => setBpmOverride((b: number) => Math.max(20, b - 1))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: 'none',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  remove
                </span>
              </button>
              <ElasticSlider
                min={20}
                max={300}
                step={1}
                value={bpmOverride}
                onChange={setBpmOverride as any}
                accentColor={accent.from}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                aria-label="Increase BPM"
                onClick={() => setBpmOverride((b: number) => Math.min(300, b + 1))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: 'none',
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

          {/* ── 4. PACING (BEATS PER CHORD OR LINE) ──────────────── */}
          <div>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '10px',
              }}
            >
              {isTeleprompterMode ? 'Beats Per Line (Auto-Scroll)' : 'Beats Per Chord'}
            </p>
            {isTeleprompterMode ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {[2, 4, 8, 16].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBeatsPerLine(b)}
                    className="btn-smooth"
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '0.75rem',
                      background:
                        beatsPerLine === b
                          ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                          : 'rgba(255,255,255,0.06)',
                      color: beatsPerLine === b ? '#fff' : '#acabaa',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      boxShadow: beatsPerLine === b ? `0 2px 12px ${accent.to}44` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 4, 8].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBeatsPerChord(b as any)}
                    className="btn-smooth"
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '0.75rem',
                      background:
                        beatsPerChord === b
                          ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                          : 'rgba(255,255,255,0.06)',
                      color: beatsPerChord === b ? '#fff' : '#acabaa',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: '14px',
                      border: 'none',
                      boxShadow: beatsPerChord === b ? `0 2px 12px ${accent.to}44` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 4b. TARGET SONG DURATION (LIVE PACING) ───────────── */}
          <div
            data-testid="live-settings-duration-card"
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${state.timingSchedule?.isDurationPaced ? accent.from + '44' : 'rgba(255, 255, 255, 0.08)'}`,
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
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  Target Song Duration
                </p>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontSize: '11px',
                    fontFamily: 'Inter',
                    marginTop: '2px',
                  }}
                >
                  {state.timingSchedule?.isDurationPaced
                    ? `Paced to finish in exact duration (effective tempo: ${state.timingSchedule.effectiveBpm} BPM)`
                    : `Auto-calculated from BPM & chords (~${formatDurationMmSs(state.timingSchedule?.effectiveDurationMs / 1000)})`}
                </p>
              </div>
              <span
                data-testid="duration-status-badge"
                style={{
                  padding: '3px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'var(--studio-font-body)',
                  letterSpacing: '0.04em',
                  background: state.timingSchedule?.isDurationPaced ? `${accent.from}22` : 'rgba(255, 255, 255, 0.06)',
                  color: state.timingSchedule?.isDurationPaced ? accent.from : 'var(--c-text-secondary)',
                  border: `1px solid ${state.timingSchedule?.isDurationPaced ? accent.from + '44' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
              >
                {state.timingSchedule?.isDurationPaced ? 'PACED' : 'AUTO'}
              </span>
            </div>

            {/* Stepper + Display Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                aria-label="Decrease target duration"
                data-testid="duration-decrease-btn"
                onClick={() => {
                  const current = state.targetDurationSeconds || Math.round(state.timingSchedule.effectiveDurationMs / 1000);
                  const next = Math.max(30, current - 15);
                  state.setTargetDurationSeconds(next);
                }}
                className="btn-smooth"
                style={{
                  width: '42px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                -15s
              </button>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${state.timingSchedule?.isDurationPaced ? accent.from + '66' : 'rgba(255, 255, 255, 0.15)'}`,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    color: state.timingSchedule?.isDurationPaced ? accent.from : 'rgba(255,255,255,0.7)',
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
                    color: state.timingSchedule?.isDurationPaced ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {formatDurationMmSs(
                    state.targetDurationSeconds || Math.round(state.timingSchedule.effectiveDurationMs / 1000)
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginLeft: '2px' }}>
                  {state.targetDurationSeconds ? 'fixed' : 'est'}
                </span>
              </div>

              <button
                type="button"
                aria-label="Increase target duration"
                data-testid="duration-increase-btn"
                onClick={() => {
                  const current = state.targetDurationSeconds || Math.round(state.timingSchedule.effectiveDurationMs / 1000);
                  const next = Math.min(1800, current + 15);
                  state.setTargetDurationSeconds(next);
                }}
                className="btn-smooth"
                style={{
                  width: '42px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
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
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#ffffff' : 'var(--c-text-secondary)',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: 'none',
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
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterFontFamily === font.id ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterFontFamily === font.id ? '#ffffff' : '#acabaa',
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
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterFontSize === size ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterFontSize === size ? '#ffffff' : '#acabaa',
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
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterLineHeight === spacing ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterLineHeight === spacing ? '#ffffff' : '#acabaa',
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
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterAlignment === align ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterAlignment === align ? '#ffffff' : '#acabaa',
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
                      color: '#6b6b6b',
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
                      : 'rgba(255,255,255,0.1)',
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
                    color: '#6b6b6b',
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
                    : 'rgba(255,255,255,0.1)',
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
