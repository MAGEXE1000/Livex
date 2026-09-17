import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`  ✓ ${message}`);
  }
}

console.log('=== Starting Dependency Hygiene & Security Exposure Test Suite ===\n');

console.log('--- Suite 1: Workspace Package Hygiene & Orphan Removal ---');
const workspaceYamlPath = resolve(ROOT_DIR, 'pnpm-workspace.yaml');
const workspaceYaml = readFileSync(workspaceYamlPath, 'utf8');

assert(!workspaceYaml.includes('artifacts/*'), 'pnpm-workspace.yaml does not declare artifacts/* as workspace packages');
assert(!workspaceYaml.includes('lib/integrations/*'), 'pnpm-workspace.yaml does not declare lib/integrations/*');
assert(!existsSync(resolve(ROOT_DIR, 'artifacts/api-server')), 'artifacts/api-server directory is completely removed');
assert(!existsSync(resolve(ROOT_DIR, 'artifacts/mockup-sandbox')), 'artifacts/mockup-sandbox directory is completely removed');
assert(!workspaceYaml.includes('@capacitor/cli@6.2.1'), 'Obsolete @capacitor/cli@6.2.1 packageExtension is removed');

console.log('\n--- Suite 2: Security Overrides & Direct Dependency Versions ---');
assert(workspaceYaml.includes("'tar': '7.5.22'"), 'pnpm-workspace.yaml overrides tar to 7.5.22');
assert(workspaceYaml.includes("'dompurify': '3.4.15'"), 'pnpm-workspace.yaml overrides dompurify to 3.4.15');
assert(workspaceYaml.includes("'fast-uri': '3.1.6'"), 'pnpm-workspace.yaml overrides fast-uri to 3.1.6');
assert(workspaceYaml.includes("'postcss': '8.5.28'"), 'pnpm-workspace.yaml overrides postcss to 8.5.28');
assert(workspaceYaml.includes("'websocket-driver': '0.7.5'"), 'pnpm-workspace.yaml overrides websocket-driver to 0.7.5');
assert(workspaceYaml.includes("'@grpc/grpc-js': '1.14.4'"), 'pnpm-workspace.yaml overrides @grpc/grpc-js to 1.14.4');
assert(workspaceYaml.includes("'protobufjs@7': '7.6.6'"), 'pnpm-workspace.yaml overrides protobufjs@7 to 7.6.6');

const studioAndroidPkg = JSON.parse(readFileSync(resolve(ROOT_DIR, 'apps/studio-android/package.json'), 'utf8'));
assert(studioAndroidPkg.devDependencies?.['adm-zip'] === '^0.6.1', 'apps/studio-android specifies adm-zip ^0.6.1');

const apiSpecPkg = JSON.parse(readFileSync(resolve(ROOT_DIR, 'lib/api-spec/package.json'), 'utf8'));
assert(apiSpecPkg.devDependencies?.['orval'] === '^8.33.0', 'lib/api-spec specifies patched orval ^8.33.0');

console.log('\n--- Suite 3: Vulnerability Audit Verification ---');
try {
  execSync('pnpm.cmd audit --audit-level high', { cwd: ROOT_DIR, stdio: 'pipe' });
  assert(true, 'pnpm audit --audit-level high passes with 0 critical and 0 high advisories');
} catch (err) {
  assert(false, `pnpm audit --audit-level high failed: ${err.message}`);
}

try {
  const prodOutput = execSync('pnpm.cmd audit --prod', { cwd: ROOT_DIR, encoding: 'utf8' });
  assert(prodOutput.includes('No known vulnerabilities found'), 'pnpm audit --prod reports no known vulnerabilities in production dependencies');
} catch (err) {
  assert(false, `pnpm audit --prod failed: ${err.message}`);
}

console.log('\n========================================');
console.log(`Tests finished: ${passedTests} passed, ${totalTests - passedTests} failed`);
console.log('========================================\n');
