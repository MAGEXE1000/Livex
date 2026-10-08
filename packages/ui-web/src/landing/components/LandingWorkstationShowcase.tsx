import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GroovexLogo,
  ChordexLogo,
  DrumexLogo,
  VocalexLogo,
  StagexLogo,
} from '@workspace/ui-shared';
import { Sliders, Music, Disc3, Mic2, MapPin, Zap, RefreshCw, WifiOff, Smartphone } from 'lucide-react';
import SmoothTabs, { TabOption } from './SmoothTabs';
import SpotlightCard from './SpotlightCard';
import { GroovexStemMixer } from './showcase/GroovexStemMixer';
import { ChordexPrompter } from './showcase/ChordexPrompter';
import { DrumexStepSequencer } from './showcase/DrumexStepSequencer';
import { VocalexPitchTracker } from './showcase/VocalexPitchTracker';
import { StagexSpatialPlot } from './showcase/StagexSpatialPlot';

type ModuleId = 'groovex' | 'chordex' | 'drumex' | 'vocalex' | 'stagex';

const MODULE_TABS: TabOption<ModuleId>[] = [
  {
    id: 'groovex',
    label: 'Groovex',
    icon: <GroovexLogo size={14} />,
    badge: 'Stems',
  },
  {
    id: 'chordex',
    label: 'Chordex',
    icon: <ChordexLogo size={14} />,
    badge: 'Chords',
  },
  {
    id: 'drumex',
    label: 'Drumex',
    icon: <DrumexLogo size={14} />,
    badge: 'Drums',
  },
  {
    id: 'vocalex',
    label: 'Vocalex',
    icon: <VocalexLogo size={14} />,
    badge: 'Pitch',
  },
  {
    id: 'stagex',
    label: 'Stagex',
    icon: <StagexLogo size={14} />,
    badge: 'Plot',
  },
];

export function LandingWorkstationShowcase() {
  const [activeModule, setActiveModule] = useState<ModuleId>('groovex');

  return (
    <section id="workstations" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive Audio Suite</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
          Five Dedicated Workstations.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
            One Cohesive Stage Engine.
          </span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-400 font-normal leading-relaxed">
          Test real Livex modules right here in your browser. Seamlessly transition from rehearsal stem isolation
          to live teleprompting, beat production, vocal calibration, and spatial stage plotting.
        </p>

        {/* Tab Switcher Pills */}
        <div className="mt-8 flex justify-center overflow-x-auto py-2">
          <SmoothTabs<ModuleId>
            tabs={MODULE_TABS}
            activeTab={activeModule}
            onChange={setActiveModule}
            size="md"
            layoutId="workstation-active-tab"
          />
        </div>
      </div>

      {/* Interactive Showcase Window */}
      <div className="relative mx-auto max-w-5xl">
        {/* Ambient Glow behind window */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl opacity-50 pointer-events-none" />

        <SpotlightCard
          className="p-1 sm:p-2 bg-[#09090b]/95 border-white/10 shadow-2xl backdrop-blur-xl"
          spotlightColor="rgba(255, 255, 255, 0.08)"
          spotlightSize={450}
        >
          <div className="p-3 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
        </SpotlightCard>
      </div>

      {/* Bento Architecture Highlights */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <SpotlightCard className="p-5 bg-[#09090b]/60 border-white/10">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3.5">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white tracking-tight">Ultra-Low Latency DSP</h4>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Multi-threaded Web Audio worklets deliver sub-millisecond audio response without garbage collection drops.
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5 bg-[#09090b]/60 border-white/10">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white tracking-tight">Multi-Device Stage Sync</h4>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Leader-follower setlist synchronizer broadcasts real-time scroll offsets and song transitions across all band tablets.
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5 bg-[#09090b]/60 border-white/10">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
            <WifiOff className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white tracking-tight">100% Offline Resilient</h4>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Local SQLite and IndexedDB caching ensure your library, audio stems, and stage plots perform with or without venue Wi-Fi.
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5 bg-[#09090b]/60 border-white/10">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white tracking-tight">Unified Android & Web</h4>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Identical design tokens and logic across Web and Android APK guarantee seamless continuity from laptop to mobile phone.
          </p>
        </SpotlightCard>
      </div>
    </section>
  );
}

export default LandingWorkstationShowcase;
