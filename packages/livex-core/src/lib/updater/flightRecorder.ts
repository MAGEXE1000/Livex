export interface FlightRecorderEvent {
  sequenceId: number; // Global sequence number
  timestamp: number; // UTC ms
  category?: 'NATIVE' | 'LIFECYCLE' | 'STATE' | 'PIPELINE' | 'UI' | 'SYSTEM' | 'UNKNOWN';
  thread: 'js' | 'native' | 'ui';
  sessionId: string | null;
  workflowId: string | null;
  eventType: string;
  caller: string;
  funcName?: string;
  fileName?: string;
  previousState?: string | null;
  newState?: string | null;
  reason?: string;
  duration?: number;
  warning?: string | null;
  error?: string | null;
  stack?: string | null;
  details?: string;
  count?: number; // Repetition aggregator
  severity?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}

const STORAGE_KEY = 'studio:updater_flight_recorder_events';
const SEVERITY_KEY = 'studio:updater_flight_recorder_severity';
const SEQUENCE_KEY = 'studio:updater_flight_recorder_sequence';
const MAX_EVENTS = 2000; // Expanded ring buffer bounds
const MAX_SIZE_BYTES = 2000000; // 2 MB limit
const RETENTION_DAYS = 7;

const SEVERITY_VALUES = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
};

export class UpdaterFlightRecorder {
  private static events: FlightRecorderEvent[] = [];
  private static loaded = false;
  private static severityLevel: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' = 'INFO';
  private static globalSequenceCounter = 0;

  private static load() {
    if (this.loaded) return;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.events = JSON.parse(stored);
          this.prune();
        }
        const severity = localStorage.getItem(SEVERITY_KEY);
        if (severity && severity in SEVERITY_VALUES) {
          this.severityLevel = severity as any;
        }
        const seq = localStorage.getItem(SEQUENCE_KEY);
        if (seq) {
          this.globalSequenceCounter = parseInt(seq, 10);
        } else if (this.events.length > 0) {
          this.globalSequenceCounter = Math.max(...this.events.map((e) => e.sequenceId || 0));
        }
      }
    } catch (e) {
    }
    this.loaded = true;
  }

  private static save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
        localStorage.setItem(SEQUENCE_KEY, String(this.globalSequenceCounter));
      }
    } catch (e) {
    }
  }

  private static estimateSize(events: FlightRecorderEvent[]): number {
    try {
      return JSON.stringify(events).length;
    } catch {
      return events.length * 200;
    }
  }

  private static prune() {
    const cutOff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // 1. Filter out items older than 7 days
    let filtered = this.events.filter((e) => e.timestamp >= cutOff);

    // 2. Clean up expired sessions (keep only the 10 most recent sessions to give more room)
    const sessionIds = Array.from(new Set(filtered.map((e) => e.sessionId).filter(Boolean)));
    if (sessionIds.length > 10) {
      const activeSessionsToKeep = sessionIds.slice(sessionIds.length - 10);
      filtered = filtered.filter((e) => !e.sessionId || activeSessionsToKeep.includes(e.sessionId));
    }

    // 3. Limit to MAX_EVENTS count
    if (filtered.length > MAX_EVENTS) {
      filtered = filtered.slice(filtered.length - MAX_EVENTS);
    }

    // 4. Limit by size (2MB) - slice from start (oldest) if too large
    while (filtered.length > 0 && this.estimateSize(filtered) > MAX_SIZE_BYTES) {
      filtered.shift();
    }

    this.events = filtered;
  }

  public static setSeverityLevel(level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL') {
    this.severityLevel = level;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SEVERITY_KEY, level);
      }
    } catch (_) {}
  }

  public static getSeverityLevel(): 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' {
    this.load();
    return this.severityLevel;
  }

  public static record(
    event: Omit<FlightRecorderEvent, 'timestamp' | 'sequenceId'> & { timestamp?: number }
  ) {
    this.load();

    const eventSeverity = event.severity || 'INFO';
    if (SEVERITY_VALUES[eventSeverity] < SEVERITY_VALUES[this.severityLevel]) {
      return; // Skip logs below the active severity threshold
    }

    this.globalSequenceCounter++;

    let inferredCategory = event.category;
    const eventType = event.eventType || 'unknown';
    const caller = event.caller || 'unknown';
    const thread = event.thread || 'js';

    if (!inferredCategory) {
      const et = eventType.toLowerCase();
      if (thread === 'native' || et.includes('packageinstaller')) inferredCategory = 'NATIVE';
      else if (
        et.includes('appstate') ||
        et.includes('lifecycle') ||
        et.includes('focus') ||
        et.includes('blur') ||
        et.includes('visibility') ||
        et.includes('resume')
      )
        inferredCategory = 'LIFECYCLE';
      else if (et.includes('state') || et.includes('transition')) inferredCategory = 'STATE';
      else if (et.includes('ui') || et.includes('render')) inferredCategory = 'UI';
      else inferredCategory = 'PIPELINE';
    }

    const fullEvent: FlightRecorderEvent = {
      sequenceId: this.globalSequenceCounter,
      timestamp: event.timestamp || Date.now(),
      severity: eventSeverity,
      category: inferredCategory as any,
      ...event,
      thread: event.thread || thread,
      eventType: event.eventType || eventType,
      caller: event.caller || caller,
    };

    // Deduplicate / aggregate progress and lifecycle events to prevent excessive noise
    const lastEvent = this.events[this.events.length - 1];
    const isProgress = fullEvent.eventType.toLowerCase().includes('progress');
    const isLifecycle =
      fullEvent.eventType === 'appStateChange' ||
      fullEvent.eventType.toLowerCase().includes('lifecycle');

    if (
      lastEvent &&
      ((lastEvent.eventType === fullEvent.eventType &&
        lastEvent.newState === fullEvent.newState &&
        lastEvent.previousState === fullEvent.previousState &&
        lastEvent.caller === fullEvent.caller &&
        lastEvent.error === fullEvent.error &&
        lastEvent.warning === fullEvent.warning &&
        lastEvent.category === fullEvent.category &&
        lastEvent.thread === fullEvent.thread) ||
        (isProgress && lastEvent.eventType.toLowerCase().includes('progress')) ||
        (isLifecycle &&
          (lastEvent.eventType === 'appStateChange' ||
            lastEvent.eventType.toLowerCase().includes('lifecycle'))))
    ) {
      lastEvent.count = (lastEvent.count || 1) + 1;
      lastEvent.timestamp = fullEvent.timestamp;
      lastEvent.reason = fullEvent.reason;
      lastEvent.details = fullEvent.details;
      // We don't bump sequenceId for deduplicated events, but we keep the latest timestamp.
      if (fullEvent.newState !== undefined) lastEvent.newState = fullEvent.newState;
      this.prune();
      this.save();
      return;
    }

    this.events.push(fullEvent);
    this.prune();
    this.save();

    // Log to JS console
    const warningText = fullEvent.warning ? ` [WARNING: ${fullEvent.warning}]` : '';
    const errorText = fullEvent.error ? ` [ERROR: ${fullEvent.error}]` : '';
  }

  public static getEvents(): FlightRecorderEvent[] {
    this.load();
    return this.events;
  }

  public static compileFullReport(): string {
    this.load();
    const sorted = [...this.events].sort((a, b) => a.sequenceId - b.sequenceId);
    let out = '=== FLIGHT RECORDER REAL RUNTIME TRACE ===\n';
    out += `Total Events: ${sorted.length}\n`;
    out += `Time Range: ${sorted.length > 0 ? new Date(sorted[0].timestamp).toISOString() : 'N/A'} to ${sorted.length > 0 ? new Date(sorted[sorted.length - 1].timestamp).toISOString() : 'N/A'}\n`;
    out += '--------------------------------------------------\n';

    if (sorted.length === 0) {
      out += 'No events recorded.\n';
      return out;
    }

    let baseTime = sorted[0].timestamp;
    for (const ev of sorted) {
      const timeStr = new Date(ev.timestamp).toISOString();
      const elapsed = ev.timestamp - baseTime;
      const countStr = ev.count && ev.count > 1 ? ` (x${ev.count})` : '';
      const sev = (ev.severity || 'INFO').padEnd(5, ' ');
      const cat = (ev.category || 'UNKNOWN').padEnd(10, ' ');
      const thr = ev.thread.toUpperCase().padEnd(6, ' ');

      out += `[${timeStr}] (+${elapsed}ms) [Seq:${ev.sequenceId}] [${sev}] [${cat}] [${thr}] ${ev.caller} -> ${ev.eventType}${countStr}\n`;
      if (ev.reason) out += `    Reason:  ${ev.reason}\n`;
      if (ev.details) out += `    Details: ${ev.details}\n`;
      if (ev.previousState || ev.newState)
        out += `    State:   ${ev.previousState || 'N/A'} -> ${ev.newState || 'N/A'}\n`;
      if (ev.error) out += `    ERROR:   ${ev.error}\n`;
      if (ev.warning) out += `    WARN:    ${ev.warning}\n`;
      if (ev.stack) out += `    Stack:   ${ev.stack}\n`;
    }
    out += '==================================================\n';
    return out;
  }

  public static clear() {
    this.events = [];
    this.globalSequenceCounter = 0;
    this.save();
  }
}
