import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initDevToolsFramework,
  addLog,
  addError,
  recordEvent,
  recordNavigation,
  recordNetworkRequest,
  recordNetworkResponse,
  recordNetworkFailure,
  recordPerfEvent,
  registerDebugProvider,
  getLogs,
  getErrors,
  getEvents,
  getNavigationEntries,
  getNetworkRequests,
  getPerfStats,
  clearLogs,
  clearErrors,
  clearEvents,
  clearNavigationEntries,
  clearNetworkRequests,
} from '../devTools';

describe('DevTools Production Invariance & Fail-Closed Behavior', () => {
  const originalEnvDev = import.meta.env.DEV;

  beforeEach(() => {
    clearLogs();
    clearErrors();
    clearEvents();
    clearNavigationEntries();
    clearNetworkRequests();
  });

  afterEach(() => {
    (import.meta.env as any).DEV = originalEnvDev;
    vi.restoreAllMocks();
  });

  it('fails closed in production: returns immediately and does not monkey-patch console or fetch', () => {
    (import.meta.env as any).DEV = false;

    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      fetch: vi.fn(),
    };
    (globalThis as any).window = (globalThis as any).window || mockWindow;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalFetch = window.fetch;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initDevToolsFramework();

    // Verify console is completely untouched
    expect(console.log).toBe(originalLog);
    expect(console.warn).toBe(originalWarn);
    expect(console.error).toBe(originalError);

    // Verify window.fetch is completely untouched
    expect(window.fetch).toBe(originalFetch);

    // Verify no global capture listeners are registered on window
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('fails closed in production: diagnostic logging and capture functions do not allocate buffers', () => {
    (import.meta.env as any).DEV = false;

    addLog('info', 'test-module', 'should be discarded');
    expect(getLogs()).toHaveLength(0);

    addError({
      message: 'should be discarded',
      stack: '',
      source: 'test',
      module: 'test',
    });
    expect(getErrors()).toHaveLength(0);

    recordEvent('click', 'button#save', 'hub');
    expect(getEvents()).toHaveLength(0);

    recordNavigation({
      fromApp: 'hub',
      toApp: 'chordex',
      activeAppAfterTransition: 'chordex',
      transitionLockState: false,
      fallbackRendered: false,
    });
    expect(getNavigationEntries()).toHaveLength(0);

    const reqId = recordNetworkRequest('GET', 'https://example.com/api');
    expect(reqId).toBe('');
    expect(getNetworkRequests()).toHaveLength(0);

    recordNetworkResponse(reqId, 200, 'OK');
    recordNetworkFailure(reqId, 'Failed to fetch');
    expect(getNetworkRequests()).toHaveLength(0);

    recordPerfEvent('TestComponent', 'mount');
    expect(getPerfStats().size).toBe(0);

    registerDebugProvider({
      id: 'test-provider',
      name: 'Test Provider',
      getDebugState: () => ({ status: 'active' }),
    });
  });

  it('functions normally in development mode', () => {
    (import.meta.env as any).DEV = true;

    recordEvent('click', 'button#dev', 'test');
    expect(getEvents().length).toBeGreaterThanOrEqual(1);
    expect(getEvents()[0].target).toBe('button#dev');
  });
});
