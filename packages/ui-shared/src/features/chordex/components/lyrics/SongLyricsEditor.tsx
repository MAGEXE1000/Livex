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
  toggleItalicOnSelection,
  toggleUnderlineOnSelection,
  isSelectionBold,
  isSelectionItalic,
  isSelectionUnderline,
  setColorOnSelection,
  setRoleOnSelection,
  clearFormattingOnSelection,
  getCharacterColor,
  getCharacterBold,
  getCharacterItalic,
  getCharacterUnderline,
  getCharacterBackgroundColor,
  getCharacterVocalRole,
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

export interface CapturedSelectionLine {
  sectionId: string;
  lineId: string;
  lineIndex: number;
  start: number;
  end: number;
  isFullLine: boolean;
}

export interface CapturedSelectionData {
  lines: CapturedSelectionLine[];
  sectionIds: string[];
  fullText: string;
}

function areLyricsEqual(a: SongLyricsDocument | undefined, b: SongLyricsDocument | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.sections.length !== b.sections.length) return false;
  if (a.formatting?.bold !== b.formatting?.bold || a.formatting?.defaultColor !== b.formatting?.defaultColor) return false;

  for (let i = 0; i < a.sections.length; i++) {
    const sa = a.sections[i];
    const sb = b.sections[i];
    if (sa.id !== sb.id || sa.name !== sb.name || sa.type !== sb.type) return false;
    if (
      sa.vocalRole?.type !== sb.vocalRole?.type ||
      sa.vocalRole?.label !== sb.vocalRole?.label ||
      sa.vocalRole?.color !== sb.vocalRole?.color
    ) {
      return false;
    }
    if (sa.lines.length !== sb.lines.length) return false;

    for (let j = 0; j < sa.lines.length; j++) {
      const la = sa.lines[j];
      const lb = sb.lines[j];
      if (la.id !== lb.id || la.text !== lb.text || la.type !== lb.type) return false;
      if (la.format?.bold !== lb.format?.bold || la.format?.color !== lb.format?.color) return false;
      if (la.explicitDurationMs !== lb.explicitDurationMs) return false;
      if (
        la.vocalRole?.type !== lb.vocalRole?.type ||
        la.vocalRole?.label !== lb.vocalRole?.label ||
        la.vocalRole?.color !== lb.vocalRole?.color
      ) {
        return false;
      }

      const chordsA = la.chords ?? [];
      const chordsB = lb.chords ?? [];
      if (chordsA.length !== chordsB.length) return false;
      for (let k = 0; k < chordsA.length; k++) {
        if (chordsA[k].id !== chordsB[k].id || chordsA[k].chord !== chordsB[k].chord || chordsA[k].offset !== chordsB[k].offset) {
          return false;
        }
      }

      const spansA = la.spans ?? [];
      const spansB = lb.spans ?? [];
      if (spansA.length !== spansB.length) return false;
      for (let k = 0; k < spansA.length; k++) {
        if (spansA[k].text !== spansB[k].text || spansA[k].format?.bold !== spansB[k].format?.bold || spansA[k].format?.color !== spansB[k].format?.color) {
          return false;
        }
      }
    }
  }
  return true;
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
  // Stable onChange reference to decouple store dispatches from component effects & handlers
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Local document state initialized from props
  const [localDoc, setLocalDoc] = useState<SongLyricsDocument>(() => {
    const initial = lyrics && Array.isArray(lyrics.sections) ? lyrics : createEmptyLyricsDocument();
    return normalizeLyricsDocumentStructure(initial);
  });
  const localDocRef = useRef<SongLyricsDocument>(localDoc);
  localDocRef.current = localDoc;

  // Keep localDoc in sync when external lyrics prop updates (bailing out when identical to eliminate loops)
  useEffect(() => {
    if (lyrics && Array.isArray(lyrics.sections)) {
      if (lyrics === localDocRef.current) return;
      if (areLyricsEqual(lyrics, localDocRef.current)) return;
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
        onChangeRef.current(nextDoc);
      } else {
        debounceTimerRef.current = setTimeout(() => {
          onChangeRef.current(nextDoc);
          debounceTimerRef.current = null;
        }, 400);
      }
    },
    []
  );

  // Clear All Lyrics confirmation dialog state & handler
  const [showClearLyricsConfirm, setShowClearLyricsConfirm] = useState(false);
  const handleClearAllLyrics = useCallback(() => {
    const emptyDoc: SongLyricsDocument = {
      version: 1,
      sections: [
        {
          id: generateLyricId('sec'),
          type: 'verse',
          name: '',
          lines: [{ id: generateLyricId('line'), text: '' }],
        },
      ],
    };
    setLocalDoc(emptyDoc);
    localDocRef.current = emptyDoc;
    triggerChange(emptyDoc, true);
    setEditingLineId(null);
    toast.success('Lyrics cleared');
  }, [triggerChange]);

  // Flush debounced change strictly on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        if (localDocRef.current) {
          onChangeRef.current(localDocRef.current);
        }
      }
    };
  }, []);

  // Undo / Redo history stacks
  const historyRef = useRef<SongLyricsDocument[]>([]);
  const futureRef = useRef<SongLyricsDocument[]>([]);

  // Input/textarea refs and cursor focus management
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const pendingFocusLineIdRef = useRef<string | null>(null);
  const targetCursorOffsetRef = useRef<number | null>(null);

  // Focus management effect for newly created or targeted lines
  useEffect(() => {
    if (pendingFocusLineIdRef.current) {
      const lineId = pendingFocusLineIdRef.current;
      setEditingLineId(lineId);
      pendingFocusLineIdRef.current = null;
      setTimeout(() => {
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
      }, 10);
    }
  }, [currentDoc]);

  // Drag and drop state for interludes and lines
  const [draggedLine, setDraggedLine] = useState<{ sectionId: string; lineId: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ sectionId: string; lineIdx: number } | null>(null);
  const dragOverTargetRef = useRef<{ sectionId: string; lineIdx: number } | null>(null);
  dragOverTargetRef.current = dragOverTarget;

  // Drag and drop state for whole section modular containers
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState<number | null>(null);
  const dragOverSectionIdxRef = useRef<number | null>(null);
  dragOverSectionIdxRef.current = dragOverSectionIdx;

  // Captured selection reference for selection-first formatting operations
  const capturedSelectionRef = useRef<CapturedSelectionData | null>(null);
  const [hasCapturedSelection, setHasCapturedSelection] = useState(false);

  // Active single-line editing state in lyrics mode
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Workspace container ref for DOM selection measurements
  const workspaceRef = useRef<HTMLDivElement | null>(null);

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

  // Robust Selection Detection & Preservation
  const captureSelection = useCallback((): CapturedSelectionData | null => {
    if (typeof window === 'undefined') return null;

    // 1. Check if an active input/textarea inside the editor has text selected
    const activeEl = document.activeElement;
    if (
      (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
      activeEl.selectionStart !== null &&
      activeEl.selectionEnd !== null &&
      activeEl.selectionStart !== activeEl.selectionEnd
    ) {
      const lineEl = activeEl.closest('[data-line-id]') as HTMLElement | null;
      if (lineEl) {
        const sectionId = lineEl.dataset.sectionId || '';
        const lineId = lineEl.dataset.lineId || '';
        const lineIndex = parseInt(lineEl.dataset.lineIndex || '0', 10);
        const start = Math.min(activeEl.selectionStart, activeEl.selectionEnd);
        const end = Math.max(activeEl.selectionStart, activeEl.selectionEnd);
        const isFullLine = start === 0 && end >= activeEl.value.length;
        return {
          lines: [
            {
              sectionId,
              lineId,
              lineIndex,
              start,
              end,
              isFullLine,
            },
          ],
          sectionIds: sectionId ? [sectionId] : [],
          fullText: activeEl.value.slice(start, end),
        };
      }
    }

    // 2. Check window.getSelection() across DOM text nodes
    const winSel = window.getSelection();
    if (!winSel || winSel.isCollapsed || winSel.rangeCount === 0) {
      return null;
    }

    const range = winSel.getRangeAt(0);
    const container = workspaceRef.current;
    if (!container) return null;

    if (!container.contains(range.commonAncestorContainer) && !range.intersectsNode(container)) {
      return null;
    }

    const lineEls = Array.from(container.querySelectorAll<HTMLElement>('[data-line-id]'));
    const capturedLines: CapturedSelectionLine[] = [];
    const sectionIdsSet = new Set<string>();

    for (const lineEl of lineEls) {
      let intersects = false;
      try {
        intersects = range.intersectsNode(lineEl);
      } catch {
        intersects = winSel.containsNode(lineEl, true);
      }

      if (!intersects) continue;

      const sectionId = lineEl.dataset.sectionId || '';
      const lineId = lineEl.dataset.lineId || '';
      const lineIndex = parseInt(lineEl.dataset.lineIndex || '0', 10);

      const sec = localDocRef.current.sections.find((s) => s.id === sectionId);
      const line = sec?.lines.find((l) => l.id === lineId);
      const textLen = line?.text ? line.text.length : 0;

      let start = 0;
      let end = textLen;

      if (lineEl.contains(range.startContainer)) {
        try {
          const startRange = document.createRange();
          startRange.setStart(lineEl, 0);
          startRange.setEnd(range.startContainer, range.startOffset);
          start = Math.max(0, Math.min(textLen, startRange.toString().length));
        } catch {
          start = 0;
        }
      }

      if (lineEl.contains(range.endContainer)) {
        try {
          const endRange = document.createRange();
          endRange.setStart(lineEl, 0);
          endRange.setEnd(range.endContainer, range.endOffset);
          end = Math.max(0, Math.min(textLen, endRange.toString().length));
        } catch {
          end = textLen;
        }
      }

      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }

      const isFullLine = start === 0 && end >= textLen;
      capturedLines.push({
        sectionId,
        lineId,
        lineIndex,
        start,
        end,
        isFullLine,
      });
      if (sectionId) sectionIdsSet.add(sectionId);
    }

    if (capturedLines.length === 0) return null;

    return {
      lines: capturedLines,
      sectionIds: Array.from(sectionIdsSet),
      fullText: winSel.toString(),
    };
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const captured = captureSelection();
      if (captured && captured.lines.length > 0) {
        capturedSelectionRef.current = captured;
        setHasCapturedSelection(true);
      } else {
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        const isInteractingWithControls =
          active && (active.closest('[data-morphing-surface]') || active.closest('[data-action="add-actions"]'));
        if (!isInteractingWithControls) {
          const winSel = typeof window !== 'undefined' ? window.getSelection() : null;
          if (!winSel || winSel.isCollapsed) {
            setHasCapturedSelection(false);
          }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [captureSelection]);

  // Dialog & popover states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteModalText, setPasteModalText] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showChordPalette, setShowChordPalette] = useState(false);
  const [showSectionMorph, setShowSectionMorph] = useState(false);
  const [showToolbarColorPicker, setShowToolbarColorPicker] = useState(false);
  const [showToolbarRolePicker, setShowToolbarRolePicker] = useState(false);
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
    sectionId?: string;
    lineId?: string;
    lineIds?: string[];
    sectionIds?: string[];
  } | null>(null);

  // Custom roles management state
  const [customRolesVersion, setCustomRolesVersion] = useState(0);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#ec4899');

  const { defaults: defaultVocalRoles, customs: customVocalRoles } = useMemo(() => {
    return getCombinedVocalRoles(currentDoc);
  }, [currentDoc, customRolesVersion]);

  const hasAnyVocalRoles = useMemo(() => {
    if (currentDoc.defaultVocalRole) return true;
    return currentDoc.sections.some(
      (s) =>
        Boolean(s.vocalRole) ||
        s.lines.some(
          (l) =>
            Boolean(l.vocalRole) ||
            (l.spans && l.spans.some((sp) => Boolean(sp.format?.vocalRole)))
        )
    );
  }, [currentDoc]);

  const isSelectionCurrentlyBold = useMemo(() => {
    if (!hasCapturedSelection || !capturedSelectionRef.current) return false;
    const sel = capturedSelectionRef.current;
    if (sel.lines.length === 0) return false;
    for (const l of sel.lines) {
      const sec = currentDoc.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.bold && !currentDoc.formatting?.bold) return false;
      } else {
        if (!getCharacterBold(line.spans, l.start) && !line.format?.bold && !currentDoc.formatting?.bold) return false;
      }
    }
    return true;
  }, [hasCapturedSelection, currentDoc]);

  const isSelectionCurrentlyItalic = useMemo(() => {
    if (!hasCapturedSelection || !capturedSelectionRef.current) return false;
    const sel = capturedSelectionRef.current;
    if (sel.lines.length === 0) return false;
    for (const l of sel.lines) {
      const sec = currentDoc.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.italic) return false;
      } else {
        if (!getCharacterItalic(line.spans, l.start) && !line.format?.italic) return false;
      }
    }
    return true;
  }, [hasCapturedSelection, currentDoc]);

  const isSelectionCurrentlyUnderline = useMemo(() => {
    if (!hasCapturedSelection || !capturedSelectionRef.current) return false;
    const sel = capturedSelectionRef.current;
    if (sel.lines.length === 0) return false;
    for (const l of sel.lines) {
      const sec = currentDoc.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.underline) return false;
      } else {
        if (!getCharacterUnderline(line.spans, l.start) && !line.format?.underline) return false;
      }
    }
    return true;
  }, [hasCapturedSelection, currentDoc]);

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
          // 2. Try captured selection
          const capturedFirstLine = capturedSelectionRef.current?.lines[0];
          if (!targetSecId && capturedFirstLine) {
            const secExists = sections.some((s) => s.id === capturedFirstLine.sectionId);
            if (secExists) {
              targetSecId = capturedFirstLine.sectionId;
              if (resolvedLineIdx === undefined) {
                const targetSec = sections.find((s) => s.id === targetSecId);
                const lIdx = targetSec?.lines.findIndex((l) => l.id === capturedFirstLine.lineId);
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
      e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      sectionId: string,
      lineIdx: number,
      lineId: string
    ) => {
      // Prefer text/plain for full fidelity; some clipboard managers (WhatsApp, clipboard history apps)
      // only populate text/plain and not the shorthand 'text', which can cause getData('text') to return
      // an empty string on Android WebView, falling through to native <input type="text"> paste that
      // strips all newlines.
      const pastedText =
        e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
      if (!pastedText) return;

      // Normalize all line-ending variants (\r\n, \r) to canonical \n before any processing.
      // This is critical for content from Windows apps, WhatsApp, and clipboard history managers
      // that may produce \r\n or bare \r line endings.
      const normalizedText = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Structural element detection (section header / interlude) — single-line only
      const singleParse = parseLineStructuralElement(normalizedText.trim());
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

      // Single-line paste: let browser handle natively (no newlines present)
      if (!normalizedText.includes('\n')) {
        // Still need to prevent the native paste from triggering if the line text would
        // be replaced, and instead perform the splice manually to keep span/chord data intact.
        const inputEl = e.currentTarget;
        const selStart = inputEl.selectionStart ?? inputEl.value.length;
        const selEnd = inputEl.selectionEnd ?? inputEl.value.length;
        const currentText = inputEl.value;
        const before = currentText.slice(0, selStart);
        const after = currentText.slice(selEnd);
        const newLineText = before + normalizedText + after;
        e.preventDefault();
        setLastActivePosition(sectionId, lineIdx, lineId);
        handleUpdateLineText(sectionId, lineId, newLineText);
        // Restore cursor after the pasted segment
        const newCursorPos = selStart + normalizedText.length;
        pendingFocusLineIdRef.current = lineId;
        targetCursorOffsetRef.current = newCursorPos;
        return;
      }

      // Multiline paste — always intercept; never let <input type="text"> handle it
      // (the HTML spec requires single-line inputs to strip newlines on paste).
      e.preventDefault();

      const inputEl = e.currentTarget;
      const selStart = inputEl.selectionStart ?? inputEl.value.length;
      const selEnd = inputEl.selectionEnd ?? inputEl.value.length;
      const currentLineText = inputEl.value;
      const beforeCursor = currentLineText.slice(0, selStart);
      const afterCursor = currentLineText.slice(selEnd);

      const pastedLines = normalizedText.split('\n');

      const doc = localDocRef.current;
      const targetSec = doc.sections.find((s) => s.id === sectionId);
      const targetLine = targetSec?.lines.find((l) => l.id === lineId);

      // If the current line is empty and the doc has only one empty section (blank editor),
      // parse the whole pasted block as a fresh document.
      const isDocEffectivelyEmpty =
        doc.sections.length === 1 &&
        doc.sections[0].lines.length === 1 &&
        (!doc.sections[0].lines[0].text || doc.sections[0].lines[0].text.trim() === '') &&
        (!beforeCursor || !beforeCursor.trim()) &&
        (!afterCursor || !afterCursor.trim());

      if (isDocEffectivelyEmpty) {
        const parsedDoc = continuousTextToLyricsDocument(normalizedText, doc);
        const normalizedDoc = normalizeLyricsDocumentStructure(parsedDoc);
        updateDoc(() => normalizedDoc, true);
        return;
      }

      // Non-empty doc: splice pasted content at cursor position within the document structure.
      // Strategy:
      //   - The first pasted line is appended to `beforeCursor` text of the current line.
      //   - Middle pasted lines become new standalone lines inserted after.
      //   - The last pasted line is prepended before `afterCursor` and becomes a new line too.
      const firstPastedLine = pastedLines[0];
      const lastPastedLine = pastedLines[pastedLines.length - 1];
      const middleLines = pastedLines.slice(1, pastedLines.length - 1);

      updateDoc((prev) => {
        const newSections = prev.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;

          const newLines = [...sec.lines];
          const targetLineIdx = newLines.findIndex((l) => l.id === lineId);
          if (targetLineIdx === -1) return sec;

          // Update current line with before-cursor + first pasted line
          const updatedCurrentLine: SongLyricLine = {
            ...newLines[targetLineIdx],
            text: beforeCursor + firstPastedLine,
            // Clear spans/chords since text structure has fundamentally changed
            spans: undefined,
            chords:
              targetLine?.chords && targetLine.chords.length > 0
                ? shiftChordOffsets(currentLineText, beforeCursor + firstPastedLine, targetLine.chords)
                : undefined,
          };

          const insertedLines: SongLyricLine[] = middleLines.map((ml) => ({
            id: generateLyricId('line'),
            text: ml,
          }));

          // Final line = last pasted segment + after-cursor
          const finalLine: SongLyricLine = {
            id: generateLyricId('line'),
            text: lastPastedLine + afterCursor,
          };

          newLines.splice(
            targetLineIdx,
            1,
            updatedCurrentLine,
            ...insertedLines,
            finalLine
          );

          return { ...sec, lines: newLines };
        });

        return { ...prev, sections: newSections };
      }, true);

      // Focus the last inserted line at end of last pasted segment
      const lastInsertedId = '__paste_last__'; // resolved inside updateDoc above
      void lastInsertedId; // suppress unused warning — focus is set via DOM after re-render
    },
    [
      localDocRef,
      updateDoc,
      handlePromoteLineToSection,
      handlePromoteLineToInterlude,
      handleUpdateLineText,
      setLastActivePosition,
    ]
  );

  const handleLineKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
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
        // Textarea handles intra-line vertical navigation natively.
        // Only intercept when cursor is already at position 0 (top of this textarea)
        // to jump to the previous line's textarea.
        const target = e.currentTarget;
        const selStart = target.selectionStart ?? 0;
        if (selStart === 0) {
          const currentSec = currentDoc.sections.find((s) => s.id === sectionId);
          if (lineIdx > 0 && currentSec) {
            const prevLine = currentSec.lines[lineIdx - 1];
            if (prevLine && inputRefs.current[prevLine.id]) {
              e.preventDefault();
              const el = inputRefs.current[prevLine.id];
              el?.focus();
              try {
                const len = el?.value.length ?? 0;
                el?.setSelectionRange(len, len);
              } catch (_) {}
            }
          }
        }
      } else if (e.key === 'ArrowDown') {
        // Only intercept when cursor is at end of this textarea to jump to next line's textarea.
        const target = e.currentTarget;
        const selStart = target.selectionStart ?? 0;
        const valLen = target.value.length;
        if (selStart >= valLen) {
          const currentSec = currentDoc.sections.find((s) => s.id === sectionId);
          if (currentSec && lineIdx < currentSec.lines.length - 1) {
            const nextLine = currentSec.lines[lineIdx + 1];
            if (nextLine && inputRefs.current[nextLine.id]) {
              e.preventDefault();
              const el = inputRefs.current[nextLine.id];
              el?.focus();
              try {
                el?.setSelectionRange(0, 0);
              } catch (_) {}
            }
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

      // Cache target coordinates at drag initiation to prevent transform-induced flapping / recursive render storm
      const cachedTargets = Array.from(
        document.querySelectorAll<HTMLElement>('[data-line-id]')
      ).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          sectionId: el.dataset.sectionId || '',
          lineIndex: parseInt(el.dataset.lineIndex || '0', 10),
          midY: (rect.top + rect.bottom) / 2,
        };
      });

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (cachedTargets.length === 0) return;
        let closest = cachedTargets[0];
        let minDiff = Infinity;
        for (const target of cachedTargets) {
          const diff = Math.abs(moveEvent.clientY - target.midY);
          if (diff < minDiff) {
            minDiff = diff;
            closest = target;
          }
        }
        if (closest.sectionId) {
          const current = dragOverTargetRef.current;
          if (!current || current.sectionId !== closest.sectionId || current.lineIdx !== closest.lineIndex) {
            const nextTarget = { sectionId: closest.sectionId, lineIdx: closest.lineIndex };
            dragOverTargetRef.current = nextTarget;
            setDragOverTarget(nextTarget);
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
    const sel = capturedSelectionRef.current;
    if (!sel || sel.lines.length === 0) {
      if (lastActivePositionRef.current) {
        const pos = lastActivePositionRef.current;
        updateDoc((doc) => ({
          ...doc,
          sections: doc.sections.map((sec) => {
            if (sec.id !== pos.sectionId) return sec;
            return {
              ...sec,
              lines: sec.lines.map((l) => {
                if (l.id !== pos.lineId) return l;
                const currentBold = Boolean(l.format?.bold);
                return {
                  ...l,
                  format: { ...l.format, bold: !currentBold },
                };
              }),
            };
          }),
        }));
        // No toast — formatting feedback is visual-only (zero-toast policy)
        return;
      }

      // Otherwise toggle doc bold
      updateDoc((doc) => ({
        ...doc,
        formatting: { ...doc.formatting, bold: !doc.formatting?.bold },
      }));
      // No toast — formatting feedback is visual-only (zero-toast policy)
      return;
    }

    const targetLineMap = new Map<string, CapturedSelectionLine>();
    for (const l of sel.lines) {
      targetLineMap.set(l.lineId, l);
    }

    // Determine if all targets are currently bold to toggle
    let allBold = true;
    for (const l of sel.lines) {
      const sec = localDocRef.current.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.bold && !localDocRef.current.formatting?.bold) {
          allBold = false;
          break;
        }
      } else {
        const isPartBold = getCharacterBold(line.spans, l.start);
        if (!isPartBold && !line.format?.bold && !localDocRef.current.formatting?.bold) {
          allBold = false;
          break;
        }
      }
    }

    const nextBold = !allBold;

    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) => {
        const hasLine = sec.lines.some((l) => targetLineMap.has(l.id));
        if (!hasLine) return sec;

        return {
          ...sec,
          lines: sec.lines.map((l) => {
            const lineSel = targetLineMap.get(l.id);
            if (!lineSel) return l;

            if (lineSel.isFullLine || lineSel.start === lineSel.end) {
              return {
                ...l,
                format: { ...l.format, bold: nextBold },
              };
            }

            const nextSpans = toggleBoldOnSelection(l.spans, l.text, lineSel.start, lineSel.end);
            return { ...l, spans: nextSpans };
          }),
        };
      }),
    }));
    // No toast — formatting feedback is visual-only (zero-toast policy)
  }, [updateDoc]);

  const handleFormatItalic = useCallback(() => {
    const sel = capturedSelectionRef.current;
    if (!sel || sel.lines.length === 0) {
      if (lastActivePositionRef.current) {
        const pos = lastActivePositionRef.current;
        updateDoc((doc) => ({
          ...doc,
          sections: doc.sections.map((sec) => {
            if (sec.id !== pos.sectionId) return sec;
            return {
              ...sec,
              lines: sec.lines.map((l) => {
                if (l.id !== pos.lineId) return l;
                const currentItalic = Boolean(l.format?.italic);
                return {
                  ...l,
                  format: { ...l.format, italic: !currentItalic },
                };
              }),
            };
          }),
        }));
        // No toast — formatting feedback is visual-only (zero-toast policy)
        return;
      }
      return;
    }

    const targetLineMap = new Map<string, CapturedSelectionLine>();
    for (const l of sel.lines) {
      targetLineMap.set(l.lineId, l);
    }

    let allItalic = true;
    for (const l of sel.lines) {
      const sec = localDocRef.current.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.italic) {
          allItalic = false;
          break;
        }
      } else {
        const isPartItalic = getCharacterItalic(line.spans, l.start);
        if (!isPartItalic && !line.format?.italic) {
          allItalic = false;
          break;
        }
      }
    }

    const nextItalic = !allItalic;

    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) => {
        const hasLine = sec.lines.some((l) => targetLineMap.has(l.id));
        if (!hasLine) return sec;

        return {
          ...sec,
          lines: sec.lines.map((l) => {
            const lineSel = targetLineMap.get(l.id);
            if (!lineSel) return l;

            if (lineSel.isFullLine || lineSel.start === lineSel.end) {
              return {
                ...l,
                format: { ...l.format, italic: nextItalic },
              };
            }

            const nextSpans = toggleItalicOnSelection(l.spans, l.text, lineSel.start, lineSel.end);
            return { ...l, spans: nextSpans };
          }),
        };
      }),
    }));
    // No toast — formatting feedback is visual-only (zero-toast policy)
  }, [updateDoc]);

  const handleFormatUnderline = useCallback(() => {
    const sel = capturedSelectionRef.current;
    if (!sel || sel.lines.length === 0) {
      if (lastActivePositionRef.current) {
        const pos = lastActivePositionRef.current;
        updateDoc((doc) => ({
          ...doc,
          sections: doc.sections.map((sec) => {
            if (sec.id !== pos.sectionId) return sec;
            return {
              ...sec,
              lines: sec.lines.map((l) => {
                if (l.id !== pos.lineId) return l;
                const currentUnderline = Boolean(l.format?.underline);
                return {
                  ...l,
                  format: { ...l.format, underline: !currentUnderline },
                };
              }),
            };
          }),
        }));
        // No toast — formatting feedback is visual-only (zero-toast policy)
        return;
      }
      return;
    }

    const targetLineMap = new Map<string, CapturedSelectionLine>();
    for (const l of sel.lines) {
      targetLineMap.set(l.lineId, l);
    }

    let allUnderline = true;
    for (const l of sel.lines) {
      const sec = localDocRef.current.sections.find((s) => s.id === l.sectionId);
      const line = sec?.lines.find((lineItem) => lineItem.id === l.lineId);
      if (!line) continue;
      if (l.isFullLine) {
        if (!line.format?.underline) {
          allUnderline = false;
          break;
        }
      } else {
        const isPartUnderline = getCharacterUnderline(line.spans, l.start);
        if (!isPartUnderline && !line.format?.underline) {
          allUnderline = false;
          break;
        }
      }
    }

    const nextUnderline = !allUnderline;

    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) => {
        const hasLine = sec.lines.some((l) => targetLineMap.has(l.id));
        if (!hasLine) return sec;

        return {
          ...sec,
          lines: sec.lines.map((l) => {
            const lineSel = targetLineMap.get(l.id);
            if (!lineSel) return l;

            if (lineSel.isFullLine || lineSel.start === lineSel.end) {
              return {
                ...l,
                format: { ...l.format, underline: nextUnderline },
              };
            }

            const nextSpans = toggleUnderlineOnSelection(l.spans, l.text, lineSel.start, lineSel.end);
            return { ...l, spans: nextSpans };
          }),
        };
      }),
    }));
    // No toast — formatting feedback is visual-only (zero-toast policy)
  }, [updateDoc]);

  const handleFormatColor = useCallback(
    (color: string) => {
      const sel = capturedSelectionRef.current;
      if (!sel || sel.lines.length === 0) {
        if (lastActivePositionRef.current) {
          const pos = lastActivePositionRef.current;
          updateDoc((doc) => ({
            ...doc,
            sections: doc.sections.map((sec) => {
              if (sec.id !== pos.sectionId) return sec;
              return {
                ...sec,
                lines: sec.lines.map((l) => {
                  if (l.id !== pos.lineId) return l;
                  return {
                    ...l,
                    format: { ...l.format, color: color || undefined },
                  };
                }),
              };
            }),
          }));
          // No toast — formatting feedback is visual-only (zero-toast policy)
          return;
        }

        // Document-wide color change
        updateDoc((doc) => ({
          ...doc,
          formatting: { ...doc.formatting, defaultColor: color || undefined },
        }));
        // No toast — formatting feedback is visual-only (zero-toast policy)
        return;
      }

      const targetLineMap = new Map<string, CapturedSelectionLine>();
      for (const l of sel.lines) {
        targetLineMap.set(l.lineId, l);
      }

      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          const hasLine = sec.lines.some((l) => targetLineMap.has(l.id));
          if (!hasLine) return sec;

          return {
            ...sec,
            lines: sec.lines.map((l) => {
              const lineSel = targetLineMap.get(l.id);
              if (!lineSel) return l;

              if (lineSel.isFullLine || lineSel.start === lineSel.end) {
                const nextSpans = !color && l.spans ? l.spans.map(s => ({ ...s, format: { ...s.format, color: undefined } })) : l.spans;
                return {
                  ...l,
                  format: { ...l.format, color: color || undefined },
                  spans: nextSpans,
                };
              }

              const nextSpans = setColorOnSelection(l.spans, l.text, lineSel.start, lineSel.end, color);
              return { ...l, spans: nextSpans };
            }),
          };
        }),
      }));

      // No toast — formatting feedback is visual-only (zero-toast policy)
    },
    [updateDoc]
  );

  const handleResetFormatting = useCallback(() => {
    const sel = capturedSelectionRef.current;
    if (!sel || sel.lines.length === 0) {
      updateDoc((doc) => ({
        ...doc,
        formatting: undefined,
        sections: doc.sections.map((sec) => ({
          ...sec,
          lines: sec.lines.map((l) => ({
            ...l,
            format: undefined,
            spans: undefined,
          })),
        })),
      }));
      // No toast — formatting feedback is visual-only (zero-toast policy)
      return;
    }

    const targetLineMap = new Map<string, CapturedSelectionLine>();
    for (const l of sel.lines) {
      targetLineMap.set(l.lineId, l);
    }

    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((sec) => {
        const hasLine = sec.lines.some((l) => targetLineMap.has(l.id));
        if (!hasLine) return sec;

        return {
          ...sec,
          lines: sec.lines.map((l) => {
            const lineSel = targetLineMap.get(l.id);
            if (!lineSel) return l;

            if (lineSel.isFullLine) {
              return {
                ...l,
                format: undefined,
                vocalRole: undefined,
                spans: undefined,
              };
            }

            const nextSpans = clearFormattingOnSelection(l.spans, l.text, lineSel.start, lineSel.end);
            return { ...l, spans: nextSpans };
          }),
        };
      }),
    }));

    // No toast — formatting feedback is visual-only (zero-toast policy)
  }, [updateDoc]);

  // ── CHORD PLACEMENT HELPERS ──────────────────────────────────────────

  const handleOpenChordPicker = useCallback(() => {
    const sel = capturedSelectionRef.current;
    if (!sel || sel.lines.length === 0) {
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

    const firstLine = sel.lines[0];
    setChordPickerTarget({
      sectionId: firstLine.sectionId,
      lineId: firstLine.lineId,
      offset: firstLine.start,
      wordText: sel.fullText.split(' ')[0] || 'start',
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

  // ── SECTION MANAGEMENT & REORDERING ──────────────────────────────────

  const handleCreateSection = useCallback(
    (name: string, type: StandardLyricSectionType = 'custom') => {
      updateDoc((doc) => {
        // If document only has 1 empty unnamed section, name and type it
        if (
          doc.sections.length === 1 &&
          (!doc.sections[0].name || doc.sections[0].name.trim().length === 0) &&
          doc.sections[0].lines.length <= 1 &&
          (!doc.sections[0].lines[0] || !doc.sections[0].lines[0].text.trim())
        ) {
          return {
            ...doc,
            sections: [
              {
                ...doc.sections[0],
                type,
                name: name.trim(),
              },
            ],
          };
        }
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
      setShowSectionMorph(false);
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

  const handleRemoveSectionHeader = useCallback(
    (sectionId: string) => {
      updateDoc((doc) => {
        const secIdx = doc.sections.findIndex((s) => s.id === sectionId);
        if (secIdx === -1) return doc;
        const targetSec = doc.sections[secIdx];

        // If there is a previous section, merge targetSec's lines into the previous section
        if (secIdx > 0) {
          const prevSec = doc.sections[secIdx - 1];
          const updatedPrev = {
            ...prevSec,
            lines: [...prevSec.lines, ...targetSec.lines],
          };
          const nextSections = [...doc.sections];
          nextSections.splice(secIdx - 1, 2, updatedPrev);
          return { ...doc, sections: nextSections };
        }

        // If it's the first or only section, clear the section name and vocal role
        const updatedSec = {
          ...targetSec,
          name: '',
          vocalRole: undefined,
        };
        const nextSections = [...doc.sections];
        nextSections[0] = updatedSec;
        return { ...doc, sections: nextSections };
      });
      setRenameSectionTarget(null);
      toast.success('Section header removed (lyrics preserved)');
    },
    [updateDoc]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      updateDoc((doc) => {
        const sections = doc.sections.filter((s) => s.id !== sectionId);
        // Fail-safe: Never leave sections empty! If all sections are removed, keep 1 blank canvas section
        if (sections.length === 0) {
          return {
            ...doc,
            sections: [
              {
                id: generateLyricId('sec'),
                type: 'verse' as StandardLyricSectionType,
                name: '',
                lines: [{ id: generateLyricId('line'), text: '' }],
              },
            ],
          };
        }
        return { ...doc, sections };
      });
      setRenameSectionTarget(null);
      toast.success('Section deleted');
    },
    [updateDoc]
  );

  const handleMoveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      updateDoc((doc) => {
        if (fromIndex >= doc.sections.length || toIndex >= doc.sections.length) return doc;
        const nextSections = [...doc.sections];
        const [moved] = nextSections.splice(fromIndex, 1);
        nextSections.splice(toIndex, 0, moved);
        return { ...doc, sections: nextSections };
      }, true);
      toast.success('Section repositioned');
    },
    [updateDoc]
  );

  const handleMoveSectionRelative = useCallback(
    (secIdx: number, delta: number) => {
      const targetIdx = secIdx + delta;
      if (targetIdx >= 0 && targetIdx < currentDoc.sections.length) {
        handleMoveSection(secIdx, targetIdx);
      }
    },
    [currentDoc.sections.length, handleMoveSection]
  );

  const handleSectionDragStart = useCallback((e: React.DragEvent, sectionId: string, secIdx: number) => {
    setDraggedSectionId(sectionId);
    setDragOverSectionIdx(null);
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ fromSectionId: sectionId, fromSectionIdx: secIdx }));
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
  }, []);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSectionId(null);
    setDragOverSectionIdx(null);
    dragOverSectionIdxRef.current = null;
  }, []);

  const handleSectionDragOver = useCallback((e: React.DragEvent, secIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSectionIdxRef.current !== secIdx) {
      dragOverSectionIdxRef.current = secIdx;
      setDragOverSectionIdx(secIdx);
    }
  }, []);

  const handleSectionDrop = useCallback(
    (e: React.DragEvent, targetSecIdx: number) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.fromSectionId && typeof data.fromSectionIdx === 'number') {
            handleMoveSection(data.fromSectionIdx, targetSecIdx);
            setDraggedSectionId(null);
            setDragOverSectionIdx(null);
            dragOverSectionIdxRef.current = null;
            return;
          }
        }
      } catch (_) {}
      if (draggedSectionId) {
        const fromSecIdx = currentDoc.sections.findIndex((s) => s.id === draggedSectionId);
        if (fromSecIdx !== -1) {
          handleMoveSection(fromSecIdx, targetSecIdx);
        }
      }
      setDraggedSectionId(null);
      setDragOverSectionIdx(null);
      dragOverSectionIdxRef.current = null;
    },
    [draggedSectionId, currentDoc.sections, handleMoveSection]
  );

  const handleSectionPointerDragStart = useCallback(
    (e: React.PointerEvent, sectionId: string, secIdx: number) => {
      e.preventDefault();
      setDraggedSectionId(sectionId);
      setDragOverSectionIdx(null);

      const cachedTargets = Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-index]')
      ).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          sectionId: el.dataset.sectionId || '',
          sectionIndex: parseInt(el.dataset.sectionIndex || '0', 10),
          midY: (rect.top + rect.bottom) / 2,
        };
      });

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (cachedTargets.length === 0) return;
        let closest = cachedTargets[0];
        let minDiff = Infinity;
        for (const target of cachedTargets) {
          const diff = Math.abs(moveEvent.clientY - target.midY);
          if (diff < minDiff) {
            minDiff = diff;
            closest = target;
          }
        }
        if (dragOverSectionIdxRef.current !== closest.sectionIndex) {
          dragOverSectionIdxRef.current = closest.sectionIndex;
          setDragOverSectionIdx(closest.sectionIndex);
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const targetIdx = dragOverSectionIdxRef.current;
        if (targetIdx !== null && targetIdx !== undefined && targetIdx !== secIdx) {
          handleMoveSection(secIdx, targetIdx);
        }
        setDraggedSectionId(null);
        setDragOverSectionIdx(null);
        dragOverSectionIdxRef.current = null;
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [handleMoveSection]
  );

  // ── VOCAL ROLE ASSIGNMENT ────────────────────────────────────────────

  const handleAssignRole = useCallback(
    (role: VocalRoleAnnotation | undefined) => {
      const capturedSel = capturedSelectionRef.current;
      const targetLineMap = new Map<string, CapturedSelectionLine>();
      if (capturedSel && capturedSel.lines.length > 0) {
        for (const l of capturedSel.lines) {
          targetLineMap.set(l.lineId, l);
        }
      }

      updateDoc((doc) => ({
        ...doc,
        sections: doc.sections.map((sec) => {
          // If active selection with character ranges exists
          if (targetLineMap.size > 0) {
            const hasAnyLine = sec.lines.some((l) => targetLineMap.has(l.id));
            if (!hasAnyLine) return sec;

            const updatedLines = sec.lines.map((l) => {
              const lineSel = targetLineMap.get(l.id);
              if (!lineSel) return l;

              if (lineSel.isFullLine || lineSel.start === lineSel.end) {
                const nextSpans = setRoleOnSelection(l.spans, l.text, 0, l.text.length, role);
                return {
                  ...l,
                  vocalRole: role,
                  spans: nextSpans,
                };
              }

              const nextSpans = setRoleOnSelection(l.spans, l.text, lineSel.start, lineSel.end, role);
              return {
                ...l,
                spans: nextSpans,
              };
            });

            return {
              ...sec,
              lines: updatedLines,
            };
          }

          if (!rolePickerTarget) return sec;

          if (rolePickerTarget.lineIds && rolePickerTarget.lineIds.length > 0) {
            const lineIdSet = new Set(rolePickerTarget.lineIds);
            const hasAnyLine = sec.lines.some((l) => lineIdSet.has(l.id));
            if (!hasAnyLine) return sec;

            const updatedLines = sec.lines.map((l) => {
              if (!lineIdSet.has(l.id)) return l;
              const nextSpans = setRoleOnSelection(l.spans, l.text, 0, l.text.length, role);
              return { ...l, vocalRole: role, spans: nextSpans };
            });

            return {
              ...sec,
              lines: updatedLines,
            };
          }

          if (sec.id !== rolePickerTarget.sectionId) return sec;

          if (rolePickerTarget.lineId) {
            return {
              ...sec,
              lines: sec.lines.map((l) => {
                if (l.id !== rolePickerTarget.lineId) return l;
                const nextSpans = setRoleOnSelection(l.spans, l.text, 0, l.text.length, role);
                return { ...l, vocalRole: role, spans: nextSpans };
              }),
            };
          }

          return { ...sec, vocalRole: role };
        }),
      }));

      if (role) {
        toast.success(`Role "${role.label || role.type}" assigned`);
      } else {
        toast.info('Role highlight cleared');
      }
      setRolePickerTarget(null);
    },
    [rolePickerTarget, updateDoc]
  );

  const handleClearAllRoles = useCallback(() => {
    updateDoc((doc) => ({
      ...doc,
      defaultVocalRole: undefined,
      sections: doc.sections.map((sec) => ({
        ...sec,
        vocalRole: undefined,
        lines: sec.lines.map((l) => ({
          ...l,
          vocalRole: undefined,
          spans: l.spans
            ? l.spans.map((s) => ({
                ...s,
                format: {
                  ...s.format,
                  vocalRole: undefined,
                  backgroundColor: undefined,
                  color: undefined,
                },
              }))
            : undefined,
        })),
      })),
    }));
    setRolePickerTarget(null);
    setShowFormattingModal(false);
    toast.success('All vocal roles cleared');
  }, [updateDoc]);

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
          // Normalize all line-ending variants (\r\n, \r) → \n before parsing
          const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const parsed = parsePastedLyrics(normalized);
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
      // Normalize all line-ending variants (\r\n, \r) → \n before parsing
      const normalized = pasteModalText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const parsed = parsePastedLyrics(normalized);
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
      ref={workspaceRef}
      data-testid="song-lyrics-editor-workspace"
      className="flex flex-col w-full relative select-text"
      style={{
        color: 'var(--c-text-primary, #ffffff)',
        fontFamily: 'var(--studio-font-body, var(--font-body))',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}
    >
      {/* ── 1. FREEFORM WRITING CANVAS (TELEPROMPTER SCRIPT STYLE) ───── */}
      <main
        className="flex flex-col gap-4 outline-none w-full select-text min-h-[300px] cursor-text"
        style={{
          paddingBottom: '24px',
          WebkitUserSelect: 'text',
          userSelect: 'text',
        }}
        data-purpose="teleprompter-writing-canvas"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const lastSec = currentDoc.sections[currentDoc.sections.length - 1];
            if (lastSec && lastSec.lines.length > 0) {
              const lastLine = lastSec.lines[lastSec.lines.length - 1];
              setLastActivePosition(lastSec.id, lastSec.lines.length - 1, lastLine.id);
              setEditingLineId(lastLine.id);
            }
          }
        }}
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

          // Dynamic real-time drag-and-drop spring shift for sections
          let sectionTranslateYOffset = 0;
          const isSectionDragged = draggedSectionId === section.id;
          if (draggedSectionId && dragOverSectionIdx !== null && !isSectionDragged) {
            const fromSecIdx = currentDoc.sections.findIndex((s) => s.id === draggedSectionId);
            if (fromSecIdx !== -1) {
              if (secIdx > fromSecIdx && secIdx <= dragOverSectionIdx) {
                sectionTranslateYOffset = -48;
              } else if (secIdx < fromSecIdx && secIdx >= dragOverSectionIdx) {
                sectionTranslateYOffset = 48;
              }
            }
          }

          return (
            <section
              key={section.id || secIdx}
              data-testid={`lyric-section-${secIdx}`}
              data-section-index={secIdx}
              data-section-id={section.id}
              onDragOver={(e) => handleSectionDragOver(e, secIdx)}
              onDrop={(e) => handleSectionDrop(e, secIdx)}
              onClick={(e) => {
                if (e.target === e.currentTarget && section.lines.length > 0) {
                  const targetLine = section.lines[section.lines.length - 1];
                  setLastActivePosition(section.id, section.lines.length - 1, targetLine.id);
                  setEditingLineId(targetLine.id);
                }
              }}
              className={`flex flex-col relative group/sec select-text transition-all ${
                hasSectionHeader
                  ? 'rounded-2xl p-3 sm:p-4 my-2 border shadow-xs'
                  : 'gap-2 my-1'
              }`}
              style={{
                transform: isSectionDragged
                  ? 'scale(1.02)'
                  : sectionTranslateYOffset !== 0
                  ? `translateY(${sectionTranslateYOffset}px)`
                  : undefined,
                transition: isSectionDragged
                  ? 'none'
                  : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms ease',
                opacity: isSectionDragged ? 0.45 : 1,
                zIndex: isSectionDragged ? 30 : 1,
                backgroundColor: hasSectionHeader
                  ? isEffectiveLight
                    ? 'rgba(0, 0, 0, 0.02)'
                    : isEffectiveAmoled
                    ? '#000000'
                    : 'rgba(255, 255, 255, 0.03)'
                  : 'transparent',
                borderColor: hasSectionHeader
                  ? isEffectiveLight
                    ? 'rgba(0, 0, 0, 0.08)'
                    : isEffectiveAmoled
                    ? 'rgba(255, 255, 255, 0.14)'
                    : 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
                borderLeftWidth: hasSectionHeader ? '4px' : undefined,
                borderLeftColor: hasSectionHeader ? sectionColor : undefined,
                WebkitUserSelect: 'text',
                userSelect: 'text',
              }}
            >
              {/* Canonical Section Header Strip */}
              {hasSectionHeader && (
                <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-white/5 select-none">
                  {/* Left Cluster: Drag Handle, Name & Vocal Role */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Section Drag Handle */}
                    <div
                      draggable
                      onDragStart={(e) => handleSectionDragStart(e, section.id, secIdx)}
                      onDragEnd={handleSectionDragEnd}
                      onPointerDown={(e) => handleSectionPointerDragStart(e, section.id, secIdx)}
                      data-testid={`section-drag-handle-${secIdx}`}
                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white rounded transition-colors flex items-center justify-center flex-shrink-0 touch-none"
                      title="Drag to reposition section"
                      aria-label="Drag to reposition section"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

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
                        className="opacity-70 group-hover/sec:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer active:scale-95 hover:bg-white/10"
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

                  {/* Right Cluster: Up/Down Shift Arrows & Manage Menu */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={secIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSectionRelative(secIdx, -1);
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move section up"
                      aria-label="Move section up"
                    >
                      <span className="material-symbols-rounded text-sm">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      disabled={secIdx === currentDoc.sections.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSectionRelative(secIdx, 1);
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move section down"
                      aria-label="Move section down"
                    >
                      <span className="material-symbols-rounded text-sm">arrow_downward</span>
                    </button>

                    {/* Section Manage / Delete button */}
                    <button
                      type="button"
                      data-testid={`section-options-btn-${secIdx}`}
                      onClick={() => setRenameSectionTarget({ id: section.id, name: section.name })}
                      className="opacity-70 hover:opacity-100 group-hover/sec:opacity-100 text-gray-400 hover:text-rose-400 active:scale-90 transition-all p-1 rounded-md cursor-pointer flex items-center justify-center"
                      title="Manage or remove section"
                    >
                      <span className="material-symbols-rounded text-sm">more_vert</span>
                    </button>
                  </div>
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
                        onClick={() => {
                          const sel = typeof window !== 'undefined' ? window.getSelection() : null;
                          if (sel && sel.toString().length > 0) return;
                          setLastActivePosition(section.id, lineIdx, line.id);
                        }}
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
                              data-no-focus-ring="true"
                              onFocus={() => setLastActivePosition(section.id, lineIdx, line.id)}
                              onChange={(e) => {
                                setLastActivePosition(section.id, lineIdx, line.id);
                                handleUpdateLineText(section.id, line.id, e.target.value);
                              }}
                              placeholder="Label (e.g. Solo)"
                              aria-label="Interlude event label"
                              data-testid={`interlude-label-input-${lineIdx}`}
                              className="no-focus-ring bg-transparent border-0 border-b outline-none text-xs sm:text-sm font-bold pb-0.5 min-w-[50px] max-w-[110px] sm:max-w-[180px] transition-colors truncate focus:outline-none focus:ring-0 focus-visible:outline-none"
                              style={{
                                color: isEffectiveLight ? '#1d4ed8' : '#93c5fd',
                                borderColor: isEffectiveLight ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.45)',
                                outline: 'none',
                                outlineOffset: 0,
                                boxShadow: 'none',
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
                              data-no-focus-ring="true"
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
                              className="no-focus-ring rounded-md px-1.5 py-0.5 text-xs font-mono font-bold w-11 outline-none text-center shadow-xs transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none"
                              style={{
                                backgroundColor: isEffectiveLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                                border: isEffectiveLight ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.16)',
                                color: isEffectiveLight ? '#0f172a' : '#ffffff',
                                outline: 'none',
                                outlineOffset: 0,
                                boxShadow: 'none',
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

                  const activeRole = line.vocalRole || section.vocalRole;
                  const resolvedColor =
                    line.format?.color || documentColor || 'var(--c-text-primary, #ffffff)';
                  const isLineBold = Boolean(line.format?.bold || currentDoc.formatting?.bold);

                  // In LYRICS mode: single always-visible auto-growing textarea per line.
                  // Using <textarea> instead of <input type="text"> is the root-cause fix:
                  // the HTML spec strips embedded \n from single-line inputs, which flattened
                  // entire songs into one wall of text. A textarea preserves every newline natively.
                  if (mode === 'lyrics') {
                    return (
                      <div
                        key={line.id || lineIdx}
                        data-testid={`lyric-line-${section.id}-${lineIdx}`}
                        data-line-id={line.id}
                        data-section-id={section.id}
                        data-line-index={lineIdx}
                        onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                        onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                        className="group/line relative flex items-center py-1 px-2 transition-all rounded-lg select-text"
                        style={{
                          transform: translateYOffset !== 0 ? `translateY(${translateYOffset}px)` : undefined,
                          transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                          WebkitUserSelect: 'text',
                          userSelect: 'text',
                        }}
                      >
                        <textarea
                          ref={(el) => { inputRefs.current[line.id] = el; }}
                          rows={1}
                          value={line.text}
                          onFocus={() => {
                            setLastActivePosition(section.id, lineIdx, line.id);
                            setEditingLineId(line.id);
                          }}
                          onBlur={(e) => {
                            setEditingLineId(null);
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
                            // Auto-resize: collapse then grow to content height
                            const el = e.target;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          onKeyDown={(e) => handleLineKeyDown(e, section.id, lineIdx, line.id)}
                          onPaste={(e) => handlePasteIntoLine(e, section.id, lineIdx, line.id)}
                          placeholder={secIdx === 0 && lineIdx === 0 && section.lines.length === 1 ? 'Write or paste lyrics here...' : ''}
                          data-testid={`lyric-line-input-${lineIdx}`}
                          data-no-focus-ring="true"
                          className="no-focus-ring w-full bg-transparent border-0 outline-none text-base leading-relaxed tracking-wide transition-colors focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0"
                          style={{
                            color: resolvedColor,
                            fontWeight: isLineBold ? 700 : 500,
                            fontFamily: 'inherit',
                            caretColor: accent.from || '#2563EB',
                            outline: 'none',
                            outlineOffset: 0,
                            border: 'none',
                            boxShadow: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                            padding: 0,
                            margin: 0,
                            height: 'auto',
                            minHeight: '1.75rem',
                            display: 'block',
                            WebkitTapHighlightColor: 'transparent',
                            WebkitUserSelect: 'text',
                            userSelect: 'text',
                          } as React.CSSProperties}
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          spellCheck={false}
                        />
                        {activeRole && (
                          <button
                            type="button"
                            data-testid={`vocal-role-chip-${line.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRolePickerTarget({
                                sectionId: section.id,
                                lineId: line.id,
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 self-center ml-2 shadow-2xs select-none cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                            style={{
                              backgroundColor: `${activeRole.color || '#3b82f6'}26`,
                              borderColor: `${activeRole.color || '#3b82f6'}66`,
                              color: activeRole.color || '#3b82f6',
                            }}
                            title={`Vocal Role: ${activeRole.label || activeRole.type} (tap to change or remove)`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: activeRole.color || '#3b82f6' }}
                            />
                            <span>{activeRole.label || activeRole.type}</span>
                          </button>
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
                      onClick={() => {
                        const sel = typeof window !== 'undefined' ? window.getSelection() : null;
                        if (sel && sel.toString().length > 0) return;
                        setLastActivePosition(section.id, lineIdx, line.id);
                      }}
                      onDragOver={(e) => handleDragOverLine(e, section.id, lineIdx)}
                      onDrop={(e) => handleDropOnLine(e, section.id, lineIdx)}
                      className="group/line relative flex flex-wrap items-end gap-x-2 gap-y-2 py-1 px-2 transition-all rounded-lg select-text"
                      style={{
                        transform: translateYOffset !== 0 ? `translateY(${translateYOffset}px)` : undefined,
                        transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                        WebkitUserSelect: 'text',
                        userSelect: 'text',
                      }}
                    >
                      {words.map((w, wIdx) => {
                        const wordChords = lineChords.filter(
                          (c) =>
                            (c.offset >= w.start && c.offset < w.end) ||
                            (wIdx === 0 && c.offset < w.start)
                        );
                        const wordColor = getCharacterColor(line.spans, w.start) || resolvedColor;
                        const wordBgColor = getCharacterBackgroundColor(line.spans, w.start);
                        const wordRole = getCharacterVocalRole(line.spans, w.start);
                        const isWordBold = getCharacterBold(line.spans, w.start) || isLineBold;
                        const isWordItalic = getCharacterItalic(line.spans, w.start) || Boolean(line.format?.italic);
                        const isWordUnderline = getCharacterUnderline(line.spans, w.start) || Boolean(line.format?.underline);
                        const isHighlighted = Boolean(wordBgColor || wordRole);
                        const effectiveWordColor = wordRole?.color || wordColor;

                        return (
                          <div
                            key={`${w.start}-${w.end}-${wIdx}`}
                            className="inline-flex flex-col items-start relative group/word select-text"
                            style={{
                              WebkitUserSelect: 'text',
                              userSelect: 'text',
                            }}
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
                                <span className="text-[10px] font-mono font-bold text-sky-400/50 group-hover/word:text-sky-400 select-none">
                                  +
                                </span>
                              )}
                            </div>

                            {/* Word Text (Tap in placement mode anchors the chord) */}
                            <span
                              onClick={() => {
                                const sel = typeof window !== 'undefined' ? window.getSelection() : null;
                                if (sel && sel.toString().length > 0) return;
                                if (activePlacementChord) {
                                  handleAnchorChord(section.id, line.id, activePlacementChord, w.start);
                                }
                              }}
                              className={`text-base tracking-wide transition-all select-text ${
                                activePlacementChord
                                  ? 'cursor-pointer hover:text-sky-400 active:scale-95 underline decoration-sky-400/40 decoration-dotted'
                                  : ''
                              }`}
                              style={{
                                color: effectiveWordColor,
                                fontWeight: isWordBold || isHighlighted ? 800 : 500,
                                fontStyle: isWordItalic ? 'italic' : undefined,
                                textDecoration: isWordUnderline ? 'underline' : undefined,
                                fontFamily: 'inherit',
                                backgroundColor: wordRole?.color ? `${wordRole.color}28` : (wordBgColor || undefined),
                                borderRadius: isHighlighted ? '4px' : undefined,
                                padding: isHighlighted ? '1px 5px' : undefined,
                                margin: isHighlighted ? '0 1px' : undefined,
                                border: wordRole ? `1px solid ${wordRole.color}44` : (wordBgColor ? `1px solid ${wordBgColor}44` : undefined),
                                WebkitUserSelect: 'text',
                                userSelect: 'text',
                              }}
                            >
                              {w.word}
                            </span>
                          </div>
                        );
                      })}

                      {/* Vocal Role badge if present on line */}
                      {activeRole && (
                        <button
                          type="button"
                          data-testid={`vocal-role-chip-${line.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRolePickerTarget({
                              sectionId: section.id,
                              lineId: line.id,
                            });
                          }}
                          className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0 self-center ml-auto shadow-2xs select-none cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                          style={{
                            backgroundColor: `${activeRole.color || '#3b82f6'}26`,
                            borderColor: `${activeRole.color || '#3b82f6'}66`,
                            color: activeRole.color || '#3b82f6',
                          }}
                          title={`Vocal Role: ${activeRole.label || activeRole.type} (tap to change or remove)`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: activeRole.color || '#3b82f6' }}
                          />
                          <span>{activeRole.label || activeRole.type}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

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

        {/* ── CANVA-STYLE HORIZONTAL CONTEXTUAL FORMATTING TOOLBAR ── */}
        {typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {hasCapturedSelection && (
                <motion.div
                  key="canva-formatting-toolbar"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 420 }}
                  data-testid="canva-formatting-toolbar"
                  className="fixed z-50 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full border shadow-2xl select-none"
                  style={{
                    bottom:
                      'calc(var(--bottom-nav-height, 0px) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 20px)',
                    backgroundColor: isEffectiveLight
                      ? 'rgba(255, 255, 255, 0.95)'
                      : isEffectiveAmoled
                      ? 'rgba(10, 10, 10, 0.96)'
                      : 'rgba(20, 24, 33, 0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderColor: isEffectiveLight
                      ? 'rgba(0, 0, 0, 0.12)'
                      : 'rgba(255, 255, 255, 0.16)',
                    boxShadow: isEffectiveLight
                      ? '0 12px 32px -4px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0,0,0,0.08)'
                      : '0 16px 40px -6px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.06)',
                    height: '46px',
                    maxWidth: '94vw',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Bold Button */}
                  <button
                    type="button"
                    data-testid="toolbar-bold-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleFormatBold();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all active:scale-90 cursor-pointer ${
                      isSelectionCurrentlyBold
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isEffectiveLight
                        ? 'text-slate-800 hover:bg-black/5'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                    title="Bold"
                    aria-label="Bold"
                  >
                    <span>B</span>
                  </button>

                  {/* Italic Button */}
                  <button
                    type="button"
                    data-testid="toolbar-italic-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleFormatItalic();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif italic font-bold transition-all active:scale-90 cursor-pointer ${
                      isSelectionCurrentlyItalic
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isEffectiveLight
                        ? 'text-slate-800 hover:bg-black/5'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                    title="Italic"
                    aria-label="Italic"
                  >
                    <span>I</span>
                  </button>

                  {/* Underline Button */}
                  <button
                    type="button"
                    data-testid="toolbar-underline-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleFormatUnderline();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm underline font-bold transition-all active:scale-90 cursor-pointer ${
                      isSelectionCurrentlyUnderline
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isEffectiveLight
                        ? 'text-slate-800 hover:bg-black/5'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                    title="Underline"
                    aria-label="Underline"
                  >
                    <span>U</span>
                  </button>

                  {/* Subtle vertical separator */}
                  <div
                    className="w-px h-5 mx-0.5"
                    style={{
                      backgroundColor: isEffectiveLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
                    }}
                  />

                  {/* Color Palette Picker & Compact Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      data-testid="toolbar-color-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowToolbarColorPicker((prev) => !prev);
                        setShowToolbarRolePicker(false);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                        showToolbarColorPicker
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : isEffectiveLight
                          ? 'text-slate-800 hover:bg-black/5'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                      title="Color Palette"
                      aria-label="Color Palette"
                    >
                      <span className="material-symbols-rounded text-lg">palette</span>
                    </button>

                    <AnimatePresence>
                      {showToolbarColorPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          data-testid="toolbar-color-popover"
                          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-2xl border shadow-xl backdrop-blur-xl flex flex-col gap-1.5 z-50 min-w-[200px]"
                          style={{
                            backgroundColor: isEffectiveLight
                              ? 'rgba(255, 255, 255, 0.96)'
                              : isEffectiveAmoled
                              ? 'rgba(12, 12, 12, 0.98)'
                              : 'rgba(22, 27, 34, 0.96)',
                            borderColor: isEffectiveLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            Color Palette
                          </span>
                          <div className="grid grid-cols-5 gap-1.5">
                            {COLOR_PALETTE.map((c) => (
                              <button
                                key={c.label}
                                type="button"
                                data-testid={`toolbar-color-swatch-${c.label.toLowerCase().replace(/\s+/g, '-')}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onPointerDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleFormatColor(c.value || '');
                                  setShowToolbarColorPicker(false);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 cursor-pointer hover:scale-105"
                                style={{
                                  backgroundColor: c.value || 'transparent',
                                  borderColor: isEffectiveLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)',
                                }}
                                title={c.label}
                              >
                                {!c.value && (
                                  <span className="material-symbols-rounded text-xs text-slate-400">format_color_reset</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vocal Role Picker & Compact Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      data-testid="toolbar-vocal-role-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowToolbarRolePicker((prev) => !prev);
                        setShowToolbarColorPicker(false);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                        showToolbarRolePicker
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : isEffectiveLight
                          ? 'text-slate-800 hover:bg-black/5'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                      title="Assign Vocal Role"
                      aria-label="Assign Vocal Role"
                    >
                      <span className="material-symbols-rounded text-lg">mic</span>
                    </button>

                    <AnimatePresence>
                      {showToolbarRolePicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          data-testid="toolbar-role-popover"
                          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-2xl border shadow-xl backdrop-blur-xl flex flex-col gap-1 z-50 min-w-[170px]"
                          style={{
                            backgroundColor: isEffectiveLight
                              ? 'rgba(255, 255, 255, 0.96)'
                              : isEffectiveAmoled
                              ? 'rgba(12, 12, 12, 0.98)'
                              : 'rgba(22, 27, 34, 0.96)',
                            borderColor: isEffectiveLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            Vocal Roles
                          </span>
                          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar py-0.5">
                            {defaultVocalRoles.map((role) => (
                              <button
                                key={role.type}
                                type="button"
                                data-testid={`toolbar-role-option-${role.type}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onPointerDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleAssignRole(role);
                                  setShowToolbarRolePicker(false);
                                }}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-white/20"
                                style={{
                                  backgroundColor: `${role.color || '#3b82f6'}18`,
                                  borderColor: `${role.color || '#3b82f6'}33`,
                                  color: role.color || '#3b82f6',
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: role.color }}
                                />
                                <span>{role.label || role.type}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              data-testid="toolbar-role-clear-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => {
                                handleAssignRole(undefined);
                                setShowToolbarRolePicker(false);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <span className="material-symbols-rounded text-sm">block</span>
                              <span>Clear Role</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Reset Formatting Button */}
                  <button
                    type="button"
                    data-testid="toolbar-reset-formatting-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleResetFormatting();
                      setShowToolbarColorPicker(false);
                      setShowToolbarRolePicker(false);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                      isEffectiveLight
                        ? 'text-slate-600 hover:bg-black/5 hover:text-slate-900'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Clear formatting on selection"
                    aria-label="Clear formatting"
                  >
                    <span className="material-symbols-rounded text-lg">format_clear</span>
                  </button>

                  {/* Dismiss Selection Button */}
                  <button
                    type="button"
                    data-testid="toolbar-close-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.getSelection()?.removeAllRanges();
                      }
                      setHasCapturedSelection(false);
                      capturedSelectionRef.current = null;
                      setShowToolbarColorPicker(false);
                      setShowToolbarRolePicker(false);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ml-0.5 ${
                      isEffectiveLight
                        ? 'text-slate-400 hover:bg-black/5 hover:text-slate-700'
                        : 'text-slate-500 hover:bg-white/10 hover:text-slate-300'
                    }`}
                    title="Dismiss selection"
                    aria-label="Close"
                  >
                    <span className="material-symbols-rounded text-base">close</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
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

          {/* Action strip: Remove Role on Selection & Clear All Assigned Roles */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="remove-vocal-role-btn"
              onClick={() => handleAssignRole(undefined)}
              className="flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-rose-500/40"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-base">block</span>
                <span>Remove Role on Selection / Line</span>
              </div>
              <span className="text-[10px] uppercase font-mono opacity-80">Clear</span>
            </button>

            <button
              type="button"
              data-testid="clear-all-vocal-roles-btn"
              onClick={handleClearAllRoles}
              className="flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer hover:border-rose-500/40"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-base">delete_sweep</span>
                <span>Clear All Assigned Roles</span>
              </div>
              <span className="text-[10px] uppercase font-mono opacity-80">Reset All</span>
            </button>
          </div>

          {/* Canonical 5 default roles */}
          <div className="flex flex-col gap-1.5">
            {defaultVocalRoles.map((role) => (
              <button
                key={role.type}
                type="button"
                data-testid={`assign-role-${role.type}`}
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
                  data-testid={`assign-custom-role-${role.label}`}
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
        </div>
      </Dialog>

      {/* ── DIALOG: RENAME & MANAGE SECTION ───────────────────────────── */}
      <Dialog
        open={Boolean(renameSectionTarget)}
        onClose={() => setRenameSectionTarget(null)}
        title="Manage Section"
      >
        {renameSectionTarget && (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Section Name</label>
              <input
                type="text"
                value={renameSectionTarget.name}
                onChange={(e) =>
                  setRenameSectionTarget({ ...renameSectionTarget, name: e.target.value })
                }
                placeholder="e.g. Verse 1, Chorus, Bridge"
                data-testid="rename-section-input"
                className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                data-testid="save-section-name-btn"
                onClick={() => {
                  handleRenameSection(renameSectionTarget.id, renameSectionTarget.name);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
              >
                Save Name
              </button>
              <button
                type="button"
                onClick={() => setRenameSectionTarget(null)}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-gray-400 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Remove Section Header option (preserves lyrics & chords) */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <button
                type="button"
                data-testid="btn-remove-section-header"
                onClick={() => handleRemoveSectionHeader(renameSectionTarget.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer hover:border-amber-500/40"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base">layers_clear</span>
                  <span>Remove Section Header (Keep Lyrics)</span>
                </div>
                <span className="text-[10px] uppercase font-mono opacity-80">Dissolve</span>
              </button>

              <button
                type="button"
                data-testid="btn-delete-section-and-lyrics"
                onClick={() => {
                  handleDeleteSection(renameSectionTarget.id);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer hover:border-rose-500/40"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base">delete</span>
                  <span>Delete Section & All Lyrics</span>
                </div>
                <span className="text-[10px] uppercase font-mono opacity-80">Delete</span>
              </button>
            </div>
          </div>
        )}
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

