import { create } from 'zustand';
import { applyThemeTokens } from '../lib/themeEngine';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type NavigationRoute } from '../lib/navigation/navigationTypes';
import { useNavigationStore } from '../lib/navigation/useNavigationStore';
import { detectDeviceLanguage, type Language as I18nLanguage } from '../lib/i18n';
import { settingsRepository } from '../repositories/SettingsRepository';
import type { Instrument } from '../data/chords';
import { MotionProfiler } from '../lib/performance/motionProfiler';

export type Theme = 'dark' | 'light' | 'system' | 'dynamic';
export type ActivePanel = 'library' | 'preferences' | 'songs';
export type AppKey = 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex' | 'devtools';
export type AppRoute = NavigationRoute;

export interface PerAppVisuals {
  theme: Theme;
  amoledMode: boolean;
}

export type Language = I18nLanguage;
export type AnimationSpeed = 'normal' | 'fast' | 'reduced';
export type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export interface AppSettings {
  appMode?: AppKey;
  instrument: Instrument;
  theme: Theme;
  accentColor?: string;
  showNoteNames: boolean;
  showIntervals: boolean;
  tuning: string;
  amoledMode: boolean;
  leftHanded: boolean;
  showFretNumbers: boolean;
  showFingerNumbers: boolean;
  animationSpeed: AnimationSpeed;
  displayDensity: DisplayDensity;
  showChordQualityColors: boolean;
  diagramSize: number;
  bassFiveString: boolean;
  hapticFeedback: boolean;
  showOpenStrings: boolean;
  fontSize: 'small' | 'medium' | 'large';
  showIntervalNames: boolean;
  liveModeAnimations: boolean;
  liveModeDiagram: boolean;
  liveChordSize: number;
  language: Language;
  preferFlats: boolean;
  defaultTab: ActivePanel;
  defaultDrumTab: 'metronome' | 'songs' | 'beats' | 'patterns' | 'prefs';
  defaultStageView: 'Editor' | 'Setup' | 'Preferences';
  defaultVocalexTab?: 'coach' | 'takes' | 'preferences';
  vocalexReferencePitch?: number;
  vocalexTolerance?: number;
  vocalexNoteNaming?: 'standard' | 'solfege';
  vocalexSensitivity?: 'smooth' | 'normal' | 'fast';
  vocalexNoiseSuppression?: boolean;
  vocalexAutoGainControl?: boolean;
  vocalexCountIn?: number;
  defaultGroovexView?: 'library' | 'preferences';
  startupApp: AppKey;
  hubUserName: string;
  highRefreshRate: boolean;
  highContrast?: boolean;
  lowLatencyMode: boolean;
  performanceMode: boolean;
  chordAssistant: boolean;
  assistantSmartSuggestions: boolean;
  assistantProgressionTips: boolean;
  assistantConflictDetection: boolean;
  assistantLearning: boolean;
  restoreLastSession: boolean;
  autoHideSidebarInApps: boolean;
  swipeBackBehavior: 'exit-to-hub' | 'manual-only';
  perApp: Record<AppKey, PerAppVisuals>;
  dynamicLightStart: number;
  dynamicLightEnd: number;
  privacyAnalytics: boolean;
  privacyCrashReports: boolean;
  privacyPerfReports: boolean;
  autoBackup: boolean;
  syncAcrossDevices: boolean;
  backupFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  backupRetention: 'forever' | '90days' | '30days';
  autoCleanTemp: boolean;
  lastExportDate: string;
  activityHistoryEnabled: boolean;
  developerMode: boolean;
  syncBackendProvider: 'firebase-firestore-legacy' | 'supabase-realtime' | 'supabase-powersync';
  stagexDiagnostics?: boolean;
  launchAnimationPreset?:
    'fluid_surface' | 'liquid_glass' | 'ripple_reveal' | 'layer_expansion' | 'aurora_reveal';
}

export interface SettingsStore {
  settings: AppSettings;

  updateSettings: (settings: Partial<AppSettings>) => void;
  updatePerApp: (apps: AppKey[], patch: Partial<PerAppVisuals>) => void;
}

export { ACCENT_PRESETS, APP_IDENTITY_COLORS, resolveAccent } from '../lib/preferences/accentUtils';

export const ACCENT_COLORS = {
  blue: { from: '#679cff', to: '#007aff', mid: '#4d8ef7' },
  purple: { from: '#c084fc', to: '#9333ea', mid: '#a855f7' },
  green: { from: '#34d399', to: '#059669', mid: '#10b981' },
  orange: { from: '#fb923c', to: '#ea580c', mid: '#f97316' },
  pink: { from: '#f472b6', to: '#db2777', mid: '#ec4899' },
  teal: { from: '#2dd4bf', to: '#0d9488', mid: '#14b8a6' },
  custom: { from: '#679cff', to: '#007aff', mid: '#4d8ef7' },
};

// Default values to use if there is no previous state.
const DEFAULT_SETTINGS: AppSettings = {
  instrument: 'guitar',
  theme: 'light',
  accentColor: 'blue',
  showNoteNames: true,
  showIntervals: false,
  tuning: 'Standard (EADGBE)',
  amoledMode: false,
  leftHanded: false,
  showFretNumbers: true,
  showFingerNumbers: false,
  animationSpeed: 'normal',
  displayDensity: 'comfortable',
  showChordQualityColors: true,
  diagramSize: 60,
  bassFiveString: false,
  hapticFeedback: true,
  showOpenStrings: true,
  fontSize: 'medium',
  showIntervalNames: false,
  liveModeAnimations: true,
  liveModeDiagram: false,
  liveChordSize: 100,
  language: detectDeviceLanguage(),
  preferFlats: false,
  defaultTab: 'library',
  defaultDrumTab: 'songs',
  defaultStageView: 'Editor',
  defaultVocalexTab: 'coach',
  vocalexReferencePitch: 440,
  vocalexTolerance: 5,
  vocalexNoteNaming: 'standard',
  vocalexSensitivity: 'normal',
  vocalexNoiseSuppression: false,
  vocalexAutoGainControl: false,
  vocalexCountIn: 3,
  defaultGroovexView: 'library',
  startupApp: 'hub',
  hubUserName: '',
  highRefreshRate: false,
  lowLatencyMode: false,
  performanceMode: false,
  chordAssistant: false,
  assistantSmartSuggestions: true,
  assistantProgressionTips: true,
  assistantConflictDetection: true,
  assistantLearning: true,
  restoreLastSession: false,
  autoHideSidebarInApps: true,
  swipeBackBehavior: 'exit-to-hub',
  dynamicLightStart: 7,
  dynamicLightEnd: 20,
  privacyAnalytics: false,
  privacyCrashReports: false,
  privacyPerfReports: false,
  autoBackup: false,
  syncAcrossDevices: false,
  backupFrequency: 'manual',
  backupRetention: 'forever',
  autoCleanTemp: false,
  lastExportDate: 'Never exported',
  activityHistoryEnabled: true,
  developerMode: false,
  syncBackendProvider: (import.meta.env.VITE_SYNC_BACKEND_PROVIDER as any) || 'supabase-realtime',
  launchAnimationPreset: 'fluid_surface',
  perApp: {
    hub: { theme: 'light', amoledMode: false },
    chordex: { theme: 'light', amoledMode: false },
    drumex: { theme: 'light', amoledMode: false },
    stagex: { theme: 'light', amoledMode: false },
    vocalex: { theme: 'light', amoledMode: false },
    groovex: { theme: 'light', amoledMode: false },
    devtools: { theme: 'light', amoledMode: false },
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (newSettings) => {
        let traceId: string | null = null;
        try {
          const keys = Object.keys(newSettings).join(',');
          traceId = MotionProfiler.startSettingsChange(keys, newSettings);
        } catch (_) {}

        set((state) => {
          const updatedSettings = { ...state.settings, ...newSettings };

          if (newSettings.theme !== undefined || newSettings.amoledMode !== undefined) {
            const updatedPerApp = { ...updatedSettings.perApp };
            const allApps: AppKey[] = [
              'hub',
              'chordex',
              'drumex',
              'stagex',
              'groovex',
              'vocalex',
              'devtools',
            ];
            allApps.forEach((app) => {
              updatedPerApp[app] = {
                ...(updatedPerApp[app] || {
                  theme: updatedSettings.theme ?? 'dark',
                  amoledMode: false,
                }),
                ...(newSettings.theme !== undefined && { theme: newSettings.theme }),
                ...(newSettings.amoledMode !== undefined && { amoledMode: newSettings.amoledMode }),
              };
            });
            updatedSettings.perApp = updatedPerApp;
          }

          return {
            settings: updatedSettings,
          };
        });

        try {
          if (traceId) {
            MotionProfiler.endSettingsChange(traceId, getSettingsSubscriberCount());
          }
        } catch (_) {}
      },

      updatePerApp: (apps, patch) => {
        set((state) => {
          const perApp = { ...state.settings.perApp };
          apps.forEach((app) => {
            perApp[app] = { ...perApp[app], ...patch };
          });
          return { settings: { ...state.settings, perApp } };
        });
      },
    }),
    {
      name: 'settings-storage-v1',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          try {
            const raw = settingsRepository.readLegacyRawState();
            if (raw) {
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (parsed && parsed.state) {
                const oldSettings = parsed.state.settings || {};
                return {
                  settings: { ...DEFAULT_SETTINGS, ...oldSettings },
                };
              }
            }
          } catch (e) {}
        }
        return persistedState;
      },
      merge: (persistedState: any, currentState: SettingsStore) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const settings = persistedState.settings
          ? { ...currentState.settings, ...persistedState.settings }
          : currentState.settings;
        return {
          ...currentState,
          settings,
        };
      },
      storage: createJSONStorage(() => ({
        getItem: () => settingsRepository.readRawState(),
        setItem: (_, value) => settingsRepository.writeRawState(value),
        removeItem: () => settingsRepository.clearState(),
      })),
    }
  )
);

let settingsSubscriberCount = 0;
const originalSettingsSubscribe = useSettingsStore.subscribe.bind(useSettingsStore);
(useSettingsStore as any).subscribe = ((listener: any) => {
  settingsSubscriberCount++;
  const unsub = originalSettingsSubscribe(listener);
  return () => {
    settingsSubscriberCount = Math.max(0, settingsSubscriberCount - 1);
    unsub();
  };
}) as any;

export const getSettingsSubscriberCount = () => settingsSubscriberCount;

if (typeof window !== 'undefined') {
  // Synchronously apply tokens for frame-0 rendering
  applyThemeTokens(useSettingsStore.getState().settings);
  useSettingsStore.subscribe((state) => {
    applyThemeTokens(state.settings);
  });
  useNavigationStore.subscribe(() => {
    applyThemeTokens(useSettingsStore.getState().settings);
  });
}

export const settingsController = {
  updateSettings: (patch: Partial<AppSettings>) => {
    useSettingsStore.getState().updateSettings(patch);
  },
  updatePerApp: (apps: AppKey[], patch: Partial<PerAppVisuals>) => {
    useSettingsStore.getState().updatePerApp(apps, patch);
  },
  setThemeMode: (mode: 'light' | 'dark' | 'amoled') => {
    const isAmoled = mode === 'amoled';
    const targetTheme: Theme = mode === 'light' ? 'light' : 'dark';

    const currentPerApp = useSettingsStore.getState().settings.perApp;
    let syncedPerApp = currentPerApp;
    if (currentPerApp) {
      syncedPerApp = { ...currentPerApp };
      for (const key of Object.keys(syncedPerApp) as AppKey[]) {
        syncedPerApp[key] = {
          ...syncedPerApp[key],
          theme: targetTheme,
          amoledMode: isAmoled,
        };
      }
    }

    useSettingsStore.getState().updateSettings({
      theme: targetTheme,
      amoledMode: isAmoled,
      perApp: syncedPerApp,
    });
  },
  cycleNextTheme: () => {
    const current = useSettingsStore.getState().settings;
    const currentTheme = current.theme ?? 'light';
    const isAmoled = Boolean(current.amoledMode);

    let nextTheme: Theme = 'light';
    let nextAmoled = false;

    if (currentTheme === 'light') {
      // White -> Dark
      nextTheme = 'dark';
      nextAmoled = false;
    } else if (currentTheme === 'dark' && !isAmoled) {
      // Dark -> AMOLED
      nextTheme = 'dark';
      nextAmoled = true;
    } else {
      // AMOLED (or any other) -> White
      nextTheme = 'light';
      nextAmoled = false;
    }

    const currentPerApp = current.perApp;
    let syncedPerApp = currentPerApp;
    if (currentPerApp) {
      syncedPerApp = { ...currentPerApp };
      for (const key of Object.keys(syncedPerApp) as AppKey[]) {
        syncedPerApp[key] = {
          ...syncedPerApp[key],
          theme: nextTheme,
          amoledMode: nextAmoled,
        };
      }
    }

    useSettingsStore.getState().updateSettings({
      theme: nextTheme,
      amoledMode: nextAmoled,
      perApp: syncedPerApp,
    });
    return { theme: nextTheme, amoledMode: nextAmoled };
  },
};

if (typeof window !== 'undefined') {
  (window as any).useSettingsStore = useSettingsStore;
  (window as any).settingsController = settingsController;
}
