import { create } from 'zustand';

export interface LivexPreferences {
  autoHideSidebarInApps: boolean;
  hoverRevealSidebar: boolean;
  autoCloseHoverSidebar: boolean;
  showWebAppDock: boolean;
  rememberLastAppSection: boolean;
  reduceMotion: boolean;
  compactDesktopSpacing: boolean;
}

export type StudioPreferences = LivexPreferences;

const PREF_DEFAULTS: LivexPreferences = {
  autoHideSidebarInApps: true,
  hoverRevealSidebar: true,
  autoCloseHoverSidebar: true,
  showWebAppDock: true,
  rememberLastAppSection: true,
  reduceMotion: false,
  compactDesktopSpacing: false,
};

const PREF_KEYS: Record<keyof LivexPreferences, { canonical: string; legacy: string }> = {
  autoHideSidebarInApps: { canonical: 'livex:pref:autoHideSidebarInApps', legacy: 'studio:pref:autoHideSidebarInApps' },
  hoverRevealSidebar: { canonical: 'livex:pref:hoverRevealSidebar', legacy: 'studio:pref:hoverRevealSidebar' },
  autoCloseHoverSidebar: { canonical: 'livex:pref:autoCloseHoverSidebar', legacy: 'studio:pref:autoCloseHoverSidebar' },
  showWebAppDock: { canonical: 'livex:pref:showWebAppDock', legacy: 'studio:pref:showWebAppDock' },
  rememberLastAppSection: { canonical: 'livex:pref:rememberLastAppSection', legacy: 'studio:pref:rememberLastAppSection' },
  reduceMotion: { canonical: 'livex:pref:reduceMotion', legacy: 'studio:pref:reduceMotion' },
  compactDesktopSpacing: { canonical: 'livex:pref:compactDesktopSpacing', legacy: 'studio:pref:compactDesktopSpacing' },
};

function getPreference<K extends keyof LivexPreferences>(key: K): LivexPreferences[K] {
  if (typeof window === 'undefined') return PREF_DEFAULTS[key];
  try {
    const raw = localStorage.getItem(PREF_KEYS[key].canonical) ?? localStorage.getItem(PREF_KEYS[key].legacy);
    if (raw === null) return PREF_DEFAULTS[key];
    return JSON.parse(raw) as LivexPreferences[K];
  } catch {
    return PREF_DEFAULTS[key];
  }
}

function getAllPreferences(): LivexPreferences {
  const prefs = {} as LivexPreferences;
  for (const k of Object.keys(PREF_DEFAULTS) as Array<keyof LivexPreferences>) {
    prefs[k] = getPreference(k);
  }
  return prefs;
}

interface LivexPreferencesState {
  preferences: LivexPreferences;
  setPreference: <K extends keyof LivexPreferences>(key: K, value: LivexPreferences[K]) => void;
}

export const useLivexPreferencesStore = create<LivexPreferencesState>((set) => ({
  preferences: getAllPreferences(),
  setPreference: (key, value) => {
    try {
      localStorage.setItem(PREF_KEYS[key].canonical, JSON.stringify(value));
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

export const useStudioPreferencesStore = useLivexPreferencesStore;

export function useLivexPreferences() {
  const preferences = useLivexPreferencesStore((s) => s.preferences);
  const setPreference = useLivexPreferencesStore((s) => s.setPreference);
  return { preferences, setPreference };
}

export const useStudioPreferences = useLivexPreferences;

