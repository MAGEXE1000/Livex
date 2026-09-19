import React, { memo } from 'react';
import { type GuitarChordData } from '@workspace/livex-core';

export interface MiniFretboardRecessProps {
  chordData?: GuitarChordData | null;
  accentFrom?: string;
  className?: string;
  style?: React.CSSProperties;
}

const STRING_PERCENTAGES = [10, 26, 42, 58, 74, 90]; // low E to high E (strings 6 to 1)

export const HeroChordRecess = memo(function HeroChordRecess({
  chordData,
  accentFrom = 'var(--c-accent-from, #679cff)',
  className = '',
  style,
}: MiniFretboardRecessProps) {
  // Default to C Major if no chord data provided
  const frets = chordData?.frets ?? [-1, 3, 2, 0, 1, 0];
  const barres = chordData?.barres ?? [];
  const baseFret = chordData?.baseFret ?? 1;

  const positiveFrets = frets.filter((f) => f > 0);
  const minActive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const maxActive = positiveFrets.length ? Math.max(...positiveFrets) : 1;
  const minFret = baseFret > 1 ? baseFret : Math.max(1, minActive);
  const numFrets = Math.max(3, Math.min(4, maxActive - minFret + 1));
  const showNut = minFret <= 1;

  // Calculate fret top percentage
  const getFretPercent = (fretVal: number) => {
    if (fretVal <= 0) return null;
    const relFret = fretVal - minFret;
    if (relFret < 0 || relFret >= numFrets) return null;
    // Center of fret space between fret lines
    const fretStep = 100 / numFrets;
    return (relFret + 0.5) * fretStep;
  };

  return (
    <div
      className={`fretboard-recess w-40 h-28 rounded-lg overflow-hidden border border-white/5 relative ${className}`}
      style={{
        width: '160px',
        height: '112px',
        ...style,
      }}
      aria-label="Chord Fretboard Preview"
    >
      {/* Strings */}
      {STRING_PERCENTAGES.map((pct, idx) => {
        const thickness = idx === 0 ? 1.6 : idx === 1 ? 1.3 : idx === 2 ? 1.0 : idx === 3 ? 0.8 : 0.6;
        return (
          <div
            key={`str-${idx}`}
            className="string-line"
            style={{
              left: `${pct}%`,
              width: `${thickness}px`,
            }}
          />
        );
      })}

      {/* Frets */}
      {Array.from({ length: numFrets }).map((_, fIdx) => {
        const topPct = ((fIdx + 1) / numFrets) * 100;
        return (
          <div
            key={`fret-${fIdx}`}
            className="fret-line"
            style={{
              top: `${topPct}%`,
            }}
          />
        );
      })}

      {/* Nut (if open position) */}
      {showNut && (
        <div
          className="absolute top-0 w-full"
          style={{
            height: '3.5px',
            backgroundColor: 'var(--c-text-secondary, rgba(255,255,255,0.3))',
            opacity: 0.7,
          }}
        />
      )}

      {/* Base Fret Indicator (if higher up neck) */}
      {!showNut && (
        <span
          style={{
            position: 'absolute',
            left: '2px',
            top: '4px',
            fontSize: '9px',
            fontFamily: 'var(--font-headline, Inter)',
            fontWeight: 800,
            color: 'var(--c-text-muted, #888)',
            zIndex: 4,
          }}
        >
          {minFret}fr
        </span>
      )}

      {/* Open & Muted String Markers */}
      {frets.map((fret, sIdx) => {
        const leftPct = STRING_PERCENTAGES[sIdx];
        if (fret === -1) {
          return (
            <span
              key={`marker-${sIdx}`}
              className="absolute text-[10px] font-bold select-none pointer-events-none"
              style={{
                top: '2px',
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                color: 'var(--c-error, #ee7d77)',
                lineHeight: 1,
                zIndex: 3,
              }}
            >
              ×
            </span>
          );
        }
        if (fret === 0) {
          return (
            <span
              key={`marker-${sIdx}`}
              className="absolute text-[10px] font-bold select-none pointer-events-none"
              style={{
                top: '2px',
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                color: 'var(--c-text-muted, #a1a1aa)',
                lineHeight: 1,
                zIndex: 3,
              }}
            >
              ○
            </span>
          );
        }
        return null;
      })}

      {/* Barre Chords */}
      {barres.map((barre, bIdx) => {
        const top = getFretPercent(barre.fret);
        if (top === null) return null;
        const fromIdx = 6 - barre.fromString;
        const toIdx = 6 - barre.toString;
        const left = Math.min(STRING_PERCENTAGES[fromIdx], STRING_PERCENTAGES[toIdx]);
        const right = Math.max(STRING_PERCENTAGES[fromIdx], STRING_PERCENTAGES[toIdx]);
        const widthPct = right - left;

        return (
          <div
            key={`barre-${bIdx}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: `${widthPct}%`,
              height: '12px',
              borderRadius: '6px',
              backgroundColor: accentFrom,
              boxShadow: `0 0 8px ${accentFrom}`,
              transform: 'translateY(-50%)',
              zIndex: 2,
              opacity: 0.9,
            }}
          />
        );
      })}

      {/* Finger Dots */}
      {frets.map((fret, sIdx) => {
        if (fret <= 0) return null;
        const left = STRING_PERCENTAGES[sIdx];
        const top = getFretPercent(fret);
        if (top === null) return null;

        const stringNum = 6 - sIdx;
        const isBarreCovered = barres.some(
          (b) => b.fret === fret && stringNum >= b.toString && stringNum <= b.fromString
        );
        if (isBarreCovered) return null;

        return (
          <div
            key={`dot-${sIdx}`}
            className="finger-dot"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              backgroundColor: accentFrom,
              boxShadow: `0 0 8px ${accentFrom}, 0 2px 4px rgba(0,0,0,0.5)`,
            }}
          />
        );
      })}
    </div>
  );
});

export interface CategoryMiniRecessProps {
  dots?: { stringPercent: number; fretPercent: number }[];
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryMiniRecess = memo(function CategoryMiniRecess({
  dots = [
    { stringPercent: 16, fretPercent: 66 },
    { stringPercent: 50, fretPercent: 33 },
  ],
  className = '',
  style,
}: CategoryMiniRecessProps) {
  return (
    <div
      className={`fretboard-recess w-12 h-12 rounded-md border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity flex-none relative ${className}`}
      style={{
        width: '48px',
        height: '48px',
        ...style,
      }}
      aria-hidden="true"
    >
      {/* 3 String Lines */}
      <div className="string-line" style={{ left: '16%' }} />
      <div className="string-line" style={{ left: '50%' }} />
      <div className="string-line" style={{ left: '84%' }} />

      {/* 2 Fret Lines */}
      <div className="fret-line" style={{ top: '33%' }} />
      <div className="fret-line" style={{ top: '66%' }} />

      {/* Signature Finger Dots */}
      {dots.map((dot, idx) => (
        <div
          key={`cat-dot-${idx}`}
          className="finger-dot"
          style={{
            width: '8px',
            height: '8px',
            left: `${dot.stringPercent}%`,
            top: `${dot.fretPercent}%`,
            backgroundColor: 'var(--c-accent-from, #ffffff)',
            boxShadow: '0 0 4px var(--c-accent-from, rgba(255,255,255,0.6))',
          }}
        />
      ))}
    </div>
  );
});

export interface ChordCardMiniRecessProps {
  chordData: GuitarChordData;
  accentFrom?: string;
  className?: string;
}

export const ChordCardMiniRecess = memo(function ChordCardMiniRecess({
  chordData,
  accentFrom = 'var(--c-accent-from, #679cff)',
  className = '',
}: ChordCardMiniRecessProps) {
  return (
    <HeroChordRecess
      chordData={chordData}
      accentFrom={accentFrom}
      className={`w-16 h-16 rounded-xl ${className}`}
      style={{ width: '64px', height: '64px' }}
    />
  );
});
