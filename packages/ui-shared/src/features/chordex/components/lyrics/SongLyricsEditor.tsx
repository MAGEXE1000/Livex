import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  type SongLyricsDocument,
  type SongLyricSection,
  type SongLyricLine,
  type LyricChordPlacement,
  type StandardVocalRole,
  type StandardLyricSectionType,
  VOCAL_ROLE_PRESETS,
  LYRIC_SECTION_TYPES,
  parsePastedLyrics,
  lyricsDocumentToPlainText,
  createEmptyLyricsDocument,
  generateLyricId,
} from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';

export interface SongLyricsEditorProps {
  lyrics?: SongLyricsDocument;
  onChange: (updated: SongLyricsDocument | undefined) => void;
  availableChords?: string[]; // Chords currently in the song preset
  accent: { from: string; to: string; mid?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

const COLOR_PALETTE = [
  { label: 'Default', value: '' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'White', value: '#ffffff' },
  { label: 'Muted', value: '#94a3b8' },
];

export const SongLyricsEditor: React.FC<SongLyricsEditorProps> = ({
  lyrics,
  onChange,
  availableChords = [],
  accent,
  isLight = false,
  isAmoled = false,
}) => {
  // If lyrics is undefined, we initialize on demand
  const currentDoc: SongLyricsDocument = useMemo(() => {
    return lyrics && lyrics.sections ? lyrics : createEmptyLyricsDocument();
  }, [lyrics]);

  // Dialog states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteModalText, setPasteModalText] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeChordPopover, setActiveChordPopover] = useState<{
    sectionId: string;
    lineId: string;
    chordId?: string;
    offset: number;
  } | null>(null);

  // Quick Colors Popover for a line
  const [colorPickerLine, setColorPickerLine] = useState<{
    sectionId: string;
    lineId: string;
  } | null>(null);

  // Role Picker for section or line
  const [rolePickerTarget, setRolePickerTarget] = useState<{
    sectionId: string;
    lineId?: string;
  } | null>(null);

  // Document-wide colors & formatting
  const documentColor = currentDoc.formatting?.defaultColor;
  const documentChordColor = currentDoc.formatting?.defaultChordColor || '#38bdf8';

  // ── DOCUMENT MUTATION HELPERS ────────────────────────────────────────

  const updateDoc = useCallback(
    (updater: (prev: SongLyricsDocument) => SongLyricsDocument) => {
      const next = updater(currentDoc);
      onChange(next);
    },
    [currentDoc, onChange]
  );

  const handleUpdateLineText = useCallback(
    (sectionId: string, lineId: string, newText: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                lines: sec.lines.map((l) => (l.id === lineId ? { ...l, text: newText } : l)),
              }
            : sec
        ),
      }));
    },
    [updateDoc]
  );

  const handleToggleLineBold = useCallback(
    (sectionId: string, lineId: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                lines: sec.lines.map((l) => {
                  if (l.id !== lineId) return l;
                  const currentBold = Boolean(l.format?.bold);
                  return {
                    ...l,
                    format: {
                      ...l.format,
                      bold: !currentBold,
                    },
                  };
                }),
              }
            : sec
        ),
      }));
    },
    [updateDoc]
  );

  const handleSetLineColor = useCallback(
    (sectionId: string, lineId: string, color: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                lines: sec.lines.map((l) => {
                  if (l.id !== lineId) return l;
                  return {
                    ...l,
                    format: {
                      ...l.format,
                      color: color || undefined,
                    },
                  };
                }),
              }
            : sec
        ),
      }));
      setColorPickerLine(null);
    },
    [updateDoc]
  );

  const handleSetDocumentColor = useCallback(
    (color: string) => {
      updateDoc((doc) => ({
        ...doc,
        formatting: {
          ...doc.formatting,
          defaultColor: color || undefined,
        },
      }));
    },
    [updateDoc]
  );

  const handleSetSectionVocalRole = useCallback(
    (sectionId: string, role: { type: StandardVocalRole; label: string; color: string } | null) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                vocalRole: role ? { type: role.type, label: role.label, color: role.color } : undefined,
              }
            : sec
        ),
      }));
      setRolePickerTarget(null);
    },
    [updateDoc]
  );

  const handleAddLine = useCallback(
    (sectionId: string, afterIndex?: number) => {
      const newLine: SongLyricLine = {
        id: generateLyricId('line'),
        text: '',
      };
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const lines = [...sec.lines];
          if (typeof afterIndex === 'number' && afterIndex >= 0) {
            lines.splice(afterIndex + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
          return { ...sec, lines };
        }),
      }));
    },
    [updateDoc]
  );

  const handleDeleteLine = useCallback(
    (sectionId: string, lineId: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const lines = sec.lines.filter((l) => l.id !== lineId);
          // Always ensure at least 1 empty line in the section
          return {
            ...sec,
            lines: lines.length > 0 ? lines : [{ id: generateLyricId('line'), text: '' }],
          };
        }),
      }));
    },
    [updateDoc]
  );

  const handleAddSection = useCallback(
    (type: StandardLyricSectionType, customName?: string) => {
      const typeDef = LYRIC_SECTION_TYPES.find((t) => t.type === type);
      const name = customName?.trim() || typeDef?.defaultName || 'Section';
      const newSec: SongLyricSection = {
        id: generateLyricId('sec'),
        type,
        name,
        lines: [
          {
            id: generateLyricId('line'),
            text: '',
          },
        ],
      };
      updateDoc((doc) => ({
        ...doc,
        sections: [...doc.sections, newSec],
      }));
      setShowAddSectionModal(false);
    },
    [updateDoc]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      updateDoc((doc) => {
        const sections = doc.sections.filter((s) => s.id !== sectionId);
        return {
          ...doc,
          sections: sections.length > 0 ? sections : createEmptyLyricsDocument().sections,
        };
      });
    },
    [updateDoc]
  );

  // ── CHORD PLACEMENT HELPERS ──────────────────────────────────────────

  const handleAddChordToLine = useCallback(
    (sectionId: string, lineId: string, chord: string, offset: number) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            lines: sec.lines.map((line) => {
              if (line.id !== lineId) return line;
              const chords = [...(line.chords || [])];
              chords.push({
                id: generateLyricId('chord'),
                chord,
                offset: Math.max(0, offset),
              });
              // Sort chords by offset
              chords.sort((a, b) => a.offset - b.offset);
              return { ...line, chords };
            }),
          };
        }),
      }));
      setActiveChordPopover(null);
    },
    [updateDoc]
  );

  const handleRemoveChordFromLine = useCallback(
    (sectionId: string, lineId: string, chordMarkerId: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            lines: sec.lines.map((line) => {
              if (line.id !== lineId) return line;
              const chords = (line.chords || []).filter((c) => c.id !== chordMarkerId);
              return { ...line, chords: chords.length > 0 ? chords : undefined };
            }),
          };
        }),
      }));
      setActiveChordPopover(null);
    },
    [updateDoc]
  );

  // ── CLIPBOARD INTEGRATION ────────────────────────────────────────────

  const handlePasteLyricsFromClipboard = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const parsed = parsePastedLyrics(text);
          onChange(parsed);
          toast.success('Lyrics pasted and structured successfully!');
          return;
        }
      }
    } catch (err) {
      console.warn('System clipboard read failed, opening paste dialog:', err);
    }
    // Fallback: open paste modal where user can paste with long-press or Ctrl+V
    setPasteModalText('');
    setShowPasteModal(true);
  }, [onChange]);

  const handleApplyPasteModal = useCallback(() => {
    if (pasteModalText.trim()) {
      const parsed = parsePastedLyrics(pasteModalText);
      onChange(parsed);
      toast.success('Lyrics pasted successfully!');
      setShowPasteModal(false);
      setPasteModalText('');
    }
  }, [pasteModalText, onChange]);

  const handleCopyLyricsToClipboard = useCallback(async () => {
    try {
      const plainText = lyricsDocumentToPlainText(currentDoc, true);
      if (!plainText.trim()) {
        toast.info('No lyrics to copy');
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
        toast.success('Lyrics and chords copied to clipboard!');
      } else {
        // Fallback using textarea execCommand
        const el = document.createElement('textarea');
        el.value = plainText;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Lyrics copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to copy lyrics:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, [currentDoc]);

  // Combined chords list for quick selection
  const chordOptions = useMemo(() => {
    const list = new Set<string>();
    availableChords.forEach((c) => list.add(c));
    ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em', 'F#m', 'Bm', 'G7', 'C7'].forEach((c) =>
      list.add(c)
    );
    return Array.from(list);
  }, [availableChords]);

  return (
    <div
      data-testid="song-lyrics-editor"
      className="w-full flex flex-col gap-3 py-2"
      style={{
        color: documentColor || 'var(--c-text-primary, #ffffff)',
      }}
    >
      {/* ── TOOLBAR / ACTIONS STRIP ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-wrap gap-2 px-1 pb-1 border-b"
        style={{ borderColor: 'var(--c-border, rgba(255,255,255,0.08))' }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Paste Lyrics Button */}
          <button
            type="button"
            data-testid="paste-lyrics-btn"
            onClick={handlePasteLyricsFromClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            }}
          >
            <span className="material-symbols-rounded text-sm">content_paste</span>
            <span>Paste lyrics</span>
          </button>

          {/* Copy Lyrics Button */}
          <button
            type="button"
            data-testid="copy-lyrics-btn"
            onClick={handleCopyLyricsToClipboard}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            <span className="material-symbols-rounded text-sm">content_copy</span>
            <span>Copy</span>
          </button>

          {/* Add Section Button */}
          <button
            type="button"
            data-testid="add-section-btn"
            onClick={() => setShowAddSectionModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            <span className="material-symbols-rounded text-sm">add</span>
            <span>Section</span>
          </button>

          {/* Document Formatting Button */}
          <button
            type="button"
            data-testid="doc-formatting-btn"
            onClick={() => setShowFormattingModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
              color: documentColor || 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            <span className="material-symbols-rounded text-sm">palette</span>
            <span>Color</span>
          </button>
        </div>

        {/* Clear / Remove Lyrics Button */}
        <button
          type="button"
          data-testid="remove-lyrics-btn"
          onClick={() => setShowClearConfirm(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <span className="material-symbols-rounded text-sm">delete</span>
          <span>Clear lyrics</span>
        </button>
      </div>

      {/* ── SECTIONS LIST ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {currentDoc.sections.map((section, secIdx) => {
          return (
            <div
              key={section.id || secIdx}
              data-testid={`lyric-section-${secIdx}`}
              className="rounded-2xl border p-3 flex flex-col gap-2.5 transition-all shadow-sm"
              style={{
                backgroundColor: isLight
                  ? '#ffffff'
                  : isAmoled
                    ? '#050505'
                    : 'var(--surface-card-bg, #111115)',
                borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              }}
            >
              {/* Section Header Row */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-3.5 rounded-full"
                    style={{ backgroundColor: section.vocalRole?.color || accent.from }}
                  />
                  <h3
                    className="text-xs font-extrabold uppercase tracking-wider truncate"
                    style={{
                      fontFamily: 'var(--font-headline)',
                      color: section.vocalRole?.color || accent.from,
                    }}
                  >
                    {section.name || 'Section'}
                  </h3>

                  {/* Vocal Role Badge */}
                  <button
                    type="button"
                    data-testid={`vocal-role-btn-${section.id}`}
                    onClick={() => setRolePickerTarget({ sectionId: section.id })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer"
                    style={{
                      backgroundColor: section.vocalRole
                        ? `${section.vocalRole.color || '#3b82f6'}22`
                        : 'rgba(255,255,255,0.06)',
                      borderColor: section.vocalRole
                        ? `${section.vocalRole.color || '#3b82f6'}55`
                        : 'rgba(255,255,255,0.12)',
                      color: section.vocalRole?.color || 'var(--c-text-muted, #94a3b8)',
                    }}
                    title="Assign Vocal Performer Role"
                  >
                    <span className="material-symbols-rounded text-[11px]">mic</span>
                    <span>{section.vocalRole?.label || 'Set Role'}</span>
                  </button>
                </div>

                {/* Section Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddLine(section.id)}
                    className="p-1 rounded-md text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Add line"
                  >
                    <span className="material-symbols-rounded text-sm">add</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1 rounded-md text-xs text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete section"
                  >
                    <span className="material-symbols-rounded text-sm">close</span>
                  </button>
                </div>
              </div>

              {/* Section Lines */}
              <div className="flex flex-col gap-2">
                {section.lines.map((line, lineIdx) => {
                  const resolvedColor =
                    line.format?.color || documentColor || 'var(--c-text-primary, #ffffff)';
                  const isBold = Boolean(line.format?.bold);

                  return (
                    <div
                      key={line.id || lineIdx}
                      data-testid={`lyric-line-${section.id}-${lineIdx}`}
                      className="group relative flex flex-col gap-0.5 px-2 py-1.5 rounded-xl border border-transparent hover:border-white/10 transition-colors"
                      style={{
                        backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* 1. Placed Chords Row above lyrics */}
                      <div className="flex items-center gap-2 min-h-[22px] flex-wrap font-mono text-xs font-bold select-none">
                        {line.chords && line.chords.length > 0 ? (
                          line.chords.map((chord) => (
                            <span
                              key={chord.id}
                              data-testid={`placed-chord-${chord.chord}`}
                              onClick={() =>
                                handleRemoveChordFromLine(section.id, line.id, chord.id)
                              }
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Click to remove chord"
                            >
                              <span>{chord.chord}</span>
                              <span className="text-[9px] opacity-60">×</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-500 italic opacity-40">
                            No chords attached
                          </span>
                        )}

                        {/* Add Chord to line button */}
                        <button
                          type="button"
                          data-testid={`add-chord-to-line-${lineIdx}`}
                          onClick={() =>
                            setActiveChordPopover({
                              sectionId: section.id,
                              lineId: line.id,
                              offset: line.text.length,
                            })
                          }
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all text-gray-300 cursor-pointer ml-auto"
                        >
                          + Chord
                        </button>
                      </div>

                      {/* 2. Lyric Line Text Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={line.text}
                          onChange={(e) =>
                            handleUpdateLineText(section.id, line.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddLine(section.id, lineIdx);
                            }
                          }}
                          placeholder="Type or paste lyrics..."
                          className="flex-1 bg-transparent border-0 outline-none text-sm leading-relaxed"
                          style={{
                            color: resolvedColor,
                            fontWeight: isBold ? 800 : 400,
                            fontFamily: 'var(--studio-font-body)',
                          }}
                        />

                        {/* Line Quick Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {/* Bold Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleLineBold(section.id, line.id)}
                            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                              isBold ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white'
                            }`}
                            title="Toggle Bold"
                          >
                            <span className="font-bold text-xs">B</span>
                          </button>

                          {/* Line Color Picker Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setColorPickerLine({ sectionId: section.id, lineId: line.id })
                            }
                            className="p-1 rounded text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Line Color"
                          >
                            <span
                              className="w-3 h-3 rounded-full inline-block border border-white/40"
                              style={{ backgroundColor: line.format?.color || 'transparent' }}
                            />
                          </button>

                          {/* Delete Line Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLine(section.id, line.id)}
                            className="p-1 rounded text-xs text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Line"
                          >
                            <span className="material-symbols-rounded text-sm">remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add line below section button */}
              <button
                type="button"
                onClick={() => handleAddLine(section.id)}
                className="w-full py-1 text-center text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer border border-dashed border-white/10 rounded-xl"
              >
                + Add line to {section.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: PASTE LYRICS ─────────────────────────────────────── */}
      {showPasteModal && (
        <Dialog
          open={true}
          onClose={() => setShowPasteModal(false)}
          title="Paste Song Lyrics"
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-gray-400">
              Paste your lyrics below. Chords, sections like [Verse] or [Chorus], and vocal roles
              will be recognized and structured automatically.
            </p>
            <textarea
              autoFocus
              value={pasteModalText}
              onChange={(e) => setPasteModalText(e.target.value)}
              rows={8}
              placeholder="[Verse 1]\nWhen I look into your eyes...\n\n[Chorus]\nDon't you cry tonight..."
              className="w-full p-3 rounded-xl border outline-none text-xs font-mono leading-relaxed"
              style={{
                backgroundColor: 'var(--surface-card-bg, #111115)',
                borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
                color: 'var(--c-text-primary, #ffffff)',
                resize: 'none',
              }}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPasteModal}
                disabled={!pasteModalText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-40 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                }}
              >
                Insert Structured Lyrics
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: ADD SECTION ──────────────────────────────────────── */}
      {showAddSectionModal && (
        <Dialog
          open={true}
          onClose={() => setShowAddSectionModal(false)}
          title="Add Song Section"
        >
          <div className="flex flex-col gap-2 p-1">
            <p className="text-xs text-gray-400 mb-2">Choose the type of section to append:</p>
            <div className="grid grid-cols-2 gap-2">
              {LYRIC_SECTION_TYPES.map((secType) => (
                <button
                  key={secType.type}
                  type="button"
                  data-testid={`pick-section-type-${secType.type}`}
                  onClick={() => handleAddSection(secType.type, secType.defaultName)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold hover:border-blue-500 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
                    borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
                    color: 'var(--c-text-primary, #ffffff)',
                  }}
                >
                  <span className="material-symbols-rounded text-sm text-blue-400">layers</span>
                  <span>{secType.defaultName}</span>
                </button>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: DOCUMENT COLOR / FORMATTING ───────────────────────── */}
      {showFormattingModal && (
        <Dialog
          open={true}
          onClose={() => setShowFormattingModal(false)}
          title="Lyrics Document Color"
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-gray-400">
              Select document-wide lyric text color. Lines with individual color overrides will
              retain their styling.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PALETTE.map((col) => {
                const isSelected = (documentColor || '') === col.value;
                return (
                  <button
                    key={col.label}
                    type="button"
                    onClick={() => {
                      handleSetDocumentColor(col.value);
                      setShowFormattingModal(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: col.value || 'var(--c-text-primary)' }}
                    />
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: LINE COLOR PICKER ─────────────────────────────────── */}
      {colorPickerLine && (
        <Dialog
          open={true}
          onClose={() => setColorPickerLine(null)}
          title="Line Text Color"
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-gray-400">Choose a custom color for this specific line:</p>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PALETTE.map((col) => (
                <button
                  key={col.label}
                  type="button"
                  onClick={() =>
                    handleSetLineColor(
                      colorPickerLine.sectionId,
                      colorPickerLine.lineId,
                      col.value
                    )
                  }
                  className="flex items-center gap-2 p-2 rounded-xl border border-white/10 hover:border-blue-500 text-xs font-bold transition-all cursor-pointer"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: col.value || 'var(--c-text-primary)' }}
                  />
                  <span>{col.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: VOCAL ROLE PICKER ─────────────────────────────────── */}
      {rolePickerTarget && (
        <Dialog
          open={true}
          onClose={() => setRolePickerTarget(null)}
          title="Assign Vocal Role"
        >
          <div className="flex flex-col gap-2 p-1">
            <p className="text-xs text-gray-400 mb-2">
              Specify who performs this section or part:
            </p>
            <div className="flex flex-col gap-1.5">
              {VOCAL_ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  data-testid={`pick-vocal-role-${preset.type}`}
                  onClick={() =>
                    handleSetSectionVocalRole(rolePickerTarget.sectionId, preset)
                  }
                  className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 hover:border-blue-500 text-left text-xs font-bold transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {preset.type}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleSetSectionVocalRole(rolePickerTarget.sectionId, null)}
                className="mt-2 p-2 text-center text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear vocal role
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: ADD / ATTACH CHORD TO LINE ────────────────────────── */}
      {activeChordPopover && (
        <Dialog
          open={true}
          onClose={() => setActiveChordPopover(null)}
          title="Place Chord on Line"
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-gray-400">Select a chord to position above this lyric line:</p>
            <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto p-1">
              {chordOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`select-chord-${c}`}
                  onClick={() =>
                    handleAddChordToLine(
                      activeChordPopover.sectionId,
                      activeChordPopover.lineId,
                      c,
                      activeChordPopover.offset
                    )
                  }
                  className="p-2 rounded-xl border border-white/10 hover:border-blue-500 text-center font-mono font-bold text-sm bg-white/5 hover:bg-blue-500/20 text-white transition-colors cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {/* ── MODAL: CONFIRM CLEAR LYRICS ──────────────────────────────── */}
      {showClearConfirm && (
        <Dialog
          open={true}
          onClose={() => setShowClearConfirm(false)}
          title="Clear Song Lyrics"
        >
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-gray-300">
              Are you sure you want to remove all lyrics from this song? Existing chords and
              song metadata will remain completely intact.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-clear-lyrics-btn"
                onClick={() => {
                  onChange(undefined);
                  setShowClearConfirm(false);
                  toast.success('Lyrics removed from song');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Remove Lyrics
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
