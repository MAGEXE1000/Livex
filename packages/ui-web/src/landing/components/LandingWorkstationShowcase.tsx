import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GroovexLogo,
  ChordexLogo,
  DrumexLogo,
  VocalexLogo,
  StagexLogo,
} from '@workspace/ui-shared';
import { Zap, RefreshCw, WifiOff, Smartphone } from 'lucide-react';
import { GroovexStemMixer } from './showcase/GroovexStemMixer';
import { ChordexPrompter } from './showcase/ChordexPrompter';
import { DrumexStepSequencer } from './showcase/DrumexStepSequencer';
import { VocalexPitchTracker } from './showcase/VocalexPitchTracker';
import { StagexSpatialPlot } from './showcase/StagexSpatialPlot';

type ModuleId = 'groovex' | 'chordex' | 'drumex' | 'vocalex' | 'stagex';

interface ModuleTab {
  id: ModuleId;
  label: string;
  roleTag: string;
  icon: React.ReactNode;
}

const MODULE_TABS: ModuleTab[] = [
  {
    id: 'groovex',
    label: 'Groovex',
    roleTag: 'STEMS',
    icon: <GroovexLogo size={14} />,
  },
  {
    id: 'chordex',
    label: 'Chordex',
    roleTag: 'PROMPTER',
    icon: <ChordexLogo size={14} />,
  },
  {
    id: 'drumex',
    label: 'Drumex',
    roleTag: 'BEATS',
    icon: <DrumexLogo size={14} />,
  },
  {
    id: 'vocalex',
    label: 'Vocalex',
    roleTag: 'PITCH',
    icon: <VocalexLogo size={14} />,
  },
  {
    id: 'stagex',
    label: 'Stagex',
    roleTag: 'PLOT',
    icon: <StagexLogo size={14} />,
  },
];

export function LandingWorkstationShowcase() {
  const [activeModule, setActiveModule] = useState<ModuleId>('groovex');

  return (
    <section id="workstations" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        {/* Understated Mono Eyebrow */}
        <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-zinc-500 uppercase px-3 py-1 rounded border border-white/[0.08] bg-[#0c0c0e] mb-4">
          <span>STUDIO WORKSTATION SUITE // 01 — 05</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-semibold text-white tracking-[-0.03em] leading-[1.08] mb-4">
          Five Dedicated Workstations.
          <br />
          <span className="text-zinc-400">
            One Cohesive Stage Engine.
          </span>
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-400 font-normal leading-[1.6]">
          Test real Livex modules right here in your browser. Seamlessly transition from rehearsal stem isolation
          to live teleprompting, beat production, vocal calibration, and spatial stage plotting.
        </p>

        {/* Hardware-Inspired Rack Module Selector */}
        <div className="mt-9 flex justify-center overflow-x-auto py-1">
          <div
            role="tablist"
            aria-label="Workstation selector"
            className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-[#0c0c0f] border border-white/[0.09] shadow-inner"
          >
            {MODULE_TABS.map((tab) => {
              const isActive = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveModule(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-md font-mono text-xs font-medium transition-all active:scale-[0.96] cursor-pointer ${
                    isActive
                      ? 'bg-[#1a1a20] text-white border border-white/20 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <span className="flex-shrink-0 text-zinc-300">{tab.icon}</span>
                  <span className="font-semibold tracking-tight">{tab.label}</span>
                  <span className="text-[10px] text-zinc-500 tracking-wider">
                    //{tab.roleTag}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="workstation-active-indicator"
                      className="absolute bottom-[-1px] left-3 right-3 h-[2px] bg-white/70 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Showcase Console Window */}
      <div className="relative mx-auto max-w-5xl">
        <div className="relative rounded-2xl bg-[#08080a] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.9)] overflow-hidden p-2 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {activeModule === 'groovex' && <GroovexStemMixer />}
              {activeModule === 'chordex' && <ChordexPrompter />}
              {activeModule === 'drumex' && <DrumexStepSequencer />}
              {activeModule === 'vocalex' && <VocalexPitchTracker />}
              {activeModule === 'stagex' && <StagexSpatialPlot />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Hardware Specification Grid */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-5xl mx-auto">
        <div className="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] text-zinc-500">SPEC // 01</span>
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Ultra-Low Latency DSP
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-[1.6] font-normal">
              Multi-threaded Web Audio worklets deliver sub-millisecond audio response without garbage collection drops.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] text-zinc-500">SPEC // 02</span>
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
            </div>
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Multi-Device Stage Sync
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-[1.6] font-normal">
              Leader-follower setlist synchronizer broadcasts real-time scroll offsets and song transitions across band tablets.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] text-zinc-500">SPEC // 03</span>
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <WifiOff className="w-3.5 h-3.5" />
              </div>
            </div>
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              100% Offline Resilient
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-[1.6] font-normal">
              Local SQLite and IndexedDB caching ensure your library, audio stems, and stage plots perform without venue Wi-Fi.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] text-zinc-500">SPEC // 04</span>
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
            </div>
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Unified Android & Web
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-[1.6] font-normal">
              Identical design tokens and logic across Web and Android APK guarantee seamless continuity from studio laptop to phone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingWorkstationShowcase;
