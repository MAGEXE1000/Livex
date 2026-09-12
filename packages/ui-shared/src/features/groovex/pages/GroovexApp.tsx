import {
  useChordStore,
  useT,
  useBackHandler,
  useNavCollapsed,
  useNavHidden,
  useIsWebDesktop,
  registerDebugProvider,
  unregisterDebugProvider,
  useNavigationStore,
  NavigationDispatcher,
  setNavCollapsed,
  useBottomNavigationStore,
  setNavHidden,
  useSettingsStore,
  useSessionStore,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useGroovexStore, type GroovexView } from '../state/useGroovexStore';
import {
  SHARED_NAV_TRANSITION,
  getSharedNavTransform,
  getSharedNavOpacity,
} from '../../hub/navigation/navStyles';
import WebAppSectionDock from '../../../shared/layout/WebAppSectionDock';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { SONG_CATALOG } from '../services/songCatalog';
import {
  SharedNavigationBar,
  type SharedNavigationItem,
} from '../../hub/navigation/SharedNavigationBar';

const GroovexLibrary = lazy(() => import('../components/GroovexLibrary'));
const GroovexPlayer = lazy(() => import('../components/GroovexPlayer'));
const GroovexPreferences = lazy(() => import('../components/GroovexPreferences'));

const VIEW_ORDER: GroovexView[] = ['library', 'player', 'preferences'];

export default function GroovexApp() {
  const isWebDesktop = useIsWebDesktop();
  const initialGroovexView: GroovexView = (() => {
    const s = useSettingsStore.getState();
    if (!s.settings.restoreLastSession) return s.settings.defaultGroovexView || 'library';
    const saved = useSessionStore.getState().lastSession?.groovexView;
    return saved === 'library' || saved === 'player' || saved === 'preferences'
      ? saved
      : s.settings.defaultGroovexView || 'library';
  })();

  const view = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return last?.app === 'groovex' && last.page && VIEW_ORDER.includes(last.page as GroovexView)
      ? (last.page as GroovexView)
      : initialGroovexView;
  });

  // Persist the active tab on every change so cold-start can resume here.
  useEffect(() => {
    useSessionStore.getState().setLastSession({ groovexView: view });
  }, [view]);
  const activeSongId = useGroovexStore(useShallow((s) => s.activeSongId));
  const [isLargeDesktop, setIsLargeDesktop] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (!isWebDesktop) return;
    const handleResize = () => {
      setIsLargeDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isWebDesktop]);

  const viewRef = useRef(view);
  viewRef.current = view;
  const activeSongIdRef = useRef(activeSongId);
  activeSongIdRef.current = activeSongId;

  useEffect(() => {
    registerDebugProvider({
      id: 'groovex',
      name: 'Groovex App',
      getDebugState: () => ({
        activeSongId: activeSongIdRef.current || 'none',
        currentView: viewRef.current,
        playbackState: activeSongIdRef.current ? 'active' : 'stopped',
        grooveState: useGroovexStore.getState(),
      }),
    });
    return () => {
      unregisterDebugProvider('groovex');
    };
  }, []);

  function navigate(next: GroovexView) {
    NavigationDispatcher.push({ app: 'groovex', page: next });
  }

  function handleBack() {
    NavigationDispatcher.pop();
  }
  const t = useT();
  const theme = useSettingsStore((s) => s.settings.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  useEffect(() => {
    if (isWebDesktop) return;
    setNavHidden(view === 'player');
  }, [view, isWebDesktop]);

  useEffect(() => {}, []);
  const currentSong = SONG_CATALOG.find((s) => s.id === activeSongId);

  return (
    <div
      className="groovex-root"
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-bg)',
        fontFamily: 'var(--font-headline)',
        overflow: 'hidden',
      }}
    >
      {!isWebDesktop && view === 'player' && (
        <SharedFloatingHeader
          title={currentSong?.title || 'Player'}
          subtitle={currentSong?.artist}
          onBack={handleBack}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: isWebDesktop && isLargeDesktop ? 'row' : 'column',
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {isWebDesktop && (
          <WebAppSectionDock
            app="groovex"
            activeSection={view === 'player' ? 'library' : view}
            onChangeSection={navigate}
          />
        )}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            paddingTop: isWebDesktop ? '20px' : '0px',
            paddingBottom: '0px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SharedNavigationContainer activeView={view} viewOrder={VIEW_ORDER}>
            {(viewId) => (
              <Suspense fallback={null}>
                {viewId === 'library' && <GroovexLibrary />}
                {viewId === 'player' && <GroovexPlayer />}
                {viewId === 'preferences' && <GroovexPreferences />}
              </Suspense>
            )}
          </SharedNavigationContainer>
        </div>
      </div>
    </div>
  );
}
