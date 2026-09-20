import React, { useEffect, useMemo, useRef, useCallback } from 'react';
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
  tagline: string;
  color: string;
  Logo: React.ComponentType<{ size?: number }>;
}

const APP_PROFILES: Record<string, AppVisualProfile> = {
  chordex: {
    name: 'Chordex',
    tagline: 'Acordes, escalas y biblioteca',
    color: '#a855f7',
    Logo: ChordexLogo,
  },
  drumex: {
    name: 'Drumex',
    tagline: 'Secuenciador rítmico y caja de ritmos',
    color: '#ec4899',
    Logo: DrumexLogo,
  },
  stagex: {
    name: 'Stagex',
    tagline: 'Modo en vivo y control de escenario',
    color: '#3b82f6',
    Logo: StagexLogoIcon,
  },
  groovex: {
    name: 'Groovex',
    tagline: 'Pistas, audio multipista y loops',
    color: '#10b981',
    Logo: GroovexLogo,
  },
  vocalex: {
    name: 'Vocalex',
    tagline: 'Calentamiento vocal y afinación',
    color: '#f59e0b',
    Logo: VocalexLogo,
  },
};

const DEFAULT_PROFILE: AppVisualProfile = {
  name: 'Livex',
  tagline: 'Livex Suite',
  color: '#3b82f6',
  Logo: LivexLogo,
};

export function ApplicationTransitionEngine({
  appKey,
  preloaded,
  onComplete,
  isLight = false,
  isAmoled = false,
  sourceRect,
}: TransitionEngineProps) {
  const setLogoFormed = useApplicationTransitionStore((s) => s.setLogoFormed);
  const completeTransition = useApplicationTransitionStore((s) => s.completeTransition);
  const startZoom = useApplicationTransitionStore((s) => s.startZoom);
  const prefersReduced = useAppReducedMotion();
  const completedRef = useRef(false);
  const waitingForPreload = useRef(false);

  const isHub = appKey === 'hub';
  const profile = APP_PROFILES[appKey] || DEFAULT_PROFILE;
  const { name, tagline, color, Logo } = profile;

  // Immediately signal logo formation to keep transition store lifecycle responsive
  useEffect(() => {
    if (isHub) {
      triggerIntroReveal();
      completeTransition();
      if (onComplete) onComplete();
      return;
    }
    setLogoFormed(true);
  }, [isHub, setLogoFormed, completeTransition, onComplete]);

  // When sub-app is preloaded, advance transition state
  useEffect(() => {
    if (preloaded && !isHub) {
      startZoom();
    }
  }, [preloaded, isHub, startZoom]);

  // Completion coordinator: ensures atomic single-fire transition finalization
  const handleTransitionEnd = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    triggerIntroReveal();
    completeTransition();
    if (onComplete) onComplete();
  }, [completeTransition, onComplete]);

  // Invoked when card expansion animation completes
  const handleAnimationComplete = useCallback(() => {
    if (preloaded) {
      handleTransitionEnd();
    } else {
      // Hold continuous surface until destination readiness arrives
      waitingForPreload.current = true;
    }
  }, [preloaded, handleTransitionEnd]);

  // React immediately when destination finishes preloading after animation
  useEffect(() => {
    if (preloaded && waitingForPreload.current) {
      handleTransitionEnd();
    }
  }, [preloaded, handleTransitionEnd]);

  // Safety watchdog: guarantees transition always completes even under unexpected delays
  useEffect(() => {
    if (isHub) return;
    const watchdogTimer = setTimeout(() => {
      handleTransitionEnd();
    }, 1800);
    return () => clearTimeout(watchdogTimer);
  }, [isHub, handleTransitionEnd]);

  if (isHub) {
    return null;
  }

  // Derive initial card geometry from captured source element, or compute centered fallback
  const startBounds = useMemo(() => {
    if (
      sourceRect &&
      typeof sourceRect.width === 'number' &&
      sourceRect.width > 20 &&
      sourceRect.height > 20
    ) {
      return {
        x: Math.round(sourceRect.x),
        y: Math.round(sourceRect.y),
        width: Math.round(sourceRect.width),
        height: Math.round(sourceRect.height),
        borderRadius: sourceRect.borderRadius ?? 20,
      };
    }

    // Centered card fallback if source rect was not provided
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const cardW = Math.min(vw - 32, 420);
    const cardH = 72;
    return {
      x: Math.round((vw - cardW) / 2),
      y: Math.round((vh - cardH) / 2),
      width: cardW,
      height: cardH,
      borderRadius: 20,
    };
  }, [sourceRect]);

  const targetBg = isAmoled
    ? '#000000'
    : isLight
      ? 'var(--app-bg, #f8fafc)'
      : 'var(--app-bg, #0b0d13)';

  const cardInitialBg = isLight
    ? 'rgba(255, 255, 255, 0.96)'
    : isAmoled
      ? '#000000'
      : 'rgba(20, 22, 30, 0.96)';

  const cardInitialBorder = isLight
    ? 'rgba(0, 0, 0, 0.08)'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(255, 255, 255, 0.12)';

  const duration = prefersReduced ? 0.16 : 0.44;
  const fluidEase: [number, number, number, number] = [0.16, 1, 0.3, 1]; // Apple-grade physical deceleration curve

  return (
    <div
      data-livex-app-transition="shared-card-morph"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Dimmed Hub backdrop to focus visual attention on expanding card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration * 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          background: isAmoled ? '#000000' : isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.40)',
          willChange: 'opacity',
        }}
      />

      {/* The expanding shared-element card morph surface */}
      <motion.div
        initial={
          prefersReduced
            ? { opacity: 0, top: 0, left: 0, width: '100vw', height: '100dvh', borderRadius: 0 }
            : {
                top: startBounds.y,
                left: startBounds.x,
                width: startBounds.width,
                height: startBounds.height,
                borderRadius: startBounds.borderRadius,
                backgroundColor: cardInitialBg,
                borderColor: cardInitialBorder,
                boxShadow: `0 16px 36px -10px ${color}40, 0 0 0 1px ${color}25`,
                opacity: 1,
              }
        }
        animate={{
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          borderRadius: 0,
          backgroundColor: targetBg,
          borderColor: 'transparent',
          boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
          // Solid visual continuity during first 48% of expansion, then progressive reveal of destination
          opacity: [1, 1, 0.85, 0],
        }}
        transition={{
          top: { duration, ease: fluidEase },
          left: { duration, ease: fluidEase },
          width: { duration, ease: fluidEase },
          height: { duration, ease: fluidEase },
          borderRadius: { duration: duration * 0.92, ease: fluidEase },
          backgroundColor: { duration: duration * 0.82, ease: 'easeOut' },
          borderColor: { duration: duration * 0.45, ease: 'easeOut' },
          boxShadow: { duration: duration * 0.55, ease: 'easeOut' },
          opacity: {
            duration,
            times: [0, 0.48, 0.78, 1],
            ease: 'easeInOut',
          },
        }}
        onAnimationComplete={handleAnimationComplete}
        style={{
          position: 'absolute',
          borderStyle: 'solid',
          borderWidth: '1px',
          overflow: 'hidden',
          willChange: 'transform, top, left, width, height, opacity, border-radius',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {/* Glowing brand aura expanding from card origin */}
        <motion.div
          initial={{ opacity: 0.35, scale: 0.85 }}
          animate={{
            opacity: [0.45, 0.60, 0.25, 0],
            scale: [0.85, 1.3, 2.0, 2.8],
          }}
          transition={{
            duration,
            times: [0, 0.35, 0.70, 1.0],
            ease: fluidEase,
          }}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}60 0%, ${color}20 50%, transparent 75%)`,
            pointerEvents: 'none',
            transform: 'translate(-35%, -35%)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Card visual content morph: stays anchored to card header and dissolves seamlessly */}
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0.6, 0],
            y: [0, -4, -8, -12],
            scale: [1, 1.03, 1.06, 1.08],
          }}
          transition={{
            duration: duration * 0.95,
            times: [0, 0.45, 0.75, 1.0],
            ease: fluidEase,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: startBounds.width,
            padding: '14px 16px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }}
        >
          {/* Canonical app icon badge */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: isLight ? `${color}18` : `${color}22`,
              border: `1px solid ${color}45`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
              flexShrink: 0,
              boxShadow: `0 4px 16px ${color}35`,
            }}
          >
            <Logo size={24} />
          </div>

          {/* App title and description */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: '16.5px',
                fontWeight: 800,
                color: isLight ? '#0f172a' : '#f8fafc',
                fontFamily: 'var(--studio-font-display)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: isLight ? '#64748b' : '#94a3b8',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 500,
                marginTop: '3px',
                lineHeight: 1.3,
                opacity: 0.9,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tagline}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
