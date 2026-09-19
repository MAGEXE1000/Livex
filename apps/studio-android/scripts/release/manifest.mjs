import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { fetchFirebaseReleaseMetadata } from './firebase.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const appRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'release-manifest.json');
const apkPath = path.join(appRoot, 'android/app/build/outputs/apk/release/app-release.apk');
const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');

export async function generateReleaseManifest(options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;
  const execFn = options.execFn || execSync;

  let currentVersion = '4.3.54';
  if (fs.existsSync(appVersionPath)) {
    const src = fs.readFileSync(appVersionPath, 'utf8');
    const match = src.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) currentVersion = match[1];
  }

  let commitHash = 'unknown';
  try {
    commitHash = execFn('git rev-parse HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (_) {}

  let apkSha256 = null;
  let apkSize = 0;
  if (fs.existsSync(apkPath)) {
    const fileBuffer = fs.readFileSync(apkPath);
    apkSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    apkSize = fileBuffer.length;
  }

  const fbMeta = await fetchFirebaseReleaseMetadata({ fetchFn });
  const firebaseVersion = fbMeta.ok ? fbMeta.version : null;

  const manifest = {
    version: currentVersion,
    versionCode: 40354,
    githubTag: `v${currentVersion}`,
    githubReleaseTitle: currentVersion,
    apkFilename: `studio-${currentVersion}.apk`,
    apkSha256: apkSha256 || 'N/A',
    apkSize,
    buildTimestamp: new Date().toISOString(),
    commit: commitHash,
    firebaseVersion: firebaseVersion || 'N/A',
    otaVersion: currentVersion,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export function readReleaseManifest() {
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_) {}
  }
  return null;
}
