import { type NavigationRoute, type NavigationHistory } from './navigationTypes';
import { useNavigationStore } from '../../store/useNavigationStore.js';

/**
 * Normalizes an incoming route partial and returns a strict NavigationRoute object.
 * Strips any extra un-mapped parameters to prevent history corruption.
 */
interface ReactNavDiagnostics {
  getMountedTree?: () => string[];
  getVisibleTree?: () => string[];
  getAnimationState?: () => string;
  getAppMode?: () => string;
  getCachedPanel?: () => any;
}

export const navDiagnosticsRegistry: ReactNavDiagnostics = {};

export function printDiagnosticsDump(reason: string): void {
  const timestamp = new Date().toISOString();
  const store = useNavigationStore.getState();
  const mountedTree = navDiagnosticsRegistry.getMountedTree
    ? navDiagnosticsRegistry.getMountedTree()
    : ['unknown'];
  const visibleTree = navDiagnosticsRegistry.getVisibleTree
    ? navDiagnosticsRegistry.getVisibleTree()
    : ['unknown'];
  const animationState = navDiagnosticsRegistry.getAnimationState
    ? navDiagnosticsRegistry.getAnimationState()
    : 'unknown';
  const appMode = navDiagnosticsRegistry.getAppMode
    ? navDiagnosticsRegistry.getAppMode()
    : 'unknown';
  const cachedPanel = navDiagnosticsRegistry.getCachedPanel
    ? navDiagnosticsRegistry.getCachedPanel()
    : null;

  console.error(`
==================================================
!!! NAVIGATION FAILURE / BLOCK DETECTED !!!
Reason: ${reason}
Timestamp: ${timestamp}
--------------------------------------------------
Current Navigation Stack (History):
${JSON.stringify(store.history, null, 2)}

Current Back Stack (Active Handlers):
${JSON.stringify(
  store.activeHandlers.map((h) => ({ id: h.id, priority: h.priority })),
  null,
  2
)}

Mounted React Tree:
${JSON.stringify(mountedTree, null, 2)}

Visible React Tree:
${JSON.stringify(visibleTree, null, 2)}

Animation State:
${animationState}

Transition State:
Type: ${store.transitionType}
Active (Locked): ${store.isTransitioning}

Current AppMode:
${appMode}

Current CachedPanel:
${JSON.stringify(cachedPanel)}

Current NavigationStore State:
Transitioning: ${store.isTransitioning}
GestureState: ${store.gestureState}
PredictiveProgress: ${store.predictiveProgress}
==================================================
  `);
}

/**
 * Normalizes an incoming route partial and returns a strict NavigationRoute object.
 * Strips any extra un-mapped parameters to prevent history corruption.
 */
export function normalizeAndValidateRoute(route: Partial<NavigationRoute>): NavigationRoute {
  try {
    if (!route.app) {
      throw new Error('[Navigation Validation] Route missing required "app" property.');
    }

    const validApps = ['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex'];
    if (!validApps.includes(route.app)) {
      throw new Error(`[Navigation Validation] Invalid "app" value: "${route.app}".`);
    }

    const normalized: NavigationRoute = {
      app: route.app,
    };

    if (route.tab) {
      const validTabs = ['home', 'settings', 'profile', 'help'];
      if (validTabs.includes(route.tab)) {
        normalized.tab = route.tab;
      }
    }

    if (typeof route.page === 'string') {
      normalized.page = route.page;
    }
    if (typeof route.subView === 'string') {
      normalized.subView = route.subView;
    }
    if (typeof route.id === 'string') {
      normalized.id = route.id;
    }

    if (route.type) {
      const validTypes = ['screen', 'modal', 'sheet', 'overlay'];
      if (validTypes.includes(route.type)) {
        normalized.type = route.type;
      }
    }

    // Normalize Hub routes to prevent duplicate/unnecessary segments
    if (normalized.app === 'hub') {
      if (!normalized.tab && normalized.page && ['home', 'settings', 'profile', 'help'].includes(normalized.page)) {
        normalized.tab = normalized.page as any;
      }
      if (normalized.page === 'main') {
        delete normalized.page;
      } else if (normalized.page === normalized.tab) {
        delete normalized.page;
      }
    }

    return normalized;
  } catch (err: any) {
    printDiagnosticsDump(err.message || 'Validation error');
    throw err;
  }
}

/**
 * Compares two routes for structural equality.
 */
export function isRouteEqual(a: NavigationRoute, b: NavigationRoute): boolean {
  return (
    a.app === b.app &&
    a.tab === b.tab &&
    a.page === b.page &&
    a.subView === b.subView &&
    a.id === b.id &&
    a.type === b.type
  );
}

/**
 * Detects recursive navigation patterns (e.g. alternating cycles in the tail of history).
 */
export function detectRecursion(history: NavigationHistory, next: NavigationRoute): boolean {
  if (history.length < 2) return false;

  // Simple cycle detection: A -> B -> A -> B
  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];

  if (isRouteEqual(secondLast, next) && isRouteEqual(last, secondLast)) {
    return true;
  }

  return false;
}

/**
 * Returns true if a transition lock is active.
 */
export function isTransitionLocked(): boolean {
  return useNavigationStore.getState().isTransitioning;
}

/**
 * Prevents popping when only the root route exists.
 */
export function isRootRouteOnly(history: NavigationHistory): boolean {
  if (history.length === 0) return true;
  const currentApp = history[history.length - 1].app;
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].app === currentApp) {
      count++;
    } else {
      break;
    }
  }
  return count <= 1;
}
