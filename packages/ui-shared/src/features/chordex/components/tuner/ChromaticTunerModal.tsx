import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TunerAudioEngine,
  STANDARD_GUITAR_STRINGS,
  STANDARD_BASS_4_STRINGS,
  STANDARD_BASS_5_STRINGS,
  getTargetStringsForMode,
  type InstrumentTuningMode,
  type TunerLifecycleState,
  type InstrumentStringTarget,
} from '@workspace/studio-core';
import { TuningForkIcon } from './TuningForkIcon';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';

interface ChromaticTunerModalProps {
  onClose: () => void;
  accent?: { from: string; to: string; ring?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

const REFERENCE_PITCH_OPTIONS = [440, 442, 432] as const;

export const ChromaticTunerModal: React.FC<ChromaticTunerModalProps> = ({
  onClose,
  accent = { from: '#2563EB', to: '#3B82F6', ring: '#60A5FA' },
  isLight = false,
  isAmoled = false,
}) => {
  const reducedMotion = useAppReducedMotion();

  // Mode and DSP tuning state
  const [instrumentMode, setInstrumentMode] = useState<InstrumentTuningMode>('electric');
  const [lifecycleState, setLifecycleState] = useState<TunerLifecycleState>('initial');
  const [isAuto, setIsAuto] = useState<boolean>(true);
  const [manualTarget, setManualTarget] = useState<InstrumentStringTarget | null>(null);
  const [refA4, setRefA4] = useState<number>(440);
  const [noiseFilter, setNoiseFilter] = useState<boolean>(true);

  // Note display state (updated on note change or status change)
  const [activeNoteName, setActiveNoteName] = useState<string>('-');
  const [activeOctave, setActiveOctave] = useState<number | null>(null);
  const [targetFreq, setTargetFreq] = useState<number>(0);
  const [activeString, setActiveString] = useState<InstrumentStringTarget | null>(null);
  const [tuningStatus, setTuningStatus] = useState<string>('silent');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct DOM references for 60/120 FPS needle and meter updates
  const engineRef = useRef<TunerAudioEngine | null>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const centsTextRef = useRef<HTMLSpanElement>(null);
  const hzTextRef = useRef<HTMLSpanElement>(null);
  const statusBadgeRef = useRef<HTMLSpanElement>(null);
  const guidanceTextRef = useRef<HTMLSpanElement>(null);

  // Smooth visual needle interpolation
  const currentCentsRef = useRef<number>(0);
  const targetCentsRef = useRef<number>(0);
  const lastActiveNoteRef = useRef<string>('-');
  const lastStatusRef = useRef<string>('silent');

  // String targets for current mode
  const currentStrings = useMemo(() => {
    return getTargetStringsForMode(instrumentMode);
  }, [instrumentMode]);

  // Split string targets for flanking layout (Left: lower strings, Right: higher strings)
  const { leftStrings, rightStrings } = useMemo(() => {
    const half = Math.ceil(currentStrings.length / 2);
    return {
      leftStrings: currentStrings.slice(0, half),
      rightStrings: currentStrings.slice(half),
    };
  }, [currentStrings]);

  // Headstock image asset
  const headstockImgSrc = useMemo(() => {
    if (instrumentMode === 'acoustic') {
      return '/instruments/headstock-acoustic.webp';
    }
    if (instrumentMode === 'bass-4' || instrumentMode === 'bass-5') {
      return '/instruments/headstock-bass.webp';
    }
    return '/instruments/headstock-stratocaster.webp';
  }, [instrumentMode]);

  // Fast direct DOM update to bypass React reconciliation at audio frame rates
  const updateNeedleDom = useCallback(
    (cents: number, freq: number, status: string, nearestStr: InstrumentStringTarget | null) => {
      // Clamp cents to [-50, +50] for meter bounds
      const clamped = Math.max(-50, Math.min(50, cents));
      // Map -50..+50 cents to -44%..+44% of container half-width
      const percent = (clamped / 50) * 44;

      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(${percent * 4.2}px)`;

        if (status === 'in_tune') {
          needleRef.current.style.backgroundColor = '#10B981';
          needleRef.current.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.9), 0 0 28px rgba(16, 185, 129, 0.5)';
        } else if (status === 'flat') {
          needleRef.current.style.backgroundColor = '#3B82F6';
          needleRef.current.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.6)';
        } else if (status === 'sharp') {
          needleRef.current.style.backgroundColor = '#F59E0B';
          needleRef.current.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.6)';
        } else {
          needleRef.current.style.backgroundColor = isLight ? '#9CA3AF' : '#4B5563';
          needleRef.current.style.boxShadow = 'none';
        }
      }

      if (centsTextRef.current) {
        if (status === 'in_tune') {
          centsTextRef.current.textContent = '0.0';
          centsTextRef.current.style.color = '#10B981';
        } else if (status === 'silent' || status === 'weak') {
          centsTextRef.current.textContent = '--';
          centsTextRef.current.style.color = isLight ? '#9CA3AF' : '#6B7280';
        } else {
          const sign = cents > 0 ? '+' : '';
          centsTextRef.current.textContent = `${sign}${cents.toFixed(1)}`;
          centsTextRef.current.style.color = cents < 0 ? '#3B82F6' : '#F59E0B';
        }
      }

      if (hzTextRef.current) {
        if (freq > 0 && (status === 'in_tune' || status === 'flat' || status === 'sharp')) {
          hzTextRef.current.textContent = `${freq.toFixed(1)} Hz`;
        } else {
          hzTextRef.current.textContent = '-- Hz';
        }
      }

      if (statusBadgeRef.current) {
        if (status === 'in_tune') {
          statusBadgeRef.current.textContent = 'IN TUNE';
          statusBadgeRef.current.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
          statusBadgeRef.current.style.color = '#10B981';
          statusBadgeRef.current.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else if (status === 'flat') {
          statusBadgeRef.current.textContent = 'TUNE UP';
          statusBadgeRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
          statusBadgeRef.current.style.color = '#3B82F6';
          statusBadgeRef.current.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        } else if (status === 'sharp') {
          statusBadgeRef.current.textContent = 'TUNE DOWN';
          statusBadgeRef.current.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
          statusBadgeRef.current.style.color = '#F59E0B';
          statusBadgeRef.current.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        } else if (status === 'weak') {
          statusBadgeRef.current.textContent = 'LISTENING...';
          statusBadgeRef.current.style.backgroundColor = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
          statusBadgeRef.current.style.color = isLight ? '#6B7280' : '#9CA3AF';
          statusBadgeRef.current.style.borderColor = isLight ? '#E5E7EB' : '#374151';
        } else {
          statusBadgeRef.current.textContent = 'PLUCK STRING';
          statusBadgeRef.current.style.backgroundColor = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
          statusBadgeRef.current.style.color = isLight ? '#9CA3AF' : '#6B7280';
          statusBadgeRef.current.style.borderColor = isLight ? '#E5E7EB' : '#374151';
        }
      }

      if (guidanceTextRef.current) {
        if (status === 'in_tune') {
          guidanceTextRef.current.textContent = nearestStr
            ? `String ${nearestStr.stringNumber} (${nearestStr.fullName}) is in tune!`
            : 'String is in tune!';
        } else if (status === 'flat') {
          guidanceTextRef.current.textContent = nearestStr
            ? `Too flat — tighten String ${nearestStr.stringNumber} (${nearestStr.fullName})`
            : 'Too flat — tune up (tighten string)';
        } else if (status === 'sharp') {
          guidanceTextRef.current.textContent = nearestStr
            ? `Too sharp — loosen String ${nearestStr.stringNumber} (${nearestStr.fullName})`
            : 'Too sharp — tune down (loosen string)';
        } else if (status === 'weak') {
          guidanceTextRef.current.textContent = 'Signal low — pluck a bit firmer';
        } else {
          guidanceTextRef.current.textContent = 'Pluck an open string near your microphone';
        }
      }
    },
    [isLight]
  );

  // Audio Engine Lifecycle
  useEffect(() => {
    const engine = new TunerAudioEngine({
      instrumentMode,
      referenceA4: refA4,
      inTuneToleranceCents: 3.5,
      exitTuneToleranceCents: 4.5,
      noiseFilter,
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
        // Smooth interpolation filter
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
          setTargetFreq(metrics.targetFrequency);
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
  }, []); // Run once on mount

  // Handle instrument mode switch
  const handleModeChange = (newMode: InstrumentTuningMode) => {
    setInstrumentMode(newMode);
    setManualTarget(null);
    setIsAuto(true);
    engineRef.current?.setMode(newMode);
    engineRef.current?.setManualTargetString(null);
  };

  // Handle string target click (toggle manual lock / auto)
  const handleStringClick = (target: InstrumentStringTarget) => {
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
      setTargetFreq(target.frequency);
      engineRef.current?.setManualTargetString(target);
    }
  };

  // Toggle AUTO mode button
  const handleToggleAuto = () => {
    if (isAuto) {
      // If currently auto and we have an active string, lock onto it
      if (activeString) {
        setIsAuto(false);
        setManualTarget(activeString);
        engineRef.current?.setManualTargetString(activeString);
      }
    } else {
      // Return to full AUTO detection
      setIsAuto(true);
      setManualTarget(null);
      engineRef.current?.setManualTargetString(null);
    }
  };

  // Toggle Reference Pitch A4 (440 -> 442 -> 432 -> 440)
  const handleCycleRefA4 = () => {
    const currentIndex = REFERENCE_PITCH_OPTIONS.indexOf(refA4 as any);
    const nextIndex = (currentIndex + 1) % REFERENCE_PITCH_OPTIONS.length;
    const nextPitch = REFERENCE_PITCH_OPTIONS[nextIndex];
    setRefA4(nextPitch);
    engineRef.current?.setReferenceA4(nextPitch);
  };

  // Toggle Noise Filter
  const handleToggleNoiseFilter = () => {
    const next = !noiseFilter;
    setNoiseFilter(next);
    engineRef.current?.setNoiseFilter(next);
  };

  // Theme styling constants
  const bgColor = isAmoled
    ? '#000000'
    : isLight
      ? '#ffffff'
      : 'var(--surface-card-bg, #0f131a)';

  const cardBg = isAmoled
    ? '#09090b'
    : isLight
      ? '#f9fafb'
      : 'rgba(255, 255, 255, 0.035)';

  const borderColor = isAmoled
    ? '#1f1f23'
    : isLight
      ? '#e5e7eb'
      : 'rgba(255, 255, 255, 0.08)';

  const textColor = isLight ? '#111827' : '#F9FAFB';
  const textMuted = isLight ? '#6B7280' : '#9CA3AF';

  // Note color computed based on current tuning status
  const noteColor = useMemo(() => {
    if (tuningStatus === 'in_tune') return '#10B981';
    if (tuningStatus === 'flat') return '#3B82F6';
    if (tuningStatus === 'sharp') return '#F59E0B';
    if (activeNoteName !== '-') return textColor;
    return isLight ? '#D1D5DB' : '#374151';
  }, [tuningStatus, activeNoteName, textColor, isLight]);

  // Tick marks for pitch meter: 21 marks across -50 to +50 cents (every 5 cents)
  const TICKS = useMemo(
    () => [-50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    []
  );

  return (
    <div
      className="flex flex-col w-full h-full p-3.5 sm:p-5 select-none overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      data-testid="chromatic-tuner-modal"
    >
      {/* 1. Header: Tuner Identity & Close */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(16, 185, 129, 0.2))',
              color: '#3B82F6',
              border: `1px solid ${borderColor}`,
            }}
          >
            <TuningForkIcon size={18} waves={tuningStatus !== 'silent'} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight leading-none">
                Chordex Tuner
              </h2>
              <span
                className="text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono"
                style={{
                  backgroundColor: isLight ? '#E0E7FF' : 'rgba(59, 130, 246, 0.2)',
                  color: '#3B82F6',
                }}
              >
                PRO
              </span>
            </div>
            <p className="text-[11px] font-medium leading-none mt-1" style={{ color: textMuted }}>
              High-Precision Chromatic Pitch Engine
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full border transition-transform active:scale-95 cursor-pointer"
          style={{
            borderColor,
            backgroundColor: isLight ? '#f9fafb' : 'rgba(255, 255, 255, 0.06)',
            color: textMuted,
          }}
          aria-label="Close Tuner"
        >
          <span className="material-symbols-rounded text-[18px]">close</span>
        </button>
      </div>

      {/* 2. Mode Tabs & Tool Controls Bar */}
      <div className="flex items-center justify-between gap-2 mt-3 mb-2 flex-wrap">
        {/* Instrument Selector Pill */}
        <div
          className="flex items-center p-0.5 rounded-full border"
          style={{
            backgroundColor: cardBg,
            borderColor,
          }}
        >
          <button
            type="button"
            onClick={() => handleModeChange('electric')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'electric'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Electric
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('acoustic')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'acoustic'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Acoustic
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('bass-4')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'bass-4'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Bass 4
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('bass-5')}
            className={`px-2 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'bass-5'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Bass 5
          </button>
        </div>

        {/* Quick DSP Tool Toggles: A4 Ref & Noise Filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Reference A4 Button */}
          <button
            type="button"
            onClick={handleCycleRefA4}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95"
            style={{
              backgroundColor: cardBg,
              borderColor,
              color: refA4 === 440 ? textMuted : '#3B82F6',
            }}
            title="Cycle Reference A4 pitch (440, 442, 432 Hz)"
          >
            <span>A4={refA4}</span>
          </button>

          {/* Noise Filter Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNoiseFilter}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${
              noiseFilter
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'border-gray-700 text-gray-500'
            }`}
            style={{
              borderColor: noiseFilter ? undefined : borderColor,
              backgroundColor: noiseFilter ? undefined : cardBg,
            }}
            title="Toggle environmental noise rejection filter"
          >
            <span className="material-symbols-rounded text-[14px]">
              {noiseFilter ? 'filter_alt' : 'filter_alt_off'}
            </span>
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Permission Denied Alert */}
      {lifecycleState === 'permission_denied' && (
        <div className="flex flex-col items-center justify-center p-4 my-2 rounded-2xl border bg-red-500/10 border-red-500/20 text-center">
          <span className="material-symbols-rounded text-[28px] text-red-400 mb-1">mic_off</span>
          <h4 className="text-xs font-semibold text-red-300">Microphone Access Denied</h4>
          <p className="text-[11px] text-red-200/80 mb-2 max-w-xs">
            {errorMessage || 'Grant microphone permission to enable chromatic audio pitch detection.'}
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

      {/* 3. Hero Readout: 3 Columns (Frequency | Huge Note & Status | Deviation Cents) */}
      <div
        className="flex items-center justify-between p-3.5 rounded-2xl border my-2"
        style={{
          backgroundColor: cardBg,
          borderColor,
        }}
      >
        {/* Left: Frequency */}
        <div className="flex flex-col items-start justify-center flex-1 pl-1">
          <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">Frequency</span>
          <span
            ref={hzTextRef}
            className="text-lg sm:text-xl font-mono font-bold tracking-tight mt-0.5"
          >
            -- Hz
          </span>
          <span className="text-[10px] font-mono opacity-50 mt-0.5">
            {targetFreq > 0 ? `Target: ${targetFreq.toFixed(1)}` : 'No target'}
          </span>
        </div>

        {/* Center: Hero Note + Octave + Status Badge */}
        <div className="flex flex-col items-center justify-center flex-1 px-2">
          <div className="relative flex items-baseline justify-center">
            <span
              className="text-5xl sm:text-6xl font-black tracking-tight transition-colors duration-150"
              style={{ color: noteColor }}
            >
              {activeNoteName}
            </span>
            {activeOctave !== null && (
              <span
                className="text-lg sm:text-xl font-bold ml-1 opacity-80"
                style={{ color: noteColor }}
              >
                {activeOctave}
              </span>
            )}
          </div>
          <div className="mt-1">
            <span
              ref={statusBadgeRef}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border"
              style={{
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                borderColor,
                color: textMuted,
              }}
            >
              PLUCK STRING
            </span>
          </div>
        </div>

        {/* Right: Cents Deviation */}
        <div className="flex flex-col items-end justify-center flex-1 pr-1">
          <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">Deviation</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              ref={centsTextRef}
              className="text-lg sm:text-xl font-mono font-bold tracking-tight"
              style={{ color: textMuted }}
            >
              --
            </span>
            <span className="text-[10px] font-semibold text-gray-500">cents</span>
          </div>
          <span className="text-[10px] font-mono opacity-50 mt-0.5">
            ±3.5¢ sweet spot
          </span>
        </div>
      </div>

      {/* 4. Precision Pitch Meter (-50 to +50 Cents with 21 Hash Marks & Moving Needle) */}
      <div className="flex flex-col items-center my-3 px-2 w-full max-w-md mx-auto">
        <div className="relative w-full h-12 flex flex-col items-center justify-center">
          {/* Top Flat (♭) and Sharp (♯) Guide Labels */}
          <div className="w-full flex items-center justify-between text-xs font-black px-4 mb-1">
            <span className="text-blue-400 flex items-center gap-0.5">
              <span>♭</span>
              <span className="text-[10px] opacity-75">FLAT</span>
            </span>
            <span className="text-[10px] font-bold font-mono text-emerald-400">
              0¢
            </span>
            <span className="text-amber-400 flex items-center gap-0.5">
              <span className="text-[10px] opacity-75">SHARP</span>
              <span>♯</span>
            </span>
          </div>

          {/* Meter Track with Hash Marks */}
          <div
            className="relative w-full h-8 rounded-xl border flex items-center justify-center px-4 overflow-hidden"
            style={{
              backgroundColor: cardBg,
              borderColor,
            }}
          >
            {/* Sweet Spot In-Tune Green Box (Center ±3.5 Cents) */}
            <div
              className="absolute h-full w-8 rounded-sm bg-emerald-500/15 border-x border-emerald-500/30"
              style={{ zIndex: 1 }}
            />

            {/* Hash Marks Scale */}
            <div className="relative w-full flex items-center justify-between px-2 h-full z-2">
              {TICKS.map((tick) => {
                const isCenter = tick === 0;
                const isQuarter = tick === -25 || tick === 25;
                const isDecade = tick % 10 === 0;

                let height = 6;
                let opacity = 0.3;
                let markColor = isLight ? '#9CA3AF' : '#6B7280';

                if (isCenter) {
                  height = 18;
                  opacity = 1.0;
                  markColor = '#10B981';
                } else if (isQuarter) {
                  height = 12;
                  opacity = 0.7;
                  markColor = tick < 0 ? '#3B82F6' : '#F59E0B';
                } else if (isDecade) {
                  height = 10;
                  opacity = 0.5;
                }

                return (
                  <div
                    key={tick}
                    className="w-0.5 rounded-full"
                    style={{
                      height,
                      backgroundColor: markColor,
                      opacity,
                    }}
                  />
                );
              })}
            </div>

            {/* High-Performance Moving Needle (Transformed directly via DOM Ref) */}
            <div
              ref={needleRef}
              className="absolute w-1.5 h-6 rounded-full transition-transform duration-75 ease-out"
              style={{
                zIndex: 10,
                backgroundColor: isLight ? '#9CA3AF' : '#6B7280',
                transform: 'translateX(0px)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Instrument Headstock flanked by Interactive String Target Pills */}
      <div
        className="relative flex items-center justify-between p-3 rounded-2xl border my-2 overflow-hidden"
        style={{
          backgroundColor: isAmoled ? '#000000' : cardBg,
          borderColor,
          minHeight: 180,
        }}
      >
        {/* Left String Target Pills (Lower pitch strings: e.g. 6, 5, 4) */}
        <div className="flex flex-col gap-2 z-10">
          {leftStrings.map((str) => {
            const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
            const isDetected = isAuto && activeString?.fullName === str.fullName;
            const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';

            return (
              <button
                key={str.fullName}
                type="button"
                onClick={() => handleStringClick(str)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                  isInTune
                    ? 'border-emerald-500 bg-emerald-500/20 shadow-sm shadow-emerald-500/20'
                    : isManualLocked
                      ? 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/40'
                      : isDetected
                        ? 'border-blue-400/80 bg-blue-500/10'
                        : ''
                }`}
                style={{
                  borderColor: isInTune || isManualLocked || isDetected ? undefined : borderColor,
                  backgroundColor:
                    isInTune || isManualLocked || isDetected
                      ? undefined
                      : isLight
                        ? '#ffffff'
                        : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: isInTune
                      ? '#10B981'
                      : isManualLocked
                        ? '#2563EB'
                        : isLight
                          ? '#E5E7EB'
                          : '#27272A',
                    color: isInTune || isManualLocked ? '#ffffff' : textMuted,
                  }}
                >
                  {str.stringNumber}
                </div>
                <div>
                  <div
                    className={`text-xs font-extrabold leading-none ${
                      isInTune
                        ? 'text-emerald-400'
                        : isManualLocked || isDetected
                          ? 'text-blue-400'
                          : textColor
                    }`}
                  >
                    {str.fullName}
                  </div>
                  <div className="text-[9px] font-mono opacity-50 leading-none mt-0.5">
                    {Math.round(str.frequency)} Hz
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Centered Instrument Headstock Graphic */}
        <div className="relative flex-1 flex items-center justify-center h-44 px-2 pointer-events-none">
          <img
            src={headstockImgSrc}
            alt={`${instrumentMode} headstock`}
            className="max-h-40 max-w-[130px] sm:max-w-[150px] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] filter brightness-95 contrast-105"
            loading="eager"
          />
        </div>

        {/* Right String Target Pills (Higher pitch strings: e.g. 3, 2, 1) */}
        <div className="flex flex-col gap-2 z-10">
          {rightStrings.map((str) => {
            const isManualLocked = !isAuto && manualTarget?.fullName === str.fullName;
            const isDetected = isAuto && activeString?.fullName === str.fullName;
            const isInTune = (isManualLocked || isDetected) && tuningStatus === 'in_tune';

            return (
              <button
                key={str.fullName}
                type="button"
                onClick={() => handleStringClick(str)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-right justify-end transition-all cursor-pointer active:scale-95 ${
                  isInTune
                    ? 'border-emerald-500 bg-emerald-500/20 shadow-sm shadow-emerald-500/20'
                    : isManualLocked
                      ? 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/40'
                      : isDetected
                        ? 'border-blue-400/80 bg-blue-500/10'
                        : ''
                }`}
                style={{
                  borderColor: isInTune || isManualLocked || isDetected ? undefined : borderColor,
                  backgroundColor:
                    isInTune || isManualLocked || isDetected
                      ? undefined
                      : isLight
                        ? '#ffffff'
                        : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <div>
                  <div
                    className={`text-xs font-extrabold leading-none ${
                      isInTune
                        ? 'text-emerald-400'
                        : isManualLocked || isDetected
                          ? 'text-blue-400'
                          : textColor
                    }`}
                  >
                    {str.fullName}
                  </div>
                  <div className="text-[9px] font-mono opacity-50 leading-none mt-0.5">
                    {Math.round(str.frequency)} Hz
                  </div>
                </div>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: isInTune
                      ? '#10B981'
                      : isManualLocked
                        ? '#2563EB'
                        : isLight
                          ? '#E5E7EB'
                          : '#27272A',
                    color: isInTune || isManualLocked ? '#ffffff' : textMuted,
                  }}
                >
                  {str.stringNumber}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Mode Controls & Lock State: AUTO Toggle Switch & Status */}
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAuto}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isAuto
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-600 text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-rounded text-[15px]">
              {isAuto ? 'autorenew' : 'lock'}
            </span>
            <span>{isAuto ? 'AUTO' : 'MANUAL LOCK'}</span>
          </button>
          {!isAuto && manualTarget && (
            <span className="text-[11px] font-mono text-blue-400">
              Locked to {manualTarget.fullName}
            </span>
          )}
        </div>

        <span className="text-[10px] font-medium opacity-60">
          Tap any string to target
        </span>
      </div>

      {/* 7. Bottom Dynamic Guidance Bar */}
      <div
        className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-center mt-2 transition-colors"
        style={{
          backgroundColor:
            tuningStatus === 'in_tune'
              ? 'rgba(16, 185, 129, 0.12)'
              : tuningStatus === 'flat'
                ? 'rgba(59, 130, 246, 0.12)'
                : tuningStatus === 'sharp'
                  ? 'rgba(245, 158, 11, 0.12)'
                  : cardBg,
          borderColor:
            tuningStatus === 'in_tune'
              ? 'rgba(16, 185, 129, 0.3)'
              : tuningStatus === 'flat'
                ? 'rgba(59, 130, 246, 0.3)'
                : tuningStatus === 'sharp'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : borderColor,
          color:
            tuningStatus === 'in_tune'
              ? '#10B981'
              : tuningStatus === 'flat'
                ? '#3B82F6'
                : tuningStatus === 'sharp'
                  ? '#F59E0B'
                  : textMuted,
        }}
      >
        <span className="material-symbols-rounded text-[16px]">
          {tuningStatus === 'in_tune'
            ? 'check_circle'
            : tuningStatus === 'flat'
              ? 'arrow_upward'
              : tuningStatus === 'sharp'
                ? 'arrow_downward'
                : 'mic'}
        </span>
        <span ref={guidanceTextRef}>Pluck an open string near your microphone</span>
      </div>
    </div>
  );
};
