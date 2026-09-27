import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { NavigationDispatcher } from '../NavigationDispatcher';
import { BackDispatcher } from '../BackDispatcher';
import { normalizeAndValidateRoute } from '../validation';
import { APP_SECTIONS } from '../appRegistry';

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
  beforeEach(() => {
    BackDispatcher.resetDebounce();
    useNavigationStore.setState({
      history: [{ app: 'hub', tab: 'home' }],
      activeHandlers: [],
      isTransitioning: false,
      transitionType: null,
    });
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
});
