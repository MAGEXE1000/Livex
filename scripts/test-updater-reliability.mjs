/**
 * scripts/test-updater-reliability.mjs
 *
 * Driver script for running the updater reliability test suite.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

console.log('--- Running Livex Updater Reliability Test Suite ---');

const isWindows = process.platform === 'win32';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(
  pnpmCmd,
  [
    '--filter',
    '@workspace/livex-core',
    'test',
    'src/lib/updater/__tests__/updater_reliability.test.ts',
    '--run',
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: isWindows,
  }
);

if (result.status !== 0) {
  console.error('\n✗ Updater reliability tests failed!');
  process.exit(result.status ?? 1);
} else {
  console.log('\n✓ All updater reliability invariants passed!\n');
}
