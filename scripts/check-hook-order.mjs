#!/usr/bin/env node
/**
 * check-hook-order.mjs — TDZ Hook Order & Variable Scope Regression Guard
 *
 * Scans React navigation, shell, and layout components for Temporal Dead Zone (TDZ)
 * hazards where hooks, refs, motion values, state, or variables are evaluated
 * before their declaration line in the same component.
 *
 * Scope:
 *   packages/ui-shared/src/features/hub/navigation/
 *   packages/ui-shared/src/shared/layout/
 *   packages/ui-shared/src/navigation/
 *   apps/studio-android/src/
 *   apps/studio-web/src/
 *
 * Run:
 *   node scripts/check-hook-order.mjs
 *   pnpm check:hook-order
 *
 * Exit codes:
 *   0 — clean, zero TDZ hazards detected
 *   1 — one or more use-before-define violations found
 */

import { ESLint } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const TARGET_PATHS = [
  path.join(repoRoot, 'packages/ui-shared/src/features/hub/navigation'),
  path.join(repoRoot, 'packages/ui-shared/src/features/groovex'),
  path.join(repoRoot, 'packages/ui-shared/src/shared/layout'),
  path.join(repoRoot, 'packages/ui-shared/src/navigation'),
  path.join(repoRoot, 'apps/studio-android/src'),
  path.join(repoRoot, 'apps/studio-web/src'),
];

console.log('=== RUNNING TDZ HOOK ORDER & VARIABLE SCOPE REGRESSION GUARD ===');

async function run() {
  const eslint = new ESLint({
    overrideConfigFile: path.join(repoRoot, 'eslint.config.mjs'),
  });

  const results = await eslint.lintFiles(TARGET_PATHS);
  let violationCount = 0;

  for (const fileResult of results) {
    const relativeFilePath = path.relative(repoRoot, fileResult.filePath);
    const tdzErrors = fileResult.messages.filter(
      (m) =>
        m.ruleId === '@typescript-eslint/no-use-before-define' ||
        m.ruleId === 'no-use-before-define' ||
        (m.ruleId === 'react-hooks/rules-of-hooks' && m.severity >= 1)
    );

    if (tdzErrors.length > 0) {
      for (const err of tdzErrors) {
        violationCount++;
        console.error(
          `❌ [TDZ REGRESSION GUARD ERROR] ${relativeFilePath}:${err.line}:${err.column}`
        );
        console.error(`   Rule: ${err.ruleId}`);
        console.error(`   Message: ${err.message}`);
      }
    }
  }

  if (violationCount > 0) {
    console.error(
      `\n❌ FAILED: ${violationCount} TDZ / use-before-define violation(s) found in critical UI scopes.`
    );
    console.error(
      'Ensure all hooks, refs, motion values, and variables are declared before their first usage.'
    );
    process.exit(1);
  }

  console.log('✓ TDZ hook order & variable scope check passed cleanly — zero violations.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during TDZ guard execution:', err);
  process.exit(1);
});
