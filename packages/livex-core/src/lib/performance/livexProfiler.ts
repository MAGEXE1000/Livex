import React, { Profiler, type ReactNode, useEffect, useRef } from 'react';
import { PerformanceProfiler } from './performanceProfiler';

export interface LivexProfilerProps {
  id: string;
  children: ReactNode;
}

/**
 * Production React Profiler wrapper that tracks commit timing and render performance
 * without incurring extra DOM overhead.
 */
export function LivexProfiler({ id, children }: LivexProfilerProps): React.ReactElement {
  const onRenderCallback = (
    profilerId: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number
  ) => {
    try {
      PerformanceProfiler.getInstance().recordReactCommit(
        profilerId,
        phase,
        actualDuration,
        baseDuration
      );
    } catch (_) {}
  };

  return React.createElement(Profiler, { id, onRender: onRenderCallback }, children);
}

/**
 * Lightweight React component render frequency & lifecycle tracker
 */
export function usePerformanceTrack(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(0);

  if (mountTimeRef.current === 0) {
    mountTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
  renderCountRef.current++;

  useEffect(() => {
    try {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const mountDuration = Math.max(0.1, now - mountTimeRef.current);
      PerformanceProfiler.getInstance().recordReactCommit(componentName, 'mount', mountDuration);
    } catch (_) {}
  }, [componentName]);

  useEffect(() => {
    if (renderCountRef.current > 1) {
      try {
        PerformanceProfiler.getInstance().recordReactCommit(componentName, 'update', 1.0);
      } catch (_) {}
    }
  });
}
