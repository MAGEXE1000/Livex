import React from 'react';
import { ArrowUpRight, Download, Terminal, ShieldCheck, Sparkles } from 'lucide-react';
import TextMorph from './TextMorph';
import TextReveal from './TextReveal';

export interface LandingHeroProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
}

export default function LandingHero({ navigateTo, apkUrl }: LandingHeroProps) {
  const morphWords = [
    'Touring Bands',
    'Studio Sessions',
    'Guitarists & Bassists',
    'Vocalists & Songwriters',
    'Live Ensembles',
  ];

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-black select-none">
      {/* Subtle Hardware Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Understated Mono Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-6 backdrop-blur-md">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-300 font-medium">
            LIVEX AUDIO WORKSPACE // V4.0
          </span>
        </div>

        {/* Dynamic Display Headline with TextMorph */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] text-white max-w-4xl leading-[1.12]">
          <span>The High-Craft Audio Engine for </span>
          <br className="hidden sm:inline" />
          <TextMorph words={morphWords} intervalMs={3000} className="text-white underline decoration-white/20 underline-offset-8" />
        </h1>

        {/* Subtitle with TextReveal */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed text-pretty">
          <TextReveal
            text="Five purpose-built workstations for rehearsal, composition, and stage performance. Offline-first local DSP, WebAudio multitrack worklets, and zero-latency device sync."
            delayOffset={0.1}
          />
        </p>

        {/* Cohesive Tactile CTA Cluster (Zero fake halos) */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          {/* Primary Action: Solid Crisp Button */}
          <button
            onClick={() => navigateTo('/app')}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-xs md:text-sm font-semibold tracking-tight hover:bg-zinc-200 active:scale-[0.96] transition-all duration-150 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span>Open Web Workstation</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Secondary Action: Bordered Tactile Button */}
          {apkUrl ? (
            <a
              href={apkUrl}
              download
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-white text-xs md:text-sm font-medium tracking-tight active:scale-[0.96] transition-all duration-150 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>Download Android APK</span>
            </a>
          ) : (
            <button
              onClick={() => {
                const el = document.getElementById('modules');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-white text-xs md:text-sm font-medium tracking-tight active:scale-[0.96] transition-all duration-150 backdrop-blur-sm"
            >
              <span>Explore Workstations</span>
            </button>
          )}
        </div>

        {/* Release Coordinates Badge */}
        <div className="mt-8 flex items-center gap-3 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>v4.0.0 Web</span>
          </div>
          <span>•</span>
          <span>v3.7.8 Android APK</span>
          <span>•</span>
          <div className="flex items-center gap-1 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>SHA-256 Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
