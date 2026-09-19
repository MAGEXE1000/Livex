#!/usr/bin/env node
/**
 * sync-audio-assets.mjs
 *
 * Single Source of Truth (SSOT) synchronizer for binary audio assets.
 * Mirrors canonical audio samples from packages/livex-core/assets/audio
 * into apps/studio-web/public/audio and apps/studio-android/public/audio.
 *
 * Runs idempotently via SHA-256 comparison to prevent unnecessary disk writes
 * and spurious git dirty state.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const canonicalDir = path.join(
  repoRoot,
  'packages',
  'livex-core',
  'assets',
  'audio'
);

const targets = [
  path.join(repoRoot, 'apps', 'studio-web', 'public', 'audio'),
  path.join(repoRoot, 'apps', 'studio-android', 'public', 'audio'),
];

console.log('================================================================');
console.log('       LIVEX AUDIO ASSETS SINGLE-SOURCE-OF-TRUTH SYNCHRONIZER');
console.log('================================================================');

if (!fs.existsSync(canonicalDir)) {
  console.error(`✗ ERROR: Canonical audio directory not found at: ${canonicalDir}`);
  process.exit(1);
}

function computeHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function getAllFiles(dir, relativeTo = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.git') || entry.name.startsWith('.temp')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(relativeTo, fullPath).split(path.sep).join('/');
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relativeTo));
    } else if (entry.isFile()) {
      if (entry.name === '.generated-manifest.json') continue;
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

const sourceFiles = getAllFiles(canonicalDir);
console.log(`Canonical Source: ${path.relative(repoRoot, canonicalDir)} (${sourceFiles.length} files)`);

let totalUpdated = 0;
let totalSkipped = 0;
let totalRemoved = 0;

for (const targetDir of targets) {
  const relTarget = path.relative(repoRoot, targetDir);
  console.log(`\nTarget: ${relTarget}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const existingTargetFiles = getAllFiles(targetDir);
  const sourceRelSet = new Set(sourceFiles.map((f) => f.relPath));

  // 1. Remove stale files in target that don't exist in source
  for (const tFile of existingTargetFiles) {
    if (!sourceRelSet.has(tFile.relPath)) {
      fs.unlinkSync(tFile.fullPath);
      console.log(`  - Removed stale file: ${tFile.relPath}`);
      totalRemoved++;
    }
  }

  // 2. Sync files from canonical source
  let targetUpdated = 0;
  let targetSkipped = 0;

  for (const sFile of sourceFiles) {
    const destPath = path.join(targetDir, sFile.relPath);
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    let needsWrite = true;
    if (fs.existsSync(destPath)) {
      const srcHash = computeHash(sFile.fullPath);
      const destHash = computeHash(destPath);
      if (srcHash === destHash) {
        needsWrite = false;
        targetSkipped++;
      }
    }

    if (needsWrite) {
      fs.copyFileSync(sFile.fullPath, destPath);
      targetUpdated++;
    }
  }

  console.log(`  ✓ Updated: ${targetUpdated}, Skipped (identical): ${targetSkipped}`);
  totalUpdated += targetUpdated;
  totalSkipped += targetSkipped;
}

console.log('\n----------------------------------------------------------------');
console.log(`✓ SYNC COMPLETE: ${totalUpdated} files written, ${totalSkipped} unchanged, ${totalRemoved} stale files removed.`);
console.log('================================================================\n');
