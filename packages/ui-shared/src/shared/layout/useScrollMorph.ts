import React, { useEffect, useRef, useCallback } from 'react';

export interface UseScrollMorphOptions {
  /** The scrollable element whose scrollTop drives the morph */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** The floating header pill element */
  headerRef: React.RefObject<HTMLElement | null>;
  /** The title element being transformed from left to center */
  titleRef: React.RefObject<HTMLElement | null>;
  /** Optional spectral refraction layer for chromatic aberration peak */
  spectralRef?: React.RefObject<HTMLElement | null>;
  /** Optional specular curvature highlight layer */
  specularRef?: React.RefObject<HTMLElement | null>;
  /** Scroll distance in px over which morph completes (default: 80) */
  morphDistance?: number;
  /** Scroll offset in px before morph begins (default: 0) */
  startOffset?: number;
  /** Whether the morph is enabled (default: true) */
  enabled?: boolean;
  /** Theme indicators to calibrate alpha and borders */
  isLight?: boolean;
  isAmoled?: boolean;
  /** Left inset target in px when expanded (default: 16 without back button, 52 with back button) */
  expandedLeftInset?: number;
}

export function useScrollMorph({
  scrollContainerRef,
  headerRef,
  titleRef,
  spectralRef,
  specularRef,
  morphDistance = 80,
  startOffset = 0,
  enabled = true,
  isLight = false,
  isAmoled = false,
  expandedLeftInset,
}: UseScrollMorphOptions) {
  const rafId = useRef<number | null>(null);
  const lastP = useRef<number>(-1);
  const metricsRef = useRef<{
    deltaX: number;
    containerWidth: number;
    titleWidth: number;
  }>({
    deltaX: 90,
    containerWidth: 360,
    titleWidth: 120,
  });

  // Calculate layout geometry outside the active scroll frame to avoid layout thrashing
  const updateMetrics = useCallback(() => {
    const headerEl = headerRef.current;
    const titleEl = titleRef.current;
    if (!headerEl || !titleEl) return;

    const containerWidth = headerEl.offsetWidth || 360;
    // Measure actual text/child width rather than the full-width wrapper (left: 0, right: 0)
    const textEl = (titleEl.firstElementChild as HTMLElement) || titleEl;
    const titleWidth = textEl.offsetWidth || 120;

    // Center of title when centered in container = containerWidth / 2
    // Left edge of centered title = (containerWidth - titleWidth) / 2
    // Target left edge when expanded = expandedLeftInset (or 52 if back button exists, else 16)
    const leftTarget = expandedLeftInset !== undefined ? expandedLeftInset : 52;
    const centerLeft = (containerWidth - titleWidth) / 2;
    const deltaX = Math.max(0, centerLeft - leftTarget);

    metricsRef.current = {
      deltaX,
      containerWidth,
      titleWidth,
    };
  }, [expandedLeftInset, headerRef, titleRef]);

  // Direct DOM style applicator — zero React re-renders during active scrolling
  const applyMorph = useCallback(
    (p: number) => {
      const headerEl = headerRef.current;
      const titleEl = titleRef.current;
      const specEl = spectralRef?.current;
      const rimEl = specularRef?.current;

      if (!headerEl || !titleEl) return;

      const { deltaX } = metricsRef.current;

      // ── 1. Title transformation (Left -> Center) ──────────────────────────
      // Compositor-only: translate3d + subtle scale
      const currentX = (1 - p) * -deltaX;
      const currentScale = 1 - p * 0.16; // 1.0 (expanded ~21px) -> 0.84 (compact ~17.6px)
      titleEl.style.transform = `translate3d(${currentX.toFixed(2)}px, 0, 0) scale(${currentScale.toFixed(3)})`;
      titleEl.style.transformOrigin = 'center center';

      // ── 2. Chromatic aberration / Spectral refraction peak ─────────────────
      // Peaks at progress = 0.5 via sin(PI * p), settles to 0 at p = 0 and p = 1
      const pSpectral = Math.sin(Math.PI * p);

      if (specEl) {
        specEl.style.opacity = (pSpectral * 0.72).toFixed(3);
        specEl.style.transform = `translate3d(${((0.5 - p) * 16).toFixed(1)}px, 0, 0) scale(${(0.92 + p * 0.08).toFixed(3)})`;
      }

      if (pSpectral > 0.08) {
        const disp = (pSpectral * 1.4).toFixed(1);
        const alpha = (pSpectral * 0.45).toFixed(2);
        titleEl.style.textShadow = `-${disp}px 0 rgba(239, 68, 68, ${alpha}), ${disp}px 0 rgba(56, 189, 248, ${alpha})`;
      } else {
        titleEl.style.textShadow = 'none';
      }

      // ── 3. Header surface morph (Direct Pill — Zero Square State) ──────────
      // The surface maintains full pill curvature (9999px) at ALL frames (p in [0, 1]).
      // At p=0, background and border are 100% transparent.
      // As p > 0, the glass surface that materializes is already a fully rounded pill.
      const targetBgAlpha = isLight ? 0.82 : isAmoled ? 0.88 : 0.78;
      const targetBorderAlpha = isLight ? 0.08 : 0.10;
      const bgAlpha = (p * targetBgAlpha).toFixed(3);
      const borderAlpha = (p * targetBorderAlpha).toFixed(3);
      const blurPx = (p * 18).toFixed(1);
      const shadowAlpha = (p * 0.28).toFixed(3);

      headerEl.style.borderRadius = '9999px';

      if (p > 0.03) {
        const blurValue = `blur(${blurPx}px) saturate(${(100 + p * 80).toFixed(0)}%)`;
        headerEl.style.backdropFilter = blurValue;
        headerEl.style.setProperty('-webkit-backdrop-filter', blurValue);
      } else {
        headerEl.style.backdropFilter = 'none';
        headerEl.style.setProperty('-webkit-backdrop-filter', 'none');
      }

      if (isLight) {
        headerEl.style.backgroundColor = `rgba(255, 255, 255, ${bgAlpha})`;
        headerEl.style.borderColor = `rgba(0, 0, 0, ${borderAlpha})`;
      } else if (isAmoled) {
        headerEl.style.backgroundColor = `rgba(0, 0, 0, ${bgAlpha})`;
        headerEl.style.borderColor = `rgba(255, 255, 255, ${borderAlpha})`;
      } else {
        headerEl.style.backgroundColor = `rgba(18, 18, 22, ${bgAlpha})`;
        headerEl.style.borderColor = `rgba(255, 255, 255, ${borderAlpha})`;
      }

      headerEl.style.boxShadow =
        p > 0.05
          ? `0 ${(p * 8).toFixed(1)}px ${(p * 24).toFixed(1)}px rgba(0, 0, 0, ${shadowAlpha}), 0 1px 3px rgba(0, 0, 0, ${(p * 0.14).toFixed(3)})`
          : 'none';

      // ── 4. Specular rim highlight ─────────────────────────────────────────
      if (rimEl) {
        rimEl.style.opacity = p.toFixed(2);
      }
    },
    [headerRef, titleRef, spectralRef, specularRef, isLight, isAmoled]
  );

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

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
