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

    // In the canonical unified transition architecture, application transitions are driven
    // directly by SharedNavigationContainer via compositor GPU properties.
    // Maintain store state at IDLE to avoid blocking overlays or bottom nav bar stutter.
    set({
      state: 'IDLE',
      launchingApp: null,
      sourceRect: sourceRect ?? null,
      appPreloaded: true,
      logoFormed: true,
    });

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
