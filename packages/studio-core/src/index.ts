// Export everything from studio-core
export { useShallow } from 'zustand/react/shallow';
export * from './store/useChordStore';
export * from './store/useDrumStore';
export * from './store/useMetronomeStore';
export * from './store/useSessionStore';
export * from './hooks/useIsWebDesktop';
export * from './hooks/useStudioPreferences';
export * from './hooks/useStudioShortcuts';
export * from './data/chords';
export * from './data/progressions';
export * from './data/songs';
export * from './lib/accountStatus';
export * from './lib/activityLogger';
export * from './lib/adminConfig';
export * from './lib/apkDownloader';
export * from './lib/appVersion';
export * from './lib/assetCache';
export * from './lib/audioContextOptions';
export * from './lib/auth';
export * from './lib/backStack';
export * from './lib/chordAssistant';
export * from './lib/chordDetect';
export * from './lib/drumAudio';
export * from './lib/audio/metronomeAudio';
export * from './lib/drumLibrary';
export * from './lib/drumPlugins';
export * from './lib/firebase';
export * from './lib/guitarAudio';
export * from './lib/i18n';
export * from './lib/i18nSetup';
export * from './lib/liquidGlass';
export * from './lib/nativePrefs';
export * from './lib/navScroll';
export * from './lib/permissions';
export * from './lib/pushNotifications';
export * from './lib/security';
export * from './lib/studioAppNavigationRegistry';
export * from './lib/studioShortcutRegistry';
export * from './lib/supabaseClient';
export * from './lib/sync';
export * from './lib/transpose';
export * from './lib/userAvatar';
export * from './lib/useStatusBar';
export * from './lib/useT';
export * from './lib/utilities';
export * from './lib/instruments/instrumentRegistry';
export * from './lib/instruments/instrumentPlatform';
export * from './lib/instruments/saxophoneEngine';
export * from './lib/audio/saxophoneAudio';
export * from './lib/audio/saxophoneSamples';
export * from './lib/audio/saxophoneSampleAudio';
export * from './lib/syncBackends/index';

export { type Language, default as translations } from './lib/i18n';
export * from './lib/devTools';
export * from './lib/diagnostics/index';
export * from './lib/devtools/developerInspectorStore';
export * from './lib/lyricsService';
export * from './data/authorizedChords';
export * from './lib/chordService';
export * from './lib/updater/diagnostics';
export { deleteLocalApk } from './lib/updater/cacheManager';
export * from './lib/updater/versionLogger';
export * from './lib/updater/stateMachine';
export * from './lib/updater/flightRecorder';
export * from './lib/updater/updaterSimulation';
export * from './lib/startupCoordinator';
export * from './lib/themeEngine';
export * from './lib/preferences/accentUtils';
export * from './lib/performanceProfiler';
export * from './lib/performance/renderScheduler';
export * from './lib/performance/devPerformanceMonitor';
export * from './lib/performance/motionProfiler';

// Navigation Core Foundation (Sprint 9.1)
export * from './lib/navigation/navigationTypes';
export * from './lib/navigation/appRegistry';
export * from './store/useNavigationStore';
export * from './lib/navigation/NavigationDispatcher';
export * from './lib/navigation/NavigationCoordinator';
export * from './lib/navigation/BackDispatcher';
export * from './lib/navigation/GestureDispatcher';
export * from './lib/navigation/TransitionCoordinator';
export * from './lib/navigation/validation';
export * from './lib/navigation/useBackHandler';

export * from './hooks/useAppUpdate';

export * from './lib/updater/pipeline';
export * from './lib/updater/installActions';
export * from './lib/updater/recovery';
export * from './lib/updater/releaseMetadata';

export * from './lib/updater/updateHistory';
export * from './lib/nativePlatform';
export * from './lib/utilities/visualEffects';
export * from './lib/navigation/searchIndex';
export * from './lib/navigation/useApplicationTransitionStore';
export * from './lib/themeTransitionEngine';
export * from './lib/designTokens';
export * from './lib/navigation/useBottomNavigationStore';
export * from './store/useSettingsStore';

// NEW SERVICES AND CONTROLLERS

export * from './repositories/VocalexRepository';

export * from './repositories/GroovexStemRepository';

export * from './repositories/AuthRepository';
export * from './repositories/UserRepository';

// Collaboration Services
export * from './lib/stageCollaboration/Types';
export * from './lib/stageCollaboration/CollaborationService';
export * from './lib/stageCollaboration/CollabDiagnostics';
export * from './lib/search/searchService';
export * from './lib/audio/mediaSessionCoordinator';
