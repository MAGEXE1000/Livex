import { parseSemver, APP_VERSION, compareSemver } from '../appVersion';
import { releaseMetadataInspector } from './versionLogger';
import { UpdaterFlightRecorder } from './flightRecorder';
import { AppUpdateState, CentralizedUpdateState, StructuredReleaseNotes } from './types';

export type { AppUpdateState, CentralizedUpdateState, StructuredReleaseNotes };

export interface ActiveUpdateSession {
  sessionId: string;
  creationTimestamp: number;
  pipelineId: number | null;
  currentState: AppUpdateState;
  previousState: AppUpdateState | null;
  startedBy: string;
  progress: number;
  packageInstallerState: string | null;
  targetVersion: string | null;
  apkUrl: string | null;
  apkSha256: string | null;
  apkSizeBytes?: number | null;
  mandatory: boolean;
  updateType: 'updater' | 'apk' | 'both' | 'none';
  changelog: string | null;
  releaseNotes: string[] | StructuredReleaseNotes | null;
  installStep?:
    | 'idle'
    | 'downloading'
    | 'downloaded'
    | 'permission_settings'
    | 'installing'
    | 'completed'
    | 'failed';
  downloadVerification?: 'pending' | 'verified' | 'failed';
  apkPath?: string | null;
  nativeInstallerTriggered?: boolean;
  recoveryReason?: string | null;
}

export function verifyAndCleanCaches() {
  try {
    if (typeof localStorage === 'undefined') return;
    // 1. Verify session cache
    const sessionStr = localStorage.getItem('studio:active_update_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        const ver = parsed?.targetVersion;
        const sem = ver ? parseSemver(ver) : null;
        if (!sem || ver === 'V' || ver === 'v') {
          localStorage.removeItem('studio:active_update_session');
          releaseMetadataInspector.cacheSource = 'invalidated_session';
        } else if (compareSemver(APP_VERSION, ver) >= 0) {
          localStorage.removeItem('studio:active_update_session');
          localStorage.removeItem('studio:install_in_progress');
          localStorage.removeItem('studio:is_simulation_active');
          releaseMetadataInspector.cacheSource = 'completed_session';
        } else {
          releaseMetadataInspector.cacheSource = 'valid_session';
        }
      } catch (_) {
        localStorage.removeItem('studio:active_update_session');
      }
    }

    // 2. Verify downloaded APK version cache
    const downloadedVer = localStorage.getItem('studio:downloadedApkVersion');
    if (downloadedVer) {
      const sem = parseSemver(downloadedVer);
      if (!sem || downloadedVer === 'V' || downloadedVer === 'v') {
        localStorage.removeItem('studio:downloadedApkVersion');
        localStorage.removeItem('studio:downloadedApkPath');
        releaseMetadataInspector.cacheSource =
          (releaseMetadataInspector.cacheSource || '') + ' | invalidated_apk';
      } else {
        releaseMetadataInspector.cacheSource =
          (releaseMetadataInspector.cacheSource || '') + ' | valid_apk';
      }
    }

    // 3. Verify dismissedVersions cache
    const dismissed = localStorage.getItem('studio:dismissedVersions');
    if (dismissed) {
      try {
        const list = JSON.parse(dismissed);
        if (Array.isArray(list)) {
          const cleanList = list.filter(
            (v) => typeof v === 'string' && parseSemver(v) !== null && v !== 'V' && v !== 'v'
          );
          if (cleanList.length !== list.length) {
            localStorage.setItem('studio:dismissedVersions', JSON.stringify(cleanList));
          }
        } else {
          localStorage.removeItem('studio:dismissedVersions');
        }
      } catch (_) {
        localStorage.removeItem('studio:dismissedVersions');
      }
    }

    // 4. Verify recovery versions
    const lastDismissedRecoveryVer = localStorage.getItem('studio:lastDismissedRecoveryVersion');
    if (
      lastDismissedRecoveryVer &&
      (!parseSemver(lastDismissedRecoveryVer) ||
        lastDismissedRecoveryVer === 'V' ||
        lastDismissedRecoveryVer === 'v')
    ) {
      localStorage.removeItem('studio:lastDismissedRecoveryVersion');
      localStorage.removeItem('studio:lastDismissedRecoveryTimestamp');
    }

    // 5. Verify later version
    const laterUpdateVer = localStorage.getItem('studio:laterUpdateVersion');
    if (
      laterUpdateVer &&
      (!parseSemver(laterUpdateVer) || laterUpdateVer === 'V' || laterUpdateVer === 'v')
    ) {
      localStorage.removeItem('studio:laterUpdateVersion');
    }
  } catch (e) {
    console.error('[Cache Verification] Error validating caches:', e);
  }
}

// Perform initial validation on stateMachine import
verifyAndCleanCaches();

export let activeUpdateSession: ActiveUpdateSession | null = null;

function logStateCheck(message: string) {
  try {
    console.log(`[UPDATER-TRACE] ${performance.now().toFixed(0)}ms ${message}`);
  } catch {
    console.log(`[UPDATER-TRACE] ${Date.now()}ms ${message}`);
  }
}

export function loadPersistedSession(): ActiveUpdateSession | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const sessionStr = localStorage.getItem('studio:active_update_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        const ver = parsed?.targetVersion;
        if (ver && compareSemver(APP_VERSION, ver) >= 0) {
          localStorage.removeItem('studio:active_update_session');
          localStorage.removeItem('studio:install_in_progress');
          activeUpdateSession = null;
          return null;
        }
        activeUpdateSession = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function updateActiveSession(fields: Partial<ActiveUpdateSession>) {
  if (activeUpdateSession) {
    activeUpdateSession = { ...activeUpdateSession, ...fields };
    saveSession();
  }
}

function saveSession() {
  if (activeUpdateSession) {
    try {
      localStorage.setItem('studio:active_update_session', JSON.stringify(activeUpdateSession));
    } catch (_) {}
  }
}

/**
 * Tracks whether an installation just completed successfully.
 * Remains `true` from INSTALL_SUCCESS until the UI explicitly clears it
 * (or a 60-second safety timeout fires), preventing any automatic update
 * check from running and transitioning to "Studio is up to date" before
 * the installation completion screen has been seen by the user.
 */
let installationJustCompleted = false;
let installationJustCompletedTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Marks the installation as just completed. Called automatically when
 * transitioning to INSTALL_SUCCESS. Starts a 60-second safety timeout
 * to auto-clear in case the UI never calls clearInstallationJustCompleted().
 */
function setInstallationJustCompleted() {
  installationJustCompleted = true;
  logStateCheck('installationJustCompleted SET true');
  if (installationJustCompletedTimer) {
    clearTimeout(installationJustCompletedTimer);
  }
  installationJustCompletedTimer = setTimeout(() => {
    installationJustCompleted = false;
    installationJustCompletedTimer = null;
    logStateCheck('installationJustCompleted AUTO-CLEARED after 60000ms');
  }, 60000);
}

/**
 * Clears the post-installation lock. Must be called by the UI when
 * the user dismisses the INSTALL_SUCCESS screen, or when the app
 * restarts into the new version and the changelog screen is shown.
 */
export function clearInstallationJustCompleted() {
  if (installationJustCompleted) {
    logStateCheck('clearInstallationJustCompleted() CALLED');
  }
  installationJustCompleted = false;
  if (installationJustCompletedTimer) {
    clearTimeout(installationJustCompletedTimer);
    installationJustCompletedTimer = null;
  }
}

// ─── Post-Install Session ─────────────────────────────────────────────────
// A lifecycle-synchronized session that stays active after INSTALL_SUCCESS
// until the new version is confirmed running or the user explicitly
// dismisses. This is the authoritative lock that prevents ALL automatic
// update checks, lifecycle triggers, and state resets after APK installation.
//
// DESIGN NOTE: This uses localStorage (persistent) instead of sessionStorage
// (per-process) for cold-start detection. The reason: a successful APK
// install ALWAYS kills the old process and starts a new one. sessionStorage
// would be cleared, making cold-start detection self-defeating. Instead, we
// store the version being installed and check if APP_VERSION matches on the
// next cold start.

const POST_INSTALL_VERSION_KEY = 'studio:postInstallVersion';
const POST_INSTALL_TIMESTAMP_KEY = 'studio:postInstallTimestamp';

let postInstallSessionActive = false;
let postInstallSessionTimestamp: number | null = null;
let postInstallSessionTimer: ReturnType<typeof setTimeout> | null = null;
const POST_INSTALL_SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes safety

// On module load, check if a post-install session should be restored from
// a previous process. This handles the case where the old process set
// the post-install version in localStorage before being killed by Android.
(() => {
  try {
    if (typeof localStorage === 'undefined') return;
    const storedVersion = localStorage.getItem(POST_INSTALL_VERSION_KEY);
    if (!storedVersion) return;

    const storedTimestamp = parseInt(localStorage.getItem(POST_INSTALL_TIMESTAMP_KEY) || '0', 10);
    const elapsed = Date.now() - storedTimestamp;

    // If the stored version matches APP_VERSION, the install succeeded and
    // the new version is now running. Activate the post-install session so
    // the completion screen is shown instead of "Studio is up to date".
    if (storedVersion === APP_VERSION) {
      // Only restore if within the safety timeout window
      if (elapsed < POST_INSTALL_SESSION_TIMEOUT_MS) {
        postInstallSessionActive = true;
        postInstallSessionTimestamp = storedTimestamp;
        postInstallSessionTimer = setTimeout(
          () => {
            postInstallSessionActive = false;
            postInstallSessionTimestamp = null;
            postInstallSessionTimer = null;
            try {
              localStorage.removeItem(POST_INSTALL_VERSION_KEY);
              localStorage.removeItem(POST_INSTALL_TIMESTAMP_KEY);
            } catch (_) {}
          },
          Math.max(0, POST_INSTALL_SESSION_TIMEOUT_MS - elapsed)
        );
      } else {
        localStorage.removeItem(POST_INSTALL_VERSION_KEY);
        localStorage.removeItem(POST_INSTALL_TIMESTAMP_KEY);
      }
    } else {
      // Version mismatch — either install hasn't happened, a different version
      // was installed, or a downgrade occurred. Clear the stale marker.
      localStorage.removeItem(POST_INSTALL_VERSION_KEY);
      localStorage.removeItem(POST_INSTALL_TIMESTAMP_KEY);
    }
  } catch (e) {}
})();

/**
 * Activates the post-install session. Called on INSTALL_SUCCESS.
 * The session blocks ALL automatic update checks until one of:
 * 1. The new version is confirmed running (APP_VERSION matches) and user dismisses
 * 2. The user explicitly calls endPostInstallSession() via Done button
 * 3. A 5-minute safety timeout expires
 */
function activatePostInstallSession() {
  postInstallSessionActive = true;
  postInstallSessionTimestamp = Date.now();
  if (postInstallSessionTimer) clearTimeout(postInstallSessionTimer);
  postInstallSessionTimer = setTimeout(() => {
    postInstallSessionActive = false;
    postInstallSessionTimestamp = null;
    postInstallSessionTimer = null;
    try {
      localStorage.removeItem(POST_INSTALL_VERSION_KEY);
      localStorage.removeItem(POST_INSTALL_TIMESTAMP_KEY);
    } catch (_) {}
  }, POST_INSTALL_SESSION_TIMEOUT_MS);

  // Persist the version being installed so the NEW process can detect it
  // after Android kills this process and relaunches the app.
  try {
    const targetVersion = globalUpdateState.remoteVersion || APP_VERSION;
    localStorage.setItem(POST_INSTALL_VERSION_KEY, targetVersion);
    localStorage.setItem(POST_INSTALL_TIMESTAMP_KEY, String(Date.now()));
  } catch (_) {}
}

/**
 * Returns true if a post-install session is active. Unlike the previous
 * sessionStorage-based approach, this survives process restarts because
 * it uses localStorage for persistence and version matching for detection.
 */
export function isPostInstallSessionActive(): boolean {
  const storedVersion = (() => {
    try {
      return localStorage.getItem(POST_INSTALL_VERSION_KEY);
    } catch (_) {
      return null;
    }
  })();

  if (!postInstallSessionActive) {
    // Check localStorage as fallback in case the in-memory flag was lost
    // (e.g., module re-evaluation in HMR). This is a safety net.
    try {
      if (storedVersion && storedVersion === APP_VERSION) {
        const storedTimestamp = parseInt(
          localStorage.getItem(POST_INSTALL_TIMESTAMP_KEY) || '0',
          10
        );
        const elapsed = Date.now() - storedTimestamp;
        if (elapsed < POST_INSTALL_SESSION_TIMEOUT_MS) {
          postInstallSessionActive = true;
          postInstallSessionTimestamp = storedTimestamp;
          logStateCheck(
            `isPostInstallSessionActive() RETURN true (restored from localStorage, elapsed=${elapsed}ms)`
          );
          return true;
        }
      }
    } catch (_) {}
    logStateCheck(
      `isPostInstallSessionActive() RETURN false (postInstallSessionActive=false, storedVersion=${storedVersion})`
    );
    return false;
  }
  logStateCheck('isPostInstallSessionActive() RETURN true (in-memory active)');
  return true;
}

/**
 * Ends the post-install session. Called explicitly by the user (Done button)
 * or when the completion screen is acknowledged.
 */
export function endPostInstallSession(reason: string) {
  endPostInstallSessionInternal(reason);
}

function endPostInstallSessionInternal(reason: string) {
  if (postInstallSessionActive) {
    const duration = postInstallSessionTimestamp ? Date.now() - postInstallSessionTimestamp : 0;
  }
  postInstallSessionActive = false;
  postInstallSessionTimestamp = null;
  if (postInstallSessionTimer) {
    clearTimeout(postInstallSessionTimer);
    postInstallSessionTimer = null;
  }
  try {
    localStorage.removeItem(POST_INSTALL_VERSION_KEY);
    localStorage.removeItem(POST_INSTALL_TIMESTAMP_KEY);
  } catch (_) {}
}

/** Returns instrumentation data for the post-install session. */
export function getPostInstallSessionInfo(): {
  active: boolean;
  storedVersion: string | null;
  currentVersion: string;
  timestamp: number | null;
  elapsed: number | null;
} {
  let storedVersion: string | null = null;
  try {
    storedVersion = localStorage.getItem(POST_INSTALL_VERSION_KEY);
  } catch (_) {}
  return {
    active: postInstallSessionActive,
    storedVersion,
    currentVersion: APP_VERSION,
    timestamp: postInstallSessionTimestamp,
    elapsed: postInstallSessionTimestamp ? Date.now() - postInstallSessionTimestamp : null,
  };
}

/**
 * Returns true if any form of installation is currently active or
 * just completed and the UI has not yet acknowledged it.
 *
 * This is a superset of isUpdateSessionActive() — it covers:
 * - An in-progress session (download, verify, install stages)
 * - The post-success window where the session has been cleared but
 *   the user has not yet seen the completion screen
 *
 * Use this as the authoritative guard for blocking automatic update
 * checks, StartupCoordinator lifecycle triggers, and startup recovery.
 */
export function isInstallationLocked(): boolean {
  if (activeUpdateSession !== null) {
    logStateCheck('isInstallationLocked() RETURN true (activeUpdateSession !== null)');
    return true;
  }
  if (installationJustCompleted) {
    logStateCheck('isInstallationLocked() RETURN true (installationJustCompleted=true)');
    return true;
  }
  if (isPostInstallSessionActive()) {
    logStateCheck('isInstallationLocked() RETURN true (isPostInstallSessionActive=true)');
    return true;
  }
  const lockedStates: AppUpdateState[] = [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ];
  return lockedStates.includes(globalUpdateState.updateState);
}

export function isUpdateSessionActive(): boolean {
  return isInstallationLocked();
}

export function startUpdateSession(startedBy: string, trigger: string) {
  if (activeUpdateSession) {
    if (startedBy === 'manual' && activeUpdateSession.startedBy.startsWith('automatic')) {
      activeUpdateSession.startedBy = `manual (${trigger})`;
      saveSession();
    }
    return activeUpdateSession;
  }

  let sId = 'session_' + Date.now();
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    sId += '_' + crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    sId += '_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    sId += '_' + Math.random().toString(36).substring(2, 11);
  }
  activeUpdateSession = {
    sessionId: sId,
    creationTimestamp: Date.now(),
    pipelineId: activePipelineContext?.checkId ?? null,
    currentState: 'INITIALIZING',
    previousState: null,
    startedBy: `${startedBy} (${trigger})`,
    progress: 0,
    packageInstallerState: null,
    targetVersion: globalUpdateState.remoteVersion,
    apkUrl: globalUpdateState.apkUrl,
    apkSha256: globalUpdateState.apkSha256,
    apkSizeBytes: globalUpdateState.apkSizeBytes,
    mandatory: globalUpdateState.mandatory,
    updateType: globalUpdateState.updateType,
    changelog: globalUpdateState.changelog,
    releaseNotes: globalUpdateState.releaseNotes,
  };

  saveSession();
  return activeUpdateSession;
}

const getInitialState = (): AppUpdateState => {
  try {
    if (typeof localStorage !== 'undefined') {
      const session = loadPersistedSession();
      if (session) {
        return session.currentState;
      }
    }
  } catch (_) {}
  return 'IDLE';
};

const getInitialRemoteVersion = (): string | null => {
  try {
    if (typeof localStorage !== 'undefined') {
      const session = loadPersistedSession();
      if (session) {
        return session.targetVersion;
      }
      return localStorage.getItem('studio:downloadedApkVersion');
    }
  } catch (_) {}
  return null;
};

const initialUpdateState = getInitialState();

const savedSession = loadPersistedSession();

export let globalUpdateState: CentralizedUpdateState = {
  updateState: initialUpdateState,
  loading: false,
  progress: savedSession ? savedSession.progress : 0,
  error: null,
  statusText: initialUpdateState === 'INSTALLING' ? 'Installing update...' : null,
  remoteVersion: getInitialRemoteVersion(),
  updateAvailable: savedSession !== null,
  mandatory: savedSession ? savedSession.mandatory : false,
  changelog: savedSession ? savedSession.changelog : null,
  releaseNotes: savedSession ? savedSession.releaseNotes : null,
  packageName: null,
  apkUrl: savedSession ? savedSession.apkUrl : null,
  apkSha256: savedSession ? savedSession.apkSha256 : null,
  apkSizeBytes: savedSession ? (savedSession.apkSizeBytes ?? null) : null,
  downloadedBytes: null,
  totalBytes: null,
  manualApkUrl: null,
  fallbackApkUrl: null,
  downloadUrl: null,
  decisionExplanation: null,
  consecutiveFailures: 0,
  activeFallback: null,
  recoveryMode: false,
  updateType: savedSession ? savedSession.updateType : 'none',
  reinstallRequired: false,
  requiredVersionCode: 0,
  apkUpdateRequired: false,
  validApkExists: savedSession !== null,
  sessionId: null,
  isModalOpen: false,
};

export const stateListeners = new Set<(state: CentralizedUpdateState) => void>();

export function openUpdateModal() {
  updateGlobalState({ isModalOpen: true });
}

export function closeUpdateModal() {
  updateGlobalState({ isModalOpen: false });
}

/**
 * Maximum consecutive recovery failures before the updater gives up
 * and transitions to IDLE instead of RECOVERY.
 */
export const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Update non-state fields of the global Updater state.
 *
 * IMPORTANT: This function intentionally strips `updateState` from the patch.
 * All state transitions MUST go through `transitionToState()` to ensure
 * transition validation, watchdog management, and history recording.
 */
export function updateGlobalState(patch: Partial<CentralizedUpdateState>) {
  if (patch.progress !== undefined && globalUpdateState.updateState === 'DOWNLOAD_APK') {
    const prevPct = Math.round(globalUpdateState.progress * 20);
    const currPct = Math.round(patch.progress * 20);
    if (prevPct !== currPct) {
      if (typeof (window as any).logDiagnosticEvent === 'function') {
        (window as any).logDiagnosticEvent('DOWNLOAD_PROGRESS', { progress: patch.progress });
      }
      UpdaterFlightRecorder.record({
        thread: 'js',
        sessionId: activeUpdateSession ? activeUpdateSession.sessionId : null,
        workflowId: activePipelineContext ? String(activePipelineContext.checkId) : null,
        eventType: 'downloadProgress',
        caller: 'updateGlobalState',
        reason: `Download progress: ${Math.round(patch.progress * 100)}%`,
      });
    }
  }

  // Strip updateState — only transitionToState may change it
  if ('updateState' in patch) {
    const { updateState: _stripped, ...safePatch } = patch;
    if (Object.keys(safePatch).length === 0) return;
    globalUpdateState = { ...globalUpdateState, ...safePatch };
  } else {
    globalUpdateState = { ...globalUpdateState, ...patch };
  }
  stateListeners.forEach((l) => l(globalUpdateState));
}

let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

export function stopWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

export const transitionListeners = new Set<(from: string, to: string, reason: string) => void>();

/**
 * Transition lock prevents recursive or concurrent transitions.
 * While a transition is being committed, no other transition can start.
 */
let transitionLock = false;

/**
 * Active pipeline context — set by the orchestration layer to enrich
 * transition history with diagnostic metadata.
 */
export let activePipelineContext: {
  checkId: number;
  trigger: string;
  pipelineStartTime: number;
} | null = null;

export function setActivePipelineContext(ctx: typeof activePipelineContext) {
  activePipelineContext = ctx;
}

function recordRejectedTransition(from: string, attempted: string, reason: string) {
  const now = Date.now();

  UpdaterFlightRecorder.record({
    thread: 'js',
    sessionId: activeUpdateSession ? activeUpdateSession.sessionId : null,
    workflowId: activePipelineContext ? String(activePipelineContext.checkId) : null,
    eventType: 'fsmTransitionRejected',
    caller: 'transitionToState',
    category: 'STATE',
    previousState: from,
    newState: attempted,
    reason: reason,
    warning: 'REJECTED_TRANSITION',
    details: `Transition from ${from} to ${attempted} was rejected. Reason: ${reason}`,
  });
}

export function transitionToState(state: AppUpdateState, reason: string, failureReason?: string) {
  console.log(
    `[UPDATER-TRACE] transitionToState() CALLED at ${performance.now().toFixed(0)}ms, state=${state}, reason=${reason}, failureReason=${failureReason || 'none'}`
  );
  // Never allow transitioning to INSTALL_FAILED from IDLE or INSTALL_SUCCESS
  if (state === 'INSTALL_FAILED') {
    const current = globalUpdateState.updateState;
    if (current === 'IDLE' || current === 'INSTALL_SUCCESS') {
      console.log(
        `[UPDATER-TRACE] transitionToState() RETURN blocked invalid INSTALL_FAILED from ${current}`
      );
      return;
    }
  }

  // Prevent recursive transitions
  if (transitionLock) {
    console.log(`[UPDATER-TRACE] transitionToState() RETURN blocked recursive transition`);
    recordRejectedTransition(globalUpdateState.updateState, state, `RECURSIVE_BLOCKED: ${reason}`);
    return;
  }

  transitionLock = true;
  try {
    commitTransition(state, reason, failureReason);
  } finally {
    transitionLock = false;
  }
}

function commitTransition(state: AppUpdateState, reason: string, failureReason?: string) {
  const current = globalUpdateState.updateState;

  UpdaterFlightRecorder.record({
    eventType: 'fsmTransition',
    caller: 'commitTransition',
    thread: 'js',
    sessionId: activeUpdateSession ? activeUpdateSession.sessionId : null,
    workflowId: activePipelineContext ? String(activePipelineContext.checkId) : null,
    category: 'STATE',
    previousState: current,
    newState: state,
    reason: reason,
    details: JSON.stringify({ reason, failureReason }),
  });

  transitionListeners.forEach((l) => l(current, state, reason));
  stopWatchdog();

  const now = Date.now();
  let isValid = false;

  // Strict transition validation matrix
  if (current === state) {
    isValid = true; // self-transitions allowed for progress/status updates
  } else if (state === 'IDLE' || state === 'RECOVERY') {
    isValid = true; // safe resets always allowed from any state
  } else {
    switch (current) {
      case 'IDLE':
        isValid = state === 'INITIALIZING';
        break;
      case 'INITIALIZING':
        isValid = ['FETCH_REMOTE_METADATA', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'FETCH_REMOTE_METADATA':
        isValid = ['VALIDATE_METADATA', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'VALIDATE_METADATA':
        isValid = ['COMPARE_VERSION', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'COMPARE_VERSION':
        isValid = ['NO_UPDATE_AVAILABLE', 'UPDATE_AVAILABLE', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'NO_UPDATE_AVAILABLE':
        isValid = ['IDLE', 'INITIALIZING'].includes(state);
        break;
      case 'UPDATE_AVAILABLE':
        isValid = ['FETCH_APK_INFORMATION', 'DOWNLOAD_APK', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'FETCH_APK_INFORMATION':
        isValid = [
          'DOWNLOAD_APK',
          'VERIFY_SHA256',
          'PREPARING_INSTALL',
          'RECOVERY',
          'IDLE',
        ].includes(state);
        break;
      case 'DOWNLOAD_APK':
        isValid = ['VERIFY_SHA256', 'INSTALL_FAILED', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'VERIFY_SHA256':
        isValid = ['PREPARING_INSTALL', 'INSTALL_FAILED', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'PREPARING_INSTALL':
        isValid = ['WAITING_USER_CONFIRMATION', 'INSTALL_FAILED', 'RECOVERY', 'IDLE'].includes(
          state
        );
        break;
      case 'WAITING_USER_CONFIRMATION':
        isValid = ['PACKAGEINSTALLER_VISIBLE', 'INSTALL_FAILED', 'RECOVERY', 'IDLE'].includes(
          state
        );
        break;
      case 'PACKAGEINSTALLER_VISIBLE':
        isValid = [
          'INSTALLING',
          'INSTALL_CANCELLED',
          'INSTALL_FAILED',
          'RECOVERY',
          'IDLE',
        ].includes(state);
        break;
      case 'INSTALLING':
        isValid = ['INSTALL_SUCCESS', 'INSTALL_FAILED', 'RECOVERY', 'IDLE'].includes(state);
        break;
      case 'INSTALL_CANCELLED':
        isValid = ['RECOVERY', 'IDLE'].includes(state);
        break;
      case 'INSTALL_SUCCESS':
        isValid = ['IDLE', 'INITIALIZING'].includes(state);
        break;
      case 'INSTALL_FAILED':
        isValid = ['RECOVERY', 'IDLE'].includes(state);
        break;
      case 'RECOVERY':
        isValid = [
          'INITIALIZING',
          'FETCH_REMOTE_METADATA',
          'DOWNLOAD_APK',
          'WAITING_USER_CONFIRMATION',
          'IDLE',
        ].includes(state);
        break;
      default:
        isValid = false;
    }
  }

  const downloadInstallStates = [
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
  ];
  const checkInitStates = [
    'INITIALIZING',
    'CHECKING',
    'FETCH_REMOTE_METADATA',
    'VALIDATE_METADATA',
    'COMPARE_VERSION',
    'UPDATE_AVAILABLE',
    'NO_UPDATE_AVAILABLE',
  ];

  // ==================================================
  // FSM HARD GUARANTEE
  // ==================================================
  // While an installation session is active, NO transition may move the FSM to
  // IDLE, NO_UPDATE_AVAILABLE, or UPDATE_AVAILABLE unless explicitly closed.
  const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
  if (
    (downloadInstallStates.includes(current) || isPostInstallSessionActive()) &&
    !isNode &&
    reason !== 'Reset update state' &&
    reason !== 'Maximum recovery attempts reached'
  ) {
    if (state === 'IDLE' || state === 'NO_UPDATE_AVAILABLE' || state === 'UPDATE_AVAILABLE') {
      console.error(
        `[HIGH SEVERITY UPDATE STATE BLOCK] FSM Hard Guarantee Violation: Blocked attempt to transition from ${current} to ${state} while an installation session is active. Reason: ${reason}`
      );
      recordRejectedTransition(current, state, `FSM_HARD_GUARANTEE_VIOLATION: ${reason}`);
      state = current;
      isValid = true; // We intercepted it; treat the preservation of current state as the final resolution
    }
  }

  if (!isValid) {
    console.error(
      `[HIGH SEVERITY UPDATE STATE BLOCK] Invalid transition blocked: ${current} -> ${state} (Reason: ${reason}). Keeping current state.`
    );
    recordRejectedTransition(current, state, `INVALID_TRANSITION_BLOCKED: ${reason}`);
    // DESTRUCTIVE FALLBACK REMOVED.
    // Invalid transitions must NEVER destroy active session state.
    state = current;
  }

  let caller = 'Unknown';
  let stackTrace = 'N/A';
  try {
    const stack = new Error().stack;
    if (stack) {
      stackTrace = stack;
      const lines = stack.split('\n');
      if (lines.length > 2) {
        caller = lines[2].trim();
      }
    }
  } catch {
    /* ignore */
  }
  // Calculate duration of previous state

  const isUnexpectedResetToIdle =
    state === 'IDLE' &&
    [
      'FETCH_APK_INFORMATION',
      'DOWNLOAD_APK',
      'VERIFY_SHA256',
      'PREPARING_INSTALL',
      'WAITING_USER_CONFIRMATION',
      'PACKAGEINSTALLER_VISIBLE',
      'INSTALLING',
    ].includes(current);

  const durationVal = 0;

  UpdaterFlightRecorder.record({
    thread: 'js',
    sessionId: activeUpdateSession ? activeUpdateSession.sessionId : null,
    workflowId: activePipelineContext ? String(activePipelineContext.checkId) : null,
    eventType: 'transitionToState',
    caller: caller,
    previousState: current,
    newState: state,
    reason: reason + (isUnexpectedResetToIdle ? ' [UNEXPECTED_RESET_TO_IDLE]' : ''),
    duration: durationVal,
    warning:
      isUnexpectedResetToIdle || !isValid
        ? isUnexpectedResetToIdle
          ? 'UNEXPECTED_RESET_TO_IDLE'
          : 'INVALID_TRANSITION'
        : null,
    error: failureReason || null,
    stack: stackTrace,
    details: `Transition from ${current} to ${state}. isUnexpectedResetToIdle=${isUnexpectedResetToIdle}, isValid=${isValid}`,
  });

  // Setup watchdog timers for transient states
  if (
    state === 'INITIALIZING' ||
    state === 'FETCH_REMOTE_METADATA' ||
    state === 'VALIDATE_METADATA'
  ) {
    watchdogTimer = setTimeout(() => {
      if (globalUpdateState.updateState === state) {
        handleWatchdogTimeout(`App Update initialization/fetch timed out (15s) at state ${state}.`);
      }
    }, 15000);
  } else if (state === 'DOWNLOAD_APK') {
    resetDownloadWatchdog();
  } else if (['VERIFY_SHA256', 'PREPARING_INSTALL'].includes(state)) {
    watchdogTimer = setTimeout(() => {
      if (globalUpdateState.updateState === state) {
        handleWatchdogTimeout(`Update package verification timed out (20s) at state ${state}.`);
      }
    }, 20000);
  } else if (state === 'WAITING_USER_CONFIRMATION') {
    // P4: 5-minute watchdog for user confirmation screen.
    // If the user never taps Update/Install, recover after 5 minutes.
    watchdogTimer = setTimeout(
      () => {
        if (globalUpdateState.updateState === 'WAITING_USER_CONFIRMATION') {
          handleWatchdogTimeout('User did not confirm update within 5 minutes.');
        }
      },
      5 * 60 * 1000
    );
  } else if (state === 'PACKAGEINSTALLER_VISIBLE') {
    // P4: 3-minute watchdog for native PackageInstaller dialog.
    // Checks native state before timing out to prevent false positives.
    watchdogTimer = setTimeout(
      async () => {
        if (globalUpdateState.updateState === 'PACKAGEINSTALLER_VISIBLE') {
          try {
            const { AppInstaller } = await import('../apkDownloader');
            const check = await AppInstaller.isInstallActive();
            if (check.active) {
              watchdogTimer = setTimeout(
                () => {
                  if (globalUpdateState.updateState === 'PACKAGEINSTALLER_VISIBLE') {
                    handleWatchdogTimeout('PackageInstaller dialog timed out (5min total).');
                  }
                },
                2 * 60 * 1000
              );
              return;
            }
            // Not active — check if there's already a result
            const result = await AppInstaller.getLastInstallResult();
            if (result.statusCode === 0) {
              transitionToState('INSTALL_SUCCESS', 'Watchdog detected install success');
              return;
            } else if (result.statusCode > 0) {
              transitionToState(
                'INSTALL_FAILED',
                `Watchdog detected install failure: ${result.statusMessage || result.statusCode}`
              );
              return;
            }
          } catch (err) {}
          handleWatchdogTimeout('PackageInstaller dialog confirmation timed out (3min).');
        }
      },
      3 * 60 * 1000
    );
  } else if (state === 'INSTALLING') {
    watchdogTimer = setTimeout(async () => {
      if (globalUpdateState.updateState === 'INSTALLING') {
        try {
          const { AppInstaller } = await import('../apkDownloader');
          const check = await AppInstaller.isInstallActive();
          if (check.active) {
            watchdogTimer = setTimeout(() => {
              if (globalUpdateState.updateState === 'INSTALLING') {
                handleWatchdogTimeout(
                  'PackageInstaller installation confirmation timed out (120s).'
                );
              }
            }, 120000);
            return;
          }
        } catch (err) {}
        handleWatchdogTimeout('PackageInstaller installation confirmation timed out (120s).');
      }
    }, 120000);
  }

  // Update active session details
  const activeFlowStates = [
    'UPDATE_AVAILABLE',
    'FETCH_APK_INFORMATION',
    'DOWNLOAD_APK',
    'VERIFY_SHA256',
    'PREPARING_INSTALL',
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
  ];
  if (!activeUpdateSession && activeFlowStates.includes(state)) {
    startUpdateSession('automatic', `FSM Transition to ${state}`);
  }

  if (activeUpdateSession) {
    activeUpdateSession.previousState = current;
    activeUpdateSession.currentState = state;
    if (
      ['INSTALL_SUCCESS', 'INSTALL_FAILED', 'INSTALL_CANCELLED', 'RECOVERY', 'IDLE'].includes(state)
    ) {
      activeUpdateSession = null;
      try {
        localStorage.removeItem('studio:active_update_session');
      } catch (_) {}
    } else {
      console.log(
        `[UPDATER-TRACE] transitionToState() COMMITTED ${current} -> ${state} (reason=${reason})`
      );
      saveSession();
    }
  }

  // Set the post-install lock when transitioning to INSTALL_SUCCESS.
  // This prevents automatic update checks from firing and showing
  // "Studio is up to date" before the completion screen is acknowledged.
  if (state === 'INSTALL_SUCCESS') {
    setInstallationJustCompleted();
    activatePostInstallSession(); // Persists target version to localStorage for cold-start detection
    try {
      if (globalUpdateState.releaseNotes) {
        localStorage.setItem(
          'studio:last_installed_release_notes',
          JSON.stringify(globalUpdateState.releaseNotes)
        );
      } else if (globalUpdateState.changelog) {
        localStorage.setItem(
          'studio:last_installed_release_notes',
          JSON.stringify(globalUpdateState.changelog)
        );
      }
    } catch (_) {}
  }

  // Clear the post-install lock when transitioning to terminal/reset states
  // that are NOT INSTALL_SUCCESS (failures, cancellations, or IDLE resets).
  // IMPORTANT: When transitioning INSTALL_SUCCESS → IDLE, we intentionally
  // KEEP the installationJustCompleted flag. On Android, the old app process
  // may still be alive after APK installation — the flag prevents automatic
  // checkForUpdate from running in this zombie window and showing
  // "Studio is up to date" prematurely. The flag auto-clears via its
  // 60-second safety timer, or on the next cold start.
  if (['INSTALL_FAILED', 'INSTALL_CANCELLED'].includes(state)) {
    clearInstallationJustCompleted();
  } else if (state === 'IDLE' && current !== 'INSTALL_SUCCESS') {
    clearInstallationJustCompleted();
  }

  // Apply the state change — this is the ONLY place updateState is written
  globalUpdateState = {
    ...globalUpdateState,
    updateState: state,
    loading: [
      'INITIALIZING',
      'FETCH_REMOTE_METADATA',
      'VALIDATE_METADATA',
      'COMPARE_VERSION',
      'FETCH_APK_INFORMATION',
      'DOWNLOAD_APK',
      'VERIFY_SHA256',
      'PREPARING_INSTALL',
      'INSTALLING',
    ].includes(state),
    error: ['INSTALL_FAILED', 'RECOVERY'].includes(state)
      ? failureReason || globalUpdateState.error
      : state === 'IDLE'
        ? failureReason || null
        : failureReason || globalUpdateState.error,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const isActive = [
        'DOWNLOAD_APK',
        'VERIFY_SHA256',
        'PREPARING_INSTALL',
        'WAITING_USER_CONFIRMATION',
        'PACKAGEINSTALLER_VISIBLE',
        'INSTALLING',
      ].includes(state);
      if (isActive) {
        localStorage.setItem('studio:install_in_progress', 'true');
      } else if (
        ['INSTALL_SUCCESS', 'INSTALL_FAILED', 'INSTALL_CANCELLED', 'RECOVERY', 'IDLE'].includes(
          state
        )
      ) {
        localStorage.removeItem('studio:install_in_progress');
      }
    }
  } catch (_) {}

  stateListeners.forEach((l) => l(globalUpdateState));
}

export function resetDownloadWatchdog() {
  stopWatchdog();
  if (globalUpdateState.updateState === 'DOWNLOAD_APK') {
    watchdogTimer = setTimeout(() => {
      if (globalUpdateState.updateState === 'DOWNLOAD_APK') {
        handleWatchdogTimeout('Download stalled. No progress received for 30 seconds.');
      }
    }, 30000);
  }
}

export function handleWatchdogTimeout(errorMsg: string) {
  stopWatchdog();

  const newFailureCount = globalUpdateState.consecutiveFailures + 1;

  // Bound recovery loops: after MAX_CONSECUTIVE_FAILURES, stop retrying
  if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
    updateGlobalState({
      error: `${errorMsg} Maximum recovery attempts (${MAX_CONSECUTIVE_FAILURES}) reached.`,
      consecutiveFailures: newFailureCount,
      recoveryMode: false,
    });
    transitionToState('IDLE', 'Maximum recovery attempts reached', errorMsg);
    return;
  }

  updateGlobalState({
    error: errorMsg,
    consecutiveFailures: newFailureCount,
    recoveryMode: true,
  });
  transitionToState('RECOVERY', 'Watchdog timeout', errorMsg);
}

export function isUpdateDismissed(version: string, isManual = false): boolean {
  if (isManual) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const dismissedListStr = localStorage.getItem('studio:dismissedVersions');
    if (!dismissedListStr) return false;
    const dismissedList = JSON.parse(dismissedListStr);
    if (!Array.isArray(dismissedList) || !dismissedList.includes(version)) {
      return false;
    }

    // Checked if version is dismissed, check exponential timeout
    const storedVer = localStorage.getItem('studio:dismissed_update_version');
    if (storedVer === version) {
      const countStr = localStorage.getItem('studio:dismissed_update_count');
      const count = countStr ? parseInt(countStr, 10) : 1;
      const timestampStr = localStorage.getItem('studio:dismissed_update_timestamp');
      const timestamp = timestampStr ? parseInt(timestampStr, 10) : 0;
      const elapsed = Date.now() - timestamp;

      let interval = 0;
      if (count === 1) {
        interval = 15 * 60 * 1000; // 15 min
      } else if (count === 2) {
        interval = 2 * 60 * 60 * 1000; // 2 hours
      } else {
        interval = 24 * 60 * 60 * 1000; // 24 hours
      }

      return elapsed < interval;
    }
    return false;
  } catch (_) {
    return false;
  }
}

import { registerStateMachineAccessors } from './stateMachineAccessors';
registerStateMachineAccessors({
  getGlobalUpdateState: () => globalUpdateState,
  getActivePipelineContext: () => activePipelineContext,
  getActiveUpdateSession: () => activeUpdateSession,
  getTransitionListeners: () => transitionListeners,
  startUpdateSession: (triggerType, reason) => startUpdateSession(triggerType, reason),
});
