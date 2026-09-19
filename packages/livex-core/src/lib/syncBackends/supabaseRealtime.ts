import { authRepository } from "../../repositories/AuthRepository";
import { Capacitor } from "@capacitor/core";
import { SyncBackendProvider, UserProfile, AppearanceSettings, UserPreferences, SyncDiagnostics, Unsubscribe, ProbeListener, DevicesListener, ProfileListener, AppearanceListener, PreferencesListener, DiagnosticsListener, SyncDevice, ProbeDoc } from "./types";
import { supabase, isSupabaseConfigured, setFirebaseIdToken, getSupabaseConfigDetails, getFirebaseIdToken } from "../supabaseClient";

import { getStableDeviceId, getDeviceDetails, classifyDeviceSession } from "../syncEngine";
import { APP_VERSION, APP_COMMIT_SHA } from "../appVersion";
import { init, dispose, getCurrentUserId, updateDiag } from "./syncAuth";
import { clearSubscriptions, startPeriodicRefetch, startFallbackPolling, stopFallbackPolling, refetchAllData, setupRealtimeAndPresence, subscribeProfile, subscribeAppearanceSettings, subscribePreferences, subscribeDevices, subscribeSyncProbe, getProfile, getAppearanceSettings, getPreferences } from "./syncState";
import { updateProfile, updateAppearanceSettings, updatePreferences, registerCurrentDevice, heartbeatNow } from "./syncConflictResolution";

export class SupabaseRealtimeProvider implements SyncBackendProvider {
  providerName = 'supabase-realtime';

  userId: string | null = null;
  deviceId: string = 'unknown';
  versionCode: number = 0;
  unsubs: Unsubscribe[] = [];

  // Callbacks
  devicesCallbacks = new Set<DevicesListener>();
  profileCallbacks = new Set<ProfileListener>();
  appearanceCallbacks = new Set<AppearanceListener>();
  preferencesCallbacks = new Set<PreferencesListener>();
  probeCallbacks = new Set<ProbeListener>();
  diagnosticsCallbacks = new Set<DiagnosticsListener>();

  // Diagnostic State
  diagState: Partial<SyncDiagnostics> = {
    activeSyncProvider: 'supabase-realtime',
    authProvider: 'firebase',
    databaseProvider: 'supabase',
    storageProvider: 'supabase-storage',
    localDatabaseProvider: 'none',
    firebaseAuthUid: 'Not signed in',
    supabaseUserId: 'N/A',
    currentDeviceId: 'Unknown',
    currentPlatform: Capacitor.isNativePlatform() ? 'android' : 'web',
    directWriteProvider: 'supabase',
    directWriteResult: 'idle',
    probeProvider: 'supabase',
    probeResult: 'idle',
    devicesProvider: 'supabase',
    devicesResult: 'idle',
    profileSyncResult: 'idle',
    appearanceSyncResult: 'idle',
    lastErrorCode: 'None',
    lastErrorMessage: 'None',
    lastSuccessfulSyncAt: 'Never',
    syncBackendVersion: 'supabase-v1',
    realtimeConnected: false,
    lastRealtimeEventAt: 'Never',
    lastManualRefetchAt: 'Never',

    // UI Back-compat defaults
    authReady: false,
    authUid: 'Not signed in',
    authEmail: 'N/A',
    syncEngineStatus: 'inactive',
    activeListenerCount: 0,
    lastAuthChangeAt: 'Never',
    firebaseAppsCount: 0,
    firebaseAppName: 'None',
    firebaseProjectId: 'N/A',
    firebaseAppId: 'N/A',
    firebaseAuthDomain: 'N/A',
    firebaseStorageBucket: 'N/A',
    dbAvailable: false,
    authAvailable: false,
    storageAvailable: false,
    firebaseInitError: 'None',
    syncEngineInitError: 'None',
    devicesLogicVersion: 'devices-v3.6.12-supabase',
    syncEngineVersion: 'supabase-v1',
    deviceWritePath: 'N/A',
    devicesListenerPath: 'N/A',
    listenerPath: 'N/A',
    devicesListenerStatus: 'idle',
    devicesListenerError: null,
    devicesLastSnapshotAt: 'Never',
    devicesSnapshotCount: 0,
    devicesFromCache: false,
    devicesHasPendingWrites: false,
    devices: [],
    profileListenerStatus: 'idle',
    profileListenerError: null,
    profileLastSnapshotAt: 'Never',
    profileFromCache: false,
    profileHasPendingWrites: false,
    appearanceListenerStatus: 'idle',
    appearanceListenerError: null,
    appearanceLastSnapshotAt: 'Never',
    appearanceFromCache: false,
    appearanceHasPendingWrites: false,
    preferencesListenerStatus: 'idle',
    preferencesListenerError: null,
    preferencesLastSnapshotAt: 'Never',
    preferencesFromCache: false,
    preferencesHasPendingWrites: false,
    probeListenerStatus: 'idle',
    probeListenerError: null,
    probeLastSnapshotAt: 'Never',
    probeFromCache: false,
    probeHasPendingWrites: false,
    lastDeviceWriteAttemptedAt: 'Never',
    lastDeviceWriteSuccess: 'Never',
    lastDeviceWriteError: 'None',
    lastDeviceWriteDurationMs: null,
    deviceRegistrationStatus: 'idle',
    lastDeviceRegistrationReason: 'None',
    inFlightWriteStatus: false,
    lastProfileWriteSuccess: 'Never',
    lastProfileWriteError: 'None',
    lastAppearanceWriteSuccess: 'Never',
    lastAppearanceWriteError: 'None',
    lastPreferencesWriteSuccess: 'Never',
    lastPreferencesWriteError: 'None',
    lastPhotoUploadError: 'None',
    lastHeartbeatSuccess: 'Never',
    lastHeartbeatError: 'None',
    directWritePath: 'N/A',
    directWriteAttempt: 'Never',
    directWriteSuccess: 'Never',
    directWriteError: 'None',
    directWriteDurationMs: null,
    directReadBackSuccess: 'Never',
    directReadBackError: 'None',
    directReadBackData: 'N/A',
    directListenerDocumentsReceived: 0,
    directListenerDeviceIdsReceived: [],
    lastAction: 'None',
    lastActionAt: 'Never',
    buttonActionStatus: 'idle',
    firestoreTransportMode: 'supabase-realtime',
    firestorePersistenceMode: 'in-memory',
    firestoreInitSource: 'supabase-client',
    probeListenerAttachedAt: 'Never',
    probeSnapshotFromCache: false,
    probeSnapshotHasPendingWrites: false,
    writeStage: 'idle',
    writeStartedAt: 'Never',
    writeTimedOutAt: 'Never',
    writeDurationMs: null,
    firebaseErrorCode: 'None',
    firebaseErrorMessage: 'None',
    onlineState: 'Online',
    snapshotFromCache: false,
    hasPendingWrites: false,
    probeWritePath: 'N/A',
    probeListenerPath: 'N/A',
    lastProbeWriteAttempt: 'Never',
    lastProbeWriteSuccess: 'Never',
    lastProbeWriteError: 'None',
    probeDocumentsReceived: 0,
    probeDeviceIdsReceived: [],
    probeNoncesReceived: [],
    lastProbeSnapshotAt: 'Never',
    androidProbeDetected: false,
    webProbeDetected: false,
    sameUidConfirmed: true,
    sameProjectConfirmed: true,
    cloudTheme: 'N/A',
    cloudDisplayName: 'N/A',
    cloudPhotoURL: 'N/A',
    cloudPreferences: null,
    probeDocs: [],

    // Split Diagnostics Defaults
    firebaseDbAvailable: false,
    firebaseAuthAvailable: false,
    firebaseStorageAvailable: false,
    supabaseDbAvailable: false,
    supabaseStorageAvailable: false,
    supabaseUrlHost: 'N/A',
    supabaseAnonKeyPrefix: 'N/A',
    supabaseAnonKeyLength: 0,
    firebaseIdTokenAvailable: 'No',
    supabaseAuthStrategy: 'Third-Party Auth (Firebase Auth Token)',
    mappedUserId: 'N/A',
    rlsUserId: 'N/A',
    lastSupabaseAuthError: 'None',
    probeTable: 'sync_probe',
    probeRowId: 'N/A',
    devicesTable: 'user_devices',
    deviceRowId: 'N/A',
    directWriteTable: 'debug_writes',
    directWriteRowId: 'N/A',
    profileTable: 'user_profiles',
    appearanceTable: 'user_appearance_settings',
    preferencesTable: 'user_preferences',
    versionCode: 0,
    probeRowsReceived: 0,
  };

  realtimeChannel: any = null;
  refetchInterval: any = null;
  subscriptionWatchdog: any = null;
  isForeground: boolean = true;
  isOnline: boolean = true;
  authEpoch: number = 0;
  lifecycleCleanups: Array<() => void> = [];

  processError(e: any): string {
    if (!e) return 'None';
    const errorMsg = e.message || String(e);
    const errorCode = e.code || 'None';

    const isJwtError =
      errorCode === 'PGRST301' ||
      errorMsg.includes('JWT') ||
      errorMsg.includes('JWK') ||
      errorMsg.includes('signature') ||
      errorMsg.includes('unauthenticated') ||
      errorMsg.toLowerCase().includes('jwt') ||
      errorMsg.toLowerCase().includes('invalid token') ||
      errorMsg.toLowerCase().includes('issuer');

    if (isJwtError) {
      const jwtErrorStr = 'Supabase Third-Party Auth is not configured.';
      this.diagState.lastSupabaseAuthError = jwtErrorStr;
      this.diagState.lastDeviceWriteError = jwtErrorStr;
      this.diagState.lastHeartbeatError = jwtErrorStr;
      return jwtErrorStr;
    }
    return errorMsg;
  }

  async init(): Promise<void> {
      { return init(this); }
  }

  async dispose(): Promise<void> {
      { return dispose(this); }
  }

  async getCurrentUserId(): Promise<string | null> {
      { return getCurrentUserId(this); }
  }

  updateDiag(patch: Partial<SyncDiagnostics>) {
      { updateDiag(this, patch); }
  }

  clearSubscriptions() {
      { clearSubscriptions(this); }
  }

  startPeriodicRefetch(userId: string) {
      { startPeriodicRefetch(this, userId); }
  }

  stopFallbackPolling() {
      { stopFallbackPolling(this); }
  }

  startFallbackPolling(userId: string, reason?: string) {
      { startFallbackPolling(this, userId, reason); }
  }

  async refetchAllData(userId: string, source: string) {
      { return refetchAllData(this, userId, source); }
  }

  setupRealtimeAndPresence(userId: string) {
      { setupRealtimeAndPresence(this, userId); }
  }

  async directWriteTest() {
    const uid = this.userId;
    const deviceId = this.deviceId;
    const nowStr = new Date().toLocaleString();
    const startTime = Date.now();

    this.updateDiag({
      directWriteAttempt: nowStr,
      buttonActionStatus: 'pending',
      directWritePath: `debug_writes/${uid}/${deviceId}`,
      lastAction: 'Direct Supabase Write Test',
      lastActionAt: nowStr,
    });

    if (!supabase || !uid) {
      const errStr = 'Supabase client or session token is missing';
      this.updateDiag({
        directWriteResult: 'failed',
        directWriteError: errStr,
        buttonActionStatus: 'error',
      });
      return { success: false, error: errStr };
    }

    const nonce = Math.random().toString(36).substring(2, 10).toUpperCase();
    const payload = {
      id: `${uid}:${deviceId}`,
      user_id: uid,
      device_id: deviceId,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      app_version: APP_VERSION,
      version_code: this.versionCode,
      build_type: Capacitor.isNativePlatform() ? 'Native Release' : 'Web',
      nonce,
      test_name: 'direct-supabase-write-test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: writeError } = await supabase.from('debug_writes').upsert(payload);
      if (writeError) throw writeError;

      const { data: readData, error: readError } = await supabase
        .from('debug_writes')
        .select('*')
        .eq('id', `${uid}:${deviceId}`)
        .maybeSingle();
      if (readError) throw readError;

      const duration = Date.now() - startTime;
      this.updateDiag({
        directWriteSuccess: nowStr,
        directWriteResult: 'success',
        directWriteError: 'None',
        directWriteDurationMs: duration,
        directReadBackSuccess: nowStr,
        directReadBackError: 'None',
        directReadBackData: JSON.stringify(readData),
        buttonActionStatus: 'success',
      });

      return {
        success: true,
        durationMs: duration,
        readBackData: JSON.stringify(readData),
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      const errorMsg = this.processError(e);
      this.updateDiag({
        directWriteResult: 'failed',
        directWriteError: errorMsg,
        directWriteDurationMs: duration,
        directReadBackError: errorMsg,
        buttonActionStatus: 'error',
      });
      return { success: false, error: errorMsg };
    }
  }

  async sendSyncProbe() {
    const uid = this.userId;
    const deviceId = this.deviceId;
    const nowStr = new Date().toLocaleString();

    this.updateDiag({
      lastProbeWriteAttempt: nowStr,
      buttonActionStatus: 'pending',
      probeWritePath: `sync_probe/${uid}/${deviceId}`,
      lastAction: 'Send Supabase Sync Probe',
      lastActionAt: nowStr,
    });

    if (!supabase || !uid) {
      const errStr = 'Session is not authenticated with Supabase';
      this.updateDiag({
        lastProbeWriteError: errStr,
        probeResult: 'failed',
        buttonActionStatus: 'error',
      });
      return { success: false, error: errStr };
    }

    const nonce = Math.random().toString(36).substring(2, 10).toUpperCase();
    const payload = {
      id: `${uid}:${deviceId}`,
      user_id: uid,
      device_id: deviceId,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      short_name: getDeviceDetails().shortName,
      app_version: APP_VERSION,
      version_code: this.versionCode,
      build_type: Capacitor.isNativePlatform() ? 'Native Release' : 'Web',
      nonce,
      written_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('sync_probe').upsert(payload);
      if (error) throw error;

      this.updateDiag({
        lastProbeWriteSuccess: nowStr,
        probeResult: 'success',
        lastProbeWriteError: 'None',
        buttonActionStatus: 'success',
      });

      // Optimistic refresh
      this.refetchAllData(uid, 'probe-write-success');

      return { success: true, nonce };
    } catch (e: any) {
      const errorMsg = this.processError(e);
      this.updateDiag({
        lastProbeWriteError: errorMsg,
        probeResult: 'failed',
        buttonActionStatus: 'error',
      });
      return { success: false, error: errorMsg };
    }
  }

  async clearSyncProbe() {
    const uid = this.userId;
    const deviceId = this.deviceId;
    if (!supabase || !uid) return;

    this.updateDiag({
      lastAction: 'Clear My Probe',
      buttonActionStatus: 'pending',
    });

    try {
      const { error } = await supabase.from('sync_probe').delete().eq('id', `${uid}:${deviceId}`);
      if (error) throw error;
      this.updateDiag({ buttonActionStatus: 'success' });
      this.refetchAllData(uid, 'probe-clear');
    } catch (e: any) {
      console.error('[supabaseRealtime] Clear probe failed:', e);
      this.processError(e);
      this.updateDiag({ buttonActionStatus: 'error' });
    }
  }

  subscribeSyncProbe(callback: ProbeListener): Unsubscribe {
      { return subscribeSyncProbe(this, callback); }
  }

  async registerCurrentDevice(reason: string) {
      { return registerCurrentDevice(this, reason); }
  }

  async heartbeatNow(reason: string) {
      { return heartbeatNow(this, reason); }
  }

  subscribeDevices(callback: DevicesListener): Unsubscribe {
      { return subscribeDevices(this, callback); }
  }

  async getProfile(): Promise<UserProfile | null> {
      { return getProfile(this); }
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<void> {
      { return updateProfile(this, patch); }
  }

  subscribeProfile(callback: ProfileListener): Unsubscribe {
      { return subscribeProfile(this, callback); }
  }

  async getAppearanceSettings(): Promise<AppearanceSettings | null> {
      { return getAppearanceSettings(this); }
  }

  async updateAppearanceSettings(patch: Partial<AppearanceSettings>): Promise<void> {
      { return updateAppearanceSettings(this, patch); }
  }

  subscribeAppearanceSettings(callback: AppearanceListener): Unsubscribe {
      { return subscribeAppearanceSettings(this, callback); }
  }

  async getPreferences(): Promise<UserPreferences | null> {
      { return getPreferences(this); }
  }

  async updatePreferences(patch: any): Promise<void> {
      { return updatePreferences(this, patch); }
  }

  subscribePreferences(callback: PreferencesListener): Unsubscribe {
      { return subscribePreferences(this, callback); }
  }

  async uploadProfilePhoto(file: File | Blob): Promise<string> {
    const uid = this.userId;
    if (!supabase || !uid) throw new Error('Unauthenticated Session');

    try {
      // 1. Upload to Supabase Storage Bucket 'avatars'
      const filePath = `${uid}/avatar.jpg`;

      // Remove any pre-existing avatar first to prevent cache issues
      await supabase.storage.from('avatars').remove([filePath]);

      const { data, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // 3. Update the Profile document
      await this.updateProfile({ photoURL: publicUrl });

      return publicUrl;
    } catch (e: any) {
      const errorMsg = this.processError(e);
      this.updateDiag({
        lastPhotoUploadError: errorMsg,
      });
      throw e;
    }
  }

  async unregisterDevice(): Promise<void> {
    const uid = this.userId;
    const deviceId = this.deviceId;
    if (!supabase || !uid) return;

    try {
      const { error } = await supabase.from('user_devices').upsert({
        id: `${uid}:${deviceId}`,
        user_id: uid,
        device_id: deviceId,
        signed_in: false,
        current_session: false,
        sync_status: 'signedOut',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (e: any) {
      this.processError(e);
    }
  }

  async revokeDeviceSession(targetDeviceId: string): Promise<void> {
    const uid = this.userId;
    if (!supabase || !uid) return;

    try {
      const { error } = await supabase.from('user_devices').upsert({
        id: `${uid}:${targetDeviceId}`,
        user_id: uid,
        device_id: targetDeviceId,
        revoked_at: new Date().toISOString(),
        signed_in: false,
        current_session: false,
        sync_status: 'revoked',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      this.refetchAllData(uid, 'device-revoked');
    } catch (e: any) {
      this.processError(e);
    }
  }

  async reconnectDevices(): Promise<void> {
    if (!this.userId) return;

    this.clearSubscriptions();
    this.setupRealtimeAndPresence(this.userId);
    await this.registerCurrentDevice('reconnect-trigger');
    await this.heartbeatNow('reconnect-trigger');
  }

  async checkCloudDataExists(appKey: string): Promise<boolean> {
    const uid = this.userId;
    if (!supabase || !uid) return false;

    try {
      const { data, error } = await supabase
        .from('user_app_state')
        .select('id')
        .eq('user_id', uid)
        .eq('app_key', appKey)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (e: any) {
      this.processError(e);
      return false;
    }
  }

  async createCloudBackup(label: string, data: Record<string, any>): Promise<void> {
    const uid = this.userId;
    if (!supabase || !uid) return;

    try {
      const { error } = await supabase.from('user_backups').insert({
        user_id: uid,
        device_id: this.deviceId,
        label,
        data,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (e: any) {
      this.processError(e);
    }
  }

  async deleteCloudData(appKeys: string[]): Promise<void> {
    const uid = this.userId;
    if (!supabase || !uid) return;

    try {
      for (const appKey of appKeys) {
        const { error } = await supabase
          .from('user_app_state')
          .delete()
          .eq('user_id', uid)
          .eq('app_key', appKey);
        if (error) throw error;
      }
      try {
        localStorage.removeItem('sync_meta');
      } catch (_) {}
    } catch (e: any) {
      this.processError(e);
    }
  }

  async pullAppState(
    appKey: string
  ): Promise<{ body: any; updatedAt: any; deviceId: string; schemaVersion?: number } | null> {
    const uid = this.userId;
    if (!supabase || !uid) return null;

    try {
      const { data, error } = await supabase
        .from('user_app_state')
        .select('*')
        .eq('user_id', uid)
        .eq('app_key', appKey)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        body: data.body,
        updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
        deviceId: data.device_id,
        schemaVersion: data.schema_version,
      };
    } catch (e: any) {
      this.processError(e);
      return null;
    }
  }

  async pushAppState(
    appKey: string,
    data: { kind: string; body: any; deviceId: string; schemaVersion: number }
  ): Promise<number> {
    const uid = this.userId;
    if (!supabase || !uid) throw new Error('Unauthenticated Session');

    try {
      const payload = {
        id: `${uid}:${appKey}`,
        user_id: uid,
        app_key: appKey,
        kind: data.kind,
        body: data.body,
        device_id: data.deviceId,
        schema_version: data.schemaVersion,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedData, error } = await supabase
        .from('user_app_state')
        .upsert(payload)
        .select('updated_at')
        .single();

      if (error) throw error;
      return insertedData?.updated_at ? new Date(insertedData.updated_at).getTime() : Date.now();
    } catch (e: any) {
      this.processError(e);
      throw e;
    }
  }

  getDiagnostics(): SyncDiagnostics {
    return this.diagState as SyncDiagnostics;
  }

  subscribeDiagnostics(callback: DiagnosticsListener): Unsubscribe {
    this.diagnosticsCallbacks.add(callback);
    callback(this.diagState as SyncDiagnostics);
    return () => {
      this.diagnosticsCallbacks.delete(callback);
    };
  }
}
