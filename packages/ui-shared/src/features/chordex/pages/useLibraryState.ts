import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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

  // Foreground morphing popup state (mobile) & split preview state (desktop)
  const [modalChordState, setModalChordState] = useState<{
    id: string;
    originRect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  } | null>(null);
  const [desktopChordId, setDesktopChordId] = useState<string | null>(null);

  const closeModalChord = useCallback(() => {
    setModalChordState(null);
  }, []);

  const [showFinder, setShowFinder] = useState(false);
  const [finderOriginRect, setFinderOriginRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);

  const openFinder = useCallback((eventOrElement?: React.MouseEvent | HTMLElement | DOMRect | any) => {
    let rect: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null = null;
    if (eventOrElement) {
      if ('getBoundingClientRect' in eventOrElement && typeof eventOrElement.getBoundingClientRect === 'function') {
        const r = eventOrElement.getBoundingClientRect();
        rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      } else if ('currentTarget' in eventOrElement && eventOrElement.currentTarget && typeof (eventOrElement.currentTarget as HTMLElement).getBoundingClientRect === 'function') {
        const r = (eventOrElement.currentTarget as HTMLElement).getBoundingClientRect();
        rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      } else if ('target' in eventOrElement && eventOrElement.target && typeof (eventOrElement.target as HTMLElement).getBoundingClientRect === 'function') {
        const r = (eventOrElement.target as HTMLElement).getBoundingClientRect();
        rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      } else if (typeof eventOrElement.top === 'number' && typeof eventOrElement.left === 'number') {
        rect = {
          top: eventOrElement.top,
          left: eventOrElement.left,
          right: eventOrElement.right ?? (eventOrElement.left + eventOrElement.width),
          bottom: eventOrElement.bottom ?? (eventOrElement.top + eventOrElement.height),
          width: eventOrElement.width,
          height: eventOrElement.height,
        };
      }
    }
    if (!rect && typeof document !== 'undefined') {
      const el = document.querySelector('[data-purpose="tool-finder"]');
      if (el) {
        const r = el.getBoundingClientRect();
        rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      }
    }
    setFinderOriginRect(rect);
    setShowFinder(true);
  }, []);

  const closeFinder = useCallback(() => {
    setShowFinder(false);
  }, []);

  const allChords = useMemo(() => getAllChords(), []);
  const accent = resolveAccent(settings.accentColor);

  const isLight =
    settings.theme === 'light' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const scrollRef = useRef<HTMLDivElement>(null);

  const modalChord = useMemo(() => {
    return modalChordState?.id ? getChordById(modalChordState.id) : null;
  }, [modalChordState?.id]);

  const lastActiveModalChordRef = useRef<ReturnType<typeof getChordById> | null>(null);
  useEffect(() => {
    if (modalChord) {
      lastActiveModalChordRef.current = modalChord;
    }
  }, [modalChord]);

  const displayModalChord = modalChord || lastActiveModalChordRef.current;

  const chord = useMemo(() => {
    if (modalChordState?.id) return getChordById(modalChordState.id);
    if (desktopChordId) return getChordById(desktopChordId);
    if (selectedChordId) return getChordById(selectedChordId);
    return null;
  }, [modalChordState?.id, desktopChordId, selectedChordId]);

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

  const handleChordClick = useCallback(
    (chordId: string, eventOrElement?: React.MouseEvent | HTMLElement | DOMRect | any) => {
      // 1. Update recentChords in chord store
      useChordStore.setState((state) => {
        const recent = [chordId, ...state.recentChords.filter((id) => id !== chordId)].slice(0, 10);
        return { recentChords: recent };
      });

      // 2. Desktop Web: select chord for right preview column without route change
      if (isWebDesktop) {
        setDesktopChordId(chordId);
        return;
      }

      // 3. Mobile (Web Preview & Android APK): capture synchronous DOMRect and morph
      let originRect: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null = null;
      if (eventOrElement) {
        if ('getBoundingClientRect' in eventOrElement && typeof eventOrElement.getBoundingClientRect === 'function') {
          const r = eventOrElement.getBoundingClientRect();
          originRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        } else if ('currentTarget' in eventOrElement && eventOrElement.currentTarget && typeof (eventOrElement.currentTarget as HTMLElement).getBoundingClientRect === 'function') {
          const r = (eventOrElement.currentTarget as HTMLElement).getBoundingClientRect();
          originRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        } else if ('target' in eventOrElement && eventOrElement.target && typeof (eventOrElement.target as HTMLElement).getBoundingClientRect === 'function') {
          const r = (eventOrElement.target as HTMLElement).getBoundingClientRect();
          originRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        } else if (typeof eventOrElement.top === 'number' && typeof eventOrElement.left === 'number') {
          originRect = {
            top: eventOrElement.top,
            left: eventOrElement.left,
            right: eventOrElement.right ?? (eventOrElement.left + eventOrElement.width),
            bottom: eventOrElement.bottom ?? (eventOrElement.top + eventOrElement.height),
            width: eventOrElement.width,
            height: eventOrElement.height,
          };
        }
      }

      // Synchronous DOM query fallback matching the tagged chord card
      if (!originRect && typeof document !== 'undefined') {
        const el = document.querySelector(`[data-chord-id="${chordId}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          originRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        }
      }

      // If switching chords while modal is already open (e.g. related chords), preserve origin
      if (!originRect && modalChordState?.originRect) {
        originRect = modalChordState.originRect;
      }

      const viewportW = typeof window !== 'undefined' ? window.innerWidth : 390;
      const viewportH = typeof window !== 'undefined' ? window.innerHeight : 844;

      setModalChordState({
        id: chordId,
        originRect: originRect || {
          top: Math.round(viewportH * 0.4),
          left: Math.round(viewportW * 0.2),
          right: Math.round(viewportW * 0.8),
          bottom: Math.round(viewportH * 0.6),
          width: Math.round(viewportW * 0.6),
          height: 120,
        },
      });
    },
    [isWebDesktop, modalChordState]
  );

  const selectChord = useCallback(
    (chordId: string | null) => {
      if (chordId === null) {
        if (isWebDesktop) {
          setDesktopChordId(null);
        } else {
          setModalChordState(null);
          if (currentRoute.app === 'chordex' && currentRoute.page === 'chord') {
            NavigationDispatcher.pop();
          }
        }
      } else {
        if (isWebDesktop) {
          setDesktopChordId(chordId);
        } else {
          handleChordClick(chordId);
        }
      }
    },
    [isWebDesktop, handleChordClick, currentRoute]
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
      if (modalChordState) {
        closeModalChord();
        return true;
      }
      if (showFinder) {
        closeFinder();
        return true;
      }
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
      modalChordState,
      closeModalChord,
      showFinder,
      closeFinder,
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
    modalChordState,
    modalChord,
    displayModalChord,
    closeModalChord,
    finderOriginRect,
    openFinder,
    closeFinder,
  };
}
