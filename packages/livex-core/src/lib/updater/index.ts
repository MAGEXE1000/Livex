/**
 * updater/index.ts
 *
 * Barrel re-exporting the entire Updater updater public API.
 * Consumers can import from '@workspace/studio-core' or 'lib/updater'
 * without knowing the internal sub-module structure.
 */

// State machine (types + global state)
export {
  globalUpdateState,
  updateGlobalState,
  transitionToState,
  stopWatchdog,
  stateListeners,
  setActivePipelineContext,
  MAX_CONSECUTIVE_FAILURES,
  resetDownloadWatchdog,
  handleWatchdogTimeout,
  activePipelineContext,
  isUpdateSessionActive,
  isInstallationLocked,
  clearInstallationJustCompleted,
  isPostInstallSessionActive,
  endPostInstallSession,
  getPostInstallSessionInfo,
  startUpdateSession,
  activeUpdateSession,
  loadPersistedSession,
  verifyAndCleanCaches,
  updateActiveSession,
  isUpdateDismissed,
} from './stateMachine';
export type {
  AppUpdateState,
  CentralizedUpdateState,
  StructuredReleaseNotes,
  ActiveUpdateSession,
} from './stateMachine';

// Telemetry
export { logDiagnosticEvent, logDetailedJsTrace } from './telemetry';

// Session/Storage helpers
export {
  getStoredList,
  addToStoredList,
  removeFromStoredList,
  getSessionItem,
  setSessionItem,
  removeSessionItem,
  getNativeVersion,
  getNativeVersionCode,
} from './sessionStorage';

// Diagnostics
export {
  updateDebugLogs,
  updateDiagnostics,
  logProgressStage,
  populateDiagnostics,
  nextJsCallId,
  isAppInstallerAvailable,
  runUpdaterHealthCheck,
  getDiagnosticsReport,
  logTimelineEvent,
  interceptIllegalCall,
  startDiagnosticsSession,
  resetUpdateTimeline,
  updateTimeline,
  getTimelineReport,
  recordCloseEvent,
  recordUpToDatePopup,
  installLockTimeline,
  logInstallLockEvent,
  getInstallLockReport,
} from './diagnostics';
export type { HealthStatus, InstallLockEvent } from './diagnostics';

// Release metadata
export {
  fetchRemoteVersion,
  versionJsonUrls,
  validateRemoteMetadata,
  logPipelineTrace,
  extractStructuredReleaseNotes,
} from './releaseMetadata';
export type { RemoteVersionInfo } from './releaseMetadata';

// Version comparison
export { compareVersions } from './versionComparison';

// Download manager
export { downloadUpdateApk, downloadAndInstallGitHubApk } from './downloadManager';

// Integrity verification
export { verifyFileIntegrity } from './integrityVerification';

// Eligibility
export { runEligibilityCheck } from './eligibilityVerification';

// Installer
export { triggerNativeInstall, processLastInstallResult } from './installer';

// Recovery
export { runSignatureMismatchRecovery, isRecovering, setIsRecovering } from './recovery';

// Cache manager
export {
  validateLocalApk,
  deleteLocalApk,
  getLocalApkPath,
  recordDismissal,
  shouldShowRecoveryReminder,
} from './cacheManager';

// Simulation
export {
  updaterSimulation,
  setSimulateStatusCallback,
  simulateStatusCallback,
  addJsLog,
  triggerSimulatedStatus,
  isSimulationActive,
  getTransitionHistory,
  getRejectedTransitions,
} from './updaterSimulation';
// Flight Recorder
export { UpdaterFlightRecorder } from './flightRecorder';
export type { FlightRecorderEvent } from './flightRecorder';

// Version logger
export { releaseMetadataInspector } from './versionLogger';

// Version manager
export { detectJustUpdated, writeLastSeen } from './versionManager';

// PackageInstaller status codes
export { getPackageInstallerStatusName } from './packageInstallerStatus';

// Update history
export { getUpdateHistory, logUpdateTransition } from './updateHistory';
export type { UpdateHistoryEntry } from './updateHistory';

// Install actions
export {
  applyUpdateDirect,
  shareDownloadedApk,
  dismissUpdate,
  markUpdateSeen,
} from './installActions';

// Core pipeline
export {
  PipelineCancelledError,
  UpdatePipelineCoordinatorClass,
  UpdatePipelineCoordinator,
  resetLastCheckedTime,
  resetAppUpdateState,
  enforceStartupRecovery,
  checkAndCleanCache,
  checkForUpdate,
  downloadUpdate,
  cancelDownload,
  applyUpdate,
  initializeGlobalUpdateListeners,
  getInstallRecoveryPromise,
  runStartupInstallRecovery,
} from './pipeline';

// React hooks
