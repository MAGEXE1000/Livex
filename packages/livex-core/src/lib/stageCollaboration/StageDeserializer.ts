import { secureWriteLocal } from '../security';
import { STAGEX_KEYS } from './StageSerializer';

export function deserializeStage(
  snapshot: Record<string, string>, 
  iframe: HTMLIFrameElement | null, 
  userId?: string
) {
  const userUid = userId || 'guest_user';
  for (const key of STAGEX_KEYS) {
    try {
      const val = snapshot[key];
      secureWriteLocal(key, val, userUid);
    } catch (e) {
      console.warn(`[StageDeserializer] Failed to write key ${key}:`, e);
    }
  }

  if (iframe?.contentWindow) {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '*';
      iframe.contentWindow.postMessage(
        { type: 'sc-sync-restore', data: snapshot, reload: true },
        origin,
      );
    } catch (e) {
      console.warn('[StageDeserializer] Failed to post sc-sync-restore to iframe:', e);
    }
  }
}
