import { NavigationDispatcher } from '../navigation/NavigationDispatcher';
import { Capacitor } from '@capacitor/core';
import { useChordStore } from '../../store/useChordStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { syncStatusBar } from '../platform/useStatusBar';
import { applyThemeTokens } from '../preferences/themeEngine';
import { seedAudioAssets } from '../storage/assetCache';
import { RenderScheduler } from '../performance/renderScheduler';

export interface StartupPhase {
  name: string;
  status: 'idle' | 'executing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  error?: string;
  retryCount?: number;
  timeout?: number;
  result?: 'success' | 'failure';
}

type Listener = (phases: Record<string, StartupPhase>) => void;

class StartupCoordinatorClass {
  private phases: Record<string, StartupPhase> = {
    '1': { name: 'Native initialization', status: 'idle' },
    '2': { name: 'Theme initialization', status: 'idle' },
    '3': { name: 'Navigation initialization', status: 'idle' },
    '4': { name: 'Platform services initialization', status: 'idle' },
    '5': { name: 'Hub initialization', status: 'idle' },
    '6': { name: 'Background services', status: 'idle' },
    '7': { name: 'Developer tools', status: 'idle' },
  };

  private listeners = new Set<Listener>();
  private isStarted = false;
  private isCompleted = false;

  // Cancellation and Cleanup Registry
  private currentRunId = 0;
  private activeTimers: any[] = [];
  private activeListeners: Array<{ target: EventTarget; type: string; handler: any }> = [];
  private cancellationReason = '';

  // Zustand Store unsubscribe token
  private storeUnsubscribe: (() => void) | null = null;
  private hifpsRafId = 0;

  private savedOnHubShow: (() => void) | null = null;

  private logStartup(message: string, details?: string) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const time =
      typeof now === 'number' && typeof (now as any).toFixed === 'function'
        ? (now as any).toFixed(0)
        : String(now);
    if (import.meta.env.DEV) {
      console.log(`[STARTUP-TRACE] ${time}ms ${message}` + (details ? ` | ${details}` : ''));
    }
  }

  private isHubMounted = false;
  private hubMountedResolver: (() => void) | null = null;
  private hubMountedPromise: Promise<void> = new Promise<void>((resolve) => {
    this.hubMountedResolver = resolve;
  });

  notifyHubMounted() {
    this.isHubMounted = true;
    this.logStartup('notifyHubMounted() CALLED', `hasResolver=${!!this.hubMountedResolver}`);
    if (this.hubMountedResolver) {
      this.hubMountedResolver();
    }
  }

  // Watchdog
  private watchdogTimer: any = null;

  // Lifecycle Coordination Queuing
  private queuedEvents: Array<{ type: string; trigger?: string; reason?: string; payload?: any }> =
    [];

  subscribe(l: Listener) {
    this.listeners.add(l);
    l({ ...this.phases });
    return () => {
      this.listeners.delete(l);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.phases }));
  }

  getPhases() {
    return { ...this.phases };
  }

  private startupCompleteSubscribers = new Set<() => void>();

  isStartupComplete() {
    return (
      this.isCompleted ||
      (typeof window !== 'undefined' &&
        ((window as any).__livexStartupComplete === true || (window as any).__studioStartupComplete === true))
    );
  }

  subscribeStartupComplete(cb: () => void): () => void {
    if (this.isStartupComplete()) {
      cb();
      return () => {};
    }
    this.startupCompleteSubscribers.add(cb);
    return () => {
      this.startupCompleteSubscribers.delete(cb);
    };
  }

  // Timer helper that registers for cleanup
  private setTimeout(fn: () => void, delay: number): any {
    this.logStartup('setTimeout() CREATED', `delay=${delay}ms`);
    const timer = setTimeout(fn, delay);
    this.activeTimers.push(timer);
    return timer;
  }

  // Listener helper that registers for cleanup
  private addEventListener(target: EventTarget, type: string, handler: any) {
    target.addEventListener(type, handler);
    this.activeListeners.push({ target, type, handler });
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, phaseName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = this.setTimeout(() => {
        reject(new Error(`Phase "${phaseName}" timed out after ${ms}ms`));
      }, ms);

      promise
        .then((res) => {
          // Remove timer from active timers list
          const idx = this.activeTimers.indexOf(timer);
          if (idx !== -1) this.activeTimers.splice(idx, 1);
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          const idx = this.activeTimers.indexOf(timer);
          if (idx !== -1) this.activeTimers.splice(idx, 1);
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async executePhase(
    phaseId: string,
    timeoutMs: number,
    fn: () => Promise<void>,
    maxRetries = 1
  ): Promise<boolean> {
    const phase = this.phases[phaseId];
    const runId = this.currentRunId;
    phase.status = 'executing';
    phase.startTime = performance.now();
    phase.timeout = timeoutMs;
    phase.retryCount = 0;
    this.notify();
    if (import.meta.env.DEV) {
      console.log(
        `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) STARTED at ${phase.startTime.toFixed(0)}ms, timeout=${timeoutMs}ms`
      );
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      if (this.currentRunId !== runId) {
        if (import.meta.env.DEV) {
          console.log(`[STARTUP-TRACE] Phase ${phaseId} CANCELLED (runId mismatch)`);
        }
        return false;
      }
      try {
        await this.withTimeout(fn(), timeoutMs, phase.name);
        if (this.currentRunId !== runId) return false;
        phase.status = 'completed';
        phase.result = 'success';
        phase.endTime = performance.now();
        phase.duration = phase.endTime - (phase.startTime || phase.endTime);
        this.notify();
        if (import.meta.env.DEV) {
          console.log(
            `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) COMPLETED in ${phase.duration?.toFixed(0)}ms`
          );
        }
        return true;
      } catch (err: any) {
        attempt++;
        phase.retryCount = attempt;
        if (import.meta.env.DEV) {
          console.log(
            `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) FAILED attempt ${attempt}/${maxRetries}: ${err.message || err}`
          );
        }
        if (attempt > maxRetries) {
          phase.status = 'failed';
          phase.result = 'failure';
          phase.error = err.message || String(err);
          phase.endTime = performance.now();
          phase.duration = phase.endTime - (phase.startTime || phase.endTime);
          this.notify();
          if (import.meta.env.DEV) {
            console.log(
              `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) EXHAUSTED RETRIES, duration=${phase.duration?.toFixed(0)}ms`
            );
          }
          return false;
        }
      }
    }
    return false;
  }

  async run(onHubShow: () => void) {
    this.logStartup('StartupCoordinator.run() CALLED', `isStarted=${this.isStarted}`);
    if (onHubShow) {
      this.savedOnHubShow = onHubShow;
    }
    if (this.isStarted) {
      this.logStartup('StartupCoordinator.run() SKIPPED', 'already started');
      return;
    }
    this.isStarted = true;
    this.isCompleted = false;
    this.cancellationReason = '';
    const runId = this.currentRunId;
    // Setup lifecycle event registration
    this.setupLifecycleListeners();

    // Start state-aware watchdog
    this.startWatchdog();

    // Phase 1: Native initialization
    const p1Success = await this.executePhase('1', 5000, async () => {
      const { Capacitor } = await import('@capacitor/core');
      const isNative = Capacitor.isNativePlatform();
      if (typeof window !== 'undefined') {
        (window as any).__nativeBootTimings = {
          checked: true,
          platform: Capacitor.getPlatform(),
        };
      }
    });
    if (!p1Success || this.currentRunId !== runId) return;

    // Phase 2: Theme & settings initialization (synchronous apply)
    const p2Success = await this.executePhase('2', 5000, async () => {
      const settings = useSettingsStore.getState().settings;
      this.syncSettings(settings);
      this.startStoreSync();
    });
    if (!p2Success || this.currentRunId !== runId) return;

    // Phase 3: Navigation initialization & Preloading
    const p3Success = await this.executePhase('3', 5000, async () => {
      const storeState = useChordStore.getState();
      const settings = useSettingsStore.getState().settings;

      // Enforce landing on Studio Hub -> Home unconditionally on cold launch
      NavigationDispatcher.openApp('hub');
      const { useNavigationStore } = await import('../../store/useNavigationStore');
      useNavigationStore.getState().setHistory([{ app: 'hub', tab: 'home' }]);

      // Seed navigation trace
      const active = NavigationDispatcher.currentApp();
      (window as any).__navigationTraceHistory = (window as any).__navigationTraceHistory || [];
      (window as any).__navigationTraceHistory.push({
        fromApp: 'none',
        toApp: active,
        timestamp: Date.now(),
        transitionDuration: 0,
        lockState: false,
        recoveredViaFailsafe: false,
      });
    });
    if (!p3Success || this.currentRunId !== runId) return;

    // Phase 4: Platform services initialization
    const p4Success = await this.executePhase('4', 1000, async () => {
      // Platform services initialized
    });
    if (!p4Success || this.currentRunId !== runId) return;

    // Phase 5: Hub initialization
    const p5Success = await this.executePhase('5', 5000, async () => {
      // Dispatch UI mounting events (sets startupComplete = true in App.tsx)
      if (import.meta.env.DEV) {
        console.log(
          `[STARTUP-TRACE] Phase 5: calling onHubShow() at ${performance.now().toFixed(0)}ms`
        );
      }
      onHubShow();
      if (import.meta.env.DEV) {
        console.log(
          `[STARTUP-TRACE] Phase 5: onHubShow() returned, awaiting hubMountedPromise at ${performance.now().toFixed(0)}ms`
        );
      }

      // Await the Hub mounting notification if not already mounted
      const isDomMounted =
        typeof document !== 'undefined' &&
        !!(
          document.querySelector('[data-livex-hub-root="true"]') ||
          document.getElementById('hub-root')
        );
      if (!this.isHubMounted && !isDomMounted) {
        await Promise.race([
          this.hubMountedPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
        if (import.meta.env.DEV) {
          console.log(
            `[STARTUP-TRACE] Phase 5: hubMountedPromise or watchdog timeout RESOLVED at ${performance.now().toFixed(0)}ms`
          );
        }
      } else {
        if (import.meta.env.DEV) {
          console.log(
            `[STARTUP-TRACE] Phase 5: Hub already mounted (isHubMounted=${this.isHubMounted}, isDomMounted=${isDomMounted}) at ${performance.now().toFixed(0)}ms`
          );
        }
      }

      // Await two requestAnimationFrames to ensure it has painted and the first frame is committed
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      if (import.meta.env.DEV) {
        console.log(`[STARTUP-TRACE] Phase 5: 2x rAF COMPLETED at ${performance.now().toFixed(0)}ms`);
      }
      if (typeof window !== 'undefined' && (window as any).__bootTimings) {
        (window as any).__bootTimings.hubVisible = performance.now();
      }

      // Set complete gate to true (signals Hub readiness)
      if (typeof window !== 'undefined') {
        (window as any).__livexStartupComplete = true;
        (window as any).__studioStartupComplete = true;
        (window as any).__livexHubReady = true;
        (window as any).__studioHubReady = true;
        try {
          window.dispatchEvent(new CustomEvent('livex-hub-ready'));
          window.dispatchEvent(new CustomEvent('studio-hub-ready'));
        } catch (_) {}
        if (import.meta.env.DEV) {
          console.log(
            `[STARTUP-TRACE] Phase 5: startup complete at ${performance.now().toFixed(0)}ms`
          );
        }
      }

      this.isCompleted = true;
      for (const subscriber of this.startupCompleteSubscribers) {
        try {
          subscriber();
        } catch (_) {}
      }
      this.flushQueuedEvents();
    });
    if (!p5Success || this.currentRunId !== runId) return;

    // Run Phases 6 & 7 asynchronously after the Hub is visible and interactive
    void this.runPhase6(runId);
    void this.runPhase7(runId);
  }

  private async runPhase6(runId: number) {
    await this.executePhase('6', 15000, async () => {
      // Supabase Authentication setup
      try {
        const { supabase } = await import('../services/supabaseClient');
        if (supabase) {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
        }
      } catch (err) {
        console.error('[StartupCoordinator] Supabase session retrieval error:', err);
      }

      // Eagerly preload heavy UI modules after main thread is idle and Hub is visible
      if (
        typeof window !== 'undefined' &&
        typeof (window as any).__preloadUIModules === 'function'
      ) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            (window as any).__preloadUIModules();
          });
        } else {
          setTimeout(() => {
            (window as any).__preloadUIModules();
          }, 500);
        }
      }

      // Defer non-critical background services
      this.setTimeout(async () => {
        if (this.currentRunId !== runId) return;
        try {
          // ensureNotificationPermission() removed
        } catch (_) {}

        try {
          await seedAudioAssets();
        } catch (_) {}

        // Clean up visual repaints log
        try {
          const diagnosticsLog = localStorage.getItem('studio_visual_repaints_log') || '[]';
          const list = JSON.parse(diagnosticsLog);
          if (list.length > 10) {
            localStorage.setItem('studio_visual_repaints_log', JSON.stringify(list.slice(-10)));
          }
        } catch (_) {}
      }, 8000);
    });
  }

  private async runPhase7(runId: number) {
    await this.executePhase('7', 5000, async () => {
      // Setup window handlers and watchdogs
      (window as any).__runFailsafeRecovery = (checkpointName: string) => {
        const checkRoot =
          document.querySelector('[data-livex-hub-root="true"]') ||
          document.getElementById('hub-root');
        if (checkRoot) return;
        if (typeof (window as any).__forceRerenderApp === 'function') {
          (window as any).__forceRerenderApp();
        }
      };
    });
  }

  // --- Cancellation and Cleanup Methods ---
  cancel(reason: string) {
    this.currentRunId++; // Invalidate running executePhase promises
    this.cancellationReason = reason;
    this.isStarted = false;
    this.isCompleted = false;

    if (reason === 'app_unmounted') {
      this.savedOnHubShow = null;
    }

    // Clear active timers and listeners
    this.cleanup();

    this.hubMountedPromise = new Promise<void>((resolve) => {
      this.hubMountedResolver = resolve;
    });

    // Reset status back to idle
    for (const phase of Object.values(this.phases)) {
      phase.status = 'idle';
      phase.error = undefined;
      phase.duration = undefined;
      phase.result = undefined;
    }

    if (typeof window !== 'undefined') {
      (window as any).__livexStartupComplete = false;
      (window as any).__studioStartupComplete = false;
    }

    this.notify();
  }

  restart(reason: string, onHubShow?: () => void) {
    this.cancel(`restart_request: ${reason}`);
    const handler =
      onHubShow ||
      (() => {
        if (typeof (window as any).__forceRerenderApp === 'function') {
          (window as any).__forceRerenderApp();
        }
      });
    void this.run(handler);
  }

  private cleanup() {
    this.activeTimers.forEach((t) => clearTimeout(t));
    this.activeTimers = [];

    this.activeListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.activeListeners = [];

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    this.stopHiFpsTick();
    this.stopWatchdog();
  }

  // --- Store settings synchronization logic ---
  private startStoreSync() {
    // Unused empty subscription removed
  }

  private startHiFpsTick() {
    // Empty perpetual rAF loop removed to save CPU/battery
  }

  private stopHiFpsTick() {
    if (this.hifpsRafId) {
      cancelAnimationFrame(this.hifpsRafId);
      this.hifpsRafId = 0;
    }
  }

  private syncSettings(settings: any) {
    applyThemeTokens(settings);
  }

  // --- Lifecycle Coordination ---
  private setupLifecycleListeners() {
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        RenderScheduler.wake('user_interaction', 2000);
        const settings = useSettingsStore.getState().settings;
        if (settings.highRefreshRate) {
          this.startHiFpsTick();
        }
        this.handleLifecycleEvent(
          'visibilitychange',
          'lifecycle_visibility',
          'visibilitychange visible'
        );
      } else {
        RenderScheduler.sleep('user_interaction');
        this.stopHiFpsTick();
      }
    });

    this.addEventListener(window, 'focus', () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.handleLifecycleEvent('focus', 'lifecycle_focus', 'window focus');
      }
    });
    this.addEventListener(window, 'pageshow', () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.handleLifecycleEvent('pageshow', 'lifecycle_focus', 'window focus');
      }
    });
    this.addEventListener(window, 'online', () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.handleLifecycleEvent('online', 'lifecycle_focus', 'window focus');
      }
    });

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app')
        .then(({ App }) => {
          App.addListener('appStateChange', (s) => {
            this.logStartup('AppStateChange EVENT', `isActive=${s.isActive}`);
            if (s.isActive) {
              const settings = useSettingsStore.getState().settings;
              if (settings.highRefreshRate) {
                this.startHiFpsTick();
              }
              if (!this.isCompleted && !this.isStarted && this.savedOnHubShow) {
                this.logStartup('Auto-restarting StartupCoordinator from appStateChange active');
                void this.run(this.savedOnHubShow);
              }
              this.handleLifecycleEvent(
                'appStateChange',
                'lifecycle_appstate',
                'native app active',
                s
              );
            } else {
              this.stopHiFpsTick();
              if (!this.isCompleted) {
                this.cancel('app_backgrounded');
              }
            }
          }).then((h) => {
            this.activeListeners.push({
              target: { removeEventListener: () => h.remove() } as any,
              type: 'appStateChange',
              handler: null,
            });
          });
        })
        .catch(() => {});
    }
  }

  private handleLifecycleEvent(type: string, trigger: string, reason: string, payload?: any) {
    this.logStartup(
      'handleLifecycleEvent() CALLED',
      `type=${type}, trigger=${trigger}, reason=${reason}`
    );

    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden' &&
      type !== 'appStateChange'
    ) {
      this.logStartup('handleLifecycleEvent() RETURN', 'suppressed while document is hidden');
      return;
    }
    if (!this.isCompleted) {
      if (!this.isStarted && this.savedOnHubShow) {
        this.logStartup(
          'handleLifecycleEvent() auto-restarting StartupCoordinator',
          `event=${type}`
        );
        void this.run(this.savedOnHubShow);
      }
      this.queuedEvents.push({ type, trigger, reason, payload });
      this.notify();
      return;
    }
  }

  private flushQueuedEvents() {
    this.logStartup('flushQueuedEvents() CALLED', `queuedEvents=${this.queuedEvents.length}`);
    this.queuedEvents = [];
    this.notify();
  }

  // --- Watchdog Redesign ---
  private startWatchdog() {
    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => {
      this.checkWatchdogStatus();
    }, 2000);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private checkWatchdogStatus() {
    const now = performance.now();

    if (this.isCompleted) {
      const hubDom =
        document.querySelector('[data-livex-hub-root="true"]') ||
        document.getElementById('hub-root');
      if (!hubDom) {
        this.triggerRecovery('HUB_DOM_MISSING_AFTER_COMPLETION');
      } else {
        // Clear watchdog once successfully booted and DOM is verified
        this.stopWatchdog();
      }
      return;
    }

    // Check if startup is stalled in an executing phase
    let activePhaseId: string | null = null;
    for (const [id, phase] of Object.entries(this.phases)) {
      if (phase.status === 'executing') {
        activePhaseId = id;
        break;
      }
    }

    if (activePhaseId) {
      const phase = this.phases[activePhaseId];
      const elapsed = now - (phase.startTime || now);
      const budget = phase.timeout || 5000;
      // Stalled if elapsed time exceeds phase budget by more than 1.5x
      if (elapsed > budget * 1.5) {
        this.triggerRecovery(`STALLED_IN_PHASE_${activePhaseId}`);
      }
    }
  }

  private triggerRecovery(reason: string) {
    console.error(`[Watchdog] Triggering startup recovery. Reason: ${reason}`);
    this.restart(`Watchdog recovery: ${reason}`);
  }

  // --- Diagnostics Output ---
  getDiagnostics() {
    const currentPhase =
      Object.entries(this.phases).find(([_, p]) => p.status === 'executing')?.[1].name || 'none';
    const completedPhases = Object.values(this.phases)
      .filter((p) => p.status === 'completed')
      .map((p) => p.name);
    const pendingPhases = Object.values(this.phases)
      .filter((p) => p.status === 'idle')
      .map((p) => p.name);
    const phaseDurations = Object.entries(this.phases).reduce(
      (acc, [_, p]) => {
        acc[p.name] = p.duration || 0;
        return acc;
      },
      {} as Record<string, number>
    );

    let totalDuration = 0;
    const p1 = this.phases['1'];
    const p5 = this.phases['5'];
    if (p1.startTime && p5.endTime) {
      totalDuration = p5.endTime - p1.startTime;
    } else if (p1.startTime) {
      totalDuration = performance.now() - p1.startTime;
    }

    return {
      currentPhase,
      completedPhases,
      pendingPhases,
      phaseDurations,
      startupDuration: totalDuration,
      startupState: this.isCompleted ? 'completed' : this.isStarted ? 'running' : 'idle',
      cancellationReason: this.cancellationReason,
      watchdogStatus: this.watchdogTimer ? 'active' : 'inactive',
      queuedEventsCount: this.queuedEvents.length,
      queuedEvents: [...this.queuedEvents],
    };
  }
}

export const StartupCoordinator = new StartupCoordinatorClass();

if (typeof window !== 'undefined') {
  (window as any).__studioStartupCoordinator = StartupCoordinator;
}
