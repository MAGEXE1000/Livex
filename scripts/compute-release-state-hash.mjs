/**
 * compute-release-state-hash.mjs
 *
 * Computes a deterministic canonical hash of all release-critical version files.
 *
 * Purpose: provide a tamper-evident fingerprint of the synchronized release state
 * so that the Preflight job can emit this hash and the Build job can verify it
 * matches its own checkout — proving both jobs consumed the same committed state
 * before any expensive compilation work begins.
 *
 * Usage (emit):   node scripts/compute-release-state-hash.mjs
 * Usage (verify): node scripts/compute-release-state-hash.mjs --verify <expected_hash>
 *
 * Exit codes:
 *   0 — hash computed (emit mode) or hashes match (verify mode)
 *   1 — files missing, hash mismatch, or invalid args
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// The minimal set of files whose byte-identical content is required between
// the Preflight-validated state and the Build-consumed state.
// These files directly determine the APK's versionName, versionCode, and
// all version-gated update logic. They must be synchronized before build.
//
// Sorted lexicographically for deterministic hash order.
const RELEASE_CRITICAL_FILES = [
  'apps/studio-android/android/app/build.gradle',
  'apps/studio-android/package.json',
  'apps/studio-android/public/app-release.json',
  'apps/studio-android/public/version.json',
  'package.json',
  'packages/livex-core/src/lib/startup/appVersion.ts',
].sort();

/**
 * Compute the canonical release state hash.
 * Each file contributes its relative path + ':' + its SHA-256 hex digest.
 * All entries are sorted (already sorted above, explicit sort for safety).
 * The final hash is SHA-256 of the newline-joined sorted entries.
 */
function computeReleaseStateHash() {
  const entries = [];
  const missing = [];

  for (const relPath of RELEASE_CRITICAL_FILES) {
    const absPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
      continue;
    }
    const content = fs.readFileSync(absPath);
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    entries.push(relPath + ':' + fileHash);
  }

  if (missing.length > 0) {
    console.error('compute-release-state-hash: \u2717 FATAL: Release-critical files missing:');
    missing.forEach(f => console.error('  -', f));
    process.exit(1);
  }

  entries.sort(); // Explicit sort — defensive against future file list reordering
  const combined = entries.join('\n');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// ── CLI dispatch ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const verifyIdx = args.indexOf('--verify');

if (verifyIdx !== -1) {
  // VERIFY MODE: called by Build job
  const expectedHash = args[verifyIdx + 1];
  if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    console.error('compute-release-state-hash: \u2717 --verify requires a 64-character hex SHA-256 argument');
    process.exit(1);
  }

  const actualHash = computeReleaseStateHash();

  console.log('=== RELEASE STATE HASH VERIFICATION ===');
  console.log('Expected (Preflight): ' + expectedHash);
  console.log('Actual   (Build):     ' + actualHash);
  console.log('Files:');
  for (const relPath of RELEASE_CRITICAL_FILES) {
    const absPath = path.join(repoRoot, relPath);
    const content = fs.readFileSync(absPath);
    const h = crypto.createHash('sha256').update(content).digest('hex');
    console.log('  ' + relPath.padEnd(58) + h.slice(0, 16) + '...');
  }

  if (actualHash !== expectedHash) {
    console.error('');
    console.error('compute-release-state-hash: \u2717 FATAL: Release state hash MISMATCH.');
    console.error('  The Build checkout does not match the state validated by Preflight.');
    console.error('  This means the committed files were not synchronized when Preflight ran,');
    console.error('  or a concurrent push changed the branch between Preflight and Build.');
    console.error('  Refusing to proceed with compilation.');
    process.exit(1);
  }

  console.log('');
  console.log('compute-release-state-hash: \u2713 PASS — Build state is identical to Preflight state.');
  process.exit(0);
} else {
  // EMIT MODE: called by Preflight job after sync-versions
  const hash = computeReleaseStateHash();

  console.log('=== RELEASE STATE HASH (EMIT) ===');
  console.log('Files hashed:');
  for (const relPath of RELEASE_CRITICAL_FILES) {
    const absPath = path.join(repoRoot, relPath);
    const content = fs.readFileSync(absPath);
    const h = crypto.createHash('sha256').update(content).digest('hex');
    console.log('  ' + relPath.padEnd(58) + h.slice(0, 16) + '...');
  }
  console.log('');
  console.log('RELEASE_STATE_HASH=' + hash);
  // Print in GitHub Actions output format so the workflow can capture it
  // The caller is responsible for: echo "RELEASE_STATE_HASH=$hash" >> $GITHUB_OUTPUT
  process.exit(0);
}
