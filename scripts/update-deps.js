const fs = require('fs');
const path = require('path');

const packagesToUpdate = {
  '@capacitor-firebase/authentication': '^8.3.0',
  '@capacitor/android': '^8.4.1',
  '@capacitor/app': '^8.1.0',
  '@capacitor/core': '^8.4.1',
  '@capacitor/filesystem': '^8.1.2',
  '@capacitor/local-notifications': '^8.2.0',
  '@capacitor/screen-orientation': '^8.0.1',
  '@capacitor/share': '^8.0.1',
  '@capacitor/status-bar': '^8.0.2',
  '@capacitor/cli': '^8.4.1',
  '@radix-ui/react-dropdown-menu': '^2.1.20',
  '@soundtouchjs/audio-worklet': '^2.1.0',
  '@supabase/supabase-js': '^2.110.2',
  '@tolgee/i18next': '^7.1.1',
  '@tolgee/react': '^7.1.1',
  firebase: '^12.16.0',
  typescript: '~7.0.2',
  prettier: '^3.9.5',
  '@aws-sdk/client-s3': '^3.1085.0',
  'adm-zip': '^0.6.0',
  archiver: '^8.0.0',
  i18next: '^26.3.6',
  'react-i18next': '^17.0.9',
  zustand: '^5.0.14',
  motion: '^12.42.2',
};

const packageJsonPaths = [
  'package.json',
  'apps/studio-android/package.json',
  'apps/studio-web/package.json',
  'packages/livex-core/package.json',
];

for (const p of packageJsonPaths) {
  const fullPath = path.join(__dirname, '..', p);
  if (fs.existsSync(fullPath)) {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let modified = false;

    for (const section of ['dependencies', 'devDependencies']) {
      if (data[section]) {
        for (const dep in data[section]) {
          if (packagesToUpdate[dep]) {
            data[section][dep] = packagesToUpdate[dep];
            modified = true;
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`Updated ${p}`);
    }
  } else {
    console.warn(`File not found: ${fullPath}`);
  }
}
