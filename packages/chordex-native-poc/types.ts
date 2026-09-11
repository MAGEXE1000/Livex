export type ColorTheme = 'light' | 'dark' | 'amoled';

export interface ChordexPreferencesState {
  theme: ColorTheme;
  reducedMotion: boolean;
  leftHanded: boolean;
  showFingerNumbers: boolean;
  showIntervals: boolean;
  amoledCanvas: boolean;
  autoscrollPractice: boolean;
  keepScreenAwake: boolean;
  activeTuning: 'standard' | 'dropD' | 'halfStepDown';
  capoFret: number;
}

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentText: string;
  switchTrackOff: string;
  switchTrackOffBorder: string;
  switchThumbOff: string;
  switchThumbOn: string;
  surfaceOverlay: string;
}

export const THEME_PALETTES: Record<ColorTheme, ThemeColors> = {
  light: {
    background: '#FAFAFA',
    card: '#FFFFFF',
    cardBorder: '#E4E4E7',
    textPrimary: '#18181B',
    textSecondary: '#71717A',
    accent: '#D97706', // Amber 600
    accentText: '#FFFFFF',
    switchTrackOff: '#E4E4E7',
    switchTrackOffBorder: '#D4D4D8',
    switchThumbOff: '#FFFFFF',
    switchThumbOn: '#FFFFFF',
    surfaceOverlay: 'rgba(0, 0, 0, 0.45)',
  },
  dark: {
    background: '#09090B', // Zinc 950
    card: '#18181B', // Zinc 900
    cardBorder: '#27272A', // Zinc 800
    textPrimary: '#F4F4F5',
    textSecondary: '#A1A1AA',
    accent: '#F59E0B', // Amber 500
    accentText: '#000000',
    switchTrackOff: '#27272A',
    switchTrackOffBorder: '#3F3F46',
    switchThumbOff: '#A1A1AA',
    switchThumbOn: '#FFFFFF',
    surfaceOverlay: 'rgba(0, 0, 0, 0.65)',
  },
  amoled: {
    background: '#000000', // True AMOLED
    card: '#0D0D10',
    cardBorder: '#1F1F24',
    textPrimary: '#FFFFFF',
    textSecondary: '#90909A',
    accent: '#FBBF24', // Amber 400
    accentText: '#000000',
    switchTrackOff: '#1A1A1F',
    switchTrackOffBorder: '#2E2E38',
    switchThumbOff: '#71717A',
    switchThumbOn: '#FFFFFF',
    surfaceOverlay: 'rgba(0, 0, 0, 0.85)',
  },
};
