# @workspace/studio-core

> **Platform scope**: SHARED  
> **Entry point**: `src/index.ts`  
> **Consumers**: ui-shared, studio-web, studio-android

## Purpose

The single source of truth for all **platform-neutral business logic**. Contains Zustand state stores, the typed navigation system, cloud sync engine, OTA updater pipeline, Firebase Auth wrapper, theme engine, audio subsystems, chord/music theory services, i18n setup, dev tools, and static data.

**No React components live here** — this package exports only pure TypeScript modules and React hooks.

## Internal Structure

```
src/
├── index.ts                  # Public barrel — re-exports everything
├── store/                    # Zustand state stores
│   ├── useChordStore.ts      # App settings, chord state, song presets, UI prefs
│   ├── useDrumStore.ts       # Drum pattern, kit, mixer, sequencer state
│   ├── useNavigationStore.ts # Navigation history stack (re-export shim)
│   └── useSettingsStore.ts   # Settings store
├── hooks/                    # React hooks (no JSX)
│   ├── useIsWebDesktop.ts    # Responsive desktop breakpoint
│   ├── useStudioPreferences.ts # Derived preference selectors
│   ├── useStudioShortcuts.ts # Keyboard shortcut registration
│   └── useAppUpdate.ts       # App update hook
├── data/                     # Static read-only data (no side effects)
│   ├── chords.ts             # Chord voicing database (~48 KB)
│   ├── progressions.ts       # Chord progression library (~111 KB)
│   ├── progressionsEs.ts     # Spanish progressions (~32 KB)
│   ├── songs.ts              # Song chart types and built-in charts
│   └── authorizedChords.ts   # Authorized chord ID list
├── lib/                      # Core business logic modules
│   ├── navigation/           # ★ Navigation system (see below)
│   ├── updater/              # ★ OTA updater pipeline (see below)
│   ├── sync/                 # Sync engine internals
│   ├── syncBackends/         # Pluggable sync backend providers
│   ├── startup/              # Startup coordinator internals
│   ├── audio/                # Saxophone audio engine
│   ├── chord/                # Chord processing internals
│   ├── instruments/          # Instrument registry & engines
│   ├── utilities/            # Shared utility functions (security, visual effects)
│   ├── performance/          # Render scheduler, dev performance monitor
│   ├── devtools/             # Developer inspector store
│   ├── preferences/          # Preferences internals
│   ├── storage/              # Storage abstractions
│   ├── events/               # Event system
│   ├── diagnostics/          # Diagnostic utilities
│   ├── notifications/        # Push notification service
│   ├── platform/             # Platform detection
│   ├── hooks/                # Internal hooks
│   ├── i18n-lib/             # i18n internals
│   ├── types/                # Shared TypeScript types
│   ├── auth.ts               # Firebase Auth wrapper
│   ├── firebase.ts           # Firebase SDK initialization
│   ├── sync.ts               # Sync orchestrator (re-export shim)
│   ├── drumAudio.ts          # Web Audio drum sampler (re-export shim)
│   ├── themeEngine.ts        # CSS token applicator (re-export shim)
│   ├── appVersion.ts         # ★ Version single source of truth (re-export shim)
│   └── ... (other re-export shims)
├── repositories/             # Data access repositories
│   ├── VocalexRepository.ts
│   ├── GroovexStemRepository.ts
│   ├── AuthRepository.ts
│   └── UserRepository.ts
├── i18n/                     # Locale JSON files (en.json, es.json, etc.)
└── types/                    # Shared type definitions
```

## Key Modules

### Navigation System (`lib/navigation/`)
Custom typed navigation — no React Router. See [navigation docs](../../docs/architecture/navigation.md).
- `NavigationDispatcher.ts` — Primary API: `push()`, `pop()`, `replace()`, `popTo()`, `reset()`
- `navigationTypes.ts` — Route types: `NavigationRoute`, `TransitionType`, `GestureState`
- `BackDispatcher.ts` — Hardware/gesture back events
- `GestureDispatcher.ts` — Swipe-back gesture state
- `appRegistry.ts` — Per-app section definitions (`APP_SECTIONS`)
- `navScroll.ts` — Scroll-hide & pill-collapse engine for bottom nav
- `searchIndex.ts` — Global search index

### OTA Updater (`lib/updater/`)
Modular update pipeline. See [updater docs](../../docs/architecture/updater.md).
- `pipeline.ts` — Main update orchestrator
- `stateMachine.ts` — State definitions and transition guards
- `downloadManager.ts` — Chunked APK download with progress
- `integrityVerification.ts` — SHA-256 hash verification
- `installer.ts` — Capacitor filesystem write + PackageInstaller

### State Stores (`store/`)
- `useChordStore` — Global app settings, chord workspace, song presets, UI prefs
- `useDrumStore` — Drumex sequencer state
- `useNavigationStore` — Navigation history and transition state
- `useSettingsStore` — Settings store

## Dependencies

- **Workspace**: None (leaf dependency — never imports from other workspace packages)
- **External**: zustand, @firebase/auth, @firebase/firestore, @supabase/supabase-js, @capacitor/*, i18next, react (hooks only)

## Files That Should Rarely Be Modified

- `lib/appVersion.ts` — Version single source of truth. Changes trigger OTA checks.
- `lib/navigation/navigationTypes.ts` — Changing route types breaks all navigation consumers.
- `lib/security.ts` — Encryption/decryption for persisted preferences.
- `data/chords.ts`, `data/progressions.ts` — Large static data; changes affect bundle size.

## Extension Points

- **New sync domain**: Add serializer in `lib/sync/` and register in sync orchestrator
- **New navigation route**: Extend `NavigationRoute` in `navigationTypes.ts`, add default in `NavigationCoordinator.ts`
- **New instrument**: Add engine in `lib/instruments/`, audio in `lib/audio/`
- **New store**: Create in `store/`, re-export from `index.ts`
