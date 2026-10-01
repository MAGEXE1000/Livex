import { describe, it, expect, beforeEach } from 'vitest';
import { useChordStore } from '../../store/useChordStore';
import {
  calculateSetlistStats,
  flattenSetlistToQueue,
  type Setlist,
  type SetlistSection,
} from '../../types/setlist';
import type { SongPreset } from '../../store/slices/songSlice';

describe('Setlists & Repertoire Subsystem Suite', () => {
  beforeEach(() => {
    useChordStore.setState({
      presets: [],
      setlists: [],
      activeSetlistId: null,
      songsSubTab: 'all',
    });
  });

  it('creates a new setlist with default initial section', () => {
    const setlistId = useChordStore.getState().createSetlist({
      title: 'Repertorio 1',
      description: 'Main gig setlist',
      date: '2026-10-15',
    });

    const store = useChordStore.getState();
    expect(store.setlists.length).toBe(1);
    const created = store.setlists[0];
    expect(created.id).toBe(setlistId);
    expect(created.title).toBe('Repertorio 1');
    expect(created.description).toBe('Main gig setlist');
    expect(created.date).toBe('2026-10-15');
    expect(created.sections.length).toBe(1);
    expect(created.sections[0].name).toBe('Set 1');
    expect(created.sections[0].songIds).toEqual([]);
  });

  it('supports custom initial sections', () => {
    const setlistId = useChordStore.getState().createSetlist({
      title: 'Festival 2026',
      sections: [
        { name: 'Bloque 1', songIds: ['song-1', 'song-2'] },
        { name: 'Acoustic Break', songIds: ['song-3'] },
        { name: 'Encore', songIds: ['song-4'] },
      ],
    });

    const setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId);
    expect(setlist).toBeDefined();
    expect(setlist?.sections.length).toBe(3);
    expect(setlist?.sections[0].name).toBe('Bloque 1');
    expect(setlist?.sections[1].name).toBe('Acoustic Break');
    expect(setlist?.sections[2].name).toBe('Encore');
    expect(setlist?.sections[0].songIds).toEqual(['song-1', 'song-2']);
  });

  it('updates setlist metadata and deletes setlist cleanly', () => {
    const setlistId = useChordStore.getState().createSetlist({
      title: 'Draft Repertoire',
    });

    useChordStore.getState().updateSetlist(setlistId, {
      title: 'Final Repertoire 2026',
      description: 'Confirmed songs',
    });

    let setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId);
    expect(setlist?.title).toBe('Final Repertoire 2026');
    expect(setlist?.description).toBe('Confirmed songs');

    useChordStore.getState().deleteSetlist(setlistId);
    setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId);
    expect(setlist).toBeUndefined();
    expect(useChordStore.getState().setlists.length).toBe(0);
  });

  it('duplicates a setlist with independent sections and copies', () => {
    const originalId = useChordStore.getState().createSetlist({
      title: 'Tour Set A',
      sections: [{ name: 'Set 1', songIds: ['s1', 's2'] }],
    });

    const copyId = useChordStore.getState().duplicateSetlist(originalId);
    const store = useChordStore.getState();
    expect(store.setlists.length).toBe(2);

    const copy = store.setlists.find((s) => s.id === copyId);
    expect(copy?.title).toBe('Tour Set A (Copy)');
    expect(copy?.sections.length).toBe(1);
    expect(copy?.sections[0].songIds).toEqual(['s1', 's2']);

    // Ensure IDs are independent
    expect(copy?.sections[0].id).not.toBe(store.setlists.find((s) => s.id === originalId)?.sections[0].id);
  });

  it('manages sections: add, rename, delete, and reorder', () => {
    const setlistId = useChordStore.getState().createSetlist({
      title: 'Rock Night',
      sections: [{ name: 'Opener', songIds: [] }],
    });

    const sec2Id = useChordStore.getState().addSectionToSetlist(setlistId, 'Main Set');
    const sec3Id = useChordStore.getState().addSectionToSetlist(setlistId, 'Encore');

    let setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(setlist.sections.length).toBe(3);
    expect(setlist.sections[1].name).toBe('Main Set');
    expect(setlist.sections[2].name).toBe('Encore');

    // Rename section
    useChordStore.getState().updateSetlistSection(setlistId, sec2Id, 'Heavy Rock Set');
    setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(setlist.sections[1].name).toBe('Heavy Rock Set');

    // Reorder sections (move Opener to bottom: 0 -> 2)
    useChordStore.getState().reorderSetlistSections(setlistId, 0, 2);
    setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(setlist.sections[0].name).toBe('Heavy Rock Set');
    expect(setlist.sections[1].name).toBe('Encore');
    expect(setlist.sections[2].name).toBe('Opener');

    // Delete section
    useChordStore.getState().deleteSetlistSection(setlistId, sec3Id);
    setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(setlist.sections.length).toBe(2);
    expect(setlist.sections.find((s) => s.id === sec3Id)).toBeUndefined();
  });

  it('adds, removes, reorders songs in section and moves between sections', () => {
    const setlistId = useChordStore.getState().createSetlist({
      title: 'Live Gig',
      sections: [
        { name: 'Set 1', songIds: ['song-a', 'song-b'] },
        { name: 'Set 2', songIds: ['song-c'] },
      ],
    });

    const setlist = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    const sec1Id = setlist.sections[0].id;
    const sec2Id = setlist.sections[1].id;

    // Add songs to Set 1
    useChordStore.getState().addSongsToSetlistSection(setlistId, sec1Id, ['song-d', 'song-e']);
    let updated = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(updated.sections[0].songIds).toEqual(['song-a', 'song-b', 'song-d', 'song-e']);

    // Reorder songs in Set 1 (move song-e from index 3 to 0)
    useChordStore.getState().reorderSongsInSetlistSection(setlistId, sec1Id, 3, 0);
    updated = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(updated.sections[0].songIds).toEqual(['song-e', 'song-a', 'song-b', 'song-d']);

    // Remove song at index 1 (song-a)
    useChordStore.getState().removeSongFromSetlistSection(setlistId, sec1Id, 1);
    updated = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(updated.sections[0].songIds).toEqual(['song-e', 'song-b', 'song-d']);

    // Move song-b from Set 1 (index 1) to Set 2 (index 0)
    useChordStore.getState().moveSongBetweenSetlistSections(setlistId, sec1Id, 1, sec2Id, 0);
    updated = useChordStore.getState().setlists.find((s) => s.id === setlistId)!;
    expect(updated.sections[0].songIds).toEqual(['song-e', 'song-d']);
    expect(updated.sections[1].songIds).toEqual(['song-b', 'song-c']);
  });

  it('guarantees canonical songs in library are not mutated by setlist changes', () => {
    // Add real songs to presets store
    const song1Id = useChordStore.getState().createPreset({
      name: 'Bohemian Rhapsody',
      artist: 'Queen',
      bpm: 120,
      key: 'Bb',
      notes: 'Masterpiece',
      chords: ['chord-1', 'chord-2'],
    });

    const song2Id = useChordStore.getState().createPreset({
      name: 'Hotel California',
      artist: 'Eagles',
      bpm: 75,
      key: 'Bm',
      notes: 'Classic',
      chords: ['chord-3', 'chord-4'],
    });

    const setlistId = useChordStore.getState().createSetlist({
      title: 'Classic Rock',
      sections: [{ name: 'Set 1', songIds: [song1Id, song2Id] }],
    });

    const secId = useChordStore.getState().setlists.find((s) => s.id === setlistId)!.sections[0].id;

    // Delete song from setlist
    useChordStore.getState().removeSongFromSetlistSection(setlistId, secId, 0);

    // Verify presets still have Bohemian Rhapsody untouched
    const presets = useChordStore.getState().presets;
    expect(presets.length).toBe(2);
    expect(presets.find((p) => p.id === song1Id)?.name).toBe('Bohemian Rhapsody');
    expect(presets.find((p) => p.id === song2Id)?.name).toBe('Hotel California');
  });

  it('calculates setlist statistics accurately', () => {
    const presets: SongPreset[] = [
      {
        id: 's1',
        name: 'Song One',
        artist: 'Artist A',
        bpm: 120,
        key: 'C',
        notes: '',
        chords: [],
        targetDurationSeconds: 240, // 4 min
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 's2',
        name: 'Song Two',
        artist: 'Artist B',
        bpm: 100,
        key: 'G',
        notes: '',
        chords: [],
        targetDurationSeconds: 180, // 3 min
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 's3',
        name: 'Song Three',
        artist: 'Artist C',
        bpm: 140,
        key: 'Am',
        notes: '',
        chords: [],
        targetDurationSeconds: 120, // 2 min
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const setlist: Setlist = {
      id: 'set-1',
      title: 'Full Show',
      sections: [
        { id: 'sec-1', name: 'Set 1', songIds: ['s1', 's2'] },
        { id: 'sec-2', name: 'Encore', songIds: ['s3'] },
      ],
      createdAt: 0,
      updatedAt: 0,
    };

    const stats = calculateSetlistStats(setlist, presets);
    expect(stats.totalSongs).toBe(3);
    expect(stats.sectionCount).toBe(2);
    expect(stats.totalDurationSeconds).toBe(540); // 240 + 180 + 120 = 540s (9 minutes)
    expect(stats.songsBySection['sec-1'].length).toBe(2);
    expect(stats.songsBySection['sec-2'].length).toBe(1);
  });

  it('flattens setlist into ordered live playback queue with section tracking', () => {
    const presets: SongPreset[] = [
      {
        id: 's1',
        name: 'Intro Track',
        artist: 'Band',
        bpm: 120,
        key: 'D',
        notes: '',
        chords: [],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 's2',
        name: 'Hit Single',
        artist: 'Band',
        bpm: 128,
        key: 'G',
        notes: '',
        chords: [],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 's3',
        name: 'Encore Ballad',
        artist: 'Band',
        bpm: 80,
        key: 'Em',
        notes: '',
        chords: [],
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const setlist: Setlist = {
      id: 'set-live',
      title: 'Live Arena',
      sections: [
        { id: 'sec-main', name: 'Main Set', songIds: ['s1', 's2'] },
        { id: 'sec-encore', name: 'Encore', songIds: ['s3'] },
      ],
      createdAt: 0,
      updatedAt: 0,
    };

    const queue = flattenSetlistToQueue(setlist, presets);
    expect(queue.length).toBe(3);

    expect(queue[0].song.name).toBe('Intro Track');
    expect(queue[0].sectionName).toBe('Main Set');
    expect(queue[0].indexInSetlist).toBe(0);
    expect(queue[0].totalSongs).toBe(3);

    expect(queue[1].song.name).toBe('Hit Single');
    expect(queue[1].sectionName).toBe('Main Set');
    expect(queue[1].indexInSetlist).toBe(1);

    expect(queue[2].song.name).toBe('Encore Ballad');
    expect(queue[2].sectionName).toBe('Encore');
    expect(queue[2].indexInSetlist).toBe(2);
  });
});
