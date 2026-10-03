import assert from 'node:assert/strict';
import { fetchGitHubReleaseInfo } from '../release/github.mjs';
import { checkGitHubRelease } from '../releaseDoctor/checks/githubCheck.mjs';
import { checkFirebaseMetadata } from '../releaseDoctor/checks/firebaseCheck.mjs';
import { checkOtaAndUpdater } from '../releaseDoctor/checks/otaCheck.mjs';
import { buildDoctorReport } from '../releaseDoctor/report.mjs';

console.log('=== RUNNING RELEASE DOCTOR AUTOMATED TEST SUITE ===');

async function testProviderFallbackRest() {
  console.log('\n[Test 1] Provider Priority: REST API');
  const mockFetch = async (url) => {
    if (url.includes('api.github.com/repos')) {
      return {
        ok: true,
        json: async () => ({ tag_name: 'v4.3.54', name: '4.3.54', assets: [] }),
      };
    }
    return { ok: false };
  };

  const res = await fetchGitHubReleaseInfo('4.3.54', { fetchFn: mockFetch });
  assert.equal(res.exists, true);
  assert.equal(res.provider, 'REST API');
  console.log('✓ PASS: REST API correctly selected as primary provider');
}

async function testProviderFallbackGraphQL() {
  console.log('\n[Test 2] Provider Priority: GraphQL API');
  const mockFetch = async (url, opts) => {
    if (url.includes('api.github.com/graphql')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            repository: {
              release: { tagName: 'v4.3.54', name: '4.3.54', releaseAssets: { nodes: [] } },
            },
          },
        }),
      };
    }
    return { ok: false };
  };

  const res = await fetchGitHubReleaseInfo('4.3.54', { fetchFn: mockFetch, token: 'mock-token' });
  assert.equal(res.exists, true);
  assert.equal(res.provider, 'GraphQL');
  console.log('✓ PASS: GraphQL API correctly selected when REST fails');
}

async function testProviderFallbackCli() {
  console.log('\n[Test 3] Provider Priority: GitHub CLI Fallback');
  const mockFetch = async () => ({ ok: false });
  const mockExec = (cmd, args = []) => {
    const fullCmd = [cmd, ...(Array.isArray(args) ? args : [])].join(' ');
    if (fullCmd.includes('release view')) {
      return JSON.stringify({ tagName: 'v4.3.54', name: '4.3.54', assets: [] });
    }
    return '';
  };

  const res = await fetchGitHubReleaseInfo('4.3.54', { fetchFn: mockFetch, execFn: mockExec });
  assert.equal(res.exists, true);
  assert.equal(res.provider, 'GitHub CLI Fallback');
  console.log('✓ PASS: GitHub CLI correctly used as last-resort fallback');
}

async function testReleaseTitlePolicyViolation() {
  console.log('\n[Test 4] Release Naming Policy: Branding in title blocked');
  const mockFetch = async (url) => {
    if (url.includes('api.github.com/repos')) {
      return {
        ok: true,
        json: async () => ({ tag_name: 'v4.3.54', name: 'Studio v4.3.54', assets: [] }),
      };
    }
    return { ok: false };
  };

  const checkRes = await checkGitHubRelease('4.3.54', { fetchFn: mockFetch });
  assert.equal(checkRes.pass, false);
  assert.match(checkRes.rootCause, /violates naming policy/i);
  console.log('✓ PASS: Branded title ("Studio v4.3.54") correctly caught and reported');
}

async function testFirebase404Handling() {
  console.log('\n[Test 5] Firebase Metadata 404 (Initial Release)');
  const mockFetch = async () => ({ status: 404, ok: false });
  const checkRes = await checkFirebaseMetadata({ fetchFn: mockFetch });
  assert.equal(checkRes.pass, true);
  assert.match(checkRes.details, /HTTP 404/);
  console.log('✓ PASS: Firebase 404 correctly handled as initial release');
}

async function testReportHealthPercentage() {
  console.log('\n[Test 6] Report Aggregation & Health Calculation');
  const sampleChecks = [
    { name: 'GitHub Release', pass: true, details: 'OK' },
    { name: 'Git Tag', pass: true, details: 'OK' },
    { name: 'APK', pass: true, details: 'OK' },
    { name: 'Firebase', pass: true, details: 'OK' },
    { name: 'OTA', pass: true, details: 'OK' },
    { name: 'Signature', pass: true, details: 'OK' },
  ];

  const report = buildDoctorReport(sampleChecks);
  assert.equal(report.healthPercent, 100);
  assert.equal(report.isHealthy, true);
  console.log('✓ PASS: Health calculation verified at 100% for all-pass checks');
}

async function runAll() {
  await testProviderFallbackRest();
  await testProviderFallbackGraphQL();
  await testProviderFallbackCli();
  await testReleaseTitlePolicyViolation();
  await testFirebase404Handling();
  await testReportHealthPercentage();

  console.log('\n====================================================================');
  console.log('ALL RELEASE DOCTOR AUTOMATED TESTS PASSED CLEANLY (6/6)');
  console.log('====================================================================\n');
}

runAll().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
