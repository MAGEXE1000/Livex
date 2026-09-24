import { describe, it, expect } from 'vitest';
import { resolveAccent } from '../preferences/accentUtils';
import { getAllChords, getChordById, getChordByName } from '../../data/chords';

describe('Performance Baseline Benchmarks', () => {
  it('benchmark: resolveAccent throughput', () => {
    const ACCENT_TESTS = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'indigo', '#3b82f6'];
    const N = 50000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const color = ACCENT_TESTS[i % ACCENT_TESTS.length];
      resolveAccent(color);
    }
    const duration = performance.now() - t0;
    const opsPerSec = Math.round((N / duration) * 1000);
    console.log(`[PERF-BENCH] resolveAccent: ${N} calls in ${duration.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);
    expect(duration).toBeGreaterThan(0);
  });

  it('benchmark: getChordById throughput', () => {
    const allChords = getAllChords();
    const testIds = allChords.slice(0, 50).map((c) => c.id);
    const N = 25000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const id = testIds[i % testIds.length];
      getChordById(id);
    }
    const duration = performance.now() - t0;
    const opsPerSec = Math.round((N / duration) * 1000);
    console.log(`[PERF-BENCH] getChordById: ${N} lookups in ${duration.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);
    expect(duration).toBeGreaterThan(0);
  });

  it('benchmark: getChordByName throughput', () => {
    const allChords = getAllChords();
    const testNames = allChords.slice(0, 50).map((c) => c.name);
    const N = 10000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const name = testNames[i % testNames.length];
      getChordByName(name);
    }
    const duration = performance.now() - t0;
    const opsPerSec = Math.round((N / duration) * 1000);
    console.log(`[PERF-BENCH] getChordByName: ${N} lookups in ${duration.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);
    expect(duration).toBeGreaterThan(0);
  });
});
