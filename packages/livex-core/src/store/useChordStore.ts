import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureReadLocal, secureWriteLocal } from '../lib/security';
import { useSettingsStore, settingsController } from './useSettingsStore';
import { NavigationDispatcher } from '../lib/navigation/NavigationDispatcher';
import { createChordSlice, type ChordSliceState, type ChordSliceActions, type CustomChord, type Progression, type BarreDef } from './slices/chordSlice';
import { createSongSlice, type SongSliceState, type SongSliceActions, type SongPreset, type SongSection } from './slices/songSlice';

export type { CustomChord, Progression, BarreDef, SongPreset, SongSection };
export type { ChordSliceState as ChordState, SongSliceState as SongState };

interface ChordStore extends SongSliceState, SongSliceActions, ChordSliceState, ChordSliceActions {
  activityLog?: any[];
  
  get settings(): any;
  get settingsController(): any;
  get currentApp(): string;
}

export const useChordStore = create<ChordStore>()(
  persist(
    (set, get, store) => ({
      ...createChordSlice(set, get, store),
      ...createSongSlice(set, get, store),
      
      activityLog: [],

      get settings() {
        return useSettingsStore.getState().settings;
      },
      get settingsController() {
        return settingsController;
      },
      get currentApp() {
        return NavigationDispatcher.currentApp();
      },
    }),
    {
      name: 'chord-explorer-storage-v3',
      version: 13,
      migrate: (persistedState: any, version: number) => {
        let s = { ...persistedState };
        const fromVersion = version || 0;
        // Keep the exact same migrations to prevent breaking existing users
        if (fromVersion < 2) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            const theme = (settings.theme as string) ?? 'dark';
            const accentColor = (settings.accentColor as string) ?? 'blue';
            const amoledMode = (settings.amoledMode as boolean) ?? false;
            settings.perApp = {
              hub: { theme, accentColor, amoledMode },
              chords: { theme, accentColor, amoledMode },
              drums: { theme, accentColor, amoledMode },
              stage: { theme, accentColor, amoledMode },
            };
          }
        }
        if (fromVersion < 3) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            const perApp = settings.perApp as Record<string, unknown> | undefined;
            if (perApp && !perApp.groovex) {
              const hubVis = perApp.hub;
              perApp.groovex = hubVis
                ? { ...hubVis }
                : { theme: 'dark', accentColor: 'blue', amoledMode: false };
            }
          }
        }
        if (fromVersion < 4) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            const perApp = settings.perApp as Record<string, unknown> | undefined;
            if (perApp && !perApp.vocalex) {
              const hubVis = perApp.hub;
              perApp.vocalex = hubVis
                ? { ...hubVis }
                : { theme: 'dark', accentColor: 'blue', amoledMode: false };
            }
          }
        }
        if (fromVersion < 6) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            if (typeof settings.highRefreshRate !== 'boolean') settings.highRefreshRate = false;
            if (typeof settings.lowLatencyMode !== 'boolean') settings.lowLatencyMode = false;
            if (typeof settings.performanceMode !== 'boolean') settings.performanceMode = false;
            if ('hubChimeEnabled' in settings) delete (settings as any).hubChimeEnabled;
          }
        }
        if (fromVersion < 7) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            if (settings.language === 'es') settings.language = 'en';
          }
        }
        if (fromVersion < 9) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            if (typeof settings.privacyAnalytics !== 'boolean') settings.privacyAnalytics = false;
            if (typeof settings.privacyCrashReports !== 'boolean') settings.privacyCrashReports = false;
            if (typeof settings.privacyPerfReports !== 'boolean') settings.privacyPerfReports = false;
            if (typeof settings.autoBackup !== 'boolean') settings.autoBackup = false;
            if (typeof settings.syncAcrossDevices !== 'boolean') settings.syncAcrossDevices = false;
            if (typeof settings.backupFrequency !== 'string') settings.backupFrequency = 'manual';
            if (typeof settings.backupRetention !== 'string') settings.backupRetention = 'forever';
            if (typeof settings.autoCleanTemp !== 'boolean') settings.autoCleanTemp = false;
            if (typeof settings.lastExportDate !== 'string') settings.lastExportDate = 'Never exported';
          }
        }
        if (fromVersion < 10) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            if (typeof settings.developerMode !== 'boolean') settings.developerMode = false;
          }
        }
        if (fromVersion < 11 || fromVersion < 12) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            settings.syncBackendProvider = 'supabase-realtime';
          }
        }
        if (fromVersion < 13) {
          if (s.settings && typeof s.settings === 'object') {
            const settings = s.settings as Record<string, unknown>;
            if (typeof settings.autoHideSidebarInApps !== 'boolean') settings.autoHideSidebarInApps = true;
          }
        }
        return s;
      },
      partialize: (state) => {
        const {
          multiSelectChords,
          isMultiChordMode,
          transpositions, 
          activityLog,
          libraryActiveType,
          settings,
          lastSession,
          ...rest
        } = state as any;
        return rest;
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return secureReadLocal(name);
          } catch (err) {
            console.warn(`[useChordStore] Error reading storage key "${name}":`, err);
            return null;
          }
        },
        setItem: (name, value) => secureWriteLocal(name, value),
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (err) {
            console.warn(`[useChordStore] Error removing storage key "${name}":`, err);
          }
        },
      })),
    }
  )
);

import { setChordStoreAccessorForActivityLogger } from '../lib/diagnostics/activityLogger';
setChordStoreAccessorForActivityLogger(() => useChordStore);

