/**
 * Ultra-Low-Latency Local Stage Room Synchronization Engine
 * Operates offline via local BroadcastChannel / P2P without requiring external cloud servers.
 */

export type StageRoomStatus = 'WAITING_FOR_SONG' | 'IN_SESSION';

export interface LocalStageRoom {
  roomId: string; // e.g. "LX-408"
  hostName: string;
  status: StageRoomStatus;
  activeSongId: string | null;
  activeSongTitle: string;
  activeSetlistId?: string | null;
  activeSetlistTitle?: string;
  activeTrackIndex?: number;
  activeBar: number;
  activeBeat: number;
  activeLineIndex?: number;
  isPlaying: boolean;
  bpm: number;
  timeSignature: [number, number];
  serverTimestamp: number;
  songPayload?: any;
}

export interface LocalStagePeer {
  peerId: string;
  peerName: string;
  joinedAt: number;
  lastPingMs?: number;
}

export type StageSyncMessageType =
  | 'ROOM_STATE'
  | 'SONG_SELECTED'
  | 'SETLIST_TRACK_CHANGE'
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'BEAT_TICK';

export interface StageSyncPayload {
  songId?: string;
  songTitle?: string;
  songPayload?: any;
  setlistId?: string;
  setlistTitle?: string;
  trackIndex?: number;
  currentBar?: number;
  currentBeat?: number;
  bpm?: number;
  isPlaying?: boolean;
  userOffsetMs?: number;
  lineIndex?: number;
  status?: StageRoomStatus;
}

export interface StageSyncMessage {
  type: StageSyncMessageType;
  roomId: string;
  senderId: string;
  timestamp: number;
  payload: StageSyncPayload;
}

export type LocalStageSyncMessage =
  | StageSyncMessage
  | { type: 'ROOM_ANNOUNCE'; room: LocalStageRoom }
  | { type: 'ROOM_HEARTBEAT'; room: LocalStageRoom }
  | { type: 'STATE_CHANGE'; room: LocalStageRoom }
  | { type: 'BEAT_TICK'; roomId: string; bar: number; beat: number; hostTimestamp: number }
  | { type: 'PEER_JOIN'; roomId: string; peerId: string; peerName: string }
  | { type: 'PEER_LEAVE'; roomId: string; peerId: string }
  | { type: 'PEER_PING'; roomId: string; peerId: string; pingId: string; t0: number }
  | { type: 'PEER_PONG'; roomId: string; pingId: string; targetId: string; t0: number; t1: number; t2: number }
  | { type: 'ROOM_CLOSE'; roomId: string };

/**
 * Generate a clean 4-character stage room join code (e.g. "LX-408" or "LX-7B2")
 */
export function generateStageRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let numPart = '';
  for (let i = 0; i < 3; i++) {
    numPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LX-${numPart}`;
}

/**
 * Encodes a local stage room into a fast QR link token
 */
export function createStageRoomToken(room: LocalStageRoom): string {
  const payload = {
    r: room.roomId,
    h: room.hostName,
    s: room.activeSongId,
    t: room.activeSongTitle,
    b: room.bpm,
    ts: room.serverTimestamp,
  };
  return `livex://stage-room?data=${encodeURIComponent(JSON.stringify(payload))}`;
}

/**
 * Parses a QR string or join code into a stage room lookup
 */
export function parseStageRoomToken(input: string): { roomId: string; hostName?: string; songTitle?: string } | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // If directly a 3-8 character join code like "LX-408", "LX-7M8" or "408"
  if (/^(LX-)?[0-9A-Z]{3,8}$/i.test(clean)) {
    const code = clean.toUpperCase();
    return { roomId: code.startsWith('LX-') ? code : `LX-${code}` };
  }

  // Handle URL scheme livex://room/LX-7M8 or livex://room?id=LX-7M8
  if (clean.startsWith('livex://room/')) {
    const raw = clean.replace('livex://room/', '').split(/[?#/]/)[0].trim().toUpperCase();
    if (raw) {
      return { roomId: raw.startsWith('LX-') ? raw : `LX-${raw}` };
    }
  }

  // Handle direct JSON payload: { "roomId": "LX-7M8" } or { "r": "LX-7M8" }
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      const rId = parsed.roomId || parsed.r || parsed.id;
      if (rId && typeof rId === 'string') {
        const code = rId.trim().toUpperCase();
        return {
          roomId: code.startsWith('LX-') ? code : `LX-${code}`,
          hostName: parsed.hostName || parsed.h,
          songTitle: parsed.songTitle || parsed.t,
        };
      }
    } catch (_) {}
  }

  // Handle URL scheme livex://stage-room
  if (clean.startsWith('livex://stage-room')) {
    try {
      const url = new URL(clean);
      const dataParam = url.searchParams.get('data');
      if (dataParam) {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        return {
          roomId: parsed.r,
          hostName: parsed.h,
          songTitle: parsed.t,
        };
      }
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return { roomId: idParam.toUpperCase() };
      }
    } catch (_) {
      // Fallback manual regex match
      const match = clean.match(/data=([^&]+)/);
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          return { roomId: parsed.r, hostName: parsed.h, songTitle: parsed.t };
        } catch (_) {}
      }
    }
  }

  return null;
}

/**
 * Follower latency and offset compensation formula:
 * effectiveBeatTime = hostTimestamp + estimatedLatency + clientOffsetMs
 */
export function calculateEffectiveBeatTime(
  hostTimestamp: number,
  estimatedLatencyMs: number,
  clientOffsetMs: number
): number {
  return hostTimestamp + estimatedLatencyMs + clientOffsetMs;
}

/**
 * Clamp client offset between -250ms and +250ms
 */
export function clampOffsetMs(value: number): number {
  if (isNaN(value)) return 0;
  return Math.max(-250, Math.min(250, Math.round(value)));
}

export const LOCAL_STAGE_OFFSET_STORAGE_KEY = 'livex_sync_offset_ms';

export function getStoredOffsetMs(): number {
  try {
    const val = localStorage.getItem(LOCAL_STAGE_OFFSET_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      return clampOffsetMs(parsed);
    }
  } catch (_) {}
  return 0;
}

export function saveStoredOffsetMs(offsetMs: number): void {
  try {
    const clamped = clampOffsetMs(offsetMs);
    localStorage.setItem(LOCAL_STAGE_OFFSET_STORAGE_KEY, clamped.toString());
  } catch (_) {}
}
