import { useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import { Globe, Smartphone, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../landingUtils';
import { motion } from 'motion/react';
import SpotlightCard from './SpotlightCard';

interface LandingDownloadsProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
  apkVersion?: string;
  apkSizeBytes?: number;
  loadingRelease?: boolean;
}

export default function LandingDownloads({
  navigateTo,
  apkUrl,
  apkVersion = '3.7.8',
  apkSizeBytes,
  loadingRelease,
}: LandingDownloadsProps) {
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: isReduced ? 0 : 0.08,
      },
    },
  };

  const cardVariants = {
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
    <section
      id="downloads"
      className="py-24 border-t border-white/10 relative select-none transition-colors duration-200 bg-[#000000]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-xs font-medium text-zinc-300 mb-4 bg-white/[0.03]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Deployment & Platforms</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"
            style={{ letterSpacing: '-0.02em' }}
          >
            Access Livex Anywhere
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-zinc-400">
            Choose the target runtime that fits your gig setup. Launch the zero-install web workstation
            instantly in any browser, or download the optimized Android companion APK for dedicated stage tablets.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch"
        >
          {/* Web App (Primary Platform) */}
          <motion.div variants={cardVariants} className="h-full">
            <SpotlightCard
              className="h-full p-6 sm:p-8 bg-[#09090b]/80 border-white/10 flex flex-col justify-between"
              spotlightColor="rgba(255, 255, 255, 0.08)"
              spotlightSize={350}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-white tracking-tight">
                        Livex Web Workstation
                      </h3>
                      <span className="text-[11px] text-zinc-400">
                        Primary Cross-Platform Surface
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                    Zero-Install
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-zinc-400 mb-6">
                  Full-featured live workstation accessible immediately in Chrome, Safari, Edge, and Firefox.
                  Responsive layouts with local offline persistence and zero configuration.
                </p>

                <div className="space-y-2.5 mb-8 text-xs text-zinc-400 font-normal">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Distribution</span>
                    <span className="text-zinc-200">Production Web Track</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Target Hardware</span>
                    <span className="text-zinc-200">Desktop, Laptop & Tablets</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Installation</span>
                    <span className="text-zinc-200">Instant in Browser / PWA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Engine</span>
                    <span className="text-zinc-200">Web Audio API & WASM</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sessionStorage.setItem('livex:entered_from_landing', 'true');
                  navigateTo('/app');
                }}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs tracking-tight transition-all duration-200 active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-100"
              >
                <span>Launch Web Workstation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </SpotlightCard>
          </motion.div>

          {/* Android Companion APK */}
          <motion.div variants={cardVariants} className="h-full">
            <SpotlightCard
              className="h-full p-6 sm:p-8 bg-[#09090b]/80 border-white/10 flex flex-col justify-between"
              spotlightColor="rgba(255, 255, 255, 0.08)"
              spotlightSize={350}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-white tracking-tight">
                        Android Companion APK
                      </h3>
                      <span className="text-[11px] text-zinc-400">
                        Native Stage Shell
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Native Capacitor
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-zinc-400 mb-6">
                  Native Android app optimized for stage tablets, live prompters, and music stand rigs.
                  Built for low latency, hardware acceleration, and full offline autonomy.
                </p>

                <div className="space-y-2.5 mb-8 text-xs text-zinc-400 font-normal">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Release Channel</span>
                    <span className="font-mono text-zinc-200">v{apkVersion}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Download Size</span>
                    <span className="font-mono text-zinc-200">
                      {loadingRelease ? 'Loading...' : apkSizeBytes ? formatBytes(apkSizeBytes) : '~14 MB'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>OS Support</span>
                    <span className="text-zinc-200">Android 9.0+ (API 28+)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In-App Updater</span>
                    <span className="text-zinc-200">Native Integrity Verified</span>
                  </div>
                </div>
              </div>

              {apkUrl ? (
                <a
                  href={apkUrl}
                  className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs tracking-tight border border-white/10 hover:border-white/20 transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Download APK (v{apkVersion})</span>
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-zinc-900/50 text-zinc-500 font-medium text-xs tracking-tight border border-white/5 cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>APK Packaging In Progress</span>
                </button>
              )}
            </SpotlightCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
