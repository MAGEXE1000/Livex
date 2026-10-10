/**
 * Production Error Tracking & Resilience Monitor.
 *
 * Implements non-intrusive, zero-PII client/server error monitoring:
 * 1. Automatic scrubbing of email addresses, authorization tokens, API keys,
 *    filesystem user paths, and audio/image data URLs.
 * 2. Unhandled promise rejections and global uncaught exception trapping.
 * 3. Crash-loop detection (>= 3 errors in 10s) with automatic safe-mode recovery.
 * 4. Offline-first resilience: completely non-blocking, zero exceptions thrown
 *    when network is down or endpoints are unreachable.
 * 5. In-memory ring buffer (up to 20 events) for local diagnostics.
 */

import { APP_VERSION } from '../startup/appVersion';

export interface SanitizedErrorEvent {
  id: string;
  timestamp: number;
  appVersion: string;
  platform: 'web' | 'android';
  environment: 'production' | 'development';
  name: string;
  message: string;
  stack?: string;
  source: 'window.onerror' | 'unhandledrejection' | 'ErrorBoundary' | 'manual' | 'server';
  fingerprint: string;
  url?: string;
  context?: Record<string, any>;
}

export interface ErrorTrackerOptions {
  endpointUrl?: string;
  environment?: 'production' | 'development';
  platform?: 'web' | 'android';
  onCrashLoop?: () => void;
}

const ERROR_BUFFER_LIMIT = 20;
const CRASH_LOOP_WINDOW_MS = 10000;
const CRASH_LOOP_THRESHOLD = 3;

const recentErrors: SanitizedErrorEvent[] = [];
const errorTimestamps: number[] = [];
let crashLoopDetected = false;
let isInitialized = false;
let activeOptions: ErrorTrackerOptions = {};

// ── 1. PII & SENSITIVE CREDENTIAL REDACTION ──────────────────────────────────

/**
 * Scrubs all sensitive personally identifiable information (PII), authentication tokens,
 * passwords, API keys, audio data URLs, and private OS user paths from strings.
 */
export function scrubSensitivePII(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Bound maximum scan payload to prevent uncontrolled resource exhaustion (CWE-400)
  if (text.length > 50000) {
    text = text.slice(0, 50000);
  }

  // 1. Redact Email Addresses with safe, bounded non-backtracking regex (CWE-1333)
  if (text.includes('@')) {
    text = text.replace(
      /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,63}@[a-zA-Z0-9.-]{1,63}\.[a-zA-Z]{2,12}\b/gi,
      '[REDACTED_EMAIL]'
    );
  }

  return (
    text
      // 2. Redact JWT / Bearer Tokens
      .replace(/Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]')
      // 3. Redact High-Entropy API Keys (Firebase, Groq, OpenAI, Anthropic, DeepSeek)
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_FIREBASE_KEY]')
      .replace(/gsk_[0-9A-Za-z]{48}/g, '[REDACTED_GROQ_KEY]')
      .replace(/sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{20,}/g, '[REDACTED_SECRET_KEY]')
      // 4. Redact Local OS User Filesystem Paths (Windows & Unix)
      .replace(/([a-zA-Z]:\\Users\\)[^\\]+/gi, '$1[REDACTED_USER]')
      .replace(/\/Users\/[^\/\s"':]+/g, '/Users/[REDACTED_USER]')
      .replace(/\/home\/[^\/\s"':]+/g, '/home/[REDACTED_USER]')
      // 5. Redact Audio & Image Data URLs / Blobs
      .replace(/data:audio\/[^\s"'`<>)]+/gi, '[REDACTED_AUDIO_DATAURL]')
      .replace(/data:image\/[^\s"'`<>)]+/gi, '[REDACTED_IMAGE_DATAURL]')
      .replace(/data:application\/[^\s"'`<>)]+/gi, '[REDACTED_BLOB_DATAURL]')
      // 6. Redact Query Parameter Secrets
      .replace(/([?&](?:token|auth|password|key|apiKey|secret)=)[^&\s]+/gi, '$1[REDACTED]')
  );
}

/**
 * Recursively scrubs PII and secret keys from metadata objects.
 */
export function scrubObjectMetadata(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return scrubSensitivePII(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map(scrubObjectMetadata);
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (/password|secret|token|credential|authorization|cookie|session/i.test(key)) {
        scrubbed[key] = '[REDACTED_SECRET_FIELD]';
      } else {
        scrubbed[key] = scrubObjectMetadata(value);
      }
    }
    return scrubbed;
  }

  return String(obj);
}

// ── 2. ERROR EVENT SANITIZATION & FINGERPRINTING ────────────────────────────

function generateFingerprint(name: string, message: string, stack?: string): string {
  const topStackFrame = stack ? stack.split('\n')[1] || '' : '';
  const combined = `${name}:${message}:${topStackFrame}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Creates a sanitized, zero-leak error event.
 */
export function createSanitizedErrorEvent(
  error: unknown,
  source: SanitizedErrorEvent['source'] = 'manual',
  context?: Record<string, any>,
  options: ErrorTrackerOptions = {}
): SanitizedErrorEvent {
  let name = 'Error';
  let rawMessage = 'Unknown runtime exception';
  let rawStack = '';

  if (error instanceof Error) {
    name = error.name || 'Error';
    rawMessage = error.message || 'Error occurred';
    rawStack = error.stack || '';
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    try {
      rawMessage = JSON.stringify(error);
    } catch {
      rawMessage = String(error);
    }
  }

  const cleanMessage = scrubSensitivePII(rawMessage);
  const cleanStack = rawStack ? scrubSensitivePII(rawStack) : undefined;
  const fingerprint = generateFingerprint(name, cleanMessage, cleanStack);

  const platform =
    options.platform ||
    (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() ? 'android' : 'web');

  const environment =
    options.environment ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ? 'development' : 'production');

  let currentUrl: string | undefined;
  if (typeof window !== 'undefined' && window.location?.href) {
    currentUrl = scrubSensitivePII(window.location.pathname);
  }

  return {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    appVersion: APP_VERSION,
    platform,
    environment,
    name,
    message: cleanMessage,
    stack: cleanStack,
    source,
    fingerprint,
    url: currentUrl,
    context: context ? scrubObjectMetadata(context) : undefined,
  };
}

// ── 3. CRASH LOOP MONITORING & RECOVERY ──────────────────────────────────────

function recordErrorTimestamp(): void {
  const now = Date.now();
  errorTimestamps.push(now);

  // Evict timestamps older than CRASH_LOOP_WINDOW_MS
  while (errorTimestamps.length > 0 && errorTimestamps[0] < now - CRASH_LOOP_WINDOW_MS) {
    errorTimestamps.shift();
  }

  if (errorTimestamps.length >= CRASH_LOOP_THRESHOLD && !crashLoopDetected) {
    crashLoopDetected = true;
    console.warn(
      `[Livex Production Monitor] Crash loop threshold reached (${errorTimestamps.length} exceptions in 10s). Activating safe recovery mode.`
    );

    // Release any stuck navigation transition locks
    if (typeof window !== 'undefined') {
      (window as any).studioTransitionActive = false;
      (window as any).__livex_crash_loop_detected = true;
    }

    try {
      activeOptions.onCrashLoop?.();
    } catch {}
  }
}

export function isCrashLoopDetected(): boolean {
  return crashLoopDetected;
}

export function resetCrashLoopState(): void {
  errorTimestamps.length = 0;
  crashLoopDetected = false;
  if (typeof window !== 'undefined') {
    (window as any).__livex_crash_loop_detected = false;
  }
}

// ── 4. RESILIENT NETWORK DISPATCHER ──────────────────────────────────────────

async function dispatchErrorEvent(event: SanitizedErrorEvent, endpointUrl?: string): Promise<void> {
  // Always record in local ring buffer
  recentErrors.unshift(event);
  if (recentErrors.length > ERROR_BUFFER_LIMIT) {
    recentErrors.pop();
  }

  if (!endpointUrl) {
    // Structured local console recording (production safe, zero PII)
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[Livex Monitor] ${event.source} ${event.name}: ${event.message}`, {
        id: event.id,
        fingerprint: event.fingerprint,
        version: event.appVersion,
        platform: event.platform,
      });
    }
    return;
  }

  // Network delivery (Non-blocking, offline-resilient, fail-closed)
  try {
    const payload = JSON.stringify(event);

    // 1. Try navigator.sendBeacon if available (browser unloading safety)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const beaconSent = navigator.sendBeacon(endpointUrl, payload);
      if (beaconSent) return;
    }

    // 2. Fetch with short 3-second timeout and keepalive
    if (typeof fetch === 'function') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 3000);

      await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        signal: controller?.signal,
      }).catch(() => {}); // Explicitly catch and swallow offline failures

      clearTimeout(timeout);
    }
  } catch {
    // Fail-safe: Never throw or crash when error monitoring endpoint fails
  }
}

// ── 5. GLOBAL HANDLERS & PUBLIC API ─────────────────────────────────────────

let globalErrorHandler: ((event: ErrorEvent) => void) | null = null;
let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

/**
 * Initializes production error tracking and uncaught exception capture.
 * Safe to call multiple times (idempotent).
 */
export function initProductionErrorTracker(options: ErrorTrackerOptions = {}): () => void {
  if (isInitialized) return disposeProductionErrorTracker;

  activeOptions = {
    ...options,
    endpointUrl: options.endpointUrl || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ERROR_TRACKING_URL : undefined),
  };

  if (typeof window !== 'undefined') {
    // Global uncaught errors
    globalErrorHandler = (event: ErrorEvent) => {
      try {
        recordErrorTimestamp();
        const sanitized = createSanitizedErrorEvent(
          event.error || event.message,
          'window.onerror',
          { colno: event.colno, lineno: event.lineno, filename: event.filename },
          activeOptions
        );
        void dispatchErrorEvent(sanitized, activeOptions.endpointUrl);
      } catch {}
    };

    // Unhandled promise rejections
    unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      try {
        recordErrorTimestamp();
        const sanitized = createSanitizedErrorEvent(
          event.reason || 'Unhandled Promise Rejection',
          'unhandledrejection',
          undefined,
          activeOptions
        );
        void dispatchErrorEvent(sanitized, activeOptions.endpointUrl);
      } catch {}
    };

    window.addEventListener('error', globalErrorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  }

  isInitialized = true;
  return disposeProductionErrorTracker;
}

/**
 * Removes global error listeners and resets tracker state.
 */
export function disposeProductionErrorTracker(): void {
  if (typeof window !== 'undefined') {
    if (globalErrorHandler) {
      window.removeEventListener('error', globalErrorHandler);
      globalErrorHandler = null;
    }
    if (unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      unhandledRejectionHandler = null;
    }
  }
  isInitialized = false;
  resetCrashLoopState();
}

/**
 * Manually captures an exception (e.g. inside React ErrorBoundary or API client).
 */
export function captureException(error: unknown, context?: Record<string, any>): SanitizedErrorEvent {
  recordErrorTimestamp();
  const sanitized = createSanitizedErrorEvent(error, 'manual', context, activeOptions);
  void dispatchErrorEvent(sanitized, activeOptions.endpointUrl);
  return sanitized;
}

/**
 * Returns recent errors from the in-memory ring buffer.
 */
export function getRecentErrors(): readonly SanitizedErrorEvent[] {
  return recentErrors;
}

/**
 * Clears the in-memory error ring buffer.
 */
export function clearRecentErrors(): void {
  recentErrors.length = 0;
}
