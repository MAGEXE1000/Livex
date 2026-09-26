import { create } from 'zustand';
import type { AppKey } from '../../store/useSettingsStore';
import { useBottomNavigationStore } from './useBottomNavigationStore.js';
import { MotionProfiler } from '../performance/motionProfiler';

export interface CardMorphSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

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
  sourceRect: CardMorphSourceRect | null;
  
  requestTransition: (targetApp: AppKey, sourceRect?: CardMorphSourceRect | null) => boolean;
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
  sourceRect: null,

  requestTransition: (targetApp, sourceRect) => {
    // Clear bottom navigation switcher state immediately during transition preparation
    const navStore = useBottomNavigationStore.getState();
    navStore.setSwitcherOpen(false);

    try {
      MotionProfiler.startAppSwitch(get().launchingApp || 'idle', targetApp);
    } catch (_) {}

    // When returning to Hub, no app-entry entrance animation is displayed
    if (targetApp === 'hub') {
      const existing = (window as any).__transitionWatchdog;
      if (existing) {
        clearTimeout(existing);
        (window as any).__transitionWatchdog = null;
      }
      set({
        state: 'IDLE',
        launchingApp: null,
        sourceRect: sourceRect ?? null,
        appPreloaded: true,
        logoFormed: true,
      });
      return true;
    }

    // If already launching the requested target app, do not restart
    if (get().launchingApp === targetApp) {
      return true;
    }

    const existing = (window as any).__transitionWatchdog;
    if (existing) {
      clearTimeout(existing);
      (window as any).__transitionWatchdog = null;
    }

    (window as any).__transitionWatchdog = setTimeout(() => {
      get().completeTransition();
    }, 3000);

    set({
      state: 'PREPARING',
      launchingApp: targetApp,
      sourceRect: sourceRect ?? null,
      appPreloaded: false,
      logoFormed: false,
    });

    return true;
  },

  setAppPreloaded: (preloaded) => {
    set({ appPreloaded: preloaded });
  },

  setLogoFormed: (formed) => {
    set({ logoFormed: formed });
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
      sourceRect: null,
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
      sourceRect: null,
    });
  },
}));
