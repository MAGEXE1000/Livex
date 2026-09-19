import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReleaseDoctor } from '../releaseDoctor/doctor.mjs';
import { createReleaseFailureReport } from '../release/failureReporter.mjs';
import { fetchGitHubReleaseInfo } from '../release/github.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const appRoot = path.resolve(__dirname, '../..');

export async function runReleaseDryRun(options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  console.log('====================================================================');
  console.log('                 RUNNING RELEASE DRY RUN (NO PUBLISH)              ');
  console.log('====================================================================');

  const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
  let currentVersion = '4.3.54';
  if (fs.existsSync(appVersionPath)) {
    const src = fs.readFileSync(appVersionPath, 'utf8');
    const match = src.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) currentVersion = match[1];
  }

  // 1. Required Assets Verification
  const requiredAssets = [
    { name: 'Release Notes', path: path.join(repoRoot, 'release-notes.md') },
    { name: 'version.json', path: path.join(appRoot, 'public/version.json') },
    { name: 'app-release.json', path: path.join(repoRoot, 'firebase-public/app-release.json') },
  ];

  for (const asset of requiredAssets) {
    if (!fs.existsSync(asset.path)) {
      const errorMsg = `Required release artifact missing: ${asset.name} at ${asset.path}`;
      console.error(`\x1b[31mDRY RUN FAILED: ${errorMsg}\x1b[0m`);
      createReleaseFailureReport({
        failedStep: 'Required Asset Verification',
        rootCause: errorMsg,
        evidence: `File not found: ${asset.path}`,
        suggestedFix: `Create or generate missing artifact ${asset.name}.`,
        nextCommand: 'pnpm release:doctor',
        priority: 'CRITICAL',
        expectedResolution: `File present at ${asset.path}`,
      });
      console.log('\n====================================================================');
      console.log('\x1b[31mBLOCKED\x1b[0m');
      console.log('====================================================================\n');
      return { ready: false, status: 'BLOCKED', reason: errorMsg };
    }
  }
  console.log('✓ Required release assets present.');

  // 2. Immutable Release Enforcement
  console.log(`Verifying release immutability for v${currentVersion}...`);
  const ghInfo = await fetchGitHubReleaseInfo(currentVersion, { fetchFn });
  if (ghInfo.exists) {
    const errorMsg = `IMMUTABILITY VIOLATION: Published GitHub Release v${currentVersion} already exists! Published releases are immutable.`;
    console.error(`\x1b[31mDRY RUN FAILED: ${errorMsg}\x1b[0m`);
    createReleaseFailureReport({
      failedStep: 'Immutable Release Enforcement',
      rootCause: errorMsg,
      evidence: `Tag v${currentVersion} exists on GitHub.`,
      suggestedFix: 'Increment NATIVE_VERSION in appVersion.ts to create a NEW version bump.',
      nextCommand: 'pnpm sync:versions',
      priority: 'CRITICAL',
      expectedResolution: 'Target version does not exist on GitHub.',
    });
    console.log('\n====================================================================');
    console.log('\x1b[31mBLOCKED\x1b[0m');
    console.log('====================================================================\n');
    return { ready: false, status: 'BLOCKED', reason: errorMsg };
  }
  console.log('✓ Release immutability verified (version is fresh and unreleased).');

  // 3. Execute Release Doctor checks
  const doctorReport = await runReleaseDoctor(options);
  if (!doctorReport.isHealthy) {
    console.log('\n====================================================================');
    console.log('\x1b[31mBLOCKED\x1b[0m');
    console.log('====================================================================\n');
    return { ready: false, status: 'BLOCKED', reason: 'Release Doctor checks failed' };
  }

  console.log('\n====================================================================');
  console.log('\x1b[32mREADY TO RELEASE\x1b[0m');
  console.log('====================================================================\n');
  return { ready: true, status: 'READY TO RELEASE' };
}
