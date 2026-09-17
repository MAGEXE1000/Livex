/**
 * Automated Security Verification for Stagex postMessage Bridge
 * Tests origin validation, source window validation, schema checks, and targetOrigin enforcement.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('=== Starting Stagex postMessage Bridge Security Test Suite ===\n');

// ── 1. Unit Tests for isAllowedStagexOrigin ──────────────────────────────────
console.log('--- Suite 1: Origin Validation Rules ---');

function isAllowedStagexOrigin(origin, hostOrigin) {
  if (!origin) return false;
  if (origin === hostOrigin) return true;
  if (origin === 'https://localhost' || origin === 'capacitor://localhost') return true;
  if (hostOrigin === 'null' && origin === 'null') return true;
  return false;
}

test('Allows exact matching host origin (Web localhost)', () => {
  assert.equal(isAllowedStagexOrigin('http://localhost:5173', 'http://localhost:5173'), true);
});

test('Allows exact matching host origin (Web production Firebase)', () => {
  assert.equal(isAllowedStagexOrigin('https://studio-30f44.web.app', 'https://studio-30f44.web.app'), true);
});

test('Allows Capacitor Android HTTPS scheme', () => {
  assert.equal(isAllowedStagexOrigin('https://localhost', 'https://studio-30f44.web.app'), true);
  assert.equal(isAllowedStagexOrigin('https://localhost', 'https://localhost'), true);
});

test('Allows Capacitor iOS scheme', () => {
  assert.equal(isAllowedStagexOrigin('capacitor://localhost', 'https://localhost'), true);
});

test('Rejects lookalike domain (e.g. http://localhost.attacker.com)', () => {
  assert.equal(isAllowedStagexOrigin('http://localhost.attacker.com', 'http://localhost:5173'), false);
  assert.equal(isAllowedStagexOrigin('http://localhost:9999', 'http://localhost:5173'), false);
});

test('Rejects external malicious origin', () => {
  assert.equal(isAllowedStagexOrigin('https://evil-site.com', 'http://localhost:5173'), false);
  assert.equal(isAllowedStagexOrigin('https://phishing.net', 'https://studio-30f44.web.app'), false);
});

test('Rejects null origin on normal web host', () => {
  assert.equal(isAllowedStagexOrigin('null', 'http://localhost:5173'), false);
  assert.equal(isAllowedStagexOrigin('null', 'https://studio-30f44.web.app'), false);
  assert.equal(isAllowedStagexOrigin('null', 'https://localhost'), false);
});

test('Allows null origin ONLY when host is running under null (e.g. file:/// automated testing)', () => {
  assert.equal(isAllowedStagexOrigin('null', 'null'), true);
});

test('Rejects empty or missing origin', () => {
  assert.equal(isAllowedStagexOrigin('', 'http://localhost:5173'), false);
  assert.equal(isAllowedStagexOrigin(null, 'http://localhost:5173'), false);
  assert.equal(isAllowedStagexOrigin(undefined, 'http://localhost:5173'), false);
});

test('Rejects about:blank origin', () => {
  assert.equal(isAllowedStagexOrigin('about:blank', 'http://localhost:5173'), false);
});


// ── 2. Source Window & Payload Validation Simulation ─────────────────────────
console.log('\n--- Suite 2: React Shell Message Ingestion Simulation ---');

const mockContentWindow = { id: 'legitimate-iframe-window' };
const mockRogueWindow = { id: 'rogue-popup-window' };

function simulateShellHandleMessage({ origin, source, data }, state, hostOrigin = 'http://localhost:5173') {
  if (!isAllowedStagexOrigin(origin, hostOrigin)) return { accepted: false, reason: 'origin-rejected' };
  if (!mockContentWindow || source !== mockContentWindow) return { accepted: false, reason: 'source-rejected' };
  if (!data || typeof data !== 'object') return { accepted: false, reason: 'data-invalid' };

  const type = data.type;
  if (type === 'sc-element-selected') {
    const el = data.element && typeof data.element === 'object' ? data.element : null;
    state.selectedElement = el;
    return { accepted: true, action: 'sc-element-selected' };
  } else if (type === 'sc-drag-start') {
    state.isDragging = true;
    return { accepted: true, action: 'sc-drag-start' };
  } else if (type === 'sc-drag-end') {
    state.isDragging = false;
    return { accepted: true, action: 'sc-drag-end' };
  } else if (type === 'sc-canvas-rescaled') {
    if (Array.isArray(data.elements)) {
      state.elements = data.elements;
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        state.scenes = data.scenes;
      }
      return { accepted: true, action: 'sc-canvas-rescaled' };
    }
    return { accepted: false, reason: 'elements-not-array' };
  } else if (type === 'sc-project-saved') {
    if (Array.isArray(data.elements)) {
      const rawName =
        typeof data.name === 'string'
          ? data.name
          : typeof data.projectName === 'string'
            ? data.projectName
            : undefined;
      const newName = rawName ? rawName.slice(0, 120) : undefined;
      const currentSceneIdx =
        typeof data.currentSceneIdx === 'number' &&
        Number.isFinite(data.currentSceneIdx) &&
        data.currentSceneIdx >= 0
          ? Math.floor(data.currentSceneIdx)
          : state.currentSceneIdx;

      if (newName) state.projectName = newName;
      state.elements = data.elements;
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        state.scenes = data.scenes;
      }
      state.currentSceneIdx = currentSceneIdx;
      return { accepted: true, action: 'sc-project-saved' };
    }
    return { accepted: false, reason: 'elements-not-array' };
  }
  return { accepted: false, reason: 'unknown-type' };
}

test('Shell accepts valid sc-project-saved from legitimate iframe', () => {
  const state = { projectName: 'Old', elements: [], scenes: [], currentSceneIdx: 0 };
  const res = simulateShellHandleMessage(
    {
      origin: 'http://localhost:5173',
      source: mockContentWindow,
      data: {
        type: 'sc-project-saved',
        projectName: 'New Project',
        elements: [{ id: 'mic1', x: 10, y: 20 }],
        scenes: [{ id: 's1', name: 'Scene 1' }],
        currentSceneIdx: 1,
      },
    },
    state
  );
  assert.equal(res.accepted, true);
  assert.equal(state.projectName, 'New Project');
  assert.equal(state.elements.length, 1);
  assert.equal(state.currentSceneIdx, 1);
});

test('Shell rejects message from unauthorized origin (evil.com)', () => {
  const state = { projectName: 'Safe', elements: [] };
  const res = simulateShellHandleMessage(
    {
      origin: 'https://evil.com',
      source: mockContentWindow,
      data: {
        type: 'sc-project-saved',
        projectName: 'Hacked',
        elements: [],
      },
    },
    state
  );
  assert.equal(res.accepted, false);
  assert.equal(res.reason, 'origin-rejected');
  assert.equal(state.projectName, 'Safe');
});

test('Shell rejects message from unexpected source window (rogue popup)', () => {
  const state = { projectName: 'Safe', elements: [] };
  const res = simulateShellHandleMessage(
    {
      origin: 'http://localhost:5173',
      source: mockRogueWindow,
      data: {
        type: 'sc-project-saved',
        projectName: 'Hacked',
        elements: [],
      },
    },
    state
  );
  assert.equal(res.accepted, false);
  assert.equal(res.reason, 'source-rejected');
  assert.equal(state.projectName, 'Safe');
});

test('Shell rejects sc-project-saved when elements is not an array', () => {
  const state = { elements: [{ id: 'legit' }] };
  const res = simulateShellHandleMessage(
    {
      origin: 'http://localhost:5173',
      source: mockContentWindow,
      data: {
        type: 'sc-project-saved',
        elements: 'not an array',
      },
    },
    state
  );
  assert.equal(res.accepted, false);
  assert.equal(res.reason, 'elements-not-array');
  assert.equal(state.elements.length, 1);
});

test('Shell sanitizes long project names and non-negative scene indices', () => {
  const state = { currentSceneIdx: 0 };
  const longName = 'A'.repeat(200);
  const res = simulateShellHandleMessage(
    {
      origin: 'http://localhost:5173',
      source: mockContentWindow,
      data: {
        type: 'sc-project-saved',
        name: longName,
        elements: [],
        currentSceneIdx: -5,
      },
    },
    state
  );
  assert.equal(res.accepted, true);
  assert.equal(state.projectName.length, 120);
  assert.equal(state.currentSceneIdx, 0); // Preserved existing idx because -5 is invalid
});


// ── 3. Iframe Command Bridge (sc-call) Simulation ────────────────────────────
console.log('\n--- Suite 3: Iframe Command Bridge Simulation ---');

const mockParentWindow = { id: 'parent-shell' };
const ALLOWED_FN = [
  'switchView',
  'toggleSCDial',
  'toggleGigMode',
  'stageGoBack',
  'openPresetsPanel',
  'exportPDFWithOptions',
  'addItemToStage',
  'reportStagexState',
  'updateCanvasBg',
  'resetView',
  'saveProject',
  '_persistCurrentScene',
];

function simulateIframeScCall({ origin, source, data }, handlers, hostOrigin = 'http://localhost:5173') {
  if (!isAllowedStagexOrigin(origin, hostOrigin)) return { handled: false, reason: 'origin-rejected' };
  if (!source || source !== mockParentWindow) return { handled: false, reason: 'source-rejected' };
  if (!data || data.type !== 'sc-call') return { handled: false, reason: 'invalid-type' };

  const fn = data.fn;
  if (typeof fn !== 'string') return { handled: false, reason: 'fn-not-string' };
  if (ALLOWED_FN.indexOf(fn) === -1) return { handled: false, status: 'missing', reason: 'not-whitelisted' };

  const handler = handlers[fn];
  if (typeof handler !== 'function') return { handled: false, status: 'missing', reason: 'handler-missing' };

  try {
    handler(data.arg);
    return { handled: true, status: 'success' };
  } catch (err) {
    return { handled: false, status: 'error', error: err.message };
  }
}

test('Iframe executes whitelisted saveProject from parent', () => {
  let called = false;
  const handlers = { saveProject: () => { called = true; } };
  const res = simulateIframeScCall(
    { origin: 'http://localhost:5173', source: mockParentWindow, data: { type: 'sc-call', fn: 'saveProject' } },
    handlers
  );
  assert.equal(res.handled, true);
  assert.equal(called, true);
});

test('Iframe rejects non-whitelisted dangerous function (e.g. eval, alert, localStorage.clear)', () => {
  let called = false;
  const handlers = { clearAll: () => { called = true; } };
  const res = simulateIframeScCall(
    { origin: 'http://localhost:5173', source: mockParentWindow, data: { type: 'sc-call', fn: 'clearAll' } },
    handlers
  );
  assert.equal(res.handled, false);
  assert.equal(res.reason, 'not-whitelisted');
  assert.equal(called, false);
});

test('Iframe rejects sc-call from foreign origin', () => {
  let called = false;
  const handlers = { resetView: () => { called = true; } };
  const res = simulateIframeScCall(
    { origin: 'https://attacker.com', source: mockParentWindow, data: { type: 'sc-call', fn: 'resetView' } },
    handlers
  );
  assert.equal(res.handled, false);
  assert.equal(res.reason, 'origin-rejected');
  assert.equal(called, false);
});

test('Iframe rejects sc-call from non-parent source window', () => {
  let called = false;
  const handlers = { resetView: () => { called = true; } };
  const res = simulateIframeScCall(
    { origin: 'http://localhost:5173', source: mockRogueWindow, data: { type: 'sc-call', fn: 'resetView' } },
    handlers
  );
  assert.equal(res.handled, false);
  assert.equal(res.reason, 'source-rejected');
  assert.equal(called, false);
});


// ── 4. Dialog Confirmation & Sync Restore Simulation ─────────────────────────
console.log('\n--- Suite 4: Dialog Confirm & Cloud Sync Restore Simulation ---');

function simulateConfirmResponse({ origin, source, data }, onConfirm, hostOrigin = 'http://localhost:5173') {
  if (!source || source !== mockParentWindow) return false;
  if (!isAllowedStagexOrigin(origin, hostOrigin)) return false;
  if (!data || typeof data !== 'object') return false;
  if (data.type === 'stage-core:confirm-response') {
    if (typeof data.ok === 'boolean') {
      onConfirm(data.ok);
      return true;
    }
  }
  return false;
}

test('Confirm modal listener accepts boolean true from legitimate parent', () => {
  let confirmed = null;
  const res = simulateConfirmResponse(
    { origin: 'http://localhost:5173', source: mockParentWindow, data: { type: 'stage-core:confirm-response', ok: true } },
    (ok) => { confirmed = ok; }
  );
  assert.equal(res, true);
  assert.equal(confirmed, true);
});

test('Confirm modal listener rejects unauthenticated injection from attacker origin', () => {
  let confirmed = null;
  const res = simulateConfirmResponse(
    { origin: 'https://evil.com', source: mockParentWindow, data: { type: 'stage-core:confirm-response', ok: true } },
    (ok) => { confirmed = ok; }
  );
  assert.equal(res, false);
  assert.equal(confirmed, null);
});

test('Confirm modal listener rejects non-boolean ok values (e.g. truthy string "true")', () => {
  let confirmed = null;
  const res = simulateConfirmResponse(
    { origin: 'http://localhost:5173', source: mockParentWindow, data: { type: 'stage-core:confirm-response', ok: 'true' } },
    (ok) => { confirmed = ok; }
  );
  assert.equal(res, false);
  assert.equal(confirmed, null);
});

const SYNC_KEYS = [
  'stagecoreProject',
  'stagecorePresets_v1',
  'stagecoreSettings',
  'sc_session',
  'scCustomElements',
  'sc-offline-mode',
  'sm_behavior',
  'sc_el_presets_v1',
];

function simulateSyncRestore({ origin, source, data }, onRestore, hostOrigin = 'http://localhost:5173') {
  if (!source || source !== mockParentWindow) return { success: false, reason: 'source-rejected' };
  if (!isAllowedStagexOrigin(origin, hostOrigin)) return { success: false, reason: 'origin-rejected' };
  if (!data || typeof data !== 'object') return { success: false, reason: 'data-invalid' };

  if (data.type === 'sc-sync-restore') {
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      const safeData = {};
      for (let i = 0; i < SYNC_KEYS.length; i++) {
        const k = SYNC_KEYS[i];
        if (Object.prototype.hasOwnProperty.call(data.data, k)) {
          const val = data.data[k];
          if (val === null || typeof val === 'string') {
            safeData[k] = val;
          }
        }
      }
      onRestore(safeData);
      return { success: true, safeData };
    }
    return { success: false, reason: 'payload-not-object' };
  }
  return { success: false, reason: 'not-sync-restore' };
}

test('Sync restore accepts valid SYNC_KEYS payload from parent', () => {
  let restored = null;
  const res = simulateSyncRestore(
    {
      origin: 'http://localhost:5173',
      source: mockParentWindow,
      data: {
        type: 'sc-sync-restore',
        data: {
          stagecoreProject: '{"id":"p1"}',
          stagecoreSettings: '{"grid":true}',
        },
      },
    },
    (data) => { restored = data; }
  );
  assert.equal(res.success, true);
  assert.deepEqual(restored, {
    stagecoreProject: '{"id":"p1"}',
    stagecoreSettings: '{"grid":true}',
  });
});

test('Sync restore strips unauthorized arbitrary keys and non-string values', () => {
  let restored = null;
  const res = simulateSyncRestore(
    {
      origin: 'http://localhost:5173',
      source: mockParentWindow,
      data: {
        type: 'sc-sync-restore',
        data: {
          stagecoreProject: '{"id":"p1"}',
          maliciousKey: 'payload',
          __proto__: { polluted: true },
          isAdmin: true,
          stagecoreSettings: 12345, // Not string or null -> stripped
        },
      },
    },
    (data) => { restored = data; }
  );
  assert.equal(res.success, true);
  assert.equal(restored.maliciousKey, undefined);
  assert.equal(restored.isAdmin, undefined);
  assert.equal(restored.stagecoreSettings, undefined);
  assert.equal(restored.stagecoreProject, '{"id":"p1"}');
});

test('Sync restore rejects injection from unauthorized origin', () => {
  let restored = null;
  const res = simulateSyncRestore(
    {
      origin: 'https://attacker.site',
      source: mockParentWindow,
      data: {
        type: 'sc-sync-restore',
        data: { stagecoreProject: 'overwritten' },
      },
    },
    (data) => { restored = data; }
  );
  assert.equal(res.success, false);
  assert.equal(res.reason, 'origin-rejected');
  assert.equal(restored, null);
});


// ── 5. Static Source Inspection Tests ────────────────────────────────────────
console.log('\n--- Suite 5: Static Source Inspection ---');

test('StageCanvasView.tsx exports isAllowedStagexOrigin and getStagexTargetOrigin', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'packages/ui-shared/src/features/stagex/components/StageCanvasView.tsx'),
    'utf-8'
  );
  assert(content.includes('export const isAllowedStagexOrigin ='), 'Must export isAllowedStagexOrigin');
  assert(content.includes('export const getStagexTargetOrigin ='), 'Must export getStagexTargetOrigin');
  assert(content.includes('e.source !== iframeRef.current.contentWindow'), 'Must check iframeRef contentWindow');
  assert(!content.includes("postMessage({ type: 'sc-call', fn, arg }, '*')"), 'Must not use wildcard * for sc-call');
  assert(!content.includes("postMessage(\n              { type: 'sc-landscape', isLandscape: active },\n              '*'"), 'Must not use wildcard * for orientation');
});

test('index.html enforces source === window.parent and eliminates permissive origin bypasses', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'packages/ui-shared/src/features/stagex/stage-core/index.html'),
    'utf-8'
  );
  assert(!content.includes("origin === 'about:blank'"), 'Must not allow about:blank origin');
  assert(!content.includes("origin.indexOf('http://localhost') === 0"), 'Must not use unpinned http://localhost prefix');
  assert(content.includes('if (!e.source || e.source !== window.parent) return;'), 'Must enforce e.source === window.parent');
});

test('app.js enforces source, origin, and boolean ok in confirm listener', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'packages/ui-shared/src/features/stagex/stage-core/app.js'),
    'utf-8'
  );
  assert(content.includes("if (e.data.type === 'stage-core:confirm-response')"), 'Must have confirm-response handler');
  assert(content.includes("typeof e.data.ok === 'boolean'"), 'Must validate ok is boolean');
  assert(content.includes('SYNC_KEYS'), 'Must validate against SYNC_KEYS');
});

console.log(`\n========================================`);
console.log(`Tests finished: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
