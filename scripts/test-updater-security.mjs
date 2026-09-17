/**
 * test-updater-security.mjs
 *
 * Automated verification of Livex Android updater security hardening:
 * 1. Fail-closed SHA-256 integrity validation (empty, null, zero-hash, malformed).
 * 2. Trusted origin / HTTPS URL pinning (Firebase Hosting & GitHub Releases allowlist).
 * 3. Pre-install APK signature validation against official production key.
 * 4. Native Java source verification (UpdateDownloadService & AppInstallerPlugin).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PRODUCTION_SIGNING_SHA256 =
  '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

console.log('=== LIVEX ANDROID UPDATER SECURITY VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// SECTION 1: URL Origin & Protocol Validation
// -------------------------------------------------------------
console.log('[1/4] Testing Trusted HTTPS URL Allowlist & Pinning...');

function isTrustedReleaseUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();

    // Firebase Hosting
    if (
      host === 'studio-30f44.web.app' ||
      host === 'studio-30f44.firebaseapp.com' ||
      host.endsWith('.web.app') ||
      host.endsWith('.firebaseapp.com')
    ) {
      return true;
    }

    // GitHub Releases & CDN
    if (
      host === 'github.com' ||
      host === 'api.github.com' ||
      host === 'objects.githubusercontent.com' ||
      host === 'raw.githubusercontent.com' ||
      host.endsWith('.githubusercontent.com')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

test('Allow Firebase Hosting domain (studio-30f44.web.app)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('https://studio-30f44.web.app/studio-release.apk'),
    true
  );
});

test('Allow Firebase Hosting alternative domain (studio-30f44.firebaseapp.com)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('https://studio-30f44.firebaseapp.com/update.apk'),
    true
  );
});

test('Allow GitHub Releases download URL', () => {
  assert.strictEqual(
    isTrustedReleaseUrl(
      'https://github.com/MAGEXE1000/Livex/releases/download/v4.3.34/studio-4.3.34.apk'
    ),
    true
  );
});

test('Allow GitHub Objects CDN redirect domain (objects.githubusercontent.com)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl(
      'https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/studio.apk'
    ),
    true
  );
});

test('Allow GitHub Raw release asset', () => {
  assert.strictEqual(
    isTrustedReleaseUrl(
      'https://raw.githubusercontent.com/MAGEXE1000/Livex/main/assets/app.apk'
    ),
    true
  );
});

test('Reject plaintext HTTP Firebase URL', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('http://studio-30f44.web.app/studio-release.apk'),
    false
  );
});

test('Reject plaintext HTTP GitHub URL', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('http://github.com/MAGEXE1000/Livex/releases/download/v4.0.0/app.apk'),
    false
  );
});

test('Reject untrusted third-party domain (attacker.com)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('https://attacker.com/malicious.apk'),
    false
  );
});

test('Reject spoofed subdomain on untrusted host (github.com.evil.com)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('https://github.com.evil.com/app.apk'),
    false
  );
});

test('Reject spoofed subdomain on untrusted host (studio-30f44.web.app.attacker.com)', () => {
  assert.strictEqual(
    isTrustedReleaseUrl('https://studio-30f44.web.app.attacker.com/app.apk'),
    false
  );
});

test('Reject empty or malformed URL strings', () => {
  assert.strictEqual(isTrustedReleaseUrl(''), false);
  assert.strictEqual(isTrustedReleaseUrl('   '), false);
  assert.strictEqual(isTrustedReleaseUrl('not-a-url'), false);
  assert.strictEqual(isTrustedReleaseUrl(null), false);
  assert.strictEqual(isTrustedReleaseUrl(undefined), false);
});

// -------------------------------------------------------------
// SECTION 2: Fail-Closed SHA-256 Integrity Verification
// -------------------------------------------------------------
console.log('\n[2/4] Testing Fail-Closed SHA-256 Hash Verification...');

function mockVerifyApkSha256(fileContent, expectedHash) {
  if (
    !expectedHash ||
    typeof expectedHash !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(expectedHash.trim()) ||
    expectedHash.trim().replace(/0/g, '') === ''
  ) {
    return false; // Fail-closed: reject invalid / all-zero expected hash
  }

  if (fileContent == null) return false;

  const cleanExpected = expectedHash.trim().toLowerCase();
  const computedHash = crypto.createHash('sha256').update(fileContent).digest('hex');
  return computedHash === cleanExpected;
}

const sampleApkBuffer = Buffer.from('PK\x03\x04MockApkBinaryPayloadForTesting12345');
const validHash = crypto.createHash('sha256').update(sampleApkBuffer).digest('hex');
const tamperedApkBuffer = Buffer.from('PK\x03\x04TamperedApkBinaryPayloadBadData999');

test('Valid SHA-256 hash matching file -> PASS', () => {
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, validHash), true);
});

test('Valid uppercase SHA-256 hash matching file -> PASS', () => {
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, validHash.toUpperCase()), true);
});

test('Tampered file content with original hash -> FAIL (mismatch)', () => {
  assert.strictEqual(mockVerifyApkSha256(tamperedApkBuffer, validHash), false);
});

test('Empty expected hash "" -> FAIL (fail-closed)', () => {
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, ''), false);
});

test('Null expected hash -> FAIL (fail-closed)', () => {
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, null), false);
});

test('Undefined expected hash -> FAIL (fail-closed)', () => {
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, undefined), false);
});

test('All-zero dummy hash (64 zeros) -> FAIL (rejected as untrusted)', () => {
  const allZeros = '0'.repeat(64);
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, allZeros), false);
});

test('Malformed hash (non-hex characters) -> FAIL', () => {
  const invalidHex = 'g'.repeat(64);
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, invalidHex), false);
});

test('Truncated hash (63 characters) -> FAIL', () => {
  const shortHash = validHash.substring(0, 63);
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, shortHash), false);
});

test('Overlong hash (65 characters) -> FAIL', () => {
  const longHash = validHash + 'a';
  assert.strictEqual(mockVerifyApkSha256(sampleApkBuffer, longHash), false);
});

test('Missing or unreadable file buffer -> FAIL', () => {
  assert.strictEqual(mockVerifyApkSha256(null, validHash), false);
});

// -------------------------------------------------------------
// SECTION 3: APK Signature Fingerprint & Authenticity Validation
// -------------------------------------------------------------
console.log('\n[3/4] Testing APK Signature Fingerprint & Authenticity Verification...');

function mockCheckApkEligibility(installed, downloaded, allowDowngrade = false) {
  if (!downloaded || !downloaded.isValidApk) {
    return { eligible: false, reason: 'invalid_apk' };
  }

  if (installed.packageName !== downloaded.packageName) {
    return { eligible: false, reason: 'packageName_mismatch' };
  }

  const cleanInstSig = (installed.signingSha256 || '').replace(/:/g, '').toLowerCase().trim();
  const cleanDownSig = (downloaded.signingSha256 || '').replace(/:/g, '').toLowerCase().trim();

  if (
    !cleanDownSig ||
    !/^[a-f0-9]{64}$/.test(cleanDownSig) ||
    cleanDownSig.replace(/0/g, '') === ''
  ) {
    return { eligible: false, reason: 'signature_missing' };
  }

  if (cleanInstSig && cleanInstSig !== cleanDownSig) {
    return { eligible: false, reason: 'signature_mismatch' };
  }

  const cleanExpectedProdSig = PRODUCTION_SIGNING_SHA256.replace(/:/g, '').toLowerCase().trim();
  if (!installed.debuggable && cleanDownSig !== cleanExpectedProdSig) {
    return { eligible: false, reason: 'signature_mismatch' };
  }

  if (!allowDowngrade && downloaded.versionCode <= installed.versionCode) {
    return { eligible: false, reason: 'versionCode_low' };
  }

  return { eligible: true };
}

const officialInstalled = {
  packageName: 'com.chordex.app',
  versionName: '4.3.33',
  versionCode: 40333,
  signingSha256: PRODUCTION_SIGNING_SHA256,
  debuggable: false,
};

const officialDownloaded = {
  packageName: 'com.chordex.app',
  versionName: '4.3.34',
  versionCode: 40334,
  signingSha256: PRODUCTION_SIGNING_SHA256,
  isValidApk: true,
  debuggable: false,
};

test('Official production release update with valid production key -> ELIGIBLE', () => {
  const result = mockCheckApkEligibility(officialInstalled, officialDownloaded);
  assert.strictEqual(result.eligible, true);
});

test('Downloaded APK with missing signature -> INELIGIBLE (signature_missing)', () => {
  const unsignedDownloaded = { ...officialDownloaded, signingSha256: '' };
  const result = mockCheckApkEligibility(officialInstalled, unsignedDownloaded);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'signature_missing');
});

test('Downloaded APK with all-zero signature -> INELIGIBLE (signature_missing)', () => {
  const zeroSigDownloaded = { ...officialDownloaded, signingSha256: '0'.repeat(64) };
  const result = mockCheckApkEligibility(officialInstalled, zeroSigDownloaded);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'signature_missing');
});

test('Downloaded APK signed with rogue key -> INELIGIBLE (signature_mismatch)', () => {
  const rogueSig = '1111111111111111111111111111111111111111111111111111111111111111';
  const rogueDownloaded = { ...officialDownloaded, signingSha256: rogueSig };
  const result = mockCheckApkEligibility(officialInstalled, rogueDownloaded);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'signature_mismatch');
});

test('Downloaded APK with package name spoofing -> INELIGIBLE (packageName_mismatch)', () => {
  const spoofedDownloaded = { ...officialDownloaded, packageName: 'com.attacker.fake' };
  const result = mockCheckApkEligibility(officialInstalled, spoofedDownloaded);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'packageName_mismatch');
});

test('Downloaded APK with downgraded version code -> INELIGIBLE (versionCode_low)', () => {
  const lowerDownloaded = { ...officialDownloaded, versionCode: 40000 };
  const result = mockCheckApkEligibility(officialInstalled, lowerDownloaded);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'versionCode_low');
});

// -------------------------------------------------------------
// SECTION 4: Native Android Source Code Hardening Checks
// -------------------------------------------------------------
console.log('\n[4/4] Verifying Native Android Source Code Integrity...');

test('UpdateDownloadService.java contains isTrustedReleaseUrl method', () => {
  const filePath = path.join(
    repoRoot,
    'apps/studio-android/android/app/src/main/java/com/chordex/app/UpdateDownloadService.java'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    src.includes('public static boolean isTrustedReleaseUrl(String urlString)'),
    'Expected isTrustedReleaseUrl method in UpdateDownloadService.java'
  );
  assert.ok(
    src.includes('studio-30f44.web.app'),
    'Expected Firebase host allowlist in UpdateDownloadService.java'
  );
  assert.ok(
    src.includes('github.com'),
    'Expected GitHub host allowlist in UpdateDownloadService.java'
  );
});

test('UpdateDownloadService.java removed empty/zero-hash verification bypass', () => {
  const filePath = path.join(
    repoRoot,
    'apps/studio-android/android/app/src/main/java/com/chordex/app/UpdateDownloadService.java'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    !src.includes('verifySha256 skipped: no expected hash provided'),
    'Bypass "no expected hash provided" must be removed from UpdateDownloadService.java'
  );
  assert.ok(
    !src.includes('verifySha256 skipped: all-zero expected hash'),
    'Bypass "all-zero expected hash" must be removed from UpdateDownloadService.java'
  );
  assert.ok(
    src.includes('cleanExpected.matches("^[a-f0-9]{64}$")'),
    'Format regex validation must be present in UpdateDownloadService.java'
  );
});

test('UpdateDownloadService.java enforces installImmediately flag (no eager install)', () => {
  const filePath = path.join(
    repoRoot,
    'apps/studio-android/android/app/src/main/java/com/chordex/app/UpdateDownloadService.java'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    src.includes('boolean installImmediately = intent.getBooleanExtra("installImmediately", false);'),
    'Expected installImmediately intent extra check in UpdateDownloadService.java'
  );
  assert.ok(
    src.includes('if (installImmediately) {'),
    'Expected conditional installation check in UpdateDownloadService.java'
  );
});

test('AppInstallerPlugin.java separates downloadApk and downloadAndInstallApk flags', () => {
  const filePath = path.join(
    repoRoot,
    'apps/studio-android/android/app/src/main/java/com/chordex/app/AppInstallerPlugin.java'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    src.includes('serviceIntent.putExtra("installImmediately", false);'),
    'Expected installImmediately: false in downloadApk'
  );
  assert.ok(
    src.includes('serviceIntent.putExtra("installImmediately", true);'),
    'Expected installImmediately: true in downloadAndInstallApk'
  );
});

test('AppInstallerPlugin.java validates trusted URLs before starting service', () => {
  const filePath = path.join(
    repoRoot,
    'apps/studio-android/android/app/src/main/java/com/chordex/app/AppInstallerPlugin.java'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    src.includes('UpdateDownloadService.isTrustedReleaseUrl(urlString)'),
    'Expected URL validation in AppInstallerPlugin.java'
  );
});

test('packages/studio-core/apkDownloader.ts removed empty/zero hash bypass', () => {
  const filePath = path.join(
    repoRoot,
    'packages/studio-core/src/lib/platform/apkDownloader.ts'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    !src.includes("message: 'Skipped: all-zero or empty hash'"),
    'Bypass "all-zero or empty hash" must be removed from apkDownloader.ts'
  );
  assert.ok(
    src.includes('isTrustedReleaseUrl'),
    'Expected isTrustedReleaseUrl export in apkDownloader.ts'
  );
});

test('packages/studio-core/pipeline.ts removed missing hash skip bypass', () => {
  const filePath = path.join(
    repoRoot,
    'packages/studio-core/src/lib/updater/pipeline.ts'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    !src.includes("updateDebugLogs.shaVerification = 'SKIPPED (No expected hash)'"),
    'Bypass "SKIPPED (No expected hash)" must be removed from pipeline.ts'
  );
});

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✓ All Android updater security hardening checks passed successfully!\n');
}
