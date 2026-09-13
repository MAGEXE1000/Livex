import React, { useState } from 'react';
import { ChevronLeft, Check, Music2 } from 'lucide-react';
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
  { id: 'bass-4', label: 'Bass (4-Str)' },
  { id: 'bass-5', label: 'Bass (5-Str)' },
];

export const TuningSelectorModal: React.FC<TuningSelectorModalProps> = ({
  isOpen,
  activeMode,
  activeTuningId,
  onSelectTuning,
  onClose,
  onModeChange,
}) => {
  const [selectedMode, setSelectedMode] = useState<InstrumentTuningMode>(activeMode);

  if (!isOpen) return null;

  const handleTabChange = (mode: InstrumentTuningMode) => {
    setSelectedMode(mode);
    onModeChange?.(mode);
  };

  const categorized = getTuningsByCategory(selectedMode);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-[#080d1a]/95 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Select Tuning"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 active:scale-95 transition-all text-sm font-medium"
          aria-label="Back to Tuner"
        >
          <ChevronLeft className="w-5 h-5 text-cyan-400" />
          <span>Tuner</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white tracking-wide">Tuning Selection</h2>
          <p className="text-[11px] text-slate-400">Choose instrument tuning</p>
        </div>

        <div className="w-16" aria-hidden="true" />
      </div>

      {/* Instrument Mode Selector Tabs */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-slate-900/20">
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-slate-800/60">
          {INSTRUMENT_TABS.map((tab) => {
            const isActive = selectedMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center truncate ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Tuning Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6 overscroll-contain">
        {TUNING_CATEGORIES.map((category: TuningCategory) => {
          const tunings = categorized[category];
          if (!tunings || tunings.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400/90">
                  {category}
                </span>
                <div className="flex-1 h-px bg-slate-800/80" />
              </div>

              <div className="grid gap-2">
                {tunings.map((tuning) => {
                  const isCurrentActive =
                    tuning.id === activeTuningId && selectedMode === activeMode;

                  // Strings in natural display order (string 6 down to 1, or lowest to highest)
                  // For guitar: Low E (6) to High E (1)
                  const displayStrings = [...tuning.strings].sort(
                    (a, b) => b.stringNumber - a.stringNumber
                  );

                  return (
                    <button
                      key={tuning.id}
                      type="button"
                      onClick={() => {
                        onSelectTuning(tuning);
                        onClose();
                      }}
                      className={`w-full text-left rounded-xl p-3 transition-all border flex items-center justify-between gap-3 ${
                        isCurrentActive
                          ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 active:scale-[0.99]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold tracking-wide ${
                              isCurrentActive ? 'text-cyan-300' : 'text-white'
                            }`}
                          >
                            {tuning.name}
                          </span>
                          {tuning.description && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({tuning.description})
                            </span>
                          )}
                        </div>

                        {/* String Note Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {displayStrings.map((s) => (
                            <span
                              key={`${tuning.id}-${s.stringNumber}-${s.fullName}`}
                              className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border transition-colors ${
                                isCurrentActive
                                  ? 'bg-cyan-900/50 text-cyan-200 border-cyan-700/60'
                                  : 'bg-slate-800/80 text-slate-300 border-slate-700/50'
                              }`}
                            >
                              {s.fullName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Active Indicator */}
                      <div className="flex-shrink-0 flex items-center">
                        {isCurrentActive ? (
                          <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-700/60 flex items-center justify-center text-slate-600">
                            <Music2 className="w-3 h-3 opacity-30" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
