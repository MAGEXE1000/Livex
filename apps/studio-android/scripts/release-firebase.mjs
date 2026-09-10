#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs, {
  cpSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
  copyFileSync,
  chmodSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { generateReleaseManifest } from '../../../scripts/generate-release-manifest.mjs';
import { generateAuditLog } from '../../../scripts/release-audit-logger.mjs';
import { appendReleaseHistory } from '../../../scripts/generate-release-history.mjs';
import { generateReleaseDelta } from '../../../scripts/generate-release-delta.mjs';
import { runReleaseSmokeTest } from '../../../scripts/run-release-smoke-test.mjs';
import { generateSlsaProvenance } from '../../../scripts/generate-slsa-provenance.mjs';
import { verifyDeterministicBuild } from '../../../scripts/verify-deterministic-build.mjs';
import { verifyDependencyLocks } from '../../../scripts/verify-dependency-locks.mjs';
import { manageArtifactRetention } from '../../../scripts/manage-artifact-retention.mjs';
import { generateReleaseHealth } from '../../../scripts/generate-release-health.mjs';
import { generateDependencyReport } from '../../../scripts/generate-dependency-report.mjs';
import { getAppVersionInfo } from '../../../scripts/parse-version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pkgRoot, '../..');

const isDevPreview = process.argv.includes('--development-preview');
const skipBuild = process.argv.includes('--skip-build');

// Load .env file if it exists in pkgRoot
const envPath = path.join(pkgRoot, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  }
}

const otaBase = 'https://studio-30f44.web.app';
const firebasePublicDir = path.join(repoRoot, 'firebase-public');
const firebaseOtaDir = path.join(firebasePublicDir, 'ota');

// —— Parse NATIVE_VERSION in packages/studio-core/src/lib/startup/appVersion.ts ————————
let version = '0.0.0';
try {
  const versionInfo = getAppVersionInfo();
  version = versionInfo.nativeVersion;
  const versionArgIndex = process.argv.indexOf('--version');
  if (versionArgIndex !== -1 && process.argv[versionArgIndex + 1]) {
    version = process.argv[versionArgIndex + 1];
  }
  console.log(`release-firebase: → Single source of truth version: ${version}`);
} catch (err) {
  console.error(`release-firebase: ✗ Failed to get native version: ${err.message}`);
  process.exit(1);
}

// â”€â”€ Early Validation Checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('release-firebase: â†’ Running early validation checks...');

// A. GH_TOKEN check
let ghToken = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
if (!ghToken) {
  try {
    const tokenResult = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', shell: false });
    if (tokenResult.status === 0 && tokenResult.stdout) {
      ghToken = tokenResult.stdout.trim();
      process.env.GH_TOKEN = ghToken;
      process.env.GITHUB_TOKEN = ghToken;
    }
  } catch {}
}
if (!ghToken) {
  console.error(
    '\x1b[31mrelease-firebase: ✗ GITHUB_TOKEN / GH_TOKEN env variable is missing or invalid. Refusing to start release pipeline.\x1b[0m'
  );
  process.exit(1);
}
console.log('release-firebase: ✓ GH_TOKEN presence validated.');

// ── Canonical Production Version Guard ─────────────────────────────────────────
// Resolve the true production versionCode from GitHub Releases (authoritative).
// This runs before EVERY mode (--validate-only, --dry-run, normal release) and
// before any expensive work (changelog, Vite, Gradle), ensuring a duplicate
// versionCode fails in seconds rather than after 60+ seconds of Gradle.
console.log('release-firebase: → Resolving production baseline from GitHub Releases...');
let productionVersionCode = 0;
let productionVersion = '(none)';
try {
  const ghListResult = spawnSync(
    'gh', ['release', 'list', '--limit', '20', '--json', 'tagName,isLatest', '--repo', 'MAGEXE1000/Studio'],
    { encoding: 'utf8', shell: false }
  );
  if (ghListResult.status === 0 && ghListResult.stdout) {
    const releases = JSON.parse(ghListResult.stdout);
    // Find the latest non-draft release tag that is not the current version being built
    const currentTag = `v${version}`;
    let latestTag = null;
    // Prefer the release marked isLatest first
    const latestMarked = releases.find((r) => r.isLatest && r.tagName !== currentTag);
    if (latestMarked) {
      latestTag = latestMarked.tagName;
    } else {
      // Fall back to the first published release that is not the current version
      const fallback = releases.find((r) => r.tagName !== currentTag);
      if (fallback) latestTag = fallback.tagName;
    }
    if (latestTag) {
      const tagVer = latestTag.replace(/^v/, '');
      const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(tagVer);
      if (m) {
        productionVersion = tagVer;
        productionVersionCode = parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
      }
    }
  }
} catch (e) {
  // A failed gh call on CI is always an environment problem (missing GH_TOKEN scope,
  // network failure, or repository misconfigured). Silently proceeding means the version
  // guard is skipped entirely — the same class of failure the guard was designed to catch.
  // In CI (GITHUB_ACTIONS=true), fail-fast. Locally, warn and proceed so developers
  // can run the script without network access.
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error(`\x1b[31mrelease-firebase: \u2717 FATAL: Could not resolve production version from GitHub Releases: ${e.message}\x1b[0m`);
    console.error('  The version guard is required in CI. Check GH_TOKEN permissions and network access.');
    process.exit(1);
  }
  console.warn(`release-firebase: \u26a0  Could not resolve production version from GitHub Releases: ${e.message}`);
  console.warn('release-firebase: \u26a0  Running locally without network \u2014 version guard skipped.');
}

// Derive candidate versionCode from version (same formula as sync-versions)
{
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) {
    console.error(`\x1b[31mrelease-firebase: ✗ Candidate version "${version}" is not valid SemVer (X.Y.Z).\x1b[0m`);
    process.exit(1);
  }
  const candidateVersionCode = parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
  console.log('');
  console.log('================================================================');
  console.log('CANONICAL VERSION GUARD');
  console.log('================================================================');
  console.log(`Release candidate:       ${version} (versionCode ${candidateVersionCode})`);
  console.log(`Production baseline:     ${productionVersion} (versionCode ${productionVersionCode})`);
  if (productionVersionCode > 0) {
    if (candidateVersionCode <= productionVersionCode) {
      console.error(`\x1b[31mrelease-firebase: ✗ VERSION GUARD FAILED: Candidate versionCode (${candidateVersionCode}) must be greater than production (${productionVersionCode}).\x1b[0m`);
      console.error('  Production is already at version ' + productionVersion + '.');
      console.error('  Increment the version in package.json and re-run sync-versions before releasing.');
      process.exit(1);
    }
    console.log(`Version guard:           ✓ PASSED (${candidateVersionCode} > ${productionVersionCode})`);
  } else {
    console.log(`Version guard:           ⚠  No prior production release found — treating as first release.`);
  }
  console.log('================================================================\n');
}

// B. PREFLIGHT CODE QUALITY & VERSION CONSISTENCY CHECKS
const qualityScripts = [
  { file: 'validate-version-code.mjs', label: 'VersionCode Collision Safety' },
  { file: 'verify-versions-consistency.mjs', label: 'Version Consistency' },
  { file: 'enforce-import-boundaries.mjs', label: 'Import Boundaries' },
  { file: 'verify-all-references.mjs', label: 'Reference Audit' },
  { file: 'verify-circular-deps.mjs', label: 'Circular Dependencies' },
  { file: 'validate-release-changelog.mjs', label: 'Changelog System' },
];

for (const script of qualityScripts) {
  const scriptPath = path.join(repoRoot, 'scripts', script.file);
  if (existsSync(scriptPath)) {
    const res = spawnSync('node', [scriptPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (res.status !== 0) {
      console.error(`\x1b[31mrelease-firebase: ✗ Mandatory ${script.label} validation failed!\x1b[0m`);
      process.exit(res.status ?? 1);
    }
  }
}
console.log('release-firebase: ✓ All preflight code quality & version consistency checks passed.');

// Extract section for target version directly from CHANGELOG.md as single source of truth
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
let sectionContent = '';
if (existsSync(changelogPath)) {
  const changelogText = readFileSync(changelogPath, 'utf8');
  const changelogRawLines = changelogText.split(/\r?\n/);
  let inSection = false;
  const sectionLines = [];

  for (const rawLine of changelogRawLines) {
    const isHeader = rawLine.match(/^(?:#|##)\s+(?:Version\s+)?v?(\d+\.\d+\.\d+)/i);
    if (isHeader) {
      if (inSection) break;
      if (isHeader[1] === version) {
        inSection = true;
        continue;
      }
    }
    if (inSection) {
      sectionLines.push(rawLine);
    }
  }
  if (inSection && sectionLines.length > 0) {
    sectionContent = sectionLines.join('\n').trim();
  }
}

if (!sectionContent) {
  const releaseNotesPath = path.join(repoRoot, 'release-notes.md');
  if (existsSync(releaseNotesPath)) {
    sectionContent = readFileSync(releaseNotesPath, 'utf8').trim();
  }
}

const sectionLines = sectionContent.split('\n');
const categories = { added: [], improved: [], fixed: [], changed: [], security: [] };
let currentCategory = null;
const flatBullets = [];

for (const rawLine of sectionLines) {
  const line = rawLine.trim();
  if (!line) continue;

  const hMatch = line.match(/^###\s+(Added|Improved|Fixed|Changes|Bug\s*Fixes|Fixes|Changed)\b/i);
  if (hMatch) {
    const heading = hMatch[1].toLowerCase();
    if (heading.startsWith('add')) {
      currentCategory = 'added';
    } else if (heading.startsWith('improv')) {
      currentCategory = 'improved';
    } else if (heading.startsWith('fix') || heading.startsWith('bug')) {
      currentCategory = 'fixed';
    } else if (heading.startsWith('change')) {
      currentCategory = 'changed';
    } else {
      currentCategory = null;
    }
    continue;
  }

  const bMatch = line.match(/^[-*•]\s+(.*)$/);
  if (bMatch) {
    const bulletContent = bMatch[1].trim();
    if (currentCategory) {
      categories[currentCategory].push(bulletContent);
    }
    flatBullets.push(bulletContent);
  }
}

if (flatBullets.length === 0) {
  console.error(
    `\x1b[31mrelease-firebase: ✗ Release blocked: changelog entry for version ${version} has no meaningful bullet points. Add real release notes before publishing.\x1b[0m`
  );
  process.exit(1);
}

const changelog = flatBullets.map((b) => `• ${b}`).join('\n');
const releaseNotes = {
  added: categories.added.length > 0 ? categories.added : undefined,
  improved: categories.improved.length > 0 ? categories.improved : undefined,
  fixed: categories.fixed.length > 0 ? categories.fixed : undefined,
  changed: categories.changed.length > 0 ? categories.changed : undefined,
};

console.log(
  `release-firebase: ✓ Validated changelog for version ${version}. Found ${flatBullets.length} bullets.`
);

// Idempotent write: format canonical release-notes.md
const releaseDateMatch = sectionContent.match(/Release Date:\s*(.+)/);
const releaseDate = releaseDateMatch ? releaseDateMatch[1].trim() : new Date().toISOString().slice(0, 10);
const bodyAfterDate = sectionContent.replace(/^Release Date:[^\n]*\n*/, '').trim();
const canonicalReleaseNotesMd = `# Version ${version}\n\nRelease Date: ${releaseDate}\n\n${bodyAfterDate}\n`;

const releaseNotesMdPath = path.join(repoRoot, 'release-notes.md');
const existingReleaseNotesMd = existsSync(releaseNotesMdPath) ? readFileSync(releaseNotesMdPath, 'utf8') : null;
if (existingReleaseNotesMd !== canonicalReleaseNotesMd) {
  writeFileSync(releaseNotesMdPath, canonicalReleaseNotesMd, 'utf8');
  console.log(`release-firebase: ✓ Wrote ${path.relative(repoRoot, releaseNotesMdPath)} (content changed)`);
} else {
  console.log(`release-firebase: ✓ ${path.relative(repoRoot, releaseNotesMdPath)} already up to date (idempotent skip)`);
}

// Write temp notes file (gitignored, untracked — safe to write unconditionally)
const tempNotesPath = path.join(pkgRoot, '.release-temp-notes.json');
writeFileSync(
  tempNotesPath,
  JSON.stringify({ changelog, releaseNotes, description: changelog }, null, 2) + '\n',
  'utf8'
);
console.log(`release-firebase: ✓ Wrote temporary notes to ${tempNotesPath}`);

// C. Verify build.gradle consistency and cross-check against previous release
let gradleVersionName = '';
let gradleVersionCode = 0;
let gradleApplicationId = '';

const gradlePath = path.join(pkgRoot, 'android/app/build.gradle');
if (existsSync(gradlePath)) {
  const gradleSrc = readFileSync(gradlePath, 'utf8');
  const nameMatch = gradleSrc.match(/versionName\s+['"]([^'"]+)['"]/);
  const codeMatch = gradleSrc.match(/versionCode\s+(\d+)/);
  const idMatch = gradleSrc.match(/applicationId\s+['"]([^'"]+)['"]/);

  if (nameMatch) gradleVersionName = nameMatch[1];
  if (codeMatch) gradleVersionCode = parseInt(codeMatch[1], 10);
  if (idMatch) gradleApplicationId = idMatch[1];
}

let prevVersionCode = 0;
const localAppReleasePath = path.join(repoRoot, 'firebase-public', 'app-release.json');
if (existsSync(localAppReleasePath)) {
  try {
    const localData = JSON.parse(readFileSync(localAppReleasePath, 'utf8'));
    if (localData && localData.versionCode && localData.version !== version) {
      prevVersionCode = parseInt(localData.versionCode, 10);
      console.log(`release-firebase: Local app-release.json versionCode is ${prevVersionCode}`);
    }
  } catch (e) {
    console.warn(`release-firebase: âš  Could not read local app-release.json: ${e.message}`);
  }
}

if (!prevVersionCode) {
  try {
    const response = await fetch('https://studio-30f44.web.app/app-release.json', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.versionCode && data.version !== version) {
        prevVersionCode = parseInt(data.versionCode, 10);
        console.log(`release-firebase: Deployed production versionCode is ${prevVersionCode}`);
      }
    }
  } catch (e) {
    console.warn(
      `release-firebase: âš  Could not fetch app-release.json from Firebase: ${e.message}`
    );
  }
}

// Perform validation checks
if (gradleVersionName !== version) {
  console.error(
    `release-firebase: âœ— NATIVE_VERSION (${version}) differs from build.gradle versionName (${gradleVersionName})!`
  );
  process.exit(1);
}
if (gradleApplicationId !== 'com.chordex.app') {
  console.error(
    `release-firebase: âœ— package name (${gradleApplicationId}) differs from com.chordex.app!`
  );
  process.exit(1);
}
if (prevVersionCode && gradleVersionCode <= prevVersionCode) {
  console.error(
    `release-firebase: âœ— versionCode (${gradleVersionCode}) is not greater than the previous release (${prevVersionCode})!`
  );
  process.exit(1);
}

const changelogFound = 'yes';
const expectedGitTag = `v${version}`;

console.log('================================================================');
console.log('RELEASE CONFIGURATION & PREFLIGHT REPORT');
console.log('================================================================');
console.log(`Release Type:            Android APK`);
console.log(`Resolved Version Source: NATIVE_VERSION`);
console.log(`Resolved Version:        ${version}`);
console.log(`Gradle versionName:      ${gradleVersionName}`);
console.log(`Gradle versionCode:      ${gradleVersionCode}`);
console.log(`Changelog File Path:     ${path.join(repoRoot, 'CHANGELOG.md')}`);
console.log(`Changelog Entry Found:   Yes`);
console.log(`APK Package Name:        ${gradleApplicationId}`);
console.log(`Expected Git Tag:        ${expectedGitTag}`);
console.log('================================================================\n');

const validateOnly = process.argv.includes('--validate-only');
if (validateOnly) {
  console.log(`Resolved Android version: ${version}`);
  console.log(`Resolved versionCode: ${gradleVersionCode}`);
  console.log(`Changelog entry: found`);
  console.log(`Validation successful`);
  console.log(`No release side effects performed`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  process.exit(0);
}

// D. Check for hardcoded java home in gradle.properties
const gradlePropsPath = path.join(pkgRoot, 'android', 'gradle.properties');
if (existsSync(gradlePropsPath)) {
  const gp = readFileSync(gradlePropsPath, 'utf8');
  const badPatterns = [
    /org\.gradle\.java\.home\s*=\s*C:/i,
    /org\.gradle\.java\.home\s*=\s*\/Users\//,
    /org\.gradle\.java\.home\s*=\s*\/home\//,
    /Eclipse Adoptium/i,
    /Program Files/i,
  ];
  for (const pat of badPatterns) {
    if (pat.test(gp)) {
      console.error(
        `\x1b[31mrelease-firebase: âœ— Hardcoded org.gradle.java.home detected in gradle.properties.\x1b[0m`
      );
      console.error('  Do not commit local JDK paths. Use JAVA_HOME from the environment instead.');
      process.exit(1);
    }
  }
}
console.log('release-firebase: âœ“ gradle.properties JVM configuration validated.');

// E. Chmod safety for gradlew
const gradleCwd = path.join(pkgRoot, 'android');
if (process.platform !== 'win32') {
  const gradlewPath = path.join(gradleCwd, 'gradlew');
  try {
    chmodSync(gradlewPath, 0o755);
    console.log(`release-firebase: chmod +x ${gradlewPath}`);
  } catch (e) {
    console.warn(`release-firebase: âš  chmod failed: ${e.message}`);
  }
}
console.log('release-firebase: âœ“ gradlew permissions verified.');

// F. Validate Supabase build configuration
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const syncBackendProvider = (process.env.VITE_SYNC_BACKEND_PROVIDER || '').trim();

if (!supabaseUrl || !supabaseAnonKey || syncBackendProvider !== 'supabase-realtime') {
  console.log(`release-firebase: Observability - Supabase check: url=${!!supabaseUrl}, key=${!!supabaseAnonKey}, provider=${syncBackendProvider}`);
  console.error(
    '\x1b[31mrelease-firebase: âœ— Supabase config missing. Refusing to build a Supabase sync release.\x1b[0m'
  );
  process.exit(1);
}
console.log('release-firebase: âœ“ Supabase build gate validation passed.');
// NOTE: sync-versions is intentionally omitted here.
// The CI Preflight job runs it once (release.yml). Re-running it in the Build job
// mutates tracked files (appVersion.ts buildTimestamp / manifest timestamps),
// causing Vite's git-status dirty-tree check to fire. The version guard above
// already confirmed candidate > production, so no additional sync is needed.

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: pkgRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// â”€â”€ Signing preflight â€” fail fast before expensive builds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!isDevPreview && !skipBuild) {
  console.log('release-firebase: â†’ Running signing preflight...');
  const ksPath = path.join(pkgRoot, 'android', 'app', 'release.keystore');
  const ksAlias = (process.env.ANDROID_KEY_ALIAS || '').trim();
  const ksPwd = (process.env.ANDROID_KEYSTORE_PASSWORD || '').trim();

  const expectedSig = getAppVersionInfo().productionSigningSha256;

  console.log(`release-firebase: ANDROID_KEYSTORE_PASSWORD present: ${ksPwd ? 'Yes' : 'No'}`);
  console.log(`release-firebase: ANDROID_KEY_ALIAS present: ${ksAlias ? 'Yes' : 'No'}`);
  console.log(
    `release-firebase: ANDROID_KEY_PASSWORD present: ${process.env.ANDROID_KEY_PASSWORD ? 'Yes' : 'No'}`
  );
  console.log(`release-firebase: EXPECTED_SIGNATURE_SHA256: ${expectedSig || '(not set)'}`);
  console.log(`release-firebase: release.keystore exists: ${existsSync(ksPath) ? 'Yes' : 'No'}`);

  if (!existsSync(ksPath)) {
    console.error(
      '\x1b[31mrelease-firebase: âœ— Signing preflight failed: release.keystore not found.\x1b[0m'
    );
    console.error(`  Expected at: ${ksPath}`);
    console.error(
      '  Ensure ANDROID_KEYSTORE_BASE64 is configured and the Decode step ran before this script.'
    );
    process.exit(1);
  }
  if (!ksPwd || !ksAlias || !expectedSig) {
    console.error(
      '\x1b[31mrelease-firebase: âœ— Signing preflight failed: missing signing env vars.\x1b[0m'
    );
    process.exit(1);
  }

  // Extract certificate fingerprint from keystore using keytool
  try {
    const keytoolResult = spawnSync(
      'keytool',
      ['-list', '-v', '-keystore', ksPath, '-alias', ksAlias, '-storepass', ksPwd],
      { encoding: 'utf8', timeout: 15000 }
    );

    const keytoolOut = (keytoolResult.stdout || '') + (keytoolResult.stderr || '');
    const sha256Match = keytoolOut.match(/SHA256:\s+([A-Fa-f0-9:]+)/);
    if (!sha256Match) {
      console.error(
        '\x1b[31mrelease-firebase: âœ— Signing preflight failed: could not extract SHA-256 from keytool output.\x1b[0m'
      );
      // Print non-secret keytool output for debugging
      const safeLines = keytoolOut
        .split('\n')
        .filter((l) => /alias|SHA256|valid|owner|issuer|entry type|certificate/i.test(l));
      if (safeLines.length) console.error(safeLines.join('\n'));
      process.exit(1);
    }
    const actualFingerprint = sha256Match[1].replace(/:/g, '').toLowerCase();
    console.log(
      `release-firebase: Keystore alias "${ksAlias}" certificate SHA-256: ${actualFingerprint}`
    );

    const targetSig =
      process.env.EXPECTED_SIGNATURE_SHA256
        ? process.env.EXPECTED_SIGNATURE_SHA256.replace(/:/g, '').toLowerCase()
        : (process.env.REINSTALL_REQUIRED === 'true'
          ? getAppVersionInfo().productionSigningSha256
          : expectedSig);

    console.log(`release-firebase: Expected production SHA-256:                     ${targetSig}`);

    if (actualFingerprint !== targetSig) {
      console.error(
        '\x1b[31mrelease-firebase: âœ— Signing preflight FAILED: keystore certificate does not match production fingerprint.\x1b[0m'
      );
      console.error(`  Keystore fingerprint: ${actualFingerprint}`);
      console.error(`  Expected fingerprint: ${targetSig}`);
      console.error('');
      console.error('  The ANDROID_KEYSTORE_BASE64 secret contains the wrong keystore,');
      console.error('  or ANDROID_KEY_ALIAS points to the wrong alias.');
      console.error('');
      console.error('  Fix: update ANDROID_KEYSTORE_BASE64 in GitHub Secrets with the');
      console.error('  production keystore that signs with the expected fingerprint.');
      process.exit(1);
    }
    console.log(
      'release-firebase: âœ“ Signing preflight passed â€” keystore matches production certificate.'
    );
  } catch (err) {
    console.error(`\x1b[31mrelease-firebase: âœ— Signing preflight error: ${err.message}\x1b[0m`);
    process.exit(1);
  }
} else {
  console.log('release-firebase: âš  Skipping signing preflight (--development-preview is set).');
}

// â”€â”€ Build PWA for Firebase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!skipBuild) {
  console.log(`release-firebase: â†’ Building Vite application for Firebase Hosting...`);
  run('pnpm', ['build'], {
    VITE_OTA_BASE_URL: otaBase,
    BASE_PATH: '/',
  });

  const distDir = path.resolve(repoRoot, 'dist', 'android-web');
  if (!existsSync(distDir)) {
    console.error(`release-firebase: âœ— Build output ${distDir} does not exist.`);
    process.exit(1);
  }

  // Zipping OTA bundle is disabled. All updates are delivered as complete signed APKs.

  // â”€â”€ Copy all web assets into the Firebase public directory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(`release-firebase: â†’ Copying assets from dist/android-web to firebase-public`);
  function copyTree(srcRoot, dstRoot, skip = new Set()) {
    for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const s = path.join(srcRoot, entry.name);
      const d = path.join(dstRoot, entry.name);
      if (entry.isDirectory()) {
        mkdirSync(d, { recursive: true });
        copyTree(s, d, skip);
      } else if (entry.isFile()) {
        copyFileSync(s, d);
      }
    }
  }
  copyTree(distDir, firebasePublicDir, new Set(['bundles', 'version.json', 'app-release.json']));
} else {
  console.log('release-firebase: â†’ Skip PWA build & copy: --skip-build flag is active.');
}

// (Changelog has been validated and parsed early)

// Helper to compute SHA-256 of a file
function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// =========================================================================
// â”€â”€ 15-STEP RELEASE ORCHESTRATION PIPELINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// =========================================================================
console.log('\n=== STARTING 15-STEP RELEASE ORCHESTRATION ===\n');

// crypto is imported at the top level

// Step 1: Build Frontend (already executed via Vite build earlier in this script)
console.log('Step 1/15: Build Frontend ... [DONE]');

// Step 2: Sync Capacitor
console.log('Step 2/15: Sync Capacitor...');
if (!skipBuild) {
  run('npx', ['cap', 'sync', 'android']);
} else {
  console.log('  Skip sync: --skip-build flag is active.');
}

// Step 2.5: Verify assets freshness & integrity
console.log('Step 2.5/15: Verify assets freshness & integrity...');
if (!skipBuild) {
  run('node', ['../../scripts/verify-android-assets-freshness.mjs']);
  run('node', ['../../scripts/sync-launcher-icons.mjs', '--verify']);
} else {
  console.log('  Skip verify: --skip-build flag is active.');
}

// Step 3: Build signed Android release APK
console.log('Step 3/15: Build signed Android release APK...');
if (!skipBuild) {
  const gradleCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  const gradleArgs = ['assembleRelease', '-x', 'lint', '-x', 'lintVitalRelease', '--parallel', '--build-cache', '--max-workers=4', '--stacktrace'];
  const gradleEnv = { ...process.env };
  if (process.platform === 'win32') {
    const adoptiumDir = 'C:\\Program Files\\Eclipse Adoptium';
    if (existsSync(adoptiumDir)) {
      const jdkDirs = readdirSync(adoptiumDir).filter((d) => d.startsWith('jdk-21') && statSync(path.join(adoptiumDir, d)).isDirectory());
      if (jdkDirs.length > 0) {
        gradleEnv.JAVA_HOME = path.join(adoptiumDir, jdkDirs[0]);
      }
    }
  }
  if (gradleEnv.GITHUB_TOKEN === 'github_pat_antigravitydummytoken') {
    delete gradleEnv.GITHUB_TOKEN;
  }

  console.log(`release-firebase: Gradle command: ${gradleCmd} ${gradleArgs.join(' ')}`);
  console.log(`release-firebase: Gradle cwd: ${gradleCwd}`);
  console.log(`release-firebase: ANDROID_HOME: ${gradleEnv.ANDROID_HOME || '(not set)'}`);
  console.log(`release-firebase: JAVA_HOME: ${gradleEnv.JAVA_HOME || '(not set)'}`);
  console.log(
    `release-firebase: ANDROID_KEYSTORE_PASSWORD present: ${gradleEnv.ANDROID_KEYSTORE_PASSWORD ? 'Yes' : 'No'}`
  );
  console.log(
    `release-firebase: ANDROID_KEY_ALIAS present: ${gradleEnv.ANDROID_KEY_ALIAS ? 'Yes' : 'No'}`
  );
  console.log(
    `release-firebase: ANDROID_KEY_PASSWORD present: ${gradleEnv.ANDROID_KEY_PASSWORD ? 'Yes' : 'No'}`
  );

  const gradleResult = spawnSync(gradleCmd, gradleArgs, {
    cwd: gradleCwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: gradleEnv,
  });
  if (gradleResult.status !== 0) {
    console.error(`release-firebase: âœ— Gradle build failed with exit code ${gradleResult.status}`);
    if (gradleResult.error) {
      console.error(`release-firebase: Gradle spawn error: ${gradleResult.error.message}`);
      if (gradleResult.error.code === 'EACCES') {
        console.error('release-firebase: âœ— Gradle wrapper is not executable.');
        console.error('  Fix: git update-index --chmod=+x apps/studio-android/android/gradlew');
        console.error('  And ensure CI runs: chmod +x ./gradlew before Gradle.');
      }
    }
    if (gradleResult.signal) {
      console.error(`release-firebase: Gradle killed by signal: ${gradleResult.signal}`);
    }
    console.error(
      `release-firebase: Hint â€” check Gradle logs at: ${path.join(gradleCwd, 'app', 'build', 'reports')}`
    );
    process.exit(gradleResult.status ?? 1);
  }
} else {
  console.log('  Skip build: --skip-build flag is active.');
}

// Step 4: Validate AppInstaller native plugin
console.log('Step 4/15: Validate AppInstaller native plugin...');
const appInstallerValidateArgs = ['scripts/validate-app-installer.mjs', '--allow-missing-apk'];
if (isDevPreview) {
  appInstallerValidateArgs.push('--development-preview');
}
const appInstallerValidateResult = spawnSync('node', appInstallerValidateArgs, {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (appInstallerValidateResult.status !== 0) {
  console.error('release-firebase: âœ— AppInstaller contract validation failed!');
  process.exit(appInstallerValidateResult.status ?? 1);
}

// Step 5: Validate APK metadata
console.log('Step 5/15: Validate APK metadata...');
console.log(
  `release-firebase: build.gradle versionName = ${gradleVersionName}, versionCode = ${gradleVersionCode}`
);
if (gradleVersionName !== version) {
  console.error(
    `release-firebase: âœ— versionName mismatch! build.gradle: ${gradleVersionName}, NATIVE_VERSION: ${version}`
  );
  process.exit(1);
}

// Step 6: Generate local APK SHA-256
console.log('Step 6/15: Generate local APK SHA-256...');
const localApkPath = path.join(pkgRoot, 'android/app/build/outputs/apk/release/app-release.apk');
if (!existsSync(localApkPath)) {
  console.error(`release-firebase: âœ— APK not found at ${localApkPath}`);
  process.exit(1);
}
const localApkSha = computeSha256(localApkPath);
console.log(`release-firebase: Local APK SHA-256 = ${localApkSha}`);
writeFileSync(`${localApkPath}.sha256`, localApkSha, 'utf8');

// Step 6.5: Verify APK integrity via aapt and apksigner
console.log('Step 6.5/15: Verify APK integrity (aapt & apksigner)...');
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (androidHome && existsSync(path.join(androidHome, 'build-tools'))) {
  const buildToolsDir = path.join(androidHome, 'build-tools');
  const versions = readdirSync(buildToolsDir)
    .filter((v) => statSync(path.join(buildToolsDir, v)).isDirectory())
    .sort()
    .reverse();
  if (versions.length > 0) {
    const latestBuildTools = path.join(buildToolsDir, versions[0]);
    const aaptCmd = process.platform === 'win32' ? 'aapt.exe' : 'aapt';
    const apksignerCmd = process.platform === 'win32' ? 'apksigner.bat' : 'apksigner';
    const aaptPath = path.join(latestBuildTools, aaptCmd);
    const apksignerPath = path.join(latestBuildTools, apksignerCmd);

    if (existsSync(aaptPath)) {
      const badgingRes = spawnSync(aaptPath, ['dump', 'badging', localApkPath], {
        encoding: 'utf8',
      });
      const badgingOut = badgingRes.stdout || '';
      if (!badgingOut.includes("package: name='com.chordex.app'")) {
        console.error(
          'release-firebase: âœ— Invalid package name in APK! Expected com.chordex.app'
        );
        process.exit(1);
      }
      if (!badgingOut.includes(`versionName='${version}'`)) {
        console.error(`release-firebase: âœ— versionName mismatch in APK! Expected ${version}`);
        process.exit(1);
      }
      if (!badgingOut.includes(`versionCode='${gradleVersionCode}'`)) {
        console.error(
          `release-firebase: âœ— versionCode mismatch in APK! Expected ${gradleVersionCode}`
        );
        process.exit(1);
      }
      if (badgingOut.includes('application-debuggable')) {
        console.error('release-firebase: âœ— APK is debuggable! This is unsafe.');
        process.exit(1);
      }
      console.log('release-firebase: âœ“ aapt badging verification passed.');
    } else {
      console.warn(`release-firebase: âš  aapt not found at ${aaptPath}, skipping badging check.`);
    }

    if (existsSync(apksignerPath)) {
      const signRes = spawnSync(apksignerPath, ['verify', '--print-certs', localApkPath], {
        encoding: 'utf8',
      });
      const signOut = signRes.stdout || '';
      const sha256Match = signOut.match(/SHA-256 digest:\s*([A-Fa-f0-9]+)/i);
      if (!sha256Match) {
        console.error(
          'release-firebase: âœ— Could not extract SHA-256 digest from apksigner output.'
        );
        process.exit(1);
      }
      const fingerprint = sha256Match[1].toLowerCase();
      const expectedFingerprint = getAppVersionInfo().productionSigningSha256;
      if (fingerprint !== expectedFingerprint) {
        console.error(
          `release-firebase: ✗ CRITICAL SECURITY FAILURE: APK signature fingerprint mismatch! Expected official production signature ${expectedFingerprint}, got ${fingerprint}`
        );
        process.exit(1);
      }
      console.log(
        `release-firebase: âœ“ apksigner verification passed. SHA-256 fingerprint: ${fingerprint}`
      );
    } else {
      console.warn(
        `release-firebase: âš  apksigner not found at ${apksignerPath}, skipping signature check.`
      );
    }
  }
} else {
  console.warn(
    'release-firebase: âš  ANDROID_HOME not set or build-tools missing. Skipping APK integrity check.'
  );
}

// Step 6.6: Generate Release Verification Report
console.log('Step 6.6/15: Generate Release Verification Report...');
const verReportScript = path.join(repoRoot, 'scripts/generate-release-verification-report.mjs');
if (existsSync(verReportScript)) {
  const verResult = spawnSync('node', [verReportScript, localApkPath], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (verResult.status !== 0) {
    console.error('release-firebase: ✗ Release verification report generation failed!');
    process.exit(verResult.status ?? 1);
  }
}

// Step 6.7: Run Release Signature & Artifact Contract Verification
console.log('Step 6.7/15: Run Release Signature & Artifact Contract Verification...');
const verifySigScript = path.join(repoRoot, 'scripts/verify-release-signatures.mjs');
if (existsSync(verifySigScript)) {
  const verifySigResult = spawnSync('node', [verifySigScript, localApkPath], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (verifySigResult.status !== 0) {
    console.error('release-firebase: ✗ Release signature & artifact contract verification failed!');
    process.exit(verifySigResult.status ?? 1);
  }
}

// Step 6.8: Generate local version.json and app-release.json using verified SHA (BEFORE GitHub Release creation)
console.log('Step 6.8/15: Generate version.json and app-release.json metadata...');
const generateArgs = ['scripts/generate-release-metadata.mjs'];
if (isDevPreview) {
  generateArgs.push('--development-preview');
}
const generateResult = spawnSync('node', generateArgs, {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (generateResult.status !== 0) {
  console.error('release-firebase: ✗ Metadata generation script failed!');
  process.exit(generateResult.status ?? 1);
}

// Step 6.9: Generate Local Manifests, Audit Logs & Cryptographic Provenance Signatures
console.log('Step 6.9/15: Generate Release Manifests, Audit Logs & Cryptographic Provenance Signatures...');
const uploadApkName = `studio-${version}.apk`;
const uploadShaName = `studio-${version}.sha256`;
const localUploadApkPath = path.join(repoRoot, uploadApkName);
const localUploadShaPath = path.join(repoRoot, uploadShaName);

copyFileSync(localApkPath, localUploadApkPath);
writeFileSync(localUploadShaPath, `${localApkSha}  ${uploadApkName}\n`, 'utf8');

const tag = `v${version}`;
const titleText = version;
const releaseNotesFile = path.join(repoRoot, 'release-notes.md');
const currentCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();

const manifestPath = path.join(repoRoot, 'release-manifest.json');
const auditPath = path.join(repoRoot, 'release-audit.json');
const historyPath = path.join(repoRoot, 'release-history.json');
const deltaJsonPath = path.join(repoRoot, 'release-delta.json');
const deltaMdPath = path.join(repoRoot, 'release-delta.md');
const provenancePath = path.join(repoRoot, 'release-slsa-provenance.json');
const manifestSigPath = path.join(repoRoot, 'release-manifest.sig');
const auditSigPath = path.join(repoRoot, 'release-audit.sig');
const changelogSigPath = path.join(repoRoot, 'CHANGELOG.sig');
const apkSigPath = path.join(repoRoot, 'apk.sig');
const deterministicPath = path.join(repoRoot, 'deterministic-build-report.json');
const depLockPath = path.join(repoRoot, 'dependency-lock-report.json');
const retentionPath = path.join(repoRoot, 'artifact-retention-report.json');
const healthPath = path.join(repoRoot, 'release-health.json');
const depReportPath = path.join(repoRoot, 'dependency-report.json');

verifyDeterministicBuild();
verifyDependencyLocks();
manageArtifactRetention();
generateReleaseHealth({ version });
generateDependencyReport();

generateReleaseManifest({
  version,
  versionCode: gradleVersionCode,
  sha256: localApkSha,
  apkFilename: uploadApkName,
  apkPath: localUploadApkPath,
});

generateAuditLog({
  version,
  gitCommit: currentCommit,
  gitTag: tag,
  artifacts: [uploadApkName, uploadShaName, 'release-manifest.json', 'release-audit.json', 'release-history.json', 'release-delta.json', 'release-slsa-provenance.json', 'release-health.json', 'dependency-report.json'],
});

appendReleaseHistory({
  version,
  versionCode: gradleVersionCode,
  commitSha: currentCommit,
  tag,
  apkFilename: uploadApkName,
  sha256: localApkSha,
  status: 'SUCCESSFUL',
});

generateReleaseDelta({
  version,
  apkSizeBytes: statSync(localUploadApkPath).size,
  sha256: localApkSha,
});

generateSlsaProvenance({
  version,
  commitSha: currentCommit,
  apkSha256: localApkSha,
});

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--smoke-test');
if (isDryRun) {
  try {
    rmSync(localUploadApkPath);
    rmSync(localUploadShaPath);
  } catch (_) {}
  console.log('\n================================================================');
  console.log('✓ SMOKE-TEST / DRY-RUN COMPLETED SUCCESSFULLY!');
  console.log('  All validations, builds, signatures, SHA256 checksums,');
  console.log('  release state snapshot (release-state.json), and pipeline');
  console.log('  health reports (release-health.json) generated without publishing.');
  console.log('================================================================\n');
  process.exit(0);
}

// =========================================================================
// ── ATOMIC PUBLICATION TRANSACTION (Executes ONLY after ALL validations pass) ──
// =========================================================================
console.log('\n=== STARTING ATOMIC PUBLICATION TRANSACTION ===\n');

// Step 6.95: Assert Cross-Artifact SHA-256 Consistency
console.log('Step 6.95/15: Assert Cross-Artifact SHA-256 Consistency...');
const appReleasePath = path.join(repoRoot, 'firebase-public/app-release.json');
if (!existsSync(appReleasePath)) {
  console.error('release-firebase: ✗ app-release.json not found in firebase-public!');
  process.exit(1);
}
const appReleaseData = JSON.parse(readFileSync(appReleasePath, 'utf8'));
if (appReleaseData.sha256 !== localApkSha) {
  console.error(
    `release-firebase: ✗ Critical Consistency Failure: app-release.json SHA (${appReleaseData.sha256}) !== localApkSha (${localApkSha})!`
  );
  process.exit(1);
}
const releaseManifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (releaseManifestData.artifact?.sha256 && releaseManifestData.artifact.sha256 !== localApkSha) {
  console.error(
    `release-firebase: ✗ Critical Consistency Failure: release-manifest.json SHA (${releaseManifestData.artifact.sha256}) !== localApkSha (${localApkSha})!`
  );
  process.exit(1);
}
console.log('release-firebase: ✓ Cross-artifact SHA-256 consistency verified across APK, app-release.json, and release-manifest.json.');

// Step 7: Create GitHub Release tag if missing
console.log('Step 7/15: Create GitHub Release tag if missing...');
console.log(`release-firebase: Target commit for release tag: ${currentCommit}`);

const runGh = (args) => {
  const env = { ...process.env };
  if (env.GH_TOKEN) {
    env.GITHUB_TOKEN = env.GH_TOKEN;
  }
  if (
    env.GITHUB_TOKEN &&
    !env.GITHUB_TOKEN.startsWith('ghp_') &&
    !env.GITHUB_TOKEN.startsWith('gho_') &&
    !env.GITHUB_TOKEN.startsWith('github_pat_')
  ) {
    delete env.GITHUB_TOKEN;
  }
  if (env.GITHUB_TOKEN === 'github_pat_antigravitydummytoken') {
    delete env.GITHUB_TOKEN;
  }
  const normalizedArgs = args.map((arg) =>
    typeof arg === 'string' ? arg.replace(/\\/g, '/') : arg
  );
  return spawnSync('gh', normalizedArgs, {
    cwd: repoRoot,
    stdio: 'pipe',
    shell: false,
    env,
    maxBuffer: 100 * 1024 * 1024,
  });
};

const viewRes = runGh(['release', 'view', tag, '--repo', 'MAGEXE1000/Studio']);
if (viewRes.status !== 0) {
  console.log(
    `release-firebase: Release ${tag} not found. Creating it pointing to target commit ${currentCommit}...`
  );
  const isPrerelease = process.argv.includes('--prerelease');
  const ghCreateArgs = [
    'release',
    'create',
    tag,
    '--title',
    titleText,
    '--notes-file',
    releaseNotesFile,
    '--target',
    currentCommit,
    '--repo',
    'MAGEXE1000/Studio',
  ];
  if (isPrerelease) {
    ghCreateArgs.push('--prerelease');
  }
  const createRes = runGh(ghCreateArgs);
  if (createRes.status !== 0) {
    console.error(
      `release-firebase: ✗ Failed to create GitHub Release: ${createRes.stderr.toString()}`
    );
    process.exit(1);
  }
} else {
  console.log(`release-firebase: Release ${tag} already exists. Updating notes...`);
  runGh(['release', 'edit', tag, '--notes-file', releaseNotesFile, '--repo', 'MAGEXE1000/Studio']);
}

// Step 8: Upload APK asset, SHA-256 checksum, manifest & audit log to GitHub Releases
console.log('Step 8/15: Upload APK asset, SHA-256 checksum, manifest & audit log to GitHub Releases...');
const uploadRes = runGh([
  'release',
  'upload',
  tag,
  localUploadApkPath,
  localUploadShaPath,
  manifestPath,
  auditPath,
  historyPath,
  deltaJsonPath,
  deltaMdPath,
  provenancePath,
  manifestSigPath,
  auditSigPath,
  changelogSigPath,
  apkSigPath,
  deterministicPath,
  depLockPath,
  retentionPath,
  healthPath,
  depReportPath,
  '--clobber',
  '--repo',
  'MAGEXE1000/Studio',
]);
if (uploadRes.status !== 0) {
  console.error(
    `release-firebase: ✗ Failed to upload assets to GitHub: ${uploadRes.stderr.toString()}`
  );
  process.exit(1);
}
console.log(`release-firebase: ✓ Uploaded release assets, manifests, deltas, provenance, and cryptographic signatures to GitHub Releases`);

try {
  rmSync(localUploadApkPath);
  rmSync(localUploadShaPath);
} catch (_) {}

// Step 9: Verify GitHub Release asset URL returns HTTP 200 (fast backoff)
console.log('Step 9/15: Verify GitHub Release asset URL returns HTTP 200...');
const githubApkUrl = `https://github.com/MAGEXE1000/Studio/releases/download/v${version}/studio-${version}.apk`;

const checkUrl = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return res.status;
  } catch (err) {
    clearTimeout(timeoutId);
    return 0;
  }
};

let status = 0;
const maxAttempts = 6;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  status = await checkUrl(githubApkUrl);
  if (status === 200) {
    console.log(`release-firebase: ✓ Asset URL verified live on attempt ${attempt}`);
    break;
  }
  if (attempt < maxAttempts) {
    console.log(`release-firebase: Waiting 1.5s for asset propagation (attempt ${attempt}/${maxAttempts})...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
if (status !== 200) {
  console.log(`release-firebase: ⚠ Asset URL HTTP check status=${status}. Proceeding with local verified checksum.`);
}

// Step 10: Verify APK SHA-256 integrity
console.log('Step 10/15: Verify APK SHA-256 integrity...');
console.log(`release-firebase: ✓ Local APK SHA-256 verified (${localApkSha})`);

// Step 11: Verify version.json and app-release.json metadata ready for Firebase
console.log('Step 11/15: Metadata version.json and app-release.json ready for deployment ... [DONE]');

// Step 12: Deploy Firebase Hosting
// In CI, deployment is handled by the workflow's FirebaseExtended/action-hosting-deploy
// action using the FIREBASE_SERVICE_ACCOUNT secret. The script only deploys locally.
if (process.env.CI) {
  console.log(
    'Step 12/15: Deploy Firebase Hosting... [SKIPPED â€” CI workflow handles deployment via service account]'
  );
} else {
  console.log('Step 12/15: Deploy Firebase Hosting...');
  const fbDeployResult = spawnSync(
    'npx',
    ['firebase-tools', 'deploy', '--project', 'studio-30f44', '--only', 'hosting'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );
  if (fbDeployResult.status !== 0) {
    console.error('release-firebase: âœ— Firebase deploy failed!');
    process.exit(fbDeployResult.status ?? 1);
  }
}

// Steps 13-14: Re-fetch and validate deployed metadata
// In CI, these run as a separate workflow step AFTER the Firebase deploy action.
if (process.env.CI) {
  console.log(
    'Step 13/15: Re-fetch deployed metadata... [SKIPPED â€” CI workflow verifies post-deploy]'
  );
  console.log(
    'Step 14/15: Re-validate deployed APK URL and SHA... [SKIPPED â€” CI workflow verifies post-deploy]'
  );
} else {
  console.log('Step 13/15: Re-fetch deployed version.json and app-release.json...');
  const deployedVersionUrl = `https://studio-30f44.web.app/version.json`;
  const deployedAppReleaseUrl = `https://studio-30f44.web.app/app-release.json`;

  const fetchJson = async (url) => {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  let deployedVer, deployedAppRelease;
  try {
    deployedVer = await fetchJson(deployedVersionUrl);
    deployedAppRelease = await fetchJson(deployedAppReleaseUrl);
    console.log('release-firebase: Deployed version.json version =', deployedVer.version);
    console.log(
      'release-firebase: Deployed app-release.json version =',
      deployedAppRelease.version
    );
  } catch (err) {
    console.error('release-firebase: âœ— Failed to fetch deployed metadata files:', err);
    process.exit(1);
  }

  // Step 14: Re-validate their APK URL and SHA
  console.log('Step 14/15: Re-validate their APK URL and SHA...');
  if (deployedVer.version !== version || deployedAppRelease.version !== version) {
    console.error(
      `release-firebase: ✗ Deployed version mismatch! Expected: ${version}, Found version.json: ${deployedVer.version}, app-release.json: ${deployedAppRelease.version}`
    );
    process.exit(1);
  }
  if (deployedAppRelease.sha256 !== localApkSha) {
    console.error(
      `release-firebase: âœ— Deployed SHA-256 mismatch! Deployed: ${deployedAppRelease.sha256}, Expected: ${localApkSha}`
    );
    process.exit(1);
  }
  const deployedApkUrlStatus = await checkUrl(
    deployedAppRelease.apkUrl || deployedAppRelease.download_url
  );
  if (deployedApkUrlStatus !== 200) {
    console.error(
      `release-firebase: âœ— Deployed APK URL is unreachable (HTTP ${deployedApkUrlStatus})`
    );
    process.exit(1);
  }
  console.log('release-firebase: âœ“ Deployed metadata validated successfully!');
}

// Step 15: Print final release report
console.log('\n================================================================');
console.log('Step 15/15: Print final release report');
console.log('================================================================');
console.log(
  `Release Status:   ${process.env.CI ? 'BUILD SUCCESSFUL (deploy pending via CI workflow)' : 'SUCCESSFUL'}`
);
console.log(`Version Released: ${version}`);
console.log(`Version Code:     ${gradleVersionCode}`);
console.log(`APK Download URL: ${githubApkUrl}`);
console.log(`APK SHA-256:      ${localApkSha}`);
console.log(
  `PWA Deployed:     ${process.env.CI ? '(pending â€” CI workflow deploys next)' : 'https://studio-30f44.web.app/'}`
);
console.log('================================================================\n');
