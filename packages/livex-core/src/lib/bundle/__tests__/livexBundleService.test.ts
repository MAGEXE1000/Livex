import { describe, it, expect, beforeEach } from 'vitest';
import { parseLivexBundle, dispatchIncomingLivexBundle } from '../livexBundleService';
import { useChordStore } from '../../../store/useChordStore';

describe('Livex Bundle Service (.livex & .bin tolerant import)', () => {
  beforeEach(() => {
    useChordStore.setState({
      setlists: [],
      presets: [],
      pendingSetlistImport: null,
      pendingImport: null,
      songsSubTab: 'all',
    });
  });

  it('correctly parses a canonical .livex Setlist bundle', () => {
    const rawBundle = JSON.stringify({
      _app: 'Livex',
      _type: 'setlist',
      _version: 2,
      setlist: {
        id: 'setlist-test-1',
        title: 'Sunday Worship Set',
        date: '2026-10-04',
        sections: [
          {
            id: 'sec-1',
            name: 'Praise',
            songIds: ['song-1', 'song-2'],
          },
        ],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      songs: [
        {
          id: 'song-1',
          name: 'Way Maker',
          artist: 'Sinach',
          bpm: 68,
          key: 'E',
          chords: ['E-major', 'B-major', 'Csharp-minor', 'A-major'],
        },
        {
          id: 'song-2',
          name: 'Goodness of God',
          artist: 'Bethel',
          bpm: 72,
          key: 'Ab',
          chords: ['Ab-major', 'Db-major', 'Eb-major'],
        },
      ],
      exportedAt: 1700000000000,
    });

    const parsed = parseLivexBundle(rawBundle);
    expect(parsed.type).toBe('setlist');
    if (parsed.type === 'setlist') {
      expect(parsed.bundle.setlist.title).toBe('Sunday Worship Set');
      expect(parsed.songCount).toBe(2);
      expect(parsed.bundle.songs[0].name).toBe('Way Maker');
    }
  });

  it('correctly parses a corrupted/renamed .bin file containing setlist JSON', () => {
    const rawBinJson = JSON.stringify({
      title: 'WhatsApp Received Set',
      description: 'Shared via WhatsApp as DOC-20261003-WA0012.bin',
      sections: [
        {
          id: 'sec-wa',
          name: 'Set A',
          songIds: ['s-1'],
        },
      ],
      songs: [
        {
          id: 's-1',
          name: 'Amazing Grace',
          artist: 'Traditional',
          bpm: 80,
          key: 'G',
          chords: ['G-major', 'C-major', 'D-7th'],
        },
      ],
    });

    const parsed = parseLivexBundle(rawBinJson);
    expect(parsed.type).toBe('setlist');
    if (parsed.type === 'setlist') {
      expect(parsed.bundle.setlist.title).toBe('WhatsApp Received Set');
      expect(parsed.songCount).toBe(1);
    }
  });

  it('correctly parses a single song package', () => {
    const rawSong = JSON.stringify({
      _app: 'Livex',
      _version: 2,
      songName: 'Oceans',
      artist: 'Hillsong',
      bpm: 130,
      key: 'D',
      chords: ['B-minor', 'A-major', 'D-major', 'G-major'],
    });

    const parsed = parseLivexBundle(rawSong);
    expect(parsed.type).toBe('song');
    if (parsed.type === 'song') {
      expect(parsed.preset.name).toBe('Oceans');
      expect(parsed.preset.artist).toBe('Hillsong');
      expect(parsed.preset.bpm).toBe(130);
      expect(parsed.preset.chords).toEqual(['B-minor', 'A-major', 'D-major', 'G-major']);
    }
  });

  it('fails gracefully on invalid JSON', () => {
    const parsed = parseLivexBundle('INVALID_BINARY_STREAM_xxx');
    expect(parsed.type).toBe('invalid');
    if (parsed.type === 'invalid') {
      expect(parsed.error).toContain('Malformed JSON content');
    }
  });

  it('dispatches setlist bundle to useChordStore state and activates setlists tab', () => {
    const rawBundle = JSON.stringify({
      _app: 'Livex',
      _type: 'setlist',
      _version: 2,
      setlist: {
        id: 'set-dispatch-1',
        title: 'Friday Rehearsal',
        sections: [{ id: 'sec-1', name: 'Main', songIds: [] }],
      },
      songs: [],
      exportedAt: Date.now(),
    });

    const res = dispatchIncomingLivexBundle(rawBundle, 'Friday_Rehearsal.livex');
    expect(res.handled).toBe(true);
    expect(res.type).toBe('setlist');
    expect(res.title).toBe('Friday Rehearsal');

    const state = useChordStore.getState();
    expect(state.pendingSetlistImport).not.toBeNull();
    expect(state.pendingSetlistImport?.setlist.title).toBe('Friday Rehearsal');
    expect(state.songsSubTab).toBe('setlists');
  });

  it('dispatches song package to useChordStore pendingImport and activates all songs tab', () => {
    const rawSong = JSON.stringify({
      songName: 'Reckless Love',
      artist: 'Cory Asbury',
      bpm: 68,
      key: 'Gb',
      chords: ['Gb-major', 'Ab-minor', 'Db-major'],
    });

    const res = dispatchIncomingLivexBundle(rawSong, 'Reckless_Love.livex');
    expect(res.handled).toBe(true);
    expect(res.type).toBe('song');
    expect(res.title).toBe('Reckless Love');

    const state = useChordStore.getState();
    expect(state.pendingImport).not.toBeNull();
    expect(state.pendingImport?.title).toBe('Reckless Love');
    expect(state.songsSubTab).toBe('all');
  });
});
