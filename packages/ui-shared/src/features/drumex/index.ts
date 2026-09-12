import { lazy } from 'react';

// Drumex feature – public API barrel with code-split lazy loading
export const DrumEditor = lazy(() => import('./pages/DrumEditor'));
export { default as DrumPrefsPanel } from './pages/DrumPrefsPanel';
export { MetronomePanel } from './components/MetronomePanel';
