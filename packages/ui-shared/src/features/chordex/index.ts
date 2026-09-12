import { lazy } from 'react';

// Chordex feature – public API barrel with code-split lazy loading
export const LibraryPanel = lazy(() => import('./pages/LibraryPanel'));
export const SongsPanel = lazy(() => import('./pages/SongsPanel'));
