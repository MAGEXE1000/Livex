import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useStudioPreferences } from '@workspace/livex-core';
import {
  GroovexLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogo,
  VocalexLogo,
} from '@workspace/ui-shared';

interface GlassItem {
  id: string;
  name: string;
  role: string;
  stat: string;
  accent: string;
  glowColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ITEMS: GlassItem[] = [
  {
    id: 'groovex',
    name: 'Groovex',
    role: 'Multitrack Stems',
    stat: '5 Audio Stems',
    accent: 'text-emerald-500 dark:text-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    icon: GroovexLogo,
  },
  {
    id: 'chordex',
    name: 'Chordex',
    role: 'Harmonic Engine',
    stat: '400+ Chords',
    accent: 'text-blue-500 dark:text-blue-400',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    icon: ChordexLogo,
  },
  {
    id: 'drumex',
    name: 'Drumex',
    role: '16-Step Beats',
    stat: '12 Hardware Kits',
    accent: 'text-pink-500 dark:text-pink-400',
    glowColor: 'rgba(236, 72, 153, 0.15)',
    icon: DrumexLogo,
  },
  {
    id: 'stagex',
    name: 'Stagex',
    role: 'Stage Plots',
    stat: 'Spatial Audio',
    accent: 'text-cyan-500 dark:text-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.15)',
    icon: StagexLogo,
  },
  {
    id: 'vocalex',
    name: 'Vocalex',
    role: 'Pitch Monitor',
    stat: 'Cents Accuracy',
    accent: 'text-amber-500 dark:text-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    icon: VocalexLogo,
  },
];

function GlassTile({
  item,
  onSelect,
}: {
  item: GlassItem;
  onSelect: (id: string) => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;

    setRotate({ x: rotX, y: rotY });
    setSpotlight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.18,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  const Icon = item.icon;

  return (
    <motion.button
      ref={cardRef}
      onClick={() => onSelect(item.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: rotate.x,
        rotateY: rotate.y,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{
        transformStyle: 'preserve-3d',
      }}
      className="relative p-5 rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl flex flex-col justify-between text-left group hover:border-zinc-300 dark:hover:border-white/25 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md dark:shadow-lg overflow-hidden select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/40 cursor-pointer"
      aria-label={`Explore ${item.name} workstation`}
    >
      {/* Dynamic Specular Spotlight Sheen */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,${spotlight.opacity}), transparent 70%)`,
        }}
      />

      {/* Layered Glass Linear Ambient Gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${item.glowColor}, transparent 70%)`,
        }}
      />

      {/* Top Row: Icon + Stat */}
      <div className="flex items-center justify-between w-full mb-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/15 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:border-zinc-300 dark:group-hover:border-white/30 transition-all shadow-inner">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-mono tracking-wider text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 uppercase font-medium bg-zinc-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-white/[0.08]">
          {item.stat}
        </span>
      </div>

      {/* Bottom Row: Name + Subtitle */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
            {item.name}
          </h4>
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal line-clamp-1">
          {item.role}
        </p>
      </div>
    </motion.button>
  );
}

export default function GlassIcons({
  navigateTo,
}: {
  navigateTo?: (path: string) => void;
}) {
  const handleSelect = (id: string) => {
    if (navigateTo) {
      navigateTo('/app');
    } else {
      const bento = document.getElementById('bento');
      if (bento) {
        bento.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="modules" className="w-full py-12 bg-zinc-50 dark:bg-black relative select-none transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400 font-semibold">
              Tactile Workstation Glass Controls
            </h3>
          </div>
        </div>

        {/* 5 Glass Icon Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {ITEMS.map((item) => (
            <GlassTile key={item.id} item={item} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
