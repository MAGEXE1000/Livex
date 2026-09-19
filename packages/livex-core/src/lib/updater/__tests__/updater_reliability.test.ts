import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  globalUpdateState,
  transitionToState,
  updateGlobalState,
  transitionListeners,
  handleWatchdogTimeout,
  MAX_CONSECUTIVE_FAILURES,
} from '../stateMachine';
import {
  cancelDownload,
} from '../pipeline';
import {
  downloadAndInstallGitHubApk,
} from '../downloadManager';

// Mock localStorage
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => {
    store[k] = v;
  }),
  removeItem: vi.fn((k: string) => {
    delete store[k];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
};

// Mock window
(global as any).window = {
  location: { href: 'http://localhost/' },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('Livex Updater Reliability & State Machine Suite', () => {
  beforeEach(() => {
    transitionToState('IDLE', 'Reset');
    updateGlobalState({
      loading: false,
      progress: 0,
      downloadedBytes: null,
      totalBytes: null,
      error: null,
      updateAvailable: false,
      consecutiveFailures: 0,
      recoveryMode: false,
    });
  });

  describe('Suite 1: FSM Cancellation Transitions', () => {
    const cancellableStates = [
      'FETCH_APK_INFORMATION',
      'DOWNLOAD_APK',
      'VERIFY_SHA256',
      'PREPARING_INSTALL',
      'WAITING_USER_CONFIRMATION',
      'PACKAGEINSTALLER_VISIBLE',
    ] as const;

    cancellableStates.forEach((fromState) => {
      it(`allows transition from ${fromState} to INSTALL_CANCELLED`, () => {
        transitionToState('IDLE', 'Reset');
        transitionToState('INITIALIZING', 'setup');
        transitionToState('FETCH_REMOTE_METADATA', 'setup');
        transitionToState('VALIDATE_METADATA', 'setup');
        transitionToState('COMPARE_VERSION', 'setup');
        transitionToState('UPDATE_AVAILABLE', 'setup');

        if (fromState === 'FETCH_APK_INFORMATION') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
        } else if (fromState === 'DOWNLOAD_APK') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
          transitionToState('DOWNLOAD_APK', 'setup');
        } else if (fromState === 'VERIFY_SHA256') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
          transitionToState('DOWNLOAD_APK', 'setup');
          transitionToState('VERIFY_SHA256', 'setup');
        } else if (fromState === 'PREPARING_INSTALL') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
          transitionToState('DOWNLOAD_APK', 'setup');
          transitionToState('VERIFY_SHA256', 'setup');
          transitionToState('PREPARING_INSTALL', 'setup');
        } else if (fromState === 'WAITING_USER_CONFIRMATION') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
          transitionToState('DOWNLOAD_APK', 'setup');
          transitionToState('VERIFY_SHA256', 'setup');
          transitionToState('PREPARING_INSTALL', 'setup');
          transitionToState('WAITING_USER_CONFIRMATION', 'setup');
        } else if (fromState === 'PACKAGEINSTALLER_VISIBLE') {
          transitionToState('FETCH_APK_INFORMATION', 'setup');
          transitionToState('DOWNLOAD_APK', 'setup');
          transitionToState('VERIFY_SHA256', 'setup');
          transitionToState('PREPARING_INSTALL', 'setup');
          transitionToState('WAITING_USER_CONFIRMATION', 'setup');
          transitionToState('PACKAGEINSTALLER_VISIBLE', 'setup');
        }

        expect(globalUpdateState.updateState).toBe(fromState);
        transitionToState('INSTALL_CANCELLED', 'User cancelled download');
        expect(globalUpdateState.updateState).toBe('INSTALL_CANCELLED');
      });
    });

    it('allows transition from INSTALL_CANCELLED back to IDLE or UPDATE_AVAILABLE', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');
      transitionToState('INSTALL_CANCELLED', 'User cancelled');

      expect(globalUpdateState.updateState).toBe('INSTALL_CANCELLED');

      transitionToState('UPDATE_AVAILABLE', 'Re-prompt update');
      expect(globalUpdateState.updateState).toBe('UPDATE_AVAILABLE');

      transitionToState('IDLE', 'User closed');
      expect(globalUpdateState.updateState).toBe('IDLE');
    });
  });

  describe('Suite 2: cancelDownload Operation & State Cleansing', () => {
    it('cleans up state, sets loading to false, progress to 0, and transitions to INSTALL_CANCELLED', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');
      updateGlobalState({ loading: true, progress: 0.65 });

      expect(globalUpdateState.updateState).toBe('DOWNLOAD_APK');
      expect(globalUpdateState.loading).toBe(true);

      cancelDownload('User explicitly tapped cancel');

      expect(globalUpdateState.updateState).toBe('INSTALL_CANCELLED');
      expect(globalUpdateState.loading).toBe(false);
      expect(globalUpdateState.progress).toBe(0);
      expect(globalUpdateState.statusText).toBe('Download cancelled');
    });
  });

  describe('Suite 3: downloadAndInstallGitHubApk Failure Handling', () => {
    it('transitions FSM to INSTALL_FAILED and sets loading to false on download error', async () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');

      updateGlobalState({
        remoteVersion: '9.9.9',
        apkSha256: null as any,
        loading: true,
      });

      expect(globalUpdateState.updateState).toBe('DOWNLOAD_APK');

      await downloadAndInstallGitHubApk();

      expect(globalUpdateState.updateState).toBe('INSTALL_FAILED');
      expect(globalUpdateState.loading).toBe(false);
      expect(globalUpdateState.error).toContain('GitHub installation failed');
    });
  });

  describe('Suite 4: Watchdog Timeout & Terminal Bounding', () => {
    it('transitions to RECOVERY and increments failure count on timeout', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');

      handleWatchdogTimeout('Simulated watchdog stall');

      expect(globalUpdateState.updateState).toBe('RECOVERY');
      expect(globalUpdateState.recoveryMode).toBe(true);
      expect(globalUpdateState.consecutiveFailures).toBe(1);
    });

    it('transitions to IDLE after reaching maximum consecutive failures', () => {
      updateGlobalState({ consecutiveFailures: MAX_CONSECUTIVE_FAILURES - 1 });

      handleWatchdogTimeout('Simulated repeated watchdog stall');

      expect(globalUpdateState.updateState).toBe('IDLE');
      expect(globalUpdateState.recoveryMode).toBe(false);
      expect(globalUpdateState.consecutiveFailures).toBe(MAX_CONSECUTIVE_FAILURES);
    });
  });

  describe('Suite 5: Transition Cleanup Listener Guarantee', () => {
    it('notifies transition listeners on state changes and cleans up on terminal states', () => {
      const recorded: { from: string; to: string; reason: string }[] = [];
      const listener = (from: string, to: string, reason: string) => {
        recorded.push({ from, to, reason });
      };

      transitionListeners.add(listener);

      transitionToState('INITIALIZING', 'test transition');
      expect(recorded.length).toBe(1);
      expect(recorded[0].from).toBe('IDLE');
      expect(recorded[0].to).toBe('INITIALIZING');

      transitionToState('IDLE', 'test reset');
      expect(recorded[1].to).toBe('IDLE');

      transitionListeners.delete(listener);
    });
  });

  describe('Suite 6: Download Progress Monotonicity & Post-Download Protection', () => {
    it('rejects progress regression from 100% back to 0% in DOWNLOAD_APK', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');

      updateGlobalState({
        progress: 1.0,
        downloadedBytes: 54572076,
        totalBytes: 54572076,
        statusText: 'Downloading update (100%)',
      });

      expect(globalUpdateState.progress).toBe(1.0);
      expect(globalUpdateState.downloadedBytes).toBe(54572076);

      // Attempt regression with 0% progress and null bytes (simulating native error callback)
      updateGlobalState({
        progress: 0,
        downloadedBytes: null,
        statusText: 'Downloading update (0%)',
      });

      expect(globalUpdateState.progress).toBe(1.0);
      expect(globalUpdateState.downloadedBytes).toBe(54572076);
      expect(globalUpdateState.statusText).not.toContain('(0%)');
    });

    it('enforces non-decreasing progress during DOWNLOAD_APK', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');

      updateGlobalState({
        progress: 0.6,
        downloadedBytes: 30000000,
        totalBytes: 50000000,
      });

      expect(globalUpdateState.progress).toBe(0.6);
      expect(globalUpdateState.downloadedBytes).toBe(30000000);

      // Regressed values are rejected
      updateGlobalState({
        progress: 0.3,
        downloadedBytes: 15000000,
      });

      expect(globalUpdateState.progress).toBe(0.6);
      expect(globalUpdateState.downloadedBytes).toBe(30000000);

      // Advanced values are accepted
      updateGlobalState({
        progress: 0.85,
        downloadedBytes: 42500000,
      });

      expect(globalUpdateState.progress).toBe(0.85);
      expect(globalUpdateState.downloadedBytes).toBe(42500000);
    });

    it('protects post-download states against late progress callbacks', () => {
      transitionToState('IDLE', 'Reset');
      transitionToState('INITIALIZING', 'setup');
      transitionToState('FETCH_REMOTE_METADATA', 'setup');
      transitionToState('VALIDATE_METADATA', 'setup');
      transitionToState('COMPARE_VERSION', 'setup');
      transitionToState('UPDATE_AVAILABLE', 'setup');
      transitionToState('FETCH_APK_INFORMATION', 'setup');
      transitionToState('DOWNLOAD_APK', 'setup');
      transitionToState('VERIFY_SHA256', 'setup');

      updateGlobalState({
        progress: 1.0,
        downloadedBytes: 54572076,
        statusText: 'Verifying package...',
      });

      // Late bridge progress event in VERIFY_SHA256
      updateGlobalState({
        progress: 0,
        downloadedBytes: null,
        statusText: 'Downloading update (0%)',
      });

      expect(globalUpdateState.progress).toBe(1.0);
      expect(globalUpdateState.downloadedBytes).toBe(54572076);
      expect(globalUpdateState.statusText).toBe('Verifying package...');

      transitionToState('PREPARING_INSTALL', 'setup');

      // Late bridge progress event in PREPARING_INSTALL
      updateGlobalState({
        progress: 0,
        downloadedBytes: null,
      });

      expect(globalUpdateState.progress).toBe(1.0);
      expect(globalUpdateState.downloadedBytes).toBe(54572076);
    });

    it('allows clean progress reset when in IDLE state', () => {
      transitionToState('IDLE', 'Reset');

      updateGlobalState({
        progress: 0,
        downloadedBytes: null,
        totalBytes: null,
      });

      expect(globalUpdateState.progress).toBe(0);
      expect(globalUpdateState.downloadedBytes).toBeNull();
      expect(globalUpdateState.totalBytes).toBeNull();
    });
  });
});
