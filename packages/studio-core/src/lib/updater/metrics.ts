import { getGlobalUpdateState, getActivePipelineContext, getActiveUpdateSession, invokeStartUpdateSession } from './stateMachineAccessors';
import type { CentralizedUpdateState } from './stateMachine';
import { updateDebugLogs } from './debugLogs';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../appVersion';
import { UpdaterFlightRecorder, type FlightRecorderEvent } from './flightRecorder';
import { logProgressStage, parseStackTrace, logTimelineEvent } from './logger';
import {
  updateSessions,
  activeSessionId,
  setActiveSessionId,
  saveSessions,
  getActiveSession,
  deleteUpdateSession,
  deleteAllUpdateSessions,
  isAppInstallerAvailable,
  type TimelineEvent,
  type WorkflowTransition,
  type CloseEvent,
  type UpToDateEvent,
  type UpdateSession,
  MAX_HISTORY_SIZE,
} from './updateSessions';

export {
  updateSessions,
  activeSessionId,
  saveSessions,
  getActiveSession,
  deleteUpdateSession,
  deleteAllUpdateSessions,
  isAppInstallerAvailable,
  MAX_HISTORY_SIZE,
};
export type { TimelineEvent, WorkflowTransition, CloseEvent, UpToDateEvent, UpdateSession };

export interface UpdateDiagnostics {
  exceptionMessage: string | null;
  failureReason: string | null;
  downloadUrl: string | null;
  apkPath: string | null;
  fileSize: string | null;
  shaExpected: string | null;
  shaCalculated: string | null;
  installerResult: string | null;
  permissionState: string | null;
  androidVersion: string | null;
  deviceModel: string | null;
  timestamp: string | null;
  architecture?: string | null;
  deviceLocale?: string | null;
  storageAvailable?: string | null;
  networkState?: string | null;
  statusCode?: number | null;
  statusText?: string | null;

  // Pipeline details
  pipelineId?: number | null;
  triggerSource?: string | null;
  pipelineOwner?: string | null;
  queueDepth?: number | null;
  coalescedEventCount?: number | null;
  cancelledPipelineCount?: number | null;
  ignoredStaleCallbacksCount?: number | null;
  activeAsyncStage?: string | null;
  pipelineDuration?: number | null;
}

export let updateDiagnostics: UpdateDiagnostics = {
  exceptionMessage: null,
  failureReason: null,
  downloadUrl: null,
  apkPath: null,
  fileSize: null,
  shaExpected: null,
  shaCalculated: null,
  installerResult: null,
  permissionState: null,
  androidVersion: null,
  deviceModel: null,
  timestamp: null,
  architecture: null,
  deviceLocale: null,
  storageAvailable: null,
  networkState: null,
  statusCode: null,
  statusText: null,

  pipelineId: null,
  triggerSource: null,
  pipelineOwner: null,
  queueDepth: null,
  coalescedEventCount: null,
  cancelledPipelineCount: null,
  ignoredStaleCallbacksCount: null,
  activeAsyncStage: null,
  pipelineDuration: null,
};


export async function populateDiagnostics(err: any, reason: string) {
  try {
    const timestamp = new Date().toISOString();
    let manufacturer = 'Web Browser';
    let model = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';
    let androidVersion = 'N/A';
    let permissionState = 'N/A';

    if (Capacitor.isNativePlatform()) {
      try {
        const { AppInstaller } = await import('../apkDownloader');
        const deviceInfo = await AppInstaller.getDeviceInfo();
        manufacturer = deviceInfo.manufacturer;
        model = deviceInfo.model;
        androidVersion = `${deviceInfo.androidVersion} (API ${deviceInfo.sdkInt})`;
        permissionState = `canRequestPackageInstalls: ${deviceInfo.canRequestPackageInstalls}`;

        updateDiagnostics.architecture = deviceInfo.architecture || 'N/A';
        updateDiagnostics.deviceLocale = deviceInfo.deviceLocale || 'N/A';
        updateDiagnostics.storageAvailable = deviceInfo.storageAvailable || 'N/A';
        updateDiagnostics.networkState = deviceInfo.networkState || 'N/A';
      } catch (e) {
        permissionState = 'Error querying permission';
      }
    }

    const apkPath =
      updateDebugLogs.downloadedApkPath ||
      localStorage.getItem('studio:downloadedApkPath') ||
      'N/A';
    let fileSize = 'N/A';
    let magicHeader = 'N/A';

    if (Capacitor.isNativePlatform() && apkPath && apkPath !== 'N/A') {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        const info = await Filesystem.stat({ path: apkPath });
        fileSize = `${(info.size / (1024 * 1024)).toFixed(2)} MB (${info.size} bytes)`;

        try {
          const { AppInstaller } = await import('../apkDownloader');
          const firstBytes = await AppInstaller.readFirstBytes({ filePath: apkPath, count: 4 });
          const matchesPK = firstBytes.hex.toLowerCase().startsWith('504b');
          magicHeader = `Hex: ${firstBytes.hex}, ASCII: ${firstBytes.ascii} (Matches PK/ZIP: ${matchesPK})`;
          updateDebugLogs.magicHeaderCheck = magicHeader;
        } catch (hErr) {
          magicHeader = `Failed to read: ${hErr instanceof Error ? hErr.message : String(hErr)}`;
          updateDebugLogs.magicHeaderCheck = magicHeader;
        }
      } catch (statErr) {
      }
    }

    let shaCalculated = updateDebugLogs.shaVerification || 'N/A';

    updateDiagnostics.exceptionMessage = err instanceof Error ? err.message : String(err);
    updateDiagnostics.failureReason =
      reason + (err instanceof Error && err.stack ? `\nStack: ${err.stack}` : '');
    const state = getGlobalUpdateState();
    updateDiagnostics.downloadUrl =
      state.apkUrl || state.downloadUrl || 'N/A';
    updateDiagnostics.apkPath = apkPath;
    updateDiagnostics.fileSize = fileSize;
    updateDiagnostics.shaExpected = state.apkSha256 || 'N/A';
    updateDiagnostics.shaCalculated = shaCalculated;
    updateDiagnostics.installerResult = updateDebugLogs.installError || 'N/A';
    updateDiagnostics.permissionState = permissionState;
    updateDiagnostics.androidVersion = androidVersion;
    updateDiagnostics.deviceModel = `${manufacturer} ${model}`;
    updateDiagnostics.timestamp = timestamp;
  } catch (diagErr) {
    console.error('[Updater] Failed to populate diagnostics:', diagErr);
  }
}


export async function runUpdaterHealthCheck(): Promise<HealthStatus> {
  const details: string[] = [];
  let metadataReachable = false;
  let githubReachable = false;
  let firebaseReachable = false;
  let installerAvailable = false;
  let packageInstallerAvailable = false;
  let certificateValid = false;

  try {
    const res = await fetch('https://studio-30f44.web.app/app-release.json', { method: 'HEAD' });
    metadataReachable = res.ok;
    firebaseReachable = res.ok;
    details.push(
      res.ok
        ? 'Firebase metadata server reachable.'
        : `Firebase metadata unreachable (HTTP ${res.status}).`
    );
  } catch (err: any) {
    details.push(`Firebase metadata unreachable: ${err.message || String(err)}`);
  }

  try {
    const res = await fetch('https://api.github.com/repos/MAGEXE1000/Livex/releases', {
      method: 'HEAD',
    });
    githubReachable = res.ok;
    details.push(res.ok ? 'GitHub API reachable.' : `GitHub API unreachable (HTTP ${res.status}).`);
  } catch (err: any) {
    details.push(`GitHub API unreachable: ${err.message || String(err)}`);
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { AppInstaller } = await import('../apkDownloader');
      installerAvailable = typeof AppInstaller.installApk === 'function';
      packageInstallerAvailable = true;
      details.push('AppInstaller native plugin loaded.');

      const appInfo = await AppInstaller.getInstalledAppInfo();
      const expectedFingerprint =
        '900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206';
      const cleanFingerprint = appInfo.signingSha256.replace(/:/g, '').toLowerCase();
      certificateValid = cleanFingerprint === expectedFingerprint;
      if (certificateValid) {
        details.push('App signing certificate matches official production key.');
      } else {
        details.push(
          `Warning: App certificate mismatch! Current: ${cleanFingerprint}, Expected: ${expectedFingerprint}`
        );
      }
    } catch (err: any) {
      details.push(`Native installer check failed: ${err.message || String(err)}`);
    }
  } else {
    details.push('Running on Web platform. Native installer not required.');
    installerAvailable = true;
    packageInstallerAvailable = true;
    certificateValid = true;
  }

  const isHealthy = metadataReachable && githubReachable && installerAvailable && certificateValid;
  const status = isHealthy
    ? 'healthy'
    : installerAvailable && certificateValid
      ? 'warning'
      : 'unhealthy';

  return {
    status,
    metadataReachable,
    githubReachable,
    firebaseReachable,
    installerAvailable,
    packageInstallerAvailable,
    certificateValid,
    details,
  };
}


export async function getDiagnosticsReport(): Promise<string> {
  const health = await runUpdaterHealthCheck();
  let info: any = null;
  let dev: any = null;
  if (Capacitor.isNativePlatform()) {
    try {
      const { AppInstaller } = await import('../apkDownloader');
      info = await AppInstaller.getInstalledAppInfo();
      dev = await AppInstaller.getDeviceInfo();
    } catch {}
  }

  const state = getGlobalUpdateState();
  return `=== STUDIO UPDATER HEALTH & DIAGNOSTICS REPORT ===
Timestamp: ${new Date().toISOString()}
Current State: ${state.updateState}
Update Available: ${state.updateAvailable}
Remote Version: ${state.remoteVersion}
Download Source: ${updateDebugLogs.currentDownloadSource || 'None'}
SHA Status: ${updateDebugLogs.shaVerification || 'N/A'}
Consecutive Failures: ${state.consecutiveFailures}
Active Fallback: ${state.activeFallback || 'None'}
Recovery Mode Active: ${state.recoveryMode}

--- Platform Health ---
Overall Status: ${health.status.toUpperCase()}
Metadata Reachable: ${health.metadataReachable}
GitHub Reachable: ${health.githubReachable}
Firebase Reachable: ${health.firebaseReachable}
Installer Available: ${health.installerAvailable}
PackageInstaller Available: ${health.packageInstallerAvailable}
Signing Certificate Valid: ${health.certificateValid}

--- Device & Package Info ---
App Version: ${APP_VERSION}
Package Name: ${info?.packageName || 'com.chordex.app'}
Installed Version Code: ${info?.versionCode || 'N/A'}
Installed Sign SHA256: ${info?.signingSha256 || 'N/A'}
Android Version: ${dev?.androidVersion || 'N/A'}
Device Model: ${dev?.model || 'N/A'}
Storage Available: ${dev?.storageAvailable || 'N/A'}

--- Health Check Logs ---
${health.details.join('\n')}
==================================================`;
}


export function resetUpdateDiagnostics() {
  // Reset all keys in updateDiagnostics
  Object.keys(updateDiagnostics).forEach((key) => {
    (updateDiagnostics as any)[key] = null;
  });

  // Reset keys in updateDebugLogs
  Object.keys(updateDebugLogs).forEach((key) => {
    if (key === 'appVersion') {
      updateDebugLogs.appVersion = APP_VERSION;
    } else if (
      key === 'apkEligibilityResult' ||
      key === 'pluginMethodCheck' ||
      key === 'finalUpdatePath'
    ) {
      (updateDebugLogs as any)[key] = 'N/A';
    } else if (key === 'registeredPlugins') {
      updateDebugLogs.registeredPlugins = '[]';
    } else if (
      key === 'otaBlockedBecauseApkRequired' ||
      key === 'nativeApkBehind' ||
      key === 'apkUpdateRequired' ||
      key === 'staleOtaCleared' ||
      key === 'UpdaterSetBlocked'
    ) {
      (updateDebugLogs as any)[key] = false;
    } else if (
      key === 'appInstallerAvailable' ||
      key === 'downloadApkAvailable' ||
      key === 'verifyApkSha256Available' ||
      key === 'installApkAvailable' ||
      key === 'openInstallPermissionSettingsAvailable'
    ) {
      (updateDebugLogs as any)[key] = false;
    } else if (key === 'recoveryAttemptsPerformed') {
      updateDebugLogs.recoveryAttemptsPerformed = [];
    } else {
      (updateDebugLogs as any)[key] = null;
    }
  });

  deleteAllUpdateSessions();
}


export function recordStateTransition(fromState: string, toState: string, reason: string) {
  let devMode = false;
  try {
    const storeStr = localStorage.getItem('chord-explorer-storage-v3');
    if (storeStr) {
      const parsed = JSON.parse(storeStr);
      devMode = parsed.state?.settings?.developerMode ?? false;
    }
  } catch (_) {}
  if (!devMode) return;

  const now = Date.now();
  let session = updateSessions.find((s) => s.id === activeSessionId);
  if (!session && updateSessions.length > 0) {
    session = updateSessions[updateSessions.length - 1];
  }

  const caller = parseStackTrace();
  const elapsedTimeMs = session ? now - session.startTimestamp : 0;
  const formatTime = new Date(now).toTimeString().split(' ')[0];

  const lastTransition = session ? session.transitions[session.transitions.length - 1] : null;
  const enteredTime = lastTransition
    ? lastTransition.absoluteTimestamp
    : session
      ? session.startTimestamp
      : now;
  const durationMs = now - enteredTime;

  let screen = 'unknown';
  try {
    const { useNavigationStore } = require('../../store/useNavigationStore');
    const navStore = useNavigationStore.getState();
    if (navStore && navStore.history && navStore.history.length > 0) {
      const lastRoute = navStore.history[navStore.history.length - 1];
      screen = lastRoute.page || lastRoute.tab || lastRoute.app || 'unknown';
    }
  } catch (_) {}

  const lifecycleState =
    typeof document !== 'undefined' ? (document.hidden ? 'background' : 'foreground') : 'unknown';
  const packageInstallerStatus = (window as any).__studioInstallerStatus || 'none';
  const state = getGlobalUpdateState();
  const progress = state.progress;
  const activePipeline = getActivePipelineContext();

  const trans: WorkflowTransition = {
    timestamp: formatTime,
    absoluteTimestamp: now,
    previousState: fromState,
    nextState: toState,
    caller: caller.callerLine,
    file: caller.file,
    functionName: caller.functionName,
    reason: reason,
    thread: 'JS Main Thread',
    elapsedTimeMs,
    sessionId: session ? session.id : 'N/A',
    pipelineId: activePipeline ? activePipeline.checkId : null,
    durationMs,
    screen,
    lifecycleState,
    packageInstallerStatus,
    progress,
  };

  if (session) {
    session.transitions.push(trans);

    if (!session.stateDurations) {
      session.stateDurations = {};
    }
    if (fromState) {
      const lastTransition = session.transitions[session.transitions.length - 2];
      const enteredTime = lastTransition
        ? lastTransition.absoluteTimestamp
        : session.startTimestamp;
      const duration = now - enteredTime;
      session.stateDurations[fromState] = (session.stateDurations[fromState] || 0) + duration;
    }

    if (toState === 'INSTALL_SUCCESS') {
      session.result = 'SUCCESS';
      session.endTime = new Date().toISOString();
      session.durationMs = now - session.startTimestamp;
    } else if (toState === 'NO_UPDATE_AVAILABLE') {
      session.result = 'FINISHED';
      session.endTime = new Date().toISOString();
      session.durationMs = now - session.startTimestamp;

      const caller = parseStackTrace();
      const lifecycleState = typeof document !== 'undefined' ? document.visibilityState : 'unknown';
      const activityState = (window as any).__studioActivityState || 'active';
      const activePipeline = getActivePipelineContext();
      const activeSession = getActiveUpdateSession();
      const pipelineIdStr = String(
        activePipeline?.checkId ??
          (activeSession ? activeSession.pipelineId : 'N/A')
      );
      const sessionIdStr = session.id || 'N/A';

      session.noUpdateDetails = {
        callerInfo: caller.callerLine,
        stackTrace: caller.stackTrace,
        previousState: fromState || 'unknown',
        currentState: toState,
        pipelineId: pipelineIdStr,
        sessionId: sessionIdStr,
        lifecycleState: lifecycleState || 'unknown',
        activityState: activityState,
        reason: reason || 'unknown',
        timestamp: new Date(now).toISOString(),
      };
    } else if (toState === 'INSTALL_CANCELLED') {
      session.result = 'CANCELLED';
      session.endTime = new Date().toISOString();
      session.durationMs = now - session.startTimestamp;
    } else if (toState === 'INSTALL_FAILED') {
      session.result = 'FAILED';
      session.endTime = new Date().toISOString();
      session.durationMs = now - session.startTimestamp;
    } else if (
      toState === 'IDLE' &&
      ['INSTALLING', 'WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE'].includes(fromState)
    ) {
      session.result = 'ABORTED';
      session.endTime = new Date().toISOString();
      session.durationMs = now - session.startTimestamp;
    }

    saveSessions();
  }
}


export function recordCloseEvent(reason: string) {
  let devMode = false;
  try {
    const storeStr = localStorage.getItem('chord-explorer-storage-v3');
    if (storeStr) {
      const parsed = JSON.parse(storeStr);
      devMode = parsed.state?.settings?.developerMode ?? false;
    }
  } catch (_) {}
  if (!devMode) return;

  const now = Date.now();
  let session = updateSessions.find((s) => s.id === activeSessionId);
  if (!session && updateSessions.length > 0) {
    session = updateSessions[updateSessions.length - 1];
  }

  const caller = parseStackTrace();
  const current = getGlobalUpdateState().updateState;

  let prev: string = current;
  if (session && session.transitions.length > 0) {
    prev = session.transitions[session.transitions.length - 1].previousState;
  }

  const closeEv: CloseEvent = {
    timestamp: new Date(now).toISOString(),
    functionName: caller.functionName,
    file: caller.file,
    caller: caller.callerLine,
    reason: reason,
    stackTrace: caller.stackTrace,
    currentState: current,
    previousState: prev,
    sessionId: session ? session.id : 'N/A',
  };

  if (session) {
    session.closeEvent = closeEv;
    session.timeline.push({
      timestamp: new Date(now).toTimeString().split(' ')[0],
      absoluteTimestamp: now,
      offset: formatOffsetTime(now - session.startTimestamp),
      offsetMs: now - session.startTimestamp,
      module: 'UI',
      event: 'UPDATER_CLOSED',
      state: current,
      reason: `Closed by ${caller.functionName} (${caller.file}) - Reason: ${reason}`,
    });
    saveSessions();
  }
}


export function recordUpToDatePopup(reason: string, isAutomatic: boolean) {
  let devMode = false;
  try {
    const storeStr = localStorage.getItem('chord-explorer-storage-v3');
    if (storeStr) {
      const parsed = JSON.parse(storeStr);
      devMode = parsed.state?.settings?.developerMode ?? false;
    }
  } catch (_) {}
  if (!devMode) return;

  const now = Date.now();
  let session = updateSessions.find((s) => s.id === activeSessionId);
  if (!session && updateSessions.length > 0) {
    session = updateSessions[updateSessions.length - 1];
  }

  const caller = parseStackTrace();
  const current = getGlobalUpdateState().updateState;
  let prev: string = current;
  if (session && session.transitions.length > 0) {
    prev = session.transitions[session.transitions.length - 1].previousState;
  }

  const upToDateEv: UpToDateEvent = {
    timestamp: new Date(now).toISOString(),
    functionName: caller.functionName,
    file: caller.file,
    caller: caller.callerLine,
    stackTrace: caller.stackTrace,
    previousState: prev,
    currentState: current,
    sessionId: session ? session.id : 'N/A',
    reason: reason,
    triggerType: isAutomatic ? 'AUTOMATIC' : 'USER ACTION',
  };

  if (session) {
    session.upToDateEvent = upToDateEv;
    session.timeline.push({
      timestamp: new Date(now).toTimeString().split(' ')[0],
      absoluteTimestamp: now,
      offset: formatOffsetTime(now - session.startTimestamp),
      offsetMs: now - session.startTimestamp,
      module: 'UI',
      event: 'UP_TO_DATE_POPUP_SHOWN',
      state: current,
      reason: `Shown via: ${isAutomatic ? 'AUTOMATIC' : 'USER ACTION'} (${caller.functionName} in ${caller.file}) - Reason: ${reason}`,
    });
    saveSessions();
  }
}


export interface HealthStatus {
  status: 'healthy' | 'warning' | 'unhealthy';
  metadataReachable: boolean;
  githubReachable: boolean;
  firebaseReachable: boolean;
  installerAvailable: boolean;
  packageInstallerAvailable: boolean;
  certificateValid: boolean;
  details: string[];
}

export function nextJsCallId(): number {
  return ++checkCallIdCounter;
}





export function startDiagnosticsHistorySession(trigger = 'unknown', reason = 'unknown') {
  let devMode = false;
  try {
    const storeStr = localStorage.getItem('chord-explorer-storage-v3');
    if (storeStr) {
      const parsed = JSON.parse(storeStr);
      devMode = parsed.state?.settings?.developerMode ?? false;
    }
  } catch (_) {}

  if (!devMode) return;

  let nextNum = 1;
  try {
    const lastNumStr = localStorage.getItem('studio:diagnostics_last_session_number');
    if (lastNumStr) {
      nextNum = Number(lastNumStr) + 1;
    }
  } catch (_) {}
  try {
    localStorage.setItem('studio:diagnostics_last_session_number', String(nextNum));
  } catch (_) {}

  const sessionId = `Session #${nextNum}`;
  setActiveSessionId(sessionId);

  let model = 'Web Browser';
  let osVer = 'N/A';
  if (Capacitor.isNativePlatform()) {
    model = 'Android Device';
    osVer = 'Android OS';
  }

  const newSession: UpdateSession = {
    id: sessionId,
    sessionNumber: nextNum,
    startTime: new Date().toISOString(),
    startTimestamp: Date.now(),
    endTime: null,
    durationMs: null,
    result: 'IN_PROGRESS',
    version: getGlobalUpdateState().remoteVersion,
    buildType: Capacitor.isNativePlatform() ? 'Native Android' : 'Web',
    deviceModel: model,
    androidVersion: osVer,
    timeline: [],
    transitions: [],
    closeEvent: null,
    upToDateEvent: null,
    stateDurations: {},
  };

  updateSessions.push(newSession);
  saveSessions();

  logTimelineEvent('Session', 'SESSION_STARTED', `Trigger: ${trigger} | Reason: ${reason}`);
}





export function getUpdateSessions(): UpdateSession[] {
  const events = UpdaterFlightRecorder.getEvents();

  // Group events by sessionId
  const sessionsMap = new Map<string, FlightRecorderEvent[]>();
  events.forEach((e) => {
    if (e.sessionId) {
      if (!sessionsMap.has(e.sessionId)) {
        sessionsMap.set(e.sessionId, []);
      }
      sessionsMap.get(e.sessionId)!.push(e);
    }
  });

  const sessions: UpdateSession[] = [];
  let nextNum = 1;

  sessionsMap.forEach((sessionEvents, sId) => {
    // Sort by timestamp
    sessionEvents.sort((a, b) => a.timestamp - b.timestamp);

    const firstEvent = sessionEvents[0];
    const lastEvent = sessionEvents[sessionEvents.length - 1];
    const startTimestamp = firstEvent.timestamp;

    // Find final state of session
    let result: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'IN_PROGRESS' | 'FINISHED' | 'ABORTED' =
      'IN_PROGRESS';
    let endTime: string | null = null;
    let durationMs: number | null = null;

    // Check if session has ended
    const successEvent = sessionEvents.find(
      (e) =>
        e.newState === 'INSTALL_SUCCESS' ||
        e.eventType === 'applyUpdateSuccess' ||
        e.eventType === 'INSTALL_SUCCESS'
    );
    const failureEvent = sessionEvents.find(
      (e) =>
        e.newState === 'INSTALL_FAILED' ||
        e.eventType === 'applyUpdateError' ||
        e.eventType === 'INSTALL_FAILED'
    );
    const cancelEvent = sessionEvents.find(
      (e) => e.newState === 'INSTALL_CANCELLED' || e.eventType === 'INSTALL_CANCELLED'
    );

    if (successEvent) {
      result = 'SUCCESS';
      endTime = new Date(successEvent.timestamp).toISOString();
      durationMs = successEvent.timestamp - startTimestamp;
    } else if (failureEvent) {
      result = 'FAILED';
      endTime = new Date(failureEvent.timestamp).toISOString();
      durationMs = failureEvent.timestamp - startTimestamp;
    } else if (cancelEvent) {
      result = 'CANCELLED';
      endTime = new Date(cancelEvent.timestamp).toISOString();
      durationMs = cancelEvent.timestamp - startTimestamp;
    } else {
      // Look at the last event to check if it represents a terminal state
      if (
        lastEvent.newState === 'NO_UPDATE_AVAILABLE' ||
        lastEvent.eventType === 'NO_UPDATE_AVAILABLE'
      ) {
        result = 'FINISHED';
        endTime = new Date(lastEvent.timestamp).toISOString();
        durationMs = lastEvent.timestamp - startTimestamp;
      }
    }

    // Build timeline and transitions
    const timeline: TimelineEvent[] = [];
    const transitions: WorkflowTransition[] = [];
    const stateDurations: Record<string, number> = {};

    sessionEvents.forEach((e) => {
      const offsetMs = e.timestamp - startTimestamp;
      const min = Math.floor(offsetMs / 60000);
      const sec = Math.floor((offsetMs % 60000) / 1000);
      const ms = offsetMs % 1000;
      const offset =
        String(min).padStart(2, '0') +
        ':' +
        String(sec).padStart(2, '0') +
        '.' +
        String(ms).padStart(3, '0');

      // Add to timeline
      timeline.push({
        timestamp: new Date(e.timestamp).toTimeString().split(' ')[0],
        absoluteTimestamp: e.timestamp,
        offset,
        offsetMs,
        module: e.category || 'Pipeline',
        event: e.eventType,
        state: (e.newState || 'IDLE') as any,
        reason: e.reason || e.details || '',
      });

      // Add to transitions if it's a state transition
      if (e.eventType === 'transitionToState' || e.eventType === 'fsmTransition') {
        transitions.push({
          timestamp: new Date(e.timestamp).toTimeString().split(' ')[0],
          absoluteTimestamp: e.timestamp,
          previousState: e.previousState || 'IDLE',
          nextState: e.newState || 'IDLE',
          caller: e.caller || 'unknown',
          file: e.fileName || 'unknown',
          functionName: e.funcName || 'unknown',
          reason: e.reason || 'unknown',
          thread: e.thread === 'native' ? 'Native Thread' : 'Main JS Thread',
          elapsedTimeMs: offsetMs,
          sessionId: sId,
          pipelineId: e.workflowId ? Number(e.workflowId) : null,
          durationMs: e.duration || 0,
          screen: 'unknown',
          lifecycleState: 'unknown',
          packageInstallerStatus: 'none',
          progress: 0,
        });

        // Compute state durations
        if (e.previousState) {
          const prevTrans = transitions[transitions.length - 2];
          const enteredTime = prevTrans ? prevTrans.absoluteTimestamp : startTimestamp;
          const duration = e.timestamp - enteredTime;
          stateDurations[e.previousState] = (stateDurations[e.previousState] || 0) + duration;
        }
      }
    });

    sessions.push({
      id: sId,
      sessionNumber: nextNum++,
      startTime: new Date(startTimestamp).toISOString(),
      startTimestamp,
      endTime,
      durationMs,
      result,
      version: getGlobalUpdateState().remoteVersion,
      buildType: Capacitor.isNativePlatform() ? 'Native Android' : 'Web',
      deviceModel: 'Android Device',
      androidVersion: 'Android OS',
      timeline,
      transitions,
      closeEvent: null,
      upToDateEvent: null,
      stateDurations,
    });
  });

  return sessions;
}





export function exportSessionSubset(
  sessionSelector: 'current' | 'previous' | 'all' | string,
  subset: 'all' | 'workflow' | 'timeline' | 'native' | 'js',
  format: 'txt' | 'json' | 'md'
): string {
  let targets: UpdateSession[] = [];
  if (sessionSelector === 'current') {
    const s =
      updateSessions.find((x) => x.id === activeSessionId) ||
      updateSessions[updateSessions.length - 1];
    if (s) targets = [s];
  } else if (sessionSelector === 'previous') {
    if (updateSessions.length >= 2) {
      targets = [updateSessions[updateSessions.length - 2]];
    }
  } else if (sessionSelector === 'all') {
    targets = updateSessions;
  } else {
    const s = updateSessions.find((x) => x.id === sessionSelector);
    if (s) targets = [s];
  }

  if (targets.length === 0) return 'No matching update sessions found.';

  const filtered = targets.map((session) => {
    const sCopy = { ...session };

    if (subset === 'timeline') {
      sCopy.transitions = [];
      sCopy.closeEvent = null;
      sCopy.upToDateEvent = null;
    } else if (subset === 'workflow') {
      sCopy.timeline = [];
      sCopy.closeEvent = null;
      sCopy.upToDateEvent = null;
    } else if (subset === 'native') {
      sCopy.timeline = sCopy.timeline.filter(
        (e) => e.module === 'NativeInstaller' || e.module === 'RecoveryManager'
      );
      sCopy.transitions = [];
    } else if (subset === 'js') {
      sCopy.timeline = sCopy.timeline.filter(
        (e) => e.module !== 'NativeInstaller' && e.module !== 'RecoveryManager'
      );
    }

    return sCopy;
  });

  if (format === 'json') {
    return JSON.stringify(filtered.length === 1 ? filtered[0] : filtered, null, 2);
  }

  let output = '';
  filtered.forEach((session) => {
    const startIso = session.startTime;
    const durSec =
      session.durationMs !== null ? (session.durationMs / 1000).toFixed(2) + 's' : 'N/A';

    if (format === 'md') {
      output += `# Session: ${session.id}\n`;
      output += `- **Started**: ${startIso}\n`;
      output += `- **Finished**: ${session.endTime || 'N/A'}\n`;
      output += `- **Duration**: ${durSec}\n`;
      output += `- **Result**: ${session.result}\n`;
      output += `- **Target Version**: ${session.version || 'N/A'}\n`;
      output += `- **Platform**: ${session.buildType} \| Device: ${session.deviceModel} \| OS: ${session.androidVersion}\n\n`;

      if (subset !== 'workflow' && session.timeline.length > 0) {
        output += `### Timeline\n\n`;
        output += `| Timestamp | Offset | State | Module | Event | Reason |\n`;
        output += `|---|---|---|---|---|---|\n`;
        session.timeline.forEach((e) => {
          output += `| ${e.timestamp} | ${e.offset} | ${e.state} | ${e.module} | ${e.event} | ${e.reason.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')} |\n`;
        });
        output += `\n`;
      }

      if (subset !== 'timeline' && session.transitions.length > 0) {
        output += `### Workflow Transitions\n\n`;
        output += `| Timestamp | Elapsed | Prev | Next | Function | File | Reason |\n`;
        output += `|---|---|---|---|---|---|---|\n`;
        session.transitions.forEach((t) => {
          output += `| ${t.timestamp} | ${(t.elapsedTimeMs / 1000).toFixed(3)}s | ${t.previousState} | ${t.nextState} | ${t.functionName} | ${t.file} | ${t.reason.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')} |\n`;
        });
        output += `\n`;
      }

      if (session.closeEvent) {
        output += `### Close Event Details\n`;
        output += `- **Closed At**: ${session.closeEvent.timestamp}\n`;
        output += `- **By Function**: \`${session.closeEvent.functionName}\` in \`${session.closeEvent.file}\`\n`;
        output += `- **Reason**: ${session.closeEvent.reason}\n`;
        output += `- **Caller**: \`${session.closeEvent.caller}\`\n`;
        output += `- **State before close**: ${session.closeEvent.previousState} -> ${session.closeEvent.currentState}\n\n`;
      }

      if (session.upToDateEvent) {
        output += `### "Studio is up to date" Popup Event\n`;
        output += `- **Trigger Type**: ${session.upToDateEvent.triggerType}\n`;
        output += `- **Timestamp**: ${session.upToDateEvent.timestamp}\n`;
        output += `- **By Function**: \`${session.upToDateEvent.functionName}\` in \`${session.upToDateEvent.file}\`\n`;
        output += `- **Reason**: ${session.upToDateEvent.reason}\n`;
        output += `- **State**: ${session.upToDateEvent.previousState} -> ${session.upToDateEvent.currentState}\n\n`;
      }

      output += `---\n\n`;
    } else {
      output += `=========================================\n`;
      output += `SESSION: ${session.id}\n`;
      output += `=========================================\n`;
      output += `Started: ${startIso}\n`;
      output += `Finished: ${session.endTime || 'N/A'}\n`;
      output += `Duration: ${durSec}\n`;
      output += `Result: ${session.result}\n`;
      output += `Target Version: ${session.version || 'N/A'}\n`;
      output += `Platform: ${session.buildType}\n`;
      output += `Device: ${session.deviceModel}\n`;
      output += `OS Version: ${session.androidVersion}\n\n`;

      if (subset !== 'workflow' && session.timeline.length > 0) {
        output += `Timeline:\n`;
        session.timeline.forEach((e) => {
          output += `${e.timestamp} [${e.offset}] [${e.module}] ${e.event} (${e.state}) - ${e.reason}\n`;
        });
        output += `\n`;
      }

      if (subset !== 'timeline' && session.transitions.length > 0) {
        output += `Workflow Transitions:\n`;
        session.transitions.forEach((t) => {
          output += `${t.timestamp} [${(t.elapsedTimeMs / 1000).toFixed(3)}s] ${t.previousState} -> ${t.nextState} | Caller: ${t.functionName} (${t.file}) | Reason: ${t.reason}\n`;
        });
        output += `\n`;
      }

      if (session.closeEvent) {
        output += `Close Event Details:\n`;
        output += `  Timestamp: ${session.closeEvent.timestamp}\n`;
        output += `  Function: ${session.closeEvent.functionName} in ${session.closeEvent.file}\n`;
        output += `  Reason: ${session.closeEvent.reason}\n`;
        output += `  Caller: ${session.closeEvent.caller}\n`;
        output += `  State transition: ${session.closeEvent.previousState} -> ${session.closeEvent.currentState}\n\n`;
      }

      if (session.upToDateEvent) {
        output += `"Studio is up to date" Popup Event:\n`;
        output += `  Trigger Type: ${session.upToDateEvent.triggerType}\n`;
        output += `  Timestamp: ${session.upToDateEvent.timestamp}\n`;
        output += `  Function: ${session.upToDateEvent.functionName} in ${session.upToDateEvent.file}\n`;
        output += `  Reason: ${session.upToDateEvent.reason}\n`;
        output += `  State transition: ${session.upToDateEvent.previousState} -> ${session.upToDateEvent.currentState}\n\n`;
      }

      output += `\n\n`;
    }
  });

  return output;
}





let checkCallIdCounter = 0;
export function formatOffsetTime(offsetMs: number): string {
  const min = Math.floor(offsetMs / 60000);
  const sec = Math.floor((offsetMs % 60000) / 1000);
  const ms = offsetMs % 1000;
  return (
    String(min).padStart(2, '0') +
    ':' +
    String(sec).padStart(2, '0') +
    '.' +
    String(ms).padStart(3, '0')
  );
}
