import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useIsWebDesktop,
  useT,
  useNavigationStore,
  NavigationDispatcher,
  useSettingsStore,
  useSessionStore,
  resolveAccent,
  registerDebugProvider,
  unregisterDebugProvider,
  resetNav,
  setNavHidden,
  type AppKey,
  useShallow,
} from '@workspace/studio-core';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import WebAppSectionDock from '../../../shared/layout/WebAppSectionDock';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { StageCanvasView } from '../components/StageCanvasView';
import { StageSetupContainer } from '../components/setup/StageSetupContainer';
import { StagePreferencesView } from '../components/preferences/StagePreferencesView';
import { StageExportPdfView } from '../components/export/StageExportPdfView';
import { useStagexStore, type StagexSubView } from '../state/useStagexStore';

export type StagexPrimaryView = 'Editor' | 'Setup' | 'Preferences' | 'Export';
const VIEW_ORDER: readonly StagexPrimaryView[] = ['Editor', 'Setup', 'Preferences', 'Export'];

export default function StagexPanel() {
  const isWebDesktop = useIsWebDesktop();
  const t = useT();
  const tr = t as any;

  const [isLargeDesktop, setIsLargeDesktop] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (!isWebDesktop) return;
    const handleResize = () => setIsLargeDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isWebDesktop]);

  // Session & navigation state
  const initialStageView: StagexPrimaryView = (() => {
    const s = useSettingsStore.getState();
    if (!s.settings.restoreLastSession) return 'Editor';
    const saved = useSessionStore.getState().lastSession?.stagexView as StagexPrimaryView;
    return saved && VIEW_ORDER.includes(saved) ? saved : 'Editor';
  })();

  const currentRoute = useNavigationStore((s) => s.history[s.history.length - 1]) || {
    app: 'stagex',
  };
  const curView: StagexPrimaryView = (() => {
    const page = currentRoute.page as StagexPrimaryView;
    if (page && VIEW_ORDER.includes(page)) return page;
    const pageLower = page?.toLowerCase();
    if (
      pageLower === 'rider' ||
      pageLower === 'setlist' ||
      pageLower === 'gear' ||
      pageLower === 'members'
    ) {
      return 'Setup';
    }
    const subLower = currentRoute.subView?.toLowerCase();
    if (subLower && ['rider', 'setlist', 'gear', 'members'].includes(subLower)) {
      return 'Setup';
    }
    if (currentRoute.app === 'stagex') return initialStageView;
    return 'Editor';
  })();

  // Synchronize route subView into Stagex setup store for direct deep-links
  useEffect(() => {
    const candidate = (currentRoute.subView || currentRoute.page || '').toLowerCase();
    if (['rider', 'setlist', 'gear', 'members'].includes(candidate)) {
      useStagexStore.getState().setSetupSubView(candidate as StagexSubView);
    }
  }, [currentRoute.subView, currentRoute.page]);

  // Persist the active tab so cold-start resumes where the user left off
  useEffect(() => {
    useSessionStore.getState().setLastSession({ stagexView: curView });
    resetNav();
  }, [curView]);

  // Theme & Appearance
  const settings = useSettingsStore(
    useShallow((s) => ({
      perApp: s.settings.perApp,
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      accentColor: s.settings.accentColor,
      dynamicLightStart: s.settings.dynamicLightStart,
      dynamicLightEnd: s.settings.dynamicLightEnd,
    }))
  );
  const appKey = 'stagex' as AppKey;
  const activeVis = settings.perApp?.[appKey] ?? {
    theme: settings.theme ?? ('light' as const),
    amoledMode: settings.amoledMode ?? false,
  };
  const accent = resolveAccent(settings.accentColor);

  const isLight = (() => {
    if (activeVis.theme === 'light') return true;
    if (activeVis.theme === 'system') {
      return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      );
    }
    if (activeVis.theme === 'dynamic') {
      const h = new Date().getHours();
      const lightStart = settings.dynamicLightStart ?? 7;
      const lightEnd = settings.dynamicLightEnd ?? 20;
      return h >= lightStart && h < lightEnd;
    }
    return false;
  })();

  const isAmoled = Boolean(!isLight && (activeVis.amoledMode || settings.amoledMode));
  const stageBg = isLight ? '#ffffff' : isAmoled ? '#000000' : '#0e0e0e';

  // Mobile live mode state
  const [liveMode, setLiveMode] = useState(false);

  // Hide global navigation when live mode is active or when viewing Export
  useEffect(() => {
    if (isWebDesktop) return;
    setNavHidden(liveMode || curView === 'Export');
  }, [liveMode, curView, isWebDesktop]);

  // Register developer diagnostics provider
  const curViewRef = useRef(curView);
  useEffect(() => {
    curViewRef.current = curView;
  }, [curView]);
  useEffect(() => {
    registerDebugProvider({
      id: 'stagex',
      name: 'Stagex App',
      getDebugState: () => ({
        currentView: curViewRef.current,
        liveMode,
        stagexState: useStagexStore.getState(),
      }),
    });
    return () => unregisterDebugProvider('stagex');
  }, [liveMode]);

  // Primary navigation dispatcher
  const navigate = useCallback((next: StagexPrimaryView | string) => {
    const page = next === 'Stage' ? 'Editor' : next;
    NavigationDispatcher.push({
      app: 'stagex',
      page: page as any,
      tab: page as any,
    });
  }, []);

  return (
    <div
      className="stagex-root w-full h-full flex flex-col relative overflow-hidden"
      style={{
        background: 'var(--app-bg)',
        fontFamily: 'var(--font-headline)',
        transition: 'background 180ms ease',
      }}
    >
      <div
        className="w-full h-full flex overflow-hidden"
        style={{
          flexDirection: isWebDesktop && isLargeDesktop ? 'row' : 'column',
        }}
      >
        {/* Desktop Left Section Dock */}
        {isWebDesktop && (
          <WebAppSectionDock
            app="stagex"
            activeSection={
              curView === 'Editor' ? 'Editor' : curView === 'Setup' ? 'Setup' : 'Preferences'
            }
            onChangeSection={(sec) => navigate(sec as StagexPrimaryView)}
          />
        )}

        {/* Primary Content Region */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Canonical SharedNavigationContainer with StudioPageTransition */}
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <SharedNavigationContainer activeView={curView} viewOrder={VIEW_ORDER} variant="tab">
              {(viewId) => (
                <div className="w-full h-full relative overflow-hidden">
                  {/* Setup Native View */}
                  {viewId === 'Setup' && (
                    <div className="w-full h-full">
                      <StageSetupContainer
                        initialSubView={
                          ['rider', 'setlist', 'gear', 'members'].includes(
                            (currentRoute.subView || currentRoute.page || '').toLowerCase()
                          )
                            ? ((
                                currentRoute.subView ||
                                currentRoute.page ||
                                ''
                              ).toLowerCase() as StagexSubView)
                            : undefined
                        }
                        onBackToStage={() => navigate('Editor')}
                        isLight={isLight}
                        isAmoled={isAmoled}
                      />
                    </div>
                  )}

                  {/* Preferences Native View */}
                  {viewId === 'Preferences' && (
                    <div className="w-full h-full">
                      <StagePreferencesView isLight={isLight} isAmoled={isAmoled} />
                    </div>
                  )}

                  {/* Export / Production Document Native View */}
                  {viewId === 'Export' && (
                    <div className="w-full h-full">
                      <StageExportPdfView
                        onBack={() => navigate('Editor')}
                        isLight={isLight}
                        isAmoled={isAmoled}
                      />
                    </div>
                  )}
                </div>
              )}
            </SharedNavigationContainer>

            {/* Persistent Canvas View: kept mounted with display: none when not in Editor to avoid reloads */}
            <div
              className="w-full h-full absolute inset-0"
              style={{
                display: curView === 'Editor' ? 'flex' : 'none',
                zIndex: curView === 'Editor' ? 1 : -1,
                visibility: curView === 'Editor' ? 'visible' : 'hidden',
              }}
            >
              <StageCanvasView
                isLight={isLight}
                isAmoled={isAmoled}
                accentColor={settings.accentColor || 'blue'}
                stageBg={stageBg}
                liveMode={liveMode}
                setLiveMode={setLiveMode}
                onNavigateView={navigate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
