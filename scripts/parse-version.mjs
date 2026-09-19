import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appVersionTsPath = path.join(repoRoot, 'packages/livex-core/src/lib/startup/appVersion.ts');

export function getAppVersionInfo() {
  if (!fs.existsSync(appVersionTsPath)) {
    throw new Error(`appVersion.ts not found at ${appVersionTsPath}`);
  }
  const content = fs.readFileSync(appVersionTsPath, 'utf8');
  const nativeVersionMatch = content.match(/export\s+const\s+NATIVE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  const nativeVersionCodeMatch = content.match(/export\s+const\s+NATIVE_VERSION_CODE\s*=\s*(\d+)/);
  const webVersionMatch = content.match(/export\s+const\s+WEB_VERSION\s*=\s*['"]([^'"]+)['"]/);
  const signatureMatch = content.match(/export\s+const\s+PRODUCTION_SIGNING_SHA256\s*=[\s\S]*?['"]([a-fA-F0-9:]{64})['"]/);

  if (!nativeVersionMatch) {
    throw new Error('NATIVE_VERSION not found in appVersion.ts');
  }
  if (!nativeVersionCodeMatch) {
    throw new Error('NATIVE_VERSION_CODE not found in appVersion.ts');
  }
  if (!webVersionMatch) {
    throw new Error('WEB_VERSION not found in appVersion.ts');
  }
  if (!signatureMatch && !process.env.EXPECTED_SIGNATURE_SHA256) {
    throw new Error('PRODUCTION_SIGNING_SHA256 not found in appVersion.ts');
  }

  const defaultSha = signatureMatch ? signatureMatch[1] : '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';
  const rawSig = process.env.EXPECTED_SIGNATURE_SHA256 || defaultSha;

  return {
    nativeVersion: nativeVersionMatch[1],
    nativeVersionCode: parseInt(nativeVersionCodeMatch[1], 10),
    webVersion: webVersionMatch[1],
    productionSigningSha256: rawSig.toLowerCase().replace(/:/g, '').trim(),
  };
}
