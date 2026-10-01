import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  getChordById,
  getChordByName,
  transposeChordId,
  setNavHidden,
  setNavLocked,
  resolveAccent,
  useSettingsStore,
  useShallow,
  playChord,
  useBackHandler,
  useNavigationStore,
  useChordStore,
  type SongPreset,
  type GuitarChordData,
  type SongLyricLine,
  type LyricChordPlacement,
  type VocalRoleAnnotation,
  calculateSongTimingSchedule,
  formatDurationMmSs,
  parseDurationMmSs,
  type SongTimingSchedule,
  getCharacterColor,
  useBandStore,
  broadcastBandLivePacket,
  subscribeToBandLiveSession,
  calculateTransitDrift,
  type LiveBandSyncPacket,
  type LiveSyncAction,
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
export type ChordDiagramScale = 'large' | 'medium' | 'small';
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
  color?: string;
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
  color?: string;
}

export interface LiveModeState {
  preset: SongPreset;
  accent: { from: string; to: string; mid?: string };
  transposeOffset: number;
  displayMode: LiveDisplayMode;
  setDisplayMode: (mode: LiveDisplayMode) => void;
  visualStyle: VisualStyle;
  setVisualStyle: (v: VisualStyle) => void;
  chordDiagramScale: ChordDiagramScale;
  setChordDiagramScale: (scale: ChordDiagramScale) => void;

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
  isHeaderHidden: boolean;
  setIsHeaderHidden: (v: boolean) => void;
  beatsPerChord: BeatsPerChord;
  setBeatsPerChord: (v: BeatsPerChord) => void;
  barsPerLine: number;
  setBarsPerLine: (action: number | ((prev: number) => number)) => void;
  beatsPerLine: number;
  setBeatsPerLine: (v: number) => void;
  showContext: boolean;
  setShowContext: (v: boolean | ((prev: boolean) => boolean)) => void;
  speed: number;
  setSpeed: (v: number | ((prev: number) => number)) => void;
  bpmOverride: number;
  setBpmOverride: (v: number | ((prev: number) => number)) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  cyclePlaybackSpeed: () => void;
  currentBeat: number;
  currentBar: number;
  msPerChord: number;
  msPerLine: number;

  // Duration & Timing Engine
  targetDurationSeconds?: number;
  setTargetDurationSeconds: (sec: number | undefined | ((prev: number | undefined) => number | undefined)) => void;
  timingSchedule: SongTimingSchedule;
  elapsedMs: number;
  setElapsedMs: (ms: number | ((prev: number) => number)) => void;
  interludeRemainingSec: number | null;

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

  // Stage Band Live Sync Session
  hasActiveBand: boolean;
  bandName: string;
  isBroadcasting: boolean;
  setIsBroadcasting: (v: boolean) => void;
  isLockedToLeader: boolean;
  setIsLockedToLeader: (v: boolean) => void;
  activeLiveSession: LiveBandSyncPacket | null;
  emitLiveSync: (action: LiveSyncAction, overrides?: Partial<LiveBandSyncPacket>) => void;

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
  startGlobalIdx: number,
  lineDurationMs: number = 2000,
  lineType?: string,
  line?: SongLyricLine,
  defaultLineColor?: string
): TeleprompterWord[] {
  const safeText = text || '';

  if (lineType === 'interlude') {
    return [
      {
        id: `word-${lineIdx}-0`,
        text: safeText,
        chord: undefined,
        globalWordIdx: startGlobalIdx,
        lineIdx,
        wordIdxInLine: 0,
        startOffset: 0,
        endOffset: safeText.length,
        durationMs: lineDurationMs,
        color: defaultLineColor,
      },
    ];
  }

  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  const rawWords: { text: string; start: number; end: number }[] = [];

  while ((match = regex.exec(safeText)) !== null) {
    rawWords.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const wordCount = Math.max(1, rawWords.length);
  const wordDuration = Math.round(lineDurationMs / wordCount);
  const words: TeleprompterWord[] = [];

  for (let wIdx = 0; wIdx < rawWords.length; wIdx++) {
    const rw = rawWords[wIdx];
    const prevEnd = wIdx > 0 ? rawWords[wIdx - 1].end : 0;
    const matchingChord =
      chords?.find((c) => c.offset >= rw.start && c.offset < rw.end) ||
      chords?.find((c) => c.offset >= prevEnd && c.offset <= rw.start) ||
      (wIdx === 0 ? chords?.find((c) => c.offset < rw.start) : undefined);

    const spanColor = getCharacterColor(line?.spans, rw.start);
    const resolvedWordColor = spanColor || defaultLineColor;

    words.push({
      id: `word-${lineIdx}-${wIdx}`,
      text: rw.text,
      chord: matchingChord?.chord,
      globalWordIdx: startGlobalIdx + wIdx,
      lineIdx,
      wordIdxInLine: wIdx,
      startOffset: rw.start,
      endOffset: rw.end,
      durationMs: wordDuration,
      color: resolvedWordColor,
    });
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
      durationMs: lineDurationMs,
      color: defaultLineColor,
    });
  }

  return words;
}

export function useLiveModeState(
  preset: SongPreset,
  onClose: () => void,
  transposeOffset: number = 0,
  initialMode?: 'chords' | 'lyrics' | 'both'
): LiveModeState {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      liveModeAnimations: s.settings.liveModeAnimations,
    }))
  );
  const accent = resolveAccent(settings.accentColor);

  // Band Stage Collaboration Store
  const currentBand = useBandStore((s) => s.currentBand);
  const isBroadcasting = useBandStore((s) => s.isBroadcasting);
  const setIsBroadcasting = useBandStore((s) => s.setIsBroadcasting);
  const isLockedToLeader = useBandStore((s) => s.isLockedToLeader);
  const setIsLockedToLeader = useBandStore((s) => s.setIsLockedToLeader);
  const activeLiveSession = useBandStore((s) => s.activeLiveSession);
  const setActiveLiveSession = useBandStore((s) => s.setActiveLiveSession);

  const packetVersionRef = useRef(1);
  const currentLineIdxRef = useRef(0);
  const currentWordIdxRef = useRef(0);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [autoPlay, setAutoPlayState] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useEffect(() => {
    currentLineIdxRef.current = currentLineIdx;
  }, [currentLineIdx]);

  useEffect(() => {
    if (!autoPlay) {
      setIsHeaderHidden(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsHeaderHidden(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [autoPlay]);

  const [shownIdx, setShownIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [beatsPerChord, setBeatsPerChord] = useState<BeatsPerChord>(4);
  const [barsPerLine, setBarsPerLineState] = useState<number>(() => {
    const b = preset.barsPerLine;
    return (b === 1 || b === 2 || b === 3 || b === 4) ? b : 2;
  });

  const initialSpeed = preset.speed || preset.bpm || 120;
  const [speed, setSpeedState] = useState(initialSpeed);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);

  const emitLiveSync = useCallback(
    (action: LiveSyncAction, overrides?: Partial<LiveBandSyncPacket>) => {
      if (!currentBand) return;
      const nextVersion = packetVersionRef.current++;
      const packet: LiveBandSyncPacket = {
        bandId: currentBand.id,
        leaderId: currentBand.leaderId || 'local-leader',
        leaderName: 'Leader',
        songId: preset.id,
        songTitle: preset.name || 'Untitled Song',
        action,
        timestamp: Date.now(),
        currentLineIdx: overrides?.currentLineIdx ?? currentLineIdxRef.current,
        currentWordIdx: overrides?.currentWordIdx ?? currentWordIdxRef.current,
        currentBeat: overrides?.currentBeat ?? currentBeat,
        currentBar: overrides?.currentBar ?? currentBar,
        bpm: overrides?.bpm ?? speed,
        barsPerLine: overrides?.barsPerLine ?? barsPerLine,
        elapsedMs: overrides?.elapsedMs ?? elapsedMs,
        autoPlay: overrides?.autoPlay ?? autoPlay,
        version: nextVersion,
        songPayload: {
          title: preset.name,
          artist: preset.artist,
          key: preset.key,
          bpm: preset.bpm,
          speed: preset.speed,
          barsPerLine: preset.barsPerLine,
          targetDurationSeconds: preset.targetDurationSeconds,
          sections: preset.sections,
          lyrics: preset.lyrics,
          chords: preset.chords,
        },
      };
      broadcastBandLivePacket(packet);
    },
    [currentBand, preset, currentBeat, currentBar, speed, barsPerLine, elapsedMs, autoPlay]
  );

  const setAutoPlay = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setAutoPlayState((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        if (isBroadcasting) {
          emitLiveSync(next ? 'PLAY' : 'PAUSE', { autoPlay: next });
        }
        return next;
      });
    },
    [isBroadcasting, emitLiveSync]
  );

  useEffect(() => {
    if (preset.barsPerLine) {
      setBarsPerLineState(preset.barsPerLine);
    }
  }, [preset.barsPerLine]);

  const setBarsPerLine = useCallback(
    (action: number | ((prev: number) => number)) => {
      let nextBars = 2;
      setBarsPerLineState((prev) => {
        const raw = typeof action === 'function' ? action(prev) : action;
        nextBars = Math.max(1, Math.min(4, Math.round(raw)));
        return nextBars;
      });

      wordRemainingMsRef.current = 0;
      wordStartTimestampRef.current = 0;

      if (isBroadcasting) {
        emitLiveSync('BARS_CHANGE', { barsPerLine: nextBars });
      }

      if (preset?.id) {
        queueMicrotask(() => {
          try {
            useChordStore.getState().updatePreset(preset.id, {
              barsPerLine: nextBars,
            });
          } catch (_) {}
        });
      }
    },
    [preset?.id, isBroadcasting, emitLiveSync]
  );

  const beatsPerLine = barsPerLine * 4;
  const setBeatsPerLine = useCallback((b: number) => {
    setBarsPerLine(Math.round(b / 4));
  }, [setBarsPerLine]);

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

  // Live Chords diagram scale with local storage persistence ('large' | 'medium' | 'small')
  const [chordDiagramScale, setChordDiagramScaleState] = useState<ChordDiagramScale>(() => {
    try {
      const saved = localStorage.getItem('chordex_chord_diagram_scale');
      if (saved === 'large' || saved === 'medium' || saved === 'small') {
        return saved;
      }
    } catch (_) {}
    return 'large';
  });

  const setChordDiagramScale = useCallback((scale: ChordDiagramScale) => {
    setChordDiagramScaleState(scale);
    try {
      localStorage.setItem('chordex_chord_diagram_scale', scale);
    } catch (_) {}
  }, []);

  const [showContext, setShowContext] = useState(true);
  const [seekToken, setSeekToken] = useState(0);

  const wordRemainingMsRef = useRef<number>(0);
  const wordStartTimestampRef = useRef<number>(0);
  const beatRemainingMsRef = useRef<number>(0);
  const beatStartTimestampRef = useRef<number>(0);

  // Sync if preset.speed or preset.bpm changes externally
  useEffect(() => {
    const next = preset.speed || preset.bpm;
    if (next && next > 0) {
      setSpeedState(next);
    }
  }, [preset.speed, preset.bpm]);

  const setSpeed = useCallback(
    (action: number | ((prev: number) => number)) => {
      let nextSpeed = 120;
      setSpeedState((prev) => {
        const raw = typeof action === 'function' ? action(prev) : action;
        nextSpeed = Math.max(40, Math.min(400, Math.round(raw)));
        return nextSpeed;
      });
      
      wordRemainingMsRef.current = 0;
      wordStartTimestampRef.current = 0;

      if (isBroadcasting) {
        emitLiveSync('TEMPO_CHANGE', { bpm: nextSpeed });
      }

      if (preset?.id) {
        queueMicrotask(() => {
          try {
            useChordStore.getState().updatePreset(preset.id, { 
              speed: nextSpeed, 
              bpm: nextSpeed 
            });
          } catch (_) {}
        });
      }
    },
    [preset?.id, isBroadcasting, emitLiveSync]
  );

  const bpmOverride = speed;
  const setBpmOverride = setSpeed;

  const [targetDurationSeconds, setTargetDurationSecondsState] = useState<number | undefined>(
    preset.targetDurationSeconds
  );

  // Sync if preset.targetDurationSeconds changes externally
  useEffect(() => {
    setTargetDurationSecondsState(preset.targetDurationSeconds);
  }, [preset.targetDurationSeconds]);

  const setTargetDurationSeconds = useCallback(
    (action: number | undefined | ((prev: number | undefined) => number | undefined)) => {
      let nextDuration: number | undefined;
      setTargetDurationSecondsState((prev) => {
        const raw = typeof action === 'function' ? action(prev) : action;
        nextDuration = raw && raw > 0 ? Math.round(raw) : undefined;
        return nextDuration;
      });
      if (preset?.id) {
        queueMicrotask(() => {
          try {
            useChordStore.getState().updatePreset(preset.id, { targetDurationSeconds: nextDuration });
          } catch (_) {}
        });
      }
    },
    [preset?.id]
  );

  const teleprompterContainerRef = useRef<HTMLDivElement | null>(null);

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
    if (ids.length === 0 && preset.lyrics?.sections) {
      preset.lyrics.sections.forEach((sec) => {
        (sec.lines || []).forEach((line) => {
          (line.chords || []).forEach((c) => {
            if (c.chord && !ids.includes(c.chord)) {
              ids.push(c.chord);
              labels.push(sec.name);
            }
          });
        });
      });
    }
    const finalIds =
      transposeOffset !== 0 ? ids.map((id) => transposeChordId(id, transposeOffset)) : ids;
    return { chords: finalIds, sectionLabels: labels };
  }, [preset.chords, preset.sections, preset.lyrics, transposeOffset]);
  const total = chords.length;

  // ── Deterministic Musical Timing Schedule ────────────────────────
  const timingSchedule = useMemo(() => {
    return calculateSongTimingSchedule(
      { ...preset, targetDurationSeconds, barsPerLine },
      {
        bpmOverride,
        beatsPerChord,
        beatsPerLine,
      }
    );
  }, [preset, bpmOverride, beatsPerChord, barsPerLine, beatsPerLine, targetDurationSeconds]);

  // ── Teleprompter Lines Data ─────────────────────────────────────
  const lineDurationMs = useMemo(() => {
    return (60000 / (bpmOverride || 120)) * beatsPerLine;
  }, [bpmOverride, beatsPerLine]);

  const teleprompterLines = useMemo<TeleprompterLineItem[]>(() => {
    const sections = preset.lyrics?.sections;
    if (!sections || sections.length === 0) return [];

    const items: TeleprompterLineItem[] = [];
    let globalIndex = 0;
    let runningWordGlobalIdx = 0;

    sections.forEach((sec) => {
      const lines = sec.lines || [];
      const sectionRole = sec.vocalRole || preset.lyrics?.defaultVocalRole;
      lines.forEach((line, lIdx) => {
        const lineChords = (line.chords || []).map((c) => ({
          ...c,
          chord: transposeOffset !== 0 ? transposeChordId(c.chord, transposeOffset) : c.chord,
        }));

        const lineRole = line.vocalRole || sectionRole;
        const defaultLineColor =
          line.format?.color ||
          lineRole?.color ||
          preset.lyrics?.formatting?.defaultColor;

        const chunks = splitLineIntoChunks(line.text, lineChords);
        const words = splitLineIntoWords(
          line.text,
          lineChords,
          globalIndex,
          runningWordGlobalIdx,
          lineDurationMs,
          line.type,
          line,
          defaultLineColor
        );
        runningWordGlobalIdx += words.length;

        items.push({
          id: line.id || `line-${sec.id}-${lIdx}`,
          globalIndex,
          sectionId: sec.id,
          sectionName: sec.name,
          sectionType: sec.type,
          sectionVocalRole: lineRole,
          isFirstLineOfSection: lIdx === 0,
          isLastLineOfSection: lIdx === lines.length - 1,
          line,
          chunks,
          words,
          color: defaultLineColor,
        });
        globalIndex++;
      });
    });

    return items;
  }, [preset.lyrics, transposeOffset, lineDurationMs]);
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
    if (initialMode === 'chords' && hasChords) {
      return 'chords_both';
    }
    if (initialMode === 'lyrics' && hasLyrics) {
      return 'lyrics_only';
    }
    if (initialMode === 'both' && (hasChords || hasLyrics)) {
      return 'lyrics_chord_diagram';
    }

    let saved: LiveDisplayMode | null = null;
    try {
      saved = localStorage.getItem('chordex_live_display_mode') as LiveDisplayMode;
    } catch (_) {}

    if (saved && compatibleModes.includes(saved)) {
      return saved;
    }
    if (contentCategory === 'chords_only') return 'chords_both';
    if (contentCategory === 'lyrics_only') return 'lyrics_only';
    if (contentCategory === 'hybrid') return 'lyrics_chord_diagram';
    return 'chords_both';
  }, [initialMode, hasChords, hasLyrics, compatibleModes, contentCategory]);

  const [displayMode, setDisplayModeState] = useState<LiveDisplayMode>(getDefaultMode);

  const prevInitialModeRef = useRef(initialMode);
  // Sync mode if initialMode changes
  useEffect(() => {
    if (prevInitialModeRef.current !== initialMode) {
      prevInitialModeRef.current = initialMode;
      if (initialMode === 'chords' && hasChords) {
        setDisplayModeState('chords_both');
      } else if (initialMode === 'lyrics' && hasLyrics) {
        setDisplayModeState('lyrics_only');
      } else if (initialMode === 'both' && (hasChords || hasLyrics)) {
        setDisplayModeState('lyrics_chord_diagram');
      }
    } else if (!compatibleModes.includes(displayMode) && compatibleModes.length > 0) {
      setDisplayModeState(getDefaultMode());
    }
  }, [initialMode, hasChords, hasLyrics, compatibleModes, displayMode, getDefaultMode]);

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

  // Independent visualStyle with local storage persistence
  const [visualStyleState, setVisualStyleState] = useState<VisualStyle>(() => {
    try {
      const saved = localStorage.getItem('chordex_live_visual_style') as VisualStyle;
      if (saved === 'diagram' || saved === 'name' || saved === 'both') {
        return saved;
      }
    } catch (_) {}
    return 'both';
  });

  const visualStyle: VisualStyle = useMemo(() => {
    if (displayMode === 'chords_diagram') return 'diagram';
    if (displayMode === 'chords_name') return 'name';
    return visualStyleState;
  }, [displayMode, visualStyleState]);

  const setVisualStyle = useCallback(
    (v: VisualStyle) => {
      setVisualStyleState(v);
      try {
        localStorage.setItem('chordex_live_visual_style', v);
      } catch (_) {}
      if (
        displayMode === 'chords_both' ||
        displayMode === 'chords_diagram' ||
        displayMode === 'chords_name'
      ) {
        if (v === 'diagram') setDisplayMode('chords_diagram');
        else if (v === 'name') setDisplayMode('chords_name');
        else setDisplayMode('chords_both');
      }
    },
    [displayMode, setDisplayMode]
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
  const currentChord = chords[currentIdx]
    ? getChordById(chords[currentIdx]) || getChordByName(chords[currentIdx]) || null
    : null;
  const prevChord =
    currentIdx > 0 && chords[currentIdx - 1]
      ? getChordById(chords[currentIdx - 1]) || getChordByName(chords[currentIdx - 1]) || null
      : null;
  const nextChord =
    currentIdx < total - 1 && chords[currentIdx + 1]
      ? getChordById(chords[currentIdx + 1]) || getChordByName(chords[currentIdx + 1]) || null
      : null;
  const shownChord = chords[shownIdx]
    ? getChordById(chords[shownIdx]) || getChordByName(chords[shownIdx]) || null
    : null;

  // ── Word, Beat & Section Navigation ─────────────────────────────
  const [currentWordIdx, setCurrentWordIdxState] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
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

  const findChordIdx = useCallback(
    (chordSymOrId: string | undefined) => {
      if (!chordSymOrId) return -1;
      const lower = chordSymOrId.toLowerCase();
      return chords.findIndex((cId) => {
        if (cId.toLowerCase() === lower) return true;
        const def = getChordById(cId) || getChordByName(cId);
        return Boolean(def && def.name.toLowerCase() === lower);
      });
    },
    [chords]
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
        const chordIdx = findChordIdx(targetWord.chord);
        if (chordIdx !== -1) {
          setCurrentIdx(chordIdx);
        }
      }
      setSeekToken((t) => t + 1);
    },
    [allWords, currentLineIdx, findChordIdx]
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
        const chordIdx = findChordIdx(targetWord.chord);
        if (chordIdx !== -1) setCurrentIdx(chordIdx);
      }
      return next;
    });
  }, [allWords, currentLineIdx, findChordIdx]);

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
        const chordIdx = findChordIdx(targetWord.chord);
        if (chordIdx !== -1) setCurrentIdx(chordIdx);
      }
      return prevIdx;
    });
  }, [allWords, currentLineIdx, findChordIdx]);

  const goToLine = useCallback(
    (idx: number) => {
      setIsHeaderHidden(false);
      if (idx >= 0 && idx < totalLines) {
        setDirection(idx >= currentLineIdx ? 'forward' : 'backward');
        setCurrentLineIdx(idx);
        setCurrentBeat(0);
        setCurrentBar(1);
        const firstWord = allWords.find((w) => w.lineIdx === idx);
        if (firstWord) {
          setCurrentWordIdxState(firstWord.globalWordIdx);
          if (firstWord.chord) {
            const chordIdx = findChordIdx(firstWord.chord);
            if (chordIdx !== -1) setCurrentIdx(chordIdx);
          }
        }
        setSeekToken((t) => t + 1);

        if (isBroadcasting) {
          emitLiveSync('SEEK', { currentLineIdx: idx, currentBeat: 0, currentBar: 1 });
        }
      }
    },
    [totalLines, currentLineIdx, allWords, findChordIdx, isBroadcasting, emitLiveSync]
  );

  const nextPhrase = useCallback(() => {
    if (currentLineIdx + 1 < totalLines) {
      goToLine(currentLineIdx + 1);
      const nextFirstWord = allWords.find((w) => w.lineIdx === currentLineIdx + 1);
      if (nextFirstWord) setCurrentWordIdxState(nextFirstWord.globalWordIdx);
      if (isBroadcasting) {
        emitLiveSync('CUE', { currentLineIdx: currentLineIdx + 1, currentBeat: 0, currentBar: 1 });
      }
    }
  }, [currentLineIdx, totalLines, goToLine, allWords, isBroadcasting, emitLiveSync]);

  const prevPhrase = useCallback(() => {
    if (currentLineIdx > 0) {
      goToLine(currentLineIdx - 1);
      const prevFirstWord = allWords.find((w) => w.lineIdx === currentLineIdx - 1);
      if (prevFirstWord) setCurrentWordIdxState(prevFirstWord.globalWordIdx);
      if (isBroadcasting) {
        emitLiveSync('CUE', { currentLineIdx: currentLineIdx - 1, currentBeat: 0, currentBar: 1 });
      }
    }
  }, [currentLineIdx, goToLine, allWords, isBroadcasting, emitLiveSync]);

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
      if (autoPlay && targetScroll > 20) {
        setIsHeaderHidden(true);
      }
    }
  }, [currentLineIdx, isTeleprompterMode, autoPlay]);

  // ── Musical Timing Constants ─────────────────────────────────────
  const beatDurationMs = (60000 / (bpmOverride || 120)) / (playbackSpeed || 1);
  const msPerChord = beatDurationMs * beatsPerChord;
  const msPerLine = beatDurationMs * beatsPerLine;

  // ── Monotonic Elapsed Performance Time Tracking ──────────────────

  // Sync elapsed progress to start timestamp of active item on seek/jump
  useEffect(() => {
    if (isTeleprompterMode) {
      const scheduledLine = timingSchedule.lines[currentLineIdx];
      if (scheduledLine) {
        setElapsedMs(scheduledLine.startTimeMs);
      }
    } else {
      const scheduledChord = timingSchedule.chords[currentIdx];
      if (scheduledChord) {
        setElapsedMs(scheduledChord.startTimeMs);
      }
    }
  }, [currentLineIdx, currentIdx, isTeleprompterMode, timingSchedule]);

  // Periodic 1Hz elapsed clock during autoPlay (minimal render footprint)
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + 1000 * (playbackSpeed || 1);
        const total = timingSchedule.effectiveDurationMs;
        return next > total ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPlay, playbackSpeed, timingSchedule.effectiveDurationMs]);

  // ── Precision Musical Beat Clock (Decoupled & Drift-Compensated) ──
  useEffect(() => {
    beatRemainingMsRef.current = 0;
    beatStartTimestampRef.current = 0;
  }, [seekToken, currentLineIdx]);

  useEffect(() => {
    if (!autoPlay || bpmOverride <= 0) {
      if (beatStartTimestampRef.current > 0) {
        const passed = performance.now() - beatStartTimestampRef.current;
        beatRemainingMsRef.current = Math.max(0, (beatRemainingMsRef.current || 0) - passed);
        beatStartTimestampRef.current = 0;
      }
      return;
    }

    let currentWaitMs = beatDurationMs;
    if (beatRemainingMsRef.current > 0) {
      currentWaitMs = beatRemainingMsRef.current;
    } else {
      beatRemainingMsRef.current = beatDurationMs;
    }

    beatStartTimestampRef.current = performance.now();
    let expectedTime = performance.now() + currentWaitMs;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const tickBeat = () => {
      beatRemainingMsRef.current = 0;
      beatStartTimestampRef.current = performance.now();

      const now = performance.now();
      const drift = now - expectedTime;

      setCurrentBeat((b) => {
        const next = (b + 1) % 4;
        if (next === 0) {
          setCurrentBar((bar) => ((bar % barsPerLine) + 1));
        }
        return next;
      });

      beatRemainingMsRef.current = beatDurationMs;
      expectedTime += beatDurationMs;
      const nextDelay = Math.max(0, beatDurationMs - drift);
      timerId = setTimeout(tickBeat, nextDelay);
    };

    timerId = setTimeout(tickBeat, currentWaitMs);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [autoPlay, bpmOverride, playbackSpeed, beatDurationMs, barsPerLine, currentLineIdx]);

  // ── Precision Chords Auto-Play Timer (Drift-Compensated) ─────────
  useEffect(() => {
    if (isTeleprompterMode || !autoPlay || bpmOverride <= 0 || total === 0) return;
    const scheduledChord = timingSchedule.chords[currentIdx];
    const actualChordMs = (scheduledChord ? scheduledChord.durationMs : msPerChord) / (playbackSpeed || 1);
    let expectedTime = performance.now() + actualChordMs;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const tickChord = () => {
      const now = performance.now();
      const drift = now - expectedTime;

      goNext();
      playChordSound();

      expectedTime += actualChordMs;
      const nextDelay = Math.max(0, actualChordMs - drift);
      timerId = setTimeout(tickChord, nextDelay);
    };

    timerId = setTimeout(tickChord, actualChordMs);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [
    isTeleprompterMode,
    autoPlay,
    bpmOverride,
    playbackSpeed,
    msPerChord,
    currentIdx,
    timingSchedule.chords,
    total,
    goNext,
    playChordSound,
  ]);

  const [interludeRemainingSec, setInterludeRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    currentWordIdxRef.current = currentWordIdx;
  }, [currentWordIdx]);

  useEffect(() => {
    wordRemainingMsRef.current = 0;
    wordStartTimestampRef.current = 0;
  }, [seekToken]);

  useEffect(() => {
    if (!isTeleprompterMode || totalLines === 0) return;

    if (!autoPlay || bpmOverride <= 0) {
      if (wordStartTimestampRef.current > 0) {
        const passed = performance.now() - wordStartTimestampRef.current;
        wordRemainingMsRef.current = Math.max(0, (wordRemainingMsRef.current || 0) - passed);
        wordStartTimestampRef.current = 0;
      }
      return;
    }

    const activeLine = teleprompterLines[currentLineIdx];
    const isInterlude =
      activeLine?.sectionType === 'interlude' ||
      activeLine?.line?.type === 'interlude' ||
      activeLine?.line?.explicitDurationMs !== undefined;

    const actualLineMs = (isInterlude
      ? Math.max(1000, activeLine?.line?.explicitDurationMs || 15000)
      : msPerLine) / (playbackSpeed || 1);

    const lineWords = activeLine?.words || [];
    const wordCount = Math.max(1, lineWords.length);
    const wordDurationMs = actualLineMs / wordCount;

    // Find current word's relative index in activeLine
    let localWordIdx = 0;
    const currentWord = allWords[currentWordIdxRef.current];
    if (currentWord && currentWord.lineIdx === currentLineIdx) {
      localWordIdx = currentWord.wordIdxInLine;
    }

    let currentWaitMs = wordDurationMs;
    if (wordRemainingMsRef.current > 0) {
      currentWaitMs = wordRemainingMsRef.current;
    } else {
      wordRemainingMsRef.current = wordDurationMs;
    }

    wordStartTimestampRef.current = performance.now();
    let expectedTime = performance.now() + currentWaitMs;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let interludeInterval: ReturnType<typeof setInterval> | null = null;

    if (activeLine?.sectionType === 'interlude' || activeLine?.line?.type === 'interlude') {
      const updateCountdown = () => {
        if (!wordStartTimestampRef.current) return;
        const passed = performance.now() - wordStartTimestampRef.current;
        const remMs = Math.max(0, currentWaitMs - passed);
        setInterludeRemainingSec(Math.ceil(remMs / 1000));
      };
      updateCountdown();
      interludeInterval = setInterval(updateCountdown, 200);
    } else {
      setInterludeRemainingSec(null);
    }

    const tickWord = () => {
      setIsHeaderHidden(true);
      wordRemainingMsRef.current = 0; // reset for next word
      wordStartTimestampRef.current = performance.now();

      const now = performance.now();
      const drift = now - expectedTime;

      localWordIdx++;
      if (localWordIdx < lineWords.length) {
        // Advance to next word within current line
        const nextWord = lineWords[localWordIdx];
        if (nextWord) {
          currentWordIdxRef.current = nextWord.globalWordIdx;
          setCurrentWordIdxState(nextWord.globalWordIdx);
          if (nextWord.chord) {
            const chordIdx = findChordIdx(nextWord.chord);
            if (chordIdx !== -1) setCurrentIdx(chordIdx);
          }
        }
        wordRemainingMsRef.current = wordDurationMs;
        currentWaitMs = wordDurationMs;
        expectedTime += wordDurationMs;
        const nextDelay = Math.max(0, wordDurationMs - drift);
        timerId = setTimeout(tickWord, nextDelay);
      } else {
        // Line completed its allotted musical duration! Advance to next line
        const nextLineIdx = (currentLineIdx + 1) % totalLines;
        setDirection('forward');
        setCurrentLineIdx(nextLineIdx);
        setCurrentBeat(0);
        setCurrentBar(1);
        const nextLineWords = teleprompterLines[nextLineIdx]?.words || [];
        if (nextLineWords.length > 0) {
          const firstWord = nextLineWords[0];
          currentWordIdxRef.current = firstWord.globalWordIdx;
          setCurrentWordIdxState(firstWord.globalWordIdx);
          if (firstWord.chord) {
            const chordIdx = findChordIdx(firstWord.chord);
            if (chordIdx !== -1) setCurrentIdx(chordIdx);
          }
        }
        if (isBroadcasting) {
          emitLiveSync('PLAY', { currentLineIdx: nextLineIdx, currentBeat: 0, currentBar: 1 });
        }
      }
    };

    timerId = setTimeout(tickWord, currentWaitMs);

    return () => {
      if (timerId) clearTimeout(timerId);
      if (interludeInterval) clearInterval(interludeInterval);
    };
  }, [
    isTeleprompterMode,
    autoPlay,
    bpmOverride,
    playbackSpeed,
    msPerLine,
    currentLineIdx,
    timingSchedule.lines,
    seekToken,
    totalLines,
    teleprompterLines,
    allWords,
    chords,
    findChordIdx,
    isBroadcasting,
    emitLiveSync,
  ]);

  // ── Leader Heartbeat Broadcast ──────────────────────────────────
  useEffect(() => {
    if (!isBroadcasting || !autoPlay || !currentBand?.id) return;
    const interval = setInterval(() => {
      emitLiveSync('HEARTBEAT');
    }, 4000);
    return () => clearInterval(interval);
  }, [isBroadcasting, autoPlay, currentBand?.id, emitLiveSync]);

  // ── Follower / Band Member Live Session Synchronization ─────────
  useEffect(() => {
    if (!isLockedToLeader || isBroadcasting || !currentBand?.id) return;

    const unsub = subscribeToBandLiveSession(currentBand.id, (packet) => {
      if (!packet || packet.bandId !== currentBand.id) return;

      setActiveLiveSession(packet);

      const { isStale } = calculateTransitDrift(packet);
      if (isStale && packet.action !== 'PLAY' && packet.action !== 'PAUSE') return;

      if (packet.bpm && packet.bpm >= 40 && packet.bpm <= 400 && packet.bpm !== speed) {
        setSpeedState(packet.bpm);
      }
      if (
        packet.barsPerLine &&
        packet.barsPerLine >= 1 &&
        packet.barsPerLine <= 4 &&
        packet.barsPerLine !== barsPerLine
      ) {
        setBarsPerLineState(packet.barsPerLine);
      }

      switch (packet.action) {
        case 'PLAY':
          if (packet.currentLineIdx !== currentLineIdxRef.current) {
            goToLine(packet.currentLineIdx);
          }
          setAutoPlayState(true);
          setCurrentBeat(packet.currentBeat || 0);
          setCurrentBar(packet.currentBar || 1);
          break;

        case 'PAUSE':
          setAutoPlayState(false);
          if (packet.currentLineIdx !== currentLineIdxRef.current) {
            goToLine(packet.currentLineIdx);
          }
          setCurrentBeat(packet.currentBeat || 0);
          setCurrentBar(packet.currentBar || 1);
          break;

        case 'SEEK':
        case 'CUE':
          goToLine(packet.currentLineIdx);
          setCurrentBeat(packet.currentBeat || 0);
          setCurrentBar(packet.currentBar || 1);
          if (typeof packet.autoPlay === 'boolean') {
            setAutoPlayState(packet.autoPlay);
          }
          break;

        case 'TEMPO_CHANGE':
          if (packet.bpm) setSpeedState(packet.bpm);
          break;

        case 'BARS_CHANGE':
          if (packet.barsPerLine) setBarsPerLineState(packet.barsPerLine);
          break;

        case 'HEARTBEAT':
          if (packet.autoPlay) {
            setAutoPlayState(true);
            if (Math.abs(packet.currentLineIdx - currentLineIdxRef.current) >= 1) {
              goToLine(packet.currentLineIdx);
            }
          }
          break;
      }
    });

    return unsub;
  }, [
    isLockedToLeader,
    isBroadcasting,
    currentBand?.id,
    speed,
    barsPerLine,
    goToLine,
    setActiveLiveSession,
  ]);

  // ── Animated Chord Phase Transitions (Chords Mode) ──────────────
  useEffect(() => {
    setShownIdx(currentIdx);
  }, [currentIdx]);

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
        return getChordById(curWord.chord) || getChordByName(curWord.chord);
      }
      const lineWords = curLine.words;
      const wordInLine = lineWords.findIndex((w) => w.globalWordIdx === currentWordIdx);
      if (wordInLine !== -1) {
        for (let i = wordInLine; i >= 0; i--) {
          if (lineWords[i].chord) {
            return getChordById(lineWords[i].chord!) || getChordByName(lineWords[i].chord!);
          }
        }
      }
      const firstChunkWithChord = curLine.chunks.find((c) => Boolean(c.chord));
      if (firstChunkWithChord?.chord) {
        return getChordById(firstChunkWithChord.chord) || getChordByName(firstChunkWithChord.chord);
      }
    }
    // Backward search in previous lines to sustain the prevailing chord
    for (let l = currentLineIdx - 1; l >= 0; l--) {
      const prevLine = teleprompterLines[l];
      if (prevLine?.chunks) {
        for (let c = prevLine.chunks.length - 1; c >= 0; c--) {
          const chunkChord = prevLine.chunks[c]?.chord;
          if (chunkChord) {
            return getChordById(chunkChord) || getChordByName(chunkChord);
          }
        }
      }
    }
    // Forward search if song starts with an intro or line before first chord
    for (let l = currentLineIdx + 1; l < teleprompterLines.length; l++) {
      const nextLine = teleprompterLines[l];
      const chunkChord = nextLine?.chunks?.find((c) => Boolean(c.chord))?.chord;
      if (chunkChord) {
        return getChordById(chunkChord) || getChordByName(chunkChord);
      }
    }
    return shownChord;
  }, [teleprompterLines, currentLineIdx, allWords, currentWordIdx, shownChord]);

  const nextPreviewChord = useMemo(() => {
    if (currentLineIdx + 1 < totalLines) {
      const nextLine = teleprompterLines[currentLineIdx + 1];
      const nextChunkWithChord = nextLine?.chunks.find((c) => Boolean(c.chord));
      if (nextChunkWithChord?.chord) {
        return getChordById(nextChunkWithChord.chord) || getChordByName(nextChunkWithChord.chord);
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
    return {
      animation: 'live-mode-chord-enter 120ms ease-out both',
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
    isHeaderHidden,
    setIsHeaderHidden,
    displayMode,
    setDisplayMode,
    visualStyle,
    setVisualStyle,
    chordDiagramScale,
    setChordDiagramScale,
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
    transposeOffset,
    autoPlay,
    setAutoPlay,
    showSettings,
    setShowSettings,
    showQuickActions,
    setShowQuickActions,
    beatsPerChord,
    setBeatsPerChord,
    barsPerLine,
    setBarsPerLine,
    beatsPerLine,
    setBeatsPerLine,
    showContext,
    setShowContext,
    speed,
    setSpeed,
    bpmOverride,
    setBpmOverride,
    playbackSpeed,
    setPlaybackSpeed,
    cyclePlaybackSpeed,
    currentBeat,
    currentBar,
    msPerChord,
    msPerLine,
    targetDurationSeconds,
    setTargetDurationSeconds,
    timingSchedule,
    elapsedMs,
    setElapsedMs,
    interludeRemainingSec,
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
    hasActiveBand: Boolean(currentBand),
    bandName: currentBand?.name || 'Band',
    isBroadcasting,
    setIsBroadcasting,
    isLockedToLeader,
    setIsLockedToLeader,
    activeLiveSession,
    emitLiveSync,
    overlayAnim,
    chordStyle,
    isExiting,
  };
}
