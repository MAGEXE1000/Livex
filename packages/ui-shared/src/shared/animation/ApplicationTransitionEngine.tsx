import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { AppKey, useApplicationTransitionStore } from '@workspace/studio-core';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { triggerIntroReveal } from './introSignal';

interface TransitionEngineProps {
  appKey: AppKey;
  preloaded: boolean;
  onComplete: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

export function ApplicationTransitionEngine({
  appKey,
  preloaded,
  onComplete,
  isLight = false,
  isAmoled = false,
}: TransitionEngineProps) {
  const state = useApplicationTransitionStore((s) => s.state);
  const setLogoFormed = useApplicationTransitionStore((s) => s.setLogoFormed);
  const completeTransition = useApplicationTransitionStore((s) => s.completeTransition);
  const prefersReduced = useAppReducedMotion();

  const isHub = appKey === 'hub';

  useEffect(() => {
    if (isHub) {
      setLogoFormed(true);
      return;
    }
    const timer = setTimeout(() => {
      setLogoFormed(true);
    }, prefersReduced ? 150 : 780);
    return () => clearTimeout(timer);
  }, [isHub, setLogoFormed, prefersReduced]);

  const startZoom =
    state === 'ZOOM_TRANSITION' || state === 'OVERLAY_DISMISS' || state === 'INTERACTION_ENABLE';

  useEffect(() => {
    if (startZoom) {
      const timer = setTimeout(() => {
        triggerIntroReveal();
        completeTransition();
        if (onComplete) onComplete();
      }, isHub ? 180 : 320);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [startZoom, completeTransition, isHub, onComplete]);

  const bgColor = isAmoled ? '#000000' : isLight ? '#ffffff' : '#141418';
  const baseColor = isLight ? '#000000' : '#ffffff';

  // App Specific Colors
  const appColors: Record<AppKey, string> = {
    hub: '#3b82f6',
    chordex: '#a855f7',
    drumex: '#ec4899',
    stagex: '#3b82f6',
    groovex: '#10b981',
    vocalex: '#f59e0b',
    devtools: '#ef4444',
  };
  const accentColor = appColors[appKey] || '#ffffff';

  // Shared Animation Presets
  const containerAnimate = !startZoom
    ? { backgroundColor: bgColor, opacity: 1 }
    : { backgroundColor: bgColor, opacity: 0 };

  const containerTransition: any = isHub
    ? { duration: 0.18, ease: 'easeOut' }
    : { duration: prefersReduced ? 0.2 : 0.32, ease: [0.4, 0, 0.2, 1] };

  // Render progressive icons
  const renderIcon = () => {
    const svgStyle = { width: '80px', height: '80px', display: 'block' };

    switch (appKey) {
      case 'chordex':
        return (
          <svg viewBox="0 0 13 17" fill="none" style={svgStyle}>
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
              transition={{ duration: prefersReduced ? 0 : 0.35, ease: 'easeOut' }}
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
                strokeOpacity="0.35"
                initial={{ pathLength: prefersReduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: prefersReduced ? 0 : 0.15 + idx * 0.08,
                  duration: prefersReduced ? 0 : 0.4,
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
                strokeWidth="0.7"
                strokeOpacity="0.28"
                initial={{ pathLength: prefersReduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: prefersReduced ? 0 : 0.3 + idx * 0.1,
                  duration: prefersReduced ? 0 : 0.35,
                  ease: 'easeOut',
                }}
              />
            ))}
            {/* Chord Dots with accent color */}
            {[
              { cx: 2.5, cy: 5.5, delay: 0.45 },
              { cx: 10.5, cy: 5.5, delay: 0.52 },
              { cx: 6.5, cy: 10.5, delay: 0.6 },
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
                  stiffness: 350,
                  damping: 15,
                }}
              />
            ))}
          </svg>
        );

      case 'drumex':
        return (
          <svg viewBox="0 0 16 16" fill="none" style={svgStyle}>
            {/* Concentric Rhythmic Pulses (Ripples) */}
            {!prefersReduced && (
              <>
                <motion.circle
                  cx="8"
                  cy="8"
                  r="7.5"
                  stroke={accentColor}
                  strokeWidth="0.5"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.8, 1.4], opacity: [0.7, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                />
                <motion.circle
                  cx="8"
                  cy="8"
                  r="7.5"
                  stroke={accentColor}
                  strokeWidth="0.5"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.8, 1.4], opacity: [0.7, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                />
              </>
            )}
            {/* Drum Rim */}
            <motion.circle
              cx="8"
              cy="8"
              r="7"
              stroke={baseColor}
              strokeWidth="1.6"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: prefersReduced ? 0 : 0.45, ease: 'easeInOut' }}
            />
            {/* Head Ring */}
            <motion.circle
              cx="8"
              cy="8"
              r="4.8"
              stroke={baseColor}
              strokeWidth="0.85"
              strokeOpacity="0.5"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: prefersReduced ? 0 : 0.15,
                duration: prefersReduced ? 0 : 0.4,
                ease: 'easeInOut',
              }}
            />
            {/* Tension Lugs */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
              const lx = 8 + 6.1 * Math.cos(angle);
              const ly = 8 + 6.1 * Math.sin(angle);
              return (
                <motion.circle
                  key={`lug-${i}`}
                  cx={lx}
                  cy={ly}
                  r="0.95"
                  fill={baseColor}
                  initial={{ scale: prefersReduced ? 1 : 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: prefersReduced ? 0 : 0.3 + i * 0.05,
                    type: 'spring',
                    stiffness: 300,
                    damping: 14,
                  }}
                />
              );
            })}
            {/* Center sweet-spot (Colored) */}
            <motion.circle
              cx="8"
              cy="8"
              r="1.4"
              fill={accentColor}
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: prefersReduced ? 0 : 0.55,
                type: 'spring',
                stiffness: 350,
                damping: 12,
              }}
            />
          </svg>
        );

      case 'stagex':
        return (
          <svg viewBox="0 0 16 16" fill="none" style={svgStyle}>
            {/* Floating Lighting Bars in background */}
            <motion.path
              d="M 2 2 L 8 4 L 14 2"
              stroke={accentColor}
              strokeWidth="0.6"
              strokeOpacity="0.4"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.35, duration: prefersReduced ? 0 : 0.45 }}
            />
            {/* Platform */}
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
              transition={{ duration: prefersReduced ? 0 : 0.4, ease: 'easeOut' }}
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
              transition={{ delay: prefersReduced ? 0 : 0.15, duration: prefersReduced ? 0 : 0.35 }}
            />
            <motion.circle
              cx="2.75"
              cy="6.2"
              r="0.8"
              fill={baseColor}
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.35, type: 'spring' }}
            />
            <motion.circle
              cx="2.75"
              cy="8.1"
              r="0.55"
              fill={baseColor}
              fillOpacity="0.6"
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.45, type: 'spring' }}
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
              transition={{ delay: prefersReduced ? 0 : 0.2, duration: prefersReduced ? 0 : 0.35 }}
            />
            <motion.circle
              cx="13.25"
              cy="6.2"
              r="0.8"
              fill={baseColor}
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.4, type: 'spring' }}
            />
            <motion.circle
              cx="13.25"
              cy="8.1"
              r="0.55"
              fill={baseColor}
              fillOpacity="0.6"
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.5, type: 'spring' }}
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
              transition={{ delay: prefersReduced ? 0 : 0.25, duration: prefersReduced ? 0 : 0.4 }}
            />
            <motion.circle
              cx="8"
              cy="3.2"
              r="1.2"
              fill={accentColor}
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: prefersReduced ? 0 : 0.55,
                type: 'spring',
                stiffness: 350,
                damping: 10,
              }}
            />
          </svg>
        );

      case 'groovex':
        return (
          <svg viewBox="0 0 16 16" fill="none" style={svgStyle}>
            {/* Outer Circle */}
            <motion.circle
              cx="8"
              cy="8"
              r="7"
              stroke={baseColor}
              strokeWidth="1.5"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: prefersReduced ? 0 : 0.45, ease: 'easeInOut' }}
            />
            {/* Inner Ring */}
            <motion.circle
              cx="8"
              cy="8"
              r="3"
              stroke={baseColor}
              strokeWidth="1.2"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: prefersReduced ? 0 : 0.15,
                duration: prefersReduced ? 0 : 0.4,
                ease: 'easeInOut',
              }}
            />
            {/* Center Center dot */}
            <motion.circle
              cx="8"
              cy="8"
              r="1"
              fill={accentColor}
              initial={{ scale: prefersReduced ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.3, type: 'spring' }}
            />
            {/* Audio Wave / Mixer ticks */}
            {[
              { x1: 8, y1: 1, x2: 8, y2: 5, originY: 0, delay: 0.3 },
              { x1: 8, y1: 11, x2: 8, y2: 15, originY: 1, delay: 0.35 },
              { x1: 1, y1: 8, x2: 5, y2: 8, originX: 0, delay: 0.4 },
              { x1: 11, y1: 8, x2: 15, y2: 8, originX: 1, delay: 0.45 },
            ].map((lineProps, idx) => (
              <motion.line
                key={`line-${idx}`}
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
                  duration: prefersReduced ? 0 : 0.3,
                }}
              />
            ))}
            {/* Waveform graphic overlay inside outer ring */}
            <motion.path
              d="M 3.5 8.5 Q 5.75 6 8 8.5 T 12.5 8.5"
              stroke={accentColor}
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeOpacity="0.75"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: prefersReduced ? 0 : 0.4,
                duration: prefersReduced ? 0 : 0.5,
              }}
            />
          </svg>
        );

      case 'vocalex':
        return (
          <svg viewBox="0 0 16 16" fill="none" style={svgStyle}>
            {/* Liquid Fill Clip Path definition */}
            <defs>
              <clipPath id="vocalex-fill-clip">
                <motion.rect
                  x="6.5"
                  y="2"
                  width="3"
                  height="8"
                  rx="1.5"
                  initial={{ y: prefersReduced ? 2 : 10 }}
                  animate={{ y: 2 }}
                  transition={{
                    delay: prefersReduced ? 0 : 0.2,
                    duration: prefersReduced ? 0 : 0.65,
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.25] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
                />
                <motion.path
                  d="M 13.5 5 A 4 4 0 0 1 13.5 11"
                  stroke={accentColor}
                  strokeWidth="0.85"
                  strokeLinecap="round"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.25] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
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
              transition={{ duration: prefersReduced ? 0 : 0.45, ease: 'easeOut' }}
            />
            {/* Filled inner area with clip path (Liquid filling) */}
            <rect
              x="6.5"
              y="2"
              width="3"
              height="8"
              rx="1.5"
              fill={accentColor}
              clipPath="url(#vocalex-fill-clip)"
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
                delay: prefersReduced ? 0 : 0.2,
                duration: prefersReduced ? 0 : 0.4,
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
              transition={{ delay: prefersReduced ? 0 : 0.38, duration: prefersReduced ? 0 : 0.2 }}
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
              transition={{ delay: prefersReduced ? 0 : 0.44, duration: prefersReduced ? 0 : 0.25 }}
            />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1, backgroundColor: bgColor }}
      animate={containerAnimate}
      transition={containerTransition}
      onAnimationComplete={() => {
        if (startZoom) {
          triggerIntroReveal();
          completeTransition();
          if (onComplete) onComplete();
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
        pointerEvents: startZoom ? 'none' : 'auto',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      }}
    >
      {!isHub && (
        <motion.div
          initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.75 }}
          animate={
            !startZoom
              ? { opacity: 1, scale: 1 }
              : { scale: prefersReduced ? 1 : 1.05, opacity: 0 }
          }
          transition={
            !startZoom
              ? { type: 'spring', stiffness: 450, damping: 28 }
              : {
                  scale: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                }
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            willChange: 'transform, opacity',
          }}
        >
          {renderIcon()}
        </motion.div>
      )}
    </motion.div>
  );
}
