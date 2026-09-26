import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CANONICAL_CONTENT_TRANSITION } from '@workspace/livex-core';
import { useAppReducedMotion } from '../hooks/useAppReducedMotion';

export const UNIFIED_NAV_TRANSITION = {
  initial: {
    opacity: 0,
    y: CANONICAL_CONTENT_TRANSITION.VERTICAL_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS / 1000,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -CANONICAL_CONTENT_TRANSITION.VERTICAL_EXIT_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS / 1000,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const FADE_THROUGH_TRANSITION = {
  initial: {
    opacity: 0,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS / 1000,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS / 1000,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const SLIDE_TRANSITION = {
  initial: {
    opacity: 0,
    x: CANONICAL_CONTENT_TRANSITION.HORIZONTAL_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS / 1000,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: -CANONICAL_CONTENT_TRANSITION.HORIZONTAL_EXIT_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS / 1000,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const SECTION_DRILLDOWN_TRANSITION = {
  initial: {
    opacity: 0,
    y: CANONICAL_CONTENT_TRANSITION.VERTICAL_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS / 1000,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -CANONICAL_CONTENT_TRANSITION.VERTICAL_EXIT_OFFSET_PX,
    scale: CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING,
    transition: {
      duration: CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS / 1000,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const REDUCED_NAV_TRANSITION = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 1, transition: { duration: 0 } },
};

export interface LivexPageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'tab' | 'drilldown' | 'fade-through' | 'slide';
  initial?: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export type StudioPageTransitionProps = LivexPageTransitionProps;

export const LivexPageTransition: React.FC<LivexPageTransitionProps> = ({
  pageKey,
  children,
  className = '',
  style = {},
  variant = 'tab',
  initial,
  mode,
}) => {
  const prefersReduced = useAppReducedMotion();

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
  const effectiveMode =
    mode ?? (variant === 'tab' || variant === 'fade-through' ? 'popLayout' : 'wait');

  return (
    <AnimatePresence mode={effectiveMode} initial={shouldAnimateInitial}>
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

export const StudioPageTransition = LivexPageTransition;
