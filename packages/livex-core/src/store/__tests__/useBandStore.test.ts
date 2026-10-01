import { describe, it, expect, beforeEach } from 'vitest';
import { useBandStore, generateBandCode } from '../useBandStore';
import type { SongPreset } from '../slices/songSlice';

describe('Band & Team Store (useBandStore)', () => {
  beforeEach(() => {
    useBandStore.getState().leaveBand();
  });

  it('generates valid uppercase alphanumeric join codes with length >= 6', () => {
    const code = generateBandCode();
    expect(code).toMatch(/^LVX[A-Z0-9]{3}$/);
    expect(code.length).toBe(6);
  });

  it('creates a new band, generates unique join code, and assigns user as leader', () => {
    const band = useBandStore.getState().createBand(
      'The Neon Mavericks',
      'user-123',
      'Alex Drummer',
      'Synthwave rock band'
    );

    expect(band.name).toBe('The Neon Mavericks');
    expect(band.leaderId).toBe('user-123');
    expect(band.code).toBeTruthy();
    expect(band.code.length).toBe(6);

    const state = useBandStore.getState();
    expect(state.currentBand?.id).toBe(band.id);
    expect(state.members.length).toBe(1);
    expect(state.members[0].displayName).toBe('Alex Drummer');
    expect(state.members[0].role).toBe('leader');
  });

  it('joins a band with code and adds member with normalized code', async () => {
    const res = await useBandStore.getState().joinBandByCode(
      'band-4x29',
      'user-456',
      'Sarah Bass'
    );

    expect(res.success).toBe(true);
    const state = useBandStore.getState();
    expect(state.currentBand?.code).toBe('BAND4X29');
    expect(state.members.some((m) => m.userId === 'user-456')).toBe(true);
  });

  it('rejects joining with invalid or short code', async () => {
    const res = await useBandStore.getState().joinBandByCode('AB', 'user-456', 'Sarah');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Invalid join code');
  });

  it('leaves band cleanly resetting active state', () => {
    useBandStore.getState().createBand('Echo Chamber', 'u1', 'Leader');
    expect(useBandStore.getState().currentBand).not.toBeNull();

    useBandStore.getState().leaveBand();
    expect(useBandStore.getState().currentBand).toBeNull();
    expect(useBandStore.getState().members.length).toBe(0);
    expect(useBandStore.getState().sharedSongs.length).toBe(0);
  });

  it('shares song from preset and imports to library', () => {
    const band = useBandStore.getState().createBand('Groove Collective', 'u1', 'Leader');
    const mockPreset: SongPreset = {
      id: 'local-song-1',
      name: 'Starlight Groove',
      artist: 'Solaris',
      bpm: 128,
      key: 'G',
      notes: 'Solo at bar 32',
      chords: ['G', 'Em', 'C', 'D'],
      sections: [{ id: 's1', name: 'Verse', chords: ['G', 'Em'] }],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const sharedSong = useBandStore.getState().shareSongFromPreset(
      mockPreset,
      band.id,
      'u1',
      'Alex Drummer'
    );

    expect(sharedSong.id).toBeTruthy();
    expect(sharedSong.title).toBe('Starlight Groove');
    expect(sharedSong.artist).toBe('Solaris');
    expect(sharedSong.bpm).toBe(128);
    expect(useBandStore.getState().sharedSongs.length).toBe(1);

    // Test importSharedSongToLibrary
    let createdPresetData: any = null;
    const newId = useBandStore.getState().importSharedSongToLibrary(sharedSong, (data) => {
      createdPresetData = data;
      return 'imported-id-123';
    });

    expect(newId).toBe('imported-id-123');
    expect(createdPresetData.name).toBe('Starlight Groove');
    expect(createdPresetData.artist).toBe('Solaris');
    expect(createdPresetData.key).toBe('G');
    expect(createdPresetData.chords).toEqual(['G', 'Em', 'C', 'D']);

    // Test remove
    useBandStore.getState().removeSharedSong(sharedSong.id);
    expect(useBandStore.getState().sharedSongs.length).toBe(0);
  });

  it('manages shared band calendar events (gigs, rehearsals, call times)', () => {
    const band = useBandStore.getState().createBand('Retro Nova', 'u1', 'Alex');

    const newEvent = useBandStore.getState().addEvent({
      bandId: band.id,
      title: 'Saturday Night Stage Performance',
      type: 'gig',
      date: '2026-10-15',
      time: '21:00',
      callTime: '19:30',
      location: 'Electric Garden Main Stage',
      notes: 'Bring spare cables and IEMs',
      createdBy: 'u1',
    });

    expect(newEvent.id).toBeTruthy();
    expect(newEvent.title).toBe('Saturday Night Stage Performance');
    expect(newEvent.type).toBe('gig');
    expect(newEvent.callTime).toBe('19:30');

    const state = useBandStore.getState();
    expect(state.events.length).toBe(1);
    expect(state.events[0].location).toBe('Electric Garden Main Stage');

    // Update event
    useBandStore.getState().updateEvent(newEvent.id, { time: '21:30', callTime: '20:00' });
    const updatedState = useBandStore.getState();
    expect(updatedState.events[0].time).toBe('21:30');
    expect(updatedState.events[0].callTime).toBe('20:00');

    // Delete event
    useBandStore.getState().deleteEvent(newEvent.id);
    expect(useBandStore.getState().events.length).toBe(0);
  });
});
