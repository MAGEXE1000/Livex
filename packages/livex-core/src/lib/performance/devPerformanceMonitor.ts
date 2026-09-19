// devPerformanceMonitor.ts - Developer Performance Instrumentation (Dev Only)

export interface DevPerformanceMetrics {
  commitCount: number;
  lastCommitDurationMs: number;
  avgCommitDurationMs: number;
  fps: number;
  longTaskCount: number;
  totalBlockingTimeMs: number;
  estimatedCpuUsagePercent: number;
}

type DevMetricsListener = (metrics: DevPerformanceMetrics) => void;

class DevPerformanceMonitorClass {
  private commitCount = 0;
  private commitDurations: number[] = [];
  private listeners = new Set<DevMetricsListener>();
  private longTaskCount = 0;
  private totalBlockingTimeMs = 0;
  private observer: PerformanceObserver | null = null;
  private isEnabled = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

  constructor() {
    if (this.isEnabled && typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.longTaskCount++;
              this.totalBlockingTimeMs += entry.duration;
              this.notify();
            }
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch (_) {}
    }
  }

  public recordReactCommit(durationMs: number) {
    if (!this.isEnabled) return;
    this.commitCount++;
    this.commitDurations.push(durationMs);
    if (this.commitDurations.length > 50) {
      this.commitDurations.shift();
    }
    this.notify();
  }

  public getMetrics(): DevPerformanceMetrics {
    const avgDuration =
      this.commitDurations.length > 0
        ? this.commitDurations.reduce((a, b) => a + b, 0) / this.commitDurations.length
        : 0;

    return {
      commitCount: this.commitCount,
      lastCommitDurationMs: this.commitDurations[this.commitDurations.length - 1] || 0,
      avgCommitDurationMs: parseFloat(avgDuration.toFixed(2)),
      fps: 60,
      longTaskCount: this.longTaskCount,
      totalBlockingTimeMs: parseFloat(this.totalBlockingTimeMs.toFixed(1)),
      estimatedCpuUsagePercent: Math.min(100, Math.round((this.totalBlockingTimeMs / (performance.now() || 1)) * 100)),
    };
  }

  public subscribe(listener: DevMetricsListener) {
    if (!this.isEnabled) return () => {};
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    if (this.listeners.size === 0) return;
    const metrics = this.getMetrics();
    this.listeners.forEach((l) => l(metrics));
  }
}

export const DevPerformanceMonitor = new DevPerformanceMonitorClass();
