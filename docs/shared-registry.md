import { DurationPresets, EasingPresets, SpringPresets } from '@workspace/livex-core';
# Livex Shared Systems Registry

> **Lead Architect Document** · July 2026 · Version 4.2.4
> Classification: Permanent Source of Truth
> This document is the definitive inventory of every shared system in Livex.

---

## How to Use This Document

Before implementing **any** feature, search this registry. If a shared system exists for your use case, **you must use it**. Creating a parallel implementation is an architectural violation (see [Architectural Invariant](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/workflows/architectural-invariant.md)).

---

## Registry Summary

| #   | System                                                    | Package                    | Status               | Risk        |
| --- | --------------------------------------------------------- | -------------------------- | -------------------- | ----------- |
| 1   | [Navigation System](#1-navigation-system)                 | studio-core                | ✅ Unified           | 🟢 Low      |
| 2   | [Bottom Navigation](#2-bottom-navigation)                 | studio-core + ui-shared    | ✅ Mostly Unified    | 🟡 Medium   |
| 3   | [App Switcher](#3-app-switcher)                           | ui-shared                  | ✅ Mostly Unified    | 🟡 Medium   |
| 4   | [Transition Engine](#4-transition-engine)                 | studio-core + ui-shared    | ✅ Mostly Unified    | 🟡 Medium   |
| 5   | [Theme System](#5-theme-system)                           | studio-core + platform CSS | ⚠️ Partially Unified | 🔴 High     |
| 6   | [Design Token System](#6-design-token-system)             | studio-core                | ❌ Unadopted         | 🔴 Critical |
| 7   | [Motion System](#7-motion-system)                         | studio-core + ui-shared    | ❌ Fragmented        | 🔴 Critical |
| 8   | [Design System Components](#8-design-system-components)   | ui-shared                  | ⚠️ Partially Unified | 🔴 High     |
| 9   | [Settings & Preferences](#9-settings--preferences)        | studio-core                | ⚠️ Misnamed          | 🟡 Medium   |
| 10  | [Notification Service](#10-notification-service)          | studio-core                | ✅ Unified           | 🟢 Low      |
| 11  | [Sync Engine](#11-sync-engine)                            | studio-core                | ✅ Mostly Unified    | 🟡 Medium   |
| 12  | [Authentication](#12-authentication)                      | studio-core                | ✅ Unified           | 🟢 Low      |
| 13  | [Internationalization](#13-internationalization)          | studio-core                | ✅ Unified           | 🟢 Low      |
| 14  | [OTA Updater](#14-ota-updater)                            | studio-core                | ✅ Unified           | 🟢 Low      |
| 15  | [Startup Coordinator](#15-startup-coordinator)            | studio-core                | ✅ Unified           | 🟢 Low      |
| 16  | [Search Index](#16-search-index)                          | studio-core                | ❌ Stub              | 🟡 Medium   |
| 17  | [Audio Engines](#17-audio-engines)                        | studio-core                | ✅ Per-domain        | 🟢 Low      |
| 18  | [Shared UI Components](#18-shared-ui-components)          | ui-shared                  | ⚠️ Mixed             | 🟡 Medium   |
| 19  | [Layout System](#19-layout-system)                        | ui-shared                  | ✅ Unified           | 🟢 Low      |
| 20  | [Loading & Skeleton System](#20-loading--skeleton-system) | ui-shared                  | ⚠️ Per-app skeletons | 🟡 Medium   |
| 21  | [Security & Encryption](#21-security--encryption)         | studio-core                | ✅ Unified           | 🟢 Low      |
| 22  | [Performance Profiler](#22-performance-profiler)          | studio-core                | ✅ Unified           | 🟢 Low      |
| 23  | [DevTools](#23-devtools)                                  | studio-core + ui-shared    | ✅ Unified           | 🟢 Low      |

---

## Detailed Registry

---

### 1. Navigation System

| Attribute   | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Purpose** | Custom state-machine-based navigation system replacing React Router |
| **Owner**   | `packages/studio-core/src/lib/navigation/`                          |
| **Status**  | ✅ Unified                                                          |

**Official Files:**

| File                       | Lines | Role                                                         |
| -------------------------- | ----- | ------------------------------------------------------------ |
| `useNavigationStore.ts`    | ~200  | Zustand store: history, routes, back handlers, gesture state |
| `NavigationDispatcher.ts`  | ~150  | Imperative navigation API: `push()`, `replace()`, `goBack()` |
| `NavigationCoordinator.ts` | ~100  | Coordinates navigation with transitions                      |
| `BackDispatcher.ts`        | ~80   | Hardware/software back button handler                        |
| `GestureDispatcher.ts`     | ~60   | Swipe gesture navigation                                     |
| `TransitionCoordinator.ts` | ~80   | Transition orchestration                                     |
| `navigationTypes.ts`       | ~50   | Type definitions                                             |
| `useBackHandler.ts`        | ~40   | React hook for back handler registration                     |
| `validation.ts`            | ~30   | Route validation                                             |

**Consumers:** All 6 apps (Hub, Chordex, Drumex, Groovex, Stagex, Vocalex)

**Dependencies:** Zustand, `useChordStore` (for settings)

**Known Duplicates:**

- `packages/studio-core/src/store/useNavigationStore.ts` — legacy 3-line re-export shim → **should be deleted**

**Legacy:** The store re-export shim at `src/store/useNavigationStore.ts`

---

### 2. Bottom Navigation

| Attribute   | Value                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose** | Shared bottom navigation bar with animated capsule, app items, auto-hide                                                                               |
| **Owner**   | `packages/studio-core/src/lib/navigation/useBottomNavigationStore.ts` (state) + `packages/ui-shared/src/navigation/SharedNavigationBar.tsx` (renderer) |
| **Status**  | ✅ Mostly Unified                                                                                                                                      |

**Official Files:**

| File                             | Package     | Lines | Role                                                      |
| -------------------------------- | ----------- | ----- | --------------------------------------------------------- |
| `useBottomNavigationStore.ts`    | studio-core | 86    | State: items, visibility, isLight, motion state           |
| `SharedNavigationBar.tsx`        | ui-shared   | 512   | SVG capsule renderer, animation, app switcher integration |
| `BottomNavigationController.tsx` | ui-shared   | 55    | Lifecycle sync effects                                    |

**Consumers:** Drumex, Groovex, Stagex, Vocalex register items via `setItems()`. Hub does not (by design — no bottom nav in Hub). Chordex registration path unclear.

**Dependencies:** `useChordStore`, `useApplicationTransitionStore`, `motion/react`

**Known Issues:**

- Chordex does not appear to register via the standard `setItems()` pattern
- 9 different inline spring configurations in SharedNavigationBar (should use centralized tokens)
- Stagex has conditional visibility based on `liveMode`, landscape, and `hideBottomNav`

---

### 3. App Switcher

| Attribute   | Value                                                |
| ----------- | ---------------------------------------------------- |
| **Purpose** | Overlay for switching between Livex sub-applications |
| **Owner**   | Integrated into `SharedNavigationBar.tsx`            |
| **Status**  | ✅ Mostly Unified                                    |

**Official Files:** Part of `SharedNavigationBar.tsx` (the app switcher drawer is rendered inside the nav bar component)

**Consumers:** All apps (via SharedNavigationBar)

**Dependencies:** `useApplicationTransitionStore`, `useChordStore`, `ACCENT_COLORS`

**Known Issues:**

- Hardcoded to 6 apps — no dynamic app registry
- App list is duplicated in the switcher UI and in `studioAppNavigationRegistry.ts`

---

### 4. Transition Engine

| Attribute   | Value                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose** | State machine governing app-to-app transitions with safety watchdogs                                                                                                            |
| **Owner**   | `packages/studio-core/src/lib/navigation/useApplicationTransitionStore.ts` (state) + `packages/ui-shared/src/components/launch/ApplicationTransitionEngine.tsx` (visual engine) |
| **Status**  | ✅ Mostly Unified                                                                                                                                                               |

**Official Files:**

| File                               | Package     | Lines | Role                                                    |
| ---------------------------------- | ----------- | ----- | ------------------------------------------------------- |
| `useApplicationTransitionStore.ts` | studio-core | ~120  | FSM: idle → preparing → transitioning → complete        |
| `ApplicationTransitionEngine.tsx`  | ui-shared   | ~600  | Visual transition effects, dot animations, color blooms |
| `LaunchAnimationEngine.tsx`        | ui-shared   | ~200  | App launch splash animations                            |

**Consumers:** All app transitions flow through this system

**Dependencies:** `useBottomNavigationStore`, `useChordStore`, `useNavigationStore`, `motion/react`

**Known Issues:**

- 5 different inline spring configurations in `ApplicationTransitionEngine.tsx`
- `LaunchAnimationEngine.tsx` has its own spring config (`{380, 26}`)

---

### 5. Theme System

| Attribute   | Value                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose** | Light/dark theme, accent colors, AMOLED mode, View Transitions API                                                                                          |
| **Owner**   | `packages/studio-core/src/lib/themeTransitionEngine.ts` (transitions) + `packages/studio-core/src/lib/themeEngine.ts` (state) + platform CSS files (tokens) |
| **Status**  | ⚠️ Partially Unified                                                                                                                                        |

**Official Files:**

| File                                | Package        | Role                                          |
| ----------------------------------- | -------------- | --------------------------------------------- |
| `themeTransitionEngine.ts`          | studio-core    | View Transitions API wrapper, chromatic bloom |
| `themeEngine.ts`                    | studio-core    | Theme state management                        |
| `apps/studio-android/src/index.css` | studio-android | CSS custom properties (1,673 lines)           |
| `apps/studio-web/src/index.css`     | studio-web     | CSS custom properties (1,808 lines)           |

**Consumers:** All apps consume CSS custom properties. Stagex requires manual iframe injection.

**Known Duplicates / Issues:**

- **Platform CSS divergence:** Android CSS (1,673 lines) vs Web CSS (1,808 lines) — 135-line gap, no shared base
- **Stagex iframe bypass:** 4 manual injection functions (`injectTheme`, `injectAccentVars`, `injectAmoled`, `injectStartOnPicker`)
- **WebDesignSystem bypass:** Hardcoded colors (`#050505`, `#f2f1ef`) ignoring CSS variables
- **No shared CSS file:** Tokens are defined independently per platform

---

### 6. Design Token System

| Attribute   | Value                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------- |
| **Purpose** | Centralized color, typography, spacing, radius, blur, shadow, glass, motion, spring, haptic tokens |
| **Owner**   | `packages/studio-core/src/lib/designTokens.ts`                                                     |
| **Status**  | ❌ Unadopted — exported but imported by zero feature modules                                       |

**Official File:** `designTokens.ts` (90 lines)

**Tokens Defined:**

- `ColorTokens` — accent, dark/light surfaces, borders, glass
- `TypographyTokens` — fonts
- `SpacingTokens` — xs through xxl + bottomNavSafe
- `RadiusTokens` — xs through full
- `BlurTokens` — nav, glass
- `ShadowTokens` — nav, card
- `GlassTokens` — border, background, backdrop, shadow
- `MotionTokens` — durations, easings
- `SpringPresets` — soft, stiff, expressive
- `HapticTokens` — tap, drag, hold

**Consumers:** ❌ **Zero feature modules import this file**

**Known Duplicates:**

- `AppAnimationSystem.tsx` SpringPresets — different values from `designTokens.ts` SpringPresets
- `AppAnimationSystem.tsx` DurationPresets — different values from `designTokens.ts` MotionTokens
- `AppAnimationSystem.tsx` EasingPresets — parallel easing definitions
- 17+ inline spring configurations across 10+ components
- 270+ hardcoded hex colors across feature modules

**⚠️ THIS IS THE CANONICAL TOKEN FILE. All alternatives must be consolidated here.**

---

### 7. Motion System

| Attribute   | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| **Purpose** | Centralized animation parameters: springs, easings, durations |
| **Owner**   | **DISPUTED** — two competing systems                          |
| **Status**  | ❌ Fragmented                                                 |

**Competing Implementations:**

| System                                  | File        | Springs                | Status          |
| --------------------------------------- | ----------- | ---------------------- | --------------- |
| `designTokens.ts` SpringPresets         | studio-core | soft: `{380, 22, 0.5}` | ❌ Zero imports |
| `AppAnimationSystem.tsx` SpringPresets | ui-shared   | soft: `{150, 25, 1.0}` | ⚠️ Some imports |

**⚠️ DECISION REQUIRED:** Merge into `designTokens.ts` (the canonical location in studio-core). Delete `SpringPresets` from `AppAnimationSystem.tsx`. Replace all 17+ inline configs.

---

### 8. Design System Components

| Attribute   | Value                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| **Purpose** | Shared UI primitives: Button, Card, Dialog, Sheet, Header, SearchBar, etc. |
| **Owner**   | `packages/ui-shared/src/components/design-system/StudioDesignSystem.tsx`   |
| **Status**  | ⚠️ Partially Unified — parallel WebDesignSystem exists                     |

**Official Components (StudioDesignSystem.tsx, 818 lines):**

| Component        | Export             | Description           |
| ---------------- | ------------------ | --------------------- |
| `Button`         | `React.forwardRef` | Primary action button |
| `Card`           | function           | Surface container     |
| `Dialog`         | function           | Modal dialog          |
| `Sheet`          | function           | Bottom sheet          |
| `SearchBar`      | `React.forwardRef` | Search input          |
| `Header`         | function           | Section header        |
| `FloatingButton` | function           | FAB                   |
| `Skeleton`       | function           | Loading placeholder   |
| `Loading`        | function           | Full-screen loading   |

**Parallel System (WebDesignSystem.tsx):**

| Component          | Export   | Issue                                     |
| ------------------ | -------- | ----------------------------------------- |
| `WebCard`          | function | Duplicates `Card` with hardcoded colors   |
| `WebButton`        | function | Duplicates `Button` with hardcoded styles |
| `WebToolbarButton` | function | No mobile equivalent                      |
| `WebIconButton`    | function | No mobile equivalent                      |
| `WebSectionHeader` | function | Duplicates `Header`                       |
| `WebAppShell`      | function | Hardcoded `#050505`, `#f2f1ef`            |

**Additional Components (ActionButton.tsx):** `ActionButton` — animated border trail button (184 lines, own spring config `{350, 18, 0.8}`)

**⚠️ WebDesignSystem should be merged into StudioDesignSystem as responsive variants.**

---

### 9. Settings & Preferences

| Attribute   | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| **Purpose** | Global app settings: theme, accent color, language, per-app preferences, last session |
| **Owner**   | `packages/studio-core/src/store/useChordStore.ts`                                     |
| **Status**  | ⚠️ Misnamed — should be `useSettingsStore`                                            |

**What Lives in useChordStore.settings:**

- `theme` (light/dark/system)
- `accentColor` (blue/purple/pink/green/yellow)
- `language` (en/es)
- `amoled` (boolean)
- `perApp` (per-app accent overrides)
- `defaultStageView`
- `lastSession` (drumexTab, etc.)

**Consumers:** All 6 apps import `useChordStore` for settings access

**Known Issues:**

- Store name `useChordStore` implies Chordex ownership — misleading
- Contains both chord-specific data (chords, songs, custom chords) AND global settings — two concerns in one store
- Per-app settings nested inconsistently under `settings.perApp`

**⚠️ RENAME RECOMMENDED:** Split into `useSettingsStore` (global) + `useChordStore` (chord data only)

---

### 10. Notification Service

| Attribute   | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| **Purpose** | In-app notification store, event publishers, persistence, timeline UI |
| **Owner**   | `packages/studio-core/src/lib/notifications/NotificationService.ts`   |
| **Status**  | ✅ Unified                                                            |

**Public API:** `useNotificationService` — `publish()`, `dismiss()`, `clearAll()`, timeline selectors

**Consumers:** OTA updater, auth, sync, Hub UI

**Dependencies:** `secureWriteLocal` (encrypted persistence)

---

### 11. Sync Engine

| Attribute   | Value                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| **Purpose** | Cloud synchronization: Firestore persistence, per-app strategy, conflict resolution |
| **Owner**   | `packages/studio-core/src/lib/sync.ts` + `syncEngine.ts`                            |
| **Status**  | ✅ Mostly Unified                                                                   |

**Consumers:** All data stores (chords, drums, settings, songs)

**Known Issues:**

- Stagex sync via `postMessage` to iframe (fragile bridge)
- Vocalex audio blobs use IndexedDB separately (by design — binary data)
- `syncEngine.ts` and `sync.ts` — verify no overlap

---

### 12. Authentication

| Attribute   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| **Purpose** | Firebase Authentication, account status, profile, security                  |
| **Owner**   | `packages/studio-core/src/lib/auth.ts` + `accountStatus.ts` + `security.ts` |
| **Status**  | ✅ Unified                                                                  |

---

### 13. Internationalization

| Attribute   | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Purpose** | Multi-language support (English, Spanish)                           |
| **Owner**   | `packages/studio-core/src/lib/i18n.ts` + `i18nSetup.ts` + `useT.ts` |
| **Status**  | ✅ Unified                                                          |

**Public API:** `useT()` hook returns translation function. All apps import from `@workspace/livex-core`.

---

### 14. OTA Updater

| Attribute   | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| **Purpose** | Over-the-air update pipeline: check → download → verify → install |
| **Owner**   | `packages/studio-core/src/lib/updater/` (8 files)                 |
| **Status**  | ✅ Unified                                                        |

**Files:** `stateMachine.ts`, `pipeline.ts`, `installActions.ts`, `recovery.ts`, `diagnostics.ts`, `flightRecorder.ts`, `cacheManager.ts`, `versionLogger.ts`

---

### 15. Startup Coordinator

| Attribute   | Value                                                        |
| ----------- | ------------------------------------------------------------ |
| **Purpose** | Orchestrates app initialization: auth → data load → UI ready |
| **Owner**   | `packages/studio-core/src/lib/startupCoordinator.ts`         |
| **Status**  | ✅ Unified                                                   |

---

### 16. Search Index

| Attribute   | Value                                                    |
| ----------- | -------------------------------------------------------- |
| **Purpose** | Centralized search registration                          |
| **Owner**   | `packages/studio-core/src/lib/navigation/searchIndex.ts` |
| **Status**  | ❌ Stub — minimal implementation, no cross-app search    |

**Known Issues:**

- Each app implements its own local search (Chordex SearchBar, Groovex `searchQuery` in local store, Drumex library filters)
- No unified cross-app search experience

---

### 17. Audio Engines

| Attribute   | Value                                                     |
| ----------- | --------------------------------------------------------- |
| **Purpose** | Domain-specific audio synthesis and playback              |
| **Owner**   | `packages/studio-core/src/lib/`                           |
| **Status**  | ✅ Per-domain (expected — each engine is domain-specific) |

| Engine                   | File        | Domain                     |
| ------------------------ | ----------- | -------------------------- |
| `guitarAudio.ts`         | studio-core | Guitar chord playback      |
| `drumAudio.ts`           | studio-core | Drum synthesis, reverb     |
| `drumPlugins.ts`         | studio-core | Drum effect plugins        |
| `audioContextOptions.ts` | studio-core | Shared AudioContext config |

---

### 18. Shared UI Components

| Attribute   | Value                                  |
| ----------- | -------------------------------------- |
| **Purpose** | Reusable UI components across all apps |
| **Owner**   | `packages/ui-shared/src/components/`   |
| **Status**  | ⚠️ Mixed — some shared, some per-app   |

**Fully Shared:**

- `ErrorBoundary`, `AppSpinner`, `SmartLoading`, `ElasticSlider`
- `StudioProgressBar`, `StudioCountUpPercentage`, `StudioTitleReveal`
- `ScrollFade`, `ProgressiveBlur`
- `ChordDiagram`, `PianoDiagram`, `GuitarDiagram`, `FourStringDiagram`
- `AccountCard`, `StudioAuthCard`, `StudioPricingSection`
- `SettingControls` (Toggle, SectionHeader, BentoSettingCard, etc.)
- Lottie animations (8 components)

**Per-App Skeletons:**

- `StudioHubSkeleton`, `DrumEditorSkeleton`, `ChordexPanelSkeleton`
- `GroovexAppSkeleton`, `StagexPanelSkeleton`, `VocalexTakesSkeleton`, `GroovexMixerSkeleton`

---

### 19. Layout System

| Attribute   | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| **Purpose** | App scaffolding, content areas, dialog scaffolds                  |
| **Owner**   | `packages/ui-shared/src/components/layout/StudioLayoutSystem.tsx` |
| **Status**  | ✅ Unified                                                        |

**Exports:** `AppContent`, `ContentArea`, `DialogScaffold`, various layout primitives

---

### 20. Loading & Skeleton System

| Attribute   | Value                                                  |
| ----------- | ------------------------------------------------------ |
| **Purpose** | Loading states and shimmer placeholders                |
| **Owner**   | `packages/ui-shared/src/components/loading/`           |
| **Status**  | ⚠️ Per-app skeletons exist alongside shared primitives |

**Shared Primitives:** `StudioSkeletonCard`, `StudioSkeletonRow`, `StudioSkeletonList`, `StudioSkeletonGrid`, `StudioSkeletonHeader`, `StudioSkeletonProfile`

**Per-App Skeletons:** 7 app-specific skeletons (see #18)

---

### 21. Security & Encryption

| Attribute   | Value                                      |
| ----------- | ------------------------------------------ |
| **Purpose** | Encrypted localStorage, secure write/read  |
| **Owner**   | `packages/studio-core/src/lib/security.ts` |
| **Status**  | ✅ Unified                                 |

**Public API:** `secureWriteLocal()`, `secureReadLocal()`, `secureDeleteLocal()`

---

### 22. Performance Profiler

| Attribute   | Value                                                 |
| ----------- | ----------------------------------------------------- |
| **Purpose** | Runtime performance metrics, render timing            |
| **Owner**   | `packages/studio-core/src/lib/performanceProfiler.ts` |
| **Status**  | ✅ Unified                                            |

---

### 23. DevTools

| Attribute   | Value                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose** | Developer tools dashboard, debug providers                                                                                          |
| **Owner**   | `packages/studio-core/src/lib/devTools.ts` (registration) + `packages/ui-shared/src/components/devtools/DevToolsDashboard.tsx` (UI) |
| **Status**  | ✅ Unified                                                                                                                          |

**Public API:** `registerDebugProvider()`, `unregisterDebugProvider()` — all apps register their debug data

---

## Store Inventory

| Store                           | Package          | Persistence  | Scope                        | Notes                         |
| ------------------------------- | ---------------- | ------------ | ---------------------------- | ----------------------------- |
| `useChordStore`                 | studio-core      | ✅ Encrypted | Global settings + chord data | ⚠️ Should split settings out  |
| `useDrumStore`                  | studio-core      | ✅ Encrypted | Drum patterns, instruments   | ✅ Correct                    |
| `useNavigationStore`            | studio-core      | ✅ Encrypted | Routes, history, gestures    | ✅ Correct                    |
| `useBottomNavigationStore`      | studio-core      | ❌           | Nav items, visibility        | ✅ Correct                    |
| `useApplicationTransitionStore` | studio-core      | ❌           | Transition FSM               | ✅ Correct                    |
| `useNotificationService`        | studio-core      | ✅ Encrypted | Notifications                | ✅ Correct                    |
| `useGroovexStore`               | **ui-shared** ⚠️ | ❌           | Groovex state                | ⚠️ Should move to studio-core |

**Duplicate Export Paths:**

- `studio-core/src/store/useNavigationStore.ts` — re-export shim → **delete**
- `ui-shared/src/groovex/useGroovexStore.ts` — re-export shim → **delete after move**

---

## Hook Inventory

| Hook                   | Package                  | Purpose                          |
| ---------------------- | ------------------------ | -------------------------------- |
| `useShallow`           | Re-exported from zustand | Shallow comparison for selectors |
| `useIsWebDesktop`      | studio-core              | Platform detection               |
| `useStudioPreferences` | studio-core              | Preference state                 |
| `useStudioShortcuts`   | studio-core              | Keyboard shortcuts               |
| `useBackHandler`       | studio-core              | Register back button handler     |
| `useScrollHide`        | studio-core              | Scroll-based bottom nav hide     |
| `useLiquidGlassNav`    | studio-core              | iOS Liquid Glass nav effect      |
| `useNavCollapsed`      | studio-core              | Nav collapse state               |
| `useNavHidden`         | studio-core              | Nav hidden state                 |
| `useT`                 | studio-core              | i18n translation                 |
| `useStatusBar`         | studio-core              | Android status bar color         |
| `useAppUpdate`         | studio-core              | OTA update state                 |

---

## Service / Utility Inventory

| Service                                | Package     | Purpose                  |
| -------------------------------------- | ----------- | ------------------------ |
| `NavigationDispatcher`                 | studio-core | Imperative nav API       |
| `BackDispatcher`                       | studio-core | Back button dispatch     |
| `GestureDispatcher`                    | studio-core | Swipe gestures           |
| `TransitionCoordinator`                | studio-core | Transition orchestration |
| `startupCoordinator`                   | studio-core | App initialization       |
| `themeTransitionEngine`                | studio-core | View Transitions         |
| `secureWriteLocal` / `secureReadLocal` | studio-core | Encrypted persistence    |
| `sync` / `syncEngine`                  | studio-core | Cloud sync               |
| `auth`                                 | studio-core | Authentication           |
| `firebase`                             | studio-core | Firebase config          |
| `performanceProfiler`                  | studio-core | Performance metrics      |
| `devTools`                             | studio-core | Debug registration       |
| `activityLogger`                       | studio-core | User activity logging    |
| `lyricsService`                        | studio-core | Lyrics lookup            |
| `chordService`                         | studio-core | Chord data service       |
| `userAvatar`                           | studio-core | Avatar management        |

---

## Context / Provider Inventory

| Context           | Package   | Purpose              |
| ----------------- | --------- | -------------------- |
| `ProgressContext` | ui-shared | Progress bar theming |
| `SidebarContext`  | ui-web    | Web sidebar state    |

> **Note:** Livex uses Zustand stores (global state) rather than React Context for most shared state. Only 2 React Contexts exist in production code.

---

> _This document must be updated whenever a new shared system is created or an existing one is modified._
> _Last updated: July 2026_
