import { NavigationDispatcher } from '../navigation/NavigationDispatcher';
import { useChordStore } from '../../store/useChordStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { ThemeTransitionEngine } from '../themeTransitionEngine';
export { compressReportText } from './reportCompressor';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  module: string;
  source: string;
  details?: string;
}

export interface NavigationEntry {
  id: string;
  timestamp: number;
  fromApp: string;
  toApp: string;
  transitionStart?: number;
  transitionComplete?: number;
  hubMounted?: boolean;
  subappUnmounted?: boolean;
  activeAppAfterTransition: string;
  transitionLockState: boolean;
  fallbackRendered: boolean;
}

import { processDiagnosticReport, IntelligentDiagnosticReport } from './diagnosticEngine';

export interface ErrorEntry {
  id?: string;
  fingerprint?: string;
  count?: number;
  firstSeen?: number;
  lastSeen?: number;
  timestamp: number;
  message: string;
  stack: string;
  source: string;
  module: string;
  diagnosticReport?: IntelligentDiagnosticReport;
}

export interface EventEntry {
  timestamp: number;
  type: string;
  target: string;
  module: string;
}

export interface NetworkEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  status?: number;
  statusText?: string;
  error?: string;
}

export interface PerfStats {
  renders: number;
  mounts: number;
  unmounts: number;
  lastRenderTime: number;
}

export interface DebugProvider {
  id: string;
  name: string;
  getDebugState: () => Record<string, any>;
  getActions?: () => Array<{ label: string; action: () => void }>;
}

export interface StagexDiagnosticsState {
  iframeMounted: boolean;
  iframeSrc: string;
  iframeLoadFired: boolean;
  contentWindowAvailable: boolean;
  stageCoreReadyReceived: boolean;
  wrapperListenerRegistered: boolean;
  iframeListenerInstalled: boolean;
  messagesSent: number;
  messagesReceived: number;
  ackCount: number;
  timeoutCount: number;
  lastCommandSent: string;
  lastMsgId: string;
  lastAckReceived: string;
  lastTimeout: string;
  lastError: string;
  currentOrigin: string;
  expectedOrigin: string;
  actualEventOrigin: string;
  sentWithTargetOriginWildcard: boolean;
  originRejected: boolean;
  handlerMissing: boolean;
  handlerFailed: boolean;
  nackCount: number;
  lastNack: string;
  lastMissingHandler: string;
  lastFailedHandler: string;
  availableHandlers: string[];
  missingHandlers: string[];
}

const MAX_ITEMS = 150;
const logsBuffer: LogEntry[] = [];
const errorsBuffer: ErrorEntry[] = [];
const eventsBuffer: EventEntry[] = [];
const networkBuffer: NetworkEntry[] = [];
const navBuffer: NavigationEntry[] = [];
const perfRegistry = new Map<string, PerfStats>();
const providers = new Map<string, DebugProvider>();
const listeners = new Set<() => void>();

const stagexDiagnostics: StagexDiagnosticsState = {
  iframeMounted: false,
  iframeSrc: 'N/A',
  iframeLoadFired: false,
  contentWindowAvailable: false,
  stageCoreReadyReceived: false,
  wrapperListenerRegistered: false,
  iframeListenerInstalled: false,
  messagesSent: 0,
  messagesReceived: 0,
  ackCount: 0,
  timeoutCount: 0,
  lastCommandSent: 'none',
  lastMsgId: 'none',
  lastAckReceived: 'none',
  lastTimeout: 'none',
  lastError: 'none',
  currentOrigin: 'N/A',
  expectedOrigin: 'N/A',
  actualEventOrigin: 'N/A',
  sentWithTargetOriginWildcard: false,
  originRejected: false,
  handlerMissing: false,
  handlerFailed: false,
  nackCount: 0,
  lastNack: 'none',
  lastMissingHandler: 'none',
  lastFailedHandler: 'none',
  availableHandlers: [
    'switchView',
    'toggleSCDial',
    'toggleGigMode',
    'stageGoBack',
    'openPresetsPanel',
    'exportPDFWithOptions',
  ],
  missingHandlers: [],
};

export function updateStagexDiagnostics(updates: Partial<StagexDiagnosticsState>) {
  if (!import.meta.env.DEV) return;
  Object.assign(stagexDiagnostics, updates);
  notifyListeners();
}

export function getStagexDiagnostics() {
  return stagexDiagnostics;
}

export function resetStagexDiagnostics() {
  if (!import.meta.env.DEV) return;
  Object.assign(stagexDiagnostics, {
    iframeMounted: false,
    iframeSrc: 'N/A',
    iframeLoadFired: false,
    contentWindowAvailable: false,
    stageCoreReadyReceived: false,
    wrapperListenerRegistered: false,
    iframeListenerInstalled: false,
    messagesSent: 0,
    messagesReceived: 0,
    ackCount: 0,
    timeoutCount: 0,
    lastCommandSent: 'none',
    lastMsgId: 'none',
    lastAckReceived: 'none',
    lastTimeout: 'none',
    lastError: 'none',
    currentOrigin: 'N/A',
    expectedOrigin: 'N/A',
    actualEventOrigin: 'N/A',
    sentWithTargetOriginWildcard: false,
    originRejected: false,
    handlerMissing: false,
    handlerFailed: false,
    nackCount: 0,
    lastNack: 'none',
    lastMissingHandler: 'none',
    lastFailedHandler: 'none',
    availableHandlers: [
      'switchView',
      'toggleSCDial',
      'toggleGigMode',
      'stageGoBack',
      'openPresetsPanel',
      'exportPDFWithOptions',
    ],
    missingHandlers: [],
  });
  notifyListeners();
}

// Smart Error Normalizer to eliminate 'console.error {}' and format raw values
export function normalizeErrorInput(...args: any[]): { message: string; stack: string } {
  if (args.length === 0) {
    return { message: 'Empty error logged', stack: '' };
  }

  const messageParts: string[] = [];
  let extractedStack = '';

  for (const arg of args) {
    if (arg === null || arg === undefined) {
      messageParts.push(String(arg));
      continue;
    }

    if (arg instanceof Error) {
      messageParts.push(arg.message || arg.name || 'Unknown Error');
      if (arg.stack && !extractedStack) {
        extractedStack = arg.stack;
      }
      continue;
    }

    if (typeof arg === 'object') {
      if (arg.message && typeof arg.message === 'string') {
        messageParts.push(arg.message);
        if (arg.stack && typeof arg.stack === 'string' && !extractedStack) {
          extractedStack = arg.stack;
        }
        continue;
      }

      if (arg.reason || arg.cause) {
        const sub = arg.reason || arg.cause;
        if (sub instanceof Error) {
          messageParts.push(sub.message);
          if (sub.stack && !extractedStack) extractedStack = sub.stack;
        } else if (typeof sub === 'string') {
          messageParts.push(sub);
        } else {
          messageParts.push(JSON.stringify(sub));
        }
        continue;
      }

      // Check non-enumerable properties or JSON stringify
      try {
        const json = JSON.stringify(arg);
        if (json === '{}') {
          const keys = Object.getOwnPropertyNames(arg);
          if (keys.length > 0) {
            const kv = keys.map((k) => `${k}: ${arg[k]}`).join(', ');
            messageParts.push(`[${arg.constructor?.name || 'Object'}: ${kv}]`);
          } else {
            messageParts.push(`[${arg.constructor?.name || 'Empty Object {}'}]`);
          }
        } else {
          messageParts.push(json);
        }
      } catch (_) {
        messageParts.push(String(arg));
      }
      continue;
    }

    messageParts.push(String(arg));
  }

  const finalMessage = messageParts.filter(Boolean).join(' ') || 'Unknown Error';
  return { message: finalMessage, stack: extractedStack };
}

// Generate stable fingerprint for smart error grouping
export function getErrorFingerprint(module: string, message: string, stack: string): string {
  const firstStackLine = stack ? stack.split('\n')[0].trim() : '';
  const cleanMsg = message.replace(/0x[0-9a-fA-F]+/g, '').substring(0, 150);
  return `${module}|${cleanMsg}|${firstStackLine}`;
}

let initialized = false;
let originalConsole: typeof console | null = null;
let notifyScheduled = false;

// Helpers to notify subscribers with frame batching to eliminate React render churn
function notifyListeners() {
  if (listeners.size === 0) return;
  if (notifyScheduled) return;
  notifyScheduled = true;

  const dispatch = () => {
    notifyScheduled = false;
    listeners.forEach((l) => {
      try {
        l();
      } catch (_) {}
    });
  };

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(dispatch);
  } else {
    setTimeout(dispatch, 16);
  }
}

export function subscribeToDevTools(listener: () => void) {
  if (!import.meta.env.DEV) {
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getCallerSource(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown';
  const lines = stack.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes('devTools.ts') ||
      line.includes('devTools.js') ||
      line.includes('getCallerSource') ||
      line.includes('addLog') ||
      line.includes('console.warn') ||
      line.includes('console.error') ||
      line.includes('console.log')
    ) {
      continue;
    }
    const match = line.match(/at\s+(.*?)\s+\((.*?)\)/) || line.match(/at\s+(.*)/);
    if (match) {
      const fullPath = match[2] || match[1];
      const parts = fullPath.split('/');
      const lastPart = parts[parts.length - 1];
      const winParts = lastPart.split('\\');
      return winParts[winParts.length - 1];
    }
  }
  return 'unknown';
}

// ── 1. LOG VIEWER ──
export function addLog(level: 'info' | 'warn' | 'error', module: string, ...args: any[]) {
  if (!import.meta.env.DEV) return;
  const isDevMode = useSettingsStore.getState().settings.developerMode;
  if (!isDevMode && !initialized) return;

  let detailsText: string | undefined = undefined;
  const msgParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg instanceof Error) {
      msgParts.push(arg.message || String(arg));
      if (arg.stack) detailsText = arg.stack;
    } else if (typeof arg === 'object' && arg !== null) {
      try {
        const json = JSON.stringify(arg, null, 2);
        if (i > 0 && !detailsText) {
          detailsText = json;
        } else {
          msgParts.push(JSON.stringify(arg));
        }
      } catch (_) {
        msgParts.push(String(arg));
      }
    } else {
      msgParts.push(String(arg));
    }
  }

  const msg = msgParts.join(' ');

  let targetLevel = level;
  if (level === 'warn') {
    const isDiagnostics =
      args.some((arg) => {
        if (arg && typeof arg === 'object') {
          return 'appVersion' in arg && 'appName' in arg && 'memory' in arg;
        }
        return false;
      }) ||
      (msg.includes('"appVersion"') &&
        msg.includes('"appName"') &&
        msg.includes('"memory"') &&
        msg.includes('"status"'));

    if (isDiagnostics) {
      targetLevel = 'info';
    }
  }

  const id = Math.random().toString(36).substring(2, 9);
  const isDevModeSafe =
    typeof useChordStore !== 'undefined' && useSettingsStore?.getState?.()?.settings?.developerMode;
  const source = isDevModeSafe ? getCallerSource() : 'unknown';
  const isFirestore =
    msg.includes('@firebase/firestore') || msg.toLowerCase().includes('firestore');

  logsBuffer.push({
    id,
    timestamp: Date.now(),
    level: targetLevel,
    message: msg,
    module: isFirestore ? 'network' : module,
    source: isFirestore ? 'Firestore' : source,
    details: detailsText,
  });

  if (logsBuffer.length > MAX_ITEMS) logsBuffer.shift();
  notifyListeners();
}

export function inspectWifiInterface(trigger = 'Manual Inspection') {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const rawType = conn?.type;
  const isWifi = rawType === 'wifi';
  const effectiveType = conn?.effectiveType || 'unknown';
  const downlink = conn?.downlink !== undefined ? `${conn.downlink} Mbps` : 'Unavailable';
  const rtt = conn?.rtt !== undefined ? `${conn.rtt} ms` : 'Unavailable';
  const saveData = conn?.saveData !== undefined ? String(conn.saveData) : 'Unavailable';

  const connectionLabel = isWifi
    ? 'Wi-Fi (802.11 Wireless)'
    : rawType
      ? `Cellular/Other (${rawType})`
      : isOnline
        ? 'Active (Interface Type Unspecified)'
        : 'Disconnected (Offline)';

  const detailsObj = {
    trigger,
    isOnline,
    interfaceType: connectionLabel,
    effectiveType,
    downlinkBandwidth: downlink,
    roundTripTime: rtt,
    saveDataMode: saveData,
    unavailablePlatformFields: {
      ssid: 'Unavailable (Restricted: requires Android ACCESS_FINE_LOCATION & GPS on Android 10+)',
      bssid: 'Unavailable (Restricted: requires Android ACCESS_FINE_LOCATION on Android 10+)',
      signalStrengthDbm: 'Unavailable (Restricted: requires native Android ACCESS_WIFI_STATE)',
      localIpAddress: 'Unavailable (Restricted: not exposed by WebView sandbox)',
    },
  };

  const level: 'info' | 'warn' = isOnline ? 'info' : 'warn';
  const message = isOnline
    ? `Wi-Fi/Network status: ${connectionLabel} [Effective: ${effectiveType}, Downlink: ${downlink}, RTT: ${rtt}]`
    : 'Wi-Fi/Network status: Disconnected (Device is offline)';

  addLog(level, 'wifi', message, detailsObj);
}

export function getLogs() {
  return logsBuffer;
}

export function clearLogs() {
  logsBuffer.length = 0;
  notifyListeners();
}

// ── 1B. NAVIGATION TRACE LOGS ──
export function recordNavigation(entry: Omit<NavigationEntry, 'id' | 'timestamp'>) {
  if (!import.meta.env.DEV) return;

  const id = Math.random().toString(36).substring(2, 9);
  navBuffer.push({
    id,
    timestamp: Date.now(),
    ...entry,
  });

  if (navBuffer.length > 50) navBuffer.shift();
  notifyListeners();
}

export function getNavigationEntries(): NavigationEntry[] {
  return navBuffer;
}

export function clearNavigationEntries() {
  navBuffer.length = 0;
  notifyListeners();
}

// ── 2. ERROR VIEWER ──
export function addError(err: Omit<ErrorEntry, 'timestamp'>) {
  if (!import.meta.env.DEV) return;
  const isDevMode = useSettingsStore.getState().settings.developerMode;
  if (!isDevMode) return;

  const isFirestore =
    err.message.includes('@firebase/firestore') || err.message.toLowerCase().includes('firestore');

  const mod = isFirestore ? 'network' : err.module;
  const src = isFirestore ? 'Firestore' : err.source;
  const fingerprint = err.fingerprint || getErrorFingerprint(mod, err.message, err.stack || '');
  const now = Date.now();

  const report = processDiagnosticReport(err.message, err.stack || '', {
    module: mod,
    source: src,
  });

  const existingIndex = errorsBuffer.findIndex(
    (e) =>
      (e.fingerprint && e.fingerprint === fingerprint) ||
      (e.message === err.message && e.module === mod)
  );

  if (existingIndex >= 0) {
    const existing = errorsBuffer[existingIndex];
    existing.count = (existing.count || 1) + 1;
    existing.lastSeen = now;
    existing.timestamp = now;
    existing.diagnosticReport = report;
  } else {
    const id = err.id || Math.random().toString(36).substring(2, 9);
    errorsBuffer.push({
      ...err,
      id,
      fingerprint,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      module: mod,
      source: src,
      timestamp: now,
      diagnosticReport: report,
    });
  }

  if (errorsBuffer.length > MAX_ITEMS) errorsBuffer.shift();
  notifyListeners();
}

export function getErrors() {
  return errorsBuffer;
}

export function clearErrors() {
  errorsBuffer.length = 0;
  notifyListeners();
}

// ── 3. EVENT INSPECTOR ──
export function recordEvent(type: string, target: string, module = 'general') {
  if (!import.meta.env.DEV) return;

  eventsBuffer.push({
    timestamp: Date.now(),
    type,
    target,
    module,
  });

  if (eventsBuffer.length > MAX_ITEMS) eventsBuffer.shift();
  notifyListeners();
}

export function getEvents() {
  return eventsBuffer;
}

export function clearEvents() {
  eventsBuffer.length = 0;
  notifyListeners();
}

// ── 4. NETWORK INSPECTOR ──
function stripSensitiveHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const stripped: Record<string, string> = {};
  if (!headers) return stripped;

  const sanitize = (key: string, val: string) => {
    const k = key.toLowerCase();
    if (
      k.includes('authorization') ||
      k.includes('token') ||
      k.includes('key') ||
      k.includes('cookie') ||
      k.includes('credential')
    ) {
      stripped[key] = '********';
    } else {
      stripped[key] = val;
    }
  };

  if (headers instanceof Headers) {
    headers.forEach((val, key) => sanitize(key, val));
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, val]) => sanitize(key, val));
  } else {
    Object.entries(headers).forEach(([key, val]) => sanitize(key, String(val)));
  }
  return stripped;
}

export function recordNetworkRequest(method: string, url: string, init?: RequestInit): string {
  if (!import.meta.env.DEV) return '';

  const id = Math.random().toString(36).substring(2, 9);
  const isDevMode = useSettingsStore.getState().settings.developerMode;
  if (!isDevMode) return id;

  networkBuffer.push({
    id,
    timestamp: Date.now(),
    method,
    url,
    headers: stripSensitiveHeaders(init?.headers),
  });

  if (networkBuffer.length > MAX_ITEMS) networkBuffer.shift();
  notifyListeners();
  return id;
}

const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export function recordNetworkResponse(id: string, status: number, statusText: string) {
  if (!import.meta.env.DEV || !id) return;

  const req = networkBuffer.find((n) => n.id === id);
  if (req) {
    req.status = status;
    let actualStatusText = statusText;
    if (status === 404) {
      actualStatusText = 'Not Found';
    } else if (!actualStatusText) {
      actualStatusText = STATUS_TEXTS[status] || `HTTP ${status}`;
    }
    req.statusText = actualStatusText;
    notifyListeners();
  }
}

export function recordNetworkFailure(id: string, error: string) {
  if (!import.meta.env.DEV || !id) return;

  const req = networkBuffer.find((n) => n.id === id);
  if (req) {
    req.error = error;
    notifyListeners();
  }
}

export function getNetworkRequests() {
  return networkBuffer;
}

export function clearNetworkRequests() {
  networkBuffer.length = 0;
  notifyListeners();
}

// ── 5. PERFORMANCE INSPECTOR ──
export function recordPerfEvent(
  componentName: string,
  type: 'mount' | 'unmount' | 'render',
  renderCount = 0
) {
  if (!import.meta.env.DEV) return;

  const isDevMode = useSettingsStore.getState().settings.developerMode;
  if (!isDevMode) return;

  let stats = perfRegistry.get(componentName);
  if (!stats) {
    stats = { renders: 0, mounts: 0, unmounts: 0, lastRenderTime: Date.now() };
    perfRegistry.set(componentName, stats);
  }

  if (type === 'mount') stats.mounts += 1;
  else if (type === 'unmount') stats.unmounts += 1;
  else {
    stats.renders = renderCount;
    stats.lastRenderTime = Date.now();
  }
  notifyListeners();
}

export function getPerfStats() {
  return perfRegistry;
}

export function clearPerfStats() {
  perfRegistry.clear();
  notifyListeners();
}

// ── 6. DEBUG PROVIDERS REGISTRY ──
export function registerDebugProvider(provider: DebugProvider) {
  if (!import.meta.env.DEV) return;

  providers.set(provider.id, provider);
  notifyListeners();
}

export function unregisterDebugProvider(id: string) {
  if (!import.meta.env.DEV) return;

  providers.delete(id);
  notifyListeners();
}

export function getDebugProviders() {
  return Array.from(providers.values());
}

// ── 7. SHIELDED STORAGE VALUES ──
export function maskSensitiveValue(key: string, value: string): string {
  const k = key.toLowerCase();
  if (
    k.includes('token') ||
    k.includes('password') ||
    k.includes('key') ||
    k.includes('secret') ||
    k.includes('auth') ||
    k.includes('jwt') ||
    k.includes('credential')
  ) {
    return '********';
  }
  return value;
}

// ── 8. GLOBAL INITIALIZATION ──
export function initDevToolsFramework() {
  // Fail-closed in production: The development diagnostics framework must NEVER execute in production builds.
  // The production path must return immediately before:
  // - setting initialized state
  // - monkey-patching console
  // - monkey-patching fetch
  // - registering global event listeners
  // - allocating diagnostic buffers
  if (!import.meta.env.DEV) {
    return;
  }

  if (initialized) return;
  initialized = true;

  // Intercept Global Console logs
  originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  } as any;

  console.log = (...args: any[]) => {
    originalConsole!.log(...args);
    // Infer module from bracket prefixes like [Stagex]
    let module = 'general';
    let cleanArgs = args;
    if (typeof args[0] === 'string' && args[0].startsWith('[')) {
      const closeIdx = args[0].indexOf(']');
      if (closeIdx > 0) {
        module = args[0].slice(1, closeIdx);
        const rest = args[0].slice(closeIdx + 1).trim();
        cleanArgs = rest ? [rest, ...args.slice(1)] : args.slice(1);
      }
    }
    addLog('info', module, ...cleanArgs);
  };

  console.warn = (...args: any[]) => {
    originalConsole!.warn(...args);
    let module = 'general';
    let cleanArgs = args;
    if (typeof args[0] === 'string' && args[0].startsWith('[')) {
      const closeIdx = args[0].indexOf(']');
      if (closeIdx > 0) {
        module = args[0].slice(1, closeIdx);
        const rest = args[0].slice(closeIdx + 1).trim();
        cleanArgs = rest ? [rest, ...args.slice(1)] : args.slice(1);
      }
    }
    addLog('warn', module, ...cleanArgs);
  };

  console.error = (...args: any[]) => {
    originalConsole!.error(...args);
    let module = 'general';
    let cleanArgs = args;
    if (typeof args[0] === 'string' && args[0].startsWith('[')) {
      const closeIdx = args[0].indexOf(']');
      if (closeIdx > 0) {
        module = args[0].slice(1, closeIdx);
        const rest = args[0].slice(closeIdx + 1).trim();
        cleanArgs = rest ? [rest, ...args.slice(1)] : args.slice(1);
      }
    }
    addLog('error', module, ...cleanArgs);

    // Add to error viewer automatically
    const msg = cleanArgs
      .map((c) => (typeof c === 'object' ? JSON.stringify(c) : String(c)))
      .join(' ');
    addError({
      message: msg,
      stack: new Error().stack || '',
      source: 'console.error',
      module,
    });
  };

  // Intercept Global Errors & Unhandled Rejections
  window.addEventListener('error', (e) => {
    addError({
      message: e.message || String(e.error),
      stack: e.error?.stack || '',
      source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : 'window.onerror',
      module: 'general',
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    addError({
      message: reason?.message || String(reason),
      stack: reason?.stack || '',
      source: 'unhandledrejection',
      module: 'general',
    });
  });

  // Intercept fetch network calls
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const method = init?.method || 'GET';
    const reqId = recordNetworkRequest(method, url, init);
    try {
      const response = await originalFetch(input, init);
      recordNetworkResponse(reqId, response.status, response.statusText);
      return response;
    } catch (error: any) {
      recordNetworkFailure(reqId, error.message || String(error));
      throw error;
    }
  };

  // Intercept clicks/gestures for Event Inspecting
  const handleGlobalTouch = (e: Event) => {
    let targetDesc = '';
    const target = e.target as HTMLElement | null;
    if (target) {
      targetDesc = target.tagName.toLowerCase();
      if (target.id) targetDesc += `#${target.id}`;
      if (target.className) {
        const cls = typeof target.className === 'string' ? target.className.split(' ')[0] : '';
        if (cls) targetDesc += `.${cls}`;
      }
    }

    // Attempt to infer active application key
    const store = useChordStore.getState();
    const app = NavigationDispatcher.currentApp();
    recordEvent(e.type, targetDesc || 'unknown', app);
  };

  const capturedEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'pointerup'];
  capturedEvents.forEach((evt) => {
    window.addEventListener(evt, handleGlobalTouch, { capture: true, passive: true });
  });

  // Forensics watchdogs (kept globally so Web benefits from resilient recovering)
  (window as any).__runRootWatchdogCheck = (name: string) => {
    const currentMode = NavigationDispatcher.currentApp() || 'hub';
    const rootNode = document.getElementById('root');
    const appContainer = document.querySelector('.app-container');
    if (currentMode === 'hub' && rootNode && !appContainer) {
      if (typeof (window as any).__forceRerenderApp === 'function') {
        (window as any).__forceRerenderApp();
      }
      // @ts-ignore - injected global watchdog variable
      window.studioTransitionActive = false;
      NavigationDispatcher.reset([{ app: 'hub', tab: 'home' }]);
    }
  };

  // Theme transitions
  (window as any).__triggerThemeTransition = (
    nextTheme: string,
    amoled: boolean,
    x: number,
    y: number,
    updateFn: () => void
  ) => {
    ThemeTransitionEngine.startTransition({
      nextTheme,
      amoled,
      startX: x,
      startY: y,
      updateFn,
    });
  };

  // Transition active syncing
  try {
    Object.defineProperty(window, 'studioTransitionActive', {
      get() {
        return useNavigationStore.getState().isTransitioning;
      },
      set(val) {
        useNavigationStore.getState().setTransition(null, !!val);
      },
      configurable: true,
    });
  } catch (e) {}

  // ── 9. REAL WI-FI / NETWORK OBSERVATION ──
  try {
    inspectWifiInterface('System Startup Inspection');

    window.addEventListener('online', () => {
      inspectWifiInterface('Network State: ONLINE');
    });

    window.addEventListener('offline', () => {
      inspectWifiInterface('Network State: OFFLINE');
    });

    const conn = (navigator as any)?.connection;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', () => {
        inspectWifiInterface('Network Connection Properties Changed');
      });
    }
  } catch (_) {}
}
