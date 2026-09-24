import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdaterFlightRecorder } from '../flightRecorder';

describe('Updater Performance & Bottleneck Optimization Verification', () => {
  it('eliminates synchronous main-thread storage writes during download events', () => {
    let setItemCount = 0;
    let totalBytesWritten = 0;
    const storageMock: Record<string, string> = {};

    (global as any).localStorage = {
      getItem: (key: string) => storageMock[key] || null,
      setItem: (key: string, val: string) => {
        setItemCount++;
        totalBytesWritten += String(val).length;
        storageMock[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
    };

    const startTimer = performance.now();
    for (let i = 1; i <= 30; i++) {
      UpdaterFlightRecorder.record({
        thread: 'ui',
        sessionId: null,
        workflowId: null,
        eventType: 'LivexUpdateScreenRender',
        caller: 'LivexUpdateScreen',
        reason: `Rendered LivexUpdateScreen state: downloading (${i * 3}%)`,
      });
    }
    const burstElapsedMs = performance.now() - startTimer;

    console.log(`[PROFILE OPTIMIZED] Flight Recorder Synchronous I/O:`);
    console.log(`   Synchronous calls to localStorage.setItem: ${setItemCount}`);
    console.log(`   Burst Time: ${burstElapsedMs.toFixed(2)} ms`);

    // Verify 0 synchronous blocking writes occurred during the high-frequency burst
    expect(setItemCount).toBe(0);

    // Verify flushSync persists the batched events in a single coordinated operation
    UpdaterFlightRecorder.flushSync();
    expect(setItemCount).toBe(2); // 1 for events, 1 for sequenceId
    expect(totalBytesWritten).toBeGreaterThan(0);
  });
});
