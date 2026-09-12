import { lazy } from 'react';

// Groovex feature – public API barrel with code-split lazy loading
export const GroovexApp = lazy(() => import('./pages/GroovexApp'));
export { default as GroovexLibrary } from './components/GroovexLibrary';
export { default as GroovexPlayer } from './components/GroovexPlayer';
export { default as GroovexPreferences } from './components/GroovexPreferences';
export * from './state/useGroovexStore';
export * from './services/audioEngine';
export * from './services/songCatalog';
