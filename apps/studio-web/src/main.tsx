import {
  tolgee,
  seedAudioAssets,
  initDevToolsFramework,
  NavigationDispatcher,
  useSettingsStore,
  useNavigationStore,
} from '@workspace/livex-core';

// Initialize DevTools in development builds only (compile-time eliminated in production)
if (import.meta.env.DEV) {
  initDevToolsFramework();
}

// Defer non-critical background initialization by 8 seconds to keep critical frames clear
setTimeout(() => {
  void seedAudioAssets();
}, 8000);

import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useState, useEffect } from 'react';
import { TolgeeProvider } from '@tolgee/react';
import App from './App';
import './index.css';

// @ts-ignore
window.NavigationDispatcher = NavigationDispatcher;
// @ts-ignore
window.useSettingsStore = useSettingsStore;
// @ts-ignore
window.useNavigationStore = useNavigationStore;

createRoot(document.getElementById('root')!).render(
  <TolgeeProvider tolgee={tolgee} fallback={null}>
    <App />
  </TolgeeProvider>
);

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
