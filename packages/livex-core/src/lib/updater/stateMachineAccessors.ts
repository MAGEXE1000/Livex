import type { CentralizedUpdateState } from './types';

export interface StateMachineAccessors {
  getGlobalUpdateState: () => CentralizedUpdateState;
  getActivePipelineContext: () => any;
  getActiveUpdateSession: () => any;
  getTransitionListeners: () => any;
  startUpdateSession: (triggerType: any, reason: string) => any;
}

let accessors: StateMachineAccessors | null = null;

export function registerStateMachineAccessors(acc: StateMachineAccessors) {
  accessors = acc;
}

const fallbackState: Partial<CentralizedUpdateState> = {
  updateState: 'IDLE',
  loading: false,
  progress: 0,
  error: null,
  statusText: null,
  remoteVersion: null,
  updateAvailable: false,
  mandatory: false,
  downloadUrl: null,
  apkUrl: null,
  apkSha256: null,
  releaseNotes: null,
  sessionId: null,
  packageName: 'com.chordex.app',
  consecutiveFailures: 0,
  activeFallback: null,
  recoveryMode: false,
};

export function getGlobalUpdateState(): CentralizedUpdateState {
  if (accessors) {
    return accessors.getGlobalUpdateState();
  }
  return fallbackState as CentralizedUpdateState;
}

export function getActivePipelineContext(): any {
  return accessors ? accessors.getActivePipelineContext() : null;
}

export function getActiveUpdateSession(): any {
  return accessors ? accessors.getActiveUpdateSession() : null;
}

export function getTransitionListeners(): any {
  return accessors ? accessors.getTransitionListeners() : new Set();
}

export function invokeStartUpdateSession(triggerType: any, reason: string): any {
  return accessors ? accessors.startUpdateSession(triggerType, reason) : null;
}
