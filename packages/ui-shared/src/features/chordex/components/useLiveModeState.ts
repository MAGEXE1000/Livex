import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  getChordById,
  transposeChordId,
  setNavHidden,
  setNavLocked,
  resolveAccent,
  useSettingsStore,
  useShallow,
  type SongPreset,
  type GuitarChordData,
  type SongLyricLine,
  type LyricChordPlacement,
  type VocalRoleAnnotation,
} from '@workspace/livex-core';

export type VisualStyle = 'both' | 'diagram' | 'name';

export type LiveDisplayMode =
  | 'chords_both'
  | 'chords_diagram'
  | 'chords_name'
  | 'lyrics_chord_name'
  | 'lyrics_chord_diagram'
  | 'lyrics_only';

export type BeatsPerChord = 1 | 2 | 4 | 8;
export type TeleprompterFontSize = 'normal' | 'large' | 'huge';

export interface TeleprompterLineChunk {
  chord?: string;
  text: string;
}

export interface TeleprompterLineItem {
  id: string;
  globalIndex: number;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  sectionVocalRole?: VocalRoleAnnotation;
  isFirstLineOfSection: boolean;
  isLastLineOfSection: boolean;
  line: SongLyricLine;
  chunks: TeleprompterLineChunk[];
}

export interface LiveModeState {
  preset: SongPreset;
  accent: { from: string; to: string; mid?: string };
  displayMode: LiveDisplayMode;
  setDisplayMode: (mode: LiveDisplayMode) => void;
  visualStyle: VisualStyle;
  setVisualStyle: (v: VisualStyle) => void;

  // Content classification
  hasChords: boolean;
  hasLyrics: boolean;
  hasLiveContent: boolean;
  contentCategory: 'chords_only' | 'lyrics_only' | 'hybrid' | 'none';
  compatibleModes: LiveDisplayMode[];

  // Chord progression (chords focus)
  currentIdx: number;
  shownIdx: number;
  chords: string[];
  sectionLabels: (string | null)[];
  total: number;
  currentChord: any;
  prevChord: any;
  nextChord: any;
  shownChord: any;
  setCurrentIdx: (idx: number) => void;

  // Teleprompter progression (lyrics & hybrid focus)
  teleprompterLines: TeleprompterLineItem[];
  currentLineIdx: number;
  totalLines: number;
  setCurrentLineIdx: (idx: number) => void;
  goToLine: (idx: number) => void;
  handleLineClick: (globalIndex: number) => void;
  teleprompterFontSize: TeleprompterFontSize;
  setTeleprompterFontSize: (size: TeleprompterFontSize) => void;
  teleprompterContainerRef: React.RefObject<HTMLDivElement | null>;
  isTeleprompterMode: boolean;

  // Playback & Timing
  autoPlay: boolean;
  setAutoPlay: (v: boolean | ((prev: boolean) => boolean)) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void;
  beatsPerChord: BeatsPerChord;
  setBeatsPerChord: (v: BeatsPerChord) => void;
  beatsPerLine: number;
  setBeatsPerLine: (v: number) => void;
  showContext: boolean;
  setShowContext: (v: boolean | ((prev: boolean) => boolean)) => void;
  bpmOverride: number;
  setBpmOverride: (v: number | ((prev: number) => number)) => void;
  msPerChord: number;
  msPerLine: number;

  // Navigation actions
  goNext: () => void;
  goPrev: () => void;
  handleClose: () => void;
  handleTap: (e: React.MouseEvent<HTMLDivElement>) => void;
  setDirection: (dir: 'forward' | 'backward') => void;

  // Animations & visuals
  overlayAnim: React.CSSProperties;
  chordStyle: React.CSSProperties;
  isExiting: boolean;
}

/**
 * Split line text into syllable/word chunks matching chord placements
 */
export function splitLineIntoChunks(
  text: string,
  chords?: LyricChordPlacement[]
): TeleprompterLineChunk[] {
  if (!chords || chords.length === 0) {
    return [{ chord: undefined, text: text || '\u00A0' }];
  }

  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  const chunks: TeleprompterLineChunk[] = [];

  if (sorted[0].offset > 0) {
    chunks.push({
      chord: undefined,
      text: text.slice(0, sorted[0].offset),
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextOffset = i + 1 < sorted.length ? sorted[i + 1].offset : text.length;
    const chunkText = text.slice(cur.offset, Math.max(cur.offset, nextOffset));
    chunks.push({
      chord: cur.chord,
      text: chunkText.length > 0 ? chunkText : '\u00A0',
    });
  }

  return chunks.length > 0 ? chunks : [{ chord: undefined, text: text || '\u00A0' }];
}

export function useLiveModeState(
  preset: SongPreset,
  onClose: () => void,
  transposeOffset: number = 0
): LiveModeState {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      liveModeAnimations: s.settings.liveModeAnimations,
    }))
  );
  const accent = resolveAccent(settings.accentColor);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [autoPlay, setAutoPlay] = useState(false);
  const [shownIdx, setShownIdx] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter-prep'>('idle');
  const [, setTransDir] = useState<'forward' | 'backward'>('forward');
  const [showSettings, setShowSettings] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [beatsPerChord, setBeatsPerChord] = useState<BeatsPerChord>(4);
  const [beatsPerLine, setBeatsPerLine] = useState<number>(4);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<TeleprompterFontSize>('normal');
  const [showContext, setShowContext] = useState(true);
  const [bpmOverride, setBpmOverride] = useState(preset.bpm || 120);

  const teleprompterContainerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chord Progression Data ──────────────────────────────────────
  const { chords, sectionLabels } = useMemo(() => {
    const ids: string[] = [];
    const labels: (string | null)[] = [];
    (preset.chords || []).forEach((id) => {
      ids.push(id);
      labels.push(null);
    });
    (preset.sections ?? []).forEach((sec) => {
      (sec.chords || []).forEach((id) => {
        ids.push(id);
        labels.push(sec.name);
      });
    });
    const finalIds =
      transposeOffset !== 0 ? ids.map((id) => transposeChordId(id, transposeOffset)) : ids;
    return { chords: finalIds, sectionLabels: labels };
  }, [preset.chords, preset.sections, transposeOffset]);
  const total = chords.length;

  // ── Teleprompter Lines Data ─────────────────────────────────────
  const teleprompterLines = useMemo<TeleprompterLineItem[]>(() => {
    const sections = preset.lyrics?.sections;
    if (!sections || sections.length === 0) return [];

    const items: TeleprompterLineItem[] = [];
    let globalIndex = 0;

    sections.forEach((sec) => {
      const lines = sec.lines || [];
      lines.forEach((line, lIdx) => {
        const lineChords = (line.chords || []).map((c) => ({
          ...c,
          chord: transposeOffset !== 0 ? transposeChordId(c.chord, transposeOffset) : c.chord,
        }));

        const chunks = splitLineIntoChunks(line.text, lineChords);
        items.push({
          id: line.id || `line-${sec.id}-${lIdx}`,
          globalIndex,
          sectionId: sec.id,
          sectionName: sec.name,
          sectionType: sec.type,
          sectionVocalRole: line.vocalRole || sec.vocalRole || preset.lyrics?.defaultVocalRole,
          isFirstLineOfSection: lIdx === 0,
          isLastLineOfSection: lIdx === lines.length - 1,
          line,
          chunks,
        });
        globalIndex++;
      });
    });

    return items;
  }, [preset.lyrics, transposeOffset]);
  const totalLines = teleprompterLines.length;

  // ── Content Classification ──────────────────────────────────────
  const hasChords =
    total > 0 || teleprompterLines.some((tl) => tl.chunks.some((c) => Boolean(c.chord)));
  const hasLyrics =
    totalLines > 0 && teleprompterLines.some((tl) => tl.line.text.trim().length > 0);
  const hasLiveContent = hasChords || hasLyrics;

  const contentCategory = useMemo<'chords_only' | 'lyrics_only' | 'hybrid' | 'none'>(() => {
    if (!hasLiveContent) return 'none';
    if (hasChords && hasLyrics) return 'hybrid';
    if (hasLyrics) return 'lyrics_only';
    return 'chords_only';
  }, [hasLiveContent, hasChords, hasLyrics]);

  const compatibleModes = useMemo<LiveDisplayMode[]>(() => {
    if (contentCategory === 'chords_only') {
      return ['chords_both', 'chords_diagram', 'chords_name'];
    }
    if (contentCategory === 'lyrics_only') {
      return ['lyrics_only'];
    }
    if (contentCategory === 'hybrid') {
      return [
        'lyrics_chord_name',
        'lyrics_chord_diagram',
        'lyrics_only',
        'chords_both',
        'chords_diagram',
        'chords_name',
      ];
    }
    return [];
  }, [contentCategory]);

  const getDefaultMode = useCallback((): LiveDisplayMode => {
    let saved: LiveDisplayMode | null = null;
    try {
      saved = localStorage.getItem('chordex_live_display_mode') as LiveDisplayMode;
    } catch (_) {}

    if (saved && compatibleModes.includes(saved)) {
      return saved;
    }
    if (contentCategory === 'chords_only') return 'chords_both';
    if (contentCategory === 'lyrics_only') return 'lyrics_only';
    if (contentCategory === 'hybrid') return 'lyrics_chord_name';
    return 'chords_both';
  }, [compatibleModes, contentCategory]);

  const [displayMode, setDisplayModeState] = useState<LiveDisplayMode>(getDefaultMode);

  // Sync mode if preset content changes
  useEffect(() => {
    if (!compatibleModes.includes(displayMode) && compatibleModes.length > 0) {
      setDisplayModeState(getDefaultMode());
    }
  }, [compatibleModes, displayMode, getDefaultMode]);

  const setDisplayMode = useCallback((mode: LiveDisplayMode) => {
    setDisplayModeState(mode);
    try {
      localStorage.setItem('chordex_live_display_mode', mode);
    } catch (_) {}
  }, []);

  const isTeleprompterMode =
    displayMode === 'lyrics_chord_name' ||
    displayMode === 'lyrics_chord_diagram' ||
    displayMode === 'lyrics_only';

  // Backwards-compatible visualStyle
  const visualStyle: VisualStyle = useMemo(() => {
    if (displayMode === 'chords_diagram') return 'diagram';
    if (displayMode === 'chords_name') return 'name';
    return 'both';
  }, [displayMode]);

  const setVisualStyle = useCallback(
    (v: VisualStyle) => {
      if (v === 'diagram') setDisplayMode('chords_diagram');
      else if (v === 'name') setDisplayMode('chords_name');
      else setDisplayMode('chords_both');
    },
    [setDisplayMode]
  );

  // ── Navigation Lifecycle & Cleanups ─────────────────────────────
  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setNavLocked(false);
    setNavHidden(false);
    exitTimerRef.current = setTimeout(() => onClose(), 290);
  }, [isExiting, onClose]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    []
  );

  useEffect(() => {
    setNavLocked(true);
    setNavHidden(true);
    return () => {
      setNavLocked(false);
      setNavHidden(false);
    };
  }, []);

  // ── Step Navigation ─────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection('forward');
    if (isTeleprompterMode) {
      if (totalLines > 0) {
        setCurrentLineIdx((prev) => (prev + 1 < totalLines ? prev + 1 : prev));
      }
    } else {
      if (total > 0) {
        setCurrentIdx((i) => (i + 1) % total);
      }
    }
  }, [isTeleprompterMode, totalLines, total]);

  const goPrev = useCallback(() => {
    setDirection('backward');
    if (isTeleprompterMode) {
      setCurrentLineIdx((prev) => (prev > 0 ? prev - 1 : 0));
    } else {
      if (currentIdx > 0) {
        setCurrentIdx((i) => i - 1);
      }
    }
  }, [isTeleprompterMode, currentIdx]);

  const goToLine = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < totalLines) {
        setDirection(idx >= currentLineIdx ? 'forward' : 'backward');
        setCurrentLineIdx(idx);
      }
    },
    [totalLines, currentLineIdx]
  );

  const handleLineClick = useCallback(
    (globalIndex: number) => {
      goToLine(globalIndex);
    },
    [goToLine]
  );

  // ── Smooth Teleprompter Auto-Scroll ──────────────────────────────
  useEffect(() => {
    if (!isTeleprompterMode) return;
    const lineEl = document.getElementById(`live-line-${currentLineIdx}`);
    const container = teleprompterContainerRef.current;
    if (lineEl && container) {
      const containerHeight = container.clientHeight;
      const lineTop = lineEl.offsetTop;
      const lineHeight = lineEl.clientHeight;
      // Position active line at ~35% from top so upcoming lyrics have ample viewport space
      const targetScroll = Math.max(0, lineTop - containerHeight * 0.35 + lineHeight / 2);
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [currentLineIdx, isTeleprompterMode]);

  // ── Auto-Play Timer ──────────────────────────────────────────────
  const msPerChord = (60000 / (bpmOverride || 120)) * beatsPerChord;
  const msPerLine = (60000 / (bpmOverride || 120)) * beatsPerLine;

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoPlay && bpmOverride > 0) {
      if (isTeleprompterMode) {
        intervalRef.current = setInterval(goNext, msPerLine);
      } else {
        intervalRef.current = setInterval(goNext, msPerChord);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, bpmOverride, beatsPerChord, beatsPerLine, isTeleprompterMode, msPerLine, msPerChord, goNext]);

  // ── Animated Chord Phase Transitions (Chords Mode) ──────────────
  const prevIdxRef = useRef<number>(-1);
  useEffect(() => {
    if (prevIdxRef.current === -1) {
      prevIdxRef.current = currentIdx;
      setShownIdx(currentIdx);
      return;
    }
    if (currentIdx === prevIdxRef.current) return;
    prevIdxRef.current = currentIdx;

    if (!settings.liveModeAnimations) {
      setShownIdx(currentIdx);
      return;
    }

    setTransDir(direction);
    setPhase('exit');

    const t = setTimeout(() => {
      setShownIdx(currentIdx);
      setPhase('enter-prep');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('idle');
        });
      });
    }, 170);

    return () => clearTimeout(t);
  }, [currentIdx, direction, settings.liveModeAnimations]);

  // ── Keyboard Navigation ──────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else handleClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev, handleClose, showSettings]);

  // ── Tap Navigation ───────────────────────────────────────────────
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showSettings) return;
    if (e.clientX < window.innerWidth / 2) goPrev();
    else goNext();
  };

  // ── Chord Resolution ─────────────────────────────────────────────
  const currentChord = chords[currentIdx] ? getChordById(chords[currentIdx]) : null;
  const prevChord =
    currentIdx > 0 && chords[currentIdx - 1] ? getChordById(chords[currentIdx - 1]) : null;
  const nextChord =
    currentIdx < total - 1 && chords[currentIdx + 1] ? getChordById(chords[currentIdx + 1]) : null;
  const shownChord = chords[shownIdx] ? getChordById(chords[shownIdx]) : null;

  const chordStyle: React.CSSProperties = (() => {
    if (!settings.liveModeAnimations) return {};
    if (phase === 'exit')
      return {
        opacity: 0,
        transform: 'scale(0.82) translateY(10px)',
        filter: 'blur(4px)',
        transition: 'opacity 170ms ease-in, transform 170ms ease-in, filter 170ms ease-in',
      };
    if (phase === 'enter-prep')
      return {
        opacity: 0,
        transform: 'scale(1.10) translateY(-14px)',
        filter: 'blur(6px)',
        transition: 'none',
      };
    return {
      opacity: 1,
      transform: 'scale(1) translateY(0)',
      filter: 'blur(0px)',
      transition:
        'opacity 320ms ease-out, transform 420ms cubic-bezier(0.34, 1.42, 0.64, 1), filter 280ms ease-out',
    };
  })();

  const overlayAnim: React.CSSProperties = {
    animation: isExiting
      ? 'live-mode-exit 280ms cubic-bezier(0.4, 0, 1, 1) both'
      : 'live-mode-enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both',
  };

  return {
    preset,
    accent,
    displayMode,
    setDisplayMode,
    visualStyle,
    setVisualStyle,
    hasChords,
    hasLyrics,
    hasLiveContent,
    contentCategory,
    compatibleModes,
    currentIdx,
    shownIdx,
    chords,
    sectionLabels,
    total,
    currentChord,
    prevChord,
    nextChord,
    shownChord,
    setCurrentIdx,
    teleprompterLines,
    currentLineIdx,
    totalLines,
    setCurrentLineIdx,
    goToLine,
    handleLineClick,
    teleprompterFontSize,
    setTeleprompterFontSize,
    teleprompterContainerRef,
    isTeleprompterMode,
    autoPlay,
    setAutoPlay,
    showSettings,
    setShowSettings,
    beatsPerChord,
    setBeatsPerChord,
    beatsPerLine,
    setBeatsPerLine,
    showContext,
    setShowContext,
    bpmOverride,
    setBpmOverride,
    msPerChord,
    msPerLine,
    goNext,
    goPrev,
    handleClose,
    handleTap,
    setDirection,
    overlayAnim,
    chordStyle,
    isExiting,
  };
}
