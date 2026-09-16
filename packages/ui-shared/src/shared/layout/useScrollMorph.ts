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
  /** Scroll distance in px over which morph completes (default: 74) */
  morphDistance?: number;
  /** Scroll offset in px before morph begins (default: 6) */
  startOffset?: number;
  /** Whether the morph is enabled (default: true) */
  enabled?: boolean;
  /** Theme indicators to calibrate alpha and borders */
  isLight?: boolean;
  isAmoled?: boolean;
  /** Left inset target in px when expanded (default: 20 without back button, 52 with back button) */
  expandedLeftInset?: number;
}

export function useScrollMorph({
  scrollContainerRef,
  headerRef,
  titleRef,
  glassSurfaceRef,
  morphDistance = 74,
  startOffset = 6,
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
    compactWidth: 296,
    expandedHeight: 58,
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
    const expandedHeight = 58;
    const compactHeight = 48;

    // Calculate content width for title + left button + right actions
    const textEl = (titleEl?.firstElementChild as HTMLElement) || titleEl;
    const titleWidth = textEl?.offsetWidth || 120;
    // Left back button (~42px) + title + right balance/actions (~42px) + generous padding (~36px)
    const minContentWidth = 42 + titleWidth + 42 + 36;

    // Compact pill width: contracts inward gracefully while preserving content breathing room
    // On mobile (~360px): contracts by ~64px (e.g. 358px -> 294px).
    // On tablet (~600px): contracts into an elegant ~360px floating capsule.
    const targetCompression = Math.max(56, Math.min(84, expandedWidth * 0.18));
    const compactWidth = Math.max(
      minContentWidth,
      Math.min(expandedWidth - targetCompression, 380)
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

      // ── 4. Geometry: Corner curvature (Progressively more rounded) ─────────
      // Starts at smooth 16px and tightens to 9999px capsule pill
      if (p >= 0.65) {
        headerEl.style.borderRadius = '9999px';
      } else {
        const currentRadius = 16 + p * 40;
        headerEl.style.borderRadius = `${currentRadius.toFixed(1)}px`;
      }

      // ── 5. Internal spacing compression ───────────────────────────────────
      const currentPaddingH = 10 - p * 4; // 10px -> 6px
      headerEl.style.paddingLeft = `${currentPaddingH.toFixed(1)}px`;
      headerEl.style.paddingRight = `${currentPaddingH.toFixed(1)}px`;

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
          // Smooth progressive emergence curve
          const surfaceAlpha = Math.min(1, Math.pow(p, 0.75));
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
    const initialY = Math.max(0, scrollEl.scrollTop);
    const initialP = Math.min(1, Math.max(0, (initialY - startOffset) / morphDistance));
    lastP.current = initialP;
    applyMorph(initialP);

    const onScroll = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          const y = Math.max(0, scrollEl.scrollTop);
          const p = Math.min(1, Math.max(0, (y - startOffset) / morphDistance));
          if (Math.abs(p - lastP.current) < 0.002) return;
          lastP.current = p;
          applyMorph(p);
        });
      }
    };

    const onResize = () => {
      updateMetrics();
      const y = Math.max(0, scrollEl.scrollTop);
      const p = Math.min(1, Math.max(0, (y - startOffset) / morphDistance));
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
