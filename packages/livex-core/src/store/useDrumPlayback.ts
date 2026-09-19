import { StateCreator } from 'zustand';
import { DrumInstrument, InstFX, InstPlugin, HouseMic, HouseCrashModel, CymbalPack, KitType, KIT_INSTRUMENTS } from './drumTypes';

export interface DrumPlaybackSlice {
  soundMap: Partial<Record<DrumInstrument, string>>;
  volumeMap: Partial<Record<DrumInstrument, number>>;
  masterVolume: number;
  instFX: Partial<Record<DrumInstrument, InstFX>>;
  instPlugins: Partial<Record<DrumInstrument, InstPlugin[]>>;
  houseKitMic: HouseMic;
  houseInstVelOverride: Partial<Record<string, string>>;
  houseCrashModel: HouseCrashModel;
  cymbalPack: CymbalPack;
  kitType: KitType | null;

  setSoundForInstrument: (inst: DrumInstrument, soundId: string) => void;
  setVolumeForInstrument: (inst: DrumInstrument, vol: number) => void;
  setMasterVolume: (vol: number) => void;
  setKitType: (kit: KitType, soundMap: Partial<Record<DrumInstrument, string>>) => void;
  setInstFX: (inst: DrumInstrument, fx: InstFX) => void;
  setInstPlugins: (inst: DrumInstrument, plugins: InstPlugin[]) => void;
  setHouseKitMic: (mic: HouseMic) => void;
  setHouseInstVelOverride: (inst: string, vel: string | undefined) => void;
  setHouseCrashModel: (model: HouseCrashModel) => void;
  setCymbalPack: (pack: CymbalPack) => void;
}

export const createDrumPlaybackSlice: StateCreator<any, [], [], DrumPlaybackSlice> = (set, get) => ({
  soundMap: {},
  volumeMap: {},
  masterVolume: 0.82,
  instFX: {},
  instPlugins: {},
  houseKitMic: 'blend' as HouseMic,
  houseInstVelOverride: {} as Partial<Record<string, string>>,
  houseCrashModel: 'ac18' as HouseCrashModel,
  cymbalPack: 'default' as CymbalPack,
  kitType: 'house',

  setSoundForInstrument: (inst, soundId) =>
    set((s) => ({ soundMap: { ...s.soundMap, [inst]: soundId } })),
  setVolumeForInstrument: (inst, vol) =>
    set((s) => ({ volumeMap: { ...s.volumeMap, [inst]: Math.max(0, Math.min(1, vol)) } })),
  setMasterVolume: (vol) => set({ masterVolume: Math.max(0, Math.min(1, vol)) }),

  setKitType: (kit, soundMap) =>
    set({ kitType: 'house', soundMap, activeInstruments: KIT_INSTRUMENTS['house'] }),

  setInstFX: (inst, fx) => set((s) => ({ instFX: { ...s.instFX, [inst]: { ...fx } } })),

  setInstPlugins: (inst, plugins) =>
    set((s) => ({ instPlugins: { ...s.instPlugins, [inst]: plugins } })),

  setHouseKitMic: (mic) => set({ houseKitMic: mic }),

  setHouseInstVelOverride: (inst, vel) =>
    set((s) => {
      const next = { ...s.houseInstVelOverride };
      if (vel === undefined) delete next[inst];
      else next[inst] = vel;
      return { houseInstVelOverride: next };
    }),

  setHouseCrashModel: (model) => set({ houseCrashModel: model }),
  setCymbalPack: (pack) => set({ cymbalPack: 'default' }),
});
