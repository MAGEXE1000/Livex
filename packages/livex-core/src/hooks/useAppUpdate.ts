/**
 * hooks/useAppUpdate.ts
 *
 * React hooks for consuming App update state:
 *   - useAppUpdate — main hook returning full update state + action callbacks
 *   - usePostUpdateChangelog — detects just-updated state and shows changelog
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { APP_VERSION, compareSemver } from '../lib/startup/appVersion';
import { nativeSet, NATIVE_PREFS } from '../lib/platform/nativePrefs';
import { useChordStore } from '../store/useChordStore';
import { type CentralizedUpdateState } from '../lib/updater/stateMachine';
import {
  stateListeners,
  globalUpdateState,
  updateGlobalState,
  transitionToState,
  openUpdateModal,
  closeUpdateModal,
} from '../lib/updater/stateMachine';
import {
  runUpdaterHealthCheck,
  getDiagnosticsReport,
  type HealthStatus,
} from '../lib/updater/diagnostics';
import {
  recordDismissal,
  shouldShowRecoveryReminder,
  deleteLocalApk,
} from '../lib/updater/cacheManager';
import { downloadAndInstallGitHubApk } from '../lib/updater/downloadManager';
import { runSignatureMismatchRecovery } from '../lib/updater/recovery';
import { detectJustUpdated, writeLastSeen } from '../lib/updater/versionManager';

import {
  checkForUpdate,
  downloadUpdate,
  cancelDownload,
  applyUpdate,
  initializeGlobalUpdateListeners,
  checkAndCleanCache,
} from '../lib/updater/pipeline';
import {
  dismissUpdate,
  markUpdateSeen,
  applyUpdateDirect,
  shareDownloadedApk,
} from '../lib/updater/installActions';
import { getUpdateHistory, logUpdateTransition } from '../lib/updater/updateHistory';

export interface AppUpdateHookResult extends CentralizedUpdateState {
  checkNow: () => Promise<CentralizedUpdateState>;
  downloadUpdate: (trigger?: string) => Promise<void>;
  cancelDownload: (reason?: string) => void;
  applyUpdate: (trigger?: string) => Promise<void>;
  dismissUpdate: () => void;
  markUpdateSeen: () => void;
  downloadAndInstallGitHubApk: () => Promise<void>;
  runSignatureMismatchRecovery: () => Promise<boolean>;
  runUpdaterHealthCheck: () => Promise<HealthStatus>;
  getDiagnosticsReport: () => Promise<string>;
  applyUpdateDirect: () => Promise<void>;
  shareDownloadedApk: () => Promise<void>;
  getUpdateHistory: () => any[];
  checkAndCleanCache: () => Promise<boolean>;
  deleteLocalApk: (version: string) => Promise<void>;
  recordDismissal: (version: string) => void;
  shouldShowRecoveryReminder: (version: string) => boolean;
  openModal: () => void;
  closeModal: () => void;
}

function subscribe(callback: () => void) {
  const listener = () => callback();
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function getSnapshot() {
  return globalUpdateState;
}

export function useAppUpdate(): AppUpdateHookResult {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    initializeGlobalUpdateListeners();
    void nativeSet(NATIVE_PREFS.OTA_INSTALLED, APP_VERSION);
  }, []);

  const checkNow = async () => {
    openUpdateModal();
    const res = await checkForUpdate(true, 'settings_manual', 'user manual checkNow');
    return res;
  };

  return {
    ...state,
    checkNow,
    openModal: openUpdateModal,
    closeModal: closeUpdateModal,
    downloadUpdate: async (trigger?: string) => {
      await downloadUpdate(trigger);
    },
    cancelDownload,
    applyUpdate: async (trigger?: string) => {
      await applyUpdate(trigger);
    },
    dismissUpdate,
    markUpdateSeen,
    downloadAndInstallGitHubApk,
    runSignatureMismatchRecovery: async () => {
      return await runSignatureMismatchRecovery(applyUpdate, downloadUpdate);
    },
    runUpdaterHealthCheck,
    getDiagnosticsReport,
    applyUpdateDirect,
    shareDownloadedApk,
    getUpdateHistory,
    checkAndCleanCache,
    deleteLocalApk,
    recordDismissal,
    shouldShowRecoveryReminder,
  };
}

export function usePostUpdateChangelog(): {
  show: boolean;
  fromVersion: string | null;
  toVersion: string;
  dismiss: () => void;
} {
  const [show, setShow] = useState(false);
  const [fromVersion, setFromVersion] = useState<string | null>(null);
  const showChangelog = true;

  useEffect(() => {
    const { justUpdated, from } = detectJustUpdated();
    if (justUpdated && from) {
      const cmp = compareSemver(APP_VERSION, from);
      if (cmp !== 0) {
        const type = cmp > 0 ? 'upgrade' : 'downgrade';
        logUpdateTransition(from, APP_VERSION, type, 'user', 'success');

        localStorage.setItem('studio:consecutiveInstallFailures', '0');
        updateGlobalState({ consecutiveFailures: 0, recoveryMode: false, activeFallback: null });

        if (type === 'upgrade' && showChangelog) {
          setFromVersion(from);
          setShow(true);
        } else {
          writeLastSeen(APP_VERSION);
        }
      }
    } else if (from === null) {
      writeLastSeen(APP_VERSION);
    }
  }, [showChangelog]);

  const dismiss = () => {
    writeLastSeen(APP_VERSION);
    setShow(false);
  };

  return { show, fromVersion, toVersion: APP_VERSION, dismiss };
}
