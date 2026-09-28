import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatDurationMmSs, parseDurationMmSs } from '@workspace/livex-core';

export interface SongDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDurationSeconds?: number;
  bpm?: number;
  accent?: { from: string; to: string; mid?: string };
  onSave: (targetDurationSeconds: number | undefined) => void;
}

const PRESET_CHIPS: { label: string; sec: number | undefined }[] = [
  { label: 'Auto', sec: undefined },
  { label: '2:30', sec: 150 },
  { label: '3:00', sec: 180 },
  { label: '3:45', sec: 225 },
  { label: '4:00', sec: 240 },
  { label: '5:00', sec: 300 },
];

export const SongDurationModal: React.FC<SongDurationModalProps> = ({
  isOpen,
  onClose,
  initialDurationSeconds,
  bpm = 120,
  accent = { from: '#2563EB', to: '#1D4ED8' },
  onSave,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialDurationSeconds && initialDurationSeconds > 0) {
      setInputValue(formatDurationMmSs(initialDurationSeconds));
    } else {
      setInputValue('');
    }
    setError(null);
    // Auto-focus input
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, initialDurationSeconds]);

  const handleApply = (valueToApply?: string) => {
    const val = (valueToApply !== undefined ? valueToApply : inputValue).trim();
    if (!val || val.toLowerCase() === 'auto') {
      onSave(undefined);
      onClose();
      return;
    }

    const parsed = parseDurationMmSs(val);
    if (parsed === null) {
      setError('Please enter a valid duration (e.g. 3:45 or 225)');
      return;
    }

    if (parsed < 10) {
      setError('Duration must be at least 10 seconds');
      return;
    }

    if (parsed > 3600) {
      setError('Duration cannot exceed 60 minutes');
      return;
    }

    setError(null);
    onSave(parsed);
    onClose();
  };

  const handleChipSelect = (sec: number | undefined) => {
    if (sec === undefined) {
      setInputValue('');
      setError(null);
      handleApply('');
    } else {
      const formatted = formatDurationMmSs(sec);
      setInputValue(formatted);
      setError(null);
      handleApply(formatted);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set Song Duration"
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ userSelect: 'none' }}
    >
      {/* Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border flex flex-col gap-5 overflow-hidden"
        style={{
          background: 'var(--c-surface-card, #1A1D24)',
          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `${accent.from}22`,
                color: accent.from,
              }}
            >
              <span className="material-symbols-rounded text-xl">timer</span>
            </div>
            <div>
              <h3
                className="text-base font-extrabold tracking-tight"
                style={{
                  color: 'var(--c-text-primary, #FFFFFF)',
                  fontFamily: 'var(--font-headline, system-ui, sans-serif)',
                }}
              >
                Song Duration
              </h3>
              <p
                className="text-xs font-medium"
                style={{ color: 'var(--c-text-secondary, #9CA3AF)' }}
              >
                Target total presentation duration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--c-text-secondary, #9CA3AF)',
            }}
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>

        {/* Input & Formatted mm:ss field */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all"
            style={{
              backgroundColor: 'var(--c-surface-high, rgba(255, 255, 255, 0.05))',
              borderColor: error ? '#EF4444' : `${accent.from}66`,
            }}
          >
            <span className="material-symbols-outlined text-xl" style={{ color: accent.from }}>
              schedule
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              data-testid="duration-modal-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="3:45"
              className="bg-transparent text-center font-mono text-3xl font-extrabold outline-none w-32 tracking-wider"
              style={{
                color: 'var(--c-text-primary, #FFFFFF)',
              }}
            />
          </div>

          {error ? (
            <p className="text-xs font-semibold text-red-400 text-center">{error}</p>
          ) : (
            <p className="text-[11px] text-center" style={{ color: 'var(--c-text-muted, #8A92A6)' }}>
              Enter format <span className="font-mono font-bold">mm:ss</span> (e.g. 3:45) • Tempo:{' '}
              <span className="font-bold" style={{ color: accent.from }}>{bpm} BPM</span>
            </p>
          )}
        </div>

        {/* Quick Chips */}
        <div className="flex flex-col gap-1.5">
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest px-1"
            style={{ color: 'var(--c-text-muted, #8A92A6)' }}
          >
            Quick Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_CHIPS.map((chip) => {
              const isCurrent =
                chip.sec === undefined
                  ? !initialDurationSeconds
                  : initialDurationSeconds === chip.sec;
              return (
                <button
                  key={chip.label}
                  type="button"
                  data-testid={`duration-modal-preset-${chip.label.replace(':', '-')}`}
                  onClick={() => handleChipSelect(chip.sec)}
                  className="py-2 px-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                  style={{
                    backgroundColor: isCurrent
                      ? `${accent.from}33`
                      : 'rgba(255, 255, 255, 0.06)',
                    color: isCurrent ? '#FFFFFF' : 'var(--c-text-secondary, #9CA3AF)',
                    border: `1px solid ${isCurrent ? accent.from : 'rgba(255, 255, 255, 0.1)'}`,
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--c-text-secondary, #9CA3AF)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="duration-modal-save-btn"
            onClick={() => handleApply()}
            className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              boxShadow: `0 4px 16px ${accent.to}55`,
            }}
          >
            <span className="material-symbols-rounded text-base">check</span>
            <span>Save Duration</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
