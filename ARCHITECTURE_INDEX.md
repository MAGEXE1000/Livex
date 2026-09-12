# Livex Architecture Index

> **Last updated:** 2026-07-29
> **Version:** 4.3.04
> **Scope:** Full monorepo — all apps, packages, and lib layers
> **Purpose:** Permanent, read-only reference. Do NOT modify application behavior to satisfy this document.

## AI Agent Quick Start

If you are an AI agent working on this repository, read these documents in order:

1. **This document** — for monorepo structure and dependency graph
2. **[FEATURE_MAP.md](FEATURE_MAP.md)** — to locate any feature's implementation files
3. **[WHERE_IS_EVERYTHING.md](WHERE_IS_EVERYTHING.md)** — quick-reference lookup by concept
4. **[HOW_TO_IMPLEMENT_FEATURES.md](HOW_TO_IMPLEMENT_FEATURES.md)** — step-by-step recipes
5. **[COMMON_MODIFICATION_POINTS.md](COMMON_MODIFICATION_POINTS.md)** — files commonly modified per change type
6. **[STATE_FLOW.md](STATE_FLOW.md)** — all stores, persistence, and data flow
7. **[DEBUGGING_GUIDE.md](DEBUGGING_GUIDE.md)** — structured debugging for common issues
8. **[AGENTS.md](AGENTS.md)** — platform-scope policy and engineering protocol

---

## Table of Contents

1. [Monorepo Overview](#1-monorepo-overview)
2. [Dependency Graph](#2-dependency-graph)
3. [Apps](#3-apps)
4. [Packages](#4-packages)
5. [Lib Layer](#5-lib-layer)
6. [Core Sub-Modules (studio-core)](#6-core-sub-modules-studio-core)
7. [UI Sub-Modules (ui-shared)](#7-ui-sub-modules-ui-shared)
8. [Platform Ownership Map](#8-platform-ownership-map)
9. [Known Technical Debt](#9-known-technical-debt)
10. [Startup Sequence](#10-startup-sequence)
11. [State Management Map](#11-state-management-map)
12. [Persistence Map](#12-persistence-map)
13. [Routing Map](#13-routing-map)

---

## 1. Monorepo Overview

The Studio workspace is a **pnpm monorepo** containing two deployed apps (web and Android), four shared packages, and four utility libraries.

```
Studio/
├── apps/
│   ├── studio-web/        # Vite + React web app (Netlify)
│   └── studio-android/    # Capacitor + Android native app (APK)
├── packages/
│   ├── studio-core/       # Platform-neutral business logic & stores
│   │   └── src/lib/navigation/  # [Sprint B] Navigation module (all nav concerns)
│   ├── ui-shared/         # Cross-platform React components
│   │   └── src/navigation/      # [Sprint B] Navigation UI module (BottomNav, animations, styles)
│   ├── ui-web/            # Web-only layout components
│   └── ui-android/        # Android-only components
└── lib/
    ├── api-spec/          # OpenAPI YAML definitions
    ├── api-zod/           # Zod schemas generated from spec
    ├── api-client-react/  # React Query hooks generated from spec
    └── db/                # Drizzle ORM schema (Supabase)
```

**Tech stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, Zustand 5, Framer Motion/Motion 12, Firebase 12, Supabase JS 2, Capacitor 6, i18next/Tolgee.

---

## 2. Dependency Graph

```
studio-web
  → @workspace/studio-core
  → @workspace/ui-shared
  → @workspace/ui-web

studio-android
  → @workspace/studio-core
  → @workspace/ui-shared
  → @workspace/ui-android

ui-shared
  → @workspace/studio-core

ui-android
  → @workspace/ui-shared  (re-exports via index.ts)

studio-core      — no internal workspace deps
lib/*            — standalone (no workspace deps)
```

**Rule:** Dependency only flows **down** this graph. studio-core never imports from ui-_. lib/_ packages never import from packages/* or pps/*.

---

## 3. Apps

### 3.1 @workspace/studio-web

| Field               | Value                                  |
| ------------------- | -------------------------------------- |
| **Package name**    | @workspace/studio-web                  |
| **Version**         | 4.0.4                                  |
| **Entry point**     | pps/studio-web/src/main.tsx            |
| **Deployment**      | Netlify (web hosting)                  |
| **Build tool**      | Vite 7 (pps/studio-web/vite.config.ts) |
| **Ownership scope** | WEB                                    |

#### Purpose

The browser-based responsive web application. Provides all studio modes (Chordex, Drumex, StageX, Groovex, Vocalex) inside a Vite SPA deployed to Netlify. Shares business logic with the Android app via @workspace/studio-core and UI components via @workspace/ui-shared. Uses web-only layout components from @workspace/ui-web.

#### Main Files

| File          | Role                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| src/main.tsx  | React DOM root mount                                                            |
| src/App.tsx   | Root component; routing, auth state machine, panel navigation, top-level layout |
| src/index.css | Global CSS; TailwindCSS base, design tokens, panel-enter/exit animation classes |
| ite.config.ts | Vite configuration: React plugin, Tailwind, path aliases                        |
| index.html    | HTML shell; Google Fonts, Material Symbols, meta tags                           |

#### Imports (workspace)

- @workspace/studio-core — stores, navigation, sync, auth, version
- @workspace/ui-shared — StudioHub, SmartLoading, all panels, skeletons, SharedNavigationContainer, ErrorBoundary
- @workspace/ui-web — WebSidebarLayout, SidebarProvider, SidebarInset, useSidebar, StudioLandingPage

#### External Dependencies

eact,
eact-dom, motion/react, irebase, @supabase/supabase-js, zustand, i18next, @tolgee/react, lucide-react, material-symbols, lottie-react, gsap, jspdf, pitchy, @soundtouchjs/audio-worklet

#### Exports

None — app entry point, not a library.

#### Consumers

None (leaf node).

#### Known Technical Debt

- App.tsx is a 563-line god-component owning auth state machine, routing, panel switching, sidebar management, and OTA state — needs decomposition.
- StudioHub lazy-load pattern (import('@workspace/ui-shared').then(m => ({default: m.StudioHub}))) is fragile; a dedicated chunk re-export is preferable.
- No route library — routing is manual state plus useNavigationStore.

---

### 3.2 @workspace/studio-android

| Field               | Value                           |
| ------------------- | ------------------------------- |
| **Package name**    | @workspace/studio-android       |
| **Version**         | 4.0.4                           |
| **Entry point**     | pps/studio-android/src/main.tsx |
| **Deployment**      | Capacitor → Gradle → signed APK |
| **Build tool**      | Vite 7 + cap sync android       |
| **Ownership scope** | APK                             |

#### Purpose

The native Android application rendered inside a Capacitor WebView. Has access to native Capacitor plugins (filesystem, status bar, notifications, screen orientation). Contains its own OTA updater pipeline (native APK downloader + PackageInstaller). Shares all business logic with the web app via shared packages.

#### Main Files

| File                     | Role                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- |
| src/main.tsx             | React DOM root, mirrors web entry                                                      |
| src/App.tsx              | Root component; mirrors web App.tsx with native-only paths (APK updater, back-handler) |
| ite.config.ts            | Vite config for Android                                                                |
| capacitor.config.ts      | Capacitor config: appId, server URL, plugin settings                                   |
| ndroid/                  | Native Android project (Gradle, AndroidManifest, Kotlin)                               |
| scripts/sync-version.mjs | Prebuild hook: stamps public/version.json                                              |

#### Imports (workspace)

- @workspace/studio-core
- @workspace/ui-shared
- @workspace/ui-android

#### Additional External Dependencies

@capacitor/core, @capacitor/android, @capacitor/app, @capacitor/filesystem, @capacitor/preferences, @capacitor/status-bar, @capacitor/screen-orientation, @capacitor/local-notifications, @capacitor/share, @capacitor-firebase/authentication, html2canvas

#### Exports

None — app entry point.

#### Consumers

None (leaf node).

#### Known Technical Debt

- capacitor.config.ts references a hardcoded server.url for dev; production builds require this to be stripped.
- The Android project (ndroid/) is not tracked by any TypeScript config.
- APK signing key config (uild.gradle) is outside the monorepo; documented in AGENTS.md §B.

---

## 4. Packages

### 4.1 @workspace/studio-core

| Field               | Value                             |
| ------------------- | --------------------------------- |
| **Package name**    | @workspace/studio-core            |
| **Path**            | packages/studio-core/             |
| **Entry point**     | packages/studio-core/src/index.ts |
| **Ownership scope** | SHARED                            |

#### Purpose

The single source of truth for all platform-neutral business logic. Contains Zustand state stores, the typed navigation system, cloud sync engine (multi-backend), OTA updater pipeline, Firebase Auth wrapper, theme engine, audio subsystems (drum, guitar), chord and music theory services, i18n setup, dev tools, performance profiler, startup coordinator, and all static data (chords, progressions, songs).

No React components live here — this package is pure TypeScript and React hooks only.

#### Main Files

| File                              | Role                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| src/index.ts                      | Public barrel — re-exports everything                                     |
| src/store/useChordStore.ts        | Global Zustand store; app settings, chord state, song presets, UI prefs   |
| src/store/useDrumStore.ts         | Global Zustand store; drum pattern, kit, mixer, sequencer state           |
| src/store/useNavigationStore.ts   | Navigation history stack, transition state, gesture state                 |
| src/lib/navigation/               | Navigation foundation (see §6.2)                                          |
| src/lib/sync.ts                   | Cloud sync engine (see §6.3)                                              |
| src/lib/syncBackends/             | Pluggable sync backend providers                                          |
| src/lib/otaUpdate.ts              | OTA update orchestrator (see §6.4)                                        |
| src/lib/updater/                  | Modular OTA updater sub-system                                            |
| src/lib/drumAudio.ts              | Web Audio API drum sampler (see §6.5)                                     |
| src/lib/auth.ts                   | Firebase Auth wrapper (see §6.6)                                          |
| src/lib/firebase.ts               | Firebase SDK initialization                                               |
| src/lib/themeEngine.ts            | CSS token applicator (see §6.7)                                           |
| src/lib/startupCoordinator.ts     | App boot sequencer (see §6.8)                                             |
| src/lib/devTools.ts               | Dev overlay log registry (see §6.9)                                       |
| src/lib/performanceProfiler.ts    | FPS/memory/frame-time profiler (see §6.9)                                 |
| src/lib/appVersion.ts             | Single version source of truth (APP_VERSION, WEB_VERSION, NATIVE_VERSION) |
| src/lib/chordService.ts           | Chord chart normalization, lyrics fetch                                   |
| src/lib/lyricsService.ts          | lrclib.net integration                                                    |
| src/lib/liquidGlass.ts            | SVG-filter Liquid Glass nav effect                                        |
| src/lib/i18n.ts                   | Language definitions and translation loader                               |
| src/lib/i18nSetup.ts              | i18next + Tolgee initialization                                           |
| src/lib/security.ts               | secureReadLocal / secureWriteLocal wrappers                               |
| src/data/chords.ts                | Static chord voicing database (~48 KB)                                    |
| src/data/progressions.ts          | Built-in chord progression library (~111 KB)                              |
| src/data/progressionsEs.ts        | Spanish chord progression library (~32 KB)                                |
| src/data/songs.ts                 | Song chart types and built-in charts                                      |
| src/data/authorizedChords.ts      | Authorized chord ID list                                                  |
| src/vocalex/takesDb.ts            | IndexedDB takes persistence (Vocalex)                                     |
| src/vocalex/labSessionDb.ts       | IndexedDB lab session persistence (Vocalex)                               |
| src/hooks/useIsWebDesktop.ts      | Responsive desktop breakpoint hook                                        |
| src/hooks/useStudioPreferences.ts | Derived preference selectors                                              |
| src/hooks/useStudioShortcuts.ts   | Keyboard shortcut registration                                            |

#### Imports (internal)

zustand, zustand/middleware, irebase/auth, irebase/firestore, @supabase/supabase-js, @capacitor/core, @capacitor/preferences, @capacitor/filesystem, @capacitor/app, @capacitor/local-notifications, i18next, @tolgee/i18next,
eact (hooks only — no JSX)

#### Key Exports

` ypescript
// Stores
export * from './store/useChordStore'; // AppKey, AppSettings, Theme, AccentColor, ...
export * from './store/useDrumStore'; // DrumPattern, KitType, DrumInstrument, ...
export * from './store/useNavigationStore';

// Navigation (Sprint 9.1)
export * from './lib/navigation/navigationTypes'; // NavigationRoute, TransitionType, ...
export * from './lib/navigation/NavigationDispatcher'; // push, pop, replace, popTo, reset
export * from './lib/navigation/NavigationCoordinator';
export * from './lib/navigation/BackDispatcher';
export * from './lib/navigation/GestureDispatcher';
export * from './lib/navigation/TransitionCoordinator';
export * from './lib/navigation/validation';
export * from './lib/navigation/useBackHandler';

// Sync
export * from './lib/sync'; // syncNow, requestFlush, attachSync, detachSync
export * from './lib/syncBackends/index'; // getActiveSyncProvider, initSyncBackends

// OTA
export * from './lib/otaUpdate';
export * from './lib/updater/stateMachine'; // OtaUpdateState, CentralizedOtaState
export * from './lib/updater/diagnostics';
export * from './lib/updater/versionLogger';
export * from './lib/updater/updaterSimulation';
export { deleteLocalApk } from './lib/updater/cacheManager';

// Auth & Firebase
export * from './lib/auth'; // subscribeAuth, signInWithGoogle, type AuthUser
export * from './lib/firebase';
export * from './lib/accountStatus';
export * from './lib/security';

// Version
export * from './lib/appVersion'; // APP_VERSION, WEB_VERSION, NATIVE_VERSION, APP_VERSION_LABEL

// Theme
export * from './lib/themeEngine'; // applyThemeTokens, ThemeConfig
export * from './lib/liquidGlass'; // LiquidGlassManager
export * from './lib/useLiquidGlassNav';

// Audio
export * from './lib/drumAudio';
export * from './lib/guitarAudio';
export * from './lib/drumLibrary';
export * from './lib/drumPlugins';
export * from './lib/assetCache';
export * from './lib/audioContextOptions';

// Music Theory
export * from './lib/chordService';
export * from './lib/chordDetect';
export * from './lib/chordAssistant';
export * from './lib/transpose';
export * from './lib/lyricsService';

// i18n
export * from './lib/i18n';
export * from './lib/i18nSetup';

// Dev Tools
export * from './lib/devTools';
export * from './lib/performanceProfiler';
export * from './lib/startupCoordinator';

// Hooks
export * from './hooks/useIsWebDesktop';
export * from './hooks/useStudioPreferences';
export * from './hooks/useStudioShortcuts';
export * from './lib/useStatusBar';
export * from './lib/useT';
export * from './lib/useLiquidGlassNav';

// Static Data
export * from './data/chords';
export * from './data/progressions';
export * from './data/songs';
export * from './data/authorizedChords';

// Vocalex DB
export * from './vocalex/labSessionDb';
export * from './vocalex/takesDb';
`

#### Dependencies

No workspace dependencies. All external: zustand, irebase, @supabase/supabase-js, @capacitor/*, i18next,
eact.

#### Consumers

- @workspace/ui-shared
- @workspace/studio-web
- @workspace/studio-android

#### Known Technical Debt

- sync.ts is 2866 lines — sync orchestration, backend selection, retry logic, and per-app domain serialization must be split.
- otaUpdate.ts is 2110 lines — updater modularization into updater/ sub-modules is incomplete.
- drumAudio.ts is 2140 lines — entire drum sampler in one file with no internal module boundary.
- useChordStore is a catch-all: holds app settings, chord workspace, song presets, navigation-adjacent state, and per-app theming — causes unnecessary re-renders.
- ctivityLogger.ts writes to window.__studioActivityState — a non-reactive global side-effect.

---

### 4.2 @workspace/ui-shared

| Field               | Value                           |
| ------------------- | ------------------------------- |
| **Package name**    | @workspace/ui-shared            |
| **Path**            | packages/ui-shared/             |
| **Entry point**     | packages/ui-shared/src/index.ts |
| **Ownership scope** | SHARED                          |

#### Purpose

Cross-platform React component library consumed by both studio-web and studio-android. Contains all major UI panels, the studio hub layout shell, shared animation system, design system primitives, update UI, Lottie animation wrappers, and full feature module UIs for Groovex and Vocalex.

#### Main Files

| File                                         | Role                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| src/index.ts                                 | Public barrel — all component exports                                           |
| src/components/StudioHub.tsx                 | Master navigation shell (~337 KB); renders drill-down layouts for all app modes |
| src/components/SharedNavigationContainer.tsx | CSS-animation panel switcher (no Framer dependency)                             |
| src/components/AppAnimationSystem.tsx        | Framer Motion presets, AnimationCoordinator, AppEntryTransition, PageTransition |
| src/components/StudioLayoutSystem.tsx        | Layout primitives: SettingsScaffold, SettingsSection, DrillDownLayout           |
| src/components/SmartLoading.tsx              | Async loading gate with skeleton fallback and timeout                           |
| src/components/ErrorBoundary.tsx             | React Error Boundary with recovery UI                                           |
| src/components/BottomNav.tsx                 | Mobile bottom navigation bar with LiquidGlass effect                            |
| src/components/DevToolsDashboard.tsx         | Full-screen developer overlay (~183 KB)                                         |
| src/components/UpdateIndicator.tsx           | Morphing update banner/pill (~88 KB)                                            |
| src/components/UpdateDiagnosticsSheet.tsx    | Update diagnostics sheet (~48 KB)                                               |
| src/components/AccountCard.tsx               | Full account management UI (~249 KB)                                            |
| src/components/StageCorePanel.tsx            | Stage mode layout (~114 KB)                                                     |
| src/components/SongPracticeView.tsx          | Song practice / chord-chart view (~69 KB)                                       |
| src/components/CustomChordBuilder.tsx        | Custom chord diagram builder (~49 KB)                                           |
| src/components/StudioDesignSystem.tsx        | Design tokens, color palettes, button primitives                                |
| src/components/WebDesignSystem.tsx           | Web-specific toolbar/button components                                          |
| src/components/StudioSkeleton.tsx            | Skeleton loading shapes for each app mode                                       |
| src/panels/ChordPanel.tsx                    | Chordex chord workspace panel (~45 KB)                                          |
| src/panels/DrumEditor.tsx                    | Drumex sequencer editor (~338 KB)                                               |
| src/panels/DrumPrefsPanel.tsx                | Drumex preferences panel (~16 KB)                                               |
| src/panels/LibraryPanel.tsx                  | Chord library browser (~91 KB)                                                  |
| src/panels/SettingsPanel.tsx                 | Global settings panel (~29 KB)                                                  |
| src/panels/SongsPanel.tsx                    | Song management panel (~191 KB)                                                 |
| src/groovex/                                 | Groovex stem-player feature module (see §7.3)                                   |
| src/vocalex/                                 | Vocalex vocal training feature module (see §7.2)                                |
| src/components/animata/                      | Animata animation components                                                    |
| src/components/kokonutui/                    | KokonutUI components                                                            |
| src/components/lottie/                       | Lottie animation wrappers                                                       |
| src/components/ui/                           | Generic UI primitives                                                           |
| src/components/updater-diagnostics/          | Updater diagnostics page and clipboard utility                                  |

#### Imports

- @workspace/studio-core — all stores, navigation, audio, sync, theme, version
-

eact,
eact-dom, motion/react, lucide-react, material-symbols, lottie-react

- @capacitor/core (platform detection)

#### Key Exports

`	ypescript
export { SharedNavigationContainer } from './components/SharedNavigationContainer';
export { default as StudioHub } from './components/StudioHub';
export * from './components/StudioLayoutSystem';
export * from './components/AppAnimationSystem';
export { default as LibraryPanel } from './panels/LibraryPanel';
export { default as ChordPanel } from './panels/ChordPanel';
export { default as SettingsPanel } from './panels/SettingsPanel';
export { default as SongsPanel } from './panels/SongsPanel';
export { default as DrumEditor } from './panels/DrumEditor';
export { default as GroovexApp } from './groovex/GroovexApp';
export { default as VocalexApp } from './vocalex/VocalexApp';
export { default as StageCorePanel } from './components/StageCorePanel';
export { default as SmartLoading, AppLoadingScreen } from './components/SmartLoading';
export { ErrorBoundary } from './components/ErrorBoundary';
export { default as BottomNav } from './components/BottomNav';
export { default as UpdateIndicator } from './components/UpdateIndicator';
export { default as DevToolsDashboard } from './components/DevToolsDashboard';
export { default as AccountCard } from './components/AccountCard';
export * from './components/StudioSkeleton';
// Plus: all Lottie wrappers, diagram components, design system, updater diagnostics
`

#### Dependencies

@workspace/studio-core

#### Consumers

- @workspace/studio-web
- @workspace/studio-android
- @workspace/ui-android (re-exports a subset)

#### Known Technical Debt

- StudioHub.tsx is ~337 KB — monolithic hub. Desktop layout, mobile layout, and per-app sub-stacks should be separate components.
- DrumEditor.tsx is ~338 KB — should be split into grid, mixer, and transport sub-components.
- AccountCard.tsx is ~249 KB — complex feature with no internal module boundary.
- DevToolsDashboard.tsx is ~183 KB — each tab should be a separate file.
- Active migration from AnimatePresence + PageTransition to SharedNavigationContainer is incomplete. Both patterns coexist.
- AppAnimationSystem.tsx mixes pure config and React components — should be split.

---

### 4.3 @workspace/ui-web

| Field               | Value                        |
| ------------------- | ---------------------------- |
| **Package name**    | @workspace/ui-web            |
| **Path**            | packages/ui-web/             |
| **Entry point**     | packages/ui-web/src/index.ts |
| **Ownership scope** | WEB                          |

#### Purpose

Web-only layout and page components. Provides the responsive sidebar layout system, web-specific toolbar, and the public marketing landing page. Must NOT be imported by the Android app.

#### Main Files

| File                                 | Role                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| src/index.ts                         | Public barrel                                                                    |
| src/components/WebSidebarLayout.tsx  | Responsive sidebar + content layout shell (~20 KB)                               |
| src/components/StudioSidebar.tsx     | SidebarProvider, SidebarInset, useSidebar context + collapsible sidebar (~10 KB) |
| src/components/WebAppSectionDock.tsx | App-mode dock for desktop web                                                    |
| src/landing/StudioLandingPage.tsx    | Public marketing landing page                                                    |
| src/landing/landingData.ts           | Landing page content data                                                        |
| src/landing/landingUtils.ts          | Landing page utility helpers                                                     |

#### Exports

`	ypescript
export { default as WebSidebarLayout } from './components/WebSidebarLayout';
export { SidebarProvider, SidebarInset, useSidebar } from './components/StudioSidebar';
export { default as WebAppSectionDock } from './components/WebAppSectionDock';
export { default as StudioLandingPage } from './landing/StudioLandingPage';
`

#### Dependencies

@workspace/studio-core (limited: hooks and stores only)

#### Consumers

@workspace/studio-web only.

#### Known Technical Debt

- WebAppSectionDock exists in both ui-shared/src/components/ and ui-web/src/components/. Canonical owner and implementation is unclear.

---

### 4.4 @workspace/ui-android

| Field               | Value                            |
| ------------------- | -------------------------------- |
| **Package name**    | @workspace/ui-android            |
| **Path**            | packages/ui-android/             |
| **Entry point**     | packages/ui-android/src/index.ts |
| **Ownership scope** | APK                              |

#### Purpose

Android-only component overrides and re-exports. Currently thin — primarily re-exports a subset of ui-shared components and provides an Android-specific StageCorePanel override.

#### Main Files

| File                              | Role                                  |
| --------------------------------- | ------------------------------------- |
| src/index.ts                      | Public barrel                         |
| src/components/StageCorePanel.tsx | Android-specific Stage panel override |
| src/watchdog/paintVerification.ts | HTML5 Canvas DOM paint verification   |

#### Exports

```typescript
export { SharedNavigationBar, UpdateIndicator, UpdateDiagnosticsSheet, StudioUpdateScreen } from '@workspace/ui-shared';
export { default as StageCorePanel } from './components/StageCorePanel';
export { runPaintVerification } from './watchdog/paintVerification';
```

#### Dependencies

@workspace/ui-shared

#### Consumers

@workspace/studio-android only.

#### Known Technical Debt

- Package is essentially a re-export facade with minimal Android-specific logic. May be unnecessary abstraction.

---

## 5. Lib Layer

The lib/ directory contains standalone TypeScript packages used by tooling or back-end scripts. No workspace dependencies.

### 5.1 lib/api-spec

| Field           | Value                                         |
| --------------- | --------------------------------------------- |
| **Path**        | lib/api-spec/                                 |
| **Purpose**     | OpenAPI YAML source definition (openapi.yaml) |
| **Entry point** | openapi.yaml                                  |
| **Consumers**   | lib/api-zod (Orval codegen input)             |

Contains the raw OpenAPI YAML spec that drives code generation for Zod schemas and React Query hooks.

---

### 5.2 lib/api-zod

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Path**        | lib/api-zod/                                             |
| **Purpose**     | Zod schema package generated from lib/api-spec via Orval |
| **Entry point** | Generated src/index.ts                                   |
| **Consumers**   | lib/api-client-react                                     |

Auto-generated. Do not hand-edit. Regenerate with Orval when the OpenAPI spec changes.

---

### 5.3 lib/api-client-react

| Field           | Value                                             |
| --------------- | ------------------------------------------------- |
| **Path**        | lib/api-client-react/                             |
| **Purpose**     | React Query hooks generated from the OpenAPI spec |
| **Entry point** | Generated src/index.ts                            |
| **Consumers**   | Apps requiring API data-fetching hooks            |

Auto-generated. Do not hand-edit.

---

### 5.4 lib/db

| Field         | Value                                                   |
| ------------- | ------------------------------------------------------- |
| **Path**      | lib/db/                                                 |
| **Purpose**   | Drizzle ORM schema for the Supabase PostgreSQL database |
| **Consumers** | Back-end scripts, Supabase migrations                   |

---

## 6. Core Sub-Modules (studio-core)

### 6.1 State Stores

#### useChordStore — src/store/useChordStore.ts

| Field                  | Detail                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**            | Global Zustand store; single source of truth for app-wide settings, Chordex workspace state, song presets, and per-app visual preferences |
| **Persistence**        | zustand/persist with secureReadLocal/secureWriteLocal                                                                                     |
| **Key exported types** | AppKey, AppSettings, Theme, AccentColor, ActivePanel, Language, SongPreset, CustomChord, Progression, AnimationSpeed, DisplayDensity      |
| **Notable constants**  | ACCENT_COLORS                                                                                                                             |
| **Consumers**          | Nearly every module in the monorepo                                                                                                       |
| **Debt**               | Too broad — holds app settings, chord editing state, song library, navigation-adjacent fields, and per-app theme maps all in one slice    |

#### useDrumStore — src/store/useDrumStore.ts

| Field                  | Detail                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Purpose**            | Global Zustand store for the Drumex sequencer — patterns, kit selection, mixer, BPM, playback state |
| **Persistence**        | zustand/persist with secure storage                                                                 |
| **Key exported types** | DrumInstrument, DrumPattern, KitType, NoteVariation, HouseMic, CymbalPack, InstFX, HouseCrashModel  |
| **Consumers**          | drumAudio.ts, DrumEditor.tsx, DrumPrefsPanel.tsx                                                    |

#### useNavigationStore — src/store/useNavigationStore.ts

| Field                               | Detail                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| **Purpose**                         | Zustand store for the typed route history stack and transition state                         |
| **Key state**                       | history: NavigationRoute[], ransitionType, isTransitioning, gestureState, predictiveProgress |
| **Key actions**                     | setHistory, setTransition, setGestureState,                                                  |
| esetNav, setNavHidden, setNavLocked |
| **Consumers**                       | NavigationDispatcher, App.tsx, StudioHub.tsx, BottomNav.tsx                                  |

---

### 6.2 Navigation System

**Path:** `src/lib/navigation/` — Introduced in Sprint 9.1, reorganized in Sprint B

All navigation concerns are co-located in `studio-core/src/lib/navigation/`. The directory has a single barrel (`index.ts`) that exports everything. Old import paths are preserved via 1-line re-export shims.

**Shims (preserved for backward compatibility):**

- `src/store/useNavigationStore.ts` → re-exports from `lib/navigation/useNavigationStore`
- `src/lib/navScroll.ts` → re-exports from `lib/navigation/navScroll`
- `src/lib/studioAppNavigationRegistry.ts` → re-exports from `lib/navigation/appRegistry`

#### navigationTypes.ts

Defines core navigation types:

- NavigationRoute — { app, tab?, page?, subView?, id?, type? }
- NavigationHistory — NavigationRoute[]
- TransitionType — 'forward' | 'backward' | 'replace' | 'modal' | 'sheet' | 'overlay'
- GestureState — 'idle' | 'swiping' | 'cancelled' | 'committed'
- NavigationState — full store state shape

**Supported pp keys:** 'hub' | 'chords' | 'drums' | 'stage' | 'groovex' | 'vocalex'

#### NavigationDispatcher.ts

Static class — the **primary navigation API** for all consumer code.

| Method              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| push(route)         | Push route onto stack; guards duplicates, cycles, and locked transitions |
| pop()               | Pop top route; guards against popping root                               |
|                     |
| eplace(route)       | Replace current top route                                                |
| popTo(predicate)    | Pop back to first matching route                                         |
|                     |
| eset(stack)         | Replace entire history stack                                             |
| canGoBack()         | Returns true if stack has more than root                                 |
| currentRoute()      | Returns top of stack                                                     |
| previousRoute()     | Returns second-from-top                                                  |
| subscribe(listener) | Subscribe to store changes                                               |

Internal lockTransition(type) sets a 300 ms auto-release transition lock.

#### NavigationCoordinator.ts

Resolves default sub-routes for each pp key. Called by NavigationDispatcher before every mutation.

#### BackDispatcher.ts

Handles hardware/gesture back events. Delegates to NavigationDispatcher.pop() or priority-queued custom back handlers.

#### GestureDispatcher.ts

Manages swipe-back gesture state. Updates gestureState and predictiveProgress in useNavigationStore.

#### TransitionCoordinator.ts

Resolves the correct CSS transition class name given a TransitionType and direction.

#### validation.ts

ormalizeAndValidateRoute, isRouteEqual, detectRecursion, isTransitionLocked, isRootRouteOnly

#### useBackHandler.ts

React hook: registers a back-handler on mount via BackDispatcher, unregisters on unmount.

#### useNavigationStore.ts — `src/lib/navigation/useNavigationStore.ts`

| Field           | Detail                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Purpose**     | Zustand store for the typed route history stack and transition state                                    |
| **Key state**   | `history: NavigationRoute[]`, `transitionType`, `isTransitioning`, `gestureState`, `predictiveProgress` |
| **Key actions** | `setHistory`, `setTransition`, `setGestureState`, `registerHandler`, `unregisterHandler`, `resetStore`  |
| **Consumers**   | `NavigationDispatcher`, `App.tsx`, `StudioHub.tsx`, `BottomNav.tsx`                                     |

#### navScroll.ts — `src/lib/navigation/navScroll.ts`

| Field           | Detail                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**     | Scroll-hide + pill-collapse engine for the bottom navigation bar                                                                    |
| **Key exports** | `setNavHidden`, `setNavLocked`, `setNavCollapsed`, `useNavHidden`, `useNavCollapsed`, `useScrollHide`, `resetNav`, `onStateChanged` |
| **Notable**     | Contains a watchdog recovery system that auto-expands the nav if stuck in a collapsed state with no active scroll owner             |

#### appRegistry.ts — `src/lib/navigation/appRegistry.ts`

| Field            | Detail                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| **Purpose**      | Per-app section definitions used by StudioHub and BottomNav to render sub-tabs |
| **Key exports**  | `APP_SECTIONS: Record<string, AppSection[]>`, `AppSection` interface           |
| **Apps covered** | `chords`, `drums`, `groovex`, `vocalex`, `stage`                               |

---

### 6.3 Sync Engine

**Path:** src/lib/sync.ts + src/lib/syncBackends/

#### Purpose

Multi-backend cloud sync for user data (chords, drum patterns, songs, vocalex takes, lab sessions) across all app modes.

#### Architecture

`sync.ts (orchestrator)
  └── syncBackends/index.ts  — selects active provider from ChordStore settings
        ├── firebaseLegacy.ts  — Firebase Firestore provider
        └── supabaseRealtime.ts — Supabase Realtime provider`

Provider selection reads settings.syncBackendProvider from useChordStore. Defaults to 'supabase-realtime'.

#### State Machine

`idle → syncing → success (auto-returns to idle after 1.8 s)
                       ↓
                     error → retry`

#### Key Behaviors

- Exactly one in-flight sync at a time (enqueue-and-merge)
- 10-second overall watchdog timeout
- 6-second per-Firestore-op timeout
- All apps synced in parallel (Promise.allSettled)
- Epoch counter invalidates stale in-flight runs after auth change
- Hash-compare on push prevents redundant Firestore writes

#### Key Exports

syncNow,
equestFlush, ttachSync, detachSync, getGlobalSyncState, subscribeToSyncState, getActiveSyncProvider, initSyncBackends, disposeSyncBackends

#### Known Technical Debt

- At 2866 lines, sync.ts mixes orchestration, retry logic, Firestore serialization, and per-app domain logic.
- SyncBackendProvider interface exists in syncBackends/types.ts but the orchestrator still contains Firestore-specific logic.

---

### 6.4 OTA Updater

**Path:** src/lib/otaUpdate.ts + src/lib/updater/

#### Purpose

Over-the-air update pipeline for both web bundles (OTA cache replacement) and Android APK downloads (native PackageInstaller).

#### Modules

| File                               | Role                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| otaUpdate.ts                       | Top-level orchestrator; useOtaUpdate hook; logDiagnosticEvent    |
| updater/stateMachine.ts            | OtaUpdateState enum, CentralizedOtaState type, transition guards |
| updater/releaseMetadata.ts         | Fetches and parses remote ersion.json                            |
| updater/versionComparison.ts       | Semver comparison; update-type resolution (ota                   | apk | both | none) |
| updater/downloadManager.ts         | Chunked APK download with progress reporting                     |
| updater/integrityVerification.ts   | SHA-256 hash verification                                        |
| updater/eligibilityVerification.ts | Device eligibility checks (min version code, platform)           |
| updater/installer.ts               | Capacitor filesystem write + PackageInstaller intent             |
| updater/recovery.ts                | Fallback URL rotation on consecutive failures                    |
| updater/cacheManager.ts            | APK file cache management; exports deleteLocalApk                |
| updater/diagnostics.ts             | Comprehensive update diagnostics collection                      |
| updater/versionLogger.ts           | Version transformation logging;                                  |
| eleaseMetadataInspector            |
| updater/versionManager.ts          | Version string utilities                                         |
| updater/updaterSimulation.ts       | Dev-only update flow simulation                                  |

#### OTA State Machine Transitions

`INITIALIZING → FETCH_REMOTE_METADATA → VALIDATE_METADATA → COMPARE_VERSION
  → NO_UPDATE_AVAILABLE
  → UPDATE_AVAILABLE → FETCH_APK_INFORMATION → DOWNLOAD_APK → VERIFY_SHA256
      → PREPARING_INSTALL → WAITING_USER_CONFIRMATION → PACKAGEINSTALLER_VISIBLE
      → INSTALLING → INSTALL_SUCCESS | INSTALL_CANCELLED | INSTALL_FAILED → RECOVERY
  → IDLE`

#### Key Exports

useOtaUpdate, initializeGlobalOtaListeners, enforceStartupRecovery, pplyUpdate, globalOtaState, logDiagnosticEvent

#### Known Technical Debt

- otaUpdate.ts at 2110 lines is still too large; hook, diagnostic logger, and pipeline entry should each be a separate file.
- Fallback URL logic in
  ecovery.ts is tightly coupled to specific Firebase URL patterns.

---

### 6.5 Audio Subsystem

#### drumAudio.ts — src/lib/drumAudio.ts

| Field            | Detail                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Full Web Audio API drum sampler: sample scheduling, velocity, humanization, swing, per-instrument FX chain    |
| **Size**         | ~2140 lines                                                                                                   |
| **Key exports**  | scheduleDrumHit, startTransport, stopTransport, setTempo, setSwing, setHumanizeVelocity, getSoundForVariation |
| **Dependencies** | useDrumStore, drumPlugins.ts, ssetCache.ts, udioContextOptions.ts                                             |
| **Consumers**    | DrumEditor.tsx, DrumPrefsPanel.tsx                                                                            |

#### guitarAudio.ts — src/lib/guitarAudio.ts

Basic guitar string audio synthesis. Exports playGuitarString, stopGuitarString.

#### drumPlugins.ts — src/lib/drumPlugins.ts

Plugin registry for drum kit sound packs. Exports getPlugin,
egisterPlugin, InstPlugin.

#### drumLibrary.ts — src/lib/drumLibrary.ts

Curated drum pattern library by genre (~33 KB). Exports pattern collections.

#### assetCache.ts — src/lib/assetCache.ts

Audio asset URL resolver and seeded cache. Exports drumAssetUrl, seedAudioAssets.

#### audioContextOptions.ts — src/lib/audioContextOptions.ts

Singleton AudioContext factory; handles browser autoplay policy. Exports createAudioContext.

---

### 6.6 Auth & Firebase

#### auth.ts — src/lib/auth.ts

| Field            | Detail                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**      | Firebase Auth wrapper; reactive auth state, Google sign-in, email/password, account deletion                             |
| **Key exports**  | subscribeAuth, signInWithGoogle, signInWithEmail, createAccount, signOut, deleteAccount, sendPasswordReset, ype AuthUser |
| **Dependencies** | irebase/auth, ./firebase, ./capgoUpdater, ./permissions, ./activityLogger                                                |
| **Consumers**    | App.tsx (both apps), sync.ts                                                                                             |

#### firebase.ts — src/lib/firebase.ts

Firebase SDK initialization. Exports getFirebaseAuth, getFirestore, googleProvider, isFirebaseConfigured.

#### supabaseClient.ts — src/lib/supabaseClient.ts

Supabase JS client singleton. Exports getSupabaseClient.

#### permissions.ts — src/lib/permissions.ts

Firebase Firestore subscription profile listener. Exports syncProfileListener.

#### accountStatus.ts — src/lib/accountStatus.ts

Account lifecycle: active, pending-deletion, disabled states. Exports checkAccountStatus, scheduleAccountDeletion, cancelDeletion.

#### security.ts — src/lib/security.ts

secureReadLocal / secureWriteLocal — obfuscated localStorage wrappers.

---

### 6.7 Theme Engine

**Path:** src/lib/themeEngine.ts

| Field            | Detail                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Purpose**      | Applies CSS custom property tokens to document.documentElement based on user theme settings |
| **Key exports**  | pplyThemeTokens(settings), ThemeConfig interface                                            |
| **Dependencies** | @capacitor/core, useStatusBar.ts, useChordStore (ACCENT_COLORS)                             |
| **Consumers**    | startupCoordinator.ts, useChordStore subscription                                           |

Supports dark, light, system, dynamic (time-based) themes. Per-app visual overrides via settings.perApp[appMode]. AMOLED mode. Accent color mapped to CSS HSL variables.

#### liquidGlass.ts — src/lib/liquidGlass.ts

SVG-filter-based Liquid Glass effect for the bottom navigation bar. Port of shuding/liquid-glass with chromatic aberration extension. Exports LiquidGlassManager, ttachLiquidGlass, detachLiquidGlass.

#### useLiquidGlassNav.ts

React hook driving the Liquid Glass shine animation from scroll position. Exports useLiquidGlassNav.

---

### 6.8 Startup Coordinator

**Path:** src/lib/startupCoordinator.ts

| Field             | Detail                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**       | Orchestrates the 7-phase app boot sequence; tracks phase status; exposes reactive listener API                              |
| **Phases**        | 1. Native init → 2. Theme init → 3. Navigation init → 4. Updater init → 5. Hub init → 6. Background services → 7. Dev tools |
| **Key exports**   | StartupCoordinator (singleton), StartupPhase interface,                                                                     |
| otifyHubMounted() |
| **Dependencies**  | @capacitor/core, useChordStore, useStatusBar, hemeEngine, otaUpdate, ssetCache, capgoUpdater                                |
| **Consumers**     | App.tsx (both apps)                                                                                                         |

Implements a watchdog timer that fails the sequence if any phase stalls. Provides subscribe(listener) for UI progress indicators.
otifyHubMounted() is called by StudioHub after first render.

---

### 6.9 Dev Tools & Performance

#### devTools.ts — src/lib/devTools.ts

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Purpose**           | Runtime log registry; captures console output, navigation events, network requests, and errors into in-memory arrays |
| **Key exports**       | LogEntry, NavigationEntry, ErrorEntry, NetworkEntry, ddJsLog, ddNavEntry, getDevLogs, subscribeToDevLogs,            |
| avDiagnosticsRegistry |
| **Consumers**         | DevToolsDashboard.tsx, otaUpdate.ts, NavigationDispatcher.ts                                                         |

#### performanceProfiler.ts — src/lib/performanceProfiler.ts

| Field           | Detail                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**     | Real-time FPS measurement, frame-time variance, dropped frames, heap size, JS thread monitoring |
| **Key exports** | ProfilerMetrics, PerformanceWarning, startProfiler, stopProfiler, subscribeToMetrics            |
| **Consumers**   | DevToolsDashboard.tsx                                                                           |

---

### 6.10 Data Layer (static)

All files under src/data/ are **static, read-only** TypeScript data modules with no side effects.

| File               | Contents                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| chords.ts          | ~48 KB chord voicing database; Chord, Instrument, ChordType; getChordByName, |
| ormalizeChordName  |
| progressions.ts    | ~111 KB built-in chord progression library (English)                         |
| progressionsEs.ts  | ~32 KB built-in chord progression library (Spanish)                          |
| songs.ts           | SongChart, SongChartSection, ChordMarker types and built-in charts           |
| uthorizedChords.ts | AUTHORIZED_CHORD_CHARTS — authorized chord ID list                           |

#### chordService.ts

Normalizes raw chord charts into NormalizedChordChart format; fetches lyrics from lrclib.net; merges user and built-in data. Exports: NormalizedChordChart, etchChordChart,
ormalizeChart.

#### lyricsService.ts

lrclib.net API client. Exports etchLyricsOnline, LyricsResult.

---

## 7. UI Sub-Modules (ui-shared)

### 7.1 Panels

All panels live under packages/ui-shared/src/panels/. They are self-contained feature panels rendered inside StudioHub.tsx. Each panel imports state from @workspace/studio-core stores and renders independently with no cross-panel direct imports.

| Panel              | File               | Size    | Role                                                       |
| ------------------ | ------------------ | ------- | ---------------------------------------------------------- |
| **LibraryPanel**   | LibraryPanel.tsx   | ~91 KB  | Chord library search, browse, favorites                    |
| **ChordPanel**     | ChordPanel.tsx     | ~45 KB  | Active chord workspace: diagram, progression builder       |
| **SongsPanel**     | SongsPanel.tsx     | ~191 KB | Song management: list, detail, sections, chord charts      |
| **SettingsPanel**  | SettingsPanel.tsx  | ~29 KB  | App-wide settings: theme, language, sync, account          |
| **DrumEditor**     | DrumEditor.tsx     | ~338 KB | Full drum sequencer: step grid, mixer, patterns, transport |
| **DrumPrefsPanel** | DrumPrefsPanel.tsx | ~16 KB  | Drumex kit and audio preferences                           |

---

### 7.2 Vocalex Feature Module

**Path:** packages/ui-shared/src/vocalex/

Standalone vocal training and recording application embedded in the StudioHub.

| File                | Role                                                       |
| ------------------- | ---------------------------------------------------------- |
| VocalexApp.tsx      | App shell; tab routing between Pitch, Lab, Practice, Takes |
| PitchPanel.tsx      | Real-time pitch detection via pitchy library               |
| LabPanel.tsx        | Multi-layer recording session management                   |
| PracticePanel.tsx   | Guided vocal exercise practice                             |
| TakesPanel.tsx      | Recorded take browser and playback                         |
| HarmonizerSheet.tsx | Real-time vocal harmonizer controls                        |
| ocalAnalysis.ts     | Pitch analysis and frequency utilities                     |
| harmonyEngine.ts    | Harmony voice generation (pitch shift)                     |
| ocalSynth.ts        | Web Audio vocal synthesis                                  |
| pitchShift.ts       | Phase vocoder pitch shift                                  |
| pitchYin.ts         | YIN pitch detection algorithm                              |
| practiceDetector.ts | Exercise completion detection                              |
| exerciseData.ts     | Exercise catalogue (~38 KB)                                |
| oiceCoach.ts        | Feedback engine for practice results                       |
| headerBack.ts       | Back navigation utility                                    |

**Data persistence:** akesDb.ts and labSessionDb.ts in studio-core/src/vocalex/ (IndexedDB via Capacitor or Web API).

---

### 7.3 Groovex Feature Module

**Path:** packages/ui-shared/src/groovex/

Stem-player app for multi-track song playback with mute/solo per stem.

| File                   | Role                                                  |
| ---------------------- | ----------------------------------------------------- |
| GroovexApp.tsx         | App shell; screen routing                             |
| GroovexLibrary.tsx     | Song catalog browser                                  |
| GroovexPlayer.tsx      | Multi-stem player UI with transport controls (~45 KB) |
| GroovexPreferences.tsx | Groovex settings                                      |
| udioEngine.ts          | Web Audio API stem playback engine                    |
| songCatalog.ts         | Groovex song/stem metadata catalogue                  |
| stemCache.ts           | Stem audio file cache management                      |
| useGroovexStore.ts     | Zustand store for Groovex playback state              |

---

### 7.4 Shared Components Reference

| Component                     | File                                                  | Purpose                                                         |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| **StudioHub**                 | `components/StudioHub.tsx`                            | Master app shell; all modes and drill-down navigation           |
| **SharedNavigationContainer** | `navigation/SharedNavigationContainer.tsx` ⬅ Sprint B | CSS-animation panel switcher (no Framer dependency)             |
| **AppAnimationSystem**        | `navigation/AppAnimationSystem.tsx` ⬅ Sprint B        | Framer Motion presets, AnimationCoordinator, AppEntryTransition |
| **BottomNav**                 | `navigation/BottomNav.tsx` ⬅ Sprint B                 | Mobile bottom navigation with Liquid Glass effect               |
| **StudioLayoutSystem**        | `components/StudioLayoutSystem.tsx`                   | SettingsScaffold, SettingsSection, DrillDownLayout              |
| **SmartLoading**              | `components/SmartLoading.tsx`                         | Async gating with skeleton fallback and configurable delay      |
| **ErrorBoundary**             | `components/ErrorBoundary.tsx`                        | React error boundary with recovery dialog                       |
| **DevToolsDashboard**         | `components/DevToolsDashboard.tsx`                    | Developer overlay: logs, navigation, network, performance, OTA  |
| **UpdateIndicator**           | `components/UpdateIndicator.tsx`                      | Morphing update banner → pill → modal                           |
| **AccountCard**               | `components/AccountCard.tsx`                          | Full account management: profile, subscription, deletion        |
| **StudioDesignSystem**        | `components/StudioDesignSystem.tsx`                   | Design tokens, color palettes, button/card primitives           |
| **WebDesignSystem**           | `components/WebDesignSystem.tsx`                      | Web-specific WebToolbar, WebButton                              |
| **StudioSkeleton**            | `components/StudioSkeleton.tsx`                       | Skeleton loaders for each app mode                              |
| **StageCorePanel**            | `components/StageCorePanel.tsx`                       | StageX live chord display and stage mode UI                     |
| **SongPracticeView**          | `components/SongPracticeView.tsx`                     | Song chord chart practice view                                  |
| **CustomChordBuilder**        | `components/CustomChordBuilder.tsx`                   | Interactive custom chord diagram builder                        |
| **LiveMode**                  | `components/LiveMode.tsx`                             | Fullscreen live performance chord display                       |
| **ChordDiagram**              | `components/ChordDiagram.tsx`                         | Chord diagram router (guitar/piano/bass)                        |
| **GuitarDiagram**             | `components/GuitarDiagram.tsx`                        | SVG guitar fretboard chord diagram                              |
| **PianoDiagram**              | `components/PianoDiagram.tsx`                         | SVG piano key chord diagram                                     |
| **FourStringDiagram**         | `components/FourStringDiagram.tsx`                    | SVG bass/ukulele chord diagram                                  |

---

### 7.5 Navigation Module (ui-shared) — Sprint B

**Path:** `packages/ui-shared/src/navigation/`
**Entry point:** `packages/ui-shared/src/navigation/index.ts`

All navigation UI concerns are now co-located in this directory. The `index.ts` barrel re-exports all four items. The original `components/` paths are preserved as 1-line `export *` shims.

| File                            | Role                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`                      | Barrel — re-exports all navigation UI                                                                                                                                                            |
| `navStyles.ts`                  | `SHARED_NAV_TRANSITION`, `getSharedNavTransform`, `getSharedNavOpacity` — shared CSS transition/transform constants                                                                              |
| `SharedNavigationContainer.tsx` | CSS-animation panel switcher used in `App.tsx`; zero Framer Motion dependency                                                                                                                    |
| `AppAnimationSystem.tsx`        | Framer Motion presets (`DurationPresets`, `EasingPresets`), `AnimationCoordinator`, `useNavigationCoordinator`, `PageTransition`, `AppEntryTransition`, `StaggeredReveal`, `AnimatedAppHeader` |
| `BottomNav.tsx`                 | Mobile bottom navigation bar; reads `useNavigationStore`, `useNavHidden`, `useNavCollapsed`, `useLiquidGlassNav`; renders Liquid Glass pill on collapse                                          |

**Shims in `components/`:**

- `components/navStyles.ts` → `export * from '../navigation/navStyles'`
- `components/SharedNavigationContainer.tsx` → `export * from '../navigation/SharedNavigationContainer'`
- `components/AppAnimationSystem.tsx` → `export * from '../navigation/AppAnimationSystem'`
- `components/BottomNav.tsx` → `export * from '../navigation/BottomNav'`

**index.ts updated lines (Sprint B):**

- Line 6: `SharedNavigationContainer` now points to `'./navigation/SharedNavigationContainer'`
- Line 29: `AppAnimationSystem` now points to `'./navigation/AppAnimationSystem'`
- Line 71: `BottomNav` now points to `'./navigation/BottomNav'`

---

## 8. Platform Ownership Map

As defined in AGENTS.md §3:

| Scope                                          | Owned paths                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| **WEB**                                        | pps/studio-web/**, packages/ui-web/**                              |
| **APK**                                        | pps/studio-android/**, packages/ui-android/**                      |
| **SHARED**                                     | packages/studio-core/**, packages/ui-shared/**                     |
| **INFRASTRUCTURE**                             | .github/**,                                                        |
| etlify.toml, irebase.json, pnpm-workspace.yaml |
| **DOCUMENTATION**                              | ARCHITECTURE_INDEX.md, AGENTS.md, CHANGELOG.md, README.md, docs/** |
| **RELEASE**                                    | Version bumps in ppVersion.ts, APK signing scripts                 |

**Cross-scope import rules:**

- WEB must not import from APK-owned files.
- APK must not import from WEB-owned files.
- SHARED may be imported by any platform.
- lib/* is framework-agnostic; may be imported anywhere.
- Validate with: pnpm scope:check --platform web|apk|shared

---

## 9. Known Technical Debt

### High Priority

| Issue                      | Location                                                   | Impact                                                              |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| sync.ts is 2866 lines      | studio-core/src/lib/sync.ts                                | High — sync bug investigation requires reading the full file        |
| otaUpdate.ts is 2110 lines | studio-core/src/lib/otaUpdate.ts                           | High — updater modularization is incomplete                         |
| StudioHub.tsx is ~337 KB   | ui-shared/src/components/StudioHub.tsx                     | High — monolithic hub is single point of failure for all navigation |
| DrumEditor.tsx is ~338 KB  | ui-shared/src/panels/DrumEditor.tsx                        | High — entire sequencer UI in one file                              |
| drumAudio.ts is 2140 lines | studio-core/src/lib/drumAudio.ts                           | Medium — audio engine change requires reading the entire file       |
| App.tsx god component      | pps/studio-web/src/App.tsx, pps/studio-android/src/App.tsx | Medium — auth + routing + layout in one component                   |

### Medium Priority

| Issue                            | Location                                             | Impact                                                                                              |
| -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dual navigation patterns coexist | ui-shared/src/components/                            | Medium — AnimatePresence+PageTransition and SharedNavigationContainer coexist; migration incomplete |
| useChordStore is too broad       | studio-core/src/store/useChordStore.ts               | Medium — unrelated concerns cause unnecessary re-renders                                            |
| AccountCard.tsx is ~249 KB       | ui-shared/src/components/AccountCard.tsx             | Medium — complex feature with no internal module boundary                                           |
| DevToolsDashboard.tsx is ~183 KB | ui-shared/src/components/DevToolsDashboard.tsx       | Low-Medium — each tab should be a separate file                                                     |
| WebAppSectionDock duplication    | ui-shared/src/components/ and ui-web/src/components/ | Medium — canonical owner and canonical implementation unclear                                       |

### Low Priority

| Issue                                          | Location                               | Impact                                                       |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| ctivityLogger uses global window               | studio-core/src/lib/activityLogger.ts  | Low — not reactive, no subscribers                           |
| ui-android is a thin re-export facade          | packages/ui-android/                   | Low — package boundary may be unnecessary                    |
| Hardcoded server.url in Capacitor config       | pps/studio-android/capacitor.config.ts | Low — only affects dev builds                                |
| Manual routing without type-safe route library | pps/studio-web/src/App.tsx             | Low — no type-safe route generation                          |
| data/progressions.ts is 111 KB of static data  | studio-core/src/data/progressions.ts   | Low — could be lazily imported to reduce initial bundle size |

---

## 10. Startup Sequence

The app boot is orchestrated by `StartupCoordinator` (in `studio-core/src/lib/startupCoordinator.ts` → `startup/`).

### 7-Phase Boot Sequence

```
Phase 1: Native Init       → Capacitor platform detection, status bar, orientation
Phase 2: Theme Init         → applyThemeTokens(), AMOLED mode, accent color
Phase 3: Navigation Init    → Initialize navigation store, restore default route
Phase 4: Updater Init       → OTA version check, update eligibility
Phase 5: Hub Init           → StudioHub mount, LaunchAnimationEngine
Phase 6: Background Services → Sync engine, push notifications, asset preload
Phase 7: Dev Tools           → Performance profiler, dev overlay (if enabled)
```

### Key Files

- **Coordinator**: `studio-core/src/lib/startupCoordinator.ts` → `startup/`
- **Web entry**: `apps/studio-web/src/App.tsx` → calls `StartupCoordinator`
- **Android entry**: `apps/studio-android/src/App.tsx` → calls `StartupCoordinator`
- **Loading screen**: `ui-shared/src/components/SmartLoading.tsx`
- **Launch animation**: `ui-shared/src/components/launch/LaunchAnimationEngine.tsx`

The coordinator implements a watchdog timer that fails the sequence if any phase stalls. `notifyHubMounted()` is called by `StudioHub` after first render.

---

## 11. State Management Map

All state management uses **Zustand 5**. See [STATE_FLOW.md](STATE_FLOW.md) for detailed flow diagrams.

| Store | Location | Persisted | Scope |
|-------|----------|-----------|-------|
| `useChordStore` | `store/useChordStore.ts` | ✅ Encrypted localStorage | App settings, chord state, songs |
| `useDrumStore` | `store/useDrumStore.ts` | ✅ Encrypted localStorage | Drum patterns, kit, mixer |
| `useNavigationStore` | `lib/navigation/useNavigationStore.ts` | ❌ | Route history, transitions |
| `useSettingsStore` | `store/useSettingsStore.ts` | ✅ localStorage | Settings |
| `useBottomNavigationStore` | `lib/navigation/useBottomNavigationStore.ts` | ❌ | Nav visibility |
| `useApplicationTransitionStore` | `lib/navigation/useApplicationTransitionStore.ts` | ❌ | App switching |
| `useGroovexStore` | `ui-shared/features/groovex/useGroovexStore.ts` | ❌ | Playback state |
| `developerInspectorStore` | `lib/devtools/developerInspectorStore.ts` | ❌ | Dev tools |

---

## 12. Persistence Map

| Data | Storage Backend | Module |
|------|-----------------|--------|
| App settings (theme, language, prefs) | Encrypted localStorage | `useChordStore` → `secureWriteLocal` |
| Drum patterns & kit config | Encrypted localStorage | `useDrumStore` → `secureWriteLocal` |
| Settings | localStorage | `useSettingsStore` → persist |
| Vocalex recording takes | IndexedDB | `repositories/VocalexRepository.ts` |
| Groovex stem cache | IndexedDB / Capacitor Filesystem | `features/groovex/stemCache.ts` |
| Cloud sync data | Firestore / Supabase | `lib/sync/` + `lib/syncBackends/` |
| Native preferences | Capacitor Preferences API | `lib/nativePrefs.ts` |
| Downloaded APK cache | Capacitor Filesystem | `lib/updater/cacheManager.ts` |
| Update flight recorder | In-memory ring buffer | `lib/updater/flightRecorder.ts` |

---

## 13. Routing Map

Studio uses a **custom typed navigation system** — there is no React Router.

### Route Shape

```typescript
interface NavigationRoute {
  app: 'hub' | 'chords' | 'drums' | 'stage' | 'groovex' | 'vocalex';
  tab?: string;    // sub-tab within the app
  page?: string;   // specific page/view
  subView?: string; // nested sub-view
  id?: string;     // entity ID (song, chord, etc.)
  type?: string;   // entity type discriminator
}
```

### Navigation API

All navigation goes through `NavigationDispatcher` (static class):

```typescript
NavigationDispatcher.push(route)    // Push route onto stack
NavigationDispatcher.pop()          // Pop top route
NavigationDispatcher.replace(route) // Replace current route
NavigationDispatcher.popTo(fn)      // Pop back to matching route
NavigationDispatcher.reset(stack)   // Replace entire stack
```

### Route Resolution

1. `NavigationDispatcher.push(route)` is called
2. `validation.normalizeAndValidateRoute(route)` validates the route
3. `NavigationCoordinator.resolveDefaults(route)` fills in default tabs/pages
4. `lockTransition(transitionType)` sets a 300ms animation lock
5. `useNavigationStore.setState()` updates the history stack
6. `SharedNavigationContainer` re-renders the correct panel

### App ↔ Panel Mapping

| App Key | Root Panel | Sub-tabs defined in |
|---------|-----------|--------------------|
| `hub` | StudioHub main screen | — |
| `chords` | Chordex feature | `appRegistry.ts` → `APP_SECTIONS.chords` |
| `drums` | Drumex feature | `appRegistry.ts` → `APP_SECTIONS.drums` |
| `stage` | Stagex feature | `appRegistry.ts` → `APP_SECTIONS.stage` |
| `groovex` | Groovex feature | `appRegistry.ts` → `APP_SECTIONS.groovex` |
| `vocalex` | Vocalex feature | `appRegistry.ts` → `APP_SECTIONS.vocalex` |

---

_This document is auto-maintained. To update, re-run the architecture survey and regenerate. Do not make application code changes to satisfy this document._
