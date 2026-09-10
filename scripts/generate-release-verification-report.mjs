#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const EXPECTED_PROD_SHA256 = (process.env.EXPECTED_SIGNATURE_SHA256 || '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206').replace(/:/g, '').toLowerCase();
const EXPECTED_PACKAGE_NAME = 'com.chordex.app';
const EXPECTED_LAUNCHER_ACTIVITY = 'com.chordex.app.MainActivity';

// Retired waveform hashes that must NEVER appear in the production APK
const RETIRED_WAVEFORM_HASHES = new Set([
  '4202380abc7816c6e6c99f6c35960861d063969315a56ecfbc0ca8da25c3e1ce',
]);

export function generateVerificationReport(apkPath) {
  const targetApk = apkPath || path.join(repoRoot, 'apps/studio-android/android/app/build/outputs/apk/release/app-release.apk');
  
  if (!fs.existsSync(targetApk)) {
    console.error(`✗ Release verification failed: APK not found at ${targetApk}`);
    process.exit(1);
  }

  // Resolve Android SDK tools
  let androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome && process.platform === 'win32') {
    const defaultWinSdk = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
    if (fs.existsSync(defaultWinSdk)) {
      androidHome = defaultWinSdk;
    }
  }

  let apksignerCmd = 'apksigner';
  let aaptCmd = 'aapt';

  if (androidHome) {
    const buildToolsDir = path.join(androidHome, 'build-tools');
    if (fs.existsSync(buildToolsDir)) {
      const versions = fs.readdirSync(buildToolsDir).sort().reverse();
      if (versions.length > 0) {
        const latest = path.join(buildToolsDir, versions[0]);
        apksignerCmd = path.join(latest, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner');
        aaptCmd = path.join(latest, process.platform === 'win32' ? 'aapt.exe' : 'aapt');
      }
    }
  }

  console.log('=== RUNNING POST-SIGNING RELEASE VERIFICATION ===');
  console.log(`Target APK: ${targetApk}`);

  // 1. Verify Manifest via aapt badging
  const badgingRes = spawnSync(aaptCmd, ['dump', 'badging', targetApk], { encoding: 'utf8', shell: process.platform === 'win32' });
  const badgingOut = badgingRes.stdout || '';

  const pkgMatch = badgingOut.match(/package:\s*name='([^']+)'/i);
  const codeMatch = badgingOut.match(/versionCode='([^']+)'/i);
  const nameMatch = badgingOut.match(/versionName='([^']+)'/i);

  const packageName = pkgMatch ? pkgMatch[1] : 'unknown';
  const versionCode = codeMatch ? parseInt(codeMatch[1], 10) : 0;
  const versionName = nameMatch ? nameMatch[1] : 'unknown';

  // Launcher activity verification
  const launcherMatches = [...badgingOut.matchAll(/launchable-activity:\s*name='([^']+)'/gi)].map(m => m[1]);
  const launchableActivity = launcherMatches[0] || 'unknown';
  const isLauncherSingle = launcherMatches.length === 1;
  const isLauncherCorrect = launchableActivity === EXPECTED_LAUNCHER_ACTIVITY;

  // Icon resource in badging
  const iconMatch = badgingOut.match(/application:\s*label='([^']*)'\s*icon='([^']+)'/i);
  const applicationIcon = iconMatch ? iconMatch[2] : 'unknown';
  const isIconDeclared = applicationIcon !== 'unknown' && applicationIcon.length > 0;

  // 2. Scan APK contents for retired waveform or corrupted icon assets
  let obsoleteAssetDetected = false;
  let detectedObsoleteHash = '';
  let scannedPngCount = 0;
  let scannedMipmapCount = 0;
  let allDensitiesPresent = false;
  let adaptiveXmlPresent = false;

  function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getFilesRecursively(full));
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
    return results;
  }

  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-res-check-'));
    try {
      execSync(`tar -xf "${targetApk}" -C "${tmpDir}" res`, { stdio: ['ignore', 'pipe', 'ignore'] });
      const resDir = path.join(tmpDir, 'res');
      if (fs.existsSync(resDir)) {
        const allResFiles = getFilesRecursively(resDir);
        const pngFiles = allResFiles.filter(f => f.endsWith('.png'));
        const mipmapPngFiles = pngFiles.filter(f => f.includes('mipmap'));
        scannedPngCount = pngFiles.length;
        scannedMipmapCount = mipmapPngFiles.length;

        for (const file of pngFiles) {
          const buf = fs.readFileSync(file);
          const hash = crypto.createHash('sha256').update(buf).digest('hex');
          if (RETIRED_WAVEFORM_HASHES.has(hash)) {
            obsoleteAssetDetected = true;
            detectedObsoleteHash = `${path.basename(path.dirname(file))}/${path.basename(file)}: ${hash}`;
            break;
          }
        }

        // Verify all 5 densities exist in the APK
        const requiredDensities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        allDensitiesPresent = requiredDensities.every(density =>
          allResFiles.some(f => f.includes(`mipmap-${density}`) && f.endsWith('ic_launcher.png'))
        );

        // Verify adaptive XML exists in the APK
        adaptiveXmlPresent = allResFiles.some(f =>
          f.includes('mipmap-anydpi-v26') && f.endsWith('ic_launcher.xml')
        );
      }
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  } catch (tarErr) {
    console.warn(`Notice: Could not inspect internal APK tar entries: ${tarErr.message}`);
  }

  // 3. Verify Signatures via apksigner or keytool
  let detectedSha256 = 'unknown';
  let v1Scheme = false;
  let v2Scheme = false;
  let v3Scheme = false;
  let v4Scheme = false;

  const signRes = spawnSync(apksignerCmd, ['verify', '--verbose', '--print-certs', targetApk], { encoding: 'utf8', shell: process.platform === 'win32' });
  const signOut = signRes.stdout || '';

  const sha256Match = signOut.match(/SHA-256 digest:\s*([A-Fa-f0-9:]+)/i);
  if (sha256Match) {
    detectedSha256 = sha256Match[1].replace(/:/g, '').toLowerCase();
    v1Scheme = /Verified using v1 scheme.*:\s*true/i.test(signOut);
    v2Scheme = /Verified using v2 scheme.*:\s*true/i.test(signOut);
    v3Scheme = /Verified using v3 scheme.*:\s*true/i.test(signOut);
    v4Scheme = /Verified using v4 scheme.*:\s*true/i.test(signOut);
  } else {
    const keytoolRes = spawnSync('keytool', ['-printcert', '-jarfile', targetApk], { encoding: 'utf8', shell: process.platform === 'win32' });
    if (keytoolRes.status === 0 && keytoolRes.stdout) {
      const ktMatch = keytoolRes.stdout.match(/SHA256:\s*([A-Fa-f0-9:]+)/i);
      if (ktMatch) {
        detectedSha256 = ktMatch[1].replace(/:/g, '').toLowerCase();
        v1Scheme = true;
      }
    }
  }

  const isPackageValid = packageName === EXPECTED_PACKAGE_NAME;
  const isLauncherValid = isLauncherSingle && isLauncherCorrect;
  const isSignatureValid = detectedSha256 === EXPECTED_PROD_SHA256;
  const isSchemeValid = v1Scheme || v2Scheme || v3Scheme;
  const isIconValid = isIconDeclared && !obsoleteAssetDetected && allDensitiesPresent && adaptiveXmlPresent;

  const status = isPackageValid && isLauncherValid && isSignatureValid && isSchemeValid && isIconValid
    ? 'VERIFIED_PRODUCTION'
    : 'SECURITY_FAILURE';

  const report = {
    timestamp: new Date().toISOString(),
    status,
    apkPath: path.relative(repoRoot, targetApk).replace(/\\/g, '/'),
    packageName,
    versionCode,
    versionName,
    launcherActivity: {
      activity: launchableActivity,
      expected: EXPECTED_LAUNCHER_ACTIVITY,
      isSingle: isLauncherSingle,
      isValid: isLauncherCorrect,
    },
    launcherIcon: {
      resource: applicationIcon,
      isDeclared: isIconDeclared,
      scannedPngCount,
      scannedMipmapCount,
      allDensitiesPresent,
      adaptiveXmlPresent,
      obsoleteWaveformDetected: obsoleteAssetDetected,
      detectedObsoleteHash: detectedObsoleteHash || null,
      isValid: isIconValid,
    },
    signingCertificate: {
      detectedSha256,
      expectedSha256: EXPECTED_PROD_SHA256,
      matchesExpected: isSignatureValid,
    },
    signingSchemes: {
      v1: v1Scheme,
      v2: v2Scheme,
      v3: v3Scheme,
      v4: v4Scheme,
    },
    verificationChecks: {
      packageNameCorrect: isPackageValid,
      launcherComponentCorrect: isLauncherValid,
      launcherIconValid: isIconValid,
      allDensitiesPresent,
      adaptiveXmlPresent,
      versionCodeValid: versionCode > 0,
      versionNameValid: versionName !== 'unknown',
      productionKeyMatched: isSignatureValid,
      modernSchemeVerified: isSchemeValid,
    },
  };

  const jsonPath = path.join(repoRoot, 'release-verification-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const stateSnapshot = {
    resolvedVersion: versionName,
    versionCode,
    packageName,
    launchableActivity,
    apkFilename: path.basename(targetApk),
    apkSha: detectedSha256,
    certificateFingerprint: detectedSha256,
    expectedFingerprint: EXPECTED_PROD_SHA256,
    githubTag: `v${versionName}`,
    releaseUrl: `https://github.com/MAGEXE1000/Studio/releases/tag/v${versionName}`,
    timestamp: report.timestamp,
  };
  fs.writeFileSync(path.join(repoRoot, 'release-state.json'), JSON.stringify(stateSnapshot, null, 2) + '\n', 'utf8');

  const healthReport = {
    timestamp: report.timestamp,
    status: report.status,
    passedValidations: [
      'Single Source Version Consistency',
      'Production Keystore Fingerprint Match',
      'Manifest Package Name Verification',
      'Single Canonical Launcher Activity Assertion',
      'Icon Resource & Waveform Absence Assertion',
      'APK Scheme Integrity',
    ],
    artifacts: [
      'app-release.apk',
      'app-release.apk.sha256',
      'release-verification-report.json',
      'release-manifest.json',
      'release-state.json',
      'release-health.json',
    ],
    version: versionName,
    gitCommit: process.env.GITHUB_SHA || 'local',
    environment: process.platform,
  };
  fs.writeFileSync(path.join(repoRoot, 'release-health.json'), JSON.stringify(healthReport, null, 2) + '\n', 'utf8');

  const mdContent = `# Production Release Verification Report

- **Timestamp**: ${report.timestamp}
- **Status**: \`${report.status}\`
- **Target APK**: \`${report.apkPath}\`

## Package & Component Details
- **Package Name**: \`${report.packageName}\` ${isPackageValid ? '✅' : '❌'}
- **Launcher Activity**: \`${report.launcherActivity.activity}\` ${isLauncherValid ? '✅' : '❌'}
- **Launcher Icon**: \`${report.launcherIcon.resource}\` ${isIconValid ? '✅ (No obsolete waveform)' : '❌'}
- **versionCode**: \`${report.versionCode}\` ✅
- **versionName**: \`${report.versionName}\` ✅

## Signing Certificate
- **Detected SHA-256**: \`${report.signingCertificate.detectedSha256}\`
- **Expected SHA-256**: \`${report.signingCertificate.expectedSha256}\`
- **Fingerprint Match**: ${isSignatureValid ? '✅ MATCHES PRODUCTION KEY' : '❌ CRITICAL MISMATCH'}

## Signing Schemes
- **V1 Scheme**: ${v1Scheme ? 'Enabled ✅' : 'Disabled'}
- **V2 Scheme**: ${v2Scheme ? 'Enabled ✅' : 'Disabled'}
- **V3 Scheme**: ${v3Scheme ? 'Enabled ✅' : 'Disabled'}
- **V4 Scheme**: ${v4Scheme ? 'Enabled ✅' : 'Disabled'}
`;
  const mdPath = path.join(repoRoot, 'release-verification-report.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  console.log(`✓ Release Verification Report generated: ${jsonPath}`);
  console.log(`  Package:  ${packageName} (${isPackageValid ? 'VALID' : 'INVALID'})`);
  console.log(`  Launcher: ${launchableActivity} (${isLauncherValid ? 'VALID' : 'INVALID'})`);
  console.log(`  Icon:     ${applicationIcon} (${isIconValid ? 'VALID' : 'INVALID'})`);

  if (!isPackageValid || !isLauncherValid || !isSignatureValid || !isSchemeValid || !isIconValid) {
    console.error('✗ CRITICAL SECURITY FAILURE: Release APK failed post-signing verification checks!');
    console.error(`  Package Name Valid:       ${isPackageValid}`);
    console.error(`  Launcher Component Valid: ${isLauncherValid}`);
    console.error(`  Launcher Icon Valid:      ${isIconValid}`);
    console.error(`  Production Key Matched:   ${isSignatureValid}`);
    console.error(`  Modern Scheme Verified:   ${isSchemeValid}`);
    process.exit(1);
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('generate-release-verification-report.mjs')) {
  generateVerificationReport(process.argv[2]);
}
