import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  useNavHidden,
  useNavCollapsed,
  useNavScrollOffset,
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
} from '@workspace/studio-core';
import { SharedNavigationBar } from './SharedNavigationBar';
import { NavigationAnimationProvider } from './NavigationAnimationProvider';
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
  const scrollOffset = useNavScrollOffset();
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

  const currentRoute = useNavigationStore((s) => s.history[s.history.length - 1]);
  const routeKey = `${currentRoute?.app || 'hub'}:${currentRoute?.page || 'main'}:${currentRoute?.tab || ''}`;
  const prevRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    if (prevRouteKeyRef.current !== routeKey) {
      prevRouteKeyRef.current = routeKey;
      setProfileMenuOpen(false);
    }
  }, [routeKey, setProfileMenuOpen]);

  const currentApp = currentRoute?.app ?? 'hub';
  const activeTab = currentRoute?.tab || currentRoute?.page || 'home';
  const activePage = currentRoute?.page || 'main';

  const t = useT() as any;
  const getTranslation = useCallback(
    (key: string) => {
      if (!t) return key;
      const nav = t.nav || t.navigation || {};
      if (key === 'songs') return nav.songs || 'Songs';
      if (key === 'library') return nav.library || 'Library';
      if (key === 'settings') return nav.settings || 'Preferences';
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
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, fontVariationSettings: "'FILL' 1", display: 'block' }}
        >
          {avatarIcon}
        </span>
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
      <span className="material-symbols-outlined" style={{ fontSize: 22, display: 'block' }}>
        person
      </span>
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
      const freshCurrentApp = activeHistory[activeHistory.length - 1]?.app ?? 'hub';
      const isStage = freshCurrentApp === 'stagex';

      const isModalOpen =
        activeOverlaysRegistry.modals.size > 0 ||
        activeOverlaysRegistry.sheets.size > 0;
      setHasDOMHiddenIndicator(
        isFullscreen || isModalOpen || (isStage && isLandscape)
      );
    };

    updateOverlayIndicator();

    const unsubRegistry = activeOverlaysRegistry.subscribe(updateOverlayIndicator);
    document.addEventListener('fullscreenchange', updateOverlayIndicator);
    window.addEventListener('resize', updateOverlayIndicator, { passive: true });

    return () => {
      unsubRegistry();
      document.removeEventListener('fullscreenchange', updateOverlayIndicator);
      window.removeEventListener('resize', updateOverlayIndicator);
    };
  }, []);

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
      return [
        {
          key: 'profile',
          icon: profileIcon,
          label: getTranslation('profile'),
          isActive: activeTab === 'profile' || activePage === 'profile',
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
          },
        },
        {
          key: 'home',
          icon: 'home',
          label: getTranslation('home'),
          isActive: activeTab === 'home' && activePage !== 'profile',
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', tab: 'home' });
          },
        },
        {
          key: 'settings',
          icon: 'cog',
          label: getTranslation('settings'),
          isActive: activeTab === 'settings' && activePage !== 'profile',
          onClick: () => {
            NavigationDispatcher.push({ app: 'hub', tab: 'settings' });
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
      if (currentApp === 'stagex' && sec.id === 'Editor') {
        isActive = activeTab === 'Editor' || activePage === 'Editor' || activePage === 'Export';
      }
      if (currentApp === 'drumex') {
        if (sec.id === 'beats' && (activeTab === 'songs' || activePage === 'songs'))
          isActive = true;
        if (sec.id === 'songs' && (activeTab === 'beats' || activePage === 'beats'))
          isActive = true;
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
    activeTab,
    activePage,
    instrument,
    getTranslation,
    profileIcon,
    setProfileMenuOpen,
    toggleProfileMenu,
  ]);

  const isDrumexEditor = currentApp === 'drumex' && (currentRoute as any)?.subView === 'editor';
  const isDrumexMetronome =
    currentApp === 'drumex' &&
    (activeTab === 'metronome' ||
      activePage === 'metronome' ||
      currentRoute?.page === 'metronome' ||
      (currentRoute as any)?.tab === 'metronome' ||
      (currentRoute as any)?.subView === 'metronome');
  const visible =
    !hidden &&
    !isKeyboardFocused &&
    !hasDOMHiddenIndicator &&
    storeVisible &&
    !isDrumexEditor &&
    !isDrumexMetronome;

  return (
    <NavigationAnimationProvider activeTab={activeTab} items={computedItems}>
      <SharedNavigationBar
        items={computedItems}
        isLight={isLight}
        visible={visible}
        isLocked={isLocked}
        collapsed={collapsed}
        isSwitcherOpen={isSwitcherOpen}
        setIsSwitcherOpen={setIsSwitcherOpen}
        currentApp={currentApp}
        onOpenProfile={() => toggleProfileMenu()}
        user={user}
        customPhoto={customPhoto}
        profileIcon={profileIcon}
      />
    </NavigationAnimationProvider>
  );
}
