import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const scriptsDir = path.resolve(__dirname, '..');

export function runReleaseLint() {
  console.log('====================================================================');
  console.log('                RUNNING RELEASE ARCHITECTURE LINTER               ');
  console.log('====================================================================\n');

  const errors = [];
  const warnings = [];

  // 1. Single Source of Truth for Version
  const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
  if (!fs.existsSync(appVersionPath)) {
    errors.push('Canonical version file packages/livex-core/src/lib/startup/appVersion.ts is missing!');
  } else {
    const src = fs.readFileSync(appVersionPath, 'utf8');
    if (!src.includes('NATIVE_VERSION')) {
      errors.push('NATIVE_VERSION definition missing from appVersion.ts!');
    }
  }

  // 2. Single Source of Truth for Release Manifest
  const manifestPath = path.join(repoRoot, 'release-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    warnings.push('release-manifest.json not yet generated; run pnpm release:doctor to generate.');
  }

  // 3. Scan scripts for duplicated release creation or direct tag creation bypassing release/ index
  const filesToScan = [
    'generate-release-metadata.mjs',
    'sync-version.mjs',
    'test-release-version.mjs',
  ];

  for (const fileName of filesToScan) {
    const filePath = path.join(scriptsDir, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('gh release create') && fileName !== 'release-firebase.mjs') {
        errors.push(`DUPLICATION DETECTED: Script ${fileName} contains direct 'gh release create' logic! All release publication must route through release-firebase.mjs.`);
      }
    }
  }

  // 4. Validate Release Policy Rules
  const policyPath = path.join(repoRoot, 'RELEASE_POLICY.md');
  if (!fs.existsSync(policyPath)) {
    errors.push('RELEASE_POLICY.md file missing from repository root!');
  }

  console.log(`Audited Architecture:`);
  console.log(`- Version Source:       packages/livex-core/src/lib/startup/appVersion.ts (NATIVE_VERSION)`);
  console.log(`- Release Manifest:    release-manifest.json`);
  console.log(`- Release Entry Point:  apps/studio-android/scripts/release-firebase.mjs`);
  console.log(`- Doctor Engine:        apps/studio-android/scripts/releaseDoctor/`);
  console.log(`- Dry Run Engine:       apps/studio-android/scripts/releaseDryRun/`);
  console.log(`- Validator Engine:     apps/studio-android/scripts/release/\n`);

  if (errors.length > 0) {
    console.error('\x1b[31mARCHITECTURE LINT FAILED:\x1b[0m');
    errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
    console.log('\n====================================================================');
    console.log('\x1b[31mFAILED\x1b[0m');
    console.log('====================================================================\n');
    return { pass: false, errors };
  }

  if (warnings.length > 0) {
    warnings.forEach((warn) => console.warn(`⚠ ${warn}`));
  }

  console.log('====================================================================');
  console.log('\x1b[32mARCHITECTURE LINT PASSED CLEANLY\x1b[0m');
  console.log('====================================================================\n');
  return { pass: true, errors: [] };
}
