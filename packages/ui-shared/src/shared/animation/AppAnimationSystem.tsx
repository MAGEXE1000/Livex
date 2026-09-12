import { useSettingsStore, SpringPresets } from '@workspace/studio-core';
import React from 'react';
import { motion } from 'motion/react';


import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
export { useAppReducedMotion };

// Backward-compatible alias for existing consumers
export const usePrefersReducedMotion = useAppReducedMotion;


// Helper to check the animation duration speed coefficient
export function useAnimationSpeed() {
  const speed = useSettingsStore((state) => state.settings?.animationSpeed);
  return speed === 'fast' ? 0.6 : 1.0;
}

// ── 2. App Entry Transition ──────────────────────────────────────────────────
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

  if (prefersReduced) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', ...style }}>
        {children}
      </div>
    );
  }

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

// ── 3. Staggered Content Reveal ──────────────────────────────────────────────
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
        // Cap stagger delay calculation to max 12 items to prevent long-list animation lag
        const cappedIndex = Math.min(index, 12);
        const delay = delayOffset + cappedIndex * (staggerInterval / 1000) * speedScale;

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

        const stableKey = childElement.key ?? index;

        return (
          <motion.div
            key={stableKey}
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
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}

