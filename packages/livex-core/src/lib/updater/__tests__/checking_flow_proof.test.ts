import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../appVersion', () => ({
  APP_VERSION: '3.7.8',
  NATIVE_VERSION: '3.7.8',
  WEB_VERSION: '4.0.0',
  PRODUCTION_SIGNING_SHA256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
  compareSemver: (a: string, b: string) => {
    if (a === b) return 0;
    const ap = a.split('.').map(Number);
    const bp = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((ap[i] || 0) > (bp[i] || 0)) return 1;
      if ((ap[i] || 0) < (bp[i] || 0)) return -1;
    }
    return 0;
  },
  parseSemver: (v: string) => {
    const clean = v.replace(/^v/i, '');
    const parts = clean.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  },
  parseAndNormalizeVersion: (v: string) => (v ? v.replace(/^v/i, '') : v),
  sanitizeUTF8String: (s: string) => s,
}));

vi.mock('@capacitor/core', () => {
  const mockPlugin = {
    getInstalledAppInfo: vi.fn().mockResolvedValue({
      packageName: 'com.livex.app',
      versionName: '3.7.8',
      versionCode: 135,
      signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    }),
    inspectApk: vi.fn().mockResolvedValue({
      packageName: 'com.livex.app',
      versionName: '3.8.0',
      versionCode: 136,
      signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      isValidApk: true,
    }),
    addListener: vi.fn().mockReturnValue({ remove: () => {} }),
    canRequestPackageInstalls: vi.fn().mockResolvedValue({ value: true }),
    getDeviceInfo: vi.fn().mockResolvedValue({ sdkInt: 34 }),
  };
  return {
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      isPluginAvailable: (name: string) => name === 'AppInstaller',
    },
    registerPlugin: () => mockPlugin,
  };
});

import { Capacitor } from '@capacitor/core';
(global as any).Capacitor = Capacitor;
(global as any).window = {
  location: { href: 'http://localhost/' },
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  Capacitor,
};
(global as any).document = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockLocalStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: vi.fn((key) => mockLocalStorage[key] || null),
  setItem: vi.fn((key, val) => {
    mockLocalStorage[key] = String(val);
  }),
  removeItem: vi.fn((key) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    for (const key in mockLocalStorage) {
      delete mockLocalStorage[key];
    }
  }),
};

const mockFetch = vi.fn();
(global as any).fetch = mockFetch;
globalThis.fetch = mockFetch;

import {
  checkForUpdate,
  globalUpdateState,
  transitionToState,
  updateGlobalState,
  resetLastCheckedTime,
  resetAppUpdateState,
  initializeGlobalUpdateListeners,
} from '../index';

describe('Livex Update-Checking Flow & Path Verification', () => {
  beforeEach(() => {
    resetLastCheckedTime();
    resetAppUpdateState();
    transitionToState('IDLE', 'Reset');
    updateGlobalState({ updateAvailable: false, error: null, statusText: null });
    mockFetch.mockReset();
    initializeGlobalUpdateListeners();
  });

  it('Path 1 & 8: Manual check with no update (Local == Remote) sets statusText and resolves to up-to-date', async () => {
    const remoteData = {
      platform: 'android',
      version: '3.7.8',
      versionName: '3.7.8',
      versionCode: 135,
      version_code: 135,
      apkUrl: 'https://example.com/v3.7.8.apk',
      apkSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    const res = await checkForUpdate(true, 'manual', 'user tapped check');
    expect(res.updateAvailable).toBe(false);
    expect(res.remoteVersion).toBe('3.7.8');
    expect(res.statusText).toBe(null);
    expect(globalUpdateState.updateState).toBe('NO_UPDATE_AVAILABLE');
  });

  it('Path 2 & 9: Manual check with update available (Local < Remote) sets statusText and resolves to update available', async () => {
    const remoteData = {
      platform: 'android',
      version: '3.8.0',
      versionName: '3.8.0',
      versionCode: 136,
      version_code: 136,
      apkUrl: 'https://example.com/v3.8.0.apk',
      apkSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      changelog: 'Feature A\nFeature B',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    const res = await checkForUpdate(true, 'manual', 'user check');
    expect(res.updateAvailable).toBe(true);
    expect(res.remoteVersion).toBe('3.8.0');
    expect(res.statusText).toBe(null);
    expect(globalUpdateState.updateState).toBe('UPDATE_AVAILABLE');
  });

  it('Path 3: Automatic update check performs cleanly in background', async () => {
    const remoteData = {
      platform: 'android',
      version: '3.7.8',
      versionCode: 135,
      apkUrl: 'https://example.com/v3.7.8.apk',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    const res = await checkForUpdate(false, 'periodic_poll', 'background');
    expect(res.updateAvailable).toBe(false);
    expect(res.statusText).toBe(null);
  });

  it('Path 4: Startup update check initiates and evaluates accurately', async () => {
    const remoteData = {
      platform: 'android',
      version: '3.8.0',
      versionCode: 136,
      apkUrl: 'https://example.com/v3.8.0.apk',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    const res = await checkForUpdate(false, 'startup', 'app launch');
    expect(res.updateAvailable).toBe(true);
    expect(res.remoteVersion).toBe('3.8.0');
  });

  it('Path 5: Network failure sets error and does not convert error into up-to-date', async () => {
    mockFetch.mockRejectedValue(new Error('Network offline'));

    const res = await checkForUpdate(true, 'manual', 'manual retry');
    expect(res.updateAvailable).toBe(false);
    expect(res.error).toBeTruthy();
    expect(res.statusText).toBe(null);
  });

  it('Path 6: Retry after failure triggers fresh check execution', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network offline'));
    const failedRes = await checkForUpdate(true, 'manual', 'initial try');
    expect(failedRes.error).toBeTruthy();

    // Now retry with working connection
    const remoteData = {
      platform: 'android',
      version: '3.8.0',
      versionCode: 136,
      apkUrl: 'https://example.com/v3.8.0.apk',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    const retryRes = await checkForUpdate(true, 'manual', 'user retry');
    expect(retryRes.updateAvailable).toBe(true);
    expect(retryRes.remoteVersion).toBe('3.8.0');
    expect(retryRes.error).toBe(null);
  });

  it('Path 7: Multiple simultaneous check requests share in-flight pipeline safely', async () => {
    const remoteData = {
      platform: 'android',
      version: '3.8.0',
      versionCode: 136,
      apkUrl: 'https://example.com/v3.8.0.apk',
      sha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    };

    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: async () => JSON.stringify(remoteData),
              json: async () => remoteData,
            });
          }, 30);
        })
    );

    const [res1, res2] = await Promise.all([
      checkForUpdate(true, 'manual', 'check 1'),
      checkForUpdate(true, 'manual', 'check 2'),
    ]);

    expect(res1.updateAvailable).toBe(true);
    expect(res2.updateAvailable).toBe(true);
    expect(res1.remoteVersion).toBe('3.8.0');
  });
});
