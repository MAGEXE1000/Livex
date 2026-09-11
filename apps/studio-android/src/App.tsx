import { SharedAppShell } from '@workspace/ui-shared/src/shared/layout/SharedAppShell';
import { lazy, useEffect, useRef, useState } from 'react';
import { tolgee, useSettingsStore, useNavigationStore, NavigationDispatcher } from '@workspace/studio-core';

import { TolgeeProvider } from '@tolgee/react';

import {
  LaunchAnimationEngine,
  BottomNavigationController,
  SharedNavigationBar,
  StudioHub,
  LibraryPanel,
  SettingsPanel,
  SongsPanel,
  triggerIntroReveal,
} from '@workspace/ui-shared';

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

import { Capacitor } from '@capacitor/core';
import { MobileDevicePreviewFrame } from './components/MobileDevicePreviewFrame';
import './index.css';

if (typeof window !== 'undefined') {
  (window as any).__preloadUIModules = () => {
    void import('@workspace/ui-shared');
    void import('@workspace/ui-android');
  };
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
  const isDev = import.meta.env.DEV || !Capacitor.isNativePlatform();
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(!isDev);
  const initialPresetRef = useRef<any>(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'default'
      : 'default'
  );

  const [route, setRoute] = useState('/app');
  const navigateTo = (path: string) => {
    if (path === '/') return; // Never route to landing page on Android
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  useEffect(() => {
    if (isDev) {
      const intro = document.getElementById('intro');
      if (intro) {
        intro.style.display = 'none';
        if (intro.parentNode) intro.parentNode.removeChild(intro);
        (window as any).__introDone = true;
        window.dispatchEvent(new Event('studio-intro-done'));
        triggerIntroReveal();
      }
    }
  }, [isDev]);

  useEffect(() => {
    const handleIntroDone = () => {
      // Preflight checks
    };
    window.addEventListener('studio-intro-done', handleIntroDone);
    return () => window.removeEventListener('studio-intro-done', handleIntroDone);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || typeof window === 'undefined') return;

    const nativeBridge = (window as any).NativeHubBridge;

    const syncStateToNative = () => {
      if (!nativeBridge) return;
      const nav = useNavigationStore.getState();
      const currentRoute = nav.history[nav.history.length - 1];
      const isHub = !currentRoute || currentRoute.app === 'hub';
      const settings = useSettingsStore.getState().settings;

      try {
        nativeBridge.updateHubVisibility(isHub, currentRoute?.app || 'hub');
        nativeBridge.updateTheme(settings.amoledMode ? 'amoled' : settings.theme);
        nativeBridge.updateLanguage(settings.language || 'en');
        nativeBridge.updateUserProfile(settings.hubUserName || 'Musician', '');
      } catch (e) {
        console.warn('NativeHubBridge sync error:', e);
      }
    };

    syncStateToNative();
    const unsubNav = useNavigationStore.subscribe(syncStateToNative);
    const unsubSettings = useSettingsStore.subscribe(syncStateToNative);

    const handleNativeNavigate = (e: any) => {
      const targetApp = e.detail?.app;
      if (targetApp) {
        NavigationDispatcher.push({ app: targetApp });
      }
    };

    const handleNativeTheme = (e: any) => {
      const newTheme = e.detail?.theme;
      if (newTheme === 'amoled') {
        useSettingsStore.getState().updateSettings({ amoledMode: true, theme: 'dark' });
      } else if (newTheme === 'light' || newTheme === 'dark') {
        useSettingsStore.getState().updateSettings({ amoledMode: false, theme: newTheme });
      }
    };

    const handleNativeLanguage = (e: any) => {
      const newLang = e.detail?.lang;
      if (newLang) {
        useSettingsStore.getState().updateSettings({ language: newLang });
      }
    };

    window.addEventListener('native-navigate', handleNativeNavigate);
    window.addEventListener('studio-set-theme', handleNativeTheme);
    window.addEventListener('studio-set-language', handleNativeLanguage);

    return () => {
      unsubNav();
      unsubSettings();
      window.removeEventListener('native-navigate', handleNativeNavigate);
      window.removeEventListener('studio-set-theme', handleNativeTheme);
      window.removeEventListener('studio-set-language', handleNativeLanguage);
    };
  }, []);

  /* Note: safe-area-inset-top is handled by ScreenScaffold */

  const appShell = (
    <SharedAppShell
      isWeb={false}
      wrapProviders={(children) => (
        <TolgeeProvider tolgee={tolgee} fallback={null}>
          {children}
        </TolgeeProvider>
      )}
      renderLaunchOverlay={
        showLaunchOverlay
          ? () => (
              <LaunchAnimationEngine
                preset={initialPresetRef.current}
                skipIntro={false}
                onComplete={() => setShowLaunchOverlay(false)}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            )
          : undefined
      }
      renderBottomNav={!showLaunchOverlay ? () => <BottomNavigationController /> : undefined}
      hubElement={<StudioHub />}
      subApps={{
        devtools: <DevToolsApp />,
        groovex: <GroovexApp />,
        vocalex: <VocalexApp />,
        stagex: <StageCorePanel />,
        drumex: <DrumEditor />,
        chordex: {
          sidebar: null,
          songs: <SongsPanel />,
          practice: <SaxophonePracticePanel />,
          library: <LibraryPanel />,
          preferences: <SettingsPanel />,
        },
      }}
    />
  );

  // In development browser preview (outside native Android), wrap in phone viewport frame
  if (import.meta.env.DEV && !Capacitor.isNativePlatform()) {
    return <MobileDevicePreviewFrame>{appShell}</MobileDevicePreviewFrame>;
  }

  return appShell;
}
