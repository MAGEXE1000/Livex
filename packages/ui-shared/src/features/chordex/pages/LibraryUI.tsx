import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  getChordById,
  getRelatedChords,
  playChord,
  stopChordPlayback,
  type GuitarChordData,
  useSettingsStore,
  useT,
  type Instrument,
} from '@workspace/studio-core';
import GuitarDiagram from '../diagrams/GuitarDiagram';
import PianoDiagram from '../diagrams/PianoDiagram';
import FourStringDiagram from '../diagrams/FourStringDiagram';
import { CATEGORIES } from './LibraryCategories';
import { ROOT_NOTES } from './useLibraryState';
import {
  HeroChordRecess,
  CategoryMiniRecess,
  ChordCardMiniRecess,
} from '../components/MiniFretboardRecess';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { Button, ActionButton } from '../../../shared/design-system/buttons';
import { LiquidSwitch } from '../../../shared/design-system/LiquidSwitch';

export function RelatedPlayBtn({
  guitar,
  accent,
  isLight,
}: {
  guitar: GuitarChordData;
  accent?: { from: string; to: string; mid: string };
  isLight?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (playing) {
        stopChordPlayback();
        setPlaying(false);
        return;
      }
      setPlaying(true);
      playChord(guitar);
      setTimeout(() => setPlaying(false), 2800);
    },
    [guitar, playing]
  );

  return (
    <button
      aria-label="Play chord audio"
      onClick={handlePlay}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
      style={{
        background: playing
          ? 'color-mix(in srgb, var(--c-accent-from, #679cff) 25%, transparent)'
          : 'var(--c-surface-high, rgba(255,255,255,0.06))',
        border: '1px solid var(--c-border)',
        cursor: 'pointer',
        padding: 0,
        boxShadow: playing ? 'var(--shadow-control-raised)' : 'var(--shadow-pill)',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '16px',
          color: playing ? 'var(--c-accent-from, #679cff)' : 'var(--c-text-primary)',
          fontVariationSettings: "'FILL' 1",
        }}
      >
        {playing ? 'stop' : 'play_arrow'}
      </span>
    </button>
  );
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getHarmonicDegree(tonic: string, relatedRoot: string, relatedType: string): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const normalize = (n: string) =>
    n
      .toUpperCase()
      .replace('DB', 'C#')
      .replace('EB', 'D#')
      .replace('GB', 'F#')
      .replace('AB', 'G#')
      .replace('BB', 'A#');
  const tIdx = notes.indexOf(normalize(tonic));
  const rIdx = notes.indexOf(normalize(relatedRoot));
  if (tIdx === -1 || rIdx === -1) return '';
  const diff = (rIdx - tIdx + 12) % 12;
  const isMinor =
    relatedType.toLowerCase().includes('minor') || relatedType.toLowerCase().includes('min');
  switch (diff) {
    case 0:
      return isMinor ? 'i' : 'I';
    case 2:
      return isMinor ? 'ii' : 'II';
    case 4:
      return isMinor ? 'iii' : 'III';
    case 5:
      return isMinor ? 'iv' : 'IV';
    case 7:
      return isMinor ? 'v' : 'V';
    case 9:
      return isMinor ? 'vi' : 'VI';
    case 11:
      return isMinor ? 'vii°' : 'VII';
    default:
      return '';
  }
}

export function DetailFretboardDiagram({
  chordData,
  displayMode = 'notes',
  className = '',
}: {
  chordData?: GuitarChordData | null;
  displayMode?: 'notes' | 'intervals';
  className?: string;
}) {
  const frets = chordData?.frets ?? [-1, 3, 2, 0, 1, 0];
  const fingers = chordData?.fingers ?? [];
  const barres = chordData?.barres ?? [];
  const baseFret = chordData?.baseFret ?? 1;

  const positiveFrets = frets.filter((f) => f > 0);
  const minActive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const minFret = baseFret > 1 ? baseFret : Math.max(1, minActive);

  // String x positions (strings 6 to 1: low E to high e)
  const stringX = [28, 64, 100, 136, 172, 208];
  const stringWidths = [2.2, 1.8, 1.5, 1.2, 1.0, 0.8];
  const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];

  // String indicators at top (y = 12)
  const stringIndicators = frets.map((f) => (f === -1 ? '✕' : f === 0 ? '○' : ''));

  // Chromatic note lookup for guitar strings (Standard Tuning)
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STRING_OFFSETS = [4, 9, 2, 7, 11, 4]; // E=4, A=9, D=2, G=7, B=11, e=4

  // Compute finger dots
  const dots: { cx: number; cy: number; label: string }[] = [];
  frets.forEach((fret, sIdx) => {
    if (fret > 0) {
      const relFret = fret - minFret + 1;
      if (relFret >= 1 && relFret <= 4) {
        const cx = stringX[sIdx];
        const cy = 26 + (relFret - 0.5) * 42;
        let label = '';
        if (displayMode === 'intervals') {
          label = fingers[sIdx] ? String(fingers[sIdx]) : String(relFret);
        } else {
          const noteIdx = (STRING_OFFSETS[sIdx] + fret) % 12;
          label = CHROMATIC[noteIdx];
        }
        const stringNum = 6 - sIdx;
        const isBarreCovered = barres.some(
          (b) => b.fret === fret && stringNum >= b.toString && stringNum <= b.fromString
        );
        if (!isBarreCovered) {
          dots.push({ cx, cy, label });
        }
      }
    }
  });

  return (
    <div
      className={`w-full max-w-[270px] select-none ${className}`}
      style={{ color: 'var(--c-text-primary)' }}
      aria-label="Guitar Fretboard Diagram"
      data-purpose="fretboard-diagram"
    >
      {/* String Markers (Nut head: Muted ✕ & Open ○) */}
      <div className="flex justify-between px-[14px] text-xs font-extrabold mb-1">
        {stringIndicators.map((ind, i) => (
          <span
            key={`marker-${i}`}
            className="w-7 text-center leading-none"
            style={{
              color: ind === '✕' ? '#EF4444' : 'var(--c-text-muted, #8A92A6)',
              opacity: ind === '✕' ? 1 : 0.65,
            }}
          >
            {ind}
          </span>
        ))}
      </div>

      {/* Fretboard SVG Surface */}
      <div
        className="w-full rounded-2xl p-2.5 border shadow-inner transition-colors"
        style={{
          backgroundColor: 'var(--c-surface-lowest, #F9F7F5)',
          borderColor: 'var(--c-border, #E7DFD6)',
        }}
      >
        <svg className="w-full" viewBox="0 0 236 218" fill="none">
          {/* Top Nut Bar or Base Fret wire */}
          {minFret <= 1 ? (
            <rect fill="currentColor" opacity="0.8" height="4.5" rx="2" width="186" x="25" y="24" />
          ) : (
            <>
              <line
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1.5"
                x1="25"
                x2="211"
                y1="26"
                y2="26"
              />
              <text fill="currentColor" opacity="0.75" fontSize="11" fontWeight="bold" x="8" y="48">
                {minFret}fr
              </text>
            </>
          )}

          {/* 4 horizontal fret wires */}
          {[68, 110, 152, 194].map((fretY, idx) => (
            <line
              key={`fret-${idx}`}
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="1.2"
              x1="25"
              x2="211"
              y1={fretY}
              y2={fretY}
            />
          ))}

          {/* 6 vertical strings with realistic gauge */}
          {stringX.map((x, i) => (
            <line
              key={`str-${i}`}
              stroke="currentColor"
              strokeOpacity="0.28"
              strokeWidth={stringWidths[i]}
              x1={x}
              x2={x}
              y1="26"
              y2="194"
            />
          ))}

          {/* Barre Bars */}
          {barres.map((barre, bIdx) => {
            const relFret = barre.fret - minFret + 1;
            if (relFret < 1 || relFret > 4) return null;
            const cy = 26 + (relFret - 0.5) * 42;
            const fromX = stringX[6 - barre.fromString];
            const toX = stringX[6 - barre.toString];
            const minX = Math.min(fromX, toX) - 10;
            const maxX = Math.max(fromX, toX) + 10;
            const width = maxX - minX;
            return (
              <g key={`barre-${bIdx}`}>
                <rect
                  x={minX}
                  y={cy - 11}
                  width={width}
                  height="22"
                  rx="11"
                  fill="var(--c-accent-from, #2563EB)"
                  fillOpacity="0.92"
                />
                <circle
                  cx={fromX}
                  cy={cy}
                  r="11"
                  fill="var(--c-accent-from, #2563EB)"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <circle
                  cx={toX}
                  cy={cy}
                  r="11"
                  fill="var(--c-accent-from, #2563EB)"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}

          {/* Finger Dots */}
          {dots.map((d, i) => (
            <g key={`dot-${i}`}>
              <circle
                cx={d.cx}
                cy={d.cy}
                r="12"
                fill="var(--c-accent-from, #2563EB)"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              <text
                x={d.cx}
                y={d.cy + 3.8}
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-headline, sans-serif)' }}
              >
                {d.label}
              </text>
            </g>
          ))}

          {/* String Names at Bottom */}
          {stringNames.map((name, i) => (
            <text
              key={`name-${i}`}
              x={stringX[i]}
              y="211"
              fill="currentColor"
              fillOpacity="0.45"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              {name}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function LibraryChordDetail({
  state,
  isDefaultPreview = false,
  onBack,
  inModal = false,
}: {
  state: any;
  isDefaultPreview?: boolean;
  onBack?: () => void;
  inModal?: boolean;
}) {
  const {
    chord,
    favorites,
    settings,
    toggleFavorite,
    addToProgression,
    chordPlaying,
    setChordPlaying,
    handleChordClick,
    accent,
    isLight,
    previewInstrument,
    setPreviewInstrument,
    diagramDisplayMode,
    setDiagramDisplayMode,
    selectChord,
    isWebDesktop,
  } = state;
  const t = useT();

  const relatedChords = useMemo(() => (chord ? getRelatedChords(chord) : []), [chord]);

  if (!chord) return null;
  const favorite = favorites.includes(chord.id);
  const notesStr = chord.notes.join(' · ');
  const chordQuality = `${chord.type ? capitalize(chord.type) : 'Major'} Triad`;

  const activeInstrument: Instrument = previewInstrument || settings.instrument || 'guitar';
  const baseFret = chord.guitar?.baseFret ?? 1;
  const positionText = `${capitalize(activeInstrument)} · ${baseFret > 1 ? `Fret ${baseFret}` : 'Open Position'}`;

  const handlePlayChord = () => {
    if (!chord) return;
    if (chordPlaying) {
      stopChordPlayback();
      setChordPlaying(false);
      return;
    }
    setChordPlaying(true);
    playChord(chord.guitar);
    setTimeout(() => setChordPlaying(false), 2800);
  };

  const handleBack = onBack || (() => selectChord(null));

  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      style={{ background: inModal ? 'transparent' : 'var(--app-bg)' }}
      data-purpose="chord-detail-screen"
    >
      {!inModal && (
        <SharedFloatingHeader
          title={`${chord.name} ${chord.type ? capitalize(chord.type) : ''}`}
          onBack={!isWebDesktop ? handleBack : undefined}
          hideBack={isWebDesktop}
          backBtnTestId="chord-detail-back-btn"
          isLight={isLight}
        />
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar w-full h-full"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          touchAction: 'pan-y',
        }}
      >
        <div
          className={`w-full max-w-md mx-auto ${inModal ? 'pb-6 px-3 space-y-4' : 'pb-28 px-4 space-y-5'}`}
          style={{
            paddingTop: inModal
              ? '8px'
              : 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 78px)',
          }}
          data-purpose="mobile-viewport"
        >
          {/* ACTIVE CHORD HERO CARD */}
          <section
            className="rounded-3xl p-5 border shadow-soft-card relative overflow-hidden transition-colors"
            style={{
              backgroundColor: 'var(--surface-card-bg, #ffffff)',
              borderColor: 'var(--c-border, #E3E6EB)',
            }}
            data-purpose="chord-detail-card"
          >
            {/* Top Header Row Inside Card */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase mb-1"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--c-accent-from, #2563EB) 22%, transparent)',
                    color: 'var(--c-accent-from, #2563EB)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--c-accent-from, #2563EB)' }}
                  />
                  <span>{positionText}</span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <h2
                    data-purpose="chord-symbol"
                    className="text-4xl font-extrabold tracking-tight leading-none"
                    style={{
                      fontFamily: 'var(--font-headline)',
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    {chord.name}
                  </h2>
                  <span
                    data-purpose="chord-quality"
                    className="text-sm font-semibold"
                    style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                  >
                    {chordQuality}
                  </span>
                </div>

                <p
                  data-purpose="chord-notes"
                  className="text-xs font-medium mt-1.5 tracking-wide"
                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                >
                  Notes:{' '}
                  <span className="font-bold" style={{ color: 'var(--c-text-primary)' }}>
                    {notesStr}
                  </span>
                </p>
              </div>

              {/* Quick Action Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePlayChord}
                  data-purpose="chord-playback-button"
                  aria-label={chordPlaying ? 'Stop Audio' : `Play ${chord.name} Chord`}
                  className="w-11 h-11 rounded-full text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
                  style={{
                    backgroundColor: 'var(--c-accent-from, #2563EB)',
                    boxShadow:
                      '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)',
                  }}
                >
                  <span className="material-symbols-rounded text-2xl">
                    {chordPlaying ? 'stop' : 'play_arrow'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => addToProgression(chord.id)}
                  data-purpose="chord-add-button"
                  aria-label="Add to progression"
                  className="w-11 h-11 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--btn-surface-bg, var(--c-surface-low, #F3F4F7))',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-primary)',
                  }}
                >
                  <span className="material-symbols-rounded text-xl">add</span>
                </button>
              </div>
            </div>

            {/* Segmented Controls: Instrument & View Mode */}
            <div
              className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2"
              style={{ borderColor: 'var(--c-border, #E3E6EB)' }}
            >
              {/* Instrument switch */}
              <div
                className="p-0.5 rounded-full flex text-xs font-semibold border"
                style={{
                  backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
                data-purpose="instrument-switch"
              >
                {(['guitar', 'piano'] as Instrument[]).map((inst) => {
                  const isActive = activeInstrument === inst;
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => setPreviewInstrument(inst)}
                      className="px-3 py-1 rounded-full capitalize transition-all cursor-pointer"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--surface-card-bg, #ffffff)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--c-accent-from, #2563EB)'
                          : 'var(--c-text-secondary, #6B7280)',
                        boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>

              {/* Display Mode Switch (Notes / Intervals) */}
              {activeInstrument === 'guitar' && (
                <div className="flex items-center gap-2" data-purpose="display-mode-switch">
                  <LiquidSwitch
                    size="sm"
                    label={diagramDisplayMode === 'intervals' ? 'Intervals' : 'Notes'}
                    checked={diagramDisplayMode === 'intervals'}
                    onChange={(checked) => setDiagramDisplayMode(checked ? 'intervals' : 'notes')}
                    accentFrom="var(--c-accent-from, #f59e0b)"
                    ariaLabel="Toggle between Notes and Intervals display mode"
                  />
                </div>
              )}
            </div>

            {/* High Fidelity Clean Fretboard Diagram */}
            <div className="mt-5 flex flex-col items-center justify-center">
              {activeInstrument === 'guitar' ? (
                <DetailFretboardDiagram chordData={chord.guitar} displayMode={diagramDisplayMode} />
              ) : activeInstrument === 'bass' ? (
                <FourStringDiagram
                  chordData={chord.guitar}
                  chordName={chord.name}
                  notes={chord.notes}
                  intervals={chord.intervals}
                  showNoteNames={diagramDisplayMode === 'notes'}
                  showIntervals={diagramDisplayMode === 'intervals'}
                  size="lg"
                  instrument="bass"
                  fiveString={settings.bassFiveString}
                />
              ) : (
                <PianoDiagram
                  chordData={chord.piano}
                  chordName={chord.name}
                  notes={chord.notes}
                  intervals={chord.intervals}
                  showNoteNames={diagramDisplayMode === 'notes'}
                  showIntervals={diagramDisplayMode === 'intervals'}
                  size="lg"
                />
              )}

              {/* Triad Note Breakdown Pills */}
              <div
                className="flex flex-wrap items-center justify-center gap-2 mt-4"
                data-purpose="triad-note-breakdown"
              >
                {chord.notes.map((note: string, idx: number) => {
                  const isRoot = idx === 0 || note.toUpperCase() === chord.root.toUpperCase();
                  const intervalRaw = chord.intervals?.[idx] || (idx === 0 ? '1' : '');
                  const roleLabel = isRoot
                    ? 'Root'
                    : intervalRaw === '3' || intervalRaw === 'b3'
                      ? '3rd'
                      : intervalRaw === '5' || intervalRaw === 'b5' || intervalRaw === '#5'
                        ? '5th'
                        : intervalRaw === '7' || intervalRaw === 'b7' || intervalRaw === 'maj7'
                          ? '7th'
                          : intervalRaw === '9' || intervalRaw === 'b9'
                            ? '9th'
                            : intervalRaw === '4' || intervalRaw === 'sus4'
                              ? '4th'
                              : intervalRaw === '2' || intervalRaw === 'sus2'
                                ? '2nd'
                                : intervalRaw === '6'
                                  ? '6th'
                                  : intervalRaw || `${idx + 1}`;

                  return (
                    <div
                      key={`${note}-${idx}`}
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all"
                      style={{
                        backgroundColor: isRoot
                          ? 'color-mix(in srgb, var(--c-accent-from, #2563EB) 12%, transparent)'
                          : 'var(--c-surface-lowest, #ECEEF2)',
                        borderColor: isRoot
                          ? 'color-mix(in srgb, var(--c-accent-from, #2563EB) 28%, transparent)'
                          : 'var(--c-border, #E3E6EB)',
                        borderWidth: '1px',
                        color: isRoot
                          ? 'var(--c-accent-from, #2563EB)'
                          : 'var(--c-text-primary, #111827)',
                      }}
                    >
                      <span>{note}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase"
                        style={{
                          backgroundColor: isRoot
                            ? 'var(--c-accent-from, #2563EB)'
                            : 'var(--c-surface-low, #E2E4E8)',
                          color: isRoot ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                        }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RELATED CHORDS SECTION */}
          {relatedChords.length > 0 && (
            <section className="space-y-3" data-purpose="related-chords-section">
              <div className="flex items-center justify-between px-1">
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                >
                  Related in {chord.name} Major Key
                </h3>
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--c-accent-from, #2563EB)' }}
                >
                  {relatedChords.length} Chords
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3" data-purpose="related-chords-grid">
                {relatedChords.slice(0, 4).map((rel) => {
                  const degree = getHarmonicDegree(chord.root, rel.root, rel.type);
                  return (
                    <article
                      key={rel.id}
                      data-chord-id={rel.id}
                      onClick={(e) => handleChordClick(rel.id, e)}
                      className="rounded-3xl p-3.5 border shadow-soft-card flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer group"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                      }}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 pr-1">
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className="text-base font-bold tracking-tight truncate"
                                style={{
                                  fontFamily: 'var(--font-headline)',
                                  color: 'var(--c-text-primary)',
                                }}
                              >
                                {rel.name}
                              </span>
                              {degree && (
                                <span
                                  className="text-[10px] font-semibold"
                                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                                >
                                  {degree}
                                </span>
                              )}
                            </div>
                            <p
                              className="text-[10px] font-medium tracking-wide truncate mt-0.5"
                              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                            >
                              {rel.notes?.join(' · ')}
                            </p>
                          </div>
                          <RelatedPlayBtn guitar={rel.guitar} accent={accent} isLight={isLight} />
                        </div>
                      </div>

                      <div className="flex justify-center pt-1">
                        <ChordCardMiniFretboard chordData={rel.guitar} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChordHeroFretboard({
  chordData,
  className = '',
}: {
  chordData?: GuitarChordData | null;
  className?: string;
}) {
  // Default to C Major frets: [-1, 3, 2, 0, 1, 0]
  const frets = chordData?.frets ?? [-1, 3, 2, 0, 1, 0];
  const baseFret = chordData?.baseFret ?? 1;
  const positiveFrets = frets.filter((f) => f > 0);
  const minActive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const minFret = baseFret > 1 ? baseFret : Math.max(1, minActive);

  // String x positions (strings 6 to 1: low E to high e)
  const stringX = [12, 39, 67, 95, 122, 148];
  // String thicknesses
  const stringWidths = [1.5, 1.3, 1.2, 1.0, 0.9, 0.8];

  // String indicators: ✕ for muted (-1), ◯ for open (0), space for fretted (> 0)
  const stringIndicators = frets.map((f) => (f === -1 ? '✕' : f === 0 ? '◯' : ' '));

  // Compute finger dots
  const dots: { cx: number; cy: number }[] = [];
  frets.forEach((fret, sIdx) => {
    if (fret > 0) {
      const relFret = fret - minFret + 1;
      const cx = stringX[sIdx];
      const cy = relFret === 1 ? 19 : relFret === 2 ? 42 : 68;
      dots.push({ cx, cy });
    }
  });

  return (
    <div
      className={`w-28 p-1.5 rounded-2xl border shrink-0 ${className}`}
      style={{
        backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
        borderColor: 'var(--c-border, #E3E6EB)',
        color: 'var(--c-text-primary)',
      }}
      data-purpose="chord-diagram-container"
    >
      <div className="flex justify-between px-1.5 text-[8px] font-bold mb-0.5 tracking-wider leading-none select-none">
        {stringIndicators.map((ind, i) => (
          <span
            key={i}
            style={{
              color: ind === '✕' ? '#EF4444' : 'var(--c-text-muted, #8A92A6)',
              display: 'inline-block',
              width: '8px',
              textAlign: 'center',
            }}
          >
            {ind}
          </span>
        ))}
      </div>
      <svg
        className="w-full h-14"
        fill="none"
        viewBox="0 0 160 85"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nut at top */}
        <rect fill="currentColor" opacity="0.6" height="3.5" rx="1" width="140" x="10" y="4" />
        {/* 6 strings */}
        {stringX.map((x, i) => (
          <line
            key={`str-${i}`}
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth={stringWidths[i]}
            x1={x}
            x2={x}
            y1="7"
            y2="80"
          />
        ))}
        {/* 3 fret lines */}
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
          x1="10"
          x2="150"
          y1="30"
          y2="30"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
          x1="10"
          x2="150"
          y1="55"
          y2="55"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
          x1="10"
          x2="150"
          y1="80"
          y2="80"
        />
        {/* Finger dots */}
        {dots.map((d, i) => (
          <circle key={`dot-${i}`} cx={d.cx} cy={d.cy} r="6" fill="var(--c-accent-from, #2563EB)" />
        ))}
      </svg>
    </div>
  );
}

export function CategoryMiniFretboard({
  dots = [],
}: {
  dots?: { x?: number; y?: number; stringPercent?: number; fretPercent?: number }[];
}) {
  const mappedDots = dots.map((d) => ({
    cx:
      d.x ??
      (d.stringPercent !== undefined
        ? d.stringPercent <= 25
          ? 10
          : d.stringPercent <= 60
            ? 20
            : 30
        : 20),
    cy: d.y ?? (d.fretPercent !== undefined ? (d.fretPercent <= 45 ? 15 : 25) : 20),
  }));

  return (
    <svg
      className="w-11 h-11 rounded-2xl p-1.5 shrink-0"
      viewBox="0 0 40 40"
      style={{
        backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
        color: 'var(--c-text-primary)',
      }}
      aria-hidden="true"
    >
      <path
        d="M6 10H34M6 20H34M6 30H34M10 6V34M20 6V34M30 6V34"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      {mappedDots.map((dot, idx) => (
        <circle key={idx} cx={dot.cx} cy={dot.cy} r="3.5" fill="var(--c-accent-from, #2563EB)" />
      ))}
    </svg>
  );
}

export function ChordCardMiniFretboard({
  chordData,
  className = '',
}: {
  chordData?: GuitarChordData | null;
  className?: string;
}) {
  const frets = chordData?.frets ?? [-1, 3, 2, 0, 1, 0];
  const barres = chordData?.barres ?? [];
  const baseFret = chordData?.baseFret ?? 1;

  const positiveFrets = frets.filter((f) => f > 0);
  const minActive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const minFret = baseFret > 1 ? baseFret : Math.max(1, minActive);

  // String x positions: 6 to 1 (Low E to high e)
  const stringX = [7, 16, 25, 34, 43, 51];
  const stringWidths = [1.3, 1.2, 1.1, 1.0, 0.9, 0.8];

  // String indicators at top (y = 7)
  const stringIndicators = frets.map((f) => (f === -1 ? '×' : f === 0 ? '○' : ''));

  // Finger dots
  const dots: { cx: number; cy: number }[] = [];
  frets.forEach((fret, sIdx) => {
    if (fret > 0) {
      const relFret = fret - minFret + 1;
      const cy = relFret === 1 ? 20 : relFret === 2 ? 37 : 54;
      const cx = stringX[sIdx];
      const stringNum = 6 - sIdx;
      const isBarreCovered = barres.some(
        (b) => b.fret === fret && stringNum >= b.toString && stringNum <= b.fromString
      );
      if (!isBarreCovered && relFret >= 1 && relFret <= 3) {
        dots.push({ cx, cy });
      }
    }
  });

  return (
    <div
      className={`w-14 h-16 relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ color: 'var(--c-text-primary)' }}
      aria-hidden="true"
    >
      <svg className="w-full h-full" viewBox="0 0 60 70" fill="none">
        {/* String Indicators */}
        {stringIndicators.map((ind, i) => {
          if (!ind) return null;
          return (
            <text
              key={`ind-${i}`}
              fill={ind === '×' ? '#ef4444' : 'currentColor'}
              fillOpacity={ind === '×' ? 1 : 0.45}
              fontSize="7"
              fontWeight="bold"
              textAnchor="middle"
              x={stringX[i]}
              y="7"
            >
              {ind}
            </text>
          );
        })}

        {/* Nut Line or Base Fret label */}
        {minFret <= 1 ? (
          <rect fill="currentColor" opacity="0.65" height="2.5" rx="1" width="44" x="7" y="10" />
        ) : (
          <>
            <text fill="currentColor" opacity="0.65" fontSize="6" fontWeight="bold" x="2" y="21">
              {minFret}fr
            </text>
            <rect fill="currentColor" opacity="0.3" height="1.5" width="44" x="7" y="10" />
          </>
        )}

        {/* 6 strings */}
        {stringX.map((x, i) => (
          <line
            key={`str-${i}`}
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth={stringWidths[i]}
            x1={x}
            x2={x}
            y1="12"
            y2="65"
          />
        ))}

        {/* 3 fret lines */}
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          x1="7"
          x2="51"
          y1="28"
          y2="28"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          x1="7"
          x2="51"
          y1="45"
          y2="45"
        />
        <line
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          x1="7"
          x2="51"
          y1="62"
          y2="62"
        />

        {/* Barre Bars */}
        {barres.map((barre, bIdx) => {
          const relFret = barre.fret - minFret + 1;
          if (relFret < 1 || relFret > 3) return null;
          const y = relFret === 1 ? 16.5 : relFret === 2 ? 33.5 : 50.5;
          const fromX = stringX[6 - barre.fromString];
          const toX = stringX[6 - barre.toString];
          const minX = Math.min(fromX, toX) - 2.5;
          const maxX = Math.max(fromX, toX) + 2.5;
          const width = maxX - minX;
          return (
            <rect
              key={`barre-${bIdx}`}
              x={minX}
              y={y}
              width={width}
              height="7"
              rx="3.5"
              fill="var(--c-accent-from, #2563EB)"
              fillOpacity="0.85"
            />
          );
        })}

        {/* Finger Dots */}
        {dots.map((d, i) => (
          <circle key={`dot-${i}`} cx={d.cx} cy={d.cy} r="4" fill="var(--c-accent-from, #2563EB)" />
        ))}
      </svg>
    </div>
  );
}

const CATEGORY_ROOTS = ['ALL', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function CategoryScreenView({
  activeType,
  setActiveType,
  activeCategoryObject,
  filteredByType,
  selectedRootFilter,
  setSelectedRootFilter,
  categoryQuery,
  setCategoryQuery,
  handleChordClick,
  accent,
  isLight,
  tuning = 'Standard (EADGBE)',
  scrollRef,
}: {
  activeType: string;
  setActiveType: (type: any) => void;
  activeCategoryObject?: any;
  filteredByType: any[];
  selectedRootFilter: string;
  setSelectedRootFilter: (root: string) => void;
  categoryQuery: string;
  setCategoryQuery: (q: string) => void;
  handleChordClick: (id: string, eventOrElement?: any) => void;
  accent?: any;
  isLight?: boolean;
  tuning?: string;
  scrollRef?: any;
}) {
  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      style={{ background: 'var(--app-bg)' }}
      data-purpose="category-screen-container"
    >
      <SharedFloatingHeader
        title={activeCategoryObject?.label || 'Chords'}
        onBack={() => {
          setActiveType(null);
          setCategoryQuery('');
          setSelectedRootFilter('ALL');
        }}
        backBtnTestId="category-back-btn"
        isLight={isLight}
      />

      <div
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar w-full h-full"
        ref={scrollRef}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          touchAction: 'pan-y',
        }}
      >
        <div
          className="w-full max-w-md mx-auto pb-28 px-4 space-y-5"
          style={{
            paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 78px)',
          }}
          data-purpose="mobile-viewport"
        >
          {/* Category-Specific Search Bar */}
          <section className="mb-2" data-purpose="chord-search">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span
                  className="material-symbols-rounded text-[20px]"
                  style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                >
                  search
                </span>
              </div>
              <input
                className="w-full pl-11 pr-10 py-3 rounded-full text-sm font-medium border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{
                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                  color: 'var(--c-text-primary)',
                }}
                placeholder={
                  activeCategoryObject?.label
                    ? `Search ${activeCategoryObject.label} chords (e.g. C, G, D)...`
                    : 'Search chords...'
                }
                type="text"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
              />
              {categoryQuery ? (
                <button
                  type="button"
                  onClick={() => setCategoryQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                  aria-label="Clear category search"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              ) : null}
            </div>
          </section>

          {/* Root Key Filter Pills */}
          <nav
            aria-label="Chord Root Filter"
            className="mb-1 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1"
            data-purpose="root-key-filter-pills"
          >
            {CATEGORY_ROOTS.map((root) => {
              const isSelected = selectedRootFilter.toUpperCase() === root.toUpperCase();
              return (
                <button
                  key={root}
                  type="button"
                  onClick={() => setSelectedRootFilter(root)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 active:scale-95 transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--c-accent-from, #2563EB)'
                      : 'var(--surface-card-bg, #ffffff)',
                    color: isSelected ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                    border: isSelected
                      ? '1px solid transparent'
                      : '1px solid var(--c-border, #E3E6EB)',
                    boxShadow: isSelected
                      ? '0 2px 8px color-mix(in srgb, var(--c-accent-from, #2563EB) 30%, transparent)'
                      : 'none',
                  }}
                >
                  {root}
                </button>
              );
            })}
          </nav>

          {/* Chord Cards Grid or Empty State */}
          {filteredByType.length === 0 ? (
            <div
              className="rounded-3xl p-8 text-center space-y-3 border shadow-soft-card my-4"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
              }}
            >
              <span
                className="material-symbols-rounded text-3xl"
                style={{ color: 'var(--c-text-muted, #8A92A6)' }}
              >
                search_off
              </span>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                No matching {activeCategoryObject?.label || ''} chords found.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryQuery('');
                  setSelectedRootFilter('ALL');
                }}
                className="px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer active:scale-95"
                style={{
                  backgroundColor: 'var(--btn-surface-bg, var(--c-surface-low, #F3F4F7))',
                  color: 'var(--c-text-primary)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <main className="grid grid-cols-2 gap-2.5 sm:gap-3" data-purpose="chord-catalog-grid">
              {filteredByType.map((c: any) => (
                <article
                  key={c.id}
                  data-chord-id={c.id}
                  onClick={(e) => handleChordClick(c.id, e)}
                  className="rounded-3xl p-3.5 border shadow-soft-card flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer group content-auto-row"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-1">
                        <h2
                          className="text-xl font-bold tracking-tight leading-tight truncate"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            color: 'var(--c-text-primary)',
                          }}
                        >
                          {c.name}
                        </h2>
                        <p
                          className="text-[11px] font-medium mt-0.5 tracking-wide truncate"
                          style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                        >
                          {c.notes?.join(' · ')}
                        </p>
                      </div>
                      <ChordCardMiniFretboard chordData={c.guitar} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-1">
                    <span
                      className="text-[9px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md border"
                      style={{
                        color: 'var(--c-accent-from, #2563EB)',
                        backgroundColor:
                          'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
                        borderColor:
                          'color-mix(in srgb, var(--c-accent-from, #2563EB) 20%, transparent)',
                      }}
                    >
                      {c.type?.toUpperCase()}
                    </span>
                    <RelatedPlayBtn guitar={c.guitar} accent={accent} isLight={isLight} />
                  </div>
                </article>
              ))}
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

export function LibraryMainView({ state }: { state: any }) {
  const {
    scrollRef,
    allChords,
    setShowFinder,
    openFinder,
    setShowGenerator,
    query,
    setQuery,
    categoryQuery,
    setCategoryQuery,
    showTuningMenu,
    setShowTuningMenu,
    settings,
    searchResults,
    handleChordClick,
    activeType,
    setActiveType,
    activeCategoryObject,
    filteredByType,
    chordOfTheDay,
    accent,
    isLight,
    recentChords,
    showAllCategories,
    toggleShowAllCategories,
    selectedRootFilter,
    setSelectedRootFilter,
  } = state;
  const [dayChordPlaying, setDayChordPlaying] = useState(false);

  const handlePlayDayChord = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!chordOfTheDay) return;
      if (dayChordPlaying) {
        stopChordPlayback();
        setDayChordPlaying(false);
        return;
      }
      setDayChordPlaying(true);
      playChord(chordOfTheDay.guitar);
      setTimeout(() => setDayChordPlaying(false), 2800);
    },
    [chordOfTheDay, dayChordPlaying]
  );

  // Initial 14 prominent categories or all 31 when expanded
  const visibleCategories = useMemo(() => {
    return showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 14);
  }, [showAllCategories]);

  // Robust recent chords with foundational defaults if history is empty
  const recentChordList = useMemo(() => {
    const list = recentChords
      .slice(0, 8)
      .map((id: string) => getChordById(id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    if (list.length >= 3) return list;
    const fallbackIds = ['C-major', 'a-minor', 'g-dom7', 'e-minor'];
    const fallbacks = fallbackIds
      .map((id) => getChordById(id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    const combined = [...list];
    for (const fb of fallbacks) {
      if (!combined.some((c) => c?.id === fb.id)) {
        combined.push(fb);
      }
    }
    return combined.slice(0, 6);
  }, [recentChords]);

  if (activeType && state.isWebDesktop) {
    return (
      <CategoryScreenView
        activeType={activeType}
        setActiveType={setActiveType}
        activeCategoryObject={activeCategoryObject}
        filteredByType={filteredByType}
        selectedRootFilter={selectedRootFilter}
        setSelectedRootFilter={setSelectedRootFilter}
        categoryQuery={categoryQuery}
        setCategoryQuery={setCategoryQuery}
        handleChordClick={handleChordClick}
        accent={accent}
        isLight={isLight}
        tuning={settings?.tuning}
        scrollRef={scrollRef}
      />
    );
  }

  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      style={{ background: 'var(--app-bg)' }}
      data-purpose="library-main-container"
    >
      <div
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar w-full h-full"
        ref={scrollRef}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          touchAction: 'pan-y',
        }}
        data-purpose="library-scroll-container"
      >
        <main
          className="w-full max-w-md mx-auto pb-32 px-4 pt-3 space-y-6"
          style={{
            paddingTop:
              'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px))',
          }}
          data-purpose="mobile-viewport"
        >
          {/* Canonical Studio Header with Quick Action Tool Shortcuts */}
          <StudioHeader
            title="Library"
            subtitle={`Explore ${allChords.length} Chords`}
            disableHorizontalPadding={true}
            disableTopInset={true}
            actions={
              <div className="flex items-center gap-2">
                {/* Finder Tool */}
                <motion.button
                  type="button"
                  onClick={(e) => (openFinder ? openFinder(e) : setShowFinder(true))}
                  whileTap={{ scale: 0.94 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm touch-target-44 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-primary, #111827)',
                  }}
                  data-purpose="tool-finder"
                >
                  <span
                    className="material-symbols-rounded text-[18px]"
                    style={{ color: 'var(--c-accent-from, #2563EB)' }}
                  >
                    travel_explore
                  </span>
                  <span>Finder</span>
                </motion.button>

                {/* Generator Tool */}
                <motion.button
                  type="button"
                  onClick={() => setShowGenerator(true)}
                  whileTap={{ scale: 0.94 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm touch-target-44 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-primary, #111827)',
                  }}
                  data-purpose="tool-generator"
                  aria-label="Progression Generator"
                >
                  <span
                    className="material-symbols-rounded text-[18px]"
                    style={{ color: 'var(--c-accent-from, #2563EB)' }}
                  >
                    auto_awesome
                  </span>
                  <span>Generator</span>
                </motion.button>
              </div>
            }
          />

          {/* Search Bar */}
          <div className="relative mt-4 flex items-center" data-purpose="search-bar">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span
                className="material-symbols-rounded text-[20px]"
                style={{ color: 'var(--c-text-muted, #8A92A6)' }}
              >
                search
              </span>
            </div>
            <input
              className="w-full pl-11 pr-10 py-3 rounded-full text-sm font-medium border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
                color: 'var(--c-text-primary, #111827)',
              }}
              placeholder="Search chords..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                aria-label="Clear search"
              >
                <span className="material-symbols-rounded text-sm">close</span>
              </button>
            ) : null}
          </div>

          {/* SEARCH RESULTS VIEW */}
          {query ? (
            <section className="space-y-4" data-purpose="search-results-section">
              <div className="flex items-center justify-between">
                <h3
                  className="text-base font-bold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    color: 'var(--c-text-primary, #111827)',
                  }}
                >
                  Search Results ({searchResults.length})
                </h3>
              </div>

              {/* Root note quick filter pills */}
              <div
                className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1"
                style={{ touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
              >
                {ROOT_NOTES.map((root) => {
                  const isSelected = selectedRootFilter === root;
                  return (
                    <button
                      key={root}
                      onClick={() => setSelectedRootFilter(root)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 cursor-pointer"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--c-accent-from, #2563EB)'
                          : 'var(--surface-card-bg, #ffffff)',
                        color: isSelected ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                        border: isSelected
                          ? '1px solid transparent'
                          : '1px solid var(--c-border, #E3E6EB)',
                        boxShadow: isSelected
                          ? 'var(--shadow-control-raised)'
                          : 'var(--shadow-pill)',
                      }}
                    >
                      {root}
                    </button>
                  );
                })}
              </div>

              {searchResults.length === 0 ? (
                <div
                  className="rounded-3xl p-8 text-center space-y-2 border shadow-soft-card"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                >
                  <span
                    className="material-symbols-rounded text-3xl"
                    style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                  >
                    search_off
                  </span>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                  >
                    No matching chords found for &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((c: any) => (
                    <article
                      key={c.id}
                      data-chord-id={c.id}
                      onClick={(e) => handleChordClick(c.id, e)}
                      className="rounded-3xl p-3.5 border shadow-soft-card flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer group content-auto-row"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                      }}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-1">
                            <h4
                              className="text-xl font-bold tracking-tight leading-tight truncate"
                              style={{
                                fontFamily: 'var(--font-headline)',
                                color: 'var(--c-text-primary)',
                              }}
                            >
                              {c.name}
                            </h4>
                            <p
                              className="text-[11px] font-medium mt-0.5 tracking-wide truncate"
                              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                            >
                              {c.notes?.join(' · ')}
                            </p>
                          </div>
                          <ChordCardMiniFretboard chordData={c.guitar} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-1">
                        <span
                          className="text-[9px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md border"
                          style={{
                            color: 'var(--c-accent-from, #2563EB)',
                            backgroundColor:
                              'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
                            borderColor:
                              'color-mix(in srgb, var(--c-accent-from, #2563EB) 20%, transparent)',
                          }}
                        >
                          {c.type?.toUpperCase()}
                        </span>
                        <RelatedPlayBtn guitar={c.guitar} accent={accent} isLight={isLight} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* MAIN LIBRARY DASHBOARD */
            <>
              {/* Chord of the Day Hero Card */}
              {chordOfTheDay && (
                <section className="mb-2" data-purpose="chord-hero-card">
                  <article
                    data-chord-id={chordOfTheDay.id}
                    onClick={(e) => handleChordClick(chordOfTheDay.id, e)}
                    className="relative w-full rounded-3xl p-4 sm:p-5 border shadow-soft-card cursor-pointer active:scale-[0.99] transition-transform"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        {/* Realistic Fretboard Diagram */}
                        <ChordHeroFretboard chordData={chordOfTheDay.guitar} />

                        {/* Chord Title & Quality */}
                        <div>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider block"
                            style={{ color: 'var(--c-accent-from, #2563EB)' }}
                          >
                            Chord of the Day
                          </span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <h2
                              className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none"
                              style={{
                                fontFamily: 'var(--font-headline)',
                                color: 'var(--c-text-primary, #111827)',
                              }}
                            >
                              {chordOfTheDay.root}
                            </h2>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                            >
                              {chordOfTheDay.type.charAt(0).toUpperCase() +
                                chordOfTheDay.type.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Play & Practice Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={
                            dayChordPlaying
                              ? `Stop chord ${chordOfTheDay.name}`
                              : `Play chord ${chordOfTheDay.name} sound`
                          }
                          onClick={handlePlayDayChord}
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--btn-surface-bg, var(--c-surface-low, #F3F4F7))',
                            color: 'var(--c-text-primary)',
                            border: '1px solid var(--c-border, #E3E6EB)',
                          }}
                          type="button"
                        >
                          <span
                            className="material-symbols-rounded filled text-[20px]"
                            style={{
                              color: dayChordPlaying
                                ? 'var(--c-accent-from, #2563EB)'
                                : 'var(--c-text-primary)',
                            }}
                          >
                            {dayChordPlaying ? 'stop' : 'play_arrow'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleChordClick(chordOfTheDay.id, e)}
                          className="px-4 py-2.5 rounded-full border text-xs font-bold tracking-tight flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          style={{
                            backgroundColor: 'var(--btn-surface-bg, var(--c-surface-low, #F3F4F7))',
                            color: 'var(--c-text-primary)',
                            borderColor: 'var(--c-border, #E3E6EB)',
                          }}
                          data-purpose="practice-hero-button"
                          type="button"
                        >
                          <span>Practice</span>
                          <span className="material-symbols-rounded text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </article>
                </section>
              )}

              {/* Recently Practiced Section */}
              {recentChordList.length > 0 && (
                <section className="mb-2" data-purpose="recently-practiced">
                  <h3
                    className="studio-section-heading mb-3 px-0.5"
                    style={{
                      fontFamily: 'var(--type-section-font, var(--studio-font-display))',
                      fontWeight: 'var(--type-section-weight, 700)' as any,
                      fontSize: 'var(--type-section-size, 19px)',
                      lineHeight: 'var(--type-section-lh, 24px)',
                      letterSpacing: 'var(--type-section-tracking, 0.6px)',
                      color: 'var(--c-text-primary, #111827)',
                    }}
                  >
                    Recently Practiced
                  </h3>
                  {/* Horizontal Scrolling List Container */}
                  <div
                    className="flex gap-3 overflow-x-auto no-scrollbar pb-1"
                    style={{ touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
                  >
                    {recentChordList.map((rc: any) => (
                      <div
                        key={rc.id}
                        data-chord-id={rc.id}
                        onClick={(e) => handleChordClick(rc.id, e)}
                        className="min-w-[136px] rounded-3xl p-4 border shadow-soft-card flex flex-col justify-between cursor-pointer active:scale-95 transition-all hover:border-studio-accent/40"
                        style={{
                          backgroundColor: 'var(--surface-card-bg, #ffffff)',
                          borderColor: 'var(--c-border, #E3E6EB)',
                          height: '120px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                          >
                            {rc.type?.toUpperCase()}
                          </span>
                          <span
                            className="material-symbols-rounded text-[16px]"
                            style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                          >
                            history
                          </span>
                        </div>
                        <div
                          className="text-2xl font-black tracking-tight my-0.5"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            color: 'var(--c-text-primary, #111827)',
                          }}
                        >
                          {rc.name}
                        </div>
                        <div
                          className="text-[11px] font-medium tracking-wide truncate"
                          style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                        >
                          {rc.notes?.join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Chord Categories 2-Column Grid */}
              <section className="mb-2" data-purpose="categories-grid-section">
                {/* Section Title & Meta Header */}
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <h3
                    className="studio-section-heading"
                    style={{
                      fontFamily: 'var(--type-section-font, var(--studio-font-display))',
                      fontWeight: 'var(--type-section-weight, 700)' as any,
                      fontSize: 'var(--type-section-size, 19px)',
                      lineHeight: 'var(--type-section-lh, 24px)',
                      letterSpacing: 'var(--type-section-tracking, 0.6px)',
                      color: 'var(--c-text-primary, #111827)',
                    }}
                  >
                    Categories
                  </h3>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                  >
                    {CATEGORIES.length} Harmonic Flavors
                  </span>
                </div>

                {/* Categories 2-Column Responsive Grid */}
                <div
                  className="grid grid-cols-2 gap-3"
                  data-purpose="grid-container"
                  id="category-grid"
                >
                  {visibleCategories.map((cat) => (
                    <div
                      key={cat.type}
                      onClick={() => setActiveType(cat.type)}
                      className="rounded-3xl p-3.5 border shadow-soft-card flex items-center justify-between hover:border-studio-accent/40 active:scale-[0.98] transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                      }}
                    >
                      <div className="min-w-0 pr-1.5">
                        <h4
                          className="text-sm font-bold tracking-tight truncate"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            color: 'var(--c-text-primary, #111827)',
                          }}
                        >
                          {cat.label}
                        </h4>
                        <p
                          className="text-[11px] font-medium mt-0.5 truncate"
                          style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                        >
                          {cat.variations}
                        </p>
                      </div>
                      <CategoryMiniFretboard dots={cat.dots} />
                    </div>
                  ))}
                </div>

                {/* Expand / Show More Toggle Action */}
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={toggleShowAllCategories}
                    className="w-full py-3 rounded-full border text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                      color: 'var(--c-text-primary, #111827)',
                      boxShadow: 'var(--shadow-control-raised)',
                    }}
                    data-purpose="expand-toggle"
                  >
                    <span>
                      {showAllCategories ? 'Show Less' : `Show All ${CATEGORIES.length} Categories`}
                    </span>
                    <span className="material-symbols-rounded text-sm">
                      {showAllCategories ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
