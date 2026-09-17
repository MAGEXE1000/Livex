import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

console.log('=== Starting Source-Map Hygiene & Exposure Test Suite ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// Suite 1: Vite Build Configurations
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Vite Build Configurations ---');

const androidVitePath = path.join(repoRoot, 'apps/studio-android/vite.config.ts');
assert(fs.existsSync(androidVitePath), 'apps/studio-android/vite.config.ts must exist');
const androidViteContent = fs.readFileSync(androidVitePath, 'utf8');

test('apps/studio-android/vite.config.ts binds sourcemap to enableSourcemap', () => {
  assert(
    androidViteContent.includes('sourcemap: enableSourcemap'),
    'Expected sourcemap: enableSourcemap in apps/studio-android/vite.config.ts'
  );
  assert(
    !androidViteContent.includes('sourcemap: true'),
    'Hardcoded sourcemap: true must not be present'
  );
});

test('apps/studio-android/vite.config.ts defines enableSourcemap logic supporting production, development, and hidden', () => {
  assert(
    androidViteContent.includes("process.env.SOURCE_MAP === 'true'"),
    'Must support process.env.SOURCE_MAP === "true"'
  );
  assert(
    androidViteContent.includes("process.env.SOURCE_MAP === 'hidden'"),
    'Must support process.env.SOURCE_MAP === "hidden"'
  );
  assert(
    androidViteContent.includes("mode === 'development'"),
    'Must support mode === "development"'
  );
});

const webVitePath = path.join(repoRoot, 'apps/studio-web/vite.config.ts');
assert(fs.existsSync(webVitePath), 'apps/studio-web/vite.config.ts must exist');
const webViteContent = fs.readFileSync(webVitePath, 'utf8');

test('apps/studio-web/vite.config.ts binds sourcemap to enableSourcemap', () => {
  assert(
    webViteContent.includes('sourcemap: enableSourcemap'),
    'Expected sourcemap: enableSourcemap in apps/studio-web/vite.config.ts'
  );
});

// -----------------------------------------------------------------------------
// Suite 2: Gradle Packaging Defense-in-Depth
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Gradle Packaging Defense-in-Depth ---');

const buildGradlePath = path.join(repoRoot, 'apps/studio-android/android/app/build.gradle');
assert(fs.existsSync(buildGradlePath), 'build.gradle must exist');
const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

test('build.gradle aaptOptions ignores *.map assets from APK packaging', () => {
  assert(
    buildGradleContent.includes('!*.map'),
    'Expected ignoreAssetsPattern to include !*.map'
  );
});

// -----------------------------------------------------------------------------
// Suite 3: Build Pipeline Stale Map Cleaner
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Build Pipeline Stale Map Cleaner ---');

const cleanerPath = path.join(repoRoot, 'apps/studio-android/scripts/clean-stale-maps.mjs');
assert(fs.existsSync(cleanerPath), 'clean-stale-maps.mjs must exist');

const androidPkgPath = path.join(repoRoot, 'apps/studio-android/package.json');
const androidPkgContent = fs.readFileSync(androidPkgPath, 'utf8');

test('clean-stale-maps.mjs is wired into prebuild and android:sync in apps/studio-android/package.json', () => {
  assert(
    androidPkgContent.includes('node scripts/clean-stale-maps.mjs && node ../../scripts/sync-versions.mjs'),
    'clean-stale-maps.mjs must be wired into prebuild'
  );
  assert(
    androidPkgContent.includes('node scripts/clean-stale-maps.mjs && npx cap sync android'),
    'clean-stale-maps.mjs must be wired into android:sync'
  );
});

// -----------------------------------------------------------------------------
// Suite 4: Artifact Inspection
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: Production Artifact Inspection ---');

function countMapFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dirPath, e.name);
    if (e.isDirectory()) count += countMapFiles(full);
    else if (e.isFile() && e.name.endsWith('.map')) count++;
  }
  return count;
}

test('dist/web contains 0 .map files', () => {
  const count = countMapFiles(path.join(repoRoot, 'dist/web'));
  assert.strictEqual(count, 0, `dist/web must not contain .map files (found ${count})`);
});

test('dist/android-web contains 0 .map files after production build', () => {
  const count = countMapFiles(path.join(repoRoot, 'dist/android-web'));
  assert.strictEqual(count, 0, `dist/android-web must not contain .map files (found ${count})`);
});

test('android/app/src/main/assets/public contains 0 .map files after sync', () => {
  const count = countMapFiles(path.join(repoRoot, 'apps/studio-android/android/app/src/main/assets/public'));
  assert.strictEqual(count, 0, `assets/public must not contain .map files (found ${count})`);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Tests finished: ${passedTests} passed, ${failedTests} failed`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
