import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n--- Running Livex Theme-Token Consolidation Verification Suite ---\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`PASS: ${description}`);
    testsPassed++;
  } catch (err) {
    console.error(`FAIL: ${description}`);
    console.error(err);
    testsFailed++;
  }
}

// 1. Stagex Module Tests
runTest('Stagex: StageToolbar has no hardcoded bg-[#141414] and uses canonical tokens', () => {
  const content = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/StageToolbar.tsx'),
    'utf-8'
  );
  assert.ok(!content.includes('bg-[#141414]'), 'StageToolbar should not contain hardcoded bg-[#141414]');
  assert.ok(content.includes('var(--app-bg)'), 'StageToolbar must use var(--app-bg)');
  assert.ok(content.includes('var(--c-border)'), 'StageToolbar must use var(--c-border)');
});

runTest('Stagex: StageGearView, StageMembersView, StageRiderView, StageSetlistView use canonical card tokens', () => {
  const views = [
    'StageGearView.tsx',
    'StageMembersView.tsx',
    'StageRiderView.tsx',
    'StageSetlistView.tsx',
  ];
  for (const view of views) {
    const content = fs.readFileSync(
      path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup', view),
      'utf-8'
    );
    assert.ok(content.includes('var(--c-bg-card)'), `${view} must use var(--c-bg-card)`);
    assert.ok(content.includes('var(--c-border)'), `${view} must use var(--c-border)`);
    assert.ok(content.includes('var(--c-text-primary)'), `${view} must use var(--c-text-primary)`);
  }
});

runTest('Stagex: SaveFilenameModal and SectionVisibilityPopover use canonical tokens', () => {
  const modalContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/export/SaveFilenameModal.tsx'),
    'utf-8'
  );
  assert.ok(modalContent.includes('var(--surface-dialog-bg'), 'SaveFilenameModal must use var(--surface-dialog-bg)');
  assert.ok(modalContent.includes("borderCol = 'var(--c-border)'"), 'SaveFilenameModal must use var(--c-border)');

  const popoverContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/export/SectionVisibilityPopover.tsx'),
    'utf-8'
  );
  assert.ok(popoverContent.includes("borderCol = 'var(--c-border)'"), 'SectionVisibilityPopover must use var(--c-border)');
  assert.ok(popoverContent.includes("textPrimary = 'var(--c-text-primary)'"), 'SectionVisibilityPopover must use var(--c-text-primary)');
});

// 2. Groovex Module Tests
runTest('Groovex: GroovexPreferences cardBg, cardBorder, thumbRing, dividers, and error colors use tokens', () => {
  const content = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/groovex/components/GroovexPreferences.tsx'),
    'utf-8'
  );
  assert.ok(content.includes("cardBg = 'var(--app-surface)'"), 'GroovexPreferences must use var(--app-surface) for cardBg');
  assert.ok(content.includes("cardBorder = '1px solid var(--c-border)'"), 'GroovexPreferences must use var(--c-border) for cardBorder');
  assert.ok(content.includes("thumbRing = 'var(--app-surface)'"), 'GroovexPreferences must use var(--app-surface) for thumbRing');
  assert.ok(content.includes("borderTop: '1px solid var(--c-border)'"), 'GroovexPreferences must use var(--c-border) for section divider');
  assert.ok(content.includes("backgroundColor: 'var(--c-error-container)'"), 'GroovexPreferences must use var(--c-error-container)');
  assert.ok(content.includes("color: 'var(--c-error)'"), 'GroovexPreferences must use var(--c-error)');
  assert.ok(!content.includes("cardBg = isAmoled ? '#000000'"), 'GroovexPreferences must not use raw hex ternary for cardBg');
});

runTest('Groovex: GroovexPlayer audio deck, pitch container, and stems mixer card use canonical tokens', () => {
  const content = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/groovex/components/GroovexPlayer.tsx'),
    'utf-8'
  );
  assert.ok(content.includes("background: 'var(--c-bg-card)'"), 'GroovexPlayer must use var(--c-bg-card) for deck/mixer cards');
  assert.ok(content.includes("background: 'var(--c-surface-low)'"), 'GroovexPlayer must use var(--c-surface-low) for pitch offset');
  assert.ok(!content.includes("background: isLight ? '#FFFFFF' : isAmoled ? '#000000' : 'rgba(255,255,255,0.03)'"), 'GroovexPlayer must not have manual surface ternary in deck card');
});

// 3. Drumex Module Tests
runTest('Drumex: DrumEditor play button, popover, clear button, and dividers use tokens', () => {
  const content = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/drumex/pages/DrumEditor.tsx'),
    'utf-8'
  );
  assert.ok(content.includes("playing ? 'var(--c-error, #ef4444)' : 'var(--c-text-primary)'"), 'DrumEditor play button must use tokens');
  assert.ok(content.includes("color: playing ? '#ffffff' : 'var(--app-bg)'"), 'DrumEditor play button text color must use var(--app-bg)');
  assert.ok(content.includes("background: 'var(--surface-dialog-bg)'"), 'DrumEditor popover card must use var(--surface-dialog-bg)');
  assert.ok(content.includes("color: 'var(--c-error-dim, #ee7d77)'"), 'DrumEditor clear button must use var(--c-error-dim)');
});

runTest('Drumex: DrumTunerModal removes redundant isAmoled ternaries and uses canonical tokens', () => {
  const content = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/drumex/components/tuner/DrumTunerModal.tsx'),
    'utf-8'
  );
  assert.ok(!content.includes("backgroundColor: isAmoled ? '#000000' : 'var(--app-bg)'"), 'DrumTunerModal must not have redundant isAmoled ternary for background');
  assert.ok(!content.includes("backgroundColor: isAmoled ? '#000000' : 'var(--c-surface-low)'"), 'DrumTunerModal must not have redundant isAmoled ternary for pill');
  assert.ok(content.includes("backgroundColor: 'var(--app-bg)'"), 'DrumTunerModal container must use var(--app-bg)');
  assert.ok(content.includes("backgroundColor: 'var(--c-surface-low)'"), 'DrumTunerModal pill must use var(--c-surface-low)');
});

// 4. Chordex Module Tests
runTest('Chordex: TuningSelectorModal, ChromaticTunerModal, SongPracticeView, SaxophonePracticePanel use tokens', () => {
  const tuningContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/components/tuner/TuningSelectorModal.tsx'),
    'utf-8'
  );
  assert.ok(tuningContent.includes("backgroundColor: 'var(--surface-dialog-bg)'"), 'TuningSelectorModal must use var(--surface-dialog-bg)');
  assert.ok(!tuningContent.includes("isAmoled ? '#000000' : 'var(--c-surface-high)'"), 'TuningSelectorModal must not use isAmoled ternary for dialog bg');

  const chromaticContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/components/tuner/ChromaticTunerModal.tsx'),
    'utf-8'
  );
  assert.ok(!chromaticContent.includes("backgroundColor: isAmoled ? '#000000' : 'transparent'"), 'ChromaticTunerModal lower section must be transparent');

  const songPracticeContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/pages/SongPracticeView.tsx'),
    'utf-8'
  );
  assert.ok(songPracticeContent.includes("background: 'var(--surface-dialog-bg)'"), 'SongPracticeView overlay must use var(--surface-dialog-bg)');

  const saxContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/pages/SaxophonePracticePanel.tsx'),
    'utf-8'
  );
  assert.ok(saxContent.includes("background: 'var(--c-surface-low)'"), 'SaxophonePracticePanel selector must use var(--c-surface-low)');
  assert.ok(saxContent.includes("color: 'var(--c-text-primary)'"), 'SaxophonePracticePanel text must use var(--c-text-primary)');
  assert.ok(saxContent.includes("color: 'var(--c-text-secondary)'"), 'SaxophonePracticePanel text must use var(--c-text-secondary)');
});

// 5. Vocalex Module Tests
runTest('Vocalex: TakeDetailView, HarmonizerSheet, and HarmonizerUI use canonical tokens', () => {
  const takeContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/vocalex/components/TakeDetailView.tsx'),
    'utf-8'
  );
  assert.ok(takeContent.includes("cardBg = 'var(--c-bg-card)'"), 'TakeDetailView must use var(--c-bg-card)');
  assert.ok(takeContent.includes("cardBorder = '1px solid var(--c-border)'"), 'TakeDetailView must use var(--c-border)');

  const sheetContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/vocalex/components/HarmonizerSheet.tsx'),
    'utf-8'
  );
  assert.ok(sheetContent.includes("background: 'var(--c-surface-low)'"), 'HarmonizerSheet must use var(--c-surface-low)');
  assert.ok(sheetContent.includes("border: '1px solid var(--c-border)'"), 'HarmonizerSheet must use var(--c-border)');

  const uiContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/vocalex/components/HarmonizerUI.tsx'),
    'utf-8'
  );
  assert.ok(uiContent.includes("background: active ? activeColor : 'var(--app-surface-low)'"), 'HarmonizerUI must use var(--app-surface-low)');
  assert.ok(uiContent.includes("border: `1px solid ${active ? activeBorder : 'var(--c-border)'}`"), 'HarmonizerUI must use var(--c-border)');
});

// 6. Hub, Transition, and Diagnostics Tests
runTest('Hub & Diagnostics: HubSettings, ApplicationTransitionEngine, LiveConsole, TelemetryGrid use tokens', () => {
  const hubContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/hub/settings/HubSettings.tsx'),
    'utf-8'
  );
  assert.ok(hubContent.includes("background: 'var(--c-surface-low)'"), 'HubSettings buttons must use var(--c-surface-low)');
  assert.ok(hubContent.includes("border: '1px solid var(--c-border)'"), 'HubSettings cards must use var(--c-border)');

  const transitionContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/animation/ApplicationTransitionEngine.tsx'),
    'utf-8'
  );
  assert.ok(transitionContent.includes("bgColor = 'var(--app-bg)'"), 'ApplicationTransitionEngine must use var(--app-bg)');
  assert.ok(transitionContent.includes("baseColor = 'var(--c-text-primary)'"), 'ApplicationTransitionEngine must use var(--c-text-primary)');

  const consoleContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/updater/diagnostics/LiveConsole.tsx'),
    'utf-8'
  );
  assert.ok(consoleContent.includes('bg-[var(--app-surface-low)]'), 'LiveConsole must use bg-[var(--app-surface-low)]');

  const telemetryContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/updater/diagnostics/TelemetryGrid.tsx'),
    'utf-8'
  );
  assert.ok(telemetryContent.includes('bg-[var(--app-surface-low)]'), 'TelemetryGrid must use bg-[var(--app-surface-low)]');
});

// 7. Intentional Preservations Invariant
runTest('Preservations Invariant: Sub-app brand identity accents and audio visualizations remain intact', () => {
  const transitionContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/animation/ApplicationTransitionEngine.tsx'),
    'utf-8'
  );
  assert.ok(transitionContent.includes("chordex: '#a855f7'"), 'Chordex brand accent must be preserved');
  assert.ok(transitionContent.includes("drumex: '#ec4899'"), 'Drumex brand accent must be preserved');
  assert.ok(transitionContent.includes("stagex: '#3b82f6'"), 'Stagex brand accent must be preserved');
  assert.ok(transitionContent.includes("groovex: '#10b981'"), 'Groovex brand accent must be preserved');
  assert.ok(transitionContent.includes("vocalex: '#f59e0b'"), 'Vocalex brand accent must be preserved');
});

console.log(`\n========================================`);
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
