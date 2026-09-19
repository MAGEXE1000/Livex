#!/usr/bin/env node
/**
 * App Update State Machine Regression Tests v2
 * Validates fixes against the uppercase state machine (IDLE, RECOVERY, etc.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \u2705 ' + name);
    passed++;
  } catch (err) {
    console.log('  \u274C ' + name);
    console.log('     ' + err.message);
    failed++;
  }
}

// == Load source files ==
const smPath = path.join(repoRoot, 'packages/livex-core/src/lib/updater/stateMachine.ts');
const smContent = fs.readFileSync(smPath, 'utf8');
const otaPath = path.join(repoRoot, 'packages/livex-core/src/lib/otaUpdate.ts');
const otaContent = fs.readFileSync(otaPath, 'utf8');
const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
const appVersionContent = fs.readFileSync(appVersionPath, 'utf8');
const gradlePath = path.join(repoRoot, 'apps/studio-android/android/app/build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');
const pkgJsonPath = path.join(repoRoot, 'apps/studio-android/package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

// == Test 1: State Machine Completeness ==
console.log('\n=== State Machine Completeness ===');

const typeMatch = smContent.match(/export type OtaUpdateState =([^;]+);/s);
assert(typeMatch, 'Could not find OtaUpdateState type definition');
const typeStates = [...typeMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('State machine defines IDLE', () => assert(typeStates.includes('IDLE')));
test('State machine defines RECOVERY', () => assert(typeStates.includes('RECOVERY')));
test('State machine defines NO_UPDATE_AVAILABLE', () =>
  assert(typeStates.includes('NO_UPDATE_AVAILABLE')));
test('State machine defines UPDATE_AVAILABLE', () =>
  assert(typeStates.includes('UPDATE_AVAILABLE')));
test('State machine defines INSTALL_FAILED', () => assert(typeStates.includes('INSTALL_FAILED')));
test('State machine defines INSTALL_SUCCESS', () => assert(typeStates.includes('INSTALL_SUCCESS')));
test('State machine defines INSTALLING', () => assert(typeStates.includes('INSTALLING')));
test('State machine defines VERIFY_SHA256', () => assert(typeStates.includes('VERIFY_SHA256')));
test('State machine defines FETCH_REMOTE_METADATA', () =>
  assert(typeStates.includes('FETCH_REMOTE_METADATA')));
test('State machine defines VALIDATE_METADATA', () =>
  assert(typeStates.includes('VALIDATE_METADATA')));

// == Test 2: No False "Up to Date" ==
console.log('\n=== No False "Up to Date" ===');

test('No silent IDLE transition when remote metadata is null', () => {
  // Find the !remote block
  const block = otaContent.match(/if\s*\(!remote\)\s*\{[\s\S]*?return globalOtaState;\s*\}/);
  assert(block, 'Could not find !remote block');
  const content = block[0];
  assert(
    !content.includes("transitionToState('IDLE'"),
    'metadata-null path still transitions to IDLE'
  );
  assert(content.includes("'RECOVERY'"), 'metadata-null path should transition to RECOVERY');
});

test('Metadata null path sets updateAvailable: false', () => {
  const block = otaContent.match(/if\s*\(!remote\)\s*\{[\s\S]*?return globalOtaState;\s*\}/);
  assert(
    block[0].includes('updateAvailable: false'),
    'metadata-null path does not set updateAvailable: false'
  );
});

test('Metadata null path populates diagnostics', () => {
  const block = otaContent.match(/if\s*\(!remote\)\s*\{[\s\S]*?return globalOtaState;\s*\}/);
  assert(
    block[0].includes('updateDecision'),
    'metadata-null path does not populate updateDecision'
  );
});

test('No-update path sets updateAvailable: false explicitly', () => {
  const noUpdateBlock = otaContent.match(
    /\}\s*else\s*\{[\s\S]*?transitionToState\('NO_UPDATE_AVAILABLE'/
  );
  assert(noUpdateBlock, 'Could not find NO_UPDATE_AVAILABLE else block');
  assert(
    noUpdateBlock[0].includes('updateAvailable: false'),
    'No-update path does not set updateAvailable: false'
  );
});

test('No-update path populates diagnostics', () => {
  // Find ALL NO_UPDATE_AVAILABLE transitions and check at least one has diagnostics nearby
  const allMatches = [...otaContent.matchAll(/transitionToState\('NO_UPDATE_AVAILABLE'/g)];
  assert(allMatches.length > 0, 'NO_UPDATE_AVAILABLE transition not found');
  const hasOne = allMatches.some((m) => {
    const nearbyCode = otaContent.substring(Math.max(0, m.index - 300), m.index);
    return nearbyCode.includes('updateDecisionReason');
  });
  assert(hasOne, 'No NO_UPDATE_AVAILABLE transition has updateDecisionReason nearby');
});

// == Test 3: No Silent IDLE in Exception Handlers ==
console.log('\n=== No Silent IDLE in Exception Handlers ===');

test('No IDLE transition for failure/exception scenarios', () => {
  const idleTransitions = [...otaContent.matchAll(/transitionToState\('IDLE',\s*'([^']+)'/g)];
  const badOnes = idleTransitions.filter((m) => {
    const reason = m[1];
    return (
      reason.toLowerCase().includes('exception') ||
      reason.toLowerCase().includes('error') ||
      reason.toLowerCase().includes('failed') ||
      reason.toLowerCase().includes('no remote')
    );
  });
  assert(
    badOnes.length === 0,
    'Found IDLE transitions for failure scenarios: ' + badOnes.map((m) => m[1]).join(', ')
  );
});

test('Catch block sets updateAvailable: false', () => {
  const catchMatch = otaContent.match(/\} catch \(err\) \{[\s\S]*?\} finally \{/);
  assert(catchMatch, 'catch block not found');
  assert(
    catchMatch[0].includes('updateAvailable: false'),
    'catch block does not set updateAvailable: false'
  );
});

test('Catch block populates diagnostics', () => {
  const catchMatch = otaContent.match(/\} catch \(err\) \{[\s\S]*?\} finally \{/);
  assert(catchMatch[0].includes('updateDecision'), 'catch block does not populate updateDecision');
});

test('Catch block transitions to RECOVERY, not IDLE', () => {
  const catchMatch = otaContent.match(/\} catch \(err\) \{[\s\S]*?\} finally \{/);
  assert(
    !catchMatch[0].includes("transitionToState('IDLE'"),
    'catch block still transitions to IDLE'
  );
  assert(catchMatch[0].includes("'RECOVERY'"), 'catch block does not transition to RECOVERY');
});

// == Test 4: Version Synchronization ==
console.log('\n=== Version Synchronization ===');

const nativeVersionMatch = appVersionContent.match(/NATIVE_VERSION\s*=\s*'([^']+)'/);
const gradleVersionMatch = gradleContent.match(/versionName\s+"([^"]+)"/);
const gradleCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);

test('NATIVE_VERSION matches build.gradle versionName', () => {
  assert.strictEqual(nativeVersionMatch[1], gradleVersionMatch[1]);
});

test('package.json version matches NATIVE_VERSION', () => {
  assert.strictEqual(pkgJson.version, nativeVersionMatch[1]);
});

test('All version sources agree on 3.7.65', () => {
  assert.strictEqual(nativeVersionMatch[1], '3.7.65', 'NATIVE_VERSION=' + nativeVersionMatch[1]);
  assert.strictEqual(gradleVersionMatch[1], '3.7.65', 'gradle=' + gradleVersionMatch[1]);
  assert.strictEqual(pkgJson.version, '3.7.65', 'package.json=' + pkgJson.version);
});

test('versionCode is 193', () => {
  assert.strictEqual(gradleCodeMatch[1], '193', 'versionCode=' + gradleCodeMatch[1]);
});

// app-release.json
const appReleasePath = path.join(repoRoot, 'firebase-public/app-release.json');
if (fs.existsSync(appReleasePath)) {
  const appRelease = JSON.parse(fs.readFileSync(appReleasePath, 'utf8'));
  test('app-release.json version is 3.7.65', () => {
    assert.strictEqual(appRelease.version, '3.7.65');
  });
  test('app-release.json versionCode is 193', () => {
    assert.strictEqual(appRelease.versionCode, 193);
  });
}

// == Summary ==
console.log('\n=== RESULTS: ' + passed + ' passed, ' + failed + ' failed ===\n');
process.exit(failed > 0 ? 1 : 0);
