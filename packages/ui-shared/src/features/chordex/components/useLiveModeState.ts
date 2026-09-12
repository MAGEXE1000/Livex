import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  getChordById,
  transposeChordId,
  setNavHidden,
  ACCENT_COLORS,
  resolveAccent,
  useSettingsStore,
  useShallow,
} from '@workspace/studio-core';
import type { SongPreset, GuitarChordData } from '@workspace/studio-core';

export type VisualStyle = 'both' | 'diagram' | 'name';
export type BeatsPerChord = 1 | 2 | 4 | 8;

export interface LiveModeState {
  preset: SongPreset;
  accent: { from: string; to: string };
  currentIdx: number;
  shownIdx: number;
  autoPlay: boolean;
  setAutoPlay: (v: boolean | ((prev: boolean) => boolean)) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void;
  visualStyle: VisualStyle;
  setVisualStyle: (v: VisualStyle) => void;
  beatsPerChord: BeatsPerChord;
  setBeatsPerChord: (v: BeatsPerChord) => void;
  showContext: boolean;
  setShowContext: (v: boolean | ((prev: boolean) => boolean)) => void;
  bpmOverride: number;
  setBpmOverride: (v: number | ((prev: number) => number)) => void;
  chords: string[];
  sectionLabels: (string | null)[];
  total: number;
  currentChord: any;
  prevChord: any;
  nextChord: any;
  shownChord: any;
  goNext: () => void;
  goPrev: () => void;
  handleClose: () => void;
  handleTap: (e: React.MouseEvent<HTMLDivElement>) => void;
  setCurrentIdx: (idx: number) => void;
  setDirection: (dir: 'forward' | 'backward') => void;
  msPerChord: number;
  overlayAnim: React.CSSProperties;
  chordStyle: React.CSSProperties;
  isExiting: boolean;
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
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [autoPlay, setAutoPlay] = useState(false);
  const [shownIdx, setShownIdx] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter-prep'>('idle');
  const [transDir, setTransDir] = useState<'forward' | 'backward'>('forward');
  const [showSettings, setShowSettings] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
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
    setNavHidden(true);
    return () => setNavHidden(false);
  }, []);

  const [visualStyle, setVisualStyle] = useState<VisualStyle>('both');
  const [beatsPerChord, setBeatsPerChord] = useState<BeatsPerChord>(4);
  const [showContext, setShowContext] = useState(true);
  const [bpmOverride, setBpmOverride] = useState(preset.bpm);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { chords, sectionLabels } = useMemo(() => {
    const ids: string[] = [];
    const labels: (string | null)[] = [];
    preset.chords.forEach((id) => {
      ids.push(id);
      labels.push(null);
    });
    (preset.sections ?? []).forEach((sec) => {
      sec.chords.forEach((id) => {
        ids.push(id);
        labels.push(sec.name);
      });
    });
    const finalIds =
      transposeOffset !== 0 ? ids.map((id) => transposeChordId(id, transposeOffset)) : ids;
    return { chords: finalIds, sectionLabels: labels };
  }, [preset.chords, preset.sections, transposeOffset]);
  const total = chords.length;

  const currentChord = chords[currentIdx] ? getChordById(chords[currentIdx]) : null;
  const prevChord =
    currentIdx > 0 && chords[currentIdx - 1] ? getChordById(chords[currentIdx - 1]) : null;
  const nextChord =
    currentIdx < total - 1 && chords[currentIdx + 1] ? getChordById(chords[currentIdx + 1]) : null;

  const goNext = useCallback(() => {
    setDirection('forward');
    setCurrentIdx((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setDirection('backward');
      setCurrentIdx((i) => i - 1);
    }
  }, [currentIdx]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoPlay && bpmOverride > 0) {
      const ms = (60000 / bpmOverride) * beatsPerChord;
      intervalRef.current = setInterval(goNext, ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, bpmOverride, beatsPerChord, goNext]);

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

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showSettings) return;
    if (e.clientX < window.innerWidth / 2) goPrev();
    else goNext();
  };

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

  const msPerChord = (60000 / (bpmOverride || 120)) * beatsPerChord;

  const overlayAnim: React.CSSProperties = {
    animation: isExiting
      ? 'live-mode-exit 280ms cubic-bezier(0.4, 0, 1, 1) both'
      : 'live-mode-enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both',
  };

  return {
    preset,
    accent,
    currentIdx,
    shownIdx,
    autoPlay,
    setAutoPlay,
    showSettings,
    setShowSettings,
    visualStyle,
    setVisualStyle,
    beatsPerChord,
    setBeatsPerChord,
    showContext,
    setShowContext,
    bpmOverride,
    setBpmOverride,
    chords,
    sectionLabels,
    total,
    currentChord,
    prevChord,
    nextChord,
    shownChord,
    goNext,
    goPrev,
    handleClose,
    handleTap,
    msPerChord,
    overlayAnim,
    chordStyle,
    isExiting,
    setCurrentIdx,
    setDirection,
  };
}
