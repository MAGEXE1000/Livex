import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAppInstaller, mockStat } = vi.hoisted(() => ({
  mockAppInstaller: {
    installApk: vi.fn().mockResolvedValue({}),
    installApkDirect: vi.fn().mockResolvedValue({}),
    downloadApk: vi.fn().mockResolvedValue({ filePath: '/cache/studio-update-4.5.92.apk' }),
    verifySha256: vi.fn().mockResolvedValue({ matches: true }),
    getLastInstallResult: vi.fn().mockResolvedValue({ statusCode: 0, statusMessage: 'Success' }),
    getInstalledAppInfo: vi.fn().mockResolvedValue({
      packageName: 'com.chordex.app',
      versionName: '4.5.92',
      versionCode: 40592,
      signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    }),
    inspectApk: vi.fn().mockResolvedValue({
      packageName: '',
      versionName: '',
      versionCode: 0,
      signingSha256: '',
      isValidApk: false,
    }),
    canRequestPackageInstalls: vi.fn().mockResolvedValue({ value: true }),
    getDeviceInfo: vi.fn().mockResolvedValue({ sdkInt: 34 }),
    addListener: vi.fn().mockReturnValue({ remove: () => {} }),
  },
  mockStat: vi.fn(),
}));

// 1. Mock appVersion with APP_VERSION = '4.5.92'
vi.mock('../../appVersion', () => ({
  APP_VERSION: '4.5.92',
  NATIVE_VERSION: '4.5.92',
  WEB_VERSION: '4.5.92',
  PRODUCTION_SIGNING_SHA256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
  compareSemver: (a: string, b: string) => {
    if (a === b) return 0;
    const ap = a.split('.').map(Number);
    const bp = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (ap[i] > bp[i]) return 1;
      if (ap[i] < bp[i]) return -1;
    }
    return 0;
  },
  parseSemver: (v: string) => {
    if (!v || v === 'V' || v === 'v') return null;
    const clean = v.replace(/^v/i, '');
    const parts = clean.split('.').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  },
  parseAndNormalizeVersion: (v: string) => (v ? v.replace(/^v/i, '') : v),
  sanitizeUTF8String: (s: string) => s,
}));

// 2. Mock @capacitor/core
vi.mock('@capacitor/core', () => {
  const mockCapacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    isPluginAvailable: (name: string) => name === 'AppInstaller',
    Plugins: {
      AppInstaller: mockAppInstaller,
    },
  };

  return {
    Capacitor: mockCapacitor,
    registerPlugin: () => mockAppInstaller,
  };
});

// 3. Mock @capacitor/filesystem
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    stat: mockStat,
    getUri: vi.fn().mockImplementation(({ path }) => Promise.resolve({ uri: `/cache/${path}` })),
    deleteFile: vi.fn().mockResolvedValue({}),
  },
  Directory: {
    Cache: 'CACHE',
  },
}));

// Mock localStorage
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    store[key] = String(val);
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};
(global as any).localStorage = mockLocalStorage;

// Mock window / document
(global as any).window = {
  location: { href: 'http://localhost/' },
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
(global as any).document = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

import { verifyAndCleanCaches } from '../stateMachine';
import { runEligibilityCheck } from '../eligibilityVerification';
import { checkAndCleanCache } from '../pipeline';
import { updateGlobalState } from '../stateMachine';

describe('Updater Cache Invalidation & Missing APK Guard', () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  describe('verifyAndCleanCaches()', () => {
    it('removes downloaded APK cache when APP_VERSION equals downloadedVer (update completed)', () => {
      store['studio:downloadedApkVersion'] = '4.5.92';
      store['studio:downloadedApkPath'] =
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.92.apk';

      verifyAndCleanCaches();

      expect(store['studio:downloadedApkVersion']).toBeUndefined();
      expect(store['studio:downloadedApkPath']).toBeUndefined();
    });

    it('removes downloaded APK cache when APP_VERSION is greater than downloadedVer (app is newer)', () => {
      store['studio:downloadedApkVersion'] = '4.5.91';
      store['studio:downloadedApkPath'] =
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.91.apk';

      verifyAndCleanCaches();

      expect(store['studio:downloadedApkVersion']).toBeUndefined();
      expect(store['studio:downloadedApkPath']).toBeUndefined();
    });

    it('preserves downloaded APK cache when APP_VERSION is less than downloadedVer (pending install)', () => {
      store['studio:downloadedApkVersion'] = '4.5.93';
      store['studio:downloadedApkPath'] =
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.93.apk';

      verifyAndCleanCaches();

      expect(store['studio:downloadedApkVersion']).toBe('4.5.93');
      expect(store['studio:downloadedApkPath']).toBe(
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.93.apk'
      );
    });

    it('removes orphaned downloadedApkPath when downloadedApkVersion is not set', () => {
      store['studio:downloadedApkPath'] =
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.92.apk';

      verifyAndCleanCaches();

      expect(store['studio:downloadedApkPath']).toBeUndefined();
    });

    it('removes downloaded APK cache when downloadedApkVersion is invalid / corrupt', () => {
      store['studio:downloadedApkVersion'] = 'V';
      store['studio:downloadedApkPath'] = '/cache/corrupt.apk';

      verifyAndCleanCaches();

      expect(store['studio:downloadedApkVersion']).toBeUndefined();
      expect(store['studio:downloadedApkPath']).toBeUndefined();
    });
  });

  describe('runEligibilityCheck()', () => {
    it('does NOT call Filesystem.stat when downloaded APK is not valid', async () => {
      mockAppInstaller.inspectApk.mockResolvedValueOnce({
        packageName: '',
        versionName: '',
        versionCode: 0,
        signingSha256: '',
        debuggable: false,
        minSdk: 0,
        targetSdk: 0,
        isValidApk: false,
        isUniversalApk: false,
      });

      const result = await runEligibilityCheck(
        '/storage/emulated/0/Android/data/com.chordex.app/cache/studio-update-4.5.92.apk'
      );

      expect(result).toBe(false);
      // Crucial assertion: Filesystem.stat must NOT have been called for an invalid / missing APK
      expect(mockStat).not.toHaveBeenCalled();
    });
  });

  describe('checkAndCleanCache()', () => {
    it('cleans downloadedApkPath and downloadedApkVersion when cached APK validation fails', async () => {
      updateGlobalState({ remoteVersion: '4.5.93', apkSha256: null });
      store['studio:downloadedApkPath'] = '/cache/studio-update-4.5.93.apk';
      store['studio:downloadedApkVersion'] = '4.5.93';

      mockStat.mockRejectedValueOnce(new Error('File does not exist'));

      const result = await checkAndCleanCache();

      expect(result).toBe(false);
      expect(store['studio:downloadedApkPath']).toBeUndefined();
      expect(store['studio:downloadedApkVersion']).toBeUndefined();
    });
  });
});
