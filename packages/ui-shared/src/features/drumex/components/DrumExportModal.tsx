import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '../../../shared/design-system/buttons';
import { ScrollScaffold } from '../../../shared/layout/StudioLayoutSystem';
import {
  Toggle as ToggleComponent,
  SegmentedControl,
} from '../../../shared/settings/SettingControls';
import {
  type DrumPattern,
  type DrumSong,
  type KitType,
  useIsWebDesktop,
  type DrumInstrument,
  type DrumMeasure,
  DRUM_INSTRUMENTS,
  INSTRUMENT_COLOR,
  BackDispatcher,
} from '@workspace/studio-core';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';
import DrumPaperPreview, {
  type DrumExportConfig,
  DEFAULT_DRUM_EXPORT_CONFIG,
} from './DrumPaperPreview';

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

async function exportDrumSongPDF(
  patterns: DrumPattern[],
  song: DrumSong | null,
  accent: { from: string; to: string },
  _cfg: DrumExportConfig = DEFAULT_DRUM_EXPORT_CONFIG,
  pdfName = '',
  mode: 'save' | 'share' = 'share'
): Promise<boolean> {
  const { jsPDF } = await import('jspdf');
  const [ar, ag, ab] = HEX_TO_RGB(accent.from);

  // â”€â”€ Page setup â€” A3 landscape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const PW = 420,
    PH = 297;
  const ML = 10,
    MR = 10,
    MT = 12,
    MB = 10;

  // â”€â”€ Layout constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const LABEL_COL = 30; // mm â€” left label column
  const GRID_W = PW - ML - MR - LABEL_COL; // 370mm usable grid
  const ROW_H = 8.5; // mm per instrument row (larger = more readable)
  const SYS_GAP = 6; // mm between systems
  const PAT_GAP = 12; // mm between patterns
  const HDR_H = 22; // mm for song header
  const NR = 1.35; // notehead radius
  const BARS_PER_ROW = 4; // always 4 bars per system row

  // â”€â”€ Dark editor palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const BG = [17, 17, 23] as const;
  const LBG = [22, 22, 32] as const;
  const CELL_A = [22, 22, 30] as const;
  const CELL_B = [28, 28, 38] as const;
  const C_ROW = [38, 38, 52] as const;
  const C_BEAT = [55, 55, 70] as const;
  const C_BAR = [75, 75, 95] as const;
  const C_NOTE = [230, 230, 240] as const;
  const C_TXT = [210, 210, 220] as const;
  const C_SUB = [110, 110, 128] as const;

  const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
  const stroke = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
  const textC = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);

  const drawXNote = (cx: number, cy: number, r: number) => {
    const d = r * 0.9;
    doc.setLineWidth(0.85);
    doc.line(cx - d, cy - d, cx + d, cy + d);
    doc.line(cx - d, cy + d, cx + d, cy - d);
  };

  const drawOvalNote = (cx: number, cy: number, filled: boolean) => {
    doc.setLineWidth(0.38);
    doc.ellipse(cx, cy, NR * 1.25, NR * 0.85, filled ? 'FD' : 'D');
  };

  const drawStemNote = (cx: number, cy: number, stemDown: boolean, rowTop: number) => {
    doc.setLineWidth(0.38);
    const sx = cx + (stemDown ? -NR * 0.9 : NR * 0.9);
    const sy1 = cy + (stemDown ? NR * 0.38 : -NR * 0.38);
    const sy2 = stemDown ? rowTop + ROW_H - 0.8 : rowTop + 0.8;
    doc.line(sx, sy1, sx, sy2);
  };

  // â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let page = 1;
  const drawHeader = (cont: boolean) => {
    fill(BG[0], BG[1], BG[2]);
    doc.rect(0, 0, PW, PH, 'F');
    const title = pdfName || song?.name || 'Drum Sheet';
    const artist = song?.artist ?? '';
    fill(ar, ag, ab);
    doc.rect(ML, MT + 2, 3.5, 14, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(20);
    textC(C_TXT[0], C_TXT[1], C_TXT[2]);
    doc.text(title.toUpperCase(), ML + 9, MT + 12);
    if (artist) {
      doc.setFont('helvetica', 'normal').setFontSize(10);
      textC(C_SUB[0], C_SUB[1], C_SUB[2]);
      doc.text(artist, ML + 9, MT + 18);
    }
    stroke(ar, ag, ab);
    doc.setLineWidth(0.4);
    doc.line(ML, MT + HDR_H - 1, PW - MR, MT + HDR_H - 1);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    textC(C_SUB[0], C_SUB[1], C_SUB[2]);
    doc.text(`${page}`, PW - MR, PH - 5, { align: 'right' });
    if (cont) doc.text('(cont.)', ML, PH - 5);
  };
  const newPage = () => {
    doc.addPage();
    page++;
    drawHeader(true);
  };
  drawHeader(false);
  let curY = MT + HDR_H;

  // â”€â”€ Render each pattern â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const PAT_HDR = 9;
    // Fixed bars-per-row so the grid always uses full page width
    const barsPerRow = Math.min(pat.measures.length, BARS_PER_ROW);
    const CELL = GRID_W / (barsPerRow * subs); // always fills GRID_W exactly

    // Pattern header row
    if (curY + PAT_HDR + SYS_H > PH - MB) {
      newPage();
      curY = MT + HDR_H;
    }
    fill(ar, ag, ab);
    doc.rect(ML, curY, PW - ML - MR, PAT_HDR - 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9);
    textC(255, 255, 255);
    doc.setTextColor(255, 255, 255);
    doc.text(pat.name, ML + LABEL_COL + 3, curY + 6.5);
    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    doc.text(
      `   â™© = ${pat.bpm}   ${timN}/${timD}   1/${subs}`,
      ML + LABEL_COL + 3 + doc.getTextWidth(pat.name),
      curY + 6.5
    );
    curY += PAT_HDR;

    // â”€â”€ Systems (rows of bars) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (let rowStart = 0; rowStart < pat.measures.length; rowStart += barsPerRow) {
      if (curY + SYS_H + 4 > PH - MB) {
        newPage();
        curY = MT + HDR_H;
      }

      const rowBars = pat.measures.slice(rowStart, rowStart + barsPerRow);
      const gridLeft = ML + LABEL_COL;
      const rowW = GRID_W; // always full page width

      // â”€â”€ Background cells â€” always fill full rowW including empty ghost bars â”€
      for (let ri = 0; ri < allInsts.length; ri++) {
        const rowTop = curY + ri * ROW_H;
        for (let bi = 0; bi < barsPerRow; bi++) {
          // â† barsPerRow, not rowBars.length
          for (let s = 0; s < subs; s++) {
            const beat = Math.floor(s / stepsPerBeat);
            const bg = beat % 2 === 0 ? CELL_A : CELL_B;
            fill(bg[0], bg[1], bg[2]);
            doc.rect(gridLeft + (bi * subs + s) * CELL, rowTop, CELL, ROW_H, 'F');
          }
        }
      }

      // â”€â”€ Label column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      fill(LBG[0], LBG[1], LBG[2]);
      doc.rect(ML, curY, LABEL_COL, SYS_H, 'F');
      for (let ri = 0; ri < allInsts.length; ri++) {
        const inst = allInsts[ri];
        const rowTop = curY + ri * ROW_H;
        const [cr, cg, cb] = HEX_TO_RGB(INSTRUMENT_COLOR[inst as DrumInstrument] ?? accent.from);
        fill(cr, cg, cb);
        doc.rect(ML + 2, rowTop + ROW_H * 0.22, 2.5, ROW_H * 0.56, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(6);
        textC(C_TXT[0], C_TXT[1], C_TXT[2]);
        doc.text(INST_LABEL[inst as DrumInstrument] ?? inst, ML + 6.5, rowTop + ROW_H * 0.6);
        if (ri > 0) {
          stroke(C_ROW[0], C_ROW[1], C_ROW[2]);
          doc.setLineWidth(0.22);
          doc.line(ML, rowTop, ML + LABEL_COL + rowW, rowTop);
        }
      }

      // â”€â”€ Grid lines: beat + bar (draw across full barsPerRow width) â”€â”€â”€â”€â”€â”€â”€â”€
      for (let bi = 0; bi < barsPerRow; bi++) {
        // â† barsPerRow
        for (let s = 1; s < subs; s++) {
          const lx = gridLeft + (bi * subs + s) * CELL;
          if (s % stepsPerBeat === 0) {
            stroke(C_BEAT[0], C_BEAT[1], C_BEAT[2]);
            doc.setLineWidth(0.32);
          } else {
            stroke(C_ROW[0], C_ROW[1], C_ROW[2]);
            doc.setLineWidth(0.14);
          }
          doc.line(lx, curY, lx, curY + SYS_H);
        }
      }
      for (let bi = 0; bi <= barsPerRow; bi++) {
        // â† barsPerRow
        const bx = gridLeft + bi * subs * CELL;
        stroke(C_BAR[0], C_BAR[1], C_BAR[2]);
        doc.setLineWidth(bi === 0 || bi === barsPerRow ? 0.6 : 0.45);
        doc.line(bx, curY, bx, curY + SYS_H);
        if (bi < rowBars.length) {
          // bar numbers only for actual bars
          doc.setFont('helvetica', 'normal').setFontSize(5.5);
          textC(C_SUB[0], C_SUB[1], C_SUB[2]);
          doc.text(`${rowStart + bi + 1}`, bx + 1.2, curY - 1.2);
        }
      }
      // Top/bottom system borders (full width)
      stroke(C_BAR[0], C_BAR[1], C_BAR[2]);
      doc.setLineWidth(0.5);
      doc.line(ML, curY, ML + LABEL_COL + rowW, curY);
      doc.line(ML, curY + SYS_H, ML + LABEL_COL + rowW, curY + SYS_H);

      // â”€â”€ Draw hits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      for (let ri = 0; ri < allInsts.length; ri++) {
        const inst = allInsts[ri];
        const rowTop = curY + ri * ROW_H;
        const cy = rowTop + ROW_H / 2;
        const isCym = !!IS_CYMBAL[inst as DrumInstrument];
        const stemDn = !!STEM_DOWN[inst as DrumInstrument];

        for (let bi = 0; bi < rowBars.length; bi++) {
          const meas = rowBars[bi];
          const hits = meas.hits[inst as DrumInstrument];
          if (!hits?.length) continue;
          for (const hit of hits) {
            const cx = gridLeft + (bi * subs + hit.step + 0.5) * CELL;
            stroke(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
            fill(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
            if (isCym) {
              drawXNote(cx, cy, NR);
              if (hit.variation === 'open' || inst === 'hihat-open') {
                doc.setLineWidth(0.28);
                doc.ellipse(cx, cy - NR * 2.1, NR * 0.85, NR * 0.6, 'D');
              }
              if (hit.variation === 'bell') {
                fill(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
                doc.ellipse(cx, cy, NR * 0.45, NR * 0.35, 'F');
              }
            } else {
              const isGhost = hit.variation === 'ghost';
              drawOvalNote(cx, cy, !isGhost);
              if (isGhost) {
                doc.setFontSize(6.5);
                textC(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
                doc.text('(', cx - NR * 2.0, cy + NR * 1.0);
                doc.text(')', cx + NR * 0.85, cy + NR * 1.0);
              }
              if (hit.variation === 'accent') {
                doc.setFont('helvetica', 'bold').setFontSize(6);
                textC(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
                doc.text('>', cx - NR * 0.4, stemDn ? cy + NR * 4.5 : cy - NR * 3.2);
              }
            }
            stroke(C_NOTE[0], C_NOTE[1], C_NOTE[2]);
            drawStemNote(cx, cy, stemDn, rowTop);
          }
        }
      }

      curY += SYS_H + SYS_GAP;
    }
    if (patIdx < patterns.length - 1) curY += PAT_GAP - SYS_GAP;
  }

  const fileName = `${pdfName || song?.name || 'drumex'}.pdf`;
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const b64 = doc.output('datauristring').split(',')[1];
      if (mode === 'save') {
        try {
          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: b64,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          return true;
        } catch {
          await Filesystem.writeFile({
            path: fileName,
            data: b64,
            directory: Directory.External,
            recursive: true,
          });
          return true;
        }
      } else {
        const written = await Filesystem.writeFile({
          path: fileName,
          data: b64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({ title: fileName, url: written.uri });
        return true;
      }
    } catch {
      return false;
    }
  }
  doc.save(fileName);
  return true;
}

export function DrumExportModal({
  patterns,
  song,
  accent,
  onClose,
}: {
  patterns: DrumPattern[];
  song: DrumSong | null;
  accent: { from: string; to: string };
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<DrumExportConfig>({ ...DEFAULT_DRUM_EXPORT_CONFIG });
  const [pdfName, setPdfName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saveRes, setSaveRes] = useState<'ok' | 'fail' | null>(null);
  const [closing, setClosing] = useState(false);
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
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

  const update = <K extends keyof DrumExportConfig>(k: K, v: DrumExportConfig[K]) =>
    setCfg((prev) => ({ ...prev, [k]: v }));

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  useEffect(() => {
    const id = 'drumex:export-modal';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      handleClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [onClose]);

  const handlePDF = async (mode: 'save' | 'share') => {
    if (mode === 'save') setSaving(true);
    else setSharing(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const ok = await exportDrumSongPDF(patterns, song, accent, cfg, pdfName, mode);
      if (mode === 'save') {
        setSaveRes(ok ? 'ok' : 'fail');
        setTimeout(() => setSaveRes(null), 3000);
      } else {
        handleClose();
      }
    } finally {
      if (mode === 'save') setSaving(false);
      else setSharing(false);
    }
  };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <ToggleComponent value={on} onChange={onChange} accentFrom={accent.from} accentTo={accent.to} />
  );

  const Segment = <T extends string>({
    options,
    value,
    onChange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) => (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      accentFrom={accent.from}
      accentTo={accent.to}
      layoutId="drum-editor-segment"
    />
  );

  const Row = ({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'var(--app-surface-high)',
        borderRadius: 14,
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--c-text-primary)',
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: 'var(--c-text-secondary)',
              marginTop: 1,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );

  const isWebDesktop = useIsWebDesktop();

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'var(--c-background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={
          isWebDesktop
            ? {
                position: 'relative',
                width: '560px',
                maxWidth: '90vw',
                maxHeight: '85vh',
                background: 'var(--c-surface-mid)',
                border: '1px solid var(--c-border)',
                borderRadius: '1.25rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                margin: 'auto',
              }
            : { display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }
        }
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div
          style={{
            paddingTop: isWebDesktop ? '0' : 'env(safe-area-inset-top)',
            background: isWebDesktop ? 'transparent' : 'var(--c-surface-mid)',
            flexShrink: 0,
            borderBottom: '1px solid var(--c-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              height: 56,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={handleClose}
                className="btn-smooth"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: accent.from, fontSize: 22 }}
                >
                  arrow_back
                </span>
              </button>
              <p
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#e7e5e4',
                  lineHeight: 1,
                }}
              >
                Export Preview
              </p>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 700,
                color: '#484848',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(72,72,72,0.3)',
              }}
            >
              PDF
            </span>
          </div>
        </div>

        {/* â”€â”€ Scrollable body â”€â”€ */}
        <ScrollScaffold bottomSpacing={false} style={{ flex: 1, padding: 0 }}>
          {/* Paper stage */}
          <div style={{ padding: '32px 24px 28px', background: '#0a0a0a', position: 'relative' }}>
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
              <DrumPaperPreview patterns={patterns} song={song} cfg={cfg} accent={accent} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                marginTop: 14,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#3a3a3a',
                }}
              >
                {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
              </span>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: '#3a3a3a',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#3a3a3a',
                }}
              >
                A3 Landscape
              </span>
            </div>
          </div>

          {/* File name + note */}
          <div style={{ padding: '28px 20px 8px' }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#484848',
                marginBottom: 10,
              }}
            >
              File Name
            </p>
            <input
              type="text"
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder={song?.name ?? 'Beat'}
              maxLength={80}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                background: 'var(--c-surface-low)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--font-headline)',
                fontWeight: 600,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 24,
                transition: 'border-color 200ms ease',
              }}
            />
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: `${accent.from}0d`,
                border: `1px solid ${accent.from}18`,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color: accent.from,
                  fontSize: 15,
                  flexShrink: 0,
                  marginTop: 1,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                info
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: '#6e6e80',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                The PDF contains the step-sequencer grid for all patterns. Hidden rows (pattern
                mixer) are excluded from the export.
              </p>
            </div>
          </div>
        </ScrollScaffold>

        {/* â”€â”€ Floating bottom bar â”€â”€ */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 400,
            transform: barVisible ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
            background: 'rgba(15,15,15,0.94)',
            backdropFilter: 'var(--surface-float-blur)',
            WebkitBackdropFilter: 'var(--surface-float-blur)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Options row */}
          <div
            style={{
              padding: '14px 16px 10px',
              display: 'flex',
              gap: 7,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Dark theme chip */}
            <button
              onClick={() => update('theme', cfg.theme === 'dark' ? 'light' : 'dark')}
              className="btn-smooth"
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
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
                  fontSize: 13,
                  fontVariationSettings: cfg.theme === 'dark' ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                dark_mode
              </span>
              Dark
            </button>

            {/* Layout style */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 2,
                gap: 1,
              }}
            >
              {[
                ['compact', 'Cmp'] as const,
                ['normal', 'Nor'] as const,
                ['elegant', 'Ele'] as const,
              ].map(([v, lbl]) => {
                const active = cfg.style === v;
                return (
                  <button
                    key={v}
                    onClick={() => update('style', v as DrumExportConfig['style'])}
                    className="btn-smooth"
                    style={{
                      padding: '5px 11px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: 10,
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
          </div>

          {/* Export button */}
          <div
            style={{
              padding: '6px 16px',
              paddingBottom: 'max(20px,env(safe-area-inset-bottom))',
              display: 'flex',
              gap: 10,
              position: 'relative',
            }}
          >
            {saveRes && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  padding: 6,
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 12,
                  color: saveRes === 'ok' ? '#34d399' : '#f87171',
                }}
              >
                {saveRes === 'ok' ? 'Saved to Downloads!' : 'Could not save â€” try Share instead'}
              </div>
            )}
            {Capacitor.isNativePlatform() ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => handlePDF('save')}
                  disabled={saving || sharing}
                  loading={saving}
                  icon="save"
                  style={{ flex: 1 }}
                >
                  Save
                </Button>
                <Button
                  onClick={() => handlePDF('share')}
                  disabled={saving || sharing}
                  loading={sharing}
                  icon="share"
                  style={{ flex: 1 }}
                >
                  Share
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => handlePDF('share')}
                disabled={sharing}
                loading={sharing}
                icon="download"
                style={{ flex: 1 }}
              >
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

// â”€â”€ DrumImportModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default DrumExportModal;
