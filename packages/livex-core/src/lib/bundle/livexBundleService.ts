import { NavigationDispatcher } from '../navigation/NavigationDispatcher';
import { useChordStore } from '../../store/useChordStore';
import type { Setlist, SetlistLivexBundle } from '../../types/setlist';
import type { SongPreset, SongSection } from '../../store/slices/songSlice';

export type ParsedBundleResult =
  | {
      type: 'setlist';
      bundle: SetlistLivexBundle;
      songCount: number;
    }
  | {
      type: 'song';
      preset: Omit<SongPreset, 'id' | 'createdAt' | 'updatedAt'>;
      rawChordNames?: string[];
    }
  | {
      type: 'invalid';
      error: string;
    };

/**
 * Robustly parses and normalizes any incoming Livex bundle string (.livex, .json, .bin).
 */
export function parseLivexBundle(rawText: string): ParsedBundleResult {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { type: 'invalid', error: 'Empty file content.' };
  }

  let raw: any;
  try {
    raw = JSON.parse(rawText.trim());
  } catch (err: any) {
    return { type: 'invalid', error: `Malformed JSON content: ${err?.message || 'Syntax error'}` };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { type: 'invalid', error: 'Content is not a valid JSON object.' };
  }

  // 1. Detect Setlist Bundle
  if (
    raw._type === 'setlist' ||
    (raw.sections && (raw.title || raw.name)) ||
    (raw.setlist && (raw.setlist.title || raw.setlist.name))
  ) {
    let setlistObj: Setlist | null = null;
    let songsArr: SongPreset[] = Array.isArray(raw.songs) ? raw.songs : [];

    if (raw._type === 'setlist' && raw.setlist) {
      setlistObj = raw.setlist;
    } else if (raw.setlist && (raw.setlist.title || raw.setlist.name)) {
      setlistObj = {
        id: raw.setlist.id || `setlist-${Date.now()}`,
        title: raw.setlist.title || raw.setlist.name || 'Imported Setlist',
        description: raw.setlist.description,
        date: raw.setlist.date,
        bandId: raw.setlist.bandId,
        color: raw.setlist.color,
        sections: Array.isArray(raw.setlist.sections) ? raw.setlist.sections : [],
        createdAt: raw.setlist.createdAt || Date.now(),
        updatedAt: raw.setlist.updatedAt || Date.now(),
      };
    } else if (raw.sections && (raw.title || raw.name)) {
      setlistObj = {
        id: raw.id || `setlist-${Date.now()}`,
        title: raw.title || raw.name || 'Imported Setlist',
        description: raw.description,
        date: raw.date,
        bandId: raw.bandId,
        color: raw.color,
        sections: Array.isArray(raw.sections) ? raw.sections : [],
        createdAt: raw.createdAt || Date.now(),
        updatedAt: raw.updatedAt || Date.now(),
      };
    }

    if (!setlistObj || !setlistObj.title) {
      return {
        type: 'invalid',
        error: 'Setlist payload is missing a valid title or sections.',
      };
    }

    const bundle: SetlistLivexBundle = {
      _app: 'Livex',
      _type: 'setlist',
      _version: typeof raw._version === 'number' ? raw._version : 2,
      setlist: setlistObj,
      songs: songsArr,
      exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : Date.now(),
    };

    return {
      type: 'setlist',
      bundle,
      songCount: songsArr.length,
    };
  }

  // 2. Detect Single Song Package
  const songName = (raw.songName ?? raw.name ?? raw.title ?? '').trim();
  if (songName || raw.chords || raw.chordIds) {
    const cleanName = songName || 'Untitled Song';
    const rawChords = Array.isArray(raw.chordIds) ? raw.chordIds : Array.isArray(raw.chords) ? raw.chords : [];
    const resolvedIds: string[] = [];
    const rawChordNames: string[] = [];

    for (const c of rawChords) {
      if (typeof c === 'string' && c.trim()) {
        resolvedIds.push(c.trim());
        rawChordNames.push(c.trim());
      } else if (typeof c === 'object' && c !== null) {
        if (c.id && typeof c.id === 'string') {
          resolvedIds.push(c.id.trim());
        }
        if (c.name && typeof c.name === 'string') {
          rawChordNames.push(c.name.trim());
        }
      }
    }

    const bpmVal = Math.max(40, Math.min(400, parseInt(raw.bpm || raw.speed) || 120));

    const songPreset: Omit<SongPreset, 'id' | 'createdAt' | 'updatedAt'> = {
      name: cleanName,
      artist: (raw.artist ?? '').trim(),
      bpm: bpmVal,
      speed: bpmVal,
      barsPerLine: typeof raw.barsPerLine === 'number' ? raw.barsPerLine : undefined,
      key: (raw.key ?? '').trim() || 'C',
      notes: (raw.notes ?? '').trim(),
      chords: resolvedIds,
      sections: Array.isArray(raw.sections) ? raw.sections : undefined,
      lyrics: raw.lyrics && typeof raw.lyrics === 'object' ? raw.lyrics : undefined,
      targetDurationSeconds:
        typeof raw.targetDurationSeconds === 'number' && raw.targetDurationSeconds > 0
          ? raw.targetDurationSeconds
          : undefined,
      coverImage: typeof raw.coverImage === 'string' ? raw.coverImage : undefined,
      coverUri: typeof raw.coverUri === 'string' ? raw.coverUri : undefined,
    };

    return {
      type: 'song',
      preset: songPreset,
      rawChordNames,
    };
  }

  return {
    type: 'invalid',
    error: 'Unrecognized Livex bundle format. File must contain a Setlist or Song package.',
  };
}

export interface DispatchBundleResult {
  handled: boolean;
  type?: 'setlist' | 'song';
  title?: string;
  songCount?: number;
  error?: string;
}

/**
 * Parses and dispatches an incoming Livex bundle (.livex, .json, .bin)
 * to the appropriate store and navigates to Chordex.
 */
export function dispatchIncomingLivexBundle(
  rawJsonText: string,
  fileName?: string
): DispatchBundleResult {
  const parsed = parseLivexBundle(rawJsonText);

  if (parsed.type === 'invalid') {
    return {
      handled: false,
      error: parsed.error,
    };
  }

  if (parsed.type === 'setlist') {
    const store = useChordStore.getState();
    store.setPendingSetlistImport(parsed.bundle);
    store.setSongsSubTab('setlists');
    store.setActivePreset(null);

    NavigationDispatcher.push({
      app: 'chordex',
      page: 'songs',
    });

    return {
      handled: true,
      type: 'setlist',
      title: parsed.bundle.setlist.title,
      songCount: parsed.songCount,
    };
  }

  if (parsed.type === 'song') {
    const store = useChordStore.getState();
    store.setPendingImport({
      title: parsed.preset.name,
      artist: parsed.preset.artist,
      bpm: parsed.preset.bpm,
      speed: parsed.preset.speed,
      barsPerLine: parsed.preset.barsPerLine,
      key: parsed.preset.key,
      notes: parsed.preset.notes,
      chordIds: parsed.preset.chords,
      chordNames: parsed.rawChordNames || parsed.preset.chords,
      targetDurationSeconds: parsed.preset.targetDurationSeconds,
      coverImage: parsed.preset.coverImage,
      coverUri: parsed.preset.coverUri,
    });
    store.setSongsSubTab('all');
    store.setActivePreset(null);

    NavigationDispatcher.push({
      app: 'chordex',
      page: 'songs',
    });

    return {
      handled: true,
      type: 'song',
      title: parsed.preset.name,
    };
  }

  return { handled: false, error: 'Unknown payload type' };
}
