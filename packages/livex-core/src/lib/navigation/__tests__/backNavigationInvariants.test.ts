import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { NavigationDispatcher } from '../NavigationDispatcher';
import { BackDispatcher } from '../BackDispatcher';
import { isNestedRoute, isRootRouteOnly } from '../validation';
import { getNavHidden, setNavHidden } from '../navScroll';

describe('Android Back-Navigation System & Invariant Suite', () => {
  beforeEach(() => {
    BackDispatcher.resetDebounce();
    useNavigationStore.setState({
      history: [{ app: 'hub', tab: 'home' }],
      activeHandlers: [],
      isTransitioning: false,
      transitionType: null,
    });
  });

  describe('1. Debounce & Re-entrancy Guard (One Swipe = Exactly One Back Action)', () => {
    it('suppresses duplicate back invocations within the debounce window', () => {
      let callCount = 0;
      BackDispatcher.register('modal', () => {
        callCount++;
        return true;
      });

      // First back trigger (e.g. Capacitor backButton event)
      const firstHandled = BackDispatcher.handleBackEvent();
      expect(firstHandled).toBe(true);
      expect(callCount).toBe(1);

      // Rapid secondary back trigger within 20ms (e.g. WebView touch edge swipe listener)
      const secondHandled = BackDispatcher.handleBackEvent();
      expect(secondHandled).toBe(true);
      // Handler was NOT executed a second time
      expect(callCount).toBe(1);

      // Third rapid trigger
      const thirdHandled = BackDispatcher.handleBackEvent();
      expect(thirdHandled).toBe(true);
      expect(callCount).toBe(1);
    });

    it('allows subsequent back navigation after debounce window has elapsed', async () => {
      let callCount = 0;
      BackDispatcher.register('nested', () => {
        callCount++;
        return true;
      });

      BackDispatcher.handleBackEvent();
      expect(callCount).toBe(1);

      // Manually reset debounce (simulating >280ms elapsed)
      BackDispatcher.resetDebounce();

      BackDispatcher.handleBackEvent();
      expect(callCount).toBe(2);
    });
  });

  describe('2. Nested Route Recognition & App Boundary Protection', () => {
    it('accurately identifies nested subroutes across all Livex apps', () => {
      expect(isNestedRoute({ app: 'stagex', page: 'Setup' })).toBe(true);
      expect(isNestedRoute({ app: 'stagex', page: 'Setup', subView: 'rider' })).toBe(true);
      expect(isNestedRoute({ app: 'stagex', page: 'Preferences' })).toBe(true);
      expect(isNestedRoute({ app: 'stagex', page: 'Export' })).toBe(true);
      expect(isNestedRoute({ app: 'stagex', page: 'Editor' })).toBe(false);

      expect(isNestedRoute({ app: 'drumex', page: 'metronome' })).toBe(true);
      expect(isNestedRoute({ app: 'drumex', page: 'beats' })).toBe(false);
      expect(isNestedRoute({ app: 'drumex', page: 'patterns' })).toBe(false);

      expect(isNestedRoute({ app: 'groovex', page: 'player' })).toBe(true);
      expect(isNestedRoute({ app: 'groovex', page: 'library' })).toBe(false);

      expect(isNestedRoute({ app: 'chordex', page: 'chord' })).toBe(true);
      expect(isNestedRoute({ app: 'chordex', page: 'library', subView: 'practice' })).toBe(true);
      expect(isNestedRoute({ app: 'chordex', page: 'library' })).toBe(false);
      expect(isNestedRoute({ app: 'chordex', page: 'songs' })).toBe(false);

      expect(isNestedRoute({ app: 'hub', tab: 'settings' })).toBe(true);
      expect(isNestedRoute({ app: 'hub', tab: 'home' })).toBe(false);
    });

    it('prevents direct escape to Hub when popping from a deep nested route in Drumex', () => {
      // User entered Metronome directly from Hub quick action
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'drumex', page: 'metronome' },
        ],
      });

      expect(NavigationDispatcher.canGoBack()).toBe(true);

      // Popping should return to Drumex root rather than ejecting to Hub
      NavigationDispatcher.pop();

      const current = NavigationDispatcher.currentRoute();
      expect(current.app).toBe('drumex');
      expect(current.page).toBe('beats');
    });

    it('prevents direct escape to Hub when popping from Groovex Player', () => {
      // User entered Player directly from Hub quick action
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'groovex', page: 'player' },
        ],
      });

      expect(NavigationDispatcher.canGoBack()).toBe(true);

      // Popping should return to Groovex library rather than ejecting to Hub
      NavigationDispatcher.pop();

      const current = NavigationDispatcher.currentRoute();
      expect(current.app).toBe('groovex');
      expect(current.page).toBe('library');
    });
  });

  describe('3. Stagex Hierarchical Navigation Invariant', () => {
    it('navigates Subsection -> Setup Hub -> Stage Editor cleanly without skips', () => {
      // User starts on Stage Editor
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'stagex', page: 'Editor' },
        ],
      });

      // User opens Setup Hub
      NavigationDispatcher.push({ app: 'stagex', page: 'Setup' });
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Setup',
      });

      // User opens Rider subsection
      NavigationDispatcher.push({ app: 'stagex', page: 'Setup', subView: 'rider' });
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Setup',
        subView: 'rider',
      });

      // Step 1: Pop from Rider -> Returns to Setup Hub
      NavigationDispatcher.pop();
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Setup',
      });

      // Step 2: Pop from Setup Hub -> Returns to Stage Editor
      NavigationDispatcher.pop();
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Editor',
      });
    });

    it('steps back from Setup Rider to Setup Hub even if entered directly from Hub', () => {
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'stagex', page: 'Setup', subView: 'rider' },
        ],
      });

      expect(NavigationDispatcher.canGoBack()).toBe(true);

      // First pop: returns to Setup Hub (removes subView)
      NavigationDispatcher.pop();
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Setup',
      });

      // Second pop: returns to Stage Editor
      NavigationDispatcher.pop();
      expect(NavigationDispatcher.currentRoute()).toEqual({
        app: 'stagex',
        page: 'Editor',
      });
    });
  });

  describe('4. Navigation State & Scroll Sanitization', () => {
    it('resets nav hidden state upon route change to prevent disappeared bottom navigation', () => {
      setNavHidden(true);
      expect(getNavHidden()).toBe(true);

      // Pushing a new route clears hidden state
      NavigationDispatcher.push({ app: 'chordex', page: 'songs' });
      expect(getNavHidden()).toBe(false);

      // Push nested chord route and set hidden
      NavigationDispatcher.push({ app: 'chordex', page: 'chord', id: 'c-maj' });
      setNavHidden(true);
      expect(getNavHidden()).toBe(true);

      // Popping clears hidden state
      NavigationDispatcher.pop();
      expect(getNavHidden()).toBe(false);
      expect(NavigationDispatcher.currentRoute().page).toBe('songs');
    });
  });

  describe('5. Internal App Boundary Invariant (Back Never Navigates Directly to Hub)', () => {
    const internalApps: Array<'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex'> = [
      'chordex',
      'drumex',
      'stagex',
      'groovex',
      'vocalex',
    ];

    internalApps.forEach((appKey) => {
      it(`consumes back action at the root of ${appKey} and never navigates to hub`, () => {
        NavigationDispatcher.openApp(appKey);
        const initialRoute = NavigationDispatcher.currentRoute();
        expect(initialRoute.app).toBe(appKey);

        // At root of internal app, canGoBack() MUST be false
        expect(NavigationDispatcher.canGoBack()).toBe(false);

        // Invoking back event at root:
        // Must return true (consumed) so native Android does not exit and does not escape to Hub
        const handled = BackDispatcher.handleBackEvent();
        expect(handled).toBe(true);

        // State remains strictly inside the internal app domain
        const routeAfterBack = NavigationDispatcher.currentRoute();
        expect(routeAfterBack.app).toBe(appKey);
        expect(routeAfterBack.app).not.toBe('hub');
      });
    });

    it('returns false at Hub root allowing native exitApp', () => {
      NavigationDispatcher.openApp('hub');
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'home' });
      expect(NavigationDispatcher.canGoBack()).toBe(false);

      const handled = BackDispatcher.handleBackEvent();
      // At Hub root, back is not consumed so Capacitor App can exit cleanly
      expect(handled).toBe(false);
    });

    it('returns to Hub Home when swiping back from Settings root list (Option A1)', () => {
      // User is on Settings list in Hub shell
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'hub', tab: 'settings' },
        ],
      });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'settings' });
      expect(NavigationDispatcher.canGoBack()).toBe(true);

      const handled = BackDispatcher.handleBackEvent();
      expect(handled).toBe(true);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'home' });

      // Second back action on Hub Home returns false (allowing Android app exit)
      BackDispatcher.resetDebounce();
      const secondHandled = BackDispatcher.handleBackEvent();
      expect(secondHandled).toBe(false);
    });

    it('returns to Settings list when swiping back from a nested Settings page', () => {
      // User is on Appearance page in Settings
      useNavigationStore.setState({
        history: [
          { app: 'hub', tab: 'home' },
          { app: 'hub', tab: 'settings' },
          { app: 'hub', tab: 'settings', page: 'appearance' },
        ],
      });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'settings', page: 'appearance' });

      const handled = BackDispatcher.handleBackEvent();
      expect(handled).toBe(true);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'settings' });
    });
  });

  describe('6. App Domain Isolation via openApp() (No Cross-App Stacking)', () => {
    it('isolates navigation history stack when switching between apps', () => {
      // Step 1: Open Hub
      NavigationDispatcher.openApp('hub');
      expect(useNavigationStore.getState().history).toHaveLength(1);
      expect(useNavigationStore.getState().history[0]).toMatchObject({ app: 'hub', tab: 'home' });

      // Step 2: Open Chordex
      NavigationDispatcher.openApp('chordex');
      const histChordex = useNavigationStore.getState().history;
      expect(histChordex).toHaveLength(2);
      expect(histChordex[0]).toMatchObject({ app: 'hub', tab: 'home' });
      expect(histChordex[1]).toMatchObject({ app: 'chordex', page: 'library' });

      // Step 3: Switch to Drumex via App Switcher
      NavigationDispatcher.openApp('drumex');
      // History must NOT contain chordex routes
      const histDrumex = useNavigationStore.getState().history;
      expect(histDrumex).toHaveLength(2);
      expect(histDrumex[0]).toMatchObject({ app: 'hub', tab: 'home' });
      expect(histDrumex[1]).toMatchObject({ app: 'drumex', page: 'beats' });

      // Step 4: Switch to Stagex
      NavigationDispatcher.openApp('stagex');
      const histStagex = useNavigationStore.getState().history;
      expect(histStagex).toHaveLength(2);
      expect(histStagex[0]).toMatchObject({ app: 'hub', tab: 'home' });
      expect(histStagex[1]).toMatchObject({ app: 'stagex', page: 'Editor' });

      // Step 5: Close app to Hub
      NavigationDispatcher.closeApp();
      const histHub = useNavigationStore.getState().history;
      expect(histHub).toHaveLength(1);
      expect(histHub[0]).toMatchObject({ app: 'hub', tab: 'home' });
    });
  });

  describe('7. Unwinding Handlers and Overlay Dismissal (App Switcher & Modals)', () => {
    it('closes App Switcher or overlays on back before changing underlying page route', () => {
      NavigationDispatcher.openApp('chordex');
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');

      let switcherOpen = true;
      // Simulate App Switcher registered with 'overlay' priority
      const unregister = BackDispatcher.register('overlay', () => {
        if (switcherOpen) {
          switcherOpen = false;
          return true;
        }
        return false;
      });

      // User presses back while switcher is open
      const handled = BackDispatcher.handleBackEvent();
      expect(handled).toBe(true);
      expect(switcherOpen).toBe(false);
      // Underlying app route is unaffected
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');

      unregister();
    });

    it('unwinds hierarchical state within an internal app step-by-step', () => {
      NavigationDispatcher.openApp('chordex');

      // State simulation: Song -> Lyrics mode
      let activePreset: string | null = 'song-123';
      let editorViewMode: 'chords' | 'lyrics' = 'lyrics';

      const unregister = BackDispatcher.register('panel', () => {
        if (editorViewMode !== 'chords') {
          editorViewMode = 'chords';
          return true;
        }
        if (activePreset) {
          activePreset = null;
          return true;
        }
        return false;
      });

      // 1st back: from lyrics mode to chords mode
      BackDispatcher.resetDebounce();
      const firstBack = BackDispatcher.handleBackEvent();
      expect(firstBack).toBe(true);
      expect(editorViewMode).toBe('chords');
      expect(activePreset).toBe('song-123');

      // 2nd back: from chords mode to songs list
      BackDispatcher.resetDebounce();
      const secondBack = BackDispatcher.handleBackEvent();
      expect(secondBack).toBe(true);
      expect(activePreset).toBe(null);

      // 3rd back: at songs list root (handler returns false, falls back to domain containment)
      BackDispatcher.resetDebounce();
      const thirdBack = BackDispatcher.handleBackEvent();
      expect(thirdBack).toBe(true); // Consumed by domain containment at Chordex root
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');

      unregister();
    });
  });

  describe('8. Hub Profile Navigation & Nested Sheet Invariants', () => {
    it('returns to Hub Home when swiping back from Hub Profile root and exits app on subsequent back', () => {
      // User navigates: Hub Home -> Profile
      NavigationDispatcher.openApp('hub');
      NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'profile' });
      expect(NavigationDispatcher.canGoBack()).toBe(true);

      // Back 1: Unwinds Profile to Hub Home
      const firstHandled = BackDispatcher.handleBackEvent();
      expect(firstHandled).toBe(true);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'home' });
      expect(NavigationDispatcher.canGoBack()).toBe(false);

      // Back 2: At Hub Home, back is not consumed so native Android can exitApp
      BackDispatcher.resetDebounce();
      const secondHandled = BackDispatcher.handleBackEvent();
      expect(secondHandled).toBe(false);
    });

    it('unwinds active sheet in Profile before popping Profile route', () => {
      // User is in Profile with a sheet/picker open
      NavigationDispatcher.openApp('hub');
      NavigationDispatcher.push({ app: 'hub', tab: 'profile' });

      let sheetOpen = true;
      const unregister = BackDispatcher.register('sheet', () => {
        if (sheetOpen) {
          sheetOpen = false;
          return true;
        }
        return false;
      });

      // Back 1: closes the sheet, remains in Profile
      const firstHandled = BackDispatcher.handleBackEvent();
      expect(firstHandled).toBe(true);
      expect(sheetOpen).toBe(false);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'profile' });

      // Back 2: now that sheet is closed, pops Profile route to Hub Home
      BackDispatcher.resetDebounce();
      const secondHandled = BackDispatcher.handleBackEvent();
      expect(secondHandled).toBe(true);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'home' });

      unregister();
    });

    it('returns to Chordex when swiping back from Profile opened from Chordex', () => {
      // User is in Chordex and opens Profile via TopBar or Collab dialog
      NavigationDispatcher.openApp('chordex');
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');

      NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'profile' });

      // Back 1: pops Profile and returns to Chordex (NOT falling through to Hub Home!)
      const handled = BackDispatcher.handleBackEvent();
      expect(handled).toBe(true);
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');

      // Back 2: At Chordex root, back is consumed by app boundary containment
      BackDispatcher.resetDebounce();
      const secondHandled = BackDispatcher.handleBackEvent();
      expect(secondHandled).toBe(true);
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');
    });

    it('returns to nested Chordex screen when swiping back from Profile opened from Chord detail', () => {
      NavigationDispatcher.openApp('chordex');
      NavigationDispatcher.push({ app: 'chordex', page: 'chord', id: 'c-maj' });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'chordex', page: 'chord', id: 'c-maj' });

      // Open Profile from chord detail screen
      NavigationDispatcher.push({ app: 'hub', tab: 'profile' });
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'hub', tab: 'profile' });

      // Back 1: pops Profile and returns to chord detail
      const back1 = BackDispatcher.handleBackEvent();
      expect(back1).toBe(true);
      expect(NavigationDispatcher.currentRoute()).toEqual({ app: 'chordex', page: 'chord', id: 'c-maj' });

      // Back 2: pops chord detail and returns to chordex root
      BackDispatcher.resetDebounce();
      const back2 = BackDispatcher.handleBackEvent();
      expect(back2).toBe(true);
      expect(NavigationDispatcher.currentRoute().app).toBe('chordex');
      expect(NavigationDispatcher.currentRoute().page).not.toBe('chord');
    });
  });
});


