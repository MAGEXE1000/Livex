import React from 'react';
import { Shield, Sparkles, Activity, Layers, Terminal } from 'lucide-react';

export default function LandingAbout() {
  const PILLARS = [
    {
      title: 'Built by Stage Performers',
      description:
        'Engineered from firsthand touring and rehearsal experience. We designed Livex because existing tools require constant internet connections, suffer audio stutter, and clutter stages with visual noise.',
      icon: Activity,
    },
    {
      title: 'Local-First & Offline Resilient',
      description:
        'Venues have unreliable cellular coverage and non-existent Wi-Fi. Livex operates 100% offline using local browser IndexedDB and native SQLite storage. Your setlists and audio stems never depend on an external cloud.',
      icon: Shield,
    },
    {
      title: 'AMOLED Stage Ergonomics',
      description:
        'Stage monitors and music stands must not illuminate the dark theater. Livex enforces pure AMOLED #000000 black surfaces, high-contrast typography, and zero distracting animations during live performances.',
      icon: Layers,
    },
    {
      title: 'Sample-Accurate WebAudio DSP',
      description:
        'Powered by WebAssembly Audio Worklets and SoundTouchJS. The metronome, stem players, and beat sequencer run with microsecond precision to eliminate rhythmic phase drift.',
      icon: Terminal,
    },
  ];

  return (
    <section id="about" className="w-full py-20 md:py-28 bg-zinc-50 dark:bg-black relative select-none border-t border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-200/60 dark:bg-white/[0.04] border border-zinc-300/80 dark:border-white/10 mb-4 backdrop-blur-md">
            <span className="text-[11px] font-sans uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-semibold">
              Engineering Principles
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Designed for the Reality of Live Performance
          </h2>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mt-3 font-normal leading-relaxed">
            Music software should feel like a precision hardware instrument: unyielding, immediate, and trustworthy under stage lights.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-7 rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-white/20 transition-all duration-300 shadow-md dark:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-800 dark:text-white mb-5">
                    <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{pillar.title}</h3>
                  <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mt-2 font-normal leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
