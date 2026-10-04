/**
 * Stagex Assistant Provider
 *
 * Exposes Stagex structured context (Setlists, Presets, Songs, Stage Scenes, Gear, Members)
 * and executes verified Stagex actions (reordering setlists, arranging stage plots, creating presets).
 */

import {
  registerAppContextProvider,
  type AppContextProvider,
  type AppActionResult,
  type AppActionValidation,
  type StagexContextSnapshot,
  type StagexPresetSummary,
  type StagexSongSummary,
  type StagexSceneSummary,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { useStagexStore, type SetlistSong } from '../state/useStagexStore';

export function getStagexContextSnapshot(): StagexContextSnapshot {
  const state = useStagexStore.getState();

  const setlists: StagexPresetSummary[] = (state.setlistPresets || []).map((p) => ({
    id: p.id,
    name: p.name,
    songCount: p.songs?.length || 0,
    isDefault: p.id === state.activePresetId,
  }));

  const activePreset = state.setlistPresets?.find((p) => p.id === state.activePresetId);
  const activeSongs: StagexSongSummary[] = (state.setlist || []).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.key,
    bpm: s.bpm,
    duration: s.duration,
    energy: s.energy,
    notes: s.notes,
  }));

  const scenes: StagexSceneSummary[] = (state.scenes || []).map((sc, idx) => ({
    id: sc.id || `scene-${idx}`,
    name: sc.name || `Scene ${idx + 1}`,
    elementCount: Array.isArray(sc.elements) ? sc.elements.length : 0,
  }));

  const activeSceneRaw =
    Array.isArray(state.scenes) && state.currentSceneIdx >= 0
      ? state.scenes[state.currentSceneIdx]
      : undefined;

  const activeSceneElements = (activeSceneRaw?.elements || state.elements || []).map((el: any) => ({
    id: String(el.id || el.name),
    name: el.name || 'Element',
    type: el.type || 'instrument',
    x: typeof el.x === 'number' ? el.x : 50,
    y: typeof el.y === 'number' ? el.y : 50,
    label: el.label || el.name,
    color: el.color,
  }));

  const activeScene: StagexSceneSummary | undefined = activeSceneRaw
    ? {
        id: activeSceneRaw.id || `scene-${state.currentSceneIdx}`,
        name: activeSceneRaw.name || `Scene ${state.currentSceneIdx + 1}`,
        elementCount: activeSceneElements.length,
        elements: activeSceneElements,
      }
    : undefined;

  return {
    setlists,
    activePresetId: state.activePresetId,
    activePresetName: activePreset?.name || 'Main Setlist',
    activeSongs,
    scenes,
    activeScene,
    performerCount: state.members?.length || 0,
    gearCount: state.gear?.length || 0,
  };
}

export function validateStagexAction(
  actionType: string,
  params: Record<string, any>
): AppActionValidation {
  const state = useStagexStore.getState();

  if (actionType === 'stagex:reorder_setlist') {
    const targetPresetId = params.presetId || state.activePresetId;
    const targetPreset = state.setlistPresets.find((p) => p.id === targetPresetId);

    if (!targetPreset) {
      return {
        valid: false,
        error: `Target setlist preset "${params.presetName || targetPresetId}" does not exist or was deleted`,
      };
    }

    const songIds = params.songIds || (Array.isArray(params.songs) ? params.songs.map((s: any) => s.id) : null);
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      return {
        valid: false,
        error: 'Missing reordered song IDs',
      };
    }

    return { valid: true };
  }

  if (actionType === 'stagex:arrange_stage') {
    const elements = params.elements || params.arrangement;
    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      return {
        valid: false,
        error: 'Missing stage elements arrangement',
      };
    }
    return { valid: true };
  }

  if (actionType === 'stagex:create_preset') {
    if (!params.name || typeof params.name !== 'string' || !params.name.trim()) {
      return {
        valid: false,
        error: 'Preset name is required',
      };
    }
    return { valid: true };
  }

  return { valid: true };
}

export async function executeStagexAction(
  actionType: string,
  params: Record<string, any>
): Promise<AppActionResult> {
  const store = useStagexStore.getState();

  // 1. Reorder Setlist
  if (actionType === 'stagex:reorder_setlist') {
    const targetPresetId = params.presetId || store.activePresetId;
    const targetPreset = store.setlistPresets.find((p) => p.id === targetPresetId);

    // Stale state check
    if (!targetPreset) {
      return {
        success: false,
        error: `Target setlist preset "${params.presetName || targetPresetId}" no longer exists`,
      };
    }

    // Switch to target preset if not already active
    if (store.activePresetId !== targetPresetId) {
      store.selectPreset(targetPresetId);
    }

    const currentSongs = [...targetPreset.songs];
    const requestedOrder: string[] =
      params.songIds || (Array.isArray(params.songs) ? params.songs.map((s: any) => s.id) : []);

    // Reorder matching songs
    const reordered: SetlistSong[] = [];
    const usedIds = new Set<string>();

    // First, add songs in requested order by ID or matching title
    for (const reqIdOrTitle of requestedOrder) {
      const match = currentSongs.find(
        (s) =>
          !usedIds.has(s.id) &&
          (s.id === reqIdOrTitle ||
            s.title?.toLowerCase().trim() === String(reqIdOrTitle).toLowerCase().trim())
      );
      if (match) {
        reordered.push(match);
        usedIds.add(match.id);
      }
    }

    // Preserve any songs that weren't mentioned in the new order (never drop user songs!)
    for (const song of currentSongs) {
      if (!usedIds.has(song.id)) {
        reordered.push(song);
      }
    }

    // Apply to canonical store
    store.setSetlistSongs(reordered);

    // Navigate to Stagex Setlist view
    try {
      NavigationDispatcher.push({ app: 'stagex', page: 'setup' });
      store.setSetupSubView('setlist');
    } catch (_) {}

    return {
      success: true,
      message: `Applied suggested order to "${targetPreset.name}" (${reordered.length} songs)`,
      data: {
        presetId: targetPreset.id,
        presetName: targetPreset.name,
        songCount: reordered.length,
      },
    };
  }

  // 2. Arrange Stage Plot
  if (actionType === 'stagex:arrange_stage') {
    const elements = params.elements || params.arrangement;
    if (!Array.isArray(elements) || elements.length === 0) {
      return {
        success: false,
        error: 'Invalid stage arrangement elements',
      };
    }

    // Update store state with remapped elements
    const updatedElements = elements.map((el: any, idx: number) => ({
      id: el.id || `el-${Date.now()}-${idx}`,
      name: el.name || el.label || 'Instrument',
      type: el.type || 'instrument',
      x: typeof el.x === 'number' ? Math.max(5, Math.min(95, el.x)) : 50,
      y: typeof el.y === 'number' ? Math.max(5, Math.min(95, el.y)) : 50,
      label: el.label || el.name,
      color: el.color || '#ffffff',
    }));

    useStagexStore.setState((s) => ({
      elements: updatedElements,
    }));

    // Navigate to Stagex Stage view
    try {
      NavigationDispatcher.push({ app: 'stagex', page: 'stage' });
    } catch (_) {}

    return {
      success: true,
      message: `Arranged ${updatedElements.length} elements on the stage plot`,
      data: { elementCount: updatedElements.length },
    };
  }

  // 3. Create Preset
  if (actionType === 'stagex:create_preset') {
    const name = (params.name || 'New Setlist').trim();
    const songs = Array.isArray(params.songs) ? params.songs : [];
    const newId = store.createPreset(name, songs);

    return {
      success: true,
      message: `Created preset "${name}" in Stagex`,
      data: { presetId: newId, name },
    };
  }

  return {
    success: false,
    error: `Unknown Stagex action: ${actionType}`,
  };
}

export const stagexAssistantProvider: AppContextProvider = {
  app: 'stagex',
  getContext: getStagexContextSnapshot,
  validateAction: validateStagexAction,
  executeAction: executeStagexAction,
};

export function registerStagexAssistantProvider(): () => void {
  return registerAppContextProvider(stagexAssistantProvider);
}
