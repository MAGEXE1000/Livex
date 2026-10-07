#!/usr/bin/env node

/**
 * On-demand Android Emulator/Device Screenshot Capture Utility
 *
 * Captures real-time screen buffer from running emulator or physical hardware via ADB,
 * saving verified PNG artifacts to .artifacts/verification/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  captureDeviceScreenshot,
  getConnectedDevices,
  resolveAdb,
  selectTargetDevice,
} from './adb-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const ARTIFACTS_DIR = path.resolve(REPO_ROOT, '.artifacts/verification');

const customName = process.argv[2];

let adbPath;
try {
  adbPath = resolveAdb();
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
}

const targetDevice = selectTargetDevice(adbPath);

if (!targetDevice) {
  console.error('[ERROR] No active Android emulator or physical device detected.');
  const all = getConnectedDevices(adbPath);
  if (all.length > 0) {
    all.forEach((d) => console.log(` - ${d.id}: ${d.status}`));
  } else {
    console.log('Launch an emulator via Android Studio (Tools > Device Manager).');
  }
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const filename = customName
  ? (customName.endsWith('.png') ? customName : `${customName}.png`)
  : `android-emulator-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

const outputPath = path.resolve(ARTIFACTS_DIR, filename);

try {
  console.log(`[SCREENSHOT] Capturing screen from device ${targetDevice.id}...`);
  const { sizeBytes } = captureDeviceScreenshot(adbPath, targetDevice.id, outputPath);
  console.log(`✓ Screenshot captured successfully:`);
  console.log(`  Path: ${outputPath}`);
  console.log(`  Size: ${(sizeBytes / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error(`[ERROR] Failed to capture screenshot: ${err.message}`);
  process.exit(1);
}
