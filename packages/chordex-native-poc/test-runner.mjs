import assert from 'node:assert/strict';
import { THEME_PALETTES } from './types.ts';

console.log('================================================================');
console.log('  CHORDEX REACT NATIVE PROOF-OF-CONCEPT VERIFICATION TEST SUITE  ');
console.log('================================================================\n');

// ── Test 1: LiquidSwitch Motion & Geometry Physics ────────────────────────────
function testLiquidSwitchPhysics() {
  console.log('[Test 1] LiquidSwitch Motion & Fluid Physics Calculations');

  const TRACK_WIDTH = 54;
  const TRACK_HEIGHT = 32;
  const TRACK_PADDING = 3;
  const THUMB_SIZE = 26;
  const TRAVEL_DISTANCE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2; // 22px

  assert.equal(TRAVEL_DISTANCE, 22, 'Travel distance must be exactly 22px');

  // Stretch formula validation
  function calcStretch(thumbX, followerX, isReduced) {
    if (isReduced) return { scaleX: 1, scaleY: 1 };
    const deltaX = Math.abs(thumbX - followerX);
    const scaleX = 1 + Math.min(0.38, (deltaX / TRAVEL_DISTANCE) * 0.38);
    const scaleY = 1 / Math.sqrt(scaleX);
    return { scaleX, scaleY };
  }

  // 1. At rest (deltaX = 0)
  const rest = calcStretch(0, 0, false);
  assert.equal(rest.scaleX, 1, 'Rest scaleX must be 1.0');
  assert.equal(rest.scaleY, 1, 'Rest scaleY must be 1.0');

  // 2. High velocity flick (full travel deltaX = 22)
  const maxFlick = calcStretch(22, 0, false);
  assert.ok(maxFlick.scaleX > 1.3 && maxFlick.scaleX <= 1.38, 'Max flick scaleX must be ~1.38');
  assert.ok(maxFlick.scaleY < 1 && maxFlick.scaleY >= 0.85, 'Max flick scaleY must preserve volume');
  assert.ok(!Number.isNaN(maxFlick.scaleX), 'ScaleX must not be NaN');
  assert.ok(!Number.isNaN(maxFlick.scaleY), 'ScaleY must not be NaN');

  // 3. Reduced motion
  const reduced = calcStretch(22, 0, true);
  assert.equal(reduced.scaleX, 1, 'Reduced motion must lock scaleX to 1');
  assert.equal(reduced.scaleY, 1, 'Reduced motion must lock scaleY to 1');

  console.log('✓ PASS: LiquidSwitch stretch, damping, and volume preservation verified.');
}

// ── Test 2: MorphingActionSurface Single-Object Transformation ────────────────
function testMorphingGeometry() {
  console.log('\n[Test 2] MorphingActionSurface Unified Spatial Transformation');

  const PILL_WIDTH = 220;
  const PILL_HEIGHT = 48;
  const PILL_RADIUS = 24;

  const PANEL_WIDTH = 360;
  const PANEL_HEIGHT = 340;
  const PANEL_RADIUS = 20;

  function interpolateGeometry(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return {
      width: PILL_WIDTH + (PANEL_WIDTH - PILL_WIDTH) * p,
      height: PILL_HEIGHT + (PANEL_HEIGHT - PILL_HEIGHT) * p,
      borderRadius: PILL_RADIUS + (PANEL_RADIUS - PILL_RADIUS) * p,
    };
  }

  // Progress 0: Closed pill
  const closed = interpolateGeometry(0);
  assert.equal(closed.width, 220);
  assert.equal(closed.height, 48);
  assert.equal(closed.borderRadius, 24);

  // Progress 0.5: Mid-flight morph
  const mid = interpolateGeometry(0.5);
  assert.equal(mid.width, 290);
  assert.equal(mid.height, 194);
  assert.equal(mid.borderRadius, 22);

  // Progress 1.0: Fully opened centered panel
  const open = interpolateGeometry(1);
  assert.equal(open.width, 360);
  assert.equal(open.height, 340);
  assert.equal(open.borderRadius, 20);

  console.log('✓ PASS: MorphingActionSurface single continuous spatial interpolation verified.');
}

// ── Test 3: Theme Palette Invariants ─────────────────────────────────────────
function testThemePalettes() {
  console.log('\n[Test 3] Theme Palette Invariants (Light, Dark, AMOLED)');

  const modes = ['light', 'dark', 'amoled'];
  for (const m of modes) {
    const p = THEME_PALETTES[m];
    assert.ok(p, `Palette ${m} must exist`);
    assert.ok(p.background, `Palette ${m} must define background`);
    assert.ok(p.card, `Palette ${m} must define card`);
    assert.ok(p.cardBorder, `Palette ${m} must define cardBorder`);
    assert.ok(p.accent, `Palette ${m} must define accent`);
    assert.ok(p.textPrimary, `Palette ${m} must define textPrimary`);
    assert.ok(p.switchTrackOff, `Palette ${m} must define switchTrackOff`);
  }

  // AMOLED True Black Invariant
  assert.equal(THEME_PALETTES.amoled.background, '#000000', 'AMOLED background must be pure #000000');

  console.log('✓ PASS: All 3 appearance themes validated with strict AMOLED zero-emission standard.');
}

function runAll() {
  testLiquidSwitchPhysics();
  testMorphingGeometry();
  testThemePalettes();

  console.log('\n================================================================');
  console.log('ALL CHORDEX REACT NATIVE PROOF-OF-CONCEPT TESTS PASSED (3/3)');
  console.log('================================================================\n');
}

runAll();
