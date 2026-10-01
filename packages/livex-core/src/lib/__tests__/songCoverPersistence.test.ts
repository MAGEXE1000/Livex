import { describe, it, expect, beforeEach } from 'vitest';
import { useChordStore } from '../../store/useChordStore';

describe('Song Cover Persistence & Storage Unit Tests', () => {
  beforeEach(() => {
    // Reset store state
    useChordStore.setState({
      presets: [],
      activePresetId: null,
      customChords: [],
    });
  });

  it('creates a new song with an optimized custom cover image', () => {
    const mockDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...sampleMockCoverData';
    const songId = useChordStore.getState().createPreset({
      name: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      bpm: 72,
      key: 'Am',
      notes: 'Classic acoustic intro',
      chords: ['Am', 'C', 'D', 'F'],
      coverImage: mockDataUrl,
    });

    const preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('Stairway to Heaven');
    expect(preset?.coverImage).toBe(mockDataUrl);
    expect(preset?.updatedAt).toBeTypeOf('number');
  });

  it('updates an existing song with a new cover image without losing other metadata', () => {
    const songId = useChordStore.getState().createPreset({
      name: 'Hotel California',
      artist: 'Eagles',
      bpm: 75,
      key: 'Bm',
      notes: 'Solo at the end',
      chords: ['Bm', 'F#', 'A', 'E'],
    });

    let preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset?.coverImage).toBeUndefined();

    const newCover = 'data:image/jpeg;base64,sampleNewCoverUpdatedData';
    useChordStore.getState().updatePreset(songId, {
      coverImage: newCover,
    });

    preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset?.coverImage).toBe(newCover);
    expect(preset?.name).toBe('Hotel California');
    expect(preset?.bpm).toBe(75);
    expect(preset?.key).toBe('Bm');
  });

  it('allows removing a custom cover image back to undefined', () => {
    const initialCover = 'data:image/jpeg;base64,initialCoverData';
    const songId = useChordStore.getState().createPreset({
      name: 'Blackbird',
      artist: 'The Beatles',
      bpm: 94,
      key: 'G',
      notes: 'Fingerpicking',
      chords: ['G', 'Am7', 'G/B'],
      coverImage: initialCover,
    });

    let preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset?.coverImage).toBe(initialCover);

    useChordStore.getState().updatePreset(songId, {
      coverImage: undefined,
    });

    preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset?.coverImage).toBeUndefined();
  });

  it('preserves cover image during chord additions and section updates', () => {
    const coverUrl = 'data:image/jpeg;base64,permanentCoverStayData';
    const songId = useChordStore.getState().createPreset({
      name: 'Wonderwall',
      artist: 'Oasis',
      bpm: 88,
      key: 'Em',
      notes: 'Capo 2',
      chords: ['Em7', 'G', 'Dsus4', 'A7sus4'],
      coverImage: coverUrl,
    });

    useChordStore.getState().addSection(songId, 'Chorus');
    useChordStore.getState().addChordToPreset(songId, 'Cadd9');

    const preset = useChordStore.getState().presets.find((p) => p.id === songId);
    expect(preset?.coverImage).toBe(coverUrl);
    expect(preset?.chords).toContain('Cadd9');
    expect(preset?.sections?.length).toBe(1);
    expect(preset?.sections?.[0].name).toBe('Chorus');
  });
});
