import { authRepository } from "../../repositories/AuthRepository";
import { Capacitor } from "@capacitor/core";
import { SyncDiagnostics } from "./types";
import { setFirebaseIdToken, getSupabaseConfigDetails, getFirebaseIdToken } from "../supabaseClient";
import { getFirebaseAuth, getFirebaseConfigDetails } from "../firebase";
import { getStableDeviceId } from "../syncEngine";
export async function init(provider: any): Promise<void> {
    provider.deviceId = getStableDeviceId();
    provider.diagState.currentDeviceId = provider.deviceId;

    if (Capacitor.isNativePlatform()) {
      try {
        const { AppInstaller } = await import('../apkDownloader');
        const installedDetails = await AppInstaller.getInstalledAppDetails();
        provider.versionCode = installedDetails.versionCode || 0;
        provider.diagState.versionCode = provider.versionCode;
      } catch (e) {
      }
    }

    // Subscribe to Firebase Auth and dynamically acquire the token
    const unsubAuth = authRepository.subscribeAuth(async (user) => {
      const currentEpoch = ++provider.authEpoch;

      if (user) {
        provider.userId = user.uid;
        provider.diagState.firebaseAuthUid = user.uid;
        provider.diagState.supabaseUserId = user.uid;
        provider.diagState.authUid = user.uid;
        provider.diagState.authEmail = user.email || 'N/A';
        provider.diagState.authReady = true;
        provider.diagState.syncEngineStatus = 'active';
        provider.diagState.lastAuthChangeAt = new Date().toLocaleString();

        try {
          const rawUser = getFirebaseAuth()?.currentUser;
          if (!rawUser) throw new Error('No active Firebase user instance');
          const token = await rawUser.getIdToken();
          if (provider.authEpoch !== currentEpoch || provider.userId !== user.uid) return;

          setFirebaseIdToken(token);
          provider.diagState.firestoreInitSource = 'firebase-auth-token-bridged';

          // Setup Realtime Channels and Initial registration
          provider.setupRealtimeAndPresence(user.uid);
          await provider.registerCurrentDevice('init-auth');
          if (provider.authEpoch !== currentEpoch || provider.userId !== user.uid) return;

          await provider.heartbeatNow('init-auth');
          if (provider.authEpoch !== currentEpoch || provider.userId !== user.uid) return;

          // Note: Unconditional startPeriodicRefetch removed. Fallback polling only
          // activates if the realtime channel fails, drops, or times out.
        } catch (e: any) {
          console.error('[supabaseRealtime] Token retrieval failed:', e);
          const errorMsg = provider.processError(e);
          provider.updateDiag({
            syncEngineInitError: errorMsg,
            syncEngineStatus: 'error',
          });
        }
      } else {
        provider.userId = null;
        setFirebaseIdToken(null);
        provider.clearSubscriptions();
        provider.diagState.firebaseAuthUid = 'Not signed in';
        provider.diagState.supabaseUserId = 'N/A';
        provider.diagState.authUid = 'Not signed in';
        provider.diagState.authEmail = 'N/A';
        provider.diagState.authReady = false;
        provider.diagState.syncEngineStatus = 'inactive';
        provider.diagState.lastAuthChangeAt = new Date().toLocaleString();
        provider.updateDiag({});
      }
    });

    // Lifecycle & Network Listeners
    if (typeof document !== 'undefined') {
      const onVisibility = () => {
        const isVisible = document.visibilityState === 'visible';
        provider.isForeground = isVisible;
        if (!isVisible) {
          provider.stopFallbackPolling();
        } else if (provider.userId) {
          if (provider.diagState?.realtimeConnected) {
            provider.heartbeatNow('foreground-liveness').catch(() => {});
          } else {
            provider.refetchAllData(provider.userId, 'foreground-recovery');
            provider.startFallbackPolling(provider.userId, 'foreground-resume');
          }
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      provider.lifecycleCleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
    }

    if (typeof window !== 'undefined') {
      const onOnline = () => {
        provider.isOnline = true;
        if (provider.userId) {
          if (!provider.diagState?.realtimeConnected) {
            provider.reconnectDevices().catch(() => {});
          }
        }
      };
      const onOffline = () => {
        provider.isOnline = false;
        provider.stopFallbackPolling();
      };
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      provider.lifecycleCleanups.push(() => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      });
    }

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app')
        .then(({ App }) => {
          App.addListener('appStateChange', (state) => {
            const isVisible = state.isActive;
            provider.isForeground = isVisible;
            if (!isVisible) {
              provider.stopFallbackPolling();
            } else if (provider.userId) {
              if (provider.diagState?.realtimeConnected) {
                provider.heartbeatNow('app-active-liveness').catch(() => {});
              } else {
                provider.refetchAllData(provider.userId, 'app-active-recovery');
                provider.startFallbackPolling(provider.userId, 'app-active-resume');
              }
            }
          }).then((handle) => {
            provider.lifecycleCleanups.push(() => handle.remove());
          });
        })
        .catch(() => {});
    }

    provider.unsubs.push(() => {
      unsubAuth();
      provider.clearSubscriptions();
    });
  }

export async function dispose(provider: any): Promise<void> {
    provider.unsubs.forEach((u: any) => u());
    provider.unsubs = [];
    if (provider.lifecycleCleanups) {
      provider.lifecycleCleanups.forEach((c: any) => c());
      provider.lifecycleCleanups = [];
    }
    provider.clearSubscriptions();
  }

export async function getCurrentUserId(provider: any): Promise<string | null> {
    return provider.userId;
  }

export function updateDiag(provider: any, patch: Partial<SyncDiagnostics>) {
    const configDetails = getSupabaseConfigDetails();
    const fbDetails = getFirebaseConfigDetails();
    const firebaseIdTokenAvailable = getFirebaseIdToken() ? 'Yes' : 'No';

    // Firebase Diagnostics mapping
    const firebaseDiag = {
      firebaseAppsCount: fbDetails.appsCount,
      firebaseAppName: fbDetails.appName,
      firebaseProjectId: fbDetails.projectId,
      firebaseAppId: fbDetails.appId,
      firebaseAuthAvailable: Boolean(getFirebaseAuth()),
      firebaseAuthUid: provider.userId || 'Not signed in',
      firebaseIdTokenAvailable,
    };

    // Supabase Diagnostics mapping
    const uid = provider.userId;
    const deviceId = provider.deviceId;

    // Check if client is actually ready and URL/Anon key are configured
    const clientReady = configDetails.supabaseClientReady;

    // supabaseDbAvailable: Yes only if Supabase client exists AND can attempt a query (i.e. is ready). If client is not ready, it must be false/No.
    const supabaseDbAvailable = clientReady;
    const supabaseStorageAvailable = clientReady;

    const supabaseDiag = {
      supabaseUrlConfigured: configDetails.supabaseUrlConfigured,
      supabaseUrlHost: configDetails.supabaseUrlHost,
      supabaseAnonKeyConfigured: configDetails.supabaseAnonKeyConfigured,
      supabaseAnonKeyPrefix: configDetails.supabaseAnonKeyPrefix,
      supabaseAnonKeyLength: configDetails.supabaseAnonKeyLength,
      supabaseClientReady: clientReady,
      supabaseAuthBridgeReady: configDetails.firebaseAuthBridgeReady,
      supabaseUserId: uid || 'N/A',
      mappedUserId: uid || 'N/A',
      rlsUserId: uid || 'N/A',
      activeSyncProvider: 'supabase-realtime',
      databaseProvider: 'supabase',
      supabaseDbAvailable,
      supabaseStorageAvailable,
      supabaseAuthStrategy: 'Third-Party Auth (Firebase Auth Token)',

      probeTable: 'sync_probe',
      probeRowId: uid && deviceId ? `${uid}:${deviceId}` : 'N/A',
      devicesTable: 'user_devices',
      deviceRowId: uid && deviceId ? `${uid}:${deviceId}` : 'N/A',
      directWriteTable: 'debug_writes',
      directWriteRowId: uid && deviceId ? `${uid}:${deviceId}` : 'N/A',
      profileTable: 'user_profiles',
      appearanceTable: 'user_appearance_settings',
      preferencesTable: 'user_preferences',
      versionCode: provider.versionCode,
    };

    provider.diagState = {
      ...provider.diagState,
      ...firebaseDiag,
      ...supabaseDiag,
      ...configDetails, // Overwrite with actual supabaseClient config details
      ...patch,
    } as SyncDiagnostics;

    provider.diagState.activeListenerCount =
      (provider.devicesCallbacks.size > 0 ? 1 : 0) +
      (provider.profileCallbacks.size > 0 ? 1 : 0) +
      (provider.appearanceCallbacks.size > 0 ? 1 : 0) +
      (provider.preferencesCallbacks.size > 0 ? 1 : 0) +
      (provider.probeCallbacks.size > 0 ? 1 : 0);

    provider.diagnosticsCallbacks.forEach((cb) => cb(provider.diagState as SyncDiagnostics));
  }

