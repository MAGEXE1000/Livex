import { Capacitor } from '@capacitor/core';

export type RenderActivityReason =
  | 'user_interaction'
  | 'navigation_transition'
  | 'audio_playback'
  | 'stage_canvas'
  | 'motion_animation'
  | 'native_updater';

type ActivityListener = (isActive: boolean, activeReasons: Set<RenderActivityReason>) => void;

class RenderSchedulerClass {
  private activeReasons = new Set<RenderActivityReason>();
  private listeners = new Set<ActivityListener>();
  private isVisible = true;
  private isAppActive = true;
  private autoSleepTimers = new Map<RenderActivityReason, ReturnType<typeof setTimeout>>();
  private initialized = false;

  constructor() {
    this.initLifecycle();
  }

  private initLifecycle() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    this.isVisible = document.visibilityState === 'visible';

    document.addEventListener('visibilitychange', () => {
      this.isVisible = document.visibilityState === 'visible';
      this.notifyStateChange();
    });

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app')
        .then(({ App }) => {
          App.addListener('appStateChange', (state) => {
            this.isAppActive = state.isActive;
            this.notifyStateChange();
          });
        })
        .catch(() => {});
    }
  }

  public shouldRender(): boolean {
    if (!this.isVisible || !this.isAppActive) {
      return false;
    }
    return this.activeReasons.size > 0;
  }

  public wake(reason: RenderActivityReason, durationMs = 0) {
    this.activeReasons.add(reason);

    const existingTimer = this.autoSleepTimers.get(reason);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.autoSleepTimers.delete(reason);
    }

    if (durationMs > 0) {
      const timer = setTimeout(() => {
        this.sleep(reason);
      }, durationMs);
      this.autoSleepTimers.set(reason, timer);
    }

    this.notifyStateChange();
  }

  public sleep(reason: RenderActivityReason) {
    const existingTimer = this.autoSleepTimers.get(reason);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.autoSleepTimers.delete(reason);
    }

    this.activeReasons.delete(reason);
    this.notifyStateChange();
  }

  public requestFrame(callback: FrameRequestCallback): number | null {
    if (!this.shouldRender()) {
      return null;
    }
    return requestAnimationFrame(callback);
  }

  public subscribe(listener: ActivityListener) {
    this.listeners.add(listener);
    listener(this.shouldRender(), new Set(this.activeReasons));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStateChange() {
    const active = this.shouldRender();
    this.listeners.forEach((l) => l(active, new Set(this.activeReasons)));
  }
}

export const RenderScheduler = new RenderSchedulerClass();
