#!/usr/bin/env node

/**
 * Livex Accessibility Remediation Verification Suite
 *
 * Verifies:
 * 1. Global focus ring invariant (:focus-visible in tokens.css, removal of outline: none).
 * 2. Accessible names on icon-only buttons with aria-hidden on decorative icons.
 * 3. Keyboard accessibility (role="button", tabIndex={0}, onKeyDown) on interactive elements.
 * 4. Tablist / tab semantics on mobile navigation dock.
 * 5. AnimatedIcon defaults to aria-hidden="true" for decorative icons.
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

console.log('\n--- Running Livex Accessibility Remediation Verification Suite ---\n');

// ── TEST 1: Global Focus Ring Invariant ──────────────────────────────────────
runTest('Focus Ring: tokens.css defines high-contrast :focus-visible rule', () => {
  const tokensCss = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/styles/tokens.css'),
    'utf-8'
  );
  assert.ok(tokensCss.includes(':focus-visible'), 'tokens.css must contain :focus-visible rules');
  assert.ok(tokensCss.includes('outline-offset'), 'tokens.css must define outline-offset for focus rings');

  const buttonsTsx = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/design-system/buttons.tsx'),
    'utf-8'
  );
  assert.ok(!buttonsTsx.includes("outline: 'none'"), 'design-system/buttons.tsx must not have hardcoded outline: none');
});

// ── TEST 2: Shared Design System Icon Buttons ────────────────────────────────
runTest('Design System: Sheet and SearchBar provide accessible names and hide icons', () => {
  const dialogsContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/design-system/dialogs.tsx'),
    'utf-8'
  );
  assert.ok(
    dialogsContent.includes('aria-label="Close sheet"'),
    'Sheet close button must have aria-label="Close sheet"'
  );
  assert.ok(
    dialogsContent.includes('aria-hidden="true"'),
    'Sheet close icon must have aria-hidden="true"'
  );

  const inputsContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/design-system/inputs.tsx'),
    'utf-8'
  );
  assert.ok(
    inputsContent.includes('aria-label="Clear search"'),
    'SearchBar clear button must have aria-label="Clear search"'
  );

  const buttonsContent = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/design-system/buttons.tsx'),
    'utf-8'
  );
  assert.ok(
    buttonsContent.includes("props['aria-label']"),
    'FloatingButton must support or compute aria-label'
  );
  assert.ok(
    buttonsContent.includes('aria-hidden="true"'),
    'FloatingButton AnimatedIcon must have aria-hidden="true"'
  );
});

// ── TEST 3: Feature Icon-Only Buttons ─────────────────────────────────────────
runTest('Feature Buttons: StageCollab, AccountCard, Saxophone, DrumExport, Vocalex have accessible names', () => {
  const stageCollab = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/stagex/components/dialogs/StageCollabDialog.tsx'),
    'utf-8'
  );
  assert.ok(
    stageCollab.includes("aria-label={isSpanish ? 'Cerrar diálogo' : 'Close dialog'}"),
    'StageCollabDialog close button must have accessible aria-label'
  );
  assert.ok(
    stageCollab.includes('aria-hidden="true"'),
    'StageCollabDialog close icon must have aria-hidden="true"'
  );

  const accountCard = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/auth/components/AccountCard.tsx'),
    'utf-8'
  );
  assert.ok(
    accountCard.includes("aria-label={(t as any).close || t.cancel || 'Close'}"),
    'AccountCard close button must have aria-label'
  );

  const saxPractice = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/pages/SaxophonePracticePanel.tsx'),
    'utf-8'
  );
  assert.ok(
    saxPractice.includes('aria-label="Play reference pitch"'),
    'SaxophonePracticePanel play button must have aria-label="Play reference pitch"'
  );

  const drumExport = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/drumex/components/DrumExportModal.tsx'),
    'utf-8'
  );
  assert.ok(
    drumExport.includes('aria-label="Back"'),
    'DrumExportModal back button must have aria-label="Back"'
  );

  const vocalPractice = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/vocalex/components/PracticePanel.tsx'),
    'utf-8'
  );
  assert.ok(
    vocalPractice.includes('aria-label="Back"'),
    'PracticePanel back button must have aria-label="Back"'
  );

  const labPanel = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/vocalex/components/LabPanel.tsx'),
    'utf-8'
  );
  assert.ok(
    labPanel.includes('aria-label="Stop recording"'),
    'LabPanel stop button must have aria-label="Stop recording"'
  );
});

// ── TEST 4: Keyboard Accessibility & Element Semantics ───────────────────────
runTest('Semantics & Keyboard: SongCardGrid, StudioAuthCard, DrumBeatsPanel, LibraryUI have proper semantics', () => {
  const songGrid = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/components/SongCardGrid.tsx'),
    'utf-8'
  );
  assert.ok(songGrid.includes('role="button"'), 'SongCardGrid rows must have role="button"');
  assert.ok(songGrid.includes('tabIndex={0}'), 'SongCardGrid rows must have tabIndex={0}');
  assert.ok(songGrid.includes('onKeyDown'), 'SongCardGrid rows must handle onKeyDown');

  const authCard = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/auth/components/StudioAuthCard.tsx'),
    'utf-8'
  );
  assert.ok(
    authCard.includes('<button\n                type="button"'),
    'StudioAuthCard privacy link must be a semantic <button type="button">'
  );

  const drumBeats = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/drumex/components/DrumBeatsPanel.tsx'),
    'utf-8'
  );
  assert.ok(drumBeats.includes('role="button"'), 'DrumBeatsPanel song title must have role="button"');
  assert.ok(drumBeats.includes('tabIndex={0}'), 'DrumBeatsPanel song title must have tabIndex={0}');
  assert.ok(drumBeats.includes('onKeyDown'), 'DrumBeatsPanel song title must handle onKeyDown');

  const libraryUi = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/chordex/pages/LibraryUI.tsx'),
    'utf-8'
  );
  assert.ok(libraryUi.includes('role="button"'), 'LibraryUI cards must have role="button"');
  assert.ok(libraryUi.includes('tabIndex={0}'), 'LibraryUI cards must have tabIndex={0}');
  assert.ok(libraryUi.includes('onKeyDown'), 'LibraryUI cards must handle onKeyDown');
});

// ── TEST 5: Navigation Tablist Semantics ──────────────────────────────────────
runTest('Navigation: SharedNavigationBar has role="tab", aria-selected, and role="tablist"', () => {
  const navBar = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/features/hub/navigation/SharedNavigationBar.tsx'),
    'utf-8'
  );
  assert.ok(navBar.includes('role="tab"'), 'NavigationItem must have role="tab"');
  assert.ok(navBar.includes('aria-selected={isActive}'), 'NavigationItem must have aria-selected');
  assert.ok(navBar.includes('role="tablist"'), 'SharedNavigationBar containers must have role="tablist"');
  assert.ok(navBar.includes('aria-label="Main Navigation"'), 'Nav container must have aria-label="Main Navigation"');
});

// ── TEST 6: AnimatedIcon Decorative Hiding ───────────────────────────────────
runTest('AnimatedIcon: defaults to aria-hidden="true" for decorative icons', () => {
  const animatedIcon = fs.readFileSync(
    path.join(rootDir, 'packages/ui-shared/src/shared/icons/AnimatedIcon.tsx'),
    'utf-8'
  );
  assert.ok(
    animatedIcon.includes("'aria-hidden'?: boolean | 'true' | 'false';"),
    'AnimatedIconProps must declare aria-hidden'
  );
  assert.ok(
    animatedIcon.includes("effectiveAriaHidden = ariaHidden !== undefined ? ariaHidden : (ariaLabel ? undefined : true)"),
    'AnimatedIcon must calculate effective aria-hidden'
  );
  assert.ok(
    animatedIcon.includes('aria-hidden={effectiveAriaHidden}'),
    'AnimatedIcon motion.div must apply aria-hidden'
  );
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n--- Summary ---');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\nALL ACCESSIBILITY REMEDIATION TESTS PASSED!\n');
  process.exit(0);
}
