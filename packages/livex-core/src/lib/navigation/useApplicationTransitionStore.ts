import { create } from 'zustand';
import type { AppKey } from '../../store/useSettingsStore';
import { useBottomNavigationStore } from './useBottomNavigationStore.js';
import { MotionProfiler } from '../performance/motionProfiler';

export type TransitionState =
  | 'IDLE'
  | 'PREPARING'
  | 'PRELOADING_DESTINATION'
  | 'LOGO_FORMATION'
  | 'FORMATION_COMPLETE'
  | 'ZOOM_TRANSITION'
  | 'OVERLAY_DISMISS'
  | 'INTERACTION_ENABLE';

interface ApplicationTransitionState {
  state: TransitionState;
  launchingApp: AppKey | null;
  appPreloaded: boolean;
  logoFormed: boolean;
  
  requestTransition: (targetApp: AppKey) => boolean;
  setAppPreloaded: (preloaded: boolean) => void;
  setLogoFormed: (formed: boolean) => void;
  startZoom: () => void;
  completeTransition: () => void;
  reset: () => void;
}

export const useApplicationTransitionStore = create<ApplicationTransitionState>((set, get) => ({
  state: 'IDLE',
  launchingApp: null,
  appPreloaded: false,
  logoFormed: false,

  requestTransition: (targetApp) => {
    let { state, launchingApp } = get();
    
    // Clear bottom navigation switcher state immediately during transition preparation
    const navStore = useBottomNavigationStore.getState();
    navStore.setSwitcherOpen(false);

    if (state !== 'IDLE') {
      if (launchingApp === targetApp) {
        return true;
      }
      get().reset();
      state = 'IDLE';
    }

    const existing = (window as any).__transitionWatchdog;
    if (existing) {
      clearTimeout(existing);
      (window as any).__transitionWatchdog = null;
    }
    
    (window as any).__transitionWatchdog = setTimeout(() => {
      get().reset();
    }, 4500);

    set({
      state: 'PREPARING',
      launchingApp: targetApp,
      appPreloaded: targetApp === 'hub',
      logoFormed: targetApp === 'hub',
    });

    try {
      MotionProfiler.startAppSwitch(launchingApp || 'idle', targetApp);
    } catch (_) {}

    if (targetApp === 'hub') {
      get().startZoom();
    } else {
      // Immediate advance to LOGO_FORMATION on next microtask without artificial delay
      queueMicrotask(() => {
        const current = get();
        if (current.state === 'PREPARING') {
          set({ state: 'LOGO_FORMATION' });
          if (current.appPreloaded && current.logoFormed) {
            get().startZoom();
          }
        }
      });
    }

    return true;
  },

  setAppPreloaded: (preloaded) => {
    const { state, logoFormed } = get();
    if (state === 'IDLE' || state === 'ZOOM_TRANSITION' || state === 'OVERLAY_DISMISS' || state === 'INTERACTION_ENABLE') return;

    set({ appPreloaded: preloaded });

    if (preloaded && logoFormed && (state === 'PREPARING' || state === 'LOGO_FORMATION' || state === 'FORMATION_COMPLETE')) {
      get().startZoom();
    }
  },

  setLogoFormed: (formed) => {
    const { state, appPreloaded } = get();
    if (state === 'IDLE' || state === 'ZOOM_TRANSITION' || state === 'OVERLAY_DISMISS' || state === 'INTERACTION_ENABLE') return;

    set({ logoFormed: formed });

    if (formed) {
      if (appPreloaded && (state === 'PREPARING' || state === 'LOGO_FORMATION' || state === 'FORMATION_COMPLETE')) {
        get().startZoom();
      } else if (state === 'PREPARING' || state === 'LOGO_FORMATION') {
        set({ state: 'FORMATION_COMPLETE' });
      }
    }
  },

  startZoom: () => {
    const { state, appPreloaded } = get();
    if (state === 'ZOOM_TRANSITION' || state === 'OVERLAY_DISMISS') return;
    
    // If destination app is already preloaded, enter zoom transition directly
    if (appPreloaded) {
      set({ state: 'ZOOM_TRANSITION' });
    } else {
      set({ state: 'FORMATION_COMPLETE' });
    }
  },

  completeTransition: () => {
    const { state } = get();
    if (state === 'IDLE' || state === 'OVERLAY_DISMISS' || state === 'INTERACTION_ENABLE') return;
    const existing = (window as any).__transitionWatchdog;
    if (existing) {
      clearTimeout(existing);
      (window as any).__transitionWatchdog = null;
    }

    // Reset bottom navigation switcher states for IDLE
    const navStore = useBottomNavigationStore.getState();
    navStore.setSwitcherOpen(false);

    try {
      MotionProfiler.endAppSwitch(get().launchingApp || undefined);
    } catch (_) {}

    set({
      state: 'IDLE',
      launchingApp: null,
      appPreloaded: false,
      logoFormed: false,
    });
  },

  reset: () => {
    const existing = (window as any).__transitionWatchdog;
    if (existing) {
      clearTimeout(existing);
      (window as any).__transitionWatchdog = null;
    }

    const navStore = useBottomNavigationStore.getState();
    navStore.setSwitcherOpen(false);

    try {
      MotionProfiler.cancelAppSwitch();
    } catch (_) {}

    set({
      state: 'IDLE',
      launchingApp: null,
      appPreloaded: false,
      logoFormed: false,
    });
  },
}));
