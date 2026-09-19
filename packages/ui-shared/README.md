# @workspace/ui-shared

> **Platform scope**: SHARED  
> **Entry point**: `src/index.ts`  
> **Consumers**: studio-web, studio-android, ui-android

## Purpose

Cross-platform React component library consumed by both the web and Android apps. Contains all major UI panels, the studio hub layout shell, shared animation system, design system primitives, navigation UI, update UI, and complete feature module UIs for all sub-applications (Chordex, Drumex, Groovex, Vocalex, Stagex).

## Internal Structure

```
src/
├── index.ts                    # Public barrel — all component exports
├── features/                   # ★ Feature modules (organized by sub-app)
│   ├── chordex/                # Chordex: library, chord panel, songs, practice
│   ├── drumex/                 # Drumex: sequencer editor, preferences
│   ├── groovex/                # Groovex: stem player, catalog, audio engine
│   ├── vocalex/                # Vocalex: pitch, lab, practice, takes, harmonizer
│   ├── stagex/                 # Stagex: stage plot editor
│   ├── hub/                    # Hub: settings, changelog
│   └── index.ts                # Feature barrel exports
├── navigation/                 # ★ Navigation UI module
│   ├── SharedNavigationContainer.tsx  # CSS-animation panel switcher
│   ├── SharedNavigationBar.tsx        # Bottom navigation bar
│   ├── BottomNavigationController.tsx # Nav controller logic
│   ├── LiquidBottomNav.tsx            # Liquid Glass bottom nav
│   ├── AppAnimationSystem.tsx         # Framer Motion presets & transitions
│   └── index.ts
├── panels/                     # Top-level panels (older organization)
│   ├── SettingsPanel.tsx       # Global settings panel
│   └── ... (legacy panel files, being migrated to features/)
├── components/                 # Shared components
│   ├── StudioHub.tsx           # ★ Master navigation shell
│   ├── AccountCard.tsx         # Account management UI
│   ├── SmartLoading.tsx        # Async loading gate with skeleton fallback
│   ├── ErrorBoundary.tsx       # React Error Boundary with recovery
│   ├── UpdateIndicator.tsx     # Morphing update banner/pill
│   ├── StudioLayoutSystem.tsx  # Layout primitives
│   ├── icons/                  # AnimatedIcon, bakaiIconLibrary
│   ├── design-system/          # Design tokens, color palettes, buttons
│   ├── diagrams/               # Chord diagram components
│   ├── hub/                    # Hub-specific components
│   ├── devtools/               # Developer inspector components
│   ├── launch/                 # Launch animation engine
│   ├── liquid/                 # Liquid Glass surface engine
│   ├── lottie/                 # Lottie animation wrappers
│   ├── ui/                     # Generic UI primitives
│   ├── animata/                # Animata animation components
│   ├── kokonutui/              # KokonutUI components
│   └── ... (individual component files)
├── lottie/                     # Lottie JSON animation assets
└── styles/                     # Shared CSS styles
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **StudioHub** | `components/StudioHub.tsx` | Master app shell — renders all modes and drill-down navigation |
| **SharedNavigationContainer** | `navigation/SharedNavigationContainer.tsx` | CSS-animation panel switcher (no Framer Motion dependency) |
| **SharedNavigationBar** | `navigation/SharedNavigationBar.tsx` | Bottom navigation bar with scroll-hide |
| **AppAnimationSystem** | `navigation/AppAnimationSystem.tsx` | Framer Motion presets, page transitions |
| **SmartLoading** | `components/SmartLoading.tsx` | Async gating with skeleton fallback |
| **ErrorBoundary** | `components/ErrorBoundary.tsx` | Error boundary with recovery dialog |
| **AccountCard** | `components/AccountCard.tsx` | Account management (profile, subscription) |
| **UpdateIndicator** | `components/UpdateIndicator.tsx` | Morphing update banner → pill → modal |

## Feature Modules

Each sub-app has its own directory under `features/`:

- **`features/chordex/`** — Chord library, chord panel, songs panel, song practice, saxophone view
- **`features/drumex/`** — Drum sequencer editor, drum preferences panel
- **`features/groovex/`** — Stem player, song catalog, audio engine, Groovex store
- **`features/vocalex/`** — Pitch detection, practice exercises, vocal lab, takes recorder, harmonizer
- **`features/stagex/`** — Stage plot editor panel
- **`features/hub/`** — Hub settings panel, changelog section

## Dependencies

- **Workspace**: `@workspace/livex-core` (stores, navigation, audio, sync, theme, version)
- **External**: react, react-dom, motion/react, lucide-react, lottie-react, @capacitor/core, html2canvas

## Files That Should Rarely Be Modified

- `components/StudioHub.tsx` — Master shell; changes affect all app modes
- `navigation/SharedNavigationBar.tsx` — Bottom nav; highly tuned animations
- `components/icons/bakaiIconLibrary.ts` — Icon SVG registry; append-only
- `index.ts` — Barrel exports; only modify when adding new exports

## Extension Points

- **New feature module**: Create directory under `features/`, export from `features/index.ts` and `src/index.ts`
- **New icon**: Add SVG path to `components/icons/bakaiIconLibrary.ts`
- **New Lottie animation**: Add wrapper in `components/lottie/`, add JSON in `lottie/`
- **New design token**: Add to `components/design-system/`
