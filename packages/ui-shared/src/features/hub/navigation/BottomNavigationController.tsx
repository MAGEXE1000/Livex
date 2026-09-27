import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import {
  useNavHidden,
  useNavCollapsed,
  useBottomNavigationStore,
  useApplicationTransitionStore,
  useNavigationStore,
  useSettingsStore,
  useT,
  APP_SECTIONS,
  NavigationDispatcher,
  authRepository,
  getUserAvatar,
  subscribeUserAvatar,
  getUserCover,
  subscribeUserCover,
  useBackHandler,
  useShallow,
  useChordStore,
  useAssistantStore,
  resetNav,
  recoverNavVisibility,
} from '@workspace/livex-core';
import { LivexAssistantMascot } from '../../assistant/components/LivexAssistantMascot';
import { SharedNavigationBar } from './SharedNavigationBar';
import { IconSongs, IconLibrary, IconSettings } from '../icons/NavIcons';
import { motion, AnimatePresence } from 'motion/react';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';

if (typeof window !== 'undefined' && localStorage.getItem('studio_debug_mode') === 'true') {
  (window as any).__navMetrics = (window as any).__navMetrics || {
    mounts: 0,
    unmounts: 0,
    fallbackActivations: 0,
    recoveries: 0,
    itemRebuilds: 0,
    controllerRecreations: 0,
  };
}

export function BottomNavigationController() {
  const hidden = useNavHidden();
  const collapsed = useNavCollapsed();
  const transitionState = useApplicationTransitionStore((s) => s.state);
  const launchingApp = useApplicationTransitionStore((s) => s.launchingApp);
  const isTransitioning = transitionState !== 'IDLE';

  const theme = useSettingsStore((s) => s.settings.theme);
  const instrument = useSettingsStore((s) => s.settings.instrument);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  const setCollapsed = useBottomNavigationStore((s) => s.setCollapsed);
  const setVisible = useBottomNavigationStore((s) => s.setVisible);
  const setMotionState = useBottomNavigationStore((s) => s.setMotionState);
  const setIsLight = useBottomNavigationStore((s) => s.setIsLight);

  const isSwitcherOpen = useBottomNavigationStore((s) => s.isSwitcherOpen);
  const setIsSwitcherOpen = useCallback((open: boolean) => {
    useBottomNavigationStore.getState().setSwitcherOpen(open);
  }, []);

  const isProfileMenuOpen = useBottomNavigationStore((s) => s.isProfileMenuOpen);
  const setProfileMenuOpen = useBottomNavigationStore((s) => s.setProfileMenuOpen);
  const toggleProfileMenu = useBottomNavigationStore((s) => s.toggleProfileMenu);
  const storeVisible = useBottomNavigationStore((s) => s.visible);
  const isLocked = useBottomNavigationStore((s) => s.isLocked);
  const mascotState = useAssistantStore((s) => s.mascotState);

  useBackHandler(
    'overlay',
    () => {
      if (isProfileMenuOpen) {
        setProfileMenuOpen(false);
        return true;
      }
      return false;
    },
    [isProfileMenuOpen, setProfileMenuOpen]
  );

  useBackHandler(
    'overlay',
    () => {
      if (isSwitcherOpen) {
        setIsSwitcherOpen(false);
        return true;
      }
      return false;
    },
    [isSwitcherOpen, setIsSwitcherOpen]
  );

  const currentRoute = useNavigationStore((s) => s.history[s.history.length - 1]);
  const routeKey = `${currentRoute?.app || 'hub'}:${currentRoute?.page || 'main'}:${currentRoute?.tab || ''}`;
  const prevRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    if (prevRouteKeyRef.current !== routeKey) {
      prevRouteKeyRef.current = routeKey;
      setProfileMenuOpen(false);
      setIsKeyboardFocused(false);
      resetNav();
    }
  }, [routeKey, setProfileMenuOpen]);

  const currentApp = currentRoute?.app ?? 'hub';
  const rawTab = currentRoute?.tab;
  const rawPage = currentRoute?.page;
  const activeTab = rawTab || (currentApp === 'hub' ? 'home' : rawPage || '');
  const activePage = rawPage || '';

  const t = useT() as any;
  const getTranslation = useCallback(
    (key: string) => {
      if (!t) return key;
      const nav = t.nav || t.navigation || {};
      if (key === 'songs') return nav.songs || 'Songs';
      if (key === 'library') return nav.library || 'Library';
      if (key === 'settings') return nav.settings || 'Settings';
      if (key === 'preferences') return nav.preferences || 'Preferences';
      if (key === 'chords') return nav.chords || 'Chords';
      if (key === 'drumMetronome' || key === 'metronome') return nav.drumMetronome || 'Metronome';
      if (key === 'drumSongs' || key === 'drumBeats') return nav.drumBeats || 'Beats';
      if (key === 'drumPatterns') return nav.drumPatterns || 'Patterns';
      if (key === 'drumPreferences') return nav.drumPreferences || 'Preferences';
      if (key === 'groovexLibrary' || key === 'groovexRhythms')
        return nav.groovexRhythms || 'Rhythms';
      if (key === 'groovexPreferences') return nav.groovexPreferences || 'Preferences';
      if (key === 'vocalexCoach') return nav.vocalexCoach || 'Coach';
      if (key === 'vocalexTakes') return nav.vocalexTakes || 'Takes';
      if (key === 'vocalexPreferences') return nav.vocalexPreferences || 'Preferences';
      if (key === 'stagexStage') return nav.stagexStage || 'Stage';
      if (key === 'stagexSetup') return nav.stagexSetup || 'Setup';
      if (key === 'stagexPreferences') return nav.stagexPreferences || 'Preferences';
      if (key === 'home') return nav.home || 'Home';
      if (key === 'profile') return nav.profile || 'Profile';
      if (key === 'practice') return nav.practice || 'Practice';
      return nav[key] || key;
    },
    [t]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__navMetrics && (window as any).__navMetrics.controllerRecreations++;
    }
  }, []);

  // Subscribe to user and avatar details
  const [user, setUser] = useState<any>(null);
  const [avatarIcon, setAvatarIcon] = useState<string | null>(null);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);

  useEffect(() => {
    return authRepository.subscribeAuth((u: any) => {
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setAvatarIcon(null);
      setCustomPhoto(null);
      return;
    }
    const refreshAvatar = () => setAvatarIcon(getUserAvatar(user.uid));
    const refreshCover = () => setCustomPhoto(getUserCover(user.uid));
    refreshAvatar();
    refreshCover();

    const unsubAvatar = subscribeUserAvatar(refreshAvatar);
    const unsubCover = subscribeUserCover(({ uid, cover }) => {
      if (uid === user.uid) {
        setCustomPhoto(cover);
      }
    });

    return () => {
      unsubAvatar();
      unsubCover();
    };
  }, [user]);

  const profileIcon = useMemo(() => {
    const effectivePhoto = customPhoto || user?.photoURL;
    if (avatarIcon) {
      return (
        <StudioIcon
          name={avatarIcon}
          size={22}
          filled
          style={{ display: 'block' }}
        />
      );
    }
    if (effectivePhoto) {
      return (
        <img
          src={effectivePhoto}
          alt=""
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
          }}
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <StudioIcon
        name="person"
        size={22}
        style={{ display: 'block' }}
      />
    );
  }, [user, avatarIcon, customPhoto]);

  // Dynamically resolve bottom nav items light mode state
  useEffect(() => {
    setIsLight(isLight);
  }, [isLight, setIsLight]);

  // Sync programmatic visibility and collapse states
  useEffect(() => {
    setVisible(!hidden);
  }, [hidden, setVisible]);

  useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed, setCollapsed]);

  // Sync transition coordinator states
  useEffect(() => {
    if (transitionState !== 'IDLE') {
      if (launchingApp === 'hub') {
        setMotionState('ReturningToHub');
      } else {
        setMotionState('Transitioning');
      }
    } else {
      setMotionState(hidden ? 'Hidden' : collapsed ? 'Scrolling' : 'Idle');
    }
  }, [transitionState, launchingApp, hidden, collapsed, setMotionState]);

  // Compute visibility reactively based on DOM focus and indicators
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkKeyboard = () => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        const isSearchInput = activeEl.id === 'global-search-input';
        setIsKeyboardFocused(
          (!isSearchInput && tagName === 'input') ||
            tagName === 'textarea' ||
            activeEl.hasAttribute('contenteditable') ||
            (activeEl as HTMLElement).isContentEditable
        );
      } else {
        setIsKeyboardFocused(false);
      }
    };
    window.addEventListener('focusin', checkKeyboard);
    window.addEventListener('focusout', checkKeyboard);
    return () => {
      window.removeEventListener('focusin', checkKeyboard);
      window.removeEventListener('focusout', checkKeyboard);
    };
  }, []);

  const [hasDOMHiddenIndicator, setHasDOMHiddenIndicator] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateOverlayIndicator = () => {
      const isFullscreen = !!document.fullscreenElement;
      const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
      const activeHistory = useNavigationStore.getState().history;
      const currentRoute = activeHistory[activeHistory.length - 1];
      const freshCurrentApp = currentRoute?.app ?? 'hub';
      const freshCurrentPage = currentRoute?.page;
      const isStageEditor =
        freshCurrentApp === 'stagex' &&
        (!freshCurrentPage || freshCurrentPage === 'Editor' || freshCurrentPage === 'stage');

      // Self-heal zombie registry entries if no dialog elements exist in active DOM
      if (activeOverlaysRegistry.modals.size > 0 || activeOverlaysRegistry.sheets.size > 0) {
        const dialogElements = document.querySelectorAll(
          '[role="dialog"], [data-dialog], [data-radix-portal], .dialog-backdrop, .modal-backdrop, .sheet-backdrop'
        );
        let hasVisibleDialogInDom = false;
        for (let i = 0; i < dialogElements.length; i++) {
          const el = dialogElements[i];
          if (!el.closest('.shared-nav-pane-hidden, [data-pane-state="hidden"]')) {
            hasVisibleDialogInDom = true;
            break;
          }
        }
        if (!hasVisibleDialogInDom) {
          activeOverlaysRegistry.modals.clear();
          activeOverlaysRegistry.sheets.clear();
        }
      }

      const isModalOpen =
        activeOverlaysRegistry.modals.size > 0 ||
        activeOverlaysRegistry.sheets.size > 0;
      setHasDOMHiddenIndicator(
        isFullscreen || isModalOpen || (isStageEditor && isLandscape)
      );
    };

    updateOverlayIndicator();

    const unsubRegistry = activeOverlaysRegistry.subscribe(updateOverlayIndicator);
    document.addEventListener('fullscreenchange', updateOverlayIndicator);
    window.addEventListener('resize', updateOverlayIndicator, { passive: true });
    window.addEventListener('orientationchange', updateOverlayIndicator, { passive: true });
    if (typeof window !== 'undefined' && window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOverlayIndicator);
    }

    return () => {
      unsubRegistry();
      document.removeEventListener('fullscreenchange', updateOverlayIndicator);
      window.removeEventListener('resize', updateOverlayIndicator);
      window.removeEventListener('orientationchange', updateOverlayIndicator);
      if (typeof window !== 'undefined' && window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOverlayIndicator);
      }
    };
  }, [routeKey]);

  const lastAppRef = useRef<string | null>(null);

  // Compute navigation items synchronously from route history & registry definitions
  const computedItems = useMemo(() => {
    if (currentApp !== lastAppRef.current) {
      lastAppRef.current = currentApp;
      if (typeof window !== 'undefined') {
        (window as any).__navMetrics && (window as any).__navMetrics.itemRebuilds++;
      }
    }

    if (currentApp === 'hub') {
      const isProfile = rawTab === 'profile' || rawPage === 'profile';
      const isSettings = rawTab === 'settings' || rawPage === 'settings';
      const isHome = !isProfile && !isSettings && (rawTab === 'home' || rawPage === 'home' || (!rawTab && !rawPage));

      return [
        {
          key: 'profile',
          icon: profileIcon,
          label: getTranslation('profile'),
          isActive: isProfile,
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', page: 'profile', tab: 'profile' });
            setProfileMenuOpen(false);
          },
        },
        {
          key: 'home',
          icon: 'home',
          label: getTranslation('home'),
          isActive: isHome,
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', page: 'home', tab: 'home' });
            setProfileMenuOpen(false);
          },
        },
        {
          key: 'settings',
          icon: 'cog',
          label: getTranslation('settings'),
          isActive: isSettings,
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', page: 'main', tab: 'settings' });
            setProfileMenuOpen(false);
          },
        },
      ];
    }

    if (currentApp === 'chordex') {
      const isSax = instrument === 'saxophone';
      const sections = isSax
        ? [
            { id: 'practice', labelKey: 'practice', icon: 'graphic_eq' },
            { id: 'library', labelKey: 'library', icon: 'library' },
            { id: 'preferences', labelKey: 'preferences', icon: 'settings' },
          ]
        : APP_SECTIONS.chordex || [];

      return sections.map((sec) => {
        const isActive = activeTab === sec.id || activePage === sec.id;
        const iconElement = sec.icon;

        return {
          key: sec.id,
          icon: iconElement,
          label: sec.id === 'practice' ? getTranslation('practice') : getTranslation(sec.labelKey),
          isActive,
          onClick: () => {
            NavigationDispatcher.push({ app: 'chordex', page: sec.id as any, tab: sec.id as any });
            setProfileMenuOpen(false);
          },
        };
      });
    }

    const sections = APP_SECTIONS[currentApp] || [];
    return sections.map((sec) => {
      let isActive = activeTab === sec.id || activePage === sec.id;
      if (currentApp === 'stagex') {
        if (
          sec.id === 'Editor' &&
          (activeTab === 'Editor' || activePage === 'Editor' ||
           activeTab === 'editor' || activePage === 'editor' ||
           activeTab === 'stage' || activePage === 'stage' ||
           activeTab === 'Stage' || activePage === 'Stage' ||
           activePage === 'Export')
        ) {
          isActive = true;
        } else if (
          sec.id === 'Setup' &&
          (activeTab === 'Setup' || activePage === 'Setup' || activeTab === 'setup' || activePage === 'setup')
        ) {
          isActive = true;
        } else if (
          sec.id === 'Preferences' &&
          (activeTab === 'Preferences' || activePage === 'Preferences' ||
           activeTab === 'preferences' || activePage === 'preferences' ||
           activeTab === 'prefs' || activePage === 'prefs')
        ) {
          isActive = true;
        }
      }
      if (currentApp === 'drumex') {
        if (
          sec.id === 'beats' &&
          (activeTab === 'songs' || activePage === 'songs' || activeTab === 'beats' || activePage === 'beats')
        ) {
          isActive = true;
        } else if (
          sec.id === 'patterns' &&
          (activeTab === 'patterns' || activePage === 'patterns')
        ) {
          isActive = true;
        } else if (
          sec.id === 'prefs' &&
          (activeTab === 'prefs' || activePage === 'prefs' || activeTab === 'preferences' || activePage === 'preferences')
        ) {
          isActive = true;
        }
      }
      if (currentApp === 'groovex') {
        if (
          sec.id === 'library' &&
          (activeTab === 'rhythms' || activePage === 'rhythms' || activeTab === 'library' || activePage === 'library')
        ) {
          isActive = true;
        } else if (
          sec.id === 'preferences' &&
          (activeTab === 'preferences' || activePage === 'preferences' || activeTab === 'prefs' || activePage === 'prefs')
        ) {
          isActive = true;
        }
      }
      if (currentApp === 'vocalex') {
        if (
          sec.id === 'coach' &&
          (activeTab === 'coach' || activePage === 'coach')
        ) {
          isActive = true;
        } else if (
          sec.id === 'takes' &&
          (activeTab === 'takes' || activePage === 'takes')
        ) {
          isActive = true;
        } else if (
          sec.id === 'preferences' &&
          (activeTab === 'preferences' || activePage === 'preferences' || activeTab === 'prefs' || activePage === 'prefs')
        ) {
          isActive = true;
        }
      }
      return {
        key: sec.id,
        icon: sec.icon,
        label: getTranslation(sec.labelKey),
        isActive,
        onClick: () => {
          NavigationDispatcher.push({
            app: currentApp as any,
            page: sec.id as any,
            tab: sec.id as any,
          });
          setProfileMenuOpen(false);
        },
      };
    });
  }, [
    currentApp,
    rawTab,
    rawPage,
    activeTab,
    activePage,
    instrument,
    getTranslation,
    profileIcon,
    setProfileMenuOpen,
    toggleProfileMenu,
    mascotState,
  ]);

  const isDrumexEditor = currentApp === 'drumex' && (currentRoute as any)?.subView === 'editor';
  const isDrumexMetronome =
    currentApp === 'drumex' &&
    (activeTab === 'metronome' ||
      activePage === 'metronome' ||
      currentRoute?.page === 'metronome' ||
      (currentRoute as any)?.tab === 'metronome' ||
      (currentRoute as any)?.subView === 'metronome');
  const activeChordPresetId = useChordStore((s) => s.activePresetId);
  const isChordexSong =
    currentApp === 'chordex' &&
    (activeTab === 'songs' || activePage === 'songs' || currentRoute?.page === 'songs' || !activePage) &&
    Boolean(
      (currentRoute as any)?.subView === 'editor' ||
      (currentRoute as any)?.subView === 'song' ||
      (currentRoute as any)?.subView === 'form' ||
      (currentRoute as any)?.subView === 'practice' ||
      ((activeTab === 'songs' || activePage === 'songs') && activeChordPresetId)
    );

  useEffect(() => {
    if (currentApp !== 'chordex') {
      if (useChordStore.getState().activePresetId) {
        useChordStore.getState().setActivePreset(null);
      }
    }
  }, [currentApp]);
  const isGroovexSong =
    currentApp === 'groovex' &&
    (activeTab === 'player' ||
      activePage === 'player' ||
      currentRoute?.page === 'player' ||
      (currentRoute as any)?.tab === 'player');
  const isAssistantScreen =
    currentApp === 'hub' &&
    (activeTab === 'assistant' ||
      activePage === 'assistant' ||
      currentRoute?.page === 'assistant' ||
      (currentRoute as any)?.tab === 'assistant');
  const isStageExport =
    currentApp === 'stagex' &&
    (activeTab === 'Export' ||
      activePage === 'Export' ||
      currentRoute?.page === 'Export' ||
      (currentRoute as any)?.tab === 'Export' ||
      (currentRoute as any)?.subView === 'Export');

  const isExpectedVisible =
    !isDrumexEditor &&
    !isDrumexMetronome &&
    !isChordexSong &&
    !isGroovexSong &&
    !isAssistantScreen &&
    !isStageExport;

  const visible =
    isExpectedVisible &&
    !hidden &&
    !isKeyboardFocused &&
    !hasDOMHiddenIndicator &&
    storeVisible;

  // Bounded self-healing recovery: if route expects nav visible but system is stuck in locked/hidden state
  useEffect(() => {
    if (isExpectedVisible && !isKeyboardFocused && !hasDOMHiddenIndicator) {
      if (hidden || isLocked || !storeVisible) {
        recoverNavVisibility();
      }
    }
  }, [routeKey, isExpectedVisible, isKeyboardFocused, hasDOMHiddenIndicator, hidden, isLocked, storeVisible]);

  return (
    <SharedNavigationBar
      items={computedItems}
      isLight={isLight}
      visible={visible}
      isLocked={isLocked}
      collapsed={collapsed}
      isSwitcherOpen={isSwitcherOpen}
      setIsSwitcherOpen={setIsSwitcherOpen}
      currentApp={currentApp}
      activeTab={activeTab}
      mascotState={mascotState}
      onOpenProfile={() => toggleProfileMenu()}
      user={user}
      customPhoto={customPhoto}
      profileIcon={profileIcon}
    />
  );
}
