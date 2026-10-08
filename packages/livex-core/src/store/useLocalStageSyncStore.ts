import { create } from 'zustand';
import {
  type LocalStageRoom,
  type LocalStagePeer,
  type LocalStageSyncMessage,
  type StageSyncMessage,
  type StageSyncMessageType,
  type StageSyncPayload,
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
  lastAction: {
    type: StageSyncMessageType;
    timestamp: number;
    payload: StageSyncPayload;
  } | null;
  isCalibrating: boolean;

  // Actions
  startHosting: (params?: {
    hostName?: string;
    songId?: string;
    songTitle?: string;
    bpm?: number;
    timeSignature?: [number, number];
    songPayload?: any;
    setlistId?: string;
    setlistTitle?: string;
  }) => string;
  joinRoom: (roomId: string, peerName?: string) => boolean;
  leaveRoom: () => void;
  selectSong: (songId: string, songTitle: string, bpm?: number, songPayload?: any) => void;
  changeSetlistTrack: (
    params:
      | {
          setlistId?: string;
          setlistTitle?: string;
          trackIndex: number;
          songId: string;
          songTitle: string;
          bpm?: number;
          songPayload?: any;
        }
      | string,
    setlistTitle?: string,
    trackIndex?: number,
    songId?: string,
    songTitle?: string,
    bpm?: number,
    songPayload?: any
  ) => void;
  broadcastPlay: (
    paramsOrBar: { currentBar: number; currentBeat: number; bpm?: number } | number,
    beat?: number,
    bpm?: number
  ) => void;
  broadcastPause: (
    paramsOrBar: { currentBar: number; currentBeat: number } | number,
    beat?: number
  ) => void;
  broadcastSeek: (
    paramsOrBar: { currentBar: number; currentBeat: number; lineIndex?: number } | number,
    beat?: number,
    lineIndex?: number
  ) => void;
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
  lastAction: null,
  isCalibrating: false,

  startHosting: (params = {}) => {
    // Teardown existing channel if any
    get().leaveRoom();

    const roomId = generateStageRoomCode();
    const hostName = params.hostName || 'Stage Host';
    const now = Date.now();
    const hasSong = !!params.songId;

    const newRoom: LocalStageRoom = {
      roomId,
      hostName,
      status: hasSong ? 'IN_SESSION' : 'WAITING_FOR_SONG',
      activeSongId: params.songId || null,
      activeSongTitle: params.songTitle || (hasSong ? 'Current Song' : ''),
      activeSetlistId: params.setlistId || null,
      activeSetlistTitle: params.setlistTitle || '',
      activeTrackIndex: 0,
      activeBar: 1,
      activeBeat: 1,
      activeLineIndex: 0,
      isPlaying: false,
      bpm: params.bpm || 120,
      timeSignature: params.timeSignature || [4, 4],
      songPayload: params.songPayload,
      serverTimestamp: now,
    };

    const ch = getChannel(roomId);
    if (ch) {
      _activeChannel = ch;
      ch.onmessage = (event) => {
        const msg = event.data as any;
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
          const activeRoom = get().room || newRoom;
          // Respond with state immediately
          ch.postMessage({
            type: 'ROOM_STATE',
            roomId,
            senderId: hostName,
            timestamp: Date.now(),
            payload: {
              songId: activeRoom.activeSongId || undefined,
              songTitle: activeRoom.activeSongTitle || undefined,
              status: activeRoom.status,
              bpm: activeRoom.bpm,
              currentBar: activeRoom.activeBar,
              currentBeat: activeRoom.activeBeat,
              isPlaying: activeRoom.isPlaying,
              songPayload: activeRoom.songPayload,
              setlistId: activeRoom.activeSetlistId || undefined,
              setlistTitle: activeRoom.activeSetlistTitle || undefined,
              trackIndex: activeRoom.activeTrackIndex,
            },
          } as StageSyncMessage);
          ch.postMessage({
            type: 'ROOM_ANNOUNCE',
            room: activeRoom,
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
      lastBeat: null,
      lastAction: null,
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
      const msg = event.data as any;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ROOM_ANNOUNCE' || msg.type === 'ROOM_HEARTBEAT' || msg.type === 'STATE_CHANGE') {
        const incomingRoom = msg.room as LocalStageRoom;
        const currentRoom = get().room;
        const hasSong = !!incomingRoom.activeSongId;
        const status = incomingRoom.status || (hasSong ? 'IN_SESSION' : 'WAITING_FOR_SONG');
        set({ room: { ...incomingRoom, status } });

        // If newly received an active song and we weren't in live mode, trigger auto-routing
        if (incomingRoom.activeSongId && (!currentRoom || currentRoom.activeSongId !== incomingRoom.activeSongId)) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('livex:stage-sync-song-selected', {
                detail: {
                  songId: incomingRoom.activeSongId,
                  songTitle: incomingRoom.activeSongTitle,
                  bpm: incomingRoom.bpm,
                  songPayload: incomingRoom.songPayload,
                  status: 'IN_SESSION',
                },
              })
            );
          }
        }
      } else if (msg.type === 'ROOM_STATE') {
        const payload = msg.payload as StageSyncPayload;
        const hasSong = !!payload.songId;
        const status = payload.status || (hasSong ? 'IN_SESSION' : 'WAITING_FOR_SONG');
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                status,
                activeSongId: payload.songId || null,
                activeSongTitle: payload.songTitle || '',
                activeSetlistId: payload.setlistId || null,
                activeSetlistTitle: payload.setlistTitle || '',
                activeTrackIndex: payload.trackIndex ?? 0,
                bpm: payload.bpm || s.room.bpm,
                activeBar: payload.currentBar || s.room.activeBar,
                activeBeat: payload.currentBeat || s.room.activeBeat,
                isPlaying: payload.isPlaying ?? s.room.isPlaying,
                songPayload: payload.songPayload || s.room.songPayload,
                serverTimestamp: msg.timestamp || Date.now(),
              }
            : null,
          lastAction: {
            type: 'ROOM_STATE',
            timestamp: msg.timestamp || Date.now(),
            payload,
          },
        }));

        if (payload.songId) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('livex:stage-sync-song-selected', {
                detail: payload,
              })
            );
          }
        }
      } else if (msg.type === 'SONG_SELECTED') {
        const payload = msg.payload as StageSyncPayload;
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                status: 'IN_SESSION',
                activeSongId: payload.songId || null,
                activeSongTitle: payload.songTitle || '',
                bpm: payload.bpm || s.room.bpm || 120,
                songPayload: payload.songPayload || s.room.songPayload,
                isPlaying: false,
                activeBar: 1,
                activeBeat: 1,
                activeLineIndex: 0,
                serverTimestamp: msg.timestamp,
              }
            : null,
          lastAction: {
            type: 'SONG_SELECTED',
            timestamp: msg.timestamp,
            payload,
          },
        }));

        // Fire auto-navigation event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('livex:stage-sync-song-selected', {
              detail: payload,
            })
          );
        }
      } else if (msg.type === 'SETLIST_TRACK_CHANGE') {
        const payload = msg.payload as StageSyncPayload;
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                status: 'IN_SESSION',
                activeSetlistId: payload.setlistId || null,
                activeSetlistTitle: payload.setlistTitle || '',
                activeTrackIndex: payload.trackIndex ?? 0,
                activeSongId: payload.songId || null,
                activeSongTitle: payload.songTitle || '',
                bpm: payload.bpm || s.room.bpm || 120,
                songPayload: payload.songPayload || s.room.songPayload,
                isPlaying: false,
                activeBar: 1,
                activeBeat: 1,
                activeLineIndex: 0,
                serverTimestamp: msg.timestamp,
              }
            : null,
          lastAction: {
            type: 'SETLIST_TRACK_CHANGE',
            timestamp: msg.timestamp,
            payload,
          },
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('livex:stage-sync-setlist-track-change', {
              detail: payload,
            })
          );
        }
      } else if (msg.type === 'PLAY') {
        const payload = msg.payload as StageSyncPayload;
        const effectiveTime = calculateEffectiveBeatTime(
          msg.timestamp,
          get().estimatedLatencyMs,
          get().clientOffsetMs
        );
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                isPlaying: true,
                activeBar: payload.currentBar || s.room.activeBar || 1,
                activeBeat: payload.currentBeat || s.room.activeBeat || 1,
                bpm: payload.bpm || s.room.bpm,
                serverTimestamp: msg.timestamp,
              }
            : null,
          lastAction: {
            type: 'PLAY',
            timestamp: msg.timestamp,
            payload,
          },
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('livex:stage-sync-transport', {
              detail: {
                action: 'PLAY',
                effectivePlaybackTime: effectiveTime,
                ...payload,
              },
            })
          );
        }
      } else if (msg.type === 'PAUSE') {
        const payload = msg.payload as StageSyncPayload;
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                isPlaying: false,
                activeBar: payload.currentBar || s.room.activeBar || 1,
                activeBeat: payload.currentBeat || s.room.activeBeat || 1,
                serverTimestamp: msg.timestamp,
              }
            : null,
          lastAction: {
            type: 'PAUSE',
            timestamp: msg.timestamp,
            payload,
          },
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('livex:stage-sync-transport', {
              detail: {
                action: 'PAUSE',
                ...payload,
              },
            })
          );
        }
      } else if (msg.type === 'SEEK') {
        const payload = msg.payload as StageSyncPayload;
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                activeBar: payload.currentBar || 1,
                activeBeat: payload.currentBeat || 1,
                activeLineIndex: payload.lineIndex,
                serverTimestamp: msg.timestamp,
              }
            : null,
          lastAction: {
            type: 'SEEK',
            timestamp: msg.timestamp,
            payload,
          },
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('livex:stage-sync-transport', {
              detail: {
                action: 'SEEK',
                ...payload,
              },
            })
          );
        }
      } else if (msg.type === 'BEAT_TICK') {
        const now = Date.now();
        const hostTimestamp =
          msg.payload?.timestamp || msg.timestamp || msg.hostTimestamp || now;
        const bar = msg.payload?.currentBar || msg.bar || 1;
        const beat = msg.payload?.currentBeat || msg.beat || 1;
        const effective = calculateEffectiveBeatTime(
          hostTimestamp,
          get().estimatedLatencyMs,
          get().clientOffsetMs
        );
        set((s) => ({
          room: s.room
            ? {
                ...s.room,
                activeBar: bar,
                activeBeat: beat,
                serverTimestamp: hostTimestamp,
              }
            : null,
          lastBeat: {
            bar,
            beat,
            hostTimestamp,
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
        status: 'WAITING_FOR_SONG',
        activeSongId: null,
        activeSongTitle: '',
        activeBar: 1,
        activeBeat: 1,
        isPlaying: false,
        bpm: 120,
        timeSignature: [4, 4],
        serverTimestamp: Date.now(),
      },
      lastBeat: null,
      lastAction: null,
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
      lastAction: null,
    });
  },

  selectSong: (songId: string, songTitle: string, bpm = 120, songPayload?: any) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;
    const now = Date.now();
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      status: 'IN_SESSION',
      activeSongId: songId,
      activeSongTitle: songTitle,
      activeBar: 1,
      activeBeat: 1,
      activeLineIndex: 0,
      isPlaying: false,
      bpm,
      songPayload,
      serverTimestamp: now,
    };
    set({
      room: nextRoom,
      lastAction: {
        type: 'SONG_SELECTED',
        timestamp: now,
        payload: {
          songId,
          songTitle,
          bpm,
          songPayload,
          status: 'IN_SESSION',
        },
      },
    });
    if (_activeChannel) {
      const msg: StageSyncMessage = {
        type: 'SONG_SELECTED',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          songId,
          songTitle,
          bpm,
          songPayload,
          status: 'IN_SESSION',
        },
      };
      _activeChannel.postMessage(msg);
      _activeChannel.postMessage({ type: 'STATE_CHANGE', room: nextRoom } as LocalStageSyncMessage);
    }
  },

  changeSetlistTrack: (
    paramsOrSetlistId,
    setlistTitleArg,
    trackIndexArg,
    songIdArg,
    songTitleArg,
    bpmArg,
    songPayloadArg
  ) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;
    const now = Date.now();
    const p =
      typeof paramsOrSetlistId === 'object'
        ? paramsOrSetlistId
        : {
            setlistId: paramsOrSetlistId,
            setlistTitle: setlistTitleArg,
            trackIndex: trackIndexArg ?? 0,
            songId: songIdArg || '',
            songTitle: songTitleArg || '',
            bpm: bpmArg,
            songPayload: songPayloadArg,
          };
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      status: 'IN_SESSION',
      activeSetlistId: p.setlistId || null,
      activeSetlistTitle: p.setlistTitle || '',
      activeTrackIndex: p.trackIndex,
      activeSongId: p.songId,
      activeSongTitle: p.songTitle,
      activeBar: 1,
      activeBeat: 1,
      activeLineIndex: 0,
      isPlaying: false,
      bpm: p.bpm || currentRoom.bpm || 120,
      songPayload: p.songPayload,
      serverTimestamp: now,
    };
    set({
      room: nextRoom,
      lastAction: {
        type: 'SETLIST_TRACK_CHANGE',
        timestamp: now,
        payload: {
          setlistId: p.setlistId,
          setlistTitle: p.setlistTitle,
          trackIndex: p.trackIndex,
          songId: p.songId,
          songTitle: p.songTitle,
          bpm: nextRoom.bpm,
          songPayload: p.songPayload,
          status: 'IN_SESSION',
        },
      },
    });
    if (_activeChannel) {
      const msg: StageSyncMessage = {
        type: 'SETLIST_TRACK_CHANGE',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          setlistId: p.setlistId,
          setlistTitle: p.setlistTitle,
          trackIndex: p.trackIndex,
          songId: p.songId,
          songTitle: p.songTitle,
          bpm: nextRoom.bpm,
          songPayload: p.songPayload,
          status: 'IN_SESSION',
        },
      };
      _activeChannel.postMessage(msg);
      _activeChannel.postMessage({ type: 'STATE_CHANGE', room: nextRoom } as LocalStageSyncMessage);
    }
  },

  broadcastPlay: (paramsOrBar, beatArg, bpmArg) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;
    const now = Date.now();
    const currentBar = typeof paramsOrBar === 'object' ? paramsOrBar.currentBar : paramsOrBar;
    const currentBeat = typeof paramsOrBar === 'object' ? paramsOrBar.currentBeat : (beatArg ?? 1);
    const bpm = typeof paramsOrBar === 'object' ? paramsOrBar.bpm : bpmArg;
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      isPlaying: true,
      activeBar: currentBar,
      activeBeat: currentBeat,
      bpm: bpm || currentRoom.bpm,
      serverTimestamp: now,
    };
    set({
      room: nextRoom,
      lastAction: {
        type: 'PLAY',
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          bpm: bpm || currentRoom.bpm,
          isPlaying: true,
        },
      },
    });
    if (_activeChannel) {
      const msg: StageSyncMessage = {
        type: 'PLAY',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          bpm,
          isPlaying: true,
        },
      };
      _activeChannel.postMessage(msg);
    }
  },

  broadcastPause: (paramsOrBar, beatArg) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;
    const now = Date.now();
    const currentBar = typeof paramsOrBar === 'object' ? paramsOrBar.currentBar : paramsOrBar;
    const currentBeat = typeof paramsOrBar === 'object' ? paramsOrBar.currentBeat : (beatArg ?? 1);
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      isPlaying: false,
      activeBar: currentBar,
      activeBeat: currentBeat,
      serverTimestamp: now,
    };
    set({
      room: nextRoom,
      lastAction: {
        type: 'PAUSE',
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          isPlaying: false,
        },
      },
    });
    if (_activeChannel) {
      const msg: StageSyncMessage = {
        type: 'PAUSE',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          isPlaying: false,
        },
      };
      _activeChannel.postMessage(msg);
    }
  },

  broadcastSeek: (paramsOrBar, beatArg, lineIndexArg) => {
    const currentRoom = get().room;
    if (!currentRoom || get().role !== 'host') return;
    const now = Date.now();
    const currentBar = typeof paramsOrBar === 'object' ? paramsOrBar.currentBar : paramsOrBar;
    const currentBeat = typeof paramsOrBar === 'object' ? paramsOrBar.currentBeat : (beatArg ?? 1);
    const lineIndex = typeof paramsOrBar === 'object' ? paramsOrBar.lineIndex : lineIndexArg;
    const nextRoom: LocalStageRoom = {
      ...currentRoom,
      activeBar: currentBar,
      activeBeat: currentBeat,
      activeLineIndex: lineIndex,
      serverTimestamp: now,
    };
    set({
      room: nextRoom,
      lastAction: {
        type: 'SEEK',
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          trackIndex: lineIndex,
          lineIndex,
        },
      },
    });
    if (_activeChannel) {
      const msg: StageSyncMessage = {
        type: 'SEEK',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          currentBar,
          currentBeat,
          trackIndex: lineIndex,
          lineIndex,
        },
      };
      _activeChannel.postMessage(msg);
    }
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
      const msg: StageSyncMessage = {
        type: 'BEAT_TICK',
        roomId: currentRoom.roomId,
        senderId: currentRoom.hostName,
        timestamp: now,
        payload: {
          currentBar: bar,
          currentBeat: beat,
        },
      };
      _activeChannel.postMessage(msg);
    }
  },

  setClientOffset: (offsetMs: number) => {
    const clamped = clampOffsetMs(offsetMs);
    saveStoredOffsetMs(clamped);
    set({ clientOffsetMs: clamped });
  },

  setIsCalibrating: (val: boolean) => set({ isCalibrating: val }),
}));
