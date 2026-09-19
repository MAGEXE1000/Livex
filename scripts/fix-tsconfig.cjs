const fs = require('fs');
const path = require('path');

const tsconfigs = [
  'packages/livex-core/tsconfig.json',
  'packages/ui-shared/tsconfig.json',
  'packages/ui-web/tsconfig.json',
  'packages/ui-android/tsconfig.json',
];

for (const p of tsconfigs) {
  const fullPath = path.join(__dirname, '..', p);
  if (fs.existsSync(fullPath)) {
    try {
      const data = fs.readFileSync(fullPath, 'utf8');
      const updated = data.replace(/"baseUrl"\s*:\s*".",?/g, '');
      fs.writeFileSync(fullPath, updated);
      console.log(`Updated ${p}`);
    } catch (e) {
      console.error(e);
    }
  }
}
