import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GripVertical, Pencil } from 'lucide-react';
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
  continuousTextToLyricsDocument,
  createEmptyLyricsDocument,
  generateLyricId,
  parseLineStructuralElement,
  normalizeLyricsDocumentStructure,
  parseVocalRoleFromHeader,
  detectSectionType,
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
  getChordById,
  getChordByName,
  searchChords,
  ROOTS,
  type Chord,
  shiftChordOffsets,
} from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';
import { Button } from '../../../../shared/design-system/buttons';
import { MorphingActionSurface } from '../../../../shared/design-system/MorphingActionSurface';
import ChordDiagram from '../../diagrams/ChordDiagram';
import DetailFretboardDiagram from '../../diagrams/DetailFretboardDiagram';

export interface SongLyricsEditorProps {
  lyrics?: SongLyricsDocument;
  onChange: (updated: SongLyricsDocument | undefined) => void;
  availableChords?: string[]; // Chords currently in the song preset
  accent: { from: string; to: string; mid?: string };
  isLight?: boolean;
  isAmoled?: boolean;
  mode?: 'lyrics' | 'both';
}

let canvasCtx: CanvasRenderingContext2D | null = null;
function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!canvasCtx) {
    const canvas = document.createElement('canvas');
    canvasCtx = canvas.getContext('2d');
  }
  return canvasCtx;
}

function measureSubstrWidth(text: string, inputEl?: HTMLInputElement | null): number {
  if (typeof document === 'undefined' || !text) return 0;
  const ctx = getCanvasContext();
  if (!ctx) return text.length * 9.6;
  if (inputEl) {
    try {
      const style = window.getComputedStyle(inputEl);
      ctx.font = `${style.fontWeight || '500'} ${style.fontSize || '16px'} ${style.fontFamily || 'sans-serif'}`;
    } catch (_) {
      ctx.font = '500 16px sans-serif';
    }
  } else {
    ctx.font = '500 16px sans-serif';
  }
  return ctx.measureText(text).width;
}

function getCharOffsetFromClickX(text: string, clickX: number, inputEl?: HTMLInputElement | null): number {
  if (!text || clickX <= 0) return 0;
  const ctx = getCanvasContext();
  if (!ctx) return Math.min(text.length, Math.max(0, Math.round(clickX / 9.6)));
  if (inputEl) {
    try {
      const style = window.getComputedStyle(inputEl);
      ctx.font = `${style.fontWeight || '500'} ${style.fontSize || '16px'} ${style.fontFamily || 'sans-serif'}`;
    } catch (_) {
      ctx.font = '500 16px sans-serif';
    }
  } else {
    ctx.font = '500 16px sans-serif';
  }

  let bestOffset = 0;
  let minDiff = Infinity;
  for (let i = 0; i <= text.length; i++) {
    const w = ctx.measureText(text.slice(0, i)).width;
    const diff = Math.abs(w - clickX);
    if (diff < minDiff) {
      minDiff = diff;
      bestOffset = i;
    }
  }
  return bestOffset;
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
const INTERLUDE_PRESET_LABELS = ['Solo', 'Guitar Solo', 'Interlude', 'Intro', 'Outro', 'Bridge'];

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
  mode = 'both',
}) => {
  // Local document state initialized from props
  const [localDoc, setLocalDoc] = useState<SongLyricsDocument>(() => {
    const initial = lyrics && Array.isArray(lyrics.sections) ? lyrics : createEmptyLyricsDocument();
    return normalizeLyricsDocumentStructure(initial);
  });
  const localDocRef = useRef<SongLyricsDocument>(localDoc);
  localDocRef.current = localDoc;

  // Keep localDoc in sync when external lyrics prop updates
  useEffect(() => {
    if (lyrics && Array.isArray(lyrics.sections) && lyrics !== localDocRef.current) {
      const normalized = normalizeLyricsDocumentStructure(lyrics);
      setLocalDoc(normalized);
      localDocRef.current = normalized;
    }
  }, [lyrics]);

  const currentDoc = localDoc;

  // Debounced store mutation ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerChange = useCallback(
    (nextDoc: SongLyricsDocument, immediate = false) => {
      setLocalDoc(nextDoc);
      localDocRef.current = nextDoc;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (immediate) {
        onChange(nextDoc);
      } else {
        debounceTimerRef.current = setTimeout(() => {
          onChange(nextDoc);
          debounceTimerRef.current = null;
        }, 400);
      }
    },
    [onChange]
  );

  // Clear All Lyrics confirmation dialog state & handler
  const [showClearLyricsConfirm, setShowClearLyricsConfirm] = useState(false);
  const handleClearAllLyrics = useCallback(() => {
    const emptyDoc = createEmptyLyricsDocument();
    const initialSec: SongLyricSection = {
      id: generateLyricId('sec'),
      type: 'verse',
      name: 'Verse 1',
      lines: [{ id: generateLyricId('line'), text: '' }],
    };
    emptyDoc.sections = [initialSec];
    setLocalDoc(emptyDoc);
    localDocRef.current = emptyDoc;
    triggerChange(emptyDoc, true);
    toast.success('Lyrics cleared');
  }, [triggerChange]);

  // Flush debounced change on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        if (localDocRef.current) {
          onChange(localDocRef.current);
        }
      }
    };
  }, [onChange]);

  // Undo / Redo history stacks
  const historyRef = useRef<SongLyricsDocument[]>([]);
  const futureRef = useRef<SongLyricsDocument[]>([]);

  // Input refs and cursor focus management
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusLineIdRef = useRef<string | null>(null);
  const targetCursorOffsetRef = useRef<number | null>(null);

  // Focus management effect for newly created or targeted lines
  useEffect(() => {
    if (pendingFocusLineIdRef.current) {
      const lineId = pendingFocusLineIdRef.current;
      pendingFocusLineIdRef.current = null;
      const el = inputRefs.current[lineId];
      if (el) {
        el.focus();
        const offset = targetCursorOffsetRef.current ?? el.value.length;
        targetCursorOffsetRef.current = null;
        try {
          const clamped = Math.min(el.value.length, Math.max(0, offset));
          el.setSelectionRange(clamped, clamped);
        } catch (_) {}
      }
    }
  }, [currentDoc]);

  // Drag and drop state for interludes and lines
  const [draggedLine, setDraggedLine] = useState<{ sectionId: string; lineId: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ sectionId: string; lineIdx: number } | null>(null);
  const dragOverTargetRef = useRef<{ sectionId: string; lineIdx: number } | null>(null);
  dragOverTargetRef.current = dragOverTarget;

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
  const [showChordPalette, setShowChordPalette] = useState(false);
  const [showSectionMorph, setShowSectionMorph] = useState(false);
  const [showTextMorph, setShowTextMorph] = useState(false);
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

  const resolvedChordObj = useMemo(() => {
    if (!selectedChordForEdit) return null;
    const sym = selectedChordForEdit.chord.chord;
    return getChordById(sym) || getChordByName(sym) || null;
  }, [selectedChordForEdit]);

  // ── UNASSIGNED CHORDS QUEUE & PLACEMENT MODE STATE ─────────────────
  const songChords = useMemo(() => {
    const raw = (availableChords || [])
      .map((c) => getChordById(c)?.name || getChordByName(c)?.name || c)
      .filter(Boolean);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const c of raw) {
      const lower = c.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(c);
      }
    }
    return unique;
  }, [availableChords]);

  const allAssignedChords = useMemo(() => {
    return currentDoc.sections.flatMap((s) => s.lines.flatMap((l) => l.chords || []));
  }, [currentDoc]);

  const unassignedChords = useMemo(() => {
    const remaining = [...songChords];
    for (const assigned of allAssignedChords) {
      const idx = remaining.findIndex(
        (c) => c.toLowerCase() === assigned.chord.toLowerCase()
      );
      if (idx !== -1) {
        remaining.splice(idx, 1);
      }
    }
    return remaining;
  }, [songChords, allAssignedChords]);

  const [activePlacementChord, setActivePlacementChord] = useState<string | null>(null);
  const [movingChordInfo, setMovingChordInfo] = useState<{
    sectionId: string;
    lineId: string;
    chordId: string;
    chord: string;
  } | null>(null);

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

  // Theme resolution
  const isEffectiveLight =
    isLight ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  const isEffectiveAmoled =
    isAmoled ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('amoled') ||
        document.documentElement.getAttribute('data-theme') === 'amoled'));

  // ── DOCUMENT MUTATION HELPERS WITH HISTORY ──────────────────────────

  const updateDoc = useCallback(
    (updater: (prev: SongLyricsDocument) => SongLyricsDocument, immediate = false) => {
      const next = updater(localDocRef.current);
      historyRef.current.push(localDocRef.current);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      triggerChange(next, immediate);
    },
    [triggerChange]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop()!;
    futureRef.current.push(localDocRef.current);
    triggerChange(previous, true);
  }, [triggerChange]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(localDocRef.current);
    triggerChange(next, true);
  }, [triggerChange]);

  // ── DOCUMENT CONTENT INSPECTION ─────────────────────────────────────

  const totalLines = useMemo(() => {
    return currentDoc.sections.reduce((acc, s) => acc + s.lines.length, 0);
  }, [currentDoc.sections]);

  const isLyricsEmpty = useMemo(() => {
    if (currentDoc.sections.length === 0) return true;
    return currentDoc.sections.every((s) =>
      s.lines.every((l) => l.text.trim().length === 0 && l.type !== 'interlude')
    );
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
                  const shiftedChords = shiftChordOffsets(l.text, newText, l.chords);
                  return {
                    ...l,
                    text: newText,
                    chords: shiftedChords,
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
        pendingFocusLineIdRef.current = createdLineId;
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
          // 3. Fallback: last section
          if (!targetSecId) {
            targetSecId = sections[sections.length - 1].id;
          }
        }

        const durMs = Math.max(1000, Math.min(600000, (initialDurationSec ? initialDurationSec * 1000 : 15000)));
        const newLine: SongLyricLine = {
          id: generateLyricId('line'),
          type: 'interlude',
          text: initialLabel || 'Solo',
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
      }, true);
      toast.success('Timed interlude added');
    },
    [updateDoc]
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

  const handlePromoteLineToSection = useCallback(
    (
      sectionId: string,
      lineIdx: number,
      parsed: {
        sectionName?: string;
        sectionType?: StandardLyricSectionType;
        vocalRole?: VocalRoleAnnotation;
      }
    ) => {
      let targetFocusLineId = '';

      updateDoc((doc) => {
        const secIdx = doc.sections.findIndex((s) => s.id === sectionId);
        if (secIdx === -1) return doc;
        const currentSec = doc.sections[secIdx];
        const newSecName = parsed.sectionName || 'Section';
        const newSecType = parsed.sectionType || detectSectionType(newSecName);

        // Case 1: If current section has <= 1 line and was unnamed or default "Verse 1":
        // Rename the section and reset the line to an empty line ready for lyrics
        const isCurrentSecEmptyOrSingle =
          (!currentSec.name || currentSec.name.trim().length === 0 || currentSec.name === 'Verse 1') &&
          currentSec.lines.length <= 1;

        if (isCurrentSecEmptyOrSingle) {
          const freshLineId = generateLyricId('line');
          targetFocusLineId = freshLineId;
          const updatedSec: SongLyricSection = {
            ...currentSec,
            name: newSecName,
            type: newSecType,
            vocalRole: parsed.vocalRole || currentSec.vocalRole,
            lines: [{ id: freshLineId, text: '' }],
          };
          const nextSections = [...doc.sections];
          nextSections[secIdx] = updatedSec;
          return { ...doc, sections: nextSections };
        }

        // Case 2: User is inside an existing section.
        // We split the current section at lineIdx:
        // - currentSec keeps lines before lineIdx
        // - new section gets fresh empty line, plus any lines after lineIdx
        const linesBefore = currentSec.lines.slice(0, lineIdx);
        const linesAfter = currentSec.lines.slice(lineIdx + 1);
        const freshLine: SongLyricLine = { id: generateLyricId('line'), text: '' };
        targetFocusLineId = freshLine.id;

        const updatedCurrentSec: SongLyricSection = {
          ...currentSec,
          lines: linesBefore.length > 0 ? linesBefore : [{ id: generateLyricId('line'), text: '' }],
        };

        const newSec: SongLyricSection = {
          id: generateLyricId('sec'),
          name: newSecName,
          type: newSecType,
          vocalRole: parsed.vocalRole,
          lines: [freshLine, ...linesAfter],
        };

        const nextSections = [...doc.sections];
        nextSections.splice(secIdx, 1, updatedCurrentSec, newSec);
        return { ...doc, sections: nextSections };
      }, true);

      if (targetFocusLineId) {
        pendingFocusLineIdRef.current = targetFocusLineId;
        targetCursorOffsetRef.current = 0;
      }
    },
    [updateDoc]
  );

  const handlePromoteLineToInterlude = useCallback(
    (
      sectionId: string,
      lineIdx: number,
      parsed: { interludeLabel?: string; interludeDurationSec?: number }
    ) => {
      let targetFocusLineId = '';
      updateDoc((doc) => {
        const nextSections = doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const currentLine = sec.lines[lineIdx];
          if (!currentLine) return sec;

          const interludeLine: SongLyricLine = {
            id: currentLine.id,
            type: 'interlude',
            text: parsed.interludeLabel || 'Solo',
            explicitDurationMs: (parsed.interludeDurationSec || 15) * 1000,
          };

          const nextEmptyLine: SongLyricLine = {
            id: generateLyricId('line'),
            text: '',
          };
          targetFocusLineId = nextEmptyLine.id;

          const lines = [...sec.lines];
          lines.splice(lineIdx, 1, interludeLine, nextEmptyLine);
          return { ...sec, lines };
        });

        return { ...doc, sections: nextSections };
      }, true);

      if (targetFocusLineId) {
        pendingFocusLineIdRef.current = targetFocusLineId;
        targetCursorOffsetRef.current = 0;
      }
    },
    [updateDoc]
  );

  const handleDeleteLine = useCallback(
    (sectionId: string, lineId: string, prevLineIdToFocus?: string) => {
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
      }), true);
      if (prevLineIdToFocus) {
        pendingFocusLineIdRef.current = prevLineIdToFocus;
        targetCursorOffsetRef.current = 9999;
      }
    },
    [updateDoc]
  );

  const handleSplitLine = useCallback(
    (sectionId: string, lineIdx: number, lineId: string, splitPos: number) => {
      let newLineId = '';
      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const currentLine = sec.lines[lineIdx];
          if (!currentLine || currentLine.id !== lineId) return sec;

          const leftText = currentLine.text.slice(0, splitPos);
          const rightText = currentLine.text.slice(splitPos);

          const leftChords = (currentLine.chords || []).filter((c) => c.offset < splitPos);
          const rightChords = (currentLine.chords || [])
            .filter((c) => c.offset >= splitPos)
            .map((c) => ({
              ...c,
              id: generateLyricId('ch'),
              offset: Math.max(0, c.offset - splitPos),
            }));

          const updatedCurrentLine: SongLyricLine = {
            ...currentLine,
            text: leftText,
            chords: leftChords.length > 0 ? leftChords : undefined,
            spans: currentLine.spans ? [{ text: leftText }] : undefined,
          };

          const newLine: SongLyricLine = {
            id: generateLyricId('line'),
            text: rightText,
            chords: rightChords.length > 0 ? rightChords : undefined,
            format: currentLine.format,
          };
          newLineId = newLine.id;

          const newLines = [...sec.lines];
          newLines.splice(lineIdx, 1, updatedCurrentLine, newLine);

          return {
            ...sec,
            lines: newLines,
          };
        }),
      }), true);

      if (newLineId) {
        pendingFocusLineIdRef.current = newLineId;
        targetCursorOffsetRef.current = 0;
      }
    },
    [updateDoc]
  );

  const handleMergeWithPrevious = useCallback(
    (sectionId: string, lineIdx: number, lineId: string) => {
      let focusLineId = '';
      let focusOffset = 0;

      updateDoc((doc) => {
        const secIdx = doc.sections.findIndex((s) => s.id === sectionId);
        if (secIdx === -1) return doc;
        const currentSec = doc.sections[secIdx];
        const currentLine = currentSec.lines[lineIdx];
        if (!currentLine || currentLine.id !== lineId) return doc;

        let prevSecIdx = secIdx;
        let prevLineIdx = lineIdx - 1;

        if (prevLineIdx < 0) {
          if (secIdx > 0) {
            prevSecIdx = secIdx - 1;
            prevLineIdx = doc.sections[prevSecIdx].lines.length - 1;
          } else {
            return doc;
          }
        }

        const prevSec = doc.sections[prevSecIdx];
        const prevLine = prevSec.lines[prevLineIdx];
        if (!prevLine) return doc;

        focusLineId = prevLine.id;
        focusOffset = prevLine.text.length;

        const mergedText = prevLine.text + currentLine.text;
        const shiftedCurrentChords = (currentLine.chords || []).map((c) => ({
          ...c,
          id: generateLyricId('ch'),
          offset: c.offset + prevLine.text.length,
        }));
        const mergedChords = [...(prevLine.chords || []), ...shiftedCurrentChords];

        return {
          ...doc,
          sections: doc.sections.map((s, sIdx) => {
            if (sIdx === prevSecIdx && prevSecIdx === secIdx) {
              const lines = s.lines
                .filter((l) => l.id !== lineId)
                .map((l) =>
                  l.id === prevLine.id
                    ? {
                        ...l,
                        text: mergedText,
                        chords: mergedChords.length > 0 ? mergedChords : undefined,
                      }
                    : l
                );
              return { ...s, lines };
            }

            if (sIdx === prevSecIdx) {
              const lines = s.lines.map((l) =>
                l.id === prevLine.id
                  ? {
                      ...l,
                      text: mergedText,
                      chords: mergedChords.length > 0 ? mergedChords : undefined,
                    }
                  : l
              );
              return { ...s, lines };
            }

            if (sIdx === secIdx) {
              return {
                ...s,
                lines: s.lines.filter((l) => l.id !== lineId),
              };
            }

            return s;
          }),
        };
      }, true);

      if (focusLineId) {
        pendingFocusLineIdRef.current = focusLineId;
        targetCursorOffsetRef.current = focusOffset;
      }
    },
    [updateDoc]
  );

  const handlePasteIntoLine = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement>,
      sectionId: string,
      lineIdx: number,
      lineId: string
    ) => {
      const pastedText = e.clipboardData.getData('text');
      if (!pastedText) return;

      const singleParse = parseLineStructuralElement(pastedText.trim());
      if (singleParse.kind === 'section') {
        e.preventDefault();
        handlePromoteLineToSection(sectionId, lineIdx, singleParse);
        return;
      }
      if (singleParse.kind === 'interlude') {
        e.preventDefault();
        handlePromoteLineToInterlude(sectionId, lineIdx, singleParse);
        return;
      }

      if (!pastedText.includes('\n') && !pastedText.includes('\r')) {
        return;
      }

      e.preventDefault();

      const parsedDoc = continuousTextToLyricsDocument(pastedText, localDocRef.current);
      const normalizedDoc = normalizeLyricsDocumentStructure(parsedDoc);
      updateDoc(() => normalizedDoc, true);
    },
    [localDocRef, updateDoc, handlePromoteLineToSection, handlePromoteLineToInterlude]
  );

  const handleLineKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      sectionId: string,
      lineIdx: number,
      lineId: string
    ) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = e.currentTarget;
        const lineText = target.value;
        const parseResult = parseLineStructuralElement(lineText);

        if (parseResult.kind === 'section') {
          handlePromoteLineToSection(sectionId, lineIdx, parseResult);
          return;
        }

        if (parseResult.kind === 'interlude') {
          handlePromoteLineToInterlude(sectionId, lineIdx, parseResult);
          return;
        }

        const splitPos = target.selectionStart ?? target.value.length;
        handleSplitLine(sectionId, lineIdx, lineId, splitPos);
      } else if (e.key === 'Backspace') {
        const target = e.currentTarget;
        const selStart = target.selectionStart ?? 0;
        const selEnd = target.selectionEnd ?? 0;
        if (selStart === 0 && selEnd === 0) {
          const currentSec = currentDoc.sections.find((s) => s.id === sectionId);
          const currentLine = currentSec?.lines[lineIdx];
          if (currentLine && currentLine.text.length === 0) {
            e.preventDefault();
            const prevLine = lineIdx > 0 ? currentSec?.lines[lineIdx - 1] : undefined;
            handleDeleteLine(sectionId, lineId, prevLine?.id);
          } else if (lineIdx > 0 || (currentDoc.sections.length > 1 && currentDoc.sections[0].id !== sectionId)) {
            e.preventDefault();
            handleMergeWithPrevious(sectionId, lineIdx, lineId);
          }
        }
      } else if (e.key === 'ArrowUp') {
        const currentSec = currentDoc.sections.find((s) => s.id === sectionId);
        if (lineIdx > 0 && currentSec) {
          const prevLine = currentSec.lines[lineIdx - 1];
          if (prevLine && inputRefs.current[prevLine.id]) {
            e.preventDefault();
            const target = e.currentTarget;
            const pos = target.selectionStart ?? 0;
            inputRefs.current[prevLine.id]?.focus();
            try {
              inputRefs.current[prevLine.id]?.setSelectionRange(pos, pos);
            } catch (_) {}
          }
        }
      } else if (e.key === 'ArrowDown') {
        const currentSec = currentDoc.sections.find((s) => s.id === sectionId);
        if (currentSec && lineIdx < currentSec.lines.length - 1) {
          const nextLine = currentSec.lines[lineIdx + 1];
          if (nextLine && inputRefs.current[nextLine.id]) {
            e.preventDefault();
            const target = e.currentTarget;
            const pos = target.selectionStart ?? 0;
            inputRefs.current[nextLine.id]?.focus();
            try {
              inputRefs.current[nextLine.id]?.setSelectionRange(pos, pos);
            } catch (_) {}
          }
        }
      }
    },
    [currentDoc.sections, handlePromoteLineToSection, handlePromoteLineToInterlude, handleSplitLine, handleDeleteLine, handleMergeWithPrevious]
  );

  const handleMoveLine = useCallback(
    (fromSectionId: string, fromLineId: string, toSectionId: string, toLineIdx: number) => {
      updateDoc((doc) => {
        let lineToMove: SongLyricLine | null = null;
        const sectionsWithoutLine = doc.sections.map((sec) => {
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

        if (!lineToMove) return doc;

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

        return {
          ...doc,
          sections: finalSections,
        };
      }, true);
      toast.success('Interlude repositioned');
    },
    [updateDoc]
  );

  const handleMoveLineRelative = useCallback(
    (sectionId: string, currentLineIdx: number, delta: number) => {
      const secIdx = currentDoc.sections.findIndex((s) => s.id === sectionId);
      if (secIdx === -1) return;
      const targetSec = currentDoc.sections[secIdx];
      const line = targetSec.lines[currentLineIdx];
      if (!line) return;

      const targetLineIdx = currentLineIdx + delta;
      if (targetLineIdx >= 0 && targetLineIdx < targetSec.lines.length) {
        handleMoveLine(sectionId, line.id, sectionId, targetLineIdx);
      } else if (delta < 0 && secIdx > 0) {
        const prevSec = currentDoc.sections[secIdx - 1];
        handleMoveLine(sectionId, line.id, prevSec.id, prevSec.lines.length);
      } else if (delta > 0 && secIdx < currentDoc.sections.length - 1) {
        const nextSec = currentDoc.sections[secIdx + 1];
        handleMoveLine(sectionId, line.id, nextSec.id, 0);
      }
    },
    [currentDoc.sections, handleMoveLine]
  );

  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string, lineId: string) => {
    setDraggedLine({ sectionId, lineId });
    setDragOverTarget(null);
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ fromSectionId: sectionId, fromLineId: lineId }));
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLine(null);
    setDragOverTarget(null);
  }, []);

  const handleDropOnLine = useCallback(
    (e: React.DragEvent, targetSectionId: string, targetLineIdx: number) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.fromSectionId && data.fromLineId) {
            handleMoveLine(data.fromSectionId, data.fromLineId, targetSectionId, targetLineIdx);
            setDraggedLine(null);
            setDragOverTarget(null);
            dragOverTargetRef.current = null;
            return;
          }
        }
      } catch (_) {}
      if (draggedLine) {
        handleMoveLine(draggedLine.sectionId, draggedLine.lineId, targetSectionId, targetLineIdx);
      }
      setDraggedLine(null);
      setDragOverTarget(null);
      dragOverTargetRef.current = null;
    },
    [draggedLine, handleMoveLine]
  );

  const handleDragOverLine = useCallback(
    (e: React.DragEvent, sectionId: string, lineIdx: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (
        !dragOverTargetRef.current ||
        dragOverTargetRef.current.sectionId !== sectionId ||
        dragOverTargetRef.current.lineIdx !== lineIdx
      ) {
        const next = { sectionId, lineIdx };
        dragOverTargetRef.current = next;
        setDragOverTarget(next);
      }
    },
    []
  );

  const handlePointerDragStart = useCallback(
    (e: React.PointerEvent, sectionId: string, lineId: string, _lineIdx: number) => {
      e.preventDefault();
      setDraggedLine({ sectionId, lineId });
      setDragOverTarget(null);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        if (!el) return;
        const lineEl = el.closest('[data-line-id]') as HTMLElement | null;
        if (lineEl) {
          const targetSecId = lineEl.dataset.sectionId;
          const targetLineIdxStr = lineEl.dataset.lineIndex;
          if (targetSecId && targetLineIdxStr !== undefined) {
            const targetIdx = parseInt(targetLineIdxStr, 10);
            if (!isNaN(targetIdx)) {
              const current = dragOverTargetRef.current;
              if (!current || current.sectionId !== targetSecId || current.lineIdx !== targetIdx) {
                const nextTarget = { sectionId: targetSecId, lineIdx: targetIdx };
                dragOverTargetRef.current = nextTarget;
                setDragOverTarget(nextTarget);
              }
            }
          }
        }
      };

      const onPointerUp = (_upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const target = dragOverTargetRef.current;
        if (target) {
          handleMoveLine(sectionId, lineId, target.sectionId, target.lineIdx);
        }
        setDraggedLine(null);
        setDragOverTarget(null);
        dragOverTargetRef.current = null;
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [handleMoveLine]
  );

  // ── INLINE FORMATTING (BOLD & COLOR) ────────────────────────────────

  const handleFormatBold = useCallback(() => {
    const sel = activeSelectionRef.current;
    if (!sel) {
      toast.info('Click or select text first');
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
          wordText: firstLine.text.split(' ')[0] || 'start',
        });
        setChordSearchQuery('');
        setChordRootFilter('All');
        setChordTypeFilter('all');
        setShowChordPicker(true);
      } else {
        toast.info('Type lyrics first to attach chords');
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

  const handleAnchorChord = useCallback(
    (sectionId: string, lineId: string, chordSymbol: string, characterOffset: number) => {
      if (movingChordInfo) {
        handleRemoveChordFromLine(movingChordInfo.sectionId, movingChordInfo.lineId, movingChordInfo.chordId);
        setMovingChordInfo(null);
      }
      handleAddChordToLine(sectionId, lineId, chordSymbol, characterOffset);
      setActivePlacementChord(null);
      toast.success('Chord placed');
    },
    [movingChordInfo, handleAddChordToLine]
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
          paddingBottom: '24px',
        }}
        data-purpose="teleprompter-writing-canvas"
      >
        {/* Unassigned Chords Queue & Placement Mode Bar (Both Mode Only) */}
        {mode === 'both' && songChords.length > 0 && (
          <div
            data-testid="unassigned-chords-queue"
            className="w-full mb-3 p-3 rounded-2xl border transition-all"
            style={{
              backgroundColor: isEffectiveLight
                ? 'rgba(0, 0, 0, 0.02)'
                : isEffectiveAmoled
                ? '#000000'
                : 'rgba(255, 255, 255, 0.03)',
              borderColor: isEffectiveLight
                ? 'rgba(0, 0, 0, 0.08)'
                : isEffectiveAmoled
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  data-testid="unassigned-chords-count"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide transition-all border"
                  style={{
                    backgroundColor: unassignedChords.length > 0
                      ? isEffectiveLight ? 'rgba(37, 99, 235, 0.10)' : 'rgba(56, 189, 248, 0.15)'
                      : isEffectiveLight ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.15)',
                    borderColor: unassignedChords.length > 0
                      ? isEffectiveLight ? 'rgba(37, 99, 235, 0.30)' : 'rgba(56, 189, 248, 0.35)'
                      : isEffectiveLight ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.35)',
                    color: unassignedChords.length > 0
                      ? isEffectiveLight ? '#1d4ed8' : '#38bdf8'
                      : isEffectiveLight ? '#047857' : '#34d399',
                  }}
                >
                  <span className="material-symbols-rounded text-sm">
                    {unassignedChords.length > 0 ? 'queue_music' : 'check_circle'}
                  </span>
                  <span>
                    {unassignedChords.length > 0
                      ? `${unassignedChords.length} unassigned chords`
                      : 'All chords assigned'}
                  </span>
                </span>
                <span className="text-[11px] font-medium text-gray-400 hidden sm:inline">
                  {unassignedChords.length > 0
                    ? 'Tap a chord to enter Placement Mode, then tap any word or letter'
                    : 'All song chords are anchored to lyrics'}
                </span>
              </div>

              {unassignedChords.length > 0 && (
                <span className="text-[11px] font-mono font-semibold text-gray-500">
                  {unassignedChords.length} / {songChords.length} pending
                </span>
              )}
            </div>

            {/* Horizontal Chip Carousel of Pending Unassigned Chords */}
            {unassignedChords.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {unassignedChords.map((chord, cIdx) => {
                  const isSelected = activePlacementChord === chord;
                  return (
                    <button
                      key={`${chord}-${cIdx}`}
                      type="button"
                      data-testid={`unassigned-chord-${chord}`}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', chord);
                        setActivePlacementChord(chord);
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setActivePlacementChord(null);
                          setMovingChordInfo(null);
                        } else {
                          setActivePlacementChord(chord);
                          setMovingChordInfo(null);
                          toast.info(`Tap letter to place [${chord}]`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black border transition-all cursor-pointer select-none active:scale-95 shadow-sm whitespace-nowrap"
                      style={{
                        backgroundColor: isSelected
                          ? isEffectiveLight ? '#2563eb' : '#0284c7'
                          : isEffectiveLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                        borderColor: isSelected
                          ? '#ffffff'
                          : isEffectiveLight ? 'rgba(37, 99, 235, 0.30)' : 'rgba(56, 189, 248, 0.35)',
                        color: isSelected
                          ? '#ffffff'
                          : isEffectiveLight ? '#1d4ed8' : '#38bdf8',
                        boxShadow: isSelected ? '0 0 12px rgba(37, 99, 235, 0.5)' : undefined,
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      }}
                      title={`Tap to place [${chord}] above lyrics`}
                    >
                      <span className="material-symbols-rounded text-sm">
                        {isSelected ? 'pin_drop' : 'music_note'}
                      </span>
                      <span>{chord}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Placement Mode Active Guidance Banner */}
            {activePlacementChord && (
              <div
                data-testid="placement-mode-banner"
                className="mt-2.5 flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold animate-fadeIn"
                style={{
                  backgroundColor: isEffectiveLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                  borderColor: isEffectiveLight ? 'rgba(37, 99, 235, 0.3)' : 'rgba(56, 189, 248, 0.35)',
                  color: isEffectiveLight ? '#1d4ed8' : '#7dd3fc',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base animate-pulse">touch_app</span>
                  <span>
                    Placement Mode: Tap directly above any word or letter to anchor{' '}
                    <span className="font-mono font-black underline text-sm">{activePlacementChord}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActivePlacementChord(null);
                    setMovingChordInfo(null);
                  }}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white/10 hover:bg-white/20 transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {isLyricsEmpty && mode === 'both' && (
          <div
            className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed transition-all text-center my-4 group"
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
              [No lyrics]
            </span>
            <p className="text-base font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
              No lyrics in this song yet.
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              Switch to Lyrics mode to write or paste lyrics, then return to Both mode to anchor chords.
            </p>
          </div>
        )}

        {/* Render sections & lines for both Lyrics and Both modes */}
        {currentDoc.sections.map((section, secIdx) => {
          const hasSectionHeader = Boolean(section.name && section.name.trim().length > 0);
          const sectionColor = section.vocalRole?.color || accent.from;

          return (
            <section
              key={section.id || secIdx}
              data-testid={`lyric-section-${secIdx}`}
              className="flex flex-col gap-2 relative group/sec"
            >
              {/* Canonical Section Header Strip */}
              {hasSectionHeader && (
                <div className="flex items-center justify-between gap-2 pt-3 pb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sectionColor }}
                    />
                    <button
                      type="button"
                      data-testid={`section-rename-btn-${secIdx}`}
                      onClick={() => setRenameSectionTarget({ id: section.id, name: section.name })}
                      className="text-xs font-black uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1.5"
                      style={{ color: sectionColor }}
                      title="Click to rename section"
                    >
                      <span>{section.name}</span>
                      <Pencil
                        className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                        strokeWidth={2.2}
                      />
                    </button>

                    {/* Vocal Role Badge */}
                    {section.vocalRole ? (
                      <button
                        type="button"
                        onClick={() => setRolePickerTarget({ sectionId: section.id })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer active:scale-95"
                        style={{
                          backgroundColor: `${section.vocalRole.color || '#3b82f6'}22`,
                          borderColor: `${section.vocalRole.color || '#3b82f6'}44`,
                          color: section.vocalRole.color || 'var(--c-text-muted, #94a3b8)',
                        }}
                        title="Change Vocal Performer Role"
                      >
                        <span className="material-symbols-rounded text-[11px]">mic</span>
                        <span>{section.vocalRole.label}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRolePickerTarget({ sectionId: section.id })}
                        className="opacity-0 group-hover/sec:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer active:scale-95 hover:bg-white/10"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          borderColor: 'rgba(255,255,255,0.08)',
                          color: 'var(--c-text-muted, #94a3b8)',
                        }}
                        title="Assign Vocal Performer Role to Section"
                      >
                        <span className="material-symbols-rounded text-[10px]">mic</span>
                        <span>+ Role</span>
                      </button>
                    )}
                  </div>

                  {/* Section Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="opacity-0 group-hover/sec:opacity-100 text-gray-500 hover:text-rose-400 transition-opacity p-1 rounded-md cursor-pointer"
                    title="Delete section container"
                  >
                    <span className="material-symbols-rounded text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Freeform Script Lines in Section */}
              <div className="flex flex-col gap-1">
                {section.lines.map((line, lineIdx) => {
                  const durSec = line.type === 'interlude' ? Math.round((line.explicitDurationMs || 0) / 1000) : 0;

                  // Dynamic real-time drag-and-drop spring shift
                  let translateYOffset = 0;
                  const isDragged = draggedLine?.lineId === line.id;
                  if (draggedLine && dragOverTarget && dragOverTarget.sectionId === section.id && !isDragged) {
                    const fromIdx = section.lines.findIndex((l) => l.id === draggedLine.lineId);
                    if (fromIdx !== -1) {
                      if (lineIdx > fromIdx && lineIdx <= dragOverTarget.lineIdx) {
                        translateYOffset = -48;
                      } else if (lineIdx < fromIdx && lineIdx >= dragOverTarget.lineIdx) {
                        translateYOffset = 48;
                      }
                    } else {
                      if (lineIdx >= dragOverTarget.lineIdx) {
                        translateYOffset = 48;
                      }
                    }
                  }

                  if (line.type === 'interlude') {
                    return (
                      <div
                        key={line.id || lineIdx}
                        data-testid={`lyric-line-interlude-${section.id}-${lineIdx}`}
                        data-line-id={line.id}
                        data-section-id={section.id}
                        data-line-index={lineIdx}
                        onClick={() => setLastActivePosition(section.id, lineIdx, line.id)}
                        onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                        onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                        className="group/line relative flex flex-col gap-2 p-2.5 sm:p-3 rounded-2xl transition-all border my-2 shadow-xs"
                        style={{
                          transform: isDragged
                            ? 'scale(1.02)'
                            : translateYOffset !== 0
                            ? `translateY(${translateYOffset}px)`
                            : undefined,
                          transition: isDragged
                            ? 'none'
                            : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms ease',
                          opacity: isDragged ? 0.45 : 1,
                          zIndex: isDragged ? 30 : 1,
                          backgroundColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.08)',
                          borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.30)',
                          boxSizing: 'border-box',
                          width: '100%',
                        }}
                      >
                        {/* Top row: Left (Drag Handle, Icon, Label) | Right (Duration Badge, Up, Down, Trash) */}
                        <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                          {/* Left Cluster */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* Drag handle */}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, section.id, line.id)}
                              onDragEnd={handleDragEnd}
                              onPointerDown={(e) => handlePointerDragStart(e, section.id, line.id, lineIdx)}
                              data-testid={`interlude-drag-handle-${lineIdx}`}
                              className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white rounded transition-colors flex items-center justify-center flex-shrink-0 touch-none"
                              title="Drag to reposition interlude"
                              aria-label="Drag to reposition interlude"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.22)',
                                color: isEffectiveLight ? '#2563eb' : '#60a5fa',
                              }}
                            >
                              <span className="material-symbols-rounded text-sm">hourglass_bottom</span>
                            </div>

                            <input
                              type="text"
                              value={line.text}
                              onFocus={() => setLastActivePosition(section.id, lineIdx, line.id)}
                              onChange={(e) => {
                                setLastActivePosition(section.id, lineIdx, line.id);
                                handleUpdateLineText(section.id, line.id, e.target.value);
                              }}
                              placeholder="Label (e.g. Solo)"
                              aria-label="Interlude event label"
                              data-testid={`interlude-label-input-${lineIdx}`}
                              className="bg-transparent border-0 border-b outline-none text-xs sm:text-sm font-bold pb-0.5 min-w-[50px] max-w-[110px] sm:max-w-[180px] transition-colors truncate"
                              style={{
                                color: isEffectiveLight ? '#1d4ed8' : '#93c5fd',
                                borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.45)',
                              }}
                            />
                          </div>

                          {/* Right Action Cluster */}
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-auto">
                            {/* Duration Indicator Badge */}
                            <div
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border shadow-2xs flex-shrink-0"
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
                                className="text-[11px] font-black font-mono"
                                style={{ color: isEffectiveLight ? '#1d4ed8' : '#93c5fd' }}
                              >
                                {durSec}s
                              </span>
                            </div>

                            {/* Move Up / Move Down buttons */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveLineRelative(section.id, lineIdx, -1);
                              }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                              title="Move interlude up"
                              aria-label="Move interlude up"
                            >
                              <span className="material-symbols-rounded text-sm">arrow_upward</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveLineRelative(section.id, lineIdx, 1);
                              }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                              title="Move interlude down"
                              aria-label="Move interlude down"
                            >
                              <span className="material-symbols-rounded text-sm">arrow_downward</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLine(section.id, line.id);
                              }}
                              aria-label="Remove interlude event"
                              data-testid={`interlude-delete-btn-${lineIdx}`}
                              className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-rose-500 hover:bg-rose-500/15 active:scale-95 flex-shrink-0"
                              title="Remove Interlude"
                            >
                              <span className="material-symbols-rounded text-sm">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Middle row: Label quick preset chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0 text-slate-400">
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
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 flex-wrap">
                          {/* Duration Stepper Controls */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider mr-0.5 text-slate-400">
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
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-all cursor-pointer hover:bg-white/10 active:scale-90"
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
                              className="rounded-md px-1.5 py-0.5 text-xs font-mono font-bold w-11 outline-none text-center shadow-xs transition-colors"
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
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-all cursor-pointer hover:bg-white/10 active:scale-90"
                              style={{
                                backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                border: isEffectiveLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                                color: isEffectiveLight ? '#0f172a' : '#ffffff',
                              }}
                              title="Increase 1s"
                            >
                              +
                            </button>

                            <span className="text-[10px] font-mono font-semibold ml-0.5 text-slate-400">
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
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
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
                  const isLineBold = Boolean(line.format?.bold || currentDoc.formatting?.bold);

                  // In LYRICS mode: render editable input line
                  if (mode === 'lyrics') {
                    return (
                      <div
                        key={line.id || lineIdx}
                        data-testid={`lyric-line-${section.id}-${lineIdx}`}
                        data-line-id={line.id}
                        data-section-id={section.id}
                        data-line-index={lineIdx}
                        onClick={() => setLastActivePosition(section.id, lineIdx, line.id)}
                        onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                        onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                        className="group/line relative flex items-center py-1 px-1 transition-all rounded-lg"
                        style={{
                          transform: translateYOffset !== 0 ? `translateY(${translateYOffset}px)` : undefined,
                          transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                        }}
                      >
                        <input
                          ref={(el) => { inputRefs.current[line.id] = el; }}
                          type="text"
                          value={line.text}
                          onFocus={() => {
                            setLastActivePosition(section.id, lineIdx, line.id);
                            setActiveSelection({ sectionId: section.id, lineId: line.id, start: 0, end: line.text.length, text: line.text });
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val.length > 0) {
                              const parseResult = parseLineStructuralElement(val);
                              if (parseResult.kind === 'section') {
                                handlePromoteLineToSection(section.id, lineIdx, parseResult);
                              } else if (parseResult.kind === 'interlude') {
                                handlePromoteLineToInterlude(section.id, lineIdx, parseResult);
                              }
                            }
                          }}
                          onChange={(e) => {
                            setLastActivePosition(section.id, lineIdx, line.id);
                            handleUpdateLineText(section.id, line.id, e.target.value);
                          }}
                          onKeyDown={(e) => handleLineKeyDown(e, section.id, lineIdx, line.id)}
                          onPaste={(e) => handlePasteIntoLine(e, section.id, lineIdx, line.id)}
                          placeholder={secIdx === 0 && lineIdx === 0 && section.lines.length === 1 ? 'Write or paste lyrics here...' : ''}
                          data-testid={`lyric-line-input-${lineIdx}`}
                          className="w-full bg-transparent border-0 outline-none text-base leading-relaxed tracking-wide transition-colors"
                          style={{
                            color: resolvedColor,
                            fontWeight: isLineBold ? 700 : 500,
                            fontFamily: 'inherit',
                            caretColor: accent.from || '#2563EB',
                          }}
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          spellCheck="false"
                        />
                        {line.vocalRole && (
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 self-center ml-2"
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
                    );
                  }

                  // In BOTH mode: render words with chord lanes
                  // Empty line: clean paragraph break
                  if (!line.text || line.text.trim().length === 0) {
                    const hasChords = line.chords && line.chords.length > 0;
                    if (!hasChords) {
                      return (
                        <div
                          key={line.id || lineIdx}
                          data-line-id={line.id}
                          data-section-id={section.id}
                          data-line-index={lineIdx}
                          onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                          onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                          className="h-5 w-full select-none"
                        />
                      );
                    }
                    return (
                      <div
                        key={line.id || lineIdx}
                        data-testid={`lyric-line-${section.id}-${lineIdx}`}
                        data-line-id={line.id}
                        data-section-id={section.id}
                        data-line-index={lineIdx}
                        onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                        onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                        className="relative flex items-center gap-2 py-1 px-1 rounded-lg"
                        style={{
                          transform: translateYOffset !== 0 ? `translateY(${translateYOffset}px)` : undefined,
                          transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                        }}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {line.chords!.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              data-testid={`placed-chord-${c.chord}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChordForEdit({
                                  sectionId: section.id,
                                  lineId: line.id,
                                  chord: c,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-extrabold border transition-all cursor-pointer active:scale-95 shadow-2xs hover:brightness-110 whitespace-nowrap z-10 select-none"
                              style={{
                                backgroundColor: isEffectiveLight
                                  ? 'rgba(37, 99, 235, 0.12)'
                                  : 'rgba(56, 189, 248, 0.20)',
                                borderColor: isEffectiveLight
                                  ? 'rgba(37, 99, 235, 0.40)'
                                  : 'rgba(56, 189, 248, 0.45)',
                                color: isEffectiveLight ? '#1d4ed8' : '#38bdf8',
                              }}
                            >
                              <span>{c.chord}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  const lineChords = line.chords || [];
                  const isPlacementActive = Boolean(activePlacementChord);
                  const words = findWordBoundaries(line.text);

                  return (
                    <div
                      key={line.id || lineIdx}
                      data-testid={`lyric-line-${section.id}-${lineIdx}`}
                      data-line-id={line.id}
                      data-section-id={section.id}
                      data-line-index={lineIdx}
                      onClick={() => setLastActivePosition(section.id, lineIdx, line.id)}
                      onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                      onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                      className="group/line relative flex flex-wrap items-end gap-x-2 gap-y-2 py-1 px-1 transition-all rounded-lg select-none"
                      style={{
                        transform: translateYOffset !== 0 ? `translateY(${translateYOffset}px)` : undefined,
                        transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                      }}
                    >
                      {words.map((w, wIdx) => {
                        const wordChords = lineChords.filter(
                          (c) =>
                            (c.offset >= w.start && c.offset < w.end) ||
                            (wIdx === 0 && c.offset < w.start)
                        );

                        return (
                          <div
                            key={`${w.start}-${w.end}-${wIdx}`}
                            className="inline-flex flex-col items-start relative group/word"
                          >
                            {/* Chord Lane */}
                            <div className="h-6 flex items-center gap-1 select-none">
                              {wordChords.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  data-testid={`placed-chord-${c.chord}`}
                                  data-chord-id={c.id}
                                  data-chord-offset={c.offset}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedChordForEdit({
                                      sectionId: section.id,
                                      lineId: line.id,
                                      chord: c,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-extrabold border transition-all cursor-pointer active:scale-95 shadow-2xs hover:brightness-110 whitespace-nowrap z-10 select-none"
                                  style={{
                                    backgroundColor: isEffectiveLight
                                      ? 'rgba(37, 99, 235, 0.12)'
                                      : 'rgba(56, 189, 248, 0.20)',
                                    borderColor: isEffectiveLight
                                      ? 'rgba(37, 99, 235, 0.40)'
                                      : 'rgba(56, 189, 248, 0.45)',
                                    color: isEffectiveLight ? '#1d4ed8' : '#38bdf8',
                                  }}
                                  title={`Chord [${c.chord}] - Tap to inspect or move`}
                                >
                                  <span>{c.chord}</span>
                                </button>
                              ))}
                              {isPlacementActive && wordChords.length === 0 && (
                                <span className="text-[10px] font-mono font-bold text-sky-400/50 group-hover/word:text-sky-400">
                                  +
                                </span>
                              )}
                            </div>

                            {/* Word Text (Tap in placement mode anchors the chord!) */}
                            <span
                              onClick={() => {
                                if (activePlacementChord) {
                                  handleAnchorChord(section.id, line.id, activePlacementChord, w.start);
                                }
                              }}
                              className={`text-base tracking-wide transition-all ${
                                activePlacementChord
                                  ? 'cursor-pointer hover:text-sky-400 active:scale-95 underline decoration-sky-400/40 decoration-dotted'
                                  : ''
                              }`}
                              style={{
                                color: resolvedColor,
                                fontWeight: isLineBold ? 800 : 500,
                                fontFamily: 'inherit',
                              }}
                            >
                              {w.word}
                            </span>
                          </div>
                        );
                      })}

                      {/* Vocal Role badge if present on line */}
                      {line.vocalRole && (
                        <span
                          className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 self-center mb-1"
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

        {/* ── UNIFIED BLACK FLOATING ADD (+) BUTTON (MATCHING CHORDS & LYRICS) ── */}
        {typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed z-50 pointer-events-auto"
              style={{
                bottom:
                  'calc(var(--bottom-nav-height, 0px) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
                right: '16px',
              }}
              data-purpose={mode === 'lyrics' ? 'lyrics-action-menu' : 'both-action-menu'}
            >
              <MorphingActionSurface
                placement="anchor"
                compact
                maxWidth={260}
                title="Add to Song"
                accentColor={accent.from}
                customTrigger={({ triggerProps }) => (
                  <motion.button
                    {...triggerProps}
                    aria-label="Add Action"
                    data-testid={mode === 'lyrics' ? 'lyrics-fab-add' : 'both-fab-add'}
                    data-action="add-actions"
                    className="rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all select-none"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '9999px',
                      background: 'rgba(18, 18, 18, 0.85)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                      color: '#ffffff',
                    }}
                    type="button"
                  >
                    <span className="material-symbols-rounded text-2xl font-bold">add</span>
                  </motion.button>
                )}
                rows={[
                  ...(mode === 'lyrics'
                    ? [
                        {
                          id: 'action-clear-lyrics',
                          label: 'Clear All Lyrics',
                          icon: 'delete',
                          destructive: true,
                          sublabel: 'Permanently remove all text',
                          onPress: () => {
                            setShowClearLyricsConfirm(true);
                          },
                        },
                      ]
                    : []),
                  ...(mode === 'both'
                    ? [
                        {
                          id: 'action-chord',
                          label: 'Add Chord',
                          icon: 'music_note',
                          sublabel: 'Select & tap letter to place',
                          onPress: () => {
                            setShowChordPalette(true);
                          },
                        },
                      ]
                    : []),
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
                    icon: 'hourglass_bottom',
                    sublabel: 'Timed silence / solo (e.g. 15s)',
                    onPress: () => {
                      handleAddInterludeLine(lastActivePositionRef.current?.sectionId, lastActivePositionRef.current?.lineIndex);
                    },
                  },
                  {
                    id: 'action-styling',
                    label: 'Text Presentation',
                    icon: 'palette',
                    sublabel: 'Colors, bold, vocal roles',
                    onPress: () => {
                      setShowTextMorph(true);
                    },
                  },
                ]}
              />
            </div>,
            document.body
          )}

        {/* ── DIALOG: CLEAR ALL LYRICS CONFIRMATION ── */}
        <Dialog
          open={showClearLyricsConfirm}
          onClose={() => setShowClearLyricsConfirm(false)}
          title="Clear Lyrics?"
          isDestructive={true}
          footer={
            <>
              <Button
                onClick={() => setShowClearLyricsConfirm(false)}
                data-testid="cancel-clear-lyrics-btn"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                data-testid="confirm-clear-lyrics-btn"
                onClick={() => {
                  handleClearAllLyrics();
                  setShowClearLyricsConfirm(false);
                  toast.success('Lyrics cleared');
                }}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                Clear All
              </Button>
            </>
          }
        >
          <p className="text-sm text-[var(--c-text-secondary)]">
            This will permanently remove all text from this song. This action cannot be undone.
          </p>
        </Dialog>

        {/* ── DIALOG: CHORD SELECTION PALETTE ── */}
        <Dialog
          open={showChordPalette}
          onClose={() => setShowChordPalette(false)}
          title="Select Chord to Place"
          size="md"
        >
          <div className="flex flex-col gap-3 py-1" data-testid="chord-palette-dialog">
            <p className="text-xs text-gray-400 leading-relaxed">
              Choose a chord, then tap directly on any letter in your lyrics to anchor it:
            </p>

            {/* Song Chords & Quick Chords */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto py-1 no-scrollbar">
              {quickChords.map((chord) => {
                const isSongChord = availableChords.includes(chord);
                return (
                  <button
                    key={chord}
                    type="button"
                    data-testid={`palette-chord-${chord}`}
                    onClick={() => {
                      setActivePlacementChord(chord);
                      setShowChordPalette(false);
                      toast.info(`Tap letter to place [${chord}]`);
                    }}
                    className="h-10 px-2.5 rounded-xl font-mono font-black text-xs flex items-center justify-center transition active:scale-95 cursor-pointer border"
                    style={{
                      backgroundColor: isSongChord
                        ? `${accent.from}28`
                        : isEffectiveLight
                          ? 'rgba(0,0,0,0.04)'
                          : 'rgba(255,255,255,0.06)',
                      borderColor: isSongChord
                        ? `${accent.from}66`
                        : isEffectiveLight
                          ? 'rgba(0,0,0,0.12)'
                          : 'rgba(255,255,255,0.1)',
                      color: isSongChord
                        ? accent.from
                        : isEffectiveLight
                          ? '#0f172a'
                          : 'var(--c-text-primary, #ffffff)',
                    }}
                    title={isSongChord ? `Song Chord: ${chord}` : chord}
                  >
                    <span>{chord}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                data-testid="palette-browse-library-btn"
                onClick={() => {
                  setShowChordPalette(false);
                  setChordPickerTarget(null);
                  setChordSearchQuery('');
                  setChordRootFilter('All');
                  setChordTypeFilter('all');
                  setShowChordPicker(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: `${accent.from}18`,
                  borderColor: `${accent.from}44`,
                  color: accent.from,
                }}
              >
                <span className="material-symbols-rounded text-base">library_music</span>
                <span>Browse Full Library...</span>
              </button>
            </div>
          </div>
        </Dialog>

        {/* ── Morphing Section Picker ── */}
        <MorphingActionSurface
          isOpen={showSectionMorph}
          onOpenChange={setShowSectionMorph}
          placement="center"
          compact
          maxWidth={260}
          title="Add Section"
          accentColor={accent.from}
          rows={[
            { id: 'verse', label: 'Verse', icon: 'queue_music', onPress: () => handleCreateSection('Verse', 'verse') },
            { id: 'chorus', label: 'Chorus', icon: 'music_note', onPress: () => handleCreateSection('Chorus', 'chorus') },
            { id: 'bridge', label: 'Bridge', icon: 'linear_scale', onPress: () => handleCreateSection('Bridge', 'bridge') },
            { id: 'pre-chorus', label: 'Pre-Chorus', icon: 'graphic_eq', onPress: () => handleCreateSection('Pre-Chorus', 'pre-chorus') },
            { id: 'intro', label: 'Intro', icon: 'play_arrow', onPress: () => handleCreateSection('Intro', 'intro') },
            { id: 'outro', label: 'Outro', icon: 'stop', onPress: () => handleCreateSection('Outro', 'outro') },
            { id: 'solo', label: 'Solo', icon: 'timer', onPress: () => handleCreateSection('Solo', 'solo') },
            { id: 'interlude', label: 'Interlude', icon: 'hourglass_bottom', onPress: () => handleCreateSection('Interlude', 'interlude') },
            {
              id: 'custom',
              label: 'Custom...',
              icon: 'edit',
              onPress: () => {
                const name = window.prompt('Section name:');
                if (name && name.trim()) {
                  handleCreateSection(name.trim(), 'custom');
                }
              },
            },
          ]}
        />

        {/* ── Morphing Text Formatting & Color Surface ── */}
        <MorphingActionSurface
          isOpen={showTextMorph}
          onOpenChange={setShowTextMorph}
          placement="center"
          maxWidth={300}
          title="Text & Colors"
          accentColor={accent.from}
        >
          {({ close }) => (
            <div className="flex flex-col gap-3 py-1 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <span className="font-bold text-gray-300">Text Formatting</span>
                <button
                  type="button"
                  onClick={handleFormatBold}
                  className="px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition active:scale-95"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'var(--c-text-primary, #ffffff)',
                  }}
                >
                  <span className="font-black">B</span>
                  <span>Toggle Bold</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-gray-400">Color Palette</span>
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
                          close();
                          if (activeSelection && activeSelection.start !== activeSelection.end) {
                            handleFormatColor(newColor);
                          }
                          if (newColor) {
                            toast.success(`Color tool active: tap words to apply ${c.label}`);
                          } else {
                            toast.info('Color reset tool active: tap words to reset color');
                          }
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${
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
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    const sel = activeSelectionRef.current;
                    if (sel) {
                      setRolePickerTarget({ sectionId: sel.sectionId, lineId: sel.lineId });
                    } else if (currentDoc.sections.length > 0) {
                      setRolePickerTarget({ sectionId: currentDoc.sections[0].id });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: `${accent.from}15`,
                    borderColor: `${accent.from}35`,
                    color: accent.from,
                  }}
                >
                  <span className="material-symbols-rounded text-sm">mic</span>
                  <span>Assign Vocal Roles...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    close();
                    handlePasteLyricsFromClipboard();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border text-xs font-semibold text-gray-300 hover:text-white bg-white/5 border-white/10 transition active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">content_paste</span>
                  <span>Paste Lyrics</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    close();
                    handleCopyLyricsToClipboard();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border text-xs font-semibold text-gray-300 hover:text-white bg-white/5 border-white/10 transition active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">content_copy</span>
                  <span>Copy Lyrics & Chords</span>
                </button>
              </div>
            </div>
          )}
        </MorphingActionSurface>
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

              {/* Canonical Guitar Fretboard Diagram Preview */}
              {resolvedChordObj && (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/10 bg-white/5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 self-start">
                    Fretboard Diagram
                  </span>
                  <DetailFretboardDiagram
                    chordData={resolvedChordObj.guitar}
                    maxWidth="180px"
                    accentColor={accent.from}
                    displayMode="notes"
                  />
                </div>
              )}

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

                <button
                  type="button"
                  data-testid="chord-reanchor-btn"
                  onClick={() => {
                    setMovingChordInfo({
                      sectionId: selectedChordForEdit.sectionId,
                      lineId: selectedChordForEdit.lineId,
                      chordId: selectedChordForEdit.chord.id,
                      chord: selectedChordForEdit.chord.chord,
                    });
                    setActivePlacementChord(selectedChordForEdit.chord.chord);
                    setSelectedChordForEdit(null);
                    toast.info(`Tap letter to place [${selectedChordForEdit.chord.chord}]`);
                  }}
                  className="w-full py-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                  style={{
                    backgroundColor: isEffectiveLight ? 'rgba(37, 99, 235, 0.10)' : 'rgba(56, 189, 248, 0.15)',
                    borderColor: isEffectiveLight ? 'rgba(37, 99, 235, 0.35)' : 'rgba(56, 189, 248, 0.40)',
                    color: isEffectiveLight ? '#1d4ed8' : '#38bdf8',
                  }}
                >
                  <span className="material-symbols-rounded text-sm">pin_drop</span>
                  <span>Re-anchor / Move to letter</span>
                </button>
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
                    const chordName = selectedChordForEdit.chord.chord;
                    handleRemoveChordFromLine(
                      selectedChordForEdit.sectionId,
                      selectedChordForEdit.lineId,
                      selectedChordForEdit.chord.id
                    );
                    setSelectedChordForEdit(null);
                    toast.info(`Chord [${chordName}] returned to unassigned queue`);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-base">delete</span>
                  <span>Remove Chord (Return to Queue)</span>
                </button>
                <button
                  type="button"
                  data-testid="chord-detail-close-btn"
                  onClick={() => setSelectedChordForEdit(null)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
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
                    {chordPickerTarget.wordText ? chordPickerTarget.wordText : 'Start'}
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
                    } else {
                      setActivePlacementChord(chord.name);
                      setShowChordPicker(false);
                      toast.info(`Tap letter to place [${chord.name}]`);
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

