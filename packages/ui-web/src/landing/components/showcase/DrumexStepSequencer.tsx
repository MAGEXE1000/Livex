import React, { useState, useEffect } from 'react';
import { DrumexLogo } from '@workspace/ui-shared';
import { Play, Pause, RotateCcw, Volume2, Sparkles } from 'lucide-react';

interface DrumTrack {
  id: string;
  name: string;
  color: string;
}

const TRACKS: DrumTrack[] = [
  { id: 'hihat', name: 'Hi-Hat (Closed)', color: '#38bdf8' },
  { id: 'snare', name: 'Snare Drum', color: '#f59e0b' },
  { id: 'kick', name: 'Bass Drum (Kick)', color: '#ef4444' },
  { id: 'crash', name: 'Crash Cymbal', color: '#a855f7' },
];

const PRESETS: Record<string, Record<string, boolean[]>> = {
  pocket: {
    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    kick: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
    crash: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  },
  fourOnFloor: {
    hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    crash: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  },
};

export function DrumexStepSequencer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [pattern, setPattern] = useState<Record<string, boolean[]>>(PRESETS.pocket);
  const [activePreset, setActivePreset] = useState<'pocket' | 'fourOnFloor'>('pocket');

  // Step sequencer ticker loop
  useEffect(() => {
    if (!isPlaying) return;
    const stepDurationMs = (60000 / 128) / 4; // 128 BPM 16th notes ≈ 117ms
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 16);
    }, stepDurationMs);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const toggleHit = (trackId: string, stepIdx: number) => {
    setPattern((prev) => {
      const row = [...prev[trackId]];
      row[stepIdx] = !row[stepIdx];
      return { ...prev, [trackId]: row };
    });
  };

  const handleSelectPreset = (pKey: 'pocket' | 'fourOnFloor') => {
    setActivePreset(pKey);
    setPattern(PRESETS[pKey]);
  };

  const handleClear = () => {
    const empty = Object.fromEntries(TRACKS.map((t) => [t.id, Array(16).fill(false)]));
    setPattern(empty);
  };

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#09090b] border border-white/10 p-5 font-sans select-none shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <DrumexLogo size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Drumex Step Sequencer</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                16-Step Polyphonic
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Interactive click-to-edit rhythm patterns & visual ticker</p>
          </div>
        </div>

        {/* Master & Preset Controls */}
        <div className="flex items-center gap-2">
          {/* Preset Buttons */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => handleSelectPreset('pocket')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activePreset === 'pocket' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pocket Rock
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('fourOnFloor')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activePreset === 'fourOnFloor' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Four On Floor
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isPlaying
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Start Beat'}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            title="Clear grid"
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 16-Step Step Numbers Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-28 sm:w-36 flex-shrink-0 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
          Instrument
        </div>
        <div className="flex-1 grid grid-cols-16 gap-1">
          {Array.from({ length: 16 }).map((_, stepIdx) => {
            const isQuarterBeat = stepIdx % 4 === 0;
            const isPlayhead = currentStep === stepIdx && isPlaying;
            return (
              <div
                key={stepIdx}
                className={`text-center text-[9px] font-mono py-0.5 rounded transition-colors ${
                  isPlayhead
                    ? 'bg-white text-black font-bold shadow-xs'
                    : isQuarterBeat
                    ? 'text-zinc-300 font-bold'
                    : 'text-zinc-600'
                }`}
              >
                {stepIdx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Rows */}
      <div className="flex flex-col gap-2">
        {TRACKS.map((track) => {
          const rowHits = pattern[track.id] || [];
          return (
            <div
              key={track.id}
              className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-colors"
            >
              {/* Instrument Title */}
              <div className="w-28 sm:w-36 flex-shrink-0 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                <span className="text-xs font-semibold text-zinc-300 truncate">{track.name}</span>
              </div>

              {/* 16 Step Buttons */}
              <div className="flex-1 grid grid-cols-16 gap-1">
                {rowHits.map((isHit, stepIdx) => {
                  const isCurrent = currentStep === stepIdx && isPlaying;
                  const isBarBeat = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      type="button"
                      onClick={() => toggleHit(track.id, stepIdx)}
                      className={`h-8 rounded-[4px] border transition-all cursor-pointer flex items-center justify-center ${
                        isHit
                          ? isCurrent
                            ? 'bg-white border-white scale-105 shadow-md shadow-white/30'
                            : 'border-transparent shadow-xs'
                          : isCurrent
                          ? 'border-white/40 bg-zinc-800'
                          : isBarBeat
                          ? 'border-white/10 bg-zinc-950/80 hover:bg-zinc-800/80'
                          : 'border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60'
                      }`}
                      style={{
                        backgroundColor: isHit
                          ? isCurrent
                            ? '#ffffff'
                            : track.color
                          : undefined,
                      }}
                    >
                      {isHit && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? 'bg-black' : 'bg-white/80'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 mt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span>Click any square to toggle hits • Quarter notes illuminated</span>
        </div>
        <div className="font-mono text-zinc-400">Step {currentStep + 1}/16 • 120 BPM</div>
      </div>
    </div>
  );
}

export default DrumexStepSequencer;
