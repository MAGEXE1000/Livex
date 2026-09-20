import { useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import { Globe, Smartphone, Monitor, Download } from 'lucide-react';
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
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase mb-4 landing-font-heading"
            style={{ color: 'var(--landing-text-primary)' }}
          >
            Deployment & Platforms
          </h2>
          <p
            className="text-xs md:text-sm leading-relaxed landing-font-body"
            style={{ color: 'var(--landing-text-secondary)' }}
          >
            Choose the best runtime version for your music setup. Open the instant Web platform or
            sideload the native Android build.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
        >
          {/* Web App */}
          <motion.div
            variants={cardVariants}
            className="p-8 rounded-2xl border flex flex-col justify-between shadow-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--landing-surface-subtle)',
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text-primary)',
                  }}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="font-bold text-sm uppercase tracking-wide landing-font-heading"
                    style={{ color: 'var(--landing-text-primary)' }}
                  >
                    Livex Web
                  </h3>
                  <span
                    className="text-[9px] uppercase tracking-widest font-bold landing-font-heading"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    Instant Sandbox
                  </span>
                </div>
              </div>
              <p
                className="text-xs leading-relaxed mb-6 landing-font-body"
                style={{ color: 'var(--landing-text-secondary)' }}
              >
                Mount the fully adaptive responsive client directly in any browser. Supports active
                syncing and full layout custom sizing.
              </p>
              <div
                className="space-y-2.5 mb-8 text-[10px] uppercase font-semibold tracking-wider landing-font-heading"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>Version</span>
                  <span style={{ color: 'var(--landing-text-primary)' }}>4.0.0</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>Requirements</span>
                  <span style={{ color: 'var(--landing-text-primary)' }}>Modern Browser</span>
                </div>
                <div className="flex justify-between">
                  <span>Hot Updates</span>
                  <span style={{ color: 'var(--landing-text-secondary)' }}>Automatic</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem('livex:entered_from_landing', 'true');
                navigateTo('/app');
              }}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm landing-font-heading cursor-pointer"
              style={{
                backgroundColor: 'var(--landing-cta-bg)',
                color: 'var(--landing-cta-text)',
              }}
            >
              Use Livex Web
            </button>
          </motion.div>

          {/* Android APK */}
          <motion.div
            variants={cardVariants}
            className="p-8 rounded-2xl border flex flex-col justify-between shadow-xl relative transition-all duration-200"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--landing-surface-subtle)',
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text-primary)',
                  }}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="font-bold text-sm uppercase tracking-wide landing-font-heading"
                    style={{ color: 'var(--landing-text-primary)' }}
                  >
                    Android Client
                  </h3>
                  <span
                    className="text-[9px] uppercase tracking-widest font-bold landing-font-heading"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    Direct Install
                  </span>
                </div>
              </div>
              <p
                className="text-xs leading-relaxed mb-6 landing-font-body"
                style={{ color: 'var(--landing-text-secondary)' }}
              >
                Install the companion APK for tablets, touch displays, and handheld hardware.
                Optimized for offline stage setups.
              </p>
              <div
                className="space-y-2.5 mb-8 text-[10px] uppercase font-semibold tracking-wider landing-font-heading"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>APK Version</span>
                  <span style={{ color: 'var(--landing-text-primary)' }}>{apkVersion}</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>Download Size</span>
                  <span style={{ color: 'var(--landing-text-primary)' }}>
                    {loadingRelease ? '~13.5 MB' : formatBytes(apkSizeBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Target</span>
                  <span style={{ color: 'var(--landing-text-primary)' }}>Android 8.0+</span>
                </div>
              </div>
            </div>
            <div>
              {apkUrl ? (
                <a
                  href={apkUrl}
                  className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm landing-font-heading cursor-pointer"
                  style={{
                    backgroundColor: 'var(--landing-cta-bg)',
                    color: 'var(--landing-cta-text)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download Android APK
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl border cursor-not-allowed landing-font-heading opacity-50"
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
                * Note: Sideloading direct APK builds requires allowing Unknown App Installation in
                Android developer settings.
              </p>
            </div>
          </motion.div>

          {/* Windows App */}
          <motion.div
            variants={cardVariants}
            className="p-8 rounded-2xl border flex flex-col justify-between shadow-xl opacity-75 transition-all duration-200"
            style={{
              backgroundColor: 'var(--landing-surface-card)',
              borderColor: 'var(--landing-border)',
            }}
          >
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--landing-surface-subtle)',
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text-muted)',
                  }}
                >
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="font-bold text-sm uppercase tracking-wide landing-font-heading"
                    style={{ color: 'var(--landing-text-secondary)' }}
                  >
                    Windows Desktop
                  </h3>
                  <span
                    className="text-[9px] uppercase tracking-widest font-bold landing-font-heading"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    Auto-Updating EXE
                  </span>
                </div>
              </div>
              <p
                className="text-xs leading-relaxed mb-6 landing-font-body"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                Auto-updating desktop wrapper for band rooms, keyboard desks, and sound consoles. In
                active prototype phase.
              </p>
              <div
                className="space-y-2.5 mb-8 text-[10px] uppercase font-semibold tracking-wider landing-font-heading"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>EXE Status</span>
                  <span>In Development</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--landing-border)' }}>
                  <span>Architecture</span>
                  <span>x64 / ARM64</span>
                </div>
                <div className="flex justify-between">
                  <span>OS Target</span>
                  <span>Windows 10/11</span>
                </div>
              </div>
            </div>
            <button
              disabled
              className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl border cursor-not-allowed landing-font-heading opacity-50"
              style={{
                backgroundColor: 'var(--landing-surface-subtle)',
                color: 'var(--landing-text-muted)',
                borderColor: 'var(--landing-border)',
              }}
            >
              Coming Soon
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
