import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getAppVersionInfo } from '../../../scripts/parse-version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');

const releaseType = 'apk';
const isDevPreview =
  process.argv.includes('--development-preview') &&
  process.env.STUDIO_PRODUCTION_RELEASE !== 'true';

console.log('generate-release-metadata: → Running AppInstaller contract validation...');
const args = ['scripts/validate-app-installer.mjs', '--allow-missing-apk'];
if (isDevPreview) {
  args.push('--development-preview');
}
const validateResult = spawnSync('node', args, {
  cwd: appRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (validateResult.status !== 0) {
  const status = validateResult.status;
  if (status === 10) {
    console.error('generate-release-metadata: âœ— AppInstaller contract validation failed!');
  } else if (status === 11) {
    console.error('generate-release-metadata: âœ— Path or temporary file setup failed!');
  } else if (status === 12) {
    console.error('generate-release-metadata: âœ— Previous APK download failed!');
  } else if (status === 13) {
    console.error(
      'generate-release-metadata: âœ— Release validation failed (e.g. versionCode, package, or signatures)!'
    );
  } else {
    console.error(
      `generate-release-metadata: âœ— Validation script failed with exit code ${status}`
    );
  }
  process.exit(status ?? 1);
}

const versionJsonPath = path.join(repoRoot, 'firebase-public/version.json');
const appReleaseJsonPath = path.join(repoRoot, 'firebase-public/app-release.json');

// Get version from appVersion.ts using parse-version utility
const versionInfo = getAppVersionInfo();
const version = versionInfo.nativeVersion;
const webVersion = versionInfo.webVersion;

// Function to extract release notes directly from CHANGELOG.md for the target version
function parseChangelogForVersion(targetVersion) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return null;

  const rawText = fs.readFileSync(changelogPath, 'utf8');
  const lines = rawText.split(/\r?\n/);
  let inSection = false;
  const sectionLines = [];

  for (const rawLine of lines) {
    const isHeader = rawLine.match(/^(?:#|##)\s+(?:Version\s+)?v?(\d+\.\d+\.\d+)/i);
    if (isHeader) {
      if (inSection) break;
      if (isHeader[1] === targetVersion) {
        inSection = true;
        continue;
      }
    }
    if (inSection) {
      sectionLines.push(rawLine);
    }
  }

  if (!inSection || sectionLines.length === 0) return null;

  const categories = { added: [], improved: [], fixed: [], changed: [] };
  let currentCategory = null;
  const flatBullets = [];

  for (const rawLine of sectionLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const hMatch = line.match(/^###\s+(Added|Improved|Fixed|Changes|Bug\s*Fixes|Fixes|Changed)\b/i);
    if (hMatch) {
      const heading = hMatch[1].toLowerCase();
      if (heading.startsWith('add')) currentCategory = 'added';
      else if (heading.startsWith('improv')) currentCategory = 'improved';
      else if (heading.startsWith('fix') || heading.startsWith('bug')) currentCategory = 'fixed';
      else if (heading.startsWith('change')) currentCategory = 'changed';
      else currentCategory = null;
      continue;
    }
    const bMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bMatch) {
      const bulletContent = bMatch[1].trim();
      if (currentCategory) categories[currentCategory].push(bulletContent);
      flatBullets.push(bulletContent);
    }
  }

  if (flatBullets.length === 0) return null;

  return {
    changelog: flatBullets.map((b) => `• ${b}`).join('\n'),
    releaseNotes: {
      added: categories.added.length > 0 ? categories.added : undefined,
      improved: categories.improved.length > 0 ? categories.improved : undefined,
      fixed: categories.fixed.length > 0 ? categories.fixed : undefined,
      changed: categories.changed.length > 0 ? categories.changed : undefined,
    },
  };
}

// Read changelog description and releaseNotes from temp notes JSON if it exists, otherwise from version.json or CHANGELOG.md
let description = `Release v${version}`;
let releaseNotes = undefined;
let loaded = false;
const tempNotesPath = path.join(appRoot, '.release-temp-notes.json');

if (fs.existsSync(tempNotesPath)) {
  try {
    const tempNotes = JSON.parse(fs.readFileSync(tempNotesPath, 'utf8'));
    if (tempNotes.changelog) {
      description = tempNotes.changelog;
    }
    if (tempNotes.releaseNotes) {
      releaseNotes = tempNotes.releaseNotes;
    }
    loaded = true;
    console.log(
      'generate-release-metadata: ✓ Loaded release notes from .release-temp-notes.json'
    );
  } catch (err) {
    console.warn('generate-release-metadata: ⚠ Could not parse .release-temp-notes.json', err);
  }
}

if (!loaded) {
  const localPath = path.join(appRoot, 'public/version.json');
  if (fs.existsSync(localPath)) {
    try {
      const localJson = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (localJson.version === version && localJson.changelog) {
        description = localJson.changelog;
        releaseNotes = localJson.releaseNotes;
        loaded = true;
        console.log(
          'generate-release-metadata: ✓ Loaded release notes from local public/version.json'
        );
      }
    } catch (err) {
      console.warn('generate-release-metadata: ⚠ Could not parse local public/version.json', err);
    }
  }
}

if (!loaded && fs.existsSync(versionJsonPath)) {
  try {
    const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (versionJson.version === version && versionJson.changelog) {
      description = versionJson.changelog;
      releaseNotes = versionJson.releaseNotes;
      loaded = true;
      console.log(
        'generate-release-metadata: ✓ Loaded release notes from firebase-public/version.json'
      );
    }
  } catch (err) {
    console.warn('generate-release-metadata: ⚠ Could not parse version.json', err);
  }
}

if (!loaded) {
  const fromChangelog = parseChangelogForVersion(version);
  if (fromChangelog) {
    description = fromChangelog.changelog;
    releaseNotes = fromChangelog.releaseNotes;
    loaded = true;
    console.log(
      `generate-release-metadata: ✓ Extracted canonical release notes for version ${version} directly from CHANGELOG.md`
    );
  }
}

// Validate that the description is not generic
if (
  description.toLowerCase() === `version ${version}`.toLowerCase() ||
  description.toLowerCase() === `release v${version}`.toLowerCase() ||
  description.toLowerCase() === `version: ${version}`.toLowerCase()
) {
  console.error(
    `\x1b[31mgenerate-release-metadata: âœ— Release blocked: version.json contains generic/placeholder changelog info. Add real release notes before publishing.\x1b[0m`
  );
  process.exit(1);
}

// Compute SHA-256 hash of APK and copy to Firebase Hosting mirror
const apkPath = path.join(appRoot, 'android/app/build/outputs/apk/release/app-release.apk');
let sha256 = '';
let apkSizeBytes = 0;

if (releaseType !== 'ota') {
  if (!fs.existsSync(apkPath)) {
    console.error(`generate-release-metadata: âœ— APK not found at ${apkPath}`);
    process.exit(1);
  }

  // Compute SHA-256 and size in bytes
  const fileBuffer = fs.readFileSync(apkPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  sha256 = hashSum.digest('hex');
  apkSizeBytes = fs.statSync(apkPath).size;
  console.log(
    `generate-release-metadata: Computed APK SHA-256 = ${sha256}, size = ${apkSizeBytes} bytes`
  );

  // Copy to Firebase Hosting paths
  try {
    const firebaseApkDir = path.join(repoRoot, 'firebase-public/apk');
    fs.mkdirSync(firebaseApkDir, { recursive: true });

    // Clean up old bin and apk files to prevent clutter on deployment
    if (fs.existsSync(firebaseApkDir)) {
      const files = fs.readdirSync(firebaseApkDir);
      for (const file of files) {
        if (file.endsWith('.bin') || file.endsWith('.apk')) {
          fs.unlinkSync(path.join(firebaseApkDir, file));
          console.log(`generate-release-metadata: Cleaned up old file: ${file}`);
        }
      }
    }

    const versionApkPath = path.join(firebaseApkDir, `studio-${version}.apk`);
    const latestApkPath = path.join(firebaseApkDir, 'studio-latest.apk');

    fs.copyFileSync(apkPath, versionApkPath);
    console.log(`generate-release-metadata: âœ“ Copied APK to ${versionApkPath}`);

    fs.copyFileSync(apkPath, latestApkPath);
    console.log(`generate-release-metadata: âœ“ Copied APK to ${latestApkPath}`);

    // Dynamic firebase.json update to add redirects and ignores for the apk files
    try {
      const firebaseJsonPath = path.join(repoRoot, 'firebase.json');
      if (fs.existsSync(firebaseJsonPath)) {
        const fbJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
        if (fbJson.hosting) {
          // 1. Ensure **/*.apk is in the ignore array
          fbJson.hosting.ignore = fbJson.hosting.ignore || [];
          if (!fbJson.hosting.ignore.includes('**/*.apk')) {
            fbJson.hosting.ignore.push('**/*.apk');
          }

          // 2. Ensure redirects array exists
          fbJson.hosting.redirects = fbJson.hosting.redirects || [];
          const redirects = fbJson.hosting.redirects;

          // 3. Update or insert livex-latest.apk & studio-latest.apk redirects
          const latestDest = `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`;
          const livexRule = {
            source: '/apk/livex-latest.apk',
            destination: latestDest,
            type: 302,
          };
          const studioRule = {
            source: '/apk/studio-latest.apk',
            destination: latestDest,
            type: 302,
          };

          const livexIdx = redirects.findIndex((r) => r.source === '/apk/livex-latest.apk');
          if (livexIdx !== -1) {
            redirects[livexIdx] = livexRule;
          } else {
            redirects.unshift(livexRule);
          }

          const latestIdx = redirects.findIndex((r) => r.source === '/apk/studio-latest.apk');
          if (latestIdx !== -1) {
            redirects[latestIdx] = studioRule;
          } else {
            redirects.unshift(studioRule);
          }

          // 4. Update or insert livex-:version.apk & studio-:version.apk redirect
          const livexVersionDest =
            'https://github.com/MAGEXE1000/Livex/releases/download/v:version/livex-:version.apk';
          const livexVersionIdx = redirects.findIndex((r) => r.source === '/apk/livex-:version.apk');
          const livexVersionRule = {
            source: '/apk/livex-:version.apk',
            destination: livexVersionDest,
            type: 302,
          };
          if (livexVersionIdx !== -1) {
            redirects[livexVersionIdx] = livexVersionRule;
          } else {
            redirects.push(livexVersionRule);
          }

          const versionDest =
            'https://github.com/MAGEXE1000/Livex/releases/download/v:version/studio-:version.apk';
          const versionIdx = redirects.findIndex((r) => r.source === '/apk/studio-:version.apk');
          const versionRule = {
            source: '/apk/studio-:version.apk',
            destination: versionDest,
            type: 302,
          };
          if (versionIdx !== -1) {
            redirects[versionIdx] = versionRule;
          } else {
            redirects.push(versionRule);
          }

          fs.writeFileSync(firebaseJsonPath, JSON.stringify(fbJson, null, 2) + '\n', 'utf8');
          console.log(
            `generate-release-metadata: âœ“ Dynamically updated redirects and ignores in firebase.json for version ${version}`
          );
        }
      }
    } catch (err) {
      console.warn(
        'generate-release-metadata: âš  Could not dynamically update firebase.json redirects/ignores:',
        err
      );
    }
  } catch (err) {
    console.error('generate-release-metadata: âœ— Failed to copy APK to Firebase Hosting:', err);
    process.exit(1);
  }
} else {
  if (fs.existsSync(apkPath)) {
    const fileBuffer = fs.readFileSync(apkPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    sha256 = hashSum.digest('hex');
    console.log(`generate-release-metadata: Computed APK SHA-256 = ${sha256}`);
  } else {
    console.warn(`generate-release-metadata: âš  APK not found at ${apkPath}`);
  }
}

// Parse versionCode from build.gradle
let versionCode = 0;
try {
  const gradlePath = path.join(appRoot, 'android/app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    const gradleSrc = fs.readFileSync(gradlePath, 'utf8');
    const codeMatch = gradleSrc.match(/versionCode\s+(\d+)/);
    if (codeMatch) {
      versionCode = parseInt(codeMatch[1], 10);
    }
  }
} catch (err) {
  console.warn(
    'generate-release-metadata: âš  Could not parse versionCode from build.gradle:',
    err
  );
}

// Get signature
const expectedSignature =
  process.env.EXPECTED_SIGNATURE_SHA256 ||
  getAppVersionInfo().productionSigningSha256;
let signatures = expectedSignature.replace(/:/g, '').toLowerCase();
const reinstallRequired = process.env.REINSTALL_REQUIRED === 'true';

if (reinstallRequired) {
  signatures = getAppVersionInfo().productionSigningSha256;
}

// Get previous required version code and version name to carry forward if releaseType is 'ota'
let requiredApkVersion = version;
let requiredVersionCode = versionCode;
let prevVersionCode = 0;
let prevData = null;

try {
  if (fs.existsSync(appReleaseJsonPath)) {
    prevData = JSON.parse(fs.readFileSync(appReleaseJsonPath, 'utf8'));
  } else {
    const liveRes = await fetch('https://studio-30f44.web.app/app-release.json');
    if (liveRes.ok) {
      prevData = await liveRes.json();
    }
  }

  if (prevData) {
    prevVersionCode = prevData.versionCode || 0;
    if (releaseType === 'ota') {
      requiredApkVersion =
        prevData.required_apk_version || prevData.requiredApkVersion || prevData.version;
      requiredVersionCode =
        prevData.required_version_code || prevData.requiredVersionCode || prevData.versionCode;
    }
  }
} catch (err) {
  console.warn(
    'generate-release-metadata: âš  Could not fetch previous required version code, defaulting to current version.',
    err
  );
}

const androidMetadata = {
  platform: 'android',
  version: version,
  versionName: version,
  version_code: versionCode,
  versionCode: versionCode,
  packageName: 'com.chordex.app',
  update_type: 'apk',
  updateType: 'apk',
  download_url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
  apkUrl: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
  manual_download_url: `https://studio-30f44.web.app/apk/studio-${version}.apk`,
  fallback_download_url: `https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk`,
  sha256: sha256,
  apkSha256: sha256,
  apkSizeBytes: apkSizeBytes,
  description: description,
  whatsNew: description,
  changelog: description,
  releaseNotes: releaseNotes,
  required_version_code: versionCode,
  requiredVersionCode: versionCode,
  signatures: signatures,
  installMode: reinstallRequired ? 'reinstall-required' : 'normal-update',
  reinstallRequired: reinstallRequired ? true : false,
  signatureChanged: reinstallRequired ? true : false,
};

if (reinstallRequired) {
  androidMetadata.previousSignatureSha256 =
    '58b9bf2de5064c62ac3ca181b5608fe135c6894a8359ff6588e19218cd384764';
  androidMetadata.newSignatureSha256 =
    getAppVersionInfo().productionSigningSha256;
}

// Get commit SHA and build timestamp dynamically from Git if possible
let gitCommitSha = 'unknown';
try {
  const gitRes = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  if (gitRes.status === 0) {
    gitCommitSha = gitRes.stdout.trim();
  }
} catch (e) {
  // ignore
}
const appVersionPath = path.join(repoRoot, 'packages/studio-core/src/lib/startup/appVersion.ts');
const appVersionSrc = fs.existsSync(appVersionPath) ? fs.readFileSync(appVersionPath, 'utf8') : '';

if (gitCommitSha === 'unknown') {
  const commitMatch = appVersionSrc.match(/export\s+const\s+APP_COMMIT_SHA\s*=\s*.*?['"]([^'"]+)['"]/);
  gitCommitSha = commitMatch ? commitMatch[1] : 'unknown';
}

let buildTimestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
const timestampMatch = appVersionSrc.match(/export\s+const\s+APP_BUILD_TIMESTAMP\s*=\s*.*?['"]([^'"]+)['"]/);
if (timestampMatch) {
  buildTimestamp = timestampMatch[1];
}

const webMetadata = {
  platform: 'web',
  version: webVersion,
  commit: gitCommitSha,
  releasedAt: buildTimestamp,
  buildTimestamp: buildTimestamp,
  updateMode: 'refresh',
  description: description,
  whatsNew: description,
  changelog: description,
  releaseNotes: releaseNotes,
  mandatory: false,
};

// Validate the constructed metadata before writing
if (prevVersionCode && prevData && prevData.version !== version && versionCode <= prevVersionCode) {
  if (isDevPreview) {
    console.warn(
      `generate-release-metadata: âš  Development warning: versionCode (${versionCode}) is not greater than previous versionCode (${prevVersionCode}). Proceeding since --development-preview is enabled.`
    );
    androidMetadata.developmentPreview = true;
  } else {
    console.error(
      `generate-release-metadata: âœ— versionCode (${versionCode}) must be greater than previous versionCode (${prevVersionCode})!`
    );
    process.exit(1);
  }
}

// Validate against GitHub Pages URLs in Android metadata
const urlRegex = /https?:\/\/[^\s"]+/g;
const jsonStr = JSON.stringify(androidMetadata);
const matches = jsonStr.match(urlRegex) || [];
for (const url of matches) {
  const cleanUrl = url.replace(/[",}]/g, '').trim();
  let hostname = '';
  try {
    hostname = new URL(cleanUrl).hostname;
  } catch (e) {}

  if (hostname === 'github.io' || hostname.endsWith('.github.io') || cleanUrl.includes('gh-pages')) {
    console.error(
      `\x1b[31mgenerate-release-metadata: âœ— GitHub Pages URL detected in release metadata: ${cleanUrl}\x1b[0m`
    );
    process.exit(1);
  }
  if (
    (hostname === 'github.com' || hostname.endsWith('.github.com')) &&
    !cleanUrl.startsWith('https://github.com/MAGEXE1000/Livex/releases/download/') &&
    !cleanUrl.startsWith('https://github.com/MAGEXE1000/Studio/releases/download/')
  ) {
    console.error(
      `\x1b[31mgenerate-release-metadata: âœ— Invalid GitHub URL detected in release metadata (only official releases/download/ paths are allowed): ${cleanUrl}\x1b[0m`
    );
    process.exit(1);
  }
}
console.log(
  'generate-release-metadata: âœ“ Metadata URLs successfully validated (no GitHub Pages URLs detected)'
);

try {
  fs.writeFileSync(appReleaseJsonPath, JSON.stringify(androidMetadata, null, 2) + '\n', 'utf8');
  // Also write to dist/android-web in case we rebuild
  const publicReleasePath = path.join(appRoot, '../../dist/android-web/app-release.json');
  fs.mkdirSync(path.dirname(publicReleasePath), { recursive: true });
  fs.writeFileSync(publicReleasePath, JSON.stringify(androidMetadata, null, 2) + '\n', 'utf8');

  console.log(
    `generate-release-metadata: âœ“ Wrote firebase-public/app-release.json and dist/android-web/app-release.json`
  );

  // Synchronize version.json files with Web metadata
  const syncVersionJson = (filePath) => {
    // Check if parent directory exists or if we should create it
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(webMetadata, null, 2) + '\n', 'utf8');
      console.log(
        `generate-release-metadata: âœ“ Synchronized ${path.basename(filePath)} with Web-safe metadata`
      );
    } catch (err) {
      console.warn(`generate-release-metadata: âš  Could not update ${filePath}:`, err);
    }
  };

  syncVersionJson(versionJsonPath);
  syncVersionJson(path.join(appRoot, '../../dist/android-web/version.json'));
  syncVersionJson(path.join(appRoot, 'public/version.json'));
} catch (err) {
  console.error(
    `\x1b[31mgenerate-release-metadata: âœ— Metadata generation failure: ${err.message}\x1b[0m`
  );
  process.exit(1);
}
