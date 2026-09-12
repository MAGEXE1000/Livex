import { lazy } from 'react';

// Vocalex feature – public API barrel with code-split lazy loading
export const VocalexApp = lazy(() => import('./pages/VocalexApp'));
export { default as HarmonizerSheet } from './components/HarmonizerSheet';
export { default as LabPanel } from './components/LabPanel';
export { default as PitchPanel } from './components/PitchPanel';
export { default as PracticePanel } from './components/PracticePanel';
export { default as TakesPanel } from './components/TakesPanel';
export * from './services/exerciseData';
export * from './services/harmonyEngine';
export * from './services/pitchShift';
export * from './services/pitchYin';
export * from './services/practiceDetector';
export * from './services/vocalAnalysis';
export * from './services/vocalSynth';
export * from './services/voiceCoach';
