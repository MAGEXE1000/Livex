import type { StateCreator } from 'zustand';
import type { Setlist, SetlistSection } from '../../types/setlist';

export interface SetlistSliceState {
  setlists: Setlist[];
  activeSetlistId: string | null;
  songsSubTab: 'all' | 'setlists';
}

export interface SetlistSliceActions {
  setSongsSubTab: (tab: 'all' | 'setlists') => void;
  createSetlist: (data: {
    title: string;
    description?: string;
    date?: string;
    bandId?: string;
    sections?: { name: string; songIds?: string[] }[];
    color?: string;
  }) => string;
  updateSetlist: (id: string, data: Partial<Setlist>) => void;
  deleteSetlist: (id: string) => void;
  duplicateSetlist: (id: string) => string;
  setActiveSetlistId: (id: string | null) => void;
  addSectionToSetlist: (setlistId: string, name: string) => string;
  updateSetlistSection: (setlistId: string, sectionId: string, name: string) => void;
  deleteSetlistSection: (setlistId: string, sectionId: string) => void;
  reorderSetlistSections: (setlistId: string, fromIdx: number, toIdx: number) => void;
  addSongsToSetlistSection: (setlistId: string, sectionId: string, songIds: string[]) => void;
  removeSongFromSetlistSection: (setlistId: string, sectionId: string, songIdx: number) => void;
  reorderSongsInSetlistSection: (
    setlistId: string,
    sectionId: string,
    fromIdx: number,
    toIdx: number
  ) => void;
  updateSectionSongsOrder: (
    setlistId: string,
    sectionId: string,
    newSongIds: string[]
  ) => void;
  moveSongBetweenSetlistSections: (
    setlistId: string,
    fromSectionId: string,
    fromIdx: number,
    toSectionId: string,
    toIdx: number
  ) => void;
}

export type SetlistSlice = SetlistSliceState & SetlistSliceActions;

export const createSetlistSlice: StateCreator<any, [], [], SetlistSlice> = (set, get) => ({
  setlists: [],
  activeSetlistId: null,
  songsSubTab: 'all',

  setSongsSubTab: (tab) => set({ songsSubTab: tab }),

  createSetlist: (data) => {
    const id = `setlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const initialSections: SetlistSection[] =
      data.sections && data.sections.length > 0
        ? data.sections.map((s) => ({
            id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: s.name,
            songIds: s.songIds || [],
          }))
        : [
            {
              id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: 'Set 1',
              songIds: [],
            },
          ];

    const setlist: Setlist = {
      id,
      title: data.title.trim() || 'Untitled Setlist',
      description: data.description?.trim(),
      date: data.date,
      bandId: data.bandId,
      color: data.color,
      sections: initialSections,
      createdAt: now,
      updatedAt: now,
    };

    set((state: any) => ({
      setlists: [setlist, ...(state.setlists || [])],
      activeSetlistId: id,
    }));

    import('../../lib/activityLogger')
      .then(({ logActivity }) => {
        logActivity('project_create', `Created setlist "${setlist.title}"`, 'Chordex');
      })
      .catch(() => {});

    return id;
  },

  updateSetlist: (id, data) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) =>
        s.id === id ? { ...s, ...data, updatedAt: Date.now() } : s
      ),
    }));
  },

  deleteSetlist: (id) => {
    set((state: any) => ({
      setlists: (state.setlists || []).filter((s: Setlist) => s.id !== id),
      activeSetlistId: state.activeSetlistId === id ? null : state.activeSetlistId,
    }));
  },

  duplicateSetlist: (id) => {
    const state = get();
    const original = (state.setlists || []).find((s: Setlist) => s.id === id);
    if (!original) return '';

    const newId = `setlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const duplicatedSections: SetlistSection[] = (original.sections || []).map((sec: SetlistSection) => ({
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: sec.name,
      songIds: [...sec.songIds],
    }));

    const duplicated: Setlist = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      sections: duplicatedSections,
      createdAt: now,
      updatedAt: now,
    };

    set((s: any) => ({
      setlists: [duplicated, ...(s.setlists || [])],
      activeSetlistId: newId,
    }));

    return newId;
  },

  setActiveSetlistId: (id) => set({ activeSetlistId: id }),

  addSectionToSetlist: (setlistId, name) => {
    const secId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        const newSection: SetlistSection = {
          id: secId,
          name: name.trim() || `Set ${(s.sections?.length || 0) + 1}`,
          songIds: [],
        };
        return {
          ...s,
          sections: [...(s.sections || []), newSection],
          updatedAt: Date.now(),
        };
      }),
    }));
    return secId;
  },

  updateSetlistSection: (setlistId, sectionId, name) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) =>
            sec.id === sectionId ? { ...sec, name: name.trim() || sec.name } : sec
          ),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  deleteSetlistSection: (setlistId, sectionId) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).filter((sec: SetlistSection) => sec.id !== sectionId),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  reorderSetlistSections: (setlistId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        const sections = [...(s.sections || [])];
        if (fromIdx >= sections.length || toIdx >= sections.length) return s;
        const [moved] = sections.splice(fromIdx, 1);
        sections.splice(toIdx, 0, moved);
        return { ...s, sections, updatedAt: Date.now() };
      }),
    }));
  },

  addSongsToSetlistSection: (setlistId, sectionId, songIds) => {
    if (!songIds.length) return;
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              songIds: [...sec.songIds, ...songIds],
            };
          }),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  removeSongFromSetlistSection: (setlistId, sectionId, songIdx) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) => {
            if (sec.id !== sectionId) return sec;
            const songIds = [...sec.songIds];
            songIds.splice(songIdx, 1);
            return { ...sec, songIds };
          }),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  reorderSongsInSetlistSection: (setlistId, sectionId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) => {
            if (sec.id !== sectionId) return sec;
            const songIds = [...sec.songIds];
            const [moved] = songIds.splice(fromIdx, 1);
            songIds.splice(toIdx, 0, moved);
            return { ...sec, songIds };
          }),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  updateSectionSongsOrder: (setlistId, sectionId, newSongIds) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) => {
            if (sec.id !== sectionId) return sec;
            return { ...sec, songIds: newSongIds };
          }),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  moveSongBetweenSetlistSections: (setlistId, fromSectionId, fromIdx, toSectionId, toIdx) => {
    set((state: any) => ({
      setlists: (state.setlists || []).map((s: Setlist) => {
        if (s.id !== setlistId) return s;
        const fromSec = (s.sections || []).find((sec: SetlistSection) => sec.id === fromSectionId);
        if (!fromSec || fromIdx >= fromSec.songIds.length) return s;

        const songId = fromSec.songIds[fromIdx];

        return {
          ...s,
          sections: (s.sections || []).map((sec: SetlistSection) => {
            if (sec.id === fromSectionId && sec.id === toSectionId) {
              // Same section
              const songIds = [...sec.songIds];
              const [moved] = songIds.splice(fromIdx, 1);
              songIds.splice(toIdx, 0, moved);
              return { ...sec, songIds };
            }
            if (sec.id === fromSectionId) {
              const songIds = [...sec.songIds];
              songIds.splice(fromIdx, 1);
              return { ...sec, songIds };
            }
            if (sec.id === toSectionId) {
              const songIds = [...sec.songIds];
              const targetSlot = Math.min(songIds.length, Math.max(0, toIdx));
              songIds.splice(targetSlot, 0, songId);
              return { ...sec, songIds };
            }
            return sec;
          }),
          updatedAt: Date.now(),
        };
      }),
    }));
  },
});
