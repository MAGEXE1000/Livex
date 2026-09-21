#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('STUDIO RELEASE INFRASTRUCTURE AUTOMATED REGRESSION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  process.stdout.write(`TEST ${totalTests}: ${testName}... `);
  try {
    const success = testFn();
    if (success) {
      passedTests++;
      console.log('\x1b[32m[PASS]\x1b[0m');
    } else {
      console.log('\x1b[31m[FAIL]\x1b[0m');
    }
  } catch (err) {
    console.log(`\x1b[31m[FAIL] (Exception: ${err.message})\x1b[0m`);
  }
}

// 1. Version Consistency Success
runTest('Verify Version Consistency Script Executable & Passes', () => {
  const res = spawnSync('node', [path.join(repoRoot, 'scripts/verify-versions-consistency.mjs')], { encoding: 'utf8' });
  return res.status === 0 && res.stdout.includes('MULTI-MANIFEST VERSION CONSISTENCY PASSED');
});

// 2. Changelog Validation Executable
runTest('Verify Changelog Validation Script Executable & Passes', () => {
  const res = spawnSync('node', [path.join(repoRoot, 'scripts/validate-release-changelog.mjs')], { encoding: 'utf8' });
  return res.status === 0 && res.stdout.includes('RELEASE CHANGELOG VALIDATION PASSED');
});

// 3. Signature Verification Rejects Non-Existent APK Cleanly
runTest('Signature Verification Rejects Missing APK Without JS Exception', () => {
  const res = spawnSync('node', [path.join(repoRoot, 'scripts/verify-release-signatures.mjs'), 'non_existent_file.apk'], { encoding: 'utf8' });
  return res.status === 1 && res.stdout.includes('NO (MISSING)') && res.stderr.includes('Signed APK does not exist');
});

// 4. Signature Verification Rejects Missing Checksum File Cleanly
runTest('Signature Verification Rejects Missing SHA256 Checksum Cleanly', () => {
  const tempApk = path.join(repoRoot, 'temp-test-dummy.apk');
  fs.writeFileSync(tempApk, 'dummy-content', 'utf8');
  try {
    const res = spawnSync('node', [path.join(repoRoot, 'scripts/verify-release-signatures.mjs'), tempApk], { encoding: 'utf8' });
    return res.status === 1 && res.stderr.includes('SHA256 checksum file does not exist');
  } finally {
    if (fs.existsSync(tempApk)) fs.unlinkSync(tempApk);
  }
});

// 5. Version Code Safety Validation
runTest('Version Code Validator Correctly Rejects Invalid Semver', () => {
  const res = spawnSync('node', [path.join(repoRoot, 'scripts/validate-version-code.mjs'), 'invalid_ver'], { encoding: 'utf8' });
  return res.status === 1 && res.stderr.includes('is not valid strict SemVer');
});

// 6. Release Script Dry Run Flag Support
runTest('Release Script Supports Dry-Run / Smoke-Test Mode', () => {
  const scriptPath = path.join(repoRoot, 'apps/studio-android/scripts/release-firebase.mjs');
  const src = fs.readFileSync(scriptPath, 'utf8');
  return src.includes('--dry-run') && src.includes('DRY-RUN');
});

// 7. Verify Contract File Exists
runTest('Verify Release Pipeline Contract Document Exists', () => {
  const docPath = path.join(repoRoot, 'docs/release-pipeline-contract.md');
  return fs.existsSync(docPath);
});

console.log('\n================================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} Passed`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
process.exit(0);
