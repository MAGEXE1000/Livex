import { describe, it, expect } from 'vitest';
import { normalizeAndValidateRoute } from '../validation.js';
import type { NavigationRoute } from '../navigationTypes.js';

/**
 * Pure visibility logic corresponding to BottomNavigationController:
 * isChordexSong: true when in chordex on songs page and an active preset is selected or in editor/form subview.
 */
function isChordexSongRoute(
  route: NavigationRoute,
  activePresetId: string | null = null
): boolean {
  const currentApp = route.app;
  const activeTab = route.tab || route.page || 'home';
  const activePage = route.page || 'main';

  return (
    currentApp === 'chordex' &&
    (activeTab === 'songs' || activePage === 'songs' || route.page === 'songs') &&
    (Boolean(activePresetId) ||
      (route as any).subView === 'editor' ||
      (route as any).subView === 'song' ||
      (route as any).subView === 'form')
  );
}

function computeBottomNavVisible(
  route: NavigationRoute,
  options: {
    activePresetId?: string | null;
    isKeyboardFocused?: boolean;
    hasDOMHiddenIndicator?: boolean;
    storeVisible?: boolean;
    hidden?: boolean;
  } = {}
): boolean {
  const {
    activePresetId = null,
    isKeyboardFocused = false,
    hasDOMHiddenIndicator = false,
    storeVisible = true,
    hidden = false,
  } = options;

  const isDrumexEditor = route.app === 'drumex' && route.subView === 'editor';
  const isDrumexMetronome =
    route.app === 'drumex' &&
    (route.tab === 'metronome' || route.page === 'metronome' || route.subView === 'metronome');
  const isChordexSong = isChordexSongRoute(route, activePresetId);

  return (
    !hidden &&
    !isKeyboardFocused &&
    !hasDOMHiddenIndicator &&
    storeVisible &&
    !isDrumexEditor &&
    !isDrumexMetronome &&
    !isChordexSong
  );
}

describe('Chordex Song Navigation Mode & Bottom Nav Visibility', () => {
  it('hides bottom navigation when entering an individual song (activePresetId present)', () => {
    const songRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'songs',
    });

    expect(isChordexSongRoute(songRoute, 'preset-oi-123')).toBe(true);
    expect(computeBottomNavVisible(songRoute, { activePresetId: 'preset-oi-123' })).toBe(false);
  });

  it('restores bottom navigation when outside an individual song (activePresetId === null)', () => {
    const songsListRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'songs',
    });

    expect(isChordexSongRoute(songsListRoute, null)).toBe(false);
    expect(computeBottomNavVisible(songsListRoute, { activePresetId: null })).toBe(true);
  });

  it('keeps bottom navigation visible when on Chordex Library tab even if activePresetId is set', () => {
    const libraryRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'library',
    });

    expect(isChordexSongRoute(libraryRoute, 'preset-oi-123')).toBe(false);
    expect(computeBottomNavVisible(libraryRoute, { activePresetId: 'preset-oi-123' })).toBe(true);
  });

  it('keeps bottom navigation visible when on Chordex Preferences tab', () => {
    const prefsRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'preferences',
    });

    expect(isChordexSongRoute(prefsRoute, 'preset-oi-123')).toBe(false);
    expect(computeBottomNavVisible(prefsRoute, { activePresetId: 'preset-oi-123' })).toBe(true);
  });

  it('hides bottom navigation when subView is editor, song, or form', () => {
    const editorRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'songs',
      subView: 'editor',
    });
    expect(isChordexSongRoute(editorRoute, null)).toBe(true);
    expect(computeBottomNavVisible(editorRoute)).toBe(false);

    const formRoute = normalizeAndValidateRoute({
      app: 'chordex',
      page: 'songs',
      subView: 'form',
    });
    expect(isChordexSongRoute(formRoute, null)).toBe(true);
    expect(computeBottomNavVisible(formRoute)).toBe(false);
  });

  it('does not affect other apps (Drumex, Stagex, Vocalex, Hub)', () => {
    const drumexBeats = normalizeAndValidateRoute({ app: 'drumex', page: 'beats' });
    expect(isChordexSongRoute(drumexBeats, 'preset-oi-123')).toBe(false);
    expect(computeBottomNavVisible(drumexBeats, { activePresetId: 'preset-oi-123' })).toBe(true);

    const vocalexLab = normalizeAndValidateRoute({ app: 'vocalex', page: 'lab' });
    expect(isChordexSongRoute(vocalexLab, 'preset-oi-123')).toBe(false);
    expect(computeBottomNavVisible(vocalexLab, { activePresetId: 'preset-oi-123' })).toBe(true);

    const hubRoute = normalizeAndValidateRoute({ app: 'hub' });
    expect(isChordexSongRoute(hubRoute, 'preset-oi-123')).toBe(false);
    expect(computeBottomNavVisible(hubRoute, { activePresetId: 'preset-oi-123' })).toBe(true);
  });
});
