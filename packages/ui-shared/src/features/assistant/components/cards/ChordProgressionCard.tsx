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
  isLight?: boolean;
  isAmoled?: boolean;
}

export const ChordProgressionCard: React.FC<ChordProgressionCardProps> = ({
  data,
  actionLabel = 'Import to Chordex',
  onAction,
  isLight,
  isAmoled,
}) => {
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const theme = useSettingsStore((s) => s.settings?.theme);
  const amoledMode = useSettingsStore((s) => s.settings?.amoledMode);
  const effectiveIsLight =
    isLight !== undefined
      ? isLight
      : theme === 'light' ||
        (theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const effectiveIsAmoled =
    isAmoled !== undefined
      ? isAmoled
      : !effectiveIsLight && Boolean(amoledMode);

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

    const bpm = data.tempo || 100;
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

  // Visual Theme Tokens
  const cardBg = effectiveIsAmoled
    ? '#000000'
    : effectiveIsLight
      ? '#ffffff'
      : 'rgba(20, 20, 24, 0.94)';

  const cardBorder = effectiveIsAmoled
    ? 'rgba(255, 255, 255, 0.12)'
    : effectiveIsLight
      ? 'rgba(0, 0, 0, 0.08)'
      : 'rgba(255, 255, 255, 0.09)';

  const cardShadow = effectiveIsAmoled
    ? '0 12px 32px rgba(0, 0, 0, 0.85)'
    : effectiveIsLight
      ? '0 6px 20px rgba(0, 0, 0, 0.05)'
      : '0 12px 36px rgba(0, 0, 0, 0.4)';

  const titleColor = effectiveIsLight ? '#0f172a' : '#f8fafc';
  const subtitleColor = effectiveIsLight ? '#475569' : '#94a3b8';
  const mutedTextColor = effectiveIsLight ? '#64748b' : '#a1a1aa';

  const badgeBg = effectiveIsLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)';
  const badgeBorder = effectiveIsLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

  const railBg = effectiveIsAmoled
    ? '#060608'
    : effectiveIsLight
      ? '#f8fafc'
      : 'rgba(10, 10, 14, 0.55)';

  const railBorder = effectiveIsLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

  const cardItemBg = effectiveIsAmoled
    ? '#0e0e12'
    : effectiveIsLight
      ? '#ffffff'
      : 'rgba(255, 255, 255, 0.04)';

  const cardItemBorder = effectiveIsLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)';

  const diagramBoxBg = effectiveIsAmoled
    ? '#000000'
    : effectiveIsLight
      ? '#f1f5f9'
      : 'rgba(0, 0, 0, 0.45)';

  const amberWarm = '#f59e0b';
  const amberActive = '#fbbf24';

  const displayTitle =
    data.title ||
    (resolvedProgression.key
      ? `${resolvedProgression.key}${resolvedProgression.mode ? ' ' + resolvedProgression.mode : ''} Progression`
      : 'Harmonic Progression');

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        padding: '14px 16px',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        backdropFilter: effectiveIsAmoled ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: effectiveIsAmoled ? 'none' : 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
      }}
    >
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: amberWarm,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <StudioIcon name="queue_music" size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: titleColor,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayTitle}
            </div>

            {/* Badges Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              {/* Key and Mode */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  color: amberWarm,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  padding: '1.5px 7px',
                  borderRadius: 5,
                }}
              >
                Key: {resolvedProgression.key} {resolvedProgression.mode || ''}
              </span>

              {/* Tempo */}
              {data.tempo && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: subtitleColor,
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    padding: '1.5px 6px',
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ⏱ {data.tempo} BPM
                </span>
              )}

              {/* Time Signature */}
              {data.timeSignature && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: subtitleColor,
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    padding: '1.5px 6px',
                    borderRadius: 5,
                  }}
                >
                  {data.timeSignature}
                </span>
              )}

              {/* Genre / Feel */}
              {(data.genre || data.feel) && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: subtitleColor,
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    padding: '1.5px 6px',
                    borderRadius: 5,
                  }}
                >
                  {data.genre || data.feel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Audio Preview Button */}
          {resolvedProgression.resolvedCount > 0 && (
            <button
              onClick={handleTogglePlayProgression}
              title={isPlayingProgression ? 'Stop preview' : 'Play progression preview'}
              style={{
                background: isPlayingProgression
                  ? 'rgba(245, 158, 11, 0.16)'
                  : badgeBg,
                border: `1px solid ${isPlayingProgression ? 'rgba(245, 158, 11, 0.35)' : badgeBorder}`,
                color: isPlayingProgression ? amberWarm : subtitleColor,
                cursor: 'pointer',
                padding: '5px 9px',
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
              color: copied ? '#22c55e' : subtitleColor,
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

      {/* 2. Reference / Inspiration Banner (if applicable) */}
      {data.referenceContext && (
        <div
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            background: effectiveIsLight ? 'rgba(245, 158, 11, 0.07)' : 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            color: effectiveIsLight ? '#92400e' : '#fde68a',
            lineHeight: 1.35,
          }}
        >
          <StudioIcon name="auto_awesome" size={13} style={{ flexShrink: 0, color: amberWarm }} />
          <span>{data.referenceContext}</span>
        </div>
      )}

      {/* 3. Chords Rail with Canonical Chordex Diagrams */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          padding: '8px 8px',
          background: railBg,
          border: `1px solid ${railBorder}`,
          borderRadius: 12,
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
                padding: '6px 5px 7px',
                borderRadius: 9,
                background: isCurrent
                  ? 'rgba(245, 158, 11, 0.12)'
                  : cardItemBg,
                border: `1px solid ${
                  isCurrent
                    ? amberWarm
                    : chord.resolved
                      ? cardItemBorder
                      : 'rgba(239, 68, 68, 0.3)'
                }`,
                boxShadow: isCurrent ? '0 0 12px rgba(245, 158, 11, 0.25)' : 'none',
                minWidth: 62,
                maxWidth: 76,
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
                  color: isCurrent ? amberWarm : subtitleColor,
                  minHeight: 14,
                  lineHeight: '14px',
                  textAlign: 'center',
                }}
              >
                {chord.romanNumeral || ''}
              </div>

              {/* Chord Diagram Box */}
              <div
                style={{
                  background: diagramBoxBg,
                  borderRadius: 7,
                  padding: '3px 2px 1px',
                  width: '52px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 3,
                  marginBottom: 5,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {chord.resolved && chord.guitarData ? (
                  <ChordDiagram
                    data={chord.guitarData}
                    accentFrom={isCurrent ? amberActive : amberWarm}
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
                        color: subtitleColor,
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
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: isCurrent ? amberActive : chord.resolved ? titleColor : '#ef4444',
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

      {/* 4. Harmonic Analysis / Explanation ("Why It Works") */}
      {(data.harmonicContext || data.explanation || data.description) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '8px 10px',
            borderRadius: 9,
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          {data.harmonicContext && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: amberWarm }}>
              <StudioIcon name="linear_scale" size={13} />
              <span>{data.harmonicContext}</span>
            </div>
          )}
          {(data.explanation || data.description) && (
            <div
              style={{
                fontSize: 11.5,
                color: mutedTextColor,
                lineHeight: 1.5,
              }}
            >
              {data.explanation || data.description}
            </div>
          )}
        </div>
      )}

      {/* 5. Action Footer: Import to Chordex */}
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
            ? 'rgba(34, 197, 94, 0.16)'
            : effectiveIsLight
              ? '#0f172a'
              : 'rgba(255, 255, 255, 0.08)',
          color: isImporting
            ? '#22c55e'
            : effectiveIsLight
              ? '#ffffff'
              : '#f8fafc',
          border: isImporting
            ? '1px solid rgba(34, 197, 94, 0.3)'
            : effectiveIsLight
              ? '1px solid #0f172a'
              : '1px solid rgba(255, 255, 255, 0.14)',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: isImporting ? 'default' : 'pointer',
          boxShadow: isImporting ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)',
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
