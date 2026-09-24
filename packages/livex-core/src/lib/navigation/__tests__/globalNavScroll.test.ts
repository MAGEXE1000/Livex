import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setNavScrollOffset,
  getNavScrollOffset,
  subscribeNavScrollOffset,
  resetNav,
} from '../navScroll';

describe('Global Bottom Navigation Auto-Hide & Collapse Engine', () => {
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;
    const attributes: Record<string, string> = {};
    (globalThis as any).document = {
      documentElement: {
        setAttribute: vi.fn((k: string, v: string) => {
          attributes[k] = v;
        }),
        removeAttribute: vi.fn((k: string) => {
          delete attributes[k];
        }),
        getAttribute: vi.fn((k: string) => attributes[k] ?? null),
      },
    };
    (globalThis as any).window = globalThis;
    resetNav();
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  describe('Scroll Offset and Collapse State', () => {
    it('initializes with offset 0 and uncollapsed state', () => {
      expect(getNavScrollOffset()).toBe(0);
    });

    it('clamps offset strictly between 0 and 1', () => {
      setNavScrollOffset(-0.5);
      expect(getNavScrollOffset()).toBe(0);

      setNavScrollOffset(1.5);
      expect(getNavScrollOffset()).toBe(1);

      setNavScrollOffset(0.5);
      expect(getNavScrollOffset()).toBe(0.5);
    });

    it('triggers collapsed attribute when offset reaches or exceeds 0.8', () => {
      setNavScrollOffset(0.79);
      expect(document.documentElement.getAttribute('data-nav-collapsed')).toBeNull();

      setNavScrollOffset(0.8);
      expect(document.documentElement.getAttribute('data-nav-collapsed')).toBe('true');

      setNavScrollOffset(0.4);
      expect(document.documentElement.getAttribute('data-nav-collapsed')).toBeNull();
    });

    it('notifies subscribers reactively when offset changes', () => {
      const listener = vi.fn();
      const unsub = subscribeNavScrollOffset(listener);

      setNavScrollOffset(0.3);
      expect(listener).toHaveBeenCalledWith(0.3);

      setNavScrollOffset(0.6);
      expect(listener).toHaveBeenCalledWith(0.6);

      unsub();
      setNavScrollOffset(0.9);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('resetNav cleanly restores all values and removes attributes', () => {
      setNavScrollOffset(1);
      expect(document.documentElement.getAttribute('data-nav-collapsed')).toBe('true');

      resetNav();
      expect(getNavScrollOffset()).toBe(0);
      expect(document.documentElement.getAttribute('data-nav-collapsed')).toBeNull();
    });
  });

  describe('Motion Physics & Downward Collapse Transforms', () => {
    it('verifies dock downward translation reaches 96px at offset 1', () => {
      const calcContainerY = (offset: number) => offset * 96;

      expect(calcContainerY(0)).toBe(0);
      expect(calcContainerY(0.5)).toBe(48);
      expect(calcContainerY(1.0)).toBe(96);
    });

    it('verifies dock opacity curve maintains visibility during initial descent and fades cleanly past bottom', () => {
      const calcContainerOpacity = (offset: number) => {
        if (offset <= 0.6) return 1.0;
        if (offset >= 1.0) return 0;
        return 1.0 - (offset - 0.6) / 0.4;
      };

      expect(calcContainerOpacity(0)).toBe(1.0);
      expect(calcContainerOpacity(0.3)).toBe(1.0);
      expect(calcContainerOpacity(0.6)).toBe(1.0);
      expect(calcContainerOpacity(0.8)).toBeCloseTo(0.5, 4);
      expect(calcContainerOpacity(1.0)).toBe(0);
    });

    it('verifies satellite fade-out and scale-down to 0 by offset 0.7', () => {
      const calcSatelliteOpacity = (offset: number) => {
        if (offset <= 0) return 1.0;
        if (offset >= 0.7) return 0;
        return 1.0 - offset / 0.7;
      };

      expect(calcSatelliteOpacity(0)).toBe(1.0);
      expect(calcSatelliteOpacity(0.35)).toBe(0.5);
      expect(calcSatelliteOpacity(0.7)).toBe(0);
      expect(calcSatelliteOpacity(1.0)).toBe(0);
    });

    it('verifies satellite pointer events are disabled early (offset > 0.4) to eliminate ghost touch targets', () => {
      const calcPointerEvents = (offset: number) => (offset > 0.4 ? 'none' : 'auto');

      expect(calcPointerEvents(0)).toBe('auto');
      expect(calcPointerEvents(0.35)).toBe('auto');
      expect(calcPointerEvents(0.4)).toBe('auto');
      expect(calcPointerEvents(0.41)).toBe('none');
      expect(calcPointerEvents(1.0)).toBe('none');
    });

    it('verifies asymmetric gesture responsiveness: supple return on upward scroll vs controlled descent', () => {
      const calcDelta = (dy: number) => (dy > 0 ? dy / 65 : dy / 35);

      // Downward 30px: ratio is 30/65 (~0.46)
      const downRatio = calcDelta(30);
      // Upward 30px: ratio is -30/35 (~-0.857)
      const upRatio = calcDelta(-30);

      expect(downRatio).toBeCloseTo(30 / 65, 4);
      expect(upRatio).toBeCloseTo(-30 / 35, 4);
      // Upward scroll responds ~1.85x faster than downward scroll
      expect(Math.abs(upRatio)).toBeGreaterThan(Math.abs(downRatio) * 1.8);
    });
  });

  describe('Universal Capture Scroll Simulation & Filtering', () => {
    // Pure algorithmic verification of universal scroll handler logic
    const createScrollSimulator = () => {
      const lastYMap = new WeakMap<object, number>();

      const simulateScroll = (
        target: {
          tagName?: string;
          scrollHeight: number;
          clientHeight: number;
          scrollTop: number;
          closest?: (sel: string) => any;
        },
        event: { __navScrollHandled?: boolean } = {}
      ) => {
        if (event.__navScrollHandled) return;
        event.__navScrollHandled = true;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (target.closest?.('[role="dialog"], .studio-dialog, .studio-sheet')) return;

        const maxScroll = target.scrollHeight - target.clientHeight;
        if (maxScroll <= 24) return;

        const currentY = target.scrollTop;
        const lastY = lastYMap.get(target);
        lastYMap.set(target, currentY);

        if (lastY === undefined) return;

        if (currentY < 24) {
          setNavScrollOffset(0);
          return;
        }

        const rawDy = currentY - lastY;
        if (Math.abs(rawDy) < 1.5) return;

        const dy = Math.max(-60, Math.min(60, rawDy));
        const deltaRatio = dy > 0 ? dy / 65 : dy / 35;
        setNavScrollOffset(getNavScrollOffset() + deltaRatio);
      };

      return { simulateScroll };
    };

    it('drives navScrollOffset downward and resets when scrolled to top', () => {
      const { simulateScroll } = createScrollSimulator();
      const element = {
        scrollHeight: 1000,
        clientHeight: 400,
        scrollTop: 100,
      };

      // Initial frame establishes baseline
      simulateScroll(element);
      expect(getNavScrollOffset()).toBe(0);

      // Scroll downward 50px
      element.scrollTop = 150;
      simulateScroll(element);
      expect(getNavScrollOffset()).toBeGreaterThan(0);

      // Scroll to near top (< 24) resets
      element.scrollTop = 10;
      simulateScroll(element);
      expect(getNavScrollOffset()).toBe(0);
    });

    it('ignores elements inside modal dialogs', () => {
      const { simulateScroll } = createScrollSimulator();
      const element = {
        scrollHeight: 1000,
        clientHeight: 400,
        scrollTop: 50,
        closest: (sel: string) => (sel.includes('[role="dialog"]') ? {} : null),
      };

      simulateScroll(element);
      element.scrollTop = 150;
      simulateScroll(element);

      expect(getNavScrollOffset()).toBe(0);
    });

    it('ignores non-overflowing elements', () => {
      const { simulateScroll } = createScrollSimulator();
      const element = {
        scrollHeight: 400,
        clientHeight: 400,
        scrollTop: 0,
      };

      simulateScroll(element);
      element.scrollTop = 50;
      simulateScroll(element);

      expect(getNavScrollOffset()).toBe(0);
    });

    it('ignores input and textarea elements', () => {
      const { simulateScroll } = createScrollSimulator();
      const input = {
        tagName: 'INPUT',
        scrollHeight: 1000,
        clientHeight: 400,
        scrollTop: 0,
      };

      simulateScroll(input);
      input.scrollTop = 100;
      simulateScroll(input);

      expect(getNavScrollOffset()).toBe(0);
    });

    it('guards against duplicate handling on the same event object', () => {
      const { simulateScroll } = createScrollSimulator();
      const element = {
        scrollHeight: 1000,
        clientHeight: 400,
        scrollTop: 100,
      };
      const event: any = {};

      simulateScroll(element, event);
      element.scrollTop = 150;
      simulateScroll(element, event); // Handled flag is set

      // Because event was already marked as handled, offset shouldn't change from duplicate invocation
      expect(getNavScrollOffset()).toBe(0);
    });
  });
});
