#!/usr/bin/env node

/**
 * Android Device / Emulator Interactive Input CLI
 *
 * Allows agents and developers to drive UI interactions (taps, swipes, keyevents, text)
 * directly on the running Android Studio emulator without manual touches.
 *
 * Examples:
 *   node scripts/android-verify/interact.mjs tap 540 1200
 *   node scripts/android-verify/interact.mjs tap-pct 50 95
 *   node scripts/android-verify/interact.mjs back
 *   node scripts/android-verify/interact.mjs home
 *   node scripts/android-verify/interact.mjs swipe 500 1500 500 500 300
 *   node scripts/android-verify/interact.mjs text "Search query"
 *   node scripts/android-verify/interact.mjs size
 */

import {
  getDeviceScreenSize,
  inputText,
  pressBack,
  pressHome,
  resolveAdb,
  selectTargetDevice,
  sendKey,
  swipeDevice,
  tapDevice,
  tapPercent,
} from './adb-utils.mjs';

const [action, ...params] = process.argv.slice(2);

if (!action || action === '--help' || action === '-h') {
  console.log(`
Usage: node scripts/android-verify/interact.mjs <action> [params...]

Actions:
  tap <x> <y>                   Tap at exact coordinates (e.g. tap 540 1200)
  tap-pct <xPct> <yPct>         Tap at screen percentage 0-100 (e.g. tap-pct 50 92 for bottom tab)
  swipe <x1> <y1> <x2> <y2> [t] Swipe gesture between coordinates with duration in ms (default: 300)
  back                          Press hardware BACK button (KEYCODE_BACK)
  home                          Press hardware HOME button (KEYCODE_HOME)
  text <string>                 Type text into currently focused input field
  key <keycode>                 Send arbitrary keycode (e.g. 66 for ENTER)
  size                          Print screen physical resolution
`);
  process.exit(0);
}

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
  process.exit(1);
}

const deviceId = targetDevice.id;

switch (action.toLowerCase()) {
  case 'tap': {
    const x = parseFloat(params[0]);
    const y = parseFloat(params[1]);
    if (isNaN(x) || isNaN(y)) {
      console.error('[ERROR] tap requires numeric x and y parameters');
      process.exit(1);
    }
    tapDevice(adbPath, deviceId, x, y);
    console.log(`✓ Tapped device ${deviceId} at (${x}, ${y})`);
    break;
  }

  case 'tap-pct': {
    const xPct = parseFloat(params[0]);
    const yPct = parseFloat(params[1]);
    if (isNaN(xPct) || isNaN(yPct)) {
      console.error('[ERROR] tap-pct requires numeric xPct and yPct (0-100)');
      process.exit(1);
    }
    tapPercent(adbPath, deviceId, xPct, yPct);
    console.log(`✓ Tapped device ${deviceId} at percentage (${xPct}%, ${yPct}%)`);
    break;
  }

  case 'swipe': {
    const x1 = parseFloat(params[0]);
    const y1 = parseFloat(params[1]);
    const x2 = parseFloat(params[2]);
    const y2 = parseFloat(params[3]);
    const duration = params[4] ? parseInt(params[4], 10) : 300;
    if ([x1, y1, x2, y2].some(isNaN)) {
      console.error('[ERROR] swipe requires x1 y1 x2 y2 parameters');
      process.exit(1);
    }
    swipeDevice(adbPath, deviceId, x1, y1, x2, y2, duration);
    console.log(`✓ Swiped from (${x1}, ${y1}) to (${x2}, ${y2}) in ${duration}ms`);
    break;
  }

  case 'back': {
    pressBack(adbPath, deviceId);
    console.log(`✓ Pressed BACK button on device ${deviceId}`);
    break;
  }

  case 'home': {
    pressHome(adbPath, deviceId);
    console.log(`✓ Pressed HOME button on device ${deviceId}`);
    break;
  }

  case 'text': {
    const text = params.join(' ');
    if (!text) {
      console.error('[ERROR] text requires text string to type');
      process.exit(1);
    }
    inputText(adbPath, deviceId, text);
    console.log(`✓ Typed text into focused field on device ${deviceId}`);
    break;
  }

  case 'key': {
    const keyCode = parseInt(params[0], 10);
    if (isNaN(keyCode)) {
      console.error('[ERROR] key requires numeric keyCode');
      process.exit(1);
    }
    sendKey(adbPath, deviceId, keyCode);
    console.log(`✓ Sent keycode ${keyCode} to device ${deviceId}`);
    break;
  }

  case 'size': {
    const size = getDeviceScreenSize(adbPath, deviceId);
    console.log(`✓ Physical screen size: ${size.width}x${size.height}`);
    break;
  }

  default:
    console.error(`[ERROR] Unknown action "${action}". Run with --help for available actions.`);
    process.exit(1);
}
