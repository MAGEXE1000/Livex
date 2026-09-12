import { Dialog } from '../../../shared/design-system/dialogs';
import {
  getAllChords,
  getChordById,
  type Chord,
  type ChordType,
  type GuitarChordData,
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  type SongPreset,
  type SongSection,
  type CustomChord,
  transposeChordId,
  transposeKeyString,
  formatOffset,
  isChordOutOfKey,
  useScrollHide,
  setNavHidden,
  useT,
  useBackHandler,
  useIsWebDesktop,
  logActivity,
  useNavigationStore,
  useSettingsStore,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { SongCardGrid } from '../components/SongCardGrid';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import AnimatedActionButton from '../../../shared/animata/container/animated-border-trail';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import { StudioPageTransition } from '../../../components/StudioPageTransition';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { Capacitor } from '@capacitor/core';
import SuccessLottie from '../../../shared/lottie/SuccessLottie';
import MusicNotesLottie from '../../../shared/lottie/MusicNotesLottie';
import LiveMode from '../../chordex/components/LiveMode';
import CustomChordBuilder, { CustomMiniDiagram } from '../../chordex/components/CustomChordBuilder';
import ChordDiagram from '../../chordex/diagrams/ChordDiagram';
import { StaggeredReveal } from '../../../shared/animation';
import {
  ScreenScaffold,
  ScrollScaffold,
  SharedFloatingHeader,
} from '../../../shared/layout/StudioLayoutSystem';
import {
  Button,
  EmptyState,
  Input,
  SearchBar,
} from '../../../shared/design-system/StudioDesignSystem';
import { LiquidSwitch } from '../../../shared/design-system/LiquidSwitch';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ──────────────────── PDF EXPORT CONFIG ──────────────────── */
export interface ExportConfig {
  includeTitle: boolean;
  includeArtist: boolean;
  includeBPM: boolean;
  includeKey: boolean;
  includeNotes: boolean;
  chordDisplay: 'name' | 'diagram' | 'both';
  orientation: 'portrait' | 'landscape';
  paperSize: 'a4' | 'letter';
  theme: 'light' | 'dark';
  showNumbering: boolean;
  compactLayout: boolean;
  exportStyle: 'minimal' | 'elegant' | 'compact';
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeTitle: true,
  includeArtist: true,
  includeBPM: true,
  includeKey: true,
  includeNotes: true,
  chordDisplay: 'both',
  orientation: 'portrait',
  paperSize: 'a4',
  theme: 'light',
  showNumbering: true,
  compactLayout: false,
  exportStyle: 'elegant',
};

/* ──────────────────── PDF EXPORT ──────────────────── */
function buildPrintSVG(
  data: GuitarChordData,
  dark = false,
  _accentColor = '#679cff',
  _scale = 1,
  noLabel = false
): string {
  const numS = 6;
  const { frets, barres, baseFret } = data;
  const posF = frets.filter((f) => f > 0);
  const minA = posF.length ? Math.min(...posF) : 1;
  const maxA = posF.length ? Math.max(...posF) : 1;
  const effBase = baseFret > 1 ? baseFret : Math.max(1, minA);
  const numF = Math.max(4, maxA - effBase + 1);
  const W = 86,
    H = 84;
  const pL = 10,
    pT = 14,
    pR = 10;
  const gridW = W - pL - pR;
  const cW = gridW / (numS - 1);
  const cH = (H - pT - 10) / numF;
  const r = 4.5;
  const minF = effBase;
  const showNut = minF <= 1;

  const dotFill = dark ? '#e8e8e8' : '#191a1a';
  const lineFill = dark ? 'rgba(200,200,200,0.18)' : 'rgba(25,26,26,0.15)';
  const nutFill = dark ? '#ddd' : '#191a1a';
  const muteColor = dark ? '#555' : '#ccc';
  const openStroke = dark ? '#555' : '#bbb';

  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" overflow="visible">`;

  if (showNut) {
    s += `<rect x="${pL}" y="${pT - 5}" width="${gridW}" height="4" rx="1.5" fill="${nutFill}"/>`;
  }
  if (!showNut && !noLabel) {
    s += `<text x="${pL - 3}" y="${pT + cH * 0.5}" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="${dark ? '#aaa' : '#777'}" text-anchor="end" dominant-baseline="middle">${minF}</text>`;
  }
  for (let i = 0; i <= numF; i++) {
    const y = pT + i * cH;
    const isTopFret = i === 0 && !showNut;
    s += `<line x1="${pL}" y1="${y}" x2="${pL + gridW}" y2="${y}" stroke="${lineFill}" stroke-width="${isTopFret ? 1.5 : 1}"/>`;
  }
  for (let i = 0; i < numS; i++) {
    const x = pL + i * cW;
    s += `<line x1="${x}" y1="${pT}" x2="${x}" y2="${pT + numF * cH}" stroke="${lineFill}" stroke-width="1"/>`;
  }
  if (barres) {
    for (const barre of barres) {
      const fp = barre.fret - minF;
      if (fp >= 0 && fp < numF) {
        const x1 = pL + (numS - barre.fromString) * cW;
        const x2 = pL + (numS - barre.toString) * cW;
        const cy = pT + fp * cH + cH / 2;
        s += `<rect x="${Math.min(x1, x2)}" y="${cy - r}" width="${Math.abs(x2 - x1)}" height="${r * 2}" rx="${r}" fill="${dotFill}"/>`;
      }
    }
  }
  frets.forEach((f, si) => {
    if (f <= 0) return;
    const fp = f - minF;
    if (fp < 0 || fp >= numF) return;
    const cx = pL + si * cW,
      cy = pT + fp * cH + cH / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotFill}"/>`;
  });
  const aboveY = pT - 9;
  frets.forEach((f, si) => {
    const cx = pL + si * cW;
    if (f === -1)
      s += `<text x="${cx}" y="${aboveY + 3}" font-family="Arial,sans-serif" font-size="10" fill="${muteColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">×</text>`;
    else if (f === 0)
      s += `<circle cx="${cx}" cy="${aboveY}" r="3.5" fill="none" stroke="${openStroke}" stroke-width="1.2"/>`;
  });

  s += '</svg>';
  return s;
}

/** Generalized fretboard SVG for any string count (bass=4, guitar=6) */
function buildPrintFretboardSVG(
  frets: number[],
  baseFret: number,
  barres: { fret: number; fromString: number; toString: number }[],
  numStrings: number,
  dark = false,
  _accentColor = '#679cff',
  _scale = 1,
  noLabel = false
): string {
  const posF = frets.filter((f) => f > 0);
  const minA = posF.length ? Math.min(...posF) : 1;
  const maxA = posF.length ? Math.max(...posF) : 1;
  const effBase = baseFret > 1 ? baseFret : Math.max(1, minA);
  const numF = Math.max(4, maxA - effBase + 1);
  const W = 86,
    H = 84;
  const pL = 10,
    pT = 14,
    pR = 10;
  const gridW = W - pL - pR;
  const strSpacing = numStrings > 1 ? gridW / (numStrings - 1) : 0;
  const cH = (H - pT - 10) / numF;
  const r = 4.5;
  const minF = effBase;
  const showNut = minF <= 1;
  const dotFill = dark ? '#e8e8e8' : '#191a1a';
  const lineFill = dark ? 'rgba(200,200,200,0.18)' : 'rgba(25,26,26,0.15)';
  const nutFill = dark ? '#ddd' : '#191a1a';
  const muteColor = dark ? '#555' : '#ccc';
  const openStroke = dark ? '#555' : '#bbb';
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" overflow="visible">`;
  if (showNut) {
    s += `<rect x="${pL}" y="${pT - 5}" width="${(numStrings - 1) * strSpacing}" height="4" rx="1.5" fill="${nutFill}"/>`;
  } else if (!noLabel) {
    s += `<text x="${pL - 3}" y="${pT + cH * 0.5}" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="${dark ? '#aaa' : '#777'}" text-anchor="end" dominant-baseline="middle">${minF}</text>`;
  }
  for (let i = 0; i <= numF; i++) {
    const y = pT + i * cH;
    const isTop = i === 0 && !showNut;
    s += `<line x1="${pL}" y1="${y}" x2="${pL + (numStrings - 1) * strSpacing}" y2="${y}" stroke="${lineFill}" stroke-width="${isTop ? 1.5 : 1}"/>`;
  }
  for (let i = 0; i < numStrings; i++) {
    const x = pL + i * strSpacing;
    s += `<line x1="${x}" y1="${pT}" x2="${x}" y2="${pT + numF * cH}" stroke="${lineFill}" stroke-width="1"/>`;
  }
  for (const barre of barres) {
    const fp = barre.fret - minF;
    if (fp >= 0 && fp < numF) {
      const x1 = pL + (numStrings - barre.fromString) * strSpacing;
      const x2 = pL + (numStrings - barre.toString) * strSpacing;
      const cy = pT + fp * cH + cH / 2;
      s += `<rect x="${Math.min(x1, x2)}" y="${cy - r}" width="${Math.abs(x2 - x1)}" height="${r * 2}" rx="${r}" fill="${dotFill}"/>`;
    }
  }
  frets.forEach((f, si) => {
    if (f <= 0) return;
    const fp = f - minF;
    if (fp < 0 || fp >= numF) return;
    const cx = pL + si * strSpacing,
      cy = pT + fp * cH + cH / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotFill}"/>`;
  });
  const aboveY = pT - 9;
  frets.forEach((f, si) => {
    const cx = pL + si * strSpacing;
    if (f === -1)
      s += `<text x="${cx}" y="${aboveY + 3}" font-family="Arial,sans-serif" font-size="10" fill="${muteColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">×</text>`;
    else if (f === 0)
      s += `<circle cx="${cx}" cy="${aboveY}" r="3.5" fill="none" stroke="${openStroke}" stroke-width="1.2"/>`;
  });
  s += '</svg>';
  return s;
}

/** Piano keyboard SVG for PDF export */
function buildPrintPianoSVG(
  keys: number[],
  dark = false,
  accentColor = '#679cff',
  scale = 1
): string {
  const W = Math.round(160 * scale),
    H = Math.round(88 * scale);
  const WHITE_CHROMAS = [0, 2, 4, 5, 7, 9, 11];
  const BLACK_CHROMAS = [1, 3, 6, 8, 10];
  const BLACK_POS = [0.55, 1.55, 3.55, 4.55, 5.55];
  const numOct = 2,
    numWhite = numOct * 7;
  const wkW = W / numWhite,
    wkH = H - 2;
  const bkW = wkW * 0.62,
    bkH = wkH * 0.6;
  const whiteColor = dark ? '#cac6c2' : '#f4f4f4';
  const blackColor = dark ? '#1c1c1e' : '#1a1a1e';
  const strokeColor = dark ? '#383838' : '#d0d0d0';
  const bgColor = dark ? '#252525' : '#e8e8e8';
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" overflow="visible">`;
  s += `<rect width="${W}" height="${H}" rx="5" fill="${bgColor}"/>`;
  for (let i = 0; i < numWhite; i++) {
    const chroma = WHITE_CHROMAS[i % 7];
    const isOn = keys.includes(chroma);
    s += `<rect x="${i * wkW + 0.5}" y="1" width="${wkW - 1}" height="${wkH}" rx="2" fill="${isOn ? accentColor : whiteColor}" stroke="${strokeColor}" stroke-width="0.5"/>`;
  }
  for (let oct = 0; oct < numOct; oct++) {
    for (let b = 0; b < BLACK_POS.length; b++) {
      const chroma = BLACK_CHROMAS[b];
      const isOn = keys.includes(chroma);
      const x = (oct * 7 + BLACK_POS[b]) * wkW - bkW / 2;
      s += `<rect x="${x}" y="1" width="${bkW}" height="${bkH}" rx="2" fill="${isOn ? accentColor : blackColor}"/>`;
    }
  }
  s += '</svg>';
  return s;
}

async function exportPresetToPDF(
  preset: SongPreset,
  cfg: ExportConfig = DEFAULT_EXPORT_CONFIG,
  transposeOffset = 0,
  storedCustomChords: CustomChord[] = [],
  accentColor = '#679cff',
  pdfName = '',
  mode: 'save' | 'share' = 'share'
): Promise<boolean> {
  logActivity('export', `Exported ${preset.name} to PDF`, 'Chordex');
  const dark = cfg.theme === 'dark';
  const style = cfg.exportStyle ?? 'elegant';
  const compact = style === 'compact';
  const elegant = style === 'elegant';

  /* Build merged chord entry list */
  type ChordEntry =
    | { isCustom: false; chord: Chord; idx: number }
    | { isCustom: true; customChord: CustomChord; idx: number };

  const buildEntries = (ids: string[]): ChordEntry[] => {
    const out: ChordEntry[] = [];
    ids.forEach((id, idx) => {
      if (id.startsWith('custom-')) {
        const cc = storedCustomChords.find((c) => c.id === id);
        if (cc) out.push({ isCustom: true, customChord: cc, idx });
        else console.warn('[PDF] custom chord not found:', id);
      } else {
        const displayId = transposeOffset !== 0 ? transposeChordId(id, transposeOffset) : id;
        const chord = getChordById(displayId) ?? getChordById(id);
        if (chord) out.push({ isCustom: false, chord, idx });
        else console.warn('[PDF] chord ID not found in DB:', id, '(transposed:', displayId, ')');
      }
    });
    return out;
  };

  const hasSections = !!(preset.sections && preset.sections.length > 0);
  const allIds = hasSections ? preset.sections!.flatMap((s) => s.chords) : preset.chords;
  const entries = buildEntries(allIds);

  const safeName =
    preset.name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'Song';
  const safeArtist = preset.artist
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const autoTitle = safeArtist ? `${safeName}_${safeArtist}` : safeName;
  const docTitle = pdfName.trim()
    ? pdfName
        .trim()
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, '_')
    : autoTitle;

  /* Columns and SVG scale — auto-fit if not compact */
  const totalChords = entries.length;
  const isLandscape = cfg.orientation === 'landscape';

  let cols: number;
  let svgScale: number;

  if (compact) {
    cols = isLandscape ? 4 : 3;
    svgScale = 0.78;
  } else {
    // Page dimensions in px (at 96 dpi, letter = 816×1056, a4 = 794×1122)
    const paper = cfg.paperSize ?? 'a4';
    const PW_PX = isLandscape ? (paper === 'letter' ? 1056 : 1122) : paper === 'letter' ? 816 : 794;
    const PH_PX = isLandscape ? (paper === 'letter' ? 816 : 794) : paper === 'letter' ? 1056 : 1122;
    const BODY_PAD = isLandscape ? 60 : 80; // top+bottom body padding px
    const HEADER_H = isLandscape ? 160 : 200; // approx header height px
    const AVAIL_H = PH_PX - BODY_PAD - HEADER_H;
    const AVAIL_W = PW_PX - (isLandscape ? 80 : 104);
    const GAP = 20; // elegant gridGap px

    let chosenCols = 3;
    let chosenScale = 1.35;

    for (let c = 3; c <= 6; c++) {
      const cardW = (AVAIL_W - (c - 1) * GAP) / c;
      const scale = Math.min(1.35, (cardW - 32) / 160);
      const svgH = 180 * scale;
      // Card height: card vertical padding (40) + instr badge (20) + name (24) + diagMb (14) + notes (14) + type (12) + SVG
      const cardH = 40 + 20 + 24 + 14 + 14 + 12 + svgH;
      const rows = Math.ceil(totalChords / c);
      const total = rows * cardH + (rows - 1) * GAP;
      if (total <= AVAIL_H || c === 6) {
        chosenCols = c;
        chosenScale = Math.max(0.45, scale);
        break;
      }
    }

    cols = chosenCols;
    svgScale = chosenScale;
  }

  /* ── Palette ── */
  const bg = dark ? 'var(--c-background, #09090b)' : elegant ? '#f6f5f2' : '#ffffff';
  const text = dark ? '#edeae4' : '#0d0d0d';
  const sub = dark ? '#8a8a8a' : '#5a5f6e';
  const muted = dark ? '#4a4a4a' : '#a0a6b2';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const cardBg = dark ? 'var(--c-surface-low, #0f0f12)' : '#ffffff';
  const cardBdr = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const cardShad = dark
    ? 'none'
    : elegant
      ? '0 1px 6px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.04)'
      : 'none';
  const notesTxt = dark ? '#5a5a5a' : '#a0a6b2';
  const typeTxt = dark ? '#383838' : '#c8ccda';
  const numClr = elegant ? accentColor : dark ? '#444' : '#c8ccda';

  /* ── Sizes & spacing ── */
  const bodyPad = compact ? '20px 28px' : '40px 52px';
  const titleSz = compact ? '28px' : '46px';
  const artistSz = compact ? '12px' : '16px';
  const chordNameSz =
    cfg.chordDisplay === 'name' ? (compact ? '26px' : '38px') : compact ? '13px' : '20px';
  const cardPad = compact ? '12px 9px 10px' : '22px 16px 18px';
  const cardR = compact ? '8px' : '14px';
  const hdrPb = compact ? '14px' : '26px';
  const hdrMb = compact ? '12px' : '24px';
  const gridGap = compact ? '8px 6px' : '20px 14px';
  const diagMb = compact ? '5px' : '14px';

  /* ── Accent hex helpers ── */
  const accentA22 = accentColor + '22';
  const accentA44 = accentColor + '44';

  /* ── Badge style ── */
  const badgeStyle = elegant
    ? `display:inline-flex;align-items:center;padding:4px 13px;border-radius:100px;border:1.5px solid ${accentA44};background:${accentA22};color:${sub};font-size:${compact ? '9px' : '10px'};font-weight:700;letter-spacing:0.07em;text-transform:uppercase;`
    : `display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;border:1.5px solid ${divider};color:${sub};font-size:${compact ? '9px' : '10px'};font-weight:700;letter-spacing:0.06em;text-transform:uppercase;`;

  /* ── Title block ── */
  const titleInner = [
    cfg.includeTitle ? `<h1 class="song-name">${preset.name}</h1>` : '',
    cfg.includeArtist && preset.artist ? `<p class="artist">${preset.artist}</p>` : '',
  ].join('');
  const titleBlock = cfg.includeTitle
    ? elegant
      ? `<div style="border-left:4px solid ${accentColor};padding-left:14px;">${titleInner}</div>`
      : `<div>${titleInner}</div>`
    : '';

  const badges = [
    cfg.includeKey && preset.key
      ? `<span style="${badgeStyle}">Tonalidad de ${preset.key}</span>`
      : '',
    cfg.includeBPM && preset.bpm > 0 ? `<span style="${badgeStyle}">${preset.bpm} BPM</span>` : '',
  ]
    .filter(Boolean)
    .join('');

  const notesHtml =
    cfg.includeNotes && preset.notes
      ? `<p style="margin-top:10px;font-size:12px;color:${sub};font-style:italic;max-width:460px;line-height:1.55;">${preset.notes}</p>`
      : '';

  /* ── Section row ── */
  const pip = elegant
    ? `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${accentColor};margin-right:7px;flex-shrink:0;"></span>`
    : '';
  const chordCount = `${entries.length} acorde${entries.length !== 1 ? 's' : ''}`;

  /* ── Instrument badge helper ── */
  const INSTR_COLORS: Record<string, string> = {
    guitar: accentColor,
    bass: '#fb923c',
    piano: '#c084fc',
  };
  const instrBadge = (instr: string) => {
    const c = INSTR_COLORS[instr] ?? accentColor;
    return `<div class="chord-instr" style="background:${c}1a;color:${c};border:1px solid ${c}44;">${instr.toUpperCase()}</div>`;
  };

  /* ── Chord block builder ── */
  const buildBlock = (entry: ChordEntry, i: number): string => {
    const numEl = cfg.showNumbering ? `<div class="chord-num">${i + 1}</div>` : '';
    if (entry.isCustom) {
      const cc = entry.customChord;
      const instr = cc.instrument ?? 'guitar';
      const nameEl =
        cfg.chordDisplay !== 'diagram'
          ? `<div class="chord-name">${cc.name || 'Custom'}</div>`
          : '';
      let diagEl = '';
      if (cfg.chordDisplay !== 'name') {
        if (cc.instrument === 'piano') {
          diagEl = `<div class="chord-diagram">${buildPrintPianoSVG(cc.pianoKeys ?? [], dark, accentColor, svgScale)}</div>`;
        } else {
          const frts = cc.frets ?? [];
          const activeFrets = frts.filter((f: number) => f > 0);
          const baseFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 1;
          if (cc.instrument === 'guitar') {
            diagEl = `<div class="chord-diagram">${buildPrintSVG({ frets: frts, fingers: [], barres: cc.barres ?? [], baseFret }, dark, accentColor, svgScale)}</div>`;
          } else {
            diagEl = `<div class="chord-diagram">${buildPrintFretboardSVG(frts, baseFret, cc.barres ?? [], 4, dark, accentColor, svgScale)}</div>`;
          }
        }
      }
      return `<div class="chord-block">${numEl}${instrBadge(instr)}${nameEl}${diagEl}<div class="chord-notes">${cc.notes.slice(0, 6).join(' · ')}</div></div>`;
    }
    const chord = entry.chord;
    const nameEl =
      cfg.chordDisplay !== 'diagram' ? `<div class="chord-name">${chord.name}</div>` : '';
    const diagEl =
      cfg.chordDisplay !== 'name'
        ? `<div class="chord-diagram">${buildPrintSVG(chord.guitar, dark, accentColor, svgScale)}</div>`
        : '';
    return `<div class="chord-block">${numEl}${instrBadge('guitar')}${nameEl}${diagEl}<div class="chord-notes">${chord.notes.join(' · ')}</div><div class="chord-type">${chord.type.toUpperCase()}</div></div>`;
  };

  /* ── Chord content (flat grid or section groups) ── */
  const chordContent = hasSections
    ? preset
        .sections!.map((section) => {
          const secEntries = buildEntries(section.chords);
          const blocks = secEntries.map((e, i) => buildBlock(e, i)).join('');
          return `
          <div class="section-group">
            <div class="section-heading">${section.name}</div>
            <div class="chord-grid">${blocks || '<p style="font-size:11px;color:' + muted + ';padding:8px 0;">Sin acordes</p>'}</div>
          </div>`;
        })
        .join('')
    : `<div class="chord-grid">${entries.map((e, i) => buildBlock(e, i)).join('')}</div>`;

  /* ── Full HTML ── */
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><title>${docTitle}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:system-ui,-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;
  color:${text};background:${bg};padding:${bodyPad};
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.doc-header{
  display:flex;align-items:flex-start;justify-content:space-between;gap:20px;
  padding-bottom:${hdrPb};margin-bottom:${hdrMb};
  border-bottom:1px solid ${divider};
}
.song-name{
  font-size:${titleSz};font-weight:900;letter-spacing:-0.04em;
  line-height:1;color:${text};margin-bottom:6px;
}
.artist{font-size:${artistSz};font-weight:500;color:${sub};margin-top:4px;}
.meta-row{display:flex;flex-direction:column;gap:${compact ? '4px' : '5px'};margin-top:${compact ? '8px' : '12px'};}
.header-right{
  flex-shrink:0;text-align:right;padding-top:4px;
  font-size:10px;font-weight:700;color:${muted};
  letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;
}
.section-row{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:${compact ? '10px' : '14px'};
}
.section-label{
  font-size:${compact ? '7px' : '8px'};font-weight:700;
  letter-spacing:0.24em;text-transform:uppercase;color:${muted};
  display:flex;align-items:center;
}
.chord-grid{
  display:grid;
  grid-template-columns:repeat(${cols},1fr);
  gap:${gridGap};
}
.chord-block{
  position:relative;background:${cardBg};
  border:1px solid ${cardBdr};border-radius:${cardR};
  box-shadow:${cardShad};padding:${cardPad};
  text-align:center;break-inside:avoid;page-break-inside:avoid;
}
.chord-num{
  position:absolute;top:6px;right:8px;
  font-size:11px;font-weight:800;color:${numClr};
  letter-spacing:0.04em;line-height:1;
}
.chord-name{
  font-size:${chordNameSz};font-weight:900;letter-spacing:-0.02em;
  color:${text};margin-bottom:${compact ? '6px' : '10px'};line-height:1;
}
.chord-diagram{display:flex;justify-content:center;margin-bottom:${diagMb};overflow:visible;}
.chord-diagram svg{max-width:100%;height:auto;overflow:visible;}
.chord-notes{font-size:${compact ? '8px' : '9px'};color:${notesTxt};letter-spacing:0.04em;margin-bottom:2px;}
.chord-type{font-size:${compact ? '7px' : '8px'};font-weight:700;color:${typeTxt};letter-spacing:0.18em;text-transform:uppercase;}
.chord-instr{display:inline-block;padding:${compact ? '1px 6px' : '2px 8px'};border-radius:9999px;font-size:${compact ? '6px' : '7px'};font-weight:800;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:${compact ? '5px' : '8px'};}
.doc-footer{
  margin-top:${compact ? '16px' : '28px'};padding-top:10px;
  border-top:1px solid ${divider};
  display:flex;justify-content:space-between;align-items:center;
}
.footer-txt{font-size:9px;font-weight:600;color:${muted};letter-spacing:0.05em;}
.section-group{margin-bottom:${compact ? '18px' : '36px'};}
.section-heading{
  font-size:${compact ? '8px' : '11px'};font-weight:800;letter-spacing:0.22em;
  text-transform:uppercase;color:${accentColor};
  border-left:4px solid ${accentColor};padding-left:10px;
  margin-bottom:${compact ? '8px' : '16px'};padding-top:2px;padding-bottom:2px;
}
@media print{
  body{padding:${compact ? '12px 18px' : '24px 36px'};}
  @page{margin:0.8cm;size:${cfg.paperSize === 'letter' ? 'Letter' : 'A4'} ${cfg.orientation};}
  .chord-block{break-inside:avoid;}
  .section-group{break-inside:avoid-page;}
}
</style></head>
<body>
<div class="doc-header">
  <div>
    ${titleBlock}
    ${badges ? `<div class="meta-row">${badges}</div>` : ''}
    ${notesHtml}
  </div>
  <div class="header-right">${chordCount}</div>
</div>
<div class="section-row">
  <div class="section-label">${pip}${hasSections ? 'Secciones' : 'Progresión de acordes'}</div>
  <div class="section-label">${chordCount}</div>
</div>
${chordContent}
<div class="doc-footer">
  <span class="footer-txt">Chordex</span>
  <span class="footer-txt">${new Date().getFullYear()}</span>
</div>
</body></html>`;

  /* ── Export ──────────────────────────────────────────────────────────────────────── */
  // Draw PDF with jsPDF on both native and web — only the save step differs.
  const isNative = Capacitor.isNativePlatform();
  try {
    const { jsPDF } = await import('jspdf');

    /* ── Page geometry ────────────────────────────────────────────────────────── */
    const paper = cfg.paperSize ?? 'a4';
    const orientJ = cfg.orientation === 'landscape' ? 'l' : 'p';
    const isLand = orientJ === 'l';
    // Physical page dimensions in mm
    const PW = isLand ? (paper === 'letter' ? 279.4 : 297) : paper === 'letter' ? 215.9 : 210;
    const PH = isLand ? (paper === 'letter' ? 215.9 : 210) : paper === 'letter' ? 279.4 : 297;

    const doc = new jsPDF({ unit: 'mm', format: paper, orientation: orientJ });

    /* ── Style theme ────────────────────────────────────────────────────────── */
    const dark = cfg.theme === 'dark';
    const sty = cfg.exportStyle ?? 'elegant';
    const compact = sty === 'compact';
    const elegant = sty === 'elegant';

    const hexRgb = (h: string): [number, number, number] => {
      const n = parseInt(h.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const C_BG = dark ? '#0c0c0c' : elegant ? '#f6f5f2' : '#ffffff';
    const C_CARD = dark ? '#1c1c1c' : '#ffffff';
    const C_TEXT = dark ? '#edeae4' : '#0d0d0d';
    const C_SUB = dark ? '#8a8a8a' : '#5a5f6e';
    const C_MUTED = dark ? '#555555' : '#a0a6b2';
    const C_BORDER = dark ? '#2e2e2e' : elegant ? '#e0ddd7' : '#e0e0e0';
    const C_DIVIDER = dark ? '#2a2a2a' : elegant ? '#d8d5cf' : '#e0e0e0';
    const C_ACCENT = accentColor;
    const C_BADGE_BG = dark ? '#1e1e1e' : elegant ? '#eceae5' : '#f0f0f0';

    /* ── Margins ──────────────────────────────────────────────────────────────── */
    const ML = compact ? 10 : 14;
    const MR = compact ? 10 : 14;
    const MT = compact ? 10 : 13;
    const MB = 10;
    const CW = PW - ML - MR;

    /* ── Card layout — auto-fit all chords ────────────────────────────── */
    const CARD_GAP = compact ? 3.5 : 5;
    const CARD_PAD_X = compact ? 2 : 3;
    const CARD_PAD_Y = compact ? 2.5 : 3.5;

    // Estimate header height in mm
    const hasTitle = cfg.includeTitle && !!preset.name;
    const hasArtist = cfg.includeArtist && !!preset.artist;
    const hasBadges = (cfg.includeKey && !!preset.key) || (cfg.includeBPM && preset.bpm > 0);
    const HDR_H =
      (hasTitle ? (compact ? 7 : 9) : 0) +
      (hasArtist ? (compact ? 5 : 6.5) : 0) +
      (hasBadges ? (compact ? 6 : 7) : 0) +
      (hasTitle || hasArtist ? (compact ? 3 : 5) : 0); // divider gap

    const hasName = cfg.chordDisplay !== 'diagram';
    const hasDiag = cfg.chordDisplay !== 'name';
    const NAME_H = hasName ? (compact ? 4.5 : 5.5) : 0;

    const AVAIL_H = PH - MT - MB - HDR_H - 8; // 8mm footer

    // Find minimum cols that fits all chords on one page
    let bestCols = 3;
    for (let c = 3; c <= 6; c++) {
      const cardW = (CW - (c - 1) * CARD_GAP) / c;
      const diagW = cardW - 2 * CARD_PAD_X;
      const diagH = hasDiag ? diagW * (160 / 160) : 0;
      const cardH = 2 * CARD_PAD_Y + NAME_H + diagH + (compact ? 1.5 : 2);
      const rows = Math.ceil(entries.length / c);
      const total = rows * cardH + (rows - 1) * CARD_GAP;
      bestCols = c;
      if (total <= AVAIL_H || c === 6) break;
    }

    const COLS = bestCols;
    const CARD_W = (CW - (COLS - 1) * CARD_GAP) / COLS;
    const DIAG_W = CARD_W - 2 * CARD_PAD_X;
    const DIAG_H = hasDiag ? DIAG_W * (160 / 160) : 0;
    const CARD_H = 2 * CARD_PAD_Y + NAME_H + DIAG_H + (compact ? 1.5 : 2);

    /* ── Pre-render SVG diagrams → PNG data URLs ───────────────────── */
    // Convert mm size to pixels for the SVG builder (96 dpi)
    const PX_PER_MM = 96 / 25.4;
    const diagWpx = Math.round(DIAG_W * PX_PER_MM);
    const diagHpx = Math.round(DIAG_H * PX_PER_MM);
    const svgSc = diagWpx / 160;

    const svgToPng = (svgStr: string): Promise<string> =>
      new Promise((resolve) => {
        if (!svgStr) {
          resolve('');
          return;
        }
        const RES = 3; // render at 3× for sharp PDF output
        const cv = document.createElement('canvas');
        cv.width = diagWpx * RES;
        cv.height = diagHpx * RES;
        const ctx = cv.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.scale(RES, RES);
          ctx.drawImage(img, 0, 0, diagWpx, diagHpx);
          resolve(cv.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        // base64-encode the SVG to avoid blob-URL issues in Android WebView
        img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
      });

    type CardData = {
      name: string;
      png: string;
      notes: string;
      type: string;
      baseFret: number;
      showNut: boolean;
    };

    const cards: CardData[] = await Promise.all(
      entries.map(async (entry) => {
        let name = '',
          svgStr = '',
          notes = '',
          type = '';
        let baseFret = 1,
          showNut = true;
        if (entry.isCustom) {
          const cc = entry.customChord;
          name = cc.name;
          if (cc.instrument === 'piano') {
            svgStr = buildPrintPianoSVG(cc.pianoKeys ?? [], dark, C_ACCENT, svgSc);
          } else {
            const frets = cc.frets ?? [];
            baseFret = frets.some((f) => f > 4)
              ? Math.max(1, Math.min(...frets.filter((f) => f > 0)))
              : 1;
            showNut = baseFret === 1;
            const strings = cc.instrument === 'bass' ? 4 : 4;
            svgStr =
              cc.instrument === 'guitar'
                ? buildPrintSVG(
                    { frets, fingers: [], barres: cc.barres ?? [], baseFret },
                    dark,
                    C_ACCENT,
                    svgSc
                  )
                : buildPrintFretboardSVG(
                    frets,
                    baseFret,
                    cc.barres ?? [],
                    strings,
                    dark,
                    C_ACCENT,
                    svgSc
                  );
          }
        } else {
          const ch = entry.chord;
          name = ch.name;
          notes = (ch.notes ?? []).join(' ');
          type = ch.type ?? '';
          baseFret = ch.guitar.baseFret ?? 1;
          showNut = baseFret === 1;
          svgStr = buildPrintSVG(ch.guitar, dark, C_ACCENT, svgSc);
        }
        const png = hasDiag ? await svgToPng(svgStr) : '';
        return { name, png, notes, type, baseFret, showNut };
      })
    );

    /* ── Draw helpers ────────────────────────────────────────────────────────── */
    const fillPage = () => {
      doc.setFillColor(...hexRgb(C_BG));
      doc.rect(0, 0, PW, PH, 'F');
    };

    const drawHeader = (): number => {
      let y = MT;
      if (hasTitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(compact ? 17 : 22);
        doc.setTextColor(...hexRgb(C_TEXT));
        doc.text(preset.name, ML, y + (compact ? 5 : 6.5));
        y += compact ? 7 : 9;
      }
      if (hasArtist) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(compact ? 9 : 11);
        doc.setTextColor(...hexRgb(C_SUB));
        doc.text(preset.artist, ML, y + 3.5);
        y += compact ? 5 : 6.5;
      }
      if (hasBadges) {
        const badges: string[] = [];
        if (cfg.includeKey && preset.key) badges.push(`Key: ${preset.key}`);
        if (cfg.includeBPM && preset.bpm > 0) badges.push(`${preset.bpm} BPM`);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...hexRgb(C_ACCENT));
        let bx = ML;
        badges.forEach((b) => {
          const bw = doc.getTextWidth(b) + 5;
          const bh = 4.5;
          doc.setFillColor(...hexRgb(C_BADGE_BG));
          doc.setDrawColor(...hexRgb(C_ACCENT));
          doc.setLineWidth(0.25);
          doc.roundedRect(bx, y, bw, bh, 1.5, 1.5, 'FD');
          doc.text(b, bx + 2.5, y + 3.1);
          bx += bw + 2;
        });
        y += compact ? 6 : 7;
      }
      // Divider
      if (hasTitle || hasArtist) {
        doc.setDrawColor(...hexRgb(C_DIVIDER));
        doc.setLineWidth(0.3);
        doc.line(ML, y + 1, PW - MR, y + 1);
        y += compact ? 3 : 5;
      }
      return y;
    };

    const drawCard = (card: CardData, col: number, rowStartY: number, num: number) => {
      const cx = ML + col * (CARD_W + CARD_GAP);
      const cy = rowStartY;

      // Card background
      doc.setFillColor(...hexRgb(C_CARD));
      if (elegant) {
        doc.setDrawColor(...hexRgb(C_BORDER));
        doc.setLineWidth(0.25);
        doc.roundedRect(cx, cy, CARD_W, CARD_H, 2, 2, 'FD');
      } else if (compact) {
        doc.roundedRect(cx, cy, CARD_W, CARD_H, 1.5, 1.5, 'F');
      }
      // minimal: no card background — just content on page bg

      let iy = cy + CARD_PAD_Y;

      // Chord number — top-right to match preview
      if (cfg.showNumbering) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(compact ? 6.5 : 7.5);
        doc.setTextColor(...hexRgb(C_MUTED));
        doc.text(String(num), cx + CARD_W - CARD_PAD_X, cy + (compact ? 3.5 : 4), {
          align: 'right',
        });
      }

      // Chord name
      if (hasName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(compact ? 9 : 11);
        doc.setTextColor(...hexRgb(C_TEXT));
        doc.text(card.name, cx + CARD_W / 2, iy + (compact ? 3 : 3.8), {
          align: 'center',
          maxWidth: CARD_W - 2,
        });
        iy += NAME_H;
      }

      // Diagram
      if (hasDiag && card.png) {
        const imgX = cx + CARD_PAD_X;
        const imgY = iy;
        doc.addImage(card.png, 'PNG', imgX, imgY, DIAG_W, DIAG_H);
        iy += DIAG_H + 1;
      }

      // Notes (chord tones)
      if (card.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...hexRgb(C_MUTED));
        doc.text(card.notes, cx + CARD_W / 2, iy + 1.8, { align: 'center', maxWidth: CARD_W - 1 });
      }
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
      const fy = PH - MB + 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...hexRgb(C_MUTED));
      doc.text('CHORDEX', ML, fy);
      if (totalPages > 1) {
        doc.text(`${pageNum} / ${totalPages}`, PW - MR, fy, { align: 'right' });
      }
    };

    /* ── Section heading helper ────────────────────────────────────────────────── */
    const SECT_H = compact ? 6 : 8; // mm: heading + gap below

    const drawSectionHeading = (name: string, y: number) => {
      doc.setFillColor(...hexRgb(C_ACCENT));
      doc.rect(ML, y + 0.5, 0.8, compact ? 3 : 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(compact ? 6 : 7.5);
      doc.setTextColor(...hexRgb(C_ACCENT));
      doc.text(name.toUpperCase(), ML + 3, y + (compact ? 3 : 3.8));
    };

    /* ── Build flat draw-item list ─────────────────────────────────────────── */
    type DrawItem =
      { type: 'section-header'; name: string } | { type: 'card'; data: CardData; num: number };

    const drawItems: DrawItem[] = [];

    if (hasSections) {
      let cardIdx = 0;
      preset.sections!.forEach((sec) => {
        const secLen = buildEntries(sec.chords).length;
        drawItems.push({ type: 'section-header', name: sec.name });
        for (let i = 0; i < secLen; i++) {
          if (cardIdx < cards.length) {
            drawItems.push({ type: 'card', data: cards[cardIdx], num: i + 1 });
            cardIdx++;
          }
        }
      });
    } else {
      cards.forEach((card, i) => drawItems.push({ type: 'card', data: card, num: i + 1 }));
    }

    /* ── Simulate layout to count total pages ────────────────────────────── */
    const AVAIL_BOTTOM = PH - MB - 8;
    const headerStartY = MT + HDR_H; // same Y that drawHeader() returns, without drawing
    const simTotalPages = (() => {
      let page = 1;
      let cy = headerStartY;
      let col = 0;

      const simBreak = (neededH: number) => {
        if (cy + neededH > AVAIL_BOTTOM) {
          if (col > 0) {
            cy += CARD_H + CARD_GAP;
            col = 0;
          }
          if (cy + neededH > AVAIL_BOTTOM) {
            page++;
            cy = MT;
          }
        }
      };

      for (const item of drawItems) {
        if (item.type === 'section-header') {
          if (col > 0) {
            cy += CARD_H + CARD_GAP;
            col = 0;
          }
          simBreak(SECT_H + CARD_H);
          cy += SECT_H;
        } else {
          if (col === 0) simBreak(CARD_H);
          col++;
          if (col >= COLS) {
            col = 0;
            cy += CARD_H + CARD_GAP;
          }
        }
      }
      return page;
    })();

    /* ── Paginate & draw (Y-cursor) ────────────────────────────────────────── */
    fillPage();
    let cy = drawHeader();
    let colIdx = 0;
    let curPage = 1;

    const pageBreakIfNeeded = (neededH: number) => {
      if (cy + neededH > AVAIL_BOTTOM) {
        if (colIdx > 0) {
          cy += CARD_H + CARD_GAP;
          colIdx = 0;
        }
        if (cy + neededH > AVAIL_BOTTOM) {
          drawFooter(curPage, simTotalPages);
          doc.addPage();
          fillPage();
          curPage++;
          cy = MT;
        }
      }
    };

    for (const item of drawItems) {
      if (item.type === 'section-header') {
        // Flush current partial row
        if (colIdx > 0) {
          cy += CARD_H + CARD_GAP;
          colIdx = 0;
        }
        // Ensure space for heading + at least one card row
        pageBreakIfNeeded(SECT_H + CARD_H);
        drawSectionHeading(item.name, cy);
        cy += SECT_H;
      } else {
        if (colIdx === 0) pageBreakIfNeeded(CARD_H);
        drawCard(item.data, colIdx, cy, item.num);
        colIdx++;
        if (colIdx >= COLS) {
          colIdx = 0;
          cy += CARD_H + CARD_GAP;
        }
      }
    }

    drawFooter(curPage, simTotalPages);

    /* ── Save & share ────────────────────────────────────────────────────────── */
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      if (mode === 'save') {
        // Try public Downloads first, fall back to app-specific external.
        let savedOk = false;
        try {
          await Filesystem.writeFile({
            path: `Download/${docTitle}.pdf`,
            data: pdfBase64,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          savedOk = true;
        } catch {
          try {
            await Filesystem.writeFile({
              path: `${docTitle}.pdf`,
              data: pdfBase64,
              directory: Directory.External,
              recursive: true,
            });
            savedOk = true;
          } catch {
            /* both failed */
          }
        }
        return savedOk;
      } else {
        try {
          const { Share } = await import('@capacitor/share');
          const writeResult = await Filesystem.writeFile({
            path: `${docTitle}.pdf`,
            data: pdfBase64,
            directory: Directory.Cache,
            recursive: true,
          });
          await Share.share({
            title: docTitle,
            url: writeResult.uri,
            dialogTitle: 'Share your chord sheet PDF',
          });
        } catch {
          // User cancelled — do nothing.
        }
        return true;
      }
    } else {
      // Web browser: download as PDF
      doc.save(`${docTitle}.pdf`);
      return true;
    }
  } catch {
    // PDF generation failed — do nothing.
  }
  return false;
}

/* ──────────────────── Chord Picker Sheet ──────────────────── */
const PICKER_CATS: { type: ChordType | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'major', label: 'Major' },
  { type: 'minor', label: 'Minor' },
  { type: '7th', label: '7th' },
  { type: 'maj7', label: 'Maj7' },
  { type: 'min7', label: 'Min7' },
  { type: 'dim', label: 'Dim' },
  { type: 'aug', label: 'Aug' },
  { type: 'sus2', label: 'Sus2' },
  { type: 'sus4', label: 'Sus4' },
  { type: '9th', label: '9th' },
  { type: 'maj9', label: 'Maj9' },
  { type: 'min9', label: 'Min9' },
  { type: 'add9', label: 'Add9' },
  { type: '6th', label: '6th' },
  { type: 'min6', label: 'Min6' },
  { type: 'halfdim', label: 'ø7' },
  { type: 'dim7', label: 'Dim7' },
  { type: '11th', label: '11th' },
  { type: '13th', label: '13th' },
  { type: '7sus4', label: '7sus4' },
  { type: '7sus2', label: '7sus2' },
  { type: 'maj6', label: 'Maj6' },
  { type: 'power', label: 'Power' },
  { type: 'minmaj7', label: 'm/M7' },
  { type: 'aug7', label: 'Aug7' },
  { type: '7b9', label: '7b9' },
  { type: '7s9', label: '7#9' },
  { type: '69', label: '6/9' },
  { type: '9sus4', label: '9sus4' },
];

/* ──────────────────── Preview Fretboard (inside paper card) ──────────────────── */
function PreviewFretboard({ data, dark }: { data: GuitarChordData; dark: boolean }) {
  const W = 86,
    H = 84,
    numS = 6,
    numF = 4;
  const pL = 10,
    pT = 14,
    pR = 10;
  const cW = (W - pL - pR) / (numS - 1);
  const cH = (H - pT - 10) / numF;
  const r = 4.5;
  const { frets, barres, baseFret } = data;
  const allPositive = frets.filter((f) => f > 0);
  const minActive = allPositive.length ? Math.min(...allPositive) : 1;
  const minF = baseFret > 1 ? baseFret : Math.max(1, minActive);
  const showNut = minF <= 1;
  const dotFill = dark ? '#e8e8e8' : '#191a1a';
  const lineFill = dark ? 'rgba(200,200,200,0.18)' : 'rgba(25,26,26,0.15)';
  const nutFill = dark ? '#ddd' : '#191a1a';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {showNut && (
        <rect x={pL} y={pT - 5} width={(numS - 1) * cW} height={4} rx={1.5} fill={nutFill} />
      )}
      {!showNut && (
        <text
          x={pL - 3}
          y={pT + cH * 0.5}
          fontFamily="Arial"
          fontSize={8}
          fontWeight="700"
          fill={dark ? '#aaa' : '#777'}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {minF}
        </text>
      )}
      {Array.from({ length: numF + 1 }).map((_, i) => (
        <line
          key={i}
          x1={pL}
          y1={pT + i * cH}
          x2={pL + (numS - 1) * cW}
          y2={pT + i * cH}
          stroke={lineFill}
          strokeWidth={i === 0 && !showNut ? 1.5 : 1}
        />
      ))}
      {Array.from({ length: numS }).map((_, i) => (
        <line
          key={i}
          x1={pL + i * cW}
          y1={pT}
          x2={pL + i * cW}
          y2={pT + numF * cH}
          stroke={lineFill}
          strokeWidth={1}
        />
      ))}
      {barres.map((barre, bi) => {
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
            fill={dotFill}
          />
        );
      })}
      {frets.map((f, si) => {
        if (f === -1)
          return (
            <text
              key={si}
              x={pL + si * cW}
              y={pT - 9}
              fontFamily="Arial"
              fontSize={10}
              fill={dark ? '#555' : '#ccc'}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="bold"
            >
              ×
            </text>
          );
        if (f === 0)
          return (
            <circle
              key={si}
              cx={pL + si * cW}
              cy={pT - 9}
              r={3.5}
              fill="none"
              stroke={dark ? '#555' : '#bbb'}
              strokeWidth={1.2}
            />
          );
        const fp = f - minF;
        if (fp < 0 || fp >= numF) return null;
        const stringNum = numS - si;
        const onBarre = barres.some(
          (b) => b.fret === f && stringNum >= b.toString && stringNum <= b.fromString
        );
        if (onBarre) return null;
        const cx = pL + si * cW,
          cy = pT + fp * cH + cH / 2;
        return <circle key={si} cx={cx} cy={cy} r={r} fill={dotFill} />;
      })}
    </svg>
  );
}

/* ──────────────────── Print-neutral custom chord diagram ──────────────────── */
function PreviewCustomDiagram({ chord, dark }: { chord: CustomChord; dark: boolean }) {
  const dotFill = dark ? '#e8e8e8' : '#191a1a';
  const lineFill = dark ? 'rgba(200,200,200,0.18)' : 'rgba(25,26,26,0.15)';
  const nutFill = dark ? '#ddd' : '#191a1a';

  if (chord.instrument === 'piano') {
    const keys = chord.pianoKeys ?? [];
    const W = 76,
      H = 44;
    const WHITE = [0, 2, 4, 5, 7, 9, 11];
    const BLACK_CHROMAS = [1, 3, 6, 8, 10];
    const BLACK_POS = [0.55, 1.55, 3.55, 4.55, 5.55];
    const wkW = W / 7,
      wkH = H;
    const bkW = wkW * 0.6,
      bkH = wkH * 0.58;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {WHITE.map((chroma, i) => (
          <rect
            key={i}
            x={i * wkW + 0.5}
            y={0.5}
            width={wkW - 1}
            height={wkH - 1}
            rx={1.5}
            fill={keys.includes(chroma) ? dotFill : dark ? '#333' : '#f8f8f8'}
            stroke={dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)'}
            strokeWidth={0.5}
          />
        ))}
        {BLACK_POS.map((pos, i) => (
          <rect
            key={i}
            x={pos * wkW - bkW / 2}
            y={0.5}
            width={bkW}
            height={bkH}
            rx={1}
            fill={keys.includes(BLACK_CHROMAS[i]) ? dotFill : dark ? '#888' : '#1a1a1a'}
          />
        ))}
      </svg>
    );
  }

  const numS = chord.instrument === 'guitar' ? 6 : 4;
  const frets = chord.frets ?? Array(numS).fill(0);
  const cBarres = chord.barres ?? [];
  const active = frets.filter((f) => f > 0);
  const minActive = active.length > 0 ? Math.min(...active) : 1;

  const W = 86,
    H = 84,
    numF = 4;
  const pL = 10,
    pT = 14,
    pR = 10;
  const cW = (W - pL - pR) / (numS - 1);
  const cH = (H - pT - 10) / numF;
  const r = 4.5;
  const minF = Math.max(1, minActive);
  const showNut = minF <= 1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {showNut && (
        <rect x={pL} y={pT - 5} width={(numS - 1) * cW} height={4} rx={1.5} fill={nutFill} />
      )}
      {!showNut && (
        <text
          x={pL - 3}
          y={pT + cH * 0.5}
          fontFamily="Arial"
          fontSize={8}
          fontWeight="700"
          fill={dark ? '#aaa' : '#777'}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {minF}
        </text>
      )}
      {Array.from({ length: numF + 1 }).map((_, i) => (
        <line
          key={i}
          x1={pL}
          y1={pT + i * cH}
          x2={pL + (numS - 1) * cW}
          y2={pT + i * cH}
          stroke={lineFill}
          strokeWidth={i === 0 && !showNut ? 1.5 : 1}
        />
      ))}
      {Array.from({ length: numS }).map((_, i) => (
        <line
          key={i}
          x1={pL + i * cW}
          y1={pT}
          x2={pL + i * cW}
          y2={pT + numF * cH}
          stroke={lineFill}
          strokeWidth={1}
        />
      ))}
      {cBarres.map((barre: { fret: number; fromString: number; toString: number }, bi: number) => {
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
            fill={dotFill}
          />
        );
      })}
      {frets.map((f, si) => {
        if (f === -1)
          return (
            <text
              key={si}
              x={pL + si * cW}
              y={pT - 9}
              fontFamily="Arial"
              fontSize={10}
              fill={dark ? '#555' : '#ccc'}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="bold"
            >
              ×
            </text>
          );
        if (f === 0)
          return (
            <circle
              key={si}
              cx={pL + si * cW}
              cy={pT - 9}
              r={3.5}
              fill="none"
              stroke={dark ? '#555' : '#bbb'}
              strokeWidth={1.2}
            />
          );
        const fp = f - minF;
        if (fp < 0 || fp >= numF) return null;
        const stringNum = numS - si;
        const onBarre = cBarres.some(
          (b: { fret: number; fromString: number; toString: number }) =>
            b.fret === f && stringNum >= b.toString && stringNum <= b.fromString
        );
        if (onBarre) return null;
        const cx = pL + si * cW,
          cy = pT + fp * cH + cH / 2;
        return <circle key={si} cx={cx} cy={cy} r={r} fill={dotFill} />;
      })}
    </svg>
  );
}

/* ──────────────────── Paper Document Preview ──────────────────── */
function PaperPreview({
  preset,
  cfg,
  accent,
  transposeOffset = 0,
  storedCustomChords = [],
}: {
  preset: SongPreset;
  cfg: ExportConfig;
  accent: { from: string; to: string };
  transposeOffset?: number;
  storedCustomChords?: CustomChord[];
}) {
  const dark = cfg.theme === 'dark';
  const style = cfg.exportStyle ?? 'elegant';
  const compact = style === 'compact';
  const elegant = style === 'elegant';

  const hasSections = !!(preset.sections && preset.sections.length > 0);
  const isLand = cfg.orientation === 'landscape';
  const paper = cfg.paperSize ?? 'a4';

  /* Build ALL chord entries – handles both standard and custom chords */
  type PreviewEntry = { kind: 'standard'; chord: Chord } | { kind: 'custom'; cc: CustomChord };
  type PreviewSection = { name: string; entries: PreviewEntry[] };

  const buildPreviewEntries = (ids: string[]): PreviewEntry[] => {
    return ids.flatMap((id): PreviewEntry[] => {
      if (id.startsWith('custom-')) {
        const cc = storedCustomChords.find((c) => c.id === id);
        return cc ? [{ kind: 'custom' as const, cc }] : [];
      }
      const displayId = transposeOffset !== 0 ? transposeChordId(id, transposeOffset) : id;
      const chord = getChordById(displayId) ?? getChordById(id);
      return chord ? [{ kind: 'standard' as const, chord }] : [];
    });
  };

  const previewSections: PreviewSection[] = hasSections
    ? preset.sections!.map((sec) => ({ name: sec.name, entries: buildPreviewEntries(sec.chords) }))
    : [{ name: 'Progresión de acordes', entries: buildPreviewEntries(preset.chords) }];

  /* Auto-fit columns based on total chord count – same thresholds as jsPDF engine */
  const totalChords = previewSections.reduce((n, s) => n + s.entries.length, 0);
  const cols = totalChords <= 6 ? 3 : totalChords <= 12 ? 4 : totalChords <= 18 ? 5 : 6;

  /* Scale card visuals down as column count increases */
  const cardPad =
    cols <= 3
      ? '8px 5px 7px'
      : cols === 4
        ? '5px 4px 5px'
        : cols === 5
          ? '4px 3px 4px'
          : '3px 2px 3px';
  const cardFont = cols <= 3 ? '9px' : cols === 4 ? '7px' : cols === 5 ? '6px' : '5px';
  const gridGap =
    cols <= 3 ? '7px 5px' : cols === 4 ? '5px 4px' : cols === 5 ? '4px 3px' : '3px 2px';

  const bg = dark ? '#000000' : elegant ? '#f5f4f1' : '#ffffff';
  const paperColor = dark ? '#181818' : '#ffffff';
  const text = dark ? '#edeae4' : '#0d0d0d';
  const sub = dark ? '#888' : '#5a5f6e';
  const muted = dark ? '#484848' : '#a0a6b2';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const cardBdr = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const cardShad = dark ? 'none' : elegant ? '0 1px 4px rgba(0,0,0,0.07)' : 'none';
  const accentC = accent.from;

  return (
    <div
      style={{
        background: bg,
        borderRadius: '8px',
        boxShadow: dark
          ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
          : '0 32px 80px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08)',
        padding: compact ? '18px 16px' : '22px 18px',
        color: text,
        fontFamily: 'var(--font-headline)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        aspectRatio: isLand
          ? paper === 'letter'
            ? '1.294 / 1'
            : '1.414 / 1'
          : paper === 'letter'
            ? '1 / 1.294'
            : '1 / 1.414',
        overflow: 'hidden',
        transition: 'background 300ms ease, box-shadow 300ms ease',
      }}
    >
      {/* Document header */}
      {cfg.includeTitle && (
        <div
          style={{
            borderBottom: `1px solid ${divider}`,
            paddingBottom: compact ? '10px' : '14px',
            marginBottom: compact ? '10px' : '14px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={elegant ? { borderLeft: `3px solid ${accentC}`, paddingLeft: '8px' } : {}}>
            <p
              style={{
                fontSize: compact ? '15px' : '20px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: text,
              }}
            >
              {preset.name || 'Untitled Song'}
            </p>
            {cfg.includeArtist && preset.artist && (
              <p
                style={{
                  fontSize: compact ? '7px' : '9px',
                  fontWeight: 500,
                  color: sub,
                  marginTop: '3px',
                }}
              >
                {preset.artist}
              </p>
            )}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              {cfg.includeKey && preset.key && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '100px',
                    fontSize: '6px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    border: elegant ? `1px solid ${accentC}44` : `1px solid ${divider}`,
                    background: elegant ? `${accentC}18` : 'transparent',
                    color: sub,
                  }}
                >
                  Key {preset.key}
                </span>
              )}
              {cfg.includeBPM && preset.bpm > 0 && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '100px',
                    fontSize: '6px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    border: elegant ? `1px solid ${accentC}44` : `1px solid ${divider}`,
                    background: elegant ? `${accentC}18` : 'transparent',
                    color: sub,
                  }}
                >
                  {preset.bpm} BPM
                </span>
              )}
            </div>
          </div>
          <p
            style={{
              fontSize: '6px',
              fontWeight: 700,
              color: muted,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              paddingTop: '2px',
            }}
          >
            {previewSections.reduce((n, s) => n + s.entries.length, 0)} chords
          </p>
        </div>
      )}

      {/* Section(s) + chord grid */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: hasSections ? (compact ? '8px' : '12px') : 0,
        }}
      >
        {previewSections.map((sec, sIdx) => (
          <div key={sIdx}>
            {/* Section heading or "Chord Progression" label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: compact ? '5px' : '7px',
              }}
            >
              {hasSections ? (
                <div style={{ borderLeft: `2px solid ${accentC}`, paddingLeft: '4px' }}>
                  <p
                    style={{
                      fontSize: '6px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.22em',
                      color: accentC,
                      lineHeight: 1,
                    }}
                  >
                    {sec.name}
                  </p>
                </div>
              ) : (
                <>
                  {elegant && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: accentC,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <p
                    style={{
                      fontSize: '6px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.22em',
                      color: muted,
                    }}
                  >
                    Progresión de acordes
                  </p>
                </>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: gridGap,
              }}
            >
              {sec.entries.map((entry, i) => {
                const entryKey = entry.kind === 'standard' ? entry.chord.id : entry.cc.id;
                const entryName =
                  entry.kind === 'standard' ? entry.chord.name : entry.cc.name || 'Custom';
                return (
                  <div
                    key={entryKey}
                    style={{
                      position: 'relative',
                      background: paperColor,
                      border: `1px solid ${cardBdr}`,
                      borderRadius: cols >= 5 ? '4px' : compact ? '5px' : '7px',
                      boxShadow: cardShad,
                      padding: cardPad,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {cfg.showNumbering && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '6px',
                          fontSize: '9px',
                          fontWeight: 800,
                          color: elegant ? accentC : muted,
                          lineHeight: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                    {cfg.chordDisplay !== 'diagram' && (
                      <p
                        style={{
                          fontSize: cardFont,
                          fontWeight: 900,
                          letterSpacing: '-0.01em',
                          color: text,
                          marginBottom: '2px',
                          lineHeight: 1,
                        }}
                      >
                        {entryName}
                      </p>
                    )}
                    {cfg.chordDisplay !== 'name' && entry.kind === 'standard' && (
                      <PreviewFretboard data={entry.chord.guitar} dark={dark} />
                    )}
                    {cfg.chordDisplay !== 'name' && entry.kind === 'custom' && (
                      <PreviewCustomDiagram chord={entry.cc} dark={dark} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: compact ? '7px' : '10px',
          borderTop: `1px solid ${divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p style={{ fontSize: '5px', fontWeight: 700, color: muted, letterSpacing: '0.05em' }}>
          Chordex
        </p>
        <p style={{ fontSize: '5px', color: muted, letterSpacing: '0.04em' }}>Page 1 of 1</p>
      </div>
    </div>
  );
}

/* ──────────────────── Export Config Modal ──────────────────── */
function ExportModal({
  preset,
  accent,
  onClose,
  transposeOffset = 0,
  storedCustomChords = [],
}: {
  preset: SongPreset;
  accent: { from: string; to: string };
  onClose: () => void;
  transposeOffset?: number;
  storedCustomChords?: CustomChord[];
}) {
  const t = useT();
  const [cfg, setCfg] = useState<ExportConfig>({ ...DEFAULT_EXPORT_CONFIG });
  const [pdfName, setPdfName] = useState('');
  const [savingPDF, setSavingPDF] = useState(false);
  const [sharingPDF, setSharingPDF] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saveResult, setSaveResult] = useState<'ok' | 'fail' | null>(null);
  const isNative =
    typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(true);
  const lastScrollTop = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const sy = el.scrollTop;
      setBarVisible(sy <= lastScrollTop.current || sy < 50);
      lastScrollTop.current = sy;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const update = <K extends keyof ExportConfig>(key: K, val: ExportConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: val }));

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  const handleExport = async (mode: 'save' | 'share' = 'share') => {
    if (mode === 'save') setSavingPDF(true);
    else setSharingPDF(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const result = await exportPresetToPDF(
        preset,
        cfg,
        transposeOffset,
        storedCustomChords,
        accent.from,
        pdfName,
        mode
      );
      if (mode === 'save') {
        setSaveResult(result === true ? 'ok' : 'fail');
        setTimeout(() => setSaveResult(null), 3000);
      } else {
        handleClose();
      }
    } finally {
      if (mode === 'save') setSavingPDF(false);
      else setSharingPDF(false);
    }
  };

  /* Appllama LiquidSwitch */
  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <LiquidSwitch
      checked={on}
      onChange={() => onChange()}
      size="sm"
      accentFrom={accent.from}
      accentTo={accent.to}
    />
  );

  /* Segmented control */
  const Segment = <T extends string>({
    options,
    value,
    onChange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) => (
    <div
      style={{
        display: 'flex',
        background: 'var(--app-surface)',
        borderRadius: '10px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="btn-smooth"
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '7px',
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              background: active ? 'var(--app-surface-highest)' : 'transparent',
              color: active ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
              transition: 'all 160ms ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  /* Settings row */
  const Row = ({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'var(--app-surface-high)',
        borderRadius: '14px',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--c-text-primary)',
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--c-text-secondary)',
              marginTop: '1px',
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );

  const totalChordCount = preset.sections?.length
    ? preset.sections.reduce((n, s) => n + s.chords.length, 0)
    : preset.chords.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--c-background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <SharedFloatingHeader
        title={preset?.name ? `${preset.name} · PDF` : 'PDF Preview'}
        onBack={handleClose}
        toolbarActions={
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--c-text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(72,72,72,0.3)',
            }}
          >
            PDF
          </span>
        }
      />

      {/* ── Scrollable body ── */}
      <ScrollScaffold
        bottomSpacing={false}
        style={{
          flex: 1,
          padding: 0,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
        }}
      >
        {/* Paper stage */}
        <div
          style={{
            padding: '32px 24px 28px',
            background: '#0a0a0a',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              pointerEvents: 'none',
              backgroundImage: 'radial-gradient(#555 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <PaperPreview
              preset={preset}
              cfg={cfg}
              accent={accent}
              transposeOffset={transposeOffset}
              storedCustomChords={storedCustomChords}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginTop: '14px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#3a3a3a',
              }}
            >
              Página 1 de 1
            </span>
            <span
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: '#3a3a3a',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#3a3a3a',
              }}
            >
              {totalChordCount} {totalChordCount === 1 ? 'acorde' : 'acordes'}
            </span>
          </div>
        </div>

        {/* File name + notes */}
        <div style={{ padding: '28px 20px 8px' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--c-text-muted)',
              marginBottom: '10px',
            }}
          >
            File Name
          </p>
          <input
            type="text"
            value={pdfName}
            onChange={(e) => setPdfName(e.target.value)}
            placeholder={preset.name || 'Song'}
            maxLength={80}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: '12px',
              background: 'var(--c-surface-low)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--font-headline)',
              fontWeight: 600,
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 200ms ease',
              marginBottom: '16px',
            }}
          />

          {/* PDF personalization options */}
          <div
            style={{
              display: 'flex',
              gap: '7px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            {/* Paper size */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '2px',
                gap: '1px',
              }}
            >
              {(['a4', 'letter'] as const).map((v) => {
                const active = (cfg.paperSize ?? 'a4') === v;
                return (
                  <button
                    key={v}
                    onClick={() => update('paperSize', v)}
                    className="btn-smooth"
                    style={{
                      padding: '5px 11px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      background: active ? accent.from : 'transparent',
                      color: active ? '#fff' : '#6e6e80',
                      transition: 'all 160ms ease',
                    }}
                  >
                    {v === 'a4' ? 'A4' : 'US'}
                  </button>
                );
              })}
            </div>

            {/* Orientation */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '2px',
                gap: '1px',
              }}
            >
              {[['portrait', 'Port'] as const, ['landscape', 'Land'] as const].map(([v, lbl]) => {
                const active = cfg.orientation === v;
                return (
                  <button
                    key={v}
                    onClick={() => update('orientation', v)}
                    className="btn-smooth"
                    style={{
                      padding: '5px 11px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      background: active ? accent.from : 'transparent',
                      color: active ? '#fff' : '#6e6e80',
                      transition: 'all 160ms ease',
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            {/* Export style */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '2px',
                gap: '1px',
              }}
            >
              {[
                ['minimal', 'Min'] as const,
                ['elegant', 'Ele'] as const,
                ['compact', 'Cmp'] as const,
              ].map(([v, lbl]) => {
                const active = (cfg.exportStyle ?? 'elegant') === v;
                return (
                  <button
                    key={v}
                    onClick={() => update('exportStyle', v as ExportConfig['exportStyle'])}
                    className="btn-smooth"
                    style={{
                      padding: '5px 11px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                      color: active ? '#e7e5e4' : '#6e6e80',
                      transition: 'all 160ms ease',
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            {/* Dark theme chip */}
            <button
              onClick={() => update('theme', cfg.theme === 'dark' ? 'light' : 'dark')}
              className="btn-smooth"
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background:
                  cfg.theme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                color: cfg.theme === 'dark' ? '#e7e5e4' : '#6e6e80',
                border:
                  cfg.theme === 'dark'
                    ? '1px solid rgba(255,255,255,0.1)'
                    : '1px solid rgba(255,255,255,0.04)',
                transition: 'all 160ms ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '13px',
                  fontVariationSettings: cfg.theme === 'dark' ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                dark_mode
              </span>
              Dark
            </button>

            {/* Diagrams chip */}
            <button
              onClick={() => update('chordDisplay', cfg.chordDisplay !== 'name' ? 'name' : 'both')}
              className="btn-smooth"
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background:
                  cfg.chordDisplay !== 'name' ? `${accent.from}20` : 'rgba(255,255,255,0.04)',
                color: cfg.chordDisplay !== 'name' ? accent.from : '#6e6e80',
                border:
                  cfg.chordDisplay !== 'name'
                    ? `1px solid ${accent.from}2e`
                    : '1px solid rgba(255,255,255,0.04)',
                transition: 'all 160ms ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '13px',
                  fontVariationSettings: cfg.chordDisplay !== 'name' ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                grid_view
              </span>
              Diagrams
            </button>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: `${accent.from}0d`,
              border: `1px solid ${accent.from}18`,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: accent.from,
                fontSize: '15px',
                flexShrink: 0,
                marginTop: '1px',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              info
            </span>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: '#6e6e80',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {t.songs.pdfExportNote}
            </p>
          </div>
        </div>
      </ScrollScaffold>

      {/* ── Floating bottom bar ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          transform: barVisible ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(15,15,15,0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Export button */}
        <div
          style={{
            padding: '6px 16px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            display: 'flex',
            gap: '10px',
            position: 'relative',
          }}
        >
          {saveResult && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px',
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '12px',
                color: saveResult === 'ok' ? '#34d399' : '#f87171',
              }}
            >
              {saveResult === 'ok' && (
                <SuccessLottie size={20} isLight={false} style={{ flexShrink: 0 }} />
              )}
              {saveResult === 'ok' ? 'Saved to Downloads!' : 'Could not save — try Share instead'}
            </div>
          )}
          {Capacitor.isNativePlatform() ? (
            <>
              <Button
                variant="primary"
                onClick={() => handleExport('save')}
                disabled={savingPDF || sharingPDF}
                loading={savingPDF}
                icon="save"
                style={{ flex: 1 }}
              >
                Save
              </Button>
              <Button
                onClick={() => handleExport('share')}
                disabled={savingPDF || sharingPDF}
                loading={sharingPDF}
                icon="share"
                style={{ flex: 1 }}
              >
                Share
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => handleExport('share')}
              disabled={sharingPDF}
              loading={sharingPDF}
              icon="download"
              style={{ flex: 1 }}
            >
              {t.songs.downloadPdf}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── JSON Export ──────────────────── */
export interface ChordexJsonFile {
  _app: 'Chordex';
  _version: 1;
  songName: string;
  artist: string;
  bpm: number;
  key: string;
  notes: string;
  chords: { name: string; position: number }[];
}

async function exportPresetToJSON(
  preset: SongPreset,
  mode: 'save' | 'share' = 'share'
): Promise<boolean> {
  logActivity('export', `Exported ${preset.name} to JSON`, 'Chordex');
  const idToName = new Map(getAllChords().map((c) => [c.id, c.name]));
  const file: ChordexJsonFile = {
    _app: 'Chordex',
    _version: 1,
    songName: preset.name,
    artist: preset.artist,
    bpm: preset.bpm,
    key: preset.key,
    notes: preset.notes,
    chords: preset.chords.map((id, i) => ({
      name: idToName.get(id) ?? id,
      position: i + 1,
    })),
  };
  const content = JSON.stringify(file, null, 2);
  const fileName = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    // Reliable UTF-8 → base64 encoding
    const bytes = new TextEncoder().encode(content);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);

    if (mode === 'save') {
      // Try public Downloads first, fall back to app-specific external.
      let savedOk = false;
      try {
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: base64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        savedOk = true;
      } catch {
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.External,
            recursive: true,
          });
          savedOk = true;
        } catch {
          /* both failed */
        }
      }
      return savedOk;
    } else {
      try {
        const { Share } = await import('@capacitor/share');
        const cacheResult = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: preset.name,
          url: cacheResult.uri,
          dialogTitle: 'Share your Chordex song',
        });
      } catch {
        /* User cancelled or share unavailable */
      }
      return true;
    }
  }

  // Web browser fallback: anchor download
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function resolveChordId(name: string): string | null {
  const allChords = getAllChords();
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s/g, '');
  const n = norm(name);
  // Exact normalized match
  const exact = allChords.find((c) => norm(c.name) === n);
  if (exact) return exact.id;
  // Common aliases: "Am" → "A-minor", "Bb" → "Bb-major", "F#m" → "F#-minor"
  const aliases: Record<string, string> = {
    maj: 'major',
    min: 'minor',
    m: 'minor',
    dom: '7th',
    dom7: '7th',
  };
  for (const [alias, type] of Object.entries(aliases)) {
    if (n.endsWith(alias)) {
      const root = name.slice(0, name.length - alias.length).trim();
      const found = allChords.find((c) => norm(c.root) === norm(root) && c.type === type);
      if (found) return found.id;
    }
  }
  return null;
}

/* ──────────────────── Import Song Modal ──────────────────── */
type ImportStage = 'idle' | 'preview' | 'conflict' | 'success' | 'error';

interface ParsedImport {
  name: string;
  artist: string;
  bpm: number;
  key: string;
  notes: string;
  chords: string[]; // resolved chord IDs
  rawCount: number; // total entries in file
  unresolvedCount: number;
}

function ImportSongModal({
  accent,
  existingPresets,
  onImport,
  onClose,
}: {
  accent: { from: string; to: string; mid: string };
  existingPresets: SongPreset[];
  onImport: (data: Omit<SongPreset, 'id' | 'createdAt' | 'updatedAt'>, replaceId?: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const [stage, setStage] = useState<ImportStage>('idle');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    (file: File) => {
      const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
      if (!isJson) {
        setErrorMsg(t.songs.supportsJson);
        setStage('error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = JSON.parse(ev.target?.result as string);
          if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
            throw new Error('Not a valid JSON object.');

          const songName = (raw.songName ?? raw.name ?? '').trim();
          if (!songName) throw new Error('Missing required field: songName');
          if (!Array.isArray(raw.chords))
            throw new Error('Missing required field: chords (must be an array)');
          if (raw.chords.length === 0) throw new Error('The chords array is empty.');

          let unresolvedCount = 0;
          const resolvedIds: string[] = [];
          for (const c of raw.chords) {
            if (typeof c !== 'object' || c === null || typeof c.name !== 'string')
              throw new Error('Each chord entry must have a "name" field.');
            const id = resolveChordId(c.name);
            if (id) resolvedIds.push(id);
            else unresolvedCount++;
          }

          const result: ParsedImport = {
            name: songName,
            artist: (raw.artist ?? '').trim(),
            bpm: Math.max(0, Math.min(999, parseInt(raw.bpm) || 0)),
            key: (raw.key ?? '').trim(),
            notes: (raw.notes ?? '').trim(),
            chords: resolvedIds,
            rawCount: raw.chords.length,
            unresolvedCount,
          };

          setParsed(result);
          const conflict = existingPresets.find(
            (p) => p.name.trim().toLowerCase() === result.name.toLowerCase()
          );
          if (conflict) {
            setConflictId(conflict.id);
            setRenameVal(`${result.name} ${t.songs.importSuffix}`);
            setStage('conflict');
          } else {
            setStage('preview');
          }
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : t.songs.couldNotParse);
          setStage('error');
        }
      };
      reader.onerror = () => {
        setErrorMsg(t.songs.failedToRead);
        setStage('error');
      };
      reader.readAsText(file);
    },
    [existingPresets, t]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const doImport = (nameOverride?: string, replaceId?: string) => {
    if (!parsed) return;
    logActivity('import', `Imported ${nameOverride ?? parsed.name}`, 'Chordex');
    onImport(
      {
        name: nameOverride ?? parsed.name,
        artist: parsed.artist,
        bpm: parsed.bpm,
        key: parsed.key,
        notes: parsed.notes,
        chords: parsed.chords,
      },
      replaceId ?? undefined
    );
    setStage('success');
  };

  const reset = () => {
    setStage('idle');
    setParsed(null);
    setErrorMsg('');
    setConflictId(null);
  };

  /* ── Shared header ── */
  const ModalHeader = ({ title }: { title: string }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 16px 12px',
        flexShrink: 0,
      }}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={onClose}
        style={{ borderRadius: '50%', width: 38, height: 38 }}
        icon="close"
      />
      <p
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 800,
          fontSize: '18px',
          color: 'var(--c-text-primary)',
        }}
      >
        {title}
      </p>
    </div>
  );

  /* ── Pill badge ── */
  const Pill = ({ label, color }: { label: string; color: string }) => (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: '9999px',
        background: `${color}18`,
        color,
        fontFamily: 'var(--font-headline)',
        fontWeight: 700,
        fontSize: '11px',
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  );

  const getTitle = () => {
    switch (stage) {
      case 'idle':
        return t.songs.importSong;
      case 'preview':
        return t.songs.previewImport;
      case 'conflict':
        return t.songs.songAlreadyExists;
      case 'success':
        return t.songs.songImportedTitle;
      case 'error':
        return t.songs.importFailed;
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title={getTitle()}>
      {/* ── IDLE: file picker ── */}
      {stage === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="btn-smooth"
            style={{
              border: `2px dashed ${dragOver ? 'var(--c-accent-from)' : 'rgba(128,128,128,0.25)'}`,
              borderRadius: '1.25rem',
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: dragOver ? 'var(--c-accent-from)0a' : 'var(--c-surface-high)',
              cursor: 'pointer',
              transition: 'border-color 200ms ease, background 200ms ease',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--c-accent-from)18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color: 'var(--c-accent-from)',
                  fontSize: '28px',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                upload_file
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: 'var(--c-text-primary)',
                  margin: '0 0 4px',
                }}
              >
                {dragOver ? t.songs.dropHere : t.songs.selectOrDrop}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--c-text-secondary)',
                  margin: 0,
                }}
              >
                {t.songs.supportsJson}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {t.songs.browseFiles}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--c-text-muted)',
              textAlign: 'center',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t.songs.importHint}
          </p>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {stage === 'preview' && parsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Song card */}
          <div
            style={{
              background: 'var(--c-surface-high)',
              border: '1px solid var(--c-border)',
              borderRadius: '1.25rem',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 900,
                fontSize: '22px',
                color: 'var(--c-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: '0 0 4px',
              }}
            >
              {parsed.name}
            </p>
            {parsed.artist && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--c-text-secondary)',
                  margin: '0 0 10px',
                }}
              >
                {parsed.artist}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {parsed.key && <Pill label={parsed.key} color="var(--c-accent-from)" />}
              {parsed.bpm > 0 && (
                <Pill label={`${parsed.bpm} BPM`} color="var(--c-text-secondary)" />
              )}
              <Pill label={t.songs.chordsLabel(parsed.chords.length)} color="#34d399" />
              {parsed.unresolvedCount > 0 && (
                <Pill label={t.songs.unrecognizedCount(parsed.unresolvedCount)} color="#fbbf24" />
              )}
            </div>
            {parsed.notes && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--c-text-secondary)',
                  marginTop: '10px',
                  fontStyle: 'italic',
                  lineHeight: 1.55,
                  margin: '10px 0 0',
                }}
              >
                {parsed.notes}
              </p>
            )}
          </div>
          {parsed.unresolvedCount > 0 && (
            <div
              style={{
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#fbbf24', fontSize: '18px', flexShrink: 0, marginTop: '1px' }}
              >
                warning
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: '#fbbf24',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {t.songs.unrecognizedWarning(parsed.unresolvedCount)}
              </p>
            </div>
          )}
          {parsed.chords.length === 0 && (
            <div
              style={{
                background: 'rgba(238,125,119,0.08)',
                border: '1px solid rgba(238,125,119,0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#ee7d77', fontSize: '18px', flexShrink: 0, marginTop: '1px' }}
              >
                error
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: '#ee7d77',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {t.songs.noRecognizedChords}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: 8 }}>
            <Button onClick={onClose} style={{ flex: 1 }}>
              {t.songs.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => doImport()}
              icon="download"
              style={{ flex: 2 }}
            >
              {t.songs.importAction}
            </Button>
          </div>
        </div>
      )}

      {/* ── CONFLICT ── */}
      {stage === 'conflict' && parsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: '#fbbf24', fontSize: '20px', flexShrink: 0, marginTop: '1px' }}
            >
              info
            </span>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--c-text-primary)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {t.songs.songAlreadyExistsMsg(parsed.name)}
            </p>
          </div>
          {/* Option: Rename */}
          <div
            style={{
              background: 'var(--c-surface-high)',
              border: '1px solid var(--c-border)',
              borderRadius: '1rem',
              padding: '16px',
            }}
          >
            <Input
              label={t.songs.importWithNewName}
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={() => doImport(renameVal.trim() || `${parsed.name} ${t.songs.importSuffix}`)}
              disabled={!renameVal.trim()}
              style={{ marginTop: '12px', width: '100%' }}
            >
              {t.songs.importAs(renameVal.trim() || '…')}
            </Button>
          </div>
          {/* Option: Replace */}
          <div
            style={{
              background: 'var(--c-surface-high)',
              border: '1px solid var(--c-border)',
              borderRadius: '1rem',
              padding: '16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--c-text-primary)',
                margin: '0 0 4px',
              }}
            >
              {t.songs.replaceExisting}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--c-text-secondary)',
                margin: '0 0 12px',
              }}
            >
              {t.songs.replaceExistingWarning(parsed.name)}
            </p>
            <Button
              onClick={() => doImport(parsed.name, conflictId ?? undefined)}
              style={{
                width: '100%',
                color: '#ee7d77',
                border: '1px solid rgba(238,125,119,0.3)',
                backgroundColor: 'rgba(238,125,119,0.08)',
              }}
            >
              {t.songs.replaceExistingBtn}
            </Button>
          </div>
          <Button onClick={onClose} style={{ width: '100%', marginTop: 8 }}>
            {t.songs.cancel}
          </Button>
        </div>
      )}

      {/* â”€â”€ SUCCESS â”€â”€ */}
      {stage === 'success' && parsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <SuccessLottie size={72} isLight={false} />
          <div>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 900,
                fontSize: '20px',
                color: 'var(--c-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              {t.songs.songImportedTitle}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--c-text-secondary)',
                margin: 0,
              }}
            >
              {t.songs.songImportedDesc(parsed.name)}
            </p>
          </div>
          <Button variant="primary" onClick={onClose} style={{ width: '100%' }}>
            {t.songs.done}
          </Button>
        </div>
      )}

      {/* â”€â”€ ERROR â”€â”€ */}
      {stage === 'error' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(238,125,119,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: '#ee7d77', fontSize: '36px', fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 900,
                fontSize: '20px',
                color: 'var(--c-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              {t.songs.importFailed}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--c-text-secondary)',
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              {errorMsg}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: 8 }}>
            <Button onClick={onClose} style={{ flex: 1 }}>
              {t.songs.cancel}
            </Button>
            <Button variant="primary" onClick={reset} style={{ flex: 1 }}>
              {t.songs.tryAgain}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Chord Picker Sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type PickerTab = ChordType | 'all' | '__custom__';

function ChordPicker({
  onAdd,
  onClose,
  accent,
  onCreateCustom,
  customChords,
}: {
  onAdd: (id: string) => void;
  onClose: () => void;
  accent: { from: string; to: string; mid: string };
  onCreateCustom: () => void;
  customChords: CustomChord[];
}) {
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const getCatLabel = (type: string) => {
    if (type === 'all') return t.songs.allChords;
    const cats = t.library.cats as Record<string, { label: string }>;
    return cats[type]?.label ?? type;
  };
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<PickerTab>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const allChords = useMemo(() => getAllChords(), []);

  const isCustomTab = cat === '__custom__';

  const filteredStandard = useMemo(() => {
    if (isCustomTab) return [];
    return allChords
      .filter((c) => {
        if (cat !== 'all' && c.type !== cat) return false;
        if (search)
          return (
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.notes.join(' ').toLowerCase().includes(search.toLowerCase())
          );
        return true;
        // Per-type: max 12 roots; All tab: cap at 60 so the list stays snappy
      })
      .slice(0, cat === 'all' ? 60 : 12);
  }, [allChords, cat, search, isCustomTab]);

  const filteredCustom = useMemo(() => {
    if (!isCustomTab) return [];
    if (!search) return customChords;
    return customChords.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.notes.join(' ').toLowerCase().includes(search.toLowerCase())
    );
  }, [customChords, search, isCustomTab]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirm = () => {
    selected.forEach((id) => onAdd(id));
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={selected.length > 0 ? t.songs.selectedCount(selected.length) : t.songs.addChord}
      footer={
        selected.length > 0 ? (
          <Button variant="primary" onClick={confirm} style={{ width: '100%' }}>
            Add {selected.length} chord{selected.length !== 1 ? 's' : ''}
          </Button>
        ) : undefined
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder={t.songs.searchChords}
          accent={accent}
          style={{ marginBottom: '12px' }}
        />

        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '4px',
            touchAction: 'pan-x',
          }}
          className="no-scrollbar"
        >
          {PICKER_CATS.map((c) => (
            <button
              key={c.type}
              onClick={() => setCat(c.type)}
              className="btn-smooth"
              style={{
                padding: '5px 12px',
                borderRadius: '9999px',
                background: cat === c.type ? 'var(--c-accent-from)' : 'var(--c-surface-high)',
                color: cat === c.type ? '#fff' : 'var(--c-text-secondary)',
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {getCatLabel(c.type)}
            </button>
          ))}
          <button
            onClick={() => setCat('__custom__')}
            className="btn-smooth"
            style={{
              padding: '5px 12px',
              borderRadius: '9999px',
              background: cat === '__custom__' ? 'var(--c-accent-from)' : 'var(--c-surface-high)',
              color: cat === '__custom__' ? '#fff' : 'var(--c-text-secondary)',
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              tune
            </span>
            {t.songs.custom}
            {customChords.length > 0 ? ` (${customChords.length})` : ''}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '45dvh',
            overflowY: 'auto',
          }}
          className="no-scrollbar"
        >
          {/* Create custom chord button */}
          <button
            onClick={() => onCreateCustom()}
            className="btn-smooth"
            data-testid="create-custom-chord-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              background: 'var(--c-surface-high)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--c-accent-from)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--c-accent-from)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: '#fff' }}
              >
                add
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: 'var(--c-accent-from)',
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 800,
                  fontSize: '14px',
                  margin: 0,
                }}
              >
                {t.songs.createCustomChord}
              </p>
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  margin: '1px 0 0',
                }}
              >
                {t.songs.createCustomChordDesc}
              </p>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: 'var(--c-accent-from)' }}
            >
              arrow_forward_ios
            </span>
          </button>

          {/* Standard chords */}
          {!isCustomTab &&
            filteredStandard.map((chord) => {
              const isSelected = selected.includes(chord.id);
              return (
                <button
                  key={chord.id}
                  data-testid={`picker-chord-${chord.id}`}
                  onClick={() => toggle(chord.id)}
                  className="card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: isSelected ? 'var(--c-surface-highest)' : 'var(--c-surface-high)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--c-accent-from)' : 'var(--c-border)'}`,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--app-surface-lowest)',
                      borderRadius: '10px',
                      padding: '4px 4px 2px',
                      width: '58px',
                      flexShrink: 0,
                    }}
                  >
                    <ChordDiagram data={chord.guitar} accentFrom="var(--c-accent-from)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        color: isSelected ? 'var(--c-accent-from)' : 'var(--c-text-primary)',
                        fontFamily: 'var(--font-headline)',
                        fontWeight: 700,
                        fontSize: '15px',
                        margin: 0,
                      }}
                    >
                      {chord.name}
                    </p>
                    <p
                      style={{
                        color: 'var(--c-text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        margin: 0,
                      }}
                    >
                      {chord.notes.slice(0, 4).join(' Â· ')}
                    </p>
                  </div>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isSelected ? 'var(--c-accent-from)' : 'rgba(72,72,72,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '15px',
                        color: isSelected ? '#fff' : 'rgba(172,171,170,0.5)',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      check
                    </span>
                  </div>
                </button>
              );
            })}

          {/* Custom chords tab */}
          {isCustomTab &&
            filteredCustom.map((cc) => {
              const isSelected = selected.includes(cc.id);
              return (
                <button
                  key={cc.id}
                  data-testid={`picker-custom-${cc.id}`}
                  onClick={() => toggle(cc.id)}
                  className="card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: isSelected ? 'var(--c-surface-highest)' : 'var(--c-surface-high)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--c-accent-from)' : 'var(--c-border)'}`,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--app-surface-lowest)',
                      borderRadius: '8px',
                      padding: '4px 3px',
                      flexShrink: 0,
                    }}
                  >
                    <CustomMiniDiagram chord={cc} accentFrom="var(--c-accent-from)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: isSelected ? 'var(--c-accent-from)' : 'var(--c-text-primary)',
                        fontFamily: 'var(--font-headline)',
                        fontWeight: 700,
                        fontSize: '15px',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cc.name || 'Custom Chord'}
                    </p>
                    <p
                      style={{
                        color: 'var(--c-text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        margin: 0,
                      }}
                    >
                      {cc.instrument} Â· {cc.notes.slice(0, 4).join(' Â· ')}
                    </p>
                  </div>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isSelected ? 'var(--c-accent-from)' : 'rgba(72,72,72,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '15px',
                        color: isSelected ? '#fff' : 'rgba(172,171,170,0.5)',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      check
                    </span>
                  </div>
                </button>
              );
            })}
          {isCustomTab && filteredCustom.length === 0 && (
            <div
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--c-text-muted)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '36px', display: 'block', marginBottom: '8px', opacity: 0.4 }}
              >
                tune
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                {t.songs.noCustomChords}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  marginTop: '4px',
                  opacity: 0.7,
                  margin: '4px 0 0',
                }}
              >
                {t.songs.noCustomChordsHint}
              </p>
            </div>
          )}
          {!isCustomTab && filteredStandard.length === 0 && (
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                padding: '24px',
                margin: 0,
              }}
            >
              {t.songs.noChords}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Preset Form Sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface FormData {
  name: string;
  artist: string;
  bpm: string;
  key: string;
  notes: string;
}
const KEYS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'Abm',
  'Am',
  'Bbm',
  'Bm',
];

function PresetForm({
  initial,
  onSave,
  onCancel,
  accent,
}: {
  initial?: FormData;
  onSave: (d: FormData) => void;
  onCancel: () => void;
  accent: { from: string; to: string; mid: string };
}) {
  const t = useT();
  const [form, setForm] = useState<FormData>(
    initial || { name: '', artist: '', bpm: '120', key: 'C', notes: '' }
  );
  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--c-surface-high)',
    border: '1px solid var(--c-border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    color: 'var(--c-text-secondary)',
    fontFamily: 'var(--font-headline)',
    fontWeight: 800,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'block',
    marginBottom: '4px',
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title={initial ? t.songs.editSong : t.songs.newSong}
      footer={
        <>
          <Button onClick={onCancel}>{t.songs.cancel}</Button>
          <Button
            variant="primary"
            disabled={!form.name.trim()}
            onClick={() => {
              if (form.name.trim()) onSave(form);
            }}
          >
            {initial ? t.songs.save : t.songs.newSong}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input
          label={t.songs.songTitle}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Blackbird"
        />
        <Input
          label={t.songs.artist}
          value={form.artist}
          onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
          placeholder="e.g. The Beatles"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            type="number"
            label={t.songs.bpm}
            min={20}
            max={400}
            value={form.bpm}
            onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value }))}
          />
          <div>
            <label style={labelStyle}>{t.songs.key}</label>
            <select
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              style={{ ...selectStyle, cursor: 'pointer' }}
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t.songs.notes}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder={t.songs.notesPlaceholder}
            style={{ ...selectStyle, resize: 'none' }}
          />
        </div>
      </div>
    </Dialog>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main SongsPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ITEM_H = 76;

const PresetCard = React.memo(
  function PresetCard({
    preset,
    accent,
    t,
    setActivePreset,
    setShowLive,
    setExportModal,
    setEditingId,
    setShowForm,
    setShowDeleteId,
  }: {
    preset: SongPreset;
    accent: { from: string; to: string; mid: string };
    t: any;
    setActivePreset: (id: string) => void;
    setShowLive: (v: boolean) => void;
    setExportModal: (p: SongPreset) => void;
    setEditingId: (id: string) => void;
    setShowForm: (v: boolean) => void;
    setShowDeleteId: (id: string) => void;
  }) {
    const handleMainClick = useCallback(
      () => setActivePreset(preset.id),
      [setActivePreset, preset.id]
    );
    const handleLiveClick = useCallback(() => {
      setActivePreset(preset.id);
      setTimeout(() => setShowLive(true), 100);
    }, [setActivePreset, preset.id, setShowLive]);
    const handlePdfClick = useCallback(() => setExportModal(preset), [setExportModal, preset]);
    const handleEditClick = useCallback(() => {
      setEditingId(preset.id);
      setShowForm(true);
    }, [setEditingId, preset.id, setShowForm]);
    const handleDeleteClick = useCallback(
      () => setShowDeleteId(preset.id),
      [setShowDeleteId, preset.id]
    );

    return (
      <article
        className="rounded-3xl border shadow-soft-card overflow-hidden transition-all group content-auto-row"
        style={{
          backgroundColor: 'var(--surface-card-bg, #ffffff)',
          borderColor: 'var(--c-border, #E3E6EB)',
        }}
        data-purpose="song-card"
      >
        {/* Clickable main area */}
        <button
          type="button"
          onClick={handleMainClick}
          data-testid={`preset-${preset.id}`}
          className="w-full text-left p-3.5 flex items-center gap-3.5 active:scale-[0.99] transition-transform cursor-pointer"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 20%, transparent)',
              color: 'var(--c-accent-from, #2563EB)',
            }}
          >
            <span
              className="material-symbols-rounded text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              queue_music
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-extrabold tracking-tight truncate leading-tight"
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--c-text-primary)',
              }}
            >
              {preset.name}
            </h3>
            {preset.artist && (
              <p
                className="text-xs font-medium mt-0.5 truncate"
                style={{ color: 'var(--c-text-secondary, #6B7280)' }}
              >
                {preset.artist}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {preset.key && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--c-text-secondary, #6B7280)' }}>#</span>
                  {preset.key}
                </span>
              )}
              {preset.bpm > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-secondary, #6B7280)',
                  }}
                >
                  <span className="material-symbols-rounded text-[11px]">speed</span>
                  {preset.bpm} BPM
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  backgroundColor: 'var(--c-surface-lowest, #ECEEF2)',
                  borderColor: 'var(--c-border, #E3E6EB)',
                  color: 'var(--c-text-secondary, #6B7280)',
                }}
              >
                {preset.sections && preset.sections.length > 0
                  ? `${preset.sections.length} ${preset.sections.length === 1 ? 'Section' : 'Sections'}`
                  : t.songs.chordsLabel(preset.chords.length)}
              </span>
            </div>
          </div>
          <span
            className="material-symbols-rounded text-xl shrink-0 group-hover:translate-x-0.5 transition-transform"
            style={{ color: 'var(--c-text-muted, #8A92A6)' }}
          >
            chevron_right
          </span>
        </button>

        {/* Quick action row: Live | Export PDF | Edit | Delete */}
        <div
          className="flex items-center border-t text-xs font-semibold"
          style={{ borderColor: 'var(--c-border, #E3E6EB)' }}
        >
          <button
            type="button"
            onClick={handleLiveClick}
            data-testid={`live-${preset.id}`}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
            style={{
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-accent-from, #2563EB)',
            }}
          >
            <span className="material-symbols-rounded text-base">play_circle</span>
            <span>Live</span>
          </button>
          <button
            type="button"
            onClick={handlePdfClick}
            data-testid={`pdf-${preset.id}`}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
            style={{
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
          >
            <span className="material-symbols-rounded text-base">picture_as_pdf</span>
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r active:opacity-75"
            style={{
              borderColor: 'var(--c-border, #E3E6EB)',
              color: 'var(--c-text-secondary, #6B7280)',
            }}
          >
            <span className="material-symbols-rounded text-base">edit</span>
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:opacity-75"
            style={{
              color: '#EF4444',
            }}
          >
            <span className="material-symbols-rounded text-base">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </article>
    );
  },
  (prev, next) => {
    return (
      prev.preset.id === next.preset.id &&
      prev.preset.updatedAt === next.preset.updatedAt &&
      prev.accent.from === next.accent.from
    );
  }
);

export default function SongsPanel() {
  const t = useT();
  const isWebDesktop = useIsWebDesktop();
  const presets = useChordStore(useShallow((s) => s.presets));
  const activePresetId = useChordStore(useShallow((s) => s.activePresetId));
  const currentRoute = useNavigationStore(useShallow((s) => s.history[s.history.length - 1])) || {
    app: 'hub',
  };
  const activePanel = currentRoute.app === 'chordex' ? currentRoute.page || 'library' : 'library';
  const settings = useSettingsStore(useShallow((s) => s.settings));
  const transpositions = useChordStore(useShallow((s) => s.transpositions));
  const customChords = useChordStore(useShallow((s) => s.customChords));
  const setActivePreset = useChordStore(useShallow((s) => s.setActivePreset));
  const createPreset = useChordStore(useShallow((s) => s.createPreset));
  const updatePreset = useChordStore(useShallow((s) => s.updatePreset));
  const deletePreset = useChordStore(useShallow((s) => s.deletePreset));
  const addChordToPreset = useChordStore(useShallow((s) => s.addChordToPreset));
  const removeChordFromPreset = useChordStore(useShallow((s) => s.removeChordFromPreset));
  const reorderPresetChords = useChordStore(useShallow((s) => s.reorderPresetChords));
  const duplicateChordInPreset = useChordStore(useShallow((s) => s.duplicateChordInPreset));
  const setTranspose = useChordStore(useShallow((s) => s.setTranspose));
  const resetTranspose = useChordStore(useShallow((s) => s.resetTranspose));

  const saveCustomChord = useChordStore(useShallow((s) => s.saveCustomChord));
  const updateCustomChord = useChordStore(useShallow((s) => s.updateCustomChord));
  const deleteCustomChord = useChordStore(useShallow((s) => s.deleteCustomChord));
  const addSection = useChordStore(useShallow((s) => s.addSection));
  const updateSection = useChordStore(useShallow((s) => s.updateSection));
  const deleteSection = useChordStore(useShallow((s) => s.deleteSection));
  const addChordToSection = useChordStore(useShallow((s) => s.addChordToSection));
  const removeChordFromSection = useChordStore(useShallow((s) => s.removeChordFromSection));
  const reorderSectionChords = useChordStore(useShallow((s) => s.reorderSectionChords));
  const duplicateChordInSection = useChordStore(useShallow((s) => s.duplicateChordInSection));
  const reorderSection = useChordStore(useShallow((s) => s.reorderSection));
  const convertToSections = useChordStore(useShallow((s) => s.convertToSections));
  const deduplicateAllPresets = useChordStore(useShallow((s) => s.deduplicateAllPresets));
  const accent = resolveAccent(settings.accentColor);
  const preferFlats = settings.preferFlats ?? false;
  const isNative =
    typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [editCustomId, setEditCustomId] = useState<string | null>(null);
  const [showLive, setShowLive] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [exportModalPreset, setExportModal] = useState<SongPreset | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredPresets = useMemo(() => {
    if (!searchQuery) return presets;
    const q = searchQuery.toLowerCase();
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.artist && p.artist.toLowerCase().includes(q)) ||
        (p.key && p.key.toLowerCase().includes(q)) ||
        ((p as any).tags &&
          Array.isArray((p as any).tags) &&
          (p as any).tags.some((t: string) => typeof t === 'string' && t.toLowerCase().includes(q)))
    );
  }, [presets, searchQuery]);

  // Section state
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Section picker sheet
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [customSectionName, setCustomSectionName] = useState('');
  const [customSectionMode, setCustomSectionMode] = useState(false);


  // Section drag-to-reorder
  const [secDragIdx, setSecDragIdx] = useState<number | null>(null);
  const secGrabOffsetY = useRef(0); // pointer offset from node top â€” set once, never drifts
  const secRawRef = useRef(0); // current applied translateY â€” updated every frame
  const secDragStartIdx = useRef(0);
  const secDragNodeRef = useRef<HTMLElement | null>(null);
  const secRefs = useRef<(HTMLElement | null)[]>([]);
  const [localSections, setLocalSections] = useState<SongSection[]>([]);
  const secInstanceKeys = useRef<string[]>([]);

  const SEC_CHORD_H = 62;
  const [secChordDragKey, setSecChordDragKey] = useState<string | null>(null);
  const [secChordDragIdx, setSecChordDragIdx] = useState<number | null>(null);
  const [secChordDragDeltaY, setSecChordDragDeltaY] = useState(0);
  const secChordDragStartY = useRef(0);
  const secChordDragStartIdx = useRef(0);
  const secChordDragNodeRef = useRef<HTMLDivElement | null>(null);
  const secChordDragDeltaRef = useRef(0);
  const secChordDragCountRef = useRef(0);
  const secChordPointerId = useRef<number | null>(null);
  const secChordSectionId = useRef<string>('');
  const secChordPresetRef = useRef<SongPreset | null>(null);
  const secChordLocalRef = useRef<SongSection[]>([]);

  const onSecChordDragStart = useCallback(
    (
      e: React.PointerEvent,
      sectionId: string,
      index: number,
      count: number,
      preset: SongPreset
    ) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      secChordPresetRef.current = preset;
      secChordLocalRef.current = localSections;
      secChordPointerId.current = e.pointerId;
      secChordDragStartY.current = e.clientY;
      secChordDragStartIdx.current = index;
      secChordDragDeltaRef.current = 0;
      secChordDragCountRef.current = count;
      secChordSectionId.current = sectionId;
      setSecChordDragKey(sectionId);
      setSecChordDragIdx(index);
      setSecChordDragDeltaY(0);
    },
    [localSections]
  );

  const onSecChordDragMove = useCallback((e: React.PointerEvent) => {
    if (secChordPointerId.current === null || e.pointerId !== secChordPointerId.current) return;
    if (!secChordDragNodeRef.current) return;
    const slot = secChordDragStartIdx.current;
    const clientY = e.clientY;
    const raw = clientY - secChordDragStartY.current;
    const maxD = (secChordDragCountRef.current - 1 - slot) * SEC_CHORD_H;
    const minD = -slot * SEC_CHORD_H;
    const clamped = Math.max(minD, Math.min(maxD, raw));
    secChordDragDeltaRef.current = clamped;
    secChordDragNodeRef.current.style.top = `${slot * SEC_CHORD_H + clamped}px`;
    const rawTarget = Math.round((slot * SEC_CHORD_H + clamped) / SEC_CHORD_H);
    const target = Math.max(0, Math.min(secChordDragCountRef.current - 1, rawTarget));
    if (target !== slot) {
      const sId = secChordSectionId.current;
      setLocalSections((prev) => {
        const next = prev.map((s) => {
          if (s.id !== sId) return s;
          const chords = [...s.chords];
          const [moved] = chords.splice(slot, 1);
          chords.splice(target, 0, moved);
          return { ...s, chords };
        });
        secChordLocalRef.current = next;
        return next;
      });
      secChordDragStartY.current += (target - slot) * SEC_CHORD_H;
      secChordDragDeltaRef.current = clientY - secChordDragStartY.current;
      secChordDragStartIdx.current = target;
      setSecChordDragIdx(target);
      setSecChordDragDeltaY(secChordDragDeltaRef.current);
    }
  }, []);

  const onSecChordDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (secChordPointerId.current === null || e.pointerId !== secChordPointerId.current) return;
      const sId = secChordSectionId.current;
      secChordDragNodeRef.current = null;
      secChordDragDeltaRef.current = 0;
      secChordPointerId.current = null;
      setSecChordDragKey(null);
      setSecChordDragIdx(null);
      setSecChordDragDeltaY(0);
      const preset = secChordPresetRef.current;
      if (preset && sId) {
        const localSection = secChordLocalRef.current.find((s) => s.id === sId);
        if (localSection) {
          updatePreset(preset.id, {
            sections: (preset.sections ?? []).map((s) =>
              s.id === sId ? { ...s, chords: localSection.chords } : s
            ),
          });
        }
      }
    },
    [updatePreset]
  );

  // â”€â”€ Android back gesture / predictive back â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Returns true if it handled something if we're at the root.
  useBackHandler(
    'nested',
    () => {
      if (activePanel !== 'songs') return false;
      if (showSectionPicker) {
        setShowSectionPicker(false);
        return true;
      }
      if (showCustomBuilder) {
        setShowCustomBuilder(false);
        return true;
      }
      if (showPicker) {
        setShowPicker(false);
        return true;
      }
      if (showLive) {
        setShowLive(false);
        return true;
      }
      if (showForm) {
        setShowForm(false);
        setEditingId(null);
        return true;
      }
      if (exportModalPreset) {
        setExportModal(null);
        return true;
      }
      if (showImport) {
        setShowImport(false);
        return true;
      }
      if (showDeleteId) {
        setShowDeleteId(null);
        return true;
      }
      if (activePresetId) {
        setActivePreset(null);
        return true;
      }
      return false;
    },
    [
      activePanel,
      showSectionPicker,
      showCustomBuilder,
      showPicker,
      showLive,
      showForm,
      exportModalPreset,
      showImport,
      showDeleteId,
      activePresetId,
      setActivePreset,
    ]
  );

  useEffect(() => {
    deduplicateAllPresets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag & drop
  const [localChords, setLocalChords] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0); // only updated on slot change (not every pointermove)
  const dragStartY = useRef(0);
  const dragStartIdx = useRef(0);
  const dragNodeRef = useRef<HTMLDivElement | null>(null); // imperative handle to active DOM node
  const dragDeltaRef = useRef(0); // always up-to-date delta (no re-render)
  const dragCountRef = useRef(0); // total chord count at drag start (for clamping)
  const instanceKeys = useRef<string[]>([]); // stable per-slot key so DOM nodes survive reorder
  const localChordsRef = useRef<string[]>([]); // always up-to-date chord list (avoids stale closure)

  // Scroll refs for nav-hide
  const listScrollRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(listScrollRef);
  useScrollHide(editorScrollRef);

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;
  const transposeOffset = activePreset ? (transpositions[activePreset.id] ?? 0) : 0;

  // Hide the nav bar in editor view or when any sheet is open
  useEffect(() => {
    const anySheetOpen =
      showForm ||
      showPicker ||
      !!showDeleteId ||
      !!exportModalPreset ||
      showLive ||
      showImport ||
      showCustomBuilder;
    const inEditor = !!(activePreset && !showForm);
    setNavHidden(anySheetOpen || inEditor);
    return () => setNavHidden(false);
  }, [
    showForm,
    showPicker,
    showDeleteId,
    exportModalPreset,
    showLive,
    showImport,
    showCustomBuilder,
    activePreset,
  ]);

  const lastOpenedId = useRef<string | null>(null);
  useEffect(() => {
    if (activePreset && activePreset.id !== lastOpenedId.current) {
      logActivity('project_open', `Opened ${activePreset.name}`, 'Chordex');
      lastOpenedId.current = activePreset.id;
    } else if (!activePreset) {
      lastOpenedId.current = null;
    }
  }, [activePreset]);

  const handleImport = useCallback(
    (data: Omit<SongPreset, 'id' | 'createdAt' | 'updatedAt'>, replaceId?: string) => {
      if (replaceId) {
        updatePreset(replaceId, { ...data, updatedAt: Date.now() });
      } else {
        createPreset(data);
      }
    },
    [createPreset, updatePreset]
  );

  useEffect(() => {
    if (dragIdx === null) {
      const chords = activePreset?.chords ?? [];
      instanceKeys.current = chords.map(() => Math.random().toString(36).slice(2));
      localChordsRef.current = [...chords];
      setLocalChords([...chords]);
    }
  }, [activePreset?.chords, dragIdx]);

  // Track the active pointer id so window listeners only react to the right finger
  const dragPointerIdRef = useRef<number | null>(null);
  // Stable ref to active preset id â€” avoids stale closure in the window end handler
  const activePresetIdRef = useRef<string | null>(null);

  // Core move logic â€” reads only from refs so it's safe to call from a window listener
  const executeDragMove = (clientY: number) => {
    if (dragNodeRef.current === null) return;
    const slot = dragStartIdx.current;

    // â”€â”€ Clamp pointer to screen AND list bounds so items can't fly off screen â”€â”€
    const containerRect = editorScrollRef.current?.getBoundingClientRect();
    const screenClampedY = containerRect
      ? Math.max(containerRect.top + 8, Math.min(containerRect.bottom - 8, clientY))
      : clientY;
    const unclamped = screenClampedY - dragStartY.current;
    const minDelta = -slot * ITEM_H;
    const maxDelta = (dragCountRef.current - 1 - slot) * ITEM_H;
    const raw = Math.max(minDelta, Math.min(maxDelta, unclamped));
    dragDeltaRef.current = raw;

    // â”€â”€ Fast path: move the active node directly on the DOM â€” zero React overhead â”€â”€
    dragNodeRef.current.style.top = `${slot * ITEM_H + 8 + raw}px`;

    // â”€â”€ Slot change detection â”€â”€
    const rawTarget = Math.round(raw / ITEM_H) + slot;
    const target = Math.max(0, Math.min(dragCountRef.current - 1, rawTarget));
    if (target !== slot) {
      // Reorder both the chord list AND the stable instance-key list in lockstep
      const newChords = [...localChordsRef.current]; // always fresh â€” avoids stale closure
      const newKeys = [...instanceKeys.current];
      const [movedChord] = newChords.splice(slot, 1);
      const [movedKey] = newKeys.splice(slot, 1);
      newChords.splice(target, 0, movedChord);
      newKeys.splice(target, 0, movedKey);

      dragStartY.current += (target - slot) * ITEM_H;
      dragDeltaRef.current = clientY - dragStartY.current;
      dragStartIdx.current = target;
      instanceKeys.current = newKeys;
      localChordsRef.current = newChords; // keep ref in sync before React re-renders

      // React re-render only on slot change (rare), not every pointermove
      setLocalChords(newChords);
      setDragIdx(target);
      setDragDeltaY(dragDeltaRef.current); // JSX will set correct `top` after render
    }
  };

  // Core end logic â€” uses refs so it's safe to call from a window listener
  const executeDragEnd = () => {
    const presetId = activePresetIdRef.current;
    if (presetId !== null) updatePreset(presetId, { chords: localChordsRef.current });
    dragNodeRef.current = null;
    dragDeltaRef.current = 0;
    dragPointerIdRef.current = null;
    setDragIdx(null);
    setDragDeltaY(0);
  };

  const onDragStart = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    activePresetIdRef.current = activePreset?.id ?? null;
    dragPointerIdRef.current = e.pointerId;
    dragStartY.current = e.clientY;
    dragStartIdx.current = index;
    dragDeltaRef.current = 0;
    dragCountRef.current = localChords.length;
    setDragIdx(index);
    setDragDeltaY(0);

    // â”€â”€ Bind to window so React re-renders can't lose the pointer stream â”€â”€
    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerIdRef.current) return;
      executeDragMove(ev.clientY);
    };
    const handleEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerIdRef.current) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      executeDragEnd();
    };
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };

  const handleFormSave = (data: FormData) => {
    const bpm = parseInt(data.bpm) || 120;
    if (editingId)
      updatePreset(editingId, {
        name: data.name,
        artist: data.artist,
        bpm,
        key: data.key,
        notes: data.notes,
      });
    else
      createPreset({
        name: data.name,
        artist: data.artist,
        bpm,
        key: data.key,
        notes: data.notes,
        chords: [],
      });
    setShowForm(false);
    setEditingId(null);
  };

  // Sync localSections from store when not dragging
  useEffect(() => {
    if (secDragIdx === null) {
      const secs = activePreset?.sections ?? [];
      secInstanceKeys.current = secs.map(() => Math.random().toString(36).slice(2));
      setLocalSections([...secs]);
    }
  }, [activePreset?.sections, secDragIdx]);

  const localSectionsRef = useRef<SongSection[]>([]);
  const lastSwapTime = useRef<number>(0);

  const onSecDragStart = (e: React.PointerEvent, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const nodeEl = secRefs.current[index];
    secGrabOffsetY.current = nodeEl ? e.clientY - nodeEl.getBoundingClientRect().top : 0;
    secRawRef.current = 0;
    secDragStartIdx.current = index;
    lastSwapTime.current = 0;
    localSectionsRef.current = [...localSections];
    setSecDragIdx(index);
  };

  const onSecDragMove = (e: React.PointerEvent) => {
    const node = secDragNodeRef.current;
    if (!node) return;

    const slot = secDragStartIdx.current;
    const containerRect = editorScrollRef.current?.getBoundingClientRect();

    // Natural (untransformed) top â€” derived from the TRACKED raw, never from a drifting origin.
    const nodeRect = node.getBoundingClientRect();
    const nodeNatTop = nodeRect.top - secRawRef.current;
    const nodeH = node.offsetHeight;

    // Where the user wants the node top to be (unconstrained).
    const desiredTop = e.clientY - secGrabOffsetY.current;

    // Hard limits.
    const minTop = containerRect ? containerRect.top + 24 : -Infinity;
    const maxTop = containerRect ? containerRect.bottom - 24 - nodeH : Infinity;

    // Rubber-band: past the limit the node follows at 15% speed â†’ bouncy wall feel.
    const ELASTIC = 0.15;
    let displayTop: number;
    const atBoundary = desiredTop < minTop || desiredTop > maxTop;
    if (desiredTop < minTop) {
      displayTop = minTop + (desiredTop - minTop) * ELASTIC;
    } else if (desiredTop > maxTop) {
      displayTop = maxTop + (desiredTop - maxTop) * ELASTIC;
    } else {
      displayTop = desiredTop;
    }

    const raw = displayTop - nodeNatTop;
    secRawRef.current = raw;

    // Visual: subtle lift + faint border nudge when bouncing against the wall.
    node.style.transform = `translateY(${raw}px) scale(${atBoundary ? 1.015 : 1.0})`;
    node.style.outline = atBoundary ? '1.5px solid rgba(103,156,255,0.35)' : 'none';
    node.style.transition = 'outline 180ms ease';

    // Swap detection uses the true clamped Y (not the rubber-band-adjusted position).
    const clampedY = containerRect
      ? Math.max(containerRect.top + 24, Math.min(containerRect.bottom - 24, e.clientY))
      : e.clientY;

    const total = localSectionsRef.current.length;
    let target = slot;

    if (raw > 0 && slot < total - 1) {
      const nextEl = secRefs.current[slot + 1];
      if (nextEl && clampedY > nextEl.getBoundingClientRect().top) target = slot + 1;
    } else if (raw < 0 && slot > 0) {
      const prevEl = secRefs.current[slot - 1];
      if (prevEl && clampedY < prevEl.getBoundingClientRect().bottom) target = slot - 1;
    }

    const now = performance.now();
    if (target !== slot && now - lastSwapTime.current > 120) {
      lastSwapTime.current = now;
      const aEl = secRefs.current[slot];
      const bEl = secRefs.current[target];

      const newSecs = [...localSectionsRef.current];
      const newKeys = [...secInstanceKeys.current];
      const [movedSec] = newSecs.splice(slot, 1);
      const [movedKey] = newKeys.splice(slot, 1);
      newSecs.splice(target, 0, movedSec);
      newKeys.splice(target, 0, movedKey);

      if (aEl && bEl) {
        // Visual position is preserved: newRaw = visualTop_A - naturalTop_B.
        // secGrabOffsetY stays unchanged â€” the visual top didn't move.
        const newRaw = aEl.getBoundingClientRect().top - bEl.getBoundingClientRect().top;
        secRawRef.current = newRaw;
        node.style.transform = `translateY(${newRaw}px) scale(1.0)`;
      }

      secDragStartIdx.current = target;
      secInstanceKeys.current = newKeys;
      localSectionsRef.current = newSecs;

      setLocalSections(newSecs);
      setSecDragIdx(target);
    }
  };

  const onSecDragEnd = () => {
    const node = secDragNodeRef.current;
    if (node) {
      node.style.transform = '';
      node.style.outline = 'none';
      node.style.transition = '';
    }
    const finalIdx = secDragStartIdx.current;
    if (activePreset) {
      const movedId = localSectionsRef.current[finalIdx]?.id;
      if (movedId) {
        const fromIdx = (activePreset.sections ?? []).findIndex((s) => s.id === movedId);
        if (fromIdx !== -1 && fromIdx !== finalIdx)
          reorderSection(activePreset.id, fromIdx, finalIdx);
      }
    }
    secDragNodeRef.current = null;
    setSecDragIdx(null);
  };

  const editingPreset = editingId ? presets.find((p) => p.id === editingId) : null;
  const editingFormData = editingPreset
    ? {
        name: editingPreset.name,
        artist: editingPreset.artist,
        bpm: String(editingPreset.bpm),
        key: editingPreset.key,
        notes: editingPreset.notes,
      }
    : undefined;

  /* â•â•â•â•â•â•â• VIEW: PRESET EDITOR â•â•â•â•â•â•â• */
  const renderEditor = () => {
    if (!activePreset) return null;
    return (
      <div className="flex flex-col h-full overflow-hidden app-bg" style={{ position: 'relative' }}>
        {showLive && (
          <LiveMode
            preset={activePreset}
            onClose={() => setShowLive(false)}
            transposeOffset={transposeOffset}
          />
        )}
        {showPicker && (
          <ChordPicker
            accent={accent}
            onAdd={(id) => {
              if (pickerSectionId) addChordToSection(activePreset.id, pickerSectionId, id);
              else addChordToPreset(activePreset.id, id);
            }}
            onClose={() => {
              setShowPicker(false);
              setPickerSectionId(null);
            }}
            onCreateCustom={() => {
              setShowPicker(false);
              setShowCustomBuilder(true);
            }}
            customChords={customChords}
          />
        )}
        {showCustomBuilder && (
          <CustomChordBuilder
            accent={accent}
            editChord={editCustomId ? customChords.find((c) => c.id === editCustomId) : undefined}
            onSave={(chord) => {
              if (editCustomId) {
                updateCustomChord(chord.id, chord);
              } else {
                saveCustomChord(chord);
                if (pickerSectionId) {
                  addChordToSection(activePreset.id, pickerSectionId, chord.id);
                } else {
                  addChordToPreset(activePreset.id, chord.id);
                }
              }
              setShowCustomBuilder(false);
              setEditCustomId(null);
              setPickerSectionId(null);
            }}
            onClose={() => {
              setShowCustomBuilder(false);
              setEditCustomId(null);
              setPickerSectionId(null);
            }}
          />
        )}

        {!isWebDesktop ? (
          /* ── Mobile Top Stack: Floating Header & Song Metadata Toolbar ── */
          <>
            <SharedFloatingHeader
              title={activePreset.name || 'Song Editor'}
              onBack={() => setActivePreset(null)}
              backBtnTestId="editor-back-btn"
              toolbarActions={
                <div className="flex items-center gap-1">
                  {(() => {
                    const hasChords =
                      activePreset.chords.length > 0 ||
                      (activePreset.sections ?? []).some((s) => s.chords.length > 0);
                    return hasChords ? (
                      <button
                        aria-label="Live Mode"
                        onClick={() => setShowLive(true)}
                        data-testid="enter-live-mode"
                        className="h-8 px-2.5 rounded-full flex items-center gap-1 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                          boxShadow: `0 2px 8px ${accent.to}44`,
                        }}
                        type="button"
                      >
                        <span className="material-symbols-rounded text-sm">play_circle</span>
                        <span>Live</span>
                      </button>
                    ) : null;
                  })()}
                  <button
                    aria-label="Edit song details"
                    data-purpose="edit-song-details-btn"
                    onClick={() => {
                      setEditingId(activePreset.id);
                      setShowForm(true);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                    type="button"
                  >
                    <span className="material-symbols-rounded text-[20px]">edit</span>
                  </button>
                </div>
              }
            />

            <div
              className="flex-none px-4 pt-2 pb-2 flex flex-col gap-2.5 z-30"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
                background: 'var(--app-bg)',
              }}
            >
              {/* BEGIN: SongMetadataToolbar */}
              <section
                aria-label="Song Controls and Tuning"
                className="w-full flex items-center justify-between gap-2 px-0.5"
                data-purpose="song-toolbar"
              >
                {/* Left: Key & BPM */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(activePreset.id);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 border shadow-sm text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                      color: 'var(--c-text-primary, #111827)',
                    }}
                    data-purpose="key-badge"
                    title="Click to edit key"
                  >
                    <span
                      className="text-[11px] font-normal"
                      style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                    >
                      #
                    </span>
                    <span className="font-bold tracking-wide">
                      {transposeOffset === 0
                        ? activePreset.key || 'C'
                        : transposeKeyString(activePreset.key || 'C', transposeOffset, preferFlats)}
                    </span>
                  </button>

                  {activePreset.bpm > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(activePreset.id);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 border shadow-sm text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                        color: 'var(--c-text-primary, #111827)',
                      }}
                      data-purpose="bpm-badge"
                      title="Click to edit tempo"
                    >
                      <span
                        className="material-symbols-rounded text-sm"
                        style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                      >
                        speed
                      </span>
                      <span className="font-bold">{activePreset.bpm}</span>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                      >
                        BPM
                      </span>
                    </button>
                  )}
                </div>

                {/* Right: Transposition Controls */}
                <div
                  className="flex items-center rounded-full px-1.5 py-1 border shadow-sm gap-0.5"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                  data-purpose="transpose-controls"
                >
                  {transposeOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => resetTranspose(activePreset.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer"
                      style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                      title="Reset key"
                    >
                      <span className="material-symbols-rounded text-sm">restart_alt</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      useSettingsStore.getState().updateSettings({ preferFlats: !preferFlats })
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer"
                    style={{
                      color: 'var(--c-text-secondary, #6B7280)',
                      fontFamily: 'var(--font-headline)',
                      fontWeight: 800,
                      fontSize: '12px',
                    }}
                    title={
                      preferFlats
                        ? 'Using flats (click for sharps)'
                        : 'Using sharps (click for flats)'
                    }
                  >
                    {preferFlats ? '♭' : '♯'}
                  </button>

                  <button
                    type="button"
                    aria-label="Transpose down"
                    data-testid="transpose-down"
                    id="btn-transpose-down"
                    disabled={transposeOffset <= -11}
                    onClick={() => setTranspose(activePreset.id, transposeOffset - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer disabled:opacity-40"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                  >
                    <span className="material-symbols-rounded text-sm">remove</span>
                  </button>

                  <span
                    id="transpose-value"
                    className="text-xs font-bold font-mono px-1 select-none min-w-[24px] text-center"
                    style={{
                      color:
                        transposeOffset !== 0
                          ? 'var(--c-accent-from, #2563EB)'
                          : 'var(--c-text-primary, #111827)',
                    }}
                  >
                    {formatOffset(transposeOffset)}
                  </span>

                  <button
                    type="button"
                    aria-label="Transpose up"
                    data-testid="transpose-up"
                    id="btn-transpose-up"
                    disabled={transposeOffset >= 11}
                    onClick={() => setTranspose(activePreset.id, transposeOffset + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer disabled:opacity-40"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                  >
                    <span className="material-symbols-rounded text-sm">add</span>
                  </button>
                </div>
              </section>
              {/* END: SongMetadataToolbar */}
            </div>
          </>
        ) : (
          /* Desktop Title and Meta Header */
          <header
            className="flex-none app-bg"
            style={{
              paddingTop: '18px',
              paddingBottom: '10px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 950,
                    fontSize: '18px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activePreset.name}
                </h2>
                {activePreset.artist && (
                  <p
                    style={{
                      color: 'var(--c-text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activePreset.artist}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {(() => {
                  const hasChords =
                    activePreset.chords.length > 0 ||
                    (activePreset.sections ?? []).some((s) => s.chords.length > 0);
                  return hasChords ? (
                    <Button
                      variant="primary"
                      onClick={() => setShowLive(true)}
                      data-testid="enter-live-mode"
                      style={{
                        height: '34px',
                        padding: '0 11px 0 9px',
                        background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                        boxShadow: `0 2px 12px ${accent.to}55`,
                      }}
                      icon="play_circle"
                    >
                      {t.songs.liveMode}
                    </Button>
                  ) : null;
                })()}
                <MorphingActionSurface
                  triggerVariant="icon"
                  buttonIcon="data_object"
                  title="Export JSON"
                  subtitle={`Exporting ${activePreset.name}`}
                  accentColor={accent.from}
                  style={{
                    width: 34,
                    height: 34,
                    minHeight: 34,
                    padding: 0,
                    borderRadius: '50%',
                    backgroundColor: 'var(--c-surface-high, #1e1e24)',
                    border: '1px solid var(--c-border, rgba(255, 255, 255, 0.12))',
                  }}
                  rows={[
                    {
                      id: 'save',
                      label: 'Save File',
                      sublabel: 'Save JSON chord chart to storage',
                      icon: 'save',
                      onPress: () => {
                        exportPresetToJSON(activePreset, 'save');
                      },
                    },
                    {
                      id: 'share',
                      label: 'Share File',
                      sublabel: 'Send via Android share sheet',
                      icon: 'share',
                      onPress: () => {
                        exportPresetToJSON(activePreset, 'share');
                      },
                    },
                  ]}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setExportModal(activePreset)}
                  title={t.songs.exportToPdf}
                  style={{ borderRadius: '50%', width: 34, height: 34 }}
                  icon="picture_as_pdf"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setEditingId(activePreset.id);
                    setShowForm(true);
                  }}
                  style={{ borderRadius: '50%', width: 34, height: 34 }}
                  icon="edit"
                />
                <Button
                  variant="danger"
                  size="icon"
                  onClick={() => setShowDeleteId(activePreset.id)}
                  style={{ borderRadius: '50%', width: 34, height: 34 }}
                  icon="delete"
                />
              </div>
            </div>

            {/* Desktop Meta + transpose row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                marginTop: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {activePreset.key && (
                  <span
                    style={{
                      padding: '3px 10px 3px 8px',
                      background: 'var(--app-surface-high)',
                      color: 'var(--c-text-primary)',
                      borderRadius: '9999px',
                      fontFamily: 'var(--font-headline)',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: '1px solid rgba(72,72,72,0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontWeight: 900,
                        fontSize: '12px',
                        lineHeight: 1,
                        color: 'var(--c-text-secondary)',
                      }}
                    >
                      #
                    </span>
                    {transposeOffset === 0 ? (
                      activePreset.key
                    ) : (
                      <>
                        <span
                          style={{ opacity: 0.4, textDecoration: 'line-through', fontSize: '10px' }}
                        >
                          {activePreset.key}
                        </span>
                        <span style={{ marginLeft: '2px' }}>
                          {transposeKeyString(activePreset.key, transposeOffset, preferFlats)}
                        </span>
                      </>
                    )}
                  </span>
                )}
                {activePreset.bpm > 0 && (
                  <span
                    style={{
                      padding: '3px 10px',
                      background: 'var(--app-surface-high)',
                      color: 'var(--c-text-secondary)',
                      borderRadius: '9999px',
                      fontFamily: 'var(--font-headline)',
                      fontWeight: 700,
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activePreset.bpm} BPM
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                {transposeOffset !== 0 && (
                  <button
                    onClick={() => resetTranspose(activePreset.id)}
                    className="btn-smooth"
                    title={t.songs.resetKey}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '9999px',
                      background: 'var(--app-surface-high)',
                      color: 'var(--c-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                      restart_alt
                    </span>
                  </button>
                )}
                <button
                  onClick={() =>
                    useSettingsStore.getState().updateSettings({ preferFlats: !preferFlats })
                  }
                  className="btn-smooth"
                  title={preferFlats ? t.songs.usingFlats : t.songs.usingSharps}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'var(--app-surface-high)',
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 800,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {preferFlats ? '♭' : '♯'}
                </button>
                <button
                  onClick={() => setTranspose(activePreset.id, transposeOffset - 1)}
                  className="btn-smooth"
                  data-testid="transpose-down"
                  disabled={transposeOffset <= -11}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--app-surface-high)',
                    color: transposeOffset > -11 ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: transposeOffset <= -11 ? 0.4 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    remove
                  </span>
                </button>
                <div
                  style={{
                    width: '30px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 900,
                    fontSize: '12px',
                    color: transposeOffset !== 0 ? accent.from : 'var(--c-text-muted)',
                    transition: 'color 250ms ease',
                    flexShrink: 0,
                  }}
                >
                  {formatOffset(transposeOffset)}
                </div>
                <button
                  onClick={() => setTranspose(activePreset.id, transposeOffset + 1)}
                  className="btn-smooth"
                  data-testid="transpose-up"
                  disabled={transposeOffset >= 11}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--app-surface-high)',
                    color: transposeOffset < 11 ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: transposeOffset >= 11 ? 0.4 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    add
                  </span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Chord list or Empty Progression State */}
        {(() => {
          const totalChordsCount =
            (activePreset.chords?.length ?? 0) +
            (activePreset.sections ?? []).reduce((acc, s) => acc + s.chords.length, 0);
          const hasSections = !!(activePreset.sections && activePreset.sections.length > 0);
          const isEmptyProgression = totalChordsCount === 0;

          if (!isWebDesktop && isEmptyProgression) {
            return (
              <main
                className="flex-1 flex flex-col items-center justify-center px-4 -mt-8"
                data-purpose="empty-chord-progression"
              >
                {/* Musical Icon Graphic */}
                <div className="relative flex items-center justify-center mb-6">
                  {/* Soft glowing aura */}
                  <div
                    className="absolute w-28 h-28 rounded-full filter blur-xl animate-pulse"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--c-accent-from, #2563EB) 18%, transparent)',
                    }}
                  />
                  {/* Clean glyph composition */}
                  <div
                    className="relative flex items-center justify-center w-16 h-16 rounded-3xl border shadow-soft-card"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor:
                        'color-mix(in srgb, var(--c-accent-from, #2563EB) 20%, transparent)',
                      color: 'var(--c-accent-from, #2563EB)',
                    }}
                  >
                    <span className="material-symbols-rounded text-3xl">music_note</span>
                  </div>
                </div>

                {/* Descriptive Text */}
                <h2
                  className="text-base sm:text-lg font-bold text-center tracking-tight mb-2"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    color: 'var(--c-text-primary, #111827)',
                  }}
                >
                  No chords in this song yet.
                </h2>
                <p
                  className="text-xs sm:text-sm text-center max-w-[260px] leading-relaxed mb-6 font-normal"
                  style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                >
                  Add sections like Verse and Chorus, or insert chords directly to start building
                  your progression.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2.5">
                  {activePreset?.sections && activePreset.sections.length > 0 ? (
                    <MorphingActionSurface
                      placement="anchor"
                      compact
                      maxWidth={260}
                      title="Add chord to…"
                      accentColor={accent.from}
                      customTrigger={({ triggerProps }) => (
                        <motion.button
                          {...triggerProps}
                          data-purpose="empty-add-chord-btn"
                          className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer"
                          style={{
                            backgroundColor: 'var(--c-accent-from, #2563EB)',
                            boxShadow:
                              '0 8px 24px -4px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)',
                          }}
                          type="button"
                        >
                          <span className="material-symbols-rounded text-[18px]">music_note</span>
                          <span>{t.songs.addChord}</span>
                        </motion.button>
                      )}
                      rows={activePreset.sections.map((section) => ({
                        id: section.id,
                        label: section.name,
                        icon: 'layers',
                        sublabel: `${(section.chords || []).length} chords`,
                        onPress: () => {
                          setPickerSectionId(section.id);
                          setShowPicker(true);
                        },
                      }))}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setPickerSectionId(null);
                        setShowPicker(true);
                      }}
                      data-purpose="empty-add-chord-btn"
                      className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-full active:scale-95 transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--c-accent-from, #2563EB)',
                        boxShadow:
                          '0 8px 24px -4px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)',
                      }}
                      type="button"
                    >
                      <span className="material-symbols-rounded text-[18px]">music_note</span>
                      <span>{t.songs.addChord}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCustomSectionName('');
                      setCustomSectionMode(false);
                      setShowSectionPicker(true);
                    }}
                    data-purpose="empty-add-section-btn"
                    className="inline-flex items-center gap-1.5 border text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                      color: 'var(--c-text-primary, #111827)',
                    }}
                    type="button"
                  >
                    <span
                      className="material-symbols-rounded text-[18px]"
                      style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                    >
                      layers
                    </span>
                    <span>Add Section</span>
                  </button>
                </div>
              </main>
            );
          }

          return (
            <div
              ref={editorScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar"
              style={{ padding: '0 16px 100px', position: 'relative' }}
              data-purpose="editor-content-area"
            >
              {/* Optional Lyrics / Notes Card */}
              {activePreset.notes && (
                <div
                  className="mb-4 mt-2 rounded-2xl border p-3.5 shadow-soft-card flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                  data-purpose="song-notes-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="material-symbols-rounded text-sm"
                        style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                      >
                        description
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                      >
                        Lyrics & Notes
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(activePreset.id);
                        setShowForm(true);
                      }}
                      className="text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
                      style={{ color: 'var(--c-accent-from, #2563EB)' }}
                    >
                      <span className="material-symbols-rounded text-xs">edit</span>
                      <span>Edit</span>
                    </button>
                  </div>
                  <p
                    className="text-xs whitespace-pre-wrap leading-relaxed"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                  >
                    {activePreset.notes}
                  </p>
                </div>
              )}

              {hasSections ? (
                /* ── Sections view ── */
                <div
                  style={{ paddingTop: '8px', paddingBottom: '16px' }}
                  onPointerMove={onSecDragMove}
                  onPointerUp={onSecDragEnd}
                  onPointerCancel={onSecDragEnd}
                >
                  {localSections.map((section, secIdx) => {
                    const isEditing = editingSectionId === section.id;
                    const isSecActive = secDragIdx === secIdx;
                    const stableKey = secInstanceKeys.current[secIdx] ?? section.id;
                    return (
                      <div
                        key={stableKey}
                        ref={(el) => {
                          secRefs.current[secIdx] = el;
                          if (isSecActive) secDragNodeRef.current = el;
                        }}
                        style={{
                          marginBottom: '16px',
                          borderRadius: '16px',
                          background: isSecActive ? `${accent.to}10` : 'transparent',
                          border: isSecActive
                            ? `1.5px solid ${accent.to}30`
                            : '1.5px solid transparent',
                          boxShadow: isSecActive ? '0 6px 20px rgba(0,0,0,0.18)' : 'none',
                          zIndex: isSecActive ? 10 : 1,
                          position: 'relative',
                          willChange: isSecActive ? 'transform' : 'auto',
                          transition: isSecActive
                            ? 'box-shadow 150ms ease'
                            : 'box-shadow 200ms ease',
                          padding: isSecActive ? '8px' : '0',
                        }}
                      >
                        {/* Section header row */}
                        <div className="flex items-center gap-1.5 mb-2 px-0.5">
                          {/* Drag handle */}
                          <div
                            onPointerDown={(e) => onSecDragStart(e, secIdx)}
                            style={{
                              cursor: isSecActive ? 'grabbing' : 'grab',
                              touchAction: 'none',
                              padding: '4px 2px',
                              color: 'var(--c-text-muted)',
                              userSelect: 'none',
                              flexShrink: 0,
                            }}
                            title="Drag to reorder section"
                          >
                            <span className="material-symbols-rounded text-lg">drag_indicator</span>
                          </div>

                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingSectionName}
                              onChange={(e) => setEditingSectionName(e.target.value)}
                              onBlur={() => {
                                if (editingSectionName.trim())
                                  updateSection(
                                    activePreset.id,
                                    section.id,
                                    editingSectionName.trim()
                                  );
                                setEditingSectionId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingSectionName.trim())
                                    updateSection(
                                      activePreset.id,
                                      section.id,
                                      editingSectionName.trim()
                                    );
                                  setEditingSectionId(null);
                                }
                                if (e.key === 'Escape') setEditingSectionId(null);
                              }}
                              className="flex-1 rounded-lg px-2.5 py-1 text-xs font-extrabold outline-none border"
                              style={{
                                backgroundColor: 'var(--surface-card-bg, #ffffff)',
                                borderColor: 'var(--c-accent-from, #2563EB)',
                                color: 'var(--c-text-primary, #111827)',
                                fontFamily: 'var(--font-headline)',
                              }}
                            />
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              <span
                                className="w-1 h-3.5 rounded-full"
                                style={{ backgroundColor: 'var(--c-accent-from, #2563EB)' }}
                              />
                              <h3
                                className="text-xs font-extrabold tracking-wider uppercase"
                                style={{
                                  fontFamily: 'var(--font-headline)',
                                  color: 'var(--c-accent-from, #2563EB)',
                                }}
                              >
                                {section.name}
                              </h3>
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: 'var(--c-text-muted, #8A92A6)' }}
                              >
                                ({section.chords.length})
                              </span>
                            </div>
                          )}

                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPickerSectionId(section.id);
                                  setShowPicker(true);
                                }}
                                className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                style={{
                                  backgroundColor:
                                    'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, var(--surface-card-bg, #ffffff))',
                                  color: 'var(--c-accent-from, #2563EB)',
                                  border:
                                    '1px solid color-mix(in srgb, var(--c-accent-from, #2563EB) 20%, transparent)',
                                }}
                                title="Add chord to this section"
                              >
                                <span className="material-symbols-rounded text-[13px]">
                                  music_note
                                </span>
                                <span>+ Chord</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSectionId(section.id);
                                  setEditingSectionName(section.name);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-card-bg, #ffffff)',
                                  color: 'var(--c-text-secondary, #6B7280)',
                                  border: '1px solid var(--c-border, #E3E6EB)',
                                }}
                                title="Rename section"
                              >
                                <span className="material-symbols-rounded text-sm">edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (localSections.length > 1 || section.chords.length === 0)
                                    deleteSection(activePreset.id, section.id);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                style={{
                                  backgroundColor: 'rgba(239,68,68,0.08)',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  opacity:
                                    localSections.length <= 1 && section.chords.length > 0
                                      ? 0.3
                                      : 1,
                                }}
                                title="Delete section"
                              >
                                <span className="material-symbols-rounded text-sm">delete</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Chords in section */}
                        {section.chords.length === 0 && (
                          <div
                            onClick={() => {
                              setPickerSectionId(section.id);
                              setShowPicker(true);
                            }}
                            className="border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.99]"
                            style={{
                              borderColor: 'var(--c-border, #E3E6EB)',
                              backgroundColor: 'var(--surface-card-bg, #ffffff)',
                            }}
                          >
                            <span
                              className="material-symbols-rounded text-base mb-1"
                              style={{ color: 'var(--c-accent-from, #2563EB)' }}
                            >
                              music_note
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                            >
                              No chords in this section yet. Tap to add.
                            </span>
                          </div>
                        )}

                        {(() => {
                          const sChords =
                            secChordDragKey === section.id
                              ? (localSections.find((s) => s.id === section.id)?.chords ??
                                section.chords)
                              : section.chords;
                          const isDragSec = secChordDragKey === section.id;
                          return (
                            <div
                              onPointerMove={isDragSec ? onSecChordDragMove : undefined}
                              onPointerUp={isDragSec ? onSecChordDragEnd : undefined}
                              onPointerCancel={isDragSec ? onSecChordDragEnd : undefined}
                              style={{
                                position: 'relative',
                                height: isDragSec ? `${sChords.length * SEC_CHORD_H}px` : 'auto',
                              }}
                            >
                              {sChords.map((chordId, idx) => {
                                const isCustom = chordId.startsWith('custom-');
                                const customChord = isCustom
                                  ? (customChords.find((c) => c.id === chordId) ?? null)
                                  : null;
                                const displayId =
                                  !isCustom && transposeOffset !== 0
                                    ? transposeChordId(chordId, transposeOffset)
                                    : chordId;
                                const chord = isCustom
                                  ? null
                                  : (getChordById(displayId) ?? getChordById(chordId));
                                if (!chord && !customChord) return null;
                                const isActive = isDragSec && secChordDragIdx === idx;
                                return (
                                  <div
                                    key={chordId + '-' + idx}
                                    ref={
                                      isActive
                                        ? (el) => {
                                            secChordDragNodeRef.current = el;
                                          }
                                        : undefined
                                    }
                                    style={{
                                      position: isDragSec ? 'absolute' : 'relative',
                                      left: isDragSec ? 0 : undefined,
                                      right: isDragSec ? 0 : undefined,
                                      top: isDragSec
                                        ? `${idx * SEC_CHORD_H + (isActive ? secChordDragDeltaY : 0)}px`
                                        : undefined,
                                      height: `${SEC_CHORD_H - 6}px`,
                                      marginBottom: isDragSec ? 0 : '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 12px',
                                      background: isActive
                                        ? `${accent.to}18`
                                        : 'var(--surface-card-bg, #ffffff)',
                                      borderRadius: '1rem',
                                      border: isActive
                                        ? `1.5px solid ${accent.to}44`
                                        : '1px solid var(--c-border, #E3E6EB)',
                                      boxShadow: isActive
                                        ? '0 12px 36px rgba(0,0,0,0.4)'
                                        : 'var(--shadow-soft-card, none)',
                                      zIndex: isActive ? 10 : 1,
                                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                      transition:
                                        isDragSec && !isActive
                                          ? 'top 180ms cubic-bezier(0.34,1.3,0.64,1), box-shadow 150ms ease, transform 200ms ease'
                                          : isActive
                                            ? 'box-shadow 120ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1)'
                                            : 'transform 200ms ease',
                                      willChange: isDragSec ? 'top, transform' : 'auto',
                                    }}
                                  >
                                    <div
                                      onPointerDown={(e) =>
                                        onSecChordDragStart(
                                          e,
                                          section.id,
                                          idx,
                                          sChords.length,
                                          activePreset
                                        )
                                      }
                                      style={{
                                        cursor: isActive ? 'grabbing' : 'grab',
                                        touchAction: 'none',
                                        padding: '4px 2px',
                                        color: 'var(--c-text-muted)',
                                        userSelect: 'none',
                                        flexShrink: 0,
                                      }}
                                      title="Drag to reorder chord"
                                    >
                                      <span
                                        className="material-symbols-rounded"
                                        style={{ fontSize: '18px' }}
                                      >
                                        drag_indicator
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        background: 'var(--c-surface-lowest, #ECEEF2)',
                                        borderRadius: '8px',
                                        padding: '3px 3px 1px',
                                        width: '52px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isCustom && customChord ? (
                                        <CustomMiniDiagram
                                          chord={customChord}
                                          accentFrom={accent.from}
                                        />
                                      ) : (
                                        <ChordDiagram
                                          data={chord!.guitar}
                                          accentFrom={accent.from}
                                        />
                                      )}
                                    </div>
                                    <p
                                      style={{
                                        flex: 1,
                                        color: 'var(--c-text-primary)',
                                        fontFamily: 'var(--font-headline)',
                                        fontWeight: 800,
                                        fontSize: '15px',
                                      }}
                                    >
                                      {isCustom
                                        ? customChord?.name || t.songs.customChord
                                        : chord!.name.replace(/\s/g, '')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        duplicateChordInSection(activePreset.id, section.id, idx)
                                      }
                                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                      style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                                      title="Duplicate chord"
                                    >
                                      <span className="material-symbols-rounded text-base">
                                        content_copy
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeChordFromSection(activePreset.id, section.id, idx)
                                      }
                                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                      style={{
                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                        color: '#EF4444',
                                      }}
                                      title="Remove chord"
                                    >
                                      <span className="material-symbols-rounded text-base">
                                        close
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Flat chord list ── */
                <>
                  <div
                    style={{
                      paddingTop: '8px',
                      paddingBottom: '24px',
                      position: 'relative',
                      height: dragIdx !== null ? `${localChords.length * ITEM_H + 32}px` : 'auto',
                    }}
                  >
                    {localChords.map((chordId, i) => {
                      const isCustom = chordId.startsWith('custom-');
                      const customChord = isCustom
                        ? (customChords.find((c) => c.id === chordId) ?? null)
                        : null;
                      const displayId =
                        !isCustom && transposeOffset !== 0
                          ? transposeChordId(chordId, transposeOffset)
                          : chordId;
                      const chord = isCustom
                        ? null
                        : (getChordById(displayId) ?? getChordById(chordId));
                      if (!chord && !customChord) return null;
                      const isActive = dragIdx === i;
                      const stableKey = instanceKeys.current[i] ?? `${chordId}-${i}`;
                      const isDrag = dragIdx !== null;

                      return (
                        <div
                          key={stableKey}
                          ref={
                            isActive
                              ? (el) => {
                                  dragNodeRef.current = el;
                                }
                              : undefined
                          }
                          style={{
                            position: isDrag ? 'absolute' : 'relative',
                            left: isDrag ? 0 : undefined,
                            right: isDrag ? 0 : undefined,
                            top: isDrag
                              ? `${i * ITEM_H + 8 + (isActive ? dragDeltaY : 0)}px`
                              : undefined,
                            height: `${ITEM_H - 8}px`,
                            marginBottom: isDrag ? 0 : '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            background: isActive
                              ? `${accent.to}18`
                              : 'var(--surface-card-bg, #ffffff)',
                            borderRadius: '1rem',
                            borderWidth: isActive ? '1.5px' : '1px',
                            borderStyle: 'solid',
                            borderColor: isActive ? `${accent.to}44` : 'var(--c-border, #E3E6EB)',
                            boxShadow: isActive
                              ? '0 16px 48px rgba(0,0,0,0.5)'
                              : 'var(--shadow-soft-card, none)',
                            zIndex: isActive ? 10 : 1,
                            transform: isActive ? 'scale(1.02)' : 'scale(1)',
                            transition:
                              isDrag && !isActive
                                ? 'top 180ms cubic-bezier(0.34, 1.3, 0.64, 1), box-shadow 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 200ms cubic-bezier(0.34, 1.3, 0.64, 1)'
                                : isActive
                                  ? 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                                  : 'background-color 200ms ease, border-color 200ms ease, transform 200ms ease',
                            willChange: isDrag ? 'top, transform' : 'auto',
                          }}
                        >
                          {/* Drag handle */}
                          <div
                            onPointerDown={(e) => onDragStart(e, i)}
                            style={{
                              cursor: isActive ? 'grabbing' : 'grab',
                              touchAction: 'none',
                              padding: '4px 4px',
                              color: 'var(--c-text-muted)',
                              userSelect: 'none',
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                              drag_indicator
                            </span>
                          </div>

                          <div
                            style={{
                              background: 'var(--c-surface-lowest, #ECEEF2)',
                              borderRadius: '8px',
                              padding: '3px 3px 1px',
                              width: '52px',
                              flexShrink: 0,
                            }}
                          >
                            {isCustom && customChord ? (
                              <CustomMiniDiagram chord={customChord} accentFrom={accent.from} />
                            ) : (
                              <ChordDiagram data={chord!.guitar} accentFrom={accent.from} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <p
                                style={{
                                  color: 'var(--c-text-primary)',
                                  fontFamily: 'var(--font-headline)',
                                  fontWeight: 800,
                                  fontSize: '17px',
                                  lineHeight: 1,
                                }}
                              >
                                {isCustom
                                  ? customChord?.name || t.songs.customChord
                                  : chord!.name.replace(/\s/g, '')}
                              </p>
                              {settings.chordAssistant &&
                                settings.assistantConflictDetection &&
                                !isCustom &&
                                activePreset.key &&
                                isChordOutOfKey(chordId, activePreset.key) && (
                                  <span
                                    title="Out of key"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      background: 'rgba(251,146,60,0.15)',
                                      borderRadius: '4px',
                                      padding: '1px 4px',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-rounded"
                                      style={{ fontSize: '12px', color: '#fb923c' }}
                                    >
                                      warning
                                    </span>
                                  </span>
                                )}
                            </div>
                          </div>
                          <span
                            style={{
                              color: 'var(--c-text-muted)',
                              fontFamily: 'var(--font-headline)',
                              fontWeight: 900,
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            #{i + 1}
                          </span>
                          {isCustom && customChord && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditCustomId(customChord.id);
                                setShowCustomBuilder(true);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                              title={t.songs.editCustomChord}
                              style={{
                                background: `${accent.from}18`,
                                flexShrink: 0,
                              }}
                            >
                              <span
                                className="material-symbols-rounded"
                                style={{ color: accent.from, fontSize: '15px' }}
                              >
                                edit
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => duplicateChordInPreset(activePreset.id, i)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                            title="Duplicate chord"
                          >
                            <span className="material-symbols-rounded text-base">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChordFromPreset(activePreset.id, i)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                            style={{
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              color: '#EF4444',
                              flexShrink: 0,
                            }}
                            title="Remove chord"
                          >
                            <span className="material-symbols-rounded text-base">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Floating Action Buttons Area (Mobile) */}
        {!isWebDesktop && (
          <div
            className="fixed right-5 flex flex-col items-end gap-2.5 z-40 pointer-events-none"
            style={{
              bottom:
                'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 24px)',
            }}
            data-purpose="fab-container"
          >
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <MorphingActionSurface
                isOpen={showSectionPicker}
                onOpenChange={setShowSectionPicker}
                placement="anchor"
                compact
                maxWidth={240}
                title={t.songs.addSection}
                accentColor={accent.from}
                customTrigger={({ triggerProps }) => (
                  <motion.button
                    {...triggerProps}
                    aria-label="Add Section"
                    data-testid="add-section-btn"
                    onClick={() => {
                      setCustomSectionName('');
                      setCustomSectionMode(false);
                      triggerProps.onClick();
                    }}
                    className="h-10 px-3.5 rounded-full border shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-card-bg, #ffffff)',
                      borderColor: 'var(--c-border, #E3E6EB)',
                      color: 'var(--c-text-primary, #111827)',
                    }}
                    type="button"
                  >
                    <span
                      className="material-symbols-rounded text-[18px]"
                      style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                    >
                      layers
                    </span>
                    <span>Section</span>
                  </motion.button>
                )}
                rows={[
                  ...[
                    'Verse',
                    'Chorus',
                    'Bridge',
                    'Pre-Chorus',
                    'Intro',
                    'Outro',
                    'Interlude',
                    'Solo',
                    'Hook',
                  ].map((name) => ({
                    id: name.toLowerCase(),
                    label: name,
                    icon: 'layers',
                    onPress: () => {
                      if (!activePreset) return;
                      const hasSecs = !!(activePreset.sections && activePreset.sections.length > 0);
                      if (!hasSecs && localChords.length > 0) convertToSections(activePreset.id);
                      else addSection(activePreset.id, name);
                    },
                  })),
                  {
                    id: 'custom',
                    label: 'Custom...',
                    icon: 'edit',
                    onPress: () => {
                      if (!activePreset) return;
                      const name = window.prompt(t.songs.sectionNamePlaceholder || 'Section name:');
                      if (name && name.trim()) {
                        const hasSecs = !!(activePreset.sections && activePreset.sections.length > 0);
                        if (!hasSecs && localChords.length > 0) convertToSections(activePreset.id);
                        else addSection(activePreset.id, name.trim());
                      }
                    },
                  },
                ]}
              />

              {activePreset?.sections && activePreset.sections.length > 0 ? (
                <MorphingActionSurface
                  placement="anchor"
                  compact
                  maxWidth={260}
                  title="Add chord to…"
                  accentColor={accent.from}
                  customTrigger={({ triggerProps }) => (
                    <motion.button
                      {...triggerProps}
                      aria-label="Add Chord"
                      data-testid="add-chord-btn"
                      className="h-11 px-4 rounded-full text-white shadow-float flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                      style={{
                        backgroundColor: 'var(--c-accent-from, #2563EB)',
                        boxShadow:
                          '0 8px 24px -4px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)',
                      }}
                      type="button"
                    >
                      <span className="material-symbols-rounded text-[18px]">music_note</span>
                      <span>+ Chord</span>
                    </motion.button>
                  )}
                  rows={activePreset.sections.map((section) => ({
                    id: section.id,
                    label: section.name,
                    icon: 'layers',
                    sublabel: `${(section.chords || []).length} chords`,
                    onPress: () => {
                      setPickerSectionId(section.id);
                      setShowPicker(true);
                    },
                  }))}
                />
              ) : (
                <button
                  aria-label="Add Chord"
                  data-testid="add-chord-btn"
                  onClick={() => {
                    setPickerSectionId(null);
                    setShowPicker(true);
                  }}
                  className="h-11 px-4 rounded-full text-white shadow-float flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--c-accent-from, #2563EB)',
                    boxShadow:
                      '0 8px 24px -4px color-mix(in srgb, var(--c-accent-from, #2563EB) 40%, transparent)',
                  }}
                  type="button"
                >
                  <span className="material-symbols-rounded text-[18px]">music_note</span>
                  <span>+ Chord</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop Bottom Action Strip */}
        {isWebDesktop && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              padding: '10px 16px',
              display: 'flex',
              gap: '8px',
            }}
          >
            <MorphingActionSurface
              isOpen={showSectionPicker}
              onOpenChange={setShowSectionPicker}
              placement="anchor"
              compact
              maxWidth={240}
              title={t.songs.addSection}
              accentColor={accent.from}
              customTrigger={({ open, surfaceId }) => (
                <motion.div layoutId={surfaceId} style={{ flex: 1 }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCustomSectionName('');
                      setCustomSectionMode(false);
                      open();
                    }}
                    data-testid="add-section-btn"
                    style={{
                      width: '100%',
                      borderRadius: '9999px',
                      background: 'var(--app-surface-high)',
                      color: 'var(--c-text-secondary)',
                    }}
                    icon="layers"
                  >
                    {t.songs.addSection}
                  </Button>
                </motion.div>
              )}
              rows={[
                ...[
                  'Verse',
                  'Chorus',
                  'Bridge',
                  'Pre-Chorus',
                  'Intro',
                  'Outro',
                  'Interlude',
                  'Solo',
                  'Hook',
                ].map((name) => ({
                  id: name.toLowerCase(),
                  label: name,
                  icon: 'layers',
                  onPress: () => {
                    if (!activePreset) return;
                    const hasSecs = !!(activePreset.sections && activePreset.sections.length > 0);
                    if (!hasSecs && localChords.length > 0) convertToSections(activePreset.id);
                    else addSection(activePreset.id, name);
                  },
                })),
                {
                  id: 'custom',
                  label: 'Custom...',
                  icon: 'edit',
                  onPress: () => {
                    if (!activePreset) return;
                    const name = window.prompt(t.songs.sectionNamePlaceholder || 'Section name:');
                    if (name && name.trim()) {
                      const hasSecs = !!(activePreset.sections && activePreset.sections.length > 0);
                      if (!hasSecs && localChords.length > 0) convertToSections(activePreset.id);
                      else addSection(activePreset.id, name.trim());
                    }
                  },
                },
              ]}
            />
            {activePreset?.sections && activePreset.sections.length > 0 ? (
              <MorphingActionSurface
                placement="anchor"
                compact
                maxWidth={260}
                title="Add chord to…"
                accentColor={accent.from}
                customTrigger={({ open, surfaceId }) => (
                  <motion.div layoutId={surfaceId} style={{ flex: 1 }}>
                    <Button
                      variant="primary"
                      onClick={open}
                      data-testid="add-chord-btn"
                      style={{
                        width: '100%',
                        borderRadius: '9999px',
                      }}
                      icon="music_note"
                    >
                      {t.songs.addChord || 'Add Chord'}
                    </Button>
                  </motion.div>
                )}
                rows={activePreset.sections.map((section) => ({
                  id: section.id,
                  label: section.name,
                  icon: 'layers',
                  sublabel: `${(section.chords || []).length} chords`,
                  onPress: () => {
                    setPickerSectionId(section.id);
                    setShowPicker(true);
                  },
                }))}
              />
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setPickerSectionId(null);
                  setShowPicker(true);
                }}
                data-testid="add-chord-btn"
                style={{
                  flex: 1,
                  borderRadius: '9999px',
                }}
                icon="music_note"
              >
                {t.songs.addChord || 'Add Chord'}
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <PresetForm
            accent={accent}
            initial={editingFormData}
            onSave={handleFormSave}
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        )}

        {/* Export modal (also available from inside the editor) */}
        {exportModalPreset && (
          <ExportModal
            preset={exportModalPreset}
            accent={accent}
            onClose={() => setExportModal(null)}
            transposeOffset={transposeOffset}
            storedCustomChords={customChords}
          />
        )}

      </div>
    );
  };

  const isEditingMobilePreset = !isWebDesktop && !!activePreset && !showForm;
  const songsMobileView = isEditingMobilePreset ? 'editor' : 'list';

  /* â•â•â•â•â•â•â• VIEW: PRESET LIST â•â•â•â•â•â•â• */
  if (isWebDesktop) {
    return (
      <div
        className="flex w-full h-full overflow-hidden"
        style={{ position: 'relative', background: 'var(--c-background)' }}
      >
        {/* Left Column: Setlist song list */}
        <div
          style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            borderRight: '1px solid var(--c-border)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              borderBottom: '1px solid var(--c-border)',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--c-text-secondary)',
              }}
            >
              SETLIST
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setEditingId(null);
                  setShowForm(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title={t.songs.newSong}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add
                </span>
              </button>
              <button
                onClick={() => setShowImport(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--c-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Import"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  upload_file
                </span>
              </button>
            </div>
          </div>
          {/* List of songs */}
          <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: '8px' }}>
            {presets.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--c-text-muted)',
                  fontSize: '12px',
                }}
              >
                No Songs
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {presets.map((p) => {
                  const isActive = p.id === activePresetId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActivePreset(p.id)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        textAlign: 'left',
                        background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? '#fff' : 'var(--c-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.name}
                        </span>
                        {p.key && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--c-text-secondary)',
                              opacity: 0.8,
                            }}
                          >
                            {p.key}
                          </span>
                        )}
                      </div>
                      {p.artist && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--c-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.artist}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preset Editor or Empty State */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {activePreset ? (
            renderEditor()
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-muted)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}
              >
                queue_music
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 'bold',
                }}
              >
                Select a song from the setlist
              </span>
            </div>
          )}
        </div>

        {/* Form and Modals */}
        {showForm && (
          <PresetForm
            accent={accent}
            initial={editingFormData}
            onSave={handleFormSave}
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        )}

        {showDeleteId && (
          <Dialog
            open={true}
            onClose={() => setShowDeleteId(null)}
            title={t.songs.confirmDelete}
            footer={
              <>
                <Button onClick={() => setShowDeleteId(null)}>{t.songs.cancel}</Button>
                <Button
                  onClick={() => {
                    deletePreset(showDeleteId);
                    setShowDeleteId(null);
                  }}
                  style={{
                    backgroundColor: 'rgba(238,125,119,0.12)',
                    color: '#ee7d77',
                    border: '1px solid rgba(238,125,119,0.3)',
                  }}
                >
                  {t.songs.delete}
                </Button>
              </>
            }
          >
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px' }}>
              Are you sure you want to delete this song preset? This action cannot be undone.
            </p>
          </Dialog>
        )}

        {exportModalPreset && (
          <ExportModal
            preset={exportModalPreset}
            accent={accent}
            onClose={() => setExportModal(null)}
            transposeOffset={transposeOffset}
            storedCustomChords={customChords}
          />
        )}

        {showImport && (
          <ImportSongModal
            accent={accent}
            existingPresets={presets}
            onImport={handleImport}
            onClose={() => setShowImport(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden app-bg" style={{ position: 'relative' }}>
      {showForm && (
        <PresetForm
          accent={accent}
          initial={editingFormData}
          onSave={handleFormSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* Main viewport with canonical drilldown transition */}
      <div
        style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      >
        <StudioPageTransition pageKey={songsMobileView} variant="drilldown">
          {songsMobileView === 'editor' ? (
            renderEditor()
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Main scrollable viewport */}
              <div
                ref={listScrollRef}
                className="flex-1 overflow-y-auto no-scrollbar"
                style={{ background: 'var(--app-bg)' }}
                data-purpose="songs-screen"
              >
                <main
                  className="w-full max-w-md mx-auto pb-32 px-4 pt-3 space-y-4"
                  style={{
                    paddingTop:
                      'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px))',
                  }}
                  data-purpose="mobile-viewport"
                >
                  {/* Canonical Studio Header */}
                  <StudioHeader
                    title="Songs"
                    subtitle={t.songs?.subtitle || 'Manage your song presets and perform live.'}
                    disableHorizontalPadding={true}
                    disableTopInset={true}
                  />

                  {/* Capsule Search Bar */}
                  <div className="relative flex items-center" data-purpose="search-bar">
                    <span
                      className="material-symbols-rounded absolute left-4 pointer-events-none text-lg select-none"
                      style={{ color: 'var(--c-text-muted, #94A3B8)' }}
                    >
                      search
                    </span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search titles, keys, or tags..."
                      className="w-full pl-10 pr-10 py-3 text-sm rounded-full border shadow-soft-card outline-none transition-all font-inter"
                      style={{
                        backgroundColor: 'var(--surface-card-bg, #ffffff)',
                        borderColor: 'var(--c-border, #E3E6EB)',
                        color: 'var(--c-text-primary, #111827)',
                      }}
                    />
                    {searchQuery && (
                      <button
                        aria-label="Clear search"
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-transform cursor-pointer"
                        style={{ color: 'var(--c-text-muted, #94A3B8)' }}
                      >
                        <span className="material-symbols-rounded text-base">close</span>
                      </button>
                    )}
                  </div>

                  {/* Empty states or song list */}
                  {filteredPresets.length === 0 ? (
                    presets.length === 0 ? (
                      /* No songs yet in library */
                      <section
                        className="flex flex-col items-center justify-center text-center px-4 py-16"
                        data-purpose="empty-state"
                      >
                        <div
                          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-soft-card"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--c-accent-from, #2563EB) 10%, var(--surface-card-bg, #ffffff))',
                            borderColor:
                              'color-mix(in srgb, var(--c-accent-from, #2563EB) 22%, transparent)',
                            color: 'var(--c-accent-from, #2563EB)',
                          }}
                        >
                          <span className="material-symbols-rounded text-3xl">library_music</span>
                        </div>
                        <h2
                          className="text-xl font-bold tracking-tight"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            color: 'var(--c-text-primary, #111827)',
                          }}
                        >
                          No songs yet
                        </h2>
                        <p
                          className="text-xs font-normal max-w-[240px] mt-1.5 leading-relaxed"
                          style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                        >
                          Tap the{' '}
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--c-text-primary)' }}
                          >
                            '+'
                          </span>{' '}
                          button to create your first progression
                        </p>
                        <div className="flex items-center gap-2.5 mt-6">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setShowForm(true);
                            }}
                            className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            style={{
                              backgroundColor: 'var(--c-accent-from, #2563EB)',
                              boxShadow:
                                '0 4px 14px color-mix(in srgb, var(--c-accent-from, #2563EB) 30%, transparent)',
                            }}
                            data-purpose="empty-create-song-btn"
                          >
                            <span className="material-symbols-rounded text-base">add</span>
                            <span>Create Song</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowImport(true)}
                            className="px-4 py-2 rounded-full text-xs font-semibold border shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            style={{
                              backgroundColor: 'var(--surface-card-bg, #ffffff)',
                              borderColor: 'var(--c-border, #E3E6EB)',
                              color: 'var(--c-text-primary, #111827)',
                            }}
                            data-purpose="empty-import-btn"
                          >
                            <span className="material-symbols-rounded text-base">
                              cloud_download
                            </span>
                            <span>Import</span>
                          </button>
                        </div>
                      </section>
                    ) : (
                      /* Search yields no results */
                      <section
                        className="flex flex-col items-center justify-center text-center px-4 py-16"
                        data-purpose="search-empty-state"
                      >
                        <div
                          className="w-14 h-14 rounded-3xl flex items-center justify-center mb-4 border shadow-soft-card"
                          style={{
                            backgroundColor: 'var(--surface-card-bg, #ffffff)',
                            borderColor: 'var(--c-border, #E3E6EB)',
                            color: 'var(--c-text-muted, #8A92A6)',
                          }}
                        >
                          <span className="material-symbols-rounded text-2xl">search_off</span>
                        </div>
                        <h3
                          className="text-lg font-bold tracking-tight"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            color: 'var(--c-text-primary, #111827)',
                          }}
                        >
                          No matching songs
                        </h3>
                        <p
                          className="text-xs font-medium mt-1 max-w-[240px]"
                          style={{ color: 'var(--c-text-secondary, #6B7280)' }}
                        >
                          No songs found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-4 px-3.5 py-1.5 rounded-full border text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                          style={{
                            backgroundColor: 'var(--surface-card-bg, #ffffff)',
                            borderColor: 'var(--c-border, #E3E6EB)',
                            color: 'var(--c-text-primary, #111827)',
                          }}
                          data-purpose="clear-search-btn"
                        >
                          Clear Search
                        </button>
                      </section>
                    )
                  ) : (
                    /* Scalable Song List */
                    <div className="space-y-2.5" data-purpose="song-list">
                      <StaggeredReveal staggerInterval={30}>
                        {filteredPresets.map((preset) => (
                          <PresetCard
                            key={preset.id}
                            preset={preset}
                            accent={accent}
                            t={t}
                            setActivePreset={setActivePreset}
                            setShowLive={setShowLive}
                            setExportModal={setExportModal}
                            setEditingId={setEditingId}
                            setShowForm={setShowForm}
                            setShowDeleteId={setShowDeleteId}
                          />
                        ))}
                      </StaggeredReveal>
                    </div>
                  )}
                </main>
              </div>

              {/* Delete confirmation sheet */}
              {showDeleteId && (
                <Dialog
                  open={true}
                  onClose={() => setShowDeleteId(null)}
                  title={t.songs.confirmDelete}
                  footer={
                    <>
                      <Button onClick={() => setShowDeleteId(null)}>{t.songs.cancel}</Button>
                      <Button
                        onClick={() => {
                          deletePreset(showDeleteId);
                          setShowDeleteId(null);
                        }}
                        style={{
                          backgroundColor: 'rgba(238,125,119,0.12)',
                          color: '#ee7d77',
                          border: '1px solid rgba(238,125,119,0.3)',
                        }}
                      >
                        {t.songs.delete}
                      </Button>
                    </>
                  }
                >
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                    Are you sure you want to delete this song preset? This action cannot be undone.
                  </p>
                </Dialog>
              )}

              {/* Export config modal */}
              {exportModalPreset && (
                <ExportModal
                  preset={exportModalPreset}
                  accent={accent}
                  onClose={() => setExportModal(null)}
                  transposeOffset={transposeOffset}
                  storedCustomChords={customChords}
                />
              )}

              {/* Import song modal */}
              {showImport && (
                <ImportSongModal
                  accent={accent}
                  existingPresets={presets}
                  onImport={handleImport}
                  onClose={() => setShowImport(false)}
                />
              )}

              {/* Floating Action Buttons (FAB Stack) */}
              <aside
                className="fixed right-5 flex flex-col items-end gap-3 pointer-events-auto"
                style={{
                  bottom:
                    'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 86px)',
                  zIndex: 40,
                }}
                data-purpose="action-buttons"
              >
                {/* Secondary FAB: Import */}
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  data-testid="import-preset-btn"
                  aria-label="Import or Backup Cloud"
                  title="Import or Backup Cloud"
                  className="w-11 h-11 rounded-full border shadow-soft-card flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                    color: 'var(--c-text-secondary, #6B7280)',
                  }}
                >
                  <span className="material-symbols-rounded text-xl">cloud_download</span>
                </button>

                {/* Primary FAB: Create Song */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setShowForm(true);
                  }}
                  data-testid="new-preset-btn"
                  aria-label="Create new progression"
                  title="Create new progression"
                  className="rounded-full text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  style={{
                    width: '52px',
                    height: '52px',
                    backgroundColor: 'var(--c-accent-from, #2563EB)',
                    boxShadow:
                      '0 8px 24px color-mix(in srgb, var(--c-accent-from, #2563EB) 35%, transparent)',
                  }}
                >
                  <span className="material-symbols-rounded text-2xl font-bold">add</span>
                </button>
              </aside>
            </div>
          )}
        </StudioPageTransition>
      </div>
    </div>
  );
}
