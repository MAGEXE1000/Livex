import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock appVersion to simulate local version is v4.3.33
vi.mock('../../appVersion', () => ({
  APP_VERSION: '4.3.33',
  NATIVE_VERSION: '4.3.33',
  WEB_VERSION: '4.3.33',
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
    const clean = v.replace(/^v/i, '');
    const parts = clean.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  },
  parseAndNormalizeVersion: (v: string) => (v ? v.replace(/^v/i, '') : v),
  sanitizeUTF8String: (s: string) => s,
}));

// 2. Mock @capacitor/core
vi.mock('@capacitor/core', () => {
  const mockAppInstaller = {
    installApk: vi.fn().mockResolvedValue({}),
    installApkDirect: vi.fn().mockResolvedValue({}),
    downloadApk: vi.fn().mockResolvedValue({ filePath: '/tmp/studio-update-4.3.34.apk' }),
    verifySha256: vi.fn().mockResolvedValue({ matches: true }),
    getLastInstallResult: vi.fn().mockResolvedValue({ statusCode: 0, statusMessage: 'Success' }),
    getInstalledAppInfo: vi.fn().mockResolvedValue({
      packageName: 'com.chordex.app',
      versionName: '4.3.33',
      versionCode: 40333,
      signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    }),
    inspectApk: vi.fn().mockResolvedValue({
      packageName: 'com.chordex.app',
      versionName: '4.3.34',
      versionCode: 40334,
      signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
      isValidApk: true,
    }),
    canRequestPackageInstalls: vi.fn().mockResolvedValue({ value: true }),
    getDeviceInfo: vi.fn().mockResolvedValue({ sdkInt: 34 }),
    addListener: vi.fn().mockReturnValue({ remove: () => {} }),
    openInstallPermissionSettings: vi.fn().mockResolvedValue({}),
    openUnknownAppSourcesSettings: vi.fn().mockResolvedValue({}),
    appendLog: vi.fn().mockResolvedValue({}),
  };

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

// 3. Mock @capacitor/app
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: () => {} }),
  },
}));

// Import Capacitor from the mock to assign to globals
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

import {
  checkForUpdate,
  downloadUpdate,
  applyUpdate,
  globalUpdateState,
  transitionToState,
  updateGlobalState,
  resetLastCheckedTime,
  resetAppUpdateState,
  isAppInstallerAvailable,
  getTransitionHistory,
  getRejectedTransitions,
  getTimelineReport,
  updateDebugLogs,
  initializeGlobalUpdateListeners,
} from '../index';

// Mock localStorage
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

// Mock fetch
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;
globalThis.fetch = mockFetch;

describe('E2E Updater Flow Validation (v4.3.33 to v4.3.34)', () => {
  beforeEach(() => {
    resetLastCheckedTime();
    resetAppUpdateState();
    transitionToState('IDLE', 'Reset');
    updateGlobalState({ updateAvailable: false, error: null });
    mockFetch.mockReset();
    // Initialize listener hooks on the mock window
    initializeGlobalUpdateListeners();
  });

  it('should successfully detect version 4.3.34, download, verify SHA-256 and call installer', async () => {
    // 1. Mock remote metadata for v4.3.34
    const remoteData = {
      platform: 'android',
      version: '4.3.34',
      versionName: '4.3.34',
      versionCode: 40334,
      version_code: 40334,
      apkUrl: 'https://github.com/MAGEXE1000/Livex/releases/download/v4.3.34/studio-4.3.34.apk',
      apkSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      changelog: 'Dedicated E2E updater validation test release.',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(remoteData),
      json: async () => remoteData,
    });

    // 2. Run update check
    const checkState = await checkForUpdate(true); // manual check
    console.log('[DEBUG] checkState =', JSON.stringify(checkState, null, 2));
    console.log('[DEBUG] isAppInstallerAvailable =', isAppInstallerAvailable());
    console.log(
      '[DEBUG] globalUpdateState.updateState before download =',
      globalUpdateState.updateState
    );
    expect(checkState.updateAvailable).toBe(true);
    expect(checkState.remoteVersion).toBe('4.3.34');
    expect(checkState.updateState).toBe('UPDATE_AVAILABLE');

    // 3. Trigger download
    await downloadUpdate();
    console.log(
      '[DEBUG] After downloadUpdate, globalUpdateState =',
      JSON.stringify(globalUpdateState, null, 2)
    );
    console.log('[DEBUG] updateDebugLogs =', JSON.stringify(updateDebugLogs, null, 2));
    expect(globalUpdateState.updateState).toBe('WAITING_USER_CONFIRMATION');

    // 4. Trigger applyUpdate (launches native package installer intent)
    const applyPromise = applyUpdate();

    // Yield to let the async update transition commit
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify it transitioned state to PACKAGEINSTALLER_VISIBLE
    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');

    // Yield to let the async setup complete and set activeInstallPromiseResolver
    for (let i = 0; i < 50; i++) {
      if (updateDebugLogs.installError?.includes('Launching APK installer intent')) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // 5. Simulate system status callbacks
    if (typeof (window as any).triggerOtaInstallStatus === 'function') {
      // Transition from PACKAGEINSTALLER_VISIBLE -> INSTALLING
      (window as any).triggerOtaInstallStatus({ status: -2, message: 'Installing package...' });
      expect(globalUpdateState.updateState).toBe('INSTALLING');

      // Transition from INSTALLING -> INSTALL_SUCCESS
      (window as any).triggerOtaInstallStatus({ status: 0, message: 'Installation Success' });
    } else {
      throw new Error('triggerOtaInstallStatus listener not registered on window');
    }

    // Await the completion of the apply promise
    await applyPromise;

    // Verify it completed with INSTALL_SUCCESS
    expect(globalUpdateState.updateState).toBe('INSTALL_SUCCESS');
    console.log('[DEBUG] Final State after install callback =', globalUpdateState.updateState);
  }, 15000);
});
