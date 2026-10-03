import type { SongPreset } from '../store/slices/songSlice';

export interface SetlistSection {
  id: string;
  name: string;
  songIds: string[];
}

export interface Setlist {
  id: string;
  title: string;
  bandId?: string;
  date?: string;
  description?: string;
  sections: SetlistSection[];
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface SetlistLivexBundle {
  _app: 'Livex';
  _type: 'setlist';
  _version: number;
  setlist: Setlist;
  songs: SongPreset[];
  exportedAt: number;
}

export interface SetlistQueueItem {
  song: SongPreset;
  sectionId: string;
  sectionName: string;
  indexInSetlist: number;
  totalSongs: number;
}

export interface SetlistStats {
  totalSongs: number;
  totalDurationSeconds: number;
  sectionCount: number;
  songsBySection: Record<string, SongPreset[]>;
}

/**
 * Calculates aggregate stats for a setlist based on existing song presets.
 */
export function calculateSetlistStats(setlist: Setlist, presets: SongPreset[]): SetlistStats {
  const presetMap = new Map<string, SongPreset>();
  presets.forEach((p) => presetMap.set(p.id, p));

  let totalSongs = 0;
  let totalDurationSeconds = 0;
  const songsBySection: Record<string, SongPreset[]> = {};

  (setlist.sections || []).forEach((sec) => {
    const sectionSongs: SongPreset[] = [];
    (sec.songIds || []).forEach((songId) => {
      const preset = presetMap.get(songId);
      if (preset) {
        sectionSongs.push(preset);
        totalSongs += 1;
        // Target duration or nominal estimate
        const songDuration = preset.targetDurationSeconds && preset.targetDurationSeconds > 0
          ? preset.targetDurationSeconds
          : 180; // default 3 minutes if not specified
        totalDurationSeconds += songDuration;
      }
    });
    songsBySection[sec.id] = sectionSongs;
  });

  return {
    totalSongs,
    totalDurationSeconds,
    sectionCount: (setlist.sections || []).length,
    songsBySection,
  };
}

/**
 * Flattens all sections of a setlist into an ordered sequential queue for live playback.
 */
export function flattenSetlistToQueue(setlist: Setlist, presets: SongPreset[]): SetlistQueueItem[] {
  const presetMap = new Map<string, SongPreset>();
  presets.forEach((p) => presetMap.set(p.id, p));

  const rawQueue: { song: SongPreset; sectionId: string; sectionName: string }[] = [];

  (setlist.sections || []).forEach((sec) => {
    (sec.songIds || []).forEach((songId) => {
      const preset = presetMap.get(songId);
      if (preset) {
        rawQueue.push({
          song: preset,
          sectionId: sec.id,
          sectionName: sec.name || 'Set',
        });
      }
    });
  });

  const totalSongs = rawQueue.length;
  return rawQueue.map((item, idx) => ({
    ...item,
    indexInSetlist: idx,
    totalSongs,
  }));
}
