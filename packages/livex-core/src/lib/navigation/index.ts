/**
 * Navigation Module — studio-core
 *
 * Single barrel for all navigation concerns:
 *   - Route types and history stack
 *   - Navigation store (Zustand)
 *   - NavigationDispatcher (push/pop/replace/reset)
 *   - NavigationCoordinator (default sub-route resolution)
 *   - BackDispatcher (hardware back / custom handlers)
 *   - GestureDispatcher (swipe-back gesture state)
 *   - TransitionCoordinator (CSS transition class resolution)
 *   - Validation guards
 *   - useBackHandler (React hook)
 *   - navScroll (scroll-hide + pill-collapse engine)
 *   - appRegistry (per-app section definitions)
 */

export * from './navigationTypes';
export * from './useNavigationStore';
export * from './NavigationDispatcher';
export * from './NavigationCoordinator';
export * from './BackDispatcher';
export * from './GestureDispatcher';
export * from './TransitionCoordinator';
export * from './validation';
export * from './useBackHandler';
export * from './navScroll';
export * from './appRegistry';
