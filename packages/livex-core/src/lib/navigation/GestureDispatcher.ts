import { useNavigationStore } from '../../store/useNavigationStore.js';
import { NavigationDispatcher } from './NavigationDispatcher.js';

export class GestureDispatcher {
  /**
   * Called when a swipe back or predictive back gesture initiates.
   */
  public static onGestureStart(): void {
    const timestamp = new Date().toISOString();
    useNavigationStore.getState().setGestureState('swiping', 0);
  }

  /**
   * Called repeatedly with the swipe progress percentage (0.0 to 1.0).
   */
  public static onGestureProgress(progress: number): void {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    useNavigationStore.getState().setGestureState('swiping', clampedProgress);
  }

  /**
   * Called when the gesture is canceled (e.g. swipe distance not met).
   */
  public static onGestureCancel(): void {
    const timestamp = new Date().toISOString();
    useNavigationStore.getState().setGestureState('cancelled', 0);
    setTimeout(() => {
      useNavigationStore.getState().setGestureState('idle', 0);
    }, 200);
  }

  /**
   * Called when the gesture is committed (finger lifted past trigger point).
   */
  public static onGestureCommit(): void {
    const timestamp = new Date().toISOString();
    useNavigationStore.getState().setGestureState('committed', 1);

    // Execute navigation pop
    if (NavigationDispatcher.canGoBack()) {
      NavigationDispatcher.pop();
    } else {
    }

    setTimeout(() => {
      useNavigationStore.getState().setGestureState('idle', 0);
    }, 200);
  }
}
