import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Band,
  BandMember,
  SharedSong,
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
  userBands: [],
  isLoading: false,
  error: null,
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
        const code = rawCode.trim().toUpperCase();
        if (!code || code.length < 4) {
          return { success: false, message: 'Invalid join code. Must be at least 4 characters.' };
        }

        set({ isLoading: true, error: null });

        try {
          const now = Date.now();
          const state = get();

          // Check if code matches an existing band in userBands
          const existing = state.userBands.find((b) => b.code.toUpperCase() === code);
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

      removeSharedSong: (sharedSongId) => {
        set((state) => ({
          sharedSongs: state.sharedSongs.filter((s) => s.id !== sharedSongId),
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
    }),
    {
      name: 'livex_band_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentBand: state.currentBand,
        members: state.members,
        sharedSongs: state.sharedSongs,
        userBands: state.userBands,
      }),
    }
  )
);
