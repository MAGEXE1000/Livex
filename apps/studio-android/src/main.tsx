import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useState, useEffect } from 'react';
import { TolgeeProvider } from '@tolgee/react';
import App from './App';
import {
  tolgee,
  seedAudioAssets,
  NATIVE_VERSION,
  initDevToolsFramework,
  NavigationDispatcher,
  BackDispatcher,
  useSettingsStore,
  useNavigationStore,
  useApplicationTransitionStore,
} from '@workspace/studio-core';
import { Capacitor } from '@capacitor/core';
import './index.css';

// @ts-ignore
window.NavigationDispatcher = NavigationDispatcher;
// @ts-ignore
window.BackDispatcher = BackDispatcher;
// @ts-ignore
window.useSettingsStore = useSettingsStore;
// @ts-ignore
window.useNavigationStore = useNavigationStore;
// @ts-ignore
window.useApplicationTransitionStore = useApplicationTransitionStore;
const LazyEmergencyOverlay = lazy(() => import('./EmergencyDebugOverlay'));

function EmergencyDebugOverlayWrapper() {
  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDebugModeEnabled =
      localStorage.getItem('studio_debug_mode') === 'true' ||
      (window as any).__studio_debug_mode === true;
    const hasUnviewedFailed = localStorage.getItem('studio_failed_navigation_unviewed') === 'true';
    return isDebugModeEnabled || hasUnviewedFailed;
  });

  useEffect(() => {
    const openEmergencyStub = (targetTab?: string) => {
      setShouldRender(true);
      setTimeout(() => {
        if (
          typeof (window as any).__openEmergencyOverlay === 'function' &&
          (window as any).__openEmergencyOverlay !== openEmergencyStub
        ) {
          (window as any).__openEmergencyOverlay(targetTab);
        }
      }, 50);
    };

    (window as any).__openEmergencyOverlay = openEmergencyStub;

    return () => {
      if ((window as any).__openEmergencyOverlay === openEmergencyStub) {
        delete (window as any).__openEmergencyOverlay;
      }
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <LazyEmergencyOverlay />
    </Suspense>
  );
}

// Initialize DevTools
initDevToolsFramework();

// Defer non-critical background initialization by 8 seconds to keep critical frames clear
setTimeout(() => {
  // Removed ensureNotificationPermission

  // Kick off the drum-sample seed in the background.
  void seedAudioAssets();
}, 8000);

const UpdateIndicator = lazy(
  () => import('@workspace/ui-shared/src/features/updater/components/UpdateIndicator')
);

function GlobalOverlays() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <UpdateIndicator accentFrom="#7c3aed" accentTo="#a855f7" />
    </Suspense>
  );
}

function RootAppContainer() {
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    (window as any).__forceRerenderApp = () => {
      setAppKey((prev) => prev + 1);
    };
    return () => {
      delete (window as any).__forceRerenderApp;
    };
  }, []);

  return <App key={appKey} />;
}

// Create the emergency overlay root synchronously directly under document.body before mount
if (typeof document !== 'undefined') {
  let overlayRoot = document.getElementById('livex-emergency-overlay-root');
  if (!overlayRoot) {
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'livex-emergency-overlay-root';
    overlayRoot.style.position = 'fixed';
    overlayRoot.style.inset = '0';
    overlayRoot.style.zIndex = '2147483647';
    overlayRoot.style.isolation = 'isolate';
    overlayRoot.style.pointerEvents = 'none';
    overlayRoot.style.transform = 'translateZ(0)';
    overlayRoot.style.contain = 'none';
    overlayRoot.style.background = 'transparent';
    document.body.appendChild(overlayRoot);
  }
}

// Log React bootstrap start time
if (typeof window !== 'undefined' && (window as any).__bootTimings) {
  (window as any).__bootTimings.reactBootstrapStart = performance.now();
}

// Mount React immediately (native splash screen takes care of hiding visual load transitions)
createRoot(document.getElementById('root')!).render(
  <>
    <RootAppContainer />
    <GlobalOverlays />
    <EmergencyDebugOverlayWrapper />
  </>
);

// Defer cache migration and service worker unregistration by 6 seconds to prevent I/O blocking during startup
setTimeout(() => {
  // Clean up all service workers since they are not supported in native wrappers.
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((reg) => {
          void reg.unregister();
        });
      })
      .catch((err) => {});
  }

  // Clear Web Cache Storage on native platform version change.
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    const LAST_NATIVE_VERSION_KEY = 'studio:lastNativeVersionForCache';
    const lastVersion = localStorage.getItem(LAST_NATIVE_VERSION_KEY);
    if (lastVersion !== NATIVE_VERSION) {
      if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
        caches
          .keys()
          .then((keys) => {
            return Promise.all(keys.map((key) => caches.delete(key)));
          })
          .then(() => {
            localStorage.setItem(LAST_NATIVE_VERSION_KEY, NATIVE_VERSION);
          })
          .catch((err) => {});
      } else {
        localStorage.setItem(LAST_NATIVE_VERSION_KEY, NATIVE_VERSION);
      }
    }
  }
}, 6000);
