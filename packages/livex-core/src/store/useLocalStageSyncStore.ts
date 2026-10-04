import { create } from 'zustand';
import {
  type LocalStageRoom,
  type LocalStagePeer,
  type LocalStageSyncMessage,
  generateStageRoomCode,
  calculateEffectiveBeatTime,
  clampOffsetMs,
  getStoredOffsetMs,
  saveStoredOffsetMs,
} from '../lib/sync/localStageSync';

export interface LocalStageSyncState {
  role: 'idle' | 'host' | 'follower';
  room: LocalStageRoom | null;
  peers: LocalStagePeer[];
  clientOffsetMs: number;
  estimatedLatencyMs: number;
  lastBeat: {
    bar: number;
    beat: number;
    hostTimestamp: number;
    effectiveTime: number;
    localReceivedTime: number;
  } | null;
  isCalibrating: boolean;

  // Actions
  startHosting: (params?: {
    hostName?: string;
    songId?: string;
    songTitle?: string;
    bpm?: number;
    timeSignature?: [number, number];
  }) => string;
  joinRoom: (roomId: string, peerName?: string) => boolean;
  leaveRoom: () => void;
  updatePlayback: (updates: Partial<LocalStageRoom>) => void;
  broadcastBeat: (bar: number, beat: number) => void;
  setClientOffset: (offsetMs: number) => void;
  setIsCalibrating: (val: boolean) => void;
}

let _activeChannel: BroadcastChannel | null = null;
let _heartbeatTimer: any = null;
let _pingTimer: any = null;

function getChannel(roomId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(`livex_local_stage_${roomId.toUpperCase()}`);
  } catch (_) {
    return null;
  }
}

export const useLocalStageSyncStore = create<LocalStageSyncState>((set, get) => ({
  role: 'idle',
  room: null,
  peers: [],
  clientOffsetMs: getStoredOffsetMs(),
  estimatedLatencyMs: 8, // ~8ms typical local WiFi baseline
  lastBeat: null,
  isCalibrating: false,

  startHosting: (params = {}) => {
    // Teardown existing channel if any
    get().leaveRoom();

    const roomId = generateStageRoomCode();
    const hostName = params.hostName || 'Stage Host';
    const now = Date.now();

    const newRoom: LocalStageRoom = {
      roomId,
      hostName,
      activeSongId: params.songId || null,
      activeSongTitle: params.songTitle || 'Current Song',
      activeBar: 1,
      activeBeat: 1,
      isPlaying: false,
      bpm: params.bpm || 120,
      timeSignature: params.timeSignature || [4, 4],
      serverTimestamp: now,
    };

    const ch = getChannel(roomId);
    if (ch) {
      _activeChannel = ch;
      ch.onmessage = (event) => {
        const msg = event.data as LocalStageSyncMessage;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'PEER_JOIN') {
          const currentPeers = get().peers;
          if (!currentPeers.some((p) => p.peerId === msg.peerId)) {
            set({
              peers: [
                ...currentPeers,
                { peerId: msg.peerId, peerName: msg.peerName, joinedAt: Date.now() },
              ],
            });
          }
          // Respond with state immediately
          ch.postMessage({
            type: 'ROOM_ANNOUNCE',
            room: get().room || newRoom,
          } as LocalStageSyncMessage);
        } else if (msg.type === 'PEER_LEAVE') {
          set({ peers: get().peers.filter((p) => p.peerId !== msg.peerId) });
        } else if (msg.type === 'PEER_PING') {
          // Send pong back
          const t1 = Date.now();
          ch.postMessage({
            type: 'PEER_PONG',
            roomId,
            pingId: msg.pingId,
            targetId: msg.peerId,
            t0: msg.t0,
            t1,
            t2: Date.now(),
          } as LocalStageSyncMessage);
        }
      };

      // Heartbeat every 2 seconds to keep followers aligned
      _heartbeatTimer = setInterval(() => {
        const currentRoom = get().room;
        if (currentRoom) {
          ch.postMessage({
            type: 'ROOM_HEARTBEAT',
            room: { ...currentRoom, serverTimestamp: Date.now() },
          } as LocalStageSyncMessage);
        }
      }, 2000);
    }

    set({
      role: 'host',
      room: newRoom,
      peers: [],
    });

    return roomId;
  },

  joinRoom: (roomId: string, peerName = 'Bandmate') => {
    get().leaveRoom();

    const cleanRoomId = roomId.trim().toUpperCase();
    const ch = getChannel(cleanRoomId);
    if (!ch) return false;

    _activeChannel = ch;
    const peerId = `peer-${Math.random().toString(36).substring(2, 8)}`;

    ch.onmessage = (event) => {
      const msg = event.data as LocalStageSyncMessage;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ROOM_ANNOUNCE' || msg.type === 'ROOM_HEARTBEAT' || msg.type === 'STATE_CHANGE') {
        set({ room: msg.room });
      } else if (msg.type === 'BEAT_TICK') {
        const now = Date.now();
        const effective = calculateEffectiveBeatTime(
          msg.hostTimestamp,
          get().estimatedLatencyMs,
          get().clientOffsetMs
        );
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                activeBar: msg.bar,
                activeBeat: msg.beat,
                serverTimestamp: msg.hostTimestamp,
              }
            : null,
          lastBeat: {
            bar: msg.bar,
            beat: msg.beat,
            hostTimestamp: msg.hostTimestamp,
            effectiveTime: effective,
            localReceivedTime: now,
          },
        }));
      } else if (msg.type === 'PEER_PONG' && msg.targetId === peerId) {
        const now = Date.now();
        const rtt = Math.max(1, (now - msg.t0) - (msg.t2 - msg.t1));
        const estimated = Math.max(1, Math.round(rtt / 2));
        set({ estimatedLatencyMs: estimated });
      } else if (msg.type === 'ROOM_CLOSE') {
        get().leaveRoom();
      }
    };

    // Announce join
    ch.postMessage({
      type: 'PEER_JOIN',
      roomId: cleanRoomId,
      peerId,
      peerName,
    } as LocalStageSyncMessage);

    // Initial ping to measure latency
    ch.postMessage({
      type: 'PEER_PING',
      roomId: cleanRoomId,
      peerId,
      pingId: `ping-${Date.now()}`,
      t0: Date.now(),
    } as LocalStageSyncMessage);

    // Periodic ping every 5 seconds to calibrate latency
    _pingTimer = setInterval(() => {
      ch.postMessage({
        type: 'PEER_PING',
        roomId: cleanRoomId,
        peerId,
        pingId: `ping-${Date.now()}`,
        t0: Date.now(),
      } as LocalStageSyncMessage);
    }, 5000);

    set({
      role: 'follower',
      room: {
        roomId: cleanRoomId,
        hostName: 'Connecting...',
        activeSongId: null,
        activeSongTitle: 'Connecting...',
        activeBar: 1,
        activeBeat: 1,
        isPlaying: false,
        bpm: 120,
        timeSignature: [4, 4],
        serverTimestamp: Date.now(),
      },
    });

    return true;
  },

  leaveRoom: () => {
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
    if (_pingTimer) {
      clearInterval(_pingTimer);
      _pingTimer = null;
    }
    if (_activeChannel) {
      const room = get().room;
      if (room) {
        try {
          if (get().role === 'host') {
            _activeChannel.postMessage({ type: 'ROOM_CLOSE', roomId: room.roomId } as LocalStageSyncMessage);
          } else {
            _activeChannel.postMessage({
              type: 'PEER_LEAVE',
              roomId: room.roomId,
              peerId: 'local',
            } as LocalStageSyncMessage);
          }
        } catch (_) {}
      }
      try {
        _activeChannel.close();
      } catch (_) {}
      _activeChannel = null;
    }

    set({
      role: 'idle',
      room: null,
      peers: [],
      lastBeat: null,
    });
  },

  updatePlayback: (updates: Partial<LocalStageRoom>) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;

    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      ...updates,
      serverTimestamp: Date.now(),
    };

    set({ room: nextRoom });

    if (_activeChannel) {
      _activeChannel.postMessage({
        type: 'STATE_CHANGE',
        room: nextRoom,
      } as LocalStageSyncMessage);
    }
  },

  broadcastBeat: (bar: number, beat: number) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;

    const now = Date.now();
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      activeBar: bar,
      activeBeat: beat,
      serverTimestamp: now,
    };

    set({
      room: nextRoom,
      lastBeat: {
        bar,
        beat,
        hostTimestamp: now,
        effectiveTime: now,
        localReceivedTime: now,
      },
    });

    if (_activeChannel) {
      _activeChannel.postMessage({
        type: 'BEAT_TICK',
        roomId: currentRoom.roomId,
        bar,
        beat,
        hostTimestamp: now,
      } as LocalStageSyncMessage);
    }
  },

  setClientOffset: (offsetMs: number) => {
    const clamped = clampOffsetMs(offsetMs);
    saveStoredOffsetMs(clamped);
    set({ clientOffsetMs: clamped });
  },

  setIsCalibrating: (val: boolean) => set({ isCalibrating: val }),
}));
