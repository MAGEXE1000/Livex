import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  getChordById,
  transposeChordId,
  setNavHidden,
  setNavLocked,
  resolveAccent,
  useSettingsStore,
  useShallow,
  playChord,
  useBackHandler,
  useNavigationStore,
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
export type TeleprompterFontFamily = 'studio' | 'sans' | 'serif' | 'mono';
export type TeleprompterLineHeight = 'compact' | 'normal' | 'relaxed';
export type TeleprompterAlignment = 'left' | 'center';

export interface TeleprompterLineChunk {
  chord?: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface TeleprompterWord {
  id: string;
  text: string;
  chord?: string;
  globalWordIdx: number;
  lineIdx: number;
  wordIdxInLine: number;
  startOffset: number;
  endOffset: number;
  durationMs: number;
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
  words: TeleprompterWord[];
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
  allWords: TeleprompterWord[];
  currentLineIdx: number;
  currentWordIdx: number;
  totalLines: number;
  setCurrentLineIdx: (idx: number) => void;
  setCurrentWordIdx: (idx: number) => void;
  goToLine: (idx: number) => void;
  handleLineClick: (globalIndex: number) => void;
  teleprompterFontSize: TeleprompterFontSize;
  setTeleprompterFontSize: (size: TeleprompterFontSize) => void;
  teleprompterFontFamily: TeleprompterFontFamily;
  setTeleprompterFontFamily: (font: TeleprompterFontFamily) => void;
  teleprompterLineHeight: TeleprompterLineHeight;
  setTeleprompterLineHeight: (lh: TeleprompterLineHeight) => void;
  teleprompterAlignment: TeleprompterAlignment;
  setTeleprompterAlignment: (align: TeleprompterAlignment) => void;
  teleprompterMirror: boolean;
  setTeleprompterMirror: (v: boolean | ((prev: boolean) => boolean)) => void;
  teleprompterContainerRef: React.RefObject<HTMLDivElement | null>;
  isTeleprompterMode: boolean;

  // Playback & Timing
  autoPlay: boolean;
  setAutoPlay: (v: boolean | ((prev: boolean) => boolean)) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void;
  showQuickActions: boolean;
  setShowQuickActions: (v: boolean | ((prev: boolean) => boolean)) => void;
  beatsPerChord: BeatsPerChord;
  setBeatsPerChord: (v: BeatsPerChord) => void;
  beatsPerLine: number;
  setBeatsPerLine: (v: number) => void;
  showContext: boolean;
  setShowContext: (v: boolean | ((prev: boolean) => boolean)) => void;
  bpmOverride: number;
  setBpmOverride: (v: number | ((prev: number) => number)) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  cyclePlaybackSpeed: () => void;
  currentBeat: number;
  currentBar: number;
  msPerChord: number;
  msPerLine: number;

  // Navigation actions
  goNext: () => void;
  goPrev: () => void;
  stepWordForward: () => void;
  stepWordBackward: () => void;
  nextPhrase: () => void;
  prevPhrase: () => void;
  goToNextSection: () => void;
  goToPrevSection: () => void;
  handleClose: () => void;
  handleTap: (e: React.MouseEvent<HTMLDivElement>) => void;
  setDirection: (dir: 'forward' | 'backward') => void;
  playChordSound: (guitarData?: GuitarChordData | null) => void;

  // Hybrid & contextual previews
  activeHybridChord: any;
  nextPreviewChord: any;
  nextPreviewLyrics: string;
  currentSectionName: string;

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
  const safeText = text || '';
  if (!chords || chords.length === 0) {
    return [
      {
        chord: undefined,
        text: safeText || '\u00A0',
        startOffset: 0,
        endOffset: safeText.length,
      },
    ];
  }

  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  const chunks: TeleprompterLineChunk[] = [];

  if (sorted[0].offset > 0) {
    chunks.push({
      chord: undefined,
      text: safeText.slice(0, sorted[0].offset),
      startOffset: 0,
      endOffset: sorted[0].offset,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextOffset = i + 1 < sorted.length ? sorted[i + 1].offset : safeText.length;
    const end = Math.max(cur.offset, nextOffset);
    const chunkText = safeText.slice(cur.offset, end);
    chunks.push({
      chord: cur.chord,
      text: chunkText.length > 0 ? chunkText : '\u00A0',
      startOffset: cur.offset,
      endOffset: end,
    });
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          chord: undefined,
          text: safeText || '\u00A0',
          startOffset: 0,
          endOffset: safeText.length,
        },
      ];
}

/**
 * Split line text into discrete words with chord associations and offsets
 */
export function splitLineIntoWords(
  text: string,
  chords: LyricChordPlacement[] | undefined,
  lineIdx: number,
  startGlobalIdx: number
): TeleprompterWord[] {
  const safeText = text || '';
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  const words: TeleprompterWord[] = [];
  let wIdx = 0;

  while ((match = regex.exec(safeText)) !== null) {
    const wordText = match[0];
    const start = match.index;
    const end = start + wordText.length;

    const matchingChord =
      chords?.find((c) => c.offset >= start && c.offset < end) ||
      (wIdx === 0 ? chords?.find((c) => c.offset < start) : undefined);

    words.push({
      id: `word-${lineIdx}-${wIdx}`,
      text: wordText,
      chord: matchingChord?.chord,
      globalWordIdx: startGlobalIdx + wIdx,
      lineIdx,
      wordIdxInLine: wIdx,
      startOffset: start,
      endOffset: end,
      durationMs: 650,
    });
    wIdx++;
  }

  if (words.length === 0 && safeText.trim().length === 0) {
    words.push({
      id: `word-${lineIdx}-0`,
      text: '\u00A0',
      chord: chords?.[0]?.chord,
      globalWordIdx: startGlobalIdx,
      lineIdx,
      wordIdxInLine: 0,
      startOffset: 0,
      endOffset: 0,
      durationMs: 650,
    });
  }

  return words;
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

  // Teleprompter presentation states with local storage persistence
  const [teleprompterFontSize, setTeleprompterFontSizeState] = useState<TeleprompterFontSize>(() => {
    try {
      const saved = localStorage.getItem('chordex_teleprompter_font_size');
      if (saved === 'normal' || saved === 'large' || saved === 'huge') {
        return saved;
      }
    } catch (_) {}
    return 'normal';
  });

  const setTeleprompterFontSize = useCallback((size: TeleprompterFontSize) => {
    setTeleprompterFontSizeState(size);
    try {
      localStorage.setItem('chordex_teleprompter_font_size', size);
    } catch (_) {}
  }, []);

  const [teleprompterFontFamily, setTeleprompterFontFamilyState] = useState<TeleprompterFontFamily>(() => {
    try {
      const saved = localStorage.getItem('chordex_teleprompter_font_family');
      if (saved === 'studio' || saved === 'sans' || saved === 'serif' || saved === 'mono') {
        return saved;
      }
    } catch (_) {}
    return 'studio';
  });

  const setTeleprompterFontFamily = useCallback((font: TeleprompterFontFamily) => {
    setTeleprompterFontFamilyState(font);
    try {
      localStorage.setItem('chordex_teleprompter_font_family', font);
    } catch (_) {}
  }, []);

  const [teleprompterLineHeight, setTeleprompterLineHeightState] = useState<TeleprompterLineHeight>(() => {
    try {
      const saved = localStorage.getItem('chordex_teleprompter_line_height');
      if (saved === 'compact' || saved === 'normal' || saved === 'relaxed') {
        return saved;
      }
    } catch (_) {}
    return 'normal';
  });

  const setTeleprompterLineHeight = useCallback((lh: TeleprompterLineHeight) => {
    setTeleprompterLineHeightState(lh);
    try {
      localStorage.setItem('chordex_teleprompter_line_height', lh);
    } catch (_) {}
  }, []);

  const [teleprompterAlignment, setTeleprompterAlignmentState] = useState<TeleprompterAlignment>(() => {
    try {
      const saved = localStorage.getItem('chordex_teleprompter_alignment');
      if (saved === 'left' || saved === 'center') {
        return saved;
      }
    } catch (_) {}
    return 'left';
  });

  const setTeleprompterAlignment = useCallback((align: TeleprompterAlignment) => {
    setTeleprompterAlignmentState(align);
    try {
      localStorage.setItem('chordex_teleprompter_alignment', align);
    } catch (_) {}
  }, []);

  const [teleprompterMirror, setTeleprompterMirrorState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chordex_teleprompter_mirror') === 'true';
    } catch (_) {}
    return false;
  });

  const setTeleprompterMirror = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setTeleprompterMirrorState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {
        localStorage.setItem('chordex_teleprompter_mirror', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

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
    let runningWordGlobalIdx = 0;

    sections.forEach((sec) => {
      const lines = sec.lines || [];
      lines.forEach((line, lIdx) => {
        const lineChords = (line.chords || []).map((c) => ({
          ...c,
          chord: transposeOffset !== 0 ? transposeChordId(c.chord, transposeOffset) : c.chord,
        }));

        const chunks = splitLineIntoChunks(line.text, lineChords);
        const words = splitLineIntoWords(line.text, lineChords, globalIndex, runningWordGlobalIdx);
        runningWordGlobalIdx += words.length;

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
          words,
        });
        globalIndex++;
      });
    });

    return items;
  }, [preset.lyrics, transposeOffset]);
  const totalLines = teleprompterLines.length;

  const allWords = useMemo<TeleprompterWord[]>(() => {
    return teleprompterLines.flatMap((tl) => tl.words);
  }, [teleprompterLines]);

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

  const currentApp = useNavigationStore((s) => s.history[s.history.length - 1]?.app ?? 'hub');
  useEffect(() => {
    if (currentApp !== 'chordex') {
      setNavLocked(false);
      setNavHidden(false);
      return;
    }
    setNavLocked(true);
    setNavHidden(true);
    return () => {
      setNavLocked(false);
      setNavHidden(false);
    };
  }, [currentApp]);

  useBackHandler(
    'modal',
    () => {
      if (showSettings) {
        setShowSettings(false);
        return true;
      }
      return false;
    },
    [showSettings]
  );

  // ── Chord Resolution ─────────────────────────────────────────────
  const currentChord = chords[currentIdx] ? getChordById(chords[currentIdx]) : null;
  const prevChord =
    currentIdx > 0 && chords[currentIdx - 1] ? getChordById(chords[currentIdx - 1]) : null;
  const nextChord =
    currentIdx < total - 1 && chords[currentIdx + 1] ? getChordById(chords[currentIdx + 1]) : null;
  const shownChord = chords[shownIdx] ? getChordById(chords[shownIdx]) : null;

  // ── Word, Beat & Section Navigation ─────────────────────────────
  const [currentWordIdx, setCurrentWordIdxState] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const cyclePlaybackSpeed = useCallback(() => {
    const speeds = [0.8, 1.0, 1.25, 1.5];
    setPlaybackSpeedState((prev) => {
      const curIdx = speeds.indexOf(prev);
      const nextIdx = curIdx === -1 ? 1 : (curIdx + 1) % speeds.length;
      return speeds[nextIdx];
    });
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
  }, []);

  const playChordSound = useCallback(
    (guitarData?: GuitarChordData | null) => {
      const g = guitarData || shownChord?.guitar;
      if (g) {
        try {
          playChord(g, 0.65);
        } catch (_) {}
      }
    },
    [shownChord]
  );

  const setCurrentWordIdx = useCallback(
    (targetIdx: number) => {
      if (allWords.length === 0) return;
      const clamped = Math.max(0, Math.min(targetIdx, allWords.length - 1));
      setCurrentWordIdxState(clamped);
      const targetWord = allWords[clamped];
      if (targetWord && targetWord.lineIdx !== currentLineIdx) {
        setDirection(targetWord.lineIdx >= currentLineIdx ? 'forward' : 'backward');
        setCurrentLineIdx(targetWord.lineIdx);
      }
      if (targetWord?.chord) {
        const chordIdx = chords.indexOf(targetWord.chord);
        if (chordIdx !== -1) {
          setCurrentIdx(chordIdx);
        }
      }
    },
    [allWords, currentLineIdx, chords]
  );

  const stepWordForward = useCallback(() => {
    if (allWords.length === 0) return;
    setCurrentWordIdxState((prev) => {
      const next = (prev + 1) % allWords.length;
      const targetWord = allWords[next];
      if (targetWord && targetWord.lineIdx !== currentLineIdx) {
        setDirection('forward');
        setCurrentLineIdx(targetWord.lineIdx);
      }
      if (targetWord?.chord) {
        const chordIdx = chords.indexOf(targetWord.chord);
        if (chordIdx !== -1) setCurrentIdx(chordIdx);
      }
      return next;
    });
    setCurrentBeat((b) => {
      const nextBeat = (b + 1) % 4;
      if (nextBeat === 0) setCurrentBar((bar) => bar + 1);
      return nextBeat;
    });
  }, [allWords, currentLineIdx, chords]);

  const stepWordBackward = useCallback(() => {
    if (allWords.length === 0) return;
    setCurrentWordIdxState((prev) => {
      const prevIdx = prev > 0 ? prev - 1 : allWords.length - 1;
      const targetWord = allWords[prevIdx];
      if (targetWord && targetWord.lineIdx !== currentLineIdx) {
        setDirection('backward');
        setCurrentLineIdx(targetWord.lineIdx);
      }
      if (targetWord?.chord) {
        const chordIdx = chords.indexOf(targetWord.chord);
        if (chordIdx !== -1) setCurrentIdx(chordIdx);
      }
      return prevIdx;
    });
    setCurrentBeat((b) => (b > 0 ? b - 1 : 3));
  }, [allWords, currentLineIdx, chords]);

  const goToLine = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < totalLines) {
        setDirection(idx >= currentLineIdx ? 'forward' : 'backward');
        setCurrentLineIdx(idx);
        const firstWord = allWords.find((w) => w.lineIdx === idx);
        if (firstWord) {
          setCurrentWordIdxState(firstWord.globalWordIdx);
          if (firstWord.chord) {
            const chordIdx = chords.indexOf(firstWord.chord);
            if (chordIdx !== -1) setCurrentIdx(chordIdx);
          }
        }
      }
    },
    [totalLines, currentLineIdx, allWords, chords]
  );

  const nextPhrase = useCallback(() => {
    if (currentLineIdx + 1 < totalLines) {
      goToLine(currentLineIdx + 1);
      const nextFirstWord = allWords.find((w) => w.lineIdx === currentLineIdx + 1);
      if (nextFirstWord) setCurrentWordIdxState(nextFirstWord.globalWordIdx);
    }
  }, [currentLineIdx, totalLines, goToLine, allWords]);

  const prevPhrase = useCallback(() => {
    if (currentLineIdx > 0) {
      goToLine(currentLineIdx - 1);
      const prevFirstWord = allWords.find((w) => w.lineIdx === currentLineIdx - 1);
      if (prevFirstWord) setCurrentWordIdxState(prevFirstWord.globalWordIdx);
    }
  }, [currentLineIdx, goToLine, allWords]);

  const goToNextSection = useCallback(() => {
    const nextSecLine = teleprompterLines.find(
      (tl) => tl.isFirstLineOfSection && tl.globalIndex > currentLineIdx
    );
    if (nextSecLine) {
      goToLine(nextSecLine.globalIndex);
      const firstWord = allWords.find((w) => w.lineIdx === nextSecLine.globalIndex);
      if (firstWord) setCurrentWordIdxState(firstWord.globalWordIdx);
    }
  }, [teleprompterLines, currentLineIdx, goToLine, allWords]);

  const goToPrevSection = useCallback(() => {
    const prevSecLines = teleprompterLines.filter(
      (tl) => tl.isFirstLineOfSection && tl.globalIndex < currentLineIdx
    );
    if (prevSecLines.length > 0) {
      const targetLine = prevSecLines[prevSecLines.length - 1];
      goToLine(targetLine.globalIndex);
      const firstWord = allWords.find((w) => w.lineIdx === targetLine.globalIndex);
      if (firstWord) setCurrentWordIdxState(firstWord.globalWordIdx);
    } else {
      goToLine(0);
      setCurrentWordIdxState(0);
    }
  }, [teleprompterLines, currentLineIdx, goToLine, allWords]);

  // ── Step Navigation ─────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection('forward');
    if (isTeleprompterMode) {
      if (totalLines > 0) {
        nextPhrase();
      }
    } else {
      if (total > 0) {
        setCurrentIdx((i) => (i + 1) % total);
      }
    }
  }, [isTeleprompterMode, totalLines, total, nextPhrase]);

  const goPrev = useCallback(() => {
    setDirection('backward');
    if (isTeleprompterMode) {
      prevPhrase();
    } else {
      if (currentIdx > 0) {
        setCurrentIdx((i) => i - 1);
      }
    }
  }, [isTeleprompterMode, currentIdx, prevPhrase]);

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
    if (!autoPlay || bpmOverride <= 0) return;

    if (!isTeleprompterMode) {
      intervalRef.current = setInterval(() => {
        goNext();
        playChordSound();
      }, msPerChord);
    } else {
      const baseWordDuration = Math.round((60000 / bpmOverride) * 0.75);
      const intervalMs = Math.max(100, Math.round(baseWordDuration / playbackSpeed));

      intervalRef.current = setInterval(() => {
        stepWordForward();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    autoPlay,
    bpmOverride,
    isTeleprompterMode,
    msPerChord,
    playbackSpeed,
    goNext,
    stepWordForward,
    playChordSound,
  ]);

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

  const activeHybridChord = useMemo(() => {
    const curLine = teleprompterLines[currentLineIdx];
    if (curLine && curLine.words && curLine.words.length > 0) {
      const curWord = allWords[currentWordIdx];
      if (curWord?.chord) {
        return getChordById(curWord.chord);
      }
      const lineWords = curLine.words;
      const wordInLine = lineWords.findIndex((w) => w.globalWordIdx === currentWordIdx);
      if (wordInLine !== -1) {
        for (let i = wordInLine; i >= 0; i--) {
          if (lineWords[i].chord) {
            return getChordById(lineWords[i].chord!);
          }
        }
      }
      const firstChunkWithChord = curLine.chunks.find((c) => Boolean(c.chord));
      if (firstChunkWithChord?.chord) {
        return getChordById(firstChunkWithChord.chord);
      }
    }
    return shownChord;
  }, [teleprompterLines, currentLineIdx, allWords, currentWordIdx, shownChord]);

  const nextPreviewChord = useMemo(() => {
    if (currentLineIdx + 1 < totalLines) {
      const nextLine = teleprompterLines[currentLineIdx + 1];
      const nextChunkWithChord = nextLine?.chunks.find((c) => Boolean(c.chord));
      if (nextChunkWithChord?.chord) {
        return getChordById(nextChunkWithChord.chord);
      }
    }
    return nextChord;
  }, [currentLineIdx, totalLines, teleprompterLines, nextChord]);

  const nextPreviewLyrics = useMemo(() => {
    if (currentLineIdx + 1 < totalLines) {
      return teleprompterLines[currentLineIdx + 1]?.line.text || '';
    }
    return '';
  }, [currentLineIdx, totalLines, teleprompterLines]);

  const currentSectionName = useMemo(() => {
    return teleprompterLines[currentLineIdx]?.sectionName || sectionLabels[shownIdx] || 'Verse';
  }, [teleprompterLines, currentLineIdx, sectionLabels, shownIdx]);

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
    allWords,
    currentLineIdx,
    currentWordIdx,
    totalLines,
    setCurrentLineIdx,
    setCurrentWordIdx,
    goToLine,
    handleLineClick,
    teleprompterFontSize,
    setTeleprompterFontSize,
    teleprompterFontFamily,
    setTeleprompterFontFamily,
    teleprompterLineHeight,
    setTeleprompterLineHeight,
    teleprompterAlignment,
    setTeleprompterAlignment,
    teleprompterMirror,
    setTeleprompterMirror,
    teleprompterContainerRef,
    isTeleprompterMode,
    autoPlay,
    setAutoPlay,
    showSettings,
    setShowSettings,
    showQuickActions,
    setShowQuickActions,
    beatsPerChord,
    setBeatsPerChord,
    beatsPerLine,
    setBeatsPerLine,
    showContext,
    setShowContext,
    bpmOverride,
    setBpmOverride,
    playbackSpeed,
    setPlaybackSpeed,
    cyclePlaybackSpeed,
    currentBeat,
    currentBar,
    msPerChord,
    msPerLine,
    goNext,
    goPrev,
    stepWordForward,
    stepWordBackward,
    nextPhrase,
    prevPhrase,
    goToNextSection,
    goToPrevSection,
    handleClose,
    handleTap,
    setDirection,
    playChordSound,
    activeHybridChord,
    nextPreviewChord,
    nextPreviewLyrics,
    currentSectionName,
    overlayAnim,
    chordStyle,
    isExiting,
  };
}
