# Feature Map

> **Purpose**: Central index mapping every major feature to its implementation files.  
> **Usage**: When you need to find where a feature is implemented, search this document first.  
> **Last updated**: 2026-07-29

---

## 1. Chordex — Chord Explorer

| Aspect | Files |
|--------|-------|
| **Owner module** | `packages/ui-shared/src/features/chordex/` |
| **Main components** | `features/chordex/` (LibraryPanel, ChordPanel, SongsPanel, SongPracticeView, SaxophonePracticePanel, SaxophoneView, ChordexSettingsPanel) |
| **Chord diagrams** | `components/ChordDiagram.tsx`, `components/GuitarDiagram.tsx`, `components/PianoDiagram.tsx`, `components/FourStringDiagram.tsx` |
| **Stores** | `studio-core/src/store/useChordStore.ts` |
| **Services** | `studio-core/src/lib/chordService.ts`, `studio-core/src/lib/chordDetect.ts`, `studio-core/src/lib/chordAssistant.ts`, `studio-core/src/lib/transpose.ts`, `studio-core/src/lib/lyricsService.ts` |
| **Static data** | `studio-core/src/data/chords.ts`, `studio-core/src/data/progressions.ts`, `studio-core/src/data/progressionsEs.ts`, `studio-core/src/data/songs.ts`, `studio-core/src/data/authorizedChords.ts` |
| **Custom chord builder** | `ui-shared/src/components/CustomChordBuilder.tsx` |
| **Docs** | `docs/architecture/chordex.md` |

---

## 2. Drumex — Drum Machine

| Aspect | Files |
|--------|-------|
| **Owner module** | `packages/ui-shared/src/features/drumex/` |
| **Main components** | `features/drumex/` (DrumEditor, DrumPrefsPanel) |
| **Audio engine** | `studio-core/src/lib/drumAudio.ts` (re-export shim → actual engine) |
| **Stores** | `studio-core/src/store/useDrumStore.ts` |
| **Pattern library** | `studio-core/src/lib/drumLibrary.ts` |
| **Plugin registry** | `studio-core/src/lib/drumPlugins.ts` |
| **Asset cache** | `studio-core/src/lib/assetCache.ts` |
| **Audio context** | `studio-core/src/lib/audioContextOptions.ts` |
| **Docs** | `docs/architecture/drumex.md` |

---

## 3. Stagex — Stage Plot Editor

| Aspect | Files |
|--------|-------|
| **Owner module** | `packages/ui-shared/src/features/stagex/` |
| **Shared panel** | `ui-shared/src/components/StageCorePanel.tsx` (re-export shim) |
| **Android override** | `ui-android/src/components/StageCorePanel.tsx` |
| **Iframe content** | `apps/studio-android/public/stage-core/` (app.js, features.js, app.css) |
| **Docs** | `docs/architecture/stagex.md` |

---

## 4. Groovex — Stem Player

| Aspect | Files |
|--------|-------|
| **Owner module** | `packages/ui-shared/src/features/groovex/` |
| **Main components** | `features/groovex/` (GroovexApp, GroovexLibrary, GroovexPlayer, GroovexPreferences) |
| **Audio engine** | `features/groovex/audioEngine.ts` |
| **Song catalog** | `features/groovex/songCatalog.ts` |
| **Stem cache** | `features/groovex/stemCache.ts` |
| **Store** | `features/groovex/useGroovexStore.ts` |
| **Repository** | `studio-core/src/repositories/GroovexStemRepository.ts` |
| **Docs** | `docs/architecture/groovex.md` |

---

## 5. Vocalex — Vocal Training

| Aspect | Files |
|--------|-------|
| **Owner module** | `packages/ui-shared/src/features/vocalex/` |
| **Main components** | `features/vocalex/` (VocalexApp, PitchPanel, LabPanel, PracticePanel, TakesPanel, HarmonizerSheet) |
| **Audio engines** | `features/vocalex/vocalAnalysis.ts`, `features/vocalex/harmonyEngine.ts`, `features/vocalex/vocalSynth.ts`, `features/vocalex/pitchShift.ts`, `features/vocalex/pitchYin.ts` |
| **Practice system** | `features/vocalex/practiceDetector.ts`, `features/vocalex/exerciseData.ts`, `features/vocalex/voiceCoach.ts` |
| **Repository** | `studio-core/src/repositories/VocalexRepository.ts` |
| **Docs** | `docs/architecture/vocalex.md` |

---

## 6. Navigation System

| Aspect | Files |
|--------|-------|
| **Core logic** | `studio-core/src/lib/navigation/` |
| **Primary API** | `navigation/NavigationDispatcher.ts` — `push()`, `pop()`, `replace()`, `popTo()`, `reset()` |
| **Route types** | `navigation/navigationTypes.ts` — `NavigationRoute`, `TransitionType`, `GestureState` |
| **Store** | `navigation/useNavigationStore.ts` |
| **Back handling** | `navigation/BackDispatcher.ts`, `navigation/useBackHandler.ts` |
| **Gestures** | `navigation/GestureDispatcher.ts` |
| **Transitions** | `navigation/TransitionCoordinator.ts` |
| **Route resolution** | `navigation/NavigationCoordinator.ts` |
| **Validation** | `navigation/validation.ts` |
| **App registry** | `navigation/appRegistry.ts` — `APP_SECTIONS` |
| **Search index** | `navigation/searchIndex.ts` |
| **Transition store** | `navigation/useApplicationTransitionStore.ts` |
| **Scroll-hide** | `navigation/navScroll.ts` |
| **Docs** | `docs/architecture/navigation.md` |

---

## 7. Bottom Navigation Bar

| Aspect | Files |
|--------|-------|
| **Navigation bar** | `ui-shared/src/navigation/SharedNavigationBar.tsx` |
| **Controller** | `ui-shared/src/navigation/BottomNavigationController.tsx` |
| **Liquid Glass effect** | `ui-shared/src/navigation/LiquidBottomNav.tsx`, `studio-core/src/lib/liquidGlass.ts`, `studio-core/src/lib/useLiquidGlassNav.ts` |
| **Scroll-hide engine** | `studio-core/src/lib/navigation/navScroll.ts` |
| **Bottom nav store** | `studio-core/src/lib/navigation/useBottomNavigationStore.ts` |
| **Animated icons** | `ui-shared/src/components/icons/AnimatedIcon.tsx`, `ui-shared/src/components/icons/bakaiIconLibrary.ts` |
| **Nav styles** | `ui-shared/src/components/navStyles.ts` |
| **Docs** | `docs/architecture/bottom-navigation.md` |

---

## 8. Theme Engine

| Aspect | Files |
|--------|-------|
| **Token applicator** | `studio-core/src/lib/themeEngine.ts` (re-export shim) |
| **Transition engine** | `studio-core/src/lib/themeTransitionEngine.ts` |
| **Design tokens** | `studio-core/src/lib/designTokens.ts` |
| **Liquid Glass** | `studio-core/src/lib/liquidGlass.ts` |
| **Ink theme overlay** | `ui-shared/src/components/feature/InkThemeOverlay.tsx` |
| **Liquid surface** | `ui-shared/src/components/liquid/LiquidSurfaceEngine.tsx` |
| **Theme toggler** | `ui-shared/src/components/StudioThemeToggler.tsx` |
| **Settings** | stored in `useChordStore.ts` (`settings.theme`, `settings.accentColor`, `settings.amoled`) |
| **Docs** | `docs/architecture/theme-engine.md` |

---

## 9. Cloud Sync Engine

| Aspect | Files |
|--------|-------|
| **Orchestrator** | `studio-core/src/lib/sync.ts` (re-export shim → actual sync module) |
| **Sync internals** | `studio-core/src/lib/sync/` |
| **Backend providers** | `studio-core/src/lib/syncBackends/` (Firebase, Supabase) |
| **Sync types** | `studio-core/src/lib/sync.types.ts` |
| **Sync engine** | `studio-core/src/lib/syncEngine.ts` |
| **Auth binding** | `studio-core/src/lib/auth.ts` (attaches/detaches sync on sign-in/sign-out) |
| **Docs** | `docs/architecture/sync-engine.md` |

---

## 10. OTA Updater

| Aspect | Files |
|--------|-------|
| **Pipeline** | `studio-core/src/lib/updater/pipeline.ts` |
| **State machine** | `studio-core/src/lib/updater/stateMachine.ts` |
| **Download** | `studio-core/src/lib/updater/downloadManager.ts` |
| **Integrity** | `studio-core/src/lib/updater/integrityVerification.ts` |
| **Installer** | `studio-core/src/lib/updater/installer.ts` |
| **Eligibility** | `studio-core/src/lib/updater/eligibilityVerification.ts` |
| **Recovery** | `studio-core/src/lib/updater/recovery.ts` |
| **Diagnostics** | `studio-core/src/lib/updater/diagnostics.ts` |
| **Cache** | `studio-core/src/lib/updater/cacheManager.ts` |
| **Version comparison** | `studio-core/src/lib/updater/versionComparison.ts` |
| **Release metadata** | `studio-core/src/lib/updater/releaseMetadata.ts` |
| **Flight recorder** | `studio-core/src/lib/updater/flightRecorder.ts` |
| **Simulation** | `studio-core/src/lib/updater/updaterSimulation.ts` |
| **UI — banner** | `ui-shared/src/components/UpdateIndicator.tsx` |
| **UI — screen** | `ui-shared/src/components/StudioUpdateScreen.tsx` |
| **UI — diagnostics** | `ui-shared/src/components/UpdateDiagnosticsSheet.tsx` |
| **Version SoT** | `studio-core/src/lib/appVersion.ts` (re-export shim → startup/) |
| **Docs** | `docs/architecture/updater.md` |

---

## 11. Authentication

| Aspect | Files |
|--------|-------|
| **Auth wrapper** | `studio-core/src/lib/auth.ts` (re-export shim) |
| **Firebase SDK** | `studio-core/src/lib/firebase.ts` (re-export shim) |
| **Account lifecycle** | `studio-core/src/lib/accountStatus.ts` (re-export shim) |
| **Permissions** | `studio-core/src/lib/permissions.ts` (re-export shim) |
| **Security** | `studio-core/src/lib/security.ts` (re-export shim → utilities/) |
| **Supabase client** | `studio-core/src/lib/supabaseClient.ts` (re-export shim) |
| **Repository** | `studio-core/src/repositories/AuthRepository.ts`, `studio-core/src/repositories/UserRepository.ts` |
| **UI — auth card** | `ui-shared/src/components/StudioAuthCard.tsx` |
| **UI — account** | `ui-shared/src/components/AccountCard.tsx` |
| **UI — disabled** | `ui-shared/src/components/DisabledAccountScreen.tsx` |
| **UI — pending deletion** | `ui-shared/src/components/PendingDeletionScreen.tsx` |
| **Docs** | `docs/auth.md`, `docs/architecture/firebase.md` |

---

## 12. Settings / Preferences

| Aspect | Files |
|--------|-------|
| **Settings panel** | `ui-shared/src/panels/SettingsPanel.tsx` |
| **Hub settings** | `ui-shared/src/features/hub/StudioHubSettingsPanel.tsx` |
| **Chordex settings** | `ui-shared/src/features/chordex/ChordexSettingsPanel.tsx` |
| **Settings store** | `studio-core/src/store/useSettingsStore.ts` |
| **Preferences hooks** | `studio-core/src/hooks/useStudioPreferences.ts` |
| **Persistence** | `studio-core/src/lib/security.ts` → `secureReadLocal` / `secureWriteLocal` |
| **Native prefs** | `studio-core/src/lib/nativePrefs.ts` (Capacitor Preferences) |
| **Setting controls** | `ui-shared/src/components/SettingControls.tsx` |

---

## 13. Startup Sequence

| Aspect | Files |
|--------|-------|
| **Coordinator** | `studio-core/src/lib/startupCoordinator.ts` (re-export shim → startup/) |
| **Startup internals** | `studio-core/src/lib/startup/` |
| **App entry (web)** | `apps/studio-web/src/App.tsx` |
| **App entry (android)** | `apps/studio-android/src/App.tsx` |
| **Loading screen** | `ui-shared/src/components/SmartLoading.tsx` |
| **Launch animations** | `ui-shared/src/components/launch/LaunchAnimationEngine.tsx` |
| **App transitions** | `ui-shared/src/components/launch/ApplicationTransitionEngine.tsx` |

---

## 14. Localization (i18n)

| Aspect | Files |
|--------|-------|
| **Language definitions** | `studio-core/src/lib/i18n.ts` (re-export shim) |
| **i18next setup** | `studio-core/src/lib/i18nSetup.ts` (re-export shim) |
| **i18n internals** | `studio-core/src/lib/i18n-lib/` |
| **Translation hook** | `studio-core/src/lib/useT.ts` |
| **Locale files** | `studio-core/src/i18n/` (en.json, es.json, etc.) |

---

## 15. Audio System

| Aspect | Files |
|--------|-------|
| **Drum sampler** | `studio-core/src/lib/drumAudio.ts` (re-export shim) |
| **Guitar synthesis** | `studio-core/src/lib/guitarAudio.ts` (re-export shim) |
| **Saxophone engine** | `studio-core/src/lib/instruments/saxophoneEngine.ts`, `studio-core/src/lib/audio/saxophoneAudio.ts` |
| **Instrument registry** | `studio-core/src/lib/instruments/instrumentRegistry.ts` |
| **Audio context** | `studio-core/src/lib/audioContextOptions.ts` (re-export shim) |
| **Asset cache** | `studio-core/src/lib/assetCache.ts` (re-export shim) |
| **Groovex audio** | `ui-shared/src/features/groovex/audioEngine.ts` |
| **Vocalex audio** | `ui-shared/src/features/vocalex/vocalSynth.ts`, `features/vocalex/pitchShift.ts` |

---

## 16. Dev Tools & Diagnostics

| Aspect | Files |
|--------|-------|
| **Dashboard** | `ui-shared/src/components/DevToolsDashboard.tsx` |
| **Inspector** | `ui-shared/src/components/devtools/inspector/` |
| **Log registry** | `studio-core/src/lib/devTools.ts` (re-export shim → devtools/) |
| **Inspector store** | `studio-core/src/lib/devtools/developerInspectorStore.ts` |
| **Performance profiler** | `studio-core/src/lib/performanceProfiler.ts` (re-export shim) |
| **Render scheduler** | `studio-core/src/lib/performance/renderScheduler.ts` |
| **Dev perf monitor** | `studio-core/src/lib/performance/devPerformanceMonitor.ts` |
| **Activity logger** | `studio-core/src/lib/activityLogger.ts` (re-export shim) |
| **Diagnostics** | `studio-core/src/lib/diagnostics/` |
