import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');

export async function checkOtaAndUpdater(options = {}) {
  const appVersionPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');

  if (!fs.existsSync(appVersionPath)) {
    return {
      name: 'OTA',
      pass: false,
      rootCause: `appVersion.ts configuration file missing at ${appVersionPath}.`,
      suggestedFix: 'Restore packages/livex-core/src/lib/startup/appVersion.ts.',
      priority: 'CRITICAL',
      expectedResolution: 'appVersion.ts file present with NATIVE_VERSION.',
    };
  }

  const content = fs.readFileSync(appVersionPath, 'utf8');
  const nativeMatch = content.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);

  if (!nativeMatch || !nativeMatch[1]) {
    return {
      name: 'OTA',
      pass: false,
      rootCause: 'Could not parse NATIVE_VERSION from appVersion.ts.',
      suggestedFix: 'Define export const NATIVE_VERSION = "x.y.z" in appVersion.ts.',
      priority: 'CRITICAL',
      expectedResolution: 'NATIVE_VERSION constant defined.',
    };
  }

  return {
    name: 'OTA',
    pass: true,
    details: `NATIVE_VERSION: ${nativeMatch[1]}`,
  };
}
