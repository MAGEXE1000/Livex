import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TunerAudioEngine,
  DRUM_PARTS,
  DRUM_TENSION_PRESETS,
  DRUM_TIPS,
  getDrumStringTarget,
  getAllDrumTargetsForTension,
  findNearestDrumPart,
  useSettingsStore,
  getEffectiveThemeState,
  resolveAccent,
  type DrumPartId,
  type DrumTensionId,
  type TunerLifecycleState,
  type InstrumentStringTarget,
} from '@workspace/studio-core';

interface DrumTunerModalProps {
  onClose: () => void;
  accent?: { from: string; to: string; ring?: string };
  isLight?: boolean;
  isAmoled?: boolean;
}

const STORAGE_KEY = 'drumex_tuner_settings';

// 11-step chromatic tuning scale (-5 to +5) matching Livex visual design
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

export const DrumTunerModal: React.FC<DrumTunerModalProps> = ({
  onClose,
  accent: propAccent,
  isLight: propIsLight,
  isAmoled: propIsAmoled,
}) => {
  const settings = useSettingsStore((s) => s.settings);
  const themeState = getEffectiveThemeState(settings, 'drumex');
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

  // Load persisted settings
  const initialSettings = useMemo(() => {
    if (typeof window === 'undefined') {
      return { partId: 'snare' as DrumPartId, tensionId: 'normal' as DrumTensionId, isAuto: true };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          partId: (parsed.partId || 'snare') as DrumPartId,
          tensionId: (parsed.tensionId || 'normal') as DrumTensionId,
          isAuto: parsed.isAuto !== undefined ? Boolean(parsed.isAuto) : true,
        };
      }
    } catch {}
    return { partId: 'snare' as DrumPartId, tensionId: 'normal' as DrumTensionId, isAuto: true };
  }, []);

  const [selectedPartId, setSelectedPartId] = useState<DrumPartId>(initialSettings.partId);
  const [selectedTensionId, setSelectedTensionId] = useState<DrumTensionId>(initialSettings.tensionId);
  const [isAuto, setIsAuto] = useState<boolean>(initialSettings.isAuto);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  const [isReferencePlaying, setIsReferencePlaying] = useState<boolean>(false);

  const [lifecycleState, setLifecycleState] = useState<TunerLifecycleState>('initial');
  const [activeFrequency, setActiveFrequency] = useState<number>(0);
  const [tuningStatus, setTuningStatus] = useState<string>('silent');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct DOM references for 60/120 FPS high-performance audio rate rendering
  const engineRef = useRef<TunerAudioEngine | null>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const centsPillRef = useRef<HTMLDivElement>(null);
  const centsTextRef = useRef<HTMLSpanElement>(null);

  const currentCentsRef = useRef<number>(0);
  const targetCentsRef = useRef<number>(0);
  const isAutoRef = useRef<boolean>(isAuto);
  isAutoRef.current = isAuto;
  const selectedPartIdRef = useRef<DrumPartId>(selectedPartId);
  selectedPartIdRef.current = selectedPartId;
  const selectedTensionIdRef = useRef<DrumTensionId>(selectedTensionId);
  selectedTensionIdRef.current = selectedTensionId;

  // Selected drum part object and target tension metrics
  const selectedPart = useMemo(() => {
    return DRUM_PARTS.find((p) => p.id === selectedPartId) || DRUM_PARTS[0];
  }, [selectedPartId]);

  const currentTarget = useMemo(() => {
    return selectedPart.tensions[selectedTensionId];
  }, [selectedPart, selectedTensionId]);

  const currentStringTarget = useMemo<InstrumentStringTarget>(() => {
    return getDrumStringTarget(selectedPart, selectedTensionId);
  }, [selectedPart, selectedTensionId]);

  // Direct high-performance DOM update to bypass React reconciliation at audio frame rates
  const updateNeedleDom = useCallback((cents: number, status: string) => {
    const clamped = Math.max(-50, Math.min(50, cents));
    const maxTravelPx = 115;
    const offsetPx = (clamped / 50) * maxTravelPx;

    if (needleRef.current) {
      needleRef.current.style.transform = `translateX(-50%) translate3d(${offsetPx}px, 0, 0)`;
      if (status === 'in_tune') {
        needleRef.current.style.backgroundColor = '#22c55e';
        needleRef.current.style.boxShadow = '0 0 14px rgba(34, 197, 94, 0.95)';
        needleRef.current.style.opacity = '1';
      } else if (status === 'flat') {
        needleRef.current.style.backgroundColor = '#38bdf8';
        needleRef.current.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.7)';
        needleRef.current.style.opacity = '0.9';
      } else if (status === 'sharp') {
        needleRef.current.style.backgroundColor = '#f97316';
        needleRef.current.style.boxShadow = '0 0 8px rgba(249, 115, 22, 0.7)';
        needleRef.current.style.opacity = '0.9';
      } else {
        needleRef.current.style.backgroundColor = isLightRef.current
          ? 'rgba(0, 0, 0, 0.25)'
          : '#71717a';
        needleRef.current.style.boxShadow = 'none';
        needleRef.current.style.opacity = '0.35';
      }
    }

    if (centsPillRef.current && centsTextRef.current) {
      const rounded = Math.round(cents);
      centsTextRef.current.textContent = rounded > 0 ? `+${rounded}` : `${rounded}`;

      if (status === 'in_tune') {
        centsPillRef.current.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        centsPillRef.current.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
        centsPillRef.current.style.color = '#4ade80';
      } else if (status === 'flat') {
        centsPillRef.current.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        centsPillRef.current.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
        centsPillRef.current.style.color = '#38bdf8';
      } else if (status === 'sharp') {
        centsPillRef.current.style.borderColor = 'rgba(249, 115, 22, 0.4)';
        centsPillRef.current.style.backgroundColor = 'rgba(249, 115, 22, 0.12)';
        centsPillRef.current.style.color = '#fb923c';
      } else {
        centsPillRef.current.style.borderColor = isLightRef.current
          ? 'rgba(0, 0, 0, 0.1)'
          : isAmoledRef.current
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(255, 255, 255, 0.1)';
        centsPillRef.current.style.backgroundColor = isLightRef.current
          ? 'rgba(0, 0, 0, 0.05)'
          : isAmoledRef.current
            ? '#000000'
            : '#141518';
        centsPillRef.current.style.color = isLightRef.current ? '#52525b' : '#a1a1aa';
      }
    }
  }, []);

  // Sync idle styles immediately when theme changes while silent
  useEffect(() => {
    if (centsPillRef.current && tuningStatus === 'silent') {
      centsPillRef.current.style.borderColor = isLight
        ? 'rgba(0, 0, 0, 0.1)'
        : isAmoled
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(255, 255, 255, 0.1)';
      centsPillRef.current.style.backgroundColor = isLight
        ? 'rgba(0, 0, 0, 0.05)'
        : isAmoled
          ? '#000000'
          : '#141518';
      centsPillRef.current.style.color = isLight ? '#52525b' : '#a1a1aa';
    }
    if (needleRef.current && tuningStatus === 'silent') {
      needleRef.current.style.backgroundColor = isLight ? 'rgba(0, 0, 0, 0.25)' : '#71717a';
    }
  }, [isLight, isAmoled, tuningStatus]);

  // Frame handler from audio engine
  const handleFrame = useCallback(
    (payload: { state: TunerLifecycleState; metrics: any; error?: string }) => {
      setLifecycleState(payload.state);

      if (payload.error) {
        setErrorMessage(payload.error);
      }

      if (!payload.metrics || payload.metrics.frequency <= 0) {
        targetCentsRef.current = 0;
        setTuningStatus('silent');
        setActiveFrequency(0);
        return;
      }

      const freq = payload.metrics.frequency;
      setActiveFrequency(Math.round(freq * 10) / 10);

      // Auto part detection: strike of any drum detects closest drum part
      if (isAutoRef.current) {
        const detected = findNearestDrumPart(freq, selectedTensionIdRef.current);
        if (detected.part.id !== selectedPartIdRef.current) {
          setSelectedPartId(detected.part.id);
        }
      }

      // Calculate cents deviation relative to target drum frequency
      const targetHz = DRUM_PARTS.find((p) => p.id === selectedPartIdRef.current)
        ?.tensions[selectedTensionIdRef.current].frequency || 242.0;

      const centsDiff = 1200 * Math.log2(freq / targetHz);
      targetCentsRef.current = centsDiff;

      const absCents = Math.abs(centsDiff);
      let status = 'silent';
      if (absCents <= 4.0) {
        status = 'in_tune';
      } else if (centsDiff < 0) {
        status = 'flat';
      } else {
        status = 'sharp';
      }

      setTuningStatus(status);
    },
    []
  );

  // Initialize and run audio engine
  useEffect(() => {
    const engine = new TunerAudioEngine({
      instrumentMode: 'drum',
      manualTargetString: currentStringTarget,
      onFrame: handleFrame,
      onStateChange: (state) => setLifecycleState(state),
    });

    engineRef.current = engine;

    engine.start().catch((err) => {
      console.warn('[DrumTunerModal] Audio engine start failed:', err);
    });

    // 60 FPS animation loop for smooth needle movement
    let animId: number;
    const animateNeedle = () => {
      const diff = targetCentsRef.current - currentCentsRef.current;
      currentCentsRef.current += diff * 0.28;
      updateNeedleDom(currentCentsRef.current, tuningStatus);
      animId = requestAnimationFrame(animateNeedle);
    };
    animId = requestAnimationFrame(animateNeedle);

    return () => {
      cancelAnimationFrame(animId);
      engine.stop();
      engineRef.current = null;
    };
  }, [handleFrame, updateNeedleDom]);

  // Update engine manual target when part or tension changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setManualTargetString(currentStringTarget);
    }
  }, [currentStringTarget]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          partId: selectedPartId,
          tensionId: selectedTensionId,
          isAuto,
        })
      );
    } catch {}
  }, [selectedPartId, selectedTensionId, isAuto]);

  const handleSelectPart = (id: DrumPartId) => {
    setSelectedPartId(id);
  };

  const handleSelectTension = (id: DrumTensionId) => {
    setSelectedTensionId(id);
  };

  const handleToggleAuto = () => {
    setIsAuto((prev) => !prev);
  };

  const handlePlayReference = () => {
    if (!engineRef.current) return;
    setIsReferencePlaying(true);
    engineRef.current.playDrumReference(currentTarget.frequency, 2.2);
    setTimeout(() => {
      setIsReferencePlaying(false);
    }, 2200);
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % DRUM_TIPS.length);
  };

  const handlePrevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + DRUM_TIPS.length) % DRUM_TIPS.length);
  };

  const activeTip = DRUM_TIPS[currentTipIndex];

  return (
    <div
      className="flex flex-col w-full h-full select-none overflow-hidden"
      style={{
        backgroundColor: isAmoled ? '#000000' : isLight ? 'var(--app-bg, #f4f4f5)' : 'var(--app-bg, #141418)',
        color: isLight ? 'var(--c-text-primary, #18181b)' : 'var(--c-text-primary, #f4f4f6)',
      }}
    >
      {/* ── 1. Top Bar: Drum Parts Selector Pill + Circular Close Button ───── */}
      <div className="flex items-center gap-2 w-full px-4 pt-3 pb-2 z-20">
        {/* Compact Drum Parts Pill immediately to the left of close button */}
        <div
          className={`flex-1 flex items-center p-1 rounded-full border min-w-0 transition-colors ${
            isLight
              ? 'bg-black/[0.04] border-black/10'
              : isAmoled
                ? 'bg-black border-white/12'
                : 'bg-[#141518] border-white/10'
          }`}
        >
          {DRUM_PARTS.map((part) => {
            const isSelected = selectedPartId === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => handleSelectPart(part.id)}
                className={`flex-1 py-1.5 px-1 sm:px-2 rounded-full text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                  isSelected
                    ? isLight
                      ? 'bg-white text-zinc-900 shadow-sm font-bold border border-black/5'
                      : 'bg-[#272930] text-white shadow-sm font-bold border border-white/15'
                    : isLight
                      ? 'text-zinc-500 hover:text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {part.name}
              </button>
            );
          })}
        </div>

        {/* Circular Close Button on Upper Right */}
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
            isLight
              ? 'border-black/10 bg-black/[0.04] text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.08]'
              : isAmoled
                ? 'border-white/12 bg-black text-zinc-400 hover:text-white hover:border-white/25'
                : 'border-white/10 bg-[#141518] text-zinc-400 hover:text-white hover:border-white/20'
          }`}
          aria-label="Close Drum Tuner"
        >
          <span className="material-symbols-rounded text-base">close</span>
        </button>
      </div>

      {/* ── 2. Tension Presets Row Directly Below Top Bar ──────────────────── */}
      <div className="w-full px-4 pb-2 z-20">
        <div
          className={`flex items-center gap-1.5 w-full p-1 rounded-2xl border transition-colors ${
            isLight
              ? 'bg-black/[0.04] border-black/10'
              : isAmoled
                ? 'bg-black border-white/12'
                : 'bg-[#141518] border-white/10'
          }`}
        >
          {DRUM_TENSION_PRESETS.map((preset) => {
            const isSelected = selectedTensionId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectTension(preset.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                  isSelected
                    ? isLight
                      ? 'bg-white text-zinc-900 shadow-sm font-bold border border-black/5'
                      : 'bg-[#272930] text-white shadow-sm font-bold border border-white/15'
                    : isLight
                      ? 'text-zinc-500 hover:text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="font-bold">{preset.label}</span>{' '}
                <span className="text-[10px] opacity-70 font-normal">({preset.sublabel})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Permission Denied Alert Banner */}
      {lifecycleState === 'permission_denied' && (
        <div
          className={`mx-4 my-2 p-3 rounded-2xl border text-center ${
            isLight
              ? 'bg-red-50 border-red-200'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <span
            className={`material-symbols-rounded text-xl mb-1 ${
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
            Acceso al micrófono denegado
          </h4>
          <p
            className={`text-[11px] mb-2 ${
              isLight ? 'text-red-700' : 'text-red-200/80'
            }`}
          >
            {errorMessage || 'Permite el acceso al micrófono para detectar el tono de la batería.'}
          </p>
          <button
            type="button"
            onClick={() => engineRef.current?.start()}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold cursor-pointer shadow"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── 3. Chromatic Tuning Meter ───────────────────────────────────────── */}
      <div className="relative flex flex-col items-center pt-1 pb-1 w-full max-w-[340px] mx-auto select-none px-4">
        {/* Top Label Row: FLAT ♭ and SHARP ♯ */}
        <div className="w-full flex items-center justify-between px-1">
          <div
            className={`font-black text-xs tracking-wider flex items-center gap-1 ${
              isLight ? 'text-sky-600' : 'text-[#38bdf8]'
            }`}
          >
            <span>FLAT</span>
            <span className="text-sm font-normal">♭</span>
          </div>

          <div
            className={`text-[10px] tracking-widest font-semibold uppercase ${
              isLight ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {tuningStatus === 'in_tune' ? 'IN TUNE' : 'LISTENING...'}
          </div>

          <div
            className={`font-black text-xs tracking-wider flex items-center gap-1 ${
              isLight ? 'text-amber-600' : 'text-[#f97316]'
            }`}
          >
            <span>SHARP</span>
            <span className="text-sm font-normal">♯</span>
          </div>
        </div>

        {/* 11-Bar Chromatic Meter Container */}
        <div className="relative w-full mx-auto pt-1.5 pb-1">
          {/* Center Emerald Glow */}
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

          {/* 11 Vertical Indicator Bars */}
          <div className="relative flex items-end justify-between px-2 h-7 z-10">
            {SCALE_BARS.map((bar) => {
              const heightClass = bar.isCenter ? 'h-7' : 'h-[18px]';
              const shadow = bar.isCenter ? '0 0 8px rgba(34, 197, 94, 0.8)' : undefined;

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

            {/* Moving Needle Indicator */}
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
          <div className="relative flex items-center justify-between px-1 mt-1 z-10 text-[9px] font-mono font-semibold">
            {SCALE_BARS.map((bar) => (
              <span
                key={bar.step}
                className={`w-[3px] text-center flex items-center justify-center ${
                  bar.isCenter
                    ? isLight
                      ? 'text-zinc-800 font-bold'
                      : 'text-zinc-300 font-bold'
                    : isLight
                      ? 'text-zinc-500'
                      : 'text-zinc-500'
                }`}
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>

        {/* Deviation Cents Pill Directly Below 0 */}
        <div
          ref={centsPillRef}
          className={`mt-1 px-3 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center justify-center transition-colors min-w-[36px] border shadow-sm ${
            isLight
              ? 'border-black/10 bg-black/[0.05] text-zinc-600'
              : isAmoled
                ? 'border-white/15 bg-black text-zinc-300'
                : 'border-white/10 bg-[#141518] text-zinc-300'
          }`}
        >
          <span ref={centsTextRef}>0</span>
        </div>
      </div>

      {/* ── 4. Main Body: Realistic Photographic Drum Graphic + Target Info ─── */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Photographic Drum Image with Smooth AnimatePresence Transition */}
        <div
          className={`relative w-full max-w-[280px] xs:max-w-[320px] aspect-[4/3] flex items-center justify-center ${
            isLight ? 'rounded-2xl bg-black border border-black/10 overflow-hidden shadow-inner' : ''
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPart.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={`/drums/realistic/${selectedPart.image}`}
                alt={selectedPart.name}
                className={`max-w-full max-h-full object-contain filter contrast-105 select-none pointer-events-none ${
                  isLight
                    ? 'drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]'
                }`}
                loading="eager"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pitch & Frequency Readout Strip */}
        <div className="flex items-center justify-center gap-4 py-1 z-10">
          <div className="flex flex-col items-center">
            <div
              className={`text-2xl xs:text-3xl font-black tracking-tight font-mono ${
                isLight ? 'text-zinc-900' : 'text-white'
              }`}
            >
              {currentTarget.frequency}{' '}
              <span className={`text-sm font-normal ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Hz
              </span>
            </div>
            <div className={`text-[11px] font-mono tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {currentTarget.fullName} ({selectedPart.sizeInches}&quot;)
            </div>
          </div>

          <div className={`h-8 w-[1px] self-center ${isLight ? 'bg-black/10' : 'bg-white/10'}`} />

          <div className="flex flex-col items-start">
            <div className={`text-[10px] uppercase font-bold tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Detectado
            </div>
            <div className={`text-base font-bold font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              {activeFrequency > 0 ? `${activeFrequency} Hz` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Contextual Drum Tuning Tips Card (Lug tightening pattern) ───── */}
      <div className="w-full px-4 pb-2 z-20">
        <div
          className={`flex items-center justify-between p-2.5 rounded-2xl border gap-2 transition-colors ${
            isLight
              ? 'bg-black/[0.04] border-black/10'
              : isAmoled
                ? 'bg-black border-white/12'
                : 'bg-[#141518] border-white/10'
          }`}
        >
          <button
            type="button"
            onClick={handlePrevTip}
            className={`p-1 rounded-full transition-colors cursor-pointer flex-shrink-0 active:scale-95 ${
              isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Consejo anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className={`text-[11px] font-bold truncate ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
              {activeTip.title}
            </div>
            <div className={`text-[10px] line-clamp-1 leading-snug ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {activeTip.tip}
            </div>
          </div>

          <div className={`text-[9px] font-mono font-bold px-1 flex-shrink-0 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {currentTipIndex + 1}/{DRUM_TIPS.length}
          </div>

          <button
            type="button"
            onClick={handleNextTip}
            className={`p-1 rounded-full transition-colors cursor-pointer flex-shrink-0 active:scale-95 ${
              isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Siguiente consejo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 6. Bottom Bar: Referencia (Speaker) + Auto Toggle ───────────────── */}
      <div
        className={`flex items-center justify-between gap-3 w-full px-4 pb-4 pt-1 z-20 border-t ${
          isLight ? 'border-black/10' : 'border-white/10'
        }`}
      >
        {/* Left: Referencia Sound Button */}
        <button
          type="button"
          onClick={handlePlayReference}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer active:scale-95 text-xs font-semibold ${
            isReferencePlaying
              ? isLight
                ? 'border-emerald-600/40 bg-emerald-100 text-emerald-800'
                : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
              : isLight
                ? 'border-black/10 bg-black/[0.04] text-zinc-900 hover:bg-black/[0.07]'
                : isAmoled
                  ? 'border-white/12 bg-black text-white hover:border-white/20'
                  : 'border-white/10 bg-[#141518] text-white hover:border-white/20'
          }`}
          title="Escuchar sonido de referencia"
        >
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>Referencia</span>
        </button>

        {/* Right: Auto Detect Toggle Switch */}
        <button
          type="button"
          onClick={handleToggleAuto}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
            isLight
              ? 'border-black/10 bg-black/[0.04] text-zinc-900 hover:bg-black/[0.07]'
              : isAmoled
                ? 'border-white/12 bg-black text-white hover:border-white/20'
                : 'border-white/10 bg-[#141518] text-white hover:border-white/20'
          }`}
          title="Alternar detección automática"
        >
          <span className={isLight ? 'text-zinc-900' : 'text-zinc-300'}>Auto</span>
          <div
            className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
              !isAuto ? (isLight ? 'bg-zinc-300' : 'bg-[#2a2b30]') : ''
            }`}
            style={isAuto ? { backgroundColor: effectiveAccent.from } : undefined}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                isAuto ? 'translate-x-3 shadow-sm' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </div>
    </div>
  );
};

export default DrumTunerModal;
