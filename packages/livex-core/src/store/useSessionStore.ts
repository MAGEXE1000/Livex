import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppKey } from './useSettingsStore';

export interface SessionState {
  lastSession: {
    app?: AppKey;
    vocalexTab?: 'coach' | 'takes' | 'preferences';
    stagexView?: string;
    drumexTab?: 'metronome' | 'songs' | 'patterns' | 'prefs';
    groovexView?: 'library' | 'player' | 'preferences';
  };
}

export interface SessionActions {
  setLastSession: (patch: Partial<SessionState['lastSession']>) => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set) => ({
      lastSession: {},
      setLastSession: (patch) =>
        set((state) => ({
          lastSession: { ...state.lastSession, ...patch },
        })),
    }),
    {
      name: 'studio-session-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
