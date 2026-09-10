import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

console.log('=== RUNNING LAUNCHER ICON & RELEASE PIPELINE INTEGRITY TESTS ===');

const RETIRED_WAVEFORM_HASHES = new Set([
  '4202380abc7816c6e6c99f6c35960861d063969315a56ecfbc0ca8da25c3e1ce',
]);

function getSha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Test 1: Canonical Master Sources
function testMasterSources() {
  console.log('\n[Test 1] Canonical Master Sources');
  const badgePath = path.join(repoRoot, 'packages/ui-shared/src/assets/livex-logo.png');
  const symbolPath = path.join(repoRoot, 'packages/ui-shared/src/assets/livex-symbol.png');

  assert.equal(fs.existsSync(badgePath), true, 'Master badge must exist at packages/ui-shared/src/assets/livex-logo.png');
  assert.equal(fs.existsSync(symbolPath), true, 'Master symbol must exist at packages/ui-shared/src/assets/livex-symbol.png');

  const badgeDims = getPngDimensions(badgePath);
  const symbolDims = getPngDimensions(symbolPath);

  assert.equal(badgeDims?.width, 1024, 'Master badge width must be 1024');
  assert.equal(badgeDims?.height, 1024, 'Master badge height must be 1024');
  assert.equal(symbolDims?.width, 540, 'Master symbol width must be 540');
  assert.equal(symbolDims?.height, 540, 'Master symbol height must be 540');

  console.log('✓ PASS: Master badge (1024x1024) and symbol (540x540) verified');
}

// Test 2: Launcher Icons Manifest Freshness
function testManifestFreshness() {
  console.log('\n[Test 2] Launcher Icons Freshness Manifest');
  const manifestPath = path.join(repoRoot, 'apps/studio-android/launcher-icons-manifest.json');
  assert.equal(fs.existsSync(manifestPath), true, 'launcher-icons-manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const currentBadgeSha = getSha256(path.join(repoRoot, 'packages/ui-shared/src/assets/livex-logo.png'));
  const currentSymbolSha = getSha256(path.join(repoRoot, 'packages/ui-shared/src/assets/livex-symbol.png'));

  assert.equal(manifest.masterBadge?.sha256, currentBadgeSha, 'Manifest masterBadge SHA-256 must match current livex-logo.png');
  assert.equal(manifest.masterSymbol?.sha256, currentSymbolSha, 'Manifest masterSymbol SHA-256 must match current livex-symbol.png');

  let checkedCount = 0;
  for (const [relPath, expectedSha] of Object.entries(manifest.fileHashes || {})) {
    const fullPath = path.join(repoRoot, relPath);
    assert.equal(fs.existsSync(fullPath), true, `Target asset ${relPath} must exist on disk`);
    const actualSha = getSha256(fullPath);
    assert.equal(actualSha, expectedSha, `Asset ${relPath} hash must match recorded manifest hash`);
    checkedCount++;
  }

  assert.ok(checkedCount >= 20, `At least 20 target assets must be verified, got ${checkedCount}`);
  console.log(`✓ PASS: Freshness manifest verified (${checkedCount} assets validated against canonical master)`);
}

// Test 3: Absence of Retired Waveform Hashes
function testNoRetiredWaveform() {
  console.log('\n[Test 3] Absence of Retired Waveform Hashes');
  const manifestPath = path.join(repoRoot, 'apps/studio-android/launcher-icons-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const [relPath, sha] of Object.entries(manifest.fileHashes || {})) {
    assert.equal(RETIRED_WAVEFORM_HASHES.has(sha), false, `Asset ${relPath} matches retired waveform hash!`);
  }
  console.log('✓ PASS: Zero retired waveform assets detected in current launcher resources');
}

// Test 4: Android Manifest Invariants
function testManifestInvariants() {
  console.log('\n[Test 4] AndroidManifest.xml Launcher Invariants');
  const manifestPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/AndroidManifest.xml');
  const src = fs.readFileSync(manifestPath, 'utf8');

  assert.equal(src.includes('<activity-alias'), false, 'Prohibited <activity-alias> elements must NOT exist');
  assert.equal(src.includes('android:name=".MainActivity"'), true, '.MainActivity must be declared');
  assert.equal(src.includes('android:icon="@mipmap/ic_launcher"'), true, 'android:icon must be @mipmap/ic_launcher');
  assert.equal(src.includes('android:roundIcon="@mipmap/ic_launcher_round"'), true, 'android:roundIcon must be @mipmap/ic_launcher_round');

  const gradlePath = path.join(repoRoot, 'apps/studio-android/android/app/build.gradle');
  const gradleSrc = fs.readFileSync(gradlePath, 'utf8');
  assert.equal(gradleSrc.includes('applicationId "com.chordex.app"'), true, 'build.gradle applicationId must be com.chordex.app');

  console.log('✓ PASS: AndroidManifest and Gradle invariants verified (com.chordex.app, .MainActivity, no aliases)');
}

// Test 5: Adaptive Icon XML Configuration
function testAdaptiveIconXml() {
  console.log('\n[Test 5] Adaptive Icon XML Configuration');
  const anyDpiDir = path.join(repoRoot, 'apps/studio-android/android/app/src/main/res/mipmap-anydpi-v26');
  const icLauncher = fs.readFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), 'utf8');
  const icLauncherRound = fs.readFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), 'utf8');

  for (const xml of [icLauncher, icLauncherRound]) {
    assert.equal(xml.includes('<adaptive-icon'), true, 'Must define <adaptive-icon>');
    assert.equal(xml.includes('android:drawable="@color/ic_launcher_background"'), true, 'Must reference background color');
    assert.equal(xml.includes('android:drawable="@mipmap/ic_launcher_foreground"'), true, 'Must reference foreground mipmap');
    assert.equal(xml.includes('<monochrome'), true, 'Must define monochrome adaptive layer');
  }

  console.log('✓ PASS: Adaptive icon XML configuration verified for full API 26-35+ compatibility');
}

function runAll() {
  testMasterSources();
  testManifestFreshness();
  testNoRetiredWaveform();
  testManifestInvariants();
  testAdaptiveIconXml();

  console.log('\n====================================================================');
  console.log('ALL LAUNCHER ICON INTEGRITY TESTS PASSED CLEANLY (5/5)');
  console.log('====================================================================\n');
}

runAll();
