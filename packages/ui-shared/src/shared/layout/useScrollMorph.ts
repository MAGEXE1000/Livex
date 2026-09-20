import React, { useEffect, useRef, useCallback } from 'react';

export interface UseScrollMorphOptions {
  /** The scrollable element whose scrollTop drives the morph */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /** The floating header container element */
  headerRef: React.RefObject<HTMLElement | null>;
  /** The title element being transformed */
  titleRef: React.RefObject<HTMLElement | null>;
  /** The persistent Liquid Glass surface material layer */
  glassSurfaceRef?: React.RefObject<HTMLElement | null>;
  /** Optional progressive blur backdrop layer at the top of the scroll container */
  progressiveBlurRef?: React.RefObject<HTMLElement | null>;
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
  progressiveBlurRef,
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
    compactWidth: 360,
    expandedHeight: 60,
    compactHeight: 56,
  });

  // Calculate layout geometry outside the active scroll frame to avoid layout thrashing
  const updateMetrics = useCallback(() => {
    const headerEl = headerRef.current;
    const titleEl = titleRef.current;
    if (!headerEl) return;

    const parentEl = headerEl.parentElement;
    const parentWidth = parentEl?.offsetWidth || window.innerWidth || 360;

    // Base expanded width: fills available container with standard page insets (var(--page-inset-h, 24px) each side)
    // and strictly respects canonical content max width (var(--content-max-w, 640px) - insets)
    const pageInsetH =
      (typeof window !== 'undefined' &&
        parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--page-inset-h'))) ||
      24;
    const contentMaxW =
      (typeof window !== 'undefined' &&
        parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--content-max-w'))) ||
      640;
    const maxHeaderW = contentMaxW - pageInsetH * 2;
    const expandedWidth = Math.min(parentWidth - pageInsetH * 2, maxHeaderW);
    const expandedHeight = 60;
    const compactHeight = 56;

    // Calculate content width for title + left button + right actions
    const textEl = (titleEl?.firstElementChild as HTMLElement) || titleEl;
    const titleWidth = textEl?.offsetWidth || 110;

    // Inspect left back button if present
    const backBtn = (headerEl.querySelector(
      '[data-testid="shared-floating-header-back-btn"]'
    ) || headerEl.querySelector('button[aria-label="Go back"]')) as HTMLElement | null;
    const backWidth = backBtn ? 38 : 0;

    // Inspect right action controls if present strictly via dedicated testid
    const actionsEl = headerEl.querySelector(
      '[data-testid="shared-floating-header-actions"]'
    ) as HTMLElement | null;
    const actionsWidth = actionsEl && actionsEl.offsetWidth > 0 ? actionsEl.offsetWidth : 0;

    // Symmetrically bounded content width ensuring title and any existing controls never collide
    const leftMargin = backWidth > 0 ? backWidth + 8 : 16;
    const rightMargin = actionsWidth > 0 ? actionsWidth + 8 : 16;
    const minContentWidth = titleWidth + leftMargin + rightMargin;

    // Subtle horizontal compression (max 8px each side) when content allows,
    // otherwise maintaining full width so titles never truncate.
    const targetCompact = Math.max(minContentWidth + 16, expandedWidth - 12);
    const compactWidth = Math.min(expandedWidth, targetCompact);

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
      const blurEl = progressiveBlurRef?.current;

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
      // Starts unformed at 0px and smoothly rounds to 24px, clamping to 9999px capsule pill
      if (p >= 0.96) {
        headerEl.style.borderRadius = '9999px';
      } else if (p <= 0.005) {
        headerEl.style.borderRadius = '0px';
      } else {
        const currentRadius = p * 24;
        headerEl.style.borderRadius = `${currentRadius.toFixed(1)}px`;
      }

      // ── 5. Internal spacing compression (Tight back-button inset) ─────────
      const currentPaddingLeft = 4 - p * 1.5; // 4px -> 2.5px
      const currentPaddingRight = 8 - p * 3;  // 8px -> 5px
      headerEl.style.paddingLeft = `${currentPaddingLeft.toFixed(1)}px`;
      headerEl.style.paddingRight = `${currentPaddingRight.toFixed(1)}px`;

      // Child button scale property for back button and action items
      headerEl.style.setProperty('--morph-btn-scale', (1 - p * 0.04).toFixed(3));

      // ── 6. Title typography scale (Dead-centered throughout) ───────────────
      // Title is centered in the surface across all frames: zero horizontal translation
      if (titleEl) {
        const currentScale = 1 - p * 0.06; // 1.0 -> 0.94
        titleEl.style.transform = `scale(${currentScale.toFixed(3)})`;
        titleEl.style.transformOrigin = 'center center';
      }

      // ── 7. Liquid Glass Material Progressive Emergence ────────────────────
      if (glassEl) {
        if (p <= 0.005) {
          glassEl.style.opacity = '0';
          glassEl.style.visibility = 'hidden';
        } else {
          glassEl.style.visibility = 'visible';
          // Continuous smoother physical emergence
          const surfaceAlpha = Math.min(1, Math.max(0, p));
          glassEl.style.opacity = surfaceAlpha.toFixed(3);
        }
      }

      // ── 8. Progressive Blur Zone Interpolation ────────────────────────────
      if (blurEl) {
        if (p <= 0.005) {
          blurEl.style.opacity = '0';
        } else {
          const blurAlpha = Math.min(1, Math.max(0, p * 0.95));
          blurEl.style.opacity = blurAlpha.toFixed(3);
        }
      }
    },
    [headerRef, titleRef, glassSurfaceRef, progressiveBlurRef]
  );

  useEffect(() => {
    if (!enabled) {
      applyMorph(0);
      return;
    }

    const headerEl = headerRef.current;
    if (!headerEl) return;

    const findScrollElement = (): HTMLElement | null => {
      if (scrollContainerRef?.current) {
        return scrollContainerRef.current;
      }
      const parentEl = headerEl.parentElement;
      if (parentEl) {
        const dedicated = parentEl.querySelector<HTMLElement>(
          '[data-purpose*="scroll"], [data-purpose*="scaffold"], [data-purpose*="container"], [class*="overflow-y-auto"]'
        );
        if (dedicated && dedicated !== headerEl && !headerEl.contains(dedicated)) {
          return dedicated;
        }

        let curr: HTMLElement | null = parentEl;
        while (curr && curr !== document.body && curr !== document.documentElement) {
          const style = window.getComputedStyle(curr);
          if (
            (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            curr.scrollHeight > curr.clientHeight
          ) {
            return curr;
          }
          curr = curr.parentElement;
        }
      }
      return null;
    };

    let cleanupScroll: (() => void) | null = null;

    const attachListeners = (scrollEl: HTMLElement) => {
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
    };

    const targetEl = findScrollElement();
    if (targetEl) {
      cleanupScroll = attachListeners(targetEl);
    } else {
      applyMorph(0);
      const timer = setTimeout(() => {
        const deferredEl = findScrollElement();
        if (deferredEl) {
          cleanupScroll = attachListeners(deferredEl);
        }
      }, 50);
      return () => {
        clearTimeout(timer);
        if (cleanupScroll) cleanupScroll();
      };
    }

    return () => {
      if (cleanupScroll) {
        cleanupScroll();
      }
    };
  }, [
    enabled,
    scrollContainerRef,
    headerRef,
    startOffset,
    morphDistance,
    updateMetrics,
    applyMorph,
  ]);

  return {
    updateMetrics,
  };
}
