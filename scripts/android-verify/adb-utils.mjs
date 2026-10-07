import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Resolves the absolute path to the `adb` executable.
 * Searches PATH first, then well-known Android SDK paths across Windows, macOS, and Linux.
 *
 * @returns {string} Absolute path to adb
 */
export function resolveAdb() {
  if (process.env.ADB_PATH && fs.existsSync(process.env.ADB_PATH)) {
    return process.env.ADB_PATH;
  }

  // 1. Try resolving via system command lookup
  try {
    const whichCmd = process.platform === 'win32' ? 'where adb' : 'which adb';
    const output = execSync(whichCmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    const firstLine = output.split(/\r?\n/)[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Not found directly on PATH, fallback to SDK search
  }

  // 2. Platform-specific known paths
  const candidatePaths = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidatePaths.push(
      path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe')
    );
    if (process.env.ANDROID_HOME) {
      candidatePaths.push(path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'));
    }
    if (process.env.ANDROID_SDK_ROOT) {
      candidatePaths.push(path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidatePaths.push(
      path.join(os.homedir(), 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
      '/opt/homebrew/bin/adb',
      '/usr/local/bin/adb'
    );
    if (process.env.ANDROID_HOME) {
      candidatePaths.push(path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb'));
    }
  } else {
    // Linux
    candidatePaths.push(
      path.join(os.homedir(), 'Android', 'Sdk', 'platform-tools', 'adb'),
      '/usr/bin/adb',
      '/usr/local/bin/adb'
    );
    if (process.env.ANDROID_HOME) {
      candidatePaths.push(path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb'));
    }
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `ADB executable could not be found.\n` +
    `Checked standard locations and system PATH.\n` +
    `Please ensure Android SDK Platform-Tools is installed and in your PATH, ` +
    `or set the ADB_PATH environment variable.`
  );
}

/**
 * Returns a list of connected Android devices and emulators.
 *
 * @param {string} adbPath
 * @returns {Array<{ id: string, status: string, isEmulator: boolean, details: string }>}
 */
export function getConnectedDevices(adbPath = resolveAdb()) {
  try {
    const raw = execFileSync(adbPath, ['devices', '-l'], { encoding: 'utf8' });
    const lines = raw.split(/\r?\n/).slice(1); // skip "List of devices attached"
    const devices = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const id = parts[0];
      const status = parts[1];
      const details = parts.slice(2).join(' ');

      if (id && status) {
        devices.push({
          id,
          status,
          isEmulator: id.startsWith('emulator-'),
          details,
        });
      }
    }

    return devices;
  } catch (err) {
    throw new Error(`Failed to query ADB devices: ${err.message}`);
  }
}

/**
 * Selects an active device or emulator.
 * Prioritizes running emulators (id starting with "emulator-") if multiple devices are attached.
 *
 * @param {string} adbPath
 * @param {string|null} preferredId
 * @returns {{ id: string, status: string, isEmulator: boolean, details: string } | null}
 */
export function selectTargetDevice(adbPath = resolveAdb(), preferredId = null) {
  const devices = getConnectedDevices(adbPath);
  const active = devices.filter((d) => d.status === 'device');

  if (active.length === 0) {
    return null;
  }

  if (preferredId) {
    const found = active.find((d) => d.id === preferredId);
    if (found) return found;
  }

  // Prioritize emulator if available
  const emulator = active.find((d) => d.isEmulator);
  if (emulator) {
    return emulator;
  }

  // Fallback to first active device
  return active[0];
}

/**
 * Captures a screenshot from the target device/emulator and writes it to disk.
 * Employs a robust two-tier capture mechanism (direct binary buffer or shell pull)
 * to avoid newline corruption on Windows.
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {string} outputPath
 * @returns {{ outputPath: string, sizeBytes: number }}
 */
export function captureDeviceScreenshot(adbPath, deviceId, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let captured = false;

  // Strategy 1: Direct binary capture via exec-out
  try {
    const buffer = execFileSync(adbPath, ['-s', deviceId, 'exec-out', 'screencap', '-p'], {
      maxBuffer: 50 * 1024 * 1024,
    });

    // Verify PNG magic bytes: 0x89, 0x50, 0x4E, 0x47
    if (
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      fs.writeFileSync(outputPath, buffer);
      captured = true;
    }
  } catch {
    // Strategy 1 failed or exec-out unsupported, fall through to Strategy 2
  }

  // Strategy 2: Save to device temp storage and pull via ADB
  if (!captured) {
    const remoteTemp = `/data/local/tmp/screencap_${Date.now()}.png`;
    try {
      execFileSync(adbPath, ['-s', deviceId, 'shell', 'screencap', '-p', remoteTemp]);
      execFileSync(adbPath, ['-s', deviceId, 'pull', remoteTemp, outputPath]);
      execFileSync(adbPath, ['-s', deviceId, 'shell', 'rm', '-f', remoteTemp]);
      captured = true;
    } catch (err) {
      throw new Error(`Failed to capture screenshot via ADB: ${err.message}`);
    }
  }

  const stat = fs.statSync(outputPath);
  return {
    outputPath,
    sizeBytes: stat.size,
  };
}

/**
 * Launches an application activity via ADB.
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {string} packageId
 * @param {string} activity
 */
export function launchApp(adbPath, deviceId, packageId = 'com.chordex.app', activity = '.MainActivity') {
  try {
    // Force stop existing instance for clean cold boot
    execFileSync(adbPath, ['-s', deviceId, 'shell', 'am', 'force-stop', packageId]);
    // Launch component
    const component = `${packageId}/${activity}`;
    const result = execFileSync(adbPath, ['-s', deviceId, 'shell', 'am', 'start', '-n', component, '-W'], {
      encoding: 'utf8',
    });
    return result;
  } catch (err) {
    throw new Error(`Failed to launch app ${packageId}: ${err.message}`);
  }
}

/**
 * Sends a tap input event at specific (x, y) coordinates.
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {number} x
 * @param {number} y
 */
export function tapDevice(adbPath, deviceId, x, y) {
  try {
    execFileSync(adbPath, ['-s', deviceId, 'shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
  } catch (err) {
    throw new Error(`Failed to tap device at (${x}, ${y}): ${err.message}`);
  }
}

/**
 * Sends a swipe gesture from (x1, y1) to (x2, y2).
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} durationMs
 */
export function swipeDevice(adbPath, deviceId, x1, y1, x2, y2, durationMs = 300) {
  try {
    execFileSync(adbPath, [
      '-s',
      deviceId,
      'shell',
      'input',
      'swipe',
      String(Math.round(x1)),
      String(Math.round(y1)),
      String(Math.round(x2)),
      String(Math.round(y2)),
      String(Math.round(durationMs)),
    ]);
  } catch (err) {
    throw new Error(`Failed to swipe device from (${x1},${y1}) to (${x2},${y2}): ${err.message}`);
  }
}

/**
 * Sends a hardware key event (e.g. 4 for BACK, 3 for HOME).
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {number|string} keyCode
 */
export function sendKey(adbPath, deviceId, keyCode) {
  try {
    execFileSync(adbPath, ['-s', deviceId, 'shell', 'input', 'keyevent', String(keyCode)]);
  } catch (err) {
    throw new Error(`Failed to send keycode ${keyCode}: ${err.message}`);
  }
}

/**
 * Presses the Android system hardware BACK button (KEYCODE_BACK = 4).
 *
 * @param {string} adbPath
 * @param {string} deviceId
 */
export function pressBack(adbPath, deviceId) {
  sendKey(adbPath, deviceId, 4);
}

/**
 * Presses the Android system HOME button (KEYCODE_HOME = 3).
 *
 * @param {string} adbPath
 * @param {string} deviceId
 */
export function pressHome(adbPath, deviceId) {
  sendKey(adbPath, deviceId, 3);
}

/**
 * Types text onto the device's currently focused input element.
 * Spaces are converted to '%s' for ADB shell compatibility.
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {string} text
 */
export function inputText(adbPath, deviceId, text) {
  try {
    const formatted = text.replace(/ /g, '%s');
    execFileSync(adbPath, ['-s', deviceId, 'shell', 'input', 'text', formatted]);
  } catch (err) {
    throw new Error(`Failed to input text "${text}": ${err.message}`);
  }
}

/**
 * Retrieves the device screen resolution.
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @returns {{ width: number, height: number }}
 */
export function getDeviceScreenSize(adbPath, deviceId) {
  try {
    const raw = execFileSync(adbPath, ['-s', deviceId, 'shell', 'wm', 'size'], { encoding: 'utf8' });
    const match = raw.match(/Physical size:\s*(\d+)x(\d+)/) || raw.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10),
      };
    }
    throw new Error(`Unrecognized wm size output: ${raw}`);
  } catch (err) {
    throw new Error(`Failed to get device screen size: ${err.message}`);
  }
}

/**
 * Taps at a relative percentage of the screen width and height (0-100).
 *
 * @param {string} adbPath
 * @param {string} deviceId
 * @param {number} xPct 0 to 100
 * @param {number} yPct 0 to 100
 */
export function tapPercent(adbPath, deviceId, xPct, yPct) {
  const { width, height } = getDeviceScreenSize(adbPath, deviceId);
  const x = (width * xPct) / 100;
  const y = (height * yPct) / 100;
  tapDevice(adbPath, deviceId, x, y);
}

