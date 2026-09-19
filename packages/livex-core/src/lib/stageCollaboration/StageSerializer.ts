import { secureReadLocal } from '../security';

export const STAGEX_KEYS = [
  'stagecoreProject',
  'stagecorePresets_v1',
  'stagecoreSettings',
  'sc_session',
  'scCustomElements',
  'sc-offline-mode',
  'sm_behavior',
  'sc_el_presets_v1',
] as const;

export function serializeStage(userId?: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const userUid = userId || 'guest_user';
  for (const key of STAGEX_KEYS) {
    try {
      const val = secureReadLocal(key, userUid);
      if (val != null) {
        snapshot[key] = val;
      }
    } catch (e) {
      console.warn(`[StageSerializer] Failed to read key ${key}:`, e);
    }
  }
  return snapshot;
}
