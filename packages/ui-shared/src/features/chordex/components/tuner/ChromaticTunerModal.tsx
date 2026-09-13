import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TunerAudioEngine,
  getTargetStringsForMode,
  type InstrumentTuningMode,
  type TunerLifecycleState,
  type InstrumentStringTarget,
} from '@workspace/studio-core';

interface ChromaticTunerModalProps {
  onClose: () => void;
  accent?: { from: string; to: string; ring?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

const REFERENCE_PITCH_OPTIONS = [440, 442, 432] as const;

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

// Speaker icon component with sound waves
const SpeakerIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = 'text-blue-500',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.23L6.5 6H3c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h3.5l5 4c.67.54 1.5.06 1.5-.8V2.8c0-.86-.83-1.34-1.5-.8zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
);

export const ChromaticTunerModal: React.FC<ChromaticTunerModalProps> = ({
  onClose,
  isLight = false,
  isAmoled = false,
}) => {
  // Instrument mode & tuner configuration state
  const [instrumentMode, setInstrumentMode] = useState<InstrumentTuningMode>('electric');
  const [lifecycleState, setLifecycleState] = useState<TunerLifecycleState>('initial');
  const [isAuto, setIsAuto] = useState<boolean>(true);
  const [manualTarget, setManualTarget] = useState<InstrumentStringTarget | null>(null);
  const [refA4, setRefA4] = useState<number>(440);

  // Note display state (updated on note change or status change)
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

  // String targets for current mode
  const currentStrings = useMemo(() => {
    return getTargetStringsForMode(instrumentMode);
  }, [instrumentMode]);

  // Split string targets: Left = lower strings (e.g. 6, 5, 4), Right = higher strings (e.g. 3, 2, 1)
  const { leftStrings, rightStrings } = useMemo(() => {
    const half = Math.ceil(currentStrings.length / 2);
    return {
      leftStrings: currentStrings.slice(0, half),
      rightStrings: currentStrings.slice(half),
    };
  }, [currentStrings]);

  // Headstock image asset matching instrument mode
  const headstockImgSrc = useMemo(() => {
    if (instrumentMode === 'acoustic') {
      return '/instruments/headstock-acoustic.webp';
    }
    if (instrumentMode === 'bass-4' || instrumentMode === 'bass-5') {
      return '/instruments/headstock-bass.webp';
    }
    return '/instruments/headstock-stratocaster.webp';
  }, [instrumentMode]);

  // Direct high-performance DOM update to bypass React reconciliation at audio frame rates
  const updateNeedleDom = useCallback(
    (cents: number, _freq: number, status: string, _nearestStr: InstrumentStringTarget | null) => {
      // Scale range is -50 to +50 cents. Clamping to bounds.
      const clamped = Math.max(-50, Math.min(50, cents));
      // Max travel offset in px from center: in standard mobile scale width (~280px-300px), 115px reaches bar -5/+5
      const maxTravelPx = 115;
      const offsetPx = (clamped / 50) * maxTravelPx;

      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(calc(-50% + ${offsetPx.toFixed(1)}px))`;

        if (status === 'in_tune') {
          needleRef.current.style.backgroundColor = '#22c55e';
          needleRef.current.style.boxShadow = '0 0 12px rgba(34, 197, 94, 0.9), 0 0 20px rgba(34, 197, 94, 0.4)';
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
          needleRef.current.style.opacity = '0.4';
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
          centsPillRef.current.style.backgroundColor = '#4ade80';
          centsPillRef.current.style.color = '#052e16';
        } else if (status === 'flat') {
          centsPillRef.current.style.backgroundColor = '#2563eb';
          centsPillRef.current.style.color = '#ffffff';
        } else if (status === 'sharp') {
          centsPillRef.current.style.backgroundColor = '#ea580c';
          centsPillRef.current.style.color = '#ffffff';
        } else {
          centsPillRef.current.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
          centsPillRef.current.style.color = '#9ca3af';
        }
      }
    },
    []
  );

  // Audio Engine Lifecycle
  useEffect(() => {
    const engine = new TunerAudioEngine({
      instrumentMode,
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
    setManualTarget(null);
    setIsAuto(true);
    engineRef.current?.setMode(newMode);
    engineRef.current?.setManualTargetString(null);
  };

  // Handle string card click (toggle manual lock / auto detection)
  const handleStringCardClick = (target: InstrumentStringTarget) => {
    if (!isAuto && manualTarget?.fullName === target.fullName) {
      // Toggle back to AUTO
      setIsAuto(true);
      setManualTarget(null);
      engineRef.current?.setManualTargetString(null);
    } else {
      // Lock target to this string
      setIsAuto(false);
      setManualTarget(target);
      setActiveString(target);
      engineRef.current?.setManualTargetString(target);
    }
  };

  // Toggle AUTO switch
  const handleToggleAuto = () => {
    if (isAuto) {
      // If currently auto, lock onto active string or first string
      const lockTarget = activeString || currentStrings[0];
      setIsAuto(false);
      setManualTarget(lockTarget);
      engineRef.current?.setManualTargetString(lockTarget);
    } else {
      // Return to full AUTO detection
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

  // Play reference pitch tone for string
  const handlePlayTone = (e: React.MouseEvent, frequency: number) => {
    e.stopPropagation();
    engineRef.current?.playReferenceTone(frequency);
  };

  // Theme colors matching reference dark UI
  const bgColor = isAmoled ? '#000000' : '#07080a';
  const cardBg = '#101218';
  const borderColor = 'rgba(255, 255, 255, 0.08)';

  return (
    <div
      className="flex flex-col w-full h-full p-4 sm:p-5 select-none overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: bgColor,
        color: '#ffffff',
      }}
      data-testid="chromatic-tuner-modal"
    >
      <div className="max-w-[440px] mx-auto w-full flex flex-col gap-3.5">
        {/* 1. Header: Segmented Instrument Selector Pill & Circular Close Button */}
        <div className="flex items-center justify-between gap-3">
          {/* Instrument Selector Pill */}
          <div
            className="flex items-center p-1 rounded-full border"
            style={{
              backgroundColor: '#12141a',
              borderColor,
            }}
          >
            {(
              [
                { id: 'electric', label: 'Electric' },
                { id: 'acoustic', label: 'Acoustic' },
                { id: 'bass-4', label: 'Bass 4' },
                { id: 'bass-5', label: 'Bass 5' },
              ] as const
            ).map((item) => {
              const isSelected = instrumentMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id)}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Circular Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full border transition-all active:scale-95 cursor-pointer text-zinc-400 hover:text-white"
            style={{
              backgroundColor: '#181a20',
              borderColor,
            }}
            aria-label="Close Tuner"
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>

        {/* 2. Sub-Row Controls: A4 Reference Pitch Pill | Auto Switch */}
        <div className="flex items-center justify-center gap-3 py-0.5">
          {/* A4 Reference Pitch Pill */}
          <button
            type="button"
            onClick={handleCycleRefA4}
            className="px-3.5 py-1 rounded-full border text-xs text-zinc-300 font-medium transition-all hover:text-white cursor-pointer active:scale-95"
            style={{
              backgroundColor: '#12141a',
              borderColor,
            }}
            title="Cycle Reference A4 pitch (440, 442, 432 Hz)"
          >
            A4 = {refA4} Hz
          </button>

          {/* Vertical Divider */}
          <div className="w-[1px] h-4 bg-white/10" />

          {/* Auto Toggle Switch */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleToggleAuto}
          >
            <span className="text-xs text-zinc-300 font-medium">Auto</span>
            <div
              className={`w-11 h-6 rounded-full p-0.5 transition-colors border flex items-center ${
                isAuto ? 'bg-[#1b1e26] border-white/20' : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
                  isAuto
                    ? 'translate-x-5 bg-[#8e95a5]'
                    : 'translate-x-0 bg-zinc-500'
                }`}
              />
            </div>
          </div>
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

        {/* 3. Main Chromatic Tuning Indicator Card */}
        <div
          className="relative flex flex-col items-center p-4 sm:p-5 rounded-[24px] border overflow-hidden"
          style={{
            backgroundColor: cardBg,
            borderColor,
          }}
        >
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
          <div className="relative w-full max-w-[320px] mx-auto pt-3 pb-1">
            {/* Center Emerald Hourglass Glow Beam */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              {/* Radial background blur */}
              <div
                className="w-28 h-12 rounded-full blur-md opacity-70"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.15) 55%, transparent 80%)',
                }}
              />
              {/* Hourglass beam polygon */}
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

          {/* Detected Note Name (Large Bold Centered) */}
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2.5 mb-1.5">
            {activeNoteName !== '-'
              ? `${activeNoteName}${activeOctave !== null ? activeOctave : ''}`
              : '-'}
          </div>

          {/* Deviation Cents Pill (e.g. 0 Green Pill) */}
          <div
            ref={centsPillRef}
            className="px-3.5 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center justify-center transition-colors min-w-[36px]"
            style={{
              backgroundColor: tuningStatus === 'in_tune' ? '#4ade80' : 'rgba(255, 255, 255, 0.08)',
              color: tuningStatus === 'in_tune' ? '#052e16' : '#9ca3af',
            }}
          >
            <span ref={centsTextRef}>0</span>
          </div>
        </div>

        {/* 4. Lower Section: Instrument Headstock Graphic flanked by String Cards */}
        <div className="relative flex items-center justify-between gap-1 sm:gap-2 mt-1 px-0.5">
          {/* Left Column: Lower Strings (Strings 6, 5, 4 for 6-string guitar) */}
          <div className="flex flex-col gap-2.5 z-10 w-[118px] sm:w-[130px] flex-shrink-0">
            {leftStrings.map((str) => {
              const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
              const isDetected = isAuto && activeString?.fullName === str.fullName;
              const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';

              return (
                <div
                  key={str.fullName}
                  onClick={() => handleStringCardClick(str)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                    isInTune
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                      : isManualLocked
                        ? 'border-blue-500/80 bg-blue-500/15 ring-1 ring-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                        : isDetected
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/[0.06] bg-[#101218] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Circular Number Badge */}
                  <div className="w-7 h-7 rounded-full bg-[#1c1f28] text-white font-bold text-xs flex items-center justify-center border border-white/[0.08] flex-shrink-0">
                    {str.stringNumber}
                  </div>

                  {/* Note Name & Frequency */}
                  <div className="flex flex-col items-start px-1.5 flex-1 min-w-0">
                    <span className="text-sm font-extrabold text-white leading-tight">
                      {str.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-[#8a919e] leading-tight mt-0.5">
                      {str.frequency.toFixed(1)} Hz
                    </span>
                  </div>

                  {/* Reference Pitch Speaker Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayTone(e, str.frequency)}
                    className="p-1 text-blue-500 hover:text-blue-400 active:scale-90 transition-transform cursor-pointer flex-shrink-0"
                    title={`Play ${str.fullName} reference pitch`}
                    aria-label={`Play ${str.fullName} reference tone`}
                  >
                    <SpeakerIcon size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Center Column: Photorealistic Headstock Graphic */}
          <div className="relative flex-1 flex items-center justify-center h-48 sm:h-52 overflow-visible pointer-events-none">
            <img
              src={headstockImgSrc}
              alt={`${instrumentMode} headstock`}
              className="max-h-48 sm:max-h-52 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] filter brightness-100 contrast-105 select-none"
              loading="eager"
            />
          </div>

          {/* Right Column: Higher Strings (Strings 3, 2, 1 for 6-string guitar - Mirrored layout) */}
          <div className="flex flex-col gap-2.5 z-10 w-[118px] sm:w-[130px] flex-shrink-0">
            {rightStrings.map((str) => {
              const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
              const isDetected = isAuto && activeString?.fullName === str.fullName;
              const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';

              return (
                <div
                  key={str.fullName}
                  onClick={() => handleStringCardClick(str)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                    isInTune
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                      : isManualLocked
                        ? 'border-blue-500/80 bg-blue-500/15 ring-1 ring-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                        : isDetected
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/[0.06] bg-[#101218] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Reference Pitch Speaker Button (Mirrored on left of right card) */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayTone(e, str.frequency)}
                    className="p-1 text-blue-500 hover:text-blue-400 active:scale-90 transition-transform cursor-pointer flex-shrink-0"
                    title={`Play ${str.fullName} reference pitch`}
                    aria-label={`Play ${str.fullName} reference tone`}
                  >
                    <SpeakerIcon size={18} />
                  </button>

                  {/* Note Name & Frequency (Mirrored on right) */}
                  <div className="flex flex-col items-end px-1.5 flex-1 min-w-0">
                    <span className="text-sm font-extrabold text-white leading-tight">
                      {str.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-[#8a919e] leading-tight mt-0.5">
                      {str.frequency.toFixed(1)} Hz
                    </span>
                  </div>

                  {/* Circular Number Badge */}
                  <div className="w-7 h-7 rounded-full bg-[#1c1f28] text-white font-bold text-xs flex items-center justify-center border border-white/[0.08] flex-shrink-0">
                    {str.stringNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
