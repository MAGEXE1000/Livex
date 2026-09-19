import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureReadLocal, secureWriteLocal } from '../lib/security';
import { 
  DrumPattern, DrumSong, DrumInstrument, KitType, DrumPrefs, DEFAULT_DRUM_PREFS, KIT_INSTRUMENTS, migratePatterns, defaultPattern
} from './drumTypes';

import { createDrumPatternSlice, DrumPatternSlice } from './useDrumPattern';
import { createDrumPlaybackSlice, DrumPlaybackSlice } from './useDrumPlayback';
import { createDrumUIStateSlice, DrumUIStateSlice } from './useDrumUIState';

// Export all types from drumTypes so existing consumers don't break
export * from './drumTypes';

export type DrumStoreFull = DrumPatternSlice & DrumPlaybackSlice & DrumUIStateSlice;

export const useDrumStore = create<DrumStoreFull>()(
  persist(
    (set, get, api) => ({
      ...createDrumPatternSlice(set, get, api),
      ...createDrumPlaybackSlice(set, get, api),
      ...createDrumUIStateSlice(set, get, api),
      // override initial values that depend on combined state
      activePatternId: defaultPattern().id,
    }),
    {
      name: 'chordex-drums',
      version: 13,
      partialize: (state) => {
        const { instFX, instPlugins, ...rest } = state;
        return rest as typeof state;
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => secureReadLocal(name),
        setItem: (name, value) => secureWriteLocal(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      migrate: (state: unknown, _version: number) => {
        const s = state as {
          drumSongs?: DrumSong[];
          patterns?: DrumPattern[];
          activeInstruments?: DrumInstrument[];
          kitType?: KitType | null;
          [k: string]: unknown;
        };
        const kitType = s.kitType && s.kitType !== 'house' ? 'house' : (s.kitType ?? 'house');
        const migratedPatterns = migratePatterns(s.patterns ?? [defaultPattern()]);
        const migratedSongs = (s.drumSongs ?? []).map((song) => ({
          ...song,
          kitType: song.kitType && song.kitType !== 'house' ? 'house' : (song.kitType ?? 'house'),
          patterns: migratePatterns(song.patterns ?? []),
        }));
        
        const filtered = (s.activeInstruments ?? KIT_INSTRUMENTS[kitType]).filter(
          (i: DrumInstrument) => i !== 'hihat-open' && i !== 'hihat-foot' && i !== 'ride'
        );
        return {
          ...s,
          kitType,
          cymbalPack: 'default',
          patterns: migratedPatterns,
          drumSongs: migratedSongs,
          activeInstruments: filtered.length > 0 ? filtered : KIT_INSTRUMENTS[kitType],
          drumPrefs: { ...DEFAULT_DRUM_PREFS, ...((s.drumPrefs as Partial<DrumPrefs>) ?? {}) },
        };
      },
    }
  )
);
