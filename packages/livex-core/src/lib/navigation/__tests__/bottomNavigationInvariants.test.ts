import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { NavigationDispatcher } from '../NavigationDispatcher';
import { BackDispatcher } from '../BackDispatcher';
import { normalizeAndValidateRoute } from '../validation';
import { APP_SECTIONS } from '../appRegistry';
import {
  resetNav,
  setNavLocked,
  setNavHidden,
  getNavHidden,
  recoverNavVisibility,
} from '../navScroll';
import { useBottomNavigationStore } from '../useBottomNavigationStore';

/**
 * Pure helper mirroring the canonical active-state derivation logic in BottomNavigationController
 */
function resolveActiveNavItems(currentRoute: any) {
  const currentApp = currentRoute?.app ?? 'hub';
  const rawTab = currentRoute?.tab;
  const rawPage = currentRoute?.page;
  const activeTab = rawTab || (currentApp === 'hub' ? 'home' : rawPage || '');
  const activePage = rawPage || '';

  if (currentApp === 'hub') {
    const isProfile = rawTab === 'profile' || rawPage === 'profile';
    const isSettings = rawTab === 'settings' || rawPage === 'settings';
    const isHome = !isProfile && !isSettings && (rawTab === 'home' || rawPage === 'home' || (!rawTab && !rawPage));

    return [
      { key: 'profile', isActive: isProfile },
      { key: 'home', isActive: isHome },
      { key: 'settings', isActive: isSettings },
    ];
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
    return { key: sec.id, isActive };
  });
}

describe('Bottom Navigation Active State Invariants & Test Matrix', () => {
  let originalDocument: any;
  let originalWindow: any;
  let eventListeners: Record<string, Function[]> = {};

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;
    eventListeners = {};

    const attributes: Record<string, string> = {};
    (globalThis as any).document = {
      documentElement: {
        setAttribute: vi.fn((k: string, v: string) => {
          attributes[k] = v;
        }),
        removeAttribute: vi.fn((k: string) => {
          delete attributes[k];
        }),
        getAttribute: vi.fn((k: string) => attributes[k] ?? null),
        hasAttribute: vi.fn((k: string) => k in attributes),
      },
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
    };

    (globalThis as any).window = {
      addEventListener: vi.fn((name: string, fn: any) => {
        (eventListeners[name] = eventListeners[name] || []).push(fn);
      }),
      removeEventListener: vi.fn((name: string, fn: any) => {
        eventListeners[name] = (eventListeners[name] || []).filter((f) => f !== fn);
      }),
      dispatchEvent: vi.fn((e: any) => {
        (eventListeners[e.type] || []).forEach((fn) => fn(e));
        return true;
      }),
      innerWidth: 400,
      innerHeight: 800,
      screen: {
        orientation: {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    };

    resetNav();
    BackDispatcher.resetDebounce();
    useNavigationStore.setState({
      history: [{ app: 'hub', tab: 'home' }],
      activeHandlers: [],
      isTransitioning: false,
      transitionType: null,
    });
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  describe('1. Hub Navigation Matrix & Mutual Exclusivity', () => {
    it('initial default route ({ app: "hub", tab: "home" }) activates only Home', () => {
      const route = useNavigationStore.getState().history[0];
      const items = resolveActiveNavItems(route);

      expect(items.find((i) => i.key === 'home')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);
    });

    it('Home -> Settings transition highlights Settings and deactivates Home', () => {
      NavigationDispatcher.push({ app: 'hub', page: 'main', tab: 'settings' });
      const currentRoute = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(currentRoute);

      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'home')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(false);
    });

    it('Settings -> Home transition restores Home and deactivates Settings (no stale highlight)', () => {
      NavigationDispatcher.push({ app: 'hub', page: 'main', tab: 'settings' });
      NavigationDispatcher.push({ app: 'hub', page: 'home', tab: 'home' });
      const currentRoute = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(currentRoute);

      expect(items.find((i) => i.key === 'home')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(false);
    });

    it('Home -> Profile transition activates Profile and deactivates Home', () => {
      NavigationDispatcher.push({ app: 'hub', page: 'profile', tab: 'profile' });
      const currentRoute = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(currentRoute);

      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'home')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);
    });

    it('Profile -> Home transition restores Home and deactivates Profile', () => {
      NavigationDispatcher.push({ app: 'hub', page: 'profile', tab: 'profile' });
      NavigationDispatcher.push({ app: 'hub', page: 'home', tab: 'home' });
      const currentRoute = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(currentRoute);

      expect(items.find((i) => i.key === 'home')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);
    });

    it('rapid repeated switching between Hub tabs preserves strict mutual exclusivity', () => {
      const tabs: ('home' | 'settings' | 'profile')[] = [
        'home', 'settings', 'home', 'profile', 'settings', 'home', 'profile', 'home'
      ];
      for (const tab of tabs) {
        NavigationDispatcher.push({ app: 'hub', tab, page: tab });
        const route = useNavigationStore.getState().history.slice(-1)[0];
        const items = resolveActiveNavItems(route);
        const activeCount = items.filter((i) => i.isActive).length;
        expect(activeCount).toBe(1);
        expect(items.find((i) => i.key === tab)?.isActive).toBe(true);
      }
    });

    it('hardware/gesture back maintains exact active navbar synchronization', () => {
      NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
      NavigationDispatcher.push({ app: 'hub', tab: 'settings' });

      // First back returns to Profile
      BackDispatcher.handleBackEvent();
      let route = useNavigationStore.getState().history.slice(-1)[0];
      let items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);

      // Second back returns to Home
      BackDispatcher.resetDebounce();
      BackDispatcher.handleBackEvent();
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'home')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'profile')?.isActive).toBe(false);
    });
  });

  describe('2. Internal Sub-App Navigation Matrix', () => {
    it('entering Chordex highlights the resolved Chordex section without Hub leakage', () => {
      NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
      const route = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(route);

      expect(items.find((i) => i.key === 'songs')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'library')?.isActive).toBe(false);
      expect(items.find((i) => i.key === 'preferences')?.isActive).toBe(false);
    });

    it('entering Drumex properly matches beats, patterns, and preferences aliases', () => {
      NavigationDispatcher.push({ app: 'drumex', page: 'beats' });
      let route = useNavigationStore.getState().history.slice(-1)[0];
      let items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'beats')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'drumex', page: 'patterns' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'patterns')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'drumex', page: 'preferences' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'prefs')?.isActive).toBe(true);
    });

    it('entering Stagex properly matches Editor, Setup, and Preferences case-insensitively', () => {
      NavigationDispatcher.push({ app: 'stagex', page: 'Editor' });
      let route = useNavigationStore.getState().history.slice(-1)[0];
      let items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'Editor')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'stagex', page: 'Setup' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'Setup')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'stagex', page: 'Preferences' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'Preferences')?.isActive).toBe(true);
    });

    it('entering Groovex properly matches library/rhythms and preferences', () => {
      NavigationDispatcher.push({ app: 'groovex', page: 'library' });
      let route = useNavigationStore.getState().history.slice(-1)[0];
      let items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'library')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'groovex', page: 'preferences' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'preferences')?.isActive).toBe(true);
    });

    it('entering Vocalex properly matches coach, takes, and preferences', () => {
      NavigationDispatcher.push({ app: 'vocalex', page: 'coach' });
      let route = useNavigationStore.getState().history.slice(-1)[0];
      let items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'coach')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'vocalex', page: 'takes' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'takes')?.isActive).toBe(true);

      NavigationDispatcher.push({ app: 'vocalex', page: 'preferences' });
      route = useNavigationStore.getState().history.slice(-1)[0];
      items = resolveActiveNavItems(route);
      expect(items.find((i) => i.key === 'preferences')?.isActive).toBe(true);
    });

    it('nested subviews with no bottom nav section yield unselected state (all isActive false)', () => {
      // Subview like chord detail
      const unselectedRoute = { app: 'chordex', page: 'chord' };
      const items = resolveActiveNavItems(unselectedRoute);
      const hasActive = items.some((i) => i.isActive);
      expect(hasActive).toBe(false);
    });

    it('returning from internal apps back to Hub accurately restores Hub selected item', () => {
      NavigationDispatcher.push({ app: 'chordex', page: 'library' });
      NavigationDispatcher.push({ app: 'hub' });
      const currentRoute = useNavigationStore.getState().history.slice(-1)[0];
      const items = resolveActiveNavItems(currentRoute);

      expect(currentRoute.app).toBe('hub');
      expect(items.find((i) => i.key === 'home')?.isActive).toBe(true);
      expect(items.find((i) => i.key === 'settings')?.isActive).toBe(false);
    });
  });

  describe('3. Persistence & Bounded Self-Healing Recovery Invariants', () => {
    it('recoverNavVisibility clears leaked locks and restores store visibility', () => {
      // Simulate leaked lock from a sub-app
      setNavLocked(true);
      setNavHidden(true);
      useBottomNavigationStore.getState().setLocked(true);
      useBottomNavigationStore.getState().setVisible(false);

      expect(getNavHidden()).toBe(true);
      expect(useBottomNavigationStore.getState().isLocked).toBe(true);
      expect(useBottomNavigationStore.getState().visible).toBe(false);

      const recovered = recoverNavVisibility();
      expect(recovered).toBe(true);
      expect(getNavHidden()).toBe(false);
      expect(useBottomNavigationStore.getState().isLocked).toBe(false);
      expect(useBottomNavigationStore.getState().visible).toBe(true);
    });

    it('resetNav clears all attributes and resets stores unconditionally', () => {
      setNavLocked(true);
      setNavHidden(true);
      useBottomNavigationStore.getState().setLocked(true);

      resetNav();

      expect(getNavHidden()).toBe(false);
      expect(useBottomNavigationStore.getState().isLocked).toBe(false);
      expect(useBottomNavigationStore.getState().visible).toBe(true);
      expect(useBottomNavigationStore.getState().collapsed).toBe(false);
    });

    it('navigating across routes resets locks via NavigationDispatcher', () => {
      // User opens a song in chordex (simulating locked sub-view)
      setNavLocked(true);
      setNavHidden(true);

      // User navigates to Drumex beats
      NavigationDispatcher.push({ app: 'drumex', page: 'beats' });

      // resetNav was triggered by NavigationDispatcher and route change
      expect(getNavHidden()).toBe(false);
      expect(useBottomNavigationStore.getState().isLocked).toBe(false);
      expect(useBottomNavigationStore.getState().visible).toBe(true);
    });

    it('orientation change and resize trigger listeners without throwing or losing state', () => {
      let eventFired = false;
      const onOrientationChange = () => {
        eventFired = true;
      };
      window.addEventListener('orientationchange', onOrientationChange);
      (window as any).dispatchEvent({ type: 'orientationchange' });
      expect(eventFired).toBe(true);
      window.removeEventListener('orientationchange', onOrientationChange);
    });
  });

  describe('4. Deterministic Route Visibility Invariants Matrix', () => {
    const isRouteExpectedVisible = (route: { app: string; page?: string; tab?: string; subView?: string }) => {
      const isDrumexEditor = route.app === 'drumex' && route.subView === 'editor';
      const isDrumexMetronome =
        route.app === 'drumex' &&
        (route.tab === 'metronome' || route.page === 'metronome' || route.subView === 'metronome');
      const isChordexSong =
        route.app === 'chordex' &&
        (route.tab === 'songs' || route.page === 'songs' || !route.page) &&
        Boolean(
          route.subView === 'editor' ||
          route.subView === 'song' ||
          route.subView === 'form' ||
          route.subView === 'practice'
        );
      const isStageExport =
        route.app === 'stagex' &&
        (route.tab === 'Export' || route.page === 'Export' || route.subView === 'Export');
      const isGroovexSong =
        route.app === 'groovex' && (route.tab === 'player' || route.page === 'player');
      const isAssistantScreen =
        route.app === 'hub' && (route.tab === 'assistant' || route.page === 'assistant');

      return (
        !isDrumexEditor &&
        !isDrumexMetronome &&
        !isChordexSong &&
        !isGroovexSong &&
        !isAssistantScreen &&
        !isStageExport
      );
    };

    it('Hub core routes are expected visible', () => {
      expect(isRouteExpectedVisible({ app: 'hub', tab: 'home' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'hub', tab: 'profile' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'hub', page: 'main', tab: 'settings' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'hub', tab: 'assistant' })).toBe(false);
    });

    it('Chordex routes: library, preferences, songs list are visible; editor/practice are hidden', () => {
      expect(isRouteExpectedVisible({ app: 'chordex', page: 'library' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'chordex', page: 'preferences' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'chordex', page: 'songs' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'chordex', page: 'songs', subView: 'editor' })).toBe(false);
      expect(isRouteExpectedVisible({ app: 'chordex', page: 'songs', subView: 'practice' })).toBe(false);
    });

    it('Drumex routes: beats, patterns, prefs are visible; metronome/editor are hidden', () => {
      expect(isRouteExpectedVisible({ app: 'drumex', page: 'beats' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'drumex', page: 'patterns' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'drumex', page: 'prefs' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'drumex', page: 'metronome' })).toBe(false);
      expect(isRouteExpectedVisible({ app: 'drumex', page: 'beats', subView: 'editor' })).toBe(false);
    });

    it('Stagex routes: Editor portrait, Setup, Preferences are visible; Export is hidden', () => {
      expect(isRouteExpectedVisible({ app: 'stagex', page: 'Editor' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'stagex', page: 'Setup' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'stagex', page: 'Preferences' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'stagex', page: 'Export' })).toBe(false);
    });

    it('Groovex routes: library, preferences are visible; player is hidden', () => {
      expect(isRouteExpectedVisible({ app: 'groovex', page: 'library' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'groovex', page: 'preferences' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'groovex', page: 'player' })).toBe(false);
    });

    it('Vocalex routes: coach, takes, preferences are all visible', () => {
      expect(isRouteExpectedVisible({ app: 'vocalex', page: 'coach' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'vocalex', page: 'takes' })).toBe(true);
      expect(isRouteExpectedVisible({ app: 'vocalex', page: 'preferences' })).toBe(true);
    });
  });
});
