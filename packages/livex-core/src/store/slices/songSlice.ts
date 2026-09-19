import type { StateCreator } from 'zustand';

export interface SongSection {
  id: string;
  name: string;
  chords: string[];
}

export interface SongPreset {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  notes: string;
  chords: string[];
  sections?: SongSection[];
  createdAt: number;
  updatedAt: number;
}

export interface SongSliceState {
  presets: SongPreset[];
  activePresetId: string | null;
  transpositions: Record<string, number>;
}

export interface SongSliceActions {
  setTranspose: (presetId: string, semitones: number) => void;
  resetTranspose: (presetId: string) => void;
  createPreset: (data: Omit<SongPreset, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePreset: (id: string, data: Partial<SongPreset>) => void;
  deletePreset: (id: string) => void;
  setActivePreset: (id: string | null) => void;
  addChordToPreset: (presetId: string, chordId: string) => void;
  removeChordFromPreset: (presetId: string, index: number) => void;
  reorderPresetChords: (presetId: string, from: number, to: number) => void;
  duplicateChordInPreset: (presetId: string, index: number) => void;
  addSection: (presetId: string, name: string) => void;
  updateSection: (presetId: string, sectionId: string, name: string) => void;
  deleteSection: (presetId: string, sectionId: string) => void;
  addChordToSection: (presetId: string, sectionId: string, chordId: string) => void;
  removeChordFromSection: (presetId: string, sectionId: string, index: number) => void;
  reorderSectionChords: (presetId: string, sectionId: string, from: number, to: number) => void;
  duplicateChordInSection: (presetId: string, sectionId: string, index: number) => void;
  reorderSection: (presetId: string, fromIdx: number, toIdx: number) => void;
  convertToSections: (presetId: string) => void;
  deduplicatePresetChords: (presetId: string) => void;
  deduplicateAllPresets: () => void;
}

export type SongSlice = SongSliceState & SongSliceActions;

export const createSongSlice: StateCreator<
  any, // We use 'any' to avoid circular dependencies with the full store type, or we could pass the full type
  [],
  [],
  SongSlice
> = (set, get) => ({
  presets: [],
  activePresetId: null,
  transpositions: {},

  setTranspose: (presetId, semitones) => {
    const clamped = Math.max(-11, Math.min(11, semitones));
    set((state: any) => ({
      transpositions: { ...state.transpositions, [presetId]: clamped },
    }));
  },
  resetTranspose: (presetId) => {
    set((state: any) => {
      const next = { ...state.transpositions };
      delete next[presetId];
      return { transpositions: next };
    });
  },

  createPreset: (data) => {
    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const preset: SongPreset = { ...data, id, createdAt: now, updatedAt: now };
    set((state: any) => ({ presets: [...state.presets, preset], activePresetId: id }));
    // We do a dynamic import to prevent cyclical issues with logging
    import('../../lib/activityLogger')
      .then(({ logActivity }) => {
        logActivity('project_create', `Created ${preset.name}`, 'Chordex');
      })
      .catch(() => {});
    return id;
  },

  updatePreset: (id, data) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
      ),
    }));
  },

  deletePreset: (id) => {
    set((state: any) => ({
      presets: state.presets.filter((p: SongPreset) => p.id !== id),
      activePresetId: state.activePresetId === id ? null : state.activePresetId,
    }));
  },

  setActivePreset: (id) => set({ activePresetId: id }),

  addChordToPreset: (presetId, chordId) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id === presetId ? { ...p, chords: [...p.chords, chordId], updatedAt: Date.now() } : p
      ),
    }));
  },

  removeChordFromPreset: (presetId, index) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        const chords = [...p.chords];
        chords.splice(index, 1);
        return { ...p, chords, updatedAt: Date.now() };
      }),
    }));
  },

  reorderPresetChords: (presetId, from, to) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        const chords = [...p.chords];
        const [moved] = chords.splice(from, 1);
        chords.splice(to, 0, moved);
        return { ...p, chords, updatedAt: Date.now() };
      }),
    }));
  },

  duplicateChordInPreset: (presetId, index) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        const chords = [...p.chords];
        chords.splice(index + 1, 0, chords[index]);
        return { ...p, chords, updatedAt: Date.now() };
      }),
    }));
  },

  addSection: (presetId, name) => {
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id !== presetId
          ? p
          : {
              ...p,
              updatedAt: Date.now(),
              sections: [...(p.sections ?? []), { id, name, chords: [] }],
            }
      ),
    }));
  },

  updateSection: (presetId, sectionId, name) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id !== presetId
          ? p
          : {
              ...p,
              updatedAt: Date.now(),
              sections: (p.sections ?? []).map((s) =>
                s.id === sectionId ? { ...s, name } : s
              ),
            }
      ),
    }));
  },

  deleteSection: (presetId, sectionId) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id !== presetId
          ? p
          : {
              ...p,
              updatedAt: Date.now(),
              sections: (p.sections ?? []).filter((s) => s.id !== sectionId),
            }
      ),
    }));
  },

  addChordToSection: (presetId, sectionId, chordId) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) =>
        p.id !== presetId
          ? p
          : {
              ...p,
              updatedAt: Date.now(),
              sections: (p.sections ?? []).map((s) =>
                s.id === sectionId ? { ...s, chords: [...s.chords, chordId] } : s
              ),
            }
      ),
    }));
  },

  removeChordFromSection: (presetId, sectionId, index) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          sections: (p.sections ?? []).map((s) => {
            if (s.id !== sectionId) return s;
            const chords = [...s.chords];
            chords.splice(index, 1);
            return { ...s, chords };
          }),
        };
      }),
    }));
  },

  reorderSectionChords: (presetId, sectionId, from, to) => {
    if (from === to) return;
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          sections: (p.sections ?? []).map((s) => {
            if (s.id !== sectionId) return s;
            const chords = [...s.chords];
            const [moved] = chords.splice(from, 1);
            chords.splice(to, 0, moved);
            return { ...s, chords };
          }),
        };
      }),
    }));
  },

  duplicateChordInSection: (presetId, sectionId, index) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          sections: (p.sections ?? []).map((s) => {
            if (s.id !== sectionId) return s;
            const chords = [...s.chords];
            chords.splice(index + 1, 0, chords[index]);
            return { ...s, chords };
          }),
        };
      }),
    }));
  },

  reorderSection: (presetId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        const secs = [...(p.sections ?? [])];
        if (fromIdx >= secs.length || toIdx >= secs.length) return p;
        const [moved] = secs.splice(fromIdx, 1);
        secs.splice(toIdx, 0, moved);
        return { ...p, sections: secs, updatedAt: Date.now() };
      }),
    }));
  },

  convertToSections: (presetId) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        if (p.sections && p.sections.length > 0) return p;
        const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        return {
          ...p,
          chords: [],
          sections: [{ id, name: 'Verse', chords: [...p.chords] }],
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  deduplicatePresetChords: (presetId) => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.id !== presetId) return p;
        if (p.sections && p.sections.length > 0) {
          return {
            ...p,
            sections: p.sections.map((s) => ({
              ...s,
              chords: s.chords.filter((c, i, arr) => i === 0 || c !== arr[i - 1]),
            })),
            updatedAt: Date.now(),
          };
        }
        return {
          ...p,
          chords: p.chords.filter((c, i, arr) => i === 0 || c !== arr[i - 1]),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  deduplicateAllPresets: () => {
    set((state: any) => ({
      presets: state.presets.map((p: SongPreset) => {
        if (p.sections && p.sections.length > 0) {
          return {
            ...p,
            sections: p.sections.map((s) => ({
              ...s,
              chords: s.chords.filter((c, i, arr) => i === 0 || c !== arr[i - 1]),
            })),
            updatedAt: Date.now(),
          };
        }
        return {
          ...p,
          chords: p.chords.filter((c, i, arr) => i === 0 || c !== arr[i - 1]),
          updatedAt: Date.now(),
        };
      }),
    }));
  },
});
