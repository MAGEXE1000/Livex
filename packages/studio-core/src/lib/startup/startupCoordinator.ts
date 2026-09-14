import { NavigationDispatcher } from '../navigation/NavigationDispatcher';
import { Capacitor } from '@capacitor/core';
import { useChordStore } from '../../store/useChordStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { syncStatusBar } from '../platform/useStatusBar';
import { applyThemeTokens } from '../preferences/themeEngine';
import {
  globalUpdateState,
  isInstallationLocked,
  isPostInstallSessionActive,
  getPostInstallSessionInfo,
} from '../updater/stateMachine';
import { logInstallLockEvent } from '../updater/diagnostics';
import { seedAudioAssets } from '../storage/assetCache';
import { UpdaterFlightRecorder } from '../updater/flightRecorder';
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
    '4': { name: 'Updater initialization', status: 'idle' },
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
    console.log(`[STARTUP-TRACE] ${time}ms ${message}` + (details ? ` | ${details}` : ''));
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

  // Polling Scheduler
  private pollingTimer: any = null;

  // Lifecycle Debouncing
  private debouncedLifecycleTimer: any = null;
  private pendingLifecycleEvents: Array<{
    type: string;
    trigger: string;
    reason: string;
    payload?: any;
  }> = [];

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
      (typeof window !== 'undefined' && (window as any).__studioStartupComplete === true)
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
    console.log(
      `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) STARTED at ${phase.startTime.toFixed(0)}ms, timeout=${timeoutMs}ms`
    );

    let attempt = 0;
    while (attempt <= maxRetries) {
      if (this.currentRunId !== runId) {
        console.log(`[STARTUP-TRACE] Phase ${phaseId} CANCELLED (runId mismatch)`);
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
        console.log(
          `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) COMPLETED in ${phase.duration?.toFixed(0)}ms`
        );
        return true;
      } catch (err: any) {
        attempt++;
        phase.retryCount = attempt;
        console.log(
          `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) FAILED attempt ${attempt}/${maxRetries}: ${err.message || err}`
        );
        if (attempt > maxRetries) {
          phase.status = 'failed';
          phase.result = 'failure';
          phase.error = err.message || String(err);
          phase.endTime = performance.now();
          phase.duration = phase.endTime - (phase.startTime || phase.endTime);
          this.notify();
          console.log(
            `[STARTUP-TRACE] Phase ${phaseId} (${phase.name}) EXHAUSTED RETRIES, duration=${phase.duration?.toFixed(0)}ms`
          );
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

    // Wait for orbits intro splash transition to finish
    console.log(
      `[STARTUP-TRACE] waitForIntroDone STARTED at ${performance.now().toFixed(0)}ms, __introDone=${(window as any).__introDone}`
    );
    await this.waitForIntroDone();
    console.log(`[STARTUP-TRACE] waitForIntroDone COMPLETED at ${performance.now().toFixed(0)}ms`);
    if (this.currentRunId !== runId) return;

    // Phase 4: Updater initialization (Runs before Hub is visible)
    const p4Success = await this.executePhase('4', 10000, async () => {
      try {
        const {
          enforceStartupRecovery,
          initializeGlobalUpdateListeners,
          runStartupInstallRecovery,
        } = await import('../updater/pipeline');
        // 1. Enforce startup recovery (restores installer session state)
        await enforceStartupRecovery();
        // 2. Initialize update listener registry
        initializeGlobalUpdateListeners();
        // 3. Trigger initial install state recovery check and await its resolution
        await runStartupInstallRecovery();
      } catch (err: any) {
        console.error('[StartupCoordinator] Phase 4 Updater init failed:', err);
        throw err;
      }
    });
    if (!p4Success || this.currentRunId !== runId) return;

    // Phase 5: Hub initialization (Runs after Updater is ready, showing Hub)
    const p5Success = await this.executePhase('5', 5000, async () => {
      // Dispatch UI mounting events (sets startupComplete = true in App.tsx)
      console.log(
        `[STARTUP-TRACE] Phase 5: calling onHubShow() at ${performance.now().toFixed(0)}ms`
      );
      onHubShow();
      console.log(
        `[STARTUP-TRACE] Phase 5: onHubShow() returned, awaiting hubMountedPromise at ${performance.now().toFixed(0)}ms`
      );

      // Await the Hub mounting notification if not already mounted
      const isDomMounted =
        typeof document !== 'undefined' &&
        !!(
          document.querySelector('[data-livex-hub-root="true"]') ||
          document.getElementById('hub-root')
        );
      if (!this.isHubMounted && !isDomMounted) {
        await this.hubMountedPromise;
        console.log(
          `[STARTUP-TRACE] Phase 5: hubMountedPromise RESOLVED at ${performance.now().toFixed(0)}ms`
        );
      } else {
        console.log(
          `[STARTUP-TRACE] Phase 5: Hub already mounted (isHubMounted=${this.isHubMounted}, isDomMounted=${isDomMounted}) at ${performance.now().toFixed(0)}ms`
        );
      }

      // Await two requestAnimationFrames to ensure it has painted and the first frame is committed
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      console.log(`[STARTUP-TRACE] Phase 5: 2x rAF COMPLETED at ${performance.now().toFixed(0)}ms`);
      if (typeof window !== 'undefined' && (window as any).__bootTimings) {
        (window as any).__bootTimings.hubVisible = performance.now();
      }

      // Set complete gate to true (enables Updater listener checks)
      if (typeof window !== 'undefined') {
        (window as any).__studioStartupComplete = true;
        console.log(
          `[STARTUP-TRACE] Phase 5: startup complete at ${performance.now().toFixed(0)}ms`
        );
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

  private waitForIntroDone(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      if ((window as any).__introDone || sessionStorage.getItem('studio-intro-shown') === 'true') {
        resolve();
        return;
      }

      let resolved = false;
      let checkInterval: any = null;

      const doneTimer = this.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (checkInterval) clearInterval(checkInterval);
          resolve();
        }
      }, 2500);

      checkInterval = setInterval(() => {
        if ((window as any).__introDone) {
          if (!resolved) {
            resolved = true;
            clearInterval(checkInterval);
            const idx = this.activeTimers.indexOf(doneTimer);
            if (idx !== -1) this.activeTimers.splice(idx, 1);
            clearTimeout(doneTimer);
            if (typeof requestAnimationFrame !== 'undefined') {
              requestAnimationFrame(() => resolve());
            } else {
              resolve();
            }
          }
        }
      }, 50);
    });
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
    this.stopPeriodicUpdatePolling();
    if (this.debouncedLifecycleTimer) {
      clearTimeout(this.debouncedLifecycleTimer);
      this.debouncedLifecycleTimer = null;
    }
    this.pendingLifecycleEvents = [];

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

  // --- Lifecycle Coordination & Polling ---
  private setupLifecycleListeners() {
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        RenderScheduler.wake('user_interaction', 2000);
        const settings = useSettingsStore.getState().settings;
        if (settings.highRefreshRate) {
          this.startHiFpsTick();
        }
        this.startPeriodicUpdatePolling();
        this.handleLifecycleEvent(
          'visibilitychange',
          'lifecycle_visibility',
          'visibilitychange visible'
        );
      } else {
        RenderScheduler.sleep('user_interaction');
        this.stopHiFpsTick();
        this.stopPeriodicUpdatePolling();
      }
    });

    this.addEventListener(window, 'focus', () => {
      this.handleLifecycleEvent('focus', 'lifecycle_focus', 'window focus');
    });
    this.addEventListener(window, 'pageshow', () => {
      this.handleLifecycleEvent('pageshow', 'lifecycle_focus', 'window focus');
    });
    this.addEventListener(window, 'online', () => {
      this.handleLifecycleEvent('online', 'lifecycle_focus', 'window focus');
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
              this.startPeriodicUpdatePolling();
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
              this.stopPeriodicUpdatePolling();
              // Cancel mid-boot if app goes to background, BUT only if no installation
              // is in progress. The PackageInstaller overlay causes appStateChange(false)
              // even during an active installation — we must never reset startup then.
              if (!this.isCompleted) {
                if (isInstallationLocked()) {
                  logInstallLockEvent(
                    'CANCEL_BLOCKED',
                    'StartupCoordinator.cancel() suppressed: app backgrounded during active installation'
                  );
                } else {
                  this.cancel('app_backgrounded');
                }
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

  private startPeriodicUpdatePolling() {
    if (this.pollingTimer) {
      this.logStartup('startPeriodicUpdatePolling() RETURN', 'already running');
      return;
    }

    this.logStartup('startPeriodicUpdatePolling() STARTED');
    const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes
    this.pollingTimer = setInterval(() => {
      this.logStartup(
        'polling timer FIRING',
        'triggerUpdateCheck polling periodic foreground poll'
      );
      const autoCheck = true;
      if (
        autoCheck &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      ) {
        void this.triggerUpdateCheck('polling', 'periodic foreground poll');
      }
    }, POLL_INTERVAL);
  }

  private stopPeriodicUpdatePolling() {
    if (this.pollingTimer) {
      this.logStartup('stopPeriodicUpdatePolling() CALLED');
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private handleLifecycleEvent(type: string, trigger: string, reason: string, payload?: any) {
    this.logStartup(
      'handleLifecycleEvent() CALLED',
      `type=${type}, trigger=${trigger}, reason=${reason}`
    );
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

    const autoCheck = true;
    if (!autoCheck) {
      this.logStartup('handleLifecycleEvent() RETURN', 'autoCheck disabled');
      return;
    }

    // ==================================================
    // DESIRED ARCHITECTURE: SCHEDULER ISOLATION
    // ==================================================
    // During an active installation session there should be NO new update checks scheduled at all.
    const otaState = globalUpdateState.updateState;
    const isUpdatePendingOrActive =
      isInstallationLocked() ||
      isPostInstallSessionActive() ||
      ['UPDATE_AVAILABLE', 'RECOVERY', 'FETCH_APK_INFORMATION'].includes(otaState);

    if (isUpdatePendingOrActive) {
      this.logStartup(
        'handleLifecycleEvent() RETURN',
        `Blocked lifecycle check: isInstallationLocked=${isInstallationLocked()}, isPostInstallSessionActive=${isPostInstallSessionActive()}, otaState=${otaState}`
      );
      return;
    }

    // Coalesce events to prevent trigger storms (e.g. visibilitychange + focus on resume)
    this.pendingLifecycleEvents.push({ type, trigger, reason, payload });

    if (this.debouncedLifecycleTimer) {
      clearTimeout(this.debouncedLifecycleTimer);
    }

    this.debouncedLifecycleTimer = setTimeout(() => {
      this.debouncedLifecycleTimer = null;
      this.flushPendingLifecycleEvents();
    }, 200);
  }

  private flushPendingLifecycleEvents() {
    if (this.pendingLifecycleEvents.length === 0) return;

    const events = [...this.pendingLifecycleEvents];
    this.pendingLifecycleEvents = [];

    const types = events.map((e) => e.type);
    const hasTriggerEvent = events.some(
      (evt) =>
        evt.type === 'visibilitychange' ||
        evt.type === 'focus' ||
        evt.type === 'pageshow' ||
        evt.type === 'online' ||
        evt.type === 'appStateChange'
    );

    if (hasTriggerEvent) {
      const primaryEvent =
        events.find((e) => e.type === 'appStateChange') ||
        events.find((e) => e.type === 'visibilitychange') ||
        events[0];
      void this.triggerUpdateCheck(primaryEvent.trigger, `Coalesced: ${primaryEvent.reason}`);
    }
  }

  private async triggerUpdateCheck(trigger: string, reason: string) {
    try {
      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'triggerUpdateCheck',
        caller: 'StartupCoordinator',
        reason: `Trigger: ${trigger}, Reason: ${reason}`,
      });

      // Post-install session guard — blocks ALL lifecycle-triggered update checks
      if (isPostInstallSessionActive()) {
        const info = getPostInstallSessionInfo();
        this.logStartup(
          'triggerUpdateCheck() RETURN',
          `Blocked because isPostInstallSessionActive() storedVersion=${info.storedVersion}`
        );
        logInstallLockEvent(
          'STARTUP_BLOCKED',
          `triggerUpdateCheck blocked: post-install session active. storedVersion=${info.storedVersion}`,
          { trigger }
        );

        UpdaterFlightRecorder.record({
          thread: 'js',
          sessionId: null,
          workflowId: null,
          eventType: 'triggerUpdateCheckBlocked',
          caller: 'StartupCoordinator',
          reason: `Blocked check (post-install session active). Trigger: ${trigger}, Reason: ${reason}`,
          warning: 'STARTUP_BLOCKED_POST_INSTALL_SESSION',
        });
        return;
      }

      const { checkForUpdate, getInstallRecoveryPromise } = await import('../updater/pipeline');

      // ─── Race-prevention gate ────────────────────────────────────────────
      const recoveryPromise = getInstallRecoveryPromise();
      if (recoveryPromise) {
        this.logStartup(
          'triggerUpdateCheck() WAIT',
          `Awaiting installRecoveryPromise before proceeding`
        );
        logInstallLockEvent(
          'RACE_BLOCKED',
          `triggerUpdateCheck yielded to installRecoveryPromise: trigger=${trigger}, reason=${reason}`,
          { trigger }
        );

        UpdaterFlightRecorder.record({
          thread: 'js',
          sessionId: null,
          workflowId: null,
          eventType: 'triggerUpdateCheckYielded',
          caller: 'StartupCoordinator',
          reason: `Awaiting in-flight install recovery. Trigger: ${trigger}, Reason: ${reason}`,
        });

        await recoveryPromise;
        this.logStartup('triggerUpdateCheck() RESUMED', 'installRecoveryPromise resolved');
      }
      // ─────────────────────────────────────────────────────────────────────

      // Use isInstallationLocked()
      if (isInstallationLocked()) {
        this.logStartup('triggerUpdateCheck() RETURN', 'Blocked because isInstallationLocked()');
        logInstallLockEvent(
          'STARTUP_BLOCKED',
          `triggerUpdateCheck blocked: trigger=${trigger}, reason=${reason}`,
          { trigger }
        );

        UpdaterFlightRecorder.record({
          thread: 'js',
          sessionId: null,
          workflowId: null,
          eventType: 'triggerUpdateCheckBlocked',
          caller: 'StartupCoordinator',
          reason: `Blocked check (installation locked). Trigger: ${trigger}, Reason: ${reason}`,
          warning: 'STARTUP_BLOCKED_INSTALLATION_LOCKED',
        });
        return;
      }

      const otaState = globalUpdateState.updateState;
      const isUpdating = ![
        'IDLE',
        'NO_UPDATE_AVAILABLE',
        'INSTALL_FAILED',
        'INSTALL_CANCELLED',
      ].includes(otaState);
      if (isUpdating) {
        this.logStartup(
          'triggerUpdateCheck() RETURN',
          `Blocked because updater active in state ${otaState}`
        );
        UpdaterFlightRecorder.record({
          thread: 'js',
          sessionId: null,
          workflowId: null,
          eventType: 'triggerUpdateCheckBlocked',
          caller: 'StartupCoordinator',
          reason: `Blocked check (updater active in state: ${otaState}). Trigger: ${trigger}, Reason: ${reason}`,
          warning: 'STARTUP_BLOCKED_UPDATER_ACTIVE',
        });
        return;
      }

      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'triggerUpdateCheckProceed',
        caller: 'StartupCoordinator',
        reason: `Proceeding to checkForUpdate. Trigger: ${trigger}, Reason: ${reason}`,
      });
      this.logStartup('triggerUpdateCheck() PROCEED', `calling checkForUpdate(${trigger})`);
      void checkForUpdate(false, trigger, reason);
    } catch (err) {
      console.error('[StartupCoordinator] Failed to trigger update check:', err);

      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'triggerUpdateCheckError',
        caller: 'StartupCoordinator',
        reason: `Failed to trigger update check. Trigger: ${trigger}, Reason: ${reason}`,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private flushQueuedEvents() {
    this.logStartup('flushQueuedEvents() CALLED', `queuedEvents=${this.queuedEvents.length}`);
    const hasTriggerEvent = this.queuedEvents.some(
      (evt) =>
        evt.type === 'visibilitychange' ||
        evt.type === 'focus' ||
        evt.type === 'pageshow' ||
        evt.type === 'online' ||
        evt.type === 'appStateChange'
    );

    this.queuedEvents = [];
    this.notify();

    // Trigger update check and start periodic update polling on startup completion
    this.startPeriodicUpdatePolling();

    // Guard: never fire an automatic update check if an installation is in progress
    // or just completed. The PackageInstaller dialog causes a brief startup reset
    // which queues events — flushing those queued events must not start a new check
    // that races with the completion callback and shows "Studio is up to date".
    if (isInstallationLocked()) {
      this.logStartup('flushQueuedEvents() RETURN', 'Blocked because isInstallationLocked()');
      logInstallLockEvent(
        'STARTUP_BLOCKED',
        'flushQueuedEvents: startup update check skipped due to installation lock',
        { trigger: 'startup_flush' }
      );
      return;
    }

    if (hasTriggerEvent) {
      this.logStartup('flushQueuedEvents() PROCEED', 'triggerUpdateCheck queued_lifecycle');
      void this.triggerUpdateCheck('queued_lifecycle', 'flushed boot events');
    } else {
      this.logStartup('flushQueuedEvents() PROCEED', 'triggerUpdateCheck startup');
      void this.triggerUpdateCheck('startup', 'app_boot_complete');
    }
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
