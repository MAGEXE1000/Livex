#!/usr/bin/env node

/**
 * Android Studio Emulator Automated Deploy & Verification Script
 *
 * Automates:
 * 1. Android web bundle build & Capacitor native asset sync
 * 2. Native Gradle debug APK compilation
 * 3. Emulator/device detection via ADB with clear setup diagnostics
 * 4. Package installation and clean application launch
 * 5. High-resolution screenshot capture to .artifacts/verification/
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  captureDeviceScreenshot,
  getConnectedDevices,
  launchApp,
  resolveAdb,
  selectTargetDevice,
} from './adb-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_DIR = path.resolve(REPO_ROOT, 'apps/studio-android');
const ANDROID_DIR = path.resolve(APP_DIR, 'android');
const APK_SOURCE = path.resolve(ANDROID_DIR, 'app/build/outputs/apk/debug/app-debug.apk');
const ARTIFACTS_DIR = path.resolve(REPO_ROOT, '.artifacts/verification');

const PACKAGE_ID = 'com.chordex.app';
const MAIN_ACTIVITY = '.MainActivity';

// Parse CLI arguments
const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const noScreenshot = args.includes('--no-screenshot');
const deviceArgIndex = args.indexOf('--device');
const preferredDeviceId = deviceArgIndex !== -1 ? args[deviceArgIndex + 1] : null;

console.log('========================================================================');
console.log('   LIVEX ANDROID EMULATOR AUTOMATED DEPLOYMENT & VERIFICATION PIPELINE   ');
console.log('========================================================================');

// 1. Resolve ADB
let adbPath;
try {
  adbPath = resolveAdb();
  console.log(`[ADB] Found ADB at: ${adbPath}`);
} catch (err) {
  console.error(`\n❌ [ERROR] ${err.message}`);
  process.exit(1);
}

// 2. Detect Running Devices / Emulators
const targetDevice = selectTargetDevice(adbPath, preferredDeviceId);

if (!targetDevice) {
  const allDevices = getConnectedDevices(adbPath);
  console.log('\n========================================================================');
  console.log('❌ NO ACTIVE ANDROID EMULATOR OR DEVICE DETECTED');
  console.log('========================================================================');

  if (allDevices.length > 0) {
    console.log('\nFound devices with non-ready status:');
    allDevices.forEach((d) => console.log(` - ${d.id}: ${d.status} (${d.details})`));
    console.log('Please ensure the device is unlocked and authorized.');
  } else {
    console.log('\nPlease prepare and start an Android Virtual Device (AVD) in Android Studio:');
    console.log('  1. Launch Android Studio (e.g. from C:\\Program Files\\Android\\Android Studio).');
    console.log('  2. Open the "apps/studio-android/android" project.');
    console.log('  3. Open Device Manager (Tools > Device Manager).');
    console.log('  4. Select or create an emulator (e.g., Pixel 8 with API 34/35).');
    console.log('  5. Click the "Play" (Launch) button to boot the emulator.');
    console.log('  6. Keep the emulator window open to watch changes render live.');
  }
  console.log('========================================================================\n');
  process.exit(1);
}

console.log(`[DEVICE] Target Device: ${targetDevice.id} (${targetDevice.isEmulator ? 'Emulator' : 'Physical Hardware'})`);
if (targetDevice.details) {
  console.log(`[DEVICE] Details: ${targetDevice.details}`);
}

// 3. Setup Build Environment (Java 21 / PATH)
const customEnv = { ...process.env };
if (process.platform === 'win32') {
  const java21Candidates = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.8-hotspot',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.11.10-hotspot',
  ];
  for (const javaPath of java21Candidates) {
    if (fs.existsSync(javaPath)) {
      customEnv.JAVA_HOME = javaPath;
      customEnv.PATH = `${path.join(javaPath, 'bin')};${customEnv.PATH || ''}`;
      break;
    }
  }
}

// Helper to execute commands with unified logging
function run(cmd, cwd = REPO_ROOT) {
  console.log(`\n> ${cmd} (cwd: ${path.relative(REPO_ROOT, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: customEnv });
}

// 4. Build, Sync, and Package APK (unless --skip-build is set)
if (!skipBuild) {
  try {
    console.log('\n[1/3] Building Android Web Application Bundle (Vite)...');
    run('pnpm --filter @workspace/studio-android build', REPO_ROOT);

    console.log('\n[2/3] Syncing Capacitor Android Native Assets & Plugins...');
    run('npx cap sync android', APP_DIR);

    console.log('\n[3/3] Compiling Native Android Debug APK via Gradle...');
    const gradleCmd = process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';
    run(gradleCmd, ANDROID_DIR);
  } catch (err) {
    console.error(`\n❌ [BUILD FAILURE] Failed during native compilation: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('\n[INFO] Skipping build step (--skip-build requested).');
}

// 5. Verify Compiled APK
if (!fs.existsSync(APK_SOURCE)) {
  console.error(`\n❌ [ERROR] Compiled APK not found at: ${APK_SOURCE}`);
  process.exit(1);
}

const apkStats = fs.statSync(APK_SOURCE);
const apkSizeMb = (apkStats.size / (1024 * 1024)).toFixed(2);
console.log(`\n[APK] Verified Debug APK: ${APK_SOURCE} (${apkSizeMb} MB)`);

// 6. Deploy APK to Target Device
try {
  console.log(`\n[DEPLOY] Installing APK on ${targetDevice.id}...`);
  execSync(`"${adbPath}" -s "${targetDevice.id}" install -r -d "${APK_SOURCE}"`, {
    stdio: 'inherit',
    env: customEnv,
  });
  console.log('✓ APK installation completed successfully.');
} catch (err) {
  console.error(`\n❌ [DEPLOY FAILURE] Failed to install APK on ${targetDevice.id}: ${err.message}`);
  process.exit(1);
}

// 7. Launch App Activity
try {
  console.log(`\n[LAUNCH] Starting ${PACKAGE_ID}/${MAIN_ACTIVITY}...`);
  launchApp(adbPath, targetDevice.id, PACKAGE_ID, MAIN_ACTIVITY);
  console.log('✓ Main activity launched.');
} catch (err) {
  console.error(`\n❌ [LAUNCH FAILURE] Failed to launch application: ${err.message}`);
  process.exit(1);
}

// 8. Wait for UI stabilization
console.log('\n[WAIT] Waiting 4 seconds for UI rendering and initialization...');
execSync(process.platform === 'win32' ? 'timeout /t 4 /nobreak >nul' : 'sleep 4', { stdio: 'ignore' });

// 9. Automated Screenshot Verification (unless --no-screenshot)
if (!noScreenshot) {
  try {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotName = `android-emulator-${timestamp}.png`;
    const outputPath = path.resolve(ARTIFACTS_DIR, screenshotName);
    const canonicalPath = path.resolve(ARTIFACTS_DIR, 'android-studio-emulator.png');

    console.log(`\n[SCREENSHOT] Capturing screen from ${targetDevice.id}...`);
    const { sizeBytes } = captureDeviceScreenshot(adbPath, targetDevice.id, outputPath);
    fs.copyFileSync(outputPath, canonicalPath);

    console.log(`✓ Screenshot captured successfully:`);
    console.log(`  Artifact: ${outputPath} (${(sizeBytes / 1024).toFixed(1)} KB)`);
    console.log(`  Canonical: ${canonicalPath}`);
  } catch (err) {
    console.warn(`⚠ [WARNING] Failed to capture verification screenshot: ${err.message}`);
  }
}

console.log('\n========================================================================');
console.log('✓ DEPLOYMENT & VERIFICATION COMPLETED SUCCESSFULLY');
console.log(`  - Target: ${targetDevice.id}`);
console.log(`  - Application: ${PACKAGE_ID}`);
console.log('  - Live inspection is active in your Android Studio Emulator screen.');
console.log('========================================================================\n');
