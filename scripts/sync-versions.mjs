import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ─── Idempotent write helper ────────────────────────────────────────────────
// Only writes the file when content has actually changed. This prevents
// spurious `git status --porcelain` dirty state in CI caused by timestamp-only
// rewrites that produce identical logical content.
function writeIfChanged(filePath, newContent, label) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    const existingHash = crypto.createHash('sha256').update(existing).digest('hex');
    const newHash = crypto.createHash('sha256').update(newContent).digest('hex');
    if (existingHash === newHash) {
      console.log(`sync-versions: • ${label || path.relative(repoRoot, filePath)} is already up to date (idempotent skip)`);
      return false; // no write
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true; // wrote
}

// --- 1. Identify the Single Source of Truth ---
const rootPkgPath = path.join(repoRoot, 'package.json');
if (!fs.existsSync(rootPkgPath)) {
  console.error(`sync-versions: ✗ Critical Error: root package.json not found at ${rootPkgPath}`);
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const version = rootPkg.version;

if (!version || typeof version !== 'string') {
  console.error(`sync-versions: ✗ Critical Error: Invalid version in root package.json: ${version}`);
  process.exit(1);
}

const semverMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
if (!semverMatch) {
  console.error(`sync-versions: ✗ Critical Error: Version "${version}" is not valid strict SemVer (X.Y.Z)`);
  process.exit(1);
}

const major = parseInt(semverMatch[1], 10);
const minor = parseInt(semverMatch[2], 10);
const patch = parseInt(semverMatch[3], 10);
const versionCode = major * 10000 + minor * 100 + patch;

console.log(`sync-versions: ✓ Read SSOT version: ${version} (Derived versionCode: ${versionCode})`);

// --- 2. Gather git and build metadata ---
let gitCommitSha = 'unknown';
try {
  gitCommitSha = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('sync-versions: ⚠ Could not get git commit SHA:', e.message);
}
const buildTimestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' });

// --- 3. Update all secondary package.json files ---
const secondaryPkgPaths = [
  path.join(repoRoot, 'apps/studio-android/package.json'),
  path.join(repoRoot, 'apps/studio-web/package.json'),
  path.join(repoRoot, 'packages/studio-core/package.json'),
  path.join(repoRoot, 'packages/ui-shared/package.json'),
  path.join(repoRoot, 'packages/ui-android/package.json'),
  path.join(repoRoot, 'packages/ui-web/package.json')
];

for (const pkgPath of secondaryPkgPaths) {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== version) {
      pkg.version = version;
      const wrote = writeIfChanged(pkgPath, JSON.stringify(pkg, null, 2) + '\n', path.relative(repoRoot, pkgPath));
      if (wrote) console.log(`sync-versions: ✓ Synchronized ${path.relative(repoRoot, pkgPath)} to ${version}`);
    } else {
      console.log(`sync-versions: • ${path.relative(repoRoot, pkgPath)} is already ${version}`);
    }
  }
}

// --- 4. Update Android build.gradle ---
const gradlePath = path.join(repoRoot, 'apps/studio-android/android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradleSrc = fs.readFileSync(gradlePath, 'utf8');
  let updated = false;

  if (!gradleSrc.includes(`versionName "${version}"`)) {
    gradleSrc = gradleSrc.replace(/versionName\s+["']([^"']+)["']/, `versionName "${version}"`);
    updated = true;
  }
  if (!gradleSrc.includes(`versionCode ${versionCode}`)) {
    gradleSrc = gradleSrc.replace(/versionCode\s+(\d+)/, `versionCode ${versionCode}`);
    updated = true;
  }

  if (updated) {
    const wrote = writeIfChanged(gradlePath, gradleSrc, 'build.gradle');
    if (wrote) console.log(`sync-versions: ✓ Synchronized build.gradle (versionName: ${version}, versionCode: ${versionCode})`);
  } else {
    console.log(`sync-versions: • build.gradle is already perfectly synchronized`);
  }
}

// --- 5. Update appVersion.ts ---
const appVersionTsPath = path.join(repoRoot, 'packages/studio-core/src/lib/startup/appVersion.ts');
if (fs.existsSync(appVersionTsPath)) {
  let src = fs.readFileSync(appVersionTsPath, 'utf8');

  // Detect whether the version constants already match the target version.
  // If version is already correct, skip timestamp-dependent fields to prevent
  // spurious dirty state from APP_BUILD_TIMESTAMP changing every run.
  const versionAlreadyCorrect =
    src.includes(`NATIVE_VERSION = '${version}'`) &&
    src.includes(`NATIVE_VERSION_CODE = ${versionCode}`) &&
    src.includes(`WEB_VERSION = '${version}'`);

  let updated = false;

  const versionReplacements = [
    { regex: /export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/, repl: `export const NATIVE_VERSION = '${version}'` },
    { regex: /export\s+const\s+NATIVE_VERSION_CODE\s*=\s*\d+/, repl: `export const NATIVE_VERSION_CODE = ${versionCode}` },
    { regex: /export\s+const\s+WEB_VERSION\s*=\s*['"]([^'"]+)['"]/, repl: `export const WEB_VERSION = '${version}'` },
  ];

  // Always update version/versionCode constants (these are version-dependent)
  for (const { regex, repl } of versionReplacements) {
    if (!src.includes(repl)) {
      src = src.replace(regex, repl);
      updated = true;
    }
  }

  // Only update timestamp-dependent fields when version actually changed.
  // This is the critical fix: if version was already correct, re-running
  // sync-versions will not touch APP_COMMIT_SHA/APP_BUILD_TIMESTAMP,
  // preventing spurious git dirty state in CI.
  if (!versionAlreadyCorrect) {
    const timestampReplacements = [
      { regex: /export\s+const\s+APP_COMMIT_SHA\s*=\s*['"]([^'"]+)['"]/, repl: `export const APP_COMMIT_SHA = '${gitCommitSha}'` },
      { regex: /export\s+const\s+APP_BUILD_TIMESTAMP\s*=\s*['"]([^'"]+)['"]/, repl: `export const APP_BUILD_TIMESTAMP = '${buildTimestamp}'` },
    ];
    for (const { regex, repl } of timestampReplacements) {
      if (!src.includes(repl)) {
        src = src.replace(regex, repl);
        updated = true;
      }
    }
  } else {
    console.log(`sync-versions: • Skipping APP_COMMIT_SHA/APP_BUILD_TIMESTAMP update (version unchanged — prevents dirty tree)`);
  }

  // --- 6. Parse CHANGELOG.md for release notes and update appVersion.ts ---
  function cleanMojibake(str) {
    if (!str) return '';
    return str.replace(/â€¢/g, '•').replace(/â€‹/g, '').replace(/â€¦/g, '…')
      .replace(/â€"/g, '—').replace(/â€"/g, '–').replace(/â€™/g, "'")
      .replace(/â€\x9d/g, '"').replace(/â€\x9c/g, '"');
  }

  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  let changelogPayload = '';
  let releaseNotesPayload = {};

  if (fs.existsSync(changelogPath)) {
    const changelogText = cleanMojibake(fs.readFileSync(changelogPath, 'utf8'));
    const changelogRawLines = changelogText.split(/\r?\n/);
    let inSection = false;
    let sectionLines = [];

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

    if (!inSection || sectionLines.join('\n').trim().length === 0) {
      console.warn(`sync-versions: ⚠ Warning: Missing or empty changelog entry for version ${version} in CHANGELOG.md`);
    } else {
      const sectionContent = sectionLines.join('\n').trim();

      // Build the canonical release-notes.md format — must match validate-release-changelog.mjs
      // exactly (line 132 of that script). The authoritative format is:
      //   # Version X.Y.Z\n\nRelease Date: YYYY-MM-DD\n\n[body]\n
      // Without the header, validate-release-changelog rewrites the file with it on every run,
      // causing a format mismatch that makes the file dirty after every validate pass.
      const releaseDateMatch = sectionContent.match(/Release Date:\s*(.+)/);
      const releaseDate = releaseDateMatch ? releaseDateMatch[1].trim() : new Date().toISOString().slice(0, 10);
      // Body = everything after the Release Date line
      const bodyAfterDate = sectionContent.replace(/^Release Date:[^\n]*\n*/, '').trim();
      const canonicalReleaseNotesMd = `# Version ${version}\n\nRelease Date: ${releaseDate}\n\n${bodyAfterDate}\n`;

      // Idempotent write of release-notes.md
      const releaseNotesMdPath = path.join(repoRoot, 'release-notes.md');
      const wrote = writeIfChanged(releaseNotesMdPath, canonicalReleaseNotesMd, 'release-notes.md');
      if (wrote) console.log(`sync-versions: ✓ Wrote release-notes.md from CHANGELOG.md`);

      const categories = { added: [], improved: [], fixed: [], changed: [] };
      let currentCategory = null;
      const flatBullets = [];

      for (const rawLine of sectionContent.split('\n')) {
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
        const bMatch = line.match(/^[-*]\s+(.*)$/);
        if (bMatch) {
          const bulletContent = bMatch[1].trim();
          if (currentCategory) categories[currentCategory].push(bulletContent);
          flatBullets.push(bulletContent);
        }
      }

      changelogPayload = flatBullets.map((b) => `• ${b}`).join('\n');
      releaseNotesPayload = {
        added: categories.added.length > 0 ? categories.added : undefined,
        improved: categories.improved.length > 0 ? categories.improved : undefined,
        fixed: categories.fixed.length > 0 ? categories.fixed : undefined,
        changed: categories.changed.length > 0 ? categories.changed : undefined,
      };

      const sectionBlocks = [];
      for (const [key, heading] of Object.entries({added: 'Added', improved: 'Improved', fixed: 'Fixed', changed: 'Changed'})) {
        if (categories[key].length > 0) {
          const itemsStr = categories[key].map((i) => `      ${JSON.stringify(i)},`).join('\n');
          sectionBlocks.push(`  {\n    heading: "${heading}",\n    items: [\n${itemsStr}\n    ],\n  }`);
        }
      }
      const tsSections = `export const APP_CHANGELOG_SECTIONS: ChangelogSection[] = [\n${sectionBlocks.join(',\n')}\n];`;

      const changelogSectionsPat = /export\s+const\s+APP_CHANGELOG_SECTIONS:\s*ChangelogSection\[\]\s*=\s*\[([\s\S]*?)\]\s*;/;
      if (changelogSectionsPat.test(src)) {
        const newSrc = src.replace(changelogSectionsPat, tsSections);
        const clean = (s) => s.replace(/['"\\\s,;]/g, '');
        if (clean(newSrc) !== clean(src)) {
          src = newSrc;
          updated = true;
        }
      }

      // Parse top releases from CHANGELOG.md for RELEASE_HISTORY
      const releaseHistoryEntries = [];
      let currentRelVer = null;
      let currentRelDate = '';
      let currentRelBullets = [];

      for (const rawLine of changelogRawLines) {
        const hMatch = rawLine.match(/^(?:#|##)\s+(?:Version\s+)?v?(\d+\.\d+\.\d+)/i);
        if (hMatch) {
          if (currentRelVer && currentRelBullets.length > 0) {
            releaseHistoryEntries.push({
              version: currentRelVer,
              date: currentRelDate || '2026-08-01',
              highlights: currentRelBullets.slice(0, 6),
            });
            if (releaseHistoryEntries.length >= 10) break;
          }
          currentRelVer = hMatch[1];
          currentRelDate = '';
          currentRelBullets = [];
          continue;
        }
        if (currentRelVer) {
          const dMatch = rawLine.match(/^Release Date:\s*(.+)/i);
          if (dMatch) {
            currentRelDate = dMatch[1].trim();
            continue;
          }
          const bMatch = rawLine.match(/^[-*]\s+(.*)$/);
          if (bMatch) {
            currentRelBullets.push(bMatch[1].trim());
          }
        }
      }
      if (currentRelVer && currentRelBullets.length > 0 && releaseHistoryEntries.length < 10) {
        releaseHistoryEntries.push({
          version: currentRelVer,
          date: currentRelDate || '2026-08-01',
          highlights: currentRelBullets.slice(0, 6),
        });
      }

      if (releaseHistoryEntries.length > 0) {
        const historyItemsStr = releaseHistoryEntries
          .map((entry) => {
            const hStr = entry.highlights.map((h) => `      ${JSON.stringify(h)},`).join('\n');
            return `  {\n    version: ${JSON.stringify(entry.version)},\n    date: ${JSON.stringify(entry.date)},\n    highlights: [\n${hStr}\n    ],\n  }`;
          })
          .join(',\n');
        const tsHistory = `export const RELEASE_HISTORY: ReleaseHistoryItem[] = [\n${historyItemsStr}\n];`;

        const releaseHistoryPat = /export\s+const\s+RELEASE_HISTORY:\s*ReleaseHistoryItem\[\]\s*=\s*\[([\s\S]*?)\]\s*;/;
        if (releaseHistoryPat.test(src)) {
          const newSrc = src.replace(releaseHistoryPat, tsHistory);
          const clean = (s) => s.replace(/['"\\\s,;]/g, '');
          if (clean(newSrc) !== clean(src)) {
            src = newSrc;
            updated = true;
          }
        }
      }
    }
  }

  if (updated) {
    const wrote = writeIfChanged(appVersionTsPath, src, 'appVersion.ts');
    if (wrote) {
      console.log(`sync-versions: ✓ Synchronized appVersion.ts`);
      try {
        execSync(`npx prettier --write "${appVersionTsPath}"`, { cwd: repoRoot, stdio: 'ignore' });
      } catch (e) {
        console.warn('sync-versions: ⚠ Prettier formatting failed for appVersion.ts:', e.message);
      }
    }
  } else {
    console.log(`sync-versions: • appVersion.ts is already perfectly synchronized`);
  }

  // --- 7. Generate Manifests (idempotent) ---
  // When the manifest file already has the correct version/versionCode, preserve
  // the existing commit/timestamp fields to avoid spurious dirty-tree mutations.
  function buildManifestPayload(platform) {
    const manifestPath = path.join(repoRoot,
      platform === 'web'
        ? 'apps/studio-web/public/version.json'
        : platform === 'firebase'
          ? 'firebase-public/version.json'
          : platform === 'app-release'
            ? 'apps/studio-android/public/app-release.json'
            : 'apps/studio-android/public/version.json'
    );
    // If existing manifest already has correct version, preserve its timestamp fields
    let existingCommit = gitCommitSha;
    let existingTimestamp = buildTimestamp;
    if (fs.existsSync(manifestPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (existing.version === version && (existing.versionCode === versionCode || !existing.versionCode)) {
          // Version already correct: preserve timestamps to avoid dirty state
          existingCommit = existing.commit || gitCommitSha;
          existingTimestamp = existing.releasedAt || buildTimestamp;
        }
      } catch (_) {}
    }
    return {
      platform: platform === 'app-release' ? 'android' : platform === 'firebase' ? 'web' : platform,
      version,
      versionName: version,
      versionCode,
      version_code: versionCode,
      commit: existingCommit,
      releasedAt: existingTimestamp,
      buildTimestamp: existingTimestamp,
      updateMode: 'refresh',
      changelog: changelogPayload,
      whatsNew: changelogPayload,
      releaseNotes: releaseNotesPayload,
      mandatory: false,
    };
  }

  const manifests = [
    { path: 'apps/studio-android/public/version.json', data: buildManifestPayload('android') },
    { path: 'apps/studio-web/public/version.json', data: buildManifestPayload('web') },
    { path: 'apps/studio-android/public/app-release.json', data: buildManifestPayload('app-release') },
    { path: 'firebase-public/version.json', data: buildManifestPayload('firebase') }
  ];

  for (const m of manifests) {
    const fullPath = path.join(repoRoot, m.path);
    const content = JSON.stringify(m.data, null, 2) + '\n';
    const wrote = writeIfChanged(fullPath, content, m.path);
    if (wrote) console.log(`sync-versions: ✓ Wrote manifest ${m.path}`);
  }
}

// Update firebase.json latest APK redirect if present
const firebaseJsonPath = path.join(repoRoot, 'firebase.json');
if (fs.existsSync(firebaseJsonPath)) {
  let fbSrc = fs.readFileSync(firebaseJsonPath, 'utf8');
  const oldDestRegex = /"destination":\s*"https:\/\/github\.com\/MAGEXE1000\/(?:Studio|Livex)\/releases\/download\/v[^/]+\/studio-[^/]+\.apk"/;
  const newDest = `"destination": "https://github.com/MAGEXE1000/Livex/releases/download/v${version}/studio-${version}.apk"`;
  if (oldDestRegex.test(fbSrc)) {
    const newFbSrc = fbSrc.replace(oldDestRegex, newDest);
    const wrote = writeIfChanged(firebaseJsonPath, newFbSrc, 'firebase.json');
    if (wrote) console.log(`sync-versions: ✓ Synchronized firebase.json APK redirect to v${version}`);
  }
}

// Update release-manifest.json if present (idempotent)
const releaseManifestPath = path.join(repoRoot, 'release-manifest.json');
if (fs.existsSync(releaseManifestPath)) {
  const rm = JSON.parse(fs.readFileSync(releaseManifestPath, 'utf8'));
  if (rm.releaseVersion !== version || rm.versionCode !== versionCode) {
    rm.releaseVersion = version;
    rm.versionName = version;
    rm.versionCode = versionCode;
    const wrote = writeIfChanged(releaseManifestPath, JSON.stringify(rm, null, 2) + '\n', 'release-manifest.json');
    if (wrote) console.log(`sync-versions: ✓ Synchronized release-manifest.json`);
  }
}

// Ensure production Capacitor assets are clean of development server.url
const capAssetConfigPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/assets/capacitor.config.json');
if (fs.existsSync(capAssetConfigPath) && !process.env.CAPACITOR_SERVER_URL) {
  try {
    const cap = JSON.parse(fs.readFileSync(capAssetConfigPath, 'utf8'));
    if (cap.server?.url || cap.server?.cleartext) {
      delete cap.server.url;
      delete cap.server.cleartext;
      fs.writeFileSync(capAssetConfigPath, JSON.stringify(cap, null, '\t') + '\n', 'utf8');
      console.log(`sync-versions: ✓ Sanitized production Capacitor asset configuration (removed dev server.url)`);
    }
  } catch (_) {}
}

console.log(`\n\x1b[32m=== SSOT VERSION SYNCHRONIZATION COMPLETE ===\x1b[0m\n`);
process.exit(0);
