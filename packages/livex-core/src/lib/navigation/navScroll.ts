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
        _registeredScrollElements.add(el);

        const onScroll = () => {
          _lastInteractionTime = Date.now();
          const y = el.scrollTop;
          const maxScroll = el.scrollHeight - el.clientHeight;

          if (maxScroll <= 2) return;
          if (y < 0 || y > maxScroll) return;

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

    let rafId: number | null = null;
    if (!ref.current) {
      rafId = requestAnimationFrame(checkAndBind);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
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

    // Scrollable parent check utility to prevent bottom nav contraction on static pages
    const findScrollableParent = (target: EventTarget | null, dy: number): boolean => {
      if (!target || typeof window === 'undefined') return false;
      let el: HTMLElement | null = target as HTMLElement;
      while (el && el !== document.body && el !== document.documentElement) {
        if (el.nodeType !== 1) {
          el = el.parentElement;
          continue;
        }
        try {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY || style.overflow || '';
          const isScrollableStyle = overflowY === 'auto' || overflowY === 'scroll';

          if (isScrollableStyle) {
            const scrollableDist = el.scrollHeight - el.clientHeight;
            if (scrollableDist > 2) {
              if (dy > 0 && el.scrollTop < scrollableDist - 1) {
                return true;
              }
              if (dy < 0 && el.scrollTop > 1) {
                return true;
              }
            }
          }
        } catch {
          // Safety guard
        }
        el = el.parentElement;
      }

      try {
        const winScrollableDist = document.documentElement.scrollHeight - window.innerHeight;
        if (winScrollableDist > 2) {
          const winScrollTop = window.scrollY || document.documentElement.scrollTop;
          if (dy > 0 && winScrollTop < winScrollableDist - 1) {
            return true;
          }
          if (dy < 0 && winScrollTop > 1) {
            return true;
          }
        }
      } catch {
        // Safety guard
      }
      return false;
    };

    // Window-level body scroll & touch capturing listener for universal app scrolling
    let lastWindowY = window.scrollY;
    let lastTouchY = 0;

    window.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        _lastInteractionTime = Date.now();
        if (e.touches[0]) {
          lastTouchY = e.touches[0].clientY;
        }
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        _lastInteractionTime = Date.now();
        if (!e.touches[0]) return;
        const y = e.touches[0].clientY;
        const dy = lastTouchY - y; // positive when scrolling down
        if (Math.abs(dy) < 4) return;

        // Skip bottom nav scaling/offsetting if there is no scrollable parent in touch path
        if (!findScrollableParent(e.target, dy)) {
          lastTouchY = y;
          return;
        }

        lastTouchY = y;
        const deltaRatio = dy / 80;
        setNavScrollOffset(_scrollOffset + deltaRatio);
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'scroll',
      () => {
        _lastInteractionTime = Date.now();
        const y = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll <= 2) return;

        if (y < 30) {
          setNavScrollOffset(0);
          lastWindowY = y;
          return;
        }
        const dy = y - lastWindowY;
        if (Math.abs(dy) < 2) return;
        const deltaRatio = dy / 60;
        setNavScrollOffset(_scrollOffset + deltaRatio);
        lastWindowY = y;
      },
      { passive: true }
    );
  } catch (e) {
    // Passive safety guard
  }
}
