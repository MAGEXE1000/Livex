import { useState, useMemo, useRef, useCallback } from 'react';
import {
  getAllChords,
  searchChords,
  getChordById,
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  SONGS,
  type SongChart,
  useIsWebDesktop,
  useBackHandler,
  useNavigationStore,
  NavigationDispatcher,
  type ActivePanel,
  useSettingsStore,
  type Instrument,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORIES } from './LibraryCategories';

export const ROOT_NOTES = ['ALL', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function useLibraryState() {
  const isWebDesktop = useIsWebDesktop();
  const currentRoute = useNavigationStore(useShallow((s) => s.history[s.history.length - 1])) || {
    app: 'hub',
  };
  const selectedChordId =
    currentRoute.app === 'chordex' && ['chord', 'library'].includes(currentRoute.page || '')
      ? currentRoute.id || null
      : null;
  const activePanel =
    currentRoute.app === 'chordex' && currentRoute.page
      ? currentRoute.page === 'chord'
        ? 'library'
        : (currentRoute.page as ActivePanel)
      : 'library';

  const recentChords = useChordStore(useShallow((s) => s.recentChords));
  const favorites = useChordStore(useShallow((s) => s.favorites));
  const settings = useSettingsStore(
    useShallow((s) => ({
      instrument: s.settings.instrument,
      accentColor: s.settings.accentColor,
      theme: s.settings.theme,
      tuning: s.settings.tuning,
      bassFiveString: s.settings.bassFiveString,
    }))
  );

  const toggleFavorite = useChordStore(useShallow((s) => s.toggleFavorite));
  const addToProgression = useChordStore(useShallow((s) => s.addToProgression));
  const activeType = useChordStore(useShallow((s) => s.libraryActiveType));
  const setActiveType = useChordStore(useShallow((s) => s.setLibraryActiveType));

  const [chordPlaying, setChordPlaying] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [showTuningMenu, setShowTuningMenu] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedRootFilter, setSelectedRootFilter] = useState<string>('ALL');
  const [previewInstrument, setPreviewInstrument] = useState<Instrument>(
    settings.instrument || 'guitar'
  );
  const [diagramDisplayMode, setDiagramDisplayMode] = useState<'notes' | 'intervals'>('notes');

  const [showFinder, setShowFinder] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const allChords = useMemo(() => getAllChords(), []);
  const accent = resolveAccent(settings.accentColor);

  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const scrollRef = useRef<HTMLDivElement>(null);

  const chord = useMemo(() => {
    return selectedChordId ? getChordById(selectedChordId) : null;
  }, [selectedChordId]);

  const searchResults = useMemo(() => {
    if (!query) return [];
    const results = searchChords(query);
    if (selectedRootFilter !== 'ALL') {
      const rootUpper = selectedRootFilter.toUpperCase();
      const enharmonics: Record<string, string[]> = {
        'C#': ['C#', 'DB'],
        DB: ['C#', 'DB'],
        'D#': ['D#', 'EB'],
        EB: ['D#', 'EB'],
        'F#': ['F#', 'GB'],
        GB: ['F#', 'GB'],
        'G#': ['G#', 'AB'],
        AB: ['G#', 'AB'],
        'A#': ['A#', 'BB'],
        BB: ['A#', 'BB'],
      };
      const targets = enharmonics[rootUpper] || [rootUpper];
      return results.filter((c) => targets.includes(c.root.toUpperCase()));
    }
    return results;
  }, [query, selectedRootFilter]);

  const chordOfTheDay = useMemo(() => {
    // Return C Major by default (as featured in design specification) or active day rotation
    return getChordById('C-major') || getChordById('d-maj7') || allChords[0] || null;
  }, [allChords]);

  const selectChord = useCallback(
    (chordId: string | null) => {
      if (chordId === null) {
        if (isWebDesktop) {
          NavigationDispatcher.replace({ app: 'chordex', page: 'library' });
        } else {
          NavigationDispatcher.pop();
        }
      } else {
        if (isWebDesktop) {
          NavigationDispatcher.replace({ app: 'chordex', page: 'chord', id: chordId });
        } else {
          NavigationDispatcher.push({ app: 'chordex', page: 'chord', id: chordId });
        }
      }
    },
    [isWebDesktop]
  );

  const handleChordClick = useCallback(
    (chordId: string) => {
      useChordStore.setState((state) => {
        const recent = [chordId, ...state.recentChords.filter((id) => id !== chordId)].slice(0, 10);
        return { recentChords: recent };
      });
      selectChord(chordId);
    },
    [selectChord]
  );

  const activePracticeSong = useMemo(() => {
    if (currentRoute.app === 'chordex' && currentRoute.subView === 'practice' && currentRoute.id) {
      return SONGS.find((s) => s.id === currentRoute.id) || null;
    }
    return null;
  }, [currentRoute]);

  const setActivePracticeSong = useCallback((song: SongChart | null) => {
    if (song === null) {
      NavigationDispatcher.pop();
    } else {
      NavigationDispatcher.push({
        app: 'chordex',
        page: 'library',
        subView: 'practice',
        id: song.id,
      });
    }
  }, []);

  useBackHandler(
    'nested',
    () => {
      if (activePanel !== 'library') return false;
      if (activePracticeSong) {
        setActivePracticeSong(null);
        return true;
      }
      if (selectedChordId) {
        selectChord(null);
        return true;
      }
      if (categoryQuery) {
        setCategoryQuery('');
        return true;
      }
      if (activeType) {
        setActiveType(null);
        setCategoryQuery('');
        setSelectedRootFilter('ALL');
        return true;
      }
      if (query) {
        setQuery('');
        return true;
      }
      return false;
    },
    [
      activePanel,
      activePracticeSong,
      selectedChordId,
      categoryQuery,
      query,
      activeType,
      selectChord,
      setActiveType,
    ]
  );

  const filteredByType = useMemo(() => {
    if (!activeType) return [];
    let list = allChords.filter((c) => c.type === activeType);
    if (selectedRootFilter !== 'ALL') {
      const rootUpper = selectedRootFilter.toUpperCase();
      const enharmonics: Record<string, string[]> = {
        'C#': ['C#', 'DB'],
        DB: ['C#', 'DB'],
        'D#': ['D#', 'EB'],
        EB: ['D#', 'EB'],
        'F#': ['F#', 'GB'],
        GB: ['F#', 'GB'],
        'G#': ['G#', 'AB'],
        AB: ['G#', 'AB'],
        'A#': ['A#', 'BB'],
        BB: ['A#', 'BB'],
      };
      const targets = enharmonics[rootUpper] || [rootUpper];
      list = list.filter((c) => targets.includes(c.root.toUpperCase()));
    }
    if (categoryQuery.trim()) {
      const q = categoryQuery.toLowerCase().trim();
      list = list.filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.root.toLowerCase().includes(q) ||
          c.notes.some((n) => n.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [activeType, allChords, selectedRootFilter, categoryQuery]);

  const activeCategoryObject = CATEGORIES.find((c) => c.type === activeType);

  const toggleShowAllCategories = useCallback(() => {
    setShowAllCategories((prev) => !prev);
  }, []);

  return {
    isWebDesktop,
    currentRoute,
    selectedChordId,
    activePanel,
    recentChords,
    favorites,
    settings,
    toggleFavorite,
    addToProgression,
    activeType,
    setActiveType,
    chordPlaying,
    setChordPlaying,
    query,
    setQuery,
    categoryQuery,
    setCategoryQuery,
    showTuningMenu,
    setShowTuningMenu,
    showFinder,
    setShowFinder,
    showGenerator,
    setShowGenerator,
    allChords,
    accent,
    isLight,
    scrollRef,
    chord,
    searchResults,
    chordOfTheDay,
    selectChord,
    handleChordClick,
    activePracticeSong,
    setActivePracticeSong,
    filteredByType,
    activeCategoryObject,
    showAllCategories,
    toggleShowAllCategories,
    selectedRootFilter,
    setSelectedRootFilter,
    previewInstrument,
    setPreviewInstrument,
    diagramDisplayMode,
    setDiagramDisplayMode,
  };
}
