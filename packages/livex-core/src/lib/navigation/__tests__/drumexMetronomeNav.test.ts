import { describe, it, expect } from 'vitest';
import { normalizeAndValidateRoute } from '../validation.js';
import type { NavigationRoute } from '../navigationTypes.js';

/**
 * Pure visibility logic corresponding to BottomNavigationController:
 * isDrumexMetronome: true when in drumex with metronome page/tab/subView active.
 */
function isDrumexMetronomeRoute(route: NavigationRoute): boolean {
  const currentApp = route.app;
  const activeTab = route.tab || route.page || 'home';
  const activePage = route.page || 'main';

  return (
    currentApp === 'drumex' &&
    (activeTab === 'metronome' ||
      activePage === 'metronome' ||
      route.page === 'metronome' ||
      (route as any).tab === 'metronome' ||
      (route as any).subView === 'metronome')
  );
}

function computeBottomNavVisible(
  route: NavigationRoute,
  options: {
    isKeyboardFocused?: boolean;
    hasDOMHiddenIndicator?: boolean;
    storeVisible?: boolean;
  } = {}
): boolean {
  const { isKeyboardFocused = false, hasDOMHiddenIndicator = false, storeVisible = true } = options;

  const isDrumexEditor = route.app === 'drumex' && route.subView === 'editor';
  const isDrumexMetronome = isDrumexMetronomeRoute(route);

  return (
    !isKeyboardFocused &&
    !hasDOMHiddenIndicator &&
    storeVisible &&
    !isDrumexEditor &&
    !isDrumexMetronome
  );
}

describe('Drumex Metronome Navigation Mode & Bottom Nav Visibility', () => {
  it('hides bottom navigation when entering Drumex Metronome tab', () => {
    const metronomeRoute = normalizeAndValidateRoute({
      app: 'drumex',
      page: 'metronome',
    });

    expect(isDrumexMetronomeRoute(metronomeRoute)).toBe(true);
    expect(computeBottomNavVisible(metronomeRoute)).toBe(false);
  });

  it('restores bottom navigation when navigating from Metronome to Beats', () => {
    const beatsRoute = normalizeAndValidateRoute({
      app: 'drumex',
      page: 'beats',
    });

    expect(isDrumexMetronomeRoute(beatsRoute)).toBe(false);
    expect(computeBottomNavVisible(beatsRoute)).toBe(true);
  });

  it('restores bottom navigation when navigating from Metronome to Patterns', () => {
    const patternsRoute = normalizeAndValidateRoute({
      app: 'drumex',
      page: 'patterns',
    });

    expect(isDrumexMetronomeRoute(patternsRoute)).toBe(false);
    expect(computeBottomNavVisible(patternsRoute)).toBe(true);
  });

  it('restores bottom navigation when navigating from Metronome to Preferences', () => {
    const prefsRoute = normalizeAndValidateRoute({
      app: 'drumex',
      page: 'prefs',
    });

    expect(isDrumexMetronomeRoute(prefsRoute)).toBe(false);
    expect(computeBottomNavVisible(prefsRoute)).toBe(true);
  });

  it('hides bottom navigation again when returning to Metronome', () => {
    // Simulating sequence: Beats -> Metronome -> Patterns -> Metronome
    const r1 = normalizeAndValidateRoute({ app: 'drumex', page: 'beats' });
    expect(computeBottomNavVisible(r1)).toBe(true);

    const r2 = normalizeAndValidateRoute({ app: 'drumex', page: 'metronome' });
    expect(computeBottomNavVisible(r2)).toBe(false);

    const r3 = normalizeAndValidateRoute({ app: 'drumex', page: 'patterns' });
    expect(computeBottomNavVisible(r3)).toBe(true);

    const r4 = normalizeAndValidateRoute({ app: 'drumex', page: 'metronome' });
    expect(computeBottomNavVisible(r4)).toBe(false);
  });

  it('preserves normal bottom navigation for other applications', () => {
    const chordexRoute = normalizeAndValidateRoute({ app: 'chordex', page: 'songs' });
    expect(isDrumexMetronomeRoute(chordexRoute)).toBe(false);
    expect(computeBottomNavVisible(chordexRoute)).toBe(true);

    const hubRoute = normalizeAndValidateRoute({ app: 'hub', tab: 'home' });
    expect(isDrumexMetronomeRoute(hubRoute)).toBe(false);
    expect(computeBottomNavVisible(hubRoute)).toBe(true);
  });
});
