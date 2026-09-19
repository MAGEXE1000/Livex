import { create } from 'zustand';

export interface StudioPreferences {
  autoHideSidebarInApps: boolean;
  hoverRevealSidebar: boolean;
  autoCloseHoverSidebar: boolean;
  showWebAppDock: boolean;
  rememberLastAppSection: boolean;
  reduceMotion: boolean;
  compactDesktopSpacing: boolean;
}

const PREF_DEFAULTS: StudioPreferences = {
  autoHideSidebarInApps: true,
  hoverRevealSidebar: true,
  autoCloseHoverSidebar: true,
  showWebAppDock: true,
  rememberLastAppSection: true,
  reduceMotion: false,
  compactDesktopSpacing: false,
};

const PREF_KEYS: Record<keyof StudioPreferences, string> = {
  autoHideSidebarInApps: 'studio:pref:autoHideSidebarInApps',
  hoverRevealSidebar: 'studio:pref:hoverRevealSidebar',
  autoCloseHoverSidebar: 'studio:pref:autoCloseHoverSidebar',
  showWebAppDock: 'studio:pref:showWebAppDock',
  rememberLastAppSection: 'studio:pref:rememberLastAppSection',
  reduceMotion: 'studio:pref:reduceMotion',
  compactDesktopSpacing: 'studio:pref:compactDesktopSpacing',
};

function getPreference<K extends keyof StudioPreferences>(key: K): StudioPreferences[K] {
  if (typeof window === 'undefined') return PREF_DEFAULTS[key];
  try {
    const raw = localStorage.getItem(PREF_KEYS[key]);
    if (raw === null) return PREF_DEFAULTS[key];
    return JSON.parse(raw) as StudioPreferences[K];
  } catch {
    return PREF_DEFAULTS[key];
  }
}

function getAllPreferences(): StudioPreferences {
  const prefs = {} as StudioPreferences;
  for (const k of Object.keys(PREF_DEFAULTS) as Array<keyof StudioPreferences>) {
    prefs[k] = getPreference(k);
  }
  return prefs;
}

interface StudioPreferencesState {
  preferences: StudioPreferences;
  setPreference: <K extends keyof StudioPreferences>(key: K, value: StudioPreferences[K]) => void;
}

export const useStudioPreferencesStore = create<StudioPreferencesState>((set) => ({
  preferences: getAllPreferences(),
  setPreference: (key, value) => {
    try {
      localStorage.setItem(PREF_KEYS[key], JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save preference', key, value, e);
    }
    set((state) => ({
      preferences: {
        ...state.preferences,
        [key]: value,
      },
    }));
  },
}));

export function useStudioPreferences() {
  const preferences = useStudioPreferencesStore((s) => s.preferences);
  const setPreference = useStudioPreferencesStore((s) => s.setPreference);
  return { preferences, setPreference };
}
