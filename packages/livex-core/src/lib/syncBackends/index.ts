import { SyncBackendProvider } from './types';
import { SupabaseRealtimeProvider } from './supabaseRealtime';
import { useSettingsStore } from '../../store/useSettingsStore';

const providers: Record<string, SyncBackendProvider> = {
  'supabase-realtime': new SupabaseRealtimeProvider(),
};

export function getActiveSyncProvider(): SyncBackendProvider {
  return providers['supabase-realtime'];
}

export function getSyncProviderByKey(key: string): SyncBackendProvider {
  return providers[key] || providers['supabase-realtime'];
}

export async function initSyncBackends() {
  const activeProvider = getActiveSyncProvider();
  await activeProvider
    .init()
    .catch((err) =>
      console.error(`Failed to init active provider ${activeProvider.providerName}:`, err)
    );
}

export async function disposeSyncBackends() {
  for (const p of Object.values(providers)) {
    await p
      .dispose()
      .catch((err) => console.error(`Failed to dispose provider ${p.providerName}:`, err));
  }
}
