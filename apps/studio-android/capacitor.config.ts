import type { CapacitorConfig } from '@capacitor/cli';

// Development Live Reload URL (only active when CAPACITOR_SERVER_URL is explicitly set for local dev)
const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const isProd = process.env.LIVEX_PRODUCTION_RELEASE === 'true' || process.env.STUDIO_PRODUCTION_RELEASE === 'true';
const isLiveReload = !!devServerUrl && !isProd;

const config: CapacitorConfig = {
  appId: 'com.chordex.app',
  appName: 'Livex',
  webDir: '../../dist/android-web',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  server: {
    androidScheme: 'https',
    ...(isLiveReload
      ? {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        }
      : {}),
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
