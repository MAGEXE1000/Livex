import { describe, it, expect } from 'vitest';
import { ClockSyncEngine } from '../clock/clockSync';
import {
  computeCurrentPlaybackPositionMs,
  resolveSchedulePosition,
  createScheduledPlayAnchor,
} from '../band/sessionAnchor';
import type { SongTimingSchedule } from '../songTimingEngine';

describe('Play Together Live Sync Anchor & Clock Synchronization Suite', () => {
  describe('ClockSyncEngine (NTP Ping-Pong)', () => {
    it('accurately calculates clock offset and RTT from ping-pong timestamps', () => {
      const engine = new ClockSyncEngine();
      engine.reset();

      // Suppose Follower clock is 500ms behind Server/Leader clock:
      // Local time = Server time - 500ms
      // Local t0 = 1000
      // Server receives at t1 = 1500 + 40 (transit) = 1540
      // Server responds at t2 = 1545
      // Local receives at t3 = 1000 + 40 + 5 + 40 = 1085
      const ping = engine.createPing('follower-1', 1000);
      const pong = ClockSyncEngine.createPong(ping, 'leader-1', 1545);
      pong.t1 = 1540;
      pong.t2 = 1545;

      const sample = engine.processPong(pong, 1085);
      expect(sample).not.toBeNull();
      // RTT = (1085 - 1000) - (1545 - 1540) = 85 - 5 = 80ms
      expect(sample?.rtt).toBe(80);
      // offset = ((1540 - 1000) + (1545 - 1085)) / 2 = (540 + 460) / 2 = 500ms
      expect(sample?.offset).toBe(500);
      expect(engine.offset).toBe(500);

      // Verify conversions
      expect(engine.getEstimatedServerTime(2000)).toBe(2500);
      expect(engine.getEstimatedLocalTime(2500)).toBe(2000);
    });

    it('selects the clock offset with the lowest RTT across multiple ping-pong samples', () => {
      const engine = new ClockSyncEngine();
      engine.reset();

      // Sample 1: Jittery sample (RTT = 120ms, offset = 520ms)
      const ping1 = engine.createPing('follower-1', 1000);
      const pong1 = ClockSyncEngine.createPong(ping1, 'leader-1', 1560);
      pong1.t1 = 1560;
      pong1.t2 = 1560;
      engine.processPong(pong1, 1120);

      // Sample 2: Clean low-latency sample (RTT = 30ms, offset = 502ms)
      const ping2 = engine.createPing('follower-1', 2000);
      const pong2 = ClockSyncEngine.createPong(ping2, 'leader-1', 2515);
      pong2.t1 = 2515;
      pong2.t2 = 2515;
      engine.processPong(pong2, 2030);

      // Sample 3: Spike sample (RTT = 200ms, offset = 560ms)
      const ping3 = engine.createPing('follower-1', 3000);
      const pong3 = ClockSyncEngine.createPong(ping3, 'leader-1', 3600);
      pong3.t1 = 3600;
      pong3.t2 = 3600;
      engine.processPong(pong3, 3200);

      // Best sample is sample 2 (RTT = 30ms) -> offset = 500ms
      expect(engine.offset).toBe(500);
      expect(engine.samples.length).toBe(3);
    });
  });

  describe('Session Playback Position Anchor', () => {
    it('advances playback position linearly when status is playing', () => {
      const anchor = {
        positionMs: 10000, // 10s into song
        serverTimeMs: 1700000000000,
      };

      // 5 seconds later
      const currentServerTimeMs = 1700000005000;
      const position = computeCurrentPlaybackPositionMs(anchor, 'playing', currentServerTimeMs);
      expect(position).toBe(15000);
    });

    it('freezes playback position when status is paused or stopped', () => {
      const anchor = {
        positionMs: 14200,
        serverTimeMs: 1700000000000,
      };

      // 10 seconds later, but paused
      const currentServerTimeMs = 1700000010000;
      const pausedPos = computeCurrentPlaybackPositionMs(anchor, 'paused', currentServerTimeMs);
      const stoppedPos = computeCurrentPlaybackPositionMs(anchor, 'stopped', currentServerTimeMs);

      expect(pausedPos).toBe(14200);
      expect(stoppedPos).toBe(14200);
    });

    it('creates scheduled play anchor with 1200ms lead time', () => {
      const now = 1700000000000;
      const { anchor, scheduledStartServerTimeMs } = createScheduledPlayAnchor(5000, now, 1200);

      expect(scheduledStartServerTimeMs).toBe(1700000001200);
      expect(anchor.serverTimeMs).toBe(1700000001200);
      expect(anchor.positionMs).toBe(5000);
    });

    it('resolves playback position into exact line index and progress within timing schedule', () => {
      const mockSchedule: SongTimingSchedule = {
        totalDurationMs: 12000,
        totalDurationFormatted: '0:12',
        bpm: 120,
        barsPerLine: 2,
        lines: [
          { lineIndex: 0, text: 'Line 1', durationMs: 4000, durationFormatted: '0:04', startMs: 0, endMs: 4000 },
          { lineIndex: 1, text: 'Line 2', durationMs: 4000, durationFormatted: '0:04', startMs: 4000, endMs: 8000 },
          { lineIndex: 2, text: 'Line 3', durationMs: 4000, durationFormatted: '0:04', startMs: 8000, endMs: 12000 },
        ],
      };

      // At position 2500ms -> Line 0, 2500ms progress
      const p1 = resolveSchedulePosition(mockSchedule, 2500);
      expect(p1.lineIndex).toBe(0);
      expect(p1.lineProgressMs).toBe(2500);
      expect(p1.isCompleted).toBe(false);

      // At position 5500ms -> Line 1, 1500ms progress
      const p2 = resolveSchedulePosition(mockSchedule, 5500);
      expect(p2.lineIndex).toBe(1);
      expect(p2.lineProgressMs).toBe(1500);
      expect(p2.isCompleted).toBe(false);

      // At position 10000ms -> Line 2, 2000ms progress
      const p3 = resolveSchedulePosition(mockSchedule, 10000);
      expect(p3.lineIndex).toBe(2);
      expect(p3.lineProgressMs).toBe(2000);
      expect(p3.isCompleted).toBe(false);

      // Late join past end: at 15000ms -> Line 2, completed
      const p4 = resolveSchedulePosition(mockSchedule, 15000);
      expect(p4.lineIndex).toBe(2);
      expect(p4.isCompleted).toBe(true);

      // Lead-in: at -600ms -> isInLeadIn true
      const p5 = resolveSchedulePosition(mockSchedule, -600);
      expect(p5.isInLeadIn).toBe(true);
      expect(p5.lineIndex).toBe(0);
    });
  });
});
