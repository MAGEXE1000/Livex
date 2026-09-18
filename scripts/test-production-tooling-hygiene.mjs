import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

console.log('=== Starting Production Tooling & Diagnostic Hygiene Test Suite ===\n');

console.log('--- Suite 1: Dead Prototype & Proof-of-Concept Packages ---');
assert(!existsSync(resolve(ROOT_DIR, 'packages/chordex-native-poc')), 'packages/chordex-native-poc is deleted');
assert(!existsSync(resolve(ROOT_DIR, 'lib/api-spec')), 'lib/api-spec is deleted');
assert(!existsSync(resolve(ROOT_DIR, 'lib/api-zod')), 'lib/api-zod is deleted');
assert(!existsSync(resolve(ROOT_DIR, 'lib/api-client-react')), 'lib/api-client-react is deleted');
assert(!existsSync(resolve(ROOT_DIR, 'artifacts/chord-app')), 'artifacts/chord-app untracked leftovers deleted');

console.log('\n--- Suite 2: Manifest & Configuration Reference Hygiene ---');
const rootTsConfig = readFileSync(resolve(ROOT_DIR, 'tsconfig.json'), 'utf8');
assert(!rootTsConfig.includes('lib/api-client-react'), 'root tsconfig.json does not reference api-client-react');
assert(!rootTsConfig.includes('lib/api-zod'), 'root tsconfig.json does not reference api-zod');

const coreTsConfig = readFileSync(resolve(ROOT_DIR, 'packages/studio-core/tsconfig.json'), 'utf8');
assert(!coreTsConfig.includes('lib/api-client-react'), 'studio-core tsconfig.json does not reference api-client-react');

const webTsConfig = readFileSync(resolve(ROOT_DIR, 'apps/studio-web/tsconfig.json'), 'utf8');
assert(!webTsConfig.includes('lib/api-client-react'), 'studio-web tsconfig.json does not reference api-client-react');

const androidTsConfig = readFileSync(resolve(ROOT_DIR, 'apps/studio-android/tsconfig.json'), 'utf8');
assert(!androidTsConfig.includes('lib/api-client-react'), 'studio-android tsconfig.json does not reference api-client-react');

const pkgs = ['packages/studio-core', 'packages/ui-shared', 'packages/ui-web', 'packages/ui-android'];
for (const p of pkgs) {
  const pkgJson = JSON.parse(readFileSync(resolve(ROOT_DIR, p, 'package.json'), 'utf8'));
  const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  assert(!deps['@workspace/api-client-react'], `${p}/package.json does not depend on @workspace/api-client-react`);
  assert(!deps['@workspace/db'], `${p}/package.json does not depend on @workspace/db`);
}

console.log('\n--- Suite 3: Diagnostic UI Production Hardening ---');
const androidMain = readFileSync(resolve(ROOT_DIR, 'apps/studio-android/src/main.tsx'), 'utf8');
assert(
  androidMain.includes("const LazyEmergencyOverlay = import.meta.env.DEV ? lazy(() => import('./EmergencyDebugOverlay')) : null;") ||
  androidMain.includes('const LazyEmergencyOverlay = import.meta.env.DEV'),
  'studio-android main.tsx gates LazyEmergencyOverlay to import.meta.env.DEV'
);
assert(
  androidMain.includes('if (!import.meta.env.DEV || !LazyEmergencyOverlay) return null;'),
  'EmergencyDebugOverlayWrapper guards against non-DEV execution'
);

const sharedAppShell = readFileSync(
  resolve(ROOT_DIR, 'packages/ui-shared/src/shared/layout/SharedAppShell.tsx'),
  'utf8'
);
assert(
  sharedAppShell.includes('const InspectorRouteTracer = import.meta.env.DEV'),
  'SharedAppShell gates InspectorRouteTracer to import.meta.env.DEV'
);
assert(
  sharedAppShell.includes('InspectorRouteTracer && developerMode'),
  'SharedAppShell guards InspectorRouteTracer rendering with truthiness check'
);

console.log('\n--- Suite 4: DevTools Code-Splitting & Orphan Import Hygiene ---');
const studioHub = readFileSync(
  resolve(ROOT_DIR, 'packages/ui-shared/src/features/hub/components/StudioHub.tsx'),
  'utf8'
);
assert(!studioHub.includes('DevToolsDashboard'), 'StudioHub.tsx has zero unused DevToolsDashboard imports');

const hubSettings = readFileSync(
  resolve(ROOT_DIR, 'packages/ui-shared/src/features/hub/settings/HubSettings.tsx'),
  'utf8'
);
assert(
  hubSettings.includes("const DevToolsDashboard = lazy(() => import('../../devtools/components/DevToolsDashboard'));"),
  'HubSettings.tsx uses lazy-loaded DevToolsDashboard instead of static top-level import'
);

console.log('\n--- Suite 5: Production Bundle Asset Inspection ---');
const distWebAssets = resolve(ROOT_DIR, 'dist/web/assets');
if (existsSync(distWebAssets)) {
  const webFiles = readdirSync(distWebAssets);
  const webHasTracer = webFiles.some((f) => f.startsWith('InspectorRouteTracer'));
  assert(!webHasTracer, 'dist/web/assets contains 0 InspectorRouteTracer chunks');
} else {
  console.log('  ⚠ dist/web/assets not yet built (run build:web to verify)');
}

const distAndroidAssets = resolve(ROOT_DIR, 'dist/android-web/assets');
if (existsSync(distAndroidAssets)) {
  const androidFiles = readdirSync(distAndroidAssets);
  const androidHasEmergency = androidFiles.some((f) => f.startsWith('EmergencyDebugOverlay'));
  const androidHasTracer = androidFiles.some((f) => f.startsWith('InspectorRouteTracer'));
  assert(!androidHasEmergency, 'dist/android-web/assets contains 0 EmergencyDebugOverlay chunks');
  assert(!androidHasTracer, 'dist/android-web/assets contains 0 InspectorRouteTracer chunks');
} else {
  console.log('  ⚠ dist/android-web/assets not yet built (run build:android:web to verify)');
}

console.log('\n========================================');
console.log(`Tests finished: ${passedTests} passed, ${totalTests - passedTests} failed`);
console.log('========================================\n');
