import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  splitLineIntoSegments,
  findWordBoundaries,
  snapToWordStart,
  getAdjacentWordOffset,
  type LyricLineSegment,
  type LyricTextSpan,
  getAllChords,
  searchChords,
  ROOTS,
  type Chord,
} from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';
import ChordDiagram from '../../diagrams/ChordDiagram';

export interface SongLyricsEditorProps {
  lyrics?: SongLyricsDocument;
  onChange: (updated: SongLyricsDocument | undefined) => void;
  availableChords?: string[]; // Chords currently in the song preset
  accent: { from: string; to: string; mid?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

function getCharacterColor(spans: LyricTextSpan[] | undefined, charOffset: number): string | undefined {
  if (!spans || spans.length === 0) return undefined;
  let offset = 0;
  for (const s of spans) {
    const end = offset + s.text.length;
    if (charOffset >= offset && charOffset < end) {
      return s.format?.color;
    }
    offset = end;
  }
  return undefined;
}

function getCharacterBold(spans: LyricTextSpan[] | undefined, charOffset: number): boolean {
  if (!spans || spans.length === 0) return false;
  let offset = 0;
  for (const s of spans) {
    const end = offset + s.text.length;
    if (charOffset >= offset && charOffset < end) {
      return Boolean(s.format?.bold);
    }
    offset = end;
  }
  return false;
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

const INTERLUDE_PRESET_DURATIONS = [5, 10, 15, 20, 30, 45, 60];
const INTERLUDE_PRESET_LABELS = ['(Solo)', '(Interlude)', '(Guitar Solo)', '(Intro)', '(Bridge)', '(Outro)'];

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

  // Active cursor/line position tracking for arbitrary element insertion
  const lastActivePositionRef = useRef<{
    sectionId: string;
    lineIndex: number;
    lineId?: string;
  } | null>(null);

  const setLastActivePosition = useCallback(
    (sectionId: string, lineIndex: number, lineId?: string) => {
      lastActivePositionRef.current = { sectionId, lineIndex, lineId };
    },
    []
  );

  // Active text color paint tool (null = inactive, string = hex or '' for clear)
  const [activeColorTool, setActiveColorTool] = useState<string | null>(null);
  const activeColorToolRef = useRef<string | null>(null);
  activeColorToolRef.current = activeColorTool;

  // Dialog & popover states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteModalText, setPasteModalText] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [renameSectionTarget, setRenameSectionTarget] = useState<{ id: string; name: string } | null>(null);

  // Chord Library Modal & Target
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [chordPickerTarget, setChordPickerTarget] = useState<{
    sectionId: string;
    lineId: string;
    offset: number;
    wordText?: string;
  } | null>(null);
  const [chordSearchQuery, setChordSearchQuery] = useState('');
  const [chordRootFilter, setChordRootFilter] = useState('All');
  const [chordTypeFilter, setChordTypeFilter] = useState('all');

  // Selected chord target for context menu (move, replace, delete)
  const [selectedChordForEdit, setSelectedChordForEdit] = useState<{
    sectionId: string;
    lineId: string;
    chord: LyricChordPlacement;
  } | null>(null);

  // Line currently in direct text typing mode (null = word targeting mode)
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  // Read-only by default in Both mode: editing mode requires explicit user activation
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Active popover in the compact bottom capsule dock: 'chords' | 'style' | 'roles' | 'more' | null
  const [activePopover, setActivePopover] = useState<'chords' | 'style' | 'roles' | 'more' | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const dockRef = useRef<HTMLElement | null>(null);

  const togglePopover = useCallback((name: 'chords' | 'style' | 'roles' | 'more') => {
    setActivePopover((prev) => {
      const next = prev === name ? null : name;
      if (next && dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        // If dock is close to the top of viewport (e.g. < 320px), open downwards into available space
        if (rect.top < 320) {
          setPopoverPlacement('bottom');
        } else {
          setPopoverPlacement('top');
        }
      }
      return next;
    });
  }, []);

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

  // Ensure popover closes on unmount so it doesn't linger in portal
  useEffect(() => {
    return () => setActivePopover(null);
  }, []);

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

  const dockBg = 'var(--surface-topbar-bg)';
  const dockBorder = 'var(--surface-topbar-border)';
  const dockShadow = 'var(--surface-topbar-shadow)';

  const popoverBg = 'var(--surface-dialog-bg, var(--app-surface-high, #121216))';
  const popoverBorder = '1px solid var(--c-border, rgba(255, 255, 255, 0.12))';
  const popoverShadow = 'var(--shadow-elevation-high, 0 12px 40px rgba(0,0,0,0.5))';

  const popoverMotionCenter = useMemo(
    () => ({
      initial: { opacity: 0, y: popoverPlacement === 'bottom' ? -8 : 8, scale: 0.95, x: '-50%' },
      animate: { opacity: 1, y: 0, scale: 1, x: '-50%' },
      exit: { opacity: 0, y: popoverPlacement === 'bottom' ? -8 : 8, scale: 0.95, x: '-50%' },
      transition: { type: 'spring' as const, damping: 25, stiffness: 420 },
    }),
    [popoverPlacement]
  );

  const popoverMotionRight = useMemo(
    () => ({
      initial: { opacity: 0, y: popoverPlacement === 'bottom' ? -8 : 8, scale: 0.95, x: 0 },
      animate: { opacity: 1, y: 0, scale: 1, x: 0 },
      exit: { opacity: 0, y: popoverPlacement === 'bottom' ? -8 : 8, scale: 0.95, x: 0 },
      transition: { type: 'spring' as const, damping: 25, stiffness: 420 },
    }),
    [popoverPlacement]
  );

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
      let createdLineId = '';
      updateDoc((doc) => {
        let targetSecId = sectionId;
        let resolvedLineIdx = afterLineIdx;
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
          resolvedLineIdx = undefined;
        } else if (!targetSecId) {
          if (lastActivePositionRef.current) {
            const secExists = sections.some((s) => s.id === lastActivePositionRef.current!.sectionId);
            if (secExists) {
              targetSecId = lastActivePositionRef.current.sectionId;
              if (resolvedLineIdx === undefined) {
                resolvedLineIdx = lastActivePositionRef.current.lineIndex;
              }
            }
          }
          if (!targetSecId) {
            targetSecId = sections[sections.length - 1].id;
          }
        }

        const newLine: SongLyricLine = {
          id: generateLyricId('line'),
          text: '',
        };
        createdLineId = newLine.id;

        const updatedSections = sections.map((sec) => {
          if (sec.id !== targetSecId) return sec;
          const lines = [...sec.lines];
          if (resolvedLineIdx !== undefined && resolvedLineIdx >= -1 && resolvedLineIdx < lines.length) {
            lines.splice(resolvedLineIdx + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
          return { ...sec, lines };
        });

        return { ...doc, sections: updatedSections };
      });
      if (createdLineId) {
        setEditingLineId(createdLineId);
      }
    },
    [updateDoc]
  );

  const handleAddInterludeLine = useCallback(
    (sectionId?: string, afterLineIdx?: number, initialLabel?: string, initialDurationSec?: number) => {
      let createdLineId = '';
      updateDoc((doc) => {
        let targetSecId = sectionId;
        let resolvedLineIdx = afterLineIdx;
        let sections = [...doc.sections];

        if (sections.length === 0) {
          const newSec: SongLyricSection = {
            id: generateLyricId('sec'),
            type: 'custom',
            name: '',
            lines: [],
          };
          sections = [newSec];
          targetSecId = newSec.id;
          resolvedLineIdx = undefined;
        } else if (!targetSecId) {
          // 1. Try active position tracking
          if (lastActivePositionRef.current) {
            const secExists = sections.some((s) => s.id === lastActivePositionRef.current!.sectionId);
            if (secExists) {
              targetSecId = lastActivePositionRef.current.sectionId;
              if (resolvedLineIdx === undefined) {
                resolvedLineIdx = lastActivePositionRef.current.lineIndex;
              }
            }
          }
          // 2. Try active selection
          if (!targetSecId && activeSelectionRef.current) {
            const secExists = sections.some((s) => s.id === activeSelectionRef.current!.sectionId);
            if (secExists) {
              targetSecId = activeSelectionRef.current.sectionId;
              if (resolvedLineIdx === undefined) {
                const targetSec = sections.find((s) => s.id === targetSecId);
                const lIdx = targetSec?.lines.findIndex((l) => l.id === activeSelectionRef.current!.lineId);
                if (lIdx !== undefined && lIdx >= 0) {
                  resolvedLineIdx = lIdx;
                }
              }
            }
          }
          // 3. Try editingLineId
          if (!targetSecId && editingLineId) {
            for (const s of sections) {
              const lIdx = s.lines.findIndex((l) => l.id === editingLineId);
              if (lIdx >= 0) {
                targetSecId = s.id;
                if (resolvedLineIdx === undefined) {
                  resolvedLineIdx = lIdx;
                }
                break;
              }
            }
          }
          // 4. Fallback: last section
          if (!targetSecId) {
            targetSecId = sections[sections.length - 1].id;
          }
        }

        const durMs = Math.max(1000, Math.min(600000, (initialDurationSec ? initialDurationSec * 1000 : 15000)));
        const newLine: SongLyricLine = {
          id: generateLyricId('line'),
          type: 'interlude',
          text: initialLabel || '(Solo)',
          explicitDurationMs: durMs,
        };
        createdLineId = newLine.id;

        const updatedSections = sections.map((sec) => {
          if (sec.id !== targetSecId) return sec;
          const lines = [...sec.lines];
          if (resolvedLineIdx !== undefined && resolvedLineIdx >= -1 && resolvedLineIdx < lines.length) {
            lines.splice(resolvedLineIdx + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
          return { ...sec, lines };
        });

        return { ...doc, sections: updatedSections };
      });

      if (createdLineId) {
        setEditingLineId(null);
      }
    },
    [updateDoc, editingLineId]
  );

  const handleUpdateInterludeDuration = useCallback(
    (sectionId: string, lineId: string, sec: number) => {
      const clampedSec = Math.max(1, Math.min(600, Math.round(sec)));
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                lines: s.lines.map((l) =>
                  l.id === lineId
                    ? { ...l, explicitDurationMs: clampedSec * 1000 }
                    : l
                ),
              }
            : s
        ),
      }));
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
      // If there are lines, pick the first line at start
      const firstSec = currentDoc.sections[0];
      const firstLine = firstSec?.lines[0];
      if (firstSec && firstLine) {
        setChordPickerTarget({
          sectionId: firstSec.id,
          lineId: firstLine.id,
          offset: 0,
          wordText: firstLine.text.split(' ')[0] || 'line start',
        });
        setChordSearchQuery('');
        setChordRootFilter('All');
        setChordTypeFilter('all');
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
      wordText: sel.text,
    });
    setChordSearchQuery('');
    setChordRootFilter('All');
    setChordTypeFilter('all');
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
              // Cleanly replace any existing chord at the exact same character offset
              const chords = (line.chords || []).filter((c) => c.offset !== offset);
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

  const handleMoveChord = useCallback(
    (sectionId: string, lineId: string, chordId: string, newOffset: number) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            lines: sec.lines.map((line) => {
              if (line.id !== lineId) return line;
              const chords = (line.chords || []).map((c) =>
                c.id === chordId ? { ...c, offset: Math.max(0, newOffset) } : c
              );
              chords.sort((a, b) => a.offset - b.offset);
              return { ...line, chords };
            }),
          };
        }),
      }));
      setSelectedChordForEdit((prev) =>
        prev && prev.chord.id === chordId
          ? { ...prev, chord: { ...prev.chord, offset: Math.max(0, newOffset) } }
          : prev
      );
      toast.success(`Moved to pos ${newOffset}`);
    },
    [updateDoc]
  );

  const handleReplaceChord = useCallback(
    (sectionId: string, lineId: string, chordId: string, newChordSymbol: string) => {
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            lines: sec.lines.map((line) => {
              if (line.id !== lineId) return line;
              const chords = (line.chords || []).map((c) =>
                c.id === chordId ? { ...c, chord: newChordSymbol } : c
              );
              return { ...line, chords };
            }),
          };
        }),
      }));
      setSelectedChordForEdit((prev) =>
        prev && prev.chord.id === chordId
          ? { ...prev, chord: { ...prev.chord, chord: newChordSymbol } }
          : prev
      );
      toast.success(`Chord changed to [${newChordSymbol}]`);
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

  // Combined chords list for quick alternatives
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

  // Canonical Chordex Chords
  const allCanonicalChords = useMemo(() => getAllChords(), []);

  // Quick Chords for the compact toolbar popover (Song chords first, then core essentials - max 10 total)
  const quickChords = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const formatChord = (raw: string) => {
      if (raw.includes('-min-')) return raw.replace(/^[a-z]/, (m) => m.toUpperCase()).replace('-min-1', 'm').replace('-min-', 'm');
      if (raw.includes('-maj-')) return raw.replace(/^[a-z]/, (m) => m.toUpperCase()).replace('-maj-1', '').replace('-maj-', '');
      return raw;
    };

    // 1. Song chords first
    availableChords.forEach((c) => {
      const formatted = formatChord(c).trim();
      if (formatted && !seen.has(formatted)) {
        seen.add(formatted);
        list.push(formatted);
      }
    });

    // 2. Common core essentials
    const coreEssentials = ['C', 'G', 'D', 'Em', 'Am', 'F', 'A', 'E', 'Bm', 'C7', 'G7'];
    for (const c of coreEssentials) {
      if (!seen.has(c) && list.length < 10) {
        seen.add(c);
        list.push(c);
      }
    }

    return list;
  }, [availableChords]);

  // Filtered Chords for the Full Library Modal
  const filteredLibraryChords = useMemo(() => {
    let list = allCanonicalChords;

    // Search query
    if (chordSearchQuery.trim()) {
      const q = chordSearchQuery.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.root.toLowerCase() === q ||
        c.notes.some((n) => n.toLowerCase().includes(q))
      );
    }

    // Root note
    if (chordRootFilter !== 'All') {
      list = list.filter((c) => c.root === chordRootFilter);
    }

    // Category / Quality
    if (chordTypeFilter !== 'all') {
      list = list.filter((c) => {
        if (chordTypeFilter === 'major') return c.type === 'major';
        if (chordTypeFilter === 'minor') return c.type === 'minor';
        if (chordTypeFilter === '7th') return c.type === '7th';
        if (chordTypeFilter === 'maj7') return c.type === 'maj7';
        if (chordTypeFilter === 'min7') return c.type === 'min7';
        if (chordTypeFilter === 'sus') return c.type.includes('sus');
        if (chordTypeFilter === 'add9') return c.type.includes('9') || c.type.includes('add');
        if (chordTypeFilter === 'dim') return c.type.includes('dim') || c.type.includes('aug');
        return true;
      });
    }

    return list;
  }, [allCanonicalChords, chordSearchQuery, chordRootFilter, chordTypeFilter]);

  return (
    <div
      data-testid="song-lyrics-editor-workspace"
      className="flex flex-col w-full relative select-text"
      style={{
        color: 'var(--c-text-primary, #ffffff)',
        fontFamily: 'var(--studio-font-body, var(--font-body))',
      }}
    >
      {/* ── 1. FREEFORM WRITING CANVAS (TELEPROMPTER SCRIPT STYLE) ───── */}
      <main
        className="flex flex-col gap-4 outline-none w-full"
        style={{
          paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 120px)',
        }}
        data-purpose="teleprompter-writing-canvas"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setEditingLineId(null);
          }
        }}
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

                    {/* Add Interlude to Section Header */}
                    <button
                      type="button"
                      onClick={() => {
                        setLastActivePosition(section.id, -1);
                        handleAddInterludeLine(section.id, -1);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer active:scale-95 hover:bg-sky-500/10 text-sky-400 border-sky-500/20"
                      title="Insert Timed Interlude at start of this section"
                      aria-label="Insert timed interlude at start of this section"
                      data-testid={`section-add-interlude-${secIdx}`}
                    >
                      <span className="material-symbols-rounded text-[11px]">timer</span>
                      <span>+ Interlude</span>
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
                  if (line.type === 'interlude') {
                    const durSec = Math.round((line.explicitDurationMs || 0) / 1000);
                    return (
                      <div
                        key={line.id || lineIdx}
                        data-testid={`lyric-line-interlude-${section.id}-${lineIdx}`}
                        onClick={() => setLastActivePosition(section.id, lineIdx, line.id)}
                        className="group/line relative flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-2xl transition-all border my-2 shadow-xs"
                        style={{
                          backgroundColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.08)',
                          borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.30)',
                        }}
                      >
                        {/* Top row: Icon, Label Input, Duration Pill, Delete Button */}
                        <div className="flex items-center justify-between gap-2.5 flex-wrap">
                          <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.22)',
                                color: isEffectiveLight ? '#2563eb' : '#60a5fa',
                              }}
                            >
                              <span className="material-symbols-rounded text-lg">hourglass_bottom</span>
                            </div>

                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={line.text}
                                onFocus={() => setLastActivePosition(section.id, lineIdx, line.id)}
                                onChange={(e) => {
                                  setLastActivePosition(section.id, lineIdx, line.id);
                                  handleUpdateLineText(section.id, line.id, e.target.value);
                                }}
                                placeholder="Event Label (e.g. Solo)"
                                aria-label="Interlude event label"
                                data-testid={`interlude-label-input-${lineIdx}`}
                                className="bg-transparent border-0 border-b outline-none text-sm font-bold pb-0.5 w-36 sm:w-44 transition-colors"
                                style={{
                                  color: isEffectiveLight ? '#1d4ed8' : '#93c5fd',
                                  borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.45)',
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Formatted live duration indicator badge */}
                            <div
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border shadow-2xs"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.10)' : 'rgba(59, 130, 246, 0.18)',
                                borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.35)',
                              }}
                            >
                              <span className="material-symbols-rounded text-xs" style={{ color: isEffectiveLight ? '#2563eb' : '#60a5fa' }}>
                                timer
                              </span>
                              <span
                                data-testid={`interlude-dur-display-${lineIdx}`}
                                className="text-xs font-black font-mono"
                                style={{ color: isEffectiveLight ? '#1d4ed8' : '#93c5fd' }}
                              >
                                {durSec}s
                              </span>
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLine(section.id, line.id);
                              }}
                              aria-label="Remove interlude event"
                              data-testid={`interlude-delete-btn-${lineIdx}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-rose-500/10 active:scale-95"
                              style={{
                                color: isEffectiveLight ? '#e11d48' : '#fb7185',
                              }}
                              title="Remove Interlude"
                            >
                              <span className="material-symbols-rounded text-lg">close</span>
                            </button>
                          </div>
                        </div>

                        {/* Middle row: Label quick preset chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                            style={{ color: isEffectiveLight ? '#64748b' : '#94a3b8' }}
                          >
                            Preset:
                          </span>
                          {INTERLUDE_PRESET_LABELS.map((presetLabel) => {
                            const isSelected = line.text.trim().toLowerCase() === presetLabel.toLowerCase();
                            return (
                              <button
                                key={presetLabel}
                                type="button"
                                data-testid={`interlude-label-chip-${presetLabel}-${lineIdx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLastActivePosition(section.id, lineIdx, line.id);
                                  handleUpdateLineText(section.id, line.id, presetLabel);
                                }}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                style={{
                                  backgroundColor: isSelected
                                    ? isEffectiveLight ? '#2563eb' : '#3b82f6'
                                    : isEffectiveLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                                  color: isSelected ? '#ffffff' : isEffectiveLight ? '#334155' : '#cbd5e1',
                                  border: isSelected
                                    ? '1px solid transparent'
                                    : isEffectiveLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                                }}
                              >
                                {presetLabel}
                              </button>
                            );
                          })}
                        </div>

                        {/* Bottom row: Stepper controls & Quick duration preset chips */}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5 flex-wrap">
                          {/* Duration Stepper Controls */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs font-bold uppercase tracking-wider mr-1"
                              style={{ color: isEffectiveLight ? '#475569' : '#94a3b8' }}
                            >
                              Duration:
                            </span>

                            {/* Stepper Down [-] */}
                            <button
                              type="button"
                              data-testid={`interlude-dec-btn-${lineIdx}`}
                              aria-label="Decrease interlude duration"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLastActivePosition(section.id, lineIdx, line.id);
                                handleUpdateInterludeDuration(section.id, line.id, Math.max(1, durSec - 1));
                              }}
                              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm transition-all cursor-pointer hover:bg-white/10 active:scale-90"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                border: isEffectiveLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                                color: isEffectiveLight ? '#0f172a' : '#ffffff',
                              }}
                              title="Decrease 1s"
                            >
                              −
                            </button>

                            {/* Direct numeric input */}
                            <input
                              type="number"
                              min={1}
                              max={600}
                              value={durSec}
                              aria-label="Interlude duration in seconds"
                              data-testid={`interlude-dur-input-${lineIdx}`}
                              onFocus={() => setLastActivePosition(section.id, lineIdx, line.id)}
                              onChange={(e) => {
                                setLastActivePosition(section.id, lineIdx, line.id);
                                const sec = parseInt(e.target.value, 10);
                                if (!isNaN(sec) && sec >= 0) {
                                  handleUpdateInterludeDuration(section.id, line.id, sec);
                                }
                              }}
                              className="rounded-md px-2 py-1 text-sm font-mono font-bold w-14 outline-none text-center shadow-xs transition-colors"
                              style={{
                                backgroundColor: isEffectiveLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                                border: isEffectiveLight ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.16)',
                                color: isEffectiveLight ? '#0f172a' : '#ffffff',
                              }}
                            />

                            {/* Stepper Up [+] */}
                            <button
                              type="button"
                              data-testid={`interlude-inc-btn-${lineIdx}`}
                              aria-label="Increase interlude duration"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLastActivePosition(section.id, lineIdx, line.id);
                                handleUpdateInterludeDuration(section.id, line.id, Math.min(600, durSec + 1));
                              }}
                              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm transition-all cursor-pointer hover:bg-white/10 active:scale-90"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                border: isEffectiveLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                                color: isEffectiveLight ? '#0f172a' : '#ffffff',
                              }}
                              title="Increase 1s"
                            >
                              +
                            </button>

                            <span
                              className="text-xs font-mono font-semibold ml-0.5"
                              style={{ color: isEffectiveLight ? '#64748b' : '#94a3b8' }}
                            >
                              sec
                            </span>
                          </div>

                          {/* Quick Duration Preset Chips */}
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                            {INTERLUDE_PRESET_DURATIONS.map((presetSec) => {
                              const isSelected = durSec === presetSec;
                              return (
                                <button
                                  key={presetSec}
                                  type="button"
                                  data-testid={`interlude-chip-${presetSec}s-${lineIdx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLastActivePosition(section.id, lineIdx, line.id);
                                    handleUpdateInterludeDuration(section.id, line.id, presetSec);
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                  style={{
                                    backgroundColor: isSelected
                                      ? isEffectiveLight ? '#2563eb' : '#3b82f6'
                                      : isEffectiveLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                                    color: isSelected ? '#ffffff' : isEffectiveLight ? '#334155' : '#cbd5e1',
                                    border: isSelected
                                      ? '1px solid transparent'
                                      : isEffectiveLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  {presetSec}s
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const resolvedColor =
                    line.format?.color || documentColor || 'var(--c-text-primary, #ffffff)';
                  const isLineBold = Boolean(line.format?.bold);
                  const hasChords = Boolean(line.chords && line.chords.length > 0);
                  const isLineEditing = editingLineId === line.id;
                  const segments = splitLineIntoSegments(line.text, line.chords);

                  return (
                    <div
                      key={line.id || lineIdx}
                      data-testid={`lyric-line-${section.id}-${lineIdx}`}
                      onClick={() => setLastActivePosition(section.id, lineIdx, line.id)}
                      className="group/line relative flex flex-col py-1.5 px-2.5 rounded-xl transition-all hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {isLineEditing ? (
                          /* Direct Text Typing Input */
                          <div className="flex-1 flex flex-col">
                            {hasChords && (
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5 select-none text-[11px] font-mono">
                                {line.chords!.map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-1.5 py-0.5 rounded font-bold border border-sky-500/30 bg-sky-500/10 text-sky-400"
                                  >
                                    {c.chord} (pos {c.offset})
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                data-testid="active-line-input"
                                value={line.text}
                                autoFocus={editingLineId === line.id}
                                onFocus={() => setLastActivePosition(section.id, lineIdx, line.id)}
                                onChange={(e) => {
                                  setLastActivePosition(section.id, lineIdx, line.id);
                                  handleUpdateLineText(section.id, line.id, e.target.value);
                                }}
                                onBlur={() => {
                                  setEditingLineId(null);
                                }}
                                onSelect={(e) => {
                                  const target = e.target as HTMLInputElement;
                                  setActiveSelection({
                                    sectionId: section.id,
                                    lineId: line.id,
                                    start: target.selectionStart ?? 0,
                                    end: target.selectionEnd ?? 0,
                                    text: line.text,
                                  });
                                  setLastActivePosition(section.id, lineIdx, line.id);
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
                                  } else if (e.key === 'Escape') {
                                    setEditingLineId(null);
                                  }
                                }}
                                placeholder={isLyricsEmpty ? 'Type or paste lyrics...' : 'Type line text...'}
                                className="flex-1 bg-transparent border-0 border-b border-white/20 focus:border-white/40 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 text-base leading-relaxed tracking-wide pb-0.5"
                                style={{
                                  outline: 'none',
                                  boxShadow: 'none',
                                  borderTop: 'none',
                                  borderLeft: 'none',
                                  borderRight: 'none',
                                  borderBottom: isEffectiveLight ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid rgba(255, 255, 255, 0.25)',
                                  borderRadius: 0,
                                  color: resolvedColor,
                                  fontWeight: isLineBold ? 800 : 500,
                                  fontFamily: 'inherit',
                                }}
                              />
                            </div>
                          </div>
                        ) : line.text === '' ? (
                          /* Subtle placeholder for empty lines not in active editing mode */
                          <div
                            className="flex-1 py-1 cursor-pointer"
                            onClick={() => {
                              setLastActivePosition(section.id, lineIdx, line.id);
                              if (isEditMode && activeColorTool === null) {
                                setEditingLineId(line.id);
                              }
                            }}
                          >
                            <span className="text-gray-500/50 italic text-sm select-none">
                              {isEditMode ? 'Tap to write line...' : 'Empty line'}
                            </span>
                          </div>
                        ) : (
                          /* Responsive Word-Segment Surface with Ruby Chord Alignment */
                          <div
                            className="flex-1 flex flex-wrap items-end gap-x-1 gap-y-2 select-text cursor-pointer"
                            title={isEditMode ? 'Tap to edit line' : "Tap 'Edit' in toolbar to edit text"}
                            onClick={() => {
                              setLastActivePosition(section.id, lineIdx, line.id);
                              if (isEditMode && activeColorTool === null) {
                                setEditingLineId(line.id);
                              }
                            }}
                          >
                            {segments.map((seg, sIdx) => {
                              const segWords = findWordBoundaries(seg.text);

                              return (
                                <div
                                  key={seg.id || sIdx}
                                  className="inline-flex flex-col items-start align-bottom"
                                >
                                  {/* Placed Chord Chip */}
                                  {seg.chord ? (
                                    <div className="flex items-center gap-0.5 select-none mb-1">
                                      <button
                                        type="button"
                                        data-testid={`placed-chord-${seg.chord.chord}`}
                                        data-chord-id={seg.chord.id}
                                        data-chord-offset={seg.chord.offset}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedChordForEdit({
                                            sectionId: section.id,
                                            lineId: line.id,
                                            chord: seg.chord!,
                                          });
                                        }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-extrabold border transition-all cursor-pointer active:scale-95 shadow-2xs hover:brightness-110"
                                        style={{
                                          backgroundColor: isEffectiveLight
                                            ? 'rgba(37, 99, 235, 0.10)'
                                            : 'rgba(56, 189, 248, 0.18)',
                                          borderColor: isEffectiveLight
                                            ? 'rgba(37, 99, 235, 0.35)'
                                            : 'rgba(56, 189, 248, 0.40)',
                                          color: isEffectiveLight ? '#1d4ed8' : '#38bdf8',
                                        }}
                                        title="Tap to move or replace chord"
                                      >
                                        <span>{seg.chord.chord}</span>
                                        <span
                                          className="text-[10px] opacity-40 hover:opacity-100 hover:text-rose-400 font-sans ml-0.5 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveChordFromLine(section.id, line.id, seg.chord!.id);
                                          }}
                                          title="Quick remove"
                                        >
                                          ×
                                        </span>
                                      </button>
                                    </div>
                                  ) : hasChords ? (
                                    /* Spacer keeping text baselines aligned */
                                    <div className="h-[23px] mb-1 select-none pointer-events-none" />
                                  ) : null}

                                  {/* Segment Words / Text */}
                                  <div className="inline-flex items-center flex-wrap">
                                    {segWords.length > 0 ? (
                                      segWords.map((w, wIdx) => {
                                        const globalStart = seg.startOffset + w.start;
                                        const globalEnd = seg.startOffset + w.end;
                                        const spanColor = getCharacterColor(line.spans, globalStart);
                                        const spanBold = getCharacterBold(line.spans, globalStart);
                                        const wordColor = spanColor || resolvedColor;
                                        const wordBold = isLineBold || spanBold;
                                        const isWordTargeted =
                                          activeSelection?.lineId === line.id &&
                                          activeSelection?.start === globalStart;

                                        return (
                                          <React.Fragment key={wIdx}>
                                            <span
                                              data-testid={`lyric-word-${w.word}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (activeColorTool !== null) {
                                                  // Apply active color tool to this word
                                                  updateDoc((doc) => ({
                                                    ...doc,
                                                    sections: doc.sections.map((sec) => {
                                                      if (sec.id !== section.id) return sec;
                                                      return {
                                                        ...sec,
                                                        lines: sec.lines.map((l) => {
                                                          if (l.id !== line.id) return l;
                                                          const nextSpans = setColorOnSelection(
                                                            l.spans,
                                                            l.text,
                                                            globalStart,
                                                            globalEnd,
                                                            activeColorTool
                                                          );
                                                          return { ...l, spans: nextSpans };
                                                        }),
                                                      };
                                                    }),
                                                  }));
                                                } else {
                                                  // Target this word for chord insertion and open line edit mode
                                                  setActiveSelection({
                                                    sectionId: section.id,
                                                    lineId: line.id,
                                                    start: globalStart,
                                                    end: globalEnd,
                                                    text: w.word,
                                                  });
                                                  setEditingLineId(line.id);
                                                }
                                              }}
                                              onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingLineId(line.id);
                                              }}
                                              className="cursor-pointer rounded px-0.5 transition-all hover:bg-white/10"
                                              style={{
                                                color: wordColor,
                                                fontWeight: wordBold ? 800 : 500,
                                                fontFamily: 'inherit',
                                              }}
                                              title={activeColorTool !== null ? `Tap to color [${w.word}]` : `Target "${w.word}" for chord`}
                                            >
                                              {w.word}
                                            </span>
                                            {/* Space after word if not last */}
                                            {wIdx < segWords.length - 1 && <span>&nbsp;</span>}
                                          </React.Fragment>
                                        );
                                      })
                                    ) : (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (activeColorTool !== null) {
                                            updateDoc((doc) => ({
                                              ...doc,
                                              sections: doc.sections.map((sec) => {
                                                if (sec.id !== section.id) return sec;
                                                return {
                                                  ...sec,
                                                  lines: sec.lines.map((l) => {
                                                    if (l.id !== line.id) return l;
                                                    const nextSpans = setColorOnSelection(
                                                      l.spans,
                                                      l.text,
                                                      seg.startOffset,
                                                      seg.endOffset,
                                                      activeColorTool
                                                    );
                                                    return { ...l, spans: nextSpans };
                                                  }),
                                                };
                                              }),
                                            }));
                                          } else {
                                            setActiveSelection({
                                              sectionId: section.id,
                                              lineId: line.id,
                                              start: seg.startOffset,
                                              end: seg.endOffset,
                                              text: seg.text,
                                            });
                                            setEditingLineId(line.id);
                                          }
                                        }}
                                        className="whitespace-pre cursor-pointer hover:bg-white/10 rounded px-0.5"
                                        style={{
                                          color: getCharacterColor(line.spans, seg.startOffset) || resolvedColor,
                                          fontWeight: isLineBold || getCharacterBold(line.spans, seg.startOffset) ? 800 : 500,
                                          fontFamily: 'inherit',
                                        }}
                                      >
                                        {seg.text || '\u00A0'}
                                      </span>
                                    )}
                                    {/* Trailing space if segment ends with whitespace */}
                                    {seg.text.endsWith(' ') && <span>&nbsp;</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Line Vocal Role badge (No permanent edit pencil!) */}
                        {line.vocalRole && (
                          <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
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
                          </div>
                        )}

                        {/* Inline Actions (Add Interlude after this line) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity flex-shrink-0 self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLastActivePosition(section.id, lineIdx, line.id);
                              handleAddInterludeLine(section.id, lineIdx);
                            }}
                            title="Insert timed interlude after this line"
                            aria-label={`Insert interlude after line ${lineIdx + 1}`}
                            data-testid={`insert-interlude-after-${lineIdx}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/20 transition-all cursor-pointer active:scale-95"
                          >
                            <span className="material-symbols-rounded text-xs">timer</span>
                            <span>+ Interlude</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── ACTIVE COLOR TOOL BANNER (BRUSH MODE) ── */}
        {activeColorTool !== null && (
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md self-center my-2 shadow-sm pointer-events-auto"
            style={{
              backgroundColor: isEffectiveAmoled ? 'rgba(12,12,14,0.94)' : 'rgba(22,22,26,0.94)',
              borderColor: activeColorTool || '#3b82f6',
              color: '#ffffff',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeColorTool || '#94a3b8' }}
            />
            <span>Color tool active — tap words to paint</span>
            <button
              type="button"
              onClick={() => {
                setActiveColorTool(null);
                toast.info('Color tool exited');
              }}
              className="ml-1 text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/10 cursor-pointer"
            >
              ✕ Exit
            </button>
          </div>
        )}

        {/* ── DOCUMENT-FLOW BOTTOM TOOLBAR ── */}
        {(() => {
          const dockContent = (
            <aside
              ref={dockRef}
              aria-label="Song Both editor toolbar"
              data-testid="both-editing-bottom-dock"
              data-purpose="both-editing-bottom-dock"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto select-none"
              style={{
                position: 'fixed',
                bottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
                left: '50%',
                transform: 'translateX(-50%) translateZ(0)',
                willChange: 'transform, backdrop-filter',
                zIndex: 45,
                width: 'fit-content',
                maxWidth: 'calc(100vw - 32px)',
                backgroundColor: dockBg,
                borderColor: dockBorder,
                boxShadow: dockShadow,
                backdropFilter: 'var(--surface-topbar-backdrop)',
                WebkitBackdropFilter: 'var(--surface-topbar-backdrop)',
                pointerEvents: 'auto',
              }}
            >
              {/* ── LEFT CLUSTER: Direct high-frequency actions (Edit toggle, Undo, Redo, Paste) ── */}
          <div className="flex items-center gap-1">
            {/* Edit / Read-Only Mode Toggle */}
            <button
              type="button"
              data-testid="toolbar-edit-toggle-btn"
              data-action="both-toolbar-edit-toggle-btn"
              onClick={() => {
                setActivePopover(null);
                if (isEditMode) {
                  setIsEditMode(false);
                  setEditingLineId(null);
                  toast.success('Read-only mode active');
                } else {
                  setIsEditMode(true);
                  toast.info('Edit mode active: tap any line to type');
                }
              }}
              aria-label={isEditMode ? 'Done editing' : 'Edit lyrics'}
              title={isEditMode ? 'Done editing' : 'Edit lyrics'}
              className="px-2.5 h-9 rounded-full flex items-center justify-center gap-1 transition active:scale-90 cursor-pointer font-bold text-xs"
              style={{
                backgroundColor: isEditMode
                  ? accent.from
                  : isEffectiveLight
                    ? 'rgba(0,0,0,0.04)'
                    : 'rgba(255,255,255,0.06)',
                color: isEditMode
                  ? '#ffffff'
                  : 'var(--c-text-primary, #ffffff)',
                border: isEditMode ? 'none' : '1px solid var(--c-border, transparent)',
                boxShadow: isEditMode ? `0 2px 8px ${accent.to}44` : 'none',
              }}
            >
              <span className="material-symbols-rounded text-base">
                {isEditMode ? 'check' : 'edit'}
              </span>
              <span>{isEditMode ? 'Done' : 'Edit'}</span>
            </button>

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
                    ...(popoverPlacement === 'bottom'
                      ? { top: 'calc(100% + 14px)' }
                      : { bottom: 'calc(100% + 14px)' }),
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
                        Insert Chord
                      </span>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${accent.from}22`, color: accent.from }}
                    >
                      {activeSelection ? `"${activeSelection.text}" @ ${activeSelection.start}` : 'At Line Start'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-snug">
                    Select chord to insert into active lyrics line:
                  </p>

                  {/* Quick Chords Grid */}
                  <div className="grid grid-cols-5 gap-1.5 py-1">
                    {quickChords.map((chord) => {
                      const isSongChord = availableChords.includes(chord);
                      return (
                        <button
                          key={chord}
                          type="button"
                          data-testid={`quick-chord-${chord}`}
                          onClick={() => {
                            const sel = activeSelectionRef.current;
                            let targetSecId: string;
                            let targetLId: string;
                            let targetOffset: number;
                            let label: string;

                            if (sel) {
                              targetSecId = sel.sectionId;
                              targetLId = sel.lineId;
                              targetOffset = sel.start;
                              label = `"${sel.text}"`;
                            } else if (currentDoc.sections.length > 0 && currentDoc.sections[0].lines.length > 0) {
                              const firstSec = currentDoc.sections[0];
                              const firstLine = firstSec.lines[0];
                              targetSecId = firstSec.id;
                              targetLId = firstLine.id;
                              targetOffset = 0;
                              label = 'line start';
                            } else {
                              toast.info('Type a lyric line first to attach chords');
                              return;
                            }

                            handleAddChordToLine(targetSecId, targetLId, chord, targetOffset);
                            toast.success(`Attached [${chord}] over ${label}`);
                            setActivePopover(null);
                          }}
                          className="h-8 px-2 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer border relative"
                          style={{
                            backgroundColor: isSongChord
                              ? `${accent.from}28`
                              : isEffectiveLight
                                ? 'rgba(0,0,0,0.04)'
                                : 'rgba(255,255,255,0.05)',
                            borderColor: isSongChord
                              ? `${accent.from}66`
                              : isEffectiveLight
                                ? 'rgba(0,0,0,0.12)'
                                : 'rgba(255,255,255,0.1)',
                            color: isSongChord
                              ? accent.from
                              : isEffectiveLight
                                ? '#0f172a'
                                : 'var(--c-text-primary)',
                          }}
                          title={isSongChord ? `Song Chord: ${chord}` : chord}
                        >
                          <span>{chord}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      data-testid="toolbar-chord-btn"
                      onClick={() => {
                        setActivePopover(null);
                        handleOpenChordPicker();
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: `${accent.from}15`,
                        borderColor: `${accent.from}40`,
                        color: accent.from,
                      }}
                    >
                      <span className="material-symbols-rounded text-base">library_music</span>
                      <span>Browse Full Library...</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The Dominant Center FAB */}
            <button
              type="button"
              data-testid="both-toolbar-chords-btn"
              onClick={() => togglePopover('chords')}
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

          {/* ── RIGHT CLUSTER: Text Color, Roles, More ── */}
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
                      ...(popoverPlacement === 'bottom'
                        ? { top: 'calc(100% + 14px)' }
                        : { bottom: 'calc(100% + 14px)' }),
                      right: -24,
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
                        Text Color Tool
                      </span>
                      {activeColorTool !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveColorTool(null);
                            setActivePopover(null);
                            toast.info('Color tool exited');
                          }}
                          className="text-[10px] text-gray-400 hover:text-white cursor-pointer"
                        >
                          Exit Tool
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      Choose a color to activate the brush, then tap any word in the lyrics to paint it:
                    </p>

                    {/* Color Palette */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_PALETTE.map((c) => {
                        const isSelected = activeColorTool === (c.value || '');
                        return (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => {
                              const newColor = c.value || '';
                              setActiveColorTool(newColor);
                              setActivePopover(null);
                              if (activeSelection && activeSelection.start !== activeSelection.end) {
                                handleFormatColor(newColor);
                              }
                              if (newColor) {
                                toast.success(`Color tool active: tap words to apply ${c.label}`);
                              } else {
                                toast.info('Color reset tool active: tap words to reset color');
                              }
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-transform active:scale-90 cursor-pointer ${
                              isSelected ? 'ring-2 ring-blue-500 scale-105' : ''
                            }`}
                            style={{
                              backgroundColor: c.value || 'transparent',
                              borderColor: isSelected
                                ? '#3b82f6'
                                : isEffectiveLight
                                  ? 'rgba(0,0,0,0.15)'
                                  : 'rgba(255,255,255,0.2)',
                            }}
                            title={c.label}
                          >
                            {!c.value && (
                              <span className="material-symbols-rounded text-xs text-gray-400">format_color_reset</span>
                            )}
                            {isSelected && c.value && (
                              <span
                                className="material-symbols-rounded text-xs"
                                style={{ color: c.value === '#ffffff' ? '#000000' : '#ffffff' }}
                              >
                                check
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Bold Toggle */}
                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        data-testid="toolbar-bold-btn"
                        onClick={() => {
                          handleFormatBold();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer hover:bg-white/5"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderColor: 'var(--c-border, rgba(255,255,255,0.12))',
                          color: 'var(--c-text-primary, #ffffff)',
                        }}
                      >
                        <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center font-black text-xs">
                          B
                        </span>
                        <span>Toggle Bold</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                data-testid="toolbar-color-btn"
                data-action="both-toolbar-style-btn"
                onClick={() => togglePopover('style')}
                aria-label="Text Color and Styling"
                title={activeColorTool !== null ? 'Color tool active (tap to change/exit)' : 'Text Color'}
                className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer relative after:absolute after:-inset-1.5 after:content-['']"
                style={{
                  backgroundColor:
                    activeColorTool !== null
                      ? `${activeColorTool || '#3b82f6'}28`
                      : activePopover === 'style'
                        ? isEffectiveLight
                          ? 'rgba(0,0,0,0.12)'
                          : 'rgba(255,255,255,0.18)'
                        : isEffectiveLight
                          ? 'rgba(0,0,0,0.04)'
                          : 'rgba(255,255,255,0.06)',
                  border: activeColorTool !== null ? `1.5px solid ${activeColorTool || '#3b82f6'}` : 'none',
                  color: activeColorTool || documentColor || (isEffectiveLight ? '#334155' : '#cbd5e1'),
                }}
              >
                <span className="material-symbols-rounded text-lg">palette</span>
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
                      ...(popoverPlacement === 'bottom'
                        ? { top: 'calc(100% + 14px)' }
                        : { bottom: 'calc(100% + 14px)' }),
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
                onClick={() => togglePopover('roles')}
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
                      ...(popoverPlacement === 'bottom'
                        ? { top: 'calc(100% + 14px)' }
                        : { bottom: 'calc(100% + 14px)' }),
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

                    {/* Toggle Edit Mode */}
                    <button
                      type="button"
                      data-testid="toolbar-more-edit-toggle-btn"
                      onClick={() => {
                        if (isEditMode) {
                          setIsEditMode(false);
                          setEditingLineId(null);
                          toast.success('Read-only mode active');
                        } else {
                          setIsEditMode(true);
                          toast.info('Edit mode active: tap any line to type');
                        }
                        setActivePopover(null);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5 text-left"
                      style={{ color: isEditMode ? accent.from : 'var(--c-text-primary)' }}
                    >
                      <span className="material-symbols-rounded text-base" style={{ color: isEditMode ? accent.from : 'var(--c-text-secondary)' }}>
                        {isEditMode ? 'check_circle' : 'edit_note'}
                      </span>
                      <span>{isEditMode ? 'Exit Edit Mode (Done)' : 'Enter Edit Mode'}</span>
                    </button>

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


                    {/* Add Interlude */}
                    <button
                      type="button"
                      data-testid="toolbar-add-interlude-btn"
                      onClick={() => {
                        handleAddInterludeLine();
                        setActivePopover(null);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer hover:bg-white/5 text-left"
                      style={{ color: 'var(--c-text-primary)' }}
                    >
                      <span className="material-symbols-rounded text-base text-gray-400">timer</span>
                      <span>+ Add Timed Interlude</span>
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
                onClick={() => togglePopover('more')}
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
          );
          return typeof document !== 'undefined' ? createPortal(dockContent, document.body) : dockContent;
        })()}
      </main>

      {/* ── DIALOG: REPOSITION / REPLACE / REMOVE CHORD ── */}
      <Dialog
        open={Boolean(selectedChordForEdit)}
        onClose={() => setSelectedChordForEdit(null)}
        title={`Chord: [${selectedChordForEdit?.chord.chord}]`}
      >
        {selectedChordForEdit && (() => {
          const currentLine = currentDoc.sections
            .find((s) => s.id === selectedChordForEdit.sectionId)
            ?.lines.find((l) => l.id === selectedChordForEdit.lineId);
          const lineText = currentLine?.text || '';
          const currentOffset = selectedChordForEdit.chord.offset;
          const prevOffset = getAdjacentWordOffset(lineText, currentOffset, 'prev');
          const nextOffset = getAdjacentWordOffset(lineText, currentOffset, 'next');

          return (
            <div className="flex flex-col gap-4 py-1" data-testid="chord-reposition-dialog">
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-sm font-mono font-black"
                    style={{
                      background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                      color: '#ffffff',
                    }}
                  >
                    {selectedChordForEdit.chord.chord}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      Placed at character offset {currentOffset}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Nearby: &ldquo;{lineText.slice(Math.max(0, currentOffset - 4), Math.min(lineText.length, currentOffset + 14))}&rdquo;
                    </span>
                  </div>
                </div>
              </div>

              {/* Repositioning controls */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Reposition in Line
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="chord-move-prev-btn"
                    onClick={() => {
                      handleMoveChord(
                        selectedChordForEdit.sectionId,
                        selectedChordForEdit.lineId,
                        selectedChordForEdit.chord.id,
                        prevOffset
                      );
                    }}
                    disabled={currentOffset === 0 || prevOffset === currentOffset}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: 'var(--c-text-primary, #ffffff)',
                    }}
                  >
                    <span className="material-symbols-rounded text-sm">arrow_back</span>
                    <span>&larr; Prev Word</span>
                  </button>

                  <button
                    type="button"
                    data-testid="chord-move-next-btn"
                    onClick={() => {
                      handleMoveChord(
                        selectedChordForEdit.sectionId,
                        selectedChordForEdit.lineId,
                        selectedChordForEdit.chord.id,
                        nextOffset
                      );
                    }}
                    disabled={nextOffset <= currentOffset}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: 'var(--c-text-primary, #ffffff)',
                    }}
                  >
                    <span>Next Word &rarr;</span>
                    <span className="material-symbols-rounded text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Replace Chord */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Replace Chord Symbol
                </span>
                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-0.5">
                  {chordOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      data-testid={`chord-replace-${c}`}
                      onClick={() => {
                        handleReplaceChord(
                          selectedChordForEdit.sectionId,
                          selectedChordForEdit.lineId,
                          selectedChordForEdit.chord.id,
                          c
                        );
                      }}
                      className={`h-8 px-2 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer border ${
                        c === selectedChordForEdit.chord.chord
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-black'
                          : 'border-white/10 bg-white/5 hover:border-white/20 text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="chord-replace-browse-library-btn"
                  onClick={() => {
                    setChordPickerTarget({
                      sectionId: selectedChordForEdit.sectionId,
                      lineId: selectedChordForEdit.lineId,
                      offset: selectedChordForEdit.chord.offset,
                      wordText: `Replace "${selectedChordForEdit.chord.chord}"`,
                    });
                    setChordSearchQuery('');
                    setChordRootFilter('All');
                    setChordTypeFilter('all');
                    setSelectedChordForEdit(null);
                    setShowChordPicker(true);
                  }}
                  className="w-full mt-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">library_music</span>
                  <span>Browse Full Library to Replace...</span>
                </button>
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t border-white/10 flex gap-2">
                <button
                  type="button"
                  data-testid="chord-delete-btn"
                  onClick={() => {
                    handleRemoveChordFromLine(
                      selectedChordForEdit.sectionId,
                      selectedChordForEdit.lineId,
                      selectedChordForEdit.chord.id
                    );
                    setSelectedChordForEdit(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-base">delete</span>
                  <span>Remove Chord</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChordForEdit(null)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── DIALOG: FULL CANONICAL CHORDEX LIBRARY ─────────────────────── */}
      <Dialog
        open={showChordPicker}
        onClose={() => setShowChordPicker(false)}
        title="Chord Library"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full text-xs text-gray-400">
            <span>{filteredLibraryChords.length} chords found</span>
            <button
              type="button"
              onClick={() => setShowChordPicker(false)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1" data-testid="chord-library-dialog">
          {/* Target Position Indicator */}
          {chordPickerTarget && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderColor: 'rgba(59, 130, 246, 0.25)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-rounded text-blue-400 text-sm flex-shrink-0">pin_drop</span>
                <span className="text-gray-300 truncate">
                  Target:{' '}
                  <strong className="text-blue-400 font-mono">
                    {chordPickerTarget.wordText ? chordPickerTarget.wordText : 'Line Start'}
                  </strong>{' '}
                  <span className="text-gray-500">(offset {chordPickerTarget.offset})</span>
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400/90 bg-blue-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
                Tap chord to insert
              </span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              data-testid="chord-library-search-input"
              value={chordSearchQuery}
              onChange={(e) => setChordSearchQuery(e.target.value)}
              placeholder="Search chords (e.g. C, Dm7, sus4, Bbm)..."
              className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border focus:outline-none focus:border-blue-500 transition-colors ${
                isEffectiveLight
                  ? 'bg-black/5 border-black/10 text-gray-900 placeholder-gray-400'
                  : 'bg-white/5 border-white/10 text-white placeholder-gray-500'
              }`}
            />
            {chordSearchQuery && (
              <button
                type="button"
                data-testid="chord-library-search-clear-btn"
                onClick={() => setChordSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <span className="material-symbols-rounded text-base">close</span>
              </button>
            )}
          </div>

          {/* Root Note Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1 flex-shrink-0">
              Root:
            </span>
            {['All', ...ROOTS].map((r) => {
              const isActive = chordRootFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  data-testid={`chord-root-filter-${r}`}
                  onClick={() => setChordRootFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex-shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : isEffectiveLight
                        ? 'bg-black/5 text-gray-700 hover:bg-black/10 hover:text-black border border-black/5'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Quality / Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1 flex-shrink-0">
              Type:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'major', label: 'Major' },
              { id: 'minor', label: 'Minor' },
              { id: '7th', label: '7th' },
              { id: 'maj7', label: 'Maj7' },
              { id: 'min7', label: 'Min7' },
              { id: 'sus', label: 'Sus' },
              { id: 'add9', label: 'Add9' },
              { id: 'dim', label: 'Dim/Aug' },
            ].map((q) => {
              const isActive = chordTypeFilter === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  data-testid={`chord-type-filter-${q.id}`}
                  onClick={() => setChordTypeFilter(q.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : isEffectiveLight
                        ? 'bg-black/5 text-gray-700 hover:bg-black/10 hover:text-black border border-black/5'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          {/* Chord Cards Grid with Diagrams */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[48vh] overflow-y-auto pr-1 no-scrollbar">
            {filteredLibraryChords.map((chord) => {
              const isInSong = availableChords.some(
                (ac) => ac.toLowerCase() === chord.name.toLowerCase()
              );
              return (
                <button
                  key={chord.id || chord.name}
                  type="button"
                  data-testid={`library-chord-${chord.name}`}
                  onClick={() => {
                    if (chordPickerTarget) {
                      handleAddChordToLine(
                        chordPickerTarget.sectionId,
                        chordPickerTarget.lineId,
                        chord.name,
                        chordPickerTarget.offset
                      );
                      setShowChordPicker(false);
                    }
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/10 group"
                  style={{
                    backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                    borderColor: isEffectiveLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Fretboard Diagram Preview */}
                  {chord.guitar ? (
                    <div className="w-11 h-13 flex-shrink-0 flex items-center justify-center rounded-lg bg-black/40 border border-white/5 overflow-hidden">
                      <div className="w-10 h-12 pointer-events-none scale-90">
                        <ChordDiagram data={chord.guitar} accentFrom="#3b82f6" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-11 h-13 flex-shrink-0 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs">
                      {chord.root}
                    </div>
                  )}

                  {/* Chord Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="font-mono font-extrabold text-xs transition-colors group-hover:text-blue-500"
                        style={{ color: isEffectiveLight ? '#0f172a' : '#ffffff' }}
                      >
                        {chord.name}
                      </span>
                      {isInSong && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Song
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[10px] font-mono truncate mt-0.5"
                      style={{ color: isEffectiveLight ? '#64748b' : '#9ca3af' }}
                    >
                      {chord.notes && chord.notes.length > 0 ? chord.notes.join('·') : chord.type}
                    </div>
                  </div>

                  <span className="material-symbols-rounded text-gray-500 group-hover:text-blue-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    add_circle
                  </span>
                </button>
              );
            })}

            {filteredLibraryChords.length === 0 && (
              <div className="col-span-full py-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-rounded text-3xl text-gray-600">search_off</span>
                <p className="text-xs text-gray-400">
                  No chords found matching current filters
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setChordSearchQuery('');
                    setChordRootFilter('All');
                    setChordTypeFilter('all');
                  }}
                  className="mt-1 px-3 py-1 rounded-lg text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
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

