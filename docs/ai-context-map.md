# AI Context Map — Chordex Studio / Livex Android

This map guides AI agents and developers on which files to inspect based on the problem scope, highlighting fragile and risky areas to prevent regressions and keep context window usage low.

---

## 1. Feature Map & Source File Locations

| Feature Area                    | Description                                                                                            | Primary Files to Inspect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Files to Avoid (Unless Scope-Relevant)                                                                |
| :------------------------------ | :----------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Startup / Boot Performance**  | Initial planets orbit animation, React mount deferrals, loading skeletons                              | [index.html](../apps/studio-android/index.html)<br>[main.tsx](../apps/studio-android/src/main.tsx)<br>[StudioHub.tsx](../packages/ui-shared/src/components/StudioHub.tsx)<br>[App.tsx](../apps/studio-android/src/App.tsx)                                                                             | Avoid heavy sub-app panels like `DrumEditor.tsx` or `SongsPanel.tsx`.                                 |
| **Stagex Editor UI & Gestures** | Stage plot, touch selection boundaries, history bottom sheet, and back handler gestures                | [StageCorePanel.tsx](../packages/ui-android/src/components/StageCorePanel.tsx)<br>[app.js](../apps/studio-android/public/stage-core/app.js)<br>[features.js](../apps/studio-android/public/stage-core/features.js)<br>[app.css](../apps/studio-android/public/stage-core/app.css)                      | Avoid shared components under `ui-shared/components` that don't load the Stagex iframe.               |
| **OTA Updates & APK Install**   | State machine transitions (preparing to installed), update indicators, progress bars, install triggers | <br>[apkDownloader.ts](../packages/studio-core/src/lib/apkDownloader.ts)<br>[UpdateIndicator.tsx](../packages/ui-shared/src/components/UpdateIndicator.tsx)<br>[StudioUpdateScreen.tsx](../packages/ui-shared/src/components/StudioUpdateScreen.tsx)                                                                                                          | Do not edit the native updater watchdog bridge in `capgoUpdater.ts` casually.                         |
| **Chordex Practice & Songs**    | Chord progression parsing, song library practice sheet, floating chords overlay, and scrolling lyrics  | [SongsPanel.tsx](../packages/ui-shared/src/panels/SongsPanel.tsx)<br>[SongPracticeView.tsx](../packages/ui-shared/src/components/SongPracticeView.tsx)<br>[progressions.ts](../packages/studio-core/src/data/progressions.ts)<br>[LibraryPanel.tsx](../packages/ui-shared/src/panels/LibraryPanel.tsx) | Avoid audio worklet sampler logic in `drumAudio.ts` or `LabPanel.tsx`.                                |
| **Drumex Drum Sampler**         | Step sequencer grid, kit samples mapping, BPM tempo controls, sound characteristics                    | [DrumEditor.tsx](../packages/ui-shared/src/panels/DrumEditor.tsx)<br>[drumAudio.ts](../packages/studio-core/src/lib/drumAudio.ts)<br>[drumLibrary.ts](../packages/studio-core/src/lib/drumLibrary.ts)                                                                                                                                                         | Very heavy files (>5000 lines). Do not read or include in context unless Sequencer is the task focus. |
| **Vocalex Pitch Tuner**         | Tuning lab, pitch detection, visual wave monitors, take recorder, and tracks editor                    | [VocalexApp.tsx](../packages/ui-shared/src/vocalex/VocalexApp.tsx)<br>[LabPanel.tsx](../packages/ui-shared/src/vocalex/LabPanel.tsx)<br>[TakesPanel.tsx](../packages/ui-shared/src/vocalex/TakesPanel.tsx)                                                                                                                                                    | Avoid unrelated core sound systems like `drumAudio.ts`.                                               |
| **Cloud Sync Engine**           | Firestore queues, auth swaps, epoch trackers, sync states (`idle` -> `syncing` -> `success` / `error`) | [sync.ts](../packages/studio-core/src/lib/sync.ts)<br>[syncEngine.ts](../packages/studio-core/src/lib/syncEngine.ts)<br>[firebase.ts](../packages/studio-core/src/lib/firebase.ts)                                                                                                                                                                            | Highly fragile concurrency locks. Do not modify without formal state-machine diagrams.                |
| **I18N / Localization**         | Localization hooks (`useT`), language selection configs, JSON dictionaries                             | [en.json](../packages/studio-core/src/i18n/en.json) (and other locales)<br>[useT.ts](../packages/studio-core/src/lib/useT.ts)<br>[i18n.ts](../packages/studio-core/src/lib/i18n.ts)                                                                                                                                                                           | Do not edit the localized strings directly in the components; always use translation keys.            |

---

## 2. Fragile & Risky Files (Handle with Extreme Caution)

- **[appVersion.ts](../packages/studio-core/src/lib/appVersion.ts)**: Single source of truth for version definitions. Hardcoding strings elsewhere breaks the OTA checker boot evaluations.
- ****: Intercepts bundle swapping before React mounts in `main.tsx` to satisfy native rollback watchdogs.
- **[build.gradle](../apps/studio-android/android/app/build.gradle)**: Contains production signing configuration thresholds. Do not weaken these rules or alter the release certificate fingerprint hashes.

---

## 3. Workflow Maps

### A. Android OTA Update Flow

```mermaid
graph TD
    A[App Boot] --> B[Read version.json]
    B --> C{Version Greater?}
    C -- No --> D[Idle]
    C -- Yes --> E[Trigger Fullscreen Update Screen]
    E --> F[Download APK via chunked stream]
    F --> G[Verify SHA-256 Hash]
    G --> H[Run Pre-install Eligibility Check]
    H --> I[Auto-launch Native Intent Installer]
```

### B. Navigation / Back Gesture Interception

```mermaid
graph TD
    A[Swipe Back / Hardware Back] --> B{Active panel has Open Overlay?}
    B -- Yes [Presets / History Sheet] --> C[Intercept event & close overlay]
    B -- No --> D{In Practice Mode / Sub-app Editor?}
    D -- Yes --> E[Intercept & return to Sub-app Home]
    D -- No --> F{At Hub Main Screen?}
    F -- Yes --> G[Follow Settings Exit Gesture Preference]
    F -- No --> H[Return to Hub Main Screen]
```
