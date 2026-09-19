import { SyncOrchestrator } from './syncOrchestrator.js';
import assert from 'node:assert';

async function runSyncOrchestratorTests() {
  console.log('=== RUNNING SYNC ORCHESTRATOR TESTS ===');

  // Test 1: Successful sync execution flow
  let stateHistory: string[] = [];
  const unsubscribe = SyncOrchestrator.subscribe((state) => {
    stateHistory.push(state.phase);
  });

  console.log('Testing successful sync flow...');
  await SyncOrchestrator.enqueueRun(async () => {
    // Simulate successful cloud sync operation
    await new Promise((r) => setTimeout(r, 50));
  });

  assert(stateHistory.includes('running'), 'State history must include running phase.');
  assert(stateHistory.includes('completed'), 'State history must include completed phase.');
  console.log('✓ Successful sync flow passed.');

  // Test 2: Error and retry flow
  console.log('Testing error handling & state reporting...');
  let failedRunTriggered = false;
  try {
    await SyncOrchestrator.enqueueRun(async () => {
      throw new Error('Simulated cloud network timeout');
    });
  } catch (_) {
    failedRunTriggered = true;
  }

  const finalState = SyncOrchestrator.getState();
  assert(finalState.phase === 'failed' || finalState.phase === 'retry', 'Sync orchestrator state must report retry or failed state on error.');
  assert(finalState.lastError?.includes('cloud network timeout'), 'Error message must be recorded accurately.');

  unsubscribe();
  console.log('✓ Error handling & state reporting passed.');
  console.log('\x1b[32m=== ALL SYNC ORCHESTRATOR TESTS PASSED CLEANLY ===\x1b[0m');
}

runSyncOrchestratorTests().catch((err) => {
  console.error('Sync orchestrator tests failed:', err);
  process.exit(1);
});
