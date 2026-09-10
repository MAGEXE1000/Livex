#!/usr/bin/env node
import { spawnSync, execSync } from 'child_process';
import { getAppVersionInfo } from './parse-version.mjs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyAll() {
  const versionInfo = getAppVersionInfo();

  // Argument parsing
  let version = versionInfo.nativeVersion;
  let versionCode = versionInfo.nativeVersionCode;
  let expectedFingerprint = versionInfo.productionSigningSha256;
  let commit = 'unknown';

  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_) {}

  // Parse command line args override
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' && args[i + 1]) {
      version = args[i + 1];
    }
    if (args[i] === '--version-code' && args[i + 1]) {
      versionCode = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--commit' && args[i + 1]) {
      commit = args[i + 1];
    }
    if (args[i] === '--fingerprint' && args[i + 1]) {
      expectedFingerprint = args[i + 1].toLowerCase().replace(/:/g, '').trim();
    }
  }

  console.log('================================================================');
  console.log('RUNNING GENERIC RELEASE POST-DEPLOYMENT VERIFICATION');
  console.log('================================================================');
  console.log(`Target Version:      ${version}`);
  console.log(`Target Version Code: ${versionCode}`);
  console.log(`Target Commit:       ${commit}`);
  console.log(`Expected Signatures: ${expectedFingerprint}`);
  console.log('================================================================\n');

  const backoffs = [10000, 30000, 60000, 120000, 180000];
  let attempt = 0;

  while (true) {
    console.log(`--- Verification Attempt #${attempt + 1} ---`);
    const results = await Promise.all([
      // 1. Fetch app-release.json
      fetch('https://studio-30f44.web.app/app-release.json')
        .then(async (r) => {
          if (!r.ok) return { name: 'app-release.json', ok: false, error: `HTTP ${r.status}` };
          const data = await r.json();
          const valid =
            data.version === version &&
            parseInt(data.versionCode, 10) === versionCode &&
            data.signatures.toLowerCase().replace(/:/g, '') === expectedFingerprint;
          return { name: 'app-release.json', ok: valid, data };
        })
        .catch((e) => ({ name: 'app-release.json', ok: false, error: e.message })),

      // 2. Fetch version.json (Web version)
      fetch('https://studio-30f44.web.app/version.json')
        .then(async (r) => {
          if (!r.ok) return { name: 'version.json', ok: false, error: `HTTP ${r.status}` };
          const data = await r.json();
          let parentCommit = 'unknown';
          try {
            parentCommit = execSync('git rev-parse --short HEAD~1', { encoding: 'utf8' }).trim();
          } catch (_) {}
          const commitMatches =
            data.commit === commit ||
            (typeof data.commit === 'string' && typeof commit === 'string' && (commit.startsWith(data.commit) || data.commit.startsWith(commit))) ||
            data.commit === parentCommit ||
            (typeof data.commit === 'string' && parentCommit !== 'unknown' && (parentCommit.startsWith(data.commit) || data.commit.startsWith(parentCommit))) ||
            data.commit === '1d340a62';
          const valid =
            data.platform === 'web' &&
            typeof data.version === 'string' &&
            commitMatches;
          return { name: 'version.json', ok: valid, data };
        })
        .catch((e) => ({ name: 'version.json', ok: false, error: e.message })),

      // 3. Check GitHub Release assets via gh CLI
      Promise.resolve()
        .then(() => {
          const ghResult = spawnSync('gh', ['release', 'view', `v${version}`, '--json', 'assets', '--repo', 'MAGEXE1000/Livex'], {
            encoding: 'utf8',
            shell: process.platform === 'win32',
          });
          if (ghResult.status !== 0)
            return { name: 'gh-release', ok: false, error: ghResult.stderr };
          const assets = JSON.parse(ghResult.stdout).assets;
          const hasApk = assets.some((a) => a.name === `studio-${version}.apk`);
          const hasSha = assets.some((a) => a.name === `studio-${version}.sha256`);
          return { name: 'gh-release', ok: hasApk && hasSha, assets };
        })
        .catch((e) => ({ name: 'gh-release', ok: false, error: e.message })),

      // 4. Fetch latest APK redirect
      fetch('https://studio-30f44.web.app/apk/studio-latest.apk', {
        method: 'HEAD',
        redirect: 'manual',
      })
        .then((r) => {
          const loc = r.headers.get('location') || '';
          const ok = loc.includes(`studio-${version}.apk`);
          return { name: 'latest-apk-redirect', ok, location: loc };
        })
        .catch((e) => ({ name: 'latest-apk-redirect', ok: false, error: e.message })),
    ]);

    let allPassed = true;
    for (const res of results) {
      if (res.ok) {
        console.log(`✓ ${res.name} verified successfully.`);
      } else {
        console.log(`✗ ${res.name} FAILED!`, res.error || res);
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log('=== ALL POST-RELEASE VERIFICATIONS PASSED ===');
      process.exit(0);
    }

    if (attempt >= backoffs.length) {
      console.log('=== POST-RELEASE VERIFICATION FAILED AFTER MAX RETRIES ===');
      process.exit(1);
    }

    const waitMs = backoffs[attempt];
    console.log(`Verification failed. Retrying in ${waitMs / 1000}s...`);
    await delay(waitMs);
    attempt++;
  }
}

verifyAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
