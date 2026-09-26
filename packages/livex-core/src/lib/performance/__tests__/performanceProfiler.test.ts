import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceProfiler } from '../performanceProfiler';

describe('PerformanceProfiler Diagnostics Suite', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = PerformanceProfiler.getInstance();
    profiler.reset();
  });

  it('records React commits and updates slowest commit and component profile', () => {
    profiler.recordReactCommit('ChordexSongsPanel', 'mount', 24.5);
    profiler.recordReactCommit('ChordexSongsPanel', 'update', 8.2);
    profiler.recordReactCommit('SongSheet', 'update', 62.0);

    const metrics = profiler.getMetrics();

    expect(metrics.reactCommitCount).toBe(3);
    expect(metrics.reactSlowestCommit).not.toBeNull();
    expect(metrics.reactSlowestCommit?.componentId).toBe('SongSheet');
    expect(metrics.reactSlowestCommit?.duration).toBe(62.0);

    const chordexProfile = metrics.componentRenderProfiles.find(
      (p) => p.name === 'ChordexSongsPanel'
    );
    expect(chordexProfile).toBeDefined();
    expect(chordexProfile?.mounts).toBe(1);
    expect(chordexProfile?.renders).toBe(2);

    expect(metrics.recentExpensiveCommits.length).toBeGreaterThan(0);
    const expensive = metrics.recentExpensiveCommits.find((c) => c.componentId === 'SongSheet');
    expect(expensive).toBeDefined();
  });

  it('detects high-frequency component thrashing and flags warnings', () => {
    // Simulate 18 rapid renders within a tight window
    for (let i = 0; i < 18; i++) {
      profiler.recordReactCommit('ThrashingWidget', 'update', 2.0);
    }

    const metrics = profiler.getMetrics();
    expect(metrics.highFrequencyComponents).toContain('ThrashingWidget');

    const warnings = profiler.getWarnings(metrics);
    const thrashWarning = warnings.find(
      (w) => w.metric === 'render_frequency' && w.affectedSubsystem === 'ThrashingWidget'
    );
    expect(thrashWarning).toBeDefined();
    expect(thrashWarning?.title).toContain('Component Render Thrashing: <ThrashingWidget />');
    expect(thrashWarning?.actualValue).toContain('18 renders');
    expect(thrashWarning?.threshold).toBe('< 15 renders / 2.0s');
  });

  it('records navigation transitions and calculates average transition duration', () => {
    profiler.recordNavigation('hub', 'chordex:library', 'forward', 84.5);
    profiler.recordNavigation('chordex:library', 'chordex:songs', 'forward', 65.2);

    const metrics = profiler.getMetrics();
    expect(metrics.recentNavigations.length).toBe(2);
    expect(metrics.recentNavigations[0].fromRoute).toBe('hub');
    expect(metrics.recentNavigations[0].toRoute).toBe('chordex:library');
    expect(metrics.recentNavigations[0].durationMs).toBe(84.5);
    expect(metrics.avgNavigationDuration).toBeGreaterThan(70);
  });

  it('generates concrete, actionable warnings with exact values instead of generic messages', () => {
    // Record expensive React commit > 40ms
    profiler.recordReactCommit('HeavyDetailSheet', 'mount', 73.4);

    const metrics = profiler.getMetrics();
    const warnings = profiler.getWarnings(metrics);

    const commitWarning = warnings.find((w) => w.metric === 'react_commit');
    expect(commitWarning).toBeDefined();
    expect(commitWarning?.description).toContain('73 ms React commit');
    expect(commitWarning?.description).toContain('HeavyDetailSheet');
    expect(commitWarning?.actualValue).toBe('73.4 ms');
    expect(commitWarning?.threshold).toBe('< 16.0 ms');
    expect(commitWarning?.affectedSubsystem).toBe('HeavyDetailSheet');
  });

  it('exports a complete, sanitized diagnostic snapshot without sensitive user data', () => {
    profiler.recordReactCommit('HubHeader', 'mount', 14.0);
    profiler.recordNavigation('hub', 'settings:developer', 'forward', 92.0);

    const snapshot = profiler.exportDiagnosticSnapshot();

    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.appVersion).toBeDefined();
    expect(snapshot.runtime).toBeDefined();
    expect(snapshot.fps).toBeDefined();
    expect(snapshot.fps.framesExceeding120Hz).toBeDefined();
    expect(snapshot.fps.framesExceeding90Hz).toBeDefined();
    expect(snapshot.fps.framesExceeding60Hz).toBeDefined();
    expect(snapshot.javascript).toBeDefined();
    expect(snapshot.react).toBeDefined();
    expect(snapshot.react.commitCount).toBe(1);
    expect(snapshot.navigation.recentNavigations.length).toBe(1);
    expect(snapshot.warnings).toBeInstanceOf(Array);

    // Verify snapshot is valid JSON and contains no sensitive properties
    const jsonString = JSON.stringify(snapshot);
    expect(jsonString).not.toContain('password');
    expect(jsonString).not.toContain('token');
    expect(jsonString).not.toContain('secret');
  });
});
