import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useIsWebDesktop,
  useNavigationStore,
  useSettingsStore,
  NavigationDispatcher,
  type ActivePanel,
} from '@workspace/livex-core';

import {
  SharedAppShell,
  LivexHub,
  WebAppSectionDock,
  LibraryPanel,
  SongsPanel,
  BottomNavigationController,
  LaunchAnimationEngine,
  triggerIntroReveal,
} from '@workspace/ui-shared';

const SettingsPanel = lazy(() => import('@workspace/ui-shared/src/panels/SettingsPanel'));

const DrumEditor = lazy(() => import('@workspace/ui-shared/src/features/drumex/pages/DrumEditor'));
const GroovexApp = lazy(() => import('@workspace/ui-shared/src/features/groovex/pages/GroovexApp'));
const VocalexApp = lazy(() => import('@workspace/ui-shared/src/features/vocalex/pages/VocalexApp'));
const StageCorePanel = lazy(
  () => import('@workspace/ui-shared/src/features/stagex/pages/StageCorePanel')
);
const DevToolsApp = lazy(() => import('@workspace/ui-shared/src/features/devtools/DevToolsApp'));
const SaxophonePracticePanel = lazy(() =>
  import('@workspace/ui-shared/src/features/chordex/pages/SaxophonePracticePanel').then((m) => ({
    default: m.SaxophonePracticePanel,
  }))
);

import {
  WebSidebarLayout,
  SidebarProvider,
  SidebarInset,
  useSidebar,
  LivexLandingPage,
} from '@workspace/ui-web';

import './index.css';


if (typeof window !== 'undefined') {
  (window as any).NavigationDispatcher = NavigationDispatcher;
}

function ChordexWebSidebar() {
  const activePanel = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return last?.app === 'chordex' && last.page ? (last.page as ActivePanel) : 'library';
  });

  const handleSetActivePanel = useCallback((panel: ActivePanel) => {
    const history = useNavigationStore.getState().history;
    const current = history[history.length - 1];
    if (current?.app === 'chordex' && current.page !== panel) {
      NavigationDispatcher.push({ app: 'chordex', page: panel });
    }
  }, []);

  return (
    <WebAppSectionDock
      app="chordex"
      activeSection={activePanel}
      onChangeSection={handleSetActivePanel as any}
    />
  );
}

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const globalAmoled = useSettingsStore((s) => s.settings.amoledMode);
  const hubAmoled = useSettingsStore((s) => s.settings.perApp?.hub?.amoledMode);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(hubAmoled !== undefined ? hubAmoled : globalAmoled);
  const isDev = import.meta.env.DEV;
  const initialPresetRef = useRef<any>('default');

  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return '/';
    let path = window.location.pathname;

    if (path.startsWith('/drums/songs')) {
      path = path.replace('/drums/songs', '/drumex/beats');
      window.history.replaceState({}, '', path);
    } else if (path.startsWith('/chords')) {
      path = path.replace(/^\/chords/, '/chordex');
      window.history.replaceState({}, '', path);
    } else if (path.startsWith('/drums')) {
      path = path.replace(/^\/drums/, '/drumex');
      window.history.replaceState({}, '', path);
    } else if (path.startsWith('/stage')) {
      path = path.replace(/^\/stage/, '/stagex');
      window.history.replaceState({}, '', path);
    }

    if (
      path === '/app' ||
      path.startsWith('/app/') ||
      path.startsWith('/chordex') ||
      path.startsWith('/drumex') ||
      path.startsWith('/stagex') ||
      path.startsWith('/groovex') ||
      path.startsWith('/vocalex')
    )
      return '/app';
    return '/';
  });

  const [showLaunchOverlay, setShowLaunchOverlay] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (isDev) return false;
    const alreadyShown =
      sessionStorage.getItem('livex-intro-shown') ||
      sessionStorage.getItem('studio-intro-shown');
    return !alreadyShown && route === '/app';
  });

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (
        path === '/app' ||
        path.startsWith('/app/') ||
        path.startsWith('/chordex') ||
        path.startsWith('/drumex') ||
        path.startsWith('/stagex') ||
        path.startsWith('/groovex') ||
        path.startsWith('/vocalex')
      ) {
        setRoute('/app');
      } else {
        setRoute('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial sub-app dispatch if navigating directly to a sub-app URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (path.startsWith('/chordex')) {
      NavigationDispatcher.openApp('chordex');
    } else if (path.startsWith('/drumex')) {
      NavigationDispatcher.openApp('drumex');
    } else if (path.startsWith('/stagex')) {
      NavigationDispatcher.openApp('stagex');
    } else if (path.startsWith('/groovex')) {
      NavigationDispatcher.openApp('groovex');
    } else if (path.startsWith('/vocalex')) {
      NavigationDispatcher.openApp('vocalex');
    }
  }, []);

  useEffect(() => {
    if (isDev) {
      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
        (window as any).__introDone = true;
        window.dispatchEvent(new Event('livex-intro-done'));
        window.dispatchEvent(new Event('studio-intro-done'));
        triggerIntroReveal();
      }
    }
  }, [isDev]);

  useEffect(() => {
    if (route === '/') {
      document.documentElement.classList.add('landing-route');
      document.documentElement.classList.remove('app-route');
    } else {
      document.documentElement.classList.add('app-route');
      document.documentElement.classList.remove('landing-route');

      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }
      (window as any).__introDone = true;
      (window as any).__livexHubReady = true;
      (window as any).__studioHubReady = true;
      window.dispatchEvent(new Event('livex-intro-done'));
      window.dispatchEvent(new Event('studio-intro-done'));
      window.dispatchEvent(new Event('livex-hub-ready'));
      window.dispatchEvent(new Event('studio-hub-ready'));
      triggerIntroReveal();
    }
  }, [route]);

  const isWebDesktop = useIsWebDesktop();

  const subApps = useMemo(
    () => ({
      devtools: <DevToolsApp />,
      groovex: <GroovexApp />,
      vocalex: <VocalexApp />,
      stagex: <StageCorePanel />,
      drumex: <DrumEditor />,
      chordex: {
        sidebar: isWebDesktop ? <ChordexWebSidebar /> : null,
        songs: <SongsPanel />,
        practice: <SaxophonePracticePanel />,
        library: <LibraryPanel />,
        preferences: <SettingsPanel />,
      },
    }),
    [isWebDesktop]
  );

  const handleLaunchOverlayComplete = useCallback(() => {
    setShowLaunchOverlay(false);
  }, []);

  const renderLaunchOverlay = useCallback(() => {
    if (!showLaunchOverlay) return null;
    return (
      <LaunchAnimationEngine
        preset={initialPresetRef.current}
        skipIntro={false}
        onComplete={handleLaunchOverlayComplete}
        isLight={isLight}
        isAmoled={isAmoled}
      />
    );
  }, [showLaunchOverlay, handleLaunchOverlayComplete, isLight, isAmoled]);

  if (route === '/') {
    return <LivexLandingPage navigateTo={navigateTo} />;
  }

  return (
    <SharedAppShell
      isWeb={true}
      wrapProviders={(children) =>
        isWebDesktop ? (
          <SidebarProvider>
            <WebSidebarLayout shouldHideSidebar={false} />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        ) : (
          <>{children}</>
        )
      }
      renderLaunchOverlay={showLaunchOverlay ? renderLaunchOverlay : undefined}
      renderBottomNav={
        !isWebDesktop && !showLaunchOverlay ? () => <BottomNavigationController /> : undefined
      }
      hubElement={<LivexHub />}
      subApps={subApps}
    />
  );
}
