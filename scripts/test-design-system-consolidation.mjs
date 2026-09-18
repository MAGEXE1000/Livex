#!/usr/bin/env node

/**
 * Livex Design-System UI Primitives & Visual Constants Consolidation Verification Suite
 *
 * Verifies:
 * 1. Canonical Button consolidation (removal of legacy ui/button.tsx, migration of ShareMenu).
 * 2. Canonical Dialog consolidation in Stagex (SaveFilenameModal, StageCollabDialog).
 * 3. Border-radius consolidation (elimination of accidental rounded-[28px], rounded-[26px], rounded-[16px]).
 * 4. Icon stroke conventions (20px icons normalized to 2, sub-16px optical compensations preserved, diagramming preserved).
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failedTests++;
  }
}

console.log('\n--- Running Livex Design-System Consolidation Verification Suite ---\n');

// ── TEST 1: Canonical Button Consolidation ──────────────────────────────────
runTest('Canonical Button: legacy ui/button.tsx is removed and ShareMenu uses canonical design-system/buttons', () => {
  const legacyButtonPath = path.join(
    rootDir,
    'packages/ui-shared/src/components/ui/button.tsx'
  );
  assert.ok(!fs.existsSync(legacyButtonPath), 'Legacy packages/ui-shared/src/components/ui/button.tsx must be deleted');

  const shareMenuContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/components/share-menu.tsx'),
    'utf-8'
  );
  assert.ok(
    shareMenuContent.includes("from '../shared/design-system/buttons'"),
    'ShareMenu must import Button from canonical design-system/buttons'
  );
  assert.ok(
    !shareMenuContent.includes('./ui/button'),
    'ShareMenu must not reference legacy ./ui/button'
  );

  const netlifyIgnoreContent = fs.readFileSync(
    path.join(rootDir, 'scripts/test-netlify-ignore.mjs'),
    'utf-8'
  );
  assert.ok(
    !netlifyIgnoreContent.includes('packages/ui-shared/src/components/ui/button.tsx'),
    'test-netlify-ignore.mjs must not reference deleted legacy button.tsx'
  );
  assert.ok(
    netlifyIgnoreContent.includes('packages/ui-shared/src/shared/design-system/buttons.tsx'),
    'test-netlify-ignore.mjs must reference canonical buttons.tsx'
  );
});

// ── TEST 2: Stagex Modal Consolidation to Canonical Dialog ──────────────────
runTest('Stagex: SaveFilenameModal uses canonical Dialog and preserves required tokens and test IDs', () => {
  const modalContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/export/SaveFilenameModal.tsx'),
    'utf-8'
  );

  assert.ok(
    modalContent.includes("from '../../../../shared/design-system/dialogs'"),
    'SaveFilenameModal must import Dialog from canonical design-system/dialogs'
  );
  assert.ok(
    modalContent.includes('<Dialog'),
    'SaveFilenameModal must render <Dialog>'
  );
  assert.ok(
    !modalContent.includes("BackDispatcher.register('modal'"),
    'SaveFilenameModal must not have redundant manual BackDispatcher registration'
  );
  assert.ok(
    !modalContent.includes("activeOverlaysRegistry.register('modal'"),
    'SaveFilenameModal must not have redundant manual activeOverlaysRegistry registration'
  );

  // Preserve test IDs
  assert.ok(modalContent.includes('data-testid="save-filename-modal"'), 'SaveFilenameModal must preserve test ID save-filename-modal');
  assert.ok(modalContent.includes('data-testid="save-filename-input"'), 'SaveFilenameModal must preserve test ID save-filename-input');
  assert.ok(modalContent.includes('data-testid="save-modal-cancel-btn"'), 'SaveFilenameModal must preserve test ID save-modal-cancel-btn');
  assert.ok(modalContent.includes('data-testid="save-modal-confirm-btn"'), 'SaveFilenameModal must preserve test ID save-modal-confirm-btn');

  // Preserve theme tokens for test-theme-token-consolidation.mjs
  assert.ok(modalContent.includes('var(--surface-dialog-bg'), 'SaveFilenameModal must preserve var(--surface-dialog-bg)');
  assert.ok(modalContent.includes("borderCol = 'var(--c-border)'"), 'SaveFilenameModal must preserve borderCol');
});

runTest('Stagex: StageCollabDialog uses canonical Dialog and eliminates custom backdrop/manual overlays', () => {
  const collabContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/dialogs/StageCollabDialog.tsx'),
    'utf-8'
  );

  assert.ok(
    collabContent.includes("from '../../../../shared/design-system/dialogs'"),
    'StageCollabDialog must import Dialog from canonical design-system/dialogs'
  );
  assert.ok(
    collabContent.includes('<Dialog'),
    'StageCollabDialog must render <Dialog>'
  );
  assert.ok(
    !collabContent.includes("BackDispatcher.register('modal'"),
    'StageCollabDialog must not have redundant manual BackDispatcher registration'
  );
  assert.ok(
    !collabContent.includes("activeOverlaysRegistry.register('modal'"),
    'StageCollabDialog must not have redundant manual activeOverlaysRegistry registration'
  );
  assert.ok(
    !collabContent.includes('rounded-[28px]'),
    'StageCollabDialog must not contain arbitrary rounded-[28px]'
  );
});

// ── TEST 3: Border-Radius Consolidation ──────────────────────────────────────
runTest('Border Radius: Accidental arbitrary rounded-[28px] and rounded-[26px] eliminated in Stagex setup', () => {
  const gearContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup/StageGearView.tsx'),
    'utf-8'
  );
  assert.ok(!gearContent.includes('rounded-[28px]'), 'StageGearView must not contain rounded-[28px]');
  assert.ok(!gearContent.includes('rounded-[16px]'), 'StageGearView must not contain rounded-[16px]');
  assert.ok(gearContent.includes('rounded-3xl border p-8'), 'StageGearView empty state must use canonical rounded-3xl');

  const setlistContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup/StageSetlistView.tsx'),
    'utf-8'
  );
  assert.ok(!setlistContent.includes('rounded-[26px]'), 'StageSetlistView must not contain rounded-[26px]');
  assert.ok(!setlistContent.includes('rounded-[16px]'), 'StageSetlistView must not contain rounded-[16px]');
  assert.ok(setlistContent.includes('w-full rounded-3xl p-7'), 'StageSetlistView empty state must use canonical rounded-3xl');
  assert.ok(setlistContent.includes('p-4 rounded-3xl border'), 'StageSetlistView populated container must use canonical rounded-3xl');
});

// ── TEST 4: Icon Stroke Conventions Normalization ───────────────────────────
runTest('Icon Strokes: 20px action toggles normalized to canonical strokeWidth 2', () => {
  const gearContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup/StageGearView.tsx'),
    'utf-8'
  );
  const gearMatch = gearContent.match(/className="w-5 h-5 transition-transform duration-200"[\s\S]*?strokeWidth="([^"]+)"/);
  assert.ok(gearMatch, 'StageGearView action toggle icon must exist');
  assert.strictEqual(gearMatch[1], '2', 'StageGearView 20px action toggle must have strokeWidth="2"');

  const setlistContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup/StageSetlistView.tsx'),
    'utf-8'
  );
  const setlistMatch = setlistContent.match(/className="w-5 h-5 transition-transform duration-200"[\s\S]*?strokeWidth="([^"]+)"/);
  assert.ok(setlistMatch, 'StageSetlistView action toggle icon must exist');
  assert.strictEqual(setlistMatch[1], '2', 'StageSetlistView 20px action toggle must have strokeWidth="2"');
});

// ── TEST 5: Preserved Intentional Optical Compensations & Visualizations ─────
runTest('Preserved Invariant: Sub-16px optical compensations (stroke 2.5) and audio diagramming are intact', () => {
  const accountContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/auth/components/AccountCard.tsx'),
    'utf-8'
  );
  assert.ok(
    accountContent.includes('function ChevronDownIconSVG()') && accountContent.includes('strokeWidth="2.5"'),
    'AccountCard ChevronDownIconSVG (14px) must retain strokeWidth="2.5" for optical compensation'
  );

  const tuningModalContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/components/tuner/TuningSelectorModal.tsx'),
    'utf-8'
  );
  assert.ok(
    tuningModalContent.includes('<X className="w-3.5 h-3.5 stroke-[2.5]" />'),
    'TuningSelectorModal 14px close icon must retain stroke-[2.5] optical compensation'
  );

  const membersContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/setup/StageMembersView.tsx'),
    'utf-8'
  );
  assert.ok(
    membersContent.includes('className="w-3.5 h-3.5"') && membersContent.includes('strokeWidth="2.5"'),
    'StageMembersView 14px inline add icon must retain strokeWidth="2.5" optical compensation'
  );

  const forkContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/components/tuner/TuningForkIcon.tsx'),
    'utf-8'
  );
  assert.ok(
    forkContent.includes('strokeWidth="1.5"'),
    'TuningForkIcon sound wave ripples must retain strokeWidth="1.5"'
  );

  const libraryContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/pages/LibraryUI.tsx'),
    'utf-8'
  );
  assert.ok(
    libraryContent.includes('strokeWidth="1.5"'),
    'LibraryUI fret lines must retain strokeWidth="1.5"'
  );
});

console.log('\n========================================');
console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
