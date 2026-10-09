import React from 'react';
import { ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useLivexPreferences } from '@workspace/livex-core';

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
      y: isReduced ? 0 : 12,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.45,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 select-none bg-black overflow-hidden">
      {/* Subtle hairline architectural grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none opacity-50" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        {/* Single, understated mono eyebrow */}
        <motion.div variants={itemVariants} className="inline-flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-zinc-500 uppercase px-3 py-1 rounded border border-white/[0.08] bg-[#0c0c0e]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span>LIVEX AUDIO WORKSPACE // V4.0</span>
          </div>
        </motion.div>

        {/* Crisp, high-contrast headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.035em] text-white leading-[1.04] mb-6 max-w-3xl mx-auto"
        >
          The Rehearsal & Live
          <br />
          <span className="text-zinc-400">
            Performance Engine.
          </span>
        </motion.h1>

        {/* Purposeful value subtitle */}
        <motion.p
          variants={itemVariants}
          className="max-w-2xl mx-auto text-base sm:text-lg leading-[1.6] text-zinc-400 mb-10 font-normal"
        >
          Low-latency multitrack stem isolation, dynamic chord teleprompting, polyphonic beat sequencing,
          sub-cent vocal calibration, and synchronized stage plots in one unified workstation.
        </motion.p>

        {/* Tactile, cohesive CTA Row */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 max-w-xl mx-auto"
        >
          {/* Primary Action: Solid white tactile button (zero artificial blurry glow) */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('livex:entered_from_landing', 'true');
              navigateTo('/app');
            }}
            className="group w-full sm:w-auto px-6 h-11 rounded-md bg-white text-black font-medium text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors duration-150 active:scale-[0.96] cursor-pointer shadow-xs"
          >
            <span>Open Web Workstation</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Secondary Action: Bordered dark anodized button */}
          {apkUrl ? (
            <a
              href={apkUrl}
              className="w-full sm:w-auto px-5 h-11 rounded-md bg-[#111114] hover:bg-[#18181c] text-white font-medium text-xs tracking-tight border border-white/15 hover:border-white/25 flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.96] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Download Android APK</span>
            </a>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-5 h-11 rounded-md bg-[#111114]/60 text-zinc-500 font-medium text-xs tracking-tight border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK Packaging</span>
            </button>
          )}

          {/* Direct clean text link to Privacy Policy */}
          <button
            type="button"
            onClick={() => navigateTo('/privacy')}
            className="w-full sm:w-auto px-3.5 h-11 rounded-md text-xs font-mono text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Privacy Policy</span>
            <span className="text-zinc-600">→</span>
          </button>
        </motion.div>

        {/* Technical specs strip under CTA */}
        <motion.div
          variants={itemVariants}
          className="mt-14 pt-8 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-[11px] font-mono text-zinc-500"
        >
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 font-bold">[ 01 ]</span>
            <span className="text-zinc-300">WEB AUDIO & WASM WORKLETS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 font-bold">[ 02 ]</span>
            <span className="text-zinc-300">5 UNIFIED STAGE WORKSTATIONS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 font-bold">[ 03 ]</span>
            <span className="text-zinc-300">100% OFFLINE CAPABLE</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
