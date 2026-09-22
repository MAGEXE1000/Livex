import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  type AppKey,
  useApplicationTransitionStore,
  type CardMorphSourceRect,
} from '@workspace/livex-core';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { triggerIntroReveal } from './introSignal';

interface TransitionEngineProps {
  appKey: AppKey;
  preloaded: boolean;
  onComplete: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
  sourceRect?: CardMorphSourceRect | null;
}

const APP_ACCENT_COLORS: Record<AppKey, string> = {
  hub: '#3b82f6',
  chordex: '#a855f7',
  drumex: '#ec4899',
  stagex: '#3b82f6',
  groovex: '#10b981',
  vocalex: '#f59e0b',
  devtools: '#ef4444',
};

interface LogoProps {
  baseColor: string;
  accentColor: string;
  prefersReduced: boolean;
  size?: number;
}

function AnimatedChordexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  const w = Math.round((size * 13) / 17);
  const h = size;
  return (
    <svg
      viewBox="0 0 13 17"
      fill="none"
      style={{ width: `${w}px`, height: `${h}px`, display: 'block' }}
    >
      {/* Fretboard Nut */}
      <motion.rect
        x="0.5"
        y="0.5"
        width="12"
        height="2.5"
        rx="1"
        fill={baseColor}
        initial={{ scaleX: prefersReduced ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        style={{ originX: 0.5 }}
        transition={{ duration: prefersReduced ? 0 : 0.28, ease: 'easeOut' }}
      />
      {/* Vertical Strings (Line Drawing) */}
      {[2.5, 6.5, 10.5].map((xVal, idx) => (
        <motion.line
          key={`str-${idx}`}
          x1={xVal}
          y1="3"
          x2={xVal}
          y2="16.5"
          stroke={baseColor}
          strokeWidth="0.9"
          strokeOpacity="0.38"
          initial={{ pathLength: prefersReduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            delay: prefersReduced ? 0 : 0.08 + idx * 0.06,
            duration: prefersReduced ? 0 : 0.28,
            ease: 'easeOut',
          }}
        />
      ))}
      {/* Horizontal Frets (Line Drawing) */}
      {[8, 13].map((yVal, idx) => (
        <motion.line
          key={`fret-${idx}`}
          x1="0.5"
          y1={yVal}
          x2="12.5"
          y2={yVal}
          stroke={baseColor}
          strokeWidth="0.75"
          strokeOpacity="0.32"
          initial={{ pathLength: prefersReduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            delay: prefersReduced ? 0 : 0.16 + idx * 0.08,
            duration: prefersReduced ? 0 : 0.25,
            ease: 'easeOut',
          }}
        />
      ))}
      {/* Chord Dots with accent color */}
      {[
        { cx: 2.5, cy: 5.5, delay: 0.22 },
        { cx: 10.5, cy: 5.5, delay: 0.28 },
        { cx: 6.5, cy: 10.5, delay: 0.34 },
      ].map((dot, idx) => (
        <motion.circle
          key={`dot-${idx}`}
          cx={dot.cx}
          cy={dot.cy}
          r="2.1"
          fill={accentColor}
          initial={{ scale: prefersReduced ? 1 : 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: prefersReduced ? 0 : dot.delay,
            type: 'spring',
            stiffness: 420,
            damping: 18,
          }}
        />
      ))}
    </svg>
  );
}

function AnimatedDrumexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  const cx = 8;
  const cy = 8;
  const lugs = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    return { x: cx + 6.1 * Math.cos(angle), y: cy + 6.1 * Math.sin(angle) };
  });

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      {/* Concentric Rhythmic Pulse (finite single pulse) */}
      {!prefersReduced && (
        <motion.circle
          cx={cx}
          cy={cy}
          r="7.5"
          stroke={accentColor}
          strokeWidth="0.5"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [0.7, 1.25], opacity: [0.65, 0] }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      )}
      {/* Drum Rim */}
      <motion.circle
        cx={cx}
        cy={cy}
        r="7"
        stroke={baseColor}
        strokeWidth="1.6"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.32, ease: 'easeInOut' }}
      />
      {/* Head Ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r="4.8"
        stroke={baseColor}
        strokeWidth="0.85"
        strokeOpacity="0.5"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.1,
          duration: prefersReduced ? 0 : 0.28,
          ease: 'easeInOut',
        }}
      />
      {/* Tension Lugs */}
      {lugs.map((lug, i) => (
        <motion.circle
          key={`lug-${i}`}
          cx={lug.x}
          cy={lug.y}
          r="0.95"
          fill={baseColor}
          initial={{ scale: prefersReduced ? 1 : 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: prefersReduced ? 0 : 0.18 + i * 0.03,
            type: 'spring',
            stiffness: 380,
            damping: 18,
          }}
        />
      ))}
      {/* Center sweet-spot (Accent) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r="1.4"
        fill={accentColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.26,
          type: 'spring',
          stiffness: 420,
          damping: 16,
        }}
      />
    </svg>
  );
}

function AnimatedStagexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      {/* Floating Lighting Bar */}
      <motion.path
        d="M 2 2 L 8 4 L 14 2"
        stroke={accentColor}
        strokeWidth="0.65"
        strokeOpacity="0.5"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.12, duration: prefersReduced ? 0 : 0.3 }}
      />
      {/* Stage Platform */}
      <motion.rect
        x="1"
        y="10"
        width="14"
        height="2.5"
        rx="1"
        fill={baseColor}
        fillOpacity="0.9"
        initial={{ scaleX: prefersReduced ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        style={{ originX: 0.5 }}
        transition={{ duration: prefersReduced ? 0 : 0.28, ease: 'easeOut' }}
      />
      {/* Left Speaker */}
      <motion.rect
        x="1"
        y="4"
        width="3.5"
        height="5.5"
        rx="0.8"
        stroke={baseColor}
        strokeWidth="1.1"
        initial={{ scaleY: prefersReduced ? 1 : 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.08, duration: prefersReduced ? 0 : 0.26 }}
      />
      <motion.circle
        cx="2.75"
        cy="6.2"
        r="0.8"
        fill={baseColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.22, type: 'spring', stiffness: 400, damping: 18 }}
      />
      <motion.circle
        cx="2.75"
        cy="8.1"
        r="0.55"
        fill={baseColor}
        fillOpacity="0.6"
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.28, type: 'spring', stiffness: 400, damping: 18 }}
      />
      {/* Right Speaker */}
      <motion.rect
        x="11.5"
        y="4"
        width="3.5"
        height="5.5"
        rx="0.8"
        stroke={baseColor}
        strokeWidth="1.1"
        initial={{ scaleY: prefersReduced ? 1 : 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.12, duration: prefersReduced ? 0 : 0.26 }}
      />
      <motion.circle
        cx="13.25"
        cy="6.2"
        r="0.8"
        fill={baseColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.24, type: 'spring', stiffness: 400, damping: 18 }}
      />
      <motion.circle
        cx="13.25"
        cy="8.1"
        r="0.55"
        fill={baseColor}
        fillOpacity="0.6"
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.3, type: 'spring', stiffness: 400, damping: 18 }}
      />
      {/* Center Stand & Mic Capsule (Accent) */}
      <motion.line
        x1="8"
        y1="4"
        x2="8"
        y2="9.5"
        stroke={baseColor}
        strokeWidth="1.1"
        strokeLinecap="round"
        initial={{ scaleY: prefersReduced ? 1 : 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.15, duration: prefersReduced ? 0 : 0.28 }}
      />
      <motion.circle
        cx="8"
        cy="3.2"
        r="1.2"
        fill={accentColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.28,
          type: 'spring',
          stiffness: 420,
          damping: 16,
        }}
      />
    </svg>
  );
}

function AnimatedGroovexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      {/* Outer Ring */}
      <motion.circle
        cx="8"
        cy="8"
        r="7"
        stroke={baseColor}
        strokeWidth="1.5"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.32, ease: 'easeInOut' }}
      />
      {/* Inner Groove Ring */}
      <motion.circle
        cx="8"
        cy="8"
        r="4.8"
        stroke={baseColor}
        strokeWidth="0.8"
        strokeOpacity="0.5"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.1,
          duration: prefersReduced ? 0 : 0.28,
          ease: 'easeInOut',
        }}
      />
      {/* Center Spindle Dot */}
      <motion.circle
        cx="8"
        cy="8"
        r="1.2"
        fill={accentColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.22,
          type: 'spring',
          stiffness: 420,
          damping: 16,
        }}
      />
      {/* Audio Wave / Mixer Ticks */}
      {[
        { x1: 8, y1: 1, x2: 8, y2: 4, originY: 0, delay: 0.18 },
        { x1: 8, y1: 12, x2: 8, y2: 15, originY: 1, delay: 0.22 },
        { x1: 1, y1: 8, x2: 4, y2: 8, originX: 0, delay: 0.2 },
        { x1: 12, y1: 8, x2: 15, y2: 8, originX: 1, delay: 0.24 },
      ].map((lineProps, idx) => (
        <motion.line
          key={`tick-${idx}`}
          x1={lineProps.x1}
          y1={lineProps.y1}
          x2={lineProps.x2}
          y2={lineProps.y2}
          stroke={baseColor}
          strokeWidth="0.8"
          strokeOpacity="0.5"
          initial={
            lineProps.originY !== undefined
              ? { scaleY: prefersReduced ? 1 : 0 }
              : { scaleX: prefersReduced ? 1 : 0 }
          }
          animate={lineProps.originY !== undefined ? { scaleY: 1 } : { scaleX: 1 }}
          style={{ originY: lineProps.originY, originX: lineProps.originX }}
          transition={{
            delay: prefersReduced ? 0 : lineProps.delay,
            duration: prefersReduced ? 0 : 0.2,
          }}
        />
      ))}
      {/* Waveform graphic overlay */}
      <motion.path
        d="M 3.5 8.5 Q 5.75 6 8 8.5 T 12.5 8.5"
        stroke={accentColor}
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeOpacity="0.85"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.24,
          duration: prefersReduced ? 0 : 0.32,
        }}
      />
    </svg>
  );
}

function AnimatedVocalexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      <defs>
        <clipPath id="vocalex-trans-fill-clip">
          <motion.rect
            x="6.5"
            y="2"
            width="3"
            height="8"
            rx="1.5"
            initial={{ y: prefersReduced ? 2 : 10 }}
            animate={{ y: 2 }}
            transition={{
              delay: prefersReduced ? 0 : 0.12,
              duration: prefersReduced ? 0 : 0.38,
              ease: 'easeInOut',
            }}
          />
        </clipPath>
      </defs>

      {/* Sound Wave Resonance Arcs */}
      {!prefersReduced && (
        <>
          <motion.path
            d="M 2.5 5 A 4 4 0 0 0 2.5 11"
            stroke={accentColor}
            strokeWidth="0.85"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.75, 0], scale: [0.85, 1.25] }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
          <motion.path
            d="M 13.5 5 A 4 4 0 0 1 13.5 11"
            stroke={accentColor}
            strokeWidth="0.85"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.75, 0], scale: [0.85, 1.25] }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        </>
      )}
      {/* Silhouette Outline */}
      <motion.rect
        x="6.5"
        y="2"
        width="3"
        height="8"
        rx="1.5"
        stroke={baseColor}
        strokeWidth="1.4"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.32, ease: 'easeOut' }}
      />
      {/* Filled inner area with clip path (Liquid level rising) */}
      <rect
        x="6.5"
        y="2"
        width="3"
        height="8"
        rx="1.5"
        fill={accentColor}
        clipPath="url(#vocalex-trans-fill-clip)"
      />
      {/* Cradle U-shape */}
      <motion.path
        d="M4 8.5C4 11.26 5.79 13 8 13C10.21 13 12 11.26 12 8.5"
        stroke={baseColor}
        strokeWidth="1.3"
        strokeLinecap="round"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.14,
          duration: prefersReduced ? 0 : 0.28,
          ease: 'easeOut',
        }}
      />
      {/* Stand Post */}
      <motion.line
        x1="8"
        y1="13"
        x2="8"
        y2="14"
        stroke={baseColor}
        strokeWidth="1.3"
        strokeLinecap="round"
        initial={{ scaleY: prefersReduced ? 1 : 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 0 }}
        transition={{ delay: prefersReduced ? 0 : 0.24, duration: 0.18 }}
      />
      {/* Base Line */}
      <motion.line
        x1="6"
        y1="14"
        x2="10"
        y2="14"
        stroke={baseColor}
        strokeWidth="1.3"
        strokeLinecap="round"
        initial={{ scaleX: prefersReduced ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        style={{ originX: 0.5 }}
        transition={{ delay: prefersReduced ? 0 : 0.28, duration: 0.18 }}
      />
    </svg>
  );
}

function AnimatedLivexLogo({ baseColor, accentColor, prefersReduced, size = 104 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      <motion.path
        d="M 8 1.5 L 14 5 L 14 11 L 8 14.5 L 2 11 L 2 5 Z"
        stroke={baseColor}
        strokeWidth="1.2"
        strokeLinejoin="round"
        initial={{ pathLength: prefersReduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.32, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="8"
        cy="8"
        r="2.2"
        fill={accentColor}
        initial={{ scale: prefersReduced ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: prefersReduced ? 0 : 0.18,
          type: 'spring',
          stiffness: 420,
          damping: 16,
        }}
      />
    </svg>
  );
}

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

  // Strict theme adherence & zero theme flash
  const bgColor = isAmoled ? '#000000' : isLight ? '#ffffff' : 'var(--app-bg, #0b0d13)';
  const baseColor = isLight ? '#0f172a' : '#ffffff';
  const accentColor = APP_ACCENT_COLORS[appKey] || '#3b82f6';

  // Atomic completion handler
  const handleTransitionEnd = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    triggerIntroReveal();
    completeTransition();
    if (onComplete) onComplete();
  }, [completeTransition, onComplete]);

  // Signal logo formation immediately on mount
  useEffect(() => {
    if (isHub) {
      handleTransitionEnd();
      return undefined;
    }
    setLogoFormed(true);
    return undefined;
  }, [isHub, setLogoFormed, handleTransitionEnd]);

  // Smooth dismiss when preloaded
  useEffect(() => {
    if (isHub || !preloaded) {
      return undefined;
    }
    // Balanced threshold: ensures vector entrance finishes elegantly (220ms) before fading out
    const timer = setTimeout(() => {
      setIsDismissing(true);
    }, prefersReduced ? 40 : 220);
    return () => {
      clearTimeout(timer);
    };
  }, [preloaded, isHub, prefersReduced]);

  // Safety watchdog timer (1200ms)
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

  const duration = prefersReduced ? 0.14 : 0.22;
  const fluidEase: [number, number, number, number] = [0.2, 0, 0, 1]; // Apple-grade fluid curve

  const renderAnimatedLogo = () => {
    const props = { baseColor, accentColor, prefersReduced, size: 104 };
    switch (appKey) {
      case 'chordex':
        return <AnimatedChordexLogo {...props} />;
      case 'drumex':
        return <AnimatedDrumexLogo {...props} />;
      case 'stagex':
        return <AnimatedStagexLogo {...props} />;
      case 'groovex':
        return <AnimatedGroovexLogo {...props} />;
      case 'vocalex':
        return <AnimatedVocalexLogo {...props} />;
      default:
        return <AnimatedLivexLogo {...props} />;
    }
  };

  return (
    <motion.div
      data-livex-app-transition="app-identity-transition"
      initial={{ opacity: 1 }}
      animate={{ opacity: isDismissing ? 0 : 1 }}
      exit={{ opacity: 0 }}
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
      {/* Centered Animated App Identity */}
      <motion.div
        initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.88 }}
        animate={
          isDismissing
            ? { opacity: 0, scale: prefersReduced ? 1 : 1.05 }
            : { opacity: 1, scale: 1 }
        }
        exit={{ opacity: 0, scale: prefersReduced ? 1 : 1.04 }}
        transition={
          isDismissing
            ? { duration, ease: fluidEase }
            : {
                scale: { type: 'spring', stiffness: 420, damping: 28 },
                opacity: { duration: prefersReduced ? 0.08 : 0.16, ease: 'easeOut' },
              }
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        {renderAnimatedLogo()}
      </motion.div>
    </motion.div>
  );
}
