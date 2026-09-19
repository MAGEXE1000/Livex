import { isAppInstallerAvailable, updateSessions, activeSessionId, saveSessions, getActiveSession, deleteAllUpdateSessions, TimelineEvent } from './updateSessions';
import { Capacitor } from '@capacitor/core';
import { getGlobalUpdateState, invokeStartUpdateSession } from './stateMachineAccessors';

export async function logProgressStage(stage: string, message?: string, exceptionStack?: string) {
  if (Capacitor.isNativePlatform() && isAppInstallerAvailable()) {
    try {
      const AppInstaller = (Capacitor as any).Plugins?.AppInstaller;
      if (AppInstaller) {
        const state = getGlobalUpdateState();
        await AppInstaller.appendLog({
          stage,
          status: 0,
          message: message || '',
          exceptionStack: exceptionStack || '',
          packageName: state.packageName || 'com.chordex.app',
        });
      }
    } catch (e) {
    }
  }
}


export function parseStackTrace(error = new Error()): CallerInfo {
  const stack = error.stack || '';
  const lines = stack.split('\n');

  let functionName = 'unknown';
  let file = 'unknown';
  let callerLine = 'unknown';

  let callerIndex = 2;
  while (callerIndex < lines.length) {
    const line = lines[callerIndex];
    if (
      line &&
      !line.includes('parseStackTrace') &&
      !line.includes('logTimelineEvent') &&
      !line.includes('transitionToState') &&
      !line.includes('safeTransition') &&
      !line.includes('commitTransition') &&
      !line.includes('recordStateTransition') &&
      !line.includes('recordCloseEvent') &&
      !line.includes('recordUpToDatePopup')
    ) {
      break;
    }
    callerIndex++;
  }

  const targetLine = lines[callerIndex] || lines[2] || '';
  callerLine = targetLine.trim();

  try {
    const atIndex = targetLine.indexOf('at ');
    if (atIndex !== -1) {
      const rest = targetLine.substring(atIndex + 3).trim();
      const parenIndex = rest.indexOf('(');
      if (parenIndex !== -1) {
        functionName = rest.substring(0, parenIndex).trim();
        const filePathWithLoc = rest.substring(parenIndex + 1, rest.indexOf(')', parenIndex));
        const filePathParts = filePathWithLoc.split(':');
        const filePath = filePathParts.slice(0, Math.max(1, filePathParts.length - 2)).join(':');
        file = filePath.substring(filePath.lastIndexOf('/') + 1);
      } else {
        const filePathParts = rest.split(':');
        const filePath = filePathParts.slice(0, Math.max(1, filePathParts.length - 2)).join(':');
        file = filePath.substring(filePath.lastIndexOf('/') + 1);
      }
    }
  } catch (_) {}

  return {
    file,
    functionName,
    callerLine,
    stackTrace: stack,
  };
}


export function logTimelineEvent(module: string, event: string, reason = '', durationMs?: number) {
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
  let offsetMs = 0;
  let startTimestamp = now;

  let session = updateSessions.find((s) => s.id === activeSessionId);
  if (!session && updateSessions.length > 0) {
    session = updateSessions[updateSessions.length - 1];
  }

  if (session) {
    startTimestamp = session.startTimestamp;
    offsetMs = now - startTimestamp;
  }

  const formatTime = new Date(now).toTimeString().split(' ')[0];
  const min = Math.floor(offsetMs / 60000);
  const sec = Math.floor((offsetMs % 60000) / 1000);
  const ms = offsetMs % 1000;
  const formatOffset =
    String(min).padStart(2, '0') +
    ':' +
    String(sec).padStart(2, '0') +
    '.' +
    String(ms).padStart(3, '0');

  const state = getGlobalUpdateState();
  const ev: TimelineEvent = {
    timestamp: formatTime,
    absoluteTimestamp: now,
    offset: formatOffset,
    offsetMs,
    module,
    event,
    state: state.updateState,
    reason,
    durationMs,
  };

  if (session) {
    session.timeline.push(ev);
    if (state.remoteVersion) {
      session.version = state.remoteVersion;
    }
    saveSessions();
  }
}


/**
 * Record an installation lock event into the ring buffer.
 * Also logs to the active update session timeline for cross-reference.
 */
export function logInstallLockEvent(
  type: InstallLockEvent['type'],
  reason: string,
  extras?: { trigger?: string; caller?: string }
) {
  try {
    const now = Date.now();
    const d = new Date(now);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;

    let caller = extras?.caller || 'unknown';
    if (!extras?.caller) {
      try {
        const stack = new Error().stack || '';
        const lines = stack.split('\n');
        caller = lines[2]?.trim() || 'unknown';
      } catch {
        /* ignore */
      }
    }

    const event: InstallLockEvent = {
      timestamp: now,
      timeStr,
      type,
      caller,
      state: getGlobalUpdateState().updateState,
      reason,
      trigger: extras?.trigger,
      locked: true, // always true at point of recording (it was locked to cause the event)
    };

    installLockTimeline.push(event);
    if (installLockTimeline.length > MAX_INSTALL_LOCK_EVENTS) {
      installLockTimeline.shift();
    }

    // Mirror to the active session timeline for cross-reference in diagnostics report
    logTimelineEvent(
      'InstallationLock',
      type,
      `${reason}${extras?.trigger ? ` | trigger=${extras.trigger}` : ''} | caller=${caller}`
    );
  } catch {
    /* never throw from diagnostics */
  }
}

export function getTimelineReport(): string {
  const active = getActiveSession();
  if (!active || active.timeline.length === 0) return 'No events recorded.';
  return active.timeline
    .map(
      (e) =>
        `[${e.offset}] [${e.module}] ${e.event} (State: ${e.state})${e.reason ? ` - ${e.reason}` : ''}${e.durationMs !== undefined ? ` [${e.durationMs}ms]` : ''}`
    )
    .join('\n');
}


/**
 * Returns a formatted text report of the installation lock timeline.
 */
export function getInstallLockReport(): string {
  if (installLockTimeline.length === 0) {
    return 'Installation lock timeline: (empty — no lock events recorded this session)';
  }
  const lines = installLockTimeline.map(
    (e) =>
      `[${e.timeStr}] [${e.type}] State: ${e.state} | ${e.reason}${e.trigger ? ` | trigger=${e.trigger}` : ''} | Caller: ${e.caller}`
  );
  return `=== Installation Lock Timeline (${installLockTimeline.length} events) ===\n${lines.join('\n')}`;
}


export function interceptIllegalCall(functionName: string, reason: string) {
  const current = getGlobalUpdateState().updateState;
  const isInstalling = [
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
  ].includes(current);
  if (!isInstalling) return;

  const caller = parseStackTrace();
  let screen = 'unknown';
  try {
    const { useNavigationStore } = require('../../store/useNavigationStore');
    const navStore = useNavigationStore.getState();
    if (navStore && navStore.history && navStore.history.length > 0) {
      const lastRoute = navStore.history[navStore.history.length - 1];
      screen = lastRoute.page || lastRoute.tab || lastRoute.app || 'unknown';
    }
  } catch (_) {}

  const alertMsg = `ILLEGAL CALL DETECTED: ${functionName} called by ${caller.callerLine} in state ${current} on screen ${screen}. Reason: ${reason}`;
  console.error(`[Updater SECURITY] [HIGH SEVERITY] ${alertMsg}\nStack: ${caller.stackTrace}`);

  logTimelineEvent(
    'SecurityGuard',
    'ILLEGAL_CALL_DETECTED',
    `${alertMsg} | Stack: ${caller.stackTrace.slice(0, 300)}`
  );

  if (typeof (window as any).logDiagnosticEvent === 'function') {
    (window as any).logDiagnosticEvent('HIGH_SEVERITY_DIAGNOSTIC', {
      event: 'ILLEGAL_CALL_DETECTED',
      message: alertMsg,
      stackTrace: caller.stackTrace,
      screen,
      state: current,
    });
  }
}

export function resetUpdateTimeline() {
  deleteAllUpdateSessions();
}


export interface CallerInfo {
  file: string;
  functionName: string;
  callerLine: string;
  stackTrace: string;
}


// ─── Installation Lock Timeline ───────────────────────────────────────────

/**
 * A single event in the installation lock diagnostic timeline.
 * Records every check rejection/block caused by isInstallationLocked(),
 * every lock set, and every lock clear. Used to prove the fix in production.
 */
export interface InstallLockEvent {
  timestamp: number; // epoch ms
  timeStr: string; // HH:MM:SS.mmm
  type:
    | 'LOCK_SET' // installationJustCompleted set to true
    | 'LOCK_CLEARED' // installationJustCompleted cleared by UI/caller
    | 'LOCK_AUTO_CLEARED' // installationJustCompleted cleared by 60s safety timer
    | 'CHECK_BLOCKED' // checkForUpdate() rejected due to lock
    | 'STARTUP_BLOCKED' // triggerUpdateCheck rejected due to lock
    | 'CANCEL_BLOCKED' // StartupCoordinator.cancel() suppressed due to lock
    | 'RECOVERY_SKIPPED' // enforceStartupRecovery reset skipped due to lock
    | 'RACE_BLOCKED'; // triggerUpdateCheck awaited recovery promise to prevent race
  caller: string; // function + file from stack trace
  state: string; // Updater state at time of event
  reason: string; // human-readable reason string
  trigger?: string; // pipeline trigger if applicable
  locked: boolean; // value of isInstallationLocked() at event time
}





// Keep legacy interfaces for compatibility if needed
export let updateTimeline: TimelineEvent[] = [];


// ─── Installation Lock Timeline ───────────────────────────────────────────
/**
 * In-memory ring buffer of installation lock events.
 * Capped at 200 entries; oldest entries are dropped first.
 */
export const installLockTimeline: InstallLockEvent[] = [];


// Keep legacy interfaces for compatibility if needed

export function startDiagnosticsSession() {
  invokeStartUpdateSession('manual', 'Manual diagnostics session trigger');
}export const MAX_INSTALL_LOCK_EVENTS = 200;
