import { SpringPresets } from '@workspace/livex-core';
# Livex Dependency Graph

> **Principal Architect Document** · July 2026 · Version 4.2.4
> Classification: Permanent Architecture Document

---

## 1. Package Dependency Graph

```mermaid
graph TD
    subgraph "Applications"
        WEB["apps/studio-web"]
        AND["apps/studio-android"]
    end

    subgraph "Platform UI Packages"
        UIW["packages/ui-web"]
        UIA["packages/ui-android"]
    end

    subgraph "Shared Packages"
        UIS["packages/ui-shared"]
        CORE["packages/studio-core"]
    end

    subgraph "Library Packages"
        DB["lib/db"]
        API["lib/api-client-react"]
        ZOD["lib/api-zod"]
    end

    WEB --> UIW
    WEB --> UIS
    WEB --> CORE
    AND --> UIA
    AND --> UIS
    AND --> CORE
    UIW --> UIS
    UIA --> UIS
    UIS --> CORE
    CORE --> DB
    CORE --> API
    API --> ZOD

    style CORE fill:#4ade80
    style UIS fill:#60a5fa
    style WEB fill:#c084fc
    style AND fill:#c084fc
    style UIW fill:#f97316
    style UIA fill:#f97316
```

### Package Boundary Rules (Enforced in CI)

| Package                | Can Import From                          | Cannot Import From        |
| ---------------------- | ---------------------------------------- | ------------------------- |
| `studio-core`          | `lib/db`, `lib/api-*`, external deps     | ❌ Any UI package         |
| `ui-shared`            | `studio-core`, external deps             | ❌ `ui-web`, `ui-android` |
| `ui-web`               | `ui-shared`, `studio-core`               | ❌ `ui-android`           |
| `ui-android`           | `ui-shared`, `studio-core`               | ❌ `ui-web`               |
| `studio-web` (app)     | `ui-web`, `ui-shared`, `studio-core`     | ❌ `ui-android`           |
| `studio-android` (app) | `ui-android`, `ui-shared`, `studio-core` | ❌ `ui-web`               |

---

## 2. Navigation System Dependency Graph

```mermaid
graph TD
    subgraph "studio-core/lib/navigation/"
        NS[useNavigationStore]
        ATS[useApplicationTransitionStore]
        BNS[useBottomNavigationStore]
        ND[NavigationDispatcher]
        NC[NavigationCoordinator]
        BD[BackDispatcher]
        GD[GestureDispatcher]
        TC[TransitionCoordinator]
        BH[useBackHandler]
        NT[navigationTypes]
        VAL[validation]
        SI[searchIndex]
    end

    subgraph "ui-shared/navigation/"
        SNC[SharedNavigationContainer]
        SNB[SharedNavigationBar]
        BNC[BottomNavigationController]
        AAS[AppAnimationSystem]
    end

    subgraph "ui-shared/components/launch/"
        ATE[ApplicationTransitionEngine]
        LAE[LaunchAnimationEngine]
    end

    subgraph "studio-core/store/"
        CS[useChordStore]
    end

    %% Core internal dependencies
    ND --> NS
    NC --> NS
    NC --> ATS
    BD --> NS
    BD --> BH
    GD --> NS
    TC --> ATS
    TC --> NS

    %% UI → Core
    SNC --> NS
    SNB --> BNS
    SNB --> ATS
    SNB --> CS
    BNC --> BNS
    AAS --> CS

    %% Launch → Core
    ATE --> ATS
    ATE --> BNS
    LAE --> CS

    style NS fill:#4ade80
    style ATS fill:#4ade80
    style BNS fill:#4ade80
    style CS fill:#facc15
```

### Navigation Initialization Order

```
1. App.tsx mounts
2. startupCoordinator.start()
3. useNavigationStore initialized (Zustand, lazy)
4. useApplicationTransitionStore initialized (Zustand, lazy)
5. useBottomNavigationStore initialized (Zustand, lazy)
6. SharedNavigationContainer renders
7. SharedNavigationBar renders
8. BottomNavigationController mounts (sync effects)
9. Current app mounts
10. App calls useBottomNavigationStore.setItems(...)
```

### Navigation Consumer Map

| System                              | Hub | Chordex | Drumex | Groovex | Stagex | Vocalex |
| ----------------------------------- | --- | ------- | ------ | ------- | ------ | ------- |
| `useNavigationStore`                | ✅  | ✅      | ✅     | ✅      | ✅     | ✅      |
| `NavigationDispatcher`              | —   | ✅      | ✅     | ✅      | ❌     | ✅      |
| `useBackHandler`                    | ✅  | ✅      | ✅     | ✅      | ✅     | ✅      |
| `useBottomNavigationStore.setItems` | ❌  | ❓      | ✅     | ✅      | ✅     | ✅      |
| `useScrollHide`                     | —   | ✅      | ❌     | ❌      | ✅     | ✅      |

---

## 3. Theme System Dependency Graph

```mermaid
graph TD
    subgraph "studio-core"
        TE[themeEngine.ts]
        TTE[themeTransitionEngine.ts]
        CS[useChordStore<br/>settings.theme]
        DT[designTokens.ts<br/>ColorTokens]
    end

    subgraph "Platform CSS"
        ACSS["android/index.css<br/>1,673 lines<br/>--c-* properties"]
        WCSS["web/index.css<br/>1,808 lines<br/>--c-* properties"]
    end

    subgraph "ui-shared"
        TTG[StudioThemeToggler]
        ITT[InkThemeToggle]
        ITO[InkThemeOverlay]
    end

    subgraph "Stagex iframe"
        SIF["stage-core/app.css<br/>118 KB"]
        INJ["injectTheme()<br/>injectAccentVars()<br/>injectAmoled()"]
    end

    TE --> CS
    TTE --> TE
    TTG --> TTE
    ITT --> CS
    ITO --> TTE

    INJ -.->|manual DOM manipulation| SIF

    ACSS -.->|defines tokens for| TE
    WCSS -.->|defines tokens for| TE
    DT -.->|NOT consumed by| TE

    style DT fill:#ef4444,color:#fff
    style SIF fill:#ef4444,color:#fff
    style INJ fill:#ef4444,color:#fff
```

> 🔴 **Red nodes** indicate fragmentation points: `designTokens.ts` is unused, Stagex iframe has its own CSS with manual injection.

---

## 4. State Management Dependency Graph

```mermaid
graph TD
    subgraph "studio-core (Correct Location)"
        CS[useChordStore]
        DS[useDrumStore]
        NS[useNavigationStore]
        BNS[useBottomNavigationStore]
        ATS[useApplicationTransitionStore]
        NTS[useNotificationService]
    end

    subgraph "ui-shared (WRONG Location)"
        GS[useGroovexStore]
    end

    subgraph "Feature Modules"
        HUB[StudioHub]
        CHD[ChordPanel]
        DRM[DrumEditor]
        GRX[GroovexApp]
        STG[StageCorePanel]
        VOX[VocalexApp]
    end

    HUB --> CS & NS & NTS
    CHD --> CS & NS
    DRM --> CS & NS & DS & BNS
    GRX --> CS & NS & BNS & GS
    STG --> CS & NS & BNS
    VOX --> CS & NS & BNS

    style GS fill:#ef4444,color:#fff
```

> 🔴 `useGroovexStore` lives in `ui-shared` instead of `studio-core`.

### Store Cross-Dependencies

```mermaid
graph LR
    CS[useChordStore] -->|read by| NS[useNavigationStore]
    CS -->|read by| BNS[useBottomNavigationStore]
    CS -->|read by| ATS[useApplicationTransitionStore]
    ATS -->|coordinates with| BNS
    ATS -->|coordinates with| NS

    style CS fill:#facc15
```

> ⚠️ `useChordStore` is the hub of all cross-store reads because it contains global settings. Renaming to `useSettingsStore` would clarify this graph.

---

## 5. Shared Component Dependency Graph

```mermaid
graph TD
    subgraph "Design System Layer"
        SDS["StudioDesignSystem.tsx<br/>Button, Card, Dialog,<br/>Sheet, SearchBar,<br/>Header, FloatingButton,<br/>Skeleton, Loading"]
        WDS["WebDesignSystem.tsx<br/>WebCard, WebButton,<br/>WebToolbarButton,<br/>WebIconButton,<br/>WebSectionHeader,<br/>WebAppShell"]
        AB["ActionButton.tsx<br/>AnimatedActionButton"]
        PB["ProgressiveBlur.tsx"]
    end

    subgraph "Utility Components"
        SC["SettingControls.tsx<br/>Toggle, SectionHeader,<br/>BentoSettingCard"]
        SK["StudioSkeleton.tsx<br/>7 per-app skeletons"]
        SL["StudioLayoutSystem.tsx<br/>AppContent, DialogScaffold"]
    end

    subgraph "Animation Components"
        LAE["LaunchAnimationEngine"]
        ATE["ApplicationTransitionEngine"]
        AAS["AppAnimationSystem<br/>AnimatedAppHeader,<br/>AnimatedAppPanel"]
    end

    subgraph "Feature Modules"
        HUB[StudioHub]
        CHD[ChordPanel]
        DRM[DrumEditor]
        GRX[GroovexApp]
        STG[StageCorePanel]
        VOX[VocalexApp]
    end

    HUB --> SDS & SC & SK
    CHD --> SDS & SC
    DRM --> SDS & SC & SK
    GRX --> SDS & SC & SK & WDS
    STG --> SDS & WDS
    VOX --> SDS & SC & SK

    style WDS fill:#ef4444,color:#fff
```

> 🔴 `WebDesignSystem` is a parallel system that should be merged into `StudioDesignSystem`.

---

## 6. Motion / Animation Dependency Graph

```mermaid
graph TD
    subgraph "Token Sources (CONFLICTING)"
        DT["designTokens.ts<br/>SpringPresets<br/>soft: {380,22,0.5}<br/>stiff: {500,25,0.4}<br/>expressive: {400,20,0.35}"]
        AAS["AppAnimationSystem.tsx<br/>SpringPresets<br/>soft: {150,25,1.0}<br/>medium: {220,22,0.85}<br/>expressive: {320,18,0.70}"]
    end

    subgraph "Inline Configs (NO IMPORTS)"
        SNB["SharedNavigationBar<br/>9 inline springs"]
        ATE["ApplicationTransitionEngine<br/>5 inline springs"]
        HUB["StudioHub<br/>GOOEY_SPRING {550,33,0.45}<br/>+ 2 inline springs"]
        ABT["ActionButton<br/>{350,18,0.8}"]
        WDK["WebAppSectionDock<br/>{160,15,0.1}"]
        SC["SettingControls<br/>{300,24,0.8} + {380,30}"]
        SPB["StudioProgressBar<br/>{100,30}"]
        LAE["LaunchAnimationEngine<br/>{380,26}"]
    end

    DT -.->|ZERO IMPORTS| SNB
    AAS -.->|ZERO IMPORTS| SNB

    style DT fill:#ef4444,color:#fff
    style AAS fill:#ef4444,color:#fff
```

> 🔴 **Every animation component defines its own spring values. Neither token source is consumed.**

---

## 7. Platform Entry Point Graph

```mermaid
graph TD
    subgraph "Android Entry"
        AM["main.tsx"] --> AA["App.tsx"]
        AA --> SNC["SharedNavigationContainer"]
        AA --> SNB["SharedNavigationBar"]
        AA --> BNC["BottomNavigationController"]
        AA --> ATE["ApplicationTransitionEngine"]
        AA --> LAE["LaunchAnimationEngine"]
        AA --> HUB["StudioHub"]
        AA --> CHD["ChordPanel"]
        AA --> DRM["DrumEditor"]
        AA --> GRX["GroovexApp"]
        AA --> STG["StageCorePanel (ui-android)"]
        AA --> VOX["VocalexApp"]
    end

    subgraph "Web Entry"
        WM["main.tsx"] --> WA["App.tsx"]
        WA --> WSL["WebSidebarLayout"]
        WA --> SNC2["SharedNavigationContainer"]
        WA --> HUB2["StudioHub"]
        WA --> CHD2["ChordPanel"]
        WA --> DRM2["DrumEditor"]
        WA --> GRX2["GroovexApp"]
        WA --> STG2["StageCorePanel (ui-shared)"]
        WA --> VOX2["VocalexApp"]
    end

    style STG fill:#ef4444,color:#fff
    style STG2 fill:#4ade80
```

> 🔴 Android uses `StageCorePanel` from `ui-android` (2,799 lines) while Web uses the version from `ui-shared` (2,358 lines). Two separate implementations.

---

## 8. Dead Dependencies

| Dependency                           | Defined In  | Imported By   | Status         |
| ------------------------------------ | ----------- | ------------- | -------------- |
| `designTokens.ts` `SpringPresets`    | studio-core | ❌ Nothing    | 🔴 Dead        |
| `designTokens.ts` `ColorTokens`      | studio-core | ❌ Nothing    | 🔴 Dead        |
| `designTokens.ts` `MotionTokens`     | studio-core | ❌ Nothing    | 🔴 Dead        |
| `designTokens.ts` `TypographyTokens` | studio-core | ❌ Nothing    | 🔴 Dead        |
| `designTokens.ts` `SpacingTokens`    | studio-core | ❌ Nothing    | 🔴 Dead        |
| `designTokens.ts` `HapticTokens`     | studio-core | ❌ Nothing    | 🔴 Dead        |
| `store/useNavigationStore.ts` (shim) | studio-core | Via re-export | ⚠️ Legacy shim |

> **Total dead token exports: 7 out of 9 token objects** — the design token system is 78% dead code at the export level.

---

## 9. Duplicate Dependency Paths

| Component            | Path 1                                                | Path 2                                           | Issue            |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------ | ---------------- |
| `useNavigationStore` | `studio-core/lib/navigation/useNavigationStore.ts`    | `studio-core/store/useNavigationStore.ts` (shim) | Legacy re-export |
| `useGroovexStore`    | `ui-shared/features/groovex/state/useGroovexStore.ts` | `ui-shared/groovex/useGroovexStore.ts` (shim)    | Duplicate path   |
| `StageCorePanel`     | `ui-shared/features/stagex/pages/StageCorePanel.tsx`  | `ui-android/components/StageCorePanel.tsx`       | Platform fork    |
| `WebAppSectionDock`  | `ui-shared/components/feature/WebAppSectionDock.tsx`  | `ui-web/components/WebAppSectionDock.tsx`        | Two files        |

---

## 10. Circular Dependencies

No circular import dependencies detected at the package level. The dependency graph is strictly:

```
studio-core → (no UI deps)
ui-shared → studio-core
ui-android → ui-shared, studio-core
ui-web → ui-shared, studio-core
apps → platform UI + ui-shared + studio-core
```

However, a **logical circular dependency** exists:

```
useChordStore (settings) ←→ useNavigationStore (reads settings for theme)
useChordStore (settings) ←→ useBottomNavigationStore (reads settings for isLight)
```

These are Zustand cross-store reads, not import cycles. They work because Zustand stores are lazily initialized singletons.

---

## 11. Hidden Dependencies

| Hidden Dependency           | From                 | To                           | Nature                  |
| --------------------------- | -------------------- | ---------------------------- | ----------------------- |
| Stagex → iframe CSS         | `StageCorePanel.tsx` | `stage-core/app.css` (118KB) | Runtime `<iframe>` load |
| Stagex → iframe postMessage | `StageCorePanel.tsx` | Iframe `contentWindow`       | DOM manipulation        |
| CSS custom properties       | All components       | Platform `index.css`         | Runtime CSS cascade     |
| Lottie JSON files           | Lottie components    | `public/lottie/*.json`       | Runtime fetch           |
| Google Fonts                | `index.css`          | fonts.googleapis.com         | Network dependency      |

---

## 12. Index.ts Export Analysis

### `studio-core/src/index.ts` — 90 exports

**By category:**

| Category   | Count | Examples                                                                                                                         |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Stores     | 6     | useChordStore, useDrumStore, useNavigationStore, useBottomNavigationStore, useApplicationTransitionStore, useNotificationService |
| Navigation | 9     | NavigationDispatcher, BackDispatcher, GestureDispatcher, etc.                                                                    |
| Hooks      | 8     | useShallow, useIsWebDesktop, useBackHandler, useT, etc.                                                                          |
| Services   | 12    | auth, firebase, sync, security, etc.                                                                                             |
| Data       | 5     | chords, progressions, songs, etc.                                                                                                |
| Audio      | 4     | guitarAudio, drumAudio, drumPlugins, etc.                                                                                        |
| Updater    | 8     | stateMachine, pipeline, diagnostics, etc.                                                                                        |
| Tokens     | 1     | designTokens (unused)                                                                                                            |
| Utilities  | 10+   | utils, liquidGlass, transpose, etc.                                                                                              |

> ⚠️ **All 90 exports are in a flat namespace.** No sub-path exports exist. This makes it impossible to determine which subsystem a feature depends on from its import statement.

### `ui-shared/src/index.ts` — 75+ exports

Exports all feature modules (StudioHub, DrumEditor, etc.), all shared components, navigation system, design system, and re-exports from third parties.

> ⚠️ Re-exports `html2canvas` — an external library leaked into the package API.

---

## 13. Recommended Dependency Improvements

### 13.1 Sub-Path Exports

Replace flat `@workspace/livex-core` with sub-paths:

```
@workspace/livex-core/navigation  → useNavigationStore, NavigationDispatcher, etc.
@workspace/livex-core/theme       → themeEngine, themeTransitionEngine
@workspace/livex-core/settings    → useSettingsStore (renamed from useChordStore)
@workspace/livex-core/sync        → sync, syncEngine
@workspace/livex-core/auth        → auth, accountStatus
@workspace/livex-core/tokens      → designTokens (all token exports)
@workspace/livex-core/updater     → stateMachine, pipeline, etc.
@workspace/livex-core/audio       → guitarAudio, drumAudio, etc.
```

### 13.2 Eliminate Dead Paths

1. Delete `studio-core/src/store/useNavigationStore.ts` (shim)
2. Delete `ui-shared/src/groovex/useGroovexStore.ts` (shim after moving store)
3. Remove `html2canvas` re-export from `ui-shared/src/index.ts`

### 13.3 Consolidate Forks

1. Merge `ui-android/StageCorePanel.tsx` into `ui-shared/features/stagex/` with platform-conditional code
2. Merge `WebDesignSystem.tsx` into `StudioDesignSystem.tsx` as responsive variants
3. Consolidate `WebAppSectionDock` (2 files) into one

---

> _This document must be updated whenever package dependencies change._
> _Last updated: July 2026_
