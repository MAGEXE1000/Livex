import React from 'react';
import {
  type DrumPattern,
  type DrumSong,
  type DrumInstrument,
  type DrumMeasure,
  DRUM_INSTRUMENTS,
  INSTRUMENT_COLOR,
} from '@workspace/livex-core';

export interface DrumExportConfig {
  theme: 'dark' | 'light';
  style: 'normal' | 'handwritten';
}
export const DEFAULT_DRUM_EXPORT_CONFIG: DrumExportConfig = { theme: 'dark', style: 'normal' };

const HEX_TO_RGB = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const IS_CYMBAL: Partial<Record<DrumInstrument, boolean>> = {
  crash: true,
  ride: true,
  'hihat-closed': true,
  'hihat-open': true,
};

const STEM_DOWN: Partial<Record<DrumInstrument, boolean>> = {
  kick: true,
  'hihat-foot': true,
};

const INST_LABEL: Record<DrumInstrument, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'Hi-Hat',
  'hihat-open': 'Open HH',
  'hihat-foot': 'HH Foot',
  'tom-high': 'Tom Hi',
  'tom-mid': 'Tom Mid',
  'tom-floor': 'Floor Tom',
  crash: 'Cymbal',
  ride: 'Ride',
};

export function DrumPaperPreview({
  patterns,
  song,
  accent,
}: {
  patterns: DrumPattern[];
  song: DrumSong | null;
  cfg: DrumExportConfig;
  accent: { from: string; to: string };
}) {
  // â”€â”€ Same constants as exportDrumSongPDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const PW = 420,
    PH = 297;
  const ML = 10,
    MR = 10,
    MT = 12,
    MB = 10;
  const LABEL_COL = 30;
  const GRID_W = PW - ML - MR - LABEL_COL; // 370
  const ROW_H = 8.5;
  const SYS_GAP = 6;
  const PAT_GAP = 12;
  const HDR_H = 22;
  const NR = 1.35;
  const BARS_PER_ROW = 4;
  const PAT_HDR = 9;

  // â”€â”€ Same palette as the PDF dark theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const BG = '#111117';
  const LBG = '#16161e';
  const CELL_A = '#16161e';
  const CELL_B = '#1c1c26';
  const C_ROW = '#262634';
  const C_BEAT = '#373748';
  const C_BAR = '#4b4b5f';
  const C_NOTE = '#e6e6f0';
  const C_TXT = '#d2d2dc';
  const C_SUB = '#6e6e80';

  // â”€â”€ Build SVG elements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const elems: React.ReactNode[] = [];
  let key = 0;
  const k = () => key++;

  // Background
  elems.push(<rect key={k()} x={0} y={0} width={PW} height={PH} fill={BG} />);

  // Header: accent bar + title
  const title = song?.name ?? 'Drum Sheet';
  const artist = song?.artist ?? '';
  elems.push(
    <rect key={k()} x={ML} y={MT + 2} width={3.5} height={14} fill={accent.from} rx={0.5} />
  );
  elems.push(
    <text
      key={k()}
      x={ML + 9}
      y={MT + 12}
      fontFamily="Helvetica"
      fontWeight="bold"
      fontSize={20}
      fill={C_TXT}
    >
      {title.toUpperCase()}
    </text>
  );
  if (artist) {
    elems.push(
      <text key={k()} x={ML + 9} y={MT + 18} fontFamily="Helvetica" fontSize={10} fill={C_SUB}>
        {artist}
      </text>
    );
  }
  elems.push(
    <line
      key={k()}
      x1={ML}
      y1={MT + HDR_H - 1}
      x2={PW - MR}
      y2={MT + HDR_H - 1}
      stroke={accent.from}
      strokeWidth={0.4}
    />
  );

  let curY = MT + HDR_H;

  for (let patIdx = 0; patIdx < patterns.length; patIdx++) {
    const pat = patterns[patIdx];
    const subs = pat.subdivision ?? 16;
    const [timN, timD] = pat.timeSignature ?? [4, 4];
    const stepsPerBeat = subs / timN;

    const allInsts: DrumInstrument[] = DRUM_INSTRUMENTS.filter(
      (i: DrumInstrument) =>
        !(pat.mutedInstruments ?? []).includes(i) &&
        pat.measures.some((m: DrumMeasure) => (m.hits[i]?.length ?? 0) > 0)
    );
    if (allInsts.length === 0) continue;

    const SYS_H = allInsts.length * ROW_H;
    const barsPerRow = Math.min(pat.measures.length, BARS_PER_ROW);
    const CELL = GRID_W / (barsPerRow * subs);

    // Pattern header bar
    if (curY + PAT_HDR + SYS_H > PH - MB) break; // no room â€” stop
    elems.push(
      <rect
        key={k()}
        x={ML}
        y={curY}
        width={PW - ML - MR}
        height={PAT_HDR - 1}
        fill={accent.from}
      />
    );
    elems.push(
      <text
        key={k()}
        x={ML + LABEL_COL + 3}
        y={curY + 6.5}
        fontFamily="Helvetica"
        fontWeight="bold"
        fontSize={9}
        fill="#ffffff"
      >
        {pat.name}
      </text>
    );
    elems.push(
      <text
        key={k()}
        x={ML + LABEL_COL + 3 + pat.name.length * 5.2}
        y={curY + 6.5}
        fontFamily="Helvetica"
        fontSize={7.5}
        fill="#ffffff"
      >
        {`   â™© = ${pat.bpm}   ${timN}/${timD}   1/${subs}`}
      </text>
    );
    curY += PAT_HDR;

    // â”€â”€ Systems â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (let rowStart = 0; rowStart < pat.measures.length; rowStart += barsPerRow) {
      if (curY + SYS_H + 4 > PH - MB) break;

      const rowBars = pat.measures.slice(rowStart, rowStart + barsPerRow);
      const gridLeft = ML + LABEL_COL;

      // Background cells â€” full width (including ghost bars for short last row)
      for (let ri = 0; ri < allInsts.length; ri++) {
        const rowTop = curY + ri * ROW_H;
        for (let bi = 0; bi < barsPerRow; bi++) {
          for (let s = 0; s < subs; s++) {
            const beat = Math.floor(s / stepsPerBeat);
            const bg2 = beat % 2 === 0 ? CELL_A : CELL_B;
            elems.push(
              <rect
                key={k()}
                x={gridLeft + (bi * subs + s) * CELL}
                y={rowTop}
                width={CELL}
                height={ROW_H}
                fill={bg2}
              />
            );
          }
        }
      }

      // Label column
      elems.push(<rect key={k()} x={ML} y={curY} width={LABEL_COL} height={SYS_H} fill={LBG} />);
      for (let ri = 0; ri < allInsts.length; ri++) {
        const inst = allInsts[ri];
        const rowTop = curY + ri * ROW_H;
        const color = INSTRUMENT_COLOR[inst as DrumInstrument] ?? accent.from;
        elems.push(
          <rect
            key={k()}
            x={ML + 2}
            y={rowTop + ROW_H * 0.22}
            width={2.5}
            height={ROW_H * 0.56}
            fill={color}
            rx={0.5}
          />
        );
        elems.push(
          <text
            key={k()}
            x={ML + 6.5}
            y={rowTop + ROW_H * 0.6}
            fontFamily="Helvetica"
            fontWeight="bold"
            fontSize={6}
            fill={C_TXT}
            dominantBaseline="middle"
          >
            {INST_LABEL[inst as DrumInstrument] ?? inst}
          </text>
        );
        if (ri > 0) {
          elems.push(
            <line
              key={k()}
              x1={ML}
              y1={rowTop}
              x2={ML + LABEL_COL + GRID_W}
              y2={rowTop}
              stroke={C_ROW}
              strokeWidth={0.22}
            />
          );
        }
      }

      // Grid lines: subdivisions, beats, bars
      for (let bi = 0; bi < barsPerRow; bi++) {
        for (let s = 1; s < subs; s++) {
          const lx = gridLeft + (bi * subs + s) * CELL;
          const isBeat = s % stepsPerBeat === 0;
          elems.push(
            <line
              key={k()}
              x1={lx}
              y1={curY}
              x2={lx}
              y2={curY + SYS_H}
              stroke={isBeat ? C_BEAT : C_ROW}
              strokeWidth={isBeat ? 0.32 : 0.14}
            />
          );
        }
      }
      for (let bi = 0; bi <= barsPerRow; bi++) {
        const bx = gridLeft + bi * subs * CELL;
        const thick = bi === 0 || bi === barsPerRow;
        elems.push(
          <line
            key={k()}
            x1={bx}
            y1={curY}
            x2={bx}
            y2={curY + SYS_H}
            stroke={C_BAR}
            strokeWidth={thick ? 0.6 : 0.45}
          />
        );
        if (bi < rowBars.length) {
          elems.push(
            <text
              key={k()}
              x={bx + 1.2}
              y={curY - 1.2}
              fontFamily="Helvetica"
              fontSize={5.5}
              fill={C_SUB}
            >
              {rowStart + bi + 1}
            </text>
          );
        }
      }
      // Top/bottom borders
      elems.push(
        <line
          key={k()}
          x1={ML}
          y1={curY}
          x2={ML + LABEL_COL + GRID_W}
          y2={curY}
          stroke={C_BAR}
          strokeWidth={0.5}
        />
      );
      elems.push(
        <line
          key={k()}
          x1={ML}
          y1={curY + SYS_H}
          x2={ML + LABEL_COL + GRID_W}
          y2={curY + SYS_H}
          stroke={C_BAR}
          strokeWidth={0.5}
        />
      );

      // Notes
      for (let ri = 0; ri < allInsts.length; ri++) {
        const inst = allInsts[ri];
        const rowTop = curY + ri * ROW_H;
        const cy = rowTop + ROW_H / 2;
        const isCym = !!IS_CYMBAL[inst as DrumInstrument];
        const stemDn = !!STEM_DOWN[inst as DrumInstrument];

        for (let bi = 0; bi < rowBars.length; bi++) {
          for (const hit of rowBars[bi].hits[inst as DrumInstrument] ?? []) {
            const cx = gridLeft + (bi * subs + hit.step + 0.5) * CELL;
            const sx = cx + (stemDn ? -NR : NR) * 0.9;
            const sy1 = cy + (stemDn ? NR : -NR) * 0.38;
            const sy2 = stemDn ? rowTop + ROW_H - 0.8 : rowTop + 0.8;
            // Stem
            elems.push(
              <line
                key={k()}
                x1={sx}
                y1={sy1}
                x2={sx}
                y2={sy2}
                stroke={C_NOTE}
                strokeWidth={0.38}
              />
            );
            // Head
            if (isCym) {
              const d = NR * 0.9;
              elems.push(
                <line
                  key={k()}
                  x1={cx - d}
                  y1={cy - d}
                  x2={cx + d}
                  y2={cy + d}
                  stroke={C_NOTE}
                  strokeWidth={0.85}
                />
              );
              elems.push(
                <line
                  key={k()}
                  x1={cx - d}
                  y1={cy + d}
                  x2={cx + d}
                  y2={cy - d}
                  stroke={C_NOTE}
                  strokeWidth={0.85}
                />
              );
              if (hit.variation === 'open' || inst === 'hihat-open') {
                elems.push(
                  <ellipse
                    key={k()}
                    cx={cx}
                    cy={cy - NR * 2.1}
                    rx={NR * 0.85}
                    ry={NR * 0.6}
                    stroke={C_NOTE}
                    strokeWidth={0.28}
                    fill="none"
                  />
                );
              }
              if (hit.variation === 'bell') {
                elems.push(
                  <ellipse key={k()} cx={cx} cy={cy} rx={NR * 0.45} ry={NR * 0.35} fill={C_NOTE} />
                );
              }
            } else {
              const isGhost = hit.variation === 'ghost';
              elems.push(
                <ellipse
                  key={k()}
                  cx={cx}
                  cy={cy}
                  rx={NR * 1.25}
                  ry={NR * 0.85}
                  stroke={C_NOTE}
                  strokeWidth={0.38}
                  fill={isGhost ? 'none' : C_NOTE}
                />
              );
              if (isGhost) {
                elems.push(
                  <text
                    key={k()}
                    x={cx - NR * 2.0}
                    y={cy + NR * 1.0}
                    fontSize={6.5}
                    fill={C_NOTE}
                    fontFamily="Helvetica"
                  >
                    (
                  </text>
                );
                elems.push(
                  <text
                    key={k()}
                    x={cx + NR * 0.85}
                    y={cy + NR * 1.0}
                    fontSize={6.5}
                    fill={C_NOTE}
                    fontFamily="Helvetica"
                  >
                    )
                  </text>
                );
              }
              if (hit.variation === 'accent') {
                elems.push(
                  <text
                    key={k()}
                    x={cx - NR * 0.4}
                    y={stemDn ? cy + NR * 4.5 : cy - NR * 3.2}
                    fontSize={6}
                    fill={C_NOTE}
                    fontFamily="Helvetica"
                    fontWeight="bold"
                  >
                    &gt;
                  </text>
                );
              }
            }
          }
        }
      }

      curY += SYS_H + SYS_GAP;
    }
    if (patIdx < patterns.length - 1) curY += PAT_GAP - SYS_GAP;
  }

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: `${PW} / ${PH}`,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <svg viewBox={`0 0 ${PW} ${PH}`} width="100%" height="100%" style={{ display: 'block' }}>
        {elems}
      </svg>
    </div>
  );
}

// â”€â”€ DrumExportModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default DrumPaperPreview;
