import { APP_VERSION as NATIVE_VERSION } from '../appVersion';

export interface ForensicSnapshot {
  timestamp: number;
  checkpoint: string;
  appMode: string;
  hubDomState?: {
    mounted: boolean;
    visible: boolean;
  };
  paintVerification?: any;
}

export function logLifecycleEvent(
  name: string,
  event: 'mount' | 'unmount',
  isDebugModeEnabled: boolean
): void {
  if (!isDebugModeEnabled) return;
  try {
    const timestamp = Date.now();
    const stack = new Error().stack || 'unknown';

    const logEntry = {
      timestamp,
      name,
      event,
      stack,
    };

    const logsStr = localStorage.getItem('studio_root_lifecycle_logs') || '[]';
    let logs: any[] = JSON.parse(logsStr);
    logs.push(logEntry);
    if (logs.length > 100) logs = logs.slice(-100);
    localStorage.setItem('studio_root_lifecycle_logs', JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to log lifecycle event:', err);
  }
}

export function recordNavigationTimeline(captureId: number, key: string, snap: any): void {
  try {
    const currentTimelineStr = localStorage.getItem('studio_current_navigation_timeline');
    let timeline = currentTimelineStr ? JSON.parse(currentTimelineStr) : null;

    if (!timeline || timeline.id !== captureId) {
      timeline = {
        id: captureId,
        timestamp: Date.now(),
        appVersion: NATIVE_VERSION,
        versionCode: 95,
        snapshots: {},
        result: 'pending',
        reason: '',
      };
    }

    timeline.snapshots[key] = snap;
    localStorage.setItem('studio_current_navigation_timeline', JSON.stringify(timeline));

    const listStr = localStorage.getItem('studio_forensic_captures') || '[]';
    const list = JSON.parse(listStr);
    const index = list.findIndex((c: any) => c.id === captureId);
    if (index !== -1) {
      list[index].snapshots = list[index].snapshots || {};
      list[index].snapshots[key] = snap;
      localStorage.setItem('studio_forensic_captures', JSON.stringify(list));
    } else {
      list.push(timeline);
      while (list.length > 20) {
        list.shift();
      }
      localStorage.setItem('studio_forensic_captures', JSON.stringify(list));
    }
  } catch (err) {
    console.error(`Failed to capture checkpoint ${key}:`, err);
  }
}
