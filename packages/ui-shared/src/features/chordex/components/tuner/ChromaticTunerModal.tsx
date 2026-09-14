import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sliders, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TunerAudioEngine,
  getDefaultTuningForMode,
  getTuningById,
  type InstrumentTuningMode,
  type TunerLifecycleState,
  type InstrumentStringTarget,
  type InstrumentTuningDefinition,
} from '@workspace/studio-core';
import { TuningSelectorModal } from './TuningSelectorModal';
import { getInstrumentGeometry } from './instrumentPegGeometry';

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
  isLight = false,
  isAmoled = false,
}) => {
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
        const tuningId = parsed.tuningId || 'guitar-standard';
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
          needleRef.current.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
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
          centsPillRef.current.style.backgroundColor = '#141518';
          centsPillRef.current.style.color = '#d4d4d8';
          centsPillRef.current.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
      }
    },
    []
  );

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
    engine.preloadReferenceAudio(instrumentMode);
    engine.start().catch((err) => {
      console.warn('[ChromaticTunerModal] Engine start error:', err);
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

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

  const bgColor = '#000000';

  return (
    <div
      className="flex flex-col w-full h-full p-3.5 sm:p-4 select-none overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: bgColor,
        color: '#ffffff',
      }}
      data-testid="chromatic-tuner-modal"
    >
      <div className="max-w-[440px] mx-auto w-full flex flex-col gap-2.5 flex-1">
        {/* 1. Header: Title "Tuner" on left + Circular Close Button on right */}
        <div className="flex items-center justify-between px-0.5 pt-0.5">
          <span className="text-base sm:text-lg font-bold text-white tracking-wide">Tuner</span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-[#141518] text-zinc-400 hover:text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
            aria-label="Close Tuner"
          >
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        {/* 2. Full-Width Segmented Instrument Selector */}
        <div className="flex items-center p-1 rounded-full border border-white/10 bg-[#141518] w-full">
          {(
            [
              { id: 'electric', label: 'Electric' },
              { id: 'acoustic', label: 'Acoustic' },
              { id: 'bass-4', label: 'Bass 4' },
            ] as const
          ).map((item) => {
            const isSelected = instrumentMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeChange(item.id)}
                className={`flex-1 py-1.5 px-1 rounded-full text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                  isSelected
                    ? 'bg-[#23262d] text-white shadow-sm font-bold border border-white/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 3. Secondary Controls: Tuning Selector Pill + A4 Pill + Auto Pill */}
        <div className="flex items-center gap-2 w-full">
          {/* Left: Tuning Selector Trigger */}
          <button
            type="button"
            onClick={() => setShowTuningSelector(true)}
            className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-full border border-white/10 bg-[#141518] transition-all cursor-pointer active:scale-98 min-w-0"
            title="Open tuning selection"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sliders className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs font-bold text-white truncate tracking-wide leading-tight">
                  {activeTuning.name}
                </span>
                <span className="text-[9px] font-mono text-cyan-400/90 leading-tight">
                  {activeTuning.strings.map((s) => s.note).join(' ')}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 ml-1" />
          </button>

          {/* Right: Reference Pitch Pill */}
          <button
            type="button"
            onClick={handleCycleRefA4}
            className="flex items-center justify-center px-3 py-2 rounded-full border border-white/10 bg-[#141518] text-xs font-mono font-medium text-white transition-all cursor-pointer active:scale-95 flex-shrink-0 hover:border-white/20"
            title="Cycle Reference A4 pitch (440, 442, 432 Hz)"
          >
            A4 = {refA4} Hz
          </button>

          {/* Right: Auto Switch Pill */}
          <button
            type="button"
            onClick={handleToggleAuto}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-[#141518] text-xs font-medium text-white transition-all cursor-pointer active:scale-95 flex-shrink-0 hover:border-white/20"
            title="Toggle Auto string detection"
          >
            <span className="text-white font-medium">Auto</span>
            <div className="w-7 h-4 rounded-full p-0.5 transition-colors flex items-center bg-[#2a2b30]">
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
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-red-500/10 border-red-500/20 text-center">
            <span className="material-symbols-rounded text-2xl text-red-400 mb-1">mic_off</span>
            <h4 className="text-xs font-semibold text-red-300">Microphone Access Denied</h4>
            <p className="text-[11px] text-red-200/80 mb-2 max-w-xs">
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

        {/* 4. Compact Chromatic Tuning Indicator (FLAT ♭, 11-Bars, SHARP ♯, Cents Pill) */}
        <div className="relative flex flex-col items-center pt-2 pb-1 w-full max-w-[340px] mx-auto select-none">
          {/* Top Label Row: FLAT ♭ and SHARP ♯ */}
          <div className="w-full flex items-center justify-between px-1">
            <div className="text-[#38bdf8] font-black text-xs sm:text-sm tracking-wider flex items-center gap-1">
              <span>FLAT</span>
              <span className="text-base font-normal">♭</span>
            </div>

            <div className="text-[#f97316] font-black text-xs sm:text-sm tracking-wider flex items-center gap-1">
              <span>SHARP</span>
              <span className="text-base font-normal">♯</span>
            </div>
          </div>

          {/* 11-Bar Chromatic Meter Container */}
          <div className="relative w-full mx-auto pt-2.5 pb-1">
            {/* Center Emerald Hourglass Glow Beam */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div
                className="w-28 h-12 rounded-full blur-md opacity-70"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.15) 55%, transparent 80%)',
                }}
              />
              <svg
                className="absolute h-9 w-24 opacity-60"
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#22c55e" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 0 L 85 0 C 70 25 70 25 85 50 L 15 50 C 30 25 30 25 15 0 Z"
                  fill="url(#beamGrad)"
                  filter="blur(1.5px)"
                />
              </svg>
            </div>

            {/* The 11 Vertical Indicator Bars */}
            <div className="relative flex items-end justify-between px-2 h-9 z-10">
              {SCALE_BARS.map((bar) => {
                const heightClass = bar.isCenter ? 'h-8' : 'h-[22px]';
                const shadow = bar.isCenter
                  ? '0 0 10px rgba(34, 197, 94, 0.9)'
                  : undefined;

                return (
                  <div
                    key={bar.step}
                    className={`w-[3.5px] rounded-full transition-all ${heightClass}`}
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
                className="absolute top-0 bottom-1 w-[3px] rounded-full pointer-events-none transition-transform duration-75 ease-out z-20"
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
            <div className="relative flex items-center justify-between px-1 mt-1 z-10 text-[10px] font-mono text-zinc-500 font-semibold">
              {SCALE_BARS.map((bar) => (
                <span
                  key={bar.step}
                  className={`w-[3.5px] text-center flex items-center justify-center ${
                    bar.isCenter ? 'text-zinc-400 font-bold' : ''
                  }`}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </div>

          {/* Deviation Cents Pill Directly Below 0 (e.g. 0) */}
          <div
            ref={centsPillRef}
            className="mt-1 px-3.5 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center justify-center transition-colors min-w-[38px] border border-white/10 bg-[#141518] text-zinc-300 shadow-sm"
          >
            <span ref={centsTextRef}>0</span>
          </div>
        </div>

        {/* 5. Lower Section: Photorealistic Headstock Graphic with Physical Peg-Aligned String Cards */}
        <div
          className="relative w-full flex-1 min-h-[440px] sm:min-h-[480px] overflow-hidden rounded-2xl select-none my-1"
          style={{ backgroundColor: '#000000' }}
        >
          {/* Canonical Headstock Graphic (Scaled to Full Container Height) */}
          <div
            className={`absolute top-0 bottom-0 pointer-events-none flex items-center ${
              geometry.headstockPosition === 'right'
                ? instrumentMode === 'electric'
                  ? 'right-[-12px] sm:right-2 w-[58%] sm:w-[54%] justify-end'
                  : 'right-[-8px] sm:right-4 w-[58%] sm:w-[54%] justify-end'
                : 'inset-x-0 justify-center'
            }`}
          >
            <img
              src={geometry.assetSrc}
              alt={`${instrumentMode} headstock`}
              className="h-full w-auto object-contain object-top drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)] filter brightness-105 contrast-105 select-none"
              loading="eager"
            />
          </div>

          {/* Peg-Aligned Dynamic String Cards */}
          {currentStrings.map((str) => {
            const peg = geometry.pegs.find((p) => p.stringNumber === str.stringNumber);
            if (!peg) return null;

            const isLeft = peg.side === 'left';
            const isSingleSided = geometry.headstockPosition === 'right';
            const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
            const isDetected = isAuto && activeString?.fullName === str.fullName;
            const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';

            const cardWidthClass = isSingleSided
              ? 'w-[140px] xs:w-[146px] sm:w-[152px]'
              : 'w-[108px] xs:w-[112px] sm:w-[120px]';

            return (
              <div
                key={`${activeTuning.id}-${str.stringNumber}-${str.fullName}`}
                onClick={() => handleStringCardClick(str)}
                style={{
                  position: 'absolute',
                  top: `${peg.topPct}%`,
                  transform: 'translateY(-50%)',
                  left: isLeft ? '8px' : undefined,
                  right: !isLeft ? '8px' : undefined,
                }}
                className={`${cardWidthClass} h-9 sm:h-10 flex items-center justify-between px-2.5 rounded-full border transition-all cursor-pointer active:scale-95 z-10 select-none ${
                  isInTune
                    ? 'border-emerald-500/90 bg-[#0d2218] shadow-[0_0_14px_rgba(34,197,94,0.35)]'
                    : isManualLocked
                      ? 'border-cyan-500/80 bg-cyan-950/40 ring-1 ring-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : isDetected
                        ? 'border-blue-500/60 bg-blue-950/30 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                        : 'border-white/10 bg-[#141518] hover:border-white/20'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`String ${str.stringNumber}: ${str.fullName}, ${str.frequency.toFixed(1)} Hz`}
              >
                {/* Circular Number Badge */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isInTune
                      ? 'bg-[#122b1e] text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#1e2026] text-zinc-300 border border-white/10'
                  }`}
                >
                  {str.stringNumber}
                </div>

                {/* Note Name & Frequency */}
                <div className="flex flex-col items-center px-1 flex-1 min-w-0">
                  <span
                    className={`text-xs sm:text-sm font-bold leading-tight tracking-tight transition-colors ${
                      isInTune ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {str.fullName}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono leading-tight mt-0.5 transition-colors ${
                      isInTune ? 'text-emerald-300/80' : 'text-zinc-400'
                    }`}
                  >
                    {str.frequency.toFixed(1)} Hz
                  </span>
                </div>

                {/* Directional Chevron > */}
                <ChevronRight
                  className={`w-3.5 h-3.5 stroke-[2.5] flex-shrink-0 transition-colors ${
                    isInTune ? 'text-emerald-400' : 'text-zinc-600'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Dedicated Tuning Selection Modal */}
      <TuningSelectorModal
        isOpen={showTuningSelector}
        activeMode={instrumentMode}
        activeTuningId={activeTuning.id}
        onSelectTuning={handleTuningSelect}
        onClose={() => setShowTuningSelector(false)}
        onModeChange={handleModeChange}
      />
    </div>
  );
};
