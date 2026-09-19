import React from 'react';
import { type GuitarChordData } from '@workspace/livex-core';

/* ── Full-size chord diagram ───────────────────────────────── */
export function LiveDiagram({
  data,
  accentFrom,
  accentTo,
}: {
  data: GuitarChordData;
  accentFrom: string;
  accentTo: string;
}) {
  const W = 200,
    H = 230;
  const numS = 6,
    numF = 5;
  const pL = 28,
    pT = 28,
    pR = 10,
    pB = 16;
  const cW = (W - pL - pR) / (numS - 1);
  const cH = (H - pT - pB) / numF;
  const r = 10;
  const { frets, baseFret, barres } = data;
  const allPositive = frets.filter((f) => f > 0);
  const minActive = allPositive.length ? Math.min(...allPositive) : 1;
  const minF = baseFret > 1 ? baseFret : Math.max(1, minActive);
  const showNut = minF <= 1;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="dot-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentFrom} />
          <stop offset="100%" stopColor={accentTo} />
        </linearGradient>
        {barres &&
          barres.map((_, bi) => (
            <linearGradient key={bi} id={`barre-grad-${bi}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accentFrom} />
              <stop offset="100%" stopColor={accentTo} />
            </linearGradient>
          ))}
      </defs>

      {/* Nut */}
      {showNut && (
        <rect
          x={pL - 1}
          y={pT - 6}
          width={(numS - 1) * cW + 2}
          height={6}
          rx={2}
          fill="#e7e5e4"
          opacity={0.7}
        />
      )}
      {/* Position number */}
      {!showNut && (
        <text
          x={pL - 8}
          y={pT + cH * 0.5}
          fontFamily="var(--studio-font-body)"
          fontSize={11}
          fontWeight="bold"
          fill="#acabaa"
          textAnchor="end"
          dominantBaseline="middle"
        >
          {minF}
        </text>
      )}
      {/* Fret lines */}
      {Array.from({ length: numF + 1 }).map((_, i) => (
        <line
          key={i}
          x1={pL}
          y1={pT + i * cH}
          x2={pL + (numS - 1) * cW}
          y2={pT + i * cH}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={i === 0 && !showNut ? 1.5 : 0.8}
        />
      ))}
      {/* String lines */}
      {Array.from({ length: numS }).map((_, i) => (
        <line
          key={i}
          x1={pL + i * cW}
          y1={pT}
          x2={pL + i * cW}
          y2={pT + numF * cH}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={0.8}
        />
      ))}
      {/* Barres */}
      {barres &&
        barres.map((barre, bi) => {
          const fp = barre.fret - minF;
          if (fp < 0 || fp >= numF) return null;
          const x1 = pL + (numS - barre.fromString) * cW;
          const x2 = pL + (numS - barre.toString) * cW;
          const cy = pT + fp * cH + cH / 2;
          return (
            <rect
              key={bi}
              x={Math.min(x1, x2) - r / 2}
              y={cy - r}
              width={Math.abs(x2 - x1) + r}
              height={r * 2}
              rx={r}
              fill={`url(#barre-grad-${bi})`}
              opacity={0.92}
            />
          );
        })}
      {/* Dots */}
      {frets.map((f, si) => {
        if (f <= 0) return null;
        const fp = f - minF;
        if (fp < 0 || fp >= numF) return null;
        const stringNum = numS - si;
        const onBarre =
          barres &&
          barres.some((b) => b.fret === f && stringNum >= b.toString && stringNum <= b.fromString);
        if (onBarre) return null;
        const cx = pL + si * cW;
        const cy = pT + fp * cH + cH / 2;
        return (
          <g key={si}>
            <circle cx={cx} cy={cy} r={r + 4} fill={accentFrom} opacity={0.15} />
            <circle cx={cx} cy={cy} r={r} fill="url(#dot-grad)" />
          </g>
        );
      })}
      {/* Open / muted strings */}
      {frets.map((f, si) => {
        if (f !== 0 && f !== -1) return null;
        const cx = pL + si * cW;
        const cy = pT - 16;
        return f === 0 ? (
          <circle
            key={si}
            cx={cx}
            cy={cy}
            r={5}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1.2}
          />
        ) : (
          <text
            key={si}
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fontFamily="var(--studio-font-body)"
            fontSize={11}
            fill="rgba(255,255,255,0.3)"
          >
            ×
          </text>
        );
      })}
    </svg>
  );
}

/* ── Mini diagram for context chords ──────────────────────── */
export function MiniLiveDiagram({
  data,
  accentFrom,
}: {
  data: GuitarChordData;
  accentFrom: string;
}) {
  const W = 72,
    H = 82;
  const numS = 6,
    numF = 4;
  const pL = 10,
    pT = 12,
    pR = 4,
    pB = 8;
  const cW = (W - pL - pR) / (numS - 1);
  const cH = (H - pT - pB) / numF;
  const r = 3.5;
  const { frets, baseFret, barres } = data;
  const allPos = frets.filter((f) => f > 0);
  const minAct = allPos.length ? Math.min(...allPos) : 1;
  const minF = baseFret > 1 ? baseFret : Math.max(1, minAct);
  const showNut = minF <= 1;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {showNut && (
        <rect
          x={pL - 0.5}
          y={pT - 3}
          width={(numS - 1) * cW + 1}
          height={3}
          rx={1}
          fill="#acabaa"
        />
      )}
      {Array.from({ length: numF + 1 }).map((_, i) => (
        <line
          key={i}
          x1={pL}
          y1={pT + i * cH}
          x2={pL + (numS - 1) * cW}
          y2={pT + i * cH}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={0.6}
        />
      ))}
      {Array.from({ length: numS }).map((_, i) => (
        <line
          key={i}
          x1={pL + i * cW}
          y1={pT}
          x2={pL + i * cW}
          y2={pT + numF * cH}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={0.6}
        />
      ))}
      {barres &&
        barres.map((barre, bi) => {
          const fp = barre.fret - minF;
          if (fp < 0 || fp >= numF) return null;
          const x1 = pL + (numS - barre.fromString) * cW;
          const x2 = pL + (numS - barre.toString) * cW;
          const cy = pT + fp * cH + cH / 2;
          return (
            <rect
              key={`b-${bi}`}
              x={Math.min(x1, x2)}
              y={cy - r}
              width={Math.abs(x2 - x1)}
              height={r * 2}
              rx={r}
              fill={accentFrom}
              opacity={0.9}
            />
          );
        })}
      {frets.map((f, si) => {
        if (f <= 0) return null;
        const fp = f - minF;
        if (fp < 0 || fp >= numF) return null;
        const stringNum = numS - si;
        const onBarre =
          barres &&
          barres.some((b) => b.fret === f && stringNum >= b.toString && stringNum <= b.fromString);
        if (onBarre) return null;
        const cx = pL + si * cW;
        const cy = pT + fp * cH + cH / 2;
        return <circle key={si} cx={cx} cy={cy} r={r} fill={accentFrom} />;
      })}
    </svg>
  );
}
