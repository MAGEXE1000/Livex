import { useChordStore, useSettingsStore } from '@workspace/studio-core';
import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { DurationPresets, SpringPresets } from '@workspace/studio-core';

// Helper to check if reduced motion is preferred by the system or settings
export function usePrefersReducedMotion() {
  const speed = useSettingsStore((state) => state.settings?.animationSpeed);
  if (speed === 'reduced') return true;
  if (speed === 'normal' || speed === 'fast') return false;
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Helper to check the animation duration speed coefficient
export function useAnimationSpeed() {
  const speed = useSettingsStore((state) => state.settings?.animationSpeed);
  return speed === 'fast' ? 0.6 : 1.0;
}

// ── 2. Animation Coordinator ────────────────────────────────────────────────
export const AnimationCoordinator = {
  getDuration(preset: 'fast' | 'normal' | 'slow' = 'normal', speedSetting?: string): number {
    if (speedSetting === 'reduced') return 0;
    const base = DurationPresets[preset];
    const multiplier = speedSetting === 'fast' ? 0.6 : 1.0;
    return base * multiplier;
  },

  getTransition(
    preset: 'standard' | 'spring' = 'standard',
    durationPreset: 'fast' | 'normal' | 'slow' = 'normal',
    speedSetting?: string
  ) {
    if (speedSetting === 'reduced') {
      return { duration: 0 };
    }
    const duration = this.getDuration(durationPreset, speedSetting);
    if (preset === 'spring') {
      return { ...SpringPresets.stiff, duration };
    }
    return { ...SpringPresets.medium, duration };
  },

  startTransition(durationMs: number = 300) {
    if (typeof window !== 'undefined') {
      (window as any).studioTransitionActive = true;
      const startEvent = new CustomEvent('studio:transition-start');
      window.dispatchEvent(startEvent);

      setTimeout(() => {
        (window as any).studioTransitionActive = false;
        const endEvent = new CustomEvent('studio:transition-end');
        window.dispatchEvent(endEvent);
      }, durationMs);
    }
  },
};

// ── 3. Navigation Coordinator ────────────────────────────────────────────────
export interface NavigationState {
  page: string;
  direction: 'forward' | 'backward';
  pageKey: number;
}

export function useNavigationCoordinator(initialPage: string) {
  const [state, setState] = useState<NavigationState>({
    page: initialPage,
    direction: 'forward',
    pageKey: 0,
  });

  const navigate = useCallback((toPage: string) => {
    AnimationCoordinator.startTransition(220);
    setState((prev) => ({
      page: toPage,
      direction: 'forward',
      pageKey: prev.pageKey + 1,
    }));
  }, []);

  const goBack = useCallback((fallbackPage: string = 'main') => {
    AnimationCoordinator.startTransition(220);
    setState((prev) => ({
      page: fallbackPage,
      direction: 'backward',
      pageKey: prev.pageKey + 1,
    }));
  }, []);

  return {
    page: state.page,
    direction: state.direction,
    pageKey: state.pageKey,
    navigate,
    goBack,
  };
}

// ── 4. Shared Transition Engine Components ─────────────────────────────────
export interface PageTransitionProps {
  children: React.ReactNode;
  direction: 'forward' | 'backward';
  type?: 'slide' | 'fade' | 'scale';
  style?: React.CSSProperties;
  className?: string;
}

export function PageTransition({
  children,
  direction,
  type = 'slide',
  style,
  className = '',
}: PageTransitionProps) {
  const prefersReduced = usePrefersReducedMotion();
  const animationSpeed = useSettingsStore((s) => s.settings?.animationSpeed);

  if (prefersReduced) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', ...style }}>
        {children}
      </div>
    );
  }

  const variants = {
    initial: () => {
      if (type === 'fade') return { opacity: 0, zIndex: 1 };
      if (type === 'scale') return { opacity: 0, scale: 0.96, zIndex: 1 };
      return {
        x: direction === 'forward' ? '100%' : '-30%',
        scale: direction === 'forward' ? 1.04 : 0.96,
        opacity: 0,
        zIndex: direction === 'forward' ? 2 : 1,
      };
    },
    animate: {
      x: '0%',
      scale: 1,
      opacity: 1,
      zIndex: 2,
    },
    exit: () => {
      if (type === 'fade') return { opacity: 0, zIndex: 0 };
      if (type === 'scale') return { opacity: 0, scale: 0.96, zIndex: 0 };
      return {
        x: direction === 'forward' ? '-30%' : '100%',
        scale: direction === 'forward' ? 0.96 : 1.0,
        opacity: 1.0,
        zIndex: direction === 'forward' ? 1 : 2,
      };
    },
  };

  const transition = AnimationCoordinator.getTransition(
    type === 'scale' ? 'spring' : 'standard',
    'normal',
    animationSpeed
  );

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        willChange: 'transform, opacity',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── 5. App Entry Transition ──────────────────────────────────────────────────
export function AppEntryTransition({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const animationSpeed = useSettingsStore((s) => s.settings?.animationSpeed);

  if (prefersReduced) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', ...style }}>
        {children}
      </div>
    );
  }

  const transition = AnimationCoordinator.getTransition(
    'spring',
    'normal',
    animationSpeed
  );

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── 6. Staggered Content Reveal ──────────────────────────────────────────────
export function StaggeredReveal({
  children,
  delayOffset = 0.05,
  staggerInterval = 45, // ms between items
  style,
  className,
}: {
  children: React.ReactNode;
  delayOffset?: number;
  staggerInterval?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const speedScale = useAnimationSpeed();
  const childrenArray = React.Children.toArray(children);

  if (prefersReduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, display: 'contents' }}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;

        const childElement = child as React.ReactElement<any>;
        const delay = delayOffset + index * (staggerInterval / 1000) * speedScale;

        let wrapperClassName = '';
        if (childElement.props && childElement.props.className) {
          const classes = childElement.props.className.split(/\s+/);
          const layoutClasses = classes.filter(
            (c: string) =>
              c.startsWith('col-span-') ||
              c.startsWith('row-span-') ||
              c.startsWith('flex-') ||
              c === 'grow' ||
              c === 'shrink'
          );
          if (layoutClasses.length > 0) {
            wrapperClassName = layoutClasses.join(' ');
          }
        }

        return (
          <motion.div
            key={index}
            className={wrapperClassName}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              ...SpringPresets.stiff,
              delay,
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              willChange: 'transform, opacity',
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}



// ── 8. Centralized M3 Transition Helpers ─────────────────────────────────────
export interface M3TransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Fade Through Transition
 * Fades out the outgoing view first, then fades in the incoming view while scaling up slightly.
 */
export function FadeThroughTransition({
  children,
  isVisible,
  className = '',
  style,
}: M3TransitionProps) {
  const prefersReduced = usePrefersReducedMotion();
  const speedScale = useAnimationSpeed();

  if (prefersReduced) {
    return isVisible ? (
      <div className={className} style={style}>
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className={className}
          style={{ ...style, willChange: 'transform, opacity' }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ ...SpringPresets.expressive, duration: DurationPresets.normal * speedScale,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Shared Axis Transition
 * Translates on the X or Y axis depending on navigation direction.
 */
export interface SharedAxisProps extends M3TransitionProps {
  axis: 'x' | 'y';
  direction: 'forward' | 'backward';
}

export function SharedAxisTransition({
  children,
  isVisible,
  axis,
  direction,
  className = '',
  style,
}: SharedAxisProps) {
  const prefersReduced = usePrefersReducedMotion();
  const speedScale = useAnimationSpeed();

  if (prefersReduced) {
    return isVisible ? (
      <div className={className} style={style}>
        {children}
      </div>
    ) : null;
  }

  const offset = axis === 'x' ? 30 : 20;
  const initialOffset = direction === 'forward' ? offset : -offset;
  const exitOffset = direction === 'forward' ? -offset : offset;

  const variants = {
    initial: {
      opacity: 0,
      [axis]: initialOffset,
    },
    animate: {
      opacity: 1,
      [axis]: 0,
    },
    exit: {
      opacity: 0,
      [axis]: exitOffset,
    },
  };

  return (
    <AnimatePresence mode="popLayout">
      {isVisible && (
        <motion.div
          className={className}
          style={{ ...style, willChange: 'transform, opacity' }}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ ...SpringPresets.expressive, duration: DurationPresets.normal * speedScale,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Container Transform Transition
 * Morphs a small element (like a card or FAB) into a large panel using Framer Motion's layoutId.
 */
export interface ContainerTransformProps {
  layoutId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function ContainerTransform({
  layoutId,
  children,
  className = '',
  style,
  onClick,
}: ContainerTransformProps) {
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      style={{ ...style, willChange: 'transform, opacity' }}
      transition={{
        ...SpringPresets.medium as any,
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
