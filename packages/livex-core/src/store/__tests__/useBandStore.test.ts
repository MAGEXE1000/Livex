import { describe, it, expect, beforeEach } from 'vitest';
import { useBandStore, generateBandCode } from '../useBandStore';

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

  it('joins a band with code and adds member', async () => {
    const res = await useBandStore.getState().joinBandByCode(
      'LVX999',
      'user-456',
      'Sarah Bass'
    );

    expect(res.success).toBe(true);
    const state = useBandStore.getState();
    expect(state.currentBand?.code).toBe('LVX999');
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

  it('adds and removes shared songs', () => {
    const band = useBandStore.getState().createBand('Groove Collective', 'u1', 'Leader');
    const song = useBandStore.getState().addSharedSong({
      bandId: band.id,
      songId: 'song-101',
      title: 'Midnight Jam',
      key: 'Am',
      bpm: 110,
      updatedBy: 'u1',
    });

    expect(song.id).toBeTruthy();
    expect(song.title).toBe('Midnight Jam');
    expect(useBandStore.getState().sharedSongs.length).toBe(1);

    useBandStore.getState().removeSharedSong(song.id);
    expect(useBandStore.getState().sharedSongs.length).toBe(0);
  });
});
