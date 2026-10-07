/**
 * Android Studio Emulator Deployment & Verification Runner (TypeScript Interface)
 *
 * Provides a TypeScript-typed programmatic and CLI entry point for the
 * Android Studio emulator deployment pipeline.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, 'deploy-emulator.mjs');

export interface DeployOptions {
  skipBuild?: boolean;
  noScreenshot?: boolean;
  deviceId?: string;
}

export function runDeployEmulator(options: DeployOptions = {}): Promise<void> {
  const args = [SCRIPT_PATH];
  if (options.skipBuild) args.push('--skip-build');
  if (options.noScreenshot) args.push('--no-screenshot');
  if (options.deviceId) args.push('--device', options.deviceId);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`deploy-emulator exited with status code ${code}`));
      }
    });
  });
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('deploy-emulator.ts')) {
  const args = process.argv.slice(2);
  runDeployEmulator({
    skipBuild: args.includes('--skip-build'),
    noScreenshot: args.includes('--no-screenshot'),
  }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
