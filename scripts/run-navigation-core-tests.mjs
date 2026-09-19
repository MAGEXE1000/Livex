import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Setup mock window/document and localStorage for Zustand persist middleware
globalThis.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.localStorage = globalThis.window.localStorage;

async function runNavigationCoreTests() {
  console.log('=== STARTING AUTOMATED NAVIGATION CORE INFRASTRUCTURE TESTS ===');

  const results = [];
  const assertTest = (name, fn) => {
    try {
      fn();
      results.push({ name, status: 'PASS', details: 'Check passed successfully.' });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', details: err.stack || err.message });
      console.error(`[FAIL] ${name}:`, err.stack || err.message);
    }
  };

  const storePath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/store/useNavigationStore.js'
  );
  const storeUrl = `file://${storePath.replace(/\\/g, '/')}`;
  const { useNavigationStore } = await import(storeUrl);

  const dispatcherPath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/lib/navigation/NavigationDispatcher.js'
  );
  const dispatcherUrl = `file://${dispatcherPath.replace(/\\/g, '/')}`;
  const { NavigationDispatcher } = await import(dispatcherUrl);

  const coordinatorPath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/lib/navigation/NavigationCoordinator.js'
  );
  const coordinatorUrl = `file://${coordinatorPath.replace(/\\/g, '/')}`;
  const { NavigationCoordinator } = await import(coordinatorUrl);

  const backPath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/lib/navigation/BackDispatcher.js'
  );
  const backUrl = `file://${backPath.replace(/\\/g, '/')}`;
  const { BackDispatcher } = await import(backUrl);

  const gesturePath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/lib/navigation/GestureDispatcher.js'
  );
  const gestureUrl = `file://${gesturePath.replace(/\\/g, '/')}`;
  const { GestureDispatcher } = await import(gestureUrl);

  const transitionPath = path.join(
    repoRoot,
    'packages/livex-core/dist/src/lib/navigation/TransitionCoordinator.js'
  );
  const transitionUrl = `file://${transitionPath.replace(/\\/g, '/')}`;
  const { TransitionCoordinator } = await import(transitionUrl);

  // Helper to reset store state before each test
  const resetStore = () => {
    useNavigationStore.getState().resetStore();
  };

  // Test 1: Initial Navigation State
  assertTest('Initial state is correct', () => {
    resetStore();
    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 1);
    assert.deepStrictEqual(state.history[0], { app: 'hub', tab: 'home' });
    assert.strictEqual(state.isTransitioning, false);
    assert.strictEqual(state.gestureState, 'idle');
    assert.strictEqual(storeStateHasRoute(state.history, { app: 'hub', tab: 'home' }), true);
  });

  // Test 2: push method sets app defaults and does not block transitions
  assertTest('push adds route, applies defaults and does not block transitions', () => {
    resetStore();
    NavigationDispatcher.push({ app: 'chordex' });

    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
    assert.strictEqual(state.history[1].page, 'library'); // default chords sub-page
    assert.strictEqual(state.isTransitioning, true);
    assert.strictEqual(state.transitionType, 'forward');

    // Test transition is NOT blocked (lock check removed globally)
    NavigationDispatcher.push({ app: 'vocalex' });
    state = useNavigationStore.getState();
    // Length should be 3 due to transition lock removal
    assert.strictEqual(state.history.length, 3);
  });

  // Test 3: replace method replaces top of stack
  assertTest('replace method updates top route', () => {
    resetStore();
    // Simulate lock release
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex' });
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.replace({ app: 'groovex' });
    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'groovex');
    assert.strictEqual(state.history[1].page, 'library');
    assert.strictEqual(state.transitionType, 'replace');
  });

  // Test 4: pop pops routes and obeys empty stack guard
  assertTest('pop navigates backward and respects stack guards', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex' });
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex', page: 'chord' });
    useNavigationStore.getState().setTransition(null, false);

    assert.strictEqual(NavigationDispatcher.canGoBack(), true);
    NavigationDispatcher.pop();

    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
    assert.strictEqual(state.history[1].page, 'library');

    // Block popping past app root
    useNavigationStore.getState().setTransition(null, false);
    assert.strictEqual(NavigationDispatcher.canGoBack(), false);
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
  });

  // Test 5: popTo pops back to specific target
  assertTest('popTo pops stack back to target predicate match', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex' });
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'vocalex' });
    useNavigationStore.getState().setTransition(null, false);

    assert.strictEqual(useNavigationStore.getState().history.length, 3);

    NavigationDispatcher.popTo((route) => route.app === 'chordex');
    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
  });

  // Test 6: reset stack
  assertTest('reset stack overwrites history stack', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.reset([
      { app: 'hub', tab: 'home' },
      { app: 'vocalex', page: 'pitch' },
    ]);

    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'vocalex');
    assert.strictEqual(state.history[1].page, 'pitch');
  });

  // Test 7: Route validation strips extra parameters
  assertTest('route validation normalizes parameters', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({
      app: 'vocalex',
      page: 'takes',
      extraParam: 'corruptMe',
    });

    const state = useNavigationStore.getState();
    const topRoute = state.history[state.history.length - 1];
    assert.strictEqual(topRoute.app, 'vocalex');
    assert.strictEqual(topRoute.page, 'takes');
    assert.strictEqual(topRoute.extraParam, undefined);
  });

  // Test 8: BackDispatcher prioritized registrations
  assertTest('BackDispatcher resolves priority layers modal > sheet > overlay', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    let modalCalled = false;
    let sheetCalled = false;

    // Register lower priority first
    const cleanSheet = BackDispatcher.register('sheet', () => {
      sheetCalled = true;
      return true;
    });

    // Register higher priority second
    const cleanModal = BackDispatcher.register('modal', () => {
      modalCalled = true;
      return true;
    });

    const handled = BackDispatcher.handleBackEvent();
    assert.strictEqual(handled, true);
    assert.strictEqual(modalCalled, true);
    assert.strictEqual(sheetCalled, false); // higher priority modal should swallow event

    cleanSheet();
    cleanModal();
  });

  // Test 9: GestureDispatcher predictive progress updates store
  assertTest('GestureDispatcher updates predictive progress and commits', () => {
    resetStore();
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex' });
    useNavigationStore.getState().setTransition(null, false);

    NavigationDispatcher.push({ app: 'chordex', page: 'chord' });
    useNavigationStore.getState().setTransition(null, false);

    GestureDispatcher.onGestureStart();
    let state = useNavigationStore.getState();
    assert.strictEqual(state.gestureState, 'swiping');
    assert.strictEqual(state.predictiveProgress, 0);

    GestureDispatcher.onGestureProgress(0.65);
    state = useNavigationStore.getState();
    assert.strictEqual(state.gestureState, 'swiping');
    assert.strictEqual(state.predictiveProgress, 0.65);

    GestureDispatcher.onGestureCommit();
    state = useNavigationStore.getState();
    assert.strictEqual(state.gestureState, 'committed');

    // Once committed, it should trigger pop (after timeout it goes to idle)
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].page, 'library');
  });

  // Test 10: TransitionCoordinator calculates ease curves
  assertTest('TransitionCoordinator computes duration and curve structures', () => {
    const curveModal = TransitionCoordinator.getTransitionEasing('modal');
    assert.strictEqual(curveModal, 'cubic-bezier(0.34, 1.56, 0.64, 1)');

    const durationNormal = TransitionCoordinator.getTransitionDuration('normal');
    assert.strictEqual(durationNormal, 300);
  });

  console.log('\n=== REGRESSION TEST RESULTS ===');
  console.log('| Test Name | Status | Details |');
  console.log('|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.details} |`);
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`\n❌ Navigation core regression tests failed: ${failed.length} failures.`);
    process.exit(1);
  } else {
    console.log('\n✅ All navigation core regression tests passed successfully!');
    process.exit(0);
  }
}

function storeStateHasRoute(history, expected) {
  return history.some(
    (route) =>
      route.app === expected.app && route.tab === expected.tab && route.page === expected.page
  );
}

runNavigationCoreTests().catch((err) => {
  console.error('Test runner encountered an uncaught error:', err);
  process.exit(1);
});
