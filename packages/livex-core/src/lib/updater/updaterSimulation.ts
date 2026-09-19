import { UpdaterFlightRecorder } from './flightRecorder';

export interface UpdaterSimulation {
  forceUpdateAvailable: boolean;
  forceNoUpdate: boolean;
  forceDowngrade: boolean;
  forceMandatoryUpdate: boolean;
  forceOptionalUpdate: boolean;

  forceSignatureMismatch: boolean;
  forceShaFailure: boolean;
  forceMetadataFailure: boolean;
  forceInvalidApk: boolean;
  forceDownloadFailure: boolean;
  forceDownloadTimeout: boolean;
  forceRecoveryMode: boolean;
  forceResumeDownload: boolean;
  forceCachedApk: boolean;

  // PackageInstaller Simulations
  forceInstallSuccess: boolean;
  forceInstallFailure: boolean;
  forceUserCancel: boolean;
  forcePendingUserAction: boolean;

  // Legacy compatibility fields
  simulateDownload: boolean;
  injectDownloadFailure: boolean;
  injectChecksumFailure: boolean;
  injectNetworkTimeout: boolean;
  simulateDownloadThrottling: boolean;
  runWorkflowActive: boolean;
}

export const updaterSimulation: UpdaterSimulation = {
  forceUpdateAvailable: false,
  forceNoUpdate: false,
  forceDowngrade: false,
  forceMandatoryUpdate: false,
  forceOptionalUpdate: false,

  forceSignatureMismatch: false,
  forceShaFailure: false,
  forceMetadataFailure: false,
  forceInvalidApk: false,
  forceDownloadFailure: false,
  forceDownloadTimeout: false,
  forceRecoveryMode: false,
  forceResumeDownload: false,
  forceCachedApk: false,

  forceInstallSuccess: false,
  forceInstallFailure: false,
  forceUserCancel: false,
  forcePendingUserAction: false,

  simulateDownload: false,
  injectDownloadFailure: false,
  injectChecksumFailure: false,
  injectNetworkTimeout: false,
  simulateDownloadThrottling: false,
  runWorkflowActive: false,
};

// Logs and timelines stored in memory
export const jsLogs: { timestamp: number; message: string }[] = [];
export const nativeLogs: { timestamp: number; message: string }[] = [];
export const stateTimeline: { state: string; reason: string; timestamp: number }[] = [];
export const transitionHistory: {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
  durationMs: number;
  invalid: boolean;
  caller: string;
  stackTrace: string;
  thread: string;
  // Diagnostic enrichment fields
  checkId: number | null;
  trigger: string | null;
  elapsedMs: number | null;
}[] = [];

export const rejectedTransitions: {
  from: string;
  attempted: string;
  reason: string;
  timestamp: number;
}[] = [];

export function getTransitionHistory() {
  const events =
    typeof UpdaterFlightRecorder !== 'undefined' ? UpdaterFlightRecorder.getEvents() : [];
  const history: any[] = [];
  events.forEach((e) => {
    if (e.eventType === 'transitionToState' || e.eventType === 'fsmTransition') {
      history.push({
        from: e.previousState || 'IDLE',
        to: e.newState || 'IDLE',
        reason: e.reason || 'None',
        timestamp: e.timestamp,
        durationMs: e.duration || 0,
        invalid: e.warning === 'INVALID_TRANSITION',
        caller: e.caller || 'unknown',
        stackTrace: e.stack || '',
        thread: e.thread === 'native' ? 'Native Thread' : 'Main JS Thread',
        checkId: e.workflowId ? Number(e.workflowId) : null,
        trigger: null,
        elapsedMs: null,
      });
    }
  });
  return history;
}

export function getRejectedTransitions() {
  const events =
    typeof UpdaterFlightRecorder !== 'undefined' ? UpdaterFlightRecorder.getEvents() : [];
  const rejected: any[] = [];
  events.forEach((e) => {
    if (e.eventType === 'fsmTransitionRejected') {
      rejected.push({
        from: e.previousState || 'IDLE',
        attempted: e.newState || 'IDLE',
        reason: e.reason || 'None',
        timestamp: e.timestamp,
      });
    }
  });
  return rejected;
}

export const activityLifecycleTimeline: { stage: string; timestamp: number }[] = [];

export function recordActivityLifecycle(stage: string) {
  activityLifecycleTimeline.push({ stage, timestamp: Date.now() });
}

export function addJsLog(msg: string) {
  const now = Date.now();
  jsLogs.push({ timestamp: now, message: msg });
}

export function addNativeLog(msg: string) {
  const now = Date.now();
  nativeLogs.push({ timestamp: now, message: msg });
}

function recordStateTransition(state: string, reason: string) {
  stateTimeline.push({ state, reason, timestamp: Date.now() });
}

export function clearSimulationLogs() {
  jsLogs.length = 0;
  nativeLogs.length = 0;
  stateTimeline.length = 0;
  transitionHistory.length = 0;
  rejectedTransitions.length = 0;
}

export let simulateStatusCallback: ((eventData: any) => void) | null = null;

export function setSimulateStatusCallback(cb: ((eventData: any) => void) | null) {
  simulateStatusCallback = cb;
}

export function triggerSimulatedStatus(status: number, message = '', progress = 0) {
  addJsLog(`Simulating PackageInstaller status: ${status} (${message}) progress: ${progress}`);
  if (simulateStatusCallback) {
    simulateStatusCallback({ status, message, progress, timestamp: Date.now() });
  } else {
    addJsLog('Warning: No active PackageInstaller listener to receive simulated status.');
  }
}

export function isSimulationActive(): boolean {
  return false;
}

export function clearAllSimulationSettings(): void {
  updaterSimulation.forceUpdateAvailable = false;
  updaterSimulation.forceNoUpdate = false;
  updaterSimulation.forceDowngrade = false;
  updaterSimulation.forceMandatoryUpdate = false;
  updaterSimulation.forceOptionalUpdate = false;

  updaterSimulation.forceSignatureMismatch = false;
  updaterSimulation.forceShaFailure = false;
  updaterSimulation.forceMetadataFailure = false;
  updaterSimulation.forceInvalidApk = false;
  updaterSimulation.forceDownloadFailure = false;
  updaterSimulation.forceDownloadTimeout = false;
  updaterSimulation.forceRecoveryMode = false;
  updaterSimulation.forceResumeDownload = false;
  updaterSimulation.forceCachedApk = false;

  updaterSimulation.forceInstallSuccess = false;
  updaterSimulation.forceInstallFailure = false;
  updaterSimulation.forceUserCancel = false;
  updaterSimulation.forcePendingUserAction = false;

  updaterSimulation.simulateDownload = false;
  updaterSimulation.injectDownloadFailure = false;
  updaterSimulation.injectChecksumFailure = false;
  updaterSimulation.injectNetworkTimeout = false;
  updaterSimulation.simulateDownloadThrottling = false;
  updaterSimulation.runWorkflowActive = false;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('studio:is_simulation_active');
    } catch (_) {}
  }
}
