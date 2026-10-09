import React, { useState } from 'react';
import {
  Sliders,
  Music,
  Radio,
  Users,
  Mic,
  Cpu,
  Zap,
  Layers,
  ArrowRight,
  Volume2,
  Check,
} from 'lucide-react';

export default function WorkstationBentoGrid({
  navigateTo,
}: {
  navigateTo?: (path: string) => void;
}) {
  const [activeFader, setActiveFader] = useState<number>(85);

  const STEMS = [
    { name: 'Drums', vol: 90, color: 'bg-emerald-500' },
    { name: 'Bass', vol: 82, color: 'bg-teal-500' },
    { name: 'Guitars', vol: 74, color: 'bg-blue-500' },
    { name: 'Vocals', vol: 88, color: 'bg-amber-500' },
    { name: 'Click', vol: 60, color: 'bg-rose-500' },
  ];

  return (
    <section id="bento" className="w-full py-20 md:py-28 bg-black relative select-none">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Heading */}
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-4">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              Modular Architecture // Bento System
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Five Purpose-Built Workstations. One Cohesive Ecosystem.
          </h2>
          <p className="text-sm md:text-base text-zinc-400 mt-3 font-normal leading-relaxed">
            Every module is engineered from first principles with zero bloat. High-precision WebAudio DSP, local-first offline storage, and instantaneous multi-device synchronization.
          </p>
        </div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Bento Cell 1: Groovex Multitrack DSP (Col-span 7) */}
          <div className="md:col-span-7 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 md:p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Audio Worklet DSP
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Groovex Multitrack Audio Engine
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 mt-2 font-normal leading-relaxed max-w-lg">
                Independent 5-stem isolation with WebAudio worklet architecture. Real-time time-stretching and pitch shifting via SoundTouchJS without acoustic phase artifacts.
              </p>
            </div>

            {/* Interactive Fader Rack Mini Preview */}
            <div className="my-6 p-4 rounded-2xl bg-black/60 border border-white/[0.08]">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-3">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Live Mix Bus
                </span>
                <span className="text-emerald-400">0.0ms Latency</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {STEMS.map((stem, i) => (
                  <div key={stem.name} className="flex flex-col items-center gap-2">
                    <div className="w-full h-24 bg-zinc-900 rounded-lg p-1 flex flex-col justify-end relative overflow-hidden border border-white/[0.06]">
                      <div
                        className={`w-full rounded ${stem.color} opacity-80 transition-all duration-300`}
                        style={{ height: `${i === 0 ? activeFader : stem.vol}%` }}
                      />
                      <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between p-1 pointer-events-none opacity-20">
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                      {stem.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/[0.08] font-mono">
              <span>32-bit Float • SoundTouchJS</span>
              <span className="text-emerald-400 font-semibold">WebAssembly</span>
            </div>
          </div>

          {/* Bento Cell 2: Chordex Harmonic Intelligence (Col-span 5) */}
          <div className="md:col-span-5 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 md:p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Music className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400/90 font-medium px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Modal Engine
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Chordex Fretboard & Transposition
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 mt-2 font-normal leading-relaxed">
                Instant harmonic Roman numeral & Nashville number mapping. 400+ tactile guitar & bass voicings with intelligent smart capo positioning.
              </p>
            </div>

            {/* Chord Progression Chips */}
            <div className="my-6 p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col gap-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Harmonic Progression // Key of G
              </span>
              <div className="grid grid-cols-4 gap-2">
                {['Gmaj7', 'Em9', 'Cadd9', 'D7sus4'].map((chord, i) => (
                  <div
                    key={chord}
                    className="py-2 text-center rounded-lg bg-zinc-900 border border-white/10 text-white font-mono text-xs font-semibold hover:border-blue-500/50 transition-colors"
                  >
                    <div className="text-[9px] text-zinc-500 font-normal">
                      {['I', 'vi', 'IV', 'V'][i]}
                    </div>
                    {chord}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/[0.08] font-mono">
              <span>Dynamic Capo Matrix</span>
              <span className="text-blue-400 font-semibold">400+ Voicings</span>
            </div>
          </div>

          {/* Bento Cell 3: Drumex 16-Step Sequencer (Col-span 4) */}
          <div className="md:col-span-4 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-pink-400/90 font-medium px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                  Polyphonic
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Drumex Beat Engine
              </h3>
              <p className="text-xs text-zinc-400 mt-2 font-normal leading-relaxed">
                16-step polyphonic sequencer featuring 12 vintage hardware kits (TR-808, CR-78, LinnDrum, Studio Acoustic) with micro-timing humanization.
              </p>
            </div>

            {/* Step Sequencer LED Dots */}
            <div className="my-5 p-3 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>Kick</span>
                <span className="text-pink-400">120 BPM</span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {[1, 0, 0, 0, 1, 0, 1, 0].map((active, i) => (
                  <div
                    key={i}
                    className={`h-4 rounded-sm ${
                      active
                        ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/[0.08] font-mono">
              <span>Velocity Curves</span>
              <span className="text-pink-400">12 Drum Kits</span>
            </div>
          </div>

          {/* Bento Cell 4: Stagex Collaborative Stage Plot (Col-span 4) */}
          <div className="md:col-span-4 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400/90 font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  Realtime Collab
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Stagex Spatial Plots
              </h3>
              <p className="text-xs text-zinc-400 mt-2 font-normal leading-relaxed">
                Live multi-device collaborative stage plot and rider editor. Equipment patch lists, monitor mix positioning, and instant PDF/PNG vector export.
              </p>
            </div>

            {/* Stage Layout Visual */}
            <div className="my-5 p-3 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-around h-16">
              <span className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-300">
                DRUMS
              </span>
              <span className="px-2 py-1 rounded bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-semibold">
                VOCAL C
              </span>
              <span className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-300">
                AMP L
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/[0.08] font-mono">
              <span>Vector PDF Export</span>
              <span className="text-cyan-400">Cloud Sync</span>
            </div>
          </div>

          {/* Bento Cell 5: Vocalex Pitch & Warmup Coach (Col-span 4) */}
          <div className="md:col-span-4 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  YIN Analysis
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Vocalex Pitch Coach
              </h3>
              <p className="text-xs text-zinc-400 mt-2 font-normal leading-relaxed">
                Real-time pitch detection with cents deviation analysis. Guided warmup routines, vocal range calibration, and audio take comparison vault.
              </p>
            </div>

            {/* Vocal Pitch Visual */}
            <div className="my-5 p-3 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-mono text-sm font-bold text-white">A4 440 Hz</span>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +1.4 Cents
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/[0.08] font-mono">
              <span>Sub-cent Precision</span>
              <span className="text-amber-400">Warmup Library</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
