import { StateCreator } from 'zustand';
import { DrumInstrument, DrumPrefs, DEFAULT_DRUM_PREFS, KIT_INSTRUMENTS } from './drumTypes';

export interface DrumUIStateSlice {
  activeInstruments: DrumInstrument[];
  drumPrefs: DrumPrefs;

  toggleInstrument: (inst: DrumInstrument) => void;
  setActiveInstruments: (insts: DrumInstrument[]) => void;
  updateDrumPrefs: (patch: Partial<DrumPrefs>) => void;
}

export const createDrumUIStateSlice: StateCreator<any, [], [], DrumUIStateSlice> = (set, get) => ({
  activeInstruments: KIT_INSTRUMENTS.house,
  drumPrefs: { ...DEFAULT_DRUM_PREFS },

  toggleInstrument: (inst) =>
    set((s) => ({
      activeInstruments: s.activeInstruments.includes(inst)
        ? s.activeInstruments.length > 1
          ? s.activeInstruments.filter((i) => i !== inst)
          : s.activeInstruments
        : [...s.activeInstruments, inst],
    })),

  setActiveInstruments: (insts) => set({ activeInstruments: insts }),

  updateDrumPrefs: (patch) => set((s) => ({ drumPrefs: { ...s.drumPrefs, ...patch } })),
});
