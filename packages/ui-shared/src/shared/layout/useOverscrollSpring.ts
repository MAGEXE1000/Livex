import { useEffect, useRef } from 'react';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

export interface UseOverscrollSpringOptions {
  /** The scrollable DOM container (with overflow-y: auto) */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /**
   * Maximum visual displacement in pixels.
   * Enforces a strict, subtle visual boundary limit (default: 44px).
   */
  maxDisplacement?: number;
  /**
   * Rubber-band resistance constant (default: 0.45).
   * Controls progressive elasticity before reaching saturation.
   */
  resistance?: number;
  /**
   * Enabled flag (default: true).
   */
  enabled?: boolean;
}

/**
 * Bounded asymptotic rubber-band resistance curve.
 * Strictly guarantees that displacement asymptotically saturates at maxLimit
 * and can NEVER exceed maxLimit under any velocity or touch displacement.
 */
export function calculateOverscrollDisplacement(
  pullDistance: number,
  maxLimit: number = 44,
  resistance: number = 0.45
): number {
  const absPull = Math.abs(pullDistance);
  const d = maxLimit * (1 - 1 / (1 + (absPull * resistance) / maxLimit));
  return pullDistance < 0 ? -d : d;
}

/**
 * useOverscrollSpring
 *
 * Provides a native-feeling, bounded, elastic overscroll bounce interaction
 * across Livex scrollable screens.
 *
 * Performance Contract:
 * - Zero React state updates during drag or spring return.
 * - Hardware-accelerated compositor-friendly `translate3d(0, y, 0)`.
 * - Direct DOM style application via requestAnimationFrame.
 * - Completely idle after settling (0 running loops, timers, or memory leaks).
 * - Safe for Android WebView and mobile browsers.
 */
export function useOverscrollSpring({
  scrollContainerRef,
  maxDisplacement = 44,
  resistance = 0.45,
  enabled = true,
}: UseOverscrollSpringOptions): void {
  const prefersReduced = useAppReducedMotion();
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    // Track touch state
    let startY = 0;
    let startX = 0;
    let boundaryY = 0;
    let isTracking = false;
    let isOverscrolling = false;
    let currentDisplacement = 0;

    // Velocity history (sliding window of last 3 samples)
    let lastMoveTime = 0;
    let lastMoveY = 0;
    let releaseVelocity = 0;

    // Effective max displacement respecting accessibility
    const effectiveMax = prefersReduced ? 0 : maxDisplacement;

    function applyTransform(y: number) {
      currentDisplacement = y;
      if (Math.abs(y) < 0.1) {
        container!.style.transform = '';
        container!.style.willChange = '';
      } else {
        container!.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        container!.style.willChange = 'transform';
      }
    }

    /**
     * Analytical damped harmonic oscillator.
     * Guarantees physically coherent return to resting state with zero perpetual loop.
     */
    function springReturn(initialDisplacement: number, initialVelocity: number = 0) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // If reduced motion is requested, instantly reset
      if (prefersReduced || effectiveMax === 0) {
        applyTransform(0);
        return;
      }

      const startTime = performance.now();
      const d0 = initialDisplacement;
      // Physical parameters: Snappy yet soft return (zeta = 0.94, omega0 = 24 rad/s)
      const omega0 = 24;
      const zeta = 0.94;
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);

      // Bound initial velocity to avoid extreme recoil
      const v0 = Math.max(-500, Math.min(500, initialVelocity));

      function step(now: number) {
        const t = (now - startTime) / 1000;

        // Hard timeout safety: complete within 400ms
        if (t > 0.4) {
          applyTransform(0);
          rafIdRef.current = null;
          return;
        }

        // Analytical solution: y(t) = e^(-zeta*omega0*t) * [d0 * cos(omegaD*t) + ((v0 + zeta*omega0*d0)/omegaD) * sin(omegaD*t)]
        const decay = Math.exp(-zeta * omega0 * t);
        const y =
          decay *
          (d0 * Math.cos(omegaD * t) +
            ((v0 + zeta * omega0 * d0) / omegaD) * Math.sin(omegaD * t));

        // Threshold check: settle cleanly when movement is sub-pixel
        if (Math.abs(y) < 0.15 && t > 0.18) {
          applyTransform(0);
          rafIdRef.current = null;
          return;
        }

        applyTransform(y);
        rafIdRef.current = requestAnimationFrame(step);
      }

      rafIdRef.current = requestAnimationFrame(step);
    }

    function handleTouchStart(e: TouchEvent) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      boundaryY = touch.clientY;
      lastMoveY = touch.clientY;
      lastMoveTime = performance.now();
      releaseVelocity = 0;
      isTracking = true;
      isOverscrolling = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isTracking || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dy = touch.clientY - startY;
      const dx = touch.clientX - startX;

      // ── Directional Priority: Protect horizontal carousels, tabs, and sliders ──
      if (!isOverscrolling) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isTracking = false;
          return;
        }
      }

      // Track velocity
      const now = performance.now();
      const dt = now - lastMoveTime;
      if (dt > 8) {
        releaseVelocity = ((touch.clientY - lastMoveY) / dt) * 1000;
        lastMoveTime = now;
        lastMoveY = touch.clientY;
      }

      const st = container!.scrollTop;
      const maxScroll = Math.max(0, container!.scrollHeight - container!.clientHeight);

      // ── TOP BOUNDARY: Pulling down when at top ──
      if (st <= 0 && dy > 0) {
        if (!isOverscrolling) {
          isOverscrolling = true;
          boundaryY = touch.clientY;
        }
        const rawPull = touch.clientY - boundaryY;
        const d = calculateOverscrollDisplacement(rawPull, effectiveMax, resistance);
        applyTransform(d);

        // Cancel browser native pull/chaining when actively overscrolling
        if (e.cancelable) {
          e.preventDefault();
        }
        return;
      }

      // ── BOTTOM BOUNDARY: Pushing up when at bottom ──
      if (st >= maxScroll - 1 && dy < 0) {
        if (!isOverscrolling) {
          isOverscrolling = true;
          boundaryY = touch.clientY;
        }
        const rawPull = touch.clientY - boundaryY;
        const d = calculateOverscrollDisplacement(rawPull, effectiveMax, resistance);
        applyTransform(d);

        // Cancel browser native pull/chaining when actively overscrolling
        if (e.cancelable) {
          e.preventDefault();
        }
        return;
      }

      // ── NATURAL SCROLLING RANGE: Clear any residual displacement ──
      if (isOverscrolling) {
        isOverscrolling = false;
        applyTransform(0);
      }
    }

    function handleTouchEnd() {
      if (!isTracking) return;
      isTracking = false;

      if (isOverscrolling && Math.abs(currentDisplacement) > 0.4) {
        isOverscrolling = false;
        springReturn(currentDisplacement, releaseVelocity);
      }
    }

    function handleTouchCancel() {
      if (!isTracking) return;
      isTracking = false;

      if (isOverscrolling && Math.abs(currentDisplacement) > 0.4) {
        isOverscrolling = false;
        springReturn(currentDisplacement, 0);
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    // touchmove requires { passive: false } to allow e.preventDefault() during boundary overscroll
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      container.style.transform = '';
      container.style.willChange = '';
    };
  }, [scrollContainerRef, maxDisplacement, resistance, enabled, prefersReduced]);
}
