import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../appVersion', () => ({
  APP_VERSION: '3.7.8',
  NATIVE_VERSION: '3.7.8',
  WEB_VERSION: '4.0.0',
  PRODUCTION_SIGNING_SHA256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
  compareSemver: (a: string, b: string) => (a === b ? 0 : a > b ? 1 : -1),
  parseSemver: (v: string) => ({ major: 3, minor: 7, patch: 8 }),
  parseAndNormalizeVersion: (v: string) => v,
  sanitizeUTF8String: (s: string) => s,
}));

const mockAppInstaller = vi.hoisted(() => ({
  getInstalledAppInfo: vi.fn().mockResolvedValue({
    packageName: 'com.chordex.app',
    versionName: '3.7.8',
    versionCode: 135,
    signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
  }),
  inspectApk: vi.fn().mockResolvedValue({
    packageName: 'com.chordex.app',
    versionName: '3.8.0',
    versionCode: 136,
    signingSha256: '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206',
    isValidApk: true,
  }),
  getLastInstallResult: vi.fn().mockResolvedValue({
    statusCode: -1,
    statusMessage: 'Waiting for user confirmation...',
  }),
  addListener: vi.fn().mockReturnValue({ remove: () => {} }),
  clearInstallerLogHistory: vi.fn().mockResolvedValue(true),
  isInstallActive: vi.fn().mockResolvedValue({ active: false, sessionId: -1 }),
}));

vi.mock('@capacitor/core', () => {
  return {
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      isPluginAvailable: (name: string) => name === 'AppInstaller',
    },
    registerPlugin: () => mockAppInstaller,
  };
});

// Mock window and document
(global as any).window = {
  location: { href: 'http://localhost/' },
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
(global as any).document = {
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
(global as any).localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

import {
  globalUpdateState,
  transitionToState,
  updateGlobalState,
  updateActiveSession,
  initializeGlobalUpdateListeners,
} from '../index';
import { processLastInstallResult } from '../installer';
import { checkAndRecoverInstallState } from '../pipeline';

describe('Livex Android Installer User Confirmation & Silent Check Verifications', () => {
  beforeEach(() => {
    transitionToState('IDLE', 'Reset');
    updateGlobalState({ updateAvailable: false, error: null, statusText: null, isModalOpen: false });
    initializeGlobalUpdateListeners();
  });

  it('processLastInstallResult returns null for statusCode -1 (pending user action)', () => {
    const result = processLastInstallResult({
      statusCode: -1,
      statusMessage: 'Waiting for user confirmation...',
    });
    expect(result).toBeNull();
  });

  it('processLastInstallResult returns null for statusCode 0 (success) and -999 (in progress)', () => {
    expect(processLastInstallResult({ statusCode: 0, statusMessage: 'Success' })).toBeNull();
    expect(processLastInstallResult({ statusCode: -999, statusMessage: 'Active' })).toBeNull();
  });

  it('processLastInstallResult returns processed error for actual failures (statusCode > 0)', () => {
    const result = processLastInstallResult({
      statusCode: 5,
      statusMessage: 'Signature mismatch',
    });
    expect(result).not.toBeNull();
    expect(result?.category).toBe('signature_mismatch');
  });

  it('handleInstallStatusChange handles string status "Waiting for user confirmation..." as PACKAGEINSTALLER_VISIBLE and does not fail', () => {
    // Set to WAITING_USER_CONFIRMATION
    transitionToState('INITIALIZING', 'Setup');
    transitionToState('FETCH_REMOTE_METADATA', 'Setup');
    transitionToState('VALIDATE_METADATA', 'Setup');
    transitionToState('COMPARE_VERSION', 'Setup');
    transitionToState('UPDATE_AVAILABLE', 'Setup');
    transitionToState('FETCH_APK_INFORMATION', 'Setup');
    transitionToState('DOWNLOAD_APK', 'Setup');
    transitionToState('VERIFY_SHA256', 'Setup');
    transitionToState('PREPARING_INSTALL', 'Setup');
    transitionToState('WAITING_USER_CONFIRMATION', 'Setup');

    expect(globalUpdateState.updateState).toBe('WAITING_USER_CONFIRMATION');

    // Simulate native emitting notification string status
    const triggerFn = (window as any).triggerOtaInstallStatus;
    expect(typeof triggerFn).toBe('function');

    triggerFn({
      status: 'Waiting for user confirmation...',
      progress: 100,
    });

    // Must transition to PACKAGEINSTALLER_VISIBLE, NOT INSTALL_FAILED!
    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');
    expect(globalUpdateState.error).toBeNull();
  });

  it('handleInstallStatusChange handles numeric status -1 as PACKAGEINSTALLER_VISIBLE and does not fail', () => {
    transitionToState('IDLE', 'Reset');
    transitionToState('INITIALIZING', 'Setup');
    transitionToState('FETCH_REMOTE_METADATA', 'Setup');
    transitionToState('VALIDATE_METADATA', 'Setup');
    transitionToState('COMPARE_VERSION', 'Setup');
    transitionToState('UPDATE_AVAILABLE', 'Setup');
    transitionToState('FETCH_APK_INFORMATION', 'Setup');
    transitionToState('DOWNLOAD_APK', 'Setup');
    transitionToState('VERIFY_SHA256', 'Setup');
    transitionToState('PREPARING_INSTALL', 'Setup');
    transitionToState('WAITING_USER_CONFIRMATION', 'Setup');

    const triggerFn = (window as any).triggerOtaInstallStatus;
    triggerFn({
      status: -1,
      message: '',
      packageName: 'com.chordex.app',
    });

    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');
    expect(globalUpdateState.error).toBeNull();
  });

  it('checkAndRecoverInstallState with statusCode -1 keeps PACKAGEINSTALLER_VISIBLE and does not trigger INSTALL_FAILED', async () => {
    transitionToState('IDLE', 'Reset');
    transitionToState('INITIALIZING', 'Setup');
    transitionToState('FETCH_REMOTE_METADATA', 'Setup');
    transitionToState('VALIDATE_METADATA', 'Setup');
    transitionToState('COMPARE_VERSION', 'Setup');
    transitionToState('UPDATE_AVAILABLE', 'Setup');
    transitionToState('FETCH_APK_INFORMATION', 'Setup');
    transitionToState('DOWNLOAD_APK', 'Setup');
    transitionToState('VERIFY_SHA256', 'Setup');
    transitionToState('PREPARING_INSTALL', 'Setup');
    transitionToState('WAITING_USER_CONFIRMATION', 'Setup');

    updateActiveSession({
      nativeInstallerTriggered: true,
      targetVersion: '3.8.0',
    });

    mockAppInstaller.getLastInstallResult.mockResolvedValueOnce({
      statusCode: -1,
      statusMessage: 'Waiting for user confirmation...',
      expectedVersionName: '3.8.0',
    });

    await checkAndRecoverInstallState();

    expect(globalUpdateState.updateState).toBe('PACKAGEINSTALLER_VISIBLE');
    expect(globalUpdateState.error).toBeNull();
  });
});
