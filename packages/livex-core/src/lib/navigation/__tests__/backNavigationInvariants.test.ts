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
});
