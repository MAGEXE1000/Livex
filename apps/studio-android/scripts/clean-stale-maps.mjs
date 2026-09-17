import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '../..');

const isExplicitSourceMap =
  process.env.SOURCE_MAP === 'true' || process.env.SOURCE_MAP === 'hidden';

if (isExplicitSourceMap) {
  console.log('[clean-stale-maps] SOURCE_MAP is explicitly enabled. Preserving source maps.');
  process.exit(0);
}

function purgeMapFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let removedCount = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removedCount += purgeMapFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.map')) {
      try {
        fs.unlinkSync(fullPath);
        removedCount++;
      } catch (err) {
        console.warn(`[clean-stale-maps] Failed to delete ${fullPath}:`, err.message);
      }
    }
  }
  return removedCount;
}

const targets = [
  path.join(appRoot, 'android/app/src/main/assets/public'),
  path.join(repoRoot, 'dist/android-web'),
];

let totalPurged = 0;
for (const target of targets) {
  const purged = purgeMapFiles(target);
  totalPurged += purged;
}

if (totalPurged > 0) {
  console.log(`[clean-stale-maps] Purged ${totalPurged} stale .map file(s) from production assets.`);
} else {
  console.log('[clean-stale-maps] No stale .map files found.');
}
