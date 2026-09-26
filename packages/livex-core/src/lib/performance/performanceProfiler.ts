// performanceProfiler.ts - Production Performance Diagnostics Profiler
import { APP_VERSION } from '../appVersion';

export interface RecentLongTask {
  id: string;
  timestamp: number;
  duration: number;
  source: string;
  category: 'navigation' | 'animation' | 'render' | 'network' | 'script';
}

export interface ExpensiveCommitEntry {
  id: string;
  componentId: string;
  phase: 'mount' | 'update';
  duration: number;
  timestamp: number;
}

export interface ComponentRenderProfile {
  name: string;
  renders: number;
  mounts: number;
  lastRenderTime: number;
  avgDuration?: number;
  isHighFrequency?: boolean;
}

export interface NavigationTimingEntry {
  id: string;
  fromRoute: string;
  toRoute: string;
  type: string;
  durationMs: number;
  timestamp: number;
  screenMountDurationMs?: number;
  listenerCountBefore?: number;
  listenerCountAfter?: number;
}

export interface ProfilerMetrics {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  low1PercentFps: number;
  low5PercentFps: number;
  worstFrameTime: number;
  avgFrameTime: number;
  frameTime: number;
  frameVariance: number;
  droppedFrames: number;
  jankyFrames: number;
  longFrames: number;
  veryLongFrames: number;
  framesExceeding120Hz: number;
  framesExceeding90Hz: number;
  framesExceeding60Hz: number;
  eventLoopDelay: number;
  heapSize: string;
  usedHeap: string;
  heapGrowth: string;
  gpuRenderer: string;
  refreshRate: number;
  mainThreadBlockingTotal: number;
  longestBlockingTask: number;
  longTaskCount: number;
  recentLongTasks: RecentLongTask[];
  reactCommitCount: number;
  reactAvgCommitDuration: number;
  reactSlowestCommit: ExpensiveCommitEntry | null;
  recentExpensiveCommits: ExpensiveCommitEntry[];
  componentRenderProfiles: ComponentRenderProfile[];
  highFrequencyComponents: string[];
  recentNavigations: NavigationTimingEntry[];
  avgNavigationDuration: number;
  coldStartupDuration: number;
  firstInteractiveTime: number;
  firstContentfulTime: number;
  thermalState: string;
  batteryOptimized: string;
  cpuAverage: number;
  cpuPeak: number;
  memoryAverage: string;
  memoryPeak: string;
  jsThreadAverage: number;
  jsThreadPeak: number;
  uiThreadAverage: number;
  uiThreadPeak: number;
  framePacing: number;
  gpuLayerCount: number;
  averageCallbackLatency: number;
  packageInstallerLatency: number;
  updatePipelineDuration: string;
  firestoreListeners: number;
  firestoreWrites: number;
  activeRequestsCount: number;
  activeTransitionsCount: number;
}

export interface PerformanceWarning {
  id?: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  measured: string;
  expected: string;
  metric?: string;
  actualValue?: string;
  threshold?: string;
  timestamp?: number;
  affectedSubsystem?: string;
  possibleCause: string;
  suggestedInvestigation: string;
}

export interface DiagnosticSnapshot {
  timestamp: string;
  appVersion: string;
  runtime: {
    platform: string;
    userAgent: string;
    gpuRenderer: string;
    refreshRate: number;
  };
  fps: {
    currentFps: number;
    averageFps: number;
    low1PercentFps: number;
    low5PercentFps: number;
    worstFrameTime: number;
    avgFrameTime: number;
    droppedFrames: number;
    jankyFrames: number;
    framesExceeding60Hz: number;
    framesExceeding90Hz: number;
    framesExceeding120Hz: number;
  };
  javascript: {
    avgDelay: number;
    peakDelay: number;
    longTaskCount: number;
    longestTask: number;
    totalBlockingTime: number;
    recentLongTasks: RecentLongTask[];
  };
  react: {
    commitCount: number;
    slowestCommit: ExpensiveCommitEntry | null;
    avgCommitDuration: number;
    recentExpensiveCommits: ExpensiveCommitEntry[];
    componentRenders: ComponentRenderProfile[];
    highFrequencyComponents: string[];
  };
  startup: {
    coldStartupDuration: number;
    firstInteractive: number;
    firstContentful: number;
    phases: Record<string, number>;
    navigationReadiness: boolean;
  };
  navigation: {
    recentNavigations: NavigationTimingEntry[];
    avgNavigationDuration: number;
  };
  memory: {
    usedHeap: string;
    totalHeap: string;
    heapLimit: string;
    heapGrowthRate: string;
    hasMemoryAPI: boolean;
  };
  network: {
    activeRequests: number;
    totalRequests: number;
    slowRequests: number;
    firestoreListeners: number;
    firestoreWrites: number;
  };
  animation: {
    isTransitionActive: boolean;
    activeAnimationCount: number;
  };
  warnings: PerformanceWarning[];
}

export class PerformanceProfiler {
  private static instance: PerformanceProfiler | null = null;

  // Frame timing
  private frameTimes: number[] = [];
  private totalFrames = 0;
  private startTime = 0;
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private minFps = Infinity;
  private maxFps = 0;
  private droppedFrames = 0;
  private longFrames = 0;
  private veryLongFrames = 0;

  // Frame budget counters
  private worstFrameTime = 0;
  private framesExceeding120Hz = 0;
  private framesExceeding90Hz = 0;
  private framesExceeding60Hz = 0;
  private jankyFrames = 0;

  // Event Loop delay tracking
  private eventLoopDelay = 0;
  private eventLoopTimer: any = null;
  private lastEventLoopTime = 0;
  private peakEventLoopDelay = 0;

  // Heap growth tracking
  private initialUsedHeap = 0;
  private lastHeapSampleTime = 0;
  private heapGrowthRate = 0;

  // Main thread blocking tasks
  private observer: PerformanceObserver | null = null;
  private totalBlockingTime = 0;
  private longestBlockingTask = 0;
  private longTaskCount = 0;
  private recentLongTasks: RecentLongTask[] = [];

  // React Profiling
  private reactCommitCount = 0;
  private reactCommitDurations: number[] = [];
  private reactSlowestCommit: ExpensiveCommitEntry | null = null;
  private recentExpensiveCommits: ExpensiveCommitEntry[] = [];
  private componentRenders = new Map<
    string,
    {
      name: string;
      renders: number;
      mounts: number;
      lastRenderTime: number;
      totalDuration: number;
      renderTimestamps: number[];
    }
  >();

  // Navigation tracking
  private recentNavigations: NavigationTimingEntry[] = [];

  // Startup milestones
  private firstInteractiveTimestamp = 0;
  private firstContentfulTimestamp = 0;

  // Performance sample buffers
  private cpuSamples: number[] = [];
  private memorySamples: number[] = [];
  private jsThreadSamples: number[] = [];
  private uiThreadSamples: number[] = [];
  private callbackLatencySamples: number[] = [];
  private installerLatencySamples: number[] = [];
  private lastSampleTime = 0;
  private lastBlockingTime = 0;
  private sampleTimer: any = null;

  private cachedGpuLayerCount = 0;
  private lastGpuLayerCountSampleTime = 0;
  private activeListeners = new Set<(metrics: ProfilerMetrics) => void>();
  private isPaused = false;
  private visibilityListenerBound = false;

  public static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  private constructor() {
    this.initObserver();
  }

  private initObserver() {
    if (typeof PerformanceObserver !== 'undefined' && !this.observer) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const duration = entry.duration;
            this.totalBlockingTime += duration;
            this.longTaskCount++;
            if (duration > this.longestBlockingTask) {
              this.longestBlockingTask = duration;
            }
            this.jsThreadSamples.push(duration);
            if (this.jsThreadSamples.length > 100) this.jsThreadSamples.shift();

            const sourceInfo = this.identifyTaskSource();
            const taskEntry: RecentLongTask = {
              id: 'lt_' + Math.random().toString(36).substring(2, 9),
              timestamp: Date.now(),
              duration: parseFloat(duration.toFixed(1)),
              source: sourceInfo.source,
              category: sourceInfo.category,
            };
            this.recentLongTasks.push(taskEntry);
            if (this.recentLongTasks.length > 30) this.recentLongTasks.shift();
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch (_) {}
    }
  }

  public recordCallbackLatency(latencyMs: number, isInstaller = false) {
    if (isInstaller) {
      this.installerLatencySamples.push(latencyMs);
      if (this.installerLatencySamples.length > 20) this.installerLatencySamples.shift();
    } else {
      this.callbackLatencySamples.push(latencyMs);
      if (this.callbackLatencySamples.length > 20) this.callbackLatencySamples.shift();
    }
  }

  public recordReactCommit(
    componentId: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration?: number
  ) {
    this.reactCommitCount++;
    this.reactCommitDurations.push(actualDuration);
    if (this.reactCommitDurations.length > 50) this.reactCommitDurations.shift();

    if (!this.reactSlowestCommit || actualDuration > this.reactSlowestCommit.duration) {
      this.reactSlowestCommit = {
        id: 'rc_' + Math.random().toString(36).substring(2, 9),
        componentId,
        phase,
        duration: parseFloat(actualDuration.toFixed(1)),
        timestamp: Date.now(),
      };
    }

    if (actualDuration > 12) {
      this.recentExpensiveCommits.push({
        id: 'ec_' + Math.random().toString(36).substring(2, 9),
        componentId,
        phase,
        duration: parseFloat(actualDuration.toFixed(1)),
        timestamp: Date.now(),
      });
      if (this.recentExpensiveCommits.length > 30) this.recentExpensiveCommits.shift();
    }

    let compStats = this.componentRenders.get(componentId);
    const now = Date.now();
    if (!compStats) {
      compStats = {
        name: componentId,
        renders: 0,
        mounts: 0,
        lastRenderTime: now,
        totalDuration: 0,
        renderTimestamps: [],
      };
      this.componentRenders.set(componentId, compStats);
    }

    if (phase === 'mount') {
      compStats.mounts++;
    }
    compStats.renders++;
    compStats.lastRenderTime = now;
    compStats.totalDuration += actualDuration;
    compStats.renderTimestamps.push(now);

    if (compStats.renderTimestamps.length > 30) compStats.renderTimestamps.shift();

    try {
      (globalThis as any)?.__livexRecordPerfEvent?.(
        componentId,
        phase === 'mount' ? 'mount' : 'render',
        compStats.renders
      );
    } catch (_) {}
  }

  public recordNavigation(
    fromRoute: string,
    toRoute: string,
    type: string,
    durationMs: number,
    screenMountDurationMs?: number
  ) {
    let listenerCountBefore: number | undefined;
    let listenerCountAfter: number | undefined;

    try {
      const fsDiag = (window as any)._getFirestoreDiagnostics?.();
      if (fsDiag) {
        listenerCountAfter = fsDiag.firestoreListenChannels;
        listenerCountBefore = (window as any)._lastFirestoreListeners ?? listenerCountAfter;
        (window as any)._lastFirestoreListeners = listenerCountAfter;
      }
    } catch (_) {}

    const entry: NavigationTimingEntry = {
      id: 'nav_' + Math.random().toString(36).substring(2, 9),
      fromRoute,
      toRoute,
      type,
      durationMs: parseFloat(durationMs.toFixed(1)),
      timestamp: Date.now(),
      screenMountDurationMs: screenMountDurationMs
        ? parseFloat(screenMountDurationMs.toFixed(1))
        : undefined,
      listenerCountBefore,
      listenerCountAfter,
    };
    this.recentNavigations.push(entry);
    if (this.recentNavigations.length > 20) this.recentNavigations.shift();
  }

  private identifyTaskSource(): { source: string; category: RecentLongTask['category'] } {
    try {
      const navStore =
        typeof window !== 'undefined' ? (window as any).__useNavigationStore?.getState?.() : null;
      if (navStore) {
        if (navStore.isTransitioning) {
          const current = navStore.history[navStore.history.length - 1];
          const appName = current?.app || 'unknown';
          const tabName = current?.tab || current?.page || '';
          return {
            source: `Navigation Transition (${appName}${tabName ? ' ' + tabName : ''})`,
            category: 'navigation',
          };
        }
      }

      const lastCommit = this.reactSlowestCommit;
      if (lastCommit && Date.now() - lastCommit.timestamp < 100) {
        return {
          source: `React Commit: ${lastCommit.componentId}`,
          category: 'render',
        };
      }

      if (navStore && navStore.history && navStore.history.length > 0) {
        const top = navStore.history[navStore.history.length - 1];
        const appLabel =
          top.app === 'hub' ? 'Hub' : top.app.charAt(0).toUpperCase() + top.app.slice(1);
        const sub = top.tab || top.page || '';
        return {
          source: `${appLabel}${sub ? ' ' + sub : ''} execution`,
          category: 'script',
        };
      }
    } catch (_) {}

    return {
      source: 'Main-thread script execution',
      category: 'script',
    };
  }

  public getGPULayerCount(): number {
    if (typeof document === 'undefined') return 0;
    const now = performance.now();
    if (now - this.lastGpuLayerCountSampleTime < 3000 && this.lastGpuLayerCountSampleTime > 0) {
      return this.cachedGpuLayerCount;
    }
    this.lastGpuLayerCountSampleTime = now;
    try {
      const compositedNodes = document.querySelectorAll(
        '[style*="will-change"], [style*="transform"], canvas, video, iframe, [data-gpu-layer], .will-change-transform'
      );
      this.cachedGpuLayerCount = compositedNodes.length;
      return this.cachedGpuLayerCount;
    } catch (_) {
      return this.cachedGpuLayerCount;
    }
  }

  public start() {
    if (this.rafId !== null || this.sampleTimer !== null) return;

    this.isPaused = false;
    this.frameTimes = [];
    this.totalFrames = 0;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.minFps = Infinity;
    this.maxFps = 0;
    this.droppedFrames = 0;
    this.longFrames = 0;
    this.veryLongFrames = 0;

    this.cpuSamples = [];
    this.memorySamples = [];
    this.jsThreadSamples = [];
    this.uiThreadSamples = [];
    this.callbackLatencySamples = [];
    this.installerLatencySamples = [];
    this.lastSampleTime = performance.now();
    this.lastBlockingTime = this.totalBlockingTime;

    if (this.firstInteractiveTimestamp === 0) {
      this.firstInteractiveTimestamp = performance.now();
    }

    if (typeof document !== 'undefined' && !this.visibilityListenerBound) {
      this.visibilityListenerBound = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.initObserver();

    this.sampleTimer = setInterval(() => {
      if (this.isPaused) return;
      const now = performance.now();
      const interval = now - this.lastSampleTime;
      if (interval <= 0) return;

      const blocking = this.totalBlockingTime - this.lastBlockingTime;
      const cpu = Math.max(0, Math.min(100, Math.round((blocking / interval) * 100)));
      this.cpuSamples.push(cpu);
      if (this.cpuSamples.length > 60) this.cpuSamples.shift();

      const mem = (performance as any).memory;
      if (mem) {
        this.memorySamples.push(mem.usedJSHeapSize);
        if (this.memorySamples.length > 60) this.memorySamples.shift();
      }

      this.lastSampleTime = now;
      this.lastBlockingTime = this.totalBlockingTime;

      if (this.activeListeners.size > 0) {
        const metrics = this.getMetrics();
        this.activeListeners.forEach((listener) => {
          try {
            listener(metrics);
          } catch (_) {}
        });
      }
    }, 1000);

    this.startFrameLoop();
    this.startEventLoopTimer();

    const mem = (performance as any).memory;
    if (mem) {
      this.initialUsedHeap = mem.usedJSHeapSize;
      this.lastHeapSampleTime = performance.now();
      this.heapGrowthRate = 0;
    }
  }

  private startFrameLoop() {
    if (this.rafId !== null) return;
    const loop = (now: number) => {
      if (this.isPaused) {
        this.rafId = null;
        return;
      }
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;

      if (delta > 0) {
        this.frameTimes.push(delta);
        this.totalFrames++;

        if (delta > this.worstFrameTime) {
          this.worstFrameTime = delta;
        }

        if (delta > 8.33) {
          this.framesExceeding120Hz++;
        }
        if (delta > 11.11) {
          this.framesExceeding90Hz++;
        }
        if (delta > 16.67) {
          this.framesExceeding60Hz++;
        }

        if (delta > 20) {
          const estimatedDropped = Math.floor(delta / 16.67) - 1;
          this.droppedFrames += Math.max(0, estimatedDropped);
        }
        if (delta > 22) {
          this.jankyFrames++;
        }
        if (delta > 33.33) {
          this.longFrames++;
        }
        if (delta > 50.0) {
          this.veryLongFrames++;
        }

        const lastLongTask = this.jsThreadSamples[this.jsThreadSamples.length - 1] || 0;
        const uiTime = Math.max(1, delta - lastLongTask);
        this.uiThreadSamples.push(uiTime);
        if (this.uiThreadSamples.length > 100) this.uiThreadSamples.shift();

        if (this.frameTimes.length > 1000) {
          this.frameTimes.shift();
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private startEventLoopTimer() {
    if (this.eventLoopTimer !== null) return;
    this.lastEventLoopTime = performance.now();
    const tickEventLoop = () => {
      if (this.isPaused) {
        this.eventLoopTimer = null;
        return;
      }
      const now = performance.now();
      const delay = now - this.lastEventLoopTime - 50;
      this.eventLoopDelay = Math.max(0, delay);
      if (this.eventLoopDelay > this.peakEventLoopDelay) {
        this.peakEventLoopDelay = this.eventLoopDelay;
      }
      this.lastEventLoopTime = now;
      this.eventLoopTimer = setTimeout(tickEventLoop, 50);
    };
    this.eventLoopTimer = setTimeout(tickEventLoop, 50);
  }

  public pause() {
    this.isPaused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.eventLoopTimer !== null) {
      clearTimeout(this.eventLoopTimer);
      this.eventLoopTimer = null;
    }
  }

  public resume() {
    if (!this.isPaused || this.activeListeners.size === 0) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastEventLoopTime = performance.now();
    this.startFrameLoop();
    this.startEventLoopTimer();
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.pause();
    } else if (this.activeListeners.size > 0 && this.isPaused) {
      this.resume();
    }
  };

  public stop() {
    this.pause();
    if (typeof document !== 'undefined' && this.visibilityListenerBound) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerBound = false;
    }
    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }

  public subscribe(listener: (metrics: ProfilerMetrics) => void) {
    this.activeListeners.add(listener);
    if (this.activeListeners.size === 1) {
      this.start();
    }
    return () => {
      this.activeListeners.delete(listener);
      if (this.activeListeners.size === 0) {
        this.stop();
      }
    };
  }

  public getGPUInfo(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL Generic Renderer';
        }
      }
      return 'Generic Hardware Renderer';
    } catch (_) {
      return 'Generic GPU';
    }
  }

  public getMetrics(): ProfilerMetrics {
    const mem = typeof window !== 'undefined' ? (window.performance as any)?.memory : null;
    let heapSizeStr = 'Unavailable';
    let usedHeapStr = 'Unavailable';
    let heapGrowthStr = 'Unavailable';

    if (mem) {
      const now = performance.now();
      heapSizeStr = (mem.totalJSHeapSize / (1024 * 1024)).toFixed(1) + ' MB';
      usedHeapStr = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1) + ' MB';

      const timeDiff = (now - this.lastHeapSampleTime) / 1000;
      if (timeDiff > 1.0) {
        const heapDiffMB = (mem.usedJSHeapSize - this.initialUsedHeap) / (1024 * 1024);
        this.heapGrowthRate = Math.max(0, heapDiffMB / timeDiff);
        this.initialUsedHeap = mem.usedJSHeapSize;
        this.lastHeapSampleTime = now;
      }
      heapGrowthStr = this.heapGrowthRate.toFixed(2) + ' MB/s';
    }

    // Refresh rate estimation
    let refreshRate = 60;
    const avgFrameTimeCalc =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 16.67;
    if (avgFrameTimeCalc < 9.0) refreshRate = 120;
    else if (avgFrameTimeCalc < 12.0) refreshRate = 90;
    else refreshRate = 60;

    let currentFps = 60;
    let averageFps = 60;
    let minFpsVal = 60;
    let maxFpsVal = 60;
    let low1PercentFps = 60;
    let low5PercentFps = 60;
    let frameTime = 16.6;
    let frameVariance = 0;

    if (this.frameTimes.length > 0) {
      const last10 = this.frameTimes.slice(-10);
      const last10AvgTime = last10.reduce((a, b) => a + b, 0) / last10.length;
      currentFps = Math.round(1000 / last10AvgTime);

      const totalDuration = performance.now() - this.startTime;
      averageFps = totalDuration > 0 ? Math.round((this.totalFrames * 1000) / totalDuration) : 0;

      const sorted = [...this.frameTimes].sort((a, b) => a - b);
      minFpsVal = Math.round(1000 / sorted[sorted.length - 1]);
      maxFpsVal = Math.round(1000 / sorted[0]);

      if (this.totalFrames > 15) {
        this.minFps = Math.min(this.minFps, minFpsVal);
        this.maxFps = Math.max(this.maxFps, maxFpsVal);
      }

      // 1% Low FPS
      const low1Count = Math.max(1, Math.floor(sorted.length * 0.01));
      const slow1Frames = sorted.slice(-low1Count);
      const slow1Avg = slow1Frames.reduce((a, b) => a + b, 0) / slow1Frames.length;
      low1PercentFps = Math.round(1000 / slow1Avg);

      // 5% Low FPS
      const low5Count = Math.max(1, Math.floor(sorted.length * 0.05));
      const slow5Frames = sorted.slice(-low5Count);
      const slow5Avg = slow5Frames.reduce((a, b) => a + b, 0) / slow5Frames.length;
      low5PercentFps = Math.round(1000 / slow5Avg);

      frameTime = parseFloat(last10AvgTime.toFixed(1));

      const mean = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const variance =
        this.frameTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.frameTimes.length;
      frameVariance = parseFloat(Math.sqrt(variance).toFixed(2));
    }

    const cpuAvg =
      this.cpuSamples.length > 0
        ? Math.round(this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length)
        : 0;
    const cpuPeak = this.cpuSamples.length > 0 ? Math.max(...this.cpuSamples) : 0;

    let memAvgStr = 'Unavailable';
    let memPeakStr = 'Unavailable';
    if (this.memorySamples.length > 0) {
      const avgMem = this.memorySamples.reduce((a, b) => a + b, 0) / this.memorySamples.length;
      const peakMem = Math.max(...this.memorySamples);
      memAvgStr = (avgMem / (1024 * 1024)).toFixed(1) + ' MB';
      memPeakStr = (peakMem / (1024 * 1024)).toFixed(1) + ' MB';
    }

    const jsAvg =
      this.jsThreadSamples.length > 0
        ? parseFloat(
            (this.jsThreadSamples.reduce((a, b) => a + b, 0) / this.jsThreadSamples.length).toFixed(
              1
            )
          )
        : 0;
    const jsPeak =
      this.jsThreadSamples.length > 0
        ? parseFloat(Math.max(...this.jsThreadSamples).toFixed(1))
        : 0;

    const uiAvg =
      this.uiThreadSamples.length > 0
        ? parseFloat(
            (this.uiThreadSamples.reduce((a, b) => a + b, 0) / this.uiThreadSamples.length).toFixed(
              1
            )
          )
        : 0;
    const uiPeak =
      this.uiThreadSamples.length > 0
        ? parseFloat(Math.max(...this.uiThreadSamples).toFixed(1))
        : 0;

    const avgCallbackLat =
      this.callbackLatencySamples.length > 0
        ? Math.round(
            this.callbackLatencySamples.reduce((a, b) => a + b, 0) /
              this.callbackLatencySamples.length
          )
        : 0;
    const instCallbackLat =
      this.installerLatencySamples.length > 0
        ? Math.round(
            this.installerLatencySamples.reduce((a, b) => a + b, 0) /
              this.installerLatencySamples.length
          )
        : 0;

    let activeDuration = 'N/A';
    try {
      const activeSession = (window as any)._getActiveSession?.() || null;
      if (activeSession) {
        if (activeSession.durationMs) {
          activeDuration = (activeSession.durationMs / 1000).toFixed(2) + 's';
        } else {
          activeDuration =
            ((Date.now() - activeSession.startTimestamp) / 1000).toFixed(2) + 's (running)';
        }
      }
    } catch (_) {}

    // React Stats
    const reactAvgCommitDuration =
      this.reactCommitDurations.length > 0
        ? parseFloat(
            (
              this.reactCommitDurations.reduce((a, b) => a + b, 0) /
              this.reactCommitDurations.length
            ).toFixed(1)
          )
        : 0;

    const componentProfiles: ComponentRenderProfile[] = Array.from(
      this.componentRenders.values()
    ).map((s) => ({
      name: s.name,
      renders: s.renders,
      mounts: s.mounts,
      lastRenderTime: s.lastRenderTime,
      avgDuration: s.renders > 0 ? parseFloat((s.totalDuration / s.renders).toFixed(1)) : 0,
      isHighFrequency: s.renderTimestamps.filter((t) => Date.now() - t < 2000).length >= 15,
    }));

    const highFrequency = componentProfiles.filter((p) => p.isHighFrequency).map((p) => p.name);

    // Navigation Stats
    const avgNavigationDuration =
      this.recentNavigations.length > 0
        ? parseFloat(
            (
              this.recentNavigations.reduce((a, b) => a + b.durationMs, 0) /
              this.recentNavigations.length
            ).toFixed(1)
          )
        : 0;

    // Startup Diagnostics
    let coldStartupDuration = 0;
    try {
      const sc = (window as any).__studioStartupCoordinator;
      if (sc && typeof sc.getDiagnostics === 'function') {
        const d = sc.getDiagnostics();
        coldStartupDuration = d.startupDuration || 0;
      }
    } catch (_) {}

    // Firestore & network channels
    let fsListeners = 0;
    let fsWrites = 0;
    try {
      const fsDiag = (window as any)._getFirestoreDiagnostics?.();
      if (fsDiag) {
        fsListeners = fsDiag.firestoreListenChannels || 0;
        fsWrites = fsDiag.firestoreWriteChannels || 0;
      }
    } catch (_) {}

    let isTransitioning = false;
    try {
      const navStore = (window as any).__useNavigationStore?.getState?.();
      isTransitioning = Boolean(navStore?.isTransitioning);
    } catch (_) {}

    return {
      currentFps: Math.min(refreshRate, currentFps),
      averageFps: Math.min(refreshRate, averageFps),
      minFps: this.minFps === Infinity ? 0 : Math.min(refreshRate, this.minFps),
      maxFps: Math.min(refreshRate, this.maxFps),
      low1PercentFps: Math.min(refreshRate, low1PercentFps),
      low5PercentFps: Math.min(refreshRate, low5PercentFps),
      worstFrameTime: parseFloat(this.worstFrameTime.toFixed(1)),
      avgFrameTime: parseFloat(avgFrameTimeCalc.toFixed(1)),
      frameTime,
      frameVariance,
      droppedFrames: this.droppedFrames,
      jankyFrames: this.jankyFrames,
      longFrames: this.longFrames,
      veryLongFrames: this.veryLongFrames,
      framesExceeding120Hz: this.framesExceeding120Hz,
      framesExceeding90Hz: this.framesExceeding90Hz,
      framesExceeding60Hz: this.framesExceeding60Hz,
      eventLoopDelay: parseFloat(this.eventLoopDelay.toFixed(1)),
      heapSize: heapSizeStr,
      usedHeap: usedHeapStr,
      heapGrowth: heapGrowthStr,
      gpuRenderer: this.getGPUInfo(),
      refreshRate,
      mainThreadBlockingTotal: parseFloat(this.totalBlockingTime.toFixed(1)),
      longestBlockingTask: parseFloat(this.longestBlockingTask.toFixed(1)),
      longTaskCount: this.longTaskCount,
      recentLongTasks: [...this.recentLongTasks],
      reactCommitCount: this.reactCommitCount,
      reactAvgCommitDuration,
      reactSlowestCommit: this.reactSlowestCommit,
      recentExpensiveCommits: [...this.recentExpensiveCommits],
      componentRenderProfiles: componentProfiles,
      highFrequencyComponents: highFrequency,
      recentNavigations: [...this.recentNavigations],
      avgNavigationDuration,
      coldStartupDuration: parseFloat(coldStartupDuration.toFixed(1)),
      firstInteractiveTime: parseFloat(this.firstInteractiveTimestamp.toFixed(1)),
      firstContentfulTime: parseFloat(this.firstContentfulTimestamp.toFixed(1)),
      thermalState: 'Unavailable',
      batteryOptimized: 'Unavailable',
      cpuAverage: cpuAvg,
      cpuPeak,
      memoryAverage: memAvgStr,
      memoryPeak: memPeakStr,
      jsThreadAverage: jsAvg,
      jsThreadPeak: jsPeak,
      uiThreadAverage: uiAvg,
      uiThreadPeak: uiPeak,
      framePacing: frameVariance,
      gpuLayerCount: this.getGPULayerCount(),
      averageCallbackLatency: avgCallbackLat,
      packageInstallerLatency: instCallbackLat,
      updatePipelineDuration: activeDuration,
      firestoreListeners: fsListeners,
      firestoreWrites: fsWrites,
      activeRequestsCount: 0,
      activeTransitionsCount: isTransitioning ? 1 : 0,
    };
  }

  public getScore(metrics: ProfilerMetrics): number {
    let score = 100;

    const fpsDeficit = metrics.refreshRate - metrics.averageFps;
    if (fpsDeficit > 0) score -= fpsDeficit * 2.0;

    score -= Math.min(15, metrics.droppedFrames * 0.1);
    score -= Math.min(15, metrics.longFrames * 0.4);
    score -= Math.min(10, metrics.jankyFrames * 0.2);

    if (metrics.longestBlockingTask > 50) score -= 8;
    if (metrics.longestBlockingTask > 150) score -= 12;

    if (metrics.frameVariance > 3.0) score -= 8;
    if (metrics.frameVariance > 8.0) score -= 10;

    if (metrics.highFrequencyComponents.length > 0) {
      score -= Math.min(15, metrics.highFrequencyComponents.length * 5);
    }

    const mem = typeof window !== 'undefined' ? (window.performance as any)?.memory : null;
    if (mem) {
      const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      if (ratio > 0.75) score -= 15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  public getWarnings(metrics: ProfilerMetrics): PerformanceWarning[] {
    const list: PerformanceWarning[] = [];

    // 1. Long JS Tasks with Subsystem and Context
    if (this.recentLongTasks.length > 0) {
      const significantTasks = [...this.recentLongTasks]
        .filter((t) => t.duration > 50)
        .sort((a, b) => b.duration - a.duration);

      const topTask = significantTasks[0];
      if (topTask && topTask.duration > 50) {
        list.push({
          id: topTask.id,
          severity: topTask.duration > 100 ? 'Critical' : 'Warning',
          title: `JS Thread Blocking Task (${topTask.duration.toFixed(0)} ms)`,
          description: `JS task blocked for ${topTask.duration.toFixed(0)} ms during ${topTask.source}.`,
          measured: `${topTask.duration.toFixed(1)} ms`,
          expected: '< 50.0 ms',
          metric: 'js_long_task',
          actualValue: `${topTask.duration.toFixed(1)} ms`,
          threshold: '< 50.0 ms',
          timestamp: topTask.timestamp,
          affectedSubsystem: topTask.source,
          possibleCause:
            topTask.category === 'navigation'
              ? 'Heavy component mount, synchronous layout calculation, or unmemoized route transition.'
              : topTask.category === 'render'
                ? 'Expensive React component reconciliation or synchronous sub-tree rendering.'
                : 'Synchronous storage access, large JSON parsing, or tight computational loops.',
          suggestedInvestigation:
            topTask.category === 'navigation'
              ? 'Check component mount handlers and lazy-load heavy UI elements.'
              : 'Audit useMemo/useCallback dependencies and avoid synchronous storage reads during render.',
        });
      }
    } else if (metrics.longestBlockingTask > 50) {
      list.push({
        id: 'legacy_blocking',
        severity: metrics.longestBlockingTask > 100 ? 'Critical' : 'Warning',
        title: `JS Thread Blocking Task (${metrics.longestBlockingTask.toFixed(0)} ms)`,
        description: `JS task blocked for ${metrics.longestBlockingTask.toFixed(0)} ms.`,
        measured: `${metrics.longestBlockingTask.toFixed(1)} ms`,
        expected: '< 50.0 ms',
        metric: 'js_long_task',
        actualValue: `${metrics.longestBlockingTask.toFixed(1)} ms`,
        threshold: '< 50.0 ms',
        timestamp: Date.now(),
        affectedSubsystem: 'JavaScript Execution',
        possibleCause:
          'Heavy React rendering, synchronous storage operations, or large data processing.',
        suggestedInvestigation:
          'Audit layout effects, chunk expensive array calculations, or defer work to microtasks.',
      });
    }

    // 2. Frame Budget Overruns
    if (metrics.worstFrameTime > 25.0) {
      const budget = metrics.refreshRate > 0 ? 1000 / metrics.refreshRate : 16.67;
      const multiplier = (metrics.worstFrameTime / budget).toFixed(1);
      list.push({
        id: 'frame_budget_overrun',
        severity: metrics.worstFrameTime > 50 ? 'Critical' : 'Warning',
        title: `Frame Budget Overrun (${multiplier}× ${metrics.refreshRate} Hz Budget)`,
        description: `Frame exceeded ${metrics.refreshRate} Hz budget by ${multiplier}× (${metrics.worstFrameTime.toFixed(1)} ms vs ${budget.toFixed(1)} ms target).`,
        measured: `${metrics.worstFrameTime.toFixed(1)} ms`,
        expected: `< ${budget.toFixed(1)} ms`,
        metric: 'frame_budget',
        actualValue: `${metrics.worstFrameTime.toFixed(1)} ms`,
        threshold: `< ${budget.toFixed(1)} ms`,
        timestamp: Date.now(),
        affectedSubsystem: 'UI Thread / RAF',
        possibleCause:
          'Simultaneous CSS animation, heavy DOM reflow, or main thread JavaScript contention.',
        suggestedInvestigation:
          'Profile with Chrome DevTools to locate forced reflows or heavy repaints.',
      });
    }

    // 3. High Render Frequency Component Thrashing
    for (const [name, stats] of this.componentRenders.entries()) {
      const now = Date.now();
      const recentRenders = stats.renderTimestamps.filter((t) => now - t < 2000);
      if (recentRenders.length >= 15) {
        const timeSpan = ((now - recentRenders[0]) / 1000).toFixed(1);
        list.push({
          id: `render_thrash_${name}`,
          severity: 'Warning',
          title: `Component Render Thrashing: <${name} />`,
          description: `Component ${name} rendered ${recentRenders.length} times in ${timeSpan} seconds.`,
          measured: `${recentRenders.length} renders / ${timeSpan}s`,
          expected: '< 15 renders / 2.0s',
          metric: 'render_frequency',
          actualValue: `${recentRenders.length} renders in ${timeSpan}s`,
          threshold: '< 15 renders / 2.0s',
          timestamp: stats.lastRenderTime,
          affectedSubsystem: name,
          possibleCause:
            'Unstable prop references, unmemoized inline callbacks, or store selector thrashing.',
          suggestedInvestigation: `Wrap <${name} /> in React.memo and stabilize selector hooks with useShallow.`,
        });
      }
    }

    // 4. Expensive React Commit
    if (this.reactSlowestCommit && this.reactSlowestCommit.duration > 40) {
      list.push({
        id: this.reactSlowestCommit.id,
        severity: this.reactSlowestCommit.duration > 70 ? 'Critical' : 'Warning',
        title: `Expensive React Commit (${this.reactSlowestCommit.duration.toFixed(0)} ms)`,
        description: `Navigation or state update caused a ${this.reactSlowestCommit.duration.toFixed(0)} ms React commit in <${this.reactSlowestCommit.componentId} />.`,
        measured: `${this.reactSlowestCommit.duration.toFixed(1)} ms`,
        expected: '< 16.0 ms',
        metric: 'react_commit',
        actualValue: `${this.reactSlowestCommit.duration.toFixed(1)} ms`,
        threshold: '< 16.0 ms',
        timestamp: this.reactSlowestCommit.timestamp,
        affectedSubsystem: this.reactSlowestCommit.componentId,
        possibleCause:
          'Heavy component tree mounting synchronously or expensive useLayoutEffect execution.',
        suggestedInvestigation:
          'Use DeferredSkeleton or React.lazy to split mount phase over multiple frames.',
      });
    }

    // 5. Firestore Listener Growth Across Navigation
    if (this.recentNavigations.length > 0) {
      const leakNav = this.recentNavigations.find(
        (n) =>
          n.listenerCountBefore !== undefined &&
          n.listenerCountAfter !== undefined &&
          n.listenerCountAfter > n.listenerCountBefore
      );
      if (
        leakNav &&
        leakNav.listenerCountBefore !== undefined &&
        leakNav.listenerCountAfter !== undefined
      ) {
        list.push({
          id: `fs_growth_${leakNav.id}`,
          severity: 'Warning',
          title: 'Firestore Listener Growth After Navigation',
          description: `Firestore listener count increased from ${leakNav.listenerCountBefore} to ${leakNav.listenerCountAfter} after navigating to ${leakNav.toRoute}.`,
          measured: `${leakNav.listenerCountBefore} → ${leakNav.listenerCountAfter} channels`,
          expected: '0 net listener growth',
          metric: 'firestore_listeners',
          actualValue: `${leakNav.listenerCountAfter} active (+${leakNav.listenerCountAfter - leakNav.listenerCountBefore})`,
          threshold: 'stable listener channels',
          timestamp: leakNav.timestamp,
          affectedSubsystem: 'Cloud Sync Engine',
          possibleCause:
            'Missing unsubscribe cleanup return inside useEffect on navigation away from screen.',
          suggestedInvestigation:
            'Verify all onSnapshot listeners return their unsubscribe callback in useEffect.',
        });
      }
    }

    // 6. Memory Pressure
    const mem = typeof window !== 'undefined' ? (window.performance as any)?.memory : null;
    if (mem && mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.75) {
      const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      const limitMB = (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
      list.push({
        id: 'heap_pressure',
        severity: 'Critical',
        title: 'High V8 Memory Pressure',
        description: `Used JS heap is ${usedMB} MB (dangerously close to ${limitMB} MB limit).`,
        measured: `${usedMB} MB`,
        expected: `< ${(parseFloat(limitMB) * 0.75).toFixed(1)} MB`,
        metric: 'heap_memory_pressure',
        actualValue: `${usedMB} MB`,
        threshold: `< ${(parseFloat(limitMB) * 0.75).toFixed(1)} MB`,
        timestamp: Date.now(),
        affectedSubsystem: 'JS Heap Memory',
        possibleCause:
          'Retained detached DOM elements, un-cleared intervals, or large audio sample buffers.',
        suggestedInvestigation:
          'Take Heap Snapshots in Chrome DevTools to locate memory-retaining objects.',
      });
    }

    return list;
  }

  public exportDiagnosticSnapshot(): DiagnosticSnapshot {
    const metrics = this.getMetrics();
    const warnings = this.getWarnings(metrics);
    const mem = typeof window !== 'undefined' ? (window.performance as any)?.memory : null;

    let startupPhases: Record<string, number> = {};
    let coldStartupDuration = 0;
    let navReady = false;

    try {
      const sc = (window as any).__studioStartupCoordinator;
      if (sc && typeof sc.getDiagnostics === 'function') {
        const d = sc.getDiagnostics();
        coldStartupDuration = d.startupDuration || 0;
        startupPhases = d.phaseDurations || {};
        navReady = d.startupState === 'completed';
      }
    } catch (_) {}

    return {
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      runtime: {
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        gpuRenderer: this.getGPUInfo(),
        refreshRate: metrics.refreshRate,
      },
      fps: {
        currentFps: metrics.currentFps,
        averageFps: metrics.averageFps,
        low1PercentFps: metrics.low1PercentFps,
        low5PercentFps: metrics.low5PercentFps,
        worstFrameTime: metrics.worstFrameTime,
        avgFrameTime: metrics.avgFrameTime,
        droppedFrames: metrics.droppedFrames,
        jankyFrames: metrics.jankyFrames,
        framesExceeding60Hz: metrics.framesExceeding60Hz,
        framesExceeding90Hz: metrics.framesExceeding90Hz,
        framesExceeding120Hz: metrics.framesExceeding120Hz,
      },
      javascript: {
        avgDelay: metrics.eventLoopDelay,
        peakDelay: metrics.jsThreadPeak,
        longTaskCount: metrics.longTaskCount,
        longestTask: metrics.longestBlockingTask,
        totalBlockingTime: metrics.mainThreadBlockingTotal,
        recentLongTasks: [...this.recentLongTasks],
      },
      react: {
        commitCount: this.reactCommitCount,
        slowestCommit: this.reactSlowestCommit,
        avgCommitDuration: metrics.reactAvgCommitDuration,
        recentExpensiveCommits: [...this.recentExpensiveCommits],
        componentRenders: metrics.componentRenderProfiles,
        highFrequencyComponents: metrics.highFrequencyComponents,
      },
      startup: {
        coldStartupDuration,
        firstInteractive: parseFloat((this.firstInteractiveTimestamp || 0).toFixed(1)),
        firstContentful: parseFloat((this.firstContentfulTimestamp || 0).toFixed(1)),
        phases: startupPhases,
        navigationReadiness: navReady,
      },
      navigation: {
        recentNavigations: [...this.recentNavigations],
        avgNavigationDuration: metrics.avgNavigationDuration,
      },
      memory: {
        usedHeap: metrics.usedHeap,
        totalHeap: metrics.heapSize,
        heapLimit: mem ? `${Math.round(mem.jsHeapSizeLimit / (1024 * 1024))} MB` : 'N/A',
        heapGrowthRate: metrics.heapGrowth,
        hasMemoryAPI: Boolean(mem),
      },
      network: {
        activeRequests: 0,
        totalRequests: 0,
        slowRequests: 0,
        firestoreListeners: metrics.firestoreListeners,
        firestoreWrites: metrics.firestoreWrites,
      },
      animation: {
        isTransitionActive: metrics.activeTransitionsCount > 0,
        activeAnimationCount: metrics.activeTransitionsCount,
      },
      warnings,
    };
  }

  public reset() {
    this.frameTimes = [];
    this.totalFrames = 0;
    this.minFps = Infinity;
    this.maxFps = 0;
    this.droppedFrames = 0;
    this.jankyFrames = 0;
    this.longFrames = 0;
    this.veryLongFrames = 0;
    this.worstFrameTime = 0;
    this.framesExceeding120Hz = 0;
    this.framesExceeding90Hz = 0;
    this.framesExceeding60Hz = 0;
    this.recentLongTasks = [];
    this.recentExpensiveCommits = [];
    this.recentNavigations = [];
    this.componentRenders.clear();
    this.reactCommitCount = 0;
    this.reactCommitDurations = [];
    this.reactSlowestCommit = null;
  }
}
