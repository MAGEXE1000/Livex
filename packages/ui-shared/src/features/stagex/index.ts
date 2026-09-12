import { lazy } from 'react';

// Stagex feature – public API barrel with code-split lazy loading
export const StageCorePanel = lazy(() => import('./pages/StageCorePanel'));
export const StagexApp = StageCorePanel;
export type { StagexPrimaryView } from './pages/StageCorePanel';
