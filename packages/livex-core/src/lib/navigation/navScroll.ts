import { useState, useEffect, useRef } from 'react';
import { useNavigationStore } from './useNavigationStore';
import { useApplicationTransitionStore } from './useApplicationTransitionStore';

let _lastRouteChangeTime = 0;
let _lastInteractionTime = 0;

// â”€â”€â”€ navHidden â€” programmatic full-hide (preset editor, modals, etc.) â”€â”€â”€â”€â”€â”€â”€â”€
let _hidden = false;
let _locked = false;
const _listeners = new Set<(h: boolean) => void>();

const AUTO_SHOW_MS = 4000;
let _autoShowTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoShow() {
  if (_autoShowTimer) {
    clearTimeout(_autoShowTimer);
    _autoShowTimer = null;
  }
}
function emit(hidden: boolean) {
  _listeners.forEach((fn) => fn(hidden));
}

export function setNavLocked(locked: boolean) {
  if (_locked === locked) return;
  _locked = locked;
  if (locked) {
    clearAutoShow();
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-nav-locked', 'true');
    }
    setNavHidden(true);
  } else {
    clearAutoShow();
    if (typeof window !== 'undefined') {
      document.documentElement.removeAttribute('data-nav-locked');
    }
    if (_hidden) {
      _hidden = false;
      emit(false);
      if (typeof window !== 'undefined') {
        document.documentElement.removeAttribute('data-nav-hidden');
      }
    }
  }
  onStateChanged();
}

export function setNavHidden(hidden: boolean) {
  if (_locked && !hidden) return;
  clearAutoShow();
  if (hidden && !_locked) {
    _autoShowTimer = setTimeout(() => {
      _autoShowTimer = null;
      if (_locked || !_hidden) return;
      _hidden = false;
      emit(false);
      if (typeof window !== 'undefined') {
        document.documentElement.removeAttribute('data-nav-hidden');
      }
      onStateChanged();
    }, AUTO_SHOW_MS);
  }
  if (_hidden === hidden) return;
  _hidden = hidden;
  emit(hidden);
  if (typeof window !== 'undefined') {
    if (hidden) {
      document.documentElement.setAttribute('data-nav-hidden', 'true');
    } else {
      document.documentElement.removeAttribute('data-nav-hidden');
    }
  }
  onStateChanged();
}

export function resetNav() {
  _lastRouteChangeTime = Date.now();
  clearAutoShow();
  _locked = false;
  _scrollOffset = 0;
  _scrollOffsetListeners.forEach((fn) => fn(0));
  if (_hidden) {
    _hidden = false;
    emit(false);
  }
  if (_collapsed) {
    _collapsed = false;
    _collapsedListeners.forEach((fn) => fn(false));
  }
  if (typeof window !== 'undefined') {
    document.documentElement.removeAttribute('data-nav-collapsed');
    document.documentElement.removeAttribute('data-nav-hidden');
  }
  onStateChanged();
}

export function useNavHidden(): boolean {
  const [hidden, setHidden] = useState(_hidden);
  useEffect(() => {
    _listeners.add(setHidden);
    return () => {
      _listeners.delete(setHidden);
    };
  }, []);
  return hidden;
}

// ─── navScrollOffset ── scroll-driven 40% center-scale animation offset ───
let _scrollOffset = 0;
const _scrollOffsetListeners = new Set<(o: number) => void>();

export function getNavScrollOffset(): number {
  return _scrollOffset;
}

export function setNavScrollOffset(offset: number) {
  if (_locked) return;
  const clamped = Math.max(0, Math.min(1, offset));
  if (_scrollOffset === clamped) return;
  _scrollOffset = clamped;
  _scrollOffsetListeners.forEach((fn) => fn(clamped));

  const isCollapsed = clamped >= 0.8;
  if (_collapsed !== isCollapsed) {
    _collapsed = isCollapsed;
    _collapsedListeners.forEach((fn) => fn(isCollapsed));
    if (typeof window !== 'undefined') {
      if (isCollapsed) {
        document.documentElement.setAttribute('data-nav-collapsed', 'true');
      } else {
        document.documentElement.removeAttribute('data-nav-collapsed');
      }
    }
  }
}

export function subscribeNavScrollOffset(listener: (offset: number) => void): () => void {
  _scrollOffsetListeners.add(listener);
  return () => {
    _scrollOffsetListeners.delete(listener);
  };
}

export function subscribeNavCollapsed(listener: (collapsed: boolean) => void): () => void {
  _collapsedListeners.add(listener);
  return () => {
    _collapsedListeners.delete(listener);
  };
}

export function useNavScrollOffset(): number {
  const [offset, setOffset] = useState(_scrollOffset);
  useEffect(() => {
    return subscribeNavScrollOffset(setOffset);
  }, []);
  return offset;
}

let _collapsed = false;
const _collapsedListeners = new Set<(c: boolean) => void>();

export function setNavCollapsed(collapsed: boolean) {
  if (_locked) return;
  if (_collapsed === collapsed) return;
  _collapsed = collapsed;
  _collapsedListeners.forEach((fn) => fn(collapsed));
  setNavScrollOffset(collapsed ? 1 : 0);
  if (typeof window !== 'undefined') {
    if (collapsed) {
      document.documentElement.setAttribute('data-nav-collapsed', 'true');
    } else {
      document.documentElement.removeAttribute('data-nav-collapsed');
    }
  }
  onStateChanged();
}

export function useNavCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(_collapsed);
  useEffect(() => {
    _collapsedListeners.add(setCollapsed);
    return () => {
      _collapsedListeners.delete(setCollapsed);
    };
  }, []);
  return collapsed;
}

const _registeredScrollElements = new Set<HTMLElement>();
const _elementListeners = new WeakMap<HTMLElement, () => void>();
const _elementLastY = new WeakMap<HTMLElement, number>();

export function useScrollHide(ref: React.RefObject<HTMLElement | null>, dependency?: any) {
  const lastElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let pollTimer: any = null;
    let pollCount = 0;

    const checkAndBind = () => {
      const el = ref.current;
      if (el === lastElementRef.current) return;

      if (lastElementRef.current) {
        const prev = lastElementRef.current;
        _registeredScrollElements.delete(prev);
        const listener = _elementListeners.get(prev);
        if (listener) {
          prev.removeEventListener('scroll', listener);
          _elementListeners.delete(prev);
        }
        _elementLastY.delete(prev);
      }

      lastElementRef.current = el;

      if (el) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        _registeredScrollElements.add(el);

        let cachedMaxScroll = el.scrollHeight - el.clientHeight;
        let lastDimensionsCheck = Date.now();

        const onScroll = (e?: Event) => {
          if (e && (e as any).__navScrollHandled) return;
          _lastInteractionTime = Date.now();
          const y = el.scrollTop;

          const now = _lastInteractionTime;
          if (now - lastDimensionsCheck > 500) {
            cachedMaxScroll = el.scrollHeight - el.clientHeight;
            lastDimensionsCheck = now;
          }

          if (cachedMaxScroll <= 2) {
            cachedMaxScroll = el.scrollHeight - el.clientHeight;
            if (cachedMaxScroll <= 2) return;
          }
          if (y < 0) return;

          if (y < 24) {
            setNavScrollOffset(0);
            _elementLastY.set(el, y);
            return;
          }

          const prevY = _elementLastY.get(el) ?? y;
          const dy = y - prevY;

          if (Math.abs(dy) < 1.5) return;

          // Asymmetric gesture responsiveness:
          // Downward scrolling progressively compresses/recedes (dy / 65)
          // Upward scrolling expands with instantaneous supple response (dy / 35)
          const deltaRatio = dy > 0 ? dy / 65 : dy / 35;
          setNavScrollOffset(_scrollOffset + deltaRatio);
          _elementLastY.set(el, y);
        };

        _elementLastY.set(el, el.scrollTop);
        _elementListeners.set(el, onScroll);
        el.addEventListener('scroll', onScroll, { passive: true });
      }
    };

    checkAndBind();

    if (!ref.current) {
      rafId = requestAnimationFrame(checkAndBind);
      pollTimer = setInterval(() => {
        pollCount++;
        checkAndBind();
        if (ref.current || pollCount > 30) {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        }
      }, 50);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (pollTimer !== null) clearInterval(pollTimer);
      const el = lastElementRef.current;
      if (el) {
        _registeredScrollElements.delete(el);
        const listener = _elementListeners.get(el);
        if (listener) {
          el.removeEventListener('scroll', listener);
          _elementListeners.delete(el);
        }
        _elementLastY.delete(el);
        lastElementRef.current = null;
      }
    };
  }, [ref, dependency]);
}

// ─── Watchdog Recovery System & Diagnostics ───────────────────────────────

let _hiddenStartTime = 0;

export function onStateChanged() {
  if (!_hidden) {
    _hiddenStartTime = 0;
  } else if (_hiddenStartTime === 0) {
    _hiddenStartTime = Date.now();
  }
}

let _watchdogRetryTimer: any = null;

function scheduleWatchdogRetry(delayMs: number) {
  if (typeof window === 'undefined') return;
  if (_watchdogRetryTimer) clearTimeout(_watchdogRetryTimer);
  _watchdogRetryTimer = setTimeout(() => {
    _watchdogRetryTimer = null;
    console.log(
      `[navScroll Watchdog] Executing scheduled watchdog check after interaction settled`
    );
    const tempLastInteraction = _lastInteractionTime;
    _lastInteractionTime = 0;
    resetNav();
    runWatchdogCheck();
    _lastInteractionTime = tempLastInteraction;
  }, delayMs);
}

function runWatchdogCheck() {
  if (typeof window === 'undefined') return;
  const timeSinceLastInteraction = Date.now() - _lastInteractionTime;
  // Bypasses watchdog resets during active user scrolling/interaction
  if (timeSinceLastInteraction < 1000) {
    const remaining = 1000 - timeSinceLastInteraction;
    console.log(
      `[navScroll Watchdog] Gated by interaction lockout: ${remaining}ms remaining. Scheduling retry.`
    );
    scheduleWatchdogRetry(remaining + 50);
    return;
  }
  const now = Date.now();

  if (_hidden && !_locked) {
    if (_hiddenStartTime > 0 && now - _hiddenStartTime >= 2000) {
      _hidden = false;
      _hiddenStartTime = 0;
      emit(false);
      if (typeof window !== 'undefined') {
        document.documentElement.removeAttribute('data-nav-hidden');
      }
      if ((window as any).__navMetrics) {
        (window as any).__navMetrics.fallbackActivations++;
        (window as any).__navMetrics.recoveries++;
      }
    }
  } else if (!_hidden) {
    _hiddenStartTime = 0;
  }

  const wrapper = document.querySelector('.shared-bottom-navbar-wrapper') as HTMLElement | null;
  if (wrapper) {
    const style = window.getComputedStyle(wrapper);
    if ((style.display === 'none' || style.visibility === 'hidden') && !_locked && !_hidden) {
      resetNav();
    }
  }
}

// Global Event-driven bindings
if (typeof window !== 'undefined') {
  try {
    let lastActiveRoute: string | null = null;

    useNavigationStore.subscribe((state) => {
      const activeRoute = state.history[state.history.length - 1];
      const activeRouteStr = activeRoute ? JSON.stringify(activeRoute) : 'null';

      if (activeRouteStr !== lastActiveRoute) {
        lastActiveRoute = activeRouteStr;
        resetNav();
        runWatchdogCheck();
      }
    });

    window.addEventListener('focus', () => {
      const timeSinceLastInteraction = Date.now() - _lastInteractionTime;
      if (timeSinceLastInteraction < 1000) {
        console.log(`[navScroll focus] Gated by interaction lockout, scheduling watchdog retry`);
        scheduleWatchdogRetry(1000 - timeSinceLastInteraction + 50);
        return;
      }
      resetNav();
      runWatchdogCheck();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastInteraction = Date.now() - _lastInteractionTime;
        if (timeSinceLastInteraction < 1000) {
          console.log(
            `[navScroll visibilitychange] Gated by interaction lockout, scheduling watchdog retry`
          );
          scheduleWatchdogRetry(1000 - timeSinceLastInteraction + 50);
          return;
        }
        resetNav();
        runWatchdogCheck();
      }
    });

    window.addEventListener('resize', () => {
      resetNav();
    });
    window.addEventListener('orientationchange', () => {
      resetNav();
    });

    // Universal capture-phase scroll listener for global auto-hide across all screens and containers
    const _scrollTargetLastY = new WeakMap<EventTarget, number>();

    const handleUniversalScroll = (e: Event) => {
      if ((e as any).__navScrollHandled) return;
      (e as any).__navScrollHandled = true;
      _lastInteractionTime = Date.now();
      const target = e.target;
      if (!target) return;

      let currentY = 0;
      let maxScroll = 0;

      if (
        target === window ||
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) {
        currentY =
          window.scrollY ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;
        maxScroll =
          (document.documentElement.scrollHeight || document.body.scrollHeight) -
          window.innerHeight;
      } else if (target instanceof HTMLElement) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        // Exclude modal dialogs, sheets, and popovers from driving global navbar collapse
        if (
          target.closest?.(
            '[role="dialog"], .studio-dialog, .studio-sheet, [data-surface="modal"], .profile-menu-container'
          )
        ) {
          return;
        }

        currentY = target.scrollTop;
        maxScroll = target.scrollHeight - target.clientHeight;
      } else {
        return;
      }

      // Ignore unscrollable or trivial containers (e.g. slight layout roundoff or horizontal-only scrollers)
      if (maxScroll <= 24) return;

      const lastY = _scrollTargetLastY.get(target);
      _scrollTargetLastY.set(target, currentY);

      if (lastY === undefined) {
        return;
      }

      // Instant reset when scrolled near top of the container
      if (currentY < 24) {
        setNavScrollOffset(0);
        return;
      }

      const rawDy = currentY - lastY;
      if (Math.abs(rawDy) < 1.5) return;

      // Clamp max delta per event to prevent sudden teleporting jumps on fast programmatic jumps
      const dy = Math.max(-60, Math.min(60, rawDy));

      // Asymmetric gesture responsiveness:
      // Downward scrolling progressively compresses and collapses downward (dy / 65)
      // Upward scrolling expands with instantaneous supple response (dy / 35)
      const deltaRatio = dy > 0 ? dy / 65 : dy / 35;
      setNavScrollOffset(_scrollOffset + deltaRatio);
    };

    window.addEventListener('scroll', handleUniversalScroll, {
      capture: true,
      passive: true,
    });
  } catch (e) {
    // Passive safety guard
  }
}

if (typeof window !== 'undefined') {
  (window as any).setNavScrollOffset = setNavScrollOffset;
  (window as any).getNavScrollOffset = getNavScrollOffset;
}
