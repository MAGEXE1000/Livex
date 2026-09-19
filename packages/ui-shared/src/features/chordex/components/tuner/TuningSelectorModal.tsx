import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type {
  InstrumentTuningDefinition,
  InstrumentTuningMode,
} from '@workspace/livex-core';
import {
  getTuningsForMode,
  useSettingsStore,
  getEffectiveThemeState,
  resolveAccent,
} from '@workspace/livex-core';

export interface TuningSelectorModalProps {
  isOpen: boolean;
  activeMode: InstrumentTuningMode;
  activeTuningId: string;
  onSelectTuning: (tuning: InstrumentTuningDefinition) => void;
  onClose: () => void;
  onModeChange?: (mode: InstrumentTuningMode) => void;
  triggerRect?: { top: number; left: number; width: number; height: number } | null;
  isLight?: boolean;
  isAmoled?: boolean;
  accent?: { from: string; to: string; ring?: string };
}

export const TuningSelectorModal: React.FC<TuningSelectorModalProps> = ({
  isOpen,
  activeMode,
  activeTuningId,
  onSelectTuning,
  onClose,
  triggerRect,
  isLight: propIsLight,
  isAmoled: propIsAmoled,
  accent: propAccent,
}) => {
  const settings = useSettingsStore((s) => s.settings);
  const themeState = getEffectiveThemeState(settings, 'chordex');
  const isLight = propIsLight ?? (themeState === 'light');
  const isAmoled = propIsAmoled ?? (themeState === 'amoled');
  const effectiveAccent = propAccent || resolveAccent(settings?.accentColor);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetMode = ((activeMode as unknown) === 'bass-5' ? 'bass-4' : activeMode) as InstrumentTuningMode;
  const tunings = getTuningsForMode(targetMode);

  // Morphing origin calculation relative to viewport center
  const originY = triggerRect && typeof window !== 'undefined'
    ? triggerRect.top - window.innerHeight / 2 + 50
    : -60;
  const originX = triggerRect && typeof window !== 'undefined'
    ? triggerRect.left - window.innerWidth / 2 + 60
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none">
          {/* Subtle Dimming Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className={`absolute inset-0 backdrop-blur-[3px] ${
              isLight ? 'bg-black/40' : 'bg-black/65'
            }`}
            aria-hidden="true"
          />

          {/* Compact Morphing Modal Surface */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.65,
              x: originX,
              y: originY,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.65,
              x: originX,
              y: originY,
            }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 32,
              mass: 0.7,
            }}
            className="relative w-full max-w-[340px] rounded-2xl p-4 shadow-2xl overflow-hidden z-10 border"
            style={{
              backgroundColor: 'var(--surface-dialog-bg)',
              borderColor: 'var(--c-border)',
              color: 'var(--c-text-primary)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Select Tuning"
          >
            {/* Header: Title on Left, Close Icon on Right */}
            <div
              style={{ borderColor: 'var(--c-border)' }}
              className="flex items-center justify-between pb-3 mb-1 border-b"
            >
              <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--c-text-primary)' }}>
                Select Tuning
              </h3>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: 'var(--c-surface-low)',
                  borderColor: 'var(--c-border)',
                  color: 'var(--c-text-secondary)',
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer border hover:opacity-80"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Tuning Options List */}
            <div
              style={{ borderColor: 'var(--c-border)' }}
              className="flex flex-col divide-y max-h-[280px] overflow-y-auto no-scrollbar"
            >
              {tunings.map((tuning) => {
                const isSelected = tuning.id === activeTuningId;
                const displayNotes = [...tuning.strings]
                  .sort((a, b) => b.stringNumber - a.stringNumber)
                  .map((s) => s.note)
                  .join(' ');

                return (
                  <button
                    key={tuning.id}
                    type="button"
                    onClick={() => {
                      onSelectTuning(tuning);
                      onClose();
                    }}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--c-surface-low)',
                          }
                        : undefined
                    }
                    className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl transition-all text-left cursor-pointer active:scale-[0.98] hover:opacity-80"
                  >
                    {/* Radio Button Indicator */}
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ borderColor: isSelected ? effectiveAccent.from : 'var(--c-border)' }}
                    >
                      {isSelected && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: effectiveAccent.from }}
                        />
                      )}
                    </div>

                    {/* Tuning Title & Notes */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs leading-tight ${isSelected ? 'font-bold' : 'font-semibold'}`}
                        style={{ color: 'var(--c-text-primary)' }}
                      >
                        {tuning.name}
                      </span>
                      <span
                        className="text-[10.5px] font-mono tracking-wider mt-0.5 leading-tight"
                        style={{ color: 'var(--c-text-secondary)' }}
                      >
                        {displayNotes}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

