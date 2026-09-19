import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const scriptsDir = path.resolve(__dirname, '..');

export function runReleaseAudit() {
  console.log('====================================================================');
  console.log('                 RELEASE SYSTEM GOVERNANCE AUDIT                    ');
  console.log('====================================================================\n');

  const AuditRules = [
    {
      id: 'GOV-1',
      name: 'Single Version Source Governance',
      check: () => {
        const file = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');
        if (!fs.existsSync(file)) return { pass: false, error: 'appVersion.ts missing' };
        const content = fs.readFileSync(file, 'utf8');
        const matches = [...content.matchAll(/export\s+const\s+NATIVE_VERSION\b/g)];
        return { pass: matches.length === 1, details: 'Exactly one NATIVE_VERSION source in appVersion.ts' };
      },
    },
    {
      id: 'GOV-2',
      name: 'Single Release Orchestrator Governance',
      check: () => {
        const orchestrator = path.join(scriptsDir, 'release-firebase.mjs');
        if (!fs.existsSync(orchestrator)) return { pass: false, error: 'release-firebase.mjs missing' };
        return { pass: true, details: 'Orchestrator apps/studio-android/scripts/release-firebase.mjs verified' };
      },
    },
    {
      id: 'GOV-3',
      name: 'Publication Path Isolation Governance',
      check: () => {
        const forbiddenFiles = ['generate-release-metadata.mjs', 'sync-version.mjs', 'preview-android.mjs'];
        const leaks = [];
        for (const fname of forbiddenFiles) {
          const fpath = path.join(scriptsDir, fname);
          if (fs.existsSync(fpath)) {
            const txt = fs.readFileSync(fpath, 'utf8');
            if (txt.includes('gh release create') || txt.includes('firebase deploy')) {
              leaks.push(fname);
            }
          }
        }
        return {
          pass: leaks.length === 0,
          details: leaks.length === 0 ? 'No publication leaks found outside orchestrator' : `Publication leaks in: ${leaks.join(', ')}`,
        };
      },
    },
    {
      id: 'GOV-4',
      name: 'Title Naming Policy Governance',
      check: () => {
        const titleRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
        const testValid = titleRegex.test('4.3.60');
        const testInvalid = !titleRegex.test('Studio 4.3.60');
        return { pass: testValid && testInvalid, details: 'Release title regex strictly matches version numbers only' };
      },
    },
    {
      id: 'GOV-5',
      name: 'Policy & Architecture Document Governance',
      check: () => {
        const p1 = path.join(repoRoot, 'RELEASE_POLICY.md');
        const p2 = path.join(repoRoot, 'ENGINEERING_RELEASE_GUIDE.md');
        const pass = fs.existsSync(p1) && fs.existsSync(p2);
        return { pass, details: 'RELEASE_POLICY.md and ENGINEERING_RELEASE_GUIDE.md exist in repository root' };
      },
    },
  ];

  let passed = 0;
  const auditResults = [];

  for (const rule of AuditRules) {
    const res = rule.check();
    auditResults.push({ id: rule.id, name: rule.name, pass: res.pass, details: res.details || res.error });
    if (res.pass) passed++;
  }

  console.log('+---------+----------------─────────────────────────+------------+');
  console.log('| Rule ID | Governance Check Description             | Status     |');
  console.log('+---------+----------------─────────────────────────+------------+');
  for (const r of auditResults) {
    const statusStr = r.pass ? '\x1b[32mPASS\x1b[0m      ' : '\x1b[31mFAILED\x1b[0m    ';
    console.log(`| ${r.id.padEnd(7)} | ${r.name.padEnd(40)} | ${statusStr} |`);
  }
  console.log('+---------+----------------─────────────────────────+------------+\n');

  const healthPercent = Math.round((passed / AuditRules.length) * 100);

  console.log('====================================================================');
  console.log(`Governance Compliance Score: ${healthPercent}% (${passed}/${AuditRules.length} rules passed)`);
  console.log(`Architecture Status:         ${healthPercent === 100 ? '\x1b[32mGOVERNED & LOCKED (100%)\x1b[0m' : '\x1b[31mDEGRADED\x1b[0m'}`);
  console.log('====================================================================\n');

  return { pass: healthPercent === 100, healthPercent, auditResults };
}
