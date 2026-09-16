import React, { useEffect, useRef, useCallback } from 'react';

export interface UseScrollMorphOptions {
  /** The scrollable element whose scrollTop drives the morph */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** The floating header container element */
  headerRef: React.RefObject<HTMLElement | null>;
  /** The title element being transformed */
  titleRef: React.RefObject<HTMLElement | null>;
  /** The persistent Liquid Glass surface material layer */
  glassSurfaceRef?: React.RefObject<HTMLElement | null>;
  /** Optional spectral refraction layer for chromatic aberration peak (deprecated/unused) */
  spectralRef?: React.RefObject<HTMLElement | null>;
  /** Optional specular curvature highlight layer */
  specularRef?: React.RefObject<HTMLElement | null>;
  /** Scroll distance in px over which morph completes (default: 86) */
  morphDistance?: number;
  /** Scroll offset in px before morph begins (default: 14) */
  startOffset?: number;
  /** Whether the morph is enabled (default: true) */
  enabled?: boolean;
  /** Theme indicators to calibrate alpha and borders */
  isLight?: boolean;
  isAmoled?: boolean;
  /** Left inset target in px when expanded (default: 20 without back button, 52 with back button) */
  expandedLeftInset?: number;
}

/**
 * Calculates Hermite smootherstep normalized morph progress in [0, 1].
 * Uses 5th-order polynomial: 6t^5 - 15t^4 + 10t^3 with zero 1st and 2nd derivatives at endpoints.
 * Provides organic physical acceleration and settling with zero overshoot or oscillation.
 */
function calculateMorphProgress(scrollTop: number, startOffset: number, morphDistance: number): number {
  const y = Math.max(0, scrollTop);
  const rawT = Math.min(1, Math.max(0, (y - startOffset) / morphDistance));
  return rawT * rawT * rawT * (rawT * (rawT * 6 - 15) + 10);
}

export function useScrollMorph({
  scrollContainerRef,
  headerRef,
  titleRef,
  glassSurfaceRef,
  morphDistance = 86,
  startOffset = 14,
  enabled = true,
  isLight = false,
  isAmoled = false,
  expandedLeftInset,
}: UseScrollMorphOptions) {
  const rafId = useRef<number | null>(null);
  const lastP = useRef<number>(-1);
  const metricsRef = useRef<{
    expandedWidth: number;
    compactWidth: number;
    expandedHeight: number;
    compactHeight: number;
  }>({
    expandedWidth: 360,
    compactWidth: 236,
    expandedHeight: 56,
    compactHeight: 48,
  });

  // Calculate layout geometry outside the active scroll frame to avoid layout thrashing
  const updateMetrics = useCallback(() => {
    const headerEl = headerRef.current;
    const titleEl = titleRef.current;
    if (!headerEl) return;

    const parentEl = headerEl.parentElement;
    const parentWidth = parentEl?.offsetWidth || window.innerWidth || 360;

    // Base expanded width: fills available container with standard page insets (e.g. 16px/24px each side)
    const expandedWidth = Math.min(parentWidth - 32, 680);
    const expandedHeight = 56;
    const compactHeight = 48;

    // Calculate content width for title + left button + right actions
    const textEl = (titleEl?.firstElementChild as HTMLElement) || titleEl;
    const titleWidth = textEl?.offsetWidth || 110;

    // Inspect right action controls if present
    const actionsEl = headerEl.querySelector('div:last-child') as HTMLElement | null;
    const actionsWidth = actionsEl && actionsEl.offsetWidth > 44 ? actionsEl.offsetWidth : 38;
    const minContentWidth = 38 + titleWidth + actionsWidth + 24;

    // Compact pill width: contracts gracefully into an elegant floating capsule
    // On mobile (~360-390px): contracts to ~220px-248px (matching OpenDesign reference)
    // On tablet (~600px+): contracts into an elegant ~260px-300px floating capsule
    const targetCompression = Math.max(72, expandedWidth * 0.35);
    const compactWidth = Math.max(
      minContentWidth,
      Math.min(expandedWidth - targetCompression, 252)
    );

    metricsRef.current = {
      expandedWidth,
      compactWidth,
      expandedHeight,
      compactHeight,
    };
  }, [headerRef, titleRef]);

  // Direct DOM style applicator — zero React re-renders during active scrolling
  const applyMorph = useCallback(
    (p: number) => {
      const headerEl = headerRef.current;
      const titleEl = titleRef.current;
      const glassEl = glassSurfaceRef?.current;

      if (!headerEl) return;

      const { expandedWidth, compactWidth, expandedHeight, compactHeight } = metricsRef.current;

      // ── 1. Geometry: Horizontal compression (Left/right edges move inward) ──
      const currentWidth = expandedWidth - p * (expandedWidth - compactWidth);
      headerEl.style.width = `${currentWidth.toFixed(1)}px`;
      headerEl.style.maxWidth = '100%';

      // ── 2. Geometry: Vertical compression (Top/bottom dimensions compress) ──
      const currentHeight = expandedHeight - p * (expandedHeight - compactHeight);
      headerEl.style.height = `${currentHeight.toFixed(1)}px`;

      // ── 3. Geometry: Vertical position (Snug floating placement) ───────────
      const currentTranslateY = -p * 2;
      headerEl.style.transform = `translate3d(0, ${currentTranslateY.toFixed(1)}px, 0)`;

      // ── 4. Geometry: Corner curvature (Continuous monotonic rounding) ──────
      // Starts at smooth 18px and smoothly tightens to 24px (exact capsule radius for 48px height)
      // At p >= 0.96, clamps to 9999px capsule pill with zero visual step jump
      if (p >= 0.96) {
        headerEl.style.borderRadius = '9999px';
      } else {
        const currentRadius = 18 + p * 6;
        headerEl.style.borderRadius = `${currentRadius.toFixed(1)}px`;
      }

      // ── 5. Internal spacing compression (Tight back-button inset) ─────────
      const currentPaddingLeft = 4 - p * 1.5; // 4px -> 2.5px
      const currentPaddingRight = 8 - p * 3;  // 8px -> 5px
      headerEl.style.paddingLeft = `${currentPaddingLeft.toFixed(1)}px`;
      headerEl.style.paddingRight = `${currentPaddingRight.toFixed(1)}px`;

      // Child button scale property for back button and action items
      headerEl.style.setProperty('--morph-btn-scale', (1 - p * 0.08).toFixed(3));

      // ── 6. Title typography scale (Dead-centered throughout) ───────────────
      // Title is centered in the surface across all frames: zero horizontal translation
      if (titleEl) {
        const currentScale = 1 - p * 0.12; // 1.0 -> 0.88
        titleEl.style.transform = `scale(${currentScale.toFixed(3)})`;
        titleEl.style.transformOrigin = 'center center';
      }

      // ── 7. Liquid Glass Material Progressive Emergence ────────────────────
      if (glassEl) {
        if (p <= 0.001) {
          glassEl.style.opacity = '0';
          glassEl.style.visibility = 'hidden';
        } else {
          glassEl.style.visibility = 'visible';
          // Smooth progressive emergence curve (material emerges early, then stabilizes)
          const surfaceAlpha = Math.min(1, Math.pow(p, 0.9));
          glassEl.style.opacity = surfaceAlpha.toFixed(3);
        }
      }
    },
    [headerRef, titleRef, glassSurfaceRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) {
      applyMorph(0);
      return;
    }

    updateMetrics();

    // Initial positioning at current scroll position
    const initialP = calculateMorphProgress(scrollEl.scrollTop, startOffset, morphDistance);
    lastP.current = initialP;
    applyMorph(initialP);

    const onScroll = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          const p = calculateMorphProgress(scrollEl.scrollTop, startOffset, morphDistance);
          if (Math.abs(p - lastP.current) < 0.002) return;
          lastP.current = p;
          applyMorph(p);
        });
      }
    };

    const onResize = () => {
      updateMetrics();
      const p = calculateMorphProgress(scrollEl.scrollTop, startOffset, morphDistance);
      lastP.current = p;
      applyMorph(p);
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [
    enabled,
    scrollContainerRef,
    startOffset,
    morphDistance,
    updateMetrics,
    applyMorph,
  ]);

  return {
    updateMetrics,
  };
}
