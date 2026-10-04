import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateStageRoomCode,
  createStageRoomToken,
  parseStageRoomToken,
  calculateEffectiveBeatTime,
  clampOffsetMs,
  type LocalStageRoom,
} from '../localStageSync';
import { useLocalStageSyncStore } from '../../../store/useLocalStageSyncStore';

describe('Local Stage Sync Room Engine', () => {
  describe('Room Code & Token Lifecycle', () => {
    it('generates a clean 4-character stage room join code prefixed with LX-', () => {
      const code1 = generateStageRoomCode();
      const code2 = generateStageRoomCode();

      expect(code1).toMatch(/^LX-[2-9A-Z]{3}$/);
      expect(code2).toMatch(/^LX-[2-9A-Z]{3}$/);
      expect(code1).not.toBe(code2);
    });

    it('creates and parses a valid stage room token URL', () => {
      const room: LocalStageRoom = {
        roomId: 'LX-408',
        hostName: 'Carlos Leader',
        activeSongId: 'song-101',
        activeSongTitle: 'Venezia',
        activeBar: 3,
        activeBeat: 2,
        isPlaying: true,
        bpm: 128,
        timeSignature: [4, 4],
        serverTimestamp: 1728000000000,
      };

      const tokenUrl = createStageRoomToken(room);
      expect(tokenUrl).toContain('livex://stage-room?data=');

      const parsed = parseStageRoomToken(tokenUrl);
      expect(parsed).not.toBeNull();
      expect(parsed?.roomId).toBe('LX-408');
      expect(parsed?.hostName).toBe('Carlos Leader');
      expect(parsed?.songTitle).toBe('Venezia');
    });

    it('parses direct join codes with or without LX- prefix', () => {
      expect(parseStageRoomToken('LX-408')?.roomId).toBe('LX-408');
      expect(parseStageRoomToken('408')?.roomId).toBe('LX-408');
      expect(parseStageRoomToken('LX-7B2')?.roomId).toBe('LX-7B2');
      expect(parseStageRoomToken('7B2')?.roomId).toBe('LX-7B2');
      expect(parseStageRoomToken('invalid-too-long-code')).toBeNull();
      expect(parseStageRoomToken('')).toBeNull();
    });
  });

  describe('Latency and Offset Calibration Calculation', () => {
    it('calculates effective beat time using hostTimestamp + estimatedLatency + clientOffsetMs', () => {
      const hostTimestamp = 1000000;
      const estimatedLatency = 12; // 12ms
      const clientOffsetMs = -15; // -15ms user calibration

      const effective = calculateEffectiveBeatTime(hostTimestamp, estimatedLatency, clientOffsetMs);
      expect(effective).toBe(999997);
    });

    it('calculates effective beat time with positive offset', () => {
      const hostTimestamp = 1000000;
      const estimatedLatency = 10;
      const clientOffsetMs = 25;

      const effective = calculateEffectiveBeatTime(hostTimestamp, estimatedLatency, clientOffsetMs);
      expect(effective).toBe(1000035);
    });

    it('clamps offset strictly to [-250, +250]', () => {
      expect(clampOffsetMs(0)).toBe(0);
      expect(clampOffsetMs(150)).toBe(150);
      expect(clampOffsetMs(-150)).toBe(-150);
      expect(clampOffsetMs(300)).toBe(250);
      expect(clampOffsetMs(-350)).toBe(-250);
      expect(clampOffsetMs(NaN)).toBe(0);
    });
  });

  describe('useLocalStageSyncStore', () => {
    beforeEach(() => {
      useLocalStageSyncStore.getState().leaveRoom();
    });

    afterEach(() => {
      useLocalStageSyncStore.getState().leaveRoom();
    });

    it('starts hosting and initializes room state', () => {
      const store = useLocalStageSyncStore.getState();
      const roomId = store.startHosting({
        hostName: 'Stage Lead',
        songTitle: 'Song A',
        bpm: 140,
      });

      const state = useLocalStageSyncStore.getState();
      expect(state.role).toBe('host');
      expect(state.room?.roomId).toBe(roomId);
      expect(state.room?.bpm).toBe(140);
      expect(state.room?.hostName).toBe('Stage Lead');
      expect(state.room?.activeSongTitle).toBe('Song A');
    });

    it('updates client offset and clamps value', () => {
      const store = useLocalStageSyncStore.getState();
      store.setClientOffset(35);
      expect(useLocalStageSyncStore.getState().clientOffsetMs).toBe(35);

      store.setClientOffset(300);
      expect(useLocalStageSyncStore.getState().clientOffsetMs).toBe(250);

      store.setClientOffset(-400);
      expect(useLocalStageSyncStore.getState().clientOffsetMs).toBe(-250);
    });

    it('broadcasts beat and updates lastBeat state on host', () => {
      const store = useLocalStageSyncStore.getState();
      store.startHosting({ songTitle: 'Beat Test', bpm: 120 });

      store.broadcastBeat(4, 2);

      const state = useLocalStageSyncStore.getState();
      expect(state.room?.activeBar).toBe(4);
      expect(state.room?.activeBeat).toBe(2);
      expect(state.lastBeat?.bar).toBe(4);
      expect(state.lastBeat?.beat).toBe(2);
    });
  });
});
