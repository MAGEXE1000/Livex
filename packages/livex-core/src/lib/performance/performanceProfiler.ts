// performanceProfiler.ts

export interface ProfilerMetrics {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  low1PercentFps: number;
  frameTime: number;
  frameVariance: number;
  droppedFrames: number;
  longFrames: number;
  veryLongFrames: number;
  eventLoopDelay: number;
  heapSize: string;
  usedHeap: string;
  heapGrowth: string;
  gpuRenderer: string;
  refreshRate: number;
  mainThreadBlockingTotal: number;
  longestBlockingTask: number;
  thermalState: string;
  batteryOptimized: string;
  // Performance 2.0 metrics
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
}

export interface PerformanceWarning {
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  measured: string;
  expected: string;
  possibleCause: string;
  suggestedInvestigation: string;
}

export class PerformanceProfiler {
  private static instance: PerformanceProfiler | null = null;

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

  // Event Loop delay tracking
  private eventLoopDelay = 0;
  private eventLoopTimer: any = null;
  private lastEventLoopTime = 0;

  // Heap growth tracking
  private initialUsedHeap = 0;
  private lastHeapSampleTime = 0;
  private heapGrowthRate = 0;

  // Main thread blocking tasks
  private observer: PerformanceObserver | null = null;
  private totalBlockingTime = 0;
  private longestBlockingTask = 0;

  // Performance 2.0 sample buffers
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

  private constructor() {}

  public recordCallbackLatency(latencyMs: number, isInstaller = false) {
    if (isInstaller) {
      this.installerLatencySamples.push(latencyMs);
      if (this.installerLatencySamples.length > 20) this.installerLatencySamples.shift();
    } else {
      this.callbackLatencySamples.push(latencyMs);
      if (this.callbackLatencySamples.length > 20) this.callbackLatencySamples.shift();
    }
  }

  public getGPULayerCount(): number {
    if (typeof document === 'undefined') return 0;
    const now = performance.now();
    // Cache for 3000ms to avoid synchronous layout thrashing and computed style recalculations
    if (now - this.lastGpuLayerCountSampleTime < 3000 && this.lastGpuLayerCountSampleTime > 0) {
      return this.cachedGpuLayerCount;
    }
    this.lastGpuLayerCountSampleTime = now;
    try {
      // Use targeted selector instead of full-DOM querySelectorAll('*') and per-node getComputedStyle
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
    this.totalBlockingTime = 0;
    this.longestBlockingTask = 0;

    this.cpuSamples = [];
    this.memorySamples = [];
    this.jsThreadSamples = [];
    this.uiThreadSamples = [];
    this.callbackLatencySamples = [];
    this.installerLatencySamples = [];
    this.lastSampleTime = performance.now();
    this.lastBlockingTime = 0;

    if (typeof document !== 'undefined' && !this.visibilityListenerBound) {
      this.visibilityListenerBound = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Start periodic sampler
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

    // 1. Frame profiling loop
    this.startFrameLoop();

    // 2. Event loop delay tracking loop
    this.startEventLoopTimer();

    // 3. Heap sample init
    const mem = (performance as any).memory;
    if (mem) {
      this.initialUsedHeap = mem.usedJSHeapSize;
      this.lastHeapSampleTime = performance.now();
      this.heapGrowthRate = 0;
    }

    // 4. PerformanceObserver for Long Tasks
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.totalBlockingTime += entry.duration;
            if (entry.duration > this.longestBlockingTask) {
              this.longestBlockingTask = entry.duration;
            }
            this.jsThreadSamples.push(entry.duration);
            if (this.jsThreadSamples.length > 100) this.jsThreadSamples.shift();
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {}
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

        const lastLongTask = this.jsThreadSamples[this.jsThreadSamples.length - 1] || 0;
        const uiTime = Math.max(1, delta - lastLongTask);
        this.uiThreadSamples.push(uiTime);
        if (this.uiThreadSamples.length > 100) this.uiThreadSamples.shift();

        if (delta > 20) {
          const estimatedDropped = Math.floor(delta / 16.67) - 1;
          this.droppedFrames += Math.max(0, estimatedDropped);
        }
        if (delta > 33.33) {
          this.longFrames++;
        }
        if (delta > 50.0) {
          this.veryLongFrames++;
        }

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
    if (this.observer !== null) {
      this.observer.disconnect();
      this.observer = null;
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
    if (this.frameTimes.length === 0) {
      return {
        currentFps: 0,
        averageFps: 0,
        minFps: 0,
        maxFps: 0,
        low1PercentFps: 0,
        frameTime: 0,
        frameVariance: 0,
        droppedFrames: 0,
        longFrames: 0,
        veryLongFrames: 0,
        eventLoopDelay: 0,
        heapSize: 'Unavailable',
        usedHeap: 'Unavailable',
        heapGrowth: 'Unavailable',
        gpuRenderer: this.getGPUInfo(),
        refreshRate: 60,
        mainThreadBlockingTotal: 0,
        longestBlockingTask: 0,
        thermalState: 'Unavailable',
        batteryOptimized: 'Unavailable',
        cpuAverage: 0,
        cpuPeak: 0,
        memoryAverage: 'Unavailable',
        memoryPeak: 'Unavailable',
        jsThreadAverage: 0,
        jsThreadPeak: 0,
        uiThreadAverage: 0,
        uiThreadPeak: 0,
        framePacing: 0,
        gpuLayerCount: 0,
        averageCallbackLatency: 0,
        packageInstallerLatency: 0,
        updatePipelineDuration: 'N/A',
      };
    }

    // 1. Current FPS
    const last10 = this.frameTimes.slice(-10);
    const last10AvgTime = last10.reduce((a, b) => a + b, 0) / last10.length;
    const currentFps = Math.round(1000 / last10AvgTime);

    // 2. Average FPS
    const totalDuration = performance.now() - this.startTime;
    const averageFps =
      totalDuration > 0 ? Math.round((this.totalFrames * 1000) / totalDuration) : 0;

    // 3. Min/Max FPS
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const minFpsVal = Math.round(1000 / sorted[sorted.length - 1]);
    const maxFpsVal = Math.round(1000 / sorted[0]);

    if (this.totalFrames > 15) {
      this.minFps = Math.min(this.minFps, minFpsVal);
      this.maxFps = Math.max(this.maxFps, maxFpsVal);
    }

    // 4. 1% Low FPS
    const lowCount = Math.max(1, Math.floor(sorted.length * 0.01));
    const slowFrames = sorted.slice(-lowCount);
    const slowFramesAvg = slowFrames.reduce((a, b) => a + b, 0) / slowFrames.length;
    const low1PercentFps = Math.round(1000 / slowFramesAvg);

    // 5. Frame Variance (Standard Deviation)
    const mean = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const variance =
      this.frameTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.frameTimes.length;
    const frameVariance = Math.sqrt(variance);

    // 6. Heap Memory statistics
    let heapSizeStr = 'Unavailable';
    let usedHeapStr = 'Unavailable';
    let heapGrowthStr = 'Unavailable';

    const mem = (performance as any).memory;
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

    // 7. Refresh Rate estimation
    let refreshRate = 60;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    if (avgFrameTime < 9.0) refreshRate = 120;
    else if (avgFrameTime < 12.0) refreshRate = 90;
    else refreshRate = 60;

    // Performance 2.0 calculations
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

    return {
      currentFps: Math.min(refreshRate, currentFps),
      averageFps: Math.min(refreshRate, averageFps),
      minFps: this.minFps === Infinity ? 0 : Math.min(refreshRate, this.minFps),
      maxFps: Math.min(refreshRate, this.maxFps),
      low1PercentFps: Math.min(refreshRate, low1PercentFps),
      frameTime: parseFloat(last10AvgTime.toFixed(1)),
      frameVariance: parseFloat(frameVariance.toFixed(2)),
      droppedFrames: this.droppedFrames,
      longFrames: this.longFrames,
      veryLongFrames: this.veryLongFrames,
      eventLoopDelay: parseFloat(this.eventLoopDelay.toFixed(1)),
      heapSize: heapSizeStr,
      usedHeap: usedHeapStr,
      heapGrowth: heapGrowthStr,
      gpuRenderer: this.getGPUInfo(),
      refreshRate,
      mainThreadBlockingTotal: parseFloat(this.totalBlockingTime.toFixed(1)),
      longestBlockingTask: parseFloat(this.longestBlockingTask.toFixed(1)),
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
      framePacing: parseFloat(frameVariance.toFixed(2)),
      gpuLayerCount: this.getGPULayerCount(),
      averageCallbackLatency: avgCallbackLat,
      packageInstallerLatency: instCallbackLat,
      updatePipelineDuration: activeDuration,
    };
  }

  public getScore(metrics: ProfilerMetrics): number {
    let score = 100;

    const fpsDeficit = metrics.refreshRate - metrics.averageFps;
    if (fpsDeficit > 0) score -= fpsDeficit * 2.5;

    score -= Math.min(15, metrics.droppedFrames * 0.1);
    score -= Math.min(15, metrics.longFrames * 0.5);

    if (metrics.longestBlockingTask > 50) score -= 10;
    if (metrics.longestBlockingTask > 150) score -= 15;

    if (metrics.frameVariance > 3.0) score -= 10;
    if (metrics.frameVariance > 8.0) score -= 10;

    const mem = (performance as any).memory;
    if (mem) {
      const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      if (ratio > 0.75) score -= 15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  public getWarnings(metrics: ProfilerMetrics): PerformanceWarning[] {
    const list: PerformanceWarning[] = [];

    if (metrics.longestBlockingTask > 100) {
      list.push({
        severity: 'Critical',
        title: 'Long Main-Thread Blocking Task',
        description:
          'A heavy JavaScript execution blocked the main UI thread, interrupting interactions and animations.',
        measured: `${metrics.longestBlockingTask.toFixed(1)} ms`,
        expected: '< 50.0 ms',
        possibleCause:
          'Heavy React rendering, synchronous localStorage operations, or complex data processing.',
        suggestedInvestigation:
          'Audit layout effects, chunk expensive array calculations, or introduce web workers.',
      });
    }

    if (metrics.droppedFrames > 50) {
      list.push({
        severity: 'Warning',
        title: 'High Jitter / Dropped Frames',
        description:
          'Frequent frame time variations detected. UI animations may feel visually stuttered.',
        measured: `${metrics.droppedFrames} dropped`,
        expected: '0 dropped',
        possibleCause:
          'React re-renders happening during active transitions, layout thrashing, or high main thread load.',
        suggestedInvestigation:
          'Verify useMemo/useCallback usage. Reduce React state writes during user scroll operations.',
      });
    }

    if (metrics.eventLoopDelay > 25) {
      list.push({
        severity: 'Warning',
        title: 'Event Loop Delay Spike',
        description:
          'The JavaScript event loop is overloaded, lagging asynchronous task execution.',
        measured: `${metrics.eventLoopDelay.toFixed(1)} ms`,
        expected: '< 10.0 ms',
        possibleCause:
          'Synchronous blocking executions, heavy microtask queues, or excessive timers.',
        suggestedInvestigation:
          'Trace long-running callbacks. Avoid setInterval loops with heavy callback payloads.',
      });
    }

    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.75) {
      list.push({
        severity: 'Critical',
        title: 'High Memory Pressure',
        description: 'Used JS heap is dangerously close to the browser memory allocation limit.',
        measured: `${(mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB`,
        expected: `< ${((mem.jsHeapSizeLimit * 0.75) / (1024 * 1024)).toFixed(1)} MB`,
        possibleCause:
          'Memory leaks, accumulated global references, or heavy media/assets stored in memory buffers.',
        suggestedInvestigation:
          'Run memory profiles in Chrome DevTools to locate un-cleared intervals or detached DOM trees.',
      });
    }

    return list;
  }
}
