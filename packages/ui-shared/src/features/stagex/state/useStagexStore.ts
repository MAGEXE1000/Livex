import { create } from 'zustand';

export interface RiderNeed {
  id: string;
  type: 'foh' | 'monitor' | 'power' | 'hospitality' | 'custom';
  value: string;
}

export interface RiderChannel {
  ch: number;
  source: string;
  performer?: string;
  mic: string;
  stand: string;
  phantom: boolean;
  notes: string;
}

export interface RiderMix {
  mix: number;
  name: string;
  type: 'iem' | 'wedge';
  notes: string;
}

export interface RiderConfig {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  venue?: string;
  date?: string;
  notes?: string;
}

export interface SetlistSong {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  duration: string; // e.g. "3:45"
  notes?: string;
  energy?: number; // 1 - 100
}

export interface SetlistPreset {
  id: string;
  name: string;
  songs: SetlistSong[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SetlistSegment {
  id: string;
  name: string;
  color?: string;
}

export interface GearItem {
  id: string;
  name: string;
  category: 'mics' | 'inst' | 'amps' | 'mon' | 'util' | 'cables' | 'misc';
  model?: string;
  qty?: number;
  notes?: string;
  packed?: boolean;
}

export interface BandMember {
  id: string;
  name: string;
  role: string;
  tags?: string[];
  color?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface StagexPreferences {
  gridVisible: boolean;
  snapToGrid: boolean;
  gridSize: number;
  connectionsVisible: boolean;
  connLineStyle: 'solid' | 'dashed' | 'dotted';
  labelsVisible: boolean;
  reducedAnimations?: boolean;
  stageUnits: 'meters' | 'feet';
  stageWidth: number;
  stageDepth: number;
  amoled: boolean;
  stageShape?: 'rectangular' | 'square';
  showCableLength?: boolean;
  autoWire?: boolean;
  stageBalanceVisible?: boolean;
  audioCoverageVisible?: boolean;
  stageGuidesVisible?: boolean;
}

export type StagexSubView = 'hub' | 'rider' | 'setlist' | 'gear' | 'members';

interface StagexStoreState {
  // Navigation inside Setup
  setupSubView: StagexSubView;
  setSetupSubView: (subView: StagexSubView) => void;

  // Rider
  riderNeeds: RiderNeed[];
  riderChannels: RiderChannel[];
  riderMixes: RiderMix[];
  riderConfig: RiderConfig;
  setRiderNeeds: (needs: RiderNeed[]) => void;
  addRiderNeed: (need: Omit<RiderNeed, 'id'>) => void;
  updateRiderNeed: (id: string, updates: Partial<RiderNeed>) => void;
  removeRiderNeed: (id: string) => void;
  updateRiderConfig: (config: Partial<RiderConfig>) => void;

  // Setlist Presets & Active Setlist
  setlistPresets: SetlistPreset[];
  activePresetId: string;
  setlist: SetlistSong[];
  segments: SetlistSegment[];
  selectPreset: (presetId: string) => void;
  createPreset: (name: string, initialSongs?: SetlistSong[]) => string;
  renamePreset: (presetId: string, newName: string) => void;
  deletePreset: (presetId: string) => boolean;
  duplicatePreset: (presetId: string) => string;
  addSong: (song: Omit<SetlistSong, 'id'>) => void;
  updateSong: (id: string, updates: Partial<SetlistSong>) => void;
  removeSong: (id: string) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  setSetlistSongs: (songs: SetlistSong[]) => void;
  addSegment: (segment: Omit<SetlistSegment, 'id'>) => void;
  removeSegment: (id: string) => void;

  // Gear
  gear: GearItem[];
  addGearItem: (item: Omit<GearItem, 'id'>) => void;
  updateGearItem: (id: string, updates: Partial<GearItem>) => void;
  removeGearItem: (id: string) => void;

  // Members
  members: BandMember[];
  addMember: (member: Omit<BandMember, 'id'>) => boolean;
  updateMember: (id: string, updates: Partial<BandMember>) => void;
  removeMember: (id: string) => void;

  // Preferences
  preferences: StagexPreferences;
  updatePreferences: (updates: Partial<StagexPreferences>) => void;

  // Live stage context (synced from project storage)
  projectName: string;
  elements: any[];
  scenes: any[];
  currentSceneIdx: number;
  fromToolbarPdf: boolean;
  setFromToolbarPdf: (fromToolbarPdf: boolean) => void;

  // Synchronization helpers
  reloadFromStorage: () => void;
}

const PROJECT_STORAGE_KEY = 'stagecoreProject';
const SETTINGS_STORAGE_KEY = 'stagecoreSettings';

const DEFAULT_RIDER_NEEDS: RiderNeed[] = [];

const DEFAULT_PREFERENCES: StagexPreferences = {
  gridVisible: true,
  snapToGrid: false,
  gridSize: 80,
  connectionsVisible: true,
  connLineStyle: 'solid',
  labelsVisible: true,
  reducedAnimations: false,
  stageUnits: 'meters',
  stageWidth: 12,
  stageDepth: 8,
  amoled: false,
  stageShape: 'rectangular',
  showCableLength: false,
  autoWire: false,
  audioCoverageVisible: true,
  stageGuidesVisible: true,
};

function readProjectStorage(): Record<string, any> {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(PROJECT_STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      parsed.scenes = [
        {
          id: 's1',
          name: 'Scene 1',
          elements: parsed.elements || [],
          connections: parsed.connections || [],
          nextId: 1,
        },
      ];
      parsed.currentSceneIdx = 0;
    }
    return parsed;
  } catch (err) {
    console.error('[StagexStore] Failed to read project from storage:', err);
    return {};
  }
}

function writeProjectStorage(updates: Record<string, any>) {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = readProjectStorage();
    const targetScenes = Array.isArray(updates.scenes)
      ? updates.scenes
      : Array.isArray(current.scenes)
        ? current.scenes
        : [];
    const guaranteedScenes =
      targetScenes.length > 0
        ? targetScenes
        : [
            {
              id: 's1',
              name: 'Scene 1',
              elements: current.elements || [],
              connections: current.connections || [],
              nextId: 1,
            },
          ];

    const merged = {
      schemaVersion: 9,
      elements: current.elements || [],
      connections: current.connections || [],
      currentSceneIdx: typeof current.currentSceneIdx === 'number' ? current.currentSceneIdx : 0,
      ...current,
      ...updates,
      scenes: guaranteedScenes,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[StagexStore] Failed to write project to storage:', err);
  }
}

function readSettingsStorage(): Partial<StagexPreferences> {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if ('canvasBg' in parsed) {
      delete parsed.canvasBg;
    }
    return parsed;
  } catch (err) {
    console.error('[StagexStore] Failed to read settings from storage:', err);
    return {};
  }
}

function writeSettingsStorage(updates: Partial<StagexPreferences>) {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = readSettingsStorage();
    const merged = { ...current, ...updates };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[StagexStore] Failed to write settings to storage:', err);
  }
}

function initSetlistPresets(proj: Record<string, any>): {
  presets: SetlistPreset[];
  activePresetId: string;
  activeSongs: SetlistSong[];
} {
  const existingPresets =
    Array.isArray(proj.setlistPresets) && proj.setlistPresets.length > 0
      ? (proj.setlistPresets as SetlistPreset[])
      : null;

  if (existingPresets) {
    const activeId =
      typeof proj.activePresetId === 'string' && existingPresets.some((p) => p.id === proj.activePresetId)
        ? proj.activePresetId
        : existingPresets[0].id;
    const activePreset = existingPresets.find((p) => p.id === activeId) || existingPresets[0];
    return {
      presets: existingPresets,
      activePresetId: activeId,
      activeSongs: Array.isArray(activePreset.songs) ? activePreset.songs : [],
    };
  }

  // Seamless zero-loss migration: migrate existing proj.setlist into first preset
  const defaultSongs: SetlistSong[] = Array.isArray(proj.setlist) ? proj.setlist : [];
  const defaultPreset: SetlistPreset = {
    id: 'preset_default',
    name: 'Main Show',
    songs: defaultSongs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    presets: [defaultPreset],
    activePresetId: 'preset_default',
    activeSongs: defaultSongs,
  };
}

const initialProj = readProjectStorage();
const initialSettings = readSettingsStorage();
const initialSetlistData = initSetlistPresets(initialProj);

export const useStagexStore = create<StagexStoreState>((set, get) => ({
  setupSubView: 'hub',
  setSetupSubView: (setupSubView) => set({ setupSubView }),

  // Live stage context
  projectName: initialProj.name || initialProj.projectName || 'Main Stage',
  elements:
    (Array.isArray(initialProj.scenes) && initialProj.currentSceneIdx >= 0
      ? initialProj.scenes[initialProj.currentSceneIdx]?.elements
      : initialProj.elements) || [],
  scenes: Array.isArray(initialProj.scenes) ? initialProj.scenes : [],
  currentSceneIdx:
    typeof initialProj.currentSceneIdx === 'number' ? initialProj.currentSceneIdx : 0,
  fromToolbarPdf: false,
  setFromToolbarPdf: (fromToolbarPdf) => set({ fromToolbarPdf }),

  // Rider
  riderNeeds: initialProj.riderNeeds || DEFAULT_RIDER_NEEDS,
  riderChannels: initialProj.riderChannels || [],
  riderMixes: initialProj.riderMixes || [],
  riderConfig: initialProj.riderConfig || {},
  setRiderNeeds: (riderNeeds) => {
    set({ riderNeeds });
    writeProjectStorage({ riderNeeds });
  },
  addRiderNeed: (need) => {
    const id = 'rn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const updated = [...get().riderNeeds, { ...need, id }];
    set({ riderNeeds: updated });
    writeProjectStorage({ riderNeeds: updated });
  },
  updateRiderNeed: (id, updates) => {
    const updated = get().riderNeeds.map((n) => (n.id === id ? { ...n, ...updates } : n));
    set({ riderNeeds: updated });
    writeProjectStorage({ riderNeeds: updated });
  },
  removeRiderNeed: (id) => {
    const updated = get().riderNeeds.filter((n) => n.id !== id);
    set({ riderNeeds: updated });
    writeProjectStorage({ riderNeeds: updated });
  },
  updateRiderConfig: (config) => {
    const updated = { ...get().riderConfig, ...config };
    set({ riderConfig: updated });
    writeProjectStorage({ riderConfig: updated });
  },

  // Setlist Presets & Active Setlist
  setlistPresets: initialSetlistData.presets,
  activePresetId: initialSetlistData.activePresetId,
  setlist: initialSetlistData.activeSongs,
  segments: initialProj.segments || [],

  selectPreset: (presetId) => {
    const target = get().setlistPresets.find((p) => p.id === presetId);
    if (!target) return;
    set({ activePresetId: target.id, setlist: target.songs || [] });
    writeProjectStorage({
      activePresetId: target.id,
      setlist: target.songs || [],
    });
  },

  createPreset: (name, initialSongs = []) => {
    const id = 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newPreset: SetlistPreset = {
      id,
      name: name.trim() || 'New Preset',
      songs: initialSongs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedPresets = [...get().setlistPresets, newPreset];
    set({
      setlistPresets: updatedPresets,
      activePresetId: id,
      setlist: initialSongs,
    });
    writeProjectStorage({
      setlistPresets: updatedPresets,
      activePresetId: id,
      setlist: initialSongs,
    });
    return id;
  },

  renamePreset: (presetId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === presetId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p
    );
    set({ setlistPresets: updatedPresets });
    writeProjectStorage({ setlistPresets: updatedPresets });
  },

  deletePreset: (presetId) => {
    const { setlistPresets, activePresetId } = get();
    if (setlistPresets.length <= 1) return false;
    const remaining = setlistPresets.filter((p) => p.id !== presetId);
    if (activePresetId === presetId) {
      const nextPreset = remaining[0];
      set({
        setlistPresets: remaining,
        activePresetId: nextPreset.id,
        setlist: nextPreset.songs || [],
      });
      writeProjectStorage({
        setlistPresets: remaining,
        activePresetId: nextPreset.id,
        setlist: nextPreset.songs || [],
      });
    } else {
      set({ setlistPresets: remaining });
      writeProjectStorage({ setlistPresets: remaining });
    }
    return true;
  },

  duplicatePreset: (presetId) => {
    const target = get().setlistPresets.find((p) => p.id === presetId);
    if (!target) return '';
    const id = 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const clonedSongs: SetlistSong[] = (target.songs || []).map((s) => ({
      ...s,
      id: 'sl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    }));
    const newPreset: SetlistPreset = {
      id,
      name: `${target.name} (Copy)`,
      songs: clonedSongs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedPresets = [...get().setlistPresets, newPreset];
    set({
      setlistPresets: updatedPresets,
      activePresetId: id,
      setlist: clonedSongs,
    });
    writeProjectStorage({
      setlistPresets: updatedPresets,
      activePresetId: id,
      setlist: clonedSongs,
    });
    return id;
  },

  addSong: (song) => {
    const id = 'sl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const updatedSongs = [...get().setlist, { ...song, id }];
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === get().activePresetId
        ? { ...p, songs: updatedSongs, updatedAt: new Date().toISOString() }
        : p
    );
    set({ setlist: updatedSongs, setlistPresets: updatedPresets });
    writeProjectStorage({ setlist: updatedSongs, setlistPresets: updatedPresets });
  },

  updateSong: (id, updates) => {
    const updatedSongs = get().setlist.map((s) => (s.id === id ? { ...s, ...updates } : s));
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === get().activePresetId
        ? { ...p, songs: updatedSongs, updatedAt: new Date().toISOString() }
        : p
    );
    set({ setlist: updatedSongs, setlistPresets: updatedPresets });
    writeProjectStorage({ setlist: updatedSongs, setlistPresets: updatedPresets });
  },

  removeSong: (id) => {
    const updatedSongs = get().setlist.filter((s) => s.id !== id);
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === get().activePresetId
        ? { ...p, songs: updatedSongs, updatedAt: new Date().toISOString() }
        : p
    );
    set({ setlist: updatedSongs, setlistPresets: updatedPresets });
    writeProjectStorage({ setlist: updatedSongs, setlistPresets: updatedPresets });
  },

  reorderSongs: (fromIndex, toIndex) => {
    const current = [...get().setlist];
    if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length)
      return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === get().activePresetId
        ? { ...p, songs: current, updatedAt: new Date().toISOString() }
        : p
    );
    set({ setlist: current, setlistPresets: updatedPresets });
    writeProjectStorage({ setlist: current, setlistPresets: updatedPresets });
  },

  setSetlistSongs: (songs) => {
    const updatedPresets = get().setlistPresets.map((p) =>
      p.id === get().activePresetId
        ? { ...p, songs, updatedAt: new Date().toISOString() }
        : p
    );
    set({ setlist: songs, setlistPresets: updatedPresets });
    writeProjectStorage({ setlist: songs, setlistPresets: updatedPresets });
  },

  addSegment: (segment) => {
    const id = 'seg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const updated = [...get().segments, { ...segment, id }];
    set({ segments: updated });
    writeProjectStorage({ segments: updated });
  },

  removeSegment: (id) => {
    const updated = get().segments.filter((s) => s.id !== id);
    set({ segments: updated });
    writeProjectStorage({ segments: updated });
  },

  // Gear
  gear: initialProj.gear || [],
  addGearItem: (item) => {
    const id = 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const updated = [...get().gear, { ...item, id }];
    set({ gear: updated });
    writeProjectStorage({ gear: updated });
  },
  updateGearItem: (id, updates) => {
    const updated = get().gear.map((g) => (g.id === id ? { ...g, ...updates } : g));
    set({ gear: updated });
    writeProjectStorage({ gear: updated });
  },
  removeGearItem: (id) => {
    const updated = get().gear.filter((g) => g.id !== id);
    set({ gear: updated });
    writeProjectStorage({ gear: updated });
  },

  // Members (Enforces 8-member limit)
  members: initialProj.members || [],
  addMember: (member) => {
    if (get().members.length >= 8) return false;
    const id = 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const updated = [...get().members, { ...member, id }];
    set({ members: updated });
    writeProjectStorage({ members: updated });
    return true;
  },
  updateMember: (id, updates) => {
    const updated = get().members.map((m) => (m.id === id ? { ...m, ...updates } : m));
    set({ members: updated });
    writeProjectStorage({ members: updated });
  },
  removeMember: (id) => {
    const updated = get().members.filter((m) => m.id !== id);
    set({ members: updated });
    writeProjectStorage({ members: updated });
  },

  // Preferences
  preferences: {
    ...DEFAULT_PREFERENCES,
    ...initialSettings,
  },
  updatePreferences: (updates) => {
    const updated = { ...get().preferences, ...updates };
    set({ preferences: updated });
    writeSettingsStorage(updated);
  },

  reloadFromStorage: () => {
    const proj = readProjectStorage();
    const settings = readSettingsStorage();
    const currentScene =
      Array.isArray(proj.scenes) && proj.currentSceneIdx >= 0
        ? proj.scenes[proj.currentSceneIdx]
        : undefined;
    const elements = (currentScene && currentScene.elements) || proj.elements || [];
    const setlistData = initSetlistPresets(proj);
    set({
      projectName: proj.name || proj.projectName || 'Main Stage',
      elements,
      scenes: Array.isArray(proj.scenes) ? proj.scenes : [],
      currentSceneIdx: typeof proj.currentSceneIdx === 'number' ? proj.currentSceneIdx : 0,
      riderNeeds: proj.riderNeeds || DEFAULT_RIDER_NEEDS,
      riderChannels: proj.riderChannels || [],
      riderMixes: proj.riderMixes || [],
      riderConfig: proj.riderConfig || {},
      setlistPresets: setlistData.presets,
      activePresetId: setlistData.activePresetId,
      setlist: setlistData.activeSongs,
      segments: proj.segments || [],
      gear: proj.gear || [],
      members: proj.members || [],
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...settings,
      },
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useStagexStore = useStagexStore;
}
