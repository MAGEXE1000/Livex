import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  type AppKey,
  useApplicationTransitionStore,
  type CardMorphSourceRect,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { triggerIntroReveal } from './introSignal';
import {
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
  LivexLogo,
} from '../../features/chordex/icons/ChordexLogo';

interface TransitionEngineProps {
  appKey: AppKey;
  preloaded: boolean;
  onComplete: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
  sourceRect?: CardMorphSourceRect | null;
}

interface AppVisualProfile {
  name: string;
  Logo: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}

const APP_PROFILES: Record<string, AppVisualProfile> = {
  chordex: {
    name: 'Chordex',
    Logo: ChordexLogo,
  },
  drumex: {
    name: 'Drumex',
    Logo: DrumexLogo,
  },
  stagex: {
    name: 'Stagex',
    Logo: StagexLogoIcon,
  },
  groovex: {
    name: 'Groovex',
    Logo: GroovexLogo,
  },
  vocalex: {
    name: 'Vocalex',
    Logo: VocalexLogo,
  },
};

const DEFAULT_PROFILE: AppVisualProfile = {
  name: 'Livex',
  Logo: LivexLogo,
};

export function ApplicationTransitionEngine({
  appKey,
  preloaded,
  onComplete,
  isLight = false,
  isAmoled = false,
}: TransitionEngineProps) {
  const completeTransition = useApplicationTransitionStore((s) => s.completeTransition);
  const setLogoFormed = useApplicationTransitionStore((s) => s.setLogoFormed);
  const prefersReduced = useAppReducedMotion();
  const completedRef = useRef(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const isHub = appKey === 'hub';
  const profile = APP_PROFILES[appKey] || DEFAULT_PROFILE;
  const { name, Logo } = profile;

  // Canonical design tokens & brand accent mapping
  const bgColor = 'var(--app-bg)';
  const baseColor = 'var(--c-text-primary)';

  const appColors: Record<AppKey, string> = {
    hub: '#3b82f6',
    chordex: '#a855f7',
    drumex: '#ec4899',
    stagex: '#3b82f6',
    groovex: '#10b981',
    vocalex: '#f59e0b',
    devtools: '#ef4444',
  };
  const accentColor = appColors[appKey] || '#3b82f6';

  // Completion handler: fires once atomically
  const handleTransitionEnd = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    triggerIntroReveal();
    completeTransition();
    if (onComplete) onComplete();
  }, [completeTransition, onComplete]);

  // Immediately signal logo formation on mount
  useEffect(() => {
    if (isHub) {
      handleTransitionEnd();
      return undefined;
    }
    setLogoFormed(true);
    return undefined;
  }, [isHub, setLogoFormed, handleTransitionEnd]);

  // When destination is preloaded, initiate smooth exit fade after minimal presentation
  useEffect(() => {
    if (isHub || !preloaded) {
      return undefined;
    }
    // Very brief presentation threshold (120ms) to ensure clean visual continuity without flash
    const timer = setTimeout(() => {
      setIsDismissing(true);
    }, prefersReduced ? 40 : 120);
    return () => {
      clearTimeout(timer);
    };
  }, [preloaded, isHub, prefersReduced]);

  // Safety watchdog timer to prevent getting stuck
  useEffect(() => {
    if (isHub) {
      return undefined;
    }
    const watchdogTimer = setTimeout(() => {
      setIsDismissing(true);
    }, 1200);
    return () => {
      clearTimeout(watchdogTimer);
    };
  }, [isHub]);

  if (isHub) {
    return null;
  }

  const duration = prefersReduced ? 0.16 : 0.24;
  const fluidEase: [number, number, number, number] = [0.2, 0, 0, 1]; // Smooth Apple-grade fluid deceleration curve

  return (
    <motion.div
      data-livex-app-transition="app-identity-transition"
      initial={{ opacity: 1 }}
      animate={{ opacity: isDismissing ? 0 : 1 }}
      transition={{ duration, ease: fluidEase }}
      onAnimationComplete={() => {
        if (isDismissing) {
          handleTransitionEnd();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: isDismissing ? 'none' : 'auto',
        overflow: 'hidden',
        contain: 'strict',
        willChange: 'opacity',
      }}
    >
      {/* Centered App Identity Lockup */}
      <motion.div
        initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.94 }}
        animate={
          isDismissing
            ? { opacity: 0, scale: prefersReduced ? 1 : 1.04 }
            : { opacity: 1, scale: 1 }
        }
        transition={
          isDismissing
            ? { duration, ease: fluidEase }
            : { duration: prefersReduced ? 0.1 : 0.16, ease: 'easeOut' }
        }
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        {/* App Icon Badge */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: isLight ? `${accentColor}15` : isAmoled ? `${accentColor}18` : `${accentColor}20`,
            border: `1px solid ${accentColor}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
            boxShadow: `0 8px 24px -6px ${accentColor}30`,
          }}
        >
          <Logo size={32} />
        </div>

        {/* App Name */}
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: baseColor,
            fontFamily: 'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {name}
        </span>
      </motion.div>
    </motion.div>
  );
}
