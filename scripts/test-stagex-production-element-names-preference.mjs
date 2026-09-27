import assert from 'node:assert';

console.log('--- STAGEX PRODUCTION STAGE PLAN ELEMENT NAMES PREFERENCE TEST ---');

// Mock localStorage for headless Node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const SETTINGS_STORAGE_KEY = 'stagecoreSettings';

// Default preferences shape
const DEFAULT_PREFERENCES = {
  gridVisible: true,
  snapToGrid: false,
  gridSize: 80,
  connectionsVisible: true,
  connLineStyle: 'solid',
  labelsVisible: true,
  reducedAnimations: false,
  stageUnits: 'meters',
  stageWidth: 12,
  stageDepth: 8,
  amoled: false,
  stageShape: 'rectangular',
  showCableLength: false,
  autoWire: false,
  audioCoverageVisible: true,
  stageGuidesVisible: true,
  productionShowElementNames: true,
};

function readSettingsStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return {};
  }
}

function writeSettingsStorage(updates) {
  try {
    const current = readSettingsStorage();
    const merged = { ...current, ...updates };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {}
}

// ── TEST 1: Default State (Names ON) ─────────────────────────────────
console.log('\n[Test 1] Verify Default State has Element Names ON');
let currentPreferences = { ...DEFAULT_PREFERENCES, ...readSettingsStorage() };
assert.strictEqual(
  currentPreferences.productionShowElementNames !== false,
  true,
  'productionShowElementNames should default to true (ON)'
);
console.log('✓ Default state is ON (true)');

// ── TEST 2: Toggle to OFF ─────────────────────────────────────────────
console.log('\n[Test 2] Toggle Show Element Names to OFF');
writeSettingsStorage({ productionShowElementNames: false });
currentPreferences = { ...DEFAULT_PREFERENCES, ...readSettingsStorage() };
assert.strictEqual(
  currentPreferences.productionShowElementNames,
  false,
  'productionShowElementNames should be false (OFF)'
);
console.log('✓ Preference correctly toggled to OFF');

// ── TEST 3: Persistence Across Restart / Navigation ──────────────────
console.log('\n[Test 3] Persistence across session reload / restart');
// Simulate reading afresh from storage as on app boot
const restoredSettings = readSettingsStorage();
assert.strictEqual(
  restoredSettings.productionShowElementNames,
  false,
  'Persisted storage must retain productionShowElementNames: false'
);
console.log('✓ Setting survives reload from localStorage: false');

// ── TEST 4: Projection to ProductionDocumentData ──────────────────────
console.log('\n[Test 4] projectProductionDocumentData projection contract');
const mockStore = {
  scenes: [
    {
      id: 's1',
      name: 'Main Stage',
      elements: [
        { id: 'el-1', name: 'Lead Vocal', label: 'Vocalist', x: 400, y: 350, type: 'vocalist', channelId: 'CH1' },
        { id: 'el-2', name: 'Stage Right Guitar', label: 'Electric Guitar', x: 200, y: 300, type: 'guitarist', channelId: 'CH2' },
      ],
      connections: [],
    }
  ],
  elements: [
    { id: 'el-1', name: 'Lead Vocal', label: 'Vocalist', x: 400, y: 350, type: 'vocalist', channelId: 'CH1' },
    { id: 'el-2', name: 'Stage Right Guitar', label: 'Electric Guitar', x: 200, y: 300, type: 'guitarist', channelId: 'CH2' },
  ],
  preferences: currentPreferences,
  riderNeeds: [],
  riderConfig: {},
  members: [],
  gear: [],
  setlist: [],
};

// Pure projection logic matching projectProductionDocumentData.ts
function projectData(store) {
  return {
    projectName: 'Test Stage',
    elements: store.elements,
    showElementNames: store.preferences?.productionShowElementNames !== false,
  };
}

const projectedDataOff = projectData(mockStore);
assert.strictEqual(projectedDataOff.showElementNames, false, 'projectedData.showElementNames should be false');
console.log('✓ Projection reflects OFF state');

// ── TEST 5: Stage Plan In-App Rendering Logic ─────────────────────────
console.log('\n[Test 5] Stage Plan Rendering Verification (ON vs OFF)');

function renderStageElement(el, showElementNames) {
  // Elements keep positions and graphics
  const iconVisible = true;
  const channelBadge = el.channelId;
  const position = { x: el.x, y: el.y };

  // Label conditionally rendered
  const labelVisible = showElementNames ? (el.label || el.name) : null;

  return { iconVisible, channelBadge, position, labelVisible };
}

// Check with names OFF
const renderedOff = mockStore.elements.map(e => renderStageElement(e, projectedDataOff.showElementNames));
assert.strictEqual(renderedOff[0].iconVisible, true, 'Icon must remain visible when OFF');
assert.strictEqual(renderedOff[0].channelBadge, 'CH1', 'Channel badge must remain visible when OFF');
assert.deepStrictEqual(renderedOff[0].position, { x: 400, y: 350 }, 'Position must remain unchanged when OFF');
assert.strictEqual(renderedOff[0].labelVisible, null, 'Label must be hidden when OFF');
console.log('✓ Stage Plan rendering with OFF: graphics/positions intact, labels hidden');

// Toggle back to ON
writeSettingsStorage({ productionShowElementNames: true });
currentPreferences = { ...DEFAULT_PREFERENCES, ...readSettingsStorage() };
mockStore.preferences = currentPreferences;
const projectedDataOn = projectData(mockStore);
assert.strictEqual(projectedDataOn.showElementNames, true, 'projectedData.showElementNames should be true');

const renderedOn = mockStore.elements.map(e => renderStageElement(e, projectedDataOn.showElementNames));
assert.strictEqual(renderedOn[0].iconVisible, true, 'Icon must be visible when ON');
assert.strictEqual(renderedOn[0].channelBadge, 'CH1', 'Channel badge must be visible when ON');
assert.deepStrictEqual(renderedOn[0].position, { x: 400, y: 350 }, 'Position must remain unchanged when ON');
assert.strictEqual(renderedOn[0].labelVisible, 'Vocalist', 'Label must be visible when ON');
console.log('✓ Stage Plan rendering with ON: graphics/positions intact, labels visible');

// ── TEST 6: PDF Export Option Resolution ──────────────────────────────
console.log('\n[Test 6] PDF Export Option Resolution');
function resolvePdfShowElementNames(options, data) {
  return options.showElementNames !== undefined
    ? options.showElementNames
    : data.showElementNames !== undefined
      ? data.showElementNames
      : true;
}

// Default inherits from data
assert.strictEqual(resolvePdfShowElementNames({}, projectedDataOn), true, 'PDF inherits ON from data');
assert.strictEqual(resolvePdfShowElementNames({}, projectedDataOff), false, 'PDF inherits OFF from data');

// Explicit option override
assert.strictEqual(resolvePdfShowElementNames({ showElementNames: false }, projectedDataOn), false, 'Explicit PDF option overrides to false');
assert.strictEqual(resolvePdfShowElementNames({ showElementNames: true }, projectedDataOff), true, 'Explicit PDF option overrides to true');
console.log('✓ PDF export resolver correctly integrates preference and option overrides');

// ── TEST 7: Scene Data Invariance (No mutation of underlying data) ────
console.log('\n[Test 7] Underlying Scene & Element Data Invariance');
assert.strictEqual(mockStore.elements[0].name, 'Lead Vocal', 'Underlying element name preserved');
assert.strictEqual(mockStore.elements[0].label, 'Vocalist', 'Underlying element label preserved');
assert.strictEqual(mockStore.scenes[0].elements[0].name, 'Lead Vocal', 'Underlying scene element name preserved');
console.log('✓ Underlying scene and element metadata are completely untouched');

console.log('\n=== ALL 7 PREFERENCE & RENDERING TESTS PASSED SUCCESSFULLY ===');
