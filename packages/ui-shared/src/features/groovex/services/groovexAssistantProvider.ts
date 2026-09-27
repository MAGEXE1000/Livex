/**
 * Groovex Assistant Provider
 *
 * Exposes Groovex context (current song, stems, practice state)
 * and executes Groovex actions (configuring stems, muting/soloing for practice).
 */

import {
  registerAppContextProvider,
  type AppContextProvider,
  type AppActionResult,
  type AppActionValidation,
  type GroovexContextSnapshot,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { useGroovexStore } from '../state/useGroovexStore';

export function getGroovexContextSnapshot(): GroovexContextSnapshot {
  const state = useGroovexStore.getState();
  const currentSongId = state.activeSongId;

  return {
    currentSongId,
    stemVolumes: currentSongId ? state.stemVolumes[currentSongId] || {} : undefined,
    stemMutes: currentSongId ? state.stemMutes[currentSongId] || {} : undefined,
    recentSongsCount: state.recentSongs?.length || 0,
  };
}

export function validateGroovexAction(
  actionType: string,
  params: Record<string, any>
): AppActionValidation {
  if (actionType === 'groovex:configure_stems') {
    if (!params || (!params.stems && !params.stemAdjustments && !params.volumes && !params.mutes)) {
      return {
        valid: false,
        error: 'Missing stem configuration parameters',
      };
    }
    return { valid: true };
  }

  return { valid: true };
}

export async function executeGroovexAction(
  actionType: string,
  params: Record<string, any>
): Promise<AppActionResult> {
  const store = useGroovexStore.getState();

  if (actionType === 'groovex:configure_stems') {
    const songId = params.songId || store.activeSongId || 'active-song';

    // Handle array of stem objects: [{ name: 'guitar', volume: 0, isMuted: true }, ...]
    const stemsList = params.stems || params.stemAdjustments;
    if (Array.isArray(stemsList)) {
      for (const item of stemsList) {
        const stemName = item.name || item.id || item.stem;
        if (stemName) {
          if (typeof item.volume === 'number') {
            store.setStemVolume(songId, stemName, Math.max(0, Math.min(1.5, item.volume)));
          }
          if (typeof item.isMuted === 'boolean') {
            store.setStemMute(songId, stemName, item.isMuted);
          } else if (typeof item.muted === 'boolean') {
            store.setStemMute(songId, stemName, item.muted);
          }
        }
      }
    }

    // Handle explicit volume dictionary
    if (params.volumes && typeof params.volumes === 'object') {
      for (const [stem, vol] of Object.entries(params.volumes)) {
        if (typeof vol === 'number') {
          store.setStemVolume(songId, stem, Math.max(0, Math.min(1.5, vol)));
        }
      }
    }

    // Handle explicit mute dictionary
    if (params.mutes && typeof params.mutes === 'object') {
      for (const [stem, muted] of Object.entries(params.mutes)) {
        if (typeof muted === 'boolean') {
          store.setStemMute(songId, stem, muted);
        }
      }
    }

    // Navigate to Groovex player
    try {
      NavigationDispatcher.push({ app: 'groovex', page: 'player' });
    } catch (_) {}

    return {
      success: true,
      message: 'Applied practice setup to Groovex stems',
      data: { songId },
    };
  }

  return {
    success: false,
    error: `Unknown Groovex action: ${actionType}`,
  };
}

export const groovexAssistantProvider: AppContextProvider = {
  app: 'groovex',
  getContext: getGroovexContextSnapshot,
  validateAction: validateGroovexAction,
  executeAction: executeGroovexAction,
};

export function registerGroovexAssistantProvider(): () => void {
  return registerAppContextProvider(groovexAssistantProvider);
}
