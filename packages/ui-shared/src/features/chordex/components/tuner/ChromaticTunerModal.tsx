import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sliders, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TunerAudioEngine,
  getDefaultTuningForMode,
  getTuningById,
  useSettingsStore,
  getEffectiveThemeState,
  resolveAccent,
  type InstrumentTuningMode,
  type TunerLifecycleState,
  type InstrumentStringTarget,
  type InstrumentTuningDefinition,
} from '@workspace/studio-core';
import { TuningSelectorModal } from './TuningSelectorModal';
import { getInstrumentGeometry } from './instrumentPegGeometry';
import { useTunerArtwork } from './tunerArtworkHelper';

interface ChromaticTunerModalProps {
  onClose: () => void;
  onSwitchToFinder?: () => void;
  accent?: { from: string; to: string; ring?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

const REFERENCE_PITCH_OPTIONS = [440, 442, 432] as const;

const STORAGE_KEY = 'chordex_tuner_settings';

// 11-step chromatic tuning scale (-5 to +5) matching reference visual design
const SCALE_BARS = [
  { step: -5, label: '-5', color: '#ef4444', isCenter: false },
  { step: -4, label: '-4', color: '#ef4444', isCenter: false },
  { step: -3, label: '-3', color: '#f97316', isCenter: false },
  { step: -2, label: '-2', color: '#facc15', isCenter: false },
  { step: -1, label: '-1', color: '#4ade80', isCenter: false },
  { step: 0,  label: '0',  color: '#22c55e', isCenter: true },
  { step: 1,  label: '+1', color: '#4ade80', isCenter: false },
  { step: 2,  label: '+2', color: '#facc15', isCenter: false },
  { step: 3,  label: '+3', color: '#f97316', isCenter: false },
  { step: 4,  label: '+4', color: '#ef4444', isCenter: false },
  { step: 5,  label: '+5', color: '#ef4444', isCenter: false },
] as const;

export const ChromaticTunerModal: React.FC<ChromaticTunerModalProps> = ({
  onClose,
  onSwitchToFinder,
  accent: propAccent,
  isLight: propIsLight,
  isAmoled: propIsAmoled,
}) => {
  const settings = useSettingsStore((s) => s.settings);
  const themeState = getEffectiveThemeState(settings, 'chordex');
  const isLight = propIsLight ?? (themeState === 'light');
  const isAmoled = propIsAmoled ?? (themeState === 'amoled');
  const effectiveAccent = useMemo(
    () => propAccent || resolveAccent(settings?.accentColor),
    [propAccent, settings?.accentColor]
  );

  const isLightRef = useRef(isLight);
  isLightRef.current = isLight;
  const isAmoledRef = useRef(isAmoled);
  isAmoledRef.current = isAmoled;

  // Load persisted settings if available
  const initialSettings = useMemo(() => {
    if (typeof window === 'undefined') {
      return { mode: 'electric' as InstrumentTuningMode, tuningId: 'guitar-standard', refA4: 440 };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawMode = parsed.mode || 'electric';
        const mode = (rawMode === 'bass-5' ? 'bass-4' : rawMode) as InstrumentTuningMode;
        let tuningId = parsed.tuningId || 'guitar-standard';
        if (typeof tuningId === 'string' && tuningId.startsWith('bass5-')) {
          tuningId = 'bass4-standard';
        }
        const refA4 = parsed.refA4 || 440;
        return { mode, tuningId, refA4 };
      }
    } catch {}
    return { mode: 'electric' as InstrumentTuningMode, tuningId: 'guitar-standard', refA4: 440 };
  }, []);

  // Instrument mode & active tuning state
  const [instrumentMode, setInstrumentMode] = useState<InstrumentTuningMode>(initialSettings.mode);
  const [activeTuning, setActiveTuning] = useState<InstrumentTuningDefinition>(() => {
    return (
      getTuningById(initialSettings.tuningId) ||
      getDefaultTuningForMode(initialSettings.mode)
    );
  });

  const [lifecycleState, setLifecycleState] = useState<TunerLifecycleState>('initial');
  const [isAuto, setIsAuto] = useState<boolean>(true);
  const [manualTarget, setManualTarget] = useState<InstrumentStringTarget | null>(null);
  const [refA4, setRefA4] = useState<number>(initialSettings.refA4);
  const [showTuningSelector, setShowTuningSelector] = useState<boolean>(false);
  const [triggerRect, setTriggerRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tuningBtnRef = useRef<HTMLButtonElement>(null);

  // Note display state
  const [activeNoteName, setActiveNoteName] = useState<string>('-');
  const [activeOctave, setActiveOctave] = useState<number | null>(null);
  const [activeString, setActiveString] = useState<InstrumentStringTarget | null>(null);
  const [tuningStatus, setTuningStatus] = useState<string>('silent');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct DOM references for 60/120 FPS high-performance audio rate rendering
  const engineRef = useRef<TunerAudioEngine | null>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const centsPillRef = useRef<HTMLDivElement>(null);
  const centsTextRef = useRef<HTMLSpanElement>(null);

  // Target cents for smooth needle interpolation
  const currentCentsRef = useRef<number>(0);
  const targetCentsRef = useRef<number>(0);
  const lastActiveNoteRef = useRef<string>('-');
  const lastStatusRef = useRef<string>('silent');

  // Dynamic string targets derived from active tuning
  const currentStrings = useMemo(() => {
    return activeTuning.strings;
  }, [activeTuning]);

  // Instrument geometry definition (physical peg coordinates, headstock placement, and canonical asset)
  const geometry = useMemo(() => getInstrumentGeometry(instrumentMode), [instrumentMode]);
  const artworkSrc = useTunerArtwork(geometry.assetSrc, isLight);

  // Direct high-performance DOM update to bypass React reconciliation at audio frame rates
  const updateNeedleDom = useCallback(
    (cents: number, _freq: number, status: string, _nearestStr: InstrumentStringTarget | null) => {
      const clamped = Math.max(-50, Math.min(50, cents));
      const maxTravelPx = 115;
      const offsetPx = (clamped / 50) * maxTravelPx;

      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(calc(-50% + ${offsetPx.toFixed(1)}px))`;

        if (status === 'in_tune') {
          needleRef.current.style.backgroundColor = '#22c55e';
          needleRef.current.style.boxShadow =
            '0 0 14px rgba(34, 197, 94, 0.95), 0 0 24px rgba(34, 197, 94, 0.5)';
          needleRef.current.style.opacity = '1';
        } else if (status === 'flat') {
          needleRef.current.style.backgroundColor = '#38bdf8';
          needleRef.current.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.8)';
          needleRef.current.style.opacity = '1';
        } else if (status === 'sharp') {
          needleRef.current.style.backgroundColor = '#f97316';
          needleRef.current.style.boxShadow = '0 0 10px rgba(249, 115, 22, 0.8)';
          needleRef.current.style.opacity = '1';
        } else {
          needleRef.current.style.backgroundColor = isLightRef.current
            ? 'rgba(0, 0, 0, 0.25)'
            : 'rgba(255, 255, 255, 0.25)';
          needleRef.current.style.boxShadow = 'none';
          needleRef.current.style.opacity = '0.35';
        }
      }

      if (centsTextRef.current) {
        if (status === 'in_tune') {
          centsTextRef.current.textContent = '0';
        } else if (status === 'silent' || status === 'weak') {
          centsTextRef.current.textContent = '0';
        } else {
          const rounded = Math.round(cents);
          centsTextRef.current.textContent = rounded > 0 ? `+${rounded}` : `${rounded}`;
        }
      }

      if (centsPillRef.current) {
        if (status === 'in_tune') {
          centsPillRef.current.style.backgroundColor = '#22c55e';
          centsPillRef.current.style.color = '#022c22';
          centsPillRef.current.style.borderColor = 'rgba(34, 197, 94, 0.8)';
        } else if (status === 'flat') {
          centsPillRef.current.style.backgroundColor = '#0284c7';
          centsPillRef.current.style.color = '#ffffff';
          centsPillRef.current.style.borderColor = 'rgba(56, 189, 248, 0.5)';
        } else if (status === 'sharp') {
          centsPillRef.current.style.backgroundColor = '#ea580c';
          centsPillRef.current.style.color = '#ffffff';
          centsPillRef.current.style.borderColor = 'rgba(249, 115, 22, 0.5)';
        } else {
          centsPillRef.current.style.backgroundColor = 'var(--c-surface-low)';
          centsPillRef.current.style.color = 'var(--c-text-secondary)';
          centsPillRef.current.style.borderColor = 'var(--c-border)';
        }
      }
    },
    []
  );

  // Sync idle needle and pill styles immediately when theme changes while silent
  useEffect(() => {
    if (centsPillRef.current && lastStatusRef.current === 'silent') {
      centsPillRef.current.style.backgroundColor = 'var(--c-surface-low)';
      centsPillRef.current.style.color = 'var(--c-text-secondary)';
      centsPillRef.current.style.borderColor = 'var(--c-border)';
    }
    if (needleRef.current && lastStatusRef.current === 'silent') {
      needleRef.current.style.backgroundColor = isLight
        ? 'rgba(0, 0, 0, 0.25)'
        : 'rgba(255, 255, 255, 0.25)';
    }
  }, [isLight, isAmoled]);

  // Persist settings changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode: instrumentMode,
          tuningId: activeTuning.id,
          refA4,
        })
      );
    } catch {}
  }, [instrumentMode, activeTuning, refA4]);

  // Audio Engine Lifecycle
  useEffect(() => {
    const engine = new TunerAudioEngine({
      instrumentMode,
      activeTuning,
      referenceA4: refA4,
      inTuneToleranceCents: 3.5,
      exitTuneToleranceCents: 4.5,
      noiseFilter: true,
      manualTargetString: manualTarget,
      onStateChange: (newState) => {
        setLifecycleState(newState);
      },
      onFrame: (payload) => {
        if (payload.error) {
          setErrorMessage(payload.error);
        }

        const metrics = payload.metrics;
        if (!metrics) {
          targetCentsRef.current = 0;
          currentCentsRef.current = 0;
          updateNeedleDom(0, 0, 'silent', null);

          if (lastStatusRef.current !== 'silent') {
            lastStatusRef.current = 'silent';
            setTuningStatus('silent');
          }
          return;
        }

        // Direct high-frequency visual update
        targetCentsRef.current = metrics.cents;
        // Smooth exponential moving average filter
        currentCentsRef.current += (metrics.cents - currentCentsRef.current) * 0.42;
        updateNeedleDom(
          currentCentsRef.current,
          metrics.frequency,
          metrics.tuningStatus,
          metrics.nearestString
        );

        // Low-frequency React state sync (only on note change or status transition)
        if (metrics.fullName !== lastActiveNoteRef.current) {
          lastActiveNoteRef.current = metrics.fullName;
          setActiveNoteName(metrics.noteName);
          setActiveOctave(metrics.octave);
          setActiveString(metrics.nearestString);
        }

        if (metrics.tuningStatus !== lastStatusRef.current) {
          lastStatusRef.current = metrics.tuningStatus;
          setTuningStatus(metrics.tuningStatus);
        }
      },
    });

    engineRef.current = engine;
    // Defer heavy sample bank evaluation and audio decoding until after the 350ms opening spring settles
    const preloadTimer = setTimeout(() => {
      engine.preloadReferenceAudio(instrumentMode);
    }, 400);

    engine.start().catch((err) => {
      console.warn('[ChromaticTunerModal] Engine start error:', err);
    });

    return () => {
      clearTimeout(preloadTimer);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Pause audio analysis when tuning selector sub-modal is open to eliminate background CPU load
  useEffect(() => {
    if (showTuningSelector) {
      engineRef.current?.pause();
    } else if (engineRef.current) {
      engineRef.current.resume();
    }
  }, [showTuningSelector]);

  // Handle instrument mode switch
  const handleModeChange = (newMode: InstrumentTuningMode) => {
    setInstrumentMode(newMode);
    const defTuning = getDefaultTuningForMode(newMode);
    setActiveTuning(defTuning);
    setManualTarget(null);
    setIsAuto(true);
    engineRef.current?.setMode(newMode);
    engineRef.current?.setTuning(defTuning);
    engineRef.current?.setManualTargetString(null);
    engineRef.current?.preloadReferenceAudio(newMode);
  };

  // Handle tuning selection from modal
  const handleTuningSelect = (tuning: InstrumentTuningDefinition) => {
    setActiveTuning(tuning);
    if (!tuning.instrumentCompatibility.includes(instrumentMode)) {
      setInstrumentMode(tuning.instrumentCompatibility[0]);
    }
    setManualTarget(null);
    setIsAuto(true);
    engineRef.current?.setTuning(tuning);
    engineRef.current?.setManualTargetString(null);
  };

  // Handle string card click (selects string and immediately plays authentic recorded reference sound)
  const handleStringCardClick = (target: InstrumentStringTarget) => {
    setIsAuto(false);
    setManualTarget(target);
    setActiveString(target);
    engineRef.current?.setManualTargetString(target);
    engineRef.current?.playStringReference(target, instrumentMode);
  };

  // Toggle AUTO switch
  const handleToggleAuto = () => {
    if (isAuto) {
      const lockTarget = activeString || currentStrings[0];
      setIsAuto(false);
      setManualTarget(lockTarget);
      engineRef.current?.setManualTargetString(lockTarget);
    } else {
      setIsAuto(true);
      setManualTarget(null);
      engineRef.current?.setManualTargetString(null);
    }
  };

  // Cycle Reference Pitch A4 (440 -> 442 -> 432 -> 440 Hz)
  const handleCycleRefA4 = () => {
    const currentIndex = REFERENCE_PITCH_OPTIONS.indexOf(refA4 as any);
    const nextIndex = (currentIndex + 1) % REFERENCE_PITCH_OPTIONS.length;
    const nextPitch = REFERENCE_PITCH_OPTIONS[nextIndex];
    setRefA4(nextPitch);
    engineRef.current?.setReferenceA4(nextPitch);
  };

  return (
    <div
      className="flex flex-col w-full h-full px-3 pt-3 pb-0 select-none overflow-hidden"
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--c-text-primary)',
      }}
      data-testid="chromatic-tuner-modal"
    >
      <div className="max-w-[440px] mx-auto w-full flex flex-col gap-2.5 flex-1 h-full min-h-0">
        {/* 1. Header: Integrated Instrument Selector on Left + Close Button on Right */}
        <div className="flex items-center justify-between gap-3 w-full px-0.5 pt-0.5">
          {/* Segmented Instrument Selector */}
          <div
            className="flex items-center p-0.5 rounded-full border w-full max-w-[270px] xs:max-w-[290px] transition-colors"
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
            }}
          >
            {(
              [
                { id: 'electric', label: 'Electric' },
                { id: 'acoustic', label: 'Acoustic' },
                { id: 'bass-4', label: 'Bass' },
              ] as const
            ).map((item) => {
              const isSelected = instrumentMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'var(--c-surface-highest)',
                          color: 'var(--c-text-primary)',
                          borderColor: 'var(--c-border)',
                        }
                      : {
                          color: 'var(--c-text-secondary)',
                        }
                  }
                  className={`flex-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                    isSelected
                      ? 'shadow-sm font-bold border'
                      : 'hover:text-[var(--c-text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Circular Close Button on Upper Right */}
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text-secondary)',
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full border transition-all active:scale-95 cursor-pointer flex-shrink-0 hover:text-[var(--c-text-primary)]"
            aria-label="Close Tuner"
          >
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        {/* 2. Secondary Controls Row: Tuning Selector + A4 Pitch + Auto Switch */}
        <div className="flex items-stretch gap-2 w-full px-0.5">
          {/* Left: Tuning Selector Trigger */}
          <button
            ref={tuningBtnRef}
            type="button"
            onClick={() => {
              if (tuningBtnRef.current) {
                const r = tuningBtnRef.current.getBoundingClientRect();
                setTriggerRect({ top: r.top, left: r.left, width: r.width, height: r.height });
              }
              setShowTuningSelector(true);
            }}
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
            }}
            className="flex-1 h-11 flex items-center justify-between px-3 rounded-2xl border transition-all cursor-pointer active:scale-98 min-w-0"
            title="Open tuning selection"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sliders className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--c-text-secondary)' }} />
              <div className="flex flex-col items-start min-w-0">
                <span
                  className="text-xs font-bold truncate tracking-wide leading-tight"
                  style={{ color: 'var(--c-text-primary)' }}
                >
                  {activeTuning.name}
                </span>
                <span
                  className="text-[10px] font-mono leading-tight tracking-wider"
                  style={{ color: 'var(--c-text-muted)' }}
                >
                  {activeTuning.strings.map((s) => s.note).join(' ')}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 ml-1.5" style={{ color: 'var(--c-text-secondary)' }} />
          </button>

          {/* Middle: Reference Pitch Pill */}
          <button
            type="button"
            onClick={handleCycleRefA4}
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text-primary)',
            }}
            className="h-11 flex items-center justify-center px-3.5 rounded-2xl border text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 flex-shrink-0"
            title="Cycle Reference A4 pitch (440, 442, 432 Hz)"
          >
            A4 = {refA4} Hz
          </button>

          {/* Right: Auto Switch Pill */}
          <button
            type="button"
            onClick={handleToggleAuto}
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
            }}
            className="h-11 flex items-center gap-2 px-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer active:scale-95 flex-shrink-0"
            title="Toggle Auto string detection"
          >
            <span className="font-medium text-xs" style={{ color: 'var(--c-text-primary)' }}>Auto</span>
            <div
              className="w-7 h-4 rounded-full p-0.5 transition-colors flex items-center"
              style={{
                backgroundColor: isAuto ? effectiveAccent.from : 'var(--c-surface-high)',
              }}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  isAuto ? 'translate-x-3 shadow-sm' : 'translate-x-0'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Permission Denied Alert Banner */}
        {lifecycleState === 'permission_denied' && (
          <div
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center ${
              isLight
                ? 'bg-red-50 border-red-200'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <span
              className={`material-symbols-rounded text-2xl mb-1 ${
                isLight ? 'text-red-600' : 'text-red-400'
              }`}
            >
              mic_off
            </span>
            <h4
              className={`text-xs font-semibold ${
                isLight ? 'text-red-900' : 'text-red-300'
              }`}
            >
              Microphone Access Denied
            </h4>
            <p
              className={`text-[11px] mb-2 max-w-xs ${
                isLight ? 'text-red-700' : 'text-red-200/80'
              }`}
            >
              {errorMessage || 'Grant microphone permission to enable chromatic pitch detection.'}
            </p>
            <button
              type="button"
              onClick={() => engineRef.current?.start()}
              className="px-3.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold cursor-pointer shadow"
            >
              Retry Permission
            </button>
          </div>
        )}

        {/* 3. Compact Chromatic Tuning Indicator (FLAT ♭, 11-Bars, SHARP ♯, Cents Pill) */}
        <div className="relative flex flex-col items-center pt-1 pb-0.5 w-full max-w-[340px] mx-auto select-none">
          {/* Top Label Row: FLAT ♭ and SHARP ♯ */}
          <div className="w-full flex items-center justify-between px-1">
            <div
              className={`font-black text-xs sm:text-sm tracking-wider flex items-center gap-1 ${
                isLight ? 'text-sky-600' : 'text-[#38bdf8]'
              }`}
            >
              <span>FLAT</span>
              <span className="text-base font-normal">♭</span>
            </div>

            <div
              className="text-[10px] tracking-widest font-semibold uppercase"
              style={{ color: tuningStatus === 'in_tune' ? '#22c55e' : 'var(--c-text-muted)' }}
            >
              {tuningStatus === 'in_tune' ? 'IN TUNE' : 'LISTENING...'}
            </div>

            <div
              className={`font-black text-xs sm:text-sm tracking-wider flex items-center gap-1 ${
                isLight ? 'text-amber-600' : 'text-[#f97316]'
              }`}
            >
              <span>SHARP</span>
              <span className="text-base font-normal">♯</span>
            </div>
          </div>

          {/* 11-Bar Chromatic Meter Container */}
          <div className="relative w-full mx-auto pt-1.5 pb-1">
            {/* Center Emerald Glow Beam */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div
                className="w-24 h-10 rounded-full blur-md"
                style={{
                  background: isLight
                    ? 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.05) 55%, transparent 80%)'
                    : 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.5) 0%, rgba(34, 197, 94, 0.1) 55%, transparent 80%)',
                  opacity: isLight ? 0.45 : 0.6,
                }}
              />
            </div>

            {/* The 11 Vertical Indicator Bars */}
            <div className="relative flex items-end justify-between px-2 h-7 z-10">
              {SCALE_BARS.map((bar) => {
                const heightClass = bar.isCenter ? 'h-7' : 'h-[18px]';
                const shadow = bar.isCenter
                  ? '0 0 8px rgba(34, 197, 94, 0.8)'
                  : undefined;

                return (
                  <div
                    key={bar.step}
                    className={`w-[3px] rounded-full transition-all ${heightClass}`}
                    style={{
                      backgroundColor: bar.color,
                      boxShadow: shadow,
                    }}
                  />
                );
              })}

              {/* Moving Needle Indicator (Smooth GPU-composited transform) */}
              <div
                ref={needleRef}
                className="absolute top-0 bottom-0.5 w-[3px] rounded-full pointer-events-none transition-transform duration-75 ease-out z-20"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#22c55e',
                  boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
                  opacity: 0.4,
                }}
              />
            </div>

            {/* Numeric Labels Below Bars (-5 to +5) */}
            <div
              className="relative flex items-center justify-between px-1 mt-1 z-10 text-[9px] font-mono font-semibold"
              style={{ color: 'var(--c-text-muted)' }}
            >
              {SCALE_BARS.map((bar) => (
                <span
                  key={bar.step}
                  className={`w-[3px] text-center flex items-center justify-center ${
                    bar.isCenter ? 'font-bold' : ''
                  }`}
                  style={bar.isCenter ? { color: 'var(--c-text-primary)' } : undefined}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </div>

          {/* Deviation Cents Pill Directly Below 0 (e.g. 0) */}
          <div
            ref={centsPillRef}
            style={{
              backgroundColor: 'var(--c-surface-low)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text-secondary)',
            }}
            className="mt-0.5 px-3 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center justify-center transition-colors min-w-[36px] border shadow-sm"
          >
            <span ref={centsTextRef}>0</span>
          </div>
        </div>

        {/* 4. Lower Section: Photorealistic Headstock Graphic with Physical Peg-Aligned String Cards */}
        <div
          className="relative w-full flex-1 min-h-0 overflow-hidden select-none"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Canonical Headstock Graphic (Medium-large scale, right-aligned, breathing room) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={geometry.mode}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className={`absolute top-2 bottom-0 pointer-events-none flex ${
                geometry.headstockPosition === 'right'
                  ? 'right-[-8px] xs:right-0 justify-end'
                  : 'inset-x-0 justify-center'
              }`}
            >
              <img
                src={artworkSrc}
                alt={`${instrumentMode} headstock`}
                className={`w-[358px] max-w-none h-auto object-top filter brightness-105 contrast-105 select-none ${
                  isLight
                    ? 'drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]'
                }`}
                loading="eager"
              />
            </motion.div>
          </AnimatePresence>

          {/* Peg-Aligned Dynamic String Controls (Minimal circular note buttons) */}
          <AnimatePresence>
            {currentStrings.map((str) => {
              const peg = geometry.pegs.find((p) => p.stringNumber === str.stringNumber);
              if (!peg) return null;

              const isLeft = peg.side === 'left';
              const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
              const isDetected = isAuto && activeString?.fullName === str.fullName;
              const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';
              const isCurrentActive = isManualLocked || isDetected;

              return (
                <motion.div
                  key={`${activeTuning.id}-${str.stringNumber}-${str.fullName}`}
                  layout
                  initial={{ opacity: 0, x: isLeft ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLeft ? -10 : 10 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: `${peg.topPct}%`,
                    transform: 'translateY(-50%)',
                    left: isLeft ? '16px' : undefined,
                    right: !isLeft ? '16px' : undefined,
                  }}
                  className="flex items-center gap-2 z-10 select-none"
                >
                  {isLeft ? (
                    <>
                      {/* Secondary String Number on outer side */}
                      <span className="w-3 text-center text-xs font-semibold select-none" style={{ color: 'var(--c-text-muted)' }}>
                        {str.stringNumber}
                      </span>
                      {/* Large Circular Note Control */}
                      <button
                        type="button"
                        onClick={() => handleStringCardClick(str)}
                        style={
                          isInTune
                            ? undefined
                            : isCurrentActive
                              ? {
                                  borderColor: effectiveAccent.from,
                                  backgroundColor: 'var(--c-surface-high)',
                                  color: effectiveAccent.from,
                                  boxShadow: `0 0 12px ${effectiveAccent.from}40`,
                                }
                              : {
                                  backgroundColor: 'var(--c-surface-highest)',
                                  borderColor: 'var(--c-border)',
                                  color: 'var(--c-text-primary)',
                                }
                        }
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg transition-all cursor-pointer active:scale-90 border-2 ${
                          isInTune
                            ? isLight
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-800 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                              : 'border-emerald-500 bg-[#0d2218] text-emerald-400 shadow-[0_0_16px_rgba(34,197,94,0.6)]'
                            : 'shadow-sm'
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-label={`String ${str.stringNumber}: Note ${str.note}`}
                      >
                        {str.note}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Large Circular Note Control */}
                      <button
                        type="button"
                        onClick={() => handleStringCardClick(str)}
                        style={
                          isInTune
                            ? undefined
                            : isCurrentActive
                              ? {
                                  borderColor: effectiveAccent.from,
                                  backgroundColor: 'var(--c-surface-high)',
                                  color: effectiveAccent.from,
                                  boxShadow: `0 0 12px ${effectiveAccent.from}40`,
                                }
                              : {
                                  backgroundColor: 'var(--c-surface-highest)',
                                  borderColor: 'var(--c-border)',
                                  color: 'var(--c-text-primary)',
                                }
                        }
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg transition-all cursor-pointer active:scale-90 border-2 ${
                          isInTune
                            ? isLight
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-800 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                              : 'border-emerald-500 bg-[#0d2218] text-emerald-400 shadow-[0_0_16px_rgba(34,197,94,0.6)]'
                            : 'shadow-sm'
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-label={`String ${str.stringNumber}: Note ${str.note}`}
                      >
                        {str.note}
                      </button>
                      {/* Secondary String Number on outer side */}
                      <span className="w-3 text-center text-xs font-semibold select-none" style={{ color: 'var(--c-text-muted)' }}>
                        {str.stringNumber}
                      </span>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. Dedicated Compact Tuning Selection Modal */}
      <TuningSelectorModal
        isOpen={showTuningSelector}
        activeMode={instrumentMode}
        activeTuningId={activeTuning.id}
        onSelectTuning={handleTuningSelect}
        onClose={() => setShowTuningSelector(false)}
        onModeChange={handleModeChange}
        triggerRect={triggerRect}
        isLight={isLight}
        isAmoled={isAmoled}
        accent={effectiveAccent}
      />
    </div>
  );
};
