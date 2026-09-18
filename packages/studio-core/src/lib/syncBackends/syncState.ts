import { authRepository } from "../../repositories/AuthRepository";
import { Capacitor } from "@capacitor/core";
import { SyncBackendProvider, UserProfile, AppearanceSettings, UserPreferences, SyncDiagnostics, Unsubscribe, ProbeListener, DevicesListener, ProfileListener, AppearanceListener, PreferencesListener, DiagnosticsListener, SyncDevice, ProbeDoc } from "./types";
import { supabase, isSupabaseConfigured, setFirebaseIdToken, getSupabaseConfigDetails, getFirebaseIdToken } from "../supabaseClient";
import { getStableDeviceId, getDeviceDetails, classifyDeviceSession } from "../syncEngine";
import { APP_VERSION, APP_COMMIT_SHA } from "../appVersion";
export function stopFallbackPolling(provider: any) {
  if (provider.refetchInterval) {
    clearInterval(provider.refetchInterval);
    provider.refetchInterval = null;
  }
  provider.updateDiag({ fallbackPollingActive: false });
}

export function startFallbackPolling(provider: any, userId: string, reason = 'fallback') {
  // 1. Never poll if realtime is healthy
  if (provider.diagState?.realtimeConnected) {
    stopFallbackPolling(provider);
    return;
  }
  // 2. Never poll if user is logged out or mismatched
  if (!provider.userId || provider.userId !== userId) {
    stopFallbackPolling(provider);
    return;
  }
  // 3. Never poll if application is backgrounded
  if (provider.isForeground === false) {
    stopFallbackPolling(provider);
    return;
  }
  // 4. Never poll if device is offline
  if (provider.isOnline === false) {
    stopFallbackPolling(provider);
    return;
  }
  // 5. Prevent duplicate timers
  if (provider.refetchInterval) {
    return;
  }

  provider.updateDiag({
    fallbackPollingActive: true,
    lastFallbackPollAt: new Date().toLocaleString(),
  });

  // Conservative fallback interval: 30s instead of aggressive 15s
  provider.refetchInterval = setInterval(() => {
    // Re-verify guards before dispatching network calls
    if (
      provider.diagState?.realtimeConnected ||
      provider.isForeground === false ||
      provider.isOnline === false ||
      !provider.userId ||
      provider.userId !== userId
    ) {
      stopFallbackPolling(provider);
      return;
    }

    provider.updateDiag({ lastFallbackPollAt: new Date().toLocaleString() });
    provider.refetchAllData(userId, `fallback-poll:${reason}`);
  }, 30000);
}

export function clearSubscriptions(provider: any) {
  if (provider.subscriptionWatchdog) {
    clearTimeout(provider.subscriptionWatchdog);
    provider.subscriptionWatchdog = null;
  }
  if (provider.realtimeChannel) {
    provider.realtimeChannel.unsubscribe();
    provider.realtimeChannel = null;
  }
  stopFallbackPolling(provider);
  provider.diagState.realtimeConnected = false;
  provider.updateDiag({ realtimeConnected: false, fallbackPollingActive: false });
}

export function startPeriodicRefetch(provider: any, userId: string, reason = 'periodic-fallback') {
  startFallbackPolling(provider, userId, reason);
}

export async function refetchAllData(provider: any, userId: string, source: string) {
    if (!supabase) return;
    const nowStr = new Date().toLocaleString();
    provider.updateDiag({ lastManualRefetchAt: nowStr, lastAction: `Refetch data (${source})` });

    try {
      // 1. Fetch user profile
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (profile) {
        provider.updateDiag({
          cloudDisplayName: profile.display_name || 'N/A',
          cloudPhotoURL: profile.photo_url || 'N/A',
          profileLastSnapshotAt: nowStr,
          profileListenerStatus: 'active',
        });
        const mappedProfile: UserProfile = {
          displayName: profile.display_name,
          photoURL: profile.photo_url,
          avatarIcon: profile.avatar_icon,
        };
        provider.profileCallbacks.forEach((cb) => cb(mappedProfile));
      }

      // 2. Fetch appearance
      const { data: appearance, error: appearanceErr } = await supabase
        .from('user_appearance_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (appearanceErr) throw appearanceErr;
      if (appearance) {
        provider.updateDiag({
          cloudTheme: appearance.theme || 'N/A',
          appearanceLastSnapshotAt: nowStr,
          appearanceListenerStatus: 'active',
        });
        const mappedAppearance: AppearanceSettings = {
          theme: appearance.theme,
          palette: appearance.palette,
          language: appearance.language,
        };
        provider.appearanceCallbacks.forEach((cb) => cb(mappedAppearance));
      }

      // 3. Fetch preferences
      const { data: preferences, error: preferencesErr } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (preferencesErr) throw preferencesErr;
      if (preferences) {
        provider.updateDiag({
          cloudPreferences: preferences.studio_preferences || null,
          preferencesLastSnapshotAt: nowStr,
          preferencesListenerStatus: 'active',
        });
        const mappedPreferences: UserPreferences = {
          studioPreferences: preferences.studio_preferences,
          modulePreferences: preferences.module_preferences,
        };
        provider.preferencesCallbacks.forEach((cb) => cb(mappedPreferences));
      }

      // 4. Fetch devices
      const { data: devices, error: devicesErr } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId);
      if (devicesErr) throw devicesErr;
      if (devices) {
        const mappedDevices: SyncDevice[] = devices.map((d: any) => ({
          id: d.id,
          deviceId: d.device_id,
          userId: d.user_id,
          platform: d.platform || 'unknown',
          deviceType: d.device_type || 'desktop',
          shortName: d.short_name || 'Device',
          displayName: d.display_name || 'Device',
          technicalName: d.technical_name || 'Device',
          appVersion: d.app_version || 'N/A',
          versionCode: d.version_code || 0,
          buildType: d.build_type || 'Web',
          browser: d.browser || 'Browser',
          os: d.os || 'OS',
          model: d.model || 'Model',
          manufacturer: d.manufacturer || 'Manufacturer',
          signedIn: d.signed_in,
          currentSession: d.current_session,
          syncStatus: d.sync_status,
          classification: classifyDeviceSession(
            {
              deviceId: d.device_id,
              id: d.id,
              lastActiveAt: d.last_active_at ? new Date(d.last_active_at).getTime() : 0,
              signedIn: d.signed_in,
              currentSession: d.current_session,
              syncStatus: d.sync_status,
            },
            provider.deviceId
          ).classification,
          classificationReason: classifyDeviceSession(
            {
              deviceId: d.device_id,
              id: d.id,
              lastActiveAt: d.last_active_at ? new Date(d.last_active_at).getTime() : 0,
              signedIn: d.signed_in,
              currentSession: d.current_session,
              syncStatus: d.sync_status,
            },
            provider.deviceId
          ).reason,
        }));
        provider.updateDiag({
          devices: mappedDevices,
          devicesLastSnapshotAt: nowStr,
          devicesSnapshotCount: devices.length,
          devicesListenerStatus: 'active',
        });
        provider.devicesCallbacks.forEach((cb) => cb(mappedDevices));
      }

      // 5. Fetch probes
      const { data: probes, error: probesErr } = await supabase
        .from('sync_probe')
        .select('*')
        .eq('user_id', userId);
      if (probesErr) throw probesErr;
      if (probes) {
        const mappedProbes: ProbeDoc[] = probes.map((p: any) => ({
          id: p.id,
          deviceId: p.device_id,
          platform: p.platform || 'unknown',
          shortName: p.short_name || 'Unknown',
          appVersion: p.app_version || 'N/A',
          buildType: p.build_type || 'Web',
          nonce: p.nonce || 'None',
          writtenAt: p.written_at ? new Date(p.written_at).getTime() : Date.now(),
          updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
        }));

        const deviceIds = mappedProbes.map((p) => p.deviceId);
        const nonces = mappedProbes.map((p) => p.nonce);

        provider.updateDiag({
          probeDocs: mappedProbes,
          lastProbeSnapshotAt: nowStr,
          probeDocumentsReceived: probes.length,
          probeRowsReceived: probes.length,
          probeDeviceIdsReceived: deviceIds,
          probeNoncesReceived: nonces,
          androidProbeDetected: mappedProbes.some((p) => p.platform === 'android'),
          webProbeDetected: mappedProbes.some((p) => p.platform === 'web'),
          probeListenerStatus: 'active',
        });
        provider.probeCallbacks.forEach((cb) => cb(mappedProbes));
      }

      provider.updateDiag({
        lastSuccessfulSyncAt: nowStr,
        dbAvailable: true,
      });
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({
        lastErrorCode: e.code || 'fetch-error',
        lastErrorMessage: errorMsg,
      });
    }
  }

export function setupRealtimeAndPresence(provider: any, userId: string) {
    if (!supabase) return;
    provider.clearSubscriptions();

    provider.updateDiag({
      devicesListenerStatus: 'attaching',
      profileListenerStatus: 'attaching',
      appearanceListenerStatus: 'attaching',
      preferencesListenerStatus: 'attaching',
      probeListenerStatus: 'attaching',
      probeListenerAttachedAt: new Date().toLocaleString(),
    });

    // Initialize Realtime Channel
    provider.realtimeChannel = supabase.channel(`sync-realtime:${userId}`);

    provider.realtimeChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          provider.updateDiag({ lastRealtimeEventAt: new Date().toLocaleString() });
          provider.refetchAllData(userId, 'realtime-user-profiles-event');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_appearance_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          provider.updateDiag({ lastRealtimeEventAt: new Date().toLocaleString() });
          provider.refetchAllData(userId, 'realtime-appearance-event');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          provider.updateDiag({ lastRealtimeEventAt: new Date().toLocaleString() });
          provider.refetchAllData(userId, 'realtime-preferences-event');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_devices', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          provider.updateDiag({ lastRealtimeEventAt: new Date().toLocaleString() });
          provider.refetchAllData(userId, 'realtime-devices-event');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sync_probe', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          provider.updateDiag({ lastRealtimeEventAt: new Date().toLocaleString() });
          provider.refetchAllData(userId, 'realtime-probe-event');
        }
      )
      .subscribe((status: string) => {
        const isConnected = status === 'SUBSCRIBED';
        provider.updateDiag({ realtimeConnected: isConnected });
        if (isConnected) {
          if (provider.subscriptionWatchdog) {
            clearTimeout(provider.subscriptionWatchdog);
            provider.subscriptionWatchdog = null;
          }
          stopFallbackPolling(provider);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startFallbackPolling(provider, userId, `status-${status}`);
        }
      });

    // Connection watchdog: If channel fails to reach SUBSCRIBED within 8s, activate fallback polling
    provider.subscriptionWatchdog = setTimeout(() => {
      provider.subscriptionWatchdog = null;
      if (!provider.diagState?.realtimeConnected && provider.userId === userId) {
        startFallbackPolling(provider, userId, 'subscription-timeout');
      }
    }, 8000);

    // Initial Fetch
    provider.refetchAllData(userId, 'realtime-initial-mount');
  }

export function subscribeProfile(provider: any, callback: ProfileListener): Unsubscribe {
    provider.profileCallbacks.add(callback);
    return () => {
      provider.profileCallbacks.delete(callback);
    };
  }

export function subscribeAppearanceSettings(provider: any, callback: AppearanceListener): Unsubscribe {
    provider.appearanceCallbacks.add(callback);
    return () => {
      provider.appearanceCallbacks.delete(callback);
    };
  }

export function subscribePreferences(provider: any, callback: PreferencesListener): Unsubscribe {
    provider.preferencesCallbacks.add(callback);
    return () => {
      provider.preferencesCallbacks.delete(callback);
    };
  }

export function subscribeDevices(provider: any, callback: DevicesListener): Unsubscribe {
    provider.devicesCallbacks.add(callback);
    return () => {
      provider.devicesCallbacks.delete(callback);
    };
  }

export function subscribeSyncProbe(provider: any, callback: ProbeListener): Unsubscribe {
    provider.probeCallbacks.add(callback);
    return () => {
      provider.probeCallbacks.delete(callback);
    };
  }

export async function getProfile(provider: any): Promise<UserProfile | null> {
    const uid = provider.userId;
    if (!supabase || !uid) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            displayName: data.display_name,
            photoURL: data.photo_url,
            avatarIcon: data.avatar_icon,
          }
        : null;
    } catch (e: any) {
      provider.processError(e);
      return null;
    }
  }

export async function getAppearanceSettings(provider: any): Promise<AppearanceSettings | null> {
    const uid = provider.userId;
    if (!supabase || !uid) return null;

    try {
      const { data, error } = await supabase
        .from('user_appearance_settings')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
             theme: data.theme,
             palette: data.palette,
             language: data.language,
          }
        : null;
    } catch (e: any) {
      provider.processError(e);
      return null;
    }
  }

export async function getPreferences(provider: any): Promise<UserPreferences | null> {
    const uid = provider.userId;
    if (!supabase || !uid) return null;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            studioPreferences: data.studio_preferences,
            modulePreferences: data.module_preferences,
          }
        : null;
    } catch (e: any) {
      provider.processError(e);
      return null;
    }
  }

