import {
  resolveAccent,
  type AppKey,
  useT,
  resetNav,
  useIsWebDesktop,
  registerDebugProvider,
  unregisterDebugProvider,
  useNavigationStore,
  NavigationDispatcher,
  useScrollHide,
  useSettingsStore,
  vocalexRepository,
  useSessionStore,
} from '@workspace/studio-core';
import { useShallow } from 'zustand/react/shallow';
import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';

import WebAppSectionDock from '../../../shared/layout/WebAppSectionDock';

const CoachPanelLazy = lazy(() =>
  import('../components/CoachPanel').then((m) => ({ default: m.default || m }))
);
const TakesPanelLazy = lazy(() =>
  import('../components/TakesPanel').then((m) => ({ default: m.default || m }))
);
const PreferencesPanelLazy = lazy(() =>
  import('../components/VocalexPreferencesPanel').then((m) => ({ default: m.default || m }))
);

type VocalexPanel = 'coach' | 'takes' | 'preferences';

const NAV_ORDER: VocalexPanel[] = ['coach', 'takes', 'preferences'];

export default function VocalexApp() {
  const isWebDesktop = useIsWebDesktop();
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
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      perApp: s.settings.perApp,
      theme: s.settings.theme,
      dynamicLightStart: s.settings.dynamicLightStart,
      dynamicLightEnd: s.settings.dynamicLightEnd,
      amoledMode: s.settings.amoledMode,
      animationSpeed: s.settings.animationSpeed,
    }))
  );
  const t = useT();
  const vt = t.vocalex as any;
  // Restore last-visited Vocalex tab so a refresh / app-switch lands the
  // user where they left off. Falls back to defaultVocalexTab.
  const initialVocalexTab: VocalexPanel = (() => {
    const s = useSettingsStore.getState();
    if (!s.settings.restoreLastSession) {
      const def = s.settings.defaultVocalexTab as any;
      return def === 'takes' || def === 'preferences' ? def : 'coach';
    }
    const saved = useSessionStore.getState().lastSession?.vocalexTab as any;
    return saved === 'takes' || saved === 'preferences' ? (saved as VocalexPanel) : 'coach';
  })();
  const activeTab = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return last?.app === 'vocalex' && last.page && NAV_ORDER.includes(last.page as VocalexPanel)
      ? (last.page as VocalexPanel)
      : initialVocalexTab;
  });

  // Persist the active tab on every change so cold-start can resume here.
  useEffect(() => {
    useSessionStore.getState().setLastSession({ vocalexTab: activeTab });
    resetNav();
  }, [activeTab]);

  const appKey = 'vocalex' as AppKey;
  const accent = resolveAccent(settings.accentColor);
  const isLight = (() => {
    const vocalexTheme = settings.perApp?.[appKey]?.theme ?? settings.theme ?? 'dark';
    if (vocalexTheme === 'light') return true;
    if (vocalexTheme === 'system') {
      return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      );
    }
    if (vocalexTheme === 'dynamic') {
      const h = new Date().getHours();
      const lightStart = settings.dynamicLightStart ?? 7;
      const lightEnd = settings.dynamicLightEnd ?? 20;
      return h >= lightStart && h < lightEnd;
    }
    return false;
  })();
  const isAmoled = !isLight && Boolean(settings.amoledMode || settings.perApp?.[appKey]?.amoledMode);
  const activeVis = {
    theme: settings.perApp?.[appKey]?.theme ?? settings.theme ?? 'dark',
    amoledMode: isAmoled,
  };

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const isLightRef = useRef(isLight);
  isLightRef.current = isLight;

  useEffect(() => {
    registerDebugProvider({
      id: 'vocalex',
      name: 'Vocalex App',
      getDebugState: () => ({
        activeTab: activeTabRef.current,
        isLight: isLightRef.current,
      }),
    });
    return () => {
      unregisterDebugProvider('vocalex');
    };
  }, []);

  const pitchScrollRef = useRef<HTMLDivElement | null>(null);
  const takesScrollRef = useRef<HTMLDivElement | null>(null);
  const preferencesScrollRef = useRef<HTMLDivElement | null>(null);

  const activeScrollRef =
    activeTab === 'coach'
      ? pitchScrollRef
      : activeTab === 'takes'
        ? takesScrollRef
        : preferencesScrollRef;

  useScrollHide(activeScrollRef, activeTab);

  useEffect(() => {}, []);

  const amoledBg = isLight
    ? 'rgba(255, 255, 255, 0.40)'
    : isAmoled
      ? 'rgba(0, 0, 0, 0.95)'
      : 'rgba(26,26,30,0.72)';

  const durMs =
    settings.animationSpeed === 'fast' ? 200 : settings.animationSpeed === 'reduced' ? 0 : 280;

  return (
    <div
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          background: 'var(--app-bg)',
          '--panel-dur': `${durMs}ms`,
          '--panel-exit-dur': `${Math.round(durMs * 0.65)}ms`,
        } as React.CSSProperties
      }
    >
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
            app="vocalex"
            activeSection={activeTab}
            onChangeSection={(p) => NavigationDispatcher.push({ app: 'vocalex', page: p })}
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
          <SharedNavigationContainer activeView={activeTab} viewOrder={NAV_ORDER}>
            {(viewId) => {
              const scrollRef =
                viewId === 'coach'
                  ? pitchScrollRef
                  : viewId === 'takes'
                    ? takesScrollRef
                    : preferencesScrollRef;
              return (
                <div
                  ref={scrollRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: activeTab === viewId ? 'auto' : 'none',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: '0px',
                  }}
                >
                  {viewId === 'coach' && (
                    <Suspense fallback={null}>
                      <CoachPanelLazy active={activeTab === 'coach'} />
                    </Suspense>
                  )}
                  {viewId === 'takes' && (
                    <Suspense fallback={null}>
                      <TakesPanelLazy />
                    </Suspense>
                  )}
                  {viewId === 'preferences' && (
                    <Suspense fallback={null}>
                      <PreferencesPanelLazy />
                    </Suspense>
                  )}
                </div>
              );
            }}
          </SharedNavigationContainer>
        </div>
      </div>
    </div>
  );
}
