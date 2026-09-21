import { useLivexPreferences, useStudioPreferences } from '@workspace/livex-core';
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LandingLinkPreview from './LandingLinkPreview';

interface LandingHeroProps {
  navigateTo: (path: string) => void;
  apkUrl?: string;
}

function FlipWords({
  words,
  duration = 3000,
  className,
  isReduced = false,
}: {
  words: string[];
  duration?: number;
  className?: string;
  isReduced?: boolean;
}) {
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const longestWord = React.useMemo(() => {
    const getWeight = (word: string) => {
      return word.split('').reduce((sum, char) => {
        const c = char.toLowerCase();
        if (c === 'w' || c === 'm') return sum + 1.4;
        if (c === 'o' || c === 'd' || c === 'g' || c === 'p' || c === 'q' || c === 'b' || c === 'u')
          return sum + 1.1;
        if (c === 'i' || c === 'l' || c === 't' || c === 'f' || c === 'j') return sum + 0.5;
        return sum + 0.9;
      }, 0);
    };
    return words.reduce((best, current) => {
      return getWeight(current) > getWeight(best) ? current : best;
    }, words[0]);
  }, [words]);

  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (isReduced || isAnimating) {
      return undefined;
    }
    const timer = setTimeout(() => {
      startAnimation();
    }, duration);
    return () => clearTimeout(timer);
  }, [isAnimating, duration, startAnimation, isReduced]);

  if (isReduced) {
    return <span className={className}>{currentWord}</span>;
  }

  return (
    <span className="inline-block relative text-center">
      <span
        className={`${className} invisible select-none pointer-events-none`}
        style={{ display: 'inline-block' }}
      >
        {longestWord}
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence
          onExitComplete={() => {
            setIsAnimating(false);
          }}
        >
          <motion.span
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
              position: 'absolute',
              left: 0,
              right: 0,
            }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={className}
            style={{ display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' }}
            key={currentWord}
          >
            {currentWord}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
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
      y: isReduced ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isReduced ? 0 : 0.65,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section
      className="relative pt-24 pb-20 px-6 overflow-hidden select-none transition-colors duration-200"
      style={{ backgroundColor: 'var(--landing-bg)' }}
    >
      {/* Premium Minimal Grid Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Subtle Minimal Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-zinc-500/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        {/* Upper Brand tag */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-widest font-bold mb-8 select-none landing-font-heading"
          style={{
            backgroundColor: 'var(--landing-surface-subtle)',
            borderColor: 'var(--landing-border)',
            color: 'var(--landing-text-secondary)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Livex Platform Suite v4.0
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08] uppercase landing-font-heading"
          style={{ color: 'var(--landing-text-primary)' }}
        >
          Your music workflow, <br />
          <span style={{ color: 'var(--landing-text-muted)' }}>
            in one{' '}
            <FlipWords
              words={[
                'focused',
                'unified',
                'creative',
                'seamless',
                'powerful',
                'polished',
                'flexible',
                'complete',
                'elevated',
                'modern',
              ]}
              isReduced={isReduced}
              className="font-extrabold"
            />{' '}
            workspace.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="max-w-xl mx-auto text-sm md:text-base leading-relaxed mb-10 landing-font-body"
          style={{ color: 'var(--landing-text-secondary)' }}
        >
          Livex brings songs, chords, stage planning, groove practice, and vocal tools into a
          single cross-platform workspace. Built for instant performance.
        </motion.p>

        {/* Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto landing-font-heading"
        >
          <LandingLinkPreview
            src="/desktop_hub.png"
            isReduced={isReduced}
            className="w-full sm:w-auto"
          >
            <button
              onClick={() => {
                sessionStorage.setItem('livex:entered_from_landing', 'true');
                navigateTo('/app');
              }}
              className="w-full sm:w-[180px] h-12 text-xs uppercase tracking-wider font-bold rounded-xl border border-transparent flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-md cursor-pointer"
              style={{
                backgroundColor: 'var(--landing-cta-bg)',
                color: 'var(--landing-cta-text)',
              }}
            >
              Use Livex Web
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </LandingLinkPreview>

          {apkUrl ? (
            <a
              href={apkUrl}
              className="w-full sm:w-[180px] h-12 text-xs uppercase tracking-wider font-bold rounded-xl border flex items-center justify-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--landing-secondary-btn-bg)',
                color: 'var(--landing-secondary-btn-text)',
                borderColor: 'var(--landing-secondary-btn-border)',
              }}
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--landing-text-secondary)' }} />
              Download APK
            </a>
          ) : (
            <button
              disabled
              className="w-full sm:w-[180px] h-12 text-xs uppercase tracking-wider font-bold rounded-xl border cursor-not-allowed flex items-center justify-center gap-2 opacity-50"
              style={{
                backgroundColor: 'var(--landing-surface-subtle)',
                color: 'var(--landing-text-muted)',
                borderColor: 'var(--landing-border)',
              }}
            >
              APK Unavailable
            </button>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
