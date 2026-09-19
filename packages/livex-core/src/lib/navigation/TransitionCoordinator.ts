import { useNavigationStore } from '../../store/useNavigationStore.js';
import { type TransitionType } from './navigationTypes';

export class TransitionCoordinator {
  /**
   * Returns whether a navigation transition is currently in progress.
   */
  public static isTransitioning(): boolean {
    return useNavigationStore.getState().isTransitioning;
  }

  /**
   * Gets the active transition type/direction.
   */
  public static getTransitionType(): TransitionType | null {
    return useNavigationStore.getState().transitionType;
  }

  /**
   * Returns a premium CSS transition cubic-bezier curve based on the transition type.
   */
  public static getTransitionEasing(type?: TransitionType | null): string {
    const activeType = type || useNavigationStore.getState().transitionType;
    const curve = (() => {
      switch (activeType) {
        case 'modal':
          return 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Elastic bounce out
        case 'sheet':
          return 'cubic-bezier(0.22, 1, 0.36, 1)'; // Quintic slide out
        case 'forward':
        case 'backward':
        default:
          return 'cubic-bezier(0.16, 1, 0.3, 1)'; // Premium ultra-smooth decelerate
      }
    })();
    return curve;
  }

  /**
   * Gets the duration of the transition in milliseconds.
   */
  public static getTransitionDuration(speed: 'normal' | 'fast' | 'reduced' = 'normal'): number {
    const duration = (() => {
      if (speed === 'reduced') return 0;
      if (speed === 'fast') return 200;
      return 300;
    })();
    return duration;
  }
}
