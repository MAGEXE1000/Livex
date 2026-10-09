import React from 'react';
import { useStudioPreferences } from '@workspace/livex-core';
import { Sliders, Music, Radio, Users, Mic, Activity } from 'lucide-react';

interface MarqueeItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  src: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TRACK_1: MarqueeItem[] = [
  {
    id: 'groovex',
    title: 'Groovex Multitrack',
    subtitle: '5-Stem WebAssembly DSP Mixer',
    badge: 'Audio Worklet',
    src: '/screenshots/groovex-stems.png',
    icon: Sliders,
  },
  {
    id: 'chordex',
    title: 'Chordex Fretboard',
    subtitle: 'Harmonic Roman & Nashville Transposition',
    badge: 'Realtime Engine',
    src: '/screenshots/chordex-fretboard.png',
    icon: Music,
  },
  {
    id: 'drumex',
    title: 'Drumex Sequencer',
    subtitle: '16-Step Polyphonic Rhythm Grid',
    badge: 'Hardware Kits',
    src: '/screenshots/drumex-sequencer.png',
    icon: Radio,
  },
  {
    id: 'stagex',
    title: 'Stagex Plotter',
    subtitle: 'Spatial Stage Coordinates & Rider',
    badge: 'Multi-Device',
    src: '/screenshots/stagex-plot.png',
    icon: Users,
  },
];

const TRACK_2: MarqueeItem[] = [
  {
    id: 'vocalex',
    title: 'Vocalex Monitor',
    subtitle: 'Continuous Pitch & Formant Detection',
    badge: 'YIN / Cents Dev',
    src: '/screenshots/vocalex-pitch.png',
    icon: Mic,
  },
  {
    id: 'prompter',
    title: 'Live Teleprompter',
    subtitle: 'Quantized Lyric & Chord Scroll',
    badge: 'Audio Clock Sync',
    src: '/screenshots/live-prompter.png',
    icon: Activity,
  },
  {
    id: 'hub',
    title: 'Livex Studio Hub',
    subtitle: 'Unified Audio Production Workspace',
    badge: 'Local-First Sync',
    src: '/screenshots/hub-workspace.png',
    icon: Sliders,
  },
  {
    id: 'groovex-alt',
    title: 'Multitrack Stems',
    subtitle: 'Isolated Click, Guitars, Bass & Drums',
    badge: 'Lossless Audio',
    src: '/screenshots/groovex-stems.png',
    icon: Sliders,
  },
];

export default function Marquee3D() {
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  // Tripled lists to ensure uninterrupted infinite scrolling loop
  const list1 = [...TRACK_1, ...TRACK_1, ...TRACK_1];
  const list2 = [...TRACK_2, ...TRACK_2, ...TRACK_2];

  const renderCard = (item: MarqueeItem, key: string | number) => {
    const Icon = item.icon;
    return (
      <div
        key={key}
        className="w-[320px] sm:w-[400px] md:w-[460px] h-[210px] sm:h-[250px] md:h-[280px] rounded-2xl border border-white/10 bg-zinc-950/90 p-2.5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-md flex-shrink-0 group hover:border-white/25 transition-all duration-300 select-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Real Screenshot Viewport */}
        <div className="relative flex-1 w-full rounded-xl overflow-hidden bg-black border border-white/[0.08]">
          <img
            src={item.src}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            onError={(e) => {
              // Fallback to avoid broken image frame if path differs
              (e.currentTarget as HTMLElement).style.opacity = '0.7';
            }}
          />
          {/* Subtle vignette sheen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Module Pill Tag */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/80 border border-white/15 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-300 font-medium">
              {item.badge}
            </span>
          </div>
        </div>

        {/* Card Metadata Footer */}
        <div className="pt-2 px-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight leading-none">
                {item.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-normal line-clamp-1">
                {item.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id="showcase"
      className="w-full overflow-hidden py-16 md:py-24 relative select-none bg-black border-t border-b border-white/[0.08]"
    >
      {/* Section Header */}
      <div className="max-w-5xl mx-auto px-6 mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-4">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            Real Workstation Views // 0% Mocks
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
          Production Hardware & Software in One Glass Surface
        </h2>
        <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mt-2 font-normal leading-relaxed">
          High-performance audio tools engineered without artificial layers. Real WebAssembly multitrack stems, hardware-accurate drum sequencers, and live chord prompters.
        </p>
      </div>

      {/* Radical Edge Gradient Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 z-20 pointer-events-none bg-gradient-to-r from-black via-black/80 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 z-20 pointer-events-none bg-gradient-to-l from-black via-black/80 to-transparent" />

      {/* 3D Perspective Projection Container */}
      <div
        className="w-full flex flex-col gap-6 py-4"
        style={{ perspective: isReduced ? 'none' : '1100px' }}
      >
        <div
          className="flex flex-col gap-6"
          style={{
            transform: isReduced ? 'none' : 'rotateX(13deg) rotateY(-8deg) rotateZ(2deg)',
            transformStyle: 'preserve-3d',
            width: '100%',
          }}
        >
          {/* Top Marquee Track: Scrolls Left */}
          <div className="animate-marquee-scroll flex gap-6">
            {list1.map((item, idx) => renderCard(item, `t1-${idx}`))}
          </div>

          {/* Bottom Marquee Track: Scrolls Right */}
          <div className="animate-marquee-scroll-reverse flex gap-6">
            {list2.map((item, idx) => renderCard(item, `t2-${idx}`))}
          </div>
        </div>
      </div>
    </section>
  );
}
