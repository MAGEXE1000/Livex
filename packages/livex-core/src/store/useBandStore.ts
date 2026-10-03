import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Band,
  BandMember,
  SharedSong,
  BandEvent,
  BandState,
  BandActions,
  LobbyAttendee,
  LiveBandSyncPacket,
} from '../types/band';
import type { SongPreset } from './slices/songSlice';
import {
  createBandRemote,
  lookupBandByCodeRemote,
  joinBandRemote,
  shareSongRemote,
  removeSharedSongRemote,
  saveEventRemote,
  deleteEventRemote,
  subscribeToBandRealtimeData,
  broadcastBandLivePacket,
  endBandLiveSessionRemote,
  subscribeToBandLiveSession,
  subscribeToLobbyPresence,
  joinLobbyRemote,
  leaveLobbyRemote,
} from '../lib/bandSyncService';

export type BandStore = BandState & BandActions & {
  attachRealtimeSync: (currentUserId?: string) => () => void;
};

/**
 * Generate a 6-character clean alphanumeric uppercase join code (e.g. 'LVX702')
 */
export function generateBandCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LVX';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

let _currentBandUnsub: (() => void) | null = null;
let _currentSessionUnsub: (() => void) | null = null;
let _currentLobbyUnsub: (() => void) | null = null;

const DEFAULT_BAND_STATE: BandState = {
  currentBand: null,
  currentUserId: 'local-user',
  currentUserName: 'Musician',
  members: [],
  sharedSongs: [],
  events: [],
  userBands: [],
  isLoading: false,
  error: null,
  isBroadcasting: false,
  isLockedToLeader: false,
  activeLiveSession: null,
  lastSyncTimestamp: null,
  lobbyAttendees: [],
  connectedMembersCount: 1,
  sessionPreset: null,
};

export const useBandStore = create<BandStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_BAND_STATE,

      setCurrentBand: (band) => {
        set({ currentBand: band });
        if (band?.id) {
          get().attachRealtimeSync();
        } else {
          if (_currentBandUnsub) {
            _currentBandUnsub();
            _currentBandUnsub = null;
          }
          if (_currentSessionUnsub) {
            _currentSessionUnsub();
            _currentSessionUnsub = null;
          }
          if (_currentLobbyUnsub) {
            _currentLobbyUnsub();
            _currentLobbyUnsub = null;
          }
        }
      },

      setCurrentUser: (userId: string, userName: string) => {
        set({ currentUserId: userId, currentUserName: userName });
      },

      setMembers: (members) => {
        set({ members });
      },

      setSharedSongs: (sharedSongs) => {
        set({ sharedSongs });
      },

      setEvents: (events) => {
        set({ events });
      },

      setLobbyAttendees: (lobbyAttendees) => {
        set({ lobbyAttendees });
      },

      setError: (error) => {
        set({ error });
      },

      attachRealtimeSync: (currentUserId?: string) => {
        const state = get();
        const bandId = state.currentBand?.id;
        if (!bandId) return () => {};

        if (_currentBandUnsub) {
          _currentBandUnsub();
          _currentBandUnsub = null;
        }
        if (_currentSessionUnsub) {
          _currentSessionUnsub();
          _currentSessionUnsub = null;
        }
        if (_currentLobbyUnsub) {
          _currentLobbyUnsub();
          _currentLobbyUnsub = null;
        }

        const unsubData = subscribeToBandRealtimeData(
          bandId,
          {
            onBandUpdate: (band) => {
              set((s) => ({
                currentBand: band,
                userBands: s.userBands.map((b) => (b.id === band.id ? band : b)),
              }));
            },
            onMembersUpdate: (members) => {
              set({ members });
            },
            onSongsUpdate: (sharedSongs) => {
              set({ sharedSongs });
            },
            onEventsUpdate: (events) => {
              set({ events });
            },
          },
          currentUserId
        );
        _currentBandUnsub = unsubData;

        // Reactive Session Sync
        const unsubSession = subscribeToBandLiveSession(bandId, (packet) => {
          if (!packet || packet.action === 'END_SESSION' || packet.status === 'ended') {
            set({
              activeLiveSession: null,
              sessionPreset: null,
              isLockedToLeader: false,
            });
            return;
          }
          set({
            activeLiveSession: packet,
            lastSyncTimestamp: Date.now(),
          });
        });
        _currentSessionUnsub = unsubSession;

        // Reactive Lobby / Presence Sync
        const unsubLobby = subscribeToLobbyPresence(bandId, (attendees) => {
          set({
            lobbyAttendees: attendees,
            connectedMembersCount: Math.max(1, attendees.length),
          });
        });
        _currentLobbyUnsub = unsubLobby;

        return () => {
          unsubData();
          unsubSession();
          unsubLobby();
        };
      },

      createBand: (name, leaderId, leaderName, description) => {
        const bandId = `band-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const code = generateBandCode();
        const now = Date.now();

        const newBand: Band = {
          id: bandId,
          name: name.trim() || 'My Band',
          code,
          leaderId: leaderId || 'local-user',
          createdAt: now,
          updatedAt: now,
          description: description?.trim(),
        };

        const leaderMember: BandMember = {
          id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          bandId,
          userId: leaderId || 'local-user',
          displayName: leaderName.trim() || 'Band Leader',
          role: 'leader',
          joinedAt: now,
          isOnline: true,
        };

        set((state) => ({
          currentBand: newBand,
          members: [leaderMember],
          sharedSongs: [],
          events: [],
          userBands: [newBand, ...state.userBands.filter((b) => b.id !== bandId)],
          error: null,
        }));

        // Fire-and-forget remote persistence & realtime subscription
        createBandRemote(newBand, leaderMember).catch(() => {});
        get().attachRealtimeSync(leaderId);

        return newBand;
      },

      joinBandByCode: async (rawCode, userId, userName) => {
        const code = rawCode.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!code || code.length < 4) {
          return { success: false, message: 'Invalid join code. Must be at least 4 characters.' };
        }

        set({ isLoading: true, error: null });

        try {
          const now = Date.now();
          const state = get();

          // 1. Try remote lookup from Firestore
          const remoteData = await lookupBandByCodeRemote(code);

          let joinedBand: Band;
          let currentMembers: BandMember[] = [];

          if (remoteData?.band) {
            joinedBand = remoteData.band;
            currentMembers = remoteData.members || [];
          } else {
            // 2. Offline fallback: check local userBands
            const existing = state.userBands.find(
              (b) => b.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === code
            );
            const bandId = existing ? existing.id : `band-joined-${Date.now()}`;
            const bandName = existing ? existing.name : `Band #${code}`;

            joinedBand = existing || {
              id: bandId,
              name: bandName,
              code,
              leaderId: 'remote-leader',
              createdAt: now,
              updatedAt: now,
            };

            currentMembers = existing && state.currentBand?.id === existing.id
              ? state.members
              : [
                  {
                    id: `member-leader-${Date.now()}`,
                    bandId,
                    userId: joinedBand.leaderId,
                    displayName: 'Band Leader',
                    role: 'leader' as const,
                    joinedAt: joinedBand.createdAt,
                    isOnline: true,
                  },
                ];
          }

          const newMember: BandMember = {
            id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            bandId: joinedBand.id,
            userId: userId || 'local-user',
            displayName: userName.trim() || 'Musician',
            role: 'member',
            joinedAt: now,
            isOnline: true,
          };

          const updatedMembers = [
            ...currentMembers.filter((m) => m.userId !== (userId || 'local-user')),
            newMember,
          ];

          set((s) => ({
            currentBand: joinedBand,
            members: updatedMembers,
            userBands: [joinedBand, ...s.userBands.filter((b) => b.id !== joinedBand.id)],
            isLoading: false,
            error: null,
          }));

          // 3. Persist member remotely & attach realtime sync
          joinBandRemote(joinedBand.id, newMember).catch(() => {});
          get().attachRealtimeSync(userId);

          return { success: true };
        } catch (err: any) {
          const msg = err?.message || 'Failed to join band with code.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      leaveBand: () => {
        get().leaveSession().catch(() => {});
        if (_currentBandUnsub) {
          _currentBandUnsub();
          _currentBandUnsub = null;
        }
        if (_currentSessionUnsub) {
          _currentSessionUnsub();
          _currentSessionUnsub = null;
        }
        if (_currentLobbyUnsub) {
          _currentLobbyUnsub();
          _currentLobbyUnsub = null;
        }

        set({
          currentBand: null,
          members: [],
          sharedSongs: [],
          events: [],
          error: null,
          isBroadcasting: false,
          isLockedToLeader: false,
          activeLiveSession: null,
          sessionPreset: null,
          lobbyAttendees: [],
          connectedMembersCount: 1,
        });
      },

      addSharedSong: (songData) => {
        const id = `shared-song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const newSong: SharedSong = {
          ...songData,
          id,
          version: 1,
          updatedAt: now,
        };

        set((state) => ({
          sharedSongs: [newSong, ...state.sharedSongs.filter((s) => s.id !== id)],
        }));

        if (newSong.bandId) {
          shareSongRemote(newSong.bandId, newSong).catch(() => {});
        }

        return newSong;
      },

      shareSongFromPreset: (preset, bandId, userId, userName) => {
        const id = `shared-song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const sharedSong: SharedSong = {
          id,
          bandId,
          songId: preset.id,
          title: preset.name || 'Untitled Song',
          artist: preset.artist || '',
          key: preset.key || 'C',
          bpm: preset.bpm || preset.speed || 120,
          speed: preset.speed || preset.bpm || 120,
          targetDurationSeconds: preset.targetDurationSeconds,
          barsPerLine: preset.barsPerLine || 2,
          notes: preset.notes || '',
          chords: preset.chords || [],
          sections: preset.sections || [],
          lyrics: preset.lyrics,
          coverImage: preset.coverImage,
          version: 1,
          updatedAt: now,
          updatedBy: userId || 'local-user',
          uploaderName: userName || 'Musician',
        };

        set((state) => ({
          sharedSongs: [
            sharedSong,
            ...state.sharedSongs.filter((s) => s.songId !== preset.id && s.id !== id),
          ],
        }));

        shareSongRemote(bandId, sharedSong).catch(() => {});

        return sharedSong;
      },

      importSharedSongToLibrary: (sharedSong, createPresetFn) => {
        const presetData = {
          name: sharedSong.title,
          artist: sharedSong.artist || '',
          key: sharedSong.key || 'C',
          bpm: sharedSong.bpm || 120,
          speed: sharedSong.speed || sharedSong.bpm || 120,
          barsPerLine: sharedSong.barsPerLine || 2,
          targetDurationSeconds: sharedSong.targetDurationSeconds,
          notes: sharedSong.notes || '',
          chords: sharedSong.chords || [],
          sections: sharedSong.sections || [],
          lyrics: sharedSong.lyrics,
          coverImage: sharedSong.coverImage || sharedSong.coverUri,
        };
        return createPresetFn(presetData);
      },

      removeSharedSong: (sharedSongId) => {
        const bandId = get().currentBand?.id;
        set((state) => ({
          sharedSongs: state.sharedSongs.filter((s) => s.id !== sharedSongId),
        }));

        if (bandId) {
          removeSharedSongRemote(bandId, sharedSongId).catch(() => {});
        }
      },

      addEvent: (eventData) => {
        const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const newEvent: BandEvent = {
          ...eventData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          events: [newEvent, ...state.events.filter((e) => e.id !== id)],
        }));

        if (newEvent.bandId) {
          saveEventRemote(newEvent.bandId, newEvent).catch(() => {});
        }

        return newEvent;
      },

      updateEvent: (eventId, updates) => {
        const bandId = get().currentBand?.id;
        let updatedItem: BandEvent | null = null;

        set((state) => ({
          events: state.events.map((e) => {
            if (e.id === eventId) {
              updatedItem = { ...e, ...updates, updatedAt: Date.now() };
              return updatedItem;
            }
            return e;
          }),
        }));

        if (bandId && updatedItem) {
          saveEventRemote(bandId, updatedItem).catch(() => {});
        }
      },

      deleteEvent: (eventId) => {
        const bandId = get().currentBand?.id;
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
        }));

        if (bandId) {
          deleteEventRemote(bandId, eventId).catch(() => {});
        }
      },

      updateBandName: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        set((state) => {
          if (!state.currentBand) return state;
          const updatedBand: Band = {
            ...state.currentBand,
            name: trimmed,
            updatedAt: Date.now(),
          };
          return {
            currentBand: updatedBand,
            userBands: state.userBands.map((b) => (b.id === updatedBand.id ? updatedBand : b)),
          };
        });
      },

      setIsBroadcasting: (isBroadcasting) => {
        set({ isBroadcasting });
      },

      setIsLockedToLeader: (isLockedToLeader) => {
        set({ isLockedToLeader });
      },

      setActiveLiveSession: (packet) => {
        set({
          activeLiveSession: packet,
          lastSyncTimestamp: packet ? Date.now() : null,
        });
      },

      setSessionPreset: (preset) => {
        set({ sessionPreset: preset });
      },

      startLiveSession: async (preset: SongPreset, leaderId?: string, leaderName?: string) => {
        const state = get();
        const band = state.currentBand;
        if (!band) return;

        const effectiveLeaderId = leaderId || state.currentUserId || band.leaderId || 'local-leader';
        const effectiveLeaderName = leaderName || state.currentUserName || 'Band Leader';

        const initialAttendee: LobbyAttendee = {
          userId: effectiveLeaderId,
          displayName: effectiveLeaderName,
          role: 'leader',
          joinedAt: Date.now(),
        };

        const now = Date.now();
        const packet: LiveBandSyncPacket = {
          id: `sess-${band.id}`,
          bandId: band.id,
          leaderId: effectiveLeaderId,
          leaderName: effectiveLeaderName,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          expiresAt: now + 12 * 3600 * 1000,
          songId: preset.id,
          songTitle: preset.name || 'Untitled Song',
          action: 'START_SESSION',
          timestamp: now,
          currentLineIdx: 0,
          currentWordIdx: 0,
          currentBeat: 0,
          currentBar: 1,
          bpm: preset.speed || preset.bpm || 120,
          barsPerLine: preset.barsPerLine || 2,
          autoPlay: false,
          version: now,
          connectedMembersCount: 1,
          songPayload: {
            id: preset.id,
            bandId: band.id,
            songId: preset.id,
            title: preset.name,
            artist: preset.artist,
            key: preset.key || 'C',
            bpm: preset.bpm || 120,
            speed: preset.speed || 120,
            barsPerLine: preset.barsPerLine || 2,
            targetDurationSeconds: preset.targetDurationSeconds,
            sections: preset.sections,
            lyrics: preset.lyrics,
            chords: preset.chords,
            version: 1,
            updatedAt: now,
            updatedBy: effectiveLeaderId,
          },
          lobbyAttendees: [initialAttendee],
        };

        set({
          isBroadcasting: true,
          isLockedToLeader: false,
          activeLiveSession: packet,
          lobbyAttendees: [initialAttendee],
          connectedMembersCount: 1,
        });

        joinLobbyRemote(band.id, initialAttendee).catch(() => {});
        await broadcastBandLivePacket(packet);
      },

      endLiveSession: async () => {
        const state = get();
        const band = state.currentBand;
        if (!band) return;

        const leaderId = state.currentUserId || band.leaderId || 'local-leader';
        await endBandLiveSessionRemote(band.id, leaderId);

        set({
          isBroadcasting: false,
          isLockedToLeader: false,
          activeLiveSession: null,
          sessionPreset: null,
          lobbyAttendees: [],
          connectedMembersCount: 1,
        });
      },

      inviteBandToSession: async (preset?: SongPreset) => {
        const state = get();
        const band = state.currentBand;
        if (!band) return;

        const effectiveLeaderId = state.currentUserId || band.leaderId || 'local-leader';
        const effectiveLeaderName = state.currentUserName || 'Band Leader';
        const currentSession = state.activeLiveSession;

        const targetSongId = preset?.id || currentSession?.songId || 'session-song';
        const targetSongTitle = preset?.name || currentSession?.songTitle || 'Live Rehearsal';
        const bpm = preset?.bpm || preset?.speed || currentSession?.bpm || 120;
        const barsPerLine = preset?.barsPerLine || currentSession?.barsPerLine || 2;

        const packet: LiveBandSyncPacket = {
          id: currentSession?.id || `sess-${band.id}`,
          bandId: band.id,
          leaderId: effectiveLeaderId,
          leaderName: effectiveLeaderName,
          status: 'active',
          action: 'INVITE_BAND',
          songId: targetSongId,
          songTitle: targetSongTitle,
          bpm,
          barsPerLine,
          timestamp: Date.now(),
          currentLineIdx: currentSession?.currentLineIdx || 0,
          currentWordIdx: currentSession?.currentWordIdx || 0,
          currentBeat: currentSession?.currentBeat || 0,
          currentBar: currentSession?.currentBar || 1,
          autoPlay: false,
          version: Date.now(),
          songPayload: preset
            ? {
                id: preset.id,
                title: preset.name,
                bpm: preset.bpm || preset.speed || 120,
                barsPerLine: preset.barsPerLine || 2,
                lyrics: preset.lyrics,
                chords: preset.chords,
                sections: preset.sections,
              }
            : currentSession?.songPayload,
        };

        await broadcastBandLivePacket(packet);
      },

      joinSession: async (packet: LiveBandSyncPacket, userId?: string, userName?: string) => {
        const state = get();
        let band = state.currentBand;
        if (!band && packet.bandId) {
          const matched = state.userBands.find((b) => b.id === packet.bandId);
          if (matched) {
            band = matched;
            set({ currentBand: matched });
          }
        }
        if (!band) return;

        const effectiveUserId = userId || state.currentUserId || 'local-user';
        const effectiveUserName = userName || state.currentUserName || 'Musician';

        const attendee: LobbyAttendee = {
          userId: effectiveUserId,
          displayName: effectiveUserName,
          role: 'member',
          joinedAt: Date.now(),
        };

        const existingAttendees = state.lobbyAttendees.filter((a) => a.userId !== effectiveUserId);
        const updatedAttendees = [...existingAttendees, attendee];

        let sessionSong: SongPreset | null = null;
        if (packet.songPayload) {
          const payload = packet.songPayload as any;
          sessionSong = {
            id: payload.id || payload.songId || packet.songId || 'ephemeral-session-song',
            name: payload.name || payload.title || packet.songTitle || 'Live Rehearsal',
            artist: payload.artist || '',
            key: payload.key || 'C',
            bpm: payload.bpm || packet.bpm || 120,
            speed: payload.speed || payload.bpm || packet.bpm || 120,
            barsPerLine: payload.barsPerLine || packet.barsPerLine || 2,
            targetDurationSeconds: payload.targetDurationSeconds,
            notes: payload.notes || '',
            chords: payload.chords || [],
            sections: payload.sections || [],
            lyrics: payload.lyrics,
            coverImage: payload.coverImage,
            createdAt: payload.createdAt || Date.now(),
            updatedAt: payload.updatedAt || Date.now(),
          };
        }

        set({
          isLockedToLeader: true,
          isBroadcasting: false,
          activeLiveSession: packet,
          sessionPreset: sessionSong,
          lobbyAttendees: updatedAttendees,
          connectedMembersCount: Math.max(1, updatedAttendees.length),
        });

        await joinLobbyRemote(band.id, attendee);
      },

      leaveSession: async (userId?: string) => {
        const state = get();
        const band = state.currentBand;
        const effectiveUserId = userId || state.currentUserId || 'local-user';

        if (band?.id) {
          await leaveLobbyRemote(band.id, effectiveUserId);
        }

        set((s) => ({
          isLockedToLeader: false,
          sessionPreset: null,
          lobbyAttendees: s.lobbyAttendees.filter((a) => a.userId !== effectiveUserId),
        }));
      },

      callBand: (preset: SongPreset, leaderId?: string, leaderName?: string) => {
        get().startLiveSession(preset, leaderId, leaderName).catch(() => {});
      },

      joinLobby: (bandId: string, attendee: LobbyAttendee) => {
        set((state) => {
          const exists = state.lobbyAttendees.some((a) => a.userId === attendee.userId);
          const updated = exists
            ? state.lobbyAttendees.map((a) => (a.userId === attendee.userId ? attendee : a))
            : [...state.lobbyAttendees, attendee];
          return {
            isLockedToLeader: true,
            isBroadcasting: false,
            lobbyAttendees: updated,
            connectedMembersCount: Math.max(1, updated.length),
          };
        });

        joinLobbyRemote(bandId, attendee).catch(() => {});
      },

      leaveLobby: (bandId: string, userId: string) => {
        set((state) => {
          const updated = state.lobbyAttendees.filter((a) => a.userId !== userId);
          return {
            lobbyAttendees: updated,
            connectedMembersCount: Math.max(1, updated.length),
          };
        });

        leaveLobbyRemote(bandId, userId).catch(() => {});
      },

      startPlaybackFromLobby: (preset: SongPreset) => {
        const state = get();
        const band = state.currentBand;
        if (!band) return;

        const effectiveLeaderId = state.currentUserId || band.leaderId || 'local-leader';
        const effectiveLeaderName = state.currentUserName || 'Band Leader';

        const packet: LiveBandSyncPacket = {
          bandId: band.id,
          leaderId: effectiveLeaderId,
          leaderName: effectiveLeaderName,
          songId: preset.id,
          songTitle: preset.name || 'Untitled Song',
          action: 'START_PLAYBACK',
          timestamp: Date.now(),
          currentLineIdx: 0,
          currentWordIdx: 0,
          currentBeat: 0,
          currentBar: 1,
          bpm: preset.speed || preset.bpm || 120,
          barsPerLine: preset.barsPerLine || 2,
          autoPlay: true,
          version: Date.now(),
          lobbyAttendees: state.lobbyAttendees,
        };

        set({
          isBroadcasting: true,
          isLockedToLeader: false,
          activeLiveSession: packet,
        });

        broadcastBandLivePacket(packet).catch(() => {});
      },
    }),
    {
      name: 'livex_band_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentBand: state.currentBand,
        currentUserId: state.currentUserId,
        currentUserName: state.currentUserName,
        members: state.members,
        sharedSongs: state.sharedSongs,
        events: state.events,
        userBands: state.userBands,
      }),
    }
  )
);
