import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '@workspace/studio-core';

export const UNIFIED_NAV_TRANSITION = {
  initial: {
    opacity: 0,
    y: 6,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as const, // Apple/Linear smooth ease-out curve
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.995,
    transition: {
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const FADE_THROUGH_TRANSITION = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.2, 0, 0, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.01,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

export const SLIDE_TRANSITION = {
  initial: {
    opacity: 0,
    x: 16,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: {
      duration: 0.16,
      ease: [0.32, 0, 0.67, 0] as const,
    },
  },
};

export const REDUCED_NAV_TRANSITION = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 1, transition: { duration: 0 } },
};

/**
 * SECTION_DRILLDOWN_TRANSITION — High-end physical section entrance
 * Uses quintic deceleration, subtle 3D depth scaling (0.965 -> 1.0), and clip-path card expansion
 * for opening standalone sections (Appearance, About, Settings subsections, etc.).
 */
export const SECTION_DRILLDOWN_TRANSITION = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.26,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: [0.32, 0, 0.67, 0] as const,
    },
  },
};

interface StudioPageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'tab' | 'drilldown' | 'fade-through' | 'slide';
  initial?: boolean;
}

export const StudioPageTransition: React.FC<StudioPageTransitionProps> = ({
  pageKey,
  children,
  className = '',
  style = {},
  variant = 'tab',
  initial,
}) => {
  const speed = useSettingsStore((s) => s.settings?.animationSpeed);
  const prefersReduced =
    speed === 'reduced' ||
    (speed !== 'normal' &&
      speed !== 'fast' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  const transitionConfig = prefersReduced
    ? REDUCED_NAV_TRANSITION
    : variant === 'drilldown'
      ? SECTION_DRILLDOWN_TRANSITION
      : variant === 'fade-through'
        ? FADE_THROUGH_TRANSITION
        : variant === 'slide'
          ? SLIDE_TRANSITION
          : UNIFIED_NAV_TRANSITION;

  const shouldAnimateInitial = initial !== undefined ? initial : variant === 'drilldown';

  return (
    <AnimatePresence mode="wait" initial={shouldAnimateInitial}>
      <motion.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={transitionConfig}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          willChange: 'transform, opacity',
          ...style,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
