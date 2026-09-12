// shared/index.ts — Shared UI primitives public API

// Design System
export * from './design-system/StudioDesignSystem';
export { ProgressiveBlur } from './design-system/ProgressiveBlur';
export { Toggle as StudioToggle } from './design-system/StudioToggle';

// Icons
export * from './icons/AnimatedIcon';
export * from './icons/bakaiIconLibrary';
export * from './icons/DownloadIcon';

// Layout
export * from './layout/StudioLayoutSystem';
export { default as WebAppSectionDock } from './layout/WebAppSectionDock';

// Loading
export { default as AppSpinner } from './loading/AppSpinner';
export { default as SmartLoading, AppLoadingScreen } from './loading/SmartLoading';
export * from './loading/StudioSkeleton';

// Feedback
export { ErrorBoundary, decodeReactError } from './feedback/ErrorBoundary';

// Progress
export { default as ElasticSlider } from './progress/ElasticSlider';
export { default as StudioProgressBar } from './progress/StudioProgressBar';
export { default as StudioCountUpPercentage } from './progress/StudioCountUpPercentage';

// Typography
export { default as InkThemeToggle } from './typography/InkThemeToggle';
export { default as StudioTitleReveal } from './typography/StudioTitleReveal';
export * from './typography/ScrollFade';
export * from './settings/SettingControls';

// Cards
export { default as GradientBorderCard } from './cards/GradientBorderCard';

// Lottie
export { default as AppLottie } from './lottie/AppLottie';
export { default as EmptyStateLottie } from './lottie/EmptyStateLottie';
export { default as SuccessLottie } from './lottie/SuccessLottie';
export { default as NoResultsLottie } from './lottie/NoResultsLottie';
export { default as MicWavesLottie } from './lottie/MicWavesLottie';
export { default as MusicNotesLottie } from './lottie/MusicNotesLottie';
export { default as LoadingLottie } from './lottie/LoadingLottie';
export { default as VinylLottie } from './lottie/VinylLottie';

// Animata
export { default as AnimatedActionButton } from './animata/container/animated-border-trail';
export { default as StudioSpinner } from './animata/progress/spinner';

// Liquid
export { LiquidSurfaceEngine } from './liquid/LiquidSurfaceEngine';

// Theme


// Placeholder


// UI
export { EncryptedText } from './ui/encrypted-text';

// Virtualization
export * from './virtualization';
