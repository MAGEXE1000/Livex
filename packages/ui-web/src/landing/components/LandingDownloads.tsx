import { useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import { Globe, Smartphone, Download, ArrowRight } from 'lucide-react';
import { formatBytes } from '../landingUtils';
import { motion } from 'motion/react';

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
  apkVersion = '3.6.28',
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
      y: isReduced ? 0 : 20,
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
      className="py-24 border-t relative select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--landing-surface-subtle)',
        borderColor: 'var(--landing-border)',
      }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-widest font-bold mb-5 select-none landing-font-heading"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
              color: 'var(--landing-text-secondary)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Deployment & Platforms
          </div>
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-4 landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Access Livex Anywhere
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Choose the best runtime for your music setup. Launch the instant Web workstation in any
            modern browser, or sideload the native Android companion APK for dedicated stage tablets.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch"
        >
          {/* Web App (Primary Platform) */}
          <motion.div
            variants={cardVariants}
            className="p-1.5 rounded-2xl border flex flex-col shadow-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <div
              className="p-8 rounded-xl flex flex-col justify-between h-full border"
              style={{
                backgroundColor: 'var(--landing-surface-subtle)',
                borderColor: 'var(--landing-border-subtle)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--landing-surface-card)',
                        borderColor: 'var(--landing-border)',
                        color: 'var(--landing-text-primary)',
                      }}
                    >
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-base uppercase tracking-wide landing-font-heading"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        Livex Web
                      </h3>
                      <span
                        className="text-[9px] uppercase tracking-widest font-bold landing-font-heading"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        Primary Platform
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Recommended
                  </span>
                </div>

                <p
                  className="text-xs leading-relaxed mb-6 landing-font-body"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  Full-featured live workstation accessible instantly in any browser. Responsive
                  desktop and tablet layouts, offline caching, and real-time cloud synchronization.
                </p>

                <div
                  className="space-y-2.5 mb-8 text-[10px] uppercase font-semibold tracking-wider landing-font-heading"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>Version</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>4.0.0</span>
                  </div>
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>Requirements</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>Modern Browser</span>
                  </div>
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>Installation</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>Instant / Zero-Install</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updates</span>
                    <span style={{ color: 'var(--landing-text-secondary)' }}>Automatic</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sessionStorage.setItem('livex:entered_from_landing', 'true');
                  navigateTo('/app');
                }}
                className="w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md landing-font-heading flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--landing-cta-bg)',
                  color: 'var(--landing-cta-text)',
                }}
              >
                Use Livex Web
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Android Companion APK */}
          <motion.div
            variants={cardVariants}
            className="p-1.5 rounded-2xl border flex flex-col shadow-xl relative transition-all duration-200"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <div
              className="p-8 rounded-xl flex flex-col justify-between h-full border"
              style={{
                backgroundColor: 'var(--landing-surface-subtle)',
                borderColor: 'var(--landing-border-subtle)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--landing-surface-card)',
                        borderColor: 'var(--landing-border)',
                        color: 'var(--landing-text-primary)',
                      }}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-base uppercase tracking-wide landing-font-heading"
                        style={{ color: 'var(--landing-text-primary)' }}
                      >
                        Android Client
                      </h3>
                      <span
                        className="text-[9px] uppercase tracking-widest font-bold landing-font-heading"
                        style={{ color: 'var(--landing-text-muted)' }}
                      >
                        Native Companion APK
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    Sideload
                  </span>
                </div>

                <p
                  className="text-xs leading-relaxed mb-6 landing-font-body"
                  style={{ color: 'var(--landing-text-secondary)' }}
                >
                  Direct APK package for Android tablets, touchscreen monitors, and phones.
                  Optimized for offline performance and low-latency audio in rehearsal and live gigs.
                </p>

                <div
                  className="space-y-2.5 mb-8 text-[10px] uppercase font-semibold tracking-wider landing-font-heading"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>APK Version</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>v{apkVersion}</span>
                  </div>
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>Download Size</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>
                      {loadingRelease ? '~13.5 MB' : formatBytes(apkSizeBytes)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between border-b pb-2"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <span>Minimum Target</span>
                    <span style={{ color: 'var(--landing-text-primary)' }}>Android 8.0+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Architecture</span>
                    <span style={{ color: 'var(--landing-text-secondary)' }}>Universal APK</span>
                  </div>
                </div>
              </div>

              <div>
                {apkUrl ? (
                  <a
                    href={apkUrl}
                    className="w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-md landing-font-heading cursor-pointer"
                    style={{
                      backgroundColor: 'var(--landing-secondary-btn-bg)',
                      color: 'var(--landing-secondary-btn-text)',
                      borderColor: 'var(--landing-secondary-btn-border)',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download Android APK
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl border cursor-not-allowed landing-font-heading opacity-50"
                    style={{
                      backgroundColor: 'var(--landing-surface-subtle)',
                      color: 'var(--landing-text-muted)',
                      borderColor: 'var(--landing-border)',
                    }}
                  >
                    APK Unavailable
                  </button>
                )}
                <p
                  className="text-[9px] text-center mt-3 leading-normal landing-font-body"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  * Sideloading requires enabling &ldquo;Install Unknown Apps&rdquo; in Android security
                  settings.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
