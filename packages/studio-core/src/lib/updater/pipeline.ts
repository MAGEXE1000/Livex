import { Capacitor } from '@capacitor/core';
/**
 * updater/pipeline.ts
 *
 * Core Updater update pipeline:
 *   - UpdatePipelineCoordinatorClass / UpdatePipelineCoordinator (queue + cancel)
 *   - PipelineCancelledError
 *   - resetAppUpdateState, enforceStartupRecovery
 *   - checkForUpdate / executeCheckForUpdateInternal
 *   - downloadUpdate / downloadUpdateInternal
 *   - applyUpdate / applyUpdateInternal
 *   - initializeGlobalUpdateListeners
 *   - checkAndCleanCache
 *   - triggerDowngrade
 */

import { useCallback } from 'react';
import { APP_VERSION, compareSemver, parseAndNormalizeVersion } from '../appVersion';
import { AppInstaller } from '../apkDownloader';
import { releaseMetadataInspector } from './versionLogger';
import { isAppInstallerAvailable } from './diagnostics';
import { nativeSet, NATIVE_PREFS } from '../nativePrefs';
import { useNavigationStore } from '../../store/useNavigationStore';
import { logActivity } from '../activityLogger';
import { PerformanceProfiler } from '../performanceProfiler';
import { UpdaterFlightRecorder } from './flightRecorder';

import {
  globalUpdateState,
  updateGlobalState,
  transitionToState,
  stopWatchdog,
  stateListeners,
  setActivePipelineContext,
  activePipelineContext,
  type CentralizedUpdateState,
  type AppUpdateState,
  isUpdateSessionActive,
  verifyAndCleanCaches,
  isPostInstallSessionActive,
  getPostInstallSessionInfo,
  activeUpdateSession,
  updateActiveSession,
  isUpdateDismissed,
} from './stateMachine';

import {
  type RemoteVersionInfo,
  fetchRemoteVersion,
  versionJsonUrls,
  validateRemoteMetadata,
  logPipelineTrace,
} from './releaseMetadata';
import { compareVersions } from './versionComparison';
import { downloadUpdateApk, downloadAndInstallGitHubApk } from './downloadManager';
import { verifyFileIntegrity } from './integrityVerification';
import { runEligibilityCheck } from './eligibilityVerification';
import { triggerNativeInstall, processLastInstallResult } from './installer';
import { runSignatureMismatchRecovery, isRecovering, setIsRecovering } from './recovery';

import {
  validateLocalApk,
  deleteLocalApk,
  getLocalApkPath,
  recordDismissal,
  shouldShowRecoveryReminder,
} from './cacheManager';
import {
  updateDebugLogs,
  updateDiagnostics,
  logProgressStage,
  populateDiagnostics,
  nextJsCallId,
  runUpdaterHealthCheck,
  getDiagnosticsReport,
  type HealthStatus,
  logTimelineEvent,
  interceptIllegalCall,
  startDiagnosticsSession,
  getTimelineReport,
  recordCloseEvent,
  recordUpToDatePopup,
  logInstallLockEvent,
} from './diagnostics';

import { logDiagnosticEvent, logDetailedJsTrace } from './telemetry';
import {
  getStoredList,
  addToStoredList,
  getSessionItem,
  setSessionItem,
  removeSessionItem,
  getNativeVersion,
  getNativeVersionCode,
} from './sessionStorage';
import { getPackageInstallerStatusName } from './packageInstallerStatus';
import { getUpdateHistory, logUpdateTransition } from './updateHistory';

// ─── Simulation Stubs (dev-time hooks, intentionally no-op in production) ──
// These provide named hooks for updater simulation scenarios (download failures,
// SHA mismatches, forced updates, etc.). They are referenced throughout the
// pipeline but are inactive unless explicitly wired up during development.
const updaterSimulation: Record<string, any> = {};
function addJsLog(_msg: string): void {}
function setSimulateStatusCallback(_cb: any): void {}
const simulateStatusCallback: ((data: any) => void) | null = null;

// ─── Pipeline Error ────────────────────────────────────────────────────────

export class PipelineCancelledError extends Error {
  constructor(message = 'Update pipeline cancelled') {
    super(message);
    this.name = 'PipelineCancelledError';
  }
}

// ─── Pipeline Coordinator ─────────────────────────────────────────────────

interface PipelineRequest {
  id: number;
  isManual: boolean;
  trigger: string;
  reason: string;
  resolve: (value: CentralizedUpdateState) => void;
  reject: (reason: any) => void;
  promise: Promise<CentralizedUpdateState>;
}

export class UpdatePipelineCoordinatorClass {
  private activePipelineId: number = 0;
  private currentPromise: Promise<CentralizedUpdateState> | null = null;
  private currentRequest: PipelineRequest | null = null;
  private requestQueue: PipelineRequest[] = [];

  // Diagnostics & Telemetry
  public coalescedEventCount: number = 0;
  public cancelledPipelineCount: number = 0;
  public ignoredStaleCallbacksCount: number = 0;
  public activeAsyncStage: string = 'IDLE';

  public getDiagnostics() {
    return {
      activePipelineId: this.activePipelineId,
      queueDepth: this.requestQueue.length,
      coalescedEventCount: this.coalescedEventCount,
      cancelledPipelineCount: this.cancelledPipelineCount,
      ignoredStaleCallbacksCount: this.ignoredStaleCallbacksCount,
      activeAsyncStage: this.activeAsyncStage,
      currentOwner: this.currentRequest?.isManual ? 'manual' : 'automatic',
      currentTrigger: this.currentRequest?.trigger || 'N/A',
      currentReason: this.currentRequest?.reason || 'N/A',
    };
  }

  public dispatch(
    isManual: boolean,
    trigger: string,
    reason: string
  ): Promise<CentralizedUpdateState> {
    const pipelineId = ++this.activePipelineId;
    if (this.currentPromise && this.currentRequest) {
      if (!isManual || this.currentRequest.isManual) {
        this.coalescedEventCount++;
        return this.currentPromise;
      } else {
        this.cancelledPipelineCount++;
      }
    }

    let resolveFn!: (value: CentralizedUpdateState) => void;
    let rejectFn!: (reason: any) => void;
    const promise = new Promise<CentralizedUpdateState>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const request: PipelineRequest = {
      id: pipelineId,
      isManual,
      trigger,
      reason,
      resolve: resolveFn,
      reject: rejectFn,
      promise,
    };

    if (this.currentPromise) {
      if (isManual) {
        this.requestQueue = this.requestQueue.filter((r) => {
          if (!r.isManual) {
            r.resolve(globalUpdateState);
            return false;
          }
          return true;
        });
      }
      this.requestQueue.push(request);
      return promise;
    }

    void this.executeRequest(request);
    return promise;
  }

  private async executeRequest(request: PipelineRequest) {
    this.currentRequest = request;
    this.currentPromise = request.promise;
    const startTime = Date.now();

    try {
      this.activeAsyncStage = 'AWAIT_STARTUP_RECOVERY';
      if (startupRecoveryPromise) {
        await startupRecoveryPromise;
      }

      if (request.id !== this.activePipelineId) {
        throw new PipelineCancelledError(
          `Pipeline #${request.id} cancelled during startup recovery block`
        );
      }

      const result = await executeCheckForUpdateInternal(
        request.id,
        request.isManual,
        request.trigger,
        request.reason
      );
      request.resolve(result);
    } catch (err) {
      if (err instanceof PipelineCancelledError) {
        request.resolve(globalUpdateState);
      } else {
        request.reject(err);
      }
    } finally {
      this.activeAsyncStage = 'IDLE';
      const duration = Date.now() - startTime;
      this.currentRequest = null;
      this.currentPromise = null;

      const diagnostics = this.getDiagnostics();
      updateDiagnostics.pipelineId = diagnostics.activePipelineId;
      updateDiagnostics.triggerSource = diagnostics.currentTrigger;
      updateDiagnostics.pipelineOwner = diagnostics.currentOwner;
      updateDiagnostics.queueDepth = diagnostics.queueDepth;
      updateDiagnostics.coalescedEventCount = diagnostics.coalescedEventCount;
      updateDiagnostics.cancelledPipelineCount = diagnostics.cancelledPipelineCount;
      updateDiagnostics.ignoredStaleCallbacksCount = diagnostics.ignoredStaleCallbacksCount;
      updateDiagnostics.activeAsyncStage = diagnostics.activeAsyncStage;
      updateDiagnostics.pipelineDuration = duration;

      if (this.requestQueue.length > 0) {
        const nextReq = this.requestQueue.shift()!;
        void this.executeRequest(nextReq);
      }
    }
  }

  public getActivePipelineId() {
    return this.activePipelineId;
  }

  public setStage(stage: string) {
    this.activeAsyncStage = stage;
  }
}

export const UpdatePipelineCoordinator = new UpdatePipelineCoordinatorClass();

// ─── Private helpers ──────────────────────────────────────────────────────

function checkCancellation(pipelineId: number, stage: string) {
  UpdatePipelineCoordinator.setStage(stage);
  if (pipelineId !== UpdatePipelineCoordinator.getActivePipelineId()) {
    UpdatePipelineCoordinator.cancelledPipelineCount++;
    throw new PipelineCancelledError(
      `Pipeline #${pipelineId} superseded/cancelled at stage: ${stage}`
    );
  }
}

function safeTransition(
  expectedState: AppUpdateState,
  nextState: AppUpdateState,
  reason: string,
  failureReason?: string
): boolean {
  if (globalUpdateState.updateState !== expectedState) {
    return false;
  }
  transitionToState(nextState, reason, failureReason);
  return true;
}

async function delayForSim(ms: number) {
  if (updaterSimulation.runWorkflowActive) {
    // High-fidelity slow simulation for visual inspection (e.g. 200ms per download step)
    await new Promise((resolve) => setTimeout(resolve, ms * 20));
  } else if (updaterSimulation.simulateDownloadThrottling) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ─── Queue/State variables ────────────────────────────────────────────────

let currentSessionStartTime = 0;
const latestCheckId = 0;
const activeCheckIsManual = false;
const activeCheckPromise: Promise<CentralizedUpdateState> | null = null;
let activeDownloadPromise: Promise<void> | null = null;
let activeApplyPromise: Promise<void> | null = null;
let startupRecoveryPromise: Promise<void> | null = null;
let isDownloading = false;
let isApplying = false;
let lastCheckedTime = 0;
let activeInstallPromiseResolver: (() => void) | null = null;
let activeInstallPromiseRejecter: ((err: Error) => void) | null = null;
let lastInstallProgressTime = 0;

/**
 * Holds the in-flight promise for checkAndRecoverInstallState() while the app
 * is resuming from background. This is the sequencing gate that prevents
 * triggerUpdateCheck from reading isInstallationLocked() before the native
 * IPC query (getLastInstallResult) has resolved and set installationJustCompleted.
 *
 * The window where this is non-null is typically 100–500ms on real devices.
 * On a normal resume with no active session it resolves in < 10ms.
 */
let installRecoveryPromise: Promise<void> | null = null;

/**
 * Returns the current in-flight install-state recovery promise, or null if
 * no recovery is running. Consumed by startupCoordinator.triggerUpdateCheck
 * to sequence update checks AFTER native install-result IPC resolves.
 */
export function getInstallRecoveryPromise(): Promise<void> | null {
  return installRecoveryPromise;
}

const MIN_AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function resetLastCheckedTime() {
  lastCheckedTime = 0;
}

// ─── Reset / Startup Recovery ─────────────────────────────────────────────

export function resetAppUpdateState() {
  const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
  const isBusy = ['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE', 'INSTALLING'].includes(
    globalUpdateState.updateState
  );
  if (!isNode && isBusy) {
    return;
  }
  if (
    activeCheckPromise ||
    activeDownloadPromise ||
    activeApplyPromise ||
    UpdatePipelineCoordinator.activeAsyncStage !== 'IDLE'
  ) {
    return;
  }
  transitionToState('IDLE', 'Reset update state');
  try {
    localStorage.removeItem('studio:is_simulation_active');
  } catch (_) {}
  recordCloseEvent('resetAppUpdateState called');
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
}

export function enforceStartupRecovery(): Promise<void> {
  if (startupRecoveryPromise) {
    return startupRecoveryPromise;
  }

  logTimelineEvent('UpdateCore', 'STARTUP_RECOVERY_TRIGGERED');
  logDiagnosticEvent('RECOVERY_STARTED');

  startupRecoveryPromise = (async () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('studio:is_simulation_active');
        localStorage.removeItem('studio:install_in_progress');
      }
    } catch (_) {}

    resetAppUpdateState();
  })();

  return startupRecoveryPromise;
}

// ─── Cache Cleanup ────────────────────────────────────────────────────────

export async function checkAndCleanCache(): Promise<boolean> {
  const ver = globalUpdateState.remoteVersion;
  if (!ver) {
    updateGlobalState({ validApkExists: false });
    return false;
  }

  if (updaterSimulation.forceCachedApk) {
    addJsLog('[Simulation] Forcing valid cached APK check to true');
    updateGlobalState({ validApkExists: true });
    return true;
  }

  const expectedHash = globalUpdateState.apkSha256 ?? undefined;
  const { valid, filePath } = await validateLocalApk(ver, expectedHash);

  updateGlobalState({ validApkExists: valid });

  if (!valid && filePath) {
    await deleteLocalApk(ver);
  }

  return valid;
}

// ─── Check Pipeline ───────────────────────────────────────────────────────

async function executeCheckForUpdateInternal(
  pipelineId: number,
  isManual = false,
  trigger = 'unknown',
  reason = 'unknown'
): Promise<CentralizedUpdateState> {
  const current = globalUpdateState.updateState;

  const isBusy = [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ].includes(current);

  if (isBusy) {
    return globalUpdateState;
  }

  const allowedStates = [
    'IDLE',
    'NO_UPDATE_AVAILABLE',
    'INSTALL_FAILED',
    'INSTALL_CANCELLED',
    'RECOVERY',
  ];
  if (!isManual && !allowedStates.includes(current)) {
    return globalUpdateState;
  }

  if (!isManual) {
    const now = Date.now();
    if (now - lastCheckedTime < MIN_AUTO_CHECK_INTERVAL_MS) {
      return globalUpdateState;
    }
  }

  if (isManual) {
    removeSessionItem('studio:laterUpdateVersion');
    removeSessionItem('studio:autoOpenedUpdateVersion');
  }

  const callId = nextJsCallId();

  let callerInfo = 'Unknown';
  try {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      if (lines.length > 2) {
        callerInfo = lines[2].trim();
      }
    }
  } catch {
    /* ignore */
  }

  logDetailedJsTrace(
    'checkForUpdate',
    'pipeline.ts',
    326,
    `Entering executeCheckForUpdateInternal Call #${callId} for pipeline #${pipelineId}`,
    { prevState: globalUpdateState.updateState, reason: `Trigger: ${trigger} | Reason: ${reason}` }
  );

  verifyAndCleanCaches();

  const startTime = Date.now();
  const currentStatus = globalUpdateState.updateState;
  const isTransient = [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ].includes(currentStatus);

  if (isTransient) {
    const duration = Date.now() - startTime;
    logDetailedJsTrace(
      'checkForUpdate',
      'pipeline.ts',
      584,
      `Exiting checkForUpdate Call #${callId} early (active operation in progress)`,
      { durationMs: duration, prevState: currentStatus, nextState: currentStatus }
    );
    return Promise.resolve(globalUpdateState);
  }

  setActivePipelineContext({ checkId: pipelineId, trigger, pipelineStartTime: startTime });
  if (globalUpdateState.updateState !== 'IDLE') {
    transitionToState('IDLE', 'Resetting to IDLE before starting check');
  }
  transitionToState('INITIALIZING', 'checkForUpdate start');
  try {
    if (updaterSimulation.forceMetadataFailure) {
      addJsLog('Simulation override: Injecting Metadata Fetch Failure');
      throw new Error('[Metadata Failure] Simulated network metadata fetch failure.');
    }

    if (updaterSimulation.forceRecoveryMode) {
      addJsLog('Simulation override: Forcing Recovery Mode');
      updateGlobalState({ consecutiveFailures: 5, recoveryMode: true });
    }

    UpdatePipelineCoordinator.setStage('AWAIT_NATIVE_VERSION_QUERY');
    const natVer = await getNativeVersion();
    const natVerCode = await getNativeVersionCode();
    logTimelineEvent('UpdateCore', 'NATIVE_VERSION_QUERIED', `v${natVer} (Code: ${natVerCode})`);

    if (!safeTransition('INITIALIZING', 'FETCH_REMOTE_METADATA', 'Fetching remote manifest')) {
      const duration = Date.now() - startTime;
      return globalUpdateState;
    }

    UpdatePipelineCoordinator.setStage('AWAIT_FETCH_METADATA');
    const realRemote = await fetchRemoteVersion();
    logTimelineEvent(
      'UpdateCore',
      'MANIFEST_FETCHED',
      realRemote ? `Version: ${realRemote.version} (Code: ${realRemote.versionCode})` : 'Failed'
    );
    checkCancellation(pipelineId, 'AWAIT_METADATA_VALIDATION');

    let remote;
    if (updaterSimulation.forceUpdateAvailable) {
      let targetVersion = '5.0.0';
      if (natVer) {
        const parts = natVer.split('.');
        if (parts.length >= 3) {
          const patch = parseInt(parts[2], 10);
          if (!isNaN(patch)) {
            parts[2] = String(patch + 1);
            targetVersion = parts.join('.');
          }
        }
      }
      const targetCode = (natVerCode ?? 0) + 1;
      remote = {
        version: targetVersion,
        versionCode: targetCode,
        mandatory: updaterSimulation.forceMandatoryUpdate,
        apkUrl:
          realRemote?.apkUrl ||
          'https://github.com/MAGEXE1000/Livex/releases/download/v4.0.16/studio-4.0.16.apk',
        apkSha256:
          realRemote?.apkSha256 ||
          '53d281dcd9f32c58d5035dd7e5424e651c24859b0ec47dded97557ac029bea17',
        changelog: 'Simulated update release notes.',
        releaseNotes: {
          added: ['Simulated Feature A'],
          improved: ['Simulated Performance B'],
          fixed: ['Simulated Bug C'],
        },
      };
      addJsLog(
        `Simulation override: Forcing Update Available (v${targetVersion}, code ${targetCode})`
      );
    } else if (updaterSimulation.forceNoUpdate) {
      remote = {
        version: APP_VERSION,
        versionCode: natVerCode ?? 1,
        mandatory: false,
        apkUrl: '',
        apkSha256: '',
      };
      addJsLog(`Simulation override: Forcing No Update (matching current version ${APP_VERSION})`);
    } else if (updaterSimulation.forceDowngrade) {
      remote = {
        version: '3.7.10',
        versionCode: 10,
        mandatory: false,
        apkUrl:
          realRemote?.apkUrl ||
          'https://github.com/MAGEXE1000/Livex/releases/download/v3.7.54/studio-3.7.54.apk',
        apkSha256:
          realRemote?.apkSha256 ||
          '456b5d19cf42cafb29d14da71885a7601d8fef566ff8f4dd756ed2d196cfe8d3',
      };
      addJsLog(`Simulation override: Forcing Downgrade (v3.7.10)`);
    } else {
      remote = realRemote;
    }

    if (remote) {
      if (updaterSimulation.forceMandatoryUpdate) {
        addJsLog('Simulation override: Forcing Mandatory Update');
        remote.mandatory = true;
      } else if (updaterSimulation.forceOptionalUpdate) {
        addJsLog('Simulation override: Forcing Optional Update');
        remote.mandatory = false;
      }
    }

    const mockResponse = getSessionItem('studio:mockUpdateResponse');
    if (
      mockResponse &&
      !updaterSimulation.forceUpdateAvailable &&
      !updaterSimulation.forceNoUpdate &&
      !updaterSimulation.forceDowngrade
    ) {
      try {
        remote = JSON.parse(mockResponse);
      } catch (e) {}
    }

    if (remote && !validateRemoteMetadata(remote)) {
      console.error(
        '[AppUpdater] Rejecting remote metadata (simulation or fetched/mock) due to validation failure.'
      );
      remote = null;
    }

    const dismissedList = getStoredList('studio:dismissedVersions');
    const laterVersion = getSessionItem('studio:laterUpdateVersion');

    updateDebugLogs.appVersion = APP_VERSION;
    updateDebugLogs.nativeApkVersion = natVer || 'N/A';
    (updateDebugLogs as any).nativeApkVersionCode =
      natVerCode !== null ? natVerCode.toString() : 'N/A';

    updateDebugLogs.UpdaterSetBlocked = false;
    updateDebugLogs.triggerComponent = isManual
      ? 'Developer Options (Manual Check)'
      : 'Auto Poll / System';
    updateDebugLogs.finalPathExecuted = 'N/A';

    if (Capacitor.isNativePlatform()) {
      try {
        const cap = (window as any).Capacitor;
        const isNativePlat =
          cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
        const registry = cap?.Plugins ? Object.keys(cap.Plugins) : [];
        updateDebugLogs.registeredPlugins = JSON.stringify(registry);

        const appInstallerExists = cap ? (cap.isPluginAvailable?.('AppInstaller') ?? false) : false;
        updateDebugLogs.appInstallerAvailable = appInstallerExists;

        if (appInstallerExists) {
          const plugin = cap.Plugins.AppInstaller;
          updateDebugLogs.downloadApkAvailable = typeof plugin?.downloadApk === 'function';
          updateDebugLogs.verifyApkSha256Available =
            typeof plugin?.verifyApkSha256 === 'function' ||
            typeof plugin?.verifySha256 === 'function';
          updateDebugLogs.installApkAvailable = typeof plugin?.installApk === 'function';
          updateDebugLogs.openInstallPermissionSettingsAvailable =
            typeof plugin?.openInstallPermissionSettings === 'function' ||
            typeof plugin?.openUnknownAppSourcesSettings === 'function';

          const methods = {
            downloadApk: updateDebugLogs.downloadApkAvailable,
            verifyApkSha256: updateDebugLogs.verifyApkSha256Available,
            installApk: updateDebugLogs.installApkAvailable,
            openInstallPermissionSettings: updateDebugLogs.openInstallPermissionSettingsAvailable,
          };
          updateDebugLogs.pluginMethodCheck = Object.entries(methods)
            .map(([name, exists]) => `${name}: ${exists ? 'YES' : 'NO'}`)
            .join(', ');
          updateDebugLogs.installerLaunchStatus = `REGISTERED: AppInstaller is present in registry. Methods match.`;
        } else {
          updateDebugLogs.downloadApkAvailable = false;
          updateDebugLogs.verifyApkSha256Available = false;
          updateDebugLogs.installApkAvailable = false;
          updateDebugLogs.openInstallPermissionSettingsAvailable = false;
          updateDebugLogs.pluginMethodCheck = isNativePlat ? 'Plugin not found' : 'N/A (Web)';
          updateDebugLogs.installerLaunchStatus = `MISSING: AppInstaller not registered. Plugins: ${registry.join(', ')}`;
        }
      } catch (e) {}
    }

    checkCancellation(pipelineId, 'AWAIT_METADATA_VALIDATION');
    if (
      !safeTransition(
        'FETCH_REMOTE_METADATA',
        'VALIDATE_METADATA',
        'Validating fetched manifest integrity'
      )
    ) {
      const duration = Date.now() - startTime;
      return globalUpdateState;
    }
    if (!remote) {
      updateDebugLogs.updateDecision = 'metadata_unavailable';
      updateDebugLogs.updateDecisionReason = 'Remote metadata is missing or unreachable.';
      updateGlobalState({
        decisionExplanation: 'Remote metadata is missing or unreachable.',
        updateAvailable: false,
      });
      if (isManual) {
        updateGlobalState({ error: 'Unable to contact the update server.' });
        if (
          !safeTransition(
            'VALIDATE_METADATA',
            'RECOVERY',
            'Manual check failed: no remote metadata',
            'Unable to contact update server'
          )
        ) {
          return globalUpdateState;
        }
      } else {
        updateGlobalState({ error: 'Update check failed: remote metadata unavailable.' });
        if (
          !safeTransition(
            'VALIDATE_METADATA',
            'RECOVERY',
            'Auto-check failed: no remote metadata',
            'Remote metadata unavailable'
          )
        ) {
          return globalUpdateState;
        }
      }
      const duration = Date.now() - startTime;
      return globalUpdateState;
    }

    checkCancellation(pipelineId, 'COMPARE_VERSION');
    if (
      !safeTransition('VALIDATE_METADATA', 'COMPARE_VERSION', 'Comparing version names and codes')
    ) {
      const duration = Date.now() - startTime;
      return globalUpdateState;
    }
    const comp = compareVersions(remote, APP_VERSION, natVerCode ?? undefined);
    logPipelineTrace(
      'executeCheckForUpdateInternal',
      'version comparison',
      {
        remote: remote.version,
        remoteCode: remote.versionCode,
        local: APP_VERSION,
        localCode: natVerCode,
      },
      comp
    );
    const updateAvailable = comp.updateAvailable;
    logTimelineEvent(
      'UpdateCore',
      'VERSION_COMPARISON_COMPLETED',
      `Update available: ${updateAvailable} | Reason: ${comp.explanation}`
    );
    updateDebugLogs.updateDecision = updateAvailable ? 'UPDATE_AVAILABLE' : 'NO_UPDATE_AVAILABLE';
    updateDebugLogs.updateDecisionReason = comp.explanation;
    updateGlobalState({ decisionExplanation: comp.explanation });

    const norm = parseAndNormalizeVersion(remote.version);
    releaseMetadataInspector.finalVersionShownByUi = remote.version;
    releaseMetadataInspector.normalizedVersion = norm;
    releaseMetadataInspector.sourceUsed = Capacitor.isNativePlatform()
      ? 'app-release.json'
      : 'version.json';

    if (updateAvailable) {
      const isDismissed = isUpdateDismissed(remote.version, isManual);
      const isLater = laterVersion === remote.version;

      if (!isManual && (isDismissed || isLater)) {
        logPipelineTrace(
          'executeCheckForUpdateInternal',
          'remoteVersion assignment',
          remote.version,
          remote.version
        );
        logPipelineTrace(
          'executeCheckForUpdateInternal',
          'remoteVersion updates',
          remote.version,
          remote.version
        );
        updateGlobalState({
          remoteVersion: remote.version,
          updateAvailable: false,
          mandatory: remote.mandatory ?? false,
          changelog: remote.changelog ?? null,
          releaseNotes: remote.releaseNotes ?? null,
          apkUrl: remote.apkUrl ?? null,
          apkSha256: remote.apkSha256 ?? null,
          manualApkUrl: remote.manualApkUrl ?? null,
          fallbackApkUrl: remote.fallbackApkUrl ?? null,
        });

        checkCancellation(pipelineId, 'AWAIT_CACHE_CLEANUP');
        await checkAndCleanCache();

        if (!safeTransition('COMPARE_VERSION', 'NO_UPDATE_AVAILABLE', 'User dismissed/later')) {
          return globalUpdateState;
        }
        const duration = Date.now() - startTime;
        return globalUpdateState;
      }

      logPipelineTrace(
        'executeCheckForUpdateInternal',
        'remoteVersion assignment',
        remote.version,
        remote.version
      );
      logPipelineTrace(
        'executeCheckForUpdateInternal',
        'remoteVersion updates',
        remote.version,
        remote.version
      );
      updateGlobalState({
        remoteVersion: remote.version,
        updateAvailable: true,
        mandatory: remote.mandatory ?? false,
        changelog: remote.changelog ?? null,
        releaseNotes: remote.releaseNotes ?? null,
        apkUrl: remote.apkUrl ?? null,
        apkSha256: remote.apkSha256 ?? null,
        manualApkUrl: remote.manualApkUrl ?? null,
        fallbackApkUrl: remote.fallbackApkUrl ?? null,
        apkSizeBytes: remote.apkSizeBytes ?? null,
      });

      checkCancellation(pipelineId, 'AWAIT_CACHE_CLEANUP');
      await checkAndCleanCache();

      if (!safeTransition('COMPARE_VERSION', 'UPDATE_AVAILABLE', 'New update found')) {
        return globalUpdateState;
      }
      void logProgressStage('Update detected', `Version: ${remote.version}`);
    } else {
      updateGlobalState({ remoteVersion: remote.version, updateAvailable: false });
      updateDebugLogs.updateDecision = 'NO_UPDATE_AVAILABLE';
      updateDebugLogs.updateDecisionReason = `Local ${APP_VERSION} >= Remote ${remote.version} (isUpToDate=${comp.isUpToDate}, isDowngrade=${comp.isDowngrade})`;
      if (
        !safeTransition(
          'COMPARE_VERSION',
          'NO_UPDATE_AVAILABLE',
          `App is up to date (local=${APP_VERSION}, remote=${remote.version})`
        )
      ) {
        return globalUpdateState;
      }
    }

    const duration = Date.now() - startTime;
    logDetailedJsTrace(
      'checkForUpdate',
      'pipeline.ts',
      584,
      `Exiting checkForUpdate Call #${callId} successfully`,
      {
        durationMs: duration,
        prevState: 'COMPARE_VERSION',
        nextState: globalUpdateState.updateState,
      }
    );
    return globalUpdateState;
  } catch (err) {
    if (err instanceof PipelineCancelledError) {
      throw err;
    }
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logDetailedJsTrace(
      'checkForUpdate',
      'pipeline.ts',
      589,
      `Exiting checkForUpdate Call #${callId} with error`,
      {
        durationMs: duration,
        prevState: 'INITIALIZING',
        nextState: globalUpdateState.updateState,
        reason: errMsg,
      }
    );
    updateDebugLogs.updateDecision = 'check_failed';
    updateDebugLogs.updateDecisionReason = `Exception during update check: ${errMsg}`;
    updateDebugLogs.lastExceptionStackTrace = errStack ?? null;
    updateGlobalState({
      error: isManual ? 'Unable to contact the update server.' : `Update check failed: ${errMsg}`,
      updateAvailable: false,
    });
    if (globalUpdateState.updateState !== 'IDLE') {
      transitionToState(
        'RECOVERY',
        isManual ? 'Manual check exception' : `Auto-check exception: ${errMsg}`,
        errMsg
      );
    }
    return globalUpdateState;
  } finally {
    lastCheckedTime = Date.now();
    setActivePipelineContext(null);
  }
}

export function checkForUpdate(
  isManual = false,
  trigger = 'unknown',
  reason = 'unknown'
): Promise<CentralizedUpdateState> {
  console.log(
    `[UPDATER-TRACE] checkForUpdate() CALLED at ${performance.now().toFixed(0)}ms, isManual=${isManual}, trigger=${trigger}, reason=${reason}`
  );
  interceptIllegalCall(
    'checkForUpdate',
    `isManual=${isManual}, trigger=${trigger}, reason=${reason}`
  );

  let callerInfo = 'Unknown';
  let stackTrace = 'N/A';
  try {
    const stack = new Error().stack;
    if (stack) {
      stackTrace = stack;
      const lines = stack.split('\n');
      if (lines.length > 2) {
        callerInfo = lines[2].trim();
      }
    }
  } catch {}

  let screen = 'unknown';
  try {
    const navStore = useNavigationStore.getState();
    if (navStore && navStore.history && navStore.history.length > 0) {
      const lastRoute = navStore.history[navStore.history.length - 1];
      screen = lastRoute.page || lastRoute.tab || lastRoute.app || 'unknown';
    }
  } catch (_) {}

  const traceMsg = `Check requested: isManual=${isManual} | Trigger: ${trigger} | Reason: ${reason} | Screen: ${screen} | Caller: ${callerInfo}`;
  logTimelineEvent(
    'UpdateCore',
    'CHECK_REQUESTED',
    `${traceMsg} | Stack: ${stackTrace.slice(0, 300)}`
  );

  if (!isManual) {
    try {
      const autoUpdates = localStorage.getItem('studio:automatic_updates') !== 'false';
      if (!autoUpdates) {
        const msg = 'checkForUpdate() automatic update check disabled by user preferences';
        console.log(`[UPDATER-TRACE] ${msg}`);
        logTimelineEvent(
          'UpdateCore',
          'CHECK_REJECTED_AUTO_DISABLED',
          'Automatic updates are disabled'
        );
        return Promise.resolve(globalUpdateState);
      }
    } catch (_) {}
  }

  const current = globalUpdateState.updateState;
  const isBusy = [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ].includes(current);

  const allowedStates = [
    'IDLE',
    'NO_UPDATE_AVAILABLE',
    'INSTALL_FAILED',
    'INSTALL_CANCELLED',
    'RECOVERY',
  ];
  const isBlocked = isUpdateSessionActive() || !allowedStates.includes(current);

  if (isBlocked) {
    const msg = `checkForUpdate() RETURN blocked automatic check: isUpdateSessionActive=${isUpdateSessionActive()}, currentState=${current}`;
    console.log(`[UPDATER-TRACE] ${msg}`);
    if (!isManual) {
      logTimelineEvent('UpdateCore', 'CHECK_REJECTED_ACTIVE_SESSION', `state: ${current}`);

      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'checkForUpdateRejected',
        caller: callerInfo,
        reason: `Blocked automatic check (update session active, state: ${current}). Trigger: ${trigger}, Reason: ${reason}, Screen: ${screen}`,
        warning: 'CHECK_BLOCKED_ACTIVE_SESSION',
        stack: stackTrace,
      });
      return Promise.resolve(globalUpdateState);
    }
  }

  if (isBusy) {
    const msg = `checkForUpdate() RETURN blocked busy installer state=${current}`;
    console.log(`[UPDATER-TRACE] ${msg}`);
    logTimelineEvent('UpdateCore', 'CHECK_REJECTED_BUSY', `state: ${current}`);

    UpdaterFlightRecorder.record({
      thread: 'js',
      sessionId: null,
      workflowId: null,
      eventType: 'checkForUpdateRejected',
      caller: callerInfo,
      reason: `Blocked check (installer busy in state ${current}). isManual: ${isManual}, Trigger: ${trigger}, Reason: ${reason}, Screen: ${screen}`,
      warning: 'CHECK_BLOCKED_INSTALLER_BUSY',
      stack: stackTrace,
    });
    return Promise.resolve(globalUpdateState);
  }

  UpdaterFlightRecorder.record({
    thread: 'js',
    sessionId: null,
    workflowId: null,
    eventType: 'checkForUpdateAllowed',
    caller: callerInfo,
    reason: `Starting update check. isManual: ${isManual}, Trigger: ${trigger}, Reason: ${reason}, Screen: ${screen}`,
    stack: stackTrace,
  });
  console.log(`[UPDATER-TRACE] checkForUpdate() PROCEEDING to dispatch pipeline`);

  return UpdatePipelineCoordinator.dispatch(isManual, trigger, reason);
}

// ─── Download Pipeline ────────────────────────────────────────────────────

export async function downloadUpdate(trigger?: string): Promise<void> {
  if (isDownloading) {
    return activeDownloadPromise || Promise.resolve();
  }
  isDownloading = true;
  try {
    return await downloadUpdateInternal(trigger);
  } finally {
    isDownloading = false;
  }
}

async function downloadUpdateInternal(trigger?: string): Promise<void> {
  currentSessionStartTime = Date.now();
  if (startupRecoveryPromise) {
    await startupRecoveryPromise;
  }
  const callId = nextJsCallId();
  logDetailedJsTrace(
    'downloadUpdate',
    'pipeline.ts',
    634,
    `Entering downloadUpdate Call #${callId}`,
    { prevState: globalUpdateState.updateState, reason: `Trigger: ${trigger}` }
  );

  if (activeDownloadPromise) {
    logDetailedJsTrace(
      'downloadUpdate',
      'pipeline.ts',
      639,
      `Exiting downloadUpdate Call #${callId} early (activeDownloadPromise running)`,
      { prevState: globalUpdateState.updateState }
    );
    return activeDownloadPromise;
  }

  const ver = globalUpdateState.remoteVersion;
  if (!ver) {
    logDetailedJsTrace(
      'downloadUpdate',
      'pipeline.ts',
      645,
      `Exiting downloadUpdate Call #${callId} early (missing remoteVersion)`,
      { prevState: globalUpdateState.updateState }
    );
    return Promise.resolve();
  }

  const apkUrl = globalUpdateState.updateAvailable ? (globalUpdateState as any).apkUrl : null;
  logPipelineTrace(
    'downloadUpdateInternal',
    'download URL generation',
    { version: ver },
    { apkUrl }
  );
  logDiagnosticEvent('DOWNLOAD_STARTED', { version: ver, url: apkUrl });
  const isDowngrade = globalUpdateState.updateAvailable && compareSemver(ver, APP_VERSION) < 0;

  if (!Capacitor.isNativePlatform() || !isAppInstallerAvailable()) {
    (async () => {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
      } catch (e) {
      } finally {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('upd', Date.now().toString());
          window.location.href = url.toString();
        } catch {
          window.location.reload();
        }
      }
    })();
    void logProgressStage(
      '[INSTRUMENTATION] downloadUpdate EXIT',
      `Call #${callId} resolved (web fallback)`
    );
    return Promise.resolve();
  }

  if (!apkUrl) {
    updateDebugLogs.downloadStatus = 'Error: Missing APK URL';
    transitionToState(
      'INSTALL_FAILED',
      'Missing APK download URL',
      'No APK download URL available'
    );
    void logProgressStage(
      '[INSTRUMENTATION] downloadUpdate EXIT',
      `Call #${callId} rejected (missing apkUrl)`
    );
    return Promise.reject(new Error('No APK download URL available'));
  }

  if (!safeTransition('UPDATE_AVAILABLE', 'FETCH_APK_INFORMATION', 'downloadUpdate start')) {
    return Promise.reject(new Error('Invalid state for downloadUpdate'));
  }
  updateGlobalState({ progress: 0, statusText: 'Preparing update...', error: null });

  activeDownloadPromise = (async () => {
    const downloadedPath = localStorage.getItem('studio:downloadedApkPath');
    if (downloadedPath && !downloadedPath.includes(`studio-update-${ver}.apk`)) {
      localStorage.removeItem('studio:downloadedApkPath');
    }

    const hasValid = await checkAndCleanCache();
    if (hasValid) {
      if (!safeTransition('FETCH_APK_INFORMATION', 'VERIFY_SHA256', 'Valid cached APK exists')) {
        return;
      }
      updateGlobalState({ progress: 1.0, statusText: 'Verifying update...' });
      const filePath = await getLocalApkPath(ver);

      if (
        !safeTransition('VERIFY_SHA256', 'PREPARING_INSTALL', 'Checking cached APK eligibility')
      ) {
        return;
      }
      const isEligible = await runEligibilityCheck(filePath, isDowngrade);
      if (!isEligible) {
        if (updateDebugLogs.eligibilityReason === 'signature_mismatch' && !isRecovering) {
          const recovered = await runSignatureMismatchRecovery(applyUpdate, downloadUpdate);
          if (recovered) return;
        }
        if (globalUpdateState.updateState === 'PREPARING_INSTALL') {
          transitionToState(
            'INSTALL_FAILED',
            `Eligibility check failed: ${updateDebugLogs.eligibilityReason}`
          );
        }
        throw new Error(
          `[Eligibility Check] Validation failed: ${updateDebugLogs.eligibilityReason || 'unknown'}`
        );
      }

      if (
        !safeTransition(
          'PREPARING_INSTALL',
          'WAITING_USER_CONFIRMATION',
          'Valid cached APK verified'
        )
      ) {
        return;
      }
      return;
    }

    if (!safeTransition('FETCH_APK_INFORMATION', 'DOWNLOAD_APK', 'Starting APK package download')) {
      return;
    }
    updateActiveSession({ installStep: 'downloading' });
    updateDebugLogs.downloadStatus = `Update started: apk\nAPK URL: ${apkUrl}`;
    updateGlobalState({ progress: 0.0, statusText: 'Entering progress screen...' });
    logTimelineEvent('UpdateCore', 'DOWNLOAD_STARTED', `Version: ${ver}`);

    try {
      let filePath: string;
      const shouldSimulate = !Capacitor.isNativePlatform() || !isAppInstallerAvailable();
      if (shouldSimulate) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('studio:is_simulation_active', 'true');
          }
        } catch (_) {}
        addJsLog('[Simulate Download] Starting simulated download loop...');
        for (let i = 1; i <= 10; i++) {
          if (updaterSimulation.injectNetworkTimeout) {
            addJsLog('[Simulate Download] Injecting network timeout!');
            if (globalUpdateState.updateState === 'DOWNLOAD_APK') {
              transitionToState('INSTALL_FAILED', 'Simulated network timeout');
            }
            throw new Error('Simulated network timeout');
          }
          if (updaterSimulation.injectDownloadFailure) {
            addJsLog('[Simulate Download] Injecting download failure!');
            if (globalUpdateState.updateState === 'DOWNLOAD_APK') {
              transitionToState('INSTALL_FAILED', 'Simulated download failure');
            }
            throw new Error('Simulated download failure');
          }
          updateGlobalState({
            progress: i / 10,
            statusText: `Simulating download... (${i * 10}%)`,
          });
          await delayForSim(10);
        }
        filePath = '/mock/path/to/simulated_download.apk';
        addJsLog(`[Simulate Download] Completed. Mock Path: ${filePath}`);
      } else {
        try {
          if (updaterSimulation.forceDownloadFailure) {
            addJsLog('Simulation override: Injecting Download Failure');
            throw new Error('[Simulated Download Failure] Failed to download APK from server.');
          }
          if (updaterSimulation.forceDownloadTimeout) {
            addJsLog('Simulation override: Injecting Download Timeout');
            throw new Error('[Simulated Download Timeout] Network connection timed out.');
          }
          if (updaterSimulation.forceResumeDownload) {
            addJsLog('Simulation override: Forcing download resumption mode');
          }
          logDetailedJsTrace(
            'downloadUpdate',
            'pipeline.ts',
            749,
            'Starting APK download from URL: ' + apkUrl
          );
          logPipelineTrace(
            'downloadUpdateInternal',
            'download',
            { url: apkUrl, version: ver },
            'download started'
          );
          filePath = await downloadUpdateApk({
            url: apkUrl,
            version: ver,
            manualApkUrl: (globalUpdateState as any).manualApkUrl,
            fallbackApkUrl: (globalUpdateState as any).fallbackApkUrl,
          });
          logPipelineTrace(
            'downloadUpdateInternal',
            'download',
            { url: apkUrl, version: ver },
            { filePath, status: 'complete' }
          );
          logDetailedJsTrace(
            'downloadUpdate',
            'pipeline.ts',
            755,
            'APK download completed successfully. File path: ' + filePath
          );
        } catch (dlErr) {
          logPipelineTrace(
            'downloadUpdateInternal',
            'download',
            { url: apkUrl, version: ver },
            { error: dlErr instanceof Error ? dlErr.message : String(dlErr) }
          );
          if (globalUpdateState.updateState === 'DOWNLOAD_APK') {
            transitionToState('INSTALL_FAILED', 'APK download execution failed');
          }
          throw dlErr;
        }
      }

      updateDebugLogs.downloadStatus += `\nAPK download completed. Path: ${filePath}`;
      void logProgressStage('Download completed', 'Path: ' + filePath);
      logDiagnosticEvent('DOWNLOAD_FINISHED', { filePath });
      logTimelineEvent('UpdateCore', 'DOWNLOAD_COMPLETED', `Path: ${filePath}`);

      if (!safeTransition('DOWNLOAD_APK', 'VERIFY_SHA256', 'Verifying checksum')) {
        return;
      }
      logTimelineEvent('UpdateCore', 'SHA_VERIFICATION_STARTED');
      logDetailedJsTrace(
        'downloadUpdate',
        'pipeline.ts',
        764,
        'Starting SHA-256 integrity verification. Expected: ' + (globalUpdateState as any).apkSha256
      );
      if (updaterSimulation.forceShaFailure) {
        addJsLog('Simulation override: Injecting SHA checksum failure!');
        if (globalUpdateState.updateState === 'VERIFY_SHA256') {
          transitionToState('INSTALL_FAILED', 'Simulated checksum failure');
        }
        throw new Error('Simulated SHA-256 checksum mismatch');
      }

      if (shouldSimulate) {
        if (updaterSimulation.injectChecksumFailure) {
          addJsLog('[Simulate Download] Injecting checksum failure!');
          if (globalUpdateState.updateState === 'VERIFY_SHA256') {
            transitionToState('INSTALL_FAILED', 'Simulated checksum failure');
          }
          throw new Error('Simulated checksum failure');
        }
        updateDebugLogs.shaVerification = 'PASSED (Simulated)';
        logDiagnosticEvent('APK_VERIFIED', { filePath, simulated: true });
      } else {
        const expectedHash = (globalUpdateState as any).apkSha256;
        logPipelineTrace(
          'downloadUpdateInternal',
          'verification',
          { filePath, expectedHash },
          'SHA-256 verification started'
        );
        if (expectedHash) {
          try {
            await verifyFileIntegrity(filePath, expectedHash);
            logPipelineTrace(
              'downloadUpdateInternal',
              'verification',
              { filePath, expectedHash },
              { verified: true }
            );
            logDetailedJsTrace(
              'downloadUpdate',
              'pipeline.ts',
              783,
              'SHA-256 integrity verification passed'
            );
            logDiagnosticEvent('APK_VERIFIED', { filePath });
          } catch (shaErr) {
            logPipelineTrace(
              'downloadUpdateInternal',
              'verification',
              { filePath, expectedHash },
              { verified: false, error: shaErr instanceof Error ? shaErr.message : String(shaErr) }
            );
            if (globalUpdateState.updateState === 'VERIFY_SHA256') {
              transitionToState('INSTALL_FAILED', 'SHA integrity check failed');
            }
            throw shaErr;
          }
        } else {
          logPipelineTrace(
            'downloadUpdateInternal',
            'verification',
            { filePath },
            { verified: 'skipped (no expected hash)' }
          );
          updateDebugLogs.shaVerification = 'SKIPPED (No expected hash)';
          logDiagnosticEvent('APK_VERIFIED', { filePath, warning: 'SHA skipped' });
        }
      }
      logTimelineEvent('UpdateCore', 'SHA_VERIFICATION_COMPLETED');

      if (shouldSimulate) {
        updateDebugLogs.fileDetails =
          'Size: 24586128 bytes\nURI: file:///mock/path/to/simulated_download.apk';
      } else {
        try {
          const { Filesystem } = await import('@capacitor/filesystem');
          const info = await Filesystem.stat({ path: filePath });
          updateDebugLogs.fileDetails = `Size: ${info.size} bytes\nURI: ${info.uri}`;
        } catch (statErr) {
          updateDebugLogs.fileDetails = `Error reading file stats: ${statErr instanceof Error ? statErr.message : String(statErr)}`;
        }
      }

      updateGlobalState({ progress: 1.0, statusText: 'Verifying update' });
      if (shouldSimulate) {
        await delayForSim(10);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      updateDebugLogs.downloadStatus += `\nRunning pre-install eligibility check...`;
      if (!safeTransition('VERIFY_SHA256', 'PREPARING_INSTALL', 'Checking eligibility')) {
        return;
      }
      updateGlobalState({ statusText: 'Checking eligibility...' });
      logTimelineEvent('UpdateCore', 'ELIGIBILITY_CHECK_STARTED');
      logDetailedJsTrace(
        'downloadUpdate',
        'pipeline.ts',
        806,
        'Starting pre-install eligibility check'
      );

      const isEligible = await (async () => {
        if (updaterSimulation.forceSignatureMismatch) {
          addJsLog('Simulation override: Injecting Signature Mismatch');
          updateDebugLogs.eligibilityReason = 'signature_mismatch';
          return false;
        }
        if (updaterSimulation.forceInvalidApk) {
          addJsLog('Simulation override: Injecting Invalid APK');
          updateDebugLogs.eligibilityReason = 'invalid_apk';
          return false;
        }
        if (shouldSimulate) {
          addJsLog('[Simulate Install] Bypassing native eligibility check in simulation mode.');
          return true;
        }
        logPipelineTrace(
          'downloadUpdateInternal',
          'verification',
          { filePath, isDowngrade },
          'eligibility check started'
        );
        return await runEligibilityCheck(filePath, isDowngrade);
      })();
      logPipelineTrace(
        'downloadUpdateInternal',
        'verification',
        { filePath, isDowngrade },
        { isEligible, reason: updateDebugLogs.eligibilityReason }
      );
      logDetailedJsTrace(
        'downloadUpdate',
        'pipeline.ts',
        820,
        'Pre-install eligibility check completed. Result: ' + isEligible
      );
      logTimelineEvent(
        'UpdateCore',
        'ELIGIBILITY_CHECK_COMPLETED',
        isEligible ? 'Passed' : `Failed: ${updateDebugLogs.eligibilityReason}`
      );

      if (!isEligible) {
        if (updateDebugLogs.eligibilityReason === 'signature_mismatch' && !isRecovering) {
          const recovered = await runSignatureMismatchRecovery(applyUpdate, downloadUpdate);
          if (recovered) return;
        }
        if (globalUpdateState.updateState === 'PREPARING_INSTALL') {
          transitionToState(
            'INSTALL_FAILED',
            `Eligibility check failed: ${updateDebugLogs.eligibilityReason}`
          );
        }
        throw new Error(
          '[Eligibility Check] Validation failed: ' +
            (updateDebugLogs.eligibilityReason || 'unknown')
        );
      }

      void logProgressStage('Eligibility check passed', 'APK is eligible for installation');
      void logProgressStage('Installer prepared', 'Installer prepared and files verified');

      if (
        !safeTransition(
          'PREPARING_INSTALL',
          'WAITING_USER_CONFIRMATION',
          'APK download & verify complete'
        )
      ) {
        return;
      }
      updateGlobalState({ statusText: 'Ready to install' });
      localStorage.setItem('studio:downloadedApkPath', filePath);
      localStorage.setItem('studio:downloadedApkVersion', ver);
      addToStoredList('studio:downloadedVersions', ver);
      updateActiveSession({
        installStep: 'downloaded',
        downloadVerification: 'verified',
        apkPath: filePath,
      });

      logDetailedJsTrace(
        'downloadUpdate',
        'pipeline.ts',
        797,
        `Exiting downloadUpdate Call #${callId} successfully (ready_to_install)`,
        { prevState: 'PREPARING_INSTALL', nextState: globalUpdateState.updateState }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error && err.stack ? err.stack : null;
      logDetailedJsTrace(
        'downloadUpdate',
        'pipeline.ts',
        800,
        `Exiting downloadUpdate Call #${callId} with error`,
        { prevState: globalUpdateState.updateState, reason: errMsg }
      );
      updateDebugLogs.installError = `Download/Verify Exception: ${errMsg}\nStack: ${errStack || ''}`;
      updateDebugLogs.lastExceptionStackTrace = errStack;
      updateDebugLogs.installerLaunchStatus = 'FAILED';
      await populateDiagnostics(err, 'APK download or verification failed');

      if (globalUpdateState.updateState !== 'RECOVERY') {
        transitionToState('INSTALL_FAILED', 'Download/Verify exception', errMsg);
        updateGlobalState({ error: errMsg });
      }
      throw err;
    } finally {
      activeDownloadPromise = null;
      UpdatePipelineCoordinator.setStage('IDLE');
    }
  })();

  return activeDownloadPromise;
}

// ─── Apply Pipeline ───────────────────────────────────────────────────────

export async function applyUpdate(trigger?: string): Promise<void> {
  if (isApplying) {
    return activeApplyPromise || Promise.resolve();
  }
  isApplying = true;
  try {
    return await applyUpdateInternal(trigger);
  } finally {
    isApplying = false;
  }
}

async function applyUpdateInternal(trigger?: string): Promise<void> {
  currentSessionStartTime = Date.now();
  if (startupRecoveryPromise) {
    await startupRecoveryPromise;
  }
  const callId = nextJsCallId();
  logTimelineEvent('UpdateCore', 'INSTALL_REQUESTED', `Trigger: ${trigger}`);
  logDetailedJsTrace('applyUpdate', 'pipeline.ts', 867, `Entering applyUpdate Call #${callId}`, {
    prevState: globalUpdateState.updateState,
    reason: `Trigger: ${trigger}`,
  });

  if (activeApplyPromise) {
    logDetailedJsTrace(
      'applyUpdate',
      'pipeline.ts',
      872,
      `Exiting applyUpdate Call #${callId} early (activeApplyPromise running)`,
      { prevState: globalUpdateState.updateState }
    );
    return activeApplyPromise;
  }

  const remoteVersion = globalUpdateState.remoteVersion;
  if (!remoteVersion) {
    logDetailedJsTrace(
      'applyUpdate',
      'pipeline.ts',
      879,
      `Exiting applyUpdate Call #${callId} early (missing remoteVersion)`,
      { prevState: globalUpdateState.updateState }
    );
    return Promise.resolve();
  }

  logDiagnosticEvent('INSTALL_REQUESTED', { version: remoteVersion });

  if (!Capacitor.isNativePlatform() || !isAppInstallerAvailable()) {
    // Persist installation state and release notes before reload
    transitionToState('INSTALL_SUCCESS', 'Web update applied, reloading application');
    (async () => {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
      } catch (e) {
      } finally {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('upd', Date.now().toString());
          window.location.href = url.toString();
        } catch {
          window.location.reload();
        }
      }
    })();
    void logProgressStage(
      '[INSTRUMENTATION] applyUpdate EXIT',
      `Call #${callId} resolved (web reload completed)`
    );
    return Promise.resolve();
  }

  // Check for Unknown Sources permission on Android before transitioning or calling triggerNativeInstall
  if (Capacitor.isNativePlatform() && isAppInstallerAvailable()) {
    try {
      const { AppInstaller } = await import('../apkDownloader');
      const hasPerm = (await AppInstaller.canRequestPackageInstalls()).value;
      if (!hasPerm) {
        logTimelineEvent(
          'UpdateCore',
          'MISSING_INSTALL_PERMISSION',
          'Redirecting to unknown sources settings'
        );
        updateActiveSession({
          installStep: 'permission_settings',
        });
        updateGlobalState({ statusText: 'Waiting for permission...' });
        await AppInstaller.openUnknownAppSourcesSettings();
        void logProgressStage(
          '[INSTRUMENTATION] applyUpdate EXIT',
          `Call #${callId} exit early (waiting for unknown sources permission)`
        );
        return Promise.resolve();
      }
    } catch (e) {
      console.error('Failed to verify install permission:', e);
    }
  }

  if (globalUpdateState.updateState !== 'WAITING_USER_CONFIRMATION') {
    const err = new Error(
      `Cannot apply update. State is ${globalUpdateState.updateState}, expected 'WAITING_USER_CONFIRMATION'.`
    );
    void logProgressStage(
      '[INSTRUMENTATION] applyUpdate EXIT',
      `Call #${callId} rejected (invalid state)`
    );
    return Promise.reject(err);
  }

  if (
    !safeTransition('WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE', 'applyUpdate start')
  ) {
    const err = new Error(
      `Cannot apply update. Expected WAITING_USER_CONFIRMATION, found ${globalUpdateState.updateState}.`
    );
    void logProgressStage(
      '[INSTRUMENTATION] applyUpdate EXIT',
      `Call #${callId} rejected (invalid state)`
    );
    return Promise.reject(err);
  }
  logActivity('apk_install', `Installing APK system update (v${remoteVersion})`, 'Studio');

  activeApplyPromise = (async () => {
    const nativeListener: any = null;
    try {
      const filePath = localStorage.getItem('studio:downloadedApkPath');
      if (!filePath) {
        throw new Error('No downloaded APK path found.');
      }

      const shouldSimulateInstall = !Capacitor.isNativePlatform() || !isAppInstallerAvailable();

      UpdatePipelineCoordinator.setStage('AWAIT_ELIGIBILITY_VERIFICATION');
      updateGlobalState({ statusText: 'Preparing package...' });

      const isEligible = await (async () => {
        if (shouldSimulateInstall) {
          return true;
        }
        return await runEligibilityCheck(filePath);
      })();
      if (!isEligible) {
        if (updateDebugLogs.eligibilityReason === 'signature_mismatch' && !isRecovering) {
          const recovered = await runSignatureMismatchRecovery(applyUpdate, downloadUpdate);
          if (recovered) return;
        }
        const err = new Error(
          '[Eligibility Check] Validation failed: ' +
            (updateDebugLogs.eligibilityReason || 'unknown')
        );
        throw err;
      }

      const statusPromise = new Promise<void>((resolvePromise, rejectPromise) => {
        activeInstallPromiseResolver = resolvePromise;
        activeInstallPromiseRejecter = rejectPromise;
      });

      updateDebugLogs.installError += `\nAPK is eligible. Launching APK installer intent for file: ${filePath}`;
      updateGlobalState({ statusText: 'Launching PackageInstaller...' });

      if (!Capacitor.isNativePlatform() || !isAppInstallerAvailable()) {
        logPipelineTrace(
          'applyUpdate',
          'pipeline.ts',
          1635,
          'Native installation is only supported on Android device.'
        );
        updateGlobalState({ statusText: 'Native installer unavailable on non-Android platform.' });
        return;
      }

      void logProgressStage('Session committed', 'Handing over to PackageInstaller');
      UpdatePipelineCoordinator.setStage('AWAIT_INSTALLER_LAUNCH');

      updateActiveSession({
        installStep: 'installing',
        nativeInstallerTriggered: true,
      });
      const res = await triggerNativeInstall(filePath);
      updateGlobalState({ statusText: 'Waiting for installer...' });
      logTimelineEvent(
        'UpdateCore',
        'NATIVE_INSTALLER_LAUNCHED',
        'System PackageInstaller intent triggered'
      );
      void logProgressStage(
        'Waiting for Android confirmation',
        'Waiting for system confirmation dialog to overlay'
      );

      updateDebugLogs.installError += `\nAPK installer intent launched successfully!`;
      updateDebugLogs.installerLaunchStatus = 'SUCCESS';
      updateDebugLogs.lastExceptionStackTrace = 'None';
      updateDebugLogs.finalPathExecuted = 'APK installer launched';

      UpdatePipelineCoordinator.setStage('AWAIT_PACKAGE_INSTALLER_CALLBACKS');
      await statusPromise;

      logDetailedJsTrace(
        'applyUpdate',
        'pipeline.ts',
        987,
        `Exiting applyUpdate Call #${callId} successfully (Installer completed)`,
        { prevState: globalUpdateState.updateState }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error && err.stack ? err.stack : null;
      logDetailedJsTrace(
        'applyUpdate',
        'pipeline.ts',
        990,
        `Exiting applyUpdate Call #${callId} with error`,
        { prevState: globalUpdateState.updateState, reason: errMsg }
      );
      updateDebugLogs.installError = `Native Install Exception: ${errMsg}\nStack: ${errStack || ''}`;
      updateDebugLogs.lastExceptionStackTrace = errStack;
      updateDebugLogs.installerLaunchStatus = 'FAILED';
      await populateDiagnostics(err, 'APK installation failed');

      if (globalUpdateState.updateState !== 'RECOVERY') {
        transitionToState('INSTALL_FAILED', 'PackageInstaller exception', errMsg);
        updateGlobalState({ error: errMsg });
      }
      throw err;
    } finally {
      if (nativeListener) {
        try {
          await nativeListener.remove();
        } catch (_) {}
      }
      setSimulateStatusCallback(null);
      activeApplyPromise = null;
      UpdatePipelineCoordinator.setStage('IDLE');
    }
  })();

  return activeApplyPromise;
}

// ─── Recovery check ───────────────────────────────────────────────────────

export async function checkAndRecoverInstallState() {
  const currentState = globalUpdateState.updateState;
  const allowedStates = ['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE', 'INSTALLING'];
  if (!allowedStates.includes(currentState)) {
    return;
  }

  logTimelineEvent('RecoveryManager', 'RECOVERY_CHECK_START', `currentState=${currentState}`);

  // Permission Auto-Resume Check
  if (activeUpdateSession?.installStep === 'permission_settings') {
    try {
      const { AppInstaller } = await import('../apkDownloader');
      const hasPerm = (await AppInstaller.canRequestPackageInstalls()).value;
      if (hasPerm) {
        logTimelineEvent(
          'RecoveryManager',
          'RECOVERY_PERMISSION_GRANTED',
          'Permission granted, resuming install'
        );
        updateActiveSession({
          installStep: 'installing',
          nativeInstallerTriggered: true,
        });
        void applyUpdate('Recovery: Permission auto-resume');
        return;
      }
    } catch (_) {}
    return;
  }

  // Skip getLastInstallResult check if the native installer was never triggered in this session.
  const isInstallerTriggered = activeUpdateSession?.nativeInstallerTriggered === true;
  if (!isInstallerTriggered) {
    logTimelineEvent(
      'RecoveryManager',
      'RECOVERY_CHECK_SKIPPED',
      'Native installer not launched yet for current session'
    );
    return;
  }

  const shouldSimulate = !Capacitor.isNativePlatform() || !isAppInstallerAvailable();
  if (!shouldSimulate) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const stateAfterDelay = globalUpdateState.updateState;
  if (!allowedStates.includes(stateAfterDelay)) {
    logTimelineEvent(
      'RecoveryManager',
      'RECOVERY_ABORTED_STATE_CHANGED',
      `State transitioned during delay to: ${stateAfterDelay}`
    );
    return;
  }

  try {
    const { AppInstaller } = await import('../apkDownloader');
    const check = await AppInstaller.isInstallActive();
    if (check.active) {
      logTimelineEvent(
        'RecoveryManager',
        'RECOVERY_ACTIVE_DETECTED',
        `activeSessionId=${check.sessionId}`
      );
      if (stateAfterDelay !== 'INSTALLING') {
        transitionToState('INSTALLING', 'Active installation confirmed on resume');
      }
      updateGlobalState({ statusText: 'Installing update...' });
      return;
    }

    const result = await AppInstaller.getLastInstallResult();
    if (result.statusCode !== -999) {
      const targetVersion = globalUpdateState.remoteVersion;
      const isStale =
        result.expectedVersionName && targetVersion && result.expectedVersionName !== targetVersion;
      if (isStale) {
        return;
      }
    }

    if (result.statusCode === 0) {
      logTimelineEvent(
        'RecoveryManager',
        'RECOVERY_SUCCESS_DETECTED',
        `Version: ${result.expectedVersionName} | Code: ${result.expectedVersionCode}`
      );
      transitionToState('INSTALL_SUCCESS', 'Native install completed');
      await AppInstaller.clearInstallerLogHistory().catch(() => {});
      if (activeInstallPromiseResolver) {
        activeInstallPromiseResolver();
        activeInstallPromiseResolver = null;
        activeInstallPromiseRejecter = null;
      }
    } else if (result.statusCode === -999) {
      logTimelineEvent(
        'RecoveryManager',
        'RECOVERY_IN_PROGRESS_DETECTED',
        'Session committed natively but not completed yet'
      );
      if (
        currentState === 'WAITING_USER_CONFIRMATION' ||
        currentState === 'PACKAGEINSTALLER_VISIBLE'
      ) {
        transitionToState('INSTALLING', 'Installation started by user confirmation');
      }
      updateGlobalState({ statusText: 'Installing update...' });
      return;
    } else {
      logTimelineEvent(
        'RecoveryManager',
        'RECOVERY_FAILURE_DETECTED',
        `StatusCode: ${result.statusCode} | Msg: ${result.statusMessage}`
      );
      const processed = processLastInstallResult(result);
      const errText = processed?.errMsg || result.statusMessage || 'Installation failed';
      updateGlobalState({ error: errText, statusText: errText });
      transitionToState('INSTALL_FAILED', `Native install failed: ${errText}`);
      await AppInstaller.clearInstallerLogHistory().catch(() => {});
      if (activeInstallPromiseRejecter) {
        activeInstallPromiseRejecter(new Error(errText));
        activeInstallPromiseResolver = null;
        activeInstallPromiseRejecter = null;
      }
    }
  } catch (err) {}
}

// ─── Global Listeners ─────────────────────────────────────────────────────

export function initializeGlobalUpdateListeners() {
  if (typeof window === 'undefined') return;
  const handleInstallStatusChange = (eventData: any) => {
    const { status, message, progress, timestamp } = eventData;
    if (timestamp) {
      const latency = Date.now() - timestamp;
      PerformanceProfiler.getInstance().recordCallbackLatency(latency, true);
    }
    addJsLog(
      `[Global Listener Event] Received status ${status}: ${message} (progress ${progress}%)`
    );

    (window as any).__studioInstallerStatus = String(status);
    logDiagnosticEvent('PACKAGEINSTALLER_CALLBACK', { status, message, progress });

    if (status === -1) {
      logDiagnosticEvent('PACKAGEINSTALLER_OPENED');
    } else if (status === 0) {
      logDiagnosticEvent('INSTALL_SUCCESS');
    } else if (status === 3) {
      logDiagnosticEvent('INSTALL_CANCELLED');
    } else if (status > 0) {
      logDiagnosticEvent('INSTALL_FAILED', { status, message });
    }

    logTimelineEvent(
      'NativeInstaller',
      'NATIVE_CALLBACK_RECEIVED',
      `Status: ${status} | Msg: ${message || 'none'} | Progress: ${progress || 0}`
    );

    const allowedStates = ['WAITING_USER_CONFIRMATION', 'PACKAGEINSTALLER_VISIBLE', 'INSTALLING'];
    if (!allowedStates.includes(globalUpdateState.updateState)) {
      return;
    }

    if (status === -2) {
      logTimelineEvent(
        'NativeInstaller',
        'INSTALL_SESSION_ACTIVE',
        'PackageInstaller session active'
      );
      transitionToState('INSTALLING', 'PackageInstaller session active');
      updateGlobalState({ statusText: 'Installing package...' });
    } else if (status === -3) {
      const progressFraction = typeof progress === 'number' ? progress : 0;
      const now = Date.now();
      let label = 'Installing package...';
      if (progressFraction > 0.5 && progressFraction <= 0.9) {
        label = 'Optimizing application...';
      } else if (progressFraction > 0.9) {
        label = 'Finalizing installation...';
      }

      if (
        now - lastInstallProgressTime >= 100 ||
        progressFraction === 1 ||
        progressFraction === 0
      ) {
        lastInstallProgressTime = now;
        logTimelineEvent(
          'NativeInstaller',
          'INSTALL_PROGRESS',
          `Progress: ${Math.round(progressFraction * 100)}% (${label})`
        );
        updateGlobalState({
          progress: progressFraction,
          statusText: `${label} (${Math.round(progressFraction * 100)}%)`,
        });
      }
      if (globalUpdateState.updateState !== 'INSTALLING') {
        transitionToState('INSTALLING', 'PackageInstaller progress received');
      }
    } else if (status === -1) {
      logTimelineEvent(
        'NativeInstaller',
        'INSTALL_USER_ACTION_REQUIRED',
        'PackageInstaller requires user interaction'
      );
      transitionToState('PACKAGEINSTALLER_VISIBLE', 'PackageInstaller requires user interaction');
      updateGlobalState({ statusText: 'Tap Install to confirm...' });
    } else if (status === 0) {
      logTimelineEvent('NativeInstaller', 'INSTALL_SUCCESS', 'PackageInstaller status SUCCESS');
      transitionToState('INSTALL_SUCCESS', 'PackageInstaller status SUCCESS');
      updateGlobalState({ statusText: 'Install succeeded!' });
      if (activeInstallPromiseResolver) {
        activeInstallPromiseResolver();
        activeInstallPromiseResolver = null;
        activeInstallPromiseRejecter = null;
      }
    } else if (status === 3) {
      logTimelineEvent('NativeInstaller', 'INSTALL_CANCELLED', 'User cancelled installation');
      transitionToState('INSTALL_CANCELLED', 'User cancelled installation');
      if (activeInstallPromiseRejecter) {
        activeInstallPromiseRejecter(new Error('Installation cancelled by user.'));
        activeInstallPromiseResolver = null;
        activeInstallPromiseRejecter = null;
      }
    } else {
      const errMsg = message || `PackageInstaller error code ${status}`;
      logTimelineEvent('NativeInstaller', 'INSTALL_FAILED', errMsg);
      transitionToState('INSTALL_FAILED', `Install failed: ${errMsg}`);
      if (activeInstallPromiseRejecter) {
        activeInstallPromiseRejecter(new Error(errMsg));
        activeInstallPromiseResolver = null;
        activeInstallPromiseRejecter = null;
      }
    }
  };

  if (typeof window !== 'undefined') {
    (window as any).triggerOtaInstallStatus = (eventData: any) => {
      handleInstallStatusChange(eventData);
      if (simulateStatusCallback) {
        try {
          simulateStatusCallback(eventData);
        } catch (_) {}
      }
    };
  }

  if (Capacitor.isNativePlatform() && isAppInstallerAvailable()) {
    void (async () => {
      try {
        await (AppInstaller as any).addListener('onInstallStatusChanged', (eventData: any) => {});
      } catch (e) {}
    })();
  }

  if (Capacitor.isNativePlatform()) {
    import('@capacitor/app')
      .then(async ({ App }) => {
        (window as any).__studioActivityState = 'active';
        await App.addListener('appStateChange', async (state) => {
          const prev = (window as any).__studioActivityState;
          const current = state.isActive ? 'active' : 'background';

          UpdaterFlightRecorder.record({
            thread: 'js',
            sessionId: null,
            workflowId: null,
            eventType: 'appStateChange',
            caller: 'AppLifecycle',
            reason: `App state transitioned from ${prev} to ${current} (isActive: ${state.isActive})`,
          });

          if (prev !== current) {
            (window as any).__studioActivityState = current;
            logDiagnosticEvent(current === 'active' ? 'ACTIVITY_RESUMED' : 'ACTIVITY_PAUSED');
            logTimelineEvent(
              'AppLifecycle',
              current === 'active' ? 'ACTIVITY_RESUMED' : 'ACTIVITY_PAUSED'
            );
          }
          if (state.isActive) {
            // Block all recovery during post-install session
            if (isPostInstallSessionActive()) {
              const info = getPostInstallSessionInfo();
              logTimelineEvent(
                'AppLifecycle',
                'RECOVERY_SKIPPED_POST_INSTALL',
                `storedVersion=${info.storedVersion}, elapsed=${info.elapsed}ms`
              );

              UpdaterFlightRecorder.record({
                thread: 'js',
                sessionId: null,
                workflowId: null,
                eventType: 'appResumeRecoverySkipped',
                caller: 'AppLifecycle',
                reason: `Skipped recovery on resume (post-install session active). storedVersion=${info.storedVersion}`,
              });
              return;
            }
            logTimelineEvent('AppLifecycle', 'RECOVERY_TRIGGERED_ON_RESUME');

            UpdaterFlightRecorder.record({
              thread: 'js',
              sessionId: null,
              workflowId: null,
              eventType: 'appResumeRecoveryTriggered',
              caller: 'AppLifecycle',
              reason: `Triggered install state recovery check on app resume`,
            });

            installRecoveryPromise = checkAndRecoverInstallState();
            try {
              await installRecoveryPromise;
            } finally {
              installRecoveryPromise = null;
            }
          }
        });
      })
      .catch((e) => {});
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      const state = document.visibilityState === 'visible' ? 'VISIBLE' : 'HIDDEN';
      logTimelineEvent(
        'AppLifecycle',
        `VISIBILITY_CHANGE_${state}`,
        `Document visibility state changed to ${state}`
      );

      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'visibilitychange',
        caller: 'DocumentLifecycle',
        reason: `Visibility changed to ${state}`,
      });
    });

    window.addEventListener('focus', () => {
      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'focus',
        caller: 'WindowLifecycle',
        reason: `Window gained focus`,
      });
    });

    window.addEventListener('blur', () => {
      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: null,
        workflowId: null,
        eventType: 'blur',
        caller: 'WindowLifecycle',
        reason: `Window lost focus`,
      });
    });
  }
}

export async function runStartupInstallRecovery(): Promise<void> {
  installRecoveryPromise = checkAndRecoverInstallState();
  try {
    await installRecoveryPromise;
  } finally {
    installRecoveryPromise = null;
  }
}
