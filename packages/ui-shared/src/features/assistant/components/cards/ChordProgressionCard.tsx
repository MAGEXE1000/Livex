import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  type ChordProgressionRecommendation,
  resolveChordProgression,
  importProgressionToChordex,
  playChord,
  useSettingsStore,
  resolveAccent,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../../shared/icons/StudioIcon';
import ChordDiagram from '../../../chordex/diagrams/ChordDiagram';

export interface ChordProgressionCardProps {
  data: ChordProgressionRecommendation;
  actionLabel?: string;
  onAction?: () => void;
}

export const ChordProgressionCard: React.FC<ChordProgressionCardProps> = ({
  data,
  actionLabel = 'Import to Chordex',
  onAction,
}) => {
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const accentColor = useSettingsStore((s) => s.settings?.accentColor);
  const accent = useMemo(() => resolveAccent(accentColor), [accentColor]);

  // Resolve the progression into canonical Chordex items
  const resolvedProgression = useMemo(() => {
    return resolveChordProgression(data);
  }, [data]);

  // Clean up playback timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, []);

  const handleCopyChords = () => {
    const text = resolvedProgression.chords.map((c) => c.name).join(' - ');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayChord = (index: number) => {
    const chord = resolvedProgression.chords[index];
    if (chord && chord.guitarData) {
      setPlayingIndex(index);
      playChord(chord.guitarData, 0.7);
      setTimeout(() => {
        setPlayingIndex((curr) => (curr === index ? null : curr));
      }, 700);
    }
  };

  const stopProgressionPlayback = () => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setPlayingIndex(null);
  };

  const handleTogglePlayProgression = () => {
    if (playbackTimerRef.current !== null || playingIndex !== null) {
      stopProgressionPlayback();
      return;
    }

    const chords = resolvedProgression.chords;
    if (chords.length === 0) return;

    const bpm = data.tempo || 120;
    // Calculate interval duration: 2 beats per chord at specified tempo
    const stepDurationMs = Math.max(500, Math.min(2000, Math.round((60 / bpm) * 1000 * 2)));

    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex >= chords.length) {
        stopProgressionPlayback();
        return;
      }

      const item = chords[currentIndex];
      setPlayingIndex(currentIndex);

      if (item && item.guitarData) {
        playChord(item.guitarData, 0.7);
      }

      currentIndex++;
      playbackTimerRef.current = setTimeout(playNext, stepDurationMs);
    };

    playNext();
  };

  const handleApplyToChordex = () => {
    if (onAction) {
      onAction();
      return;
    }

    setIsImporting(true);
    try {
      importProgressionToChordex(data);
    } catch (e) {
      console.warn('[ChordProgressionCard] Could not import to Chordex:', e);
    } finally {
      setTimeout(() => {
        setIsImporting(false);
      }, 1500);
    }
  };

  const isPlayingProgression = playbackTimerRef.current !== null || playingIndex !== null;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        padding: '14px 16px',
        background:
          'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `linear-gradient(135deg, ${accent.soft}, ${accent.subtle})`,
              border: `1px solid ${accent.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accent.from,
              boxShadow: accent.glow,
            }}
          >
            <StudioIcon name="queue_music" size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
              Chord Progression
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: accent.from,
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                Key of {resolvedProgression.key} {resolvedProgression.mode || ''}
              </span>
              {data.tempo && (
                <span
                  style={{
                    fontSize: 10.5,
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ⏱ {data.tempo} BPM
                </span>
              )}
              {data.timeSignature && (
                <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                  {data.timeSignature}
                </span>
              )}
              {data.repetitions && (
                <span
                  style={{
                    fontSize: 10.5,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {data.repetitions}x
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Audio Preview Button */}
          {resolvedProgression.resolvedCount > 0 && (
            <button
              onClick={handleTogglePlayProgression}
              title={isPlayingProgression ? 'Stop preview' : 'Play progression preview'}
              style={{
                background: isPlayingProgression
                  ? accent.soft
                  : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isPlayingProgression ? accent.border : 'rgba(255, 255, 255, 0.1)'}`,
                color: isPlayingProgression ? accent.from : '#cbd5e1',
                cursor: 'pointer',
                padding: '5px 8px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 150ms ease',
              }}
            >
              <StudioIcon
                name={isPlayingProgression ? 'stop' : 'volume_up'}
                size={14}
              />
              <span>{isPlayingProgression ? 'Stop' : 'Play'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopyChords}
            title="Copy chords"
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#4ade80' : '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
            }}
          >
            <StudioIcon name={copied ? 'check' : 'content_copy'} size={14} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Chords Sequence Container with Canonical Chordex Diagrams */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'stretch',
          padding: '10px 10px',
          background: 'rgba(0, 0, 0, 0.32)',
          borderRadius: 14,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {resolvedProgression.chords.map((chord, idx) => {
          const isCurrent = playingIndex === idx;

          return (
            <div
              key={`${chord.name}-${idx}`}
              onClick={() => handlePlayChord(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 6px 8px',
                borderRadius: 10,
                background: isCurrent
                  ? accent.soft
                  : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${
                  isCurrent
                    ? accent.from
                    : chord.resolved
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(239, 68, 68, 0.25)'
                }`,
                boxShadow: isCurrent ? accent.glow : 'none',
                minWidth: 64,
                maxWidth: 78,
                flexShrink: 0,
                cursor: chord.resolved ? 'pointer' : 'default',
                transition: 'all 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                userSelect: 'none',
              }}
            >
              {/* Roman Numeral Header Badge */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isCurrent ? accent.from : '#94a3b8',
                  minHeight: 14,
                  lineHeight: '14px',
                  textAlign: 'center',
                }}
              >
                {chord.romanNumeral || ''}
              </div>

              {/* Chord Diagram or Unresolved Fallback Box */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  borderRadius: 8,
                  padding: '3px 3px 1px',
                  width: '54px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 3,
                  marginBottom: 6,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {chord.resolved && chord.guitarData ? (
                  <ChordDiagram
                    data={chord.guitarData}
                    accentFrom={isCurrent ? accent.from : 'var(--c-accent-from, #38bdf8)'}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      width: '100%',
                      height: '100%',
                      border: '1px dashed rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: 0.3,
                      }}
                    >
                      Unvoiced
                    </span>
                  </div>
                )}
              </div>

              {/* Chord Name Label */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: isCurrent ? '#ffffff' : chord.resolved ? '#f1f5f9' : '#f87171',
                  lineHeight: 1.1,
                  textAlign: 'center',
                  letterSpacing: -0.2,
                }}
              >
                {chord.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feel / Description */}
      {(data.feel || data.description) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.feel && (
            <div style={{ fontSize: 11, fontWeight: 600, color: accent.from }}>
              Feel: {data.feel}
            </div>
          )}
          {data.description && (
            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
              {data.description}
            </div>
          )}
        </div>
      )}

      {/* Action Footer: Import to Chordex */}
      <button
        onClick={handleApplyToChordex}
        disabled={isImporting}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          width: '100%',
          padding: '9px 16px',
          borderRadius: 10,
          background: isImporting
            ? 'rgba(34, 197, 94, 0.2)'
            : `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)`,
          color: isImporting ? '#4ade80' : accent.contrast,
          border: isImporting ? '1px solid rgba(74, 222, 128, 0.3)' : 'none',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: isImporting ? 'default' : 'pointer',
          boxShadow: isImporting ? 'none' : accent.glow,
          transition: 'all 150ms ease',
        }}
      >
        <StudioIcon
          name={isImporting ? 'check_circle' : 'library_music'}
          size={16}
        />
        {isImporting ? 'Imported! Opening Chordex...' : actionLabel}
      </button>
    </div>
  );
};

export default ChordProgressionCard;
