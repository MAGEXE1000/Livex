import { describe, it, expect, beforeEach } from 'vitest';
import { MotionProfiler } from '../motionProfiler';

describe('MotionProfiler', () => {
  beforeEach(() => {
    MotionProfiler.clearTraces();
  });

  it('records app-switch traces with duration and metadata', () => {
    MotionProfiler.startAppSwitch('hub', 'chordex');
    const trace = MotionProfiler.endAppSwitch('chordex');

    expect(trace).not.toBeNull();
    expect(trace?.name).toBe('app-switch');
    expect(trace?.target).toBe('chordex');
    expect(trace?.metadata.fromApp).toBe('hub');
    expect(trace?.metadata.toApp).toBe('chordex');
    expect(trace?.durationMs).toBeGreaterThanOrEqual(0);
    expect(trace?.frameTiming).toBeDefined();
    expect(trace?.frameTiming.droppedFrames60).toBeGreaterThanOrEqual(0);
  });

  it('records morph-open and morph-close traces', () => {
    const surfaceId = 'test-surface-1';

    MotionProfiler.startMorphOpen(surfaceId);
    const openTrace = MotionProfiler.endMorphOpen(surfaceId);

    expect(openTrace).not.toBeNull();
    expect(openTrace?.name).toBe('morph-open');
    expect(openTrace?.target).toBe(surfaceId);
    expect(openTrace?.durationMs).toBeGreaterThanOrEqual(0);

    MotionProfiler.startMorphClose(surfaceId);
    const closeTrace = MotionProfiler.endMorphClose(surfaceId);

    expect(closeTrace).not.toBeNull();
    expect(closeTrace?.name).toBe('morph-close');
    expect(closeTrace?.target).toBe(surfaceId);
    expect(closeTrace?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('detects rapid close -> reopen blocked by exit overlay', () => {
    const surfaceId = 'test-surface-retrigger';

    // 1. Close starts
    MotionProfiler.startMorphClose(surfaceId);

    // 2. User immediately clicks trigger while exit animation is still running
    const retrigger = MotionProfiler.recordTriggerAttempt(surfaceId);

    expect(retrigger.blockedByExitOverlay).toBe(true);
    expect(retrigger.closeEndTime).toBeNull();
    expect(retrigger.notes).toContain('pointerEvents:auto');

    // 3. Close finishes
    MotionProfiler.endMorphClose(surfaceId);

    // 4. User clicks after exit completed
    const cleanRetrigger = MotionProfiler.recordTriggerAttempt(surfaceId);
    expect(cleanRetrigger.blockedByExitOverlay).toBe(false);
    expect(cleanRetrigger.closeEndTime).not.toBeNull();
    expect(cleanRetrigger.notes).toContain('Clean reopen');
  });

  it('records unblocked rapid retrigger during exit when pointer events pass through', () => {
    const surfaceId = 'test-surface-unblocked';

    MotionProfiler.startMorphClose(surfaceId);

    // Trigger receives event during exit animation because overlay has pointer-events: none
    const retrigger = MotionProfiler.recordTriggerAttempt(surfaceId, { blockedByExitOverlay: false });

    expect(retrigger.blockedByExitOverlay).toBe(false);
    expect(retrigger.closeEndTime).toBeNull();
    expect(retrigger.notes).toContain('passed through to trigger');
  });

  it('records settings-change trace with key and metadata', () => {
    const traceId = MotionProfiler.startSettingsChange('theme,amoledMode', { theme: 'dark', amoledMode: true });
    MotionProfiler.recordComponentRender('AppAnimationSystem');
    MotionProfiler.recordComponentRender('SharedNavigationBar');
    const trace = MotionProfiler.endSettingsChange(traceId, 22);

    expect(trace).not.toBeNull();
    expect(trace?.name).toBe('settings-change');
    expect(trace?.target).toBe('theme,amoledMode');
    expect(trace?.rendersCount).toBe(2);
    expect(trace?.componentRenders['AppAnimationSystem']).toBe(1);
    expect(trace?.componentRenders['SharedNavigationBar']).toBe(1);
    expect(trace?.metadata.subscriberCount).toBe(22);
  });

  it('generates a clean aggregate summary', () => {
    MotionProfiler.startAppSwitch('hub', 'drumex');
    MotionProfiler.endAppSwitch('drumex');

    MotionProfiler.startMorphOpen('surface-a');
    MotionProfiler.endMorphOpen('surface-a');

    const summary = MotionProfiler.getSummary();
    expect(summary.totalTraces).toBe(2);
    expect(summary.appSwitch.count).toBe(1);
    expect(summary.morphOpen.count).toBe(1);
    expect(summary.morphClose.count).toBe(0);
  });
});
