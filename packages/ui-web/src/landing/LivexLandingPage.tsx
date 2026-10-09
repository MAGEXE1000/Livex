import { useStudioPreferences } from '@workspace/livex-core';
import { LivexLogo } from '@workspace/ui-shared';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ResizableNavbar from './components/ResizableNavbar';
import LandingHero from './components/LandingHero';
import GlassIcons from './components/GlassIcons';
import Marquee3D from './components/Marquee3D';
import WorkstationBentoGrid from './components/WorkstationBentoGrid';
import LandingPricing from './components/LandingPricing';
import LandingAbout from './components/LandingAbout';
import LandingFooter from './components/LandingFooter';

export interface LivexLandingPageProps {
  navigateTo: (path: string) => void;
}

export type StudioLandingPageProps = LivexLandingPageProps;

interface ReleaseInfo {
  version: string;
  apkUrl: string;
  apkSizeBytes?: number;
}

export default function LivexLandingPage({ navigateTo }: LivexLandingPageProps) {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !(
      sessionStorage.getItem('livex:landingIntroSeen') ??
      sessionStorage.getItem('studio:landingIntroSeen')
    );
  });

  const [introStep, setIntroStep] = useState<'logo-in' | 'logo-hold' | 'logo-out' | 'done'>(() => {
    if (typeof window === 'undefined') return 'done';
    if (
      sessionStorage.getItem('livex:landingIntroSeen') ??
      sessionStorage.getItem('studio:landingIntroSeen')
    )
      return 'done';
    return 'logo-in';
  });

  useEffect(() => {
    if (introStep === 'done') {
      setShowIntro(false);
      return;
    }

    if (isReduced) {
      sessionStorage.setItem('livex:landingIntroSeen', 'true');
      setShowIntro(false);
      setIntroStep('done');
      return;
    }

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    if (introStep === 'logo-in') {
      t1 = setTimeout(() => {
        setIntroStep('logo-hold');
      }, 450);
    } else if (introStep === 'logo-hold') {
      t2 = setTimeout(() => {
        setIntroStep('logo-out');
      }, 650);
    } else if (introStep === 'logo-out') {
      t3 = setTimeout(() => {
        sessionStorage.setItem('livex:landingIntroSeen', 'true');
        setIntroStep('done');
        setShowIntro(false);
      }, 500);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [introStep, isReduced]);

  useEffect(() => {
    fetch('/app-release.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setRelease({
          version: data.version || data.versionName || '3.7.8',
          apkUrl:
            data.apkUrl ||
            data.download_url ||
            'https://github.com/MAGEXE1000/Livex/releases/download/v3.7.8/studio-3.7.8.apk',
          apkSizeBytes: data.apkSizeBytes || 14125258,
        });
        setLoadingRelease(false);
      })
      .catch(() => {
        setRelease({
          version: '3.7.8',
          apkUrl:
            'https://github.com/MAGEXE1000/Livex/releases/download/v3.7.8/studio-3.7.8.apk',
          apkSizeBytes: 14125258,
        });
        setLoadingRelease(false);
      });
  }, []);

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
              animate={
                introStep === 'logo-in'
                  ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                  : introStep === 'logo-hold'
                    ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                    : { opacity: 0, scale: 0.96, filter: 'blur(2px)' }
              }
              transition={{ duration: introStep === 'logo-out' ? 0.4 : 0.45, ease: 'easeInOut' }}
              className="text-white flex flex-col items-center gap-4"
            >
              <LivexLogo size={72} />
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={introStep !== 'logo-out' ? { opacity: 0.6, y: 0 } : { opacity: 0, y: -2 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="text-xs uppercase tracking-[0.24em] font-semibold text-zinc-400 select-none font-mono"
              >
                Livex Audio
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={showIntro ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen font-sans selection:bg-white/20 selection:text-white overflow-x-hidden bg-black text-white"
      >
        {/* 1. Floating Resizable Navbar (Aceternity UI style) */}
        <ResizableNavbar navigateTo={navigateTo} />

        {/* 2. Animated Hero Section with Text Morph & Text Reveal */}
        <LandingHero navigateTo={navigateTo} apkUrl={release?.apkUrl} />

        {/* 3. Functional Glass Icons (ReactBits style) */}
        <GlassIcons navigateTo={navigateTo} />

        {/* 4. 3D Marquee Showcase with Real Screenshots (Aceternity UI style) */}
        <Marquee3D />

        {/* 5. Information-Dense Bento Grid (Aceternity UI style) */}
        <WorkstationBentoGrid navigateTo={navigateTo} />

        {/* 6. Restrained Pricing Tiers */}
        <LandingPricing navigateTo={navigateTo} apkUrl={release?.apkUrl} />

        {/* 7. Musician-First About Section */}
        <LandingAbout />

        {/* 8. Pure AMOLED Footer with Verified Privacy Policy Link */}
        <LandingFooter
          navigateTo={navigateTo}
          apkUrl={release?.apkUrl}
          apkVersion={release?.version}
        />
      </motion.div>
    </>
  );
}

export const StudioLandingPage = LivexLandingPage;
