import { Capacitor } from '@capacitor/core';
/**
 * updater/installActions.ts
 *
 * Standalone install-related actions that do not depend on the pipeline.
 * Exports: applyUpdateDirect, shareDownloadedApk, dismissUpdate, markUpdateSeen
 *
 * Note: triggerDowngrade depends on downloadUpdate (pipeline) so it lives in pipeline.ts.
 */

import { APP_VERSION } from '../appVersion';
import { isAppInstallerAvailable } from './diagnostics';
import { globalUpdateState, updateGlobalState, transitionToState } from './stateMachine';
import { addToStoredList } from './sessionStorage';
import { recordCloseEvent } from './diagnostics';
import { UpdaterFlightRecorder } from './flightRecorder';

export async function applyUpdateDirect(): Promise<void> {
  const filePath = localStorage.getItem('studio:downloadedApkPath');
  if (!filePath) {
    throw new Error('No downloaded APK path found.');
  }
  const { openApkInstallerDirect } = await import('../apkDownloader');
  await openApkInstallerDirect(filePath);
}

export async function shareDownloadedApk(): Promise<void> {
  const filePath = localStorage.getItem('studio:downloadedApkPath');
  if (!filePath) {
    throw new Error('No downloaded APK found to share.');
  }
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: 'Studio Update APK',
      text: 'Here is the latest update APK for Studio.',
      url: filePath,
      dialogTitle: 'Share Studio Update',
    });
  } catch (err: any) {
    console.error('Failed to share APK:', err);
    throw err;
  }
}

// Forward-declaration: resetAppUpdateState is in pipeline.ts; imported lazily to avoid circular deps.
// dismissUpdate calls it after updating state.
export function dismissUpdate(): void {
  UpdaterFlightRecorder.record({
    thread: 'js',
    sessionId: null,
    workflowId: null,
    eventType: 'dismissUpdate',
    caller: 'installActions',
    reason: `dismissUpdate called. Current state: ${globalUpdateState.updateState}`,
  });

  // Hard guard: never reset state while the PackageInstaller is actively running.
  // This prevents any UI timer or accidental call from clearing installation locks
  // during an active install session.
  const isBusy = ['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE', 'INSTALLING'].includes(
    globalUpdateState.updateState
  );
  if (isBusy) {
    UpdaterFlightRecorder.record({
      thread: 'js',
      sessionId: null,
      workflowId: null,
      eventType: 'dismissUpdateRejected',
      caller: 'installActions',
      reason: `dismissUpdate rejected because installer is active (state: ${globalUpdateState.updateState})`,
      warning: 'DISMISS_REJECTED_ACTIVE_INSTALLER',
    });
    return;
  }
  recordCloseEvent('dismissUpdate called');
  const ver = globalUpdateState.remoteVersion;
  if (ver) {
    addToStoredList('studio:dismissedVersions', ver);
    try {
      const storedVer = localStorage.getItem('studio:dismissed_update_version');
      let count = 0;
      if (storedVer === ver) {
        const countStr = localStorage.getItem('studio:dismissed_update_count');
        count = countStr ? parseInt(countStr, 10) : 0;
      }
      count += 1;
      localStorage.setItem('studio:dismissed_update_version', ver);
      localStorage.setItem('studio:dismissed_update_count', String(count));
      localStorage.setItem('studio:dismissed_update_timestamp', String(Date.now()));
    } catch (_) {}
  }
  if (globalUpdateState.updateState === 'INSTALL_SUCCESS') {
    localStorage.setItem('studio:lastShownDoneVersion', APP_VERSION);
  }
  transitionToState('IDLE', 'Reset update state');
  try {
    localStorage.removeItem('studio:is_simulation_active');
  } catch (_) {}
  updateGlobalState({
    progress: 0,
    error: null,
    statusText: null,
    remoteVersion: null,
    updateAvailable: false,
    mandatory: false,
    changelog: null,
    releaseNotes: null,
    decisionExplanation: null,
  });
  if (Capacitor.isNativePlatform() && isAppInstallerAvailable()) {
    import('../apkDownloader').then(({ AppInstaller }) => {
      AppInstaller.clearInstallerLogHistory().catch(() => {});
    });
  }
}

export function markUpdateSeen(): void {
  const ver = globalUpdateState.remoteVersion;
  if (ver) {
    addToStoredList('studio:notifiedVersions', ver);
  }
}
