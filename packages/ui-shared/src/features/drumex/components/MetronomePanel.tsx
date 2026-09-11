import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useMetronomeStore,
  useSettingsStore,
  metronomeAudioEngine,
  SOUND_LABELS,
  useBackHandler,
  getBeatsPerMeasure,
  type MetronomeTimeSignature,
  type MetronomeSubdivision,
  type MetronomeSoundId,
  type MetronomePreset,
} from '@workspace/studio-core';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import {
  TimeSignatureModal,
  SubdivisionModal,
  TempoRampModal,
  CountInModal,
} from './MetronomeModals';

interface MetronomePanelProps {
  onBack?: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  isAmoled?: boolean;
}

export function MetronomePanel({ onBack, onScroll, isAmoled: propIsAmoled }: MetronomePanelProps) {
  const storeAmoled = useSettingsStore(
    (s) => Boolean(s.settings?.amoledMode || s.settings?.perApp?.drumex?.amoledMode)
  );
  const isAmoled = propIsAmoled ?? storeAmoled;

  const {
    bpm,
    timeSignature,
    subdivision,
    sound,
    accentBeat,
    accentPattern,
    volume,
    isMuted,
    countInEnabled,
    countInBars,
    countInVoiceEnabled,
    isTempoLocked,
    tempoRamp,
    effectiveBpm,
    rampProgress,
    isPlaying,
    activeBeat,
    activeSubdivision,
    isCountIn,
    countInNumber,
    countInBar,
    countInTotalBars,
    userPresets,
    presets,
    activePresetId,
    practiceTimerActive,
    practiceTimerMinutes,
    practiceSecondsRemaining,
    stopwatchDurationSec,
    stopwatchRemainingSec,
    stopwatchIsRunning,
    stopwatchIsCompleted,
    setBpm,
    adjustBpm,
    setTimeSignature,
    setSubdivision,
    setSound,
    setAccentBeat,
    setAccentPattern,
    setBeatAccent,
    cycleBeatAccent,
    setVolume,
    toggleMute,
    toggleCountIn,
    setCountInBars,
    setCountInVoice,
    toggleTempoLock,
    startStopwatch,
    pauseStopwatch,
    toggleStopwatch,
    resetStopwatch,
    adjustStopwatchDuration,
    setStopwatchDuration,
    togglePlay,
    tapTempo,
    loadPreset,
    saveNewPreset,
    updateCurrentPreset,
    updatePreset,
    duplicatePreset,
    deletePreset,
    setTempoRamp,
    toggleTempoRamp,
    togglePracticeTimer,
  } = useMetronomeStore();

  // Local UI state
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [showTimeSigModal, setShowTimeSigModal] = useState(false);
  const [showSubdivisionModal, setShowSubdivisionModal] = useState(false);
  const [showTempoRampModal, setShowTempoRampModal] = useState(false);
  const [showCountInModal, setShowCountInModal] = useState(false);
  const [bottomBarMode, setBottomBarMode] = useState<'normal' | 'volume' | 'stopwatch'>('normal');
  const [presetSearch, setPresetSearch] = useState('');
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [activePresetMenuId, setActivePresetMenuId] = useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  // Reference to main scroll container to preserve exact scroll offset across keyboard opening/closing
  const mainScrollRef = useRef<HTMLElement>(null);
  const savedScrollTopRef = useRef<number>(0);
  const isEditingBpmRef = useRef<boolean>(false);

  // Direct BPM numeric keyboard entry state
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [bpmInputValue, setBpmInputValue] = useState('');
  const bpmInputRef = useRef<HTMLInputElement>(null);

  const handleStartBpmEdit = () => {
    if (isTempoLocked) return;
    savedScrollTopRef.current = mainScrollRef.current?.scrollTop ?? 0;
    isEditingBpmRef.current = true;
    setBpmInputValue(String(bpm));
    setIsEditingBpm(true);
  };

  const handleCancelBpmEdit = () => {
    isEditingBpmRef.current = false;
    setIsEditingBpm(false);
    setBpmInputValue('');
    bpmInputRef.current?.blur();
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = savedScrollTopRef.current;
    }
  };

  const handleSaveBpmEdit = () => {
    const raw = bpmInputValue.replace(/[^0-9]/g, '');
    if (raw.length > 0) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 40 && parsed <= 280) {
        setBpm(parsed);
      }
    }
    isEditingBpmRef.current = false;
    setIsEditingBpm(false);
    setBpmInputValue('');
    bpmInputRef.current?.blur();
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = savedScrollTopRef.current;
    }
  };

  useEffect(() => {
    if (isEditingBpm && bpmInputRef.current) {
      bpmInputRef.current.focus({ preventScroll: true });
      try {
        bpmInputRef.current.setSelectionRange(0, bpmInputRef.current.value.length);
      } catch {}
    }
  }, [isEditingBpm]);

  // Session-scoped volume mode: 'normal' | 'exclusive' | 'mute'
  const [isExclusiveVolume, setIsExclusiveVolume] = useState(false);
  const rememberedVolumeRef = useRef<number>(volume > 0 ? volume : 80);

  useEffect(() => {
    if (!isMuted && volume > 0) {
      rememberedVolumeRef.current = volume;
    }
  }, [volume, isMuted]);

  const volumeControlMode: 'normal' | 'exclusive' | 'mute' = isMuted
    ? 'mute'
    : isExclusiveVolume
      ? 'exclusive'
      : 'normal';

  const handleCycleVolumeMode = () => {
    if (volumeControlMode === 'normal') {
      // Normal -> Exclusive
      setIsExclusiveVolume(true);
      if (isMuted) {
        toggleMute();
      }
      try {
        (window as any).ExclusiveVolumeBridge?.setExclusiveVolumeMode(true);
      } catch {}
    } else if (volumeControlMode === 'exclusive') {
      // Exclusive -> Mute
      setIsExclusiveVolume(false);
      try {
        (window as any).ExclusiveVolumeBridge?.setExclusiveVolumeMode(false);
      } catch {}
      if (!isMuted) {
        toggleMute();
      }
    } else {
      // Mute -> Normal
      setIsExclusiveVolume(false);
      try {
        (window as any).ExclusiveVolumeBridge?.setExclusiveVolumeMode(false);
      } catch {}
      if (isMuted) {
        toggleMute();
      }
      if (volume === 0) {
        setVolume(rememberedVolumeRef.current > 0 ? rememberedVolumeRef.current : 80);
      }
    }
  };

  // Hardware volume buttons in Exclusive Mode forwarded from Android MainActivity
  useEffect(() => {
    const handleVolumeKey = (e: Event) => {
      const customEvent = e as CustomEvent<{ direction: 'up' | 'down' }>;
      const dir = customEvent.detail?.direction;
      if (!dir) return;

      if (isMuted) {
        if (dir === 'up') {
          toggleMute();
          setVolume(Math.min(100, Math.max(5, rememberedVolumeRef.current || 80)));
        }
        return;
      }

      const step = 5;
      const next = dir === 'up' ? Math.min(100, volume + step) : Math.max(0, volume - step);
      setVolume(next);
    };

    window.addEventListener('metronome-volume-key', handleVolumeKey);
    return () => {
      window.removeEventListener('metronome-volume-key', handleVolumeKey);
      try {
        (window as any).ExclusiveVolumeBridge?.setExclusiveVolumeMode(false);
      } catch {}
    };
  }, [isMuted, volume, toggleMute, setVolume]);

  // In-modal Create/Edit Preset Form state transformation
  const [presetFormMode, setPresetFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetFormData, setPresetFormData] = useState<{
    name: string;
    bpm: number;
    timeSignature: MetronomeTimeSignature;
    subdivision: MetronomeSubdivision;
    sound: MetronomeSoundId;
    volume: number;
    countInEnabled: boolean;
    accentBeat: number;
  }>({
    name: '',
    bpm: 120,
    timeSignature: '4/4',
    subdivision: '1/16',
    sound: 'woodblock',
    volume: 85,
    countInEnabled: true,
    accentBeat: 0,
  });

  const presetNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presetFormMode && presetNameInputRef.current) {
      presetNameInputRef.current.focus();
    }
  }, [presetFormMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__metronomeStore = useMetronomeStore;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__metronomeStore;
      }
    };
  }, []);

  useBackHandler(
    'overlay',
    () => {
      if (isEditingBpm) {
        setIsEditingBpm(false);
        return true;
      }
      if (showTempoRampModal) {
        setShowTempoRampModal(false);
        return true;
      }
      if (showCountInModal) {
        setShowCountInModal(false);
        return true;
      }
      if (showTimeSigModal) {
        setShowTimeSigModal(false);
        return true;
      }
      if (showSubdivisionModal) {
        setShowSubdivisionModal(false);
        return true;
      }
      if (bottomBarMode !== 'normal') {
        setBottomBarMode('normal');
        return true;
      }
      if (presetFormMode !== null) {
        setPresetFormMode(null);
        setEditingPresetId(null);
        return true;
      }
      if (deletingPresetId !== null) {
        setDeletingPresetId(null);
        setActivePresetMenuId(null);
        return true;
      }
      if (activePresetMenuId !== null) {
        setActivePresetMenuId(null);
        return true;
      }
      if (isPresetsOpen) {
        setIsPresetsOpen(false);
        return true;
      }
      if (showSoundMenu) {
        setShowSoundMenu(false);
        return true;
      }
      return false;
    },
    [
      isEditingBpm,
      showTempoRampModal,
      showCountInModal,
      showTimeSigModal,
      showSubdivisionModal,
      bottomBarMode,
      presetFormMode,
      isPresetsOpen,
      showSoundMenu,
      deletingPresetId,
      activePresetMenuId,
    ]
  );

  // Accent summary descriptor
  const { accentSummary, hasAccents } = useMemo(() => {
    const pattern = accentPattern || [];
    const strongCount = pattern.filter((t) => t === 'strong').length;
    const accentCount = pattern.filter((t) => t === 'accent').length;
    const total = strongCount + accentCount;
    if (total === 0) return { accentSummary: 'No Accents', hasAccents: false };
    if (strongCount > 0 && accentCount > 0) {
      return { accentSummary: `${strongCount} Strong • ${accentCount} Accent`, hasAccents: true };
    }
    if (strongCount > 0) {
      return {
        accentSummary: `${strongCount} Strong Accent${strongCount > 1 ? 's' : ''}`,
        hasAccents: true,
      };
    }
    return {
      accentSummary: `${accentCount} Medium Accent${accentCount > 1 ? 's' : ''}`,
      hasAccents: true,
    };
  }, [accentPattern]);

  // Tempo descriptor
  const { tempoDescriptor, tempoTag } = useMemo(() => {
    if (bpm < 60) return { tempoDescriptor: 'Largo / Grave', tempoTag: '• Slow & Solemn' };
    if (bpm < 80) return { tempoDescriptor: 'Adagio', tempoTag: '• Leisurely Pace' };
    if (bpm < 108) return { tempoDescriptor: 'Andante', tempoTag: '• Walking Pace' };
    if (bpm < 130)
      return { tempoDescriptor: 'Moderato / Allegretto', tempoTag: '• Standard Tempo' };
    if (bpm < 168) return { tempoDescriptor: 'Allegro', tempoTag: '• Fast & Bright' };
    if (bpm < 200) return { tempoDescriptor: 'Vivace', tempoTag: '• Lively & Quick' };
    return { tempoDescriptor: 'Presto', tempoTag: '• Extremely Fast' };
  }, [bpm]);

  // Active preset
  const activePreset = useMemo(() => {
    return userPresets.find((p) => p.id === activePresetId) ?? null;
  }, [userPresets, activePresetId]);

  // Number of beats for the tracker strip
  const beatsCount = useMemo(() => {
    return getBeatsPerMeasure(timeSignature);
  }, [timeSignature]);

  // Dynamic grid class based on meter beats
  const beatGridColsClass = useMemo(() => {
    switch (beatsCount) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-4';
      case 5:
        return 'grid-cols-5';
      case 6:
        return 'grid-cols-6';
      case 7:
        return 'grid-cols-7';
      case 9:
        return 'grid-cols-3 sm:grid-cols-9';
      case 12:
        return 'grid-cols-6 sm:grid-cols-12';
      default:
        return 'grid-cols-4';
    }
  }, [beatsCount]);

  // Dynamic pulses and label for subdivision tracker
  const { pulsesCount, subdivisionLabel } = useMemo(() => {
    switch (subdivision) {
      case '1/32':
        return { pulsesCount: 8, subdivisionLabel: '1/32 note pulses' };
      case '6let':
        return { pulsesCount: 6, subdivisionLabel: '1 trip let 2 trip let' };
      case '1/16':
        return { pulsesCount: 4, subdivisionLabel: '1 e & a' };
      case '3let':
        return { pulsesCount: 3, subdivisionLabel: '1 trip let' };
      case '1/8':
        return { pulsesCount: 2, subdivisionLabel: '1 &' };
      case '1/4':
      default:
        return { pulsesCount: 1, subdivisionLabel: '1' };
    }
  }, [subdivision]);

  // Filtered user presets
  const filteredUserPresets = useMemo(() => {
    if (!presetSearch.trim()) {
      return userPresets;
    }
    const q = presetSearch.toLowerCase();
    return userPresets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.timeSignature.includes(q) ||
        SOUND_LABELS[p.sound]?.toLowerCase().includes(q)
    );
  }, [userPresets, presetSearch]);

  const handleOpenCreateForm = () => {
    setPresetFormData({
      name: '',
      bpm,
      timeSignature,
      subdivision,
      sound,
      volume,
      countInEnabled,
      accentBeat,
    });
    setEditingPresetId(null);
    setPresetFormMode('create');
  };

  const handleOpenEditForm = (preset: MetronomePreset) => {
    setPresetFormData({
      name: preset.name,
      bpm: preset.bpm,
      timeSignature: preset.timeSignature,
      subdivision: preset.subdivision,
      sound: preset.sound,
      volume: preset.volume,
      countInEnabled: preset.countInEnabled ?? true,
      accentBeat: preset.accentBeat ?? 0,
    });
    setEditingPresetId(preset.id);
    setPresetFormMode('edit');
    setActivePresetMenuId(null);
  };

  const handleCancelForm = () => {
    setPresetFormMode(null);
    setEditingPresetId(null);
  };

  const handleSaveForm = () => {
    const defaultName = presetFormMode === 'create' ? 'My Custom Groove' : 'Preset';
    const finalName = presetFormData.name.trim() || defaultName;

    if (presetFormMode === 'create') {
      saveNewPreset({
        ...presetFormData,
        name: finalName,
      });
    } else if (presetFormMode === 'edit' && editingPresetId) {
      updatePreset(editingPresetId, {
        ...presetFormData,
        name: finalName,
      });
    }

    setPresetFormMode(null);
    setEditingPresetId(null);
  };

  const formatTimerTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`w-full h-full flex flex-col ${
        isAmoled ? 'bg-black' : 'bg-[#f8f9fb] dark:bg-black'
      } text-[#0e0e0e] dark:text-white font-sans antialiased select-none relative overflow-hidden`}
    >
      <style>{`
        /* Custom Range Slider */
        .metronome-range {
          -webkit-appearance: none;
          background: transparent;
        }
        .metronome-range:focus {
          outline: none;
        }
        .metronome-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: #007aff;
          box-shadow: 0 3px 10px rgba(0, 122, 255, 0.4);
          cursor: pointer;
          margin-top: -8px;
          border: 2.5px solid #ffffff;
          transition: transform 0.1s ease;
        }
        .metronome-range::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }
        .metronome-range::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .dark .metronome-range::-webkit-slider-runnable-track {
          background: #27272a;
        }
        .tap-press:active {
          transform: scale(0.96);
        }
        .tap-press {
          transition: transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.5);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 122, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0);
          }
        }
        .pulse-active {
          animation: pulse-ring 0.6s infinite cubic-bezier(0.2, 0, 0.4, 1);
        }
      `}</style>

      {/* ── Top Navigation Header (Canonical SharedFloatingHeader) ────────── */}
      <SharedFloatingHeader
        title="METRONOME"
        subtitle={activePreset ? activePreset.name : `${SOUND_LABELS[sound]} • ${timeSignature}`}
        onBack={onBack}
      />

      {/* ── Main Live Performance Scroll Area ────────────────────────────── */}
      <main
        ref={mainScrollRef}
        onScroll={(e) => {
          onScroll?.(e as unknown as React.UIEvent<HTMLDivElement>);
        }}
        className={`flex-1 px-4 flex flex-col gap-3.5 no-scrollbar ${
          isEditingBpm ? 'overflow-y-hidden overscroll-none' : 'overflow-y-auto'
        }`}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
          paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 16px)) + 84px)',
        }}
      >
        {/* 1. BEAT TRACKER STRIP */}
        <section
          style={{ boxShadow: 'var(--shadow-surface-soft)' }}
          className={`${
            isAmoled
              ? 'bg-black border-white/15'
              : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
          } rounded-2xl p-3 border flex flex-col gap-2`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-zinc-500 uppercase font-manrope">
              BEAT TRACKER • {timeSignature}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400">
                {accentSummary}
              </span>
              {hasAccents && <span className="w-1.5 h-1.5 rounded-full bg-[#007aff]" />}
            </div>
          </div>

          {/* Visual Pulsing Cells with 3-Tier Multi-Accents */}
          <div className={`grid gap-2 py-1 ${beatGridColsClass}`}>
            {Array.from({ length: beatsCount }).map((_, idx) => {
              const isCurrent = isPlaying && activeBeat === idx;
              const accentType = (accentPattern && accentPattern[idx]) || 'normal';
              const isStrong = accentType === 'strong';
              const isAccent = accentType === 'accent';
              const isCompact = beatsCount > 6;

              if (isCurrent) {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => cycleBeatAccent(idx)}
                    className={`${isCompact ? 'h-10' : 'h-12'} rounded-xl flex flex-col items-center justify-center font-manrope font-extrabold relative overflow-hidden pulse-active cursor-pointer ${
                      isStrong
                        ? 'bg-[#007aff] text-white shadow-[0_4px_14px_rgba(0,122,255,0.4)]'
                        : isAccent
                          ? 'bg-sky-500 text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)]'
                          : 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(0,122,255,0.2)]'
                    }`}
                  >
                    <span className={`${isCompact ? 'text-base' : 'text-lg'} leading-none`}>
                      {idx + 1}
                    </span>
                    <span className="text-[8px] font-bold tracking-widest uppercase opacity-90">
                      {isStrong ? 'STRONG' : isAccent ? 'ACCENT' : 'NORMAL'}
                    </span>
                    {(isStrong || isAccent) && (
                      <span
                        className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full ${
                          isStrong ? 'bg-white' : 'bg-white/80'
                        }`}
                      />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => cycleBeatAccent(idx)}
                  className={`${isCompact ? 'h-10' : 'h-12'} rounded-xl border flex flex-col items-center justify-center font-manrope font-bold transition cursor-pointer relative ${
                    isStrong
                      ? isAmoled
                        ? 'bg-[#007aff]/25 text-[#007aff] border-[#007aff] hover:bg-[#007aff]/35'
                        : 'bg-blue-50/80 dark:bg-blue-950/40 text-[#007aff] border-[#007aff] hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-xs'
                      : isAccent
                        ? isAmoled
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/70 hover:bg-sky-500/30'
                          : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-400/60 dark:border-sky-600/60 hover:bg-sky-100 dark:hover:bg-sky-900/40'
                        : isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className={`${isCompact ? 'text-base' : 'text-lg'} leading-none`}>
                    {idx + 1}
                  </span>
                  <span
                    className={`text-[8px] ${
                      isStrong
                        ? 'font-extrabold text-[#007aff]'
                        : isAccent
                          ? 'font-bold text-sky-500 dark:text-sky-400'
                          : 'font-medium text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {isStrong ? 'STRONG' : isAccent ? 'ACCENT' : 'NORMAL'}
                  </span>
                  {isStrong && (
                    <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#007aff]" />
                  )}
                  {isAccent && (
                    <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Subdivision Visual Dots */}
          <div
            className={`flex items-center justify-between px-2 pt-1 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            }`}
          >
            <span className="text-[9px] font-medium text-slate-400 dark:text-zinc-500">
              Subdivisions
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {Array.from({ length: pulsesCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`rounded-full transition-colors ${
                      pulsesCount > 4 ? 'w-1.5 h-1.5' : 'w-2 h-2'
                    } ${
                      isPlaying && activeSubdivision === i
                        ? 'bg-[#007aff]'
                        : i === 0
                          ? isAmoled
                            ? 'bg-zinc-500'
                            : 'bg-slate-400 dark:bg-zinc-600'
                          : isAmoled
                            ? 'bg-zinc-800'
                            : 'bg-slate-200 dark:bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-zinc-400 ml-1">
                {subdivisionLabel}
              </span>
            </div>
          </div>
        </section>

        {/* 2. GIANT BPM DISPLAY & CONTROLS */}
        <section
          style={{ boxShadow: 'var(--shadow-surface-raised)' }}
          className={`${
            isAmoled
              ? 'bg-black border-white/15'
              : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
          } rounded-3xl p-5 border flex flex-col items-center text-center relative overflow-hidden`}
        >
          {/* Tempo Description & Status */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isAmoled
                  ? 'bg-[#0a0a0c] text-zinc-300 border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
              } border`}
            >
              {tempoDescriptor}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
              {tempoTag}
            </span>
            {isTempoLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                LOCKED
              </span>
            )}
          </div>

          {/* Steppers & Giant BPM */}
          <div className="w-full flex items-center justify-between my-2 px-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                aria-label="Decrease BPM by 5"
                disabled={isTempoLocked}
                onClick={() => adjustBpm(-5)}
                style={{ boxShadow: 'var(--shadow-pill)' }}
                className={`w-9 h-9 rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] text-zinc-300 border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                } font-manrope font-bold text-xs flex items-center justify-center border transition ${
                  isTempoLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isAmoled
                      ? 'hover:bg-white/10 tap-press cursor-pointer'
                      : 'hover:bg-slate-200 dark:hover:bg-zinc-700 tap-press cursor-pointer'
                }`}
                type="button"
              >
                -5
              </button>
              <button
                aria-label="Decrease BPM by 1"
                disabled={isTempoLocked}
                onClick={() => adjustBpm(-1)}
                style={{ boxShadow: 'var(--shadow-pill)' }}
                className={`w-11 h-11 rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] text-zinc-100 border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700'
                } flex items-center justify-center border transition ${
                  isTempoLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isAmoled
                      ? 'hover:bg-white/10 tap-press cursor-pointer'
                      : 'hover:bg-slate-200 dark:hover:bg-zinc-700 tap-press cursor-pointer'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>

            {isEditingBpm ? (
              <div className="flex flex-col items-center select-none">
                <input
                  ref={bpmInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  enterKeyHint="done"
                  value={bpmInputValue}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                    setBpmInputValue(clean);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveBpmEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelBpmEdit();
                    }
                  }}
                  onBlur={() => {
                    handleCancelBpmEdit();
                  }}
                  className="w-36 sm:w-44 text-center text-7xl sm:text-8xl font-black font-manrope tracking-tighter leading-none font-tabular-nums bg-transparent border-b-2 border-[#007aff] outline-none p-0 m-0 text-[#007aff]"
                  placeholder={String(bpm)}
                  maxLength={3}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  aria-label="Direct BPM input"
                />
                <span
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveBpmEdit();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleSaveBpmEdit();
                  }}
                  onClick={handleSaveBpmEdit}
                  className="text-[11px] font-extrabold tracking-widest text-[#007aff] uppercase font-manrope mt-1 flex items-center gap-1 cursor-pointer tap-press"
                  title="Apply BPM"
                  aria-label="Apply BPM"
                >
                  BPM
                  <span className="material-symbols-outlined text-[13px] opacity-80">
                    check_circle
                  </span>
                </span>
              </div>
            ) : (
              <div
                onClick={handleStartBpmEdit}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStartBpmEdit();
                  }
                }}
                className={`flex flex-col items-center select-none ${
                  isTempoLocked
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-90 active:scale-98 transition'
                }`}
                title={isTempoLocked ? 'Tempo is locked' : 'Tap to enter BPM directly'}
                aria-label={isTempoLocked ? 'Tempo is locked' : 'Tap to enter BPM directly'}
              >
                <span className="text-7xl sm:text-8xl font-black font-manrope tracking-tighter text-[#0e0e0e] dark:text-zinc-100 leading-none font-tabular-nums">
                  {isPlaying && tempoRamp.enabled ? effectiveBpm : bpm}
                </span>
                <span className="text-[11px] font-extrabold tracking-widest text-[#007aff] uppercase font-manrope mt-1 flex items-center gap-1">
                  BPM
                  {!isTempoLocked && (
                    <span className="material-symbols-outlined text-[13px] opacity-60">edit</span>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                aria-label="Increase BPM by 1"
                disabled={isTempoLocked}
                onClick={() => adjustBpm(1)}
                style={{ boxShadow: 'var(--shadow-pill)' }}
                className={`w-11 h-11 rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] text-zinc-100 border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700'
                } flex items-center justify-center border transition ${
                  isTempoLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isAmoled
                      ? 'hover:bg-white/10 tap-press cursor-pointer'
                      : 'hover:bg-slate-200 dark:hover:bg-zinc-700 tap-press cursor-pointer'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
              <button
                aria-label="Increase BPM by 5"
                disabled={isTempoLocked}
                onClick={() => adjustBpm(5)}
                style={{ boxShadow: 'var(--shadow-pill)' }}
                className={`w-9 h-9 rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] text-zinc-300 border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                } font-manrope font-bold text-xs flex items-center justify-center border transition ${
                  isTempoLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isAmoled
                      ? 'hover:bg-white/10 tap-press cursor-pointer'
                      : 'hover:bg-slate-200 dark:hover:bg-zinc-700 tap-press cursor-pointer'
                }`}
                type="button"
              >
                +5
              </button>
            </div>
          </div>

          {/* Precision Slider */}
          <div className="w-full mt-2 px-1">
            <input
              type="range"
              min={40}
              max={280}
              value={bpm}
              disabled={isTempoLocked}
              onChange={(e) => setBpm(Number(e.target.value))}
              className={`metronome-range w-full h-2 rounded-lg appearance-none ${
                isTempoLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
            />
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mt-1.5 px-0.5 font-mono">
              <span>40 LARGO</span>
              <span>120 MODERATO</span>
              <span>280 PRESTO</span>
            </div>
          </div>

          {/* Active Tempo Progression Badge */}
          {tempoRamp.enabled && (
            <button
              type="button"
              onClick={() => setShowTempoRampModal(true)}
              className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                isAmoled
                  ? 'bg-[#007aff]/15 border-[#007aff]/40 text-[#007aff] hover:bg-[#007aff]/25'
                  : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-900/60 text-[#007aff] hover:bg-blue-100 dark:hover:bg-blue-900/80'
              } border text-[11px] font-bold font-manrope transition cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[15px]">trending_up</span>
              <span>
                {isPlaying
                  ? `Progression: ${effectiveBpm} BPM${rampProgress !== undefined ? ` · ${Math.round(rampProgress * 100)}%` : ''}`
                  : `Progression: ${tempoRamp.startBpm} → ${tempoRamp.targetBpm} BPM`}
              </span>
              {isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#007aff] animate-pulse" />
              )}
            </button>
          )}

          {/* Tap Tempo Button */}
          <div
            className={`w-full mt-4 pt-3 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex items-center justify-center gap-3`}
          >
            <button
              aria-label="Tap Tempo"
              disabled={isTempoLocked}
              onClick={tapTempo}
              style={{
                borderRadius: '9999px',
                boxShadow: 'var(--shadow-control-raised)',
              }}
              className={`w-full py-2.5 px-4 rounded-full ${
                isAmoled
                  ? 'bg-[#0a0a0c] border-white/10 text-zinc-200'
                  : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/90 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
              } border flex items-center justify-center gap-2 font-manrope font-bold text-xs tracking-tight transition ${
                isTempoLocked
                  ? 'opacity-40 cursor-not-allowed'
                  : isAmoled
                    ? 'hover:bg-white/10 tap-press cursor-pointer'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-700 tap-press cursor-pointer'
              }`}
              type="button"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isTempoLocked ? 'text-slate-400' : 'text-[#007aff]'}`}
              >
                {isTempoLocked ? 'lock' : 'touch_app'}
              </span>
              {isTempoLocked ? 'TEMPO LOCKED' : 'TAP TEMPO'}{' '}
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                {isTempoLocked ? '(Unlock below to adjust)' : '(Tap to set tempo)'}
              </span>
            </button>
          </div>
        </section>

        {/* 3. RHYTHM METRICS (Segmented Pills & Modals) */}
        <section className="grid grid-cols-2 gap-2.5">
          {/* Time Signature */}
          <div
            style={{ boxShadow: 'var(--shadow-surface-soft)' }}
            className={`${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
            } rounded-2xl p-3 border flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase font-manrope tracking-wider truncate">
                  TIME SIGNATURE
                </span>
                {!['4/4', '3/4', '6/8', '2/4'].includes(timeSignature) && (
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      isAmoled
                        ? 'bg-[#007aff]/20 text-[#007aff]'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                    } text-[9px] font-extrabold shrink-0`}
                  >
                    {timeSignature}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTimeSigModal(true)}
                className="text-slate-400 dark:text-zinc-500 hover:text-[#007aff] transition cursor-pointer shrink-0 ml-1"
                title="All Time Signatures"
                aria-label="All Time Signatures"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['4/4', '3/4', '6/8', '2/4'] as MetronomeTimeSignature[]).map((sig) => {
                const isSelected = timeSignature === sig;
                return (
                  <button
                    key={sig}
                    type="button"
                    onClick={() => setTimeSignature(sig)}
                    className={`py-2 rounded-xl text-xs font-extrabold font-manrope tap-press cursor-pointer transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#007aff] text-white shadow-xs'
                        : isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {sig}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subdivision */}
          <div
            style={{ boxShadow: 'var(--shadow-surface-soft)' }}
            className={`${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
            } rounded-2xl p-3 border flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase font-manrope tracking-wider truncate">
                  SUBDIVISION
                </span>
                {!['1/4', '1/8', '1/16', '3let'].includes(subdivision) && (
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      isAmoled
                        ? 'bg-[#007aff]/20 text-[#007aff]'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                    } text-[9px] font-extrabold shrink-0`}
                  >
                    {subdivision}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSubdivisionModal(true)}
                className="text-slate-400 dark:text-zinc-500 hover:text-[#007aff] transition cursor-pointer shrink-0 ml-1"
                title="All Subdivisions"
                aria-label="All Subdivisions"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['1/4', '1/8', '1/16', '3let'] as MetronomeSubdivision[]).map((sub) => {
                const isSelected = subdivision === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubdivision(sub)}
                    className={`py-2 rounded-xl text-xs font-extrabold font-manrope tap-press cursor-pointer transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#007aff] text-white shadow-xs'
                        : isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. AUDIO CONTROLS & COUNT-IN ROW */}
        <section
          className={`${
            isAmoled
              ? 'bg-black border-white/15 shadow-none'
              : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 shadow-xs'
          } rounded-2xl p-3.5 border flex items-center justify-between relative`}
        >
          {/* Click Sound Selector */}
          <div className="flex items-center gap-2 relative">
            <div
              className={`w-7 h-7 rounded-full ${
                isAmoled
                  ? 'bg-[#007aff]/15 text-[#007aff]'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
              } flex items-center justify-center`}
            >
              <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
            </div>
            <div className="cursor-pointer" onClick={() => setShowSoundMenu(!showSoundMenu)}>
              <div className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase font-manrope">
                CLICK SOUND
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  {SOUND_LABELS[sound]}
                </span>
                <span className="material-symbols-outlined text-[14px] text-slate-400">
                  expand_more
                </span>
              </div>
            </div>

            {/* Sound Dropdown Popover */}
            {showSoundMenu && (
              <div
                className={`absolute top-10 left-0 z-50 ${
                  isAmoled
                    ? 'bg-black border-white/15'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'
                } border rounded-xl shadow-lg p-1 min-w-[170px] flex flex-col gap-0.5`}
              >
                {(
                  [
                    'woodblock',
                    'click',
                    'sidestick',
                    'drystick',
                    'studioclick',
                    'rimclick',
                    'digital',
                  ] as MetronomeSoundId[]
                ).map((sId) => (
                  <button
                    key={sId}
                    onClick={() => {
                      setSound(sId);
                      setShowSoundMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                      sound === sId
                        ? 'bg-[#007aff] text-white'
                        : isAmoled
                          ? 'text-zinc-200 hover:bg-white/10'
                          : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span>{SOUND_LABELS[sId]}</span>
                    {sound === sId && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Count-in Trigger & Bars */}
          <div
            onClick={() => setShowCountInModal(true)}
            className={`flex items-center gap-2 ${
              isAmoled
                ? 'bg-[#0a0a0c] border-white/10'
                : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700'
            } border rounded-xl px-2.5 py-1.5 cursor-pointer tap-press`}
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-zinc-400">
              timelapse
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 leading-none uppercase">
                Count-In
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {countInEnabled && countInBars > 0
                  ? `${countInBars} ${countInBars === 1 ? 'Bar' : 'Bars'}`
                  : 'Off'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCountIn();
              }}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ml-1 transition cursor-pointer ${
                countInEnabled && countInBars > 0
                  ? 'bg-[#007aff] text-white shadow-xs'
                  : isAmoled
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-slate-200 dark:bg-zinc-700 text-slate-400'
              }`}
              type="button"
              title={countInEnabled && countInBars > 0 ? 'Disable Count-In' : 'Enable Count-In'}
            >
              ✓
            </button>
          </div>
        </section>

        {/* 5. TEMPO LOCK / BPM HOLD (Drumex Modernized Presentation) */}
        <section
          style={{ boxShadow: 'var(--shadow-surface-soft)' }}
          className={`${
            isAmoled
              ? 'bg-black border-white/15'
              : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800'
          } rounded-2xl p-3.5 border flex items-center justify-between transition-all duration-200`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isTempoLocked
                  ? isAmoled
                    ? 'bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/25'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                  : isAmoled
                    ? 'bg-[#0a0a0c] text-zinc-400 border border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isTempoLocked ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-manrope">
                  Tempo Lock
                </span>
                {isTempoLocked && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30 uppercase tracking-wider font-manrope">
                    Locked
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight truncate">
                Hold BPM to avoid accidental changes while practicing
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTempoLock}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-manrope transition-all tap-press cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isTempoLocked
                ? 'bg-[#007aff] text-white shadow-xs hover:bg-blue-600'
                : isAmoled
                  ? 'bg-[#0a0a0c] text-zinc-300 hover:bg-white/10 border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isTempoLocked ? 'lock' : 'lock_open'}
            </span>
            {isTempoLocked ? 'Unlock' : 'Lock BPM'}
          </button>
        </section>
      </main>

      {/* Backdrop for morphed bottom bar mode (volume or stopwatch click away) */}
      {bottomBarMode !== 'normal' && (
        <div
          className="absolute inset-0 z-30 pointer-events-auto bg-black/10 dark:bg-black/25 backdrop-blur-[1px] transition-opacity duration-150"
          onClick={() => setBottomBarMode('normal')}
        />
      )}

      {/* ── MORPHING FLOATING QUICK CONTROLS DOCK ─────────────────────────── */}
      <div
        className="absolute inset-x-0 flex flex-col justify-center items-center pointer-events-none z-40"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        }}
      >
        <aside
          aria-label="Metronome quick controls"
          style={{ boxShadow: 'var(--shadow-surface-raised)' }}
          className={`pointer-events-auto ${
            isAmoled
              ? 'bg-black/95 border-white/15'
              : 'bg-white/95 dark:bg-zinc-900/95 border-slate-200/80 dark:border-zinc-800'
          } backdrop-blur-md rounded-full px-2.5 py-1.5 border flex items-center transition-all duration-200 ease-out`}
        >
          {bottomBarMode === 'volume' ? (
            /* Volume Configuration Morphed Mode */
            <div className="flex items-center gap-1.5 px-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                aria-label={`Volume mode: ${volumeControlMode}. Tap to cycle.`}
                onClick={handleCycleVolumeMode}
                className={`h-[36px] px-2.5 rounded-full flex items-center gap-1.5 transition tap-press cursor-pointer shrink-0 border ${
                  volumeControlMode === 'mute'
                    ? isAmoled
                      ? 'bg-rose-950/40 text-rose-400 border-rose-500/40'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border-rose-400/40'
                    : volumeControlMode === 'exclusive'
                      ? isAmoled
                        ? 'bg-amber-950/50 text-amber-400 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      : isAmoled
                        ? 'bg-[#0a0a0c] text-zinc-200 border-white/10 hover:bg-white/10'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-200'
                }`}
                title={
                  volumeControlMode === 'mute'
                    ? 'State: MUTED (Tap for Normal)'
                    : volumeControlMode === 'exclusive'
                      ? 'State: APP-ONLY / EXCLUSIVE (Tap for Mute)'
                      : 'State: NORMAL (Tap for Exclusive)'
                }
              >
                <span className="material-symbols-outlined text-[18px]">
                  {volumeControlMode === 'mute'
                    ? 'volume_off'
                    : volumeControlMode === 'exclusive'
                      ? 'tune'
                      : volume === 0
                        ? 'volume_mute'
                        : 'volume_up'}
                </span>
                <span className="text-[10px] font-black font-manrope uppercase tracking-wider">
                  {volumeControlMode === 'mute'
                    ? 'Mute'
                    : volumeControlMode === 'exclusive'
                      ? 'Exclusive'
                      : 'Normal'}
                </span>
              </button>
              <div className="flex items-center gap-2 w-[140px] sm:w-[180px] px-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  disabled={volumeControlMode === 'mute'}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isMuted) toggleMute();
                    setVolume(val);
                  }}
                  className={`metronome-range w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    volumeControlMode === 'mute' ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  aria-label="Metronome volume slider"
                />
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 w-9 text-right shrink-0">
                  {isMuted ? '0%' : `${volume}%`}
                </span>
              </div>
              <button
                type="button"
                aria-label="Done with volume"
                onClick={() => setBottomBarMode('normal')}
                className="w-[34px] h-[34px] rounded-full bg-[#007aff] hover:bg-blue-600 text-white flex items-center justify-center transition tap-press cursor-pointer shrink-0 shadow-xs ml-0.5"
                title="Done"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
              </button>
            </div>
          ) : bottomBarMode === 'stopwatch' ? (
            /* Stopwatch / Timer Morphed Mode: [Stopwatch] 05:00 [−] [+] [Start/Stop] */
            <div className="flex items-center gap-1.5 px-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                aria-label="Reset stopwatch"
                onClick={resetStopwatch}
                className={`w-[34px] h-[34px] rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200'
                    : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                } flex items-center justify-center transition tap-press cursor-pointer shrink-0`}
                title="Reset timer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {stopwatchRemainingSec === 0 ? 'restart_alt' : 'timer'}
                </span>
              </button>

              <div className="flex flex-col items-center justify-center px-1.5 min-w-[56px]">
                <span
                  className={`text-sm font-black font-mono tracking-tight tabular-nums leading-none ${
                    stopwatchRemainingSec === 0
                      ? 'text-rose-500 animate-pulse'
                      : stopwatchIsRunning
                        ? 'text-[#007aff]'
                        : isAmoled
                          ? 'text-zinc-100'
                          : 'text-slate-800 dark:text-zinc-100'
                  }`}
                >
                  {formatTimerTime(stopwatchRemainingSec)}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-0.5 leading-none">
                  {stopwatchRemainingSec === 0
                    ? 'Finished'
                    : stopwatchIsRunning
                      ? 'Running'
                      : 'Paused'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease time by 1 minute"
                  onClick={() => adjustStopwatchDuration(-60)}
                  className={`w-[30px] h-[30px] rounded-full ${
                    isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200 border-white/10'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-200/60 dark:border-zinc-700'
                  } flex items-center justify-center font-bold text-xs tap-press cursor-pointer shrink-0 border`}
                >
                  <span className="material-symbols-outlined text-[15px]">remove</span>
                </button>
                <button
                  type="button"
                  aria-label="Increase time by 1 minute"
                  onClick={() => adjustStopwatchDuration(60)}
                  className={`w-[30px] h-[30px] rounded-full ${
                    isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200 border-white/10'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-200/60 dark:border-zinc-700'
                  } flex items-center justify-center font-bold text-xs tap-press cursor-pointer shrink-0 border`}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
              </div>

              <button
                type="button"
                aria-label={stopwatchIsRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
                onClick={toggleStopwatch}
                className={`h-[34px] px-3 rounded-full flex items-center justify-center gap-1 text-xs font-extrabold font-manrope transition tap-press cursor-pointer shrink-0 ml-0.5 shadow-xs ${
                  stopwatchIsRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-[#007aff] hover:bg-blue-600 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {stopwatchIsRunning ? 'pause' : 'play_arrow'}
                </span>
                <span>{stopwatchIsRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                type="button"
                aria-label="Close stopwatch"
                onClick={() => setBottomBarMode('normal')}
                className={`w-[30px] h-[30px] rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                    : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200'
                } flex items-center justify-center transition tap-press cursor-pointer shrink-0`}
                title="Done"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ) : (
            /* Normal Mode Dock */
            <div className="flex items-center gap-2">
              {/* Volume Trigger Button */}
              <button
                aria-label="Volume & Sound"
                onClick={() => setBottomBarMode('volume')}
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition tap-press focus:outline-none cursor-pointer relative ${
                  volumeControlMode === 'mute'
                    ? isAmoled
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-400/40'
                    : volumeControlMode === 'exclusive'
                      ? isAmoled
                        ? 'bg-amber-950/50 text-amber-400 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : isAmoled
                        ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200'
                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                }`}
                title={`Volume: ${
                  volumeControlMode === 'mute'
                    ? 'Muted'
                    : volumeControlMode === 'exclusive'
                      ? `${volume}% [Exclusive / App-Only]`
                      : `${volume}% [Normal]`
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {volumeControlMode === 'mute'
                    ? 'volume_off'
                    : volumeControlMode === 'exclusive'
                      ? 'tune'
                      : volume === 0
                        ? 'volume_mute'
                        : 'volume_up'}
                </span>
                {volumeControlMode === 'exclusive' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-black" />
                )}
              </button>

              {/* Stopwatch / Practice Timer */}
              <button
                aria-label="Stopwatch Timer"
                onClick={() => setBottomBarMode('stopwatch')}
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition tap-press focus:outline-none cursor-pointer relative ${
                  stopwatchIsRunning
                    ? isAmoled
                      ? 'bg-blue-950/40 text-[#007aff]'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                    : isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                }`}
                title={
                  stopwatchIsRunning
                    ? `Stopwatch: ${formatTimerTime(stopwatchRemainingSec)}`
                    : 'Stopwatch / Timer'
                }
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">timer</span>
                {stopwatchIsRunning && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-[#007aff] text-white text-[8px] font-bold rounded-full">
                    {Math.ceil(stopwatchRemainingSec / 60)}m
                  </span>
                )}
              </button>

              {/* Incremental Tempo Trigger */}
              <button
                aria-label="Incremental Tempo"
                onClick={() => setShowTempoRampModal(true)}
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition tap-press focus:outline-none cursor-pointer relative ${
                  tempoRamp.enabled
                    ? isAmoled
                      ? 'bg-blue-950/40 text-[#007aff]'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                    : isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                }`}
                title={
                  tempoRamp.enabled
                    ? `Progression: ${tempoRamp.startBpm} → ${tempoRamp.targetBpm} BPM`
                    : 'Incremental Tempo'
                }
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">trending_up</span>
                {tempoRamp.enabled && (
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#007aff] ring-2 ring-white ${
                      isAmoled ? 'dark:ring-black' : 'dark:ring-zinc-900'
                    }`}
                  />
                )}
              </button>

              {/* Presets Bottom Sheet Trigger */}
              <button
                aria-label="Presets"
                onClick={() => setIsPresetsOpen(true)}
                className={`w-[38px] h-[38px] rounded-full ${
                  isAmoled
                    ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-200'
                    : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                } flex items-center justify-center transition tap-press focus:outline-none relative cursor-pointer`}
                title="Presets"
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">bookmark</span>
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#007aff] ring-2 ring-white ${
                    isAmoled ? 'dark:ring-black' : 'dark:ring-zinc-900'
                  }`}
                />
              </button>

              {/* Start/Stop FAB */}
              <button
                aria-label="Start or Stop Metronome"
                onClick={togglePlay}
                className={`w-[44px] h-[44px] rounded-full text-white shadow-md flex items-center justify-center transition tap-press focus:outline-none ml-0.5 cursor-pointer ${
                  isPlaying
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25 active:scale-95'
                    : 'bg-[#007aff] hover:bg-blue-600 shadow-blue-500/25 active:scale-95'
                }`}
                title={isPlaying ? 'Stop' : 'Start'}
                type="button"
              >
                <span
                  className={`material-symbols-outlined text-[24px] ${isPlaying ? '' : 'ml-0.5'}`}
                >
                  {isPlaying ? 'stop' : 'play_arrow'}
                </span>
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ── PRESETS BOTTOM SHEET MODAL ────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[120] transition-opacity duration-300 ease-out ${
          isPresetsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dimmed backdrop */}
        <div
          onClick={() => setIsPresetsOpen(false)}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Sheet container */}
        <div
          className={`absolute inset-x-0 bottom-0 max-w-md mx-auto transform transition-transform duration-300 ease-out flex flex-col max-h-[88vh] ${
            isAmoled
              ? 'bg-black border-white/15'
              : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
          } rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.18)] border-t border-x overflow-hidden ${
            isPresetsOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          }}
        >
          {/* Drag pill handle */}
          <div className="pt-3 pb-1 flex justify-center items-center cursor-grab">
            <div
              className={`w-10 h-1 rounded-full ${
                isAmoled ? 'bg-zinc-800' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
            />
          </div>

          {/* Modal Header */}
          <div
            className={`px-5 pt-1.5 pb-3 flex items-center justify-between border-b ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-manrope text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
                  {presetFormMode === 'create'
                    ? 'Create Preset'
                    : presetFormMode === 'edit'
                      ? 'Edit Preset'
                      : 'Metronome Presets'}
                </h2>
                {presetFormMode === null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isAmoled
                        ? 'bg-[#007aff]/20 text-[#007aff] border-blue-900/50'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff] border-blue-100 dark:border-blue-900'
                    } border`}
                  >
                    {userPresets.length} saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">
                {presetFormMode === 'create'
                  ? 'Configure new preset settings'
                  : presetFormMode === 'edit'
                    ? 'Update preset parameters'
                    : 'Quickly recall tempo, signature & sound'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {presetFormMode === null ? (
                <>
                  {/* New Preset Button */}
                  <button
                    onClick={handleOpenCreateForm}
                    className="h-8 px-3 rounded-full bg-[#007aff] hover:bg-blue-600 text-white text-xs font-extrabold font-manrope flex items-center gap-1 shadow-sm shadow-blue-500/20 tap-press focus:outline-none cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                    <span>New</span>
                  </button>
                  {/* Close Button */}
                  <button
                    aria-label="Close presets"
                    onClick={() => setIsPresetsOpen(false)}
                    className={`w-8 h-8 rounded-full ${
                      isAmoled
                        ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-300 border border-white/10'
                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                    } flex items-center justify-center transition tap-press focus:outline-none cursor-pointer`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </>
              ) : (
                <button
                  aria-label="Cancel preset editing"
                  onClick={handleCancelForm}
                  className={`w-8 h-8 rounded-full ${
                    isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-300 border border-white/10'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                  } flex items-center justify-center transition tap-press focus:outline-none cursor-pointer`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>

          {presetFormMode !== null ? (
            /* ── IN-MODAL CREATE / EDIT PRESET FORM VIEW ── */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 no-scrollbar">
                {/* Preset Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                    Preset Name
                  </label>
                  <input
                    ref={presetNameInputRef}
                    value={presetFormData.name}
                    onChange={(e) => setPresetFormData({ ...presetFormData, name: e.target.value })}
                    placeholder="e.g., Fast Paradiddle Drill"
                    className={`w-full px-3.5 py-2.5 text-xs ${
                      isAmoled
                        ? 'bg-[#0a0a0c] focus:bg-black border-white/15 text-zinc-100'
                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/60 focus:bg-white dark:focus:bg-zinc-900 border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100'
                    } border rounded-xl font-medium placeholder:text-slate-400 transition focus:outline-none focus:border-[#007aff]`}
                    type="text"
                  />
                </div>

                {/* BPM Stepper & Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                      Tempo
                    </label>
                    <span className="font-mono font-black text-sm text-[#007aff]">
                      {presetFormData.bpm} BPM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPresetFormData({
                          ...presetFormData,
                          bpm: Math.max(40, presetFormData.bpm - 5),
                        })
                      }
                      className={`w-9 h-9 rounded-xl ${
                        isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                      } font-bold text-xs flex items-center justify-center border cursor-pointer`}
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPresetFormData({
                          ...presetFormData,
                          bpm: Math.max(40, presetFormData.bpm - 1),
                        })
                      }
                      className={`w-9 h-9 rounded-xl ${
                        isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                      } font-bold text-xs flex items-center justify-center border cursor-pointer`}
                    >
                      -1
                    </button>
                    <input
                      type="range"
                      min={40}
                      max={280}
                      value={presetFormData.bpm}
                      onChange={(e) =>
                        setPresetFormData({ ...presetFormData, bpm: Number(e.target.value) })
                      }
                      className="metronome-range flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPresetFormData({
                          ...presetFormData,
                          bpm: Math.min(280, presetFormData.bpm + 1),
                        })
                      }
                      className={`w-9 h-9 rounded-xl ${
                        isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                      } font-bold text-xs flex items-center justify-center border cursor-pointer`}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPresetFormData({
                          ...presetFormData,
                          bpm: Math.min(280, presetFormData.bpm + 5),
                        })
                      }
                      className={`w-9 h-9 rounded-xl ${
                        isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700'
                      } font-bold text-xs flex items-center justify-center border cursor-pointer`}
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Time Signature Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                    Time Signature
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        '2/4',
                        '3/4',
                        '4/4',
                        '5/4',
                        '6/8',
                        '7/8',
                        '9/8',
                        '12/8',
                      ] as MetronomeTimeSignature[]
                    ).map((sig) => (
                      <button
                        key={sig}
                        type="button"
                        onClick={() => setPresetFormData({ ...presetFormData, timeSignature: sig })}
                        className={`py-2 rounded-xl text-xs font-manrope font-bold border transition cursor-pointer ${
                          presetFormData.timeSignature === sig
                            ? isAmoled
                              ? 'bg-[#007aff]/20 border-[#007aff] text-[#007aff]'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-[#007aff] text-[#007aff]'
                            : isAmoled
                              ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/10'
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {sig}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subdivision Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                    Subdivision
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['1/4', '1/8', '1/16', '1/32', '3let', '6let'] as MetronomeSubdivision[]).map(
                      (sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setPresetFormData({ ...presetFormData, subdivision: sub })}
                          className={`py-2 rounded-xl text-xs font-manrope font-bold border transition cursor-pointer ${
                            presetFormData.subdivision === sub
                              ? isAmoled
                                ? 'bg-[#007aff]/20 border-[#007aff] text-[#007aff]'
                                : 'bg-blue-50 dark:bg-blue-950/40 border-[#007aff] text-[#007aff]'
                              : isAmoled
                                ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/10'
                                : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {sub}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Accent Beat */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                      Accent
                    </label>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      {presetFormData.accentBeat === -1
                        ? 'None'
                        : `Beat ${presetFormData.accentBeat + 1}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetFormData({ ...presetFormData, accentBeat: -1 })}
                      className={`py-2 px-3 rounded-xl text-xs font-manrope font-bold border transition cursor-pointer ${
                        presetFormData.accentBeat === -1
                          ? isAmoled
                            ? 'bg-[#007aff]/20 border-[#007aff] text-[#007aff]'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-[#007aff] text-[#007aff]'
                          : isAmoled
                            ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/10'
                            : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      None
                    </button>
                    {Array.from({
                      length: getBeatsPerMeasure(presetFormData.timeSignature),
                    }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPresetFormData({ ...presetFormData, accentBeat: idx })}
                        className={`py-2 px-3 rounded-xl text-xs font-manrope font-bold border transition cursor-pointer ${
                          presetFormData.accentBeat === idx
                            ? isAmoled
                              ? 'bg-[#007aff]/20 border-[#007aff] text-[#007aff]'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-[#007aff] text-[#007aff]'
                            : isAmoled
                              ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/10'
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        Beat {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Click Sound Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                    Click Sound
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        'woodblock',
                        'click',
                        'sidestick',
                        'drystick',
                        'studioclick',
                        'rimclick',
                        'digital',
                      ] as MetronomeSoundId[]
                    ).map((snd) => (
                      <button
                        key={snd}
                        type="button"
                        onClick={() => setPresetFormData({ ...presetFormData, sound: snd })}
                        className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition cursor-pointer truncate ${
                          presetFormData.sound === snd
                            ? isAmoled
                              ? 'bg-[#007aff]/20 border-[#007aff] text-[#007aff] font-bold'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-[#007aff] text-[#007aff] font-bold'
                            : isAmoled
                              ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/10'
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {SOUND_LABELS[snd]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count-In Toggle */}
                <div
                  className={`p-3 rounded-2xl ${
                    isAmoled
                      ? 'bg-[#0a0a0c] border-white/10'
                      : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800'
                  } border flex items-center justify-between`}
                >
                  <div>
                    <div className="text-xs font-bold font-manrope text-slate-900 dark:text-zinc-100">
                      Count-In (1 Bar)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Play lead-in beat sequence before starting
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={presetFormData.countInEnabled}
                    onClick={() =>
                      setPresetFormData({
                        ...presetFormData,
                        countInEnabled: !presetFormData.countInEnabled,
                      })
                    }
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-0.5 ${
                      presetFormData.countInEnabled
                        ? 'bg-[#007aff]'
                        : isAmoled
                          ? 'bg-zinc-800'
                          : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                        presetFormData.countInEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div
                className={`px-5 py-3 border-t ${
                  isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800'
                } flex gap-2`}
              >
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className={`flex-1 py-3 rounded-2xl ${
                    isAmoled
                      ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-300 border border-white/10'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  } font-manrope font-bold text-xs tracking-tight transition cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="flex-1 py-3 rounded-2xl bg-[#007aff] hover:bg-blue-600 text-white font-manrope font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
                >
                  {presetFormMode === 'create' ? 'Save Preset' : 'Update Preset'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search / Filter bar */}
              <div className="px-5 pt-3 pb-1">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 pointer-events-none">
                    search
                  </span>
                  <input
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search presets..."
                    className={`w-full pl-9 pr-3 py-2 text-xs ${
                      isAmoled
                        ? 'bg-[#0a0a0c] focus:bg-black border-white/15 text-zinc-100'
                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/60 focus:bg-white dark:focus:bg-zinc-900 border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100'
                    } border rounded-xl placeholder:text-slate-400 transition focus:outline-none focus:border-[#007aff]`}
                    type="text"
                  />
                </div>
              </div>

              {/* Presets List */}
              <div
                onClick={() => {
                  if (activePresetMenuId !== null) setActivePresetMenuId(null);
                  if (deletingPresetId !== null) setDeletingPresetId(null);
                }}
                className="flex-1 overflow-y-auto px-5 py-2.5 flex flex-col gap-4 no-scrollbar pb-8"
              >
                {/* SAVED USER PRESETS SECTION */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                      MY PRESETS ({filteredUserPresets.length})
                    </span>
                  </div>

                  {filteredUserPresets.length === 0 ? (
                    <div
                      className={`py-8 px-4 rounded-2xl ${
                        isAmoled
                          ? 'bg-[#0a0a0c] border-white/15'
                          : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800'
                      } border border-dashed text-center flex flex-col items-center justify-center gap-3`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl ${
                          isAmoled
                            ? 'bg-[#007aff]/15 text-[#007aff]'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff]'
                        } flex items-center justify-center`}
                      >
                        <span className="material-symbols-outlined text-[28px]">
                          bookmark_border
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 max-w-xs">
                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-manrope">
                          You haven&apos;t created any presets yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500">
                          Create your first preset to quickly recall your favorite metronome
                          settings.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenCreateForm}
                        className="mt-1 px-4 py-2.5 rounded-xl bg-[#007aff] hover:bg-blue-600 text-white font-manrope font-bold text-xs tracking-tight shadow-md flex items-center gap-1.5 cursor-pointer tap-press"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span>Create Preset</span>
                      </button>
                    </div>
                  ) : (
                    filteredUserPresets.map((p) => {
                      const isCurrent = activePresetId === p.id;
                      const isActionActive = activePresetMenuId === p.id;
                      const isConfirmActive = deletingPresetId === p.id;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isActionActive || isConfirmActive) return;
                            loadPreset(p.id);
                            setTimeout(() => setIsPresetsOpen(false), 220);
                          }}
                          className={`relative p-3 rounded-2xl flex items-center transition-colors min-h-[62px] overflow-hidden ${
                            isActionActive || isConfirmActive
                              ? isAmoled
                                ? 'bg-black border border-white/20 shadow-none'
                                : 'bg-slate-50 dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 shadow-xs'
                              : isCurrent
                                ? isAmoled
                                  ? 'bg-black border-2 border-[#007aff] shadow-[0_4px_16px_rgba(0,122,255,0.15)] tap-press cursor-pointer'
                                  : 'bg-white dark:bg-zinc-900 border-2 border-[#007aff] shadow-[0_4px_16px_rgba(0,122,255,0.08)] tap-press cursor-pointer'
                                : isAmoled
                                  ? 'bg-black border border-white/15 shadow-none hover:border-white/25 tap-press cursor-pointer'
                                  : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 tap-press cursor-pointer'
                          }`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {isConfirmActive ? (
                              /* ── State 3: Inline Delete Confirmation ── */
                              <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.18, ease: [0.22, 1.0, 0.36, 1.0] }}
                                className="w-full flex items-center justify-between gap-2 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-rose-500 flex-shrink-0">
                                    Delete?
                                  </span>
                                  <span className="text-xs font-bold font-manrope truncate text-slate-800 dark:text-zinc-200">
                                    &ldquo;{p.name}&rdquo;
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    aria-label="Cancel deletion"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingPresetId(null);
                                      setActivePresetMenuId(null);
                                    }}
                                    className={`h-8 px-3 rounded-xl text-xs font-bold font-manrope flex items-center justify-center transition cursor-pointer ${
                                      isAmoled
                                        ? 'bg-white/10 hover:bg-white/15 text-zinc-300 border border-white/10'
                                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Confirm delete ${p.name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePreset(p.id);
                                      setDeletingPresetId(null);
                                      setActivePresetMenuId(null);
                                    }}
                                    className="h-8 px-3 rounded-xl text-xs font-bold font-manrope bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer active:scale-95 transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            ) : isActionActive ? (
                              /* ── State 2: Inline Action Toolbar (enters from right) ── */
                              <motion.div
                                key="actions"
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 24 }}
                                transition={{ duration: 0.2, ease: [0.22, 1.0, 0.36, 1.0] }}
                                className="w-full flex items-center justify-between gap-2 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                                  <button
                                    type="button"
                                    aria-label="Close actions"
                                    title="Close"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePresetMenuId(null);
                                      setDeletingPresetId(null);
                                    }}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition cursor-pointer ${
                                      isAmoled
                                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                                        : 'text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700'
                                    }`}
                                  >
                                    <AnimatedIcon name="close" size={15} />
                                  </button>
                                  <span className="text-xs font-bold font-manrope truncate text-slate-700 dark:text-zinc-300">
                                    {p.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {/* 1. Edit (pencil icon) */}
                                  <button
                                    type="button"
                                    aria-label={`Edit ${p.name}`}
                                    title="Edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditForm(p);
                                      setActivePresetMenuId(null);
                                      setDeletingPresetId(null);
                                    }}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                                      isAmoled
                                        ? 'bg-[#0a0a0c] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10'
                                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 shadow-2xs'
                                    }`}
                                  >
                                    <AnimatedIcon name="pencil" size={16} />
                                  </button>

                                  {/* 2. Duplicate (two overlapping documents icon) */}
                                  <button
                                    type="button"
                                    aria-label={`Duplicate ${p.name}`}
                                    title="Duplicate"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicatePreset(p.id);
                                      setActivePresetMenuId(null);
                                      setDeletingPresetId(null);
                                    }}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                                      isAmoled
                                        ? 'bg-[#0a0a0c] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10'
                                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 shadow-2xs'
                                    }`}
                                  >
                                    <AnimatedIcon name="copy" size={16} />
                                  </button>

                                  {/* 3. Delete (trash icon at far right) */}
                                  <button
                                    type="button"
                                    aria-label={`Delete ${p.name}`}
                                    title="Delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingPresetId(p.id);
                                    }}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                                      isAmoled
                                        ? 'bg-[#0a0a0c] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/30'
                                        : 'bg-white dark:bg-zinc-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30 shadow-2xs'
                                    }`}
                                  >
                                    <AnimatedIcon name="trash" size={16} />
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              /* ── State 1: Normal Preset Row ── */
                              <motion.div
                                key="normal"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.18, ease: [0.22, 1.0, 0.36, 1.0] }}
                                className="w-full flex items-center justify-between gap-2 min-w-0"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-manrope font-extrabold text-sm border flex-shrink-0 ${
                                      isCurrent
                                        ? isAmoled
                                          ? 'bg-[#007aff]/15 text-[#007aff] border-[#007aff]/30'
                                          : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff] border-blue-100 dark:border-blue-900'
                                        : isAmoled
                                          ? 'bg-[#0a0a0c] text-zinc-400 border-white/10'
                                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[20px]">
                                      {p.icon || 'bookmark'}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <h3 className="text-xs font-extrabold font-manrope text-slate-900 dark:text-zinc-100 leading-tight truncate">
                                        {p.name}
                                      </h3>
                                      {isCurrent && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded flex-shrink-0 ${
                                            isAmoled
                                              ? 'bg-[#007aff]/20 text-[#007aff]'
                                              : 'bg-blue-100 dark:bg-blue-900/60 text-[#007aff]'
                                          } text-[9px] font-extrabold uppercase tracking-wide`}
                                        >
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                      <span className="font-bold text-slate-700 dark:text-zinc-200 flex-shrink-0">
                                        {p.timeSignature}
                                      </span>
                                      <span>•</span>
                                      <span className="flex-shrink-0">{p.subdivision} Note</span>
                                      <span>•</span>
                                      <span className="truncate">{SOUND_LABELS[p.sound]}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span
                                    className={`px-2 py-1 rounded-lg font-manrope text-xs ${
                                      isCurrent
                                        ? isAmoled
                                          ? 'bg-[#007aff]/20 text-[#007aff] font-extrabold'
                                          : 'bg-blue-50 dark:bg-blue-950/40 text-[#007aff] font-extrabold'
                                        : isAmoled
                                          ? 'bg-[#0a0a0c] text-zinc-300 font-bold border border-white/10'
                                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold'
                                    }`}
                                  >
                                    {p.bpm} <span className="text-[9px]">BPM</span>
                                  </span>
                                  <button
                                    aria-label="Preset options"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePresetMenuId(p.id);
                                      setDeletingPresetId(null);
                                    }}
                                    className={`w-7 h-7 rounded-full ${
                                      isAmoled
                                        ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                                        : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                                    } flex items-center justify-center transition cursor-pointer`}
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      more_vert
                                    </span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Centered Modern Modals for Extended Meters & Subdivisions */}
      <TimeSignatureModal
        isOpen={showTimeSigModal}
        value={timeSignature}
        isAmoled={isAmoled}
        onSelect={(sig) => setTimeSignature(sig)}
        onClose={() => setShowTimeSigModal(false)}
      />

      <SubdivisionModal
        isOpen={showSubdivisionModal}
        value={subdivision}
        isAmoled={isAmoled}
        onSelect={(sub) => setSubdivision(sub)}
        onClose={() => setShowSubdivisionModal(false)}
      />

      {/* Centered Modern Modal for Incremental Tempo Progression */}
      <TempoRampModal
        isOpen={showTempoRampModal}
        config={tempoRamp}
        currentBpm={bpm}
        isAmoled={isAmoled}
        onSave={(cfg) => setTempoRamp(cfg)}
        onClose={() => setShowTempoRampModal(false)}
      />

      {/* Centered Modern Modal for Customizable Count-In & Voice */}
      <CountInModal
        isOpen={showCountInModal}
        countInBars={countInBars}
        countInVoiceEnabled={countInVoiceEnabled}
        isAmoled={isAmoled}
        onSelectBars={(bars) => setCountInBars(bars)}
        onToggleVoice={(enabled) => setCountInVoice(enabled)}
        onPreviewVoice={() => metronomeAudioEngine.playVoicePreview(1)}
        onClose={() => setShowCountInModal(false)}
      />

      {/* Synchronized Visual Count-In Countdown Overlay */}
      {isPlaying && isCountIn && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100">
          <div
            className={`flex flex-col items-center justify-center px-10 py-8 rounded-3xl ${
              isAmoled
                ? 'bg-black/95 border-white/15'
                : 'bg-white/95 dark:bg-zinc-900/95 border-slate-200/80 dark:border-zinc-800'
            } shadow-2xl border animate-in zoom-in-95 duration-100 min-w-[200px]`}
          >
            <span className="text-[11px] font-extrabold tracking-widest text-[#007aff] uppercase font-manrope mb-1">
              {`BAR ${countInBar ?? 1} OF ${countInTotalBars ?? 1}`}
            </span>
            <span
              key={`${countInBar}-${countInNumber}`}
              className="text-8xl sm:text-9xl font-black font-manrope text-slate-900 dark:text-white tabular-nums animate-in zoom-in-75 duration-75 leading-none"
            >
              {countInNumber ?? (activeBeat >= 0 ? activeBeat + 1 : 1)}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-2 font-manrope">
              {countInVoiceEnabled ? 'Voice Count-In' : 'Count-In'} • Beat {countInNumber ?? 1} of{' '}
              {getBeatsPerMeasure(timeSignature)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetronomePanel;
