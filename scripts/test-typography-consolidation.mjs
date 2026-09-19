#!/usr/bin/env node
/**
 * test-typography-consolidation.mjs
 *
 * Automated regression test verifying typography and font consolidation:
 * 1. Absence of orphan font packages (@fontsource/inter, @fontsource/manrope, material-symbols)
 *    in package manifests and sync scripts.
 * 2. Absence of obsolete @fontsource chunk rules in Vite configs.
 * 3. Physical integrity of all 18 canonical font files in stage-core/fonts.
 * 4. Byte-level synchronization of font files across public mirrors.
 * 5. Consolidated @font-face declarations in google-fonts.css (zero duplicate-weight blocks).
 * 6. Consolidated icon tokens in tokens.css (unified ligature & rendering properties, no duplicate overrides).
 * 7. Self-contained offline font configuration in stage-core/index.html.
 * 8. Canonical font links present in apps/studio-web/index.html and apps/studio-android/index.html.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('================================================================');
console.log('   TYPOGRAPHY CONSOLIDATION & FONT SYSTEM VALIDATION');
console.log('================================================================\n');

// 1. Check manifests for orphan packages
test('Orphan packages (@fontsource/*, material-symbols) removed from all manifests', () => {
  const manifests = [
    'packages/livex-core/package.json',
    'packages/ui-shared/package.json',
    'packages/ui-web/package.json',
    'packages/ui-android/package.json',
    'apps/studio-web/package.json',
    'apps/studio-android/package.json',
  ];

  for (const m of manifests) {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, m), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert(!allDeps['@fontsource/inter'], `${m} still contains @fontsource/inter`);
    assert(!allDeps['@fontsource/manrope'], `${m} still contains @fontsource/manrope`);
    assert(!allDeps['material-symbols'], `${m} still contains material-symbols`);
  }

  const syncScript = fs.readFileSync(path.join(repoRoot, 'scripts/sync-dependencies.mjs'), 'utf8');
  assert(!syncScript.includes('@fontsource/inter'), 'sync-dependencies.mjs contains @fontsource/inter');
  assert(!syncScript.includes('@fontsource/manrope'), 'sync-dependencies.mjs contains @fontsource/manrope');
  assert(!syncScript.includes("'material-symbols':"), 'sync-dependencies.mjs contains material-symbols');

  const updateDepsScript = fs.readFileSync(path.join(repoRoot, 'scripts/update-deps.js'), 'utf8');
  assert(!updateDepsScript.includes("'material-symbols':"), 'update-deps.js contains material-symbols');
});

// 2. Check Vite configs for dead manualChunks rules
test('Obsolete /@fontsource/ manualChunks rule removed from Vite configurations', () => {
  const webVite = fs.readFileSync(path.join(repoRoot, 'apps/studio-web/vite.config.ts'), 'utf8');
  const androidVite = fs.readFileSync(path.join(repoRoot, 'apps/studio-android/vite.config.ts'), 'utf8');

  assert(!webVite.includes('/@fontsource/'), 'apps/studio-web/vite.config.ts still references /@fontsource/');
  assert(!androidVite.includes('/@fontsource/'), 'apps/studio-android/vite.config.ts still references /@fontsource/');
});

// 3. Check 18 font files in canonical directory
const canonicalFontsDir = path.join(
  repoRoot,
  'packages/ui-shared/src/features/stagex/stage-core/fonts'
);

const expectedFontFiles = [
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2', // Inter Cyrillic
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',    // Inter Latin
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2', // Inter Greek
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2', // Inter Latin-ext
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2', // Inter Cyrillic-ext
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2', // Inter Greek-ext
  'UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2', // Inter Vietnamese
  'V8mDoQDjQSkFtoMM3T6r8E7mPb54C-s0.woff2',         // Space Grotesk Vietnamese
  'V8mDoQDjQSkFtoMM3T6r8E7mPb94C-s0.woff2',         // Space Grotesk Latin-ext
  'V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2',           // Space Grotesk Latin
  'kJESBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzBwG-RpA6RzaxHMO1W.woff2', // Material Symbols
  'manrope-latin-400.woff2',
  'manrope-latin-500.woff2',
  'manrope-latin-600.woff2',
  'manrope-latin-700.woff2',
  'manrope-latin-800.woff2',
  'manrope-latin-ext-400.woff2',
  'manrope-latin-ext-700.woff2',
];

test('All 18 canonical font files exist with non-zero size', () => {
  for (const file of expectedFontFiles) {
    const fullPath = path.join(canonicalFontsDir, file);
    assert(fs.existsSync(fullPath), `Font file missing: ${file}`);
    const stat = fs.statSync(fullPath);
    assert(stat.size > 1000, `Font file unexpectedly small (<1KB): ${file} (${stat.size} bytes)`);
  }
});

// 4. Check byte parity in targets
test('All 18 font files have identical SHA-256 hashes across Web and Android targets', () => {
  const targets = [
    path.join(repoRoot, 'apps/studio-web/public/stage-core/fonts'),
    path.join(repoRoot, 'apps/studio-android/public/stage-core/fonts'),
  ];

  for (const target of targets) {
    for (const file of expectedFontFiles) {
      const srcPath = path.join(canonicalFontsDir, file);
      const destPath = path.join(target, file);
      assert(fs.existsSync(destPath), `Target file missing: ${destPath}`);
      const srcHash = sha256(srcPath);
      const destHash = sha256(destPath);
      assert.strictEqual(srcHash, destHash, `Hash mismatch for ${file} in ${target}`);
    }
  }
});

// 5. Check google-fonts.css consolidation
test('google-fonts.css consolidates Inter and Space Grotesk without duplicate weight blocks', () => {
  const css = fs.readFileSync(path.join(canonicalFontsDir, 'google-fonts.css'), 'utf8');

  // Must define Inter with font-weight: 400 700
  assert(css.includes("font-family: 'Inter';"), 'Missing Inter in google-fonts.css');
  assert(css.includes('font-weight: 400 700;'), 'Missing font-weight: 400 700 in google-fonts.css');

  // Must define Space Grotesk with font-weight: 400 700
  assert(css.includes("font-family: 'Space Grotesk';"), 'Missing Space Grotesk in google-fonts.css');

  // Must NOT contain separate static duplicate blocks for 500, 600, 700 for Inter
  assert(!css.includes("font-family: 'Inter';\n  font-style: normal;\n  font-weight: 500;"), 'Duplicate Inter 500 found');
  assert(!css.includes("font-family: 'Inter';\n  font-style: normal;\n  font-weight: 600;"), 'Duplicate Inter 600 found');

  // Must preserve Manrope static weights
  assert(css.includes("font-family: 'Manrope';"), 'Missing Manrope in google-fonts.css');
  assert(css.includes('manrope-latin-400.woff2'), 'Missing Manrope 400');
  assert(css.includes('manrope-latin-800.woff2'), 'Missing Manrope 800');
});

// 6. Check tokens.css icon unification
test('tokens.css unifies Material Symbols rules and removes conflicting overrides', () => {
  const tokensCss = fs.readFileSync(path.join(repoRoot, 'packages/ui-shared/src/styles/tokens.css'), 'utf8');

  // Canonical font variables
  assert(tokensCss.includes('--studio-font-display:'), 'Missing --studio-font-display');
  assert(tokensCss.includes("'Inter Tight'"), '--studio-font-display does not include Inter Tight');
  assert(tokensCss.includes('--studio-font-body:'), 'Missing --studio-font-body');
  assert(tokensCss.includes("'Inter'"), '--studio-font-body does not include Inter');
  assert(tokensCss.includes('--studio-font-mono:'), 'Missing --studio-font-mono');

  // Unified icon definition
  assert(tokensCss.includes(".material-symbols-rounded,\n.material-symbols-outlined {"), 'Missing unified icon selector');
  assert(tokensCss.includes("font-family: 'Material Symbols Rounded', 'Material Symbols Outlined';"), 'Missing unified icon font-family');
  assert(tokensCss.includes("-webkit-font-smoothing: antialiased;"), 'Missing antialiasing on icon rules');

  // No duplicate standalone override at bottom
  assert(
    !tokensCss.includes("'wght' 400,\n    'GRAD' 0,\n    'opsz' 24;\n  font-family: 'Material Symbols Outlined';"),
    'Standalone duplicate .material-symbols-outlined block still exists'
  );
});

// 7. Check stage-core offline readiness
test('stage-core/index.html is offline-ready and does not fetch external Material Symbols', () => {
  const stageHtml = fs.readFileSync(
    path.join(repoRoot, 'packages/ui-shared/src/features/stagex/stage-core/index.html'),
    'utf8'
  );

  assert(stageHtml.includes('href="fonts/google-fonts.css"'), 'Missing local google-fonts.css link');
  assert(stageHtml.includes('href="fonts/material-symbols.css"'), 'Missing local material-symbols.css link');
  assert(
    !stageHtml.includes('fonts.googleapis.com/css2?family=Material+Symbols'),
    'Redundant external Material Symbols font link still present in stage-core'
  );
});

// 8. Check canonical HTML links in web & android
test('apps/studio-web and apps/studio-android load canonical font families', () => {
  const webHtml = fs.readFileSync(path.join(repoRoot, 'apps/studio-web/index.html'), 'utf8');
  const androidHtml = fs.readFileSync(path.join(repoRoot, 'apps/studio-android/index.html'), 'utf8');

  for (const html of [webHtml, androidHtml]) {
    assert(html.includes('family=Inter:'), 'Missing Inter font in HTML');
    assert(html.includes('family=Inter+Tight:'), 'Missing Inter Tight font in HTML');
    assert(html.includes('family=Material+Symbols+Outlined:'), 'Missing Material Symbols Outlined in HTML');
    assert(html.includes('family=Material+Symbols+Rounded:'), 'Missing Material Symbols Rounded in HTML');
  }
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
