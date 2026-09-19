/**
 * updater/updateHistory.ts
 *
 * Persistent update history log stored in localStorage.
 * Exports: UpdateHistoryEntry, getUpdateHistory, logUpdateTransition
 */

export interface UpdateHistoryEntry {
  timestamp: number;
  fromVersion: string;
  toVersion: string;
  type: 'upgrade' | 'downgrade';
  trigger: 'user' | 'auto';
  status: 'success' | 'failed';
  error?: string;
}

export function getUpdateHistory(): UpdateHistoryEntry[] {
  try {
    const raw = localStorage.getItem('studio:updaterHistory');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logUpdateTransition(
  fromVersion: string,
  toVersion: string,
  type: 'upgrade' | 'downgrade',
  trigger: 'user' | 'auto',
  status: 'success' | 'failed',
  error?: string
): void {
  try {
    const history = getUpdateHistory();
    if (history.length > 0) {
      const lastEntry = history[0];
      if (
        lastEntry.fromVersion === fromVersion &&
        lastEntry.toVersion === toVersion &&
        lastEntry.status === status &&
        lastEntry.type === type &&
        Date.now() - lastEntry.timestamp < 5000
      ) {
        return;
      }
    }
    const entry: UpdateHistoryEntry = {
      timestamp: Date.now(),
      fromVersion,
      toVersion,
      type,
      trigger,
      status,
      error,
    };
    history.unshift(entry);
    localStorage.setItem('studio:updaterHistory', JSON.stringify(history.slice(0, 50)));
  } catch (err) {
  }
}
