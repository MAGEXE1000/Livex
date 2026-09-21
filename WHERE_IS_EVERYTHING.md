# Where Is Everything

> **Purpose**: Quick-reference lookup for AI agents. For any concept, find the exact files.  
> **Usage**: Search this document by keyword to locate implementation files instantly.

---

## Stores (Zustand State)

| Store | Location | What It Holds |
|-------|----------|---------------|
| `useChordStore` | `packages/studio-core/src/store/useChordStore.ts` | App settings, chord workspace, song presets, UI prefs, accent color, theme |
| `useDrumStore` | `packages/studio-core/src/store/useDrumStore.ts` | Drum patterns, kit selection, mixer, BPM, playback state |
| `useNavigationStore` | `packages/studio-core/src/lib/navigation/useNavigationStore.ts` | Navigation history stack, transition state, gesture state |
| `useSettingsStore` | `packages/studio-core/src/store/useSettingsStore.ts` | Settings state |
| `useBottomNavigationStore` | `packages/studio-core/src/lib/navigation/useBottomNavigationStore.ts` | Bottom nav visibility, collapse state |
| `useApplicationTransitionStore` | `packages/studio-core/src/lib/navigation/useApplicationTransitionStore.ts` | App switching transition state |
| `useGroovexStore` | `packages/ui-shared/src/features/groovex/useGroovexStore.ts` | Groovex playback state |
| `developerInspectorStore` | `packages/studio-core/src/lib/devtools/developerInspectorStore.ts` | Dev tools inspector state |

---

## Configuration & Version

| Concept | Location |
|---------|----------|
| App version (SoT) | `packages/studio-core/src/lib/appVersion.ts` → `src/lib/startup/` |
| Vite config (web) | `apps/studio-web/vite.config.ts` |
| Vite config (android) | `apps/studio-android/vite.config.ts` |
| Capacitor config | `apps/studio-android/capacitor.config.ts` |
| Gradle build | `apps/studio-android/android/app/build.gradle` |
| Firebase config | `firebase.json` |
| Cloudflare Pages config | `wrangler.toml` |
| TypeScript base | `tsconfig.base.json` |
| ESLint config | `eslint.config.mjs` |
| pnpm workspace | `pnpm-workspace.yaml` |

---

## Entry Points

| Entry | Location |
|-------|----------|
| Web app entry | `apps/studio-web/src/main.tsx` → `App.tsx` |
| Android app entry | `apps/studio-android/src/main.tsx` → `App.tsx` |
| studio-core barrel | `packages/studio-core/src/index.ts` |
| ui-shared barrel | `packages/ui-shared/src/index.ts` |
| ui-web barrel | `packages/ui-web/src/index.ts` |
| ui-android barrel | `packages/ui-android/src/index.ts` |

---

## Auth & Security

| Concept | Location |
|---------|----------|
| Firebase Auth wrapper | `packages/studio-core/src/lib/auth.ts` → actual module |
| Firebase SDK init | `packages/studio-core/src/lib/firebase.ts` → actual module |
| Supabase client | `packages/studio-core/src/lib/supabaseClient.ts` → actual module |
| Secure localStorage | `packages/studio-core/src/lib/security.ts` → `src/lib/utilities/security.ts` |
| Account lifecycle | `packages/studio-core/src/lib/accountStatus.ts` → actual module |
| Permissions listener | `packages/studio-core/src/lib/permissions.ts` → actual module |

---

## Navigation

| Concept | Location |
|---------|----------|
| Route types | `packages/studio-core/src/lib/navigation/navigationTypes.ts` |
| Navigation API | `packages/studio-core/src/lib/navigation/NavigationDispatcher.ts` |
| Back handling | `packages/studio-core/src/lib/navigation/BackDispatcher.ts` |
| Gesture handling | `packages/studio-core/src/lib/navigation/GestureDispatcher.ts` |
| Transition types | `packages/studio-core/src/lib/navigation/TransitionCoordinator.ts` |
| Route resolution | `packages/studio-core/src/lib/navigation/NavigationCoordinator.ts` |
| Route validation | `packages/studio-core/src/lib/navigation/validation.ts` |
| App sections registry | `packages/studio-core/src/lib/navigation/appRegistry.ts` |
| Bottom nav scroll-hide | `packages/studio-core/src/lib/navigation/navScroll.ts` |
| Search index | `packages/studio-core/src/lib/navigation/searchIndex.ts` |
| Panel switcher (UI) | `packages/ui-shared/src/navigation/SharedNavigationContainer.tsx` |
| Bottom nav bar (UI) | `packages/ui-shared/src/features/hub/navigation/SharedNavigationBar.tsx` |
| Nav controller (UI) | `packages/ui-shared/src/features/hub/navigation/BottomNavigationController.tsx` |

---

## Theme & Styling

| Concept | Location |
|---------|----------|
| Theme token applicator | `packages/studio-core/src/lib/themeEngine.ts` → actual module |
| Theme transition engine | `packages/studio-core/src/lib/themeTransitionEngine.ts` |
| Design tokens | `packages/studio-core/src/lib/designTokens.ts` |
| Design system components | `packages/ui-shared/src/components/design-system/` |
| Liquid Glass | `packages/studio-core/src/lib/liquidGlass.ts` → actual module |
| CSS (web) | `apps/studio-web/src/index.css` |
| CSS (android) | `apps/studio-android/src/index.css` |
| Shared styles | `packages/ui-shared/src/styles/` |

---

## Audio

| Concept | Location |
|---------|----------|
| Drum sampler | `packages/studio-core/src/lib/drumAudio.ts` → actual engine |
| Guitar synthesis | `packages/studio-core/src/lib/guitarAudio.ts` → actual engine |
| Saxophone engine | `packages/studio-core/src/lib/instruments/saxophoneEngine.ts` |
| Drum pattern library | `packages/studio-core/src/lib/drumLibrary.ts` → actual module |
| Drum FX plugins | `packages/studio-core/src/lib/drumPlugins.ts` → actual module |
| Audio context factory | `packages/studio-core/src/lib/audioContextOptions.ts` → actual module |
| Audio asset cache | `packages/studio-core/src/lib/assetCache.ts` → actual module |
| Groovex stem player | `packages/ui-shared/src/features/groovex/audioEngine.ts` |
| Vocalex vocal synth | `packages/ui-shared/src/features/vocalex/vocalSynth.ts` |

---

## Sync & Persistence

| Concept | Location |
|---------|----------|
| Sync orchestrator | `packages/studio-core/src/lib/sync.ts` → actual sync module |
| Sync backends | `packages/studio-core/src/lib/syncBackends/` |
| Sync engine | `packages/studio-core/src/lib/syncEngine.ts` → actual module |
| Native prefs (Capacitor) | `packages/studio-core/src/lib/nativePrefs.ts` → actual module |
| Storage abstractions | `packages/studio-core/src/lib/storage/` |
| Secure read/write | `packages/studio-core/src/lib/utilities/security.ts` |

---

## OTA Updater

| Concept | Location |
|---------|----------|
| Update pipeline | `packages/studio-core/src/lib/updater/pipeline.ts` |
| State machine | `packages/studio-core/src/lib/updater/stateMachine.ts` |
| APK download manager | `packages/studio-core/src/lib/updater/downloadManager.ts` |
| SHA-256 verification | `packages/studio-core/src/lib/updater/integrityVerification.ts` |
| Package installer | `packages/studio-core/src/lib/updater/installer.ts` |
| Update banner/pill (UI) | `packages/ui-shared/src/components/UpdateIndicator.tsx` |
| Update screen (UI) | `packages/ui-shared/src/components/StudioUpdateScreen.tsx` |
| Update diagnostics (UI) | `packages/ui-shared/src/components/UpdateDiagnosticsSheet.tsx` |
| Version metadata | `packages/studio-core/src/lib/updater/releaseMetadata.ts` |
| Version comparison | `packages/studio-core/src/lib/updater/versionComparison.ts` |

---

## Localization

| Concept | Location |
|---------|----------|
| Language definitions | `packages/studio-core/src/lib/i18n.ts` → actual module |
| i18next + Tolgee setup | `packages/studio-core/src/lib/i18nSetup.ts` → actual module |
| Translation hook | `packages/studio-core/src/lib/useT.ts` |
| Locale JSON files | `packages/studio-core/src/i18n/` (en.json, es.json, etc.) |

---

## Layout & UI Primitives

| Concept | Location |
|---------|----------|
| Shared app shell | `packages/ui-shared/src/shared/layout/SharedAppShell.tsx` → cross-platform entry point |
| Master hub shell | `packages/ui-shared/src/features/hub/components/StudioHub.tsx` → actual component |
| Layout scaffolds | `packages/ui-shared/src/shared/layout/StudioLayoutSystem.tsx` → actual component |
| Loading gate | `packages/ui-shared/src/shared/loading/SmartLoading.tsx` → actual component |
| Error boundary | `packages/ui-shared/src/shared/feedback/ErrorBoundary.tsx` → actual component |
| Skeleton loaders | `packages/ui-shared/src/shared/loading/StudioSkeleton.tsx` → actual component |
| Sidebar (web) | `packages/ui-web/src/components/WebSidebarLayout.tsx`, `StudioSidebar.tsx` |
| Lottie wrappers | `packages/ui-shared/src/components/lottie/` |
| Icons | `packages/ui-shared/src/components/icons/` (AnimatedIcon, bakaiIconLibrary) |

---

## Build & CI Scripts

| Concept | Location |
|---------|----------|
| Version consistency check | `scripts/verify-versions-consistency.mjs` |
| Bundle separation check | `scripts/verify-bundle-separation.mjs` |
| Platform scope check | `scripts/enforce-platform-scope.mjs` |
| Import boundary check | `scripts/enforce-import-boundaries.mjs` |
| Circular dependency check | `scripts/verify-circular-deps.mjs` |
| Smoke tests | `scripts/run-smoke-tests.mjs` |
| Navigation tests | `scripts/run-navigation-core-tests.mjs` |
| Updater tests | `scripts/run-updater-regression-tests.mjs` |
| Release publish | `scripts/publish-release.ps1` |

---

## GitHub Actions Workflows

| Workflow | Location |
|----------|----------|
| All workflows | `.github/workflows/` |

---

## Documentation

| Document | Location |
|----------|----------|
| Agent policy | `AGENTS.md` |
| Architecture index | `ARCHITECTURE_INDEX.md` |
| Feature map | `FEATURE_MAP.md` |
| Architecture docs | `docs/architecture/` |
| Bug knowledge base | `docs/bugs/` |
| ADR decisions | `docs/decisions/` |
| Engineering workflows | `docs/workflows/` |
| Lessons learned | `knowledge/lessons_learned.md` |

---

## Re-Export Shim Pattern

Many files in `studio-core/src/lib/` are **single-line re-export shims** for backward compatibility. They re-export from the actual module location (usually a subdirectory). When you see a 30-50 byte `.ts` file, it's likely a shim — follow the re-export to find the real code.
