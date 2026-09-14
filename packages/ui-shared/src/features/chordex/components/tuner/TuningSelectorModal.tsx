import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type {
  InstrumentTuningDefinition,
  InstrumentTuningMode,
} from '@workspace/studio-core';
import { getTuningsForMode } from '@workspace/studio-core';

export interface TuningSelectorModalProps {
  isOpen: boolean;
  activeMode: InstrumentTuningMode;
  activeTuningId: string;
  onSelectTuning: (tuning: InstrumentTuningDefinition) => void;
  onClose: () => void;
  onModeChange?: (mode: InstrumentTuningMode) => void;
  triggerRect?: { top: number; left: number; width: number; height: number } | null;
}

export const TuningSelectorModal: React.FC<TuningSelectorModalProps> = ({
  isOpen,
  activeMode,
  activeTuningId,
  onSelectTuning,
  onClose,
  triggerRect,
}) => {
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
            className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
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
            className="relative w-full max-w-[340px] bg-[#121316] border border-white/12 rounded-2xl p-4 shadow-2xl overflow-hidden z-10"
            role="dialog"
            aria-modal="true"
            aria-label="Select Tuning"
          >
            {/* Header: Title on Left, Close Icon on Right */}
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/10">
              <h3 className="text-sm font-bold text-white tracking-wide">Select Tuning</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Tuning Options List */}
            <div className="flex flex-col divide-y divide-white/[0.06] max-h-[280px] overflow-y-auto no-scrollbar">
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
                    className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-xl transition-all text-left cursor-pointer active:scale-[0.98] ${
                      isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Radio Button Indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'border-blue-500' : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>

                    {/* Tuning Title & Notes */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          isSelected ? 'text-white font-bold' : 'text-zinc-200'
                        }`}
                      >
                        {tuning.name}
                      </span>
                      <span className="text-[10.5px] font-mono text-zinc-400 tracking-wider mt-0.5 leading-tight">
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

