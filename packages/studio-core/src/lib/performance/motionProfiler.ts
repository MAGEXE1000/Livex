// motionProfiler.ts - High-precision, zero-distortion motion & interaction profiler

export interface FrameTimingSummary {
  frameCount: number;
  totalDurationMs: number;
  measuredFps: number;
  avgFrameDurationMs: number;
  minFrameDurationMs: number;
  maxFrameDurationMs: number;
  droppedFrames60: number; // frame > 20.0ms
  droppedFrames120: number; // frame > 10.0ms
  frameTimes: number[]; // individual rAF deltas in ms
}

export interface LongTaskEntry {
  startTime: number;
  duration: number;
  name?: string;
}

export interface MotionTrace {
  id: string;
  name: 'app-switch' | 'morph-open' | 'morph-close' | 'rapid-retrigger' | 'settings-change' | string;
  target?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  frameTiming: FrameTimingSummary;
  longTasks: LongTaskEntry[];
  totalBlockingTimeMs: number;
  layoutShiftScore: number;
  rendersCount: number;
  componentRenders: Record<string, number>;
  metadata: Record<string, any>;
}

export interface RapidRetriggerMetric {
  surfaceId: string;
  closeStartTime: number;
  closeEndTime: number | null;
  attemptTime: number;
  timeSinceCloseStartMs: number;
  timeSinceCloseEndMs: number | null;
  blockedByExitOverlay: boolean;
  notes: string;
}

class ActiveTraceTracker {
  public readonly id: string;
  public readonly name: string;
  public readonly target?: string;
  public readonly startTime: number;
  public readonly metadata: Record<string, any>;

  private frameDeltas: number[] = [];
  private longTasks: LongTaskEntry[] = [];
  private componentRenders: Record<string, number> = {};
  private layoutShiftScore = 0;
  private lastRafTime: number;
  private rafId: number | null = null;
  private isStopped = false;

  constructor(id: string, name: string, target?: string, metadata: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.metadata = { ...metadata };
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastRafTime = this.startTime;

    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      try {
        performance.mark(`livex:${this.name}:start:${this.id}`);
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const loop = (time: number) => {
        if (this.isStopped) return;
        const delta = time - this.lastRafTime;
        this.lastRafTime = time;
        if (delta > 0) {
          this.frameDeltas.push(parseFloat(delta.toFixed(2)));
        }
        this.rafId = window.requestAnimationFrame(loop);
      };
      this.rafId = window.requestAnimationFrame(loop);
    }
  }

  public recordRender(componentName: string) {
    if (this.isStopped) return;
    this.componentRenders[componentName] = (this.componentRenders[componentName] || 0) + 1;
  }

  public recordLongTask(entry: LongTaskEntry) {
    if (this.isStopped) return;
    this.longTasks.push(entry);
  }

  public recordLayoutShift(score: number) {
    if (this.isStopped) return;
    this.layoutShiftScore += score;
  }

  public stop(): MotionTrace {
    if (this.isStopped) {
      throw new Error(`Trace ${this.id} already stopped`);
    }
    this.isStopped = true;

    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = parseFloat((endTime - this.startTime).toFixed(2));

    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      try {
        const startMark = `livex:${this.name}:start:${this.id}`;
        const endMark = `livex:${this.name}:end:${this.id}`;
        performance.mark(endMark);
        if (typeof performance.measure === 'function') {
          performance.measure(`livex:${this.name}:${this.target || ''}`, startMark, endMark);
        }
      } catch (_) {}
    }

    const frameCount = this.frameDeltas.length;
    const totalFrameDuration = this.frameDeltas.reduce((a, b) => a + b, 0);
    const measuredFps = durationMs > 0 && frameCount > 0
      ? parseFloat(((frameCount * 1000) / durationMs).toFixed(1))
      : 0;
    const avgFrameDurationMs = frameCount > 0
      ? parseFloat((totalFrameDuration / frameCount).toFixed(2))
      : 0;
    const minFrameDurationMs = frameCount > 0 ? Math.min(...this.frameDeltas) : 0;
    const maxFrameDurationMs = frameCount > 0 ? Math.max(...this.frameDeltas) : 0;
    const droppedFrames60 = this.frameDeltas.filter((d) => d > 20.0).length;
    const droppedFrames120 = this.frameDeltas.filter((d) => d > 10.0).length;
    const totalBlockingTimeMs = parseFloat(
      this.longTasks.reduce((sum, t) => sum + t.duration, 0).toFixed(2)
    );

    return {
      id: this.id,
      name: this.name,
      target: this.target,
      startTime: parseFloat(this.startTime.toFixed(2)),
      endTime: parseFloat(endTime.toFixed(2)),
      durationMs,
      frameTiming: {
        frameCount,
        totalDurationMs: durationMs,
        measuredFps,
        avgFrameDurationMs,
        minFrameDurationMs,
        maxFrameDurationMs,
        droppedFrames60,
        droppedFrames120,
        frameTimes: [...this.frameDeltas],
      },
      longTasks: [...this.longTasks],
      totalBlockingTimeMs,
      layoutShiftScore: parseFloat(this.layoutShiftScore.toFixed(4)),
      rendersCount: Object.values(this.componentRenders).reduce((a, b) => a + b, 0),
      componentRenders: { ...this.componentRenders },
      metadata: { ...this.metadata },
    };
  }
}

export class MotionProfilerClass {
  private activeTraces = new Map<string, ActiveTraceTracker>();
  private completedTraces: MotionTrace[] = [];
  private rapidRetriggerLog: RapidRetriggerMetric[] = [];
  private surfaceCloseStates = new Map<
    string,
    { closeStartTime: number; closeEndTime: number | null }
  >();

  private longTaskObserver: PerformanceObserver | null = null;
  private layoutShiftObserver: PerformanceObserver | null = null;
  private isObserving = false;
  private subscribers = new Set<(trace: MotionTrace) => void>();

  constructor() {
    this.initObservers();
    if (typeof window !== 'undefined') {
      (window as any).__motionProfiler = this;
    }
  }

  private initObservers() {
    if (this.isObserving || typeof PerformanceObserver === 'undefined') return;

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const task: LongTaskEntry = {
            startTime: parseFloat(entry.startTime.toFixed(2)),
            duration: parseFloat(entry.duration.toFixed(2)),
            name: entry.name,
          };
          this.activeTraces.forEach((tracker) => tracker.recordLongTask(task));
        }
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (_) {}

    try {
      this.layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const val = (entry as any).value || 0;
          if (val > 0) {
            this.activeTraces.forEach((tracker) => tracker.recordLayoutShift(val));
          }
        }
      });
      this.layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (_) {}

    this.isObserving = true;
  }

  // Trace Lifecycle
  public startTrace(name: string, target?: string, metadata: Record<string, any> = {}): string {
    const traceId = `${name}-${target || 'generic'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tracker = new ActiveTraceTracker(traceId, name, target, metadata);
    this.activeTraces.set(traceId, tracker);
    return traceId;
  }

  public endTrace(traceId: string, additionalMetadata: Record<string, any> = {}): MotionTrace | null {
    const tracker = this.activeTraces.get(traceId);
    if (!tracker) return null;

    Object.assign(tracker.metadata, additionalMetadata);
    const trace = tracker.stop();
    this.activeTraces.delete(traceId);

    this.completedTraces.push(trace);
    if (this.completedTraces.length > 100) {
      this.completedTraces.shift();
    }

    this.subscribers.forEach((fn) => {
      try {
        fn(trace);
      } catch (_) {}
    });

    return trace;
  }

  // App Switch Latency Instrumentation
  private currentAppSwitchId: string | null = null;

  public startAppSwitch(fromApp: string, toApp: string) {
    if (this.currentAppSwitchId) {
      this.cancelAppSwitch();
    }
    this.currentAppSwitchId = this.startTrace('app-switch', toApp, { fromApp, toApp });
    return this.currentAppSwitchId;
  }

  public endAppSwitch(targetApp?: string): MotionTrace | null {
    if (!this.currentAppSwitchId) return null;
    const id = this.currentAppSwitchId;
    this.currentAppSwitchId = null;
    return this.endTrace(id, { destination: targetApp });
  }

  public cancelAppSwitch() {
    if (this.currentAppSwitchId) {
      try {
        const tracker = this.activeTraces.get(this.currentAppSwitchId);
        if (tracker) tracker.stop();
      } catch (_) {}
      this.activeTraces.delete(this.currentAppSwitchId);
      this.currentAppSwitchId = null;
    }
  }

  // Morph Open / Close Instrumentation
  private activeMorphOpens = new Map<string, string>();
  private activeMorphCloses = new Map<string, string>();

  public startMorphOpen(surfaceId: string) {
    const traceId = this.startTrace('morph-open', surfaceId);
    this.activeMorphOpens.set(surfaceId, traceId);

    // Spring (stiffness: 380, damping: 30, mass: 0.7) settles at ~320ms.
    // Ensure open trace settles even if layout animation lacks discrete animate target
    setTimeout(() => {
      if (this.activeMorphOpens.get(surfaceId) === traceId) {
        this.endMorphOpen(surfaceId);
      }
    }, 320);

    return traceId;
  }

  public endMorphOpen(surfaceId: string): MotionTrace | null {
    const traceId = this.activeMorphOpens.get(surfaceId);
    if (!traceId) return null;
    this.activeMorphOpens.delete(surfaceId);
    return this.endTrace(traceId);
  }

  public startMorphClose(surfaceId: string) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.surfaceCloseStates.set(surfaceId, {
      closeStartTime: now,
      closeEndTime: null,
    });

    const traceId = this.startTrace('morph-close', surfaceId);
    this.activeMorphCloses.set(surfaceId, traceId);

    // Auto-complete close trace after exit duration in case onExitComplete is delayed
    setTimeout(() => {
      if (this.activeMorphCloses.get(surfaceId) === traceId) {
        this.endMorphClose(surfaceId);
      }
    }, 360);

    return traceId;
  }

  public endMorphClose(surfaceId: string): MotionTrace | null {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const existing = this.surfaceCloseStates.get(surfaceId);
    if (existing) {
      existing.closeEndTime = now;
    }

    const traceId = this.activeMorphCloses.get(surfaceId);
    if (!traceId) return null;
    this.activeMorphCloses.delete(surfaceId);
    return this.endTrace(traceId);
  }

  // Rapid Close -> Reopen Interaction Latency
  public recordTriggerAttempt(
    surfaceId: string,
    options?: { blockedByExitOverlay?: boolean; notes?: string }
  ): RapidRetriggerMetric {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const closeState = this.surfaceCloseStates.get(surfaceId);

    let metric: RapidRetriggerMetric;
    if (!closeState) {
      metric = {
        surfaceId,
        closeStartTime: 0,
        closeEndTime: null,
        attemptTime: now,
        timeSinceCloseStartMs: Infinity,
        timeSinceCloseEndMs: null,
        blockedByExitOverlay: options?.blockedByExitOverlay ?? false,
        notes: options?.notes ?? 'First open attempt or no recorded previous close',
      };
    } else {
      const timeSinceCloseStartMs = parseFloat((now - closeState.closeStartTime).toFixed(2));
      const isExitStillAnimating = closeState.closeEndTime === null;
      const timeSinceCloseEndMs = closeState.closeEndTime !== null
        ? parseFloat((now - closeState.closeEndTime).toFixed(2))
        : null;

      const blocked = options?.blockedByExitOverlay !== undefined
        ? options.blockedByExitOverlay
        : isExitStillAnimating;

      let notes = options?.notes;
      if (!notes) {
        if (blocked) {
          notes = `Attempt occurred during exit animation (${timeSinceCloseStartMs}ms after close start). Fixed pointerEvents:auto overlay intercepts clicks.`;
        } else if (isExitStillAnimating) {
          notes = `Attempt succeeded during exit animation (${timeSinceCloseStartMs}ms after close start). Pointer events successfully passed through to trigger. Clean reopen.`;
        } else {
          notes = `Attempt occurred ${timeSinceCloseEndMs}ms after exit animation completed. Clean reopen.`;
        }
      }

      metric = {
        surfaceId,
        closeStartTime: closeState.closeStartTime,
        closeEndTime: closeState.closeEndTime,
        attemptTime: now,
        timeSinceCloseStartMs,
        timeSinceCloseEndMs,
        blockedByExitOverlay: blocked,
        notes,
      };
    }

    this.rapidRetriggerLog.push(metric);
    if (this.rapidRetriggerLog.length > 50) this.rapidRetriggerLog.shift();
    return metric;
  }

  // Settings Change Render Fan-out Instrumentation
  public startSettingsChange(settingKey: string, newValue: any): string {
    return this.startTrace('settings-change', settingKey, {
      settingKey,
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
    });
  }

  public endSettingsChange(traceId: string, subscriberCount?: number): MotionTrace | null {
    return this.endTrace(traceId, {
      subscriberCount: subscriberCount ?? 0,
    });
  }

  // Component Render Tracking
  public recordComponentRender(componentName: string) {
    this.activeTraces.forEach((tracker) => tracker.recordRender(componentName));
  }

  // Inspection APIs
  public getTraces(): MotionTrace[] {
    return [...this.completedTraces];
  }

  public getTracesByName(name: string): MotionTrace[] {
    return this.completedTraces.filter((t) => t.name === name);
  }

  public getRapidRetriggerMetrics(): RapidRetriggerMetric[] {
    return [...this.rapidRetriggerLog];
  }

  public clearTraces() {
    this.completedTraces = [];
    this.rapidRetriggerLog = [];
  }

  public subscribe(listener: (trace: MotionTrace) => void) {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  public getSummary() {
    const appSwitches = this.getTracesByName('app-switch');
    const morphOpens = this.getTracesByName('morph-open');
    const morphCloses = this.getTracesByName('morph-close');
    const settingsChanges = this.getTracesByName('settings-change');

    const computeAvg = (arr: MotionTrace[], key: 'durationMs' | 'totalBlockingTimeMs') =>
      arr.length > 0
        ? parseFloat((arr.reduce((s, t) => s + t[key], 0) / arr.length).toFixed(2))
        : 0;

    const computeAvgFps = (arr: MotionTrace[]) =>
      arr.length > 0
        ? parseFloat(
            (arr.reduce((s, t) => s + t.frameTiming.measuredFps, 0) / arr.length).toFixed(1)
          )
        : 0;

    return {
      totalTraces: this.completedTraces.length,
      appSwitch: {
        count: appSwitches.length,
        avgDurationMs: computeAvg(appSwitches, 'durationMs'),
        avgFps: computeAvgFps(appSwitches),
        avgBlockingMs: computeAvg(appSwitches, 'totalBlockingTimeMs'),
      },
      morphOpen: {
        count: morphOpens.length,
        avgDurationMs: computeAvg(morphOpens, 'durationMs'),
        avgFps: computeAvgFps(morphOpens),
        avgBlockingMs: computeAvg(morphOpens, 'totalBlockingTimeMs'),
      },
      morphClose: {
        count: morphCloses.length,
        avgDurationMs: computeAvg(morphCloses, 'durationMs'),
        avgFps: computeAvgFps(morphCloses),
        avgBlockingMs: computeAvg(morphCloses, 'totalBlockingTimeMs'),
      },
      settingsChange: {
        count: settingsChanges.length,
        avgDurationMs: computeAvg(settingsChanges, 'durationMs'),
        avgBlockingMs: computeAvg(settingsChanges, 'totalBlockingTimeMs'),
      },
      rapidRetriggers: [...this.rapidRetriggerLog],
    };
  }
}

export const MotionProfiler = new MotionProfilerClass();
