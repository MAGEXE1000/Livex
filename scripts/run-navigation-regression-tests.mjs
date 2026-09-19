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
};
globalThis.localStorage = globalThis.window.localStorage;

async function runNavigationTests() {
  console.log('=== STARTING AUTOMATED NAVIGATION REGRESSION TESTS ===');

  const results = [];
  const assertTest = (name, fn) => {
    try {
      fn();
      results.push({ name, status: 'PASS', details: 'Check passed successfully.' });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', details: err.message });
      console.error(`[FAIL] ${name}:`, err.message);
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

  // Helper to reset store state before each test
  const resetStore = () => {
    useNavigationStore.setState({
      history: [{ app: 'hub', tab: 'home' }],
      transitionType: null,
      isTransitioning: false,
    });
  };

  const unlock = () => {
    useNavigationStore.setState({ isTransitioning: false });
  };

  // Test 1: Initial Navigation State
  assertTest('Initial state is correct', () => {
    resetStore();
    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 1);
    assert.deepStrictEqual(state.history[0], { app: 'hub', tab: 'home' });
  });

  // Test 2: pushNav works and defaults pages/panels correctly
  assertTest('pushNav sets defaults and activePanel', () => {
    resetStore();

    // Push chords app mode
    unlock();
    NavigationDispatcher.push({ app: 'chordex' });
    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
    assert.strictEqual(state.history[1].page, 'library');

    // Push specific chords panel
    unlock();
    NavigationDispatcher.push({ app: 'chordex', page: 'chord' });
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 3);
    assert.strictEqual(state.history[2].app, 'chordex');
    assert.strictEqual(state.history[2].page, 'chord');
  });

  // Test 3: popNav works and restores activePanel
  assertTest('popNav pops stack and restores panel', () => {
    resetStore();

    unlock();
    NavigationDispatcher.push({ app: 'chordex' });
    unlock();
    NavigationDispatcher.push({ app: 'chordex', page: 'chord' });

    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 3);

    unlock();
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
    assert.strictEqual(state.history[1].page, 'library');

    unlock();
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    // Due to per-app isolated back stacks, pop() cannot navigate past the root of the current app.
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
  });

  // Test 4: pushNav deduplication prevents double pushes
  assertTest('pushNav deduplicates identical subsequent routes', () => {
    resetStore();

    unlock();
    NavigationDispatcher.push({ app: 'chordex', page: 'chord' });
    unlock();
    NavigationDispatcher.push({ app: 'chordex', page: 'chord' }); // identical

    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2); // should be 2, not 3
  });

  // Test 5: replaceNav replaces top of stack
  assertTest('replaceNav replaces top stack item', () => {
    resetStore();

    unlock();
    NavigationDispatcher.push({ app: 'chordex' });
    unlock();
    NavigationDispatcher.replace({ app: 'vocalex' });

    const state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'vocalex');
    assert.strictEqual(state.history[1].page, 'coach');
  });

  // Test 6: Nested path and sequential back traversal
  assertTest('Nested path and sequential back traversal work correctly', () => {
    resetStore();

    unlock();
    NavigationDispatcher.push({ app: 'chordex' });
    unlock();
    NavigationDispatcher.push({
      app: 'chordex',
      page: 'library',
      subView: 'practice',
      id: 'song-1',
    });
    unlock();
    NavigationDispatcher.push({
      app: 'chordex',
      page: 'library',
      subView: 'practice',
      id: 'song-1',
    }); // duplicate
    unlock();
    NavigationDispatcher.push({ app: 'chordex', page: 'chord', id: 'chord-1' });

    let state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 4);
    assert.strictEqual(state.history[3].app, 'chordex');
    assert.strictEqual(state.history[3].page, 'chord');
    assert.strictEqual(state.history[3].id, 'chord-1');

    unlock();
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 3);
    assert.strictEqual(state.history[2].app, 'chordex');
    assert.strictEqual(state.history[2].page, 'library');
    assert.strictEqual(state.history[2].subView, 'practice');
    assert.strictEqual(state.history[2].id, 'song-1');

    unlock();
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
    assert.strictEqual(state.history[1].page, 'library');

    unlock();
    NavigationDispatcher.pop();
    state = useNavigationStore.getState();
    // Again, pop() cannot navigate past the root of the current app.
    assert.strictEqual(state.history.length, 2);
    assert.strictEqual(state.history[1].app, 'chordex');
  });

  console.log('\n=== REGRESSION TEST RESULTS ===');
  console.log('| Test Name | Status | Details |');
  console.log('|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.details} |`);
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`\n❌ Navigation regression tests failed: ${failed.length} failures.`);
    process.exit(1);
  } else {
    console.log('\n✅ All navigation regression tests passed successfully!');
    process.exit(0);
  }
}

runNavigationTests().catch((err) => {
  console.error('Test runner encountered an uncaught error:', err);
  process.exit(1);
});
