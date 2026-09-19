import type { StateCreator } from 'zustand';
import type { ChordType } from '../../data/chords';

export interface Progression {
  id: string;
  name: string;
  chords: string[];
  createdAt: number;
}

export interface BarreDef {
  fret: number;
  fromString: number;
  toString: number;
}

export interface CustomChord {
  id: string;
  name: string;
  instrument: 'guitar' | 'piano' | 'bass';
  frets?: number[];
  barres?: BarreDef[];
  pianoKeys?: number[];
  notes: string[];
  createdAt: number;
}

export interface ChordSliceState {
  selectedChordId: string | null;
  favorites: string[];
  recentChords: string[];
  progressions: Progression[];
  currentProgressionChords: string[];
  multiSelectChords: string[];
  isMultiChordMode: boolean;
  customChords: CustomChord[];
  chordUsage: Record<string, number>;
  libraryActiveType: ChordType | 'all' | null;
}

export interface ChordSliceActions {
  selectChord: (chordId: string) => void;
  trackChordUsage: (chordId: string) => void;
  setLibraryActiveType: (type: ChordType | 'all' | null) => void;
  toggleFavorite: (chordId: string) => void;
  isFavorite: (chordId: string) => boolean;

  addToProgression: (chordId: string) => void;
  removeFromProgression: (index: number) => void;
  reorderProgression: (from: number, to: number) => void;
  clearProgression: () => void;
  saveProgression: (name: string) => void;
  loadProgression: (id: string) => void;
  deleteProgression: (id: string) => void;

  toggleMultiChordMode: () => void;
  toggleMultiSelectChord: (chordId: string) => void;
  clearMultiSelect: () => void;

  saveCustomChord: (chord: CustomChord) => void;
  updateCustomChord: (id: string, patch: Partial<CustomChord>) => void;
  deleteCustomChord: (id: string) => void;
}

export type ChordSlice = ChordSliceState & ChordSliceActions;

export const createChordSlice: StateCreator<
  any,
  [],
  [],
  ChordSlice
> = (set, get) => ({
  selectedChordId: 'C-major',
  libraryActiveType: null,
  favorites: [],
  recentChords: ['C-major'],
  progressions: [],
  currentProgressionChords: [],
  multiSelectChords: [],
  isMultiChordMode: false,
  customChords: [],
  chordUsage: {},

  trackChordUsage: (chordId) => {
    set((state: any) => ({
      chordUsage: { ...state.chordUsage, [chordId]: (state.chordUsage[chordId] ?? 0) + 1 },
    }));
  },

  selectChord: (chordId) => {
    set((state: any) => {
      if (!chordId) {
        return { selectedChordId: null };
      }
      const recent = [chordId, ...state.recentChords.filter((id: string) => id !== chordId)].slice(
        0,
        10
      );
      return { selectedChordId: chordId, recentChords: recent };
    });
  },

  setLibraryActiveType: (type) => set({ libraryActiveType: type }),

  toggleFavorite: (chordId) => {
    set((state: any) => {
      const isFav = state.favorites.includes(chordId);
      return {
        favorites: isFav
          ? state.favorites.filter((id: string) => id !== chordId)
          : [...state.favorites, chordId],
      };
    });
  },

  isFavorite: (chordId) => (get() as any).favorites.includes(chordId),

  addToProgression: (chordId) => {
    set((state: any) => ({
      currentProgressionChords: [...state.currentProgressionChords, chordId],
    }));
  },
  removeFromProgression: (index) => {
    set((state: any) => ({
      currentProgressionChords: state.currentProgressionChords.filter((_: any, i: number) => i !== index),
    }));
  },
  reorderProgression: (from, to) => {
    set((state: any) => {
      const chords = [...state.currentProgressionChords];
      const [moved] = chords.splice(from, 1);
      chords.splice(to, 0, moved);
      return { currentProgressionChords: chords };
    });
  },
  clearProgression: () => set({ currentProgressionChords: [] }),
  saveProgression: (name) => {
    set((state: any) => {
      const progression: Progression = {
        id: `prog-${Date.now()}`,
        name,
        chords: [...state.currentProgressionChords],
        createdAt: Date.now(),
      };
      return { progressions: [...state.progressions, progression] };
    });
  },
  loadProgression: (id) => {
    const prog = (get() as any).progressions.find((p: Progression) => p.id === id);
    if (prog) set({ currentProgressionChords: [...prog.chords] });
  },
  deleteProgression: (id) => {
    set((state: any) => ({ progressions: state.progressions.filter((p: Progression) => p.id !== id) }));
  },

  toggleMultiChordMode: () => {
    set((state: any) => ({ isMultiChordMode: !state.isMultiChordMode, multiSelectChords: [] }));
  },
  toggleMultiSelectChord: (chordId) => {
    set((state: any) => {
      const selected = state.multiSelectChords.includes(chordId);
      return {
        multiSelectChords: selected
          ? state.multiSelectChords.filter((id: string) => id !== chordId)
          : [...state.multiSelectChords, chordId],
      };
    });
  },
  clearMultiSelect: () => set({ multiSelectChords: [] }),

  saveCustomChord: (chord) =>
    set((state: any) => ({
      customChords: [...state.customChords.filter((c: CustomChord) => c.id !== chord.id), chord],
    })),
  updateCustomChord: (id, patch) =>
    set((state: any) => ({
      customChords: state.customChords.map((c: CustomChord) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  deleteCustomChord: (id) =>
    set((state: any) => ({
      customChords: state.customChords.filter((c: CustomChord) => c.id !== id),
    })),
});
