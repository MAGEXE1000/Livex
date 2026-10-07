#!/usr/bin/env node

/**
 * [DEPRECATED] verify-ui-screenshots.mjs
 *
 * Notice: Headless desktop browser screenshots (Puppeteer/Playwright) are permanently
 * deprecated for UI verification in Livex.
 *
 * The Android Studio ADB Emulator pipeline (scripts/android-verify/) is the single
 * canonical visual verification quality gate across the entire Livex project.
 *
 * Redirecting invocation to: node scripts/android-verify/deploy-emulator.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.warn('========================================================================');
console.warn('⚠️  [DEPRECATED] Headless desktop browser verification is deprecated.');
console.warn('    The Android Studio ADB emulator pipeline is now the sole standard.');
console.warn('    Redirecting to: pnpm android:verify (scripts/android-verify/deploy-emulator.mjs)');
console.warn('========================================================================\n');

const deployScript = path.resolve(__dirname, 'android-verify', 'deploy-emulator.mjs');
const child = spawn(process.execPath, [deployScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
