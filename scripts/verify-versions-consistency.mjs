import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Run Repository-Wide Reference, Navigation Integrity, and Launcher Icon Auditors first
execSync('node scripts/verify-all-references.mjs', { cwd: repoRoot, stdio: 'inherit' });
execSync('node scripts/verify-navigation-integrity.mjs', { cwd: repoRoot, stdio: 'inherit' });
execSync('node scripts/sync-launcher-icons.mjs --verify', { cwd: repoRoot, stdio: 'inherit' });

const paths = {
  rootPkg: path.join(repoRoot, 'package.json'),
  webPkg: path.join(repoRoot, 'apps/studio-web/package.json'),
  androidPkg: path.join(repoRoot, 'apps/studio-android/package.json'),
  corePkg: path.join(repoRoot, 'packages/studio-core/package.json'),
  uiSharedPkg: path.join(repoRoot, 'packages/ui-shared/package.json'),
  uiAndroidPkg: path.join(repoRoot, 'packages/ui-android/package.json'),
  uiWebPkg: path.join(repoRoot, 'packages/ui-web/package.json'),
  appVersionTs: path.join(repoRoot, 'packages/studio-core/src/lib/startup/appVersion.ts'),
  buildGradle: path.join(repoRoot, 'apps/studio-android/android/app/build.gradle'),
  changelog: path.join(repoRoot, 'CHANGELOG.md'),
  releaseNotes: path.join(repoRoot, 'release-notes.md'),
  versionJson: path.join(repoRoot, 'apps/studio-android/public/version.json'),
  webVersionJson: path.join(repoRoot, 'apps/studio-web/public/version.json'),
  firebaseVersionJson: path.join(repoRoot, 'firebase-public/version.json'),
  appReleaseJson: path.join(repoRoot, 'apps/studio-android/public/app-release.json'),
  releaseManifest: path.join(repoRoot, 'release-manifest.json'),
};

console.log('=== RUNNING MULTI-MANIFEST VERSION CONSISTENCY CHECK ===');

// 1. Single Source of Truth: root package.json
if (!fs.existsSync(paths.rootPkg)) {
  console.error(`::error::VERSION CONSISTENCY FAILURE: Single Source of Truth package.json not found!`);
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(paths.rootPkg, 'utf8'));
const EXPECTED_VERSION = rootPkg.version;

if (!EXPECTED_VERSION || typeof EXPECTED_VERSION !== 'string') {
  console.error(`::error::VERSION CONSISTENCY FAILURE: Invalid version in root package.json: ${EXPECTED_VERSION}`);
  process.exit(1);
}

const semverMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(EXPECTED_VERSION.trim());
if (!semverMatch) {
  console.error(`::error::VERSION CONSISTENCY FAILURE: Expected Version "${EXPECTED_VERSION}" is not valid strict SemVer (X.Y.Z)`);
  process.exit(1);
}

const major = parseInt(semverMatch[1], 10);
const minor = parseInt(semverMatch[2], 10);
const patch = parseInt(semverMatch[3], 10);
const EXPECTED_VERSION_CODE = major * 10000 + minor * 100 + patch;

console.log(`Single Source of Truth Version: ${EXPECTED_VERSION} (Expected versionCode: ${EXPECTED_VERSION_CODE})`);

function assertVersion(filePath, detectedVersion, label, isVersionCode = false) {
  const expected = isVersionCode ? EXPECTED_VERSION_CODE : EXPECTED_VERSION;
  if (detectedVersion !== expected) {
    console.error(`::error::VERSION CONSISTENCY FAILURE: Artifact version mismatch detected!`);
    console.error(`  Expected:         ${expected}`);
    console.error(`  Detected:         ${detectedVersion}`);
    console.error(`  Source File:      ${filePath}`);
    console.error(`  Label:            ${label}`);
    console.error(`  \x1b[33mSuggested Fix:    Run \`node scripts/sync-versions.mjs\` to automatically resolve mismatches.\x1b[0m`);
    process.exit(1);
  }
  console.log(`✓ ${label} matches ${expected} (${filePath})`);
}

// 3. Web package.json
if (fs.existsSync(paths.webPkg)) {
  const webPkg = JSON.parse(fs.readFileSync(paths.webPkg, 'utf8'));
  assertVersion(paths.webPkg, webPkg.version, 'apps/studio-web/package.json');
}

// 4. Android package.json
if (fs.existsSync(paths.androidPkg)) {
  const androidPkg = JSON.parse(fs.readFileSync(paths.androidPkg, 'utf8'));
  assertVersion(paths.androidPkg, androidPkg.version, 'apps/studio-android/package.json');
}

// 4b. Core & Shared Packages
const internalPackages = [
  { path: paths.corePkg, label: 'packages/studio-core/package.json' },
  { path: paths.uiSharedPkg, label: 'packages/ui-shared/package.json' },
  { path: paths.uiAndroidPkg, label: 'packages/ui-android/package.json' },
  { path: paths.uiWebPkg, label: 'packages/ui-web/package.json' },
];
for (const pkg of internalPackages) {
  if (fs.existsSync(pkg.path)) {
    const data = JSON.parse(fs.readFileSync(pkg.path, 'utf8'));
    assertVersion(pkg.path, data.version, pkg.label);
  }
}

// 5. appVersion.ts
if (fs.existsSync(paths.appVersionTs)) {
  const content = fs.readFileSync(paths.appVersionTs, 'utf8');
  const nativeMatch = content.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  const nativeCodeMatch = content.match(/export\s+const\s+NATIVE_VERSION_CODE\s*=\s*(\d+)/);
  const webMatch = content.match(/export\s+const\s+WEB_VERSION\s*=\s*['"]([^'"]+)['"]/);

  if (!nativeMatch || !nativeCodeMatch || !webMatch) {
    console.error(`::error::VERSION CONSISTENCY FAILURE: Could not parse versions in ${paths.appVersionTs}`);
    process.exit(1);
  }

  assertVersion(paths.appVersionTs, nativeMatch[1], 'appVersion.ts NATIVE_VERSION');
  assertVersion(paths.appVersionTs, parseInt(nativeCodeMatch[1], 10), 'appVersion.ts NATIVE_VERSION_CODE', true);
  assertVersion(paths.appVersionTs, webMatch[1], 'appVersion.ts WEB_VERSION');
}

// 6. build.gradle
if (fs.existsSync(paths.buildGradle)) {
  const gradleSrc = fs.readFileSync(paths.buildGradle, 'utf8');
  const nameMatch = gradleSrc.match(/versionName\s+["']([^"']+)["']/);
  const codeMatch = gradleSrc.match(/versionCode\s+(\d+)/);

  if (!nameMatch || !codeMatch) {
    console.error(`::error::VERSION CONSISTENCY FAILURE: Could not parse versionName/versionCode in ${paths.buildGradle}`);
    process.exit(1);
  }

  assertVersion(paths.buildGradle, nameMatch[1], 'build.gradle versionName');
  assertVersion(paths.buildGradle, parseInt(codeMatch[1], 10), 'build.gradle versionCode', true);
}

// 7. CHANGELOG.md
if (fs.existsSync(paths.changelog)) {
  const changelogText = fs.readFileSync(paths.changelog, 'utf8');
  const changelogRegex = new RegExp(`^(?:#|##)\\s+(?:Version\\s+)?v?${EXPECTED_VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  if (!changelogRegex.test(changelogText)) {
    console.error(`::error::VERSION CONSISTENCY FAILURE: CHANGELOG.md is missing section for version ${EXPECTED_VERSION}!`);
    process.exit(1);
  }
  console.log(`✓ CHANGELOG.md section for v${EXPECTED_VERSION} verified.`);
}

// 8. release-notes.md (if present)
if (fs.existsSync(paths.releaseNotes)) {
  const rnText = fs.readFileSync(paths.releaseNotes, 'utf8');
  const rnMatch = rnText.match(/Version\s+(\d+\.\d+\.\d+)/i);
  if (rnMatch && rnMatch[1] !== EXPECTED_VERSION) {
    assertVersion(paths.releaseNotes, rnMatch[1], 'release-notes.md');
  }
}

// 9. version.json (if present)
if (fs.existsSync(paths.versionJson)) {
  const vj = JSON.parse(fs.readFileSync(paths.versionJson, 'utf8'));
  assertVersion(paths.versionJson, vj.version || vj.versionName, 'public/version.json');
}

// 9b. firebase-public/version.json (if present)
if (fs.existsSync(paths.firebaseVersionJson)) {
  const fvj = JSON.parse(fs.readFileSync(paths.firebaseVersionJson, 'utf8'));
  assertVersion(paths.firebaseVersionJson, fvj.version || fvj.versionName, 'firebase-public/version.json');
}

// 10. app-release.json (if present)
if (fs.existsSync(paths.appReleaseJson)) {
  const arj = JSON.parse(fs.readFileSync(paths.appReleaseJson, 'utf8'));
  assertVersion(paths.appReleaseJson, arj.version || arj.versionName, 'public/app-release.json');
}

// 11. release-manifest.json (if present)
if (fs.existsSync(paths.releaseManifest)) {
  const rm = JSON.parse(fs.readFileSync(paths.releaseManifest, 'utf8'));
  assertVersion(paths.releaseManifest, rm.releaseVersion || rm.versionName || rm.version, 'release-manifest.json');
}

// 12. Production Capacitor Config Isolation Guard (Fail-Closed)
const capAssetConfigPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/assets/capacitor.config.json');
if (fs.existsSync(capAssetConfigPath)) {
  const capConfig = JSON.parse(fs.readFileSync(capAssetConfigPath, 'utf8'));
  if (capConfig.server?.url) {
    console.error(`::error::PRODUCTION ISOLATION FAILURE: Development server.url detected in production Capacitor assets: ${capConfig.server.url}`);
    console.error(`  Source: ${capAssetConfigPath}`);
    console.error(`  \x1b[33mFix: Run \`pnpm --filter @workspace/studio-android exec cap copy android\` without CAPACITOR_SERVER_URL set.\x1b[0m`);
    process.exit(1);
  }
  console.log(`✓ Production Capacitor assets clean (no dev server.url present).`);
}

console.log('\x1b[32m=== MULTI-MANIFEST VERSION CONSISTENCY PASSED CLEANLY ===\x1b[0m');
process.exit(0);
