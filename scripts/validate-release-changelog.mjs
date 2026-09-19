#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const REJECTED_LAZY_TERMS = [
  /^-\s*update\s*$/i,
  /^-\s*fixes\s*$/i,
  /^-\s*bug fixes\s*$/i,
  /^-\s*fixed bugs\s*$/i,
  /^-\s*misc\s*$/i,
  /^-\s*improvements\s*$/i,
  /^-\s*minor fixes\s*$/i,
  /^-\s*stuff\s*$/i,
  /^-\s*changes\s*$/i,
];

export function validateChangelog(options = {}) {
  console.log('=== RUNNING MANDATORY RELEASE CHANGELOG VALIDATION ===');

  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const releaseNotesPath = path.join(repoRoot, 'release-notes.md');

  // 1. Mandatory File Existence Checks
  if (!fs.existsSync(changelogPath)) {
    console.error('✗ CRITICAL RELEASE FAILURE: CHANGELOG.md is missing at repository root!');
    process.exit(1);
  }
  if (!fs.existsSync(releaseNotesPath)) {
    console.error('✗ CRITICAL RELEASE FAILURE: release-notes.md is missing at repository root!');
    process.exit(1);
  }

  // 2. Resolve target versionName
  const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
  let versionName = options.version || '';
  if (!versionName && fs.existsSync(appVersionPath)) {
    const src = fs.readFileSync(appVersionPath, 'utf8');
    const m = src.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (m) versionName = m[1];
  }

  if (!versionName) {
    console.error('✗ CRITICAL RELEASE FAILURE: Could not resolve versionName for changelog validation.');
    process.exit(1);
  }

  console.log(`Validating Changelog for Version: ${versionName}`);

  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  const lines = changelogContent.split(/\r?\n/);

  // 3. Find Version Headings
  const versionHeadingRegex = /^(?:#|##)\s*(?:Version\s+)?v?([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?)/i;
  const headings = [];

  lines.forEach((line, index) => {
    const match = line.match(versionHeadingRegex);
    if (match) {
      headings.push({ version: match[1], lineIndex: index, raw: line });
    }
  });

  if (headings.length === 0) {
    console.error('✗ CRITICAL RELEASE FAILURE: No version headings found in CHANGELOG.md!');
    process.exit(1);
  }

  // Check uniqueness of version entries
  const matchingHeadings = headings.filter((h) => h.version === versionName);
  if (matchingHeadings.length === 0) {
    console.error(`✗ CRITICAL RELEASE FAILURE: CHANGELOG.md is missing an entry for version ${versionName}!`);
    attemptAutoGeneration(versionName, repoRoot);
    process.exit(1);
  }
  if (matchingHeadings.length > 1) {
    console.error(`✗ CRITICAL RELEASE FAILURE: Duplicate changelog entry found for version ${versionName}!`);
    process.exit(1);
  }

  // 4. Verify Entry is at the Top (Newest Entry)
  const topHeading = headings[0];
  if (topHeading.version !== versionName) {
    console.error(`✗ CRITICAL RELEASE FAILURE: The newest entry in CHANGELOG.md must be for current version ${versionName}, but found ${topHeading.version}!`);
    process.exit(1);
  }

  // 5. Extract Section Content
  const startIndex = topHeading.lineIndex;
  const endIndex = headings.length > 1 ? headings[1].lineIndex : lines.length;
  const sectionLines = lines.slice(startIndex + 1, endIndex);
  const sectionText = sectionLines.join('\n').trim();

  if (!sectionText) {
    console.error(`✗ CRITICAL RELEASE FAILURE: Changelog entry for version ${versionName} is empty!`);
    process.exit(1);
  }

  // 6. Verify Release Date
  const dateMatch = sectionText.match(/Release\s+Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (!dateMatch) {
    console.error(`✗ CRITICAL RELEASE FAILURE: Changelog entry for version ${versionName} is missing "Release Date: YYYY-MM-DD"!`);
    process.exit(1);
  }

  // 7. Verify Bullet Points and Quality Rules
  const bulletLines = sectionLines.filter((l) => l.trim().startsWith('- '));
  if (bulletLines.length === 0) {
    console.error(`✗ CRITICAL RELEASE FAILURE: Changelog entry for version ${versionName} has no bullet points!`);
    process.exit(1);
  }

  for (const bullet of bulletLines) {
    const text = bullet.trim();
    for (const rejected of REJECTED_LAZY_TERMS) {
      if (rejected.test(text)) {
        console.error(`✗ CRITICAL RELEASE FAILURE: Rejected low-quality changelog entry: "${text}". Every item must clearly describe what changed.`);
        process.exit(1);
      }
    }
    if (text.length < 12) {
      console.error(`✗ CRITICAL RELEASE FAILURE: Changelog entry "${text}" is too short. Describe the change clearly.`);
      process.exit(1);
    }
  }

  // 8. Update release-notes.md to match canonical format
  const bodyAfterDate = sectionText.replace(/^Release Date:[^\n]*\n*/, '').trim();
  const canonicalContent = `# Version ${versionName}\n\nRelease Date: ${dateMatch[1]}\n\n${bodyAfterDate}\n`;
  fs.writeFileSync(releaseNotesPath, canonicalContent, 'utf8');
  console.log(`✓ release-notes.md synced with CHANGELOG.md entry for v${versionName}`);
  console.log(`✓ RELEASE CHANGELOG VALIDATION PASSED for v${versionName}`);

  return {
    version: versionName,
    releaseDate: dateMatch[1],
    bulletCount: bulletLines.length,
    status: 'VALIDATED',
  };
}

function attemptAutoGeneration(versionName, repoRoot) {
  console.log('\n--- AUTOMATIC DRAFT CHANGELOG GENERATION ---');
  try {
    const gitLog = spawnSync('git', ['log', '-n', '10', '--oneline'], { cwd: repoRoot, encoding: 'utf8' });
    const commits = gitLog.status === 0 ? gitLog.stdout.split('\n').filter(Boolean) : [];
    
    const draftContent = `# Version ${versionName}

Release Date: ${new Date().toISOString().split('T')[0]}

## Added

- Standard production release build for Studio Android v${versionName}.

## Security

- Enforced mandatory production signing key verification (SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206).

## Breaking Changes

None

## Recent Commits Included
${commits.map((c) => `- ${c}`).join('\n')}
`;

    const draftPath = path.join(repoRoot, 'CHANGELOG.md.draft');
    fs.writeFileSync(draftPath, draftContent, 'utf8');
    console.log(`✓ Draft changelog section generated at ${draftPath}`);
    console.log('⚠ Developer action required: Review and copy draft into CHANGELOG.md before proceeding with release.');
  } catch (e) {
    console.warn(`Could not generate draft changelog: ${e.message}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('validate-release-changelog.mjs')) {
  validateChangelog();
}
