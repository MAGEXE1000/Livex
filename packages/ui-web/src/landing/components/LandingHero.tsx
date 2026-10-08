import React from 'react';
import { ArrowRight, Download, ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useLivexPreferences } from '@workspace/livex-core';
import FluidBadge from './FluidBadge';

interface LandingHeroProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
}

export default function LandingHero({ navigateTo, apkUrl }: LandingHeroProps) {
  const { preferences } = useLivexPreferences();
  const isReduced = preferences.reduceMotion;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: isReduced ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: isReduced ? 0 : 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.55,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-sky-500/10 via-purple-500/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        {/* Status / Category Badge */}
        <motion.div variants={itemVariants} className="inline-flex items-center mb-6">
          <FluidBadge variant="accent" pulse>
            Livex Platform Suite • Next-Gen Audio Workspace
          </FluidBadge>
        </motion.div>

        {/* High-Impact Title Case Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.06] mb-6"
          style={{ letterSpacing: '-0.025em' }}
        >
          The Rehearsal & Live
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Performance Engine.
          </span>
        </motion.h1>

        {/* Value Subtitle */}
        <motion.p
          variants={itemVariants}
          className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-zinc-400 mb-10 font-normal"
        >
          Low-latency multitrack stem isolation, dynamic chord teleprompting, polyphonic beat sequencing,
          sub-cent vocal calibration, and synchronized stage plots in one unified workstation.
        </motion.p>

        {/* CTA Cluster */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto"
        >
          {/* Primary Action with Sheen Highlight */}
          <button
            onClick={() => {
              sessionStorage.setItem('livex:entered_from_landing', 'true');
              navigateTo('/app');
            }}
            className="group relative w-full sm:w-auto px-7 h-12 rounded-xl bg-white text-black font-semibold text-xs tracking-tight flex items-center justify-center gap-2 overflow-hidden shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:shadow-[0_0_32px_rgba(255,255,255,0.28)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            {/* Subtle Sheen Highlight animation */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform" />
            <span className="relative z-10">Open Web Workstation</span>
            <ArrowRight className="w-3.5 h-3.5 relative z-10 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Secondary Action: Download Android APK */}
          {apkUrl ? (
            <a
              href={apkUrl}
              className="w-full sm:w-auto px-6 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 text-white font-medium text-xs tracking-tight border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Download Android APK</span>
            </a>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 h-12 rounded-xl bg-zinc-900/50 text-zinc-500 font-medium text-xs tracking-tight border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK Packaging</span>
            </button>
          )}

          {/* Direct Link to Privacy Policy */}
          <button
            onClick={() => navigateTo('/privacy')}
            className="w-full sm:w-auto px-4 h-12 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Privacy Policy</span>
            <span className="text-zinc-600">→</span>
          </button>
        </motion.div>

        {/* Feature Badges Under CTA */}
        <motion.div
          variants={itemVariants}
          className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web Audio & WASM Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>5 Specialized Workstations</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Zero Cloud Lock-in</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
