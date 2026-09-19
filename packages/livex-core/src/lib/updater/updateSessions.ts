export interface TimelineEvent {
  timestamp: string; // HH:MM:SS
  absoluteTimestamp: number;
  offset: string; // MM:SS.mmm
  offsetMs: number;
  module: string;
  event: string;
  state: string;
  reason: string;
  durationMs?: number;
}

export interface WorkflowTransition {
  timestamp: string;
  absoluteTimestamp: number;
  previousState: string;
  nextState: string;
  caller: string;
  file: string;
  functionName: string;
  reason: string;
  thread: string;
  elapsedTimeMs: number;
  sessionId: string;
  pipelineId: number | null;
  durationMs?: number;
  screen?: string;
  lifecycleState?: string;
  packageInstallerStatus?: string;
  progress?: number;
}

export interface CloseEvent {
  timestamp: string;
  functionName: string;
  file: string;
  caller: string;
  reason: string;
  stackTrace: string;
  currentState: string;
  previousState: string;
  sessionId: string;
}

export interface UpToDateEvent {
  timestamp: string;
  functionName: string;
  file: string;
  caller: string;
  stackTrace: string;
  previousState: string;
  currentState: string;
  sessionId: string;
  reason: string;
  triggerType: 'AUTOMATIC' | 'USER ACTION';
}

export interface UpdateSession {
  id: string;
  sessionNumber: number;
  startTime: string;
  startTimestamp: number;
  endTime: string | null;
  durationMs: number | null;
  result: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'ABORTED' | 'FINISHED';
  version: string | null;
  buildType: string;
  deviceModel: string;
  androidVersion: string;
  timeline: TimelineEvent[];
  transitions: WorkflowTransition[];
  closeEvent: CloseEvent | null;
  upToDateEvent: UpToDateEvent | null;
  stateDurations?: Record<string, number>;
  noUpdateDetails?: any;
}

export const MAX_HISTORY_SIZE = 20;

export let updateSessions: UpdateSession[] = [];
export let activeSessionId: string | null = null;

export function setActiveSessionId(id: string | null) {
  activeSessionId = id;
}

export function setUpdateSessions(sessions: UpdateSession[]) {
  updateSessions = sessions;
}

export function saveSessions() {
  if (updateSessions.length > MAX_HISTORY_SIZE) {
    updateSessions = updateSessions.slice(-MAX_HISTORY_SIZE);
  }
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studio:update_sessions_history', JSON.stringify(updateSessions));
      if (activeSessionId) {
        localStorage.setItem('studio:active_update_session_id', activeSessionId);
      } else {
        localStorage.removeItem('studio:active_update_session_id');
      }
    }
  } catch (_) {}
}

export function getActiveSession(): UpdateSession | undefined {
  return updateSessions.find((s) => s.id === activeSessionId) || updateSessions[updateSessions.length - 1];
}

export function deleteUpdateSession(id: string) {
  updateSessions = updateSessions.filter((s) => s.id !== id);
  if (activeSessionId === id) {
    activeSessionId = null;
  }
  saveSessions();
}

export function deleteAllUpdateSessions() {
  updateSessions = [];
  activeSessionId = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studio:update_sessions_history');
      localStorage.removeItem('studio:active_update_session_id');
    }
  } catch (_) {}
}

export function isAppInstallerAvailable(): boolean {
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function' && !cap.isNativePlatform()) {
    return false;
  }
  const isPluginAvail = cap.isPluginAvailable?.('AppInstaller') ?? false;
  if (!isPluginAvail) return false;
  const plugin = cap.Plugins?.AppInstaller;
  if (!plugin) return false;

  return (
    typeof plugin.downloadApk === 'function' &&
    (typeof plugin.verifyApkSha256 === 'function' || typeof plugin.verifySha256 === 'function') &&
    typeof plugin.installApk === 'function' &&
    (typeof plugin.openInstallPermissionSettings === 'function' ||
      typeof plugin.openUnknownAppSourcesSettings === 'function')
  );
}
