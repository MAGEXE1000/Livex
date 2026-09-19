import React, { memo } from 'react';
import {
  type DrumInstrument,
  type DrumMeasure,
  type NoteVariation,
  useDrumStore,
  INSTRUMENT_COLOR,
  DEFAULT_VELOCITY,
  MAX_VELOCITY,
} from '@workspace/livex-core';
import { NoteHead } from './DrumNoteHeads';

const CORE_INSTS: DrumInstrument[] = ['hihat-closed', 'snare', 'kick', 'crash'];

const getInstrumentColor = (inst: DrumInstrument, isLight: boolean, noteColor: string): string => {
  if (isLight) {
    switch (inst) {
      case 'kick':
      case 'snare':
        return '#09090b';
      case 'hihat-closed':
      case 'hihat-open':
      case 'hihat-foot':
        return '#27272a';
      case 'tom-high':
      case 'tom-mid':
      case 'tom-floor':
        return '#3f3f46';
      case 'crash':
      case 'ride':
        return '#52525b';
      default:
        return '#09090b';
    }
  }
  return INSTRUMENT_COLOR[inst] ?? noteColor;
};

const STAFF_YF = [0.29, 0.52, 0.75] as const;

const NOTE_YF: Record<DrumInstrument, number> = {
  crash: 0.12,
  'hihat-closed': 0.12,
  'hihat-open': 0.12,
  ride: 0.12,
  'tom-high': 0.29,
  snare: 0.52,
  'tom-mid': 0.65,
  'tom-floor': 0.78,
  kick: 0.88,
  'hihat-foot': 0.88,
};

const SHORT_LABEL: Record<DrumInstrument, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'HH',
  'hihat-open': 'O.HH',
  'hihat-foot': 'HHF',
  'tom-high': 'Hi',
  'tom-mid': 'Mid',
  'tom-floor': 'Floor',
  crash: 'Cym',
  ride: 'Ride',
};

export interface RowProps {
  inst: DrumInstrument;
  mStartIdx: number;
  rowMeasures: DrumMeasure[];
  spm: number;
  stepsPerBeat: number;
  STEP_W: number;
  MEASURE_W: number;
  noteColor: string;
  staffColor: string;
  barColor: string;
  altBg: string;
  showVariations: boolean;
  gridEmphasis: boolean;
  accentFrom: string;
  ROW_H: number;
  isLight: boolean;
}

export const InstrumentRow = memo(
  ({
    inst,
    mStartIdx,
    rowMeasures,
    spm,
    stepsPerBeat,
    STEP_W,
    MEASURE_W,
    noteColor,
    staffColor,
    barColor: propBarColor,
    altBg,
    showVariations,
    gridEmphasis,
    accentFrom,
    ROW_H,
    isLight,
  }: RowProps) => {
    const totalW = rowMeasures.length * MEASURE_W;
    const defaultNoteY = NOTE_YF[inst] * ROW_H;
    const NOTE_R = 4.5;
    const barColor = isLight ? 'rgba(9, 9, 11, 0.40)' : propBarColor;

    return (
      <svg
        width={totalW}
        height={ROW_H}
        viewBox={`0 0 ${totalW} ${ROW_H}`}
        style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}
      >
        {/* Alternating beat backgrounds */}
        {rowMeasures.map((_, mi) =>
          Array.from({ length: Math.floor(spm / stepsPerBeat) }, (__, bi) => {
            const x = (mi * spm + bi * stepsPerBeat) * STEP_W;
            return bi % 2 === 1 ? (
              <rect
                key={`${mi}-${bi}`}
                x={x}
                y={0}
                width={stepsPerBeat * STEP_W}
                height={ROW_H}
                fill={altBg}
              />
            ) : null;
          })
        )}
        {/* Staff lines */}
        {STAFF_YF.map((yf, i) => (
          <line
            key={i}
            x1={0}
            y1={yf * ROW_H}
            x2={totalW}
            y2={yf * ROW_H}
            stroke={staffColor}
            strokeWidth={0.7}
          />
        ))}
        {/* Per-step cell dividers */}
        {rowMeasures.map((_, mi) =>
          Array.from({ length: spm }, (__, s) => {
            if (s === 0) return null;
            const x = (mi * spm + s) * STEP_W;
            const onBeat = s % stepsPerBeat === 0;
            return (
              <line
                key={`s-${mi}-${s}`}
                x1={x}
                y1={0}
                x2={x}
                y2={ROW_H}
                stroke={
                  isLight
                    ? onBeat
                      ? 'rgba(15, 23, 42, 0.45)'
                      : 'rgba(15, 23, 42, 0.12)'
                    : onBeat
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.07)'
                }
                strokeWidth={onBeat ? 1.2 : 0.8}
                opacity={onBeat ? 1.0 : 0.6}
              />
            );
          })
        )}
        {/* Top + bottom row borders */}
        <line
          x1={0}
          y1={0}
          x2={totalW}
          y2={0}
          stroke={isLight ? 'rgba(15, 23, 42, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
          strokeWidth={0.8}
        />
        <line
          x1={0}
          y1={ROW_H}
          x2={totalW}
          y2={ROW_H}
          stroke={isLight ? 'rgba(15, 23, 42, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
          strokeWidth={0.8}
        />
        {/* Measure bar lines */}
        {rowMeasures.map((_, mi) => (
          <line
            key={mi}
            x1={mi * MEASURE_W}
            y1={0}
            x2={mi * MEASURE_W}
            y2={ROW_H}
            stroke={barColor}
            strokeWidth={mi === 0 ? 1.8 : 1.5}
          />
        ))}
        <line x1={totalW} y1={0} x2={totalW} y2={ROW_H} stroke={barColor} strokeWidth={1.8} />
        {/* Velocity bars */}
        {rowMeasures.map((m, mi) => {
          const hits = m.hits[inst] ?? [];
          return Array.from({ length: spm }, (__, s) => {
            const hit = hits.find((h) => h.step === s);
            if (!hit) return null;
            const vel = typeof hit.velocity === 'number' ? hit.velocity : DEFAULT_VELOCITY;
            const cellW = STEP_W - 4;
            const frac = Math.max(0.1, Math.min(1, vel / MAX_VELOCITY));
            const w = cellW * frac;
            const x = (mi * spm + s) * STEP_W + (STEP_W - w) / 2;
            const op = 0.4 + frac * 0.5;
            return (
              <rect
                key={`v-${mi}-${s}`}
                x={x}
                y={ROW_H - 3.5}
                width={w}
                height={2}
                rx={1}
                fill={accentFrom}
                opacity={op}
                pointerEvents="none"
              />
            );
          });
        })}
        {/* Note heads */}
        {rowMeasures.map((m, mi) => {
          const hits = m.hits[inst] ?? [];
          return Array.from({ length: spm }, (__, s) => {
            const hit = hits.find((h) => h.step === s);
            if (!hit) return null;
            const rawVariation = hit.variation ?? 'normal';
            const variation: NoteVariation = showVariations ? rawVariation : 'normal';

            const noteY =
              inst === 'hihat-closed' && rawVariation === 'pedal' && showVariations
                ? ROW_H * 0.86
                : inst === 'crash' &&
                    (rawVariation === 'ride' || rawVariation === 'bell') &&
                    showVariations
                  ? ROW_H * 0.28
                  : defaultNoteY;

            const cx = (mi * spm + s) * STEP_W + STEP_W / 2;
            const cy = noteY;
            const stemUp = cy > ROW_H * 0.5;
            const stemY1 = stemUp ? cy - NOTE_R * 0.9 : cy + NOTE_R * 0.9;
            const stemY2 = stemUp ? cy - NOTE_R * 3.5 : cy + NOTE_R * 3.5;

            const isGhost = showVariations && variation === 'ghost';

            const strokeColor = isLight ? '#ffffff' : '#141414';
            const instColor = getInstrumentColor(inst, isLight, noteColor);

            return (
              <g key={`${mi}-${s}`} transform={`translate(${cx}, ${cy})`}>
                {isGhost ? (
                  <>
                    <text
                      x={-NOTE_R * 1.9}
                      y={NOTE_R * 0.38}
                      fontSize={NOTE_R * 1.7}
                      fill={instColor}
                      opacity={0.38}
                      fontFamily="serif"
                      dominantBaseline="middle"
                    >
                      (
                    </text>
                    <text
                      x={NOTE_R * 0.95}
                      y={NOTE_R * 0.38}
                      fontSize={NOTE_R * 1.7}
                      fill={instColor}
                      opacity={0.38}
                      fontFamily="serif"
                      dominantBaseline="middle"
                    >
                      )
                    </text>
                  </>
                ) : (
                  <line
                    x1={stemUp ? NOTE_R * 0.75 : -NOTE_R * 0.75}
                    y1={stemY1 - cy}
                    x2={stemUp ? NOTE_R * 0.75 : -NOTE_R * 0.75}
                    y2={stemY2 - cy}
                    stroke={instColor}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                  />
                )}
                <NoteHead
                  inst={inst}
                  variation={variation}
                  r={NOTE_R}
                  color={instColor}
                  strokeColor={strokeColor}
                />
              </g>
            );
          });
        })}
      </svg>
    );
  },
  (prev, next) => {
    if (prev.inst !== next.inst) return false;
    if (prev.mStartIdx !== next.mStartIdx) return false;
    if (prev.spm !== next.spm) return false;
    if (prev.stepsPerBeat !== next.stepsPerBeat) return false;
    if (prev.STEP_W !== next.STEP_W) return false;
    if (prev.MEASURE_W !== next.MEASURE_W) return false;
    if (prev.noteColor !== next.noteColor) return false;
    if (prev.staffColor !== next.staffColor) return false;
    if (prev.barColor !== next.barColor) return false;
    if (prev.altBg !== next.altBg) return false;
    if (prev.showVariations !== next.showVariations) return false;
    if (prev.gridEmphasis !== next.gridEmphasis) return false;
    if (prev.accentFrom !== next.accentFrom) return false;
    if (prev.ROW_H !== next.ROW_H) return false;
    if (prev.isLight !== next.isLight) return false;

    if (prev.rowMeasures.length !== next.rowMeasures.length) return false;

    for (let i = 0; i < prev.rowMeasures.length; i++) {
      const prevHits = prev.rowMeasures[i].hits[prev.inst];
      const nextHits = next.rowMeasures[i].hits[next.inst];
      if (prevHits !== nextHits) return false;
    }
    return true;
  }
);

// ── Tab icons ──────────────────────────────────────────────────────────────
export default InstrumentRow;
