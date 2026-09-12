import { lazy } from 'react';

const StagexApp = lazy(() => import('./StageCorePanel'));
export default StagexApp;
export type { StagexPrimaryView } from './StageCorePanel';
