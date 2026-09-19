import { secureReadLocal, secureWriteLocal } from '../lib/security';

const STORE_KEY = 'settings-storage-v1';
const LEGACY_STORE_KEY = 'chord-explorer-storage-v3';

export class SettingsRepository {
  /**
   * Retrieves the raw persisted JSON state for Settings.
   */
  public readRawState(): string | null {
    return secureReadLocal(STORE_KEY);
  }

  /**
   * Writes the serialized JSON state for Settings.
   */
  public writeRawState(value: string): void {
    secureWriteLocal(STORE_KEY, value);
  }

  /**
   * Deletes the settings store completely.
   */
  public clearState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORE_KEY);
    }
  }

  /**
   * Retrieves the legacy store raw payload to support migrations.
   */
  public readLegacyRawState(): string | null {
    return secureReadLocal(LEGACY_STORE_KEY);
  }
}

export const settingsRepository = new SettingsRepository();
