# Dependency Graph

## Package Dependency Matrix

```mermaid
graph TD
    subgraph "Applications"
        SA["studio-android<br/>(entry point)"]
        SW["studio-web<br/>(entry point)"]
    end
    subgraph "UI Packages"
        UA["ui-android<br/>(platform wrapper)"]
        UW["ui-web<br/>(platform wrapper)"]
        US["ui-shared<br/>(shared components)"]
    end
    subgraph "Core"
        SC["studio-core<br/>(business logic)"]
    end
    subgraph "API / Data"
        ACR["api-client-react<br/>(React Query hooks)"]
        AZ["api-zod<br/>(Zod schemas)"]
        AS["api-spec<br/>(OpenAPI YAML)"]
        DB["db<br/>(Drizzle ORM)"]
    end

    SA --> SC
    SA --> US
    SA --> UA
    SW --> SC
    SW --> US
    SW --> UW
    UA --> SC
    UA --> US
    UW --> SC
    UW --> US
    US --> SC
    SC --> ACR
    SC --> DB
    ACR --> AZ
    AZ --> AS
```

## Strict Boundary Rules

| Rule                                           | Enforcement |
| ---------------------------------------------- | ----------- |
| Web app cannot import `ui-android`             | Build-time  |
| Android app cannot import `ui-web`             | Build-time  |
| `studio-core` cannot import any UI package     | Build-time  |
| `ui-shared` cannot import platform-specific UI | Build-time  |

## Package → External Dependencies

### studio-core

| Category  | Dependencies                                                      |
| --------- | ----------------------------------------------------------------- |
| State     | `zustand`, `zustand/middleware`                                   |
| Platform  | `@capacitor/core`                                                 |
| Auth      | `firebase/auth`, `@capacitor-firebase/authentication`             |
| Database  | `firebase/firestore`, `@supabase/supabase-js`                     |
| i18n      | `i18next`, `@tolgee/react`                                        |
| Utilities | Various small utilities                                           |

### ui-shared

| Category  | Dependencies                                     |
| --------- | ------------------------------------------------ |
| Framework | `react`, `react-dom`                             |
| Animation | `motion` (Framer Motion), `gsap`, `lottie-react` |
| State     | `zustand` (via `@workspace/livex-core`)         |
| Platform  | `@capacitor/core`                                |
| Audio     | `pitchy` (pitch detection)                       |
| i18n      | `@tolgee/react`                                  |

### ui-android

| Category   | Dependencies                                     |
| ---------- | ------------------------------------------------ |
| Re-exports | `@workspace/ui-shared`, `@workspace/livex-core` |
| Platform   | `@capacitor/core`, Capacitor plugins             |
| Animation  | `motion`, `gsap`, `lottie-react`                 |
| Auth       | `firebase`                                       |

### ui-web

| Category           | Dependencies                                     |
| ------------------ | ------------------------------------------------ |
| Re-exports         | `@workspace/ui-shared`, `@workspace/livex-core` |
| Same as ui-android | (identical dependency list)                      |

## Internal Module Dependencies

### studio-core Internal

```mermaid
graph TD
    subgraph "Stores"
        CS["useChordStore"]
        DS["useDrumStore"]
        NS["useNavigationStore"]
    end
    subgraph "Navigation"
        ND["NavigationDispatcher"]
        NC["NavigationCoordinator"]
        BD["BackDispatcher"]
        GD["GestureDispatcher"]
        TC["TransitionCoordinator"]
        VAL["validation"]
    end
    subgraph "Updater"
        SM["stateMachine"]
        PL["pipeline"]
        DM["downloadManager"]
        REC["recovery"]
        DIAG["diagnostics"]
        FR["flightRecorder"]
    end
    subgraph "Services"
        AUTH["auth"]
        FB["firebase"]
        SB["supabaseClient"]
        ACC["accountStatus"]
    end
    subgraph "Startup"
        BOOT["startupCoordinator"]
        VER["appVersion"]
        THEME["themeEngine"]
    end

    ND --> NS
    ND --> NC
    ND --> VAL
    NC --> CS
    BD --> NS
    BD --> ND
    GD --> ND
    PL --> SM
    PL --> DM
    PL --> REC
    PL --> DIAG
    PL --> FR
    AUTH --> FB
    SB --> FB
    ACC --> FB
    BOOT --> CS
    BOOT --> NS
    BOOT --> SM
    BOOT --> THEME
    BOOT --> VER
    BOOT --> FR
```

### Feature Module Dependencies

```mermaid
graph LR
    subgraph "Feature Modules (ui-shared)"
        CX["chordex"]
        DX["drumex"]
        GX["groovex"]
        SX["stagex"]
        VX["vocalex"]
    end
    subgraph "Shared Components (ui-shared)"
        SNC["SharedNavigationContainer"]
        DS2["Design System"]
        ANI["Animation System"]
        DIA["Diagrams"]
        LAY["Layout System"]
        LOT["Lottie"]
    end
    subgraph "Core (studio-core)"
        CS2["useChordStore"]
        DS3["useDrumStore"]
        NAV["NavigationDispatcher"]
    end

    CX --> CS2
    CX --> NAV
    CX --> DIA
    CX --> DS2
    DX --> DS3
    DX --> NAV
    DX --> SNC
    DX --> DS2
    GX --> CS2
    GX --> NAV
    GX --> SNC
    SX --> CS2
    SX --> NAV
    SX --> ANI
    VX --> CS2
    VX --> NAV
    VX --> SNC
```

## Sync Backend Dependencies

```mermaid
graph TD
    SETTINGS["useChordStore.settings.syncBackendProvider"] --> SEL{Provider Selection}
    SEL -->|firebase-firestore-legacy| FBL["firebaseLegacy.ts"]
    SEL -->|supabase-realtime| SBR["supabaseRealtime.ts"]
    FBL --> FS["firebase/firestore"]
    SBR --> SBC["supabaseClient.ts"]
    SBC --> FA["firebase/auth (token bridge)"]
```

## Data Flow

```mermaid
graph LR
    subgraph "Persistence"
        LS["Encrypted localStorage"]
        IDB["IndexedDB (Vocalex)"]
        SP["SharedPreferences (Android)"]
    end
    subgraph "Remote"
        FS["Firestore"]
        SB["Supabase"]
        FH["Firebase Hosting"]
        GH["GitHub Releases"]
    end
    subgraph "State"
        CS3["useChordStore"]
        DS4["useDrumStore"]
        NS2["useNavigationStore"]
        GS["useGroovexStore"]
    end

    CS3 <-->|persist| LS
    DS4 <-->|persist| LS
    NS2 <-->|persist| LS
    GS <-->|persist| LS
    CS3 <-->|sync| FS
    CS3 <-->|sync| SB
    FH -->|version.json| SM2["Update State Machine"]
    GH -->|APK files| SM2
    SP <-->|worker state| SM2
```

## Version Dependencies (pnpm catalog)

All workspace packages share versions via `pnpm-workspace.yaml` catalog:

| Dependency               | Catalog Version |
| ------------------------ | --------------- |
| React                    | 19.2.7          |
| Vite                     | 8.1.4           |
| TypeScript               | ~5.7.2          |
| Zustand                  | 5.0.14          |
| Framer Motion (`motion`) | 12.42.2         |
| Tailwind CSS             | 4.3.2           |
| Capacitor                | 8.4.1           |
| Firebase                 | 12.16.0         |
| Supabase JS              | 2.110.2         |
| i18next                  | (catalog)       |
