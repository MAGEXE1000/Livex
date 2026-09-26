import { activeOverlaysRegistry } from '../design-system/dialogs';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import {
  useChordStore,
  useIsWebDesktop,
  useStudioPreferences,
  logActivity,
  resetNav,
  setNavHidden,
  setNavLocked,
  BackDispatcher,
  useStatusBar,
  recordNavigation,
  getNavigationEntries,
  NATIVE_VERSION,
  tolgee,
  addLog,
  useBackHandler,
  StartupCoordinator,
  useNavigationStore,
  NavigationDispatcher,
  type ActivePanel,
  navDiagnosticsRegistry,
  useApplicationTransitionStore,
  ThemeTransitionEngine,
  useBottomNavigationStore,
  subscribeSyncStatus,
  syncNow,
  useSettingsStore,
  useSessionStore,
  authRepository,
  EasingPresets,
  type AppKey,
  useDeveloperInspectorStore,
  lockOrientation,
} from '@workspace/livex-core';

import {
  StudioHubSkeleton,
  GroovexAppSkeleton,
  StagexPanelSkeleton,
  DrumEditorSkeleton,
  DrumSongsSkeleton,
  DrumMetronomeSkeleton,
  DrumPreferencesSkeleton,
  ChordexSongsSkeleton,
  ChordexLibrarySkeleton,
  ChordexPreferencesSkeleton,
  ChordexPracticeSkeleton,
  ChordexPanelSkeleton,
  VocalexTakesSkeleton,
  DevToolsSkeleton,
} from '../loading/StudioSkeleton';
import { DeferredSkeleton } from '../loading/SmartLoading';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import { useAnimationSpeed } from '../../shared/animation';
import { SubAppScaffold, ScreenScaffold } from './StudioLayoutSystem';
import { SharedNavigationContainer } from '../../navigation/SharedNavigationContainer';
import { ApplicationTransitionEngine, resetIntroSignal } from '../../shared/animation';
import { Toaster } from '../../components/ui/sonner';

const ALL_PANELS = ['songs', 'library', 'practice', 'preferences'] as const;
const CANONICAL_APP_ORDER = ['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex', 'devtools'] as const;

export interface SharedAppShellProps {
  isAndroid?: boolean;
  isWeb?: boolean;
  wrapProviders?: (children: React.ReactNode) => React.ReactNode;
  renderSidebar?: () => React.ReactNode;
  renderBottomNav?: () => React.ReactNode;
  renderLaunchOverlay?: () => React.ReactNode;

  hubElement: React.ReactNode;
  subApps: {
    devtools?: React.ReactNode;
    groovex: React.ReactNode;
    vocalex: React.ReactNode;
    stagex: React.ReactNode;
    drumex: React.ReactNode;
    chordex: {
      sidebar?: React.ReactNode;
      songs: React.ReactNode;
      practice: React.ReactNode;
      library: React.ReactNode;
      preferences: React.ReactNode;
    };
  };
}

const InspectorRouteTracer = import.meta.env.DEV
  ? lazy(() =>
      import('./InspectorRouteTracer').then((m) => ({ default: m.InspectorRouteTracer }))
    )
  : null;

const AppReadyNotifier = memo(function AppReadyNotifier({
  app,
  onReady,
}: {
  app: AppKey;
  onReady: (app: AppKey) => void;
}) {
  useEffect(() => {
    let active = true;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (active) onReady(app);
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [app, onReady]);
  return null;
});

function FallbackTracker({ app, children }: { app: AppKey; children: React.ReactNode }) {
  useEffect(() => {
    recordNavigation({
      fromApp: 'hub',
      toApp: app,
      activeAppAfterTransition: app,
      transitionLockState: (window as any).studioTransitionActive || false,
      fallbackRendered: true,
    });
  }, [app]);
  return <>{children}</>;
}

function DrumexDynamicSkeleton() {
  const activeTab = useNavigationStore((s) => {
    const lastRoute = s.history[s.history.length - 1];
    if (lastRoute?.app === 'drumex' && lastRoute.page) {
      const page = lastRoute.page;
      if (page === 'metronome') return 'metronome';
      if (page === 'songs' || page === 'beats') return 'songs';
      if (page === 'prefs' || page === 'preferences') return 'prefs';
      if (page === 'patterns') return 'patterns';
    }
    const st = useSettingsStore.getState();
    if (st.settings?.restoreLastSession) {
      const last = useSessionStore.getState().lastSession?.drumexTab;
      if (last) return last;
    }
    return st.settings?.defaultDrumTab || 'songs';
  });

  if (activeTab === 'metronome') return <DrumMetronomeSkeleton />;
  if (activeTab === 'prefs') return <DrumPreferencesSkeleton />;
  if (activeTab === 'patterns') return <DrumEditorSkeleton />;
  return <DrumSongsSkeleton />;
}

function SubAppRenderer({
  app,
  activePanel,
  onReady,
  subApps,
}: {
  app: AppKey;
  activePanel: string;
  onReady: (app: AppKey) => void;
  subApps: SharedAppShellProps['subApps'];
}) {
  switch (app) {
    case 'devtools':
      return subApps.devtools ? (
        <SubAppScaffold appKey="devtools">
          <ErrorBoundary moduleName="DevTools">
            <Suspense fallback={<DeferredSkeleton><DevToolsSkeleton /></DeferredSkeleton>}>
              <AppReadyNotifier app="devtools" onReady={onReady} />
              <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                {subApps.devtools}
              </div>
            </Suspense>
          </ErrorBoundary>
        </SubAppScaffold>
      ) : null;
    case 'groovex':
      return subApps.groovex ? (
        <SubAppScaffold appKey="groovex">
          <ErrorBoundary moduleName="Groovex">
            <Suspense fallback={<DeferredSkeleton><GroovexAppSkeleton /></DeferredSkeleton>}>
              <AppReadyNotifier app="groovex" onReady={onReady} />
              <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                {subApps.groovex}
              </div>
            </Suspense>
          </ErrorBoundary>
        </SubAppScaffold>
      ) : null;
    case 'vocalex':
      return subApps.vocalex ? (
        <SubAppScaffold appKey="vocalex">
          <ErrorBoundary moduleName="Vocalex">
            <Suspense fallback={<DeferredSkeleton><VocalexTakesSkeleton /></DeferredSkeleton>}>
              <AppReadyNotifier app="vocalex" onReady={onReady} />
              <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                {subApps.vocalex}
              </div>
            </Suspense>
          </ErrorBoundary>
        </SubAppScaffold>
      ) : null;
    case 'stagex':
      return subApps.stagex ? (
        <SubAppScaffold appKey="stagex">
          <ErrorBoundary moduleName="Stagex">
            <Suspense fallback={<DeferredSkeleton><StagexPanelSkeleton /></DeferredSkeleton>}>
              <AppReadyNotifier app="stagex" onReady={onReady} />
              <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                {subApps.stagex}
              </div>
            </Suspense>
          </ErrorBoundary>
        </SubAppScaffold>
      ) : null;
    case 'drumex':
      return subApps.drumex ? (
        <SubAppScaffold appKey="drumex">
          <ErrorBoundary moduleName="Drumex">
            <Suspense fallback={<DeferredSkeleton><DrumexDynamicSkeleton /></DeferredSkeleton>}>
              <AppReadyNotifier app="drumex" onReady={onReady} />
              <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                {subApps.drumex}
              </div>
            </Suspense>
          </ErrorBoundary>
        </SubAppScaffold>
      ) : null;
    case 'chordex':
      return subApps.chordex ? (
        <SubAppScaffold appKey="chordex">
          <div
            className="flex flex-col w-full overflow-hidden select-none"
            style={{ position: 'relative', height: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: subApps.chordex.sidebar ? 'row' : 'column',
                flex: 1,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {subApps.chordex.sidebar}
              <div className="flex-1 overflow-hidden relative" style={{ contain: 'strict' }}>
                <ErrorBoundary moduleName="Chordex">
                  <SharedNavigationContainer activeView={activePanel} viewOrder={ALL_PANELS}>
                    {(panel) => {
                      const fallback =
                        panel === 'songs' ? (
                          <ChordexSongsSkeleton />
                        ) : panel === 'library' ? (
                          <ChordexLibrarySkeleton />
                        ) : panel === 'preferences' ? (
                          <ChordexPreferencesSkeleton />
                        ) : (
                          <ChordexPracticeSkeleton />
                        );
                      return (
                        <Suspense fallback={<DeferredSkeleton>{fallback}</DeferredSkeleton>}>
                          <AppReadyNotifier app="chordex" onReady={onReady} />
                          <div className="app-content-reveal" style={{ width: '100%', height: '100%' }}>
                            {panel === 'songs' && subApps.chordex?.songs}
                            {panel === 'practice' && subApps.chordex?.practice}
                            {panel === 'library' && subApps.chordex?.library}
                            {panel === 'preferences' && subApps.chordex?.preferences}
                          </div>
                        </Suspense>
                      );
                    }}
                  </SharedNavigationContainer>
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </SubAppScaffold>
      ) : null;
    default:
      return null;
  }
}

export function SharedAppShell({
  isAndroid,
  isWeb,
  wrapProviders,
  renderSidebar,
  renderBottomNav,
  renderLaunchOverlay,
  hubElement,
  subApps,
}: SharedAppShellProps) {
  const isWebDesktop = useIsWebDesktop();
  const activePanel = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    if (
      last?.app === 'chordex' &&
      last.page === 'chord'
    ) {
      return 'library';
    }
    return last?.app === 'chordex' && last.page ? (last.page as ActivePanel) : 'library';
  });
  const routeApp = useNavigationStore((s) => s.history[s.history.length - 1]?.app ?? 'hub');
  const developerMode = useSettingsStore((state) => state.settings.developerMode);
  const currentTheme = useSettingsStore((state) => state.settings.theme);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const isInspectorEnabled = useDeveloperInspectorStore((s) => s.isEnabled);
  const showRouteTracer = useDeveloperInspectorStore((s) => s.showRouteTracer);
  const speedScale = useAnimationSpeed();

  const [hubRenderKey, setHubRenderKey] = useState(0);
  const [showHub, setShowHub] = useState(true);
  useEffect(() => {
    BackDispatcher.initialize();

    void StartupCoordinator.run(() => {});

    return () => {
      StartupCoordinator.cancel('app_unmounted');
    };
  }, []);

  // Global Orientation Policy: Lock non-stage views to Portrait mode (native mobile only)
  useEffect(() => {
    if (isWebDesktop) return;
    const enforcePortrait = async () => {
      if (routeApp !== 'stagex') {
        await lockOrientation('portrait');
      }
    };
    enforcePortrait();
  }, [routeApp, isWebDesktop]);

  // Sync loop removed

  useEffect(() => {
    document.documentElement.style.setProperty('--motion-speed-scale', String(speedScale));
  }, [speedScale]);

  // Launch transition state machine
  const {
    state: transitionState,
    launchingApp,
    appPreloaded,
    sourceRect,
    requestTransition,
    setAppPreloaded,
  } = useApplicationTransitionStore(
    useShallow((s) => ({
      state: s.state,
      launchingApp: s.launchingApp,
      appPreloaded: s.appPreloaded,
      sourceRect: s.sourceRect,
      requestTransition: s.requestTransition,
      setAppPreloaded: s.setAppPreloaded,
    }))
  );

  const amoledMode = useSettingsStore((state) => state.settings.amoledMode);
  const perAppAmoled = useSettingsStore((state) =>
    launchingApp ? state.settings.perApp?.[launchingApp]?.amoledMode : undefined
  );
  const isTransitionLight =
    currentTheme === 'light' ||
    (currentTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isTransitionAmoled =
    !isTransitionLight && Boolean(perAppAmoled !== undefined ? perAppAmoled : amoledMode);

  const splashVisible = transitionState !== 'IDLE';
  const transitionPreviousAppModeRef = useRef<AppKey | 'hub'>(routeApp || 'hub');
  const transitionActive = useNavigationStore((s) => s.isTransitioning);
  const preloadedAppsRef = useRef<Set<AppKey>>(new Set());

  useEffect(() => {
    if (isWebDesktop) return; // Desktop Web uses instant direct navigation without mobile transition engine
    const appMode = routeApp || 'hub';
    if (appMode !== transitionPreviousAppModeRef.current) {
      resetIntroSignal();
      const ok = requestTransition(appMode as any);
      if (ok) {
        transitionPreviousAppModeRef.current = appMode as any;
        if (appMode === 'hub' || preloadedAppsRef.current.has(appMode as AppKey)) {
          setAppPreloaded(true);
        }
      }
    }
  }, [routeApp, requestTransition, setAppPreloaded, isWebDesktop]);

  const handleAppPreloaded = useCallback(
    (app: AppKey) => {
      preloadedAppsRef.current.add(app);
      if (routeApp !== app) return;
      setAppPreloaded(true);
    },
    [routeApp, setAppPreloaded]
  );

  const appMode = routeApp || 'hub';
  const isSubAppActive = appMode !== 'hub' || launchingApp !== null;
  const stableKey = launchingApp || appMode;

  // Watchdog
  useEffect(() => {
    let watchdogTimer: ReturnType<typeof setTimeout>;
    if (transitionActive) {
      watchdogTimer = setTimeout(() => {
        useNavigationStore.getState().setTransition(null, false);
        updateSettings({ appMode: 'hub' });
      }, 6000);
    }
    return () => clearTimeout(watchdogTimer);
  }, [transitionActive, updateSettings]);

  const content = (
    <div
      className={`app-container app-mode-${appMode}`}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--app-bg)',
        opacity: 1,
        pointerEvents: 'auto',
      }}
    >
      <ErrorBoundary moduleName="RootApp">
        <Suspense fallback={null}>
          <SharedNavigationContainer
            activeView={appMode}
            viewOrder={CANONICAL_APP_ORDER}
            className="w-full h-full"
          >
            {(currentAppKey) => {
              if (currentAppKey === 'hub') {
                return (
                  <div
                    className="app-main-layout"
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    {renderSidebar?.()}
                    {showHub && (
                      <Suspense fallback={<DeferredSkeleton><StudioHubSkeleton /></DeferredSkeleton>}>
                        <div
                          key={hubRenderKey}
                          style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                          {hubElement}
                        </div>
                      </Suspense>
                    )}
                  </div>
                );
              }

              return (
                <div
                  className="sc-subapp-wrapper"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    background: 'var(--app-bg)',
                  }}
                >
                  <SubAppRenderer
                    app={currentAppKey as AppKey}
                    activePanel={activePanel}
                    onReady={handleAppPreloaded}
                    subApps={subApps}
                  />
                </div>
              );
            }}
          </SharedNavigationContainer>
          {renderBottomNav?.()}
        </Suspense>
      </ErrorBoundary>
      <Toaster />
      {renderLaunchOverlay?.()}
      {InspectorRouteTracer && developerMode && isInspectorEnabled && showRouteTracer && (
        <Suspense fallback={null}>
          <InspectorRouteTracer />
        </Suspense>
      )}
    </div>
  );

  return wrapProviders ? <>{wrapProviders(content)}</> : content;
}
