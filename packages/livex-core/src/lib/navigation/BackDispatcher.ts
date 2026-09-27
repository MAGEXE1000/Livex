import { useNavigationStore } from '../../store/useNavigationStore.js';
import { NavigationDispatcher } from './NavigationDispatcher.js';

export type BackPriority = 'modal' | 'sheet' | 'overlay' | 'nested' | 'panel';

const PRIORITY_ORDER: BackPriority[] = ['modal', 'sheet', 'overlay', 'nested', 'panel'];

export class BackDispatcher {
  private static isInitialized = false;
  private static lastBackTimestamp = 0;
  private static readonly BACK_DEBOUNCE_MS = 280;

  /**
   * Initializes global document and window listeners for back actions (Escape key, popstate, native backButton, and touch edge-swipe).
   */
  public static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // 1. Browser popstate back navigation
    window.addEventListener('popstate', () => {
      this.handleBackEvent();
    });

    // 2. Keyboard Escape key back navigation
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.handleBackEvent();
      }
    });

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();

    // 3. Capacitor Native Android Back Button (intercepts OS hardware back & system edge swipe gestures)
    try {
      if (isNative) {
        import('@capacitor/app').then(({ App: CapApp }) => {
          CapApp.addListener('backButton', () => {
            this.handleBackEvent();
          });
        }).catch(() => {});
      }
    } catch (_) {}

    // 4. Global Edge-Swipe Back Touch Gesture Listener for Web / Preview (0-44px left edge region)
    // Only registered in non-native browser preview environments to prevent double-firing on native Android
    if (!isNative) {
      let startX = 0;
      let startY = 0;
      let isEdgeSwipe = false;

      window.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          if (touch.clientX <= 44) {
            startX = touch.clientX;
            startY = touch.clientY;
            isEdgeSwipe = true;
          } else {
            isEdgeSwipe = false;
          }
        }
      }, { passive: true });

      window.addEventListener('touchend', (e: TouchEvent) => {
        if (!isEdgeSwipe) return;
        isEdgeSwipe = false;
        const touch = e.changedTouches[0];
        if (!touch) return;

        const deltaX = touch.clientX - startX;
        const deltaY = Math.abs(touch.clientY - startY);

        // Trigger back event if swiped right >= 50px with dominant horizontal vector
        if (deltaX >= 50 && deltaX > deltaY * 1.2) {
          this.handleBackEvent();
        }
      }, { passive: true });
    }

    this.isInitialized = true;
  }

  /**
   * Resets the debounce timestamp (useful for tests and newly mounted views).
   */
  public static resetDebounce(): void {
    this.lastBackTimestamp = 0;
  }

  /**
   * Registers a callback with a priority. Returns a cleanup unregister function.
   */
  public static register(priority: BackPriority, fn: () => boolean): () => void {
    this.initialize();
    this.resetDebounce();
    const id = Math.random().toString(36).substring(2, 9);
    useNavigationStore.getState().registerHandler(id, priority, fn);

    return () => {
      useNavigationStore.getState().unregisterHandler(id);
    };
  }

  /**
   * Main dispatch entry point. Checks prioritized handlers; falls back to popState.
   * Returns true if handled (consumed), false if nothing handled (indicating app should exit).
   */
  public static handleBackEvent(): boolean {
    const now = Date.now();
    if (now - this.lastBackTimestamp < this.BACK_DEBOUNCE_MS) {
      // Drop duplicate rapid-fire back invocations (e.g. native gesture + webview touch or double-tap)
      return true;
    }
    this.lastBackTimestamp = now;

    const timestamp = new Date().toISOString();
    const store = useNavigationStore.getState();
    const handlers = [...store.activeHandlers];
    // Sort handlers based on PRIORITY_ORDER index (lower index = higher priority)
    handlers.sort((a, b) => {
      const idxA = PRIORITY_ORDER.indexOf(a.priority as BackPriority);
      const idxB = PRIORITY_ORDER.indexOf(b.priority as BackPriority);
      return idxA - idxB;
    });

    // Execute handlers in priority order
    for (const handler of handlers) {
      try {
        const consumed = handler.fn();
        if (consumed) {
          return true;
        }
      } catch (err) {
        console.error(
          `[BackDispatcher] [${timestamp}] Error executing registered back handler:`,
          err
        );
      }
    }

    // Default fallback: pop navigation history
    if (NavigationDispatcher.canGoBack()) {
      NavigationDispatcher.pop();
      return true;
    }
    return false;
  }
}
