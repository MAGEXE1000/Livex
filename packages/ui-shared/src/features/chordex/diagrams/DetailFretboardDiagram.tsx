import React from 'react';
import { type GuitarChordData } from '@workspace/livex-core';

export interface DetailFretboardSvgOptions {
  dark?: boolean;
  accentColor?: string;
  displayMode?: 'notes' | 'intervals';
  showStringNames?: boolean;
  textColor?: string;
  gridColor?: string;
}

/**
 * Pure SVG generator producing the canonical modern Fretboard Diagram SVG string.
 * Used across React components, PDF HTML exports, and vector/canvas conversions.
 */
export function buildDetailFretboardSvgString(
  chordData?: GuitarChordData | null,
  options: DetailFretboardSvgOptions = {}
): string {
  const {
    dark = false,
    accentColor = '#2563EB',
    displayMode = 'notes',
    showStringNames = true,
  } = options;
  const textColor = options.textColor || (dark ? '#FFFFFF' : '#111827');
  const muteColor = '#EF4444';
  const openColor = dark ? '#8A92A6' : '#6B7280';

  const frets = chordData?.frets ?? [-1, 3, 2, 0, 1, 0];
  const fingers = chordData?.fingers ?? [];
  const barres = chordData?.barres ?? [];
  const baseFret = chordData?.baseFret ?? 1;

  const positiveFrets = frets.filter((f) => f > 0);
  const minActive = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const minFret = baseFret > 1 ? baseFret : Math.max(1, minActive);

  const stringX = [28, 64, 100, 136, 172, 208];
  const stringWidths = [2.2, 1.8, 1.5, 1.2, 1.0, 0.8];
  const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
  const stringIndicators = frets.map((f) => (f === -1 ? '✕' : f === 0 ? '○' : ''));

  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STRING_OFFSETS = [4, 9, 2, 7, 11, 4];

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

  let s = `<svg width="100%" height="auto" viewBox="0 0 236 218" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;overflow:visible;">`;

  // String indicators at top (y = 12)
  stringIndicators.forEach((ind, i) => {
    if (!ind) return;
    const fill = ind === '✕' ? muteColor : openColor;
    const opacity = ind === '✕' ? '1' : '0.75';
    s += `<text x="${stringX[i]}" y="12" fill="${fill}" opacity="${opacity}" font-size="12" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${ind}</text>`;
  });

  // Top Nut Bar or Base Fret wire
  if (minFret <= 1) {
    s += `<rect fill="${textColor}" opacity="0.85" height="4.5" rx="2" width="186" x="25" y="24" />`;
  } else {
    s += `<line stroke="${textColor}" stroke-opacity="0.35" stroke-width="1.5" x1="25" x2="211" y1="26" y2="26" />`;
    s += `<text fill="${textColor}" opacity="0.75" font-size="11" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" x="8" y="48">${minFret}fr</text>`;
  }

  // 4 horizontal fret wires
  [68, 110, 152, 194].forEach((fretY) => {
    s += `<line stroke="${textColor}" stroke-opacity="0.25" stroke-width="1.2" x1="25" x2="211" y1="${fretY}" y2="${fretY}" />`;
  });

  // 6 vertical strings with realistic gauge
  stringX.forEach((x, i) => {
    s += `<line stroke="${textColor}" stroke-opacity="0.3" stroke-width="${stringWidths[i]}" x1="${x}" x2="${x}" y1="26" y2="194" />`;
  });

  // Barre Bars
  barres.forEach((barre) => {
    const relFret = barre.fret - minFret + 1;
    if (relFret < 1 || relFret > 4) return;
    const cy = 26 + (relFret - 0.5) * 42;
    const fromX = stringX[6 - barre.fromString];
    const toX = stringX[6 - barre.toString];
    const minX = Math.min(fromX, toX) - 10;
    const maxX = Math.max(fromX, toX) + 10;
    const width = maxX - minX;
    s += `<g>`;
    s += `<rect x="${minX}" y="${cy - 11}" width="${width}" height="22" rx="11" fill="${accentColor}" fill-opacity="0.92" />`;
    s += `<circle cx="${fromX}" cy="${cy}" r="11" fill="${accentColor}" stroke="#FFFFFF" stroke-width="2.5" />`;
    s += `<circle cx="${toX}" cy="${cy}" r="11" fill="${accentColor}" stroke="#FFFFFF" stroke-width="2.5" />`;
    s += `</g>`;
  });

  // Finger Dots
  dots.forEach((d) => {
    s += `<g>`;
    s += `<circle cx="${d.cx}" cy="${d.cy}" r="12" fill="${accentColor}" stroke="#FFFFFF" stroke-width="2.5" />`;
    s += `<text x="${d.cx}" y="${d.cy + 3.8}" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${d.label}</text>`;
    s += `</g>`;
  });

  // String Names at Bottom
  if (showStringNames) {
    stringNames.forEach((name, i) => {
      s += `<text x="${stringX[i]}" y="211" fill="${textColor}" fill-opacity="0.45" font-size="10" font-weight="600" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${name}</text>`;
    });
  }

  s += `</svg>`;
  return s;
}

export interface DetailFretboardDiagramProps {
  chordData?: GuitarChordData | null;
  displayMode?: 'notes' | 'intervals';
  className?: string;
  maxWidth?: string | number;
  style?: React.CSSProperties;
  accentColor?: string;
  surfaceStyle?: React.CSSProperties;
  showStringNames?: boolean;
}

export function DetailFretboardDiagram({
  chordData,
  displayMode = 'notes',
  className = '',
  maxWidth,
  style,
  accentColor,
  surfaceStyle,
  showStringNames = true,
}: DetailFretboardDiagramProps) {
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

  const effectiveAccent = accentColor || 'var(--c-accent-from, #2563EB)';

  return (
    <div
      className={`w-full select-none ${className}`}
      style={{
        maxWidth: maxWidth ?? '270px',
        color: 'var(--c-text-primary)',
        ...style,
      }}
      aria-label="Guitar Fretboard Diagram"
      data-purpose="fretboard-diagram"
    >
      {/* Fretboard SVG Surface */}
      <div
        className="w-full rounded-2xl p-2.5 border shadow-inner transition-colors"
        style={{
          backgroundColor: 'var(--c-surface-lowest, #F9F7F5)',
          borderColor: 'var(--c-border, #E7DFD6)',
          ...surfaceStyle,
        }}
      >
        <svg className="w-full" viewBox="0 0 236 218" fill="none">
          {/* String Markers (Muted ✕ & Open ○) */}
          {stringIndicators.map((ind, i) => {
            if (!ind) return null;
            return (
              <text
                key={`marker-${i}`}
                x={stringX[i]}
                y="12"
                fill={ind === '✕' ? '#EF4444' : 'var(--c-text-muted, #8A92A6)'}
                opacity={ind === '✕' ? 1 : 0.65}
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
              >
                {ind}
              </text>
            );
          })}

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
                  fill={effectiveAccent}
                  fillOpacity="0.92"
                />
                <circle
                  cx={fromX}
                  cy={cy}
                  r="11"
                  fill={effectiveAccent}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <circle
                  cx={toX}
                  cy={cy}
                  r="11"
                  fill={effectiveAccent}
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
                fill={effectiveAccent}
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
          {showStringNames &&
            stringNames.map((name, i) => (
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

export default DetailFretboardDiagram;
