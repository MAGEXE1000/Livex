import { describe, it, expect, beforeEach } from 'vitest';
import { APP_SECTIONS } from '../appRegistry';
import { useNavigationStore } from '../useNavigationStore';
import { NavigationDispatcher } from '../NavigationDispatcher';

describe('Drumex Navigation Architecture & Pin Navigation Behavior', () => {
  beforeEach(() => {
    // Reset navigation store to clean state
    useNavigationStore.setState({
      activeApp: 'hub',
      activeTab: 'home',
      history: [{ app: 'hub', page: 'home' }],
    });
  });

  describe('1. Bottom Navigation Sections & Registry', () => {
    it('contains exactly 3 primary destinations for Drumex', () => {
      const drumexSections = APP_SECTIONS.drumex;
      expect(drumexSections).toBeDefined();
      expect(drumexSections.length).toBe(3);
    });

    it('has beats, patterns, and prefs as destinations without metronome', () => {
      const sectionIds = APP_SECTIONS.drumex.map((s) => s.id);
      expect(sectionIds).toEqual(['beats', 'patterns', 'prefs']);
      expect(sectionIds).not.toContain('metronome');
    });

    it('uses correct semantic icons: drum, blocks, sliders-horizontal', () => {
      const beats = APP_SECTIONS.drumex.find((s) => s.id === 'beats');
      const patterns = APP_SECTIONS.drumex.find((s) => s.id === 'patterns');
      const prefs = APP_SECTIONS.drumex.find((s) => s.id === 'prefs');

      expect(beats?.icon).toBe('drum');
      expect(patterns?.icon).toBe('blocks');
      expect(prefs?.icon).toBe('sliders-horizontal');
    });
  });

  describe('2. Pin Deep-Linking and Back Dispatcher Consistency', () => {
    it('does not trap the user when entering Drumex via a Pin (root route only)', () => {
      // User clicks a Drumex Pin from outside or boots directly into Drumex Patterns
      useNavigationStore.setState({
        activeApp: 'drumex',
        activeTab: 'patterns',
        history: [{ app: 'drumex', page: 'patterns' }],
      });

      // When there is only 1 route in history, canGoBack should be false per ADR 003
      // so the back handler returns false and lets the system back handle exiting to Hub
      const canBack = NavigationDispatcher.canGoBack();
      expect(canBack).toBe(false);
    });

    it('supports push navigation to Metronome from Patterns and pops back cleanly', () => {
      // User is on Patterns screen
      useNavigationStore.setState({
        activeApp: 'drumex',
        activeTab: 'patterns',
        history: [
          { app: 'hub', page: 'home' },
          { app: 'drumex', page: 'patterns' },
        ],
      });

      // While at Drumex root, in-app canGoBack is false per ADR 003
      expect(NavigationDispatcher.canGoBack()).toBe(false);

      // User taps Metronome pill in header
      NavigationDispatcher.push({ app: 'drumex', page: 'metronome' });

      const stateAfterPush = useNavigationStore.getState();
      expect(stateAfterPush.history[stateAfterPush.history.length - 1]).toEqual({
        app: 'drumex',
        page: 'metronome',
      });

      // Now on Metronome subroute, canGoBack must be true
      expect(NavigationDispatcher.canGoBack()).toBe(true);

      // User taps In-app Back button or triggers Android Back
      NavigationDispatcher.pop();

      const stateAfterPop = useNavigationStore.getState();
      expect(stateAfterPop.history[stateAfterPop.history.length - 1]).toEqual({
        app: 'drumex',
        page: 'patterns',
      });

      // Back at root of Drumex, canGoBack returns to false
      expect(NavigationDispatcher.canGoBack()).toBe(false);
    });

    it('returns to previous meaningful state across beats, patterns, and preferences', () => {
      // 1. Beats -> Metronome -> Back -> Beats
      useNavigationStore.setState({
        activeApp: 'drumex',
        activeTab: 'beats',
        history: [{ app: 'drumex', page: 'beats' }],
      });
      NavigationDispatcher.push({ app: 'drumex', page: 'metronome' });
      expect(useNavigationStore.getState().history.length).toBe(2);
      NavigationDispatcher.pop();
      expect(useNavigationStore.getState().history[useNavigationStore.getState().history.length - 1]).toEqual({
        app: 'drumex',
        page: 'beats',
      });

      // 2. Preferences -> Metronome -> Back -> Preferences
      useNavigationStore.setState({
        activeApp: 'drumex',
        activeTab: 'prefs',
        history: [{ app: 'drumex', page: 'prefs' }],
      });
      NavigationDispatcher.push({ app: 'drumex', page: 'metronome' });
      expect(useNavigationStore.getState().history.length).toBe(2);
      NavigationDispatcher.pop();
      expect(useNavigationStore.getState().history[useNavigationStore.getState().history.length - 1]).toEqual({
        app: 'drumex',
        page: 'prefs',
      });
    });
  });
});
