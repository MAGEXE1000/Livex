import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Band,
  BandMember,
  SharedSong,
  BandEvent,
  BandState,
  BandActions,
} from '../types/band';
import {
  createBandRemote,
  lookupBandByCodeRemote,
  joinBandRemote,
  shareSongRemote,
  removeSharedSongRemote,
  saveEventRemote,
  deleteEventRemote,
  subscribeToBandRealtimeData,
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

const DEFAULT_BAND_STATE: BandState = {
  currentBand: null,
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
};

export const useBandStore = create<BandStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_BAND_STATE,

      setCurrentBand: (band) => {
        set({ currentBand: band });
        if (band?.id) {
          get().attachRealtimeSync();
        } else if (_currentBandUnsub) {
          _currentBandUnsub();
          _currentBandUnsub = null;
        }
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

        const unsub = subscribeToBandRealtimeData(
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

        _currentBandUnsub = unsub;
        return unsub;
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
        if (_currentBandUnsub) {
          _currentBandUnsub();
          _currentBandUnsub = null;
        }

        set({
          currentBand: null,
          members: [],
          sharedSongs: [],
          events: [],
          error: null,
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
    }),
    {
      name: 'livex_band_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentBand: state.currentBand,
        members: state.members,
        sharedSongs: state.sharedSongs,
        events: state.events,
        userBands: state.userBands,
      }),
    }
  )
);
