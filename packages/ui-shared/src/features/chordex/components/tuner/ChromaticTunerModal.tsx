import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  TunerAudioEngine,
  STANDARD_GUITAR_STRINGS,
  type InstrumentTuningMode,
  type TunerLifecycleState,
  type PitchMetrics,
  type GuitarStringTarget,
} from '@workspace/studio-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';

interface ChromaticTunerModalProps {
  onClose: () => void;
  accent?: { from: string; to: string; ring?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

export const ChromaticTunerModal: React.FC<ChromaticTunerModalProps> = ({
  onClose,
  accent = { from: '#2563EB', to: '#3B82F6', ring: '#60A5FA' },
  isLight = false,
  isAmoled = false,
}) => {
  const reducedMotion = useAppReducedMotion();

  // Low-frequency UI state (only updates on note change, mode change, or lifecycle change)
  const [instrumentMode, setInstrumentMode] = useState<InstrumentTuningMode>('acoustic');
  const [lifecycleState, setLifecycleState] = useState<TunerLifecycleState>('initial');
  const [activeNoteName, setActiveNoteName] = useState<string>('-');
  const [activeOctave, setActiveOctave] = useState<number | null>(null);
  const [targetFreq, setTargetFreq] = useState<number>(0);
  const [activeGuitarString, setActiveGuitarString] = useState<GuitarStringTarget | null>(null);
  const [tuningStatus, setTuningStatus] = useState<string>('silent');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Engine & DOM Refs for 60/120Hz Decoupled Needle Updates
  const engineRef = useRef<TunerAudioEngine | null>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const centsTextRef = useRef<HTMLSpanElement>(null);
  const hzTextRef = useRef<HTMLSpanElement>(null);
  const statusLabelRef = useRef<HTMLSpanElement>(null);

  // Smooth visual needle interpolation
  const currentCentsDisplayRef = useRef<number>(0);
  const targetCentsRef = useRef<number>(0);
  const lastActiveNoteRef = useRef<string>('-');
  const lastStatusRef = useRef<string>('silent');

  // Fast direct DOM update to bypass React reconciliation churn at audio frame rate
  const updateNeedleDom = useCallback((cents: number, freq: number, status: string) => {
    // Clamp cents to [-50, +50] for meter visual bounds
    const clamped = Math.max(-50, Math.min(50, cents));
    // Percentage from -50% (left) to +50% (right), centered at 0%
    const percent = (clamped / 50) * 44; // +/- 44% of half width

    if (needleRef.current) {
      needleRef.current.style.transform = `translateX(${percent}%)`;
      if (status === 'in_tune') {
        needleRef.current.style.backgroundColor = '#10B981';
        needleRef.current.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.7)';
      } else if (status === 'flat') {
        needleRef.current.style.backgroundColor = '#3B82F6';
        needleRef.current.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.4)';
      } else if (status === 'sharp') {
        needleRef.current.style.backgroundColor = '#F59E0B';
        needleRef.current.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.4)';
      } else {
        needleRef.current.style.backgroundColor = isLight ? '#9CA3AF' : '#6B7280';
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

    if (statusLabelRef.current) {
      if (status === 'in_tune') {
        statusLabelRef.current.textContent = 'IN TUNE';
        statusLabelRef.current.style.color = '#10B981';
      } else if (status === 'flat') {
        statusLabelRef.current.textContent = 'TUNE UP';
        statusLabelRef.current.style.color = '#3B82F6';
      } else if (status === 'sharp') {
        statusLabelRef.current.textContent = 'TUNE DOWN';
        statusLabelRef.current.style.color = '#F59E0B';
      } else if (status === 'weak') {
        statusLabelRef.current.textContent = 'LISTENING...';
        statusLabelRef.current.style.color = isLight ? '#9CA3AF' : '#6B7280';
      } else {
        statusLabelRef.current.textContent = 'PLUCK STRING';
        statusLabelRef.current.style.color = isLight ? '#9CA3AF' : '#6B7280';
      }
    }
  }, [isLight]);

  // Audio Engine Lifecycle
  useEffect(() => {
    const engine = new TunerAudioEngine({
      instrumentMode,
      referenceA4: 440,
      inTuneToleranceCents: 3.5,
      exitTuneToleranceCents: 4.5,
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
          currentCentsDisplayRef.current = 0;
          updateNeedleDom(0, 0, 'silent');

          if (lastStatusRef.current !== 'silent') {
            lastStatusRef.current = 'silent';
            setTuningStatus('silent');
          }
          return;
        }

        // Direct high-frequency visual update
        targetCentsRef.current = metrics.cents;
        // Smooth interpolation
        currentCentsDisplayRef.current += (metrics.cents - currentCentsDisplayRef.current) * 0.45;
        updateNeedleDom(currentCentsDisplayRef.current, metrics.frequency, metrics.tuningStatus);

        // Low-frequency React state sync (only on note change or status change)
        if (metrics.fullName !== lastActiveNoteRef.current) {
          lastActiveNoteRef.current = metrics.fullName;
          setActiveNoteName(metrics.noteName);
          setActiveOctave(metrics.octave);
          setTargetFreq(metrics.targetFrequency);
          setActiveGuitarString(metrics.nearestGuitarString);
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
    engineRef.current?.setMode(newMode);
  };

  // Card theme backgrounds
  const bgColor = isAmoled
    ? '#000000'
    : isLight
      ? '#ffffff'
      : 'var(--surface-card-bg, #181c24)';

  const borderColor = isAmoled
    ? '#1a1a1a'
    : isLight
      ? '#e5e7eb'
      : 'var(--c-border, #2d3748)';

  const textColor = isLight ? '#111827' : '#F9FAFB';
  const textMuted = isLight ? '#6B7280' : '#9CA3AF';

  return (
    <div
      className="flex flex-col w-full h-full p-4 sm:p-6 select-none overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      data-testid="chromatic-tuner-modal"
    >
      {/* Top Header: Mode Selector & Close Button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Acoustic / Electric Segmented Pill */}
        <div
          className="flex items-center p-1 rounded-full border shadow-sm"
          style={{
            backgroundColor: isLight ? '#f3f4f6' : 'rgba(255, 255, 255, 0.05)',
            borderColor,
          }}
        >
          <button
            type="button"
            onClick={() => handleModeChange('acoustic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'acoustic'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            data-purpose="mode-acoustic"
          >
            <span className="material-symbols-rounded text-[16px]">acoustic_guitar</span>
            <span>Acoustic</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('electric')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              instrumentMode === 'electric'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            data-purpose="mode-electric"
          >
            <span className="material-symbols-rounded text-[16px]">electric_guitar</span>
            <span>Electric</span>
          </button>
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

      {/* Permission Denied or Error Banner */}
      {lifecycleState === 'permission_denied' && (
        <div className="flex flex-col items-center justify-center p-6 mb-4 rounded-2xl border bg-red-500/10 border-red-500/20 text-center">
          <span className="material-symbols-rounded text-[32px] text-red-400 mb-2">mic_off</span>
          <h4 className="text-sm font-semibold text-red-300 mb-1">Microphone Access Denied</h4>
          <p className="text-xs text-red-200/80 mb-3 max-w-xs">
            {errorMessage || 'Grant microphone permission in app or browser settings to enable audio pitch detection.'}
          </p>
          <button
            type="button"
            onClick={() => engineRef.current?.start()}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold cursor-pointer shadow"
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Main Pitch Display: Hero Note, Octave & Target */}
      <div className="flex flex-col items-center justify-center my-4">
        {/* Large Hero Note Name & Octave */}
        <div className="relative flex items-baseline justify-center">
          <span
            className="text-7xl sm:text-8xl font-black tracking-tight transition-colors duration-150"
            style={{
              color:
                tuningStatus === 'in_tune'
                  ? '#10B981'
                  : activeNoteName !== '-'
                    ? textColor
                    : isLight
                      ? '#D1D5DB'
                      : '#374151',
            }}
          >
            {activeNoteName}
          </span>
          {activeOctave !== null && (
            <span
              className="text-2xl sm:text-3xl font-bold ml-1.5 opacity-80"
              style={{
                color: tuningStatus === 'in_tune' ? '#10B981' : textMuted,
              }}
            >
              {activeOctave}
            </span>
          )}
        </div>

        {/* Status Badge (IN TUNE / TUNE UP / TUNE DOWN / PLUCK STRING) */}
        <div className="mt-2 flex items-center gap-2">
          <span
            ref={statusLabelRef}
            className="text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              borderColor,
              color: textMuted,
            }}
          >
            PLUCK STRING
          </span>
        </div>

        {/* Live Frequency & Target Frequency */}
        <div className="flex items-center gap-3 mt-3 text-xs font-mono" style={{ color: textMuted }}>
          <span ref={hzTextRef}>-- Hz</span>
          <span>•</span>
          <span>Target: {targetFreq > 0 ? `${targetFreq.toFixed(1)} Hz` : '--'}</span>
        </div>
      </div>

      {/* Centered Pitch Meter & Needle */}
      <div className="flex flex-col items-center my-6 px-2 w-full max-w-sm mx-auto">
        {/* Meter Arc / Bar Container */}
        <div className="relative w-full h-12 flex items-center justify-center">
          {/* Flat (b) Indicator on Left */}
          <div className="absolute left-1 flex items-center gap-0.5 text-xs font-bold text-blue-400">
            <span className="material-symbols-rounded text-[14px]">arrow_left</span>
            <span>♭</span>
          </div>

          {/* Sharp (#) Indicator on Right */}
          <div className="absolute right-1 flex items-center gap-0.5 text-xs font-bold text-amber-400">
            <span>♯</span>
            <span className="material-symbols-rounded text-[14px]">arrow_right</span>
          </div>

          {/* Central Meter Scale Line */}
          <div
            className="relative w-4/5 h-2 rounded-full overflow-visible flex items-center justify-center"
            style={{
              backgroundColor: isLight ? '#e5e7eb' : '#27272a',
            }}
          >
            {/* In-Tune Sweet Spot Notch (+/- 3.5 cents) */}
            <div
              className="absolute h-4 w-3 rounded-sm border border-emerald-500/40 bg-emerald-500/20"
              style={{ zIndex: 1 }}
            />

            {/* Zero Center Line */}
            <div
              className="absolute h-5 w-0.5 bg-emerald-500"
              style={{ zIndex: 2 }}
            />

            {/* Moving Needle Indicator */}
            <div
              ref={needleRef}
              className="absolute w-2 h-7 rounded-full transition-transform duration-75 ease-out"
              style={{
                zIndex: 10,
                backgroundColor: isLight ? '#9CA3AF' : '#6B7280',
                transform: 'translateX(0%)',
              }}
            />
          </div>
        </div>

        {/* Cents Readout */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            ref={centsTextRef}
            className="text-2xl font-black font-mono tracking-tight"
            style={{ color: textMuted }}
          >
            --
          </span>
          <span className="text-xs font-semibold text-gray-500">cents</span>
        </div>
      </div>

      {/* Standard Guitar Strings Peg Selector Bar */}
      <div className="mt-auto pt-4 border-t" style={{ borderColor }}>
        <div className="text-[11px] font-semibold text-center mb-3 tracking-wide uppercase opacity-75" style={{ color: textMuted }}>
          Standard Guitar Strings (E A D G B E)
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {STANDARD_GUITAR_STRINGS.map((str) => {
            const isSelected = activeGuitarString?.fullName === str.fullName;
            const isInTune = isSelected && tuningStatus === 'in_tune';

            return (
              <div
                key={str.fullName}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all text-center ${
                  isInTune
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
                    : isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : ''
                }`}
                style={{
                  borderColor: isSelected || isInTune ? undefined : borderColor,
                  backgroundColor: isSelected || isInTune ? undefined : isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <span className="text-[10px] font-mono text-gray-400">
                  {str.stringNumber}
                </span>
                <span
                  className={`text-sm font-black ${
                    isInTune
                      ? 'text-emerald-400'
                      : isSelected
                        ? 'text-blue-400'
                        : textColor
                  }`}
                >
                  {str.fullName}
                </span>
                <span className="text-[9px] font-mono text-gray-400">
                  {Math.round(str.frequency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
