import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  type SongLyricsDocument,
  type SongLyricSection,
  type SongLyricLine,
  type LyricChordPlacement,
  type StandardVocalRole,
  type StandardLyricSectionType,
  type VocalRoleAnnotation,
  VOCAL_ROLE_PRESETS,
  LYRIC_SECTION_TYPES,
  parsePastedLyrics,
  lyricsDocumentToPlainText,
  createEmptyLyricsDocument,
  generateLyricId,
  getCombinedVocalRoles,
  saveCustomVocalRole,
  deleteCustomVocalRole,
  applyFormatToSpans,
  toggleBoldOnSelection,
  setColorOnSelection,
  getLineSpans,
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

const CUSTOM_ROLE_COLORS = [
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#a855f7', // Violet
];

interface ActiveSelection {
  sectionId: string;
  lineId: string;
  start: number;
  end: number;
  text: string;
}

export const SongLyricsEditor: React.FC<SongLyricsEditorProps> = ({
  lyrics,
  onChange,
  availableChords = [],
  accent,
  isLight = false,
  isAmoled = false,
}) => {
  // If lyrics is undefined, we initialize as an empty document without sections
  const currentDoc: SongLyricsDocument = useMemo(() => {
    return lyrics && Array.isArray(lyrics.sections) ? lyrics : createEmptyLyricsDocument();
  }, [lyrics]);

  // Undo / Redo history stacks
  const historyRef = useRef<SongLyricsDocument[]>([]);
  const futureRef = useRef<SongLyricsDocument[]>([]);

  // Active line selection state for toolbar operations
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const activeSelectionRef = useRef<ActiveSelection | null>(null);
  activeSelectionRef.current = activeSelection;

  // Dialog & popover states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteModalText, setPasteModalText] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [renameSectionTarget, setRenameSectionTarget] = useState<{ id: string; name: string } | null>(null);

  // Chord Popover
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [chordPickerTarget, setChordPickerTarget] = useState<{
    sectionId: string;
    lineId: string;
    offset: number;
  } | null>(null);

  // Color Palette Popover
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Role Picker
  const [rolePickerTarget, setRolePickerTarget] = useState<{
    sectionId: string;
    lineId?: string;
  } | null>(null);

  // Custom roles management state
  const [customRolesVersion, setCustomRolesVersion] = useState(0);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#ec4899');

  const { defaults: defaultVocalRoles, customs: customVocalRoles } = useMemo(() => {
    return getCombinedVocalRoles(currentDoc);
  }, [currentDoc, customRolesVersion]);

  // Document-wide colors & formatting
  const documentColor = currentDoc.formatting?.defaultColor;

  // ── DOCUMENT MUTATION HELPERS WITH HISTORY ──────────────────────────

  const updateDoc = useCallback(
    (updater: (prev: SongLyricsDocument) => SongLyricsDocument) => {
      const next = updater(currentDoc);
      historyRef.current.push(currentDoc);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      onChange(next);
    },
    [currentDoc, onChange]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop()!;
    futureRef.current.push(currentDoc);
    onChange(previous);
  }, [currentDoc, onChange]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(currentDoc);
    onChange(next);
  }, [currentDoc, onChange]);

  // ── DOCUMENT CONTENT INSPECTION ─────────────────────────────────────

  const totalLines = useMemo(() => {
    return currentDoc.sections.reduce((acc, s) => acc + s.lines.length, 0);
  }, [currentDoc.sections]);

  const isLyricsEmpty = useMemo(() => {
    if (currentDoc.sections.length === 0) return true;
    return currentDoc.sections.every((s) => s.lines.every((l) => l.text.trim().length === 0));
  }, [currentDoc.sections]);

  // ── FREEFORM LINE MUTATIONS ─────────────────────────────────────────

  const handleUpdateLineText = useCallback(
    (sectionId: string, lineId: string, newText: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                lines: sec.lines.map((l) => {
                  if (l.id !== lineId) return l;
                  // If line had spans, update or reset spans to match new text
                  return {
                    ...l,
                    text: newText,
                    spans: l.spans ? [{ text: newText }] : undefined,
                  };
                }),
              }
            : sec
        ),
      }));
    },
    [updateDoc]
  );

  const handleAddLine = useCallback(
    (sectionId?: string, afterLineIdx?: number) => {
      updateDoc((doc) => {
        // If document has no sections, create a transparent unsectioned section
        let targetSecId = sectionId;
        let sections = [...doc.sections];

        if (sections.length === 0) {
          const newSec: SongLyricSection = {
            id: generateLyricId('sec'),
            type: 'custom',
            name: '', // Empty name = freeform, no section banner
            lines: [],
          };
          sections = [newSec];
          targetSecId = newSec.id;
        } else if (!targetSecId) {
          targetSecId = sections[sections.length - 1].id;
        }

        const newLine: SongLyricLine = {
          id: generateLyricId('line'),
          text: '',
        };

        const updatedSections = sections.map((sec) => {
          if (sec.id !== targetSecId) return sec;
          const lines = [...sec.lines];
          if (afterLineIdx !== undefined && afterLineIdx >= 0) {
            lines.splice(afterLineIdx + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
          return { ...sec, lines };
        });

        return { ...doc, sections: updatedSections };
      });
    },
    [updateDoc]
  );

  const handleDeleteLine = useCallback(
    (sectionId: string, lineId: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                lines: sec.lines.filter((l) => l.id !== lineId),
              }
            : sec
        ),
      }));
    },
    [updateDoc]
  );

  // ── INLINE FORMATTING (BOLD & COLOR) ────────────────────────────────

  const handleFormatBold = useCallback(() => {
    const sel = activeSelectionRef.current;
    if (!sel) {
      toast.info('Click or select text in a line first');
      return;
    }

    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) => {
        if (sec.id !== sel.sectionId) return sec;
        return {
          ...sec,
          lines: sec.lines.map((l) => {
            if (l.id !== sel.lineId) return l;

            // If a specific range is selected, format only that range
            if (sel.start !== sel.end) {
              const nextSpans = toggleBoldOnSelection(l.spans, l.text, sel.start, sel.end);
              return { ...l, spans: nextSpans };
            }

            // Otherwise toggle line-level bold
            const currentBold = Boolean(l.format?.bold);
            return {
              ...l,
              format: { ...l.format, bold: !currentBold },
            };
          }),
        };
      }),
    }));
  }, [updateDoc]);

  const handleFormatColor = useCallback(
    (color: string) => {
      const sel = activeSelectionRef.current;
      if (!sel) {
        // Document-wide color change
        updateDoc((doc) => ({
          ...doc,
          formatting: { ...doc.formatting, defaultColor: color || undefined },
        }));
        setShowColorPicker(false);
        return;
      }

      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sel.sectionId) return sec;
          return {
            ...sec,
            lines: sec.lines.map((l) => {
              if (l.id !== sel.lineId) return l;

              // If a specific range is selected, format only that range
              if (sel.start !== sel.end) {
                const nextSpans = setColorOnSelection(l.spans, l.text, sel.start, sel.end, color);
                return { ...l, spans: nextSpans };
              }

              // Otherwise set line-level color
              return {
                ...l,
                format: { ...l.format, color: color || undefined },
              };
            }),
          };
        }),
      }));
      setShowColorPicker(false);
    },
    [updateDoc]
  );

  // ── CHORD PLACEMENT HELPERS ──────────────────────────────────────────

  const handleOpenChordPicker = useCallback(() => {
    const sel = activeSelectionRef.current;
    if (!sel) {
      // If there are lines, pick the first line
      const firstSec = currentDoc.sections[0];
      const firstLine = firstSec?.lines[0];
      if (firstSec && firstLine) {
        setChordPickerTarget({
          sectionId: firstSec.id,
          lineId: firstLine.id,
          offset: firstLine.text.length,
        });
        setShowChordPicker(true);
      } else {
        toast.info('Type a lyric line first to attach chords');
      }
      return;
    }

    setChordPickerTarget({
      sectionId: sel.sectionId,
      lineId: sel.lineId,
      offset: sel.start,
    });
    setShowChordPicker(true);
  }, [currentDoc.sections]);

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
              chords.sort((a, b) => a.offset - b.offset);
              return { ...line, chords };
            }),
          };
        }),
      }));
      setShowChordPicker(false);
      setChordPickerTarget(null);
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
    },
    [updateDoc]
  );

  // ── SECTION MANAGEMENT ───────────────────────────────────────────────

  const handleCreateSection = useCallback(
    (name: string, type: StandardLyricSectionType = 'custom') => {
      updateDoc((doc) => {
        const newSec: SongLyricSection = {
          id: generateLyricId('sec'),
          type,
          name: name.trim(),
          lines: [{ id: generateLyricId('line'), text: '' }],
        };
        return {
          ...doc,
          sections: [...doc.sections, newSec],
        };
      });
      setShowAddSectionModal(false);
      toast.success(`Added ${name} section`);
    },
    [updateDoc]
  );

  const handleRenameSection = useCallback(
    (sectionId: string, newName: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) =>
          sec.id === sectionId ? { ...sec, name: newName.trim() } : sec
        ),
      }));
      setRenameSectionTarget(null);
    },
    [updateDoc]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      updateDoc((doc) => {
        const sections = doc.sections.filter((s) => s.id !== sectionId);
        return { ...doc, sections };
      });
    },
    [updateDoc]
  );

  // ── VOCAL ROLE ASSIGNMENT ────────────────────────────────────────────

  const handleAssignRole = useCallback(
    (role: VocalRoleAnnotation | undefined) => {
      if (!rolePickerTarget) return;

      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== rolePickerTarget.sectionId) return sec;

          if (rolePickerTarget.lineId) {
            return {
              ...sec,
              lines: sec.lines.map((l) =>
                l.id === rolePickerTarget.lineId ? { ...l, vocalRole: role } : l
              ),
            };
          }

          return { ...sec, vocalRole: role };
        }),
      }));
      setRolePickerTarget(null);
    },
    [rolePickerTarget, updateDoc]
  );

  const handleCreateCustomRole = useCallback(() => {
    if (!newRoleName.trim()) return;
    saveCustomVocalRole({ label: newRoleName.trim(), color: newRoleColor });
    setCustomRolesVersion((v) => v + 1);
    setNewRoleName('');
    setShowNewRoleForm(false);
    toast.success(`Role "${newRoleName.trim()}" created`);
  }, [newRoleName, newRoleColor]);

  // ── CLIPBOARD INTEGRATION ────────────────────────────────────────────

  const handlePasteLyricsFromClipboard = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const parsed = parsePastedLyrics(text);
          onChange(parsed);
          toast.success('Lyrics pasted successfully!');
          return;
        }
      }
    } catch (err) {
      console.warn('System clipboard read failed, opening paste dialog:', err);
    }
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
        toast.success('Lyrics copied to clipboard!');
      } else {
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

  // Combined chords list
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
      data-testid="song-lyrics-editor-workspace"
      className="flex flex-col w-full h-full min-h-0 relative select-text"
      style={{
        color: 'var(--c-text-primary, #ffffff)',
        fontFamily: 'var(--studio-font-body, var(--font-body))',
      }}
    >
      {/* ── 1. DEDICATED LYRICS EDITING TOOLBAR ───────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-1.5 px-3 py-2 rounded-2xl border backdrop-blur-xl shadow-lg mb-4"
        style={{
          backgroundColor: isLight
            ? 'rgba(255, 255, 255, 0.88)'
            : isAmoled
              ? 'rgba(0, 0, 0, 0.92)'
              : 'rgba(18, 18, 22, 0.88)',
          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
        }}
        data-purpose="lyrics-editing-toolbar"
      >
        {/* Left: Formatting tools */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Bold Button */}
          <button
            type="button"
            data-testid="toolbar-bold-btn"
            onClick={handleFormatBold}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.06))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              color: 'var(--c-text-primary, #ffffff)',
            }}
            title="Bold selected text (or line)"
          >
            B
          </button>

          {/* Color Palette Button */}
          <button
            type="button"
            data-testid="toolbar-color-btn"
            onClick={() => setShowColorPicker((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer border relative"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.06))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              color: documentColor || accent.from,
            }}
            title="Text Color"
          >
            <span className="material-symbols-rounded text-base">palette</span>
          </button>

          {/* Attach Chord Button */}
          <button
            type="button"
            data-testid="toolbar-chord-btn"
            onClick={handleOpenChordPicker}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.06))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              color: accent.from,
            }}
            title="Attach chord at cursor/selection"
          >
            <span className="material-symbols-rounded text-sm">music_note</span>
            <span className="hidden sm:inline">+ Chord</span>
          </button>

          {/* Vocal Role Button */}
          <button
            type="button"
            data-testid="toolbar-role-btn"
            onClick={() => {
              const sel = activeSelectionRef.current;
              if (sel) {
                setRolePickerTarget({ sectionId: sel.sectionId, lineId: sel.lineId });
              } else if (currentDoc.sections.length > 0) {
                setRolePickerTarget({ sectionId: currentDoc.sections[0].id });
              } else {
                toast.info('Type a lyric line first to assign roles');
              }
            }}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.06))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
            title="Assign vocal performer role"
          >
            <span className="material-symbols-rounded text-sm">mic</span>
            <span className="hidden sm:inline">Role</span>
          </button>

          {/* Add Section Button */}
          <button
            type="button"
            data-testid="toolbar-add-section-btn"
            onClick={() => setShowAddSectionModal(true)}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.06))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.1))',
              color: 'var(--c-text-primary, #ffffff)',
            }}
            title="Add section container"
          >
            <span className="material-symbols-rounded text-sm">layers</span>
            <span className="hidden sm:inline">+ Section</span>
          </button>
        </div>

        {/* Right: History & Clipboard */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Undo */}
          <button
            type="button"
            data-testid="toolbar-undo-btn"
            onClick={handleUndo}
            disabled={historyRef.current.length === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer border disabled:opacity-30 disabled:pointer-events-none"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.08))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
            title="Undo"
          >
            <span className="material-symbols-rounded text-base">undo</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            data-testid="toolbar-redo-btn"
            onClick={handleRedo}
            disabled={futureRef.current.length === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer border disabled:opacity-30 disabled:pointer-events-none"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.08))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
            title="Redo"
          >
            <span className="material-symbols-rounded text-base">redo</span>
          </button>

          {/* Copy */}
          <button
            type="button"
            data-testid="toolbar-copy-btn"
            onClick={handleCopyLyricsToClipboard}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.08))',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
            title="Copy lyrics & chords"
          >
            <span className="material-symbols-rounded text-base">content_copy</span>
          </button>

          {/* Paste */}
          <button
            type="button"
            data-testid="toolbar-paste-btn"
            onClick={handlePasteLyricsFromClipboard}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer border"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.08))',
              color: accent.from,
            }}
            title="Paste lyrics"
          >
            <span className="material-symbols-rounded text-base">content_paste</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            data-testid="toolbar-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer text-gray-400 hover:text-rose-400"
            title="Clear lyrics"
          >
            <span className="material-symbols-rounded text-base">delete</span>
          </button>
        </div>
      </header>

      {/* ── POPUP: COLOR PALETTE DROPDOWN ────────────────────────────── */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="absolute top-14 left-4 z-40 p-3 rounded-2xl border shadow-2xl backdrop-blur-2xl flex flex-col gap-2"
            style={{
              backgroundColor: isAmoled ? '#000000' : 'var(--surface-card-bg, #111115)',
              borderColor: 'var(--c-border, rgba(255,255,255,0.15))',
              minWidth: '220px',
            }}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Text Color
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => handleFormatColor(c.value)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border transition-transform active:scale-90 cursor-pointer"
                  style={{
                    backgroundColor: c.value || 'transparent',
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                  title={c.label}
                >
                  {!c.value && (
                    <span className="material-symbols-rounded text-xs text-gray-400">block</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. FREEFORM WRITING CANVAS (TELEPROMPTER SCRIPT STYLE) ───── */}
      <main
        className="flex-1 flex flex-col gap-4 pb-24 outline-none"
        data-purpose="teleprompter-writing-canvas"
      >
        {/* If completely empty: Show pristine writing invitation without forced sections */}
        {isLyricsEmpty && (
          <div
            onClick={() => handleAddLine()}
            className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed transition-all cursor-text text-center my-4 group hover:border-blue-500/40"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
              borderColor: 'var(--c-border, rgba(255,255,255,0.08))',
            }}
          >
            <span
              className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full mb-3 border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'var(--c-text-muted, #8A92A6)',
              }}
            >
              [empty document]
            </span>
            <p className="text-base font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
              Type or paste lyrics...
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              Start writing freely. Sections, vocal roles, and chords are completely optional.
            </p>
          </div>
        )}

        {/* Render sections & lines */}
        {currentDoc.sections.map((section, secIdx) => {
          const hasSectionHeader = Boolean(section.name && section.name.trim().length > 0);
          const sectionColor = section.vocalRole?.color || accent.from;

          return (
            <section
              key={section.id || secIdx}
              data-testid={`lyric-section-${secIdx}`}
              className="flex flex-col gap-2 relative group/sec"
            >
              {/* Optional Section Header Strip (Only if section has a name) */}
              {hasSectionHeader && (
                <div className="flex items-center justify-between gap-2 pt-3 pb-1 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sectionColor }}
                    />
                    <button
                      type="button"
                      onClick={() => setRenameSectionTarget({ id: section.id, name: section.name })}
                      className="text-xs font-black uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1.5"
                      style={{ color: sectionColor }}
                      title="Click to rename section"
                    >
                      <span>{section.name}</span>
                      <span className="material-symbols-rounded text-xs opacity-40">edit</span>
                    </button>

                    {/* Vocal Role Badge */}
                    <button
                      type="button"
                      onClick={() => setRolePickerTarget({ sectionId: section.id })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer active:scale-95"
                      style={{
                        backgroundColor: section.vocalRole
                          ? `${section.vocalRole.color || '#3b82f6'}22`
                          : 'rgba(255,255,255,0.04)',
                        borderColor: section.vocalRole
                          ? `${section.vocalRole.color || '#3b82f6'}44`
                          : 'rgba(255,255,255,0.08)',
                        color: section.vocalRole?.color || 'var(--c-text-muted, #94a3b8)',
                      }}
                      title="Assign Vocal Performer Role to Section"
                    >
                      <span className="material-symbols-rounded text-[11px]">mic</span>
                      <span>{section.vocalRole?.label || '+ Role'}</span>
                    </button>
                  </div>

                  {/* Section Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="opacity-0 group-hover/sec:opacity-100 text-gray-500 hover:text-rose-400 transition-opacity p-1 rounded-md"
                    title="Delete section container"
                  >
                    <span className="material-symbols-rounded text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Freeform Script Lines in Section */}
              <div className="flex flex-col gap-1">
                {section.lines.map((line, lineIdx) => {
                  const resolvedColor =
                    line.format?.color || documentColor || 'var(--c-text-primary, #ffffff)';
                  const isLineBold = Boolean(line.format?.bold);
                  const hasChords = Boolean(line.chords && line.chords.length > 0);

                  return (
                    <div
                      key={line.id || lineIdx}
                      data-testid={`lyric-line-${section.id}-${lineIdx}`}
                      className="group/line relative flex flex-col py-1 px-2 rounded-xl transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Attached Chords Row directly above lyrics */}
                      {hasChords && (
                        <div className="flex items-center gap-2 min-h-[22px] flex-wrap font-mono text-xs font-black select-none mb-0.5">
                          {line.chords!.map((chord) => (
                            <span
                              key={chord.id}
                              data-testid={`placed-chord-${chord.chord}`}
                              onClick={() => handleRemoveChordFromLine(section.id, line.id, chord.id)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer active:scale-95"
                              style={{
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                borderColor: 'rgba(56, 189, 248, 0.35)',
                                color: '#38bdf8',
                              }}
                              title="Click to remove chord"
                            >
                              <span>{chord.chord}</span>
                              <span className="text-[9px] opacity-60">×</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Line Writing Surface */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={line.text}
                          onChange={(e) =>
                            handleUpdateLineText(section.id, line.id, e.target.value)
                          }
                          onSelect={(e) => {
                            const target = e.target as HTMLInputElement;
                            setActiveSelection({
                              sectionId: section.id,
                              lineId: line.id,
                              start: target.selectionStart ?? 0,
                              end: target.selectionEnd ?? 0,
                              text: line.text,
                            });
                          }}
                          onFocus={(e) => {
                            const target = e.target as HTMLInputElement;
                            setActiveSelection({
                              sectionId: section.id,
                              lineId: line.id,
                              start: target.selectionStart ?? 0,
                              end: target.selectionEnd ?? 0,
                              text: line.text,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddLine(section.id, lineIdx);
                            } else if (
                              e.key === 'Backspace' &&
                              line.text === '' &&
                              section.lines.length > 1
                            ) {
                              e.preventDefault();
                              handleDeleteLine(section.id, line.id);
                            }
                          }}
                          placeholder={isLyricsEmpty ? 'Type or paste lyrics...' : ''}
                          className="flex-1 bg-transparent border-0 outline-none text-base leading-relaxed tracking-wide"
                          style={{
                            color: resolvedColor,
                            fontWeight: isLineBold ? 800 : 500,
                            fontFamily: 'inherit',
                          }}
                        />

                        {/* Line Vocal Role badge (if present) */}
                        {line.vocalRole && (
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0"
                            style={{
                              backgroundColor: `${line.vocalRole.color || '#3b82f6'}22`,
                              borderColor: `${line.vocalRole.color || '#3b82f6'}44`,
                              color: line.vocalRole.color || '#3b82f6',
                            }}
                          >
                            {line.vocalRole.label || line.vocalRole.type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── 3. BOTTOM ACTIONS: CLEAN + ADD SECTION CONTROL ──────────── */}
        <div
          className="flex flex-col items-center justify-center pt-6 pb-12 gap-3"
          data-purpose="lyrics-bottom-actions"
        >
          <button
            type="button"
            data-testid="bottom-add-section-btn"
            onClick={() => setShowAddSectionModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border shadow-sm text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-white/20"
            style={{
              backgroundColor: 'var(--app-surface-low, rgba(255,255,255,0.04))',
              borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
              color: 'var(--c-text-primary, #ffffff)',
            }}
          >
            <span className="material-symbols-rounded text-base" style={{ color: accent.from }}>
              layers
            </span>
            <span>+ Add Section</span>
          </button>
        </div>
      </main>

      {/* ── DIALOG: ATTACH CHORD POPOVER ─────────────────────────────── */}
      <Dialog
        open={showChordPicker}
        onClose={() => setShowChordPicker(false)}
        title="Attach Chord"
      >
        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs text-gray-400">
            Select a chord to place directly above this lyric position:
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
            {chordOptions.map((chord) => (
              <button
                key={chord}
                type="button"
                onClick={() => {
                  if (chordPickerTarget) {
                    handleAddChordToLine(
                      chordPickerTarget.sectionId,
                      chordPickerTarget.lineId,
                      chord,
                      chordPickerTarget.offset
                    );
                  }
                }}
                className="py-2 px-3 rounded-xl border font-mono font-bold text-sm text-center transition-all active:scale-95 cursor-pointer hover:border-blue-500/50"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                {chord}
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: ADD SECTION ──────────────────────────────────────── */}
      <Dialog
        open={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        title="Add Section"
      >
        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs text-gray-400">
            Choose a section type to organize your lyrics:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'verse' as const, label: 'Verse' },
              { type: 'chorus' as const, label: 'Chorus' },
              { type: 'bridge' as const, label: 'Bridge' },
              { type: 'pre-chorus' as const, label: 'Pre-Chorus' },
              { type: 'intro' as const, label: 'Intro' },
              { type: 'outro' as const, label: 'Outro' },
              { type: 'solo' as const, label: 'Solo' },
              { type: 'custom' as const, label: 'Custom...' },
            ].map((sec) => (
              <button
                key={sec.type}
                type="button"
                onClick={() => {
                  if (sec.type === 'custom') {
                    const customName = window.prompt('Enter custom section name:');
                    if (customName && customName.trim()) {
                      handleCreateSection(customName.trim(), 'custom');
                    }
                  } else {
                    handleCreateSection(sec.label, sec.type);
                  }
                }}
                className="py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all active:scale-95 cursor-pointer flex items-center gap-2 hover:border-blue-500/50"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <span className="material-symbols-rounded text-sm" style={{ color: accent.from }}>
                  layers
                </span>
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: VOCAL ROLES PICKER ───────────────────────────────── */}
      <Dialog
        open={Boolean(rolePickerTarget)}
        onClose={() => setRolePickerTarget(null)}
        title="Assign Vocal Performer Role"
      >
        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs text-gray-400">Select which performer should sing this part:</p>

          {/* Canonical 5 default roles */}
          <div className="flex flex-col gap-1.5">
            {defaultVocalRoles.map((role) => (
              <button
                key={role.type}
                type="button"
                onClick={() => handleAssignRole(role)}
                className="flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-white/20"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <span>{role.label || role.type}</span>
                </div>
                <span className="text-[10px] uppercase opacity-50 font-mono">Default</span>
              </button>
            ))}
          </div>

          {/* User-defined custom roles */}
          {customVocalRoles.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                Custom Roles
              </p>
              {customVocalRoles.map((role) => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => handleAssignRole(role)}
                  className="flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-white/20"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span>{role.label}</span>
                  </div>
                  <span className="text-[10px] uppercase opacity-50 font-mono">Custom</span>
                </button>
              ))}
            </div>
          )}

          {/* Add Custom Role Button */}
          {!showNewRoleForm ? (
            <button
              type="button"
              onClick={() => setShowNewRoleForm(true)}
              className="mt-2 py-2 px-3 rounded-xl border border-dashed text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              + Create Custom Role (e.g. Duet, Alto, Guest)
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 bg-white/5 mt-2">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name (e.g. Duet, Guest, Tenor)"
                className="p-2 rounded-lg bg-black/40 border border-white/10 text-xs outline-none"
              />
              <div className="flex items-center gap-1.5">
                {CUSTOM_ROLE_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewRoleColor(col)}
                    className="w-5 h-5 rounded-full border transition-transform"
                    style={{
                      backgroundColor: col,
                      borderColor: newRoleColor === col ? '#ffffff' : 'transparent',
                      transform: newRoleColor === col ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCreateCustomRole}
                  disabled={!newRoleName.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 disabled:opacity-40"
                >
                  Save Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRoleForm(false)}
                  className="py-1.5 px-3 rounded-lg text-xs text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Remove Role */}
          <button
            type="button"
            onClick={() => handleAssignRole(undefined)}
            className="mt-1 text-xs text-gray-400 hover:text-rose-400 text-center py-1 transition-colors"
          >
            Clear Assigned Role
          </button>
        </div>
      </Dialog>

      {/* ── DIALOG: PASTE MODAL FALLBACK ─────────────────────────────── */}
      <Dialog
        open={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste Lyrics & Chords"
      >
        <div className="flex flex-col gap-3 py-1">
          <textarea
            value={pasteModalText}
            onChange={(e) => setPasteModalText(e.target.value)}
            rows={8}
            placeholder="Paste your lyrics here..."
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono outline-none resize-none leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyPasteModal}
              disabled={!pasteModalText.trim()}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
            >
              Apply Lyrics
            </button>
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: CLEAR CONFIRM ────────────────────────────────────── */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Lyrics"
      >
        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs text-gray-300">
            Are you sure you want to remove all lyrics from this song?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setShowClearConfirm(false);
                toast.success('Lyrics cleared');
              }}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600"
            >
              Clear All Lyrics
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
