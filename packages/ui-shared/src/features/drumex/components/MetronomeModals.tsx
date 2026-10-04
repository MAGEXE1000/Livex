import React, { useEffect } from 'react';
import { Switch } from '../../../components/ui/Switch';
import { motion, AnimatePresence } from 'motion/react';
import {
  type MetronomeTimeSignature,
  type MetronomeSubdivision,
  type MetronomeTempoRampConfig,
  SpringPresets,
  BackDispatcher,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';

interface TimeSignatureModalProps {
  isOpen: boolean;
  value: MetronomeTimeSignature;
  onSelect: (sig: MetronomeTimeSignature) => void;
  onClose: () => void;
  isAmoled?: boolean;
}

interface TimeSignatureOption {
  signature: MetronomeTimeSignature;
  name: string;
  description: string;
  beats: number;
}

const TIME_SIGNATURE_OPTIONS: TimeSignatureOption[] = [
  { signature: '2/4', name: '2/4 Duple', description: '2 beats • Simple duple meter', beats: 2 },
  { signature: '3/4', name: '3/4 Waltz', description: '3 beats • Simple triple meter', beats: 3 },
  {
    signature: '4/4',
    name: '4/4 Common',
    description: '4 beats • Standard rock/pop meter',
    beats: 4,
  },
  {
    signature: '5/4',
    name: '5/4 Asymmetric',
    description: '5 beats • Quintuple odd meter',
    beats: 5,
  },
  {
    signature: '6/8',
    name: '6/8 Compound',
    description: '6 beats • Slow shuffle / blues meter',
    beats: 6,
  },
  {
    signature: '7/8',
    name: '7/8 Complex',
    description: '7 beats • Septuple progressive meter',
    beats: 7,
  },
  {
    signature: '9/8',
    name: '9/8 Compound',
    description: '9 beats • Compound triple meter',
    beats: 9,
  },
  {
    signature: '12/8',
    name: '12/8 Blues Ballad',
    description: '12 beats • Slow 4-pulse compound meter',
    beats: 12,
  },
];

export function TimeSignatureModal({
  isOpen,
  value,
  onSelect,
  onClose,
  isAmoled,
}: TimeSignatureModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = 'metronome:time-signature';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Centered Modern Card Surface */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-sig-modal-title"
            initial={prefersReduced ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 8 }}
            animate={prefersReduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 6 }}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.panel}
            className={`relative w-full max-w-sm ${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
            } rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div
            className={`px-5 pt-5 pb-3 border-b ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex items-center justify-between`}
          >
            <div>
              <h3
                id="time-sig-modal-title"
                className="text-base font-extrabold font-manrope text-slate-900 dark:text-zinc-100 tracking-tight"
              >
                Time Signature
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Select active meter configuration
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className={`w-8 h-8 rounded-full ${
                isAmoled
                  ? 'bg-[#0a0a0c] text-zinc-400 hover:text-white border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              } flex items-center justify-center transition cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Options Grid */}
          <div className="p-4 overflow-y-auto space-y-2 no-scrollbar">
            {TIME_SIGNATURE_OPTIONS.map((opt) => {
              const isSelected = value === opt.signature;
              return (
                <button
                  key={opt.signature}
                  type="button"
                  onClick={() => {
                    onSelect(opt.signature);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? isAmoled
                        ? 'bg-white/10 border-white text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/10 border-black dark:border-white text-black dark:text-white shadow-sm'
                      : isAmoled
                        ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/5'
                        : 'bg-slate-50/70 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-manrope font-extrabold text-sm border ${
                        isSelected
                          ? isAmoled
                            ? 'bg-white text-black font-extrabold border-white'
                            : 'bg-black dark:bg-white text-white dark:text-black font-extrabold border-black dark:border-white'
                          : isAmoled
                            ? 'bg-black text-white border-white/10'
                            : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {opt.signature}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold font-manrope leading-tight">
                        {opt.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Action */}
          <div
            className={`p-4 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-manrope font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

interface SubdivisionModalProps {
  isOpen: boolean;
  value: MetronomeSubdivision;
  onSelect: (sub: MetronomeSubdivision) => void;
  onClose: () => void;
  isAmoled?: boolean;
}

interface SubdivisionOption {
  subdivision: MetronomeSubdivision;
  name: string;
  description: string;
  pulses: string;
  iconText: string;
}

const SUBDIVISION_OPTIONS: SubdivisionOption[] = [
  {
    subdivision: '1/4',
    name: 'Quarter Note',
    description: '1 pulse per beat • Steady primary pulse',
    pulses: '1 pulse',
    iconText: '1/4',
  },
  {
    subdivision: '1/8',
    name: 'Eighth Notes',
    description: '2 pulses per beat • Duple subdivision (1 &)',
    pulses: '2 pulses',
    iconText: '1/8',
  },
  {
    subdivision: '1/16',
    name: 'Sixteenth Notes',
    description: '4 pulses per beat • Quadruple (1 e & a)',
    pulses: '4 pulses',
    iconText: '1/16',
  },
  {
    subdivision: '1/32',
    name: 'Thirty-Second Notes',
    description: '8 pulses per beat • Rapid high-density subdivision',
    pulses: '8 pulses',
    iconText: '1/32',
  },
  {
    subdivision: '3let',
    name: 'Eighth Triplets',
    description: '3 pulses per beat • Swing / triplet feel',
    pulses: '3 pulses',
    iconText: '3let',
  },
  {
    subdivision: '6let',
    name: 'Sixteenth Sextuplets',
    description: '6 pulses per beat • Double-time triplet subdivision',
    pulses: '6 pulses',
    iconText: '6let',
  },
];

export function SubdivisionModal({
  isOpen,
  value,
  onSelect,
  onClose,
  isAmoled,
}: SubdivisionModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = 'metronome:subdivision';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Centered Modern Card Surface */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subdivision-modal-title"
            initial={prefersReduced ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 8 }}
            animate={prefersReduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 6 }}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.panel}
            className={`relative w-full max-w-sm ${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
            } rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div
            className={`px-5 pt-5 pb-3 border-b ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex items-center justify-between`}
          >
            <div>
              <h3
                id="subdivision-modal-title"
                className="text-base font-extrabold font-manrope text-slate-900 dark:text-zinc-100 tracking-tight"
              >
                Subdivisions
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Select pulse density per metronome beat
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className={`w-8 h-8 rounded-full ${
                isAmoled
                  ? 'bg-[#0a0a0c] text-zinc-400 hover:text-white border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              } flex items-center justify-center transition cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Options Grid */}
          <div className="p-4 overflow-y-auto space-y-2 no-scrollbar">
            {SUBDIVISION_OPTIONS.map((opt) => {
              const isSelected = value === opt.subdivision;
              return (
                <button
                  key={opt.subdivision}
                  type="button"
                  onClick={() => {
                    onSelect(opt.subdivision);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? isAmoled
                        ? 'bg-white/10 border-white text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/10 border-black dark:border-white text-black dark:text-white shadow-sm'
                      : isAmoled
                        ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:bg-white/5'
                        : 'bg-slate-50/70 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-manrope font-extrabold text-xs border ${
                        isSelected
                          ? isAmoled
                            ? 'bg-white text-black font-extrabold border-white'
                            : 'bg-black dark:bg-white text-white dark:text-black font-extrabold border-black dark:border-white'
                          : isAmoled
                            ? 'bg-black text-white border-white/10'
                            : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {opt.iconText}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold font-manrope leading-tight">
                        {opt.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Action */}
          <div
            className={`p-4 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-manrope font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

export interface TempoRampModalProps {
  isOpen: boolean;
  config: MetronomeTempoRampConfig;
  currentBpm: number;
  onSave: (config: MetronomeTempoRampConfig) => void;
  onClose: () => void;
  isAmoled?: boolean;
}

function formatDurationLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function TempoRampModal({
  isOpen,
  config,
  currentBpm,
  onSave,
  onClose,
  isAmoled,
}: TempoRampModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = 'metronome:tempo-ramp';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [isOpen, onClose]);
  const [enabled, setEnabled] = React.useState(config.enabled);
  const [mode, setMode] = React.useState<'bars' | 'time'>(config.mode || 'bars');
  const [startBpm, setStartBpm] = React.useState(config.startBpm || currentBpm);
  const [targetBpm, setTargetBpm] = React.useState(
    config.targetBpm || Math.min(280, currentBpm + 20)
  );
  const [stepBpm, setStepBpm] = React.useState(config.stepBpm ?? 5);

  // Bars mode parameters
  const [startDelayBars, setStartDelayBars] = React.useState(config.startDelayBars ?? 0);
  const [intervalBars, setIntervalBars] = React.useState(config.intervalBars ?? 8);

  // Time mode parameters
  const [startDelaySec, setStartDelaySec] = React.useState(config.startDelaySec ?? 0);
  const [intervalSec, setIntervalSec] = React.useState(config.intervalSec ?? 30);
  const [durationSec, setDurationSec] = React.useState(config.durationSec ?? 120);

  const [holdFinalBpm, setHoldFinalBpm] = React.useState(config.holdFinalBpm ?? true);

  React.useEffect(() => {
    if (isOpen) {
      setEnabled(config.enabled);
      setMode(config.mode || 'bars');
      setStartBpm(config.startBpm || currentBpm);
      setTargetBpm(config.targetBpm || Math.min(280, currentBpm + 20));
      setStepBpm(config.stepBpm ?? 5);
      setStartDelayBars(config.startDelayBars ?? 0);
      setIntervalBars(config.intervalBars ?? 8);
      setStartDelaySec(config.startDelaySec ?? 0);
      setIntervalSec(config.intervalSec ?? 30);
      setDurationSec(config.durationSec ?? 120);
      setHoldFinalBpm(config.holdFinalBpm ?? true);
    }
  }, [isOpen, config, currentBpm]);

  const handleSave = () => {
    onSave({
      enabled,
      mode,
      startBpm: Math.max(40, Math.min(280, Math.round(startBpm))),
      targetBpm: Math.max(40, Math.min(280, Math.round(targetBpm))),
      stepBpm: Math.max(1, Math.min(50, Math.round(stepBpm))),
      startDelayBars: Math.max(0, Math.round(startDelayBars)),
      intervalBars: Math.max(1, Math.round(intervalBars)),
      startDelaySec: Math.max(0, Math.round(startDelaySec)),
      intervalSec: Math.max(1, Math.round(intervalSec)),
      durationSec: Math.max(5, Math.round(durationSec)),
      holdFinalBpm,
    });
    onClose();
  };

  const BAR_DELAY_PRESETS = [0, 4, 8, 16, 32];
  const BAR_INTERVAL_PRESETS = [2, 4, 8, 16, 32];
  const STEP_PRESETS = [1, 2, 3, 5, 10];
  const TIME_DELAY_PRESETS = [0, 15, 30, 60, 120];
  const TIME_INTERVAL_PRESETS = [15, 30, 60, 120, 180];

  const direction = startBpm <= targetBpm ? 'increases' : 'decreases';
  const liveSummaryText =
    mode === 'bars'
      ? `Starts at ${startBpm} BPM and ${direction} by ${stepBpm} BPM every ${intervalBars} bars until ${targetBpm} BPM${startDelayBars > 0 ? ` (after ${startDelayBars} bars delay)` : ''}.`
      : `Starts at ${startBpm} BPM and ${direction} by ${stepBpm} BPM every ${formatDurationLabel(intervalSec)} until ${targetBpm} BPM${startDelaySec > 0 ? ` (after ${formatDurationLabel(startDelaySec)} delay)` : ''}.`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Centered Modern Card Surface */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tempo-ramp-modal-title"
            initial={prefersReduced ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 8 }}
            animate={prefersReduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 6 }}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.panel}
            className={`relative w-full max-w-sm ${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
            } rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div
            className={`px-5 pt-5 pb-3 border-b ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex items-center justify-between`}
          >
            <div>
              <h3
                id="tempo-ramp-modal-title"
                className="text-base font-extrabold font-manrope text-slate-900 dark:text-zinc-100 tracking-tight"
              >
                Incremental Tempo
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Automated tempo progression during practice
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className={`w-8 h-8 rounded-full ${
                isAmoled
                  ? 'bg-[#0a0a0c] text-zinc-400 hover:text-white border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              } flex items-center justify-center transition cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto space-y-4 no-scrollbar">
            {/* Enable Toggle Card */}
            <div
              className={`p-3.5 rounded-2xl ${
                isAmoled
                  ? 'bg-[#0a0a0c] border border-white/10'
                  : 'bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800'
              } flex items-center justify-between`}
            >
              <div>
                <div className="text-xs font-bold font-manrope text-slate-900 dark:text-zinc-100">
                  Enable Progression
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {enabled ? 'Active during playback' : 'Metronome plays at steady BPM'}
                </div>
              </div>
              <Switch checked={enabled} onClick={() => setEnabled(!enabled)} />
            </div>

            {/* Progression Mode Selector: BY BARS vs BY TIME */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-manrope">
                Progression Mode
              </label>
              <div
                className={`grid grid-cols-2 p-1 ${
                  isAmoled
                    ? 'bg-[#0a0a0c] border-white/10'
                    : 'bg-slate-100 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700'
                } rounded-2xl border`}
              >
                <button
                  type="button"
                  onClick={() => setMode('bars')}
                  className={`py-2 rounded-xl text-xs font-bold font-manrope transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'bars'
                      ? isAmoled
                        ? 'bg-white text-black font-extrabold shadow-xs border border-white'
                        : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  <span>By Bars</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('time')}
                  className={`py-2 rounded-xl text-xs font-bold font-manrope transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'time'
                      ? isAmoled
                        ? 'bg-white text-black font-extrabold shadow-xs border border-white'
                        : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>By Time</span>
                </button>
              </div>
            </div>

            {/* Start & Target BPM */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Start BPM */}
              <div
                className={`p-3 rounded-2xl ${
                  isAmoled
                    ? 'bg-[#0a0a0c] border-white/10'
                    : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800'
                } border flex flex-col items-center`}
              >
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Start BPM
                </span>
                <div className="flex items-center gap-1.5 my-1">
                  <button
                    type="button"
                    onClick={() => setStartBpm((v) => Math.max(40, v - 5))}
                    className={`w-7 h-7 rounded-lg ${
                      isAmoled
                        ? 'bg-black text-white border-white/10 hover:bg-white/10'
                        : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-600'
                    } font-bold text-xs flex items-center justify-center border active:scale-95 transition cursor-pointer`}
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-xl text-slate-900 dark:text-zinc-100 min-w-[48px] text-center">
                    {startBpm}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStartBpm((v) => Math.min(280, v + 5))}
                    className={`w-7 h-7 rounded-lg ${
                      isAmoled
                        ? 'bg-black text-white border-white/10 hover:bg-white/10'
                        : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-600'
                    } font-bold text-xs flex items-center justify-center border active:scale-95 transition cursor-pointer`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setStartBpm(currentBpm)}
                  className="text-[10px] font-semibold text-slate-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-1 cursor-pointer"
                >
                  Set to {currentBpm}
                </button>
              </div>

              {/* Target BPM */}
              <div
                className={`p-3 rounded-2xl ${
                  isAmoled
                    ? 'bg-[#0a0a0c] border-white/10'
                    : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800'
                } border flex flex-col items-center`}
              >
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Target BPM
                </span>
                <div className="flex items-center gap-1.5 my-1">
                  <button
                    type="button"
                    onClick={() => setTargetBpm((v) => Math.max(40, v - 5))}
                    className={`w-7 h-7 rounded-lg ${
                      isAmoled
                        ? 'bg-black text-white border-white/10 hover:bg-white/10'
                        : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-600'
                    } font-bold text-xs flex items-center justify-center border active:scale-95 transition cursor-pointer`}
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-xl text-slate-900 dark:text-zinc-100 min-w-[48px] text-center">
                    {targetBpm}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTargetBpm((v) => Math.min(280, v + 5))}
                    className={`w-7 h-7 rounded-lg ${
                      isAmoled
                        ? 'bg-black text-white border-white/10 hover:bg-white/10'
                        : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-600'
                    } font-bold text-xs flex items-center justify-center border active:scale-95 transition cursor-pointer`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetBpm(Math.min(280, startBpm + 20))}
                  className="text-[10px] font-semibold text-slate-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-1 cursor-pointer"
                >
                  +20 BPM
                </button>
              </div>
            </div>

            {/* BPM Increment Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold font-manrope text-slate-700 dark:text-zinc-300">
                  BPM Increment
                </span>
                <span className="text-xs font-mono font-bold text-black dark:text-white">+{stepBpm} BPM</span>
              </div>
              <div className="flex gap-1.5">
                {STEP_PRESETS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setStepBpm(step)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      stepBpm === step
                        ? isAmoled
                          ? 'bg-white text-black font-extrabold shadow-xs'
                          : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                        : isAmoled
                          ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    +{step}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific controls */}
            {mode === 'bars' ? (
              <>
                {/* Interval in Bars */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold font-manrope text-slate-700 dark:text-zinc-300">
                      Bars Between Increments
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                      Every {intervalBars} {intervalBars === 1 ? 'bar' : 'bars'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {BAR_INTERVAL_PRESETS.map((bars) => (
                      <button
                        key={bars}
                        type="button"
                        onClick={() => setIntervalBars(bars)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          intervalBars === bars
                            ? isAmoled
                              ? 'bg-white text-black font-extrabold shadow-xs'
                              : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                            : isAmoled
                              ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {bars}b
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Delay in Bars */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold font-manrope text-slate-700 dark:text-zinc-300">
                      Initial Bars Before Progression
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                      {startDelayBars === 0 ? 'None (immediate)' : `${startDelayBars} bars`}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {BAR_DELAY_PRESETS.map((bars) => (
                      <button
                        key={bars}
                        type="button"
                        onClick={() => setStartDelayBars(bars)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          startDelayBars === bars
                            ? isAmoled
                              ? 'bg-white text-black font-extrabold shadow-xs'
                              : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                            : isAmoled
                              ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {bars === 0 ? '0' : `${bars}b`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Interval in Time */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold font-manrope text-slate-700 dark:text-zinc-300">
                      Time Between Increments
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                      Every {formatDurationLabel(intervalSec)}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {TIME_INTERVAL_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setIntervalSec(sec)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          intervalSec === sec
                            ? isAmoled
                              ? 'bg-white text-black font-extrabold shadow-xs'
                              : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                            : isAmoled
                              ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {formatDurationLabel(sec)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Delay in Time */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold font-manrope text-slate-700 dark:text-zinc-300">
                      Start Delay
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                      {startDelaySec === 0
                        ? 'None (immediate)'
                        : formatDurationLabel(startDelaySec)}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {TIME_DELAY_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setStartDelaySec(sec)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          startDelaySec === sec
                            ? isAmoled
                              ? 'bg-white text-black font-extrabold shadow-xs'
                              : 'bg-black dark:bg-white text-white dark:text-black font-extrabold shadow-xs'
                            : isAmoled
                              ? 'bg-[#0a0a0c] text-zinc-300 border border-white/10 hover:bg-white/10'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {sec === 0 ? '0s' : formatDurationLabel(sec)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Hold Final BPM Toggle */}
            <div
              className={`p-3 rounded-2xl ${
                isAmoled
                  ? 'bg-[#0a0a0c] border-white/10'
                  : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800'
              } border flex items-center justify-between`}
            >
              <div>
                <div className="text-xs font-bold font-manrope text-slate-900 dark:text-zinc-100">
                  Hold Final BPM
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Keep target tempo after progression finishes
                </div>
              </div>
              <Switch checked={holdFinalBpm} onClick={() => setHoldFinalBpm(!holdFinalBpm)} />
            </div>

            {/* Dynamic Live Summary Box */}
            <div
              className={`p-3.5 rounded-2xl ${
                isAmoled
                  ? 'bg-[#0a0a0c] border border-white/10 text-zinc-300'
                  : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-800 dark:text-zinc-200'
              } text-xs flex items-start gap-2.5`}
            >
              <span className="material-symbols-outlined text-black dark:text-white text-[18px] shrink-0 mt-0.5">
                info
              </span>
              <p className="leading-relaxed">{liveSummaryText}</p>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div
            className={`p-4 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex gap-2.5`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-2xl ${
                isAmoled
                  ? 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300 border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              } font-manrope font-bold text-xs tracking-tight transition cursor-pointer`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 rounded-2xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-manrope font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
            >
              Save Progression
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

// ── COUNT-IN CONFIGURATION MODAL ──────────────────────────────────────────

interface CountInModalProps {
  isOpen: boolean;
  countInBars: number;
  countInVoiceEnabled: boolean;
  isAmoled?: boolean;
  onSelectBars: (bars: number) => void;
  onToggleVoice: (enabled: boolean) => void;
  onPreviewVoice?: () => void;
  onClose: () => void;
}

const COUNT_IN_BAR_OPTIONS = [
  { bars: 0, label: 'Off', sub: 'Disabled' },
  { bars: 1, label: '1 Bar', sub: 'Standard' },
  { bars: 2, label: '2 Bars', sub: 'Rehearsal' },
  { bars: 3, label: '3 Bars', sub: 'Long Intro' },
];

export function CountInModal({
  isOpen,
  countInBars,
  countInVoiceEnabled,
  isAmoled,
  onSelectBars,
  onToggleVoice,
  onPreviewVoice,
  onClose,
}: CountInModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = 'metronome:count-in';
    activeOverlaysRegistry.register('modal', id);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('modal', id);
      unregisterBack();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Centered Modern Card Surface */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="countin-modal-title"
            initial={prefersReduced ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 8 }}
            animate={prefersReduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 6 }}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.panel}
            className={`relative w-full max-w-sm ${
              isAmoled
                ? 'bg-black border-white/15'
                : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
            } rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div
            className={`px-5 pt-5 pb-3 border-b ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl ${
                  isAmoled
                    ? 'bg-white/10 text-white'
                    : 'bg-black/5 dark:bg-white/10 text-black dark:text-white'
                } flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-[19px]">timelapse</span>
              </div>
              <div>
                <h3
                  id="countin-modal-title"
                  className="text-base font-extrabold font-manrope text-slate-900 dark:text-zinc-100 tracking-tight"
                >
                  Count-In Settings
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure intro duration & spoken voice
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              type="button"
              className={`w-8 h-8 rounded-full ${
                isAmoled
                  ? 'bg-[#0a0a0c] hover:bg-white/10 text-zinc-400 border border-white/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              } flex items-center justify-center transition cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body content */}
          <div className="p-4 overflow-y-auto space-y-4 no-scrollbar">
            {/* Section 1: Count-In Bars */}
            <div>
              <div className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase font-manrope tracking-wider mb-2">
                COUNT-IN LENGTH
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COUNT_IN_BAR_OPTIONS.map((opt) => {
                  const isSelected = countInBars === opt.bars;
                  return (
                    <button
                      key={opt.bars}
                      type="button"
                      onClick={() => onSelectBars(opt.bars)}
                      className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition tap-press cursor-pointer border ${
                        isSelected
                          ? isAmoled
                            ? 'bg-white text-black font-extrabold border-white shadow-xs'
                            : 'bg-black dark:bg-white text-white dark:text-black font-extrabold border-black dark:border-white shadow-xs'
                          : isAmoled
                            ? 'bg-[#0a0a0c] border-white/10 text-zinc-300 hover:border-white/20'
                            : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-black font-manrope">{opt.label}</span>
                      <span className="text-[9px] font-medium opacity-75 mt-0.5">{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Spoken Voice Count-In */}
            <div
              className={`${
                isAmoled
                  ? 'bg-[#0a0a0c] border-white/10'
                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700/80'
              } rounded-2xl p-3.5 border`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl ${
                      isAmoled
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/15'
                    } flex items-center justify-center shrink-0`}
                  >
                    <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 font-manrope">
                      Voice Count-In
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      Natural female voice speaks count
                    </div>
                  </div>
                </div>

                {/* iOS Style Toggle Switch */}
                <Switch checked={countInVoiceEnabled} onClick={() => onToggleVoice(!countInVoiceEnabled)} />
              </div>
            </div>

            {/* Section 3: Voice Profile & Preview */}
            <div
              className={`${
                isAmoled
                  ? 'bg-[#0a0a0c] border-white/10'
                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700/80'
              } rounded-2xl p-3.5 border flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl ${
                    isAmoled
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/15'
                  } flex items-center justify-center shrink-0`}
                >
                  <span className="material-symbols-outlined text-[18px]">face_3</span>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 font-manrope">
                    Voice: Natural Female
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    Calm, relaxed • Preloaded 0ms latency
                  </div>
                </div>
              </div>

              {onPreviewVoice && (
                <button
                  type="button"
                  onClick={onPreviewVoice}
                  className={`px-2.5 py-1.5 rounded-xl ${
                    isAmoled
                      ? 'bg-black hover:bg-white/10 border-white/15 text-white'
                      : 'bg-white dark:bg-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-600 border-slate-200 dark:border-zinc-600 text-slate-900 dark:text-white'
                  } border font-manrope font-bold text-xs flex items-center gap-1 transition tap-press cursor-pointer shadow-xs`}
                >
                  <span className="material-symbols-outlined text-[15px]">volume_up</span>
                  <span>Preview</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div
            className={`p-4 border-t ${
              isAmoled ? 'border-white/10' : 'border-slate-100 dark:border-zinc-800/80'
            } flex`}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-manrope font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

