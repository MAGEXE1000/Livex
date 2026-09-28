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

  // Active popover in the compact bottom capsule dock: 'chords' | 'style' | 'roles' | 'more' | null
  const [activePopover, setActivePopover] = useState<'chords' | 'style' | 'roles' | 'more' | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);

  // Close active popover when tapping outside
  useEffect(() => {
    if (!activePopover) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [activePopover]);

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

  // Theme resolution for bottom capsule dock
  const isEffectiveLight =
    isLight ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  const isEffectiveAmoled =
    isAmoled ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('amoled') ||
        document.documentElement.getAttribute('data-theme') === 'amoled'));

  const dockBg = isEffectiveAmoled
    ? 'rgba(12, 12, 14, 0.94)'
    : isEffectiveLight
      ? 'rgba(255, 255, 255, 0.94)'
      : 'rgba(22, 22, 26, 0.94)';
  const dockBorder = isEffectiveLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
  const dockShadow = isEffectiveLight
    ? '0 10px 30px -5px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
    : '0 12px 36px -4px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)';

  const popoverBg = isEffectiveAmoled
    ? 'rgba(4, 4, 4, 0.98)'
    : isEffectiveLight
      ? 'rgba(250, 250, 252, 0.98)'
      : 'rgba(18, 18, 22, 0.98)';
  const popoverBorder = isEffectiveLight
    ? '1px solid rgba(0, 0, 0, 0.10)'
    : '1px solid rgba(255, 255, 255, 0.12)';
  const popoverShadow = isEffectiveLight
    ? '0 12px 36px rgba(0,0,0,0.15)'
    : '0 12px 40px rgba(0,0,0,0.65)';

  const popoverMotionCenter = {
    initial: { opacity: 0, y: 8, scale: 0.95, x: '-50%' },
    animate: { opacity: 1, y: 0, scale: 1, x: '-50%' },
    exit: { opacity: 0, y: 8, scale: 0.95, x: '-50%' },
    transition: { type: 'spring' as const, damping: 25, stiffness: 420 },
  };

  const popoverMotionRight = {
    initial: { opacity: 0, y: 8, scale: 0.95, x: 0 },
    animate: { opacity: 1, y: 0, scale: 1, x: 0 },
    exit: { opacity: 0, y: 8, scale: 0.95, x: 0 },
    transition: { type: 'spring' as const, damping: 25, stiffness: 420 },
  };

  const popoverMotion = popoverMotionRight;

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
        setActivePopover(null);
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
      setActivePopover(null);
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
    const formatChord = (raw: string) => {
      if (raw.includes('-min-')) return raw.replace(/^[a-z]/, (m) => m.toUpperCase()).replace('-min-1', 'm').replace('-min-', 'm');
      if (raw.includes('-maj-')) return raw.replace(/^[a-z]/, (m) => m.toUpperCase()).replace('-maj-1', '').replace('-maj-', '');
      return raw;
    };
    availableChords.forEach((c) => list.add(formatChord(c)));
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
      {/* ── 1. FREEFORM WRITING CANVAS (TELEPROMPTER SCRIPT STYLE) ───── */}
      <main
        className="flex-1 flex flex-col gap-4 outline-none"
        style={{
          paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 96px)',
        }}
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

      {/* ── CANONICAL DRUMEX-INSPIRED COMPACT BOTTOM CAPSULE DOCK ── */}
      <aside
        ref={dockRef}
        aria-label="Song Both editor toolbar"
        data-testid="both-editing-bottom-dock"
        data-purpose="both-editing-bottom-dock"
        className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
          backgroundColor: dockBg,
          borderColor: dockBorder,
          boxShadow: dockShadow,
        }}
      >
        {/* ── LEFT CLUSTER: Direct high-frequency actions (Undo, Redo, Paste) ── */}
        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            type="button"
            data-testid="toolbar-undo-btn"
            data-action="both-toolbar-undo-btn"
            onClick={() => {
              setActivePopover(null);
              handleUndo();
            }}
            disabled={historyRef.current.length === 0}
            aria-label="Undo"
            title="Undo"
            className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer disabled:opacity-30 disabled:pointer-events-none relative after:absolute after:-inset-1.5 after:content-['']"
            style={{
              backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            <span className="material-symbols-rounded text-lg">undo</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            data-testid="toolbar-redo-btn"
            data-action="both-toolbar-redo-btn"
            onClick={() => {
              setActivePopover(null);
              handleRedo();
            }}
            disabled={futureRef.current.length === 0}
            aria-label="Redo"
            title="Redo"
            className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer disabled:opacity-30 disabled:pointer-events-none relative after:absolute after:-inset-1.5 after:content-['']"
            style={{
              backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: 'var(--c-text-secondary, #94a3b8)',
            }}
          >
            <span className="material-symbols-rounded text-lg">redo</span>
          </button>

          {/* Paste */}
          <button
            type="button"
            data-testid="toolbar-paste-btn"
            data-action="both-toolbar-paste-btn"
            onClick={() => {
              setActivePopover(null);
              handlePasteLyricsFromClipboard();
            }}
            aria-label="Paste lyrics"
            title="Paste lyrics"
            className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
            style={{
              backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: accent.from,
            }}
          >
            <span className="material-symbols-rounded text-lg">content_paste</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div
          className="w-[1px] h-5 mx-0.5"
          style={{
            backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
          }}
        />

        {/* ── CENTER SECTION: Visually Dominant Chords Action & Popover ── */}
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {activePopover === 'chords' && (
              <motion.div
                key="chords-popover"
                {...popoverMotionCenter}
                data-testid="both-chords-popover"
                className="absolute z-50 flex flex-col gap-2.5 p-3 rounded-2xl"
                style={{
                  bottom: 'calc(100% + 14px)',
                  left: '50%',
                  width: 'max-content',
                  minWidth: 260,
                  maxWidth: 'calc(100vw - 32px)',
                  backgroundColor: popoverBg,
                  border: popoverBorder,
                  boxShadow: popoverShadow,
                  backdropFilter: 'var(--surface-float-blur, blur(20px))',
                  WebkitBackdropFilter: 'var(--surface-float-blur, blur(20px))',
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-sm" style={{ color: accent.from }}>
                      music_note
                    </span>
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ color: 'var(--c-text-primary)' }}
                    >
                      Chord Placement
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {activeSelection ? `Line ${activeSelection.lineId.slice(-3)}` : 'Tap to place'}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 leading-snug">
                  Select chord to insert into active lyrics line:
                </p>

                {/* Quick Chords Grid */}
                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto no-scrollbar py-0.5">
                  {chordOptions.slice(0, 12).map((chord) => (
                    <button
                      key={chord}
                      type="button"
                      onClick={() => {
                        const sel = activeSelectionRef.current;
                        if (sel) {
                          handleAddChordToLine(sel.sectionId, sel.lineId, chord, sel.start);
                          toast.success(`Attached [${chord}]`);
                          setActivePopover(null);
                        } else if (currentDoc.sections.length > 0 && currentDoc.sections[0].lines.length > 0) {
                          const firstSec = currentDoc.sections[0];
                          const firstLine = firstSec.lines[0];
                          handleAddChordToLine(firstSec.id, firstLine.id, chord, firstLine.text.length);
                          toast.success(`Attached [${chord}]`);
                          setActivePopover(null);
                        } else {
                          toast.info('Type a lyric line first to attach chords');
                        }
                      }}
                      className="h-8 px-2 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer border"
                      style={{
                        backgroundColor: availableChords.includes(chord)
                          ? `${accent.from}22`
                          : 'rgba(255,255,255,0.05)',
                        borderColor: availableChords.includes(chord)
                          ? `${accent.from}66`
                          : 'rgba(255,255,255,0.1)',
                        color: availableChords.includes(chord) ? accent.from : 'var(--c-text-primary)',
                      }}
                    >
                      {chord}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    data-testid="toolbar-chord-btn"
                    onClick={() => {
                      setActivePopover(null);
                      handleOpenChordPicker();
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: accent.from,
                    }}
                  >
                    + All Chords...
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Dominant Center FAB */}
          <button
            type="button"
            data-testid="both-toolbar-chords-btn"
            onClick={() => setActivePopover((p) => (p === 'chords' ? null : 'chords'))}
            aria-label="Attach or Place Chords"
            title="Chords"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white transition active:scale-95 cursor-pointer shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              boxShadow: `0 4px 16px ${accent.to}66, 0 0 0 1px rgba(255,255,255,0.25)`,
            }}
          >
            <span className="material-symbols-rounded text-2xl font-bold">music_note</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div
          className="w-[1px] h-5 mx-0.5"
          style={{
            backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)',
          }}
        />

        {/* ── RIGHT CLUSTER: Dense secondary tools (Style, Roles, More) ── */}
        <div className="flex items-center gap-1">
          {/* Style & Color */}
          <div className="relative flex items-center justify-center">
            <AnimatePresence>
              {activePopover === 'style' && (
                <motion.div
                  key="style-popover"
                  {...popoverMotionRight}
                  data-testid="both-style-popover"
                  className="absolute z-50 flex flex-col gap-2.5 p-3 rounded-2xl"
                  style={{
                    bottom: 'calc(100% + 14px)',
                    right: -24,
                    width: 220,
                    backgroundColor: popoverBg,
                    border: popoverBorder,
                    boxShadow: popoverShadow,
                    backdropFilter: 'var(--surface-float-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--surface-float-blur, blur(20px))',
                  }}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Text Style & Color
                    </span>
                  </div>

                  {/* Bold Toggle */}
                  <button
                    type="button"
                    data-testid="toolbar-bold-btn"
                    onClick={() => {
                      handleFormatBold();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
                      color: 'var(--c-text-primary, #ffffff)',
                    }}
                  >
                    <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-black text-sm">
                      B
                    </span>
                    <span>Toggle Bold</span>
                  </button>

                  {/* Color Palette */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Color Palette
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => {
                            handleFormatColor(c.value);
                            setActivePopover(null);
                          }}
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              data-testid="toolbar-color-btn"
              data-action="both-toolbar-style-btn"
              onClick={() => setActivePopover((p) => (p === 'style' ? null : 'style'))}
              aria-label="Text Formatting and Colors"
              title="Text Style & Color"
              className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
              style={{
                backgroundColor:
                  activePopover === 'style'
                    ? isEffectiveLight
                      ? 'rgba(0,0,0,0.12)'
                      : 'rgba(255,255,255,0.18)'
                    : isEffectiveLight
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                color: documentColor || (isEffectiveLight ? '#334155' : '#cbd5e1'),
              }}
            >
              <span className="material-symbols-rounded text-lg">format_color_text</span>
            </button>
          </div>

          {/* Vocal Roles */}
          <div className="relative flex items-center justify-center">
            <AnimatePresence>
              {activePopover === 'roles' && (
                <motion.div
                  key="roles-popover"
                  {...popoverMotionRight}
                  data-testid="both-roles-popover"
                  className="absolute z-50 flex flex-col gap-2 p-3 rounded-2xl"
                  style={{
                    bottom: 'calc(100% + 14px)',
                    right: -12,
                    width: 230,
                    backgroundColor: popoverBg,
                    border: popoverBorder,
                    boxShadow: popoverShadow,
                    backdropFilter: 'var(--surface-float-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--surface-float-blur, blur(20px))',
                  }}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Vocal Roles
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleAssignRole(undefined);
                        setActivePopover(null);
                      }}
                      className="text-[10px] text-gray-400 hover:text-rose-400 transition-colors"
                    >
                      Clear Role
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
                    {defaultVocalRoles.map((role) => (
                      <button
                        key={role.type}
                        type="button"
                        onClick={() => {
                          handleAssignRole(role);
                          setActivePopover(null);
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                        <span style={{ color: 'var(--c-text-primary)' }}>{role.label}</span>
                      </button>
                    ))}
                    {customVocalRoles.map((role) => (
                      <button
                        key={role.label}
                        type="button"
                        onClick={() => {
                          handleAssignRole(role);
                          setActivePopover(null);
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                        <span style={{ color: 'var(--c-text-primary)' }}>{role.label}</span>
                        <span className="text-[9px] uppercase opacity-40 ml-auto font-mono">Custom</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      type="button"
                      data-testid="toolbar-role-btn"
                      onClick={() => {
                        const sel = activeSelectionRef.current;
                        if (sel) {
                          setRolePickerTarget({ sectionId: sel.sectionId, lineId: sel.lineId });
                        } else if (currentDoc.sections.length > 0) {
                          setRolePickerTarget({ sectionId: currentDoc.sections[0].id });
                        }
                        setActivePopover(null);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderColor: 'rgba(255,255,255,0.12)',
                        color: 'var(--c-text-primary)',
                      }}
                    >
                      + Manage / New Role...
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              data-action="both-toolbar-roles-btn"
              onClick={() => setActivePopover((p) => (p === 'roles' ? null : 'roles'))}
              aria-label="Vocal Roles"
              title="Vocal Performer Roles"
              className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
              style={{
                backgroundColor:
                  activePopover === 'roles'
                    ? isEffectiveLight
                      ? 'rgba(0,0,0,0.12)'
                      : 'rgba(255,255,255,0.18)'
                    : isEffectiveLight
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                color: isEffectiveLight ? '#334155' : '#cbd5e1',
              }}
            >
              <span className="material-symbols-rounded text-lg">mic</span>
            </button>
          </div>

          {/* More / Sections / Clear */}
          <div className="relative flex items-center justify-center">
            <AnimatePresence>
              {activePopover === 'more' && (
                <motion.div
                  key="more-popover"
                  {...popoverMotionRight}
                  data-testid="both-more-popover"
                  className="absolute z-50 flex flex-col gap-1.5 p-3 rounded-2xl"
                  style={{
                    bottom: 'calc(100% + 14px)',
                    right: 0,
                    width: 210,
                    backgroundColor: popoverBg,
                    border: popoverBorder,
                    boxShadow: popoverShadow,
                    backdropFilter: 'var(--surface-float-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--surface-float-blur, blur(20px))',
                  }}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Song Actions
                    </span>
                  </div>

                  {/* Add Section */}
                  <button
                    type="button"
                    data-testid="toolbar-add-section-btn"
                    onClick={() => {
                      setShowAddSectionModal(true);
                      setActivePopover(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5 text-left"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    <span className="material-symbols-rounded text-base" style={{ color: accent.from }}>
                      layers
                    </span>
                    <span>+ Add Section</span>
                  </button>

                  {/* Add Line */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAddLine();
                      setActivePopover(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5 text-left"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    <span className="material-symbols-rounded text-base text-gray-400">add</span>
                    <span>+ Add Lyric Line</span>
                  </button>

                  {/* Copy Lyrics */}
                  <button
                    type="button"
                    data-testid="toolbar-copy-btn"
                    onClick={() => {
                      handleCopyLyricsToClipboard();
                      setActivePopover(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5 text-left"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    <span className="material-symbols-rounded text-base text-gray-400">content_copy</span>
                    <span>Copy Lyrics & Chords</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  {/* Clear Lyrics */}
                  <button
                    type="button"
                    data-testid="toolbar-clear-btn"
                    onClick={() => {
                      setShowClearConfirm(true);
                      setActivePopover(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-rose-500/10 text-rose-400 text-left"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                    <span>Clear All Lyrics</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              data-testid="both-toolbar-more-btn"
              onClick={() => setActivePopover((p) => (p === 'more' ? null : 'more'))}
              aria-label="More Song Actions"
              title="More Actions"
              className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
              style={{
                backgroundColor:
                  activePopover === 'more'
                    ? isEffectiveLight
                      ? 'rgba(0,0,0,0.12)'
                      : 'rgba(255,255,255,0.18)'
                    : isEffectiveLight
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                color: isEffectiveLight ? '#334155' : '#cbd5e1',
              }}
            >
              <span className="material-symbols-rounded text-lg">more_horiz</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
