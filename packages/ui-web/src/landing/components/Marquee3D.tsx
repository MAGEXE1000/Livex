import React from 'react';
import { useStudioPreferences } from '@workspace/livex-core';
import { TiltedGridHero, TiltedGridImage } from '../../components/ui/tilted-grid-hero';

const CAPTURES: TiltedGridImage[] = [
  {
    src: '/screenshots/groovex-stems.png',
    alt: 'Groovex 5-Stem WebAssembly DSP Mixer',
  },
  {
    src: '/screenshots/chordex-fretboard.png',
    alt: 'Chordex Harmonic Fretboard & Transposition Engine',
  },
  {
    src: '/screenshots/drumex-sequencer.png',
    alt: 'Drumex 16-Step Polyphonic Rhythm Sequencer',
  },
  {
    src: '/screenshots/stagex-plot.png',
    alt: 'Stagex Spatial Stage Coordinates & Rider',
  },
  {
    src: '/screenshots/vocalex-pitch.png',
    alt: 'Vocalex Continuous Pitch & Formant Detection',
  },
  {
    src: '/screenshots/live-prompter.png',
    alt: 'Live Teleprompter Quantized Lyric & Chord Scroll',
  },
  {
    src: '/screenshots/hub-workspace.png',
    alt: 'Livex Studio Hub Unified Production Workspace',
  },
];

export default function Marquee3D() {
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  return (
    <section
      id="showcase"
      className="w-full overflow-hidden py-16 md:py-24 relative select-none bg-zinc-50 dark:bg-black border-t border-b border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-200"
    >
      {/* Section Header */}
      <div className="max-w-5xl mx-auto px-6 mb-8 text-center relative z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-200/60 dark:bg-white/[0.04] border border-zinc-300/80 dark:border-white/10 mb-4 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-sans uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-semibold">
            Workstations in Motion
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Production Hardware & Software in Continuous Motion
        </h2>
        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mt-2 font-normal leading-relaxed">
          High-performance audio tools engineered without artificial layers. Real WebAssembly multitrack stems, hardware-accurate drum sequencers, and live chord prompters orbiting in continuous cylindrical 3D rotation.
        </p>
      </div>

      {/* Radical Lateral Edge Gradient Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 z-20 pointer-events-none bg-gradient-to-r from-zinc-50 via-zinc-50/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 z-20 pointer-events-none bg-gradient-to-l from-zinc-50 via-zinc-50/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent" />

      {/* 3D Cylindrical Curved Orbit Showcase */}
      <div className="relative w-full flex justify-center items-center overflow-hidden">
        <TiltedGridHero
          images={CAPTURES}
          speed={isReduced ? 0 : 16}
          tileHeight={30}
          aspectRatio={16 / 9}
          gap={7}
          axis={54}
          curve={76}
          fade={14}
          className="w-full h-[460px] sm:h-[540px] md:h-[620px]"
        />
      </div>
    </section>
  );
}
