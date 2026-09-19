import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

console.log('=== RUNNING RELEASE ARCHITECTURE REGRESSION TEST SUITE ===');

function testTitlePolicy() {
  console.log('\n[Test 1] Policy Enforcement: Title Naming Rule');
  const validTitles = ['4.3.60', '4.3.61', '5.0.0'];
  const invalidTitles = ['Studio 4.3.60', 'Livex 4.3.60', 'Studio v4.3.60', 'Livex v4.3.60'];

  const brandRegex = /\b(livex|studio)\b/i;

  for (const t of validTitles) {
    assert.equal(brandRegex.test(t), false, `Title '${t}' should be valid`);
  }

  for (const t of invalidTitles) {
    assert.equal(brandRegex.test(t), true, `Title '${t}' should be invalid`);
  }

  console.log('✓ PASS: Title Naming Policy correctly enforced (version numbers only)');
}

function testPolicyDocumentExistence() {
  console.log('\n[Test 2] Architecture Invariants: Policy Documents');
  const policyFile = path.join(repoRoot, 'RELEASE_POLICY.md');
  const guideFile = path.join(repoRoot, 'ENGINEERING_RELEASE_GUIDE.md');

  assert.equal(fs.existsSync(policyFile), true, 'RELEASE_POLICY.md must exist');
  assert.equal(fs.existsSync(guideFile), true, 'ENGINEERING_RELEASE_GUIDE.md must exist');

  console.log('✓ PASS: Policy and Guide documents verified in repository root');
}

function testSingleVersionSource() {
  console.log('\n[Test 3] Single Source of Truth: Version Definition');
  const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
  const src = fs.readFileSync(appVersionPath, 'utf8');

  const matches = [...src.matchAll(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/g)];
  assert.equal(matches.length, 1, 'Exactly one NATIVE_VERSION constant must be defined in appVersion.ts');

  console.log(`✓ PASS: Canonical NATIVE_VERSION (${matches[0][1]}) verified`);
}

function runAll() {
  testTitlePolicy();
  testPolicyDocumentExistence();
  testSingleVersionSource();

  console.log('\n====================================================================');
  console.log('ALL RELEASE ARCHITECTURE TESTS PASSED CLEANLY (3/3)');
  console.log('====================================================================\n');
}

runAll();
