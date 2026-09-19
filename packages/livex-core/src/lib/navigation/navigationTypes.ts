export interface NavigationRoute {
  app: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex' | 'devtools';
  tab?: 'home' | 'settings' | 'profile' | 'help';
  page?: string; // Settings pages, help pages, sub-app panels (e.g. 'library', 'songs')
  subView?: string; // Nested views (e.g. 'dashboard', 'logs', 'practice')
  id?: string; // ID of active preset, chord, or take
  type?: 'screen' | 'modal' | 'sheet' | 'overlay';
}

export type NavigationHistory = NavigationRoute[];

export type TransitionType = 'forward' | 'backward' | 'replace' | 'modal' | 'sheet' | 'overlay';

export type GestureState = 'idle' | 'swiping' | 'cancelled' | 'committed';

export interface NavigationState {
  history: NavigationHistory;
  transitionType: TransitionType | null;
  isTransitioning: boolean;
  gestureState: GestureState;
  predictiveProgress: number;
}
