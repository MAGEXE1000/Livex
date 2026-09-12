// Export everything from ui-shared
import { lazy } from 'react';

export { default as AppSpinner } from './shared/loading/AppSpinner';
export { default as ElasticSlider } from './shared/progress/ElasticSlider';
export { default as GradientBorderCard } from './shared/cards/GradientBorderCard';
export { default as SmartLoading, AppLoadingScreen } from './shared/loading/SmartLoading';
export { SharedNavigationContainer } from './navigation/SharedNavigationContainer';
export { StudioPageTransition, UNIFIED_NAV_TRANSITION } from './components/StudioPageTransition';
export { default as StudioCountUpPercentage } from './shared/progress/StudioCountUpPercentage';
export { default as StudioProgressBar } from './shared/progress/StudioProgressBar';
export * from './components/motion';
export { default as InkThemeToggle } from './shared/typography/InkThemeToggle';
export {
  triggerIntroReveal,
  subscribeIntroDone,
} from './shared/animation/introSignal';
export { default as StudioUpdateAuroraBackground } from './features/updater/components/StudioUpdateAuroraBackground';
export { ErrorBoundary } from './shared/feedback/ErrorBoundary';
export { RootAppCrashReportUI } from './shared/feedback/RootAppCrashReportUI';
export * from './features/chordex/icons/ChordexLogo';
export { default as PianoDiagram } from './features/chordex/diagrams/PianoDiagram';
export { default as GuitarDiagram } from './features/chordex/diagrams/GuitarDiagram';
export { default as FourStringDiagram } from './features/chordex/diagrams/FourStringDiagram';
export { default as ChordDiagram } from './features/chordex/diagrams/ChordDiagram';
export * from './shared/loading/StudioSkeleton';
export { LibraryPanel } from './features/chordex';
export { AnimatedIcon } from './shared/icons/AnimatedIcon';
export * from './shared/icons/bakaiIconLibrary';
export { LiquidSurfaceEngine } from './shared/liquid/LiquidSurfaceEngine';

export { SaxophonePracticePanel } from './features/chordex/pages/SaxophonePracticePanel';
export { SaxophoneView } from './features/chordex/components/SaxophoneView';
export { default as SettingsPanel } from './panels/SettingsPanel';
export { default as StudioHubSettingsPanel } from './features/hub/settings/StudioHubSettingsPanel';
export { default as ChordexPreferencesPanel } from './features/chordex/preferences/ChordexPreferencesPanel';
export { default as HubChangelogSection } from './features/hub/settings/HubChangelogSection';
export { SongsPanel } from './features/chordex';
export { DrumEditor } from './features/drumex';
export { GroovexApp } from './features/groovex';
export { VocalexApp } from './features/vocalex';
export { StageCorePanel } from './features/stagex';
export { default as StudioHub } from './features/hub/components/StudioHub';
export * from './features/hub/icons/NavIcons';
export * from './shared/animation';
export { SongPracticeView } from './features/chordex/pages/SongPracticeView';

// Remaining components in ui-shared/components
export { default as AccountCard } from './features/auth/components/AccountCard';
export { default as ApplyToSheet } from './features/chordex/components/ApplyToSheet';
export { default as ChangelogSheet } from './features/chordex/components/ChangelogSheet';
export { default as CustomChordBuilder } from './features/chordex/components/CustomChordBuilder';
export { default as DisabledAccountScreen } from './features/auth/screens/DisabledAccountScreen';
export * from './shared/icons/DownloadIcon';
export { default as PendingDeletionScreen } from './features/auth/screens/PendingDeletionScreen';
export { default as ProgressionGenerator } from './features/chordex/components/ProgressionGenerator';
export * from './shared/typography/ScrollFade';
export * from './shared/settings/SettingControls';
export { default as StudioAuthCard } from './features/auth/components/StudioAuthCard';
export { default as StudioPricingSection } from './features/auth/components/StudioPricingSection';
export { default as StudioUpdateScreen } from './features/updater/components/StudioUpdateScreen';
export { default as ProfileDropdown } from './features/auth/components/ProfileDropdown';

// Animata
export { default as AnimatedActionButton } from './shared/animata/container/animated-border-trail';
export { default as StudioSpinner } from './shared/animata/progress/spinner';

// Motion
export { Loader, type LoaderProps, type LoaderVariant } from './components/motion';

// Lottie
export { default as AppLottie } from './shared/lottie/AppLottie';
export { default as EmptyStateLottie } from './shared/lottie/EmptyStateLottie';
export { default as LoadingLottie } from './shared/lottie/LoadingLottie';
export { default as MicWavesLottie } from './shared/lottie/MicWavesLottie';
export { default as MusicNotesLottie } from './shared/lottie/MusicNotesLottie';
export { default as NoResultsLottie } from './shared/lottie/NoResultsLottie';
export { default as SuccessLottie } from './shared/lottie/SuccessLottie';
export { default as VinylLottie } from './shared/lottie/VinylLottie';

// UI
export * from './shared/ui/encrypted-text';

export { useGroovexStore } from './features/groovex';
export { default as WebAppSectionDock } from './shared/layout/WebAppSectionDock';
export { default as DevToolsDashboard } from './features/devtools/components/DevToolsDashboard';
export const DevToolsApp = lazy(() => import('./features/devtools/DevToolsApp'));

// BottomNav removed (architectural unification)
export const UpdateIndicator = lazy(() => import('./features/updater/components/UpdateIndicator'));

export * from './shared/layout/StudioLayoutSystem';
export { ProgressiveBlur } from './shared/design-system/ProgressiveBlur';
export { StudioHeader } from './shared/layout/StudioHeader';
export { ActionButton } from './shared/design-system/StudioDesignSystem';
export { SharedNavigationBar } from './features/hub/navigation/SharedNavigationBar';
export { BottomNavigationController } from './features/hub/navigation/BottomNavigationController';

export * from './shared/design-system';
export * from './features/devtools/inspector';
export { SharedAppShell, type SharedAppShellProps } from './shared/layout/SharedAppShell';
export * from './components/motion';
export { MorphingModal, type MorphingModalProps } from './components/motion/morphing-modal';
export { useAppReducedMotion } from './hooks/useAppReducedMotion';
