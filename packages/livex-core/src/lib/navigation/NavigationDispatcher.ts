import {
  type NavigationRoute,
  type NavigationHistory,
  type TransitionType,
} from './navigationTypes';
import { useNavigationStore } from '../../store/useNavigationStore.js';
import { NavigationCoordinator } from './NavigationCoordinator.js';
import {
  normalizeAndValidateRoute,
  isRouteEqual,
  detectRecursion,
  isRootRouteOnly,
} from './validation.js';

export class NavigationDispatcher {
  private static transitionTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Pushes a new route onto the stack, applying guards and calculating transition direction.
   */
  public static push(route: Partial<NavigationRoute>): void {
    const nextRoute = NavigationCoordinator.resolveDefaultRoute(normalizeAndValidateRoute(route));
    const store = useNavigationStore.getState();
    const current = store.history[store.history.length - 1];

    if (current && isRouteEqual(current, nextRoute)) {
      return;
    }

    if (detectRecursion(store.history, nextRoute)) {
      return;
    }

    let tType: TransitionType = 'forward';
    if (nextRoute.type === 'modal') tType = 'modal';
    else if (nextRoute.type === 'sheet') tType = 'sheet';
    else if (nextRoute.type === 'overlay') tType = 'overlay';

    this.lockTransition(tType);

    const newHistory = [...store.history, nextRoute];
    store.setHistory(newHistory);
  }

  /**
   * Replaces the current top route on the stack.
   */
  public static replace(route: Partial<NavigationRoute>): void {
    const nextRoute = NavigationCoordinator.resolveDefaultRoute(normalizeAndValidateRoute(route));
    const store = useNavigationStore.getState();

    this.lockTransition('replace');

    const newHistory = [...store.history.slice(0, -1), nextRoute];
    store.setHistory(newHistory);
  }

  /**
   * Pops the top route from the stack.
   */
  public static pop(): void {
    const store = useNavigationStore.getState();
    if (isRootRouteOnly(store.history)) {
      return;
    }

    const poppedRoute = store.history[store.history.length - 1];
    let tType: TransitionType = 'backward';
    if (poppedRoute.type === 'modal') tType = 'modal';
    else if (poppedRoute.type === 'sheet') tType = 'sheet';
    else if (poppedRoute.type === 'overlay') tType = 'overlay';

    this.lockTransition(tType);

    const newHistory = store.history.slice(0, -1);
    store.setHistory(newHistory);
  }

  /**
   * Pops the stack back to the first route matching the predicate.
   */
  public static popTo(predicate: (route: NavigationRoute) => boolean): void {
    const store = useNavigationStore.getState();
    const index = store.history.findIndex(predicate);

    if (index === -1) {
      return;
    }

    if (index === store.history.length - 1) {
      return;
    }

    this.lockTransition('backward');

    const newHistory = store.history.slice(0, index + 1);
    store.setHistory(newHistory);
  }

  /**
   * Resets the entire stack to a new history.
   */
  public static reset(stack: NavigationHistory): void {
    const timestamp = new Date().toISOString();
    if (stack.length === 0) {
      throw new Error(`[NavigationDispatcher] [${timestamp}] Reset history stack cannot be empty.`);
    }

    const validatedStack = stack.map((r) =>
      NavigationCoordinator.resolveDefaultRoute(normalizeAndValidateRoute(r))
    );

    const store = useNavigationStore.getState();
    this.lockTransition('replace');
    store.setHistory(validatedStack);
  }

  /**
   * Checks if back navigation is permitted (stack history contains more than root).
   */
  public static canGoBack(): boolean {
    const store = useNavigationStore.getState();
    return !isRootRouteOnly(store.history);
  }

  /**
   * Gets the current active route.
   */
  public static currentRoute(): NavigationRoute {
    const store = useNavigationStore.getState();
    return store.history[store.history.length - 1] || { app: 'hub', tab: 'home' };
  }

  /**
   * Gets the previous route in the stack history if available.
   */
  public static previousRoute(): NavigationRoute | null {
    const store = useNavigationStore.getState();
    if (store.history.length < 2) return null;
    return store.history[store.history.length - 2];
  }

  
  /**
   * Opens an application by name.
   */
  public static openApp(appKey: NavigationRoute['app']): void {
    if (this.currentApp() === appKey) return;
    this.push({ app: appKey });
  }

  /**
   * Closes the current application and returns to the hub.
   */
  public static closeApp(): void {
    this.openApp('hub');
  }

  /**
   * Switches to a specific tab in the current application.
   */
  public static switchTab(tab: NavigationRoute['tab']): void {
    const current = this.currentRoute();
    if (current.tab === tab) return;
    this.push({ app: current.app, tab });
  }

  /**
   * Goes back to the previous route (alias for pop).
   */
  public static goBack(): void {
    this.pop();
  }

  /**
   * Gets the currently active application.
   */
  public static currentApp(): NavigationRoute['app'] {
    return this.currentRoute().app;
  }

  /**
   * Subscribes to navigation store state changes.
   */
  public static subscribe(listener: (state: any) => void): () => void {
    return useNavigationStore.subscribe(listener);
  }

  /**
   * Internal helper to lock transitioning state and auto-release it.
   */
  private static lockTransition(type: TransitionType): void {
    const store = useNavigationStore.getState();
    store.setTransition(type, true);

    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    this.transitionTimeout = setTimeout(() => {
      useNavigationStore.getState().setTransition(null, false);
      this.transitionTimeout = null;
    }, 300); // 300ms matches visual transition timing
  }
}
