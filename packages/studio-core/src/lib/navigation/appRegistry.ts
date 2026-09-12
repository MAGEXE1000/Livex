export interface AppSection {
  id: string;
  labelKey: string;
  icon: string;
}

export const APP_SECTIONS: Record<string, AppSection[]> = {
  chordex: [
    { id: 'songs', labelKey: 'songs', icon: 'audio-lines' },
    { id: 'library', labelKey: 'library', icon: 'gallery-vertical-end' },
    { id: 'preferences', labelKey: 'preferences', icon: 'sliders-horizontal' },
  ],
  drumex: [
    { id: 'metronome', labelKey: 'drumMetronome', icon: 'timer' },
    { id: 'beats', labelKey: 'drumBeats', icon: 'drum' },
    { id: 'patterns', labelKey: 'drumPatterns', icon: 'blocks' },
    { id: 'prefs', labelKey: 'drumPreferences', icon: 'sliders-horizontal' },
  ],
  groovex: [
    { id: 'library', labelKey: 'groovexRhythms', icon: 'layers' },
    { id: 'preferences', labelKey: 'groovexPreferences', icon: 'sliders-horizontal' },
  ],
  vocalex: [
    { id: 'coach', labelKey: 'vocalexCoach', icon: 'graduation-cap' },
    { id: 'takes', labelKey: 'vocalexTakes', icon: 'clap' },
    { id: 'preferences', labelKey: 'vocalexPreferences', icon: 'sliders-horizontal' },
  ],
  stagex: [
    { id: 'Editor', labelKey: 'stagexStage', icon: 'layout-panel-top' },
    { id: 'Setup', labelKey: 'stagexSetup', icon: 'layers' },
    { id: 'Preferences', labelKey: 'stagexPreferences', icon: 'sliders-horizontal' },
  ],
  hub: [
    { id: 'home', labelKey: 'home', icon: 'home' },
    { id: 'profile', labelKey: 'profile', icon: 'user' },
    { id: 'settings', labelKey: 'settings', icon: 'settings' },
  ],
  devtools: [
    { id: 'dashboard', labelKey: 'dashboard', icon: 'layout-dashboard' },
    { id: 'performance', labelKey: 'performance', icon: 'activity' },
    { id: 'inspector', labelKey: 'inspector', icon: 'search' },
  ],
};

export interface AppManifest {
  id: 'hub' | 'chordex' | 'drumex' | 'stagex' | 'groovex' | 'vocalex' | 'devtools';
  labelKey: string;
  icon: string;
  themeColor?: string;
}

export const REGISTERED_APPS: AppManifest[] = [
  { id: 'hub', labelKey: 'Hub', icon: 'home', themeColor: '#ffffff' },
  { id: 'chordex', labelKey: 'Chords', icon: 'audio-lines', themeColor: '#3b82f6' },
  { id: 'drumex', labelKey: 'Drums', icon: 'drum', themeColor: '#f59e0b' },
  { id: 'stagex', labelKey: 'Stage', icon: 'layout-panel-top', themeColor: '#8b5cf6' },
  { id: 'groovex', labelKey: 'GrooveX', icon: 'layers', themeColor: '#ec4899' },
  { id: 'vocalex', labelKey: 'Vocalex', icon: 'mic', themeColor: '#10b981' },
  { id: 'devtools', labelKey: 'DevTools', icon: 'bug', themeColor: '#ef4444' },
];
