import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startFallbackPolling,
  stopFallbackPolling,
  startHeartbeat,
  stopHeartbeat,
  clearSubscriptions,
  setupRealtimeAndPresence,
} from '../syncState';
import { init, dispose } from '../syncAuth';
import { supabase } from '../../supabaseClient';

// Mock dependencies with correct relative paths from __tests__/
let channelSubscribeCallback: ((status: string) => void) | null = null;
const mockChannel: any = {
  on: vi.fn(() => mockChannel),
  subscribe: vi.fn((cb: (status: string) => void) => {
    channelSubscribeCallback = cb;
    return mockChannel;
  }),
  unsubscribe: vi.fn(),
};

vi.mock('../../supabaseClient', () => {
  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
      })),
    },
    isSupabaseConfigured: true,
    setFirebaseIdToken: vi.fn(),
    getFirebaseIdToken: vi.fn().mockReturnValue('mock-token'),
    getSupabaseConfigDetails: vi.fn().mockReturnValue({
      supabaseUrlConfigured: true,
      supabaseUrlHost: 'test.supabase.co',
      supabaseAnonKeyConfigured: true,
      supabaseAnonKeyPrefix: 'test-key',
      supabaseAnonKeyLength: 20,
      supabaseClientReady: true,
      supabaseInitError: 'None',
      firebaseAuthBridgeReady: true,
    }),
  };
});

vi.mock('../../firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
    },
  })),
  getFirebaseConfigDetails: vi.fn().mockReturnValue({
    appsCount: 1,
    appName: 'default',
    projectId: 'test-proj',
    appId: 'test-app',
  }),
}));

const mockAuthSubscribers = new Set<(user: any) => void>();
vi.mock('../../../repositories/AuthRepository', () => ({
  authRepository: {
    subscribeAuth: vi.fn((cb) => {
      mockAuthSubscribers.add(cb);
      return () => mockAuthSubscribers.delete(cb);
    }),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../syncEngine', () => ({
  getStableDeviceId: vi.fn().mockReturnValue('mock-device-id'),
  getDeviceDetails: vi.fn().mockReturnValue({ shortName: 'MockDevice' }),
  classifyDeviceSession: vi.fn().mockReturnValue({ classification: 'active', reason: 'ok' }),
}));

describe('SupabaseRealtime Sync Traffic & Connection-Gated Fallback', () => {
  let mockProvider: any;
  let originalWindow: any;
  let originalDocument: any;
  let windowListeners: Record<string, Function[]>;
  let documentListeners: Record<string, Function[]>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAuthSubscribers.clear();
    channelSubscribeCallback = null;

    windowListeners = {};
    documentListeners = {};

    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;

    (globalThis as any).window = {
      addEventListener: vi.fn((event: string, cb: Function) => {
        windowListeners[event] = windowListeners[event] || [];
        windowListeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: Function) => {
        if (windowListeners[event]) {
          windowListeners[event] = windowListeners[event].filter((fn) => fn !== cb);
        }
      }),
      dispatchEvent: vi.fn((event: { type: string }) => {
        windowListeners[event.type]?.forEach((cb) => cb());
        return true;
      }),
    };

    (globalThis as any).document = {
      visibilityState: 'visible',
      addEventListener: vi.fn((event: string, cb: Function) => {
        documentListeners[event] = documentListeners[event] || [];
        documentListeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: Function) => {
        if (documentListeners[event]) {
          documentListeners[event] = documentListeners[event].filter((fn) => fn !== cb);
        }
      }),
      dispatchEvent: vi.fn((event: { type: string }) => {
        documentListeners[event.type]?.forEach((cb) => cb());
        return true;
      }),
    };

    mockProvider = {
      userId: 'test-user-123',
      deviceId: 'mock-device-id',
      versionCode: 1,
      isForeground: true,
      isOnline: true,
      authEpoch: 0,
      realtimeChannel: null,
      refetchInterval: null,
      heartbeatInterval: null,
      subscriptionWatchdog: null,
      lifecycleCleanups: [],
      unsubs: [],
      diagState: {
        realtimeConnected: false,
        fallbackPollingActive: false,
      },
      devicesCallbacks: new Set(),
      profileCallbacks: new Set(),
      appearanceCallbacks: new Set(),
      preferencesCallbacks: new Set(),
      probeCallbacks: new Set(),
      diagnosticsCallbacks: new Set(),
      updateDiag: vi.fn((patch: any) => {
        Object.assign(mockProvider.diagState, patch);
      }),
      refetchAllData: vi.fn(),
      clearSubscriptions: vi.fn(() => {
        clearSubscriptions(mockProvider);
      }),
      startFallbackPolling: vi.fn((userId: string, reason?: string) => {
        startFallbackPolling(mockProvider, userId, reason);
      }),
      stopFallbackPolling: vi.fn(() => {
        stopFallbackPolling(mockProvider);
      }),
      startHeartbeat: vi.fn((userId: string, reason?: string) => {
        startHeartbeat(mockProvider, userId, reason);
      }),
      stopHeartbeat: vi.fn(() => {
        stopHeartbeat(mockProvider);
      }),
      setupRealtimeAndPresence: vi.fn((userId: string) => {
        setupRealtimeAndPresence(mockProvider, userId);
      }),
      registerCurrentDevice: vi.fn().mockResolvedValue({ success: true }),
      heartbeatNow: vi.fn().mockResolvedValue({ success: true }),
      reconnectDevices: vi.fn().mockResolvedValue(undefined),
      processError: vi.fn((e) => e.message || String(e)),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();

    if (originalWindow !== undefined) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }

    if (originalDocument !== undefined) {
      (globalThis as any).document = originalDocument;
    } else {
      delete (globalThis as any).document;
    }
  });

  describe('Fallback Polling Guards & State Transitions', () => {
    it('does NOT start fallback polling when realtime connection is healthy', () => {
      mockProvider.diagState.realtimeConnected = true;

      startFallbackPolling(mockProvider, 'test-user-123', 'test');

      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
    });

    it('does NOT start fallback polling when user is logged out or mismatched', () => {
      mockProvider.diagState.realtimeConnected = false;
      mockProvider.userId = null;

      startFallbackPolling(mockProvider, 'test-user-123', 'test');
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);

      // User ID mismatch
      mockProvider.userId = 'different-user';
      startFallbackPolling(mockProvider, 'test-user-123', 'test');
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
    });

    it('does NOT start fallback polling when application is backgrounded', () => {
      mockProvider.diagState.realtimeConnected = false;
      mockProvider.isForeground = false;

      startFallbackPolling(mockProvider, 'test-user-123', 'test');

      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
    });

    it('does NOT start fallback polling when device is offline', () => {
      mockProvider.diagState.realtimeConnected = false;
      mockProvider.isOnline = false;

      startFallbackPolling(mockProvider, 'test-user-123', 'test');

      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
    });

    it('starts fallback polling with conservative 30s interval when realtime is disconnected', () => {
      mockProvider.diagState.realtimeConnected = false;
      mockProvider.isForeground = true;
      mockProvider.isOnline = true;
      mockProvider.userId = 'test-user-123';

      startFallbackPolling(mockProvider, 'test-user-123', 'disconnected');

      expect(mockProvider.refetchInterval).not.toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(true);
      expect(mockProvider.diagState.lastFallbackPollAt).toBeDefined();

      // Before 30s, no poll
      vi.advanceTimersByTime(29999);
      expect(mockProvider.refetchAllData).not.toHaveBeenCalled();

      // At 30s, refetchAllData fires with fallback-poll reason
      vi.advanceTimersByTime(1);
      expect(mockProvider.refetchAllData).toHaveBeenCalledTimes(1);
      expect(mockProvider.refetchAllData).toHaveBeenCalledWith(
        'test-user-123',
        'fallback-poll:disconnected'
      );
    });

    it('prevents duplicate timers when startFallbackPolling is called multiple times', () => {
      mockProvider.diagState.realtimeConnected = false;

      startFallbackPolling(mockProvider, 'test-user-123', 'first-call');
      const firstTimerId = mockProvider.refetchInterval;
      expect(firstTimerId).not.toBeNull();

      // Call again while active
      startFallbackPolling(mockProvider, 'test-user-123', 'second-call');
      expect(mockProvider.refetchInterval).toBe(firstTimerId);

      // Advance by 30s, should only fire once per tick
      vi.advanceTimersByTime(30000);
      expect(mockProvider.refetchAllData).toHaveBeenCalledTimes(1);
    });

    it('self-terminates the interval tick if realtime reconnects in the background', () => {
      mockProvider.diagState.realtimeConnected = false;
      startFallbackPolling(mockProvider, 'test-user-123', 'fallback');
      expect(mockProvider.refetchInterval).not.toBeNull();

      // Realtime reconnects before next tick
      mockProvider.diagState.realtimeConnected = true;

      vi.advanceTimersByTime(30000);

      // Interval should have terminated itself without fetching
      expect(mockProvider.refetchAllData).not.toHaveBeenCalled();
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
    });

    it('stopFallbackPolling clears the interval and updates diagnostics', () => {
      mockProvider.diagState.realtimeConnected = false;
      startFallbackPolling(mockProvider, 'test-user-123', 'fallback');
      expect(mockProvider.refetchInterval).not.toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(true);

      stopFallbackPolling(mockProvider);

      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);

      // Advancing time does not trigger any refetch
      vi.advanceTimersByTime(60000);
      expect(mockProvider.refetchAllData).not.toHaveBeenCalled();
    });
  });

  describe('setupRealtimeAndPresence Channel Transitions', () => {
    it('clears fallback polling immediately when channel reaches SUBSCRIBED', () => {
      // Start with fallback polling active
      mockProvider.diagState.realtimeConnected = false;
      startFallbackPolling(mockProvider, 'test-user-123', 'initial-state');
      expect(mockProvider.refetchInterval).not.toBeNull();

      setupRealtimeAndPresence(mockProvider, 'test-user-123');

      // Simulate WebSocket channel connecting successfully
      expect(channelSubscribeCallback).not.toBeNull();
      channelSubscribeCallback!('SUBSCRIBED');

      expect(mockProvider.diagState.realtimeConnected).toBe(true);
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
      expect(mockProvider.subscriptionWatchdog).toBeNull();
    });

    it('activates fallback polling when channel status drops to CHANNEL_ERROR or CLOSED', () => {
      setupRealtimeAndPresence(mockProvider, 'test-user-123');

      // WebSocket drops
      expect(channelSubscribeCallback).not.toBeNull();
      channelSubscribeCallback!('CHANNEL_ERROR');

      expect(mockProvider.diagState.realtimeConnected).toBe(false);
      expect(mockProvider.refetchInterval).not.toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(true);
    });

    it('activates fallback polling if subscription watchdog times out (8s)', () => {
      // Don't invoke channelSubscribeCallback (simulates stalled socket)
      setupRealtimeAndPresence(mockProvider, 'test-user-123');

      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.subscriptionWatchdog).not.toBeNull();

      // Advance watchdog timeout (8s)
      vi.advanceTimersByTime(8000);

      expect(mockProvider.subscriptionWatchdog).toBeNull();
      expect(mockProvider.refetchInterval).not.toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(true);
    });
  });

  describe('Lifecycle Events & App State Management', () => {
    it('stops fallback polling when tab is hidden and recovers on visible', async () => {
      await init(mockProvider);

      // Simulate logged in user with disconnected realtime
      mockProvider.diagState.realtimeConnected = false;
      startFallbackPolling(mockProvider, 'test-user-123', 'disconnected');
      expect(mockProvider.refetchInterval).not.toBeNull();

      // Document hidden
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockProvider.isForeground).toBe(false);
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);

      // Document returns to visible
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockProvider.isForeground).toBe(true);
      // Because realtime was disconnected, foreground recovery triggers refetch and resumes fallback
      expect(mockProvider.refetchAllData).toHaveBeenCalledWith(
        'test-user-123',
        'foreground-recovery'
      );
      expect(mockProvider.refetchInterval).not.toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(true);

      await dispose(mockProvider);
    });

    it('stops fallback polling when device goes offline and reconnects when online', async () => {
      await init(mockProvider);

      mockProvider.diagState.realtimeConnected = false;
      startFallbackPolling(mockProvider, 'test-user-123', 'disconnected');
      expect(mockProvider.refetchInterval).not.toBeNull();

      // Network drops
      window.dispatchEvent(new Event('offline'));

      expect(mockProvider.isOnline).toBe(false);
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);

      // Network recovers
      window.dispatchEvent(new Event('online'));

      expect(mockProvider.isOnline).toBe(true);
      expect(mockProvider.reconnectDevices).toHaveBeenCalled();

      await dispose(mockProvider);
    });

    it('guards against rapid logout during async token acquisition (authEpoch)', async () => {
      await init(mockProvider);

      // Get the auth subscriber registered by init
      expect(mockAuthSubscribers.size).toBe(1);
      const authSubscriber = Array.from(mockAuthSubscribers)[0];

      // Trigger login
      const loginPromise = authSubscriber({
        uid: 'user-A',
        email: 'userA@example.com',
      });

      // Immediately trigger logout before login async resolves
      authSubscriber(null);

      await loginPromise;

      // User must remain logged out and no polling intervals active
      expect(mockProvider.userId).toBeNull();
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);
      expect(mockProvider.diagState.realtimeConnected).toBe(false);

      await dispose(mockProvider);
    });
  });

  describe('Zero-Query Guarantee in Healthy Session', () => {
    it('produces ZERO periodic refetch queries when realtime is connected', async () => {
      await init(mockProvider);

      const authSubscriber = Array.from(mockAuthSubscribers)[0];
      await authSubscriber({
        uid: 'user-test',
        email: 'test@example.com',
      });

      // Simulate channel reaching SUBSCRIBED
      if (channelSubscribeCallback) {
        channelSubscribeCallback('SUBSCRIBED');
      }

      // Initial mount refetch is permitted once
      const initialCallCount = mockProvider.refetchAllData.mock.calls.length;

      // Ensure no fallback polling was started
      expect(mockProvider.refetchInterval).toBeNull();
      expect(mockProvider.diagState.fallbackPollingActive).toBe(false);

      // Advance time by 5 minutes (300 seconds)
      vi.advanceTimersByTime(300000);

      // Verify ZERO additional database refetch queries were dispatched!
      expect(mockProvider.refetchAllData.mock.calls.length).toBe(initialCallCount);

      await dispose(mockProvider);
    });
  });

  describe('Device Heartbeat Lifecycle & Visibility Gating', () => {
    it('starts heartbeat timer on authenticated foreground login and ticks every 60s', async () => {
      await init(mockProvider);

      const authSubscriber = Array.from(mockAuthSubscribers)[0];
      await authSubscriber({
        uid: 'test-user-123',
        email: 'test@example.com',
      });

      // Initial heartbeatNow('init-auth') called
      expect(mockProvider.heartbeatNow).toHaveBeenCalledWith('init-auth');
      expect(mockProvider.heartbeatInterval).not.toBeNull();

      const callCountBefore = mockProvider.heartbeatNow.mock.calls.length;

      // Advance by 60 seconds
      vi.advanceTimersByTime(60000);
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(callCountBefore + 1);

      // Advance by another 60 seconds
      vi.advanceTimersByTime(60000);
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(callCountBefore + 2);

      await dispose(mockProvider);
    });

    it('suspends heartbeat when application is backgrounded and resumes on foreground', async () => {
      await init(mockProvider);

      const authSubscriber = Array.from(mockAuthSubscribers)[0];
      await authSubscriber({
        uid: 'test-user-123',
        email: 'test@example.com',
      });
      mockProvider.diagState.realtimeConnected = true;

      expect(mockProvider.heartbeatInterval).not.toBeNull();

      // App goes to background
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockProvider.isForeground).toBe(false);
      expect(mockProvider.heartbeatInterval).toBeNull();

      const callCountWhileHidden = mockProvider.heartbeatNow.mock.calls.length;

      // Advance timers by 3 minutes (180s) while in background
      vi.advanceTimersByTime(180000);

      // No periodic ticks occurred while hidden
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(callCountWhileHidden);

      // App returns to foreground
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockProvider.isForeground).toBe(true);
      expect(mockProvider.heartbeatInterval).not.toBeNull();

      // Foreground-liveness heartbeat sent
      expect(mockProvider.heartbeatNow).toHaveBeenCalledWith('foreground-liveness');

      // Subsequent 60s tick resumes
      const callCountAfterResume = mockProvider.heartbeatNow.mock.calls.length;
      vi.advanceTimersByTime(60000);
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(callCountAfterResume + 1);

      await dispose(mockProvider);
    });

    it('suspends heartbeat when device goes offline and resumes when online', async () => {
      await init(mockProvider);

      const authSubscriber = Array.from(mockAuthSubscribers)[0];
      await authSubscriber({
        uid: 'test-user-123',
        email: 'test@example.com',
      });

      expect(mockProvider.heartbeatInterval).not.toBeNull();

      // Network goes offline
      window.dispatchEvent(new Event('offline'));

      expect(mockProvider.isOnline).toBe(false);
      expect(mockProvider.heartbeatInterval).toBeNull();

      const countOffline = mockProvider.heartbeatNow.mock.calls.length;
      vi.advanceTimersByTime(120000);
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(countOffline);

      // Network comes back online
      window.dispatchEvent(new Event('online'));

      expect(mockProvider.isOnline).toBe(true);
      expect(mockProvider.heartbeatInterval).not.toBeNull();

      // Ticks resume
      vi.advanceTimersByTime(60000);
      expect(mockProvider.heartbeatNow.mock.calls.length).toBe(countOffline + 1);

      await dispose(mockProvider);
    });

    it('deduplicates heartbeat intervals when startHeartbeat is called repeatedly', () => {
      mockProvider.userId = 'test-user-123';
      mockProvider.isForeground = true;
      mockProvider.isOnline = true;

      startHeartbeat(mockProvider, 'test-user-123');
      const firstInterval = mockProvider.heartbeatInterval;
      expect(firstInterval).not.toBeNull();

      // Call startHeartbeat again
      startHeartbeat(mockProvider, 'test-user-123');
      expect(mockProvider.heartbeatInterval).toBe(firstInterval);

      stopHeartbeat(mockProvider);
      expect(mockProvider.heartbeatInterval).toBeNull();
    });

    it('cleans up heartbeat on user logout and dispose', async () => {
      await init(mockProvider);

      const authSubscriber = Array.from(mockAuthSubscribers)[0];
      await authSubscriber({
        uid: 'test-user-123',
        email: 'test@example.com',
      });

      expect(mockProvider.heartbeatInterval).not.toBeNull();

      // Logout
      await authSubscriber(null);

      expect(mockProvider.userId).toBeNull();
      expect(mockProvider.heartbeatInterval).toBeNull();

      await dispose(mockProvider);
      expect(mockProvider.heartbeatInterval).toBeNull();
    });
  });
});
