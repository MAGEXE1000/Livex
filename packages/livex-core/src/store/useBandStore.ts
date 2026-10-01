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

export type BandStore = BandState & BandActions;

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
          userBands: [newBand, ...state.userBands.filter((b) => b.id !== bandId)],
          error: null,
        }));

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

          // Check if code matches an existing band in userBands (case/dash normalized)
          const existing = state.userBands.find(
            (b) => b.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === code
          );
          const bandId = existing ? existing.id : `band-joined-${Date.now()}`;
          const bandName = existing ? existing.name : `Band #${code}`;

          const joinedBand: Band = existing || {
            id: bandId,
            name: bandName,
            code,
            leaderId: 'remote-leader',
            createdAt: now,
            updatedAt: now,
          };

          const newMember: BandMember = {
            id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            bandId,
            userId: userId || 'local-user',
            displayName: userName.trim() || 'Musician',
            role: 'member',
            joinedAt: now,
            isOnline: true,
          };

          // Combine with existing members if any, or create initial squad
          const currentMembers = existing && state.currentBand?.id === existing.id
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

          return { success: true };
        } catch (err: any) {
          const msg = err?.message || 'Failed to join band with code.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      leaveBand: () => {
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
        set((state) => ({
          sharedSongs: state.sharedSongs.filter((s) => s.id !== sharedSongId),
        }));
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

        return newEvent;
      },

      updateEvent: (eventId, updates) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId
              ? { ...e, ...updates, updatedAt: Date.now() }
              : e
          ),
        }));
      },

      deleteEvent: (eventId) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
        }));
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
