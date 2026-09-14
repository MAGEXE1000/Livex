import React, { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type {
  InstrumentTuningDefinition,
  InstrumentTuningMode,
  TuningCategory,
} from '@workspace/studio-core';
import {
  getTuningsByCategory,
  TUNING_CATEGORIES,
} from '@workspace/studio-core';

export interface TuningSelectorModalProps {
  isOpen: boolean;
  activeMode: InstrumentTuningMode;
  activeTuningId: string;
  onSelectTuning: (tuning: InstrumentTuningDefinition) => void;
  onClose: () => void;
  onModeChange?: (mode: InstrumentTuningMode) => void;
}

const INSTRUMENT_TABS: { id: InstrumentTuningMode; label: string }[] = [
  { id: 'electric', label: 'Electric' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'bass-4', label: 'Bass 4' },
];

export const TuningSelectorModal: React.FC<TuningSelectorModalProps> = ({
  isOpen,
  activeMode,
  activeTuningId,
  onSelectTuning,
  onClose,
  onModeChange,
}) => {
  const [selectedMode, setSelectedMode] = useState<InstrumentTuningMode>(
    activeMode === 'bass-5' ? 'bass-4' : activeMode
  );

  const handleTabChange = (mode: InstrumentTuningMode) => {
    setSelectedMode(mode);
    onModeChange?.(mode);
  };

  const categorized = getTuningsByCategory(selectedMode);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[120] flex flex-col bg-black select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Select Tuning"
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-zinc-300 hover:text-white bg-[#141518] border border-white/10 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
              aria-label="Back to Tuner"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span>Tuner</span>
            </button>

            <div className="text-center">
              <h2 className="text-sm font-bold text-white tracking-wide">Tuning Selection</h2>
              <p className="text-[10px] text-zinc-400 font-medium">Choose target instrument tuning</p>
            </div>

            <div className="w-16" aria-hidden="true" />
          </div>

          {/* Instrument Mode Selector Tabs */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-black">
            <div className="flex items-center p-1 rounded-full bg-[#141518] border border-white/10 max-w-[440px] mx-auto w-full">
              {INSTRUMENT_TABS.map((tab) => {
                const isActive = selectedMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 py-1.5 px-1 rounded-full text-xs font-semibold transition-all text-center truncate cursor-pointer ${
                      isActive
                        ? 'bg-[#23262d] text-white shadow-sm font-bold border border-white/10'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Tuning Groups */}
          <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain no-scrollbar">
            <div className="max-w-[440px] mx-auto w-full space-y-5 pb-8">
              {TUNING_CATEGORIES.map((category: TuningCategory) => {
                const tunings = categorized[category];
                if (!tunings || tunings.length === 0) return null;

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="px-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400/90 font-mono">
                        {category}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-[#141518] border border-white/10 divide-y divide-white/10 overflow-hidden">
                      {tunings.map((tuning) => {
                        const isCurrentActive =
                          tuning.id === activeTuningId && selectedMode === activeMode;

                        const displayNotes = [...tuning.strings]
                          .sort((a, b) => b.stringNumber - a.stringNumber)
                          .map((s) => s.note)
                          .join('  ');

                        return (
                          <button
                            key={tuning.id}
                            type="button"
                            onClick={() => {
                              onSelectTuning(tuning);
                              onClose();
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 cursor-pointer active:bg-white/[0.04] ${
                              isCurrentActive ? 'bg-cyan-500/10' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold tracking-wide">
                                <span
                                  className={
                                    isCurrentActive ? 'text-cyan-300 font-bold' : 'text-white'
                                  }
                                >
                                  {tuning.name}
                                </span>
                              </div>

                              <div className="text-[11px] font-mono text-slate-400 tracking-wider mt-0.5">
                                {displayNotes}
                              </div>
                            </div>

                            {/* Active Checkmark */}
                            {isCurrentActive && (
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-sm">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
