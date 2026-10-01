import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBandStore } from '../../store/useBandStore';
import {
  calculateTransitDrift,
  broadcastBandLivePacket,
  subscribeToBandLiveSession,
} from '../bandSyncService';
import type { LiveBandSyncPacket } from '../../types/band';

describe('Band Live Sync Engine', () => {
  beforeEach(() => {
    useBandStore.setState({
      currentBand: null,
      members: [],
      sharedSongs: [],
      userBands: [],
      isLoading: false,
      error: null,
      isBroadcasting: false,
      isLockedToLeader: false,
      activeLiveSession: null,
      lastSyncTimestamp: null,
    });
  });

  describe('Drift and Latency Compensation', () => {
    it('calculates accurate transit ms for fresh packets', () => {
      const now = 1000000;
      const packet: LiveBandSyncPacket = {
        bandId: 'band-123',
        leaderId: 'leader-1',
        leaderName: 'Leader',
        songId: 'song-1',
        songTitle: 'Test Song',
        action: 'PLAY',
        timestamp: now - 85, // 85ms ago
        currentLineIdx: 2,
        currentWordIdx: 6,
        currentBeat: 1,
        currentBar: 2,
        bpm: 120,
        barsPerLine: 2,
        autoPlay: true,
        version: 1,
      };

      const { transitMs, isStale } = calculateTransitDrift(packet, now);
      expect(transitMs).toBe(85);
      expect(isStale).toBe(false);
    });

    it('identifies stale packets beyond 8000ms threshold', () => {
      const now = 1000000;
      const packet: LiveBandSyncPacket = {
        bandId: 'band-123',
        leaderId: 'leader-1',
        leaderName: 'Leader',
        songId: 'song-1',
        songTitle: 'Old Song',
        action: 'PLAY',
        timestamp: now - 9500, // 9.5s ago
        currentLineIdx: 0,
        currentWordIdx: 0,
        currentBeat: 0,
        currentBar: 1,
        bpm: 120,
        barsPerLine: 2,
        autoPlay: true,
        version: 1,
      };

      const { transitMs, isStale } = calculateTransitDrift(packet, now);
      expect(transitMs).toBe(9500);
      expect(isStale).toBe(true);
    });

    it('clamps negative delta timestamps to 0ms gracefully', () => {
      const now = 1000000;
      const packet: LiveBandSyncPacket = {
        bandId: 'band-123',
        leaderId: 'leader-1',
        leaderName: 'Leader',
        songId: 'song-1',
        songTitle: 'Clock Skew Song',
        action: 'CUE',
        timestamp: now + 50, // 50ms ahead due to minor clock skew
        currentLineIdx: 1,
        currentWordIdx: 3,
        currentBeat: 0,
        currentBar: 1,
        bpm: 120,
        barsPerLine: 2,
        autoPlay: false,
        version: 1,
      };

      const { transitMs, isStale } = calculateTransitDrift(packet, now);
      expect(transitMs).toBe(0);
      expect(isStale).toBe(false);
    });
  });

  describe('useBandStore Live Session Integration', () => {
    it('updates broadcasting state correctly', () => {
      expect(useBandStore.getState().isBroadcasting).toBe(false);
      useBandStore.getState().setIsBroadcasting(true);
      expect(useBandStore.getState().isBroadcasting).toBe(true);
      useBandStore.getState().setIsBroadcasting(false);
      expect(useBandStore.getState().isBroadcasting).toBe(false);
    });

    it('updates locked-to-leader state and active session packet', () => {
      expect(useBandStore.getState().isLockedToLeader).toBe(false);
      useBandStore.getState().setIsLockedToLeader(true);
      expect(useBandStore.getState().isLockedToLeader).toBe(true);

      const packet: LiveBandSyncPacket = {
        bandId: 'band-abc',
        leaderId: 'user-leader',
        leaderName: 'Lead Singer',
        songId: 'song-456',
        songTitle: 'Live Stage Anthem',
        action: 'PLAY',
        timestamp: Date.now(),
        currentLineIdx: 3,
        currentWordIdx: 8,
        currentBeat: 2,
        currentBar: 1,
        bpm: 135,
        barsPerLine: 2,
        autoPlay: true,
        version: 5,
      };

      useBandStore.getState().setActiveLiveSession(packet);
      expect(useBandStore.getState().activeLiveSession).toEqual(packet);
      expect(useBandStore.getState().lastSyncTimestamp).toBeTypeOf('number');
    });
  });

  describe('Subscription and Broadcast Resilience', () => {
    it('safely handles broadcast without errors when offline or in test runner', async () => {
      const packet: LiveBandSyncPacket = {
        bandId: 'band-test',
        leaderId: 'leader-1',
        leaderName: 'Leader',
        songId: 'song-1',
        songTitle: 'Offline Test',
        action: 'PLAY',
        timestamp: Date.now(),
        currentLineIdx: 0,
        currentWordIdx: 0,
        currentBeat: 0,
        currentBar: 1,
        bpm: 120,
        barsPerLine: 2,
        autoPlay: true,
        version: 1,
      };

      await expect(broadcastBandLivePacket(packet)).resolves.not.toThrow();
    });

    it('safely subscribes and unsubscribes without errors', () => {
      const callback = vi.fn();
      const unsub = subscribeToBandLiveSession('band-test', callback);
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('Realtime Band Data Layer Operations', () => {
    it('creates and joins remote band gracefully without errors in test environment', async () => {
      const band = useBandStore.getState().createBand('Solar Flare', 'u-leader', 'Alex');
      expect(band.id).toBeTruthy();
      expect(band.code).toBeTruthy();

      const joinRes = await useBandStore.getState().joinBandByCode(band.code, 'u-member', 'Sarah');
      expect(joinRes.success).toBe(true);

      const state = useBandStore.getState();
      expect(state.members.length).toBe(2);
      expect(state.members.some((m) => m.displayName === 'Sarah')).toBe(true);
    });

    it('manages shared songs and events across the realtime data layer', async () => {
      const band = useBandStore.getState().createBand('Lunar Echoes', 'u-leader', 'Alex');
      const song = useBandStore.getState().addSharedSong({
        bandId: band.id,
        songId: 'song-1',
        title: 'Cosmic Drift',
        key: 'Em',
        bpm: 120,
        updatedBy: 'u-leader',
      });

      expect(song.id).toBeTruthy();
      expect(useBandStore.getState().sharedSongs.length).toBe(1);

      const event = useBandStore.getState().addEvent({
        bandId: band.id,
        title: 'Friday Rehearsal',
        type: 'rehearsal',
        date: '2026-10-02',
        createdBy: 'u-leader',
      });

      expect(event.id).toBeTruthy();
      expect(useBandStore.getState().events.length).toBe(1);

      useBandStore.getState().removeSharedSong(song.id);
      expect(useBandStore.getState().sharedSongs.length).toBe(0);

      useBandStore.getState().deleteEvent(event.id);
      expect(useBandStore.getState().events.length).toBe(0);
    });
  });
});
