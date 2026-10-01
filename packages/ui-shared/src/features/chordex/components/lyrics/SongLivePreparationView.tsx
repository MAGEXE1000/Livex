import React, { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GripVertical } from 'lucide-react';
import {
  type SongPreset,
  type SongLyricsDocument,
  type SongLyricSection,
  type SongLyricLine,
  type VocalRoleAnnotation,
  type StandardVocalRole,
  VOCAL_ROLE_PRESETS,
  LYRIC_SECTION_TYPES,
  generateLyricId,
  getCombinedVocalRoles,
  splitLineIntoSegments,
  shiftChordOffsets,
} from '@workspace/livex-core';
import { toast } from 'sonner';
import { MorphingActionSurface } from '../../../../shared/design-system/MorphingActionSurface';

export interface SongLivePreparationViewProps {
  preset: SongPreset;
  accent: { from: string; to: string; mid?: string };
  transposeOffset: number;
  preferFlats: boolean;
  onEditLyrics: () => void;
  onLaunchLive: () => void;
  onUpdateLyrics: (lyrics: SongLyricsDocument) => void;
  onEditDetails?: () => void;
}

export const SongLivePreparationView: React.FC<SongLivePreparationViewProps> = ({
  preset,
  accent,
  transposeOffset,
  preferFlats,
  onEditLyrics,
  onLaunchLive,
  onUpdateLyrics,
  onEditDetails,
}) => {
  const lyricsDoc = preset.lyrics;
  const sections = lyricsDoc?.sections ?? [];

  // Presentation & teleprompter display state
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords_lyrics'>('lyrics');
  const [fontSize, setFontSize] = useState<number>(() => {
    const f = lyricsDoc?.formatting?.fontSize;
    if (f === 'small') return 16;
    if (f === 'large') return 24;
    return 19;
  });
  const [lineSpacing, setLineSpacing] = useState<number>(() => {
    const s = lyricsDoc?.formatting?.lineSpacing;
    if (s === 'compact') return 1.4;
    if (s === 'relaxed') return 1.9;
    return 1.6;
  });
  const [isBold, setIsBold] = useState<boolean>(() => Boolean(lyricsDoc?.formatting?.bold));
  const [textColor, setTextColor] = useState<string>(() => {
    const c = lyricsDoc?.formatting?.defaultColor;
    if (!c || c === '#FFFFFF' || c === '#111827' || c === 'default') {
      return 'default';
    }
    return c;
  });

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSectionMorph, setShowSectionMorph] = useState(false);
  const [showTextMorph, setShowTextMorph] = useState(false);
  const [selectedSectionForRole, setSelectedSectionForRole] = useState<string | null>(null);

  // Dock geometry anchor for contextual morphing popup
  const dockAddButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pencilRect, setPencilRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);

  // Active cursor/line tracking for cursor-anchored insertion
  const [activePosition, setActivePosition] = useState<{
    sectionId: string;
    lineIndex: number;
    lineId?: string;
  } | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusLineIdRef = useRef<string | null>(null);

  // Drag and drop state for interludes
  const [draggedLine, setDraggedLine] = useState<{ sectionId: string; lineId: string } | null>(null);

  const isEffectiveLight =
    typeof document !== 'undefined' && document.documentElement.classList.contains('light');

  // Available vocal roles (presets + custom saved)
  const combinedVocalRoles = useMemo(() => getCombinedVocalRoles(), []);
  const availableVocalRoles = useMemo(
    () => [...combinedVocalRoles.defaults, ...combinedVocalRoles.customs],
    [combinedVocalRoles]
  );

  // Update document formatting settings
  const handleUpdateFormatting = useCallback(
    (opts: {
      fontSize?: number;
      lineSpacing?: number;
      bold?: boolean;
      defaultColor?: string;
    }) => {
      const nextFontSize = opts.fontSize ?? fontSize;
      const nextLineSpacing = opts.lineSpacing ?? lineSpacing;
      const nextBold = opts.bold !== undefined ? opts.bold : isBold;
      const nextColor = opts.defaultColor ?? textColor;

      if (opts.fontSize !== undefined) setFontSize(opts.fontSize);
      if (opts.lineSpacing !== undefined) setLineSpacing(opts.lineSpacing);
      if (opts.bold !== undefined) setIsBold(opts.bold);
      if (opts.defaultColor !== undefined) setTextColor(opts.defaultColor);

      if (!lyricsDoc) return;
      const fontSizeName: 'small' | 'medium' | 'large' =
        nextFontSize <= 16 ? 'small' : nextFontSize >= 24 ? 'large' : 'medium';
      const lineSpacingName: 'compact' | 'normal' | 'relaxed' =
        nextLineSpacing <= 1.45 ? 'compact' : nextLineSpacing >= 1.8 ? 'relaxed' : 'normal';

      onUpdateLyrics({
        ...lyricsDoc,
        formatting: {
          ...lyricsDoc.formatting,
          fontSize: fontSizeName,
          lineSpacing: lineSpacingName,
          bold: nextBold,
          defaultColor: nextColor,
        },
      });
    },
    [fontSize, lineSpacing, isBold, textColor, lyricsDoc, onUpdateLyrics]
  );

  // Assign vocal role to a section
  const handleSetSectionVocalRole = useCallback(
    (sectionId: string, role?: VocalRoleAnnotation) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          vocalRole: role,
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
      setSelectedSectionForRole(null);
      toast.success(role ? `Vocal role set to ${role.label}` : 'Vocal role cleared');
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  // Append a new empty section with a specified type/name
  const handleAddSection = useCallback(
    (name: string, type: any = 'verse') => {
      if (!lyricsDoc) return;
      const newSection: SongLyricSection = {
        id: generateLyricId('sec'),
        name,
        type,
        lines: [
          {
            id: generateLyricId('line'),
            text: '',
          },
        ],
      };
      onUpdateLyrics({
        ...lyricsDoc,
        sections: [...sections, newSection],
      });
      setShowSectionMorph(false);
      toast.success(`Added [${name}] section`);
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  // Insert explicit timed silence / interlude (cursor-anchored)
  const handleAddInterludeLine = useCallback(
    (sectionId?: string, afterLineIdx?: number) => {
      if (!lyricsDoc) return;
      const targetSectionId =
        sectionId ||
        activePosition?.sectionId ||
        (sections.length > 0 ? sections[sections.length - 1].id : null);

      const newLine: SongLyricLine = {
        id: generateLyricId('line'),
        type: 'interlude',
        text: '(Solo)',
        explicitDurationMs: 15000,
      };

      if (!targetSectionId) {
        const newSec: SongLyricSection = {
          id: generateLyricId('sec'),
          name: 'Interlude',
          type: 'interlude',
          lines: [newLine],
        };
        onUpdateLyrics({
          ...lyricsDoc,
          sections: [newSec],
        });
        toast.success('Added 15s Timed Interlude');
        return;
      }

      const nextSections = sections.map((sec) => {
        if (sec.id !== targetSectionId) return sec;
        const newLines = [...sec.lines];
        const insertAt =
          afterLineIdx !== undefined
            ? afterLineIdx + 1
            : activePosition && activePosition.sectionId === targetSectionId
            ? activePosition.lineIndex + 1
            : newLines.length;
        newLines.splice(insertAt, 0, newLine);
        return {
          ...sec,
          lines: newLines,
        };
      });

      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
      toast.success('Added 15s Timed Interlude');
    },
    [lyricsDoc, sections, activePosition, onUpdateLyrics]
  );

  const handleUpdateLineText = useCallback(
    (sectionId: string, lineId: string, text: string) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== lineId) return l;
            const shiftedChords = shiftChordOffsets(l.text, text, l.chords);
            return {
              ...l,
              text,
              chords: shiftedChords,
            };
          }),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleAddLine = useCallback(
    (sectionId: string, afterLineIdx?: number) => {
      if (!lyricsDoc) return;
      const newLine: SongLyricLine = {
        id: generateLyricId('line'),
        type: 'lyric',
        text: '',
      };
      pendingFocusLineIdRef.current = newLine.id;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const newLines = [...sec.lines];
        if (afterLineIdx !== undefined && afterLineIdx >= 0) {
          newLines.splice(afterLineIdx + 1, 0, newLine);
        } else {
          newLines.push(newLine);
        }
        return {
          ...sec,
          lines: newLines,
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleMoveLine = useCallback(
    (fromSectionId: string, fromLineId: string, toSectionId: string, toLineIdx: number) => {
      if (!lyricsDoc) return;
      let lineToMove: SongLyricLine | null = null;

      // 1. Remove from source section
      const sectionsWithoutLine = sections.map((sec) => {
        if (sec.id === fromSectionId) {
          const found = sec.lines.find((l) => l.id === fromLineId);
          if (found) lineToMove = found;
          return {
            ...sec,
            lines: sec.lines.filter((l) => l.id !== fromLineId),
          };
        }
        return sec;
      });

      if (!lineToMove) return;

      // 2. Insert into destination section at toLineIdx
      const finalSections = sectionsWithoutLine.map((sec) => {
        if (sec.id === toSectionId) {
          const newLines = [...sec.lines];
          const insertAt = Math.max(0, Math.min(newLines.length, toLineIdx));
          newLines.splice(insertAt, 0, lineToMove!);
          return {
            ...sec,
            lines: newLines,
          };
        }
        return sec;
      });

      onUpdateLyrics({
        ...lyricsDoc,
        sections: finalSections,
      });
      toast.success('Interlude repositioned');
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleMoveLineRelative = useCallback(
    (sectionId: string, currentLineIdx: number, delta: number) => {
      if (!lyricsDoc) return;
      const secIdx = sections.findIndex((s) => s.id === sectionId);
      if (secIdx === -1) return;
      const targetSec = sections[secIdx];
      const line = targetSec.lines[currentLineIdx];
      if (!line) return;

      const targetLineIdx = currentLineIdx + delta;
      if (targetLineIdx >= 0 && targetLineIdx < targetSec.lines.length) {
        // Same section move
        handleMoveLine(sectionId, line.id, sectionId, targetLineIdx);
      } else if (delta < 0 && secIdx > 0) {
        // Move to previous section end
        const prevSec = sections[secIdx - 1];
        handleMoveLine(sectionId, line.id, prevSec.id, prevSec.lines.length);
      } else if (delta > 0 && secIdx < sections.length - 1) {
        // Move to next section beginning
        const nextSec = sections[secIdx + 1];
        handleMoveLine(sectionId, line.id, nextSec.id, 0);
      }
    },
    [lyricsDoc, sections, handleMoveLine]
  );

  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string, lineId: string) => {
    setDraggedLine({ sectionId, lineId });
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ fromSectionId: sectionId, fromLineId: lineId }));
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLine(null);
  }, []);

  const handleDropOnLine = useCallback(
    (e: React.DragEvent, targetSectionId: string, targetLineIdx: number) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('text/plain');
        const data = JSON.parse(raw);
        if (data.fromSectionId && data.fromLineId) {
          handleMoveLine(data.fromSectionId, data.fromLineId, targetSectionId, targetLineIdx);
          setDraggedLine(null);
          return;
        }
      } catch (_) {}
      if (draggedLine) {
        handleMoveLine(draggedLine.sectionId, draggedLine.lineId, targetSectionId, targetLineIdx);
      }
      setDraggedLine(null);
    },
    [draggedLine, handleMoveLine]
  );


  const handleDockAddClick = useCallback(() => {
    if (dockAddButtonRef.current) {
      const r = dockAddButtonRef.current.getBoundingClientRect();
      setPencilRect({
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      });
    }
    setShowAddMenu(true);
  }, []);

  const handleUpdateInterludeDuration = useCallback(
    (sectionId: string, lineId: string, durationSec: number) => {
      if (!lyricsDoc) return;
      const clampedSec = Math.max(1, Math.min(600, durationSec));
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== lineId) return l;
            return {
              ...l,
              type: 'interlude' as const,
              explicitDurationMs: clampedSec * 1000,
            };
          }),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleUpdateInterludeLabel = useCallback(
    (sectionId: string, lineId: string, text: string) => {
      if (!lyricsDoc) return;
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== lineId) return l;
            return {
              ...l,
              text,
            };
          }),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const handleDeleteLine = useCallback(
    (sectionId: string, lineId: string, prevLineIdToFocus?: string) => {
      if (!lyricsDoc) return;
      if (prevLineIdToFocus) {
        pendingFocusLineIdRef.current = prevLineIdToFocus;
      }
      const nextSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.filter((l) => l.id !== lineId),
        };
      });
      onUpdateLyrics({
        ...lyricsDoc,
        sections: nextSections,
      });
    },
    [lyricsDoc, sections, onUpdateLyrics]
  );

  const isEmpty =
    sections.length === 0 ||
    sections.every(
      (s) => s.lines.length === 0 || s.lines.every((l) => !l.text.trim() && (!l.chords || l.chords.length === 0))
    );

  const resolvedColor =
    textColor && textColor !== 'default' ? textColor : 'var(--c-text-primary, #111827)';

  return (
    <div
      className="w-full flex flex-col relative"
      data-purpose="song-live-preparation-view"
    >
      {/* ── Document Content Area ── */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
            style={{
              backgroundColor: 'var(--surface-card-bg, #ffffff)',
              borderColor: 'var(--c-border, #E3E6EB)',
              color: accent.from,
            }}
          >
            <span className="material-symbols-rounded text-3xl">edit_note</span>
          </div>
          <h3
            className="text-base font-bold mb-1"
            style={{
              fontFamily: 'var(--font-headline)',
              color: 'var(--c-text-primary, #111827)',
            }}
          >
            No Lyrics Composed
          </h3>
          <p
            className="text-xs max-w-xs mb-6 leading-relaxed"
            style={{ color: 'var(--c-text-secondary, #6B7280)' }}
          >
            Write your lyrics in the distraction-free continuous composer, then return here to configure your live performance.
          </p>
          <button
            type="button"
            onClick={onEditLyrics}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              boxShadow: `0 3px 12px ${accent.to}44`,
            }}
          >
            <span className="material-symbols-rounded text-base">draw</span>
            <span>Open Lyric Composer</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {sections.map((section, sIdx) => {
            const hasName = Boolean(section.name && section.name.trim().length > 0);
            const vocalRole = section.vocalRole;

            return (
              <div key={section.id || `sec-${sIdx}`} className="flex flex-col">
                {/* Section Badge with Vocal Role (Only if named or has vocal role) */}
                {(hasName || vocalRole) && (
                  <div className="flex items-center gap-2 mb-2.5 select-none">
                    {hasName && (
                      <span
                        className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border shadow-2xs"
                        style={{
                          backgroundColor: `${accent.from}14`,
                          borderColor: `${accent.from}38`,
                          color: accent.from,
                          fontFamily: 'var(--font-headline, system-ui, sans-serif)',
                        }}
                      >
                        {section.name}
                      </span>
                    )}

                    {/* Vocal Role Chip (tap to change) */}
                    <button
                      type="button"
                      onClick={() => setSelectedSectionForRole(section.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs active:scale-95 transition-all cursor-pointer"
                      style={{
                        backgroundColor: vocalRole ? `${vocalRole.color}22` : 'var(--surface-container-low, rgba(0, 0, 0, 0.04))',
                        borderColor: vocalRole ? `${vocalRole.color}55` : 'var(--c-border, #E3E6EB)',
                        color: vocalRole ? vocalRole.color : 'var(--c-text-muted, #8A92A6)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: vocalRole?.color || 'currentColor' }}
                      />
                      <span>{vocalRole?.label || '+ Role'}</span>
                    </button>
                  </div>
                )}

                {/* Section Lines */}
                <div
                  className="flex flex-col select-text"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineSpacing,
                    fontFamily: 'var(--font-body, system-ui, sans-serif)',
                  }}
                >
                  {section.lines.map((line, lIdx) => {
                    if (line.type === 'interlude') {
                      const durSec = Math.round((line.explicitDurationMs || 15000) / 1000);
                      return (
                        <div
                          key={line.id || `interlude-${lIdx}`}
                          data-testid={`interlude-line-${lIdx}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => handleDropOnLine(e, section.id, lIdx)}
                          className="w-full my-2 p-3.5 rounded-2xl border flex flex-col gap-2 transition-all"
                          style={{
                            backgroundColor: 'var(--surface-card-bg, #ffffff)',
                            borderColor: `${accent.from}33`,
                            boxShadow: 'var(--shadow-soft-card, none)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, section.id, line.id)}
                                onDragEnd={handleDragEnd}
                                data-testid={`interlude-drag-handle-${lIdx}`}
                                className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white rounded transition-colors flex items-center justify-center flex-shrink-0"
                                title="Drag to reposition interlude"
                                aria-label="Drag to reposition interlude"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                  backgroundColor: `${accent.from}18`,
                                  color: accent.from,
                                }}
                              >
                                <span className="material-symbols-rounded text-lg">hourglass_bottom</span>
                              </div>
                              <input
                                type="text"
                                value={line.text || '(Solo)'}
                                onFocus={() => setActivePosition({ sectionId: section.id, lineIndex: lIdx, lineId: line.id })}
                                onChange={(e) => {
                                  setActivePosition({ sectionId: section.id, lineIndex: lIdx, lineId: line.id });
                                  handleUpdateInterludeLabel(section.id, line.id, e.target.value);
                                }}
                                className="px-2 py-1 rounded-lg text-sm font-bold border outline-none"
                                style={{
                                  backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                  borderColor: 'var(--c-border, #E3E6EB)',
                                  color: 'var(--c-text-primary, #111827)',
                                  fontFamily: 'var(--font-headline)',
                                }}
                                placeholder="(Solo)"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono text-xs font-black px-2.5 py-1 rounded-full border"
                                style={{
                                  backgroundColor: `${accent.from}18`,
                                  borderColor: `${accent.from}44`,
                                  color: accent.from,
                                }}
                              >
                                {durSec}s
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineRelative(section.id, lIdx, -1)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                                  title="Move interlude up"
                                  aria-label="Move interlude up"
                                >
                                  <span className="material-symbols-rounded text-base">arrow_upward</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineRelative(section.id, lIdx, 1)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                                  title="Move interlude down"
                                  aria-label="Move interlude down"
                                >
                                  <span className="material-symbols-rounded text-base">arrow_downward</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLine(section.id, line.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer"
                                  title="Delete interlude"
                                  aria-label="Delete interlude"
                                >
                                  <span className="material-symbols-rounded text-base">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--c-border, #E3E6EB)' }}>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateInterludeDuration(section.id, line.id, Math.max(1, durSec - 1))}
                                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border active:scale-90 transition-all cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                  borderColor: 'var(--c-border, #E3E6EB)',
                                  color: 'var(--c-text-primary, #111827)',
                                }}
                                title="Decrease 1s"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs font-bold px-1">{durSec}s</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateInterludeDuration(section.id, line.id, Math.min(600, durSec + 1))}
                                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border active:scale-90 transition-all cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                  borderColor: 'var(--c-border, #E3E6EB)',
                                  color: 'var(--c-text-primary, #111827)',
                                }}
                                title="Increase 1s"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                              {[5, 10, 15, 20, 30, 45, 60].map((presetSec) => (
                                <button
                                  key={presetSec}
                                  type="button"
                                  onClick={() => handleUpdateInterludeDuration(section.id, line.id, presetSec)}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                                  style={{
                                    backgroundColor: durSec === presetSec ? accent.from : 'var(--surface-container-low, rgba(0,0,0,0.04))',
                                    color: durSec === presetSec ? '#ffffff' : 'var(--c-text-secondary, #6B7280)',
                                    border: '1px solid var(--c-border, #E3E6EB)',
                                  }}
                                >
                                  {presetSec}s
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const showChords = displayMode === 'chords_lyrics' && line.chords && line.chords.length > 0;
                    const lineTextColor = line.format?.color || resolvedColor;

                    return (
                      <div
                        key={line.id || `line-${lIdx}`}
                        className="flex flex-col py-1 w-full"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleDropOnLine(e, section.id, lIdx)}
                      >
                        {showChords && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-1 select-none">
                            {line.chords!.map((c) => (
                              <span
                                key={c.id}
                                className="font-mono text-xs font-black tracking-tight px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--c-accent-from, #2563EB) 12%, transparent)',
                                  color: 'var(--c-accent-from, #2563EB)',
                                }}
                              >
                                {c.chord}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 w-full">
                          <input
                            ref={(el) => {
                              inputRefs.current[line.id] = el;
                              if (el && pendingFocusLineIdRef.current === line.id) {
                                pendingFocusLineIdRef.current = null;
                                el.focus();
                                const len = el.value.length;
                                el.setSelectionRange(len, len);
                              }
                            }}
                            type="text"
                            data-testid={`lyrics-line-input-${lIdx}`}
                            value={line.text}
                            onFocus={() => setActivePosition({ sectionId: section.id, lineIndex: lIdx, lineId: line.id })}
                            onChange={(e) => {
                              setActivePosition({ sectionId: section.id, lineIndex: lIdx, lineId: line.id });
                              handleUpdateLineText(section.id, line.id, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddLine(section.id, lIdx);
                              } else if (e.key === 'Backspace' && line.text === '' && (section.lines.length > 1 || sections.length > 1)) {
                                e.preventDefault();
                                const prevLine = lIdx > 0 ? section.lines[lIdx - 1] : undefined;
                                handleDeleteLine(section.id, line.id, prevLine?.id);
                              }
                            }}
                            placeholder="Type lyric line..."
                            className="flex-1 bg-transparent border-0 outline-none text-base leading-relaxed tracking-wide pb-1 transition-colors"
                            style={{
                              border: 'none',
                              outline: 'none',
                              boxShadow: 'none',
                              color: lineTextColor,
                              fontWeight: (line.format?.bold ?? isBold) ? 700 : 400,
                              fontSize: `${fontSize}px`,
                              fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── UNIFIED BLACK FLOATING ADD (+) BUTTON (MATCHING CHORDS) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50 pointer-events-auto"
            style={{
              bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 20px)',
              right: '20px',
            }}
            data-purpose="lyrics-action-menu"
          >
            <MorphingActionSurface
              placement="anchor"
              compact
              maxWidth={260}
              title="Add to Lyrics"
              accentColor={accent.from}
              customTrigger={({ triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  aria-label="Add Action"
                  data-testid="lyrics-add-actions-btn"
                  className="rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all select-none"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'var(--surface-topbar-bg, rgba(20, 20, 24, 0.9))',
                    border: 'var(--surface-topbar-border, 1px solid rgba(255, 255, 255, 0.15))',
                    backdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
                    WebkitBackdropFilter: 'var(--surface-topbar-backdrop, blur(20px))',
                    boxShadow: 'var(--surface-topbar-shadow, 0 8px 32px rgba(0, 0, 0, 0.45))',
                    color: 'var(--c-text-primary, #ffffff)',
                  }}
                  type="button"
                >
                  <span className="material-symbols-rounded text-2xl font-bold">add</span>
                </motion.button>
              )}
              rows={[
                {
                  id: 'action-section',
                  label: 'Add Section',
                  icon: 'layers',
                  sublabel: 'Verse, Chorus, Bridge...',
                  onPress: () => {
                    setShowSectionMorph(true);
                  },
                },
                {
                  id: 'action-interlude',
                  label: 'Add Timed Interlude',
                  icon: 'timer',
                  sublabel: 'Timed silence / solo (e.g. 15s)',
                  onPress: () => {
                    handleAddInterludeLine(activePosition?.sectionId, activePosition?.lineIndex);
                  },
                },
                {
                  id: 'action-styling',
                  label: 'Text Styling',
                  icon: 'palette',
                  sublabel: 'Font size, spacing, colors',
                  onPress: () => {
                    setShowTextMorph(true);
                  },
                },
              ]}
            />
          </div>,
          document.body
        )}

      {/* ── Morphing Section Picker (With proper section icons) ── */}
      <MorphingActionSurface
        isOpen={showSectionMorph}
        onOpenChange={setShowSectionMorph}
        placement="center"
        compact
        maxWidth={260}
        title="Add Section"
        accentColor={accent.from}
        rows={[
          { id: 'verse', label: 'Verse', icon: 'queue_music', onPress: () => handleAddSection('Verse', 'verse') },
          { id: 'chorus', label: 'Chorus', icon: 'music_note', onPress: () => handleAddSection('Chorus', 'chorus') },
          { id: 'bridge', label: 'Bridge', icon: 'linear_scale', onPress: () => handleAddSection('Bridge', 'bridge') },
          { id: 'pre-chorus', label: 'Pre-Chorus', icon: 'graphic_eq', onPress: () => handleAddSection('Pre-Chorus', 'pre-chorus') },
          { id: 'intro', label: 'Intro', icon: 'play_arrow', onPress: () => handleAddSection('Intro', 'intro') },
          { id: 'outro', label: 'Outro', icon: 'stop', onPress: () => handleAddSection('Outro', 'outro') },
          { id: 'solo', label: 'Solo', icon: 'timer', onPress: () => handleAddSection('Solo', 'solo') },
          { id: 'interlude', label: 'Interlude', icon: 'hourglass_bottom', onPress: () => handleAddSection('Interlude', 'interlude') },
          {
            id: 'custom',
            label: 'Custom...',
            icon: 'edit',
            onPress: () => {
              const name = window.prompt('Section name:');
              if (name && name.trim()) {
                handleAddSection(name.trim(), 'custom');
              }
            },
          },
        ]}
      />

      {/* ── Morphing Text Formatting Surface ── */}
      <MorphingActionSurface
        isOpen={showTextMorph}
        onOpenChange={setShowTextMorph}
        placement="center"
        maxWidth={340}
        title="Text Presentation"
        subtitle="Format lyrics display & teleprompter"
        accentColor={accent.from}
      >
        {({ close }) => (
          <div className="flex flex-col gap-4 py-1" data-purpose="lyrics-text-formatting-controls">
            {/* Font Size & Bold Stepper */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                Size & Weight
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center border rounded-xl overflow-hidden shadow-2xs"
                  style={{
                    backgroundColor: 'var(--surface-card-bg, #ffffff)',
                    borderColor: 'var(--c-border, #E3E6EB)',
                  }}
                >
                  <button
                    type="button"
                    data-testid="text-size-decrease"
                    onClick={() => handleUpdateFormatting({ fontSize: Math.max(14, fontSize - 2) })}
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span
                    className="text-xs font-extrabold w-10 text-center select-none"
                    style={{ color: accent.from }}
                  >
                    {fontSize}px
                  </span>
                  <button
                    type="button"
                    data-testid="text-size-increase"
                    onClick={() => handleUpdateFormatting({ fontSize: Math.min(32, fontSize + 2) })}
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer"
                    style={{ color: 'var(--c-text-primary, #111827)' }}
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                {/* Bold Toggle Button */}
                <button
                  type="button"
                  data-testid="text-bold-toggle"
                  onClick={() => handleUpdateFormatting({ bold: !isBold })}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: isBold ? `${accent.from}18` : 'var(--surface-card-bg, #ffffff)',
                    borderColor: isBold ? accent.from : 'var(--c-border, #E3E6EB)',
                    color: isBold ? accent.from : 'var(--c-text-secondary, #6B7280)',
                  }}
                  title="Toggle bold lyrics"
                >
                  B
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                Line Spacing
              </span>
              <div
                className="flex items-center p-0.5 rounded-full border shadow-2xs"
                style={{
                  backgroundColor: 'var(--surface-container-low, rgba(0, 0, 0, 0.04))',
                  borderColor: 'var(--c-border, #E3E6EB)',
                }}
              >
                {[
                  { label: 'Compact', val: 1.4 },
                  { label: 'Normal', val: 1.6 },
                  { label: 'Relaxed', val: 1.9 },
                ].map((sp) => {
                  const isActive = Math.abs(lineSpacing - sp.val) < 0.1;
                  return (
                    <button
                      key={sp.label}
                      type="button"
                      data-testid={`spacing-${sp.label.toLowerCase()}`}
                      onClick={() => handleUpdateFormatting({ lineSpacing: sp.val })}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer"
                      style={{
                        backgroundColor: isActive ? accent.from : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--c-text-muted, #8A92A6)',
                      }}
                    >
                      {sp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette */}
            <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: 'var(--c-border, #E3E6EB)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary, #6B7280)' }}>
                  Text Color
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                  {textColor === 'default' ? 'Theme Default' : textColor}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 py-1">
                {[
                  { name: 'Default', hex: 'default' },
                  { name: 'Gold', hex: '#F59E0B' },
                  { name: 'Sky', hex: '#0284C7' },
                  { name: 'Emerald', hex: '#059669' },
                  { name: 'Rose', hex: '#E11D48' },
                  { name: 'Violet', hex: '#7C3AED' },
                ].map((col) => {
                  const isCurrent = textColor === col.hex;
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      data-testid={`color-${col.name.toLowerCase()}`}
                      onClick={() => handleUpdateFormatting({ defaultColor: col.hex })}
                      className="w-7 h-7 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: col.hex === 'default' ? 'var(--c-text-primary, #111827)' : col.hex,
                        boxShadow: isCurrent
                          ? `0 0 0 2px var(--surface-card-bg, #ffffff), 0 0 0 4px ${col.hex === 'default' ? 'var(--c-text-primary, #111827)' : col.hex}`
                          : 'none',
                        border: '1px solid rgba(0,0,0,0.12)',
                      }}
                      title={col.name}
                    >
                      {isCurrent && (
                        <span
                          className="material-symbols-rounded text-sm"
                          style={{ color: col.hex === 'default' ? 'var(--surface-card-bg, #ffffff)' : '#FFFFFF' }}
                        >
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </MorphingActionSurface>

      {/* ── Vocal Role Picker Dialog ── */}
      <AnimatePresence>
        {selectedSectionForRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSectionForRole(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm p-5 rounded-2xl border shadow-2xl flex flex-col gap-3 z-10"
              style={{
                backgroundColor: 'var(--surface-dialog-bg, #ffffff)',
                borderColor: 'var(--c-border, #E3E6EB)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--c-text-primary)' }}>
                  Assign Vocal Role
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSectionForRole(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-black cursor-pointer"
                >
                  <span className="material-symbols-rounded text-lg">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                {availableVocalRoles.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => handleSetSectionVocalRole(selectedSectionForRole, role)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors active:scale-95 cursor-pointer hover:bg-neutral-100"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                      <span>{role.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      {role.type}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleSetSectionVocalRole(selectedSectionForRole, undefined)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 active:scale-95 transition-colors cursor-pointer mt-1"
                >
                  <span className="material-symbols-rounded text-base">clear</span>
                  <span>Remove Role</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
