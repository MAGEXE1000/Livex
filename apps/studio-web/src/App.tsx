import { lazy, useCallback, useEffect, useState } from 'react';
import {
  useIsWebDesktop,
  useNavigationStore,
  NavigationDispatcher,
  type ActivePanel,
} from '@workspace/livex-core';

import {
  SharedAppShell,
  LivexHub,
  WebAppSectionDock,
  LibraryPanel,
  SongsPanel,
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

function SidebarHoverSync({ hoverShowSidebar }: { hoverShowSidebar: boolean }) {
  const { setOpen } = useSidebar();
  useEffect(() => {
    setOpen(hoverShowSidebar);
  }, [hoverShowSidebar, setOpen]);
  return null;
}

if (typeof window !== 'undefined') {
  (window as any).NavigationDispatcher = NavigationDispatcher;
}

export default function App() {
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
      path.startsWith('/stagex')
    )
      return '/app';
    return '/';
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
        path.startsWith('/stagex')
      ) {
        setRoute('/app');
      } else {
        setRoute('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (route === '/') {
      document.documentElement.classList.add('landing-route');
      document.documentElement.classList.remove('app-route');
    } else {
      document.documentElement.classList.add('app-route');
      document.documentElement.classList.remove('landing-route');

      const intro = document.getElementById('intro');
      if (intro && (window as any).__introReturnedEarly) {
        triggerIntroReveal();
      }
    }
  }, [route]);

  const isWebDesktop = useIsWebDesktop();
  const [hoverShowSidebar, setHoverShowSidebar] = useState(false);
  const isLargeDesktop =
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1300px)').matches;

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

  if (route === '/') {
    return <LivexLandingPage navigateTo={navigateTo} />;
  }

  return (
    <SharedAppShell
      isWeb={true}
      wrapProviders={(children) => (
        <SidebarProvider>
          <SidebarHoverSync hoverShowSidebar={hoverShowSidebar} />
          <div
            onMouseEnter={() => setHoverShowSidebar(true)}
            onMouseLeave={() => setHoverShowSidebar(false)}
            style={{ display: 'flex', height: '100%' }}
          >
            <WebSidebarLayout shouldHideSidebar={isWebDesktop && !hoverShowSidebar} />
          </div>
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      )}
      hubElement={<LivexHub />}
      subApps={{
        devtools: <DevToolsApp />,
        groovex: <GroovexApp />,
        vocalex: <VocalexApp />,
        stagex: <StageCorePanel />,
        drumex: <DrumEditor />,
        chordex: {
          sidebar:
            isWebDesktop && isLargeDesktop ? (
              <WebAppSectionDock
                app="chordex"
                activeSection={activePanel}
                onChangeSection={handleSetActivePanel as any}
              />
            ) : null,
          songs: <SongsPanel />,
          practice: <SaxophonePracticePanel />,
          library: <LibraryPanel />,
          preferences: <SettingsPanel />,
        },
      }}
    />
  );
}
