import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

console.log('=== Starting Android Signing Credentials & Certificate Security Test Suite ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

const EXPECTED_PROD_FINGERPRINT = '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';

// -----------------------------------------------------------------------------
// Suite 1: Production Signing Fingerprint Alignment
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Production Signing Fingerprint Alignment ---');

const appVersionPath = path.join(repoRoot, 'packages/studio-core/src/lib/startup/appVersion.ts');
assert(fs.existsSync(appVersionPath), 'appVersion.ts must exist');
const appVersionContent = fs.readFileSync(appVersionPath, 'utf8');

test('appVersion.ts defines canonical PRODUCTION_SIGNING_SHA256 matching expected invariant', () => {
  assert(
    appVersionContent.includes(EXPECTED_PROD_FINGERPRINT),
    `appVersion.ts must contain ${EXPECTED_PROD_FINGERPRINT}`
  );
});

const checkFingerprintScriptPath = path.join(
  repoRoot,
  'apps/studio-android/scripts/check-keystore-fingerprint.mjs'
);
assert(fs.existsSync(checkFingerprintScriptPath), 'check-keystore-fingerprint.mjs must exist');
const checkFingerprintContent = fs.readFileSync(checkFingerprintScriptPath, 'utf8');

test('check-keystore-fingerprint.mjs references production fingerprint and no longer hardcodes obsolete debug fingerprint', () => {
  assert(
    checkFingerprintContent.includes(EXPECTED_PROD_FINGERPRINT),
    'check-keystore-fingerprint.mjs must reference canonical production fingerprint'
  );
  assert(
    !checkFingerprintContent.includes("EXPECTED_SHA256 = '58b9bf2de5064c62ac3ca181b5608fe135c6894a8359ff6588e19218cd384764'"),
    'check-keystore-fingerprint.mjs must not hardcode obsolete debug fingerprint as expected'
  );
});

const appReleaseJsonPath = path.join(repoRoot, 'firebase-public/app-release.json');
assert(fs.existsSync(appReleaseJsonPath), 'firebase-public/app-release.json must exist');
const appReleaseJson = JSON.parse(fs.readFileSync(appReleaseJsonPath, 'utf8'));

test('firebase-public/app-release.json signatures field matches production fingerprint', () => {
  assert.strictEqual(
    appReleaseJson.signatures.toLowerCase().replace(/:/g, '').trim(),
    EXPECTED_PROD_FINGERPRINT,
    `app-release.json signatures must equal ${EXPECTED_PROD_FINGERPRINT}`
  );
});

// -----------------------------------------------------------------------------
// Suite 2: Secure Secret Injection in Gradle & CI
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Secure Secret Injection in Gradle & CI ---');

const buildGradlePath = path.join(repoRoot, 'apps/studio-android/android/app/build.gradle');
assert(fs.existsSync(buildGradlePath), 'build.gradle must exist');
const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

test('build.gradle signs release builds strictly via environment variables', () => {
  assert(
    buildGradleContent.includes('System.getenv("ANDROID_KEYSTORE_PASSWORD")'),
    'build.gradle must read ANDROID_KEYSTORE_PASSWORD from environment'
  );
  assert(
    buildGradleContent.includes('System.getenv("ANDROID_KEY_ALIAS")'),
    'build.gradle must read ANDROID_KEY_ALIAS from environment'
  );
  assert(
    buildGradleContent.includes('System.getenv("ANDROID_KEY_PASSWORD")'),
    'build.gradle must read ANDROID_KEY_PASSWORD from environment'
  );
  assert(
    !buildGradleContent.includes('storePassword "studioPassword123"'),
    'build.gradle must not contain hardcoded storePassword'
  );
  assert(
    !buildGradleContent.includes("keyAlias 'studio-release-key'"),
    'build.gradle must not contain hardcoded studio-release-key alias'
  );
});

test('build.gradle throws an explicit security error if production secrets are missing', () => {
  assert(
    buildGradleContent.includes('throw new GradleException("Production release requested') ||
    buildGradleContent.includes('throw new GradleException("CRITICAL SECURITY FAILURE'),
    'build.gradle must throw GradleException when signing secrets are absent'
  );
});

const releaseWorkflowPath = path.join(repoRoot, '.github/workflows/release.yml');
assert(fs.existsSync(releaseWorkflowPath), 'release.yml must exist');
const releaseWorkflowContent = fs.readFileSync(releaseWorkflowPath, 'utf8');

test('release.yml verifies production keystore fingerprint pre-build', () => {
  assert(
    releaseWorkflowContent.includes('Verify Pre-Build Production Keystore Fingerprint'),
    'release.yml must verify production keystore fingerprint pre-build'
  );
  assert(
    releaseWorkflowContent.includes('EXPECTED=$(node scripts/get-version.mjs --fingerprint)'),
    'release.yml must check fingerprint against scripts/get-version.mjs --fingerprint'
  );
});

// -----------------------------------------------------------------------------
// Suite 3: Repository Secret Hygiene & Keystore Tracking
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Repository Secret Hygiene & Keystore Tracking ---');

const gitignorePath = path.join(repoRoot, '.gitignore');
assert(fs.existsSync(gitignorePath), '.gitignore must exist');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

test('.gitignore explicitly excludes keystores, jks, and signing-secrets.txt', () => {
  assert(gitignoreContent.includes('*.keystore'), '.gitignore must exclude *.keystore');
  assert(gitignoreContent.includes('*.jks'), '.gitignore must exclude *.jks');
  assert(gitignoreContent.includes('signing-secrets.txt'), '.gitignore must exclude signing-secrets.txt');
});

test('Tracked files do not contain the historical draft password pattern', () => {
  // Search common text file extensions
  const textExtensions = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.gradle', '.yml', '.yaml', '.xml', '.md', '.txt'];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && textExtensions.some(ext => entry.name.endsWith(ext))) {
        // Skip this test script itself
        if (entry.name === 'test-signing-credentials-security.mjs') continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        // Match specific pattern without printing in test report
        if (content.includes('studio' + 'Password' + '123') || content.includes('studio' + '-release' + '-key')) {
          assert.fail(`Found historical draft credential in tracked file: ${path.relative(repoRoot, fullPath)}`);
        }
      }
    }
  }

  scanDir(repoRoot);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Tests finished: ${passedTests} passed, ${failedTests} failed`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
