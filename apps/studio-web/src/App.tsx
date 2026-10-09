import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import {
  WebSidebarLayout,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from '@workspace/ui-web';

import ErrorBoundary from './components/ErrorBoundary';

const LivexLandingPage = lazy(() =>
  import('@workspace/ui-web').then((m) => ({ default: m.LivexLandingPage }))
);
const NotFoundPage = lazy(() =>
  import('@workspace/ui-web').then((m) => ({ default: m.NotFoundPage }))
);
const ErrorFallbackPage = lazy(() =>
  import('@workspace/ui-web').then((m) => ({ default: m.ErrorFallbackPage }))
);
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));

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

import './index.css';

if (typeof window !== 'undefined') {
  (window as any).NavigationDispatcher = NavigationDispatcher;
}

function resolveRoute(rawPath: string): string {
  if (typeof window === 'undefined') return '/';
  let path = rawPath || '/';

  if (path.startsWith('/drums/songs')) {
    path = path.replace('/drums/songs', '/drumex/beats');
  } else if (path.startsWith('/chords')) {
    path = path.replace(/^\/chords/, '/chordex');
  } else if (path.startsWith('/drums')) {
    path = path.replace(/^\/drums/, '/drumex');
  } else if (path.startsWith('/stage')) {
    path = path.replace(/^\/stage/, '/stagex');
  }

  if (
    path === '/app' ||
    path.startsWith('/app/') ||
    path.startsWith('/chordex') ||
    path.startsWith('/drumex') ||
    path.startsWith('/stagex') ||
    path.startsWith('/groovex') ||
    path.startsWith('/vocalex')
  ) {
    return '/app';
  }
  if (path === '/privacy' || path === '/privacy-policy') {
    return '/privacy';
  }
  if (path === '/error-test') {
    return '/error-test';
  }
  if (path === '/' || path === '') {
    return '/';
  }
  return '/404';
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

const RouteLoadingSkeleton = () => (
  <div className="min-h-[100dvh] w-full bg-black text-white flex items-center justify-center p-6">
    <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
  </div>
);

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
    return resolveRoute(window.location.pathname);
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
    setRoute(resolveRoute(path));
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(resolveRoute(window.location.pathname));
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
      document.documentElement.classList.add('landing-route', 'dark', 'amoled');
      document.documentElement.classList.remove('app-route', 'privacy-route', 'error-route', 'light');
    } else if (route === '/privacy') {
      document.documentElement.classList.add('privacy-route');
      document.documentElement.classList.remove('landing-route', 'app-route', 'error-route');

      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }
      (window as any).__introDone = true;
      window.dispatchEvent(new Event('livex-intro-done'));
      window.dispatchEvent(new Event('studio-intro-done'));
      triggerIntroReveal();
    } else if (route === '/404' || route === '/error-test') {
      document.documentElement.classList.add('error-route');
      document.documentElement.classList.remove('landing-route', 'app-route', 'privacy-route');
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark', 'amoled');
      } else {
        document.documentElement.classList.add('dark', 'amoled');
        document.documentElement.classList.remove('light');
      }

      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }
      (window as any).__introDone = true;
      window.dispatchEvent(new Event('livex-intro-done'));
      window.dispatchEvent(new Event('studio-intro-done'));
      triggerIntroReveal();
    } else {
      document.documentElement.classList.add('app-route');
      document.documentElement.classList.remove('landing-route', 'privacy-route', 'error-route');

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

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingSkeleton />}>
        {route === '/' && <LivexLandingPage navigateTo={navigateTo} />}

        {route === '/privacy' && <PrivacyPolicyPage navigateTo={navigateTo} />}

        {route === '/404' && <NotFoundPage navigateTo={navigateTo} />}

        {route === '/error-test' && (
          <ErrorFallbackPage
            error={new Error('Simulated Audio Buffer Underrun: DSP stream interrupted on client worker')}
            onReload={() => navigateTo('/')}
          />
        )}

        {route === '/app' && (
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
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
