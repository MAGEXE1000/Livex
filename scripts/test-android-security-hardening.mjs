import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

console.log('=== Starting Android Security Hardening & Exposure Test Suite ===\n');

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

// -----------------------------------------------------------------------------
// Suite 1: AndroidManifest.xml Hardening
// -----------------------------------------------------------------------------
console.log('--- Suite 1: AndroidManifest.xml Hardening ---');

const manifestPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/AndroidManifest.xml');
assert(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');

test('AndroidManifest enforces android:allowBackup="false"', () => {
  assert(
    manifestContent.includes('android:allowBackup="false"'),
    'Expected android:allowBackup="false" in AndroidManifest.xml'
  );
  assert(
    !manifestContent.includes('android:allowBackup="true"'),
    'android:allowBackup="true" must not be present'
  );
});

test('AndroidManifest configures dataExtractionRules and fullBackupContent', () => {
  assert(
    manifestContent.includes('android:dataExtractionRules="@xml/data_extraction_rules"'),
    'Expected android:dataExtractionRules="@xml/data_extraction_rules"'
  );
  assert(
    manifestContent.includes('android:fullBackupContent="@xml/backup_rules"'),
    'Expected android:fullBackupContent="@xml/backup_rules"'
  );
});

test('AndroidManifest completely eliminates READ_MEDIA_VIDEO', () => {
  assert(
    !manifestContent.includes('READ_MEDIA_VIDEO'),
    'android.permission.READ_MEDIA_VIDEO must be removed from AndroidManifest.xml'
  );
});

test('AndroidManifest explicitly strips READ_GSERVICES via tools:node="remove"', () => {
  assert(
    manifestContent.includes('READ_GSERVICES') && manifestContent.includes('tools:node="remove"'),
    'Expected tools:node="remove" for READ_GSERVICES in AndroidManifest.xml'
  );
});

test('AndroidManifest preserves all essential production permissions', () => {
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.REQUEST_INSTALL_PACKAGES',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_AUDIO',
  ];

  for (const perm of requiredPermissions) {
    assert(
      manifestContent.includes(perm),
      `Required permission missing from AndroidManifest: ${perm}`
    );
  }
});

test('AndroidManifest preserves FileProvider declaration with ${applicationId}.fileprovider', () => {
  assert(
    manifestContent.includes('android:name="androidx.core.content.FileProvider"'),
    'FileProvider provider component must exist'
  );
  assert(
    manifestContent.includes('android:authorities="${applicationId}.fileprovider"'),
    'FileProvider authority must be ${applicationId}.fileprovider'
  );
  assert(
    manifestContent.includes('android:resource="@xml/file_paths"'),
    'FileProvider must reference @xml/file_paths'
  );
});

// -----------------------------------------------------------------------------
// Suite 2: XML Rules & FileProvider Configuration
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: XML Rules & FileProvider Configuration ---');

const dataExtractionPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/res/xml/data_extraction_rules.xml');
const backupRulesPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/res/xml/backup_rules.xml');
const filePathsPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/res/xml/file_paths.xml');

test('data_extraction_rules.xml exists and excludes cloud and device-transfer', () => {
  assert(fs.existsSync(dataExtractionPath), 'data_extraction_rules.xml must exist');
  const content = fs.readFileSync(dataExtractionPath, 'utf8');
  assert(content.includes('<cloud-backup>'), 'Must contain <cloud-backup>');
  assert(content.includes('<device-transfer>'), 'Must contain <device-transfer>');
  assert(content.includes('<exclude path="."'), 'Must exclude root path');
});

test('backup_rules.xml exists and excludes all storage domains for legacy Android', () => {
  assert(fs.existsSync(backupRulesPath), 'backup_rules.xml must exist');
  const content = fs.readFileSync(backupRulesPath, 'utf8');
  assert(content.includes('<full-backup-content>'), 'Must contain <full-backup-content>');
  assert(content.includes('domain="sharedpref"'), 'Must exclude shared preferences');
  assert(content.includes('domain="database"'), 'Must exclude databases');
  assert(content.includes('domain="root"'), 'Must exclude app root');
  assert(content.includes('domain="file"'), 'Must exclude app internal files');
});

test('file_paths.xml exposes only cache paths and restricts internal/external root paths', () => {
  assert(fs.existsSync(filePathsPath), 'file_paths.xml must exist');
  const content = fs.readFileSync(filePathsPath, 'utf8');
  assert(content.includes('<cache-path'), 'Must contain <cache-path>');
  assert(content.includes('<external-cache-path'), 'Must contain <external-cache-path>');
  assert(!content.includes('<files-path'), 'Must NOT expose <files-path> (private app files/databases)');
  assert(!content.includes('<external-path'), 'Must NOT expose <external-path> (device SD card root)');
  assert(!content.includes('<external-files-path'), 'Must NOT expose broad <external-files-path>');
});

// -----------------------------------------------------------------------------
// Suite 3: Native AppInstallerPlugin Verification
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Native AppInstallerPlugin Verification ---');

const pluginJavaPath = path.join(repoRoot, 'apps/studio-android/android/app/src/main/java/com/chordex/app/AppInstallerPlugin.java');
assert(fs.existsSync(pluginJavaPath), 'AppInstallerPlugin.java must exist');
const pluginJavaContent = fs.readFileSync(pluginJavaPath, 'utf8');

test('AppInstallerPlugin does not declare READ_MEDIA_VIDEO or video alias', () => {
  assert(
    !pluginJavaContent.includes('READ_MEDIA_VIDEO'),
    'READ_MEDIA_VIDEO must be removed from AppInstallerPlugin.java'
  );
  assert(
    !pluginJavaContent.includes('alias = "video"'),
    'Video permission alias must be removed from AppInstallerPlugin.java'
  );
});

test('AppInstallerPlugin retains necessary image, audio, storage, and mic aliases', () => {
  assert(pluginJavaContent.includes('alias = "images"'), 'Must retain images alias');
  assert(pluginJavaContent.includes('alias = "audio"'), 'Must retain audio alias');
  assert(pluginJavaContent.includes('alias = "storage"'), 'Must retain storage alias');
  assert(pluginJavaContent.includes('alias = "microphone"'), 'Must retain microphone alias');
});

test('AppInstallerPlugin uses FileProvider for secure APK intent launch', () => {
  assert(
    pluginJavaContent.includes('androidx.core.content.FileProvider.getUriForFile'),
    'Must use FileProvider.getUriForFile for APK intent'
  );
  assert(
    pluginJavaContent.includes('Intent.FLAG_GRANT_READ_URI_PERMISSION'),
    'Must grant temporary read URI permission flag'
  );
});

// -----------------------------------------------------------------------------
// Suite 4: UI Permission Call-Site Hardening
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: UI Permission Call-Site Hardening ---');

const accountCardPath = path.join(repoRoot, 'packages/ui-shared/src/features/auth/components/AccountCard.tsx');
assert(fs.existsSync(accountCardPath), 'AccountCard.tsx must exist');
const accountCardContent = fs.readFileSync(accountCardPath, 'utf8');

test('AccountCard backup export requests only storage alias', () => {
  assert(
    accountCardContent.includes("requestPermissions({ aliases: ['storage'] })"),
    'Backup export must request only storage alias'
  );
});

test('AccountCard avatar photo selection does not perform redundant permission prompt', () => {
  const matches = accountCardContent.match(/requestPermissions/g) || [];
  assert.strictEqual(
    matches.length,
    1,
    'Expected exactly one requestPermissions call in AccountCard (the constrained backup export), avatar button must not call requestPermissions'
  );
  // Verify avatar button clicks file input directly
  assert(
    accountCardContent.includes('onClick={() => {\n                fileInputRef.current?.click();\n              }}'),
    'Avatar button must trigger fileInputRef directly without permissions prompt'
  );
});

// -----------------------------------------------------------------------------
// Suite 5: Merged Manifest Invariant & Permission Whitelist Verification
// -----------------------------------------------------------------------------
console.log('\n--- Suite 5: Merged Manifest Invariant & Permission Whitelist Verification ---');

const mergedManifestPath = path.join(
  repoRoot,
  'apps/studio-android/android/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml'
);

if (fs.existsSync(mergedManifestPath)) {
  const mergedContent = fs.readFileSync(mergedManifestPath, 'utf8');

  test('Merged Android manifest completely eliminates READ_GSERVICES', () => {
    assert(
      !mergedContent.includes('READ_GSERVICES'),
      'com.google.android.providers.gsf.permission.READ_GSERVICES must be absent from merged manifest'
    );
  });

  test('Merged Android manifest completely eliminates READ_MEDIA_VIDEO', () => {
    assert(
      !mergedContent.includes('READ_MEDIA_VIDEO'),
      'READ_MEDIA_VIDEO must be absent from merged manifest'
    );
  });

  test('Merged Android manifest completely eliminates CAMERA permission', () => {
    assert(
      !mergedContent.includes('android.permission.CAMERA'),
      'android.permission.CAMERA must not be present in merged manifest'
    );
  });

  test('Merged Android manifest contains only whitelisted permissions', () => {
    const allowedPermissions = new Set([
      'android.permission.INTERNET',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.ACCESS_NETWORK_STATE',
      'com.chordex.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
    ]);

    const matches = mergedContent.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g);
    const discovered = [];
    for (const match of matches) {
      discovered.push(match[1]);
      assert(
        allowedPermissions.has(match[1]),
        `Unauthorized permission discovered in merged manifest: ${match[1]}`
      );
    }
    assert.strictEqual(
      discovered.length,
      allowedPermissions.size,
      `Expected exactly ${allowedPermissions.size} permissions in merged manifest, but found ${discovered.length}`
    );
  });
} else {
  console.log('  ⚠ Merged manifest not found yet (skipping Suite 5 until manifest merge run)');
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Tests finished: ${passedTests} passed, ${failedTests} failed`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
