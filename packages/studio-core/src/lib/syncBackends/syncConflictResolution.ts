import { Capacitor } from "@capacitor/core";
import { UserProfile, AppearanceSettings } from "./types";
import { supabase } from "../supabaseClient";
import { getDeviceDetails } from "../syncEngine";
import { APP_VERSION } from "../appVersion";
export async function updateProfile(provider: any, patch: Partial<UserProfile>): Promise<void> {
    const uid = provider.userId;
    const nowStr = new Date().toLocaleString();
    if (!supabase || !uid) return;

    let currentRevision = 0;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('revision')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        currentRevision = Number(data.revision || 0);
      }
    } catch (e) {
    }

    const payload: any = {
      user_id: uid,
      updated_at: new Date().toISOString(),
      updated_by_device: provider.deviceId,
      revision: currentRevision + 1,
      schema_version: 'studio-sync-v1',
    };

    if (patch.displayName !== undefined) payload.display_name = patch.displayName;
    if (patch.photoURL !== undefined) payload.photo_url = patch.photoURL;
    if (patch.avatarIcon !== undefined) payload.avatar_icon = patch.avatarIcon;

    try {
      const { error } = await supabase.from('user_profiles').upsert(payload);
      if (error) throw error;

      provider.updateDiag({
        lastProfileWriteSuccess: nowStr,
        lastProfileWriteError: 'None',
        profileSyncResult: 'success',
      });

      provider.refetchAllData(uid, 'profile-update');
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({
        lastProfileWriteError: errorMsg,
        profileSyncResult: 'failed',
      });
      throw e;
    }
  }

export async function updateAppearanceSettings(provider: any, patch: Partial<AppearanceSettings>): Promise<void> {
    const uid = provider.userId;
    const nowStr = new Date().toLocaleString();
    if (!supabase || !uid) return;

    let currentRevision = 0;
    try {
      const { data, error } = await supabase
        .from('user_appearance_settings')
        .select('revision')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        currentRevision = Number(data.revision || 0);
      }
    } catch (e) {
    }

    const payload: any = {
      user_id: uid,
      updated_at: new Date().toISOString(),
      updated_by_device: provider.deviceId,
      revision: currentRevision + 1,
      schema_version: 'studio-sync-v1',
    };

    if (patch.theme !== undefined) payload.theme = patch.theme;
    if (patch.palette !== undefined) payload.palette = patch.palette;
    if (patch.language !== undefined) payload.language = patch.language;

    try {
      const { error } = await supabase.from('user_appearance_settings').upsert(payload);
      if (error) throw error;

      provider.updateDiag({
        lastAppearanceWriteSuccess: nowStr,
        lastAppearanceWriteError: 'None',
        appearanceSyncResult: 'success',
      });

      provider.refetchAllData(uid, 'appearance-update');
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({
        lastAppearanceWriteError: errorMsg,
        appearanceSyncResult: 'failed',
      });
      throw e;
    }
  }

export async function updatePreferences(provider: any, patch: any): Promise<void> {
    const uid = provider.userId;
    const nowStr = new Date().toLocaleString();
    if (!supabase || !uid) return;

    let currentRevision = 0;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('revision')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        currentRevision = Number(data.revision || 0);
      }
    } catch (e) {
    }

    try {
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: uid,
        studio_preferences: patch,
        module_preferences: {},
        updated_at: new Date().toISOString(),
        updated_by_device: provider.deviceId,
        revision: currentRevision + 1,
        schema_version: 'studio-sync-v1',
      });
      if (error) throw error;

      provider.updateDiag({
        lastPreferencesWriteSuccess: nowStr,
        lastPreferencesWriteError: 'None',
      });

      provider.refetchAllData(uid, 'preferences-update');
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({
        lastPreferencesWriteError: errorMsg,
      });
      throw e;
    }
  }

export async function registerCurrentDevice(provider: any, reason: string) {
    const uid = provider.userId;
    const deviceId = provider.deviceId;
    const nowStr = new Date().toLocaleString();
    const startTime = Date.now();

    provider.updateDiag({
      lastDeviceWriteAttemptedAt: nowStr,
      deviceRegistrationStatus: 'pending',
      lastDeviceRegistrationReason: reason,
      inFlightWriteStatus: true,
      deviceWritePath: `user_devices/${uid}/${deviceId}`,
    });

    if (!supabase || !uid) {
      const errStr = 'Unauthenticated session';
      provider.updateDiag({
        lastDeviceWriteError: errStr,
        deviceRegistrationStatus: 'failed',
        inFlightWriteStatus: false,
      });
      return { success: false, error: errStr };
    }

    let currentRevision = 0;
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('revision')
        .eq('id', `${uid}:${deviceId}`)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        currentRevision = Number(data.revision || 0);
      }
    } catch (e) {
    }

    const details = getDeviceDetails();
    const payload = {
      id: `${uid}:${deviceId}`,
      user_id: uid,
      device_id: deviceId,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      device_type: Capacitor.isNativePlatform() ? 'phone' : 'desktop',
      short_name: details.shortName,
      display_name: details.displayName,
      technical_name: details.technicalName,
      app_version: APP_VERSION,
      version_code: provider.versionCode,
      build_type: Capacitor.isNativePlatform() ? 'Native Release' : 'Web',
      browser: details.browser,
      os: details.os,
      model: details.model,
      manufacturer: details.manufacturer,
      signed_in: true,
      current_session: true,
      sync_status: 'active',
      last_seen_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by_device: deviceId,
      revision: currentRevision + 1,
      schema_version: 'studio-sync-v1',
    };

    try {
      const { error } = await supabase.from('user_devices').upsert(payload);
      if (error) throw error;

      provider.updateDiag({
        lastDeviceWriteSuccess: nowStr,
        lastDeviceWriteError: 'None',
        lastDeviceWriteDurationMs: Date.now() - startTime,
        deviceRegistrationStatus: 'registered',
        inFlightWriteStatus: false,
      });

      provider.refetchAllData(uid, 'device-registered');
      return { success: true };
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({
        lastDeviceWriteError: errorMsg,
        deviceRegistrationStatus: 'failed',
        inFlightWriteStatus: false,
      });
      return { success: false, error: errorMsg };
    }
  }

export async function heartbeatNow(provider: any, reason: string) {
    const uid = provider.userId;
    const deviceId = provider.deviceId;
    const nowStr = new Date().toLocaleString();

    if (!supabase || !uid) {
      const errStr = 'Unauthenticated';
      provider.updateDiag({ lastHeartbeatError: errStr });
      return { success: false, error: errStr };
    }

    try {
      const { error } = await supabase.from('user_devices').upsert({
        id: `${uid}:${deviceId}`,
        user_id: uid,
        device_id: deviceId,
        last_seen_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by_device: deviceId,
      });
      if (error) throw error;

      provider.updateDiag({
        lastHeartbeatSuccess: nowStr,
        lastHeartbeatError: 'None',
      });
      return { success: true };
    } catch (e: any) {
      const errorMsg = provider.processError(e);
      provider.updateDiag({ lastHeartbeatError: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

