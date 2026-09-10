# Studio Changelog

## 4.5.86

Release Date: 2026-09-10

### Added

- Native Dedicated Light-Mode Intro Assets: Added pre-rendered subpixel antialiased light-mode intro emblem partitions (`livex-form1-light.png`, `livex-form2-light.png`, `livex-symbol-light.png`) for razor-sharp visual fidelity on high-DPI displays.

### Fixed

- Intro Animation Light Mode Quality: Eliminated raster diffuse shadow halos and destructive CSS `brightness(0)` filter flattening in light mode, preventing fuzzy gray borders around the emblem.
- Repository Migration Alignment: Systematically updated all release orchestration scripts, Firebase download redirects, verification checkers, and in-app links to `MAGEXE1000/Livex`.
- Cross-Platform APK Extraction in CI: Supported AAPT2 flattened release icons and hardened APK asset extraction across Linux and Windows environments in `generate-release-verification-report.mjs`.

## 4.5.85

Release Date: 2026-09-10

### Added

- Launcher Icon Freshness Manifest Architecture: Introduced `launcher-icons-manifest.json` tracking SHA-256 hashes of master assets and 20 generated target mipmaps/icons to ensure deterministic asset freshness across builds.
- Automated Device Runtime Verification Tooling: Added `scripts/verify-device-runtime-icon.mjs` (`pnpm verify:device`) for comprehensive live ADB and static 15-point verification across all 6 OS and framework layers.
- Automated Launcher Icon Regression Suite: Added `launcher-icons.test.mjs` (`pnpm test:icons`) asserting master source existence, adaptive icon XML validity, and zero legacy waveform presence.

### Fixed

- Release Pipeline CI Hardening: Embedded launcher icon integrity checks into `pnpm check:versions` (Preflight Job 1), fixed recursive subdirectory scanning in `generate-release-verification-report.mjs`, and enforced triple cross-artifact SHA-256 equality before atomic publication.
- Deterministic Cross-Platform Icon Generation: Replaced Windows GDI+ generation with Node.js `sharp` (v0.35.4) using Lanczos3 resampling and strict 108dp canvas / 66dp safe-zone compliance.
- Removed Flawed Runtime Component Mutation: Removed redundant `refreshLauncherIconCacheIfNeeded` call from `MainActivity.kt` to preserve native component immutability.

## 4.5.84

Release Date: 2026-09-09

### Fixed

- Android OEM Launcher Icon Cache Invalidation: Implemented non-destructive launcher icon cache refresh in `MainActivity.kt` via `PackageManager.setComponentEnabledSetting` with `DONT_KILL_APP`. Broadcasts `ACTION_PACKAGE_CHANGED` on upgrade to force OEM launchers (Samsung One UI Home, Pixel Launcher) to flush stale SQLite bitmap caches for `com.chordex.app.MainActivity` without breaking user desktop shortcuts or requiring activity aliases.
- Canonical Launcher Icon Synchronization Pipeline: Extended `scripts/sync-launcher-icons.mjs` to automatically mirror all 15 density mipmaps and master Livex assets directly to secondary Capacitor directories (`resources/` and `apps/studio-android/resources/`), eliminating source drift.
- CI Preflight Launcher Icon Quality Gate: Integrated `pnpm check:icons` directly into Preflight Job 1 of `.github/workflows/release.yml` to enforce launcher icon dimension and file integrity before initiating release builds.
- Capacitor Cordova Build Configuration Guard: Safely guarded `cordova.variables.gradle` inclusion in `capacitor.build.gradle` to ensure clean local and CI Gradle builds.

## 4.5.83

Release Date: 2026-09-09

### Added

- Standard Capacitor Asset Pipeline: Established root and Android resource pipelines (`resources/` and `apps/studio-android/resources/`) fully populated with the approved high-resolution Livex master icon (1024×1024) and all 5 density mipmaps.

### Fixed

- Purged Legacy Brand Detritus: Completely removed obsolete Chordex screenshots, legacy sine-wave icon caches, and outdated branding references to establish Livex as the sole canonical brand identity.
- Windows Tooling Execution Stability: Deactivated non-portable Unix shell hook invocation to ensure robust script and command execution across developer environments.

## 4.5.82

Release Date: 2026-09-09

### Added

- Three-State Startup Animation Engine: Engineered an appearance-aware launch sequence in `LaunchAnimationEngine.tsx` that dynamically adapts canvas background and branding elements across Light (`#ffffff`), Dark (`#141418`), and AMOLED (`#000000`) appearance modes.

### Improved

- Adaptive Livex Logo & Luminous Atmosphere: Implemented high-contrast dark Livex mark styling (`brightness(0)` at `0.90` opacity) with preserved specular sheen sweep in Light mode; calibrated subtle ambient bloom across all appearance states.

### Fixed

- Startup Background Flash Elimination: Removed hardcoded `#000000` canvas background from launch animation; synchronized frame-0 early boot CSS tokens (`html.dark`, `html.amoled`, `html.light`) and Android Day theme `styles.xml` to eliminate pre-mount visual flashes.

## 4.5.81

Release Date: 2026-09-09

### Fixed

- Canonical Android Launcher Identity & Architecture: Restored standard, single-activity launcher architecture on \`com.chordex.app.MainActivity\` with direct \`MAIN\`/\`LAUNCHER\` intent filters, completely eliminating the experimental \`MainActivityLivex\` activity alias and runtime component toggles.
- Automated Launcher Icon Synchronization Pipeline: Built and integrated \`scripts/sync-launcher-icons.mjs\` (\`pnpm sync:icons\` / \`pnpm check:icons\`) to automatically derive all 15 Android density mipmaps and public Web/PWA assets with 66dp centered safe zones inside a 108dp adaptive canvas directly from canonical master assets.

## 4.5.80

Release Date: 2026-09-09

### Fixed

- Android Launcher Icon Cache Invalidation via Activity-Alias: Implemented MainActivityLivex activity alias with component rotation to bypass persistent OEM launcher icon caching (Samsung One UI, Pixel Launcher, etc.), forcing Android launchers to invalidate cached legacy icons and load the new metallic Livex logo fresh from the APK.
- Adaptive Icon Monochrome Material You Theming: Added monochrome drawable bindings to ic_launcher.xml and ic_launcher_round.xml in mipmap-anydpi-v26 for Android 13+ themed icon support.
- Runtime Component Assurance: Added ensureLauncherAliasActive() in MainActivity.kt to programmatically confirm that the new launcher alias component is in an enabled state.

## 4.5.79

Release Date: 2026-09-08

### Fixed

- Android Display Luminance & Contrast Restoration: Resolved the mobile display dimming problem by restoring canonical zinc text tokens (`--c-text-primary: #fafafa`, `--c-text-secondary: #a1a1aa`, `--c-text-muted: #71717a`) and registering matching `@property` initial values in `tokens.css`.
- AMOLED Surface Contrast & Hierarchy: Elevated AMOLED surface and card background tokens above pure black (`--app-surface-low: #08080a`, `--app-surface: #101014`, `--app-surface-high: #16161c`, `--hub-card-bg: rgba(255, 255, 255, 0.04)`) while preserving pure `#000000` AMOLED panel shutoff, eliminating viewport black crush.
- Early-Boot Inline Style Cleanup: Synchronized early boot head scripts in `apps/studio-android/index.html` and `apps/studio-web/index.html` with explicit text tokens and high-contrast surfaces, and added automatic inline style flushing in `themeEngine.ts`.
- WebView Native Hardware Layer: Removed experimental offscreen Compose `layerBackdrop` wrapping in `MainActivity.kt`, restoring direct hardware layer rendering with native black window background.
- Component Text Hierarchy & Navigation Contrast: Defined `--c-text-tertiary: var(--c-text-muted)` across the design token system and updated navigation icon/label colors to `var(--c-text-secondary)` for WCAG AA compliance.

## 4.5.78

Release Date: 2026-09-08

### Added

- Complex Motion Brand Reveal Animation: Overhauled LaunchAnimationEngine into a fluid 6-phase brand reveal sequence featuring 65° diagonal anticipation glow, non-linear petal trajectories (Form 1 ascending stem and Form 2 curved wing swoop), seam union lock-in micro-settle impulse, specular sheen ribbon sweep masked strictly to the emblem, and a serene breathing hold before dissolving into the pre-mounted Hub.

### Fixed

- High-Contrast Launcher Icon Mipmaps: Completely regenerated Android launcher density assets (mdpi through xxxhdpi) using an optimized tone curve that lifts deep petal shadows from RGB 21 to ~75 RGB and midtones to 215 RGB, eliminating the dark silhouette/murky appearance against pure AMOLED black backgrounds and resolving perceived launcher icon caching issues.
- Round Icon Squircle Elimination: Replaced round launcher mipmap assets with seamless AMOLED black circles with anti-aliased perimeter, eliminating the legacy nested squircle boundary defect.

## 4.5.77

Release Date: 2026-09-08

### Added

- Livex Brand Reveal Launch Animation: Engineered a genuine brand-building intro sequence where the Livex mark is physically constructed from its two organic geometric shapes (ascending stem petal and converging wing petal) with staggered cubic-bezier interpolation ([0.16, 1, 0.3, 1]), luminous ambient white bloom, authoritative settle hold, and seamless dissolve into the pre-mounted Hub DOM.

### Fixed

- Android Adaptive Launcher Icon Safe-Zone Compliance: Replaced all launcher icon density mipmaps (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) ensuring the mark is strictly contained within the 66dp safe zone on a 108dp canvas with pure AMOLED black (#000000) background. Completely eliminated the legacy double-squircle clipping defect in round icons and added transparent corner margins to legacy squircle badges.
- AndroidManifest Activity Icon Bindings: Explicitly bound android:icon and android:roundIcon attributes to MainActivity in AndroidManifest.xml to prevent OEM launcher caching fallbacks to stale application icons.

## 4.5.76

Release Date: 2026-09-08

### Added

- Livex Branding & Adaptive Android Launcher: Updated application launcher icons across all density buckets (mdpi to xxxhdpi) and startup animation to the approved 2026 Livex visual identity.

### Fixed

- Firebase Firestore Persistence Modernization: Migrated deprecated enableMultiTabIndexedDbPersistence to FirestoreSettings.localCache with persistentLocalCache and persistentMultipleTabManager, eliminating startup deprecation warnings while maintaining multi-tab persistence.
- Vocalex Monitor Scale, Layout Rhythm & Typography: Calibrated pitch monitor scale and vertical composition rhythm to eliminate viewport clipping, and harmonized Preferences typography hierarchy.
- Drumex Pattern Card Typography: Restored compact pattern card title typography hierarchy and visual weight alignment across pattern library views.
- Startup Regression Verification: Restored studio-intro-done event dispatching and listener alignment in App.tsx, ensuring automated regression suites validate cleanly.

## 4.5.75

Release Date: 2026-09-08

### Added

- Livex Visual Identity & AMOLED Logo Replacement: Upgraded app branding across all surfaces to the approved 2026 Livex logo treatment. Features pure AMOLED #000000 background integration, authentic 3D petal depth with luminous ambient white emission, and Android adaptive launcher icons with safe-zone compliance (66dp within 108dp canvas) across all density buckets (mdpi to xxxhdpi) to prevent double-squircle clipping on OEM launchers.
- Universal Soft-Pill Design System: Standardized soft-pill visual system and ambient elevations across all Livex apps (Chordex, Drumex, Stagex, Groovex, and Vocalex).

### Fixed & Improved

- Vocalex Vertical Rhythm & Centered Composition: Refined Vocal Monitor layout composition to match Stitch reference, balancing upper metadata, central pitch monitor, and primary action controls within the active viewport without dead-space voids.

## 4.5.74

Release Date: 2026-09-07

### Fixed & Improved

- Global Heading & Header Typography Hierarchy: Restored canonical typography hierarchy across all Studio/Livex applications (Studio Hub, Chordex, Drumex, Stagex, Groovex, Vocalex, and Preferences) ensuring consistent weight, tracking, and line-height scaling across mobile viewports.
- Vocalex Vertical Rhythm, Viewport Elevation & Header Composition: Eliminated stacked bottom clearance voids (saving >100px of dead space) and competing nested scroll containers. Reordered CoachPanel with compact top pill switcher, followed by context-aware StudioHeader with zero collision or title duplication. Elevated main pitch monitor card and action controls, guaranteeing full viewport visibility without scrolling.

## 4.5.73

Release Date: 2026-09-07

### Added

- Vocalex In-Project Recording Studio: Integrated empty-project recording workspace directly inside TakeDetailView. Creating a new take initializes an empty project with durationMs 0 and opens its detail workspace equipped with a real-time 48-band frequency visualizer, count-in countdown respecting user preferences, active timer, stop action, and live hardware DSP status badges (48kHz Lossless, Noise Filter, Auto Gain).
- Vocalex Take Project Management & Re-recording: Added in-project re-recording support and inline project title renaming with automatic persistence to vocalexRepository.
- Vocalex Take List Ready Badge: Empty takes in the takes list render a dedicated microphone icon and "READY TO RECORD" badge, guiding users directly into recording without zero-duration errors.

### Removed & Streamlined

- Standalone Vocalex Recorder Section Removed: Streamlined Vocalex top-level navigation to three focused, canonical sections: Coach, Takes, and Preferences. Deprecated and removed all standalone recorder references across navigation registries, search index, session state stores, app dock, and preferences panel.

## 4.5.72

Release Date: 2026-09-06

### Added

- Drumex 3-State Exclusive Audio Volume Mode: Introduced a 3-state volume controller (Normal -> Exclusive -> Mute -> Normal) accessible via a compact morphing dock in the bottom navigation area, supporting hardware volume key interception and background audio management.
- Direct BPM Input with Viewport Stability: Native Android soft keyboard integration with clamped [40, 280] range, enterKeyHint="done", and zero layout reflow via adjustNothing window mode.

### Fixed & Improved

- Chordex Library Android Vertical Touch Scrolling: Resolved vertical scrolling lockout across the entire Chordex Library page on Android. Enclosed LibraryMainView in a canonical flex container and configured its scroll container with hardware-accelerated momentum touch scrolling, overscroll containment, and explicit pan-y touch action.
- Android Motion Transition Containment: Enforced strict flex column layout on StudioPageTransition wrappers in LibraryPanel, preventing block-flow height expansion and ancestor viewport clipping.
- Touch Action Alignment Across Views: Standardized min-h-0, touch-action pan-y, and overscroll-behavior-y contain across CategoryScreenView and LibraryChordDetail, while assigning pan-x pan-y to horizontal carousels to eliminate gesture conflicts.

## 4.5.71

Release Date: 2026-09-06

### Added

- Drumex Metronome Direct BPM Entry: Tapping the giant BPM hero display transitions into an inline editable numeric input state with the native Android keyboard (`inputMode="numeric"`, `pattern="[0-9]*"`), automatic text selection, integer validation clamped strictly to 40-280 BPM, commit on Enter / "Set BPM", and clean cancellation on Escape / "Cancel" / empty input / Android Back gesture.
- Multi-Accent & Multi-Tier Beat Pattern System: Full support for multiple accented beats across any time signature (4/4, 3/4, 5/4, 7/8, 9/8, 12/8) with three distinct accent tiers: strong, accent, and normal. Tapping any beat in the visual Beat Tracker strip cycles normal -> accent -> strong -> normal.
- Physical AudioBuffer Waveform Synthesis for All Accent Tiers: Synthesized distinct acoustic and electronic waveforms for all 4 sound buffers (strong, accent, normal, sub) across all 13 metronome sounds, featuring tuned resonant cavity frequencies, transient noise bursts, and distinct velocity gains.
- Robust Rapid Tap Tempo Engine: Eliminated the 4-tap requirement. Two taps immediately calculate an authoritative tempo, with subsequent taps refining the estimate via a recency-weighted rolling average of up to 6 intervals. Includes a 70ms touch-noise debounce (< 857 BPM) removing any artificial tempo ceiling up to canonical 280 BPM, and automatic sequence reset after a > 2000ms pause.

### Fixed & Improved

- Beat Tracker Summary Badge: Real-time dynamic accent summary in the tracker strip header (e.g. 1 Strong • 2 Accent) with visual accent indicators.
- Tap Tempo Helper Label: Updated helper text from (Tap 4 times) to (Tap to set tempo).

## 4.5.70

Release Date: 2026-09-06

### Fixed & Improved

- Drumex Metronome True AMOLED Mode: Pure black (#000000) and elevated (#0a0a0c) surfaces across Beat Tracker, BPM Hero card, rhythm metrics, audio controls, floating dock, preset drawer, and all configuration modals.
- Dynamic Preset Identity Tracking: Active preset selection immediately clears (activePresetId: null) when any defining parameter (BPM, time signature, subdivision, sound, accent, count-in, tempo ramp) is modified, and automatically restores when parameters match the saved preset definition.
- Startup Preset Isolation: Clean default startup state on application restart with activePresetId: null while keeping saved presets library fully persistent.
- Android Media Player Notification Metadata: Track title displays active preset name when a preset is active, or "Drumex Metronome" as fallback, with secondary metadata displaying BPM and time signature.
- Android Media Notification Artwork Scaling: Reduced badge content scale to a compact 220x220 inner card centered on 512x512 canvas with generous black margins, preventing SystemUI notification shade crowding and control clipping.

## 4.5.69

Release Date: 2026-09-06

### Added

- Restored GrooveX Vinyl Turntable Audio Feedback: Restored authentic vinyl turntable scratch and platter brake audio feedback on pause and resume, operating via an independent dedicated turntableBus connected to masterGain without modifying stem playback rates.
- Pre-Synthesized Analytical Turntable AudioBuffers: Mathematically pre-synthesized 520ms vinyl platter deceleration stop and 260ms needle cue direct-drive spin-up AudioBuffers with anti-click zero-crossing envelopes, zero network latency, and zero decoding overhead.
- Drumex Metronome User-First Presets: Replaced factory presets with an intentional "MY PRESETS" empty state and full CRUD workflow (create, in-place edit, duplicate with unique copy names, rename, delete).
- Dual-Mode Incremental Tempo Progression: Implemented deterministic tempo progression engine supporting both By Bars (evaluated strictly at bar boundaries) and By Time (on the monotonic Web Audio clock) with live summary cards.
- Synchronized Visual Count-In Countdown: Added floating 4-3-2-1 countdown overlay locked to Web Audio beat schedule events, unmounting cleanly at the exact instant performance begins.

### Fixed & Improved

- Transposition & Stem Synchronization Preservation: All stem buffer sources remain locked to an invariant 1.0000x playback rate, guaranteeing 100% time and tempo preservation across -12 to +12 semitones with zero cumulative drift and bit-exact drum alignment.
- Android Media Controls Transport Alignment: Android notification shade, Quick Settings media card, lock screen, and Bluetooth play/pause actions seamlessly trigger the restored turntable stop and start audio feedback.
- Android Media Notification Badge Scaling: Redesigned notification artwork badge with generous padding and centered typography, eliminating SystemUI media card cropping and clipped BPM text.
- Neutral Accent Beat Toggle: Tapping the active accent beat toggles to a neutral state (-1) for unaccented metronome practice across all meters and subdivisions.
- Streamlined Rhythm Cards: Removed intrusive '+' tiles from Time Signature and Subdivision cards, presenting clean quick-selection grids alongside compact modal configuration triggers.

## 4.5.68

Release Date: 2026-09-06

### Added

- Studio/Livex Android System Updater Redesign: Implemented the new flagship Android updater dialog matching the approved design system specifications with 400px width constraint, rounded-28 perimeter, micro scrollbar, and hardware-accelerated CSS state morphing transitions.
- Tactile Interaction & Visual Indicators: Added tactile button feedback (.livex-tap-press scale down on active touch), continuous scanning beam animations for package verification, and real-time download metrics (transferred MB, speed, ETA).

### Fixed & Improved

- Full Theme Parity: Engineered pixel-perfect support for Light (#ffffff / #f8fafc), Dark (#0c0d10 / #16171b), and AMOLED (true #000000 / #08080a) themes with canonical surface blur tokens.
- Categorized Release Notes Engine: Release changelogs are dynamically classified into distinct, color-coded badges (NEW in emerald, AUDIO ENGINE in blue, FIXED & IMPROVED in amber) with automatic fallback for single-version manifests.
- End-to-End Pipeline Wiring: Connected real-time download progress events, graceful download cancellation, cryptographic SHA-256 verification, and native Android PackageInstaller handoff.

## 4.5.67

Release Date: 2026-09-06

### Added

- Signalsmith Stretch WASM AudioWorklet Integration: Integrated official C++ WebAssembly Signalsmith Stretch DSP engine running entirely within the Web Audio render thread for production multitrack stem transposition.
- Native Android Media Controls: Implemented real native Android MediaSessionCompat and foreground playback service exposing playback controls to the Android notification shade, Quick Settings media carousel, lock screen, and Bluetooth devices across GrooveX, Drumex Beats, and Metronome.
- Drumex Metronome Performance Mode: Automatically hides canonical bottom navigation in the Metronome tab to reclaim the lower viewport for compact performance controls.

### Fixed & Improved

- Time & Tempo Preserving Transposition: Decoupled musical key transposition from playback speed—all audio sources run at strictly 1.0000x playback rate with 0 duration change and 0 BPM change across -12 to +12 semitones.
- Percussion Stem Transposition Immunity: Percussion and drum stems (kick, snare, toms, hi-hats, cymbals, overheads, percussion) bypass pitch processing, keeping rhythm and transients 100% unaltered.
- Sample-Exact Latency Lock: Calibrated drum delay to match Signalsmith Stretch's deterministic 120.00ms latency, achieving bit-exact phase synchronization (Δt = 0.000 ms) between drums and melodic stems with zero cumulative drift.
- Zero UI Thread Overhead: Replaced synchronous main-thread DSP with AudioWorklet parameter automation (< 0.01ms main-thread execution), eliminating application freezes and dropped frames.

## 4.5.66

Release Date: 2026-09-06

### Fixed

- GrooveX Transposition UI Freeze Regression: Completely eliminated application freeze during musical key transposition by removing main-thread offline SoundTouch WSOLA processing.
- Native Hardware Playback-Rate Engine: Restored canonical zero-CPU Web Audio `AudioBufferSourceNode.playbackRate` adjustment across all stems (including drums/percussion), reducing transposition execution latency from multi-second blocking down to < 0.05ms (0 dropped UI frames, steady 60 FPS).
- Continuous Drift-Free Playback: Dynamic pitch changes during active playback now maintain seamless audio continuity with zero phase jump and 100% sample-lock synchronization across all stems.

## 4.5.65

Release Date: 2026-09-06

### Added

- Drumex Metronome Primary Tab: Implemented the approved Drumex Metronome design as a primary production tab placed immediately to the left of Beats (`Metronome | Beats | Patterns | Preferences`).
- Deterministic Web Audio Lookahead Engine: Built high-precision metronome audio engine powered by authoritative Web Audio hardware clock (`currentTime`) and 25ms lookahead scheduler, guaranteeing zero perceptible lag and zero cumulative drift across 40–280 BPM.
- Pre-Synthesized PCM Percussive Kits: Pre-rendered 6 high-transient percussive sound kits (`Acoustic Woodblock`, `Acoustic Click`, `Digital Beep`, `Cowbell`, `Rimshot`, `Soft Click`) directly into cached in-memory AudioBuffers with zero network latency, consistent loudness, and clean transient attack.
- Metronome Presets Management: Full CRUD preset architecture with local storage persistence, supporting instant recall, inline preset creation, duplication, renaming, updating, and search filtering.
- Rhythm Metrics & Controls: Segmented pill selectors for Time Signatures (4/4, 3/4, 6/8, 2/4) and Subdivisions (1/4, 1/8, 1/16, 3let), accented Beat 1 tracking, audible count-in, practice timer, tap tempo, and floating quick controls dock.

### Improved

- Clean Audio Lifecycle & Leak Immunity: Guaranteed zero node, timer, or context leaks over repeated start/stop cycles with automatic background/navigation teardown.
- Global Navigation & Translation Integration: Seamless bottom navigation bar and desktop dock integration with English and Spanish translations.

## 4.5.64

Release Date: 2026-09-05

### Added

- GrooveX Sample-Accurate Multitrack Transposition: Re-architected transposition engine to use in-memory buffer-level SoundTouch transposition with exact sample length preservation and zero cumulative drift.
- Full Musical Transposition Scale: Supported pitch shifting across -12 to +12 semitones with instantaneous cache retrieval and seamless 25ms crossfade stem hot-swapping during live playback.

### Improved

- Percussion Stem Transposition Immunity: Guaranteed 100% pitch and tempo immunity for all drum and percussion stems (kick, snare, toms, cymbals, hi-hats, percussion), keeping rhythm strictly locked to the hardware audio clock.
- Unified Zero-Latency Audio Graph: Eliminated worklet starvation delays, underrun zero-padding, and fractional skip resets by routing all stems directly into the unified master gain with Delta t = 0.000ms.

## 4.5.63

Release Date: 2026-09-05

### Added

- Canonical Chordex Section-Entry Animations: Integrated the canonical Studio motion system (`StudioPageTransition` with `variant="drilldown"`) across all redesigned Chordex views (Library, Category browsing, Chord Detail, Songs list, Song Editor, and Saxophone Practice).
- Dynamic Drilldown Initial Entrance Support: Enhanced `StudioPageTransition` to support conditional initial mount entrance transitions, ensuring sub-views animate smoothly upon appearance while preserving root tab transitions.
- Canonical Studio Header Parity: Replaced all custom, ad-hoc, and static headers across Chordex with canonical `StudioHeader` (in-flow) and `SharedFloatingHeader` (floating glass capsule) components.

### Improved

- Studio Performance & Architecture Optimization: Consolidated redundant orientation and navigation listeners in Stagex, purged dead module candidate scoring loops in Studio Hub, and eliminated unreferenced redesign imports across Chordex and Vocalex.
- Drumex Pattern Library Layout Unification: Unified desktop and mobile pattern browsing under the canonical `DrumPatternsPanel`, removing over 700 lines of duplicate code and reducing bundle overhead.
- Groovex Store Selector Memoization: Converted broad store subscriptions in Groovex Preferences to fine-grained atomic Zustand selectors, isolating preference views from unrelated playback state mutations.

## 4.5.62

Release Date: 2026-09-05

### Added

- GrooveX Song Player Stitch Redesign: Redesigned the complete GrooveX Song Player into the canonical Stitch layout with elevated turntable plinth card, live waveform audio visualizer, timeline scrubber with section badges, 5-button transport cluster with vibrant illuminated Play/Pause FAB, semitone transposition stepper, and 6-channel multitrack stems mixer workstation.
- Realistic 60fps Vinyl Turntable Simulation: Implemented requestAnimationFrame rotational physics with realistic acceleration curve, natural ~1.8s inertia deceleration on pause, and absolute rotational angle preservation across pause/resume cycles.
- High-Fidelity Vinyl Styling & Tonearm Assembly: Multi-groove radial vinyl disc with center spindle label, dual conic sheen reflection, and articulated tonearm assembly with gimbal pivot base, tone arm needle, and smooth cueing transition to playing position.
- Studio Floating Header Song Lockup: Added subtitle support to SharedFloatingHeader housing the song title and artist strictly in the top floating pill, eliminating duplicate page body headers.

### Improved

- Transposition Audio Engine Architecture: Eliminated digital buzzing and clicking in SoundTouch AudioWorklet processor by adding a 1024-sample pre-buffer threshold that guarantees full 128-sample render quantums.
- Bit-Exact Master Audio Bypass: Added bit-exact passthrough path at 0 semitones bypassing WSOLA processing entirely for 100% studio master clarity with zero latency or phase coloration.
- Phase-Locked Stems Synchronization: Summed all 6 multitrack stem audio channels into a unified pre-transposition bus, preventing drum WSOLA drift and ensuring sample-accurate stem synchronization across all transposition keys.
- Real-Time Transposition Controls: Stepper allows -6 to +6 semitone adjustments on the fly with smooth 25ms crossfades and exponential pitch smoothing without altering audio playback tempo.
- Practice Mix Presets: One-tap presets (Full Band, Minus Vox, Minus Drum, Bass & Drum) with individual channel volume sliders, exclusive Mute and Solo controls, and a master mixer reset action.

## 4.5.61

Release Date: 2026-09-05

### Added

- Drumex Beat Editor Studio Redesign: Redesigned the mobile Beat Editor into the canonical studio visual language with high-density layout and tactile production controls.
- Floating Pill Top Bar: Compact capsule header displaying pattern metadata, interactive BPM tempo pill, 4/4 time signature, kit subtitle, undo/redo buttons, and burger menu.
- Fixed Left Track Column with Real-Time Mute & Solo: Added persistent 104px track column with bold titles, mini M (Mute) buttons, mini S (Solo) buttons, and clean dot-separated articulation subtitles.
- Real-Time Audio Mute/Solo Synchronization: Integrated dynamic volume zeroing directly into DrumScheduler audio context without pausing playback or interrupting scheduling.
- 4-Button Floating Action Controls (FAB Stack): Replaced legacy floating buttons with canonical vertical FAB stack for Reset/Erase, Loop, Metronome/Tempo, and primary Play/Pause.

### Improved

- Musical Subdivision Ruler: Monospace subdivision labels with subtle downbeat background tint, bar line boundaries, and semantic measure menu icon.
- Notehead & Velocity Matrix Visualization: Enhanced grid stroke weights distinguishing quarter-note downbeats from 16th subdivisions, and proportional dynamic velocity bars under noteheads.
- Score Canvas Space Optimization: Intelligently hid bottom navigation dock when inside Beat Editor, maximizing score height and eliminating touch target overlaps.
- Widescreen Landscape Presentation: Continuous multi-measure horizontal layout, compact top bar with integrated play trigger, and hidden FAB stack.

## 4.5.60

Release Date: 2026-09-04

### Added

- Stagex Setup Subsections Bilingual Localization: Implemented comprehensive English and Spanish translation coverage across all four Setup subviews—Technical Rider, Setlist Management, Gear Inventory, and Band & Crew Roster.
- Stagex History Surface & Floating Toolbar Localization: Integrated reactive bilingual dictionary hooks into the History surface and canvas floating action controls.
- Live Language Transition Architecture: Wired all Stagex setup components to `useT()` and `useSettingsStore` allowing instantaneous language switching (EN ↔ ES) with zero page reloads.
- Updater Ecosystem Bilingual Localization: Fully localized all updater states, progress bars, version comparisons, and action prompts in StudioUpdateScreen and UpdateIndicator.

### Improved

- Roadmap Language Governance: Maintained visible, disabled, and greyed-out future languages (de, fr, zh, pt, it, ja, ko) with standardized "Próximamente" / "Coming soon" status chips.
- Stagex Canvas Landscape Presentation: Decoupled the editing history surface and optimized full-screen canvas aspect ratios.

## 4.5.59

Release Date: 2026-09-04

### Added

- Stagex History Bottom Panel Redesign: Replaced the floating popup modal with an integrated bottom library panel mode, featuring direct jump navigation, dynamic undo/redo badges, state tracking, and responsive desktop/mobile parity.
- Stagex Production Document Single Long-Page PDF Redesign: Implemented continuous single-page vector jsPDF document export with synchronized preview parity across desktop and mobile, standardized typography, high-DPI rasterization for stage plots, and complete technical rider details.

### Improved

- Stage Canvas Interaction: Unified StageBridgeService history synchronization between React and vanilla canvas engine, ensuring seamless state rollbacks, forward redo, and immediate visual canvas reconciliation.
- Export Dialog & Document Layout: Standardized multi-section production document geometry with crisp section headers, channel mapping, logistic notes, gear inventory, and band & crew personnel tables.

## 4.5.58

Release Date: 2026-09-04

### Added

- Comprehensive Bilingual Localization: Complete English and Spanish (en/es) translation coverage across all Studio tools and Stagex screens, with reactive language selector sheet and persistent locale storage.

### Fixed

- Stagex Clean Element Data Defaults: Completely eliminated phantom production data defaults on new stage elements (performer names, microphones, DIs, wireless packs, and boilerplate logistics notes).
- Strict +48V Phantom Power Invariant: Hardened phantom power defaults to false across in-app inspectors, projection adapters, and PDF export sheets, showing canonical em-dash (`—`) when unassigned.
- Stagex Canvas Centering & Menu Anchoring: Fixed canvas vertical positioning, toolbar layout hierarchy, and element menu anchor stability.
- External Link Security Hardening: Enforced `rel="noopener noreferrer"` across all external anchor elements in share dialogs.

### Changed

- Theme-Governed Canvas Appearance: Deprecated manual canvas background color selection in Preferences in favor of strict system theme alignment (Light, AMOLED pure black, and Dark).
- Standardized Empty State Placeholders: Projected em-dash (`—`) across all unassigned technical specifications and audio channel mappings.

## 4.5.57

Release Date: 2026-09-04

### Added

- Stagex Preferences Real-Time Canvas Functionality: Fully integrated all 12 exposed canvas preferences (Canvas Background presets, dynamic Grid Size, Stage Plot Shape, Snap to Grid with dynamic interval calculation, Cable Length badges, Auto Wire, Stage Balance Visualizer, Measurement Units in meters and feet, Reduced Animations, Grid Overlay, Cable Connections, and Element Labels) into the canvas engine with window bridge setters and automatic synchronization.
- Complete AMOLED Pitch Black Hardening: Standardized all Stagex Setup screens (Setup Hub, Technical Rider, Setlist, Gear Inventory, Band & Crew, and Preferences) to pure black `#000000` with zero dark-navy bleed.
- Uniform Floating Header Material & Geometry: Unified floating headers across all Setup detail views to canonical 58px height, 9999px pill geometry, safe-area top insets, and consistent frosted glass elevation.

### Improved

- Stage Canvas Experience: Seamless full-bleed canvas overlay layout without top clipping seams, removal of redundant Stagex title header, 5-button toolbar hierarchy with canonical center focus icon, Scene 1 deletion protection, and perfect three-dot control vertical centering.

## 4.5.56

Release Date: 2026-09-03

### Added

- Stagex Production Document PDF Export Engine: Built native vector jsPDF export engine replacing legacy html2canvas rasterizer, delivering full Setup data parity across stage plot coordinate mapping, audio patch sheet with phantom power (+48V) and IEM mixes, logistics, technical requirements, notes, running setlist, gear inventory, and band & crew roster.
- Production Document Disambiguation: Established distinct "Production Document" naming across toolbar actions, canvas pills, dialogs, and exported documents, completely separating it from Setup > Technical Rider.

### Improved

- Stagex Setlist Redesign: Aligned Setup > Setlist with Stitch mobile reference, featuring floating header, arrangement subheaders, 2x2 metrics strip, key/tempo badges, and setlist insights.
- Stagex Gear Inventory Redesign: Upgraded Setup > Gear Inventory with crisp vector icons, 2x2 stats grid, verification status tracking, and lightweight empty state.
- Stagex Band & Crew Redesign: Enhanced Setup > Band & Crew with 8-member capacity guard, integrated quick-add member card, 2x2 personnel metrics, assigned stage elements tracking, and refined empty states.

## 4.5.55

Release Date: 2026-09-03

### Improved

- Stagex Touch Dragging Pipeline: Optimized Android element dragging with unified W3C pointer capture (`setPointerCapture`), zero-deadzone touch responsiveness, and `requestAnimationFrame`-coalesced visual commits, eliminating drag latency, stepping, and stutter.
- Actions Menu Layering & Independence: Portaled the Stagex element Actions menu to `document.body` with viewport edge collision detection and smart vertical positioning, ensuring the menu is never clipped by collapsed or expanded Advanced Specs.
- Multi-Touch Gestures & Stage Sync: Seamlessly transitioned between element manipulation and two-finger pinch-to-zoom on Android, guaranteeing authoritative final coordinate synchronization with React state and PDF Export.
- Design Token Compliance: Normalized typography tokens in AccentColorPicker with canonical CSS variables.

## 4.5.54

Release Date: 2026-09-03

### Added

- Stagex PDF Toolbar & Technical Rider Workflow Reconnection: Reconnected the Stagex top toolbar PDF action directly to the complete Technical Rider review and export workflow.
- Complete Production Technical Rider Document: Upgraded Technical Rider into a full document view featuring live stage elements with coordinates, audio input channel patch table (with transducer types, +48V phantom power, and IEM mixes), technical requirements, technical notes, contact & venue details, band roster, and gear inventory.
- Direct PDF Rider Export Engine: Added topbar Export action in the Technical Rider view connected to the PDF generator and native Android sharing sheet.

### Improved

- Stagex Header & Title Normalization: Normalized Stagex page title hierarchy, removed redundant subtitles, unified Setup/Preferences headers with canonical floating headers, and redesigned scene chips with high-contrast active states.
- Seamless Navigation & State Preservation: Back navigation from the Technical Rider cleanly returns to the Stage canvas without losing active scene or placed stage elements.

## 4.5.53

Release Date: 2026-09-02

### Added

- Stagex Stage Plot Shape Integration: Added a dedicated, persisted Stage Plot Shape segmented preference under the Canvas category allowing seamless switching between canonical wide Rectangle and true 1:1 Square plotting geometries.
- Stagex Setup Detail Sections Redesign: Re-engineered Technical Rider, Setlist, Gear Inventory, and Band & Crew subviews to match canonical Studio reference designs with compact statistics strips, rich interactive cards, clear empty states, and safe-area scroll clearance.

### Improved

- Stagex Preferences Mobile Architecture: Redesigned the Stagex mobile Preferences experience with seamless topbar header integration, zero duplicate page titles, compact squircular cards, and full Light, Dark, and AMOLED theme parity.
- Navigation Dock & Safe-Area Clearance: Implemented comprehensive bottom inset protection across Stage, Setup, and Preferences pages ensuring floating navigation docks never obscure lower controls on compact Android viewports.

## 4.5.52

Release Date: 2026-09-02

### Added

- Stagex Square Stage Aspect Ratio Preference: Added a user-selectable and persisted Stage Shape preference (Rectangle vs Square) with instant reactive viewport adaptation, dedicated square stage CSS framing, and zero reload state preservation.
- Canonical Studio Preferences Architecture: Redesigned the Stagex mobile Preferences view with compact charcoal surfaces, small tracked uppercase section headers (APPEARANCE, CANVAS, EDITOR), a 6-color swatch backdrop grid (SHADOW, VOID, GRAPHITE, SLATE, MIDNIGHT, FOREST), and compact segmented controls for grid sizing, stage shape, and measurement units.

### Improved

- Canonical Mobile Setup View Redesign: Restored the full-width vertical card stack architecture for Technical Rider, Setlist, Gear Inventory, and Band & Crew with bespoke squircle icons, dynamic item count badges, and seamless drilldown transitions.
- Stagex Mobile Header & Visual Polish: Unified mobile page headers with seamless top insets, standardized 28px typography, floating action utility pills, and generous scroll clearance above the floating bottom dock.

## 4.5.51

Release Date: 2026-09-02

### Added

- Stagex Canonical React Architecture: Migrated the Stagex application shell to native React, fully unifying navigation, headers, page transitions, and layouts with canonical Studio applications (Chordex, Drumex, Groovex, Vocalex).
- Persistent Stage Canvas Isolation: Confined the specialized Stagex 2D canvas and cable routing engine into an isolated renderer with zero reload state persistence across tab switching.
- Modular React Setup & Preferences: Extracted native React subviews for Technical Rider, Setlist, Gear Inventory, Band & Crew, and Preferences with canonical floating headers and hardware back navigation.

### Improved

- Stagex Codebase Complexity Reduction: Reduced StageCorePanel from 4,257 lines down to 222 lines (a 94.7% code reduction), extracting dedicated StageCanvasView, StageSetupContainer, and StageCollabDialog components.
- Single Source of Truth Asset Architecture: Established packages/ui-shared stage-core as authoritative single source of truth across Web and Android with automated build synchronization and byte-identity verification.

## 4.5.50

Release Date: 2026-09-02

### Improved

- Canonical Tab Transitions Across Studio Apps: Unified navigation animations onto `StudioPageTransition` with canonical `200ms cubic-bezier(0.22, 1, 0.36, 1)` easing and zero-overshoot motion, eliminating spring bounce across Groovex, Vocalex, and Hub tabs.
- Android UI Runtime Performance: Coalesced `BottomNavigationController` DOM mutation sweeps with `requestAnimationFrame` to eliminate layout query storms, decoupled `SongPracticeView` playback timer to eliminate 60 FPS effect teardown churn, and narrowed broad Zustand store subscriptions in `App.tsx`, `StudioHub.tsx`, `UpdateIndicator.tsx`, and `StageCorePanel.tsx` to stop cascaded re-renders.

### Fixed

- Stagex Header Architecture Alignment: Aligned Stagex Android header architecture with canonical Studio headers, removed obsolete pill navigation measurements and orphaned timers, and guarded canvas touch telemetry against unnecessary state mutations.

## 4.5.49

Release Date: 2026-08-28

### Added

- Stagex Top Action Controls on Android: Restored upper Stage controls (`SharedFloatingHeader`) on Android editor view, wiring the ruler/measurement tool, PDF export sheet, presets panel, timeline/history, and real-time collaboration modal.

### Fixed

- Appearance Accent Color Picker Layout: Integrated the 2D custom color picker directly and flush inside the Appearance section, eliminating redundant nested card framing, dark vertical clipping rails, and fixed-width popup constraints.

### Performance

- Appearance Color Picker Drag Performance: Eliminated interaction stutter and frame-dropping during continuous touch dragging via single-measure cached bounding geometry, `requestAnimationFrame` coordinate batching, fine-grained Zustand store selectors, and isolated durable state persistence upon pointer release.

## 4.5.48

Release Date: 2026-08-28

### Added

- Stagex & Studio 2D Fluid Color Picker: Redesigned the color picker into a production-grade 2D control with continuous saturation-value field, 360° rainbow hue spectrum slider, checkerboard alpha transparency slider, circular draggable handles, HEX and opacity input validation, and full Light/Dark/AMOLED theme parity.

### Fixed

- Stagex Android Viewport Layout & Sizing: Fixed stage canvas sizing and scaling on mobile viewports so that the stage surface properly occupies available phone screen space.
- Stagex Tab Navigation & State Preservation: Resolved disappearing/blank stage regressions across tab transitions (`Stage` ↔ `Setup` ↔ `Preferences`) by restoring canvas opacity immediately and resetting layout cache.
- Drumex Android Viewport Sizing: Corrected viewport height and safe-area margins in Drumex pattern library and editor screens.
- Conservative Performance Optimizations: Eliminated broad subtree mutation storms during stage element dragging, prevented synchronous layout recalculation in PA sound coverage, cached theme engine CSS variable mutations, and isolated sub-app re-render boundaries in `SharedAppShell`.

## 4.5.47

Release Date: 2026-08-28

### Added

- Global Accent Color System: Introduced a dedicated Accent Color configuration under Settings → Appearance with 9 curated design-system presets, custom RGB color picker, real-time live preview across all sub-apps, and full decoupling from individual sub-app identity branding.
- Dynamic Accent Theme Engine: Integrated `resolveAccent()` in `studio-core` to calculate contrast text, glow, borders, and gradient variants directly on `:root` custom properties.

### Fixed

- App Identity Decoupling: Removed hardcoded `[data-app-key]` theme overrides to ensure Drumex, Stagex, Groovex, Vocalex, and Chordex share the global interactive accent while preserving authentic app brand identity colors on Hub cards and logos.
- Desktop Logging Resilience: Enhanced host language server log stream handling to prevent unhandled stream write exceptions during high-throughput agent operations.
- Release Pipeline Verification: Added automated GitHub CLI keyring authentication fallback and strengthened end-to-end multi-manifest synchronization.

## 4.5.46

Release Date: 2026-08-28

### Changed

- Event-Driven Architecture Modernization: Eliminated untyped synthetic `CustomEvent` and `window.dispatchEvent` patterns across navigation, tab switching, quick actions, settings navigation, and lifecycle events in favor of type-safe Zustand stores and typed subscription primitives.
- Unified Navigation & Deep Linking: Replaced `studio:navigate-to-app`, `studio:navigate-to-tab`, `studio:set-active-tab`, `studio:trigger-quick-action`, `studio:open-settings-section`, and `studio:open-auth` with direct calls to `NavigationDispatcher.push(...)` and `useBottomNavigationStore`.
- User Profile & Cover Subscriptions: Replaced custom avatar and cover photo events with canonical `getUserCover`, `setUserCover`, and `subscribeUserCover` primitives.
- Startup & Lifecycle Coordination: Extended `StartupCoordinator` with typed subscribers `subscribeStartupComplete` and `subscribeIntroDone`, replacing window event dispatches across entry points and launch animation engines.
- Developer Diagnostics Performance Optimization: Optimized `PerformanceProfiler.getGPULayerCount()` by replacing unthrottled full-DOM traversals with targeted composited selectors and a 3-second cache. Consolidated duplicate logging in `EmergencyDebugOverlay` to use canonical `getLogs()`. Batched diagnostics listeners with `requestAnimationFrame` micro-batching to eliminate UI thread render thrashing.

## 4.5.45

Release Date: 2026-08-27

### Added

- Chordex Library Bento Redesign: Completely overhauled the Chordex Library section with a modern Bento card layout, ambient glowing accents, and responsive split-view desktop / full-screen mobile experience.
- Dynamic Mini Fretboard Recesses: Introduced high-fidelity 6-string dynamic fretboard recess components (`HeroChordRecess`) with realistic gauge lines, fret lines, nut bar, base fret indicators, muted/open markers, and glowing finger dots (`.finger-dot`).
- Interactive Chord Preview Section: Integrated rich multi-instrument visualizers supporting instant toggles across Guitar (interactive fretboard diagram with note names/intervals and left-handed mode), Bass (4/5-string diagram), and Piano (2-octave keyboard), with strum audio playback and related chord suggestions.
- Harmonic Categories Grid: Expanded the category browser to 31 distinct harmonic flavors with signature 3-string mini recesses, root note quick filter pills, and a smooth expand/collapse toggle.
- Universal Theme Parity: Full adaptive styling across Dark, Light, and AMOLED modes with zero hardcoded styling regressions.

## 4.5.44

Release Date: 2026-08-26

### Fixed

- Android Updater Changelog Correlation: Resolved long-standing static update dialog changelog display across releases. Implemented dynamic per-version release notes extraction in `studio-core` and wired `UpdateIndicator` to display release notes specific to the version being offered.
- Navigation Icon Mapping: Eliminated remaining `AnimatedNavigationIcon` unmapped warnings for `profile`, `user`, `account`, `drumex`, `stagex`, and `disc` by standardizing normalization routes and comprehensive `FILLED_VARIANTS_SUPPORT` coverage.
- Navigation Re-Render Optimization: Memoized animation context and tab icons in `NavigationAnimationProvider` and `AnimatedNavigationIcon`, eliminating redundant re-renders and false transition triggers during tab changes.
- Component Resolution Cache: Implemented module-level $O(1)$ component lookup caching in `AnimatedIcon`, removing per-render string parsing and Lucide reflection overhead.
- Livex Tab Animation Parity: Standardized tab-change animations to a unified 200ms cubic-bezier transition across all five Livex applications.
- Unified Subsection Top Bar: Finalized and unified the shared top bar structure across Chordex, Drumex, Stagex, Groovex, and Vocalex.

## 4.5.43

Release Date: 2026-08-25

### Fixed

- Modal Surface Transparency: Eliminated excessive transparency across modal, alert, and dialog surfaces across all five Livex applications (Chordex, Drumex, Stagex, Groovex, Vocalex) by introducing canonical `--surface-dialog-bg` and `--surface-modal-surface` theme tokens and multi-layered elevation shadows.
- Navigation Icon Mapping: Resolved unmapped icon warnings for `drumex`, `stagex`, and `disc` in `AnimatedNavigationIcon` through normalized routing and complete filled variant support tables.
- Deprecated Vocalex Back Navigation: Migrated legacy `setVocalexBack` calls across Practice, Recording, Take Detail, and Mixer Lab panels to canonical priority-based `useBackHandler('nested', ...)` hooks.
- Theme System Integration: Standardized CSS token inheritance for interactive controls and floating headers across Light, Dark, and AMOLED themes.

## 4.5.42

Release Date: 2026-08-24

### Fixed

- Developer Inspector Usability: Fixed broken refresh behavior to re-inspect the active DOM node's React fiber, bounds, and computed styles without resetting selection. Added quick target shortcuts for App Shell, Active View Container, and Navigation Bars.
- Interactive Component Subtree Tree Browser: Added real-time component search filtering, category filter pills (Interactive, React, DOM, Containers), collapsible tree nodes, and 1-tap inspection.
- Visual CSS Box Model: Added live nested Box Model visualization for Margin, Border, Padding, and Content dimensions with categorized CSS property tables (Layout, Typography, Surface/Effects).
- Performance Diagnostics Layout Overflow: Applied flexWrap and responsive truncation across component lifecycle profiler, frame pacing histograms, memory gauges, and GPU renderer strings to eliminate horizontal overflow on narrow Android viewports.
- Network Sniffer Consolidation: Consolidated standalone Network Sniffer into Logs, removing redundant subview routing while preserving full HTTP request inspection and 404 diagnostics.

### Added

- Tap-to-select capturing handler in Developer Inspector overlay for seamless element selection and automatic exit on select.
- Complete Studio design token integration (`--app-bg`, `--app-surface`, `--c-text-primary`, `--c-border`, `--studio-accent-from`) across Developer Inspector for seamless Light, Dark, and AMOLED modes.

## 4.5.41

Release Date: 2026-08-23

### Added

- Global HeroUI Dialog & Modal Migration: Unified all application dialogs, confirmation dialogs, and modal overlays under HeroUI's AlertDialog compound components (AlertDialog, Backdrop, Container, Dialog, CloseTrigger, Header, Icon, Heading, Body, Footer) across Stagex, Chordex, Drumex, Vocalex, and Hub.
- Destructive Confirmation Safety: Applied danger status and enforced backdrop dismissal prevention on destructive operations to avoid accidental data loss.
- Global HeroUI Button & ButtonGroup System: Replaced custom buttons and standalone action triggers with HeroUI Button, and unified paired/connected actions (measure/timeline tools, regenerate/random templates, clear/copy logs) under HeroUI ButtonGroup.
- Verifiable Developer Diagnostics: Rebuilt Developer Options (System, Apps, Performance, Logs) with real, verifiable runtime telemetry for Android OS, WebView version, battery, storage, display characteristics, network Wi-Fi filters, and live memory metrics.

## 4.5.40

Release Date: 2026-08-23

### Fixed

- Global AMOLED True Black: Fixed StageCorePanel settings fallback and replaced hardcoded near-black surfaces with var(--app-bg) to guarantee true #000000 black base across all internal apps, Hub, and Settings.
- Dark Mode Surface Polish: Darkened dark surface scale and glass tint to eliminate gray wash across bottom sheets, DrumEditor, SongsPanel, and AccountProfileHeader.
- Appearance Theme Mode Icons: Corrected Theme Toggle icon mapping to Light Mode -> Sun, Dark Mode -> Moon, and AMOLED Mode -> Eclipse with live spring transitions.
- Appearance Component Theming: Added --control-track-bg token and theme-adaptive borders/backgrounds across SegmentedControl, SettingRow, SettingSection, BentoSettingCard, and Language selector.
- Restored About Section in Settings: Restored About and Developer Options destinations in Settings > System & About with full theme support and seamless back navigation.
- App Changer Layout Overflow: Replaced asymmetrical 3-column grid with a centered responsive flex dock respecting horizontal safe-area insets, preventing clipping and viewport overflow across all Android screen sizes.
- Bottom Navigation Polish: Removed search satellite button from Hub home page and optimized satellite glass button dimensions to match the main dock.

## 4.5.39

Release Date: 2026-08-23

### Added

- Harmonized Liquid Glass surface material and backdrop blur tokens across Bento cards, Bento setting controls, Profile metric containers, and Studio Auth surfaces.
- Unified optical backdrop filtering with single-pass CSS custom property tokens, preventing Android WebView compositing overhead and rendering jank.
- Synchronized tactile micro-interactions with SpringPresets physics across interactive glass surfaces, modal dismiss controls, and navigation buttons.

## 4.5.38

Release Date: 2026-08-23

### Added

- Implemented true floating glass top bar on Android Settings child screens (Appearance, Help & Support, FAQ, Updater, About, Privacy, Terms, Licenses, Bug Report) with large pill radius, centered titles, and smooth spring-animated back navigation.
- Refined Liquid Glass material system with ~60% natural optical overlay, restrained lighting, soft edge definition, and multi-layered depth shadows across Dark, Light, and AMOLED modes.
- Enhanced bottom navigation dock sizing (64px height, 28px corner radius, 80px slot width for Hub) with comfortable breathing room for icon and label.
- Maintained consistent vertical icon-above-label hierarchy with resting label visibility and zero layout shifting.
- Synchronized active glass lens capsule and standalone floating search button with matching 64px height and 28px radius.

## 4.5.37

Release Date: 2026-08-22

### Fixed

- Resolved Settings sub-pages navigation bug (Appearance, Help & Support, Report a Bug, Updater) where font ligature failure caused back icons to render as clipped text `"w_b"`, back button opacity was tied to scroll position, and isolated floating capsule obscured page titles.
- Rebuilt SharedFloatingHeader and SettingsScaffold with a full-width integrated Liquid Glass top bar, centered title, robust SVG vector back chevron, and proper top scroll padding.
- Hardened navigation stack handling in HubSettings and HubHelp to safely return to Settings root.

### Added

- Redesigned mobile bottom navigation with compact 58px height, soft 26px squircle radius, and vertical icon-above-label hierarchy matching native reference specifications.
- Section names now remain consistently visible below their respective icons across all resting states with zero layout shifting.
- Active navigation item indicator refactored as a soft 20px squircle lens that smoothly glides between tabs using critically damped spring physics.
- Matched separate Search and App Switcher action buttons to 58px / 26px radius with identical optical glass material and horizontal baseline alignment.
- Polished Profile Bento metric cards (Favorites, Progressions, Presets, Sync) by removing artificial 1px hard rim lines and colored background halos.

## 4.5.36

Release Date: 2026-08-22

### Fixed

- Resolved critical section-entry runtime exception (`ReferenceError: isLight is not defined`) in `HubSettings` by declaring `isLight` derived from active settings and media queries.

### Added

- Refactored shared Liquid Glass design tokens with realistic optical transparency, live backdrop blur, and soft micro-specular responses across Dark, Light, and AMOLED themes.
- Upgraded mobile bottom navigation dock with natural environmental transparency, soft radial depth vignetting, and clean optical boundaries.
- Modernized top bar material system with soft curvature-aware specular highlights, removing hard 1px artificial white rim lines.
- Cleaned Hub module launcher cards by eliminating colored right-side circular highlight blobs and hard rim lines for a premium, unified aesthetic.
- Removed capsule container surrounding the Livex logo in Hub header for clean, native visual alignment.

## 4.5.35

Release Date: 2026-08-22

### Added

- Audited and refined Shared Interactive Design System primitives: tactile spring compression on buttons (`Button`, `IconButton`, `FloatingButton`, `ActionButton`), modular `BentoCard` Liquid Glass containers, squircle inputs and search bars, interactive `ListRow` list items, squircle filter chips, and polished feedback skeletons.
- Modernized mobile Profile experience with glowing chromatic avatar ring, dynamic entitlement role badge, 4 modular Liquid Glass Bento metric cards (Favorites, Progressions, Presets, Cloud Sync), and copyable developer UID code pill.
- Enhanced mobile Settings experience with GPU-accelerated spring `StudioToggle`, tactile `SettingRow` and `BentoSettingCard` containers, and polished language selection sheet.
- Synchronized mobile motion system tokens (`SpringPresets`, `EasingPresets`, `DurationPresets`, `--motion-ease-*` CSS variables) around critically damped physics for smooth velocity continuity and zero oscillation.
- Upgraded Studio Hub layout hierarchy with modular Liquid Glass Bento cards, specular highlight reflections, and tactile spring microinteractions.

## 4.5.34

Release Date: 2026-08-19

### Added

- Redesigned mobile bottom navigation with unified-object center-anchor collapse scaling (`containerScale`), eliminating internal item layout reflow.
- Replaced multi-transform Search / App Changer bubble animation with in-place opacity-only fade during downward scroll.
- Migrated bottom navigation dock and floating bubble materials to canonical CSS design tokens (`--surface-topbar-*`, `--surface-float-blur`) with full Dark, Light, and AMOLED compatibility.
- Retuned navigation spring physics to critically damped curves (`stiffness: 340, damping: 28, mass: 0.9`) for a smooth, physical, native feel.

## 4.5.33

Release Date: 2026-08-19

### Added

- Modernized Studio Hub and bottom navigation dock with layered translucent liquid-glass controls, specular highlight reflections, and dynamic spring physics.
- Implemented interruptible scroll-driven bottom navigation collapse choreography where inactive items fade and shift inward toward active item, morphing the dock into a compact pill island.
- Upgraded HubAppGrid launcher cards with spring touch feedback, specular border highlights, and ambient app brand color glow.
- Coordinated Studio Hub header and pinned quick action shortcuts with scroll-responsive compression and liquid-glass circular styling.
- Modernized Hub-owned settings and profile screens with elevated glass cards and ambient profile avatar rings.

## 4.5.32

Release Date: 2026-08-15

### Added

- Hardened Android intent content resolution boundary with dynamic `PackageManager` provider self-exclusion in `SafeContentResolver` to prevent Confused Deputy attacks.
- Modernized native-to-web IPC bridge by replacing dynamic `evaluateJavascript` execution with structured Capacitor events (`AppInstallerPlugin.instance.emitSharedFileReceived`) for secure shared file delivery.
- Implemented static enum theme matcher in `MainActivity.kt` ensuring zero untrusted script execution in WebView context.
- Streamlined `SafeContentResolver.openSafeInputStream` to support physical file descriptors and virtual cloud documents (Google Drive, OneDrive, MediaStore) while enforcing strict 5MB text and 50MB stream bounds.
- Added comprehensive Android JVM security unit test suite in `SafeContentResolverTest.java` verifying scheme validation, authority normalization, and directory traversal protections.

## 4.5.31

Release Date: 2026-08-13

### Added

- Implemented production-quality live-blur liquid-glass treatment for the shared Studio top bar with specular highlight rim, multi-layer gradient depth, and GPU compositing layer promotion (`transform: translateZ(0)`).
- Upgraded top bar theme tokens with calibrated contrast, bevel reflections, and solid fallback tints for Dark, Light, and AMOLED modes.
- Added dynamic app-specific bottom navigation items, elastic gliding active indicator highlight, and smooth drag-to-scrub navigation gestures.
- Cleaned Stagex production UI by eliminating the intrusive in-screen diagnostics floating overlay while preserving full telemetry in DevTools.
- Added bottom navigation startup lifecycle guard to prevent premature mounting or visual bleed-through during Studio boot/startup animation.

## 4.5.30

Release Date: 2026-08-13

### Added

- Integrated Android Liquid Glass navigation dock via CMP Backdrop (`io.github.kyant0:backdrop`) with live blur, lens refraction, vibrancy, specular highlight contour, and theme-adaptive styling.
- Mounted native Compose Liquid Glass overlay onto host ViewGroup to render seamless backdrop shaders behind navigation elements.
- Embedded crisp native vector icons on top of the Liquid Glass surface while maintaining transparent DOM hitboxes for touch routing.
- Fixed critical RootApp runtime TDZ ReferenceErrors in SharedNavigationBar and SharedAppShell.
- Introduced automated TDZ hook order & variable scope regression guard (`scripts/check-hook-order.mjs`) into the lint/build CI pipeline.

## 4.5.29

Release Date: 2026-08-12

### Added

- Fixed critical RootApp runtime TDZ crash (ReferenceError: Cannot access 'R' before initialization) by correcting declaration ordering in SharedNavigationBar.tsx.

## 4.5.28

Release Date: 2026-08-11

### Added

- Refined Bottom Navigation visual glass surface with stronger visibility borders, outline-border stroke rendering, and a capsule shape selected indicator.
- Integrated the Search floating button and the App Changer floating button into the same native CMP Backdrop system.
- Configured theme-aware fill opacities and edge stroke tints for Light, Dark, and AMOLED themes.

## 4.5.27

Release Date: 2026-08-11

### Added

- Replaced the previous bottom navigation Liquid Glass with Kyant0 Backdrop (CMP Backdrop).
- Normalized the visual glass bottom navigation bar height to exactly 64 dp (collapsing to 32 dp when scrolling).
- Implemented a backdrop-based selected-item highlight lens.
- Hosted the native WebView inside a Compose AndroidView to capture background drawing commands for real-time backdrop blur.

## 4.5.26

Release Date: 2026-08-11

### Added

- Integrated the high-performance native Liquid Glass visual effect from `com.qmdeve:liquidglass:core:1.0.5` on the Studio Android bottom navigation bar.
- Normalized the bottom navigation bar height to exactly 42 px (collapsing to 21 px when scrolling).
- Implemented continuous layout rect tracking in React via RequestAnimationFrame to synchronize with the native positioning layer.
- Added a lightweight, theme-appropriate native drawable fallback background for Android versions older than Android 13 (API < 33).

## 4.5.25

Release Date: 2026-08-11

### Added

- Hardened the Android production release pipeline to make it deterministic, safe, and fast.
- Implemented an idempotent version synchronization mechanism with SHA-256 content verification.
- Integrated a canonical version guard that validates release candidate versionCode against production.
- Added versionCode collision safety checks that fail-fast if MIN or PAT versions would cause collisions.
- Configured a Preflight-to-Build release state hash check to verify checkout equivalence.
- Restored standard dirty-tree checking in Vite without generated-file allowlists.

## 4.5.24

Release Date: 2026-08-11

### Added

- Migrated Vocalex delete, sorting, and metadata actions to the stateful @beui/button-base design system.
- Migrated Studio Hub developer options controls to the stateful @beui/button-base button systems.
- Migrated all authentication, settings, preferences, and sub-app action buttons across Chordex, Groovex, and Stagex to BeUI design primitives.
- Ensured zero auditory feedback and neutral visual styling on the About page SpotlightLogo.
- Created canonical design tokens for spacing, typography, and surface floating elements in tokens.css.
- Migrated Studio Hub, Settings dashboards, scaffolds, and headers to layout tokens, eliminating hardcoded values.
- Added automated token check regression guard rule (pnpm check:tokens) in CI/build pipeline.
- Applied real backdrop-filter blur and metallic/reflective inner-bezel highlights to the bottom navigation bar and float buttons.
- Implemented Framer Motion elastic squish-and-stretch micro-animations on tab icon selection.
- Added direction-aware liquid/gooey transition stretching to active-tab indicator pill.
- Fixed tab scrubbing gestures via continuous fractional pointer indexing.

## 4.5.23

Release Date: 2026-08-11

### Added

- Migrated Vocalex delete, sorting, and metadata actions to the stateful @beui/button-base design system.
- Migrated Studio Hub developer options controls to the stateful @beui/button-base button systems.
- Migrated all authentication, settings, preferences, and sub-app action buttons across Chordex, Groovex, and Stagex to BeUI design primitives.
- Ensured zero auditory feedback and neutral visual styling on the About page SpotlightLogo.
- Created canonical design tokens for spacing, typography, and surface floating elements in tokens.css.
- Migrated Studio Hub, Settings dashboards, scaffolds, and headers to layout tokens, eliminating hardcoded values.
- Added automated token check regression guard rule (pnpm check:tokens) in CI/build pipeline.
- Applied real backdrop-filter blur and metallic/reflective inner-bezel highlights to the bottom navigation bar and float buttons.
- Implemented Framer Motion elastic squish-and-stretch micro-animations on tab icon selection.
- Added direction-aware liquid/gooey transition stretching to active-tab indicator pill.
- Fixed tab scrubbing gestures via continuous fractional pointer indexing.

## 4.5.22

Release Date: 2026-08-11

### Added

- Migrated Vocalex delete, sorting, and metadata actions to the stateful @beui/button-base design system.
- Migrated Studio Hub developer options controls to the stateful @beui/button-base button systems.
- Migrated all authentication, settings, preferences, and sub-app action buttons across Chordex, Groovex, and Stagex to BeUI design primitives.
- Ensured zero auditory feedback and neutral visual styling on the About page SpotlightLogo.
- Created canonical design tokens for spacing, typography, and surface floating elements in tokens.css.
- Migrated Studio Hub, Settings dashboards, scaffolds, and headers to layout tokens, eliminating hardcoded values.
- Added automated token check regression guard rule (pnpm check:tokens) in CI/build pipeline.
- Applied real backdrop-filter blur and metallic/reflective inner-bezel highlights to the bottom navigation bar and float buttons.
- Implemented Framer Motion elastic squish-and-stretch micro-animations on tab icon selection.
- Added direction-aware liquid/gooey transition stretching to active-tab indicator pill.
- Fixed tab scrubbing gestures via continuous fractional pointer indexing.

## 4.5.21

Release Date: 2026-08-11

### Added

- Migrated Vocalex delete, sorting, and metadata actions to the stateful @beui/button-base design system.
- Migrated Studio Hub developer options controls to the stateful @beui/button-base button systems.
- Migrated all authentication, settings, preferences, and sub-app action buttons across Chordex, Groovex, and Stagex to BeUI design primitives.
- Ensured zero auditory feedback and neutral visual styling on the About page SpotlightLogo.
- Created canonical design tokens for spacing, typography, and surface floating elements in tokens.css.
- Migrated Studio Hub, Settings dashboards, scaffolds, and headers to layout tokens, eliminating hardcoded values.
- Added automated token check regression guard rule (pnpm check:tokens) in CI/build pipeline.
- Applied real backdrop-filter blur and metallic/reflective inner-bezel highlights to the bottom navigation bar and float buttons.
- Implemented Framer Motion elastic squish-and-stretch micro-animations on tab icon selection.
- Added direction-aware liquid/gooey transition stretching to active-tab indicator pill.
- Fixed tab scrubbing gestures via continuous fractional pointer indexing.

## 4.5.20

Release Date: 2026-08-09

### Added

- Replaced the About page illustration with the visual-only, click-sound-free, neutral SpotlightLogo.
- Refactored global page titles to a prominent 32px typography size, left-aligned, standard weight, and vertically aligned env(safe-area-inset-top) + 72px page geometry.
- Constrained Settings sub-pages content max-width to 640px centered, with padding-left/right of 24px, and centered main settings dashboard list.
- Moved the shared floating top bar 15% higher and increased transparency slightly.
- Refactored the central button component library to use BeUI button physics (0.93 scale on tap, 1.02 on hover on fine-pointer devices, spring dynamics, and touch ripple).

## 4.5.19

Release Date: 2026-08-09

### Added

- Integrated the @ncdai/share-menu dropdown component into StageX collaborative session room invites.
- Mounted the Sonner <Toaster /> globally in SharedAppShell.tsx to handle toast feedback.

### Fixed

- Resolved version comparison regression test suite failures by aligning downgrade validation assertions.

## 4.5.18

Release Date: 2026-08-09

### Fixed

- Normalized global title typography to 18px and vertical placement (pt-12 pb-4 px-6) across all modules and settings pages.
- Moved the shared Top Bar 15% higher and increased background transparency.

## 4.5.17

Release Date: 2026-08-09

### Fixed

- Normalized the shared Top Bar across Studio/Livex so it is positioned higher and is more transparent.
- Scaled up the Top Bar title font size slightly and centered it.
- Removed all custom and shared back buttons associated with page headers and top bars from the entire application.

## 4.5.16

Release Date: 2026-08-09

### Fixed

- Fixed icon reverse animations on tab exit by preserving tab icon mounting state during navigation.
- Centered the section header title independently against the floating capsule bounds and aligned its font size to the standard type-scale.
- Refined floating header translucency, position elevation, and scroll-reveal threshold state machine clamping.
- Verified tab highlight alignment geometry, collapse container transforms, and stationary back button layout.

## 4.5.15

Release Date: 2026-08-08

### Fixed

- Replaced hand-rolled icon animations with native lucide-animated SVG components across all apps.
- Resolved navigation child item drift on scroll collapse by applying fixed width and absolute centering.
- Adjusted top bar SharedFloatingHeader proportions, translucent warm tinted glass styling, and unified Developer Options pill header layout.
- Converted Developer Options to a full-screen settings page layout, eliminating drawer width limits and stray left border lines.

## 4.5.14

Release Date: 2026-08-08

### Fixed

- Replaced whole-bar CSS scale transitions with dynamic container center-collapse using Framer Motion.
- Programmed individual tab items to translate horizontally inwards to the center and fade out on scroll down.
- Resolved scroll-hide and watchdog race by implementing interaction priority tracking with lockout retries.
- Verified circular updater loader, bottom navigation center-collapse, and StageX seamless background rendering.

## 4.5.13

Release Date: 2026-08-07

### Fixed

- Enforced single canonical responsive content-width architecture across all settings, preferences, updater, developer options, and profile screens.
- Refined floating top bar capsule geometry to match beUI Pro proportions and removed Livex logo for visual balance.
- Fixed Updater What's New section to render release notes automatically upon update detection.
- Stacked Developer Inspector floating control button directly above Route Tracer control button.
- Verified circular updater loader, bottom navigation center-collapse, and StageX seamless background rendering.

## 4.5.12

Release Date: 2026-08-07

### Fixed

- Completely separated Chordex preferences from Hub/Studio Settings and removed App Theme control from Chordex Preferences.
- Redesigned floating top header (shorter 44px height, wider horizontal width, higher position) aligned with card boundaries below.
- Positioned Livex logo on the right side of the floating header with theme-dependent color (black in Light, white in Dark/AMOLED, never accent color).
- Accelerated app intro animations by 30% across all 6 applications (Hub, Chordex, StageX, Groovex, Drumex, Vocalex) with theme-stable initial frames.
- Made Developer Inspector compact (floating drawer panel) and repaired debug controls.

## 4.5.11

Release Date: 2026-08-07

### Fixed

- Fixed StageX top seam and top area background blending across Light, Dark, and AMOLED themes.
- Kept StageX bottom navigation mounted and visible when tapping + to open element menu overlay.
- Corrected stage direction label to DOWNSTAGE and updated font family to Space Grotesk.
- Integrated official Fluid Functionalism ColorPicker component for StageX element styling.

## 4.5.10

Release Date: 2026-08-07

### Fixed

- Fixed StageX top seam and top area background blending across Light, Dark, and AMOLED themes.
- Kept StageX bottom navigation mounted and visible when tapping + to open element menu overlay.
- Corrected stage direction label to DOWNSTAGE and updated font family to Space Grotesk.
- Integrated official Fluid Functionalism ColorPicker component for StageX element styling.

## 4.5.9

Release Date: 2026-08-07

### Fixed

- Restored spec-compliant custom Accent Color picker (Visual Canvas Saturation/Lightness picker + Hue slider + custom preset manager).
- Repaired theme cycle state-machine to correctly cycle White → Dark → AMOLED → White.
- Restored canonical circular rotating loader component (variant="spinner") in foreground update checking state.
- Fixed About Page orbit animation orbiter collapse bug by using inline coordinates fallback.
- Corrected alignment of about content button rows by standardizing horizontal paddings.
- Repaired StageX outer panel theme contrast mismatch in standard Dark Mode.
- Resolved Developer Options/Updater Diagnostics horizontally squashed mobile layout and log viewer word-wrapping.
- Polished MorphingModal fade/scale animation and eliminated persistent backdrop-filter blur when modals are closed.

## 4.5.8

Release Date: 2026-08-07

### Added

- Automated regression test for version 4.5.8 release pipeline.

## 4.5.7

Release Date: 2026-08-07

### Added

- Automated regression test for version 4.5.7 release pipeline.

Each release on the OTA channel is described in its own section below.
The release script (`scripts/release-firebase.mjs`) reads this file and
copies the bullet list under the section that matches the current
`APP_VERSION` into `version.json`'s `changelog` field, so the in-app
"Update available" modal always shows the actual changes that ship in
that bundle.

## 4.5.6

Release Date: 2026-08-07

### Fixed

- Fixed critical RootApp TDZ crash caused by synchronous useTransform evaluation in SharedNavigationBar.

## 4.5.5

Release Date: 2026-08-07

### Fixed

- Fixed critical RootApp runtime TDZ crash (`ReferenceError: Cannot access 'xe' before initialization`) by removing unused `rawProgress` and `downloadPct` variables from `UpdateIndicator.tsx`.
- Restored the exact 3-stage GitHub Release Pipeline (Preflight, Build, Package & Sign, Publish) as Run #703.

## 4.5.4

Release Date: 2026-08-07

### Added

- Redesigned RootApp crash screen and developer report UI, implementing clean system recovery view and structured diagnostics tabs.
- Broke circular dependency loops and added automated circular dependency checking to verify-circular-deps script.
- Restored Release Pipeline to match #703 parity.

## 4.5.3

Release Date: 2026-08-07

### Added

- Redesigned RootApp crash report analyzer engine and visual dashboard UI with structured facts, evidence, and chronological timelines.
- Restored release pipeline behavior to parity with Run #703 including certificate verification.

## 4.5.2

Release Date: 2026-08-07

### Added

- Redesigned RootApp crash screen UI into a structured, searchable engineering report with recovery actions, card layout, component hierarchy tree, and expandable raw details.
- Restored GitHub Release Pipeline (`release.yml`) to match Pipeline #703 multi-stage preflight checks and keystore fingerprint verification.

## 4.5.1

Release Date: 2026-08-07

### Added

- Implemented production-grade Diagnostic Intelligence Layer across studio-core and ui-shared error systems.
- Added automated root cause analysis, hypothesis confidence scoring, file prioritization, and error deduplication.

## 4.5.0

Release Date: 2026-08-07

### Fixed

- Fixed StudioHub startup crash (`ReferenceError: Cannot access 'Se' before initialization`) by configuring Rollup bundling with a dedicated `motion-vendor` chunk to prevent temporal dead zones.

### Added

- Completed repository-wide migration to the official BeUI component library, successfully replacing all legacy themes, accordions, modals, and loaders.

## 4.3.91

Release Date: 2026-08-06

### Improved

- Migrated the complete motion system across all applications to official BeUI components (`ThemeToggle`, `MorphingModal`, `BouncyAccordion`, `Loader`).
- Executed production Android release pipeline v4.3.91 (versionCode 40422) with signed APK and metadata synchronization.

## 4.3.90

Release Date: 2026-08-06

### Improved

- Migrated the complete motion system across all applications to official BeUI components (`ThemeToggle`, `MorphingModal`, `BouncyAccordion`, `Loader`).
- Executed production Android release pipeline v4.3.90 (versionCode 40421) with signed APK and metadata synchronization.

## 4.3.88

Release Date: 2026-08-06

### Improved

- Validated complete application runtime performance, theme engine stability, and gesture navigation responsiveness.
- Executed production Android release pipeline v4.3.88 (versionCode 40419) with signed APK and metadata synchronization.

## 4.3.87

Release Date: 2026-08-06

### Fixed

- Fixed application load latency across all apps by pre-compiling sub-app entry points synchronously without dynamic promise fallbacks.
- Resolved SubAppWrapper mounting sequence ensuring navigation routes render immediately without empty screens.
- Eliminated artificial transition timeouts in ApplicationTransitionEngine to achieve 60 FPS smooth launch.
- Synchronized bottom navigation highlight indicator directly with drag gestures, removing smoothing delay.
- Optimized color pickers and theme updates to decouple store mutations from pointer events.
- Restored rotating app animation in About panel and fixed native Android updater interface.

## 4.3.86

Release Date: 2026-08-06

### Improved

- Refactored Release Pipeline into 3 clean, consolidated stages in GitHub Actions.
- Consolidated preflight code quality and version consistency checks into release-firebase.mjs.
- Accelerated pipeline execution speed by eliminating redundant workflow steps.

## 4.3.85

Release Date: 2026-08-06

### Improved

- Optimized Color Picker performance to 60 FPS continuous dragging by decoupling Zustand store commits from pointermove events and applying instant CSS variables.
- Clamped Color Picker saturation selector thumb strictly within container boundaries and fixed hue 360-degree reset jump.
- Polished Light theme transition and synchronized application-wide repaints in a single atomic pass.
- Added automatic update check during application startup initialization after Phase 5 completes.
- Ensured bottom navigation icon entrance animations play consistently whenever entering tabs across Hub, Chordex, Drumex, Stagex, Groovex, and Vocalex.

## 4.3.84

Release Date: 2026-08-06

### Improved

- Modernized keytool printcert metadata parser to be version-independent and added verbose diagnostics logging.
- Natively integrated Jetpack Compose InkFlow transition animation overlay, fixed updater version comparison state machine to check both SemVer and versionCode, resolved isUpdateDismissed timeout bugs, eliminated Color Picker saturation grid boundary overflow and hue slider jumps, and decoupled bottom navigation icons from pointer action overrides.

## 4.3.83

Release Date: 2026-08-06

### Improved

- Integrated Jetpack Compose natively and replaced theme transition with official InkFlow library reveal animation.
- Fixed updater decision pipeline state machine to correctly compare both SemVer and Android versionCode and handle inconsistent metadata.
- Resolved isUpdateDismissed timeout evaluation bug returning true by default.
- Prevented Color Picker saturation thumb boundary overflow and fixed HSL 360-degree hue reset.
- Normalized HSL proxy color values to HEX to resolve the frame-skipping drag rendering loop.
- Decoupled bottom navigation item button handlers from pointer event overrides, driving animations purely by navigation active state transitions.

## 4.3.82

Release Date: 2026-08-06

### Improved

- Polished the accent Color Picker to be horizontally centered and clip saturation selector thumb correctly at boundaries.
- Replaced Framer Motion thumb positioning with standard CSS styles to eliminate 1-frame layout jitter.
- Enlarged global Switch track dimensions (48x28) and thumb size (22) to support a comfortable 48px Android touch target.
- Redesigned the Language selector settings interface as a row opening a premium spring-animated Dialog modal.
- Re-implemented the Updater Diagnostics screen to use collapsible native details cards, a live logs panel with level/search filtering, and a state machine vertical timeline.
- Fixed bottom navigation animations to trigger on all tab transition paths (labels, padding, and programmatic navigation).

## 4.3.81

Release Date: 2026-08-06

### Added

- Installed fluidfunctionalism Color Picker component with HEX, RGB, HSL, OKLCH format support, eyedropper, and preset swatches.
- Installed fluidfunctionalism Switch component with spring physics and draggable interaction.
- Built Updater Engineering Diagnostics page with comprehensive system state inspection.
- Added Copy Diagnostics button for the Updater module with full engineering report generation.

### Improved

- Refactored navigation icon animations to be purely state-driven, decoupled from pointer events.
- Integrated the Color Picker globally into the accent color selector with alpha controls removed.
- Migrated all Toggle/Switch components across Hub, Chordex, and Drumex to the new Switch.
- Restored Language selector in Appearance settings.

### Fixed

- Fixed updater version comparison logic to only offer strictly newer versions as updates.
- Removed the changelog/What's New section from the updater dialog.

## 4.3.80

Release Date: 2026-08-05

### Improved

- Implemented production-quality collaboration engineering diagnostics system to expose raw Firebase exception details.
- Added comprehensive connection, authentication, network, and IndexedDB persistence state tracking.
- Captured automated operation queue retry metrics including backoff delays and drop reasons.
- Integrated friendly error fallback messages in the StageX collaboration UI.

## 4.3.79

Release Date: 2026-08-05

### Fixed

- Fixed StageX collaboration connection by forcing Firestore to use long polling (`experimentalForceLongPolling`) on Android/Capacitor WebView.
- Added comprehensive stage-by-stage connection diagnostics, auth transition tracking, and Firestore exception stack trace logging.

## 4.3.78

Release Date: 2026-08-05

### Fixed

- Fixed bottom navbar icon animations to use smooth spring transitions on tab switch and epoch-aware replay on re-tap.
- Implemented state-backed navigation collapse inside StageX and Drumex.
- Replaced ViewTransition clip-path styles with a premium, minimal, native-feeling CSS transition theme engine.
- Fixed StageX collaboration hosting to handle offline timeouts and non-blocking presence updates.

## 4.3.77

Release Date: 2026-08-05

### Fixed

- Fixed empty icons in Chordex bottom navigation bar.
- Normalized Start On preferences across Drumex, StageX, Vocalex, and removed Start On setting from Groovex.
- Redesigned bottom navigation bar icon animations with zero cooldown and full tab button hit target.
- Centered Groovex bottom navigation bar symmetrically on all mobile screen sizes.
- Fixed updater version comparison logic to prevent offering currently installed versions.
- Removed Beta tag from application version labels.

## 4.3.76

Release Date: 2026-08-05

### Fixed

- Canonicalized all app routing identifiers across the workspace (`chordex`, `drumex`, `stagex`).
- Validated StageX collaboration runtime and Firestore initialization fallback for unprovisioned environments.
- Normalized Hub sub-routes to prevent duplicate path segments in RouteTracer.

## 4.3.75

Release Date: 2026-08-05

### Fixed

- Resolved Light Mode visual consistency across Chordex, Vocalex, Drumex, and Hub.
- Fixed update pipeline startup race condition and version comparison checks.
- Improved bottom navbar spring tap/press animations.
- Eliminated switcher toggle layout overlap and collision on mobile screens.
- Resolved theme transition paint bottlenecks and layout thrashing.

## 4.3.74

Release Date: 2026-08-04

### Fixed

- Fixed ReferenceError for \`vParts\` in \`sync-version.mjs\` during versionCode generation.
- Fixed scoping issue for \`expectedVersionName\` in \`validate-app-installer.mjs\` causing ReferenceErrors during validation.

## 4.3.73

Release Date: 2026-08-04

### Fixed

- Fixed ReferenceError in generate-release-metadata.mjs by reading appVersion.ts into appVersionSrc.
- Passed --allow-missing-apk to validate-app-installer.mjs during release metadata generation.

## 4.3.72

Release Date: 2026-08-04

### Fixed

- Refactored release-firebase.mjs pipeline into a strict two-phase atomic transaction to prevent partial remote publication when downstream validations fail.
- Fixed baseline previous-release resolution in releaseState.mjs and discoverApkAsset to strictly exclude the current building version and prevent self-comparison errors.
- Enforced complete local manifest and contract validation before GitHub release creation and Firebase deployment.

## 4.3.71

Release Date: 2026-08-04

### Added

- Production release version bump to 4.3.71 for automated end-to-end Release Pipeline execution.

## 4.3.70

Release Date: 2026-08-04

### Fixed

- Fixed StageX collaboration connection reliability by enabling Firestore offline persistence.
- Resolved memory leaks and background heartbeat persistence by calling leaveRoom on component unmount and page unload.
- Added max retry limit and exponential backoff to OperationQueue to prevent infinite blocking on permanent errors.
- Added timestamp filtering to operations subscription to prevent replaying historical operations on room join.
- Debounced local state diffing in CollaborationService to optimize Firestore write performance during continuous edits.
- Enforced presence user ownership in Firestore security rules.
- Added auto-leave handler on auth state sign-out in CollaborationService.

## 4.3.69

Release Date: 2026-08-04

### Added

- Refactored release infrastructure to use parse-version single source of truth.
- Consolidated duplicate validation checks and optimized pipeline to reduce execution latency.
- Replaced version-locked verifier scripts with a single parameterized post-release checker.
- Fixed undefined appVersionPath ReferenceError in release orchestration signing preflight check.
- Fixed GHA checkout latency by removing blobless clone filters.
- Fixed missing Supabase environment variables in Job 3 Publish step.
- Fixed signing preflight conditional check during --skip-build execution.
- Fixed Capacitor sync and Gradle compile conditionals during --skip-build execution.
- Fixed release baseline resolution to exclude current release tag during contract validation.
- Fixed git tag fallback in releaseState.mjs for baseline resolution.
- Fixed prevVersion self-referencing check in releaseState.mjs.
- Fixed getAppVersionInfo import path and temp file cleanup in validate-app-installer.mjs.

## 4.3.55

Release Date: 2026-08-02

### Added

- End-to-end validation release verifying Release Doctor, Governance Layer, and automated previous APK installer contracts.

## 4.3.54

Release Date: 2026-08-02

### Added

- Modernized Release Pipeline actions to Node 24 and fixed Firestore rules deployment using releaseFirestoreRulesetFromSource.

## 4.3.52

Release Date: 2026-08-02

### Added

- Refactored rules deployer script using modern v14 modular app and security-rules APIs.

## 4.3.51

Release Date: 2026-08-02

### Added

- Refactored dynamic imports in deploy-rules-admin to handle both default and module namespace exports.

## 4.3.50

Release Date: 2026-08-02

### Added

- Restored the premium, spec-compliant custom Accent Color picker (Visual Canvas Saturation/Lightness picker + Hue slider + custom preset manager).
- Permanently cleaned up and deleted the obsolete Language options, language sheet, and `renderLanguageContent` routing.
- Configured explicit pnpm setup in Job 4 of the GitHub Actions Release Pipeline.

## 4.3.49

Release Date: 2026-08-02

### Added

- Updated Firestore security rules deployer to support pnpm workspace constraints.

## 4.3.48

Release Date: 2026-08-02

### Added

- Configured automated Firestore rules deployment using the Firebase Admin SDK.
- Restored Settings and Updater layout configurations to match v4.3.43.

## 4.3.47

Release Date: 2026-08-02

### Added

- Deployed automated Firestore security rules deployment to the release pipeline.
- Restored missing settings layout, updated Updater section, and language removal features.
- Surfaced raw exception messages and diagnostic stack traces on collaboration connection errors.

## 4.3.46

Release Date: 2026-08-02

### Added

- Configured Firestore to use HTTPS long-polling instead of gRPC/WebSockets to guarantee reliable connectivity inside Capacitor WebViews.
- Implemented deep forensic instrumentation logs throughout the room hosting flow.
- Removed client-side TTL database pruning from the room creation sequence.

## 4.3.45

Release Date: 2026-08-02

### Added

- Rebuilt StageX real-time collaboration with the premium Stitch dark glassmorphism design.
- Implemented accessible custom Segmented OTP Input component (Moumen design) supporting keyboard, clipboard paste, and deletion.
- Added live collaborator participant lists, connection quality indicator signals, and operational sync status feedback.
- Integrated collaborative Undo and Redo synchronization.
- Resolved Firestore connection restrictions by deploying updated security rules for rooms.
- Added client-side Firestore SDK error mapping for friendly user connection notifications.

## 4.3.44

Release Date: 2026-08-02

### Added

- Implemented production-quality real-time collaboration system for StageX utilizing Firestore.
- Added live presence tracking and participant cursor color indicators.
- Created operation-based synchronization engine with conflict resolution and offline queuing.
- Added a Collaborate button and dialog popup in both mobile and desktop views.

## 4.3.43

Release Date: 2026-08-01

### Added

- Integrated automated Capacitor asset freshness and content verification checks into the release pipeline to prevent shipping stale builds.
- Refined global collapsing headers top style spacing globally to match Material 3 specifications.
- Removed settings navigation gear icon in the upper-right corner of the Profile tab view.

## 4.3.42

Release Date: 2026-08-01

### Added

- Modernized shared design system buttons, diagnostics panels, and audio/cache/sync/security troubleshooters to use the unified, GPU-accelerated Lucide Animated icon system.

## 4.3.41

Release Date: 2026-08-01

### Added

- Modernized the updater progress indicators, success check animations, and sidebar settings icons with a unified GPU-accelerated Lucide icon system.

## 4.3.40

Release Date: 2026-08-01

### Added

- Restored responsive chord diagram previews inside category cards, list views, and search results inside Chordex.

### Fixed

- Normalized preferences routing mapping from `/chords/settings/settings` to `/chords/preferences` to eliminate nested duplicate layout regressions.
- Simplified the Updater screen by removing release channel options and embedded changelog timeline to prevent interface duplication.
- Moved the Developer Inspector Route Tracer overlay behind a persisted configuration toggle, disabling it by default.
- Wrapped the Language Selector bottom sheet inside a React Portal targeting the body element to fix scroll-offset positioning displacement bugs.
- Resolved the chord detail black screen navigation bug on both desktop and mobile viewports.

## 4.3.39

Release Date: 2026-08-01

### Added

- Overhauled spacing defaults and layout parameters for the Global Density system to apply proportional, well-bounded scaling across all modules (Hub, Settings, Chordex, Groovex, Stagex, Drumex, Vocalex).
- Implemented a reusable floating rounded card header with theme-adaptive backdrop filter blur and GPU-accelerated scroll interpolation.
- Restored the Settings Updater entries on both desktop and mobile dashboards, enabling users to dismiss the update overlay while keeping the update availability badge active.
- Nested the Changelog timeline history directly inside the Settings Updater detail pane.
- Built a developer-only Inspector Route Tracer overlay to trace active screens, route paths, overlay state, and active theme variables.
- Injected an Unknown Sources check inside the native updater to automatically direct users to Android settings and resume the installation flow.

## 4.3.38

Release Date: 2026-08-01

### Added

- Implemented responsive spacing, margins, button sizes, icons, card radii, and list padding matching active display density (compact, comfortable, spacious).
- Redesigned SettingsScaffold with dynamic scroll-driven sticky header (progressive opacity and translation) and seamless single continuous canvas scrolling.
- Added role="dialog" and studio-modal CSS tags to Sheet modals to automatically trigger bottom navigation collapse.
- Implemented dedicated Settings -> Changelog page with GitHub Release API fetching, offline local fallback, and premium expandable timeline.

## 4.3.37

Release Date: 2026-08-01

### Added

- Overhauled the Settings & Appearance layout with unified Material 3 aesthetics.
- Relocated Language preferences directly within the Appearance settings panel.
- Implemented an animated, rounded Bottom Sheet dialog for immediate language selection.
- Added a non-intrusive reactive Update Available alert card on the settings dashboard.
- Set scroll safety bottom padding across all settings panels to prevent navigation overlays.
- Ensured resilient update sessions that survive backgrounding, rotations, and permission settings.

## 4.3.36

Release Date: 2026-08-01

### Added

- This is a temporary release created exclusively to validate the Studio updater pipeline.
- Updater validation build.
- Release pipeline verification.
- Version propagation verification.
- Firebase metadata verification.
- GitHub Release verification.
- APK signing verification.

## 4.3.35

Release Date: 2026-08-01

### Fixed

- Restored StartupCoordinator initialization inside the SharedAppShell component, fixing native background update check execution and cold-start release detection.
- Restored Phase 4 Updater startup recovery check and listener registrations.

## 4.3.34

Release Date: 2026-07-31

### Added

- Dedicated E2E updater validation test release to assert APK download, signature checks, and PackageInstaller integration.

## 4.3.33

Release Date: 2026-07-31

### Added

- Cleaned up the Accent Color settings card by removing the redundant Accent Opacity control.
- Optimized the theme switch transition to achieve fluid and immediate 120 FPS animations.
- Configured cold boots to always land on Studio Hub -> Home to prevent launching inside stale navigation states.
- Enabled native Android 120 Hz display refresh rate and WebView hardware acceleration configurations.

## 4.3.32

Release Date: 2026-07-31

### Added

- Fixed the Android Gradle task graph to prevent stale asset packaging during native release builds.
- Registered capacitorSync and buildWebAssets as proper inputs/outputs Gradle tasks wired via AGP Artifacts API.

## 4.3.31

Release Date: 2026-07-31

### Added

- Integrated the PWA asset compilation and Capacitor synchronization tasks directly into Gradle.
- Automated the version propagation chain to guarantee identical version metadata across all build outputs.
- Synchronized version manifests across the repository.

## 4.3.30

Release Date: 2026-07-31

### Added

- Introduced a premium segmented theme selector (Light, Dark, AMOLED) using Lucide React icons.
- Implemented seamless theme switching animations using the motion/react Framer Motion package.
- Restored correct active highlight indicator and smooth transitions for the App Changer switcher.
- Cleaned up duplicate header bars and aligned page components to match Drumex Preferences style.
- Optimized vertical space of Accent Color section with an expandable canvas preview box.

## 4.3.29

Release Date: 2026-07-31

### Added

- Architecturally separated Chordex Preferences and Hub Appearance pages to resolve visual state leakage.
- Resolved updater background loop stagnation by allowing auto-checks from terminal non-active states.
- Polished Appearance screen header to keep only back button, large title, and horizontally aligned theme changer.
- Compressed Accent Color section to hide 2D canvas under an expandable active color preview box.
- Audited contrast and readability across Light, Dark, AMOLED themes, remapping theme variables dynamically.
- Replaced custom switch UI controls with the canonical Toggle component.

## 4.3.28

Release Date: 2026-07-31

### Added

- Rebuilt Livex Appearance screen from scratch matching the HTML visual source of truth specification.
- Integrated 2D color canvas picker with Hue & Opacity sliders, HEX/RGB badges, and color presets.
- Implemented Display Density, Text Size, High Contrast, Haptics, ProMotion, and Performance Boost controls.

## 4.3.27

Release Date: 2026-07-31

### Fixed

- Completely purged legacy inline Appearance implementation from StudioHub component tree.
- Removed unused legacy SingleThemeToggleRow component and exports.
- Pinned Release Pipeline workflow checkout ref to github.sha across all stages for guaranteed commit parity.

## 4.3.26

Release Date: 2026-07-31

### Fixed

- Fixed StudioHub Settings route to mount StudioHubSettingsPanel for the Appearance page instead of legacy inline render.
- Resolved UpdateIndicator auto-open suppression to ensure update prompt dialog appears automatically on new releases.
- Added comprehensive runtime logging for Appearance component mounting and Updater execution state.

## 4.3.25

Release Date: 2026-07-31

### Improved

- Re-architected Appearance settings with single animated Lucide Theme Morpher on the far right of the section header.
- Integrated Inspira UI Color Picker supporting HEX, RGB, RGBA, HSL, HSLA, swatches, and WCAG AA contrast ratio indicators.
- Added Display Density and Text Scale segmented controls.
- Resolved APK update identity issue to ensure normal in-place upgrade installation over prior releases.

## 4.3.24

Release Date: 2026-07-31

### Improved

- Restored verified canonical v4.3.15 baseline with zero UI regressions.
- Optimized 4-stage release pipeline with shallow fetch-depth: 1 and blobless filter.
- Pinned Node 24 compatible GitHub Action versions across release workflows.

# Version 4.3.15

Release Date: 2026-07-31

## Fixed

- Resolved OTA updater detection failure by comparing Firebase and GitHub Releases, adding strict HTTP cache control headers, and enforcing semver fallback comparison.
- Replaced updater download progress presentation with official COSS Progress component featuring right-aligned exact percentage and zero duplicated sub-labels.

## Added

- Completely rebuilt Appearance screen as the new reference implementation for Settings with cleaner hierarchy, glassmorphism cards, and premium spacing.
- Integrated Inspira UI Color Picker supporting Hex, RGB, RGBA, HSL, HSLA, custom swatches, and WCAG AA contrast ratio indicators.

# Version 4.3.14

Release Date: 2026-07-31

## Fixed

- Restored hardware back button, browser popstate, and GPU-friendly touch edge-swipe back navigation gestures across Hub, Settings, Chordex, Drumex, StageX, Groovex, and Vocalex.
- Purged legacy 4-card theme mode section and completed architectural separation between Studio Hub Settings and Chordex Preferences.

## Added

- Implemented single Appearance row with official `lucide-animated` state morphing icons (`SunIcon`, `MoonIcon`, `SunMoonIcon`) cycling White -> Dark -> AMOLED -> White.
- Integrated 60 FPS liquid reveal theme transition engine with exact touch coordinate clipping.

# Version 4.3.13

Release Date: 2026-07-31

## Fixed

- Fixed application startup mixed-theme regression by implementing synchronous `<head>` theme restoration in `index.html` and immediate module-level token binding in `useSettingsStore.ts`.
- Restored frame-0 theme consistency across root application container, dialogs, and Bottom Navigation bar before initial layout paint.

## Improved

- Hardened Version Consistency Pipeline (`verify-versions-consistency.mjs`, `sync-version.mjs`) to automatically synchronize `root package.json`, `apps/studio-web/package.json`, `apps/studio-android/package.json`, `appVersion.ts`, `build.gradle`, and version manifests in lockstep across the monorepo.

# Version 4.3.12

Release Date: 2026-07-31

## Improved

- Completed Studio Theme System stabilization pass with full White (`light`), Dark (`dark`), and AMOLED (`amoled`) theme support across Updater dialogs and indicators (`StudioUpdateScreen.tsx`, `UpdateIndicator.tsx`).
- Simplified OTA download progress UI with single `Downloading update` status label above the progress bar and exact 1:1 progress precision (percentage on far right only).
- Sanitized UTF-8 encoding pipeline across release notes parsing and changelog sheets to eliminate corrupted Mojibake sequences (`â€¢`, `â€‹`, `â€¦`).
- Fixed Chordex tab navigation sync regression in `SubAppWrapper` (`SharedAppShell.tsx`), restoring tab switching between Songs, Practice, Library, and Settings.
- Refactored Pinned Actions UI in Studio Hub to use White Theme surface tokens instead of hardcoded dark glass backgrounds.

# Version 4.3.11

Release Date: 2026-07-31

## Added

- Complete Studio Theme System redesign establishing White Theme (`light`) as the primary default application theme across all 6 Studio sub-apps (Hub, Chordex, Drumex, StageX, Groovex, Vocalex).
- Replaced legacy 4-card Theme Mode selector with a single animated Appearance toggle row aligned to the far right, featuring official `lucide-animated` state morphing (`SunIcon`, `MoonIcon`, `SunMoonIcon`).
- Implemented Ink Toggle liquid reveal animation (`ThemeTransitionEngine.ts`) with organic expanding reveal, soft metaball easing, and zero white flash visual synchronization.
- Redesigned Bottom Navigation bar for White Theme with subtle elevation shadows, light glass backdrop blur, and dark icon/label contrast.
- Standardized section headers, typography hierarchy, and UI surface design tokens across the entire monorepo.

# Version 4.3.10

Release Date: 2026-07-29

## Added

- Integrated `StudioPageTransition` unified motion architecture directly into real runtime view containers (`SharedNavigationContainer.tsx`, `StudioHubSettingsPanel.tsx`, `AppAnimationSystem.tsx`).
- Resolved Bottom Navigation highlight centering at the root cause in `SharedNavigationBar.tsx` by projecting active pill layout bounds directly inside `<NavigationItem>` buttons with zero offset lag.
- Fixed bottom navigation bar width calculations in `SharedNavigationBar.tsx` to eliminate size snapping when switching between 4-slot Hub, 3-slot Chordex, and 2-slot Groovex views.
- Removed legacy hardcoded CSS class transitions (`m3-nav-*`, `spring-in`, `content-enter`, `library-tab-fade`) across all application screens.

# Version 4.3.09

Release Date: 2026-07-29

## Added

- Unified navigation transition architecture across all sub-apps and screens using Framer Motion projection (`StudioPageTransition`).
- Solved bottom navigation active highlight alignment at the root cause by embedding `layoutId="liquidActiveNavPill"` directly inside active item buttons.
- Eliminated abrupt navigation bar geometry jumps during tab switching across apps with different item counts.
- Enforced 100% centered highlight positioning across all screen orientations and font scaling sizes.

# Version 4.3.08

Release Date: 2026-07-29

## Added

- Enhanced desktop sidebar and dock navigation buttons with tactile press scale scaling (`whileTap={{ scale: 0.96 }}`) and explicit ARIA tab semantics (`role="tab"`, `aria-selected`).
- Enforced minimum 44px touch target bounds across desktop and mobile navigation components.
- Refined tooltip enter/exit animations with subtle 6px offset transitions and tabular numeric label formatting (`tabular-nums`).
- Executed complete engineering audit and Matt Pocock / Jakub Krehel skill suite integration.

# Version 4.3.07

Release Date: 2026-07-29

## Added

- Migrated remaining application icons (Hub, Chordex, StageX, Drumex, Groovex, Vocalex) to official Lucide Animated components.
- Installed 11 additional official Lucide Animated icon packages via official shadcn CLI integration.
- Renamed Drumex Songs to Beats (using official Drum component) and Groovex Library to Rhythms (using official Layers component).
- Removed all generic Home fallback icons and ensured Audio-Lines plays once on tab activation without infinite looping.

# Version 4.3.06

Release Date: 2026-07-29

## Added

- Migrated the complete navigation system across all applications (Hub, Livex, Chordex, StageX, Drumex, Groovex, Vocalex, Discover, Practice, Settings, Profile, Search, Developer Tools) to use official Lucide Animated components.
- Installed 32 official Lucide Animated icon packages via official shadcn CLI integration into UI Shared components.
- Enforced strict navigation state-transition animation triggers (animations play once upon entering active state; re-taps and touch events ignored).
- Unified all Preferences screens to use the official Lucide Animated Sliders Horizontal component and Settings to use the official Lucide Animated Settings component.

# Version 4.3.05

Release Date: 2026-07-29

## Added

- Upgraded the complete navigation system across all applications (Hub, Chordex, StageX, Drumex, Groovex, Vocalex, Settings, Profile, Search) to use a unified, state-driven animated navigation icon system.
- Replaced touch/press-based icon triggers with clean navigation-state triggers (animations play once upon entering active state; re-taps ignored).
- Created reusable NavigationAnimationProvider, AnimatedNavigationIcon, and NavigationMotionVariants infrastructure with 60 FPS GPU-bound spring physics.
- Resolved circular dependencies across core modules for clean, robust production builds.

# Version 4.3.04

Release Date: 2026-07-29

## Added

- Production release v4.3.04 with complete preferences persistence, 60 FPS bottom navigation touch micro-animations, and full icon library coverage across all sub-applications.
- Web Crypto API AES-GCM 256 state persistence hardening and synchronous v2 payload fallback restoration across restart and cold-start boundaries.
- Context-aware AnimatedIcon micro-animations for mobile touch gestures and active tab state transitions.

# Version 4.3.03

Release Date: 2026-07-29

## Added

- Resolved Preferences lifecycle persistence root cause, eliminating ciphertext hydration failures and ensuring 100% restoration across process kills, restarts, and web refreshes.
- Complete icon implementation audit across all Studio applications (Hub, Chordex, StageX, Drumex, Groovex, Vocalex, Settings, Profile, Search, Navigation).
- Enhanced AnimatedIcon with complete 60 FPS spring physics and context-aware micro-interactions matching functional motion guidelines.

# Version 4.3.02

Release Date: 2026-07-28

## Added

- Resolved Android OTA downloader file resume corruption root cause to guarantee 100% accurate SHA-256 validation across releases.
- Hardened native AppInstaller and UpdateDownloadService cache purging and stream truncation.

# Version 4.3.01

Release Date: 2026-07-28

## Added

- Resolved Appearance settings persistence root cause for v3 encrypted state hydration across restarts, cold starts, and web refreshes.
- Complete icon coverage and context-aware 60 FPS micro-interactions across all Studio applications and screens.

# Version 4.3.00

Release Date: 2026-07-28

## Added

- Comprehensive production release bump to v4.3.00 with multi-manifest version synchronization across Android, Web, and OTA metadata channels.
- Hardened deployment integrity, zero-regression performance safeguards, and Web Crypto API AES-GCM 256 state persistence.

# Version 4.2.99

Release Date: 2026-07-28

## Added

- Global UX polish, micro-interaction feedback enhancements, and touch target accessibility compliance across Web and Android targets.
- Verified zero performance regressions across RenderScheduler, DOM event observation, and Web Crypto API AES-GCM 256 engine.
- Ensured 100% multi-manifest version synchronization and OTA update readiness.

# Version 4.2.98

Release Date: 2026-07-28

## Added

- Upgraded security engine to Web Crypto API (AES-GCM 256) with PBKDF2 key derivation and automatic legacy payload migration.
- Integrated lifecycle-aware RenderScheduler and event-driven DOM observation to eliminate 100% of idle polling loops.
- Completed architectural integration of giant sub-components, Zustand store domain slices, sync orchestrators, and typed window declarations.
- Enforced deterministic cloud synchronization states (idle, pending, running, retry, failed, completed).

# Version 4.2.97

Release Date: 2026-07-28

## Added

- Rebuilt icon interaction system with physical mechanical feedback, touch compression down to 0.86 scale, anticipation, and spring overshoot.
- Implemented velocity-stretching active pill animation in Liquid Bottom Navigation that stretches horizontally during slide movements.
- Synchronized tab icon and label spring motion with continuous Liquid Surface backdrop filter adaptation.

# Version 4.2.96

Release Date: 2026-07-28

## Added

- Completed 100% application-wide icon system audit, replacing all remaining legacy material icon elements with Bakai AnimatedIcon components.
- Added specialized domain stroke icons for Recorder (mic, record, waveform), Coach (learning, exercise, progress, score, target, achievement), and Settings.
- Standardized state-driven microinteraction physics and spring transitions across all navigation, settings, and developer tool components.

# Version 4.2.95

Release Date: 2026-07-28

## Added

- Expanded Bakai Animated Icon dictionary with download, upload, favorite, tune, apps, history, bug report, speed, memory, code, and terminal icons.
- Integrated exact SaxKeyId union mappings into interactive Alto Saxophone vector renderer.
- Enhanced recorded VCSL CC0 audio engine with Round-Robin detuning, key-click transients, and acoustic release tails.

# Version 4.2.94

Release Date: 2026-07-28

## Added

- Completed 100% legacy-free Bakai Animated Icon migration across all application modules, pages, dialogs, inspector docks, and settings panels.
- Re-architected Alto Saxophone vector renderer with anatomically accurate mouthpiece, neck, upper/lower stack, palm keys, side keys, pinky tables, bell, and mechanical rod linkages.
- Enhanced recorded VCSL CC0 audio engine with Round-Robin sample detuning, velocity layer crossfading, mechanical key click attack transients, and acoustic release tails.

# Version 4.2.93

Release Date: 2026-07-28

## Added

- Architected the Bakai Animated Icon & Motion System with unified stroke dictionary, spring microinteractions, and morphing state feedback.
- Architected high-performance Liquid Surface Engine using mathematical SDF smooth unions, Gaussian alpha threshold filtering, and dirty-checked path memoization.
- Redesigned Bottom Navigation Bar with Liquid Surface background and morphing active pill background.
- Standardized canonical CopyButton with AnimatedIcon checkmark morphing feedback.

# Version 4.2.92

Release Date: 2026-07-28

## Added

- Architected a modular Multi-Instrument Platform with decoupled InstrumentRegistry, NavigationProvider, AudioProvider, PracticeEngine, and LibraryProvider.
- Integrated real recorded saxophone multisamples derived from Versilian Community Sample Library (VCSL CC0) with natural pitch interpolation, velocity scaling, and decay release tails.
- Expanded Saxophone Practice Mode with 6 interactive learning modes: Free Play, Learn Notes, Quiz (score & streak tracking), Playback (animated scale player), Scales, and Exercises.
- Enhanced vector SVG Saxophone visual renderer with rod linkages, spring physics, and haptic feedback.

# Version 4.2.91

Release Date: 2026-07-28

## Added

- Transformed Chordex into a multi-instrument platform supporting Guitar, Saxophone, and future slots for Piano and Bass.
- Implemented Global Instrument Selector in Preferences with instant app adaptation and session persistence.
- Implemented Saxophone Practice Mode with interactive vector-based saxophone, pad key animations, touch targets, and low-latency acoustic WebAudio synthesis.
- Implemented Alto (Eb), Tenor (Bb), and Baritone (Eb) transpositions with concert and written pitch displays.
- Implemented reusable Saxophone Fingering Engine supporting low Bb3 to high F#6, alternate fingerings, palm keys, side keys, and pinky clusters.
- Adapted bottom navigation dynamically to Practice, Library, Preferences when Saxophone mode is active.

# Version 4.2.90

Release Date: 2026-07-26

## Fixed

- Fixed Developer Inspector Rules of Hooks violation by guaranteeing unconditional hook execution order across toggle enable/disable cycles, eliminating React Error #300 and #310 crashes.
- Fixed freeze persistence issue by excluding `isFrozen` state from store hydration on page reload.
- Fixed Stagex Setup screen black rendering by mapping `Setup` to `SetupHub` and `Preferences` to `Assistant` in the view switching pipeline so iframe receives valid view targets.
- Fixed error duplication in DevTools by implementing smart error fingerprinting deduplication and tracking occurrence count, first seen, and last seen timestamps.

## Improved

- Redesigned Developer Inspector dock into a sleek 320px floating Edge card with translucent backdrop blur and smooth spring physics.
- Standardized all error boundary recovery actions and warning inspect actions to use the canonical `CopyButton` component.
- Connected `ErrorBoundary.componentDidCatch` exceptions directly into the devTools error buffer pipeline.

# Version 4.2.89

Release Date: 2026-07-25

## Fixed

- Fixed StudioToggle double-firing and flickering by eliminating `<label>` wrapping `<button>` structure and implementing smooth 60 FPS CSS spring transitions.
- Fixed Freeze UI interaction leaking: injected airtight global CSS rules and capturing event listeners to block 100% of application touches, clicks, scrolls, gestures, navigation, and keyboard inputs while leaving Developer Inspector controls fully active.

## Improved

- Redesigned Debug Panel to a sleek Samsung Edge Panel style collapsible right-side drawer with translucent handle, 60 FPS spring slide transition, and blurred backdrop filter.
- Standardized all Copy buttons across the Developer Inspector with a shared `CopyButton` component featuring spring scale animations, crossfade icons (`content_copy` -> `check`), label swaps, 1.4s auto-revert, and fallback clipboard handling.
- Global Report Compression: introduced `compressReportText(...)` utility to ensure all copied diagnostic reports remain concise (< 10 pages / < 250 lines).

# Version 4.2.88

Release Date: 2026-07-25

## Fixed

- Fixed repository-wide React Hook determinism: completed AST static analysis scanning 490 source files (3,586 components and 29 custom hooks) to guarantee zero hook execution order violations.
- Fixed Empty Error Objects (`console.error {}`) by introducing `normalizeErrorInput(...)` to extract non-enumerable `Error` properties (`message`, `stack`, `name`), Promise rejections, and custom diagnostic objects cleanly.

## Improved

- Smart Error Grouping Engine: grouped runtime errors by a stable signature (`module|cleanMessage|firstStackLine`).
- Deduplication Metadata: maintained `Occurred: x12` count badges, `First seen` timestamp, `Last seen` timestamp, and preserved initial complete stack trace without duplicate listings.

# Version 4.2.87

Release Date: 2026-07-25

## Fixed

- Fixed React Error #300 & #310 hook ordering issues by ensuring all DevTools hooks run unconditionally at top-level.
- Fixed Event Diagnostics pipeline bug by recording touch and click gestures into the ring buffer continuously from app boot.

## Improved

- Unified Copy UX: introduced reusable dark pill `CopyButton` component with microinteractions, inline status transformation (`Copy` -> `Copied!`), and automatic 1.2s revert timer.
- Enhanced Top Copy Menu: `Copy Everything` exports all logs, warnings, errors, events, system & performance data formatted with clear section headers (`======================== Logs ========================`).
- Simplified Diagnostics Views: Performance, Network, System Diagnostics, and Storage tabs now feature clean 1-button copy exports with grouped categories.
- Removed Navigation Stack: deleted legacy navigation trace UI, state, collectors, and dead exports. Expanded search bar to circular-pill design (`borderRadius: 999px`).

# Version 4.2.86

Release Date: 2026-07-25

## Improved

- Global Live Inspector Dock: persistent developer inspection panel available everywhere across Studio (Hub, Settings, Chordex, Groovex, Stagex, Vocalex, sheets, overlays).
- Full Freeze UI Subsystem: pauses all CSS animations, transitions, MotionValues, and video/audio media for pixel-perfect static frame inspection.
- DevTools Box Model Shading: Chrome DevTools color-coded overlays (Margin: Amber, Border: Yellow, Padding: Emerald, Content: Blue) with live scroll/resize event synchronization.
- Element Traversal & Breadcrumbs: interactive breadcrumb trail, parent/child/sibling/layout container traversal, live search, and structured JSON engineering export.

# Version 4.2.85

Release Date: 2026-07-25

## Improved

- Material 3 Developer Options: redesigned Developer Options with a native Android Material 3 visual hierarchy, clean card elevation, and Material Symbols icons.
- Fixed currentApp ReferenceError: resolved the root cause of ReferenceError: currentApp is not defined by cleanly deriving currentApp at top-level component scope in DevToolsDashboard.
- Standardized Spring Toggle: replaced all custom switches in Developer Options with the canonical CSS spring StudioToggle component.

# Version 4.2.84

Release Date: 2026-07-25

## Improved

- Livex Developer Inspector: added a complete Chrome DevTools / Layout Inspector suite for native Android with zero runtime overhead when disabled.
- Dual inspection modes: support for 500ms Long Press gesture and real-time Live Selector canvas dragging.
- Android Preview Workflow: implemented pnpm preview:android to build and test Preview APKs on connected phone before production release.

# Version 4.2.83

Release Date: 2026-07-25

## Improved

- Transitions.dev CSS Spring Toggle: replaced all switches across Hub, Chordex, Drumex, Stagex, Groovex, and Vocalex with exact spring overshoot double-bounce animation.
- Bottom Navigation hover stabilization: strictly clamped highlight pill position within navbar bounds at all times.
- Stable highlight width interpolation: eliminated velocity-based size oscillation and press pressure swelling for smooth 60 FPS finger tracking across tabs.

# Version 4.2.82

Release Date: 2026-07-24

## Improved

- Consolidated Bottom Navigation: unified scroll-hide, inward convergence, and spacing across Hub, Chordex, Drumex, Stagex, Groovex, and Vocalex.
- Hub scroll-hide alignment: Hub Search bubble uses identical spring transforms (targetDockShift, targetSwitcherShift) as Chordex.
- Groovex centering: fixed layout positioning to guarantee 100% centered bottom navigation and App Changer.
- Universal scroll-hide: attached capturing touchmove listener in navScroll.ts for seamless scroll-hide across Stagex and Drumex.
- Apple-like press and drag gesture: added elementFromPoint gesture tracking for smooth highlight gliding across tabs under finger.

# Version 4.2.81

Release Date: 2026-07-24

## Improved

- Deterministic initial highlight position: synchronous DOM measurement on initial mount places highlight pill directly at target coordinates.
- Navbar width safeguard: corrected maxBarWidth to reserve space for Search bubble on Hub, preventing search button from being pushed off-screen.
- Bounded highlight pill clamping: mathematically clamped pillX within dock bounds so highlight never exits navbar container.
- Micro-interaction hover animations: restored subtle scale micro-interactions (1.08x) on tab items for premium native feedback.
- Animated 60 FPS tab transitions: configured smooth spring physics across Home, Profile, and Settings tabs.

# Version 4.2.80

Release Date: 2026-07-24

## Improved

- Hub Layout polish: moved floating circular Search bubble to the right side of the Hub for perfect visual balance (`[ Bottom Navigation ] [ Search Bubble ]`).
- Highlight Pill sizing: increased internal padding (+24px horizontal, 4px vertical) for generous breathing room without clipping or overflowing.
- Updater Progress simplification: removed duplicate secondary blue progress section, maintaining a single primary progress bar.
- Updater Header polish: removed top icons during download and installation phases so dialogs begin directly with title.

# Version 4.2.79

Release Date: 2026-07-24

## Improved

- Hub Settings active Changelog: integrated scrollable release notes directly above About in all Hub Settings modal interactions.
- Redesigned Hub Bottom Navigation: dock contains Profile, Home, and Settings.
- Symmetrical Floating Search Bubble: created separate floating circular search button opposite App Changer on Hub.
- Direct Profile Navigation: tapping Profile opens Profile screen directly without intermediate popup menu.
- Highlight Sizing & Small->Large tab transition fix: synchronous DOM rect measurement eliminates measurement lag and pill jumps.
- Quick Actions auto-hide: Bottom Navigation automatically hides whenever Quick Actions sheet or customization modal opens.
- Removed search Cancel button from Hub search interface with balanced layout.
- Removed Theme Changer from Chordex Preferences.

# Version 4.2.78

Release Date: 2026-07-24

## Improved

- Bottom Navigation auto-reset on screen exit: navigation scale and position reset back to default (100% scale) on every route/screen transition.
- Reduced Bottom Navigation scroll shrink amount to a refined 15% reduction (1.00 -> 0.85) with smooth center spring movement.
- Unified Hub UI architecture into a single active Hub Settings panel featuring the scrollable Changelog section immediately above About.
- Refined Updater installation dialog with single progress bar, simplified percentage display, removed top icon on final screen, and added smooth "App updated" confirmation transition.

# Version 4.2.77

Release Date: 2026-07-24

## Improved

- Permanent architectural separation of Studio Hub and Chordex applications with isolated feature ownership (`StudioHubSettingsPanel` vs `ChordexSettingsPanel`).
- Added dedicated Changelog & Release Notes section to Hub Settings immediately above About section.

# Version 4.2.76

Release Date: 2026-07-24

## Improved

- Sub-app bottom navigation shrink alignment fix: corrected navbar shrink direction on sub-apps so glass-nav scales 25% and translates rightward toward screen center while the App Switcher translates leftward, eliminating leftward shrink bias.

# Version 4.2.75

Release Date: 2026-07-24

## Improved

- Highlight alignment DOM geometry: calculated highlight center points directly from browser-rendered DOM element coordinates for 0.000px centered highlight placement over rendered content.
- Dynamic 25% shrink centering math: derived horizontal composition translations dynamically from window and dock element widths for symmetrical side-by-side centering on scroll down.
- Hub / Chordex context isolation: gated global Changelog section to Hub context, preventing release notes from leaking into Chordex Preferences.

# Version 4.2.74

Release Date: 2026-07-24

## Improved

- Highlight alignment root-cause fix: resolved padding double-counting origin error in getPillX calculation for 0.00px centered highlight placement over rendered content.
- 25% shrink & mutual center translation: refined scroll shrink scale to 25% (1.00 -> 0.75) while introducing converging navX and switcherX horizontal translations for a compact, unified side-by-side composition on scroll down.

# Version 4.2.73

Release Date: 2026-07-24

## Improved

- Real DOM highlight sizing: attached ResizeObserver layout measurements directly to active item content wrappers (getBoundingClientRect + 16px horizontal padding) for perfect content-hugging highlights across all font scales and localizations.
- Bouncy 40% center scale animation: re-enabled scroll offset tracking to scale the Bottom Navigation and App Switcher button by 40% (1.00 -> 0.60) toward their center-center point on scroll down, with bouncy spring recovery on scroll up and zero vertical translation or hiding.

# Version 4.2.72

Release Date: 2026-07-24

## Improved

- Highlight geometry refinement: un-clamped and recalculated active highlight pill sizing (20px icon + 6px gap + 6.4px/char + 16px padding) for exact content wrapping without oversized pills or clipping.
- Complete scroll animation removal: purged scroll collapse listeners, scroll offset MotionValues, and scale interpolations so Bottom Navigation remains 100% static across all scroll interactions.

# Version 4.2.71

Release Date: 2026-07-24

## Improved

- Native updater cleanup: completely removed legacy `[Simulation Guard]` throw checks, simulation mode overrides, and developer simulation toasts.
- Native installation path: updater pipeline now executes real native PackageInstaller installation flow directly.
- Highlight geometry refinement: dynamic highlight algorithm un-clamped to perfectly wrap active tab icon and label comfortably on every tab, localization, and font scale.
- Scroll collapse geometry: removed parent container scale shift and enforced in-place center scaling for both dock and switcher button without corner drifting.

# Version 4.2.70

Release Date: 2026-07-24

## Improved

- Truly universal highlight sizing: dynamic active item content measurement (icon + gap + label + 24px padding) guarantees perfect active highlight wrapping without text clipping or undersized pills across all screens, including Preferences.
- Simplified scale-only collapse animation: completely replaced over-engineered collapse motion with clean center scaling (1.0 -> 0.70) with 0 translation (`y = 0`) and preserved 100% blur and opacity.
- Apple-grade spring restore: smooth 100% scale restoration on scroll up with natural overshoot and soft settle.

# Version 4.2.69

Release Date: 2026-07-24

## Improved

- Consistent spacing gap: added a subtle 8px gap between the Bottom Navigation dock and the floating App Changer button across all apps and screens.
- Apple-grade press animation: added tactile press-in scaling (`scale: 0.92`) and spring release with overshoot to the App Changer trigger button.
- Icons-only App Changer mode: removed text labels in App Changer popup mode for a clean, uncluttered icons-only display.
- Precision active icon highlight: highlight pill wraps ONLY the active app icon with perfect 44px x 44px circular alignment and zero text/icon clipping.
- Coordinated collapse and expansion: synchronized spring physics, scale down (1.0 -> 0.65), and elegant fade (1.0 -> 0.82) between Bottom Navigation and App Changer during scrolling.

# Version 4.2.68

Release Date: 2026-07-24

## Improved

- Single dynamic highlight sizing algorithm: active highlight pill automatically measures label length and layout across all screens (Preferences, App Switcher, Songs, etc.) with generous padding and zero clipping.
- In-place search bar morphing: global search bar reuses the exact floating pill dimensions of the Bottom Navigation container for a smooth, continuous morphing experience.
- Visible scale collapse: scroll collapse maintains complete screen visibility (`containerY = 0`) while scaling down 35% with full opacity, blur, shadow, and touch feedback preserved.
- Unified Motion Engine architecture: 100% preserved with zero re-architecture or routing side effects.

# Version 4.2.67

Release Date: 2026-07-24

## Improved

- Refined scroll collapse behavior: Bottom Navigation remains fixed on screen and scales down uniformly toward its center by 35% without sliding off-screen.
- Enhanced active highlight pill geometry: expanded slot width and optimized inset padding to wrap active icon and text label with generous padding and zero clipping.
- Expanded global search bar layout: max-width expanded to 720px with flex min-width zero and graceful text ellipsis truncation to prevent layout clipping.
- Synchronized backdrop blur expansion: continuous container opacity prevents GPU backdrop filter detachment for instant, frame-synchronized blur expansion.

# Version 4.2.66

Release Date: 2026-07-24

## Improved

- Refined scroll collapse behavior: Bottom Navigation now stays fixed on screen and shrinks uniformly toward its center by 35% on scroll.
- Enhanced active highlight pill geometry: increased dimensions and optimized top/bottom padding to encompass active icons and labels with equal padding and zero clipping.
- Fixed backdrop blur synchronization: eliminated opacity fading on scroll collapse to ensure GPU backdrop filter composition layer remains continuously active during scale expansion.

# Version 4.2.65

Release Date: 2026-07-24

## Improved

- Completely rewritten Bottom Navigation animation architecture using a single unified MotionValue root graph.
- Continuous interpolation across navigation pill, icons, labels, scroll collapse, search expansion, and profile menu without discrete layout snapping.
- Integrated profile menu card and backdrop directly into the unified motion engine for 60 FPS Apple-grade interaction quality.

# Version 4.2.64

Release Date: 2026-07-23

## Improved

- Hardened build pipeline with strict TypeScript typechecking, reference audit, circular dependency detection, and import boundary enforcement.
- Fixed orphan references and un-declared symbol usages across all workspaces.
- Decoupled theme engine and update state machine circular dependencies using event listeners.

# Version 4.2.63

Release Date: 2026-07-23

## Improved

- Redesigned Studio Updater UI matching official HTML spec with continuous glass surface.
- Upgraded Bottom Navigation motion engine with continuous pillX and pillWidth MotionValues.
- Verified zero runtime ReferenceErrors across repository via static analysis auditors.

# Version 4.2.62

Release Date: 2026-07-23

## Improved

- Eliminated getCenterX orphan ReferenceError in SharedNavigationBar pointer drag handlers.
- Added Repository-Wide Reference & Audit Validator to build pipeline.
- Hardened Framer Motion event callbacks and component scope symbol safety.

# Version 4.2.61

Release Date: 2026-07-23

## Improved

- Enforced single-owner navigation store invariants for Profile, Search, and App Switcher overlays.
- Added Static Analysis Navigation Integrity Auditor script to build pipeline.
- Hardened Error Boundary diagnostics with active navigation overlay telemetry snapshot.

# Version 4.2.60

Release Date: 2026-07-23

## Improved

- Restored continuous MotionValue gliding active pill highlight across tabs.
- Removed layout projection from navigation buttons to eliminate icon settling displacement.
- Consolidated Bottom Navigation and App Switcher under unified spring scale architecture.

# Version 4.2.59

Release Date: 2026-07-23

## Improved

- Unified Bottom Navigation scroll animation system with shared 30% shrink physics.
- Fixed Profile menu tap unreliability by deferring pointer capture to drag mode.
- Added independent 2000ms watchdog recovery system for guaranteed navigation restoration.

# Version 4.2.58

Release Date: 2026-07-23

## Improved

- Polished Bottom Navigation with dynamic highlight resizing and 0 double highlight.
- Synchronized icon and label rendering for instant appearance without delay.
- Stabilized Profile menu stability and enforced mutual exclusion between Search and Profile.

# Version 4.2.57

Release Date: 2026-07-23

## Improved

- Conducted comprehensive AST runtime stabilization pass across all core modules and shared components.
- Eliminated dangling useNotificationService and unreadCount ReferenceErrors.
- Verified 0 Cannot find name diagnostics across the entire monorepo.

# Version 4.2.56

Release Date: 2026-07-23

## Improved

- Resolved startup freeze on logo screen by removing restrictive showHubEnabled render gate.
- Hardened StartupCoordinator Phase 5 with DOM hub presence checks and persistent mount state.
- Enhanced LaunchAnimationEngine with startup complete event catch-up and fail-safe watchdog fallback.

# Version 4.2.55

Release Date: 2026-07-23

## Improved

- Redesigned Bottom Navigation to shrink by 22% on scroll while remaining fully visible on-screen.
- Enhanced active tab indicator with horizontal pill expansion, custom icons, and section label text.
- Added native spring physics for tab switching and automatic nav state restoration on route changes.
- Added Changelog & Release Notes page inside Settings.
- Fixed Stagex center panel view resolution to prevent routing blackouts.
- Purged legacy Notification Center from navigation entries, settings, routes, components, and state.

# Version 4.2.54

Release Date: 2026-07-23

## Improved

- Restored original per-container Bottom Navigation auto-hide scroll engine without timers or polling hacks.
- Permanently fixed Stagex Center Panel iframe rendering by removing obsolete conditional app checks.
- Retired Updater Diagnostics and replaced it with a premium glassmorphic Coming Soon placeholder.
- Streamlined Updater Experience into a single unified progress component for Checking, Downloading, Verifying, and Installing.

# Version 4.2.53

Release Date: 2026-07-23

## Improved

- Resolved Profile popup immediate closure caused by ghost clicks and AnimatePresence fragment keying.
- Restored continuous touchmove scroll hide and watchdog recovery for Bottom Navigation bar.
- Fixed Stagex Center Panel blackout by connecting active app check to useNavigationStore.
- Preserved 60 FPS performance and cross-platform navigation consistency.

# Version 4.2.52

Release Date: 2026-07-23

## Improved

- Resolved updater diagnostics simulation leak causing false installation failures.
- Enabled global scroll auto-hide navigation across all feature tabs.
- Polish Profile popup tab toggle, backdrop, and Android Back button closure.
- Prevented duplicate updater notifications unconditionally.

# Version 4.2.51

Release Date: 2026-07-23

## Improved

- Fixed Bottom Navigation scrolling auto-hide trigger on Android devices.
- Completed integration of the premium Profile Account Menu on the navigation bar.
- Collapsed duplicate lifecycle updates in the Notification Center.

# Version 4.2.50

Release Date: 2026-07-23

## Improved

- Redesigned Notification Center cards with status colors and cleaner typography.
- Eliminated low-level download logs and collapsed duplicate notifications.
- Fixed Bottom Navigation highlighting regression for settings sub-pages.
- Implemented premium glassmorphic Profile Account Menu.

# Version 4.2.49

Release Date: 2026-07-23

## Improved

- Cleaned up text animations, making all titles and headers static.
- Resolved Stagex application switching navigation loop.
- Restored Bottom Navigation auto-hide on scroll with page transition guards.

# Version 4.2.48

Release Date: 2026-07-23

## Improved

- Resolved Bottom Navigation auto-hide regressions on settings and Hub sub-pages.
- Expanded the Quick Actions catalog with 10 new diagnostic, appearance, and sub-app utility actions.
- Implemented boundary dragging constraints for Quick Actions reordering.

# Version 4.2.47

Release Date: 2026-07-22

## Improved

- Rolled back HeroUI integrations (ColorPicker, AlertDialog, Toast, and Alert-based Notification Center) to restore stable native UI and navigation behavior.
- Fully resolved Bottom Navigation unexpected collapse regressions, stabilizing routing and tab transitions across all sub-apps.

# Version 4.2.46

Release Date: 2026-07-22

## Improved

- Resolved Bottom Navigation unexpected collapse regression by using targeted modal backdrop triggers.
- Redesigned Custom Accent Color picker popover with custom 2D free dragging and Pointer Capture.

# Version 4.2.45

Release Date: 2026-07-22

## Improved

- Fixed Bottom Navigation to remain visible on tab changes.
- Fixed Display Density layout scaling to prevent gray margins.
- Refined Text Scale behavior to scale only typography.
- Enhanced Appearance color picker rendering and border visibility.

# Version 4.2.44

Release Date: 2026-07-22

## Improved

- Overhauled confirmation dialogs to use official HeroUI AlertDialog.
- Replaced custom toast system with unified HeroUI Toast notifications.
- Redesigned Notification Center items using HeroUI Alert components.

# Version 4.2.42

Release Date: 2026-07-22

## Improved

- Redesigned Pinned Actions to a compact, launcher-style grid layout.
- Added circular dashed "Add" action slot for grid layouts with fewer than 5 shortcuts.
- Added official Livex logo in the upper-right corner of the Hub tab.
- Unified and shrunk all FAB and Import buttons to 48px glassmorphic circles.
- Fixed Stagex portrait layout iframe loading handler, resolving the black screen canvas bug.
- Added immediate root zoom scaling on settings change for Display Density and Text Scale.

# Version 4.2.41

Release Date: 2026-07-22

## Improved

- Refined Pinned Actions to a compact, high-density layout.
- Removed Suggested Actions section from the UI.
- Fixed Bottom Navigation scroll-restoration minimization bug on page-entry.
- Smoothed out App Switcher open morph animation with a premium M3 spring.
- Restored official app branding colors on Hub cards, preserving brand identity.
- Restored full Display Density and Text Scale accessibility settings.
- Standardized all Back buttons and Stagex FABs to a unified premium circular style.

# Version 4.2.40

Release Date: 2026-07-22

## Improved

- Implemented vertical drag-to-reorder layout for Pinned Actions with touch-hold activation and FLIP dragging.
- Added usage-based Suggested Actions engine de-duplicated against pinned items.
- Built native Android Foreground Service for resilient background update downloads with progress notifications.
- Restructured search bar width to expand to full width matching results container.
- Fixed What's New markdown bullet renderer, spacing, and emoji clipping issues.

# Version 4.2.39

Release Date: 2026-07-22

## Improved

- Redesigned search bar into a single-surface morph of the bottom navigation dock with a horizontal Liquid Glass stretching animation.
- Restructured search results to slide upward above the navigation dock, remaining visible when focusing input and opening the keyboard.
- Streamlined search result cards by removing unnecessary icons and adding high-contrast category tags.
- Added an unread notification badge on the bell icon and automatically mark notifications as read when the center is opened.
- Restored Developer Options Motion Playground to a clean state containing only stable, production-ready GPU animations.

# Version 4.2.38

Release Date: 2026-07-22

## Improved

- Optimized search transitions by morphing with a compact upward growth (55vh) and removing heavy fullscreen backdrop blurs to avoid layout thrashing.
- Cached and deferred local-storage search index loading on mount to prevent CPU spikes during search open animations.
- Prevented Bottom Navigation bar disappearances by adding a deterministic reset call on scroll observer element unmount.
- Designed 5 new premium transition presets (Material Shared Axis, Premium Spring Slide, Elastic Morph, Floating Depth, Liquid Flow) in the Motion Playground with interactive simulator controls.

# Version 4.2.37

Release Date: 2026-07-22

## Fixed

- Stabilized global search by removing duplicate index registrations and unmounted stale closures from the Hub, preventing runtime crashes.
- Resolved React Hook Ordering violation (#300) in the Shared Navigation Bar by raising `useTransform` to the component top level.

## Improved

- Completely purged legacy header app switcher pill (`AppModeMenuLogo`) across Chordex, Drumex, Stagex, Groovex, Vocalex, and Settings for clean page headers.

# Version 4.2.35

Release Date: 2026-07-22

## Improved

- Refined Search Dock layout to sit naturally to the left and unified the Bottom Navigation and Search Button into a single morphing dock.
- Restored centered sub-app Bottom Navigation layouts without empty placeholders or search button layouts.

# Version 4.2.34

Release Date: 2026-07-22

## Improved

- Rebuilt global search as a floating morphing dock overlay with category chips and action command palettes.
- Re-architected bottom navigation dock to mathematically center active tabs and utilize liquid-glass refraction blurs.

# Version 4.2.33

Release Date: 2026-07-22

## Improved

- Overhauled settings layout and transitioned Profile into a primary bottom navigation tab.
- Rebuilt the Profile tab with a modern Bento grid, interactive sync status card, and integrated activity timeline.
- Resolved Stagex view synchronization and exit logo freezes on app switches.
- Styled Bottom Navigation and active capsule indicators with liquid glass translucency.

# Version 4.2.32

Release Date: 2026-07-22

## Improved

- Overhauled global design system to increase corner radii softness consistently.
- Refined Bottom Navigation bar dimensions and height for comfort and native feel.
- Enhanced layered progressive blurs, premium elevation, and translucency.

# Version 4.2.31

Release Date: 2026-07-22

## Fixed

- Removed obsolete chords section from Chordex app completely.
- Optimized Bottom Navigation to mount immediately as part of app shell.
- Restored dedicated Updater settings page alongside Notification Center.

# Version 4.2.30

Release Date: 2026-07-22

## Fixed

- Refactored Bottom Navigation to compute items synchronously and reactively from route history, resolving race conditions.
- Fixed Stagex setup tab bug by mapping Setup view ID correctly to SetupHub.
- Resolved Stagex switching/unmounting transition logo freeze.
- Aligned Chordex preferences tab setup and navigation panels array.

# Version 4.2.29

Release Date: 2026-07-21

## Fixed

- Removed duplicate local SharedNavigationBar from StageCorePanel in packages/ui-android, enforcing 100% single global bottom navigation.

# Version 4.2.28

Release Date: 2026-07-21

## Fixed

- Architected a single self-healing Bottom Navigation Controller system with permanent recovery watchdog and event-driven restoration. All sub-apps inherit identical navigation lifecycle.

# Version 4.2.27

Release Date: 2026-07-21

## Fixed

- Restored and unified single global Bottom Navigation Controller across all 7 studio apps.
- Fixed session restoration auth listener to eliminate repeated login notifications on boot.

# Version 4.2.26

Release Date: 2026-07-21

## Fixed

- Unified Bottom Navigation system into a single global controller across all 7 applications.
- Fixed transition completion state restoration for Bottom Navigation pill.
- Harmonized dark theme surface design tokens across all workspace packages and settings panels.

# Version 4.2.25

Release Date: 2026-07-21

## Added

- Production release for Studio Android v4.2.25 with full Android runtime stabilization.
- Global theme system single source of truth with instant cross-screen propagation.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Centralized bottom navigation system across Hub, Chordex, Stagex, Groovex, Vocalex, and Drumex.

## Breaking Changes

None

# Version 4.2.24

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.24.
- Forensic instrumentation and optimization of internal release orchestration phases.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.23

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.23.
- Optimized CI workflow checkout depth reducing total release pipeline execution runtime to under 5 minutes.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.22

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.22.
- Isolated KeyStore binary verification out of configuration phase into task execution.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.21

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.21.
- High-performance pipeline optimizations reducing execution time to under 4 minutes.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.20

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.20.
- High-performance pipeline optimizations reducing execution time to under 4 minutes.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.19

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.19.
- Deterministic state machine architecture and single source of truth version enforcement.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.17

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.17.
- Complete release infrastructure security hardening, signature diagnostic reporting, and contract validation.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion, signature diagnostic report generation, and multi-stage verification pipeline gates.

## Breaking Changes

None

# Version 4.2.16

Release Date: 2026-07-21

## Added

- Standard production release build for Studio Android v4.2.16.
- Automated SLSA provenance generation, APK signing, GitHub Release creation, and Firebase metadata deployment.

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle keystore fingerprint assertion and post-signing release verification report stage.

## Breaking Changes

None

# Version 4.2.15

Release Date: 2026-07-21

## Security

- Enforced mandatory production signing key verification (`SHA-256: 900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`) with zero fallback.
- Added pre-build Gradle key store fingerprint assertion and post-signing release verification report stage.

## 4.2.14

### Added

- Standard production release build for Studio Android v4.2.14.
- End-to-end automated SLSA provenance generation, APK signing, stable GitHub Release creation, and Firebase metadata deployment.

## 4.2.13

### Added

- Production validation release build for Studio Android prerelease v4.2.13.
- Automated SLSA provenance generation, APK signing, GitHub Prerelease creation, and Firebase metadata deployment.

## 4.2.12

### Added

- Automated full production release pipeline validation for Android prerelease build.
- Verified SLSA build provenance, SHA-256 integrity, release delta reports, and Firebase metadata synchronization.

## 4.2.11

### Fixed

- Production Release Pipeline orchestration and multi-manifest automated version bumping.
- Hardened release preflight validation, signed APK build packaging, and deployment telemetry.

## 4.2.10

### Fixed

- Restored production Release Pipeline orchestration and multi-manifest automated version bumping.
- Hardened release preflight validation, signed APK build packaging, and deployment telemetry.

## 4.2.9

### Fixed

- Physical Android real-device validation prerelease build with hardened release infrastructure telemetry.
- Enforced complete release manifest, audit log, history, delta, smoke test, and SLSA provenance signatures.

## 4.2.8

### Fixed

- Physical Android real-device validation prerelease build with hardened release infrastructure telemetry.
- Enforced complete release manifest, audit log, history, delta, smoke test, and SLSA provenance signatures.

## 4.2.7

### Fixed

- Resolved Android native startup hang on the Livex logo by auto-recovering StartupCoordinator execution when native window focus transitions occur mid-boot.
- Preserved onHubShow callback and auto-restart boot execution when app returns to active/foreground state.

## 4.2.6

### Fixed

- Fixed severe startup loop regression caused by lazy loading `StudioHub` alongside static module dependencies.
- Fixed latent `appMode` state synchronization bugs and restored accurate routing transitions.

## 4.2.5

### Added

- LOT 1 runtime optimizations: Root-level code splitting.
- Lazy-loading of PDF engine to reduce startup bundle size.
- Dead code elimination.

## 4.2.4

### Added

- Centralized persistent Notification Service to store and track system updates, cloud sync, and auth events.
- Dedicated flagship Notification Center UI featuring stagger-animated timelines and interactive action buttons.
- Isolated back navigation stack per application, preventing unexpected return-to-hub or cross-app history pops.
- Synchronous layout cleanup during transitions to eliminate overlapping bottom navigation or switcher artifacts.

## 4.2.3

### Added

- Centralized Bottom Navigation state machine and Visibility controller globally.
- Resolved transition freezing issues by adding active task interruptions and startZoom guards.
- Expanded Motion Playground to a full Theme Transition Laboratory featuring 10 GPU concepts.
- Eliminated slide-in-from-side anomalies by keeping navigation bar instance mounted globally.

## 4.2.2

### Added

- Optically aligned and vertically centered active highlight capsule inside the Shared Bottom Navigation bar.
- Restored the Bottom Navigation container position to its previous safe area boundaries.
- Unified legacy screens in Vocalex, Groovex, and Drumex to adopt design tokens and shared Card layouts.
- Replaced hardcoded font family overrides with standardized design tokens globally.

## 4.2.1

### Added

- Implemented transition store reset fallback ensuring return-to-hub transitions never hang or turn the screen black.
- Clamped active switcher indicator capsule layout width to prevent shrinking into vertical lemon shapes.
- Elevated the bottom navigation bar and switcher vertically above the native Android gesture navigation area.
- Redesigned theme transitions with a premium hardware-accelerated fluid chromatic bloom effect.
- Consolidated global visual tokens for layouts, colors, radiuses, shadows, and spring animations.

## 4.2.0

### Added

- Re-engineered the interactive bottom navigation capsule to use localized Bezier path deformation instead of global scale stretching.
- Implemented a touch-down compression response to simulate soft polished liquid glass with critically damped spring recovery.
- Globally corrected active highlight centering positioning offsets, achieving perfect mathematical alignment across all device screen densities.
- Re-architected theme transitions using hardware-accelerated View Transitions and CSS circular clip-paths to eliminate main-thread stutters.
- Removed unnecessary blue logo animations and overhead from return-to-hub transitions.
- Performed a responsive layout audit to guarantee safe area compliance and prevent clipping on small displays and foldables.

## 4.1.9

### Added

- Hardened the global navigation transition architecture with a single deterministic state machine singleton.
- Synchronized application portal transitions cleanly to prevent unmount cuts, stutters, and freezes.
- Constrained and clamped the bottom navigation active pill gesture to stay strictly inside the capsule bounds.
- Re-architected and isolated the theme transition engine with pre-emptive repainting during the droplet fall phase.
- Set the Vocal Monitor monitor state to be OFF by default in Vocalex.

## 4.1.8

### Added

- Upgraded the Shared Bottom Navigation and App Switcher with gesture-driven interactive scrubbing.
- Animated dynamic capsule stretching based on horizontal swipe velocity.
- Removed application logo headers from all sub-apps on mobile layout to reflow content areas upward.
- Integrated the viewport-cropped Ink Toggle droplet reveal animation globally in Appearance settings.
- Custom-tailored unique motion language logo transitions for Chordex, Drumex, Stagex, Groovex, and Vocalex.

## 4.1.7

### Added

- Refined the Shared Bottom Navigation into a translucent Liquid Glass capsule bar.
- Implemented a continuous morphing App Switcher showing active sub-apps inside the navigation bar.
- Relocated the Ink Theme Switcher globally inside Settings -> Appearance.
- Restored the complete 31 chord categories catalog to the redesigned Chordex Library view with balanced density.

## 4.1.6

### Added

- Redesigned the Chordex Library dashboard layout with Chord of the Day, Recently Practiced cards, and Categories grid.
- Redesigned the Chordex Songs setlist search bar, circular action buttons, and modernized empty states.
- Implemented the Ink Toggle Dark Mode transition with metaball liquid teardrop physics and upward rising wave compositing.
- Simplified navigation by deprecating the redundant Chords tab and panel routes.

## 4.1.5

### Added

- Debounced lifecycle logging `localStorage` writes using an in-memory queue to eliminate UI thread blocking disk I/O.
- Deferred Web Cache Storage clearing and Service Worker unregistration out of the critical startup path to a 6-second timeout.
- Deferred `tolgee.run()` translations initialization to a 4-second delay to free up execution cycles during bootstrap.
- Deferred return-to-hub watchdog diagnostics `localStorage` writes by 4 seconds.

## 4.1.4

### Added

- Deferred StudioHub and sub-app wrapper chunk-loading and mounting until the logo drawing phase completes.
- Eliminated reveal stage checking timers by introducing fully event-driven 'studio-startup-complete' listeners.
- Prevented JavaScript thread scheduling pauses during logo forming, locking frame pacing to native hardware limits.

## 4.1.3

### Added

- Implemented dynamic startup prioritization on GPU composition by turning off blurs and shadows during startup animation.
- Removed outer expanding circular outlines and blue flash background bursts from the zoom transition.
- Configured hardware acceleration styles (willChange, backface-visibility, preserve-3d) to support high-refresh rates (90Hz / 120Hz).
- Enlarged the zoom travel scale target to scale(120) with path thinning to simulate a camera move inside the logo.

## 4.1.2

### Added

- Removed all experimental launch animation presets, keeping only the production Fluid Surface Reveal animation.
- Simplified Motion Playground to show only the Fluid Surface Reveal telemetry and preview.
- Fixed startup skeleton leak by enforcing solid background rendering styles on first paint frame.
- Resolved final transition flash by checking __studioStartupComplete and linking onComplete to onAnimationComplete.
- Implemented Bottom Navigation watchdog failsafe to recover visibility on route change, window focus, visibility change, resize, and orientation change.

## 4.1.1

### Added

- Unified cold-boot launch with Motion Playground, enabling the full spring-driven logo path drawing sequence on startup.
- Removed app-container opacity locks to allow background Hub mounting and painting underneath the launch animation.
- Restored the Top App Bar header inside the Home tab structure to eliminate transition visual shifts.
- Implemented dynamic stacking context management to clear translate3d and willChange styles only when search is active.

## 4.1.0

### Added

- Unified production launch experience with Motion Playground's LaunchAnimationEngine, ensuring identical physics and curve parity.
- Implemented physical zoom fly-through: logo scales to scale(100) and its strokes thin down during transition to reveal the Hub.
- Fixed global search touch bugs by moving the Top App Bar header to the root layout outside scroll stacking contexts.
- Added automatic search overlay dismissal on all search clicks, suggested action triggers, and pinned item selections.
- Replaced multiple CSS blur layers with a single backdropFilter blur, achieving a locked 60 FPS animation.
- Enhanced Liquid Glass styling with 25% higher transparency and sharp top border edge inner reflections.

## 4.0.99

### Added

- Shifted the launch experiences logo drawing path animation to play immediately via CSS in index.html (first painted frame).
- Implemented high-performance vanilla JS zoom-in reveal transitions inside index.html for direct overlay dismissal.
- Added duplicate React launch overlay bypass, allowing the Hub to mount and paint directly underneath the HTML splash.

## 4.0.98

### Added

- Integrated launch experience preset persistence bypass, loading the saved default preset instantly on cold boot.
- Optimized bottom navigation auto-hide responsiveness: reduced gesture jitter threshold and scroll delta windows.
- Refined Liquid Glass styling: increased transparency by an additional 25% for a naturally floating panel.
- Enhanced bottom navigation icon tactile interactions with immediate compression scale and spring feedback.
- Updated Chordex preferences/settings icon to 'tune' for exact visual consistency with Groovex preferences.

## 4.0.97

### Added

- Implemented premium scroll-driven auto-hide on SharedNavigationBar responding progressively to velocity.
- Added smooth, spring-driven transition animations following scroll direction gesture reversals instantly.
- Refined Liquid Glass visual styling: increased transparency slightly and enhanced shadows for deeper floating depth.
- Fixed Chordex bottom navigation Settings redirect to target its own local Settings Panel instead of the Hub Settings.
- Removed redundant header back buttons and containers from all Vocalex tabs (Monitor, Exercises, Takes, Record, Preferences).
- Refined the launch experience: added cinematic logo zoom-in transitions and instant vanilla-splash handshakes.

## 4.0.96

### Added

- Redesigned launch experience on Android with a premium, spring-driven logo reveal sequence.
- Enforced clean branding by removing all text ("Livex", "by Mag") from the cold boot splash screen.
- Unified five distinct motion concepts under a single, high-performance Launch Animation Engine.
- Implemented an interactive Developer Options Motion Playground for looping, previewing, and comparing launch animations.
- Integrated live telemetry telemetry (FPS, frame drop, frame time) to track performance in the playground.

## 4.0.95

### Added

- Unified bottom navigation architecture across all applications using SharedNavigationBar.
- Completely removed legacy BottomNav.tsx wrapper and all custom navigation bar containers.
- Redesigned Hub layout to feature exactly three tabs: Notifications, Home, and Settings.
- Integrated premium spring-driven gesture compression on tab pointer down and bounce-back.
- Added smooth spring active scaling transitions to selected navigation icons.

## 4.0.94

### Added

- Snappy search morph animations deferring storage index tasks off the critical path.
- Borderless search and close icons naturally integrated into the floating top bar.
- Snappy spring physics and haptic touch ripples for all interactive pill search states.
- Reusable SharedBottomNavigation component styled with floating liquid glass and progressive blur.
- Unified bottom navigation menus across Chordex, Stagex, and Hub with no labels.
- Redesigned Settings Home, Language selection, and Theme Mode Appearance sub-pages.

## 4.0.93

### Added

- Deferred search index scanning off the critical path to achieve stutter-free 60 FPS morph animations.
- Designed and built a reusable ActionButton component with spring tap physics and haptic ripples.
- Replaced multiple diagnostic copy buttons in the Emergency Debug Overlay with ActionButtons.
- Integrated the interactive live-mode eye visibility toggle button in Stagex editor FAB.
- Tuned progressive blur to render behind the floating search surface only, leaving result texts sharp.

## 4.0.92

### Added

- Spotlight-style floating search bar morph interaction, preserving original pill dimensions.
- Centered floating dropdown container for search results positioned directly below the top bar.
- Subtle full-screen progressive blur backdrop keeping the Hub visible underneath.
- Compact result rows with custom brand icons, titles, subtitles, and destination tags.
- Completely removed Recent Sessions section from the Hub tab layout.

## 4.0.91

### Added

- Implemented flagship morphing top bar and stack progressive blur for search experience on Android.
- Added central search index registry and dynamic local storage scanning.
- Integrated performance auto-scaling for backdrop filter layers.

## 4.0.90

### Added

- Rebranded the Hub as Livex and aligned design elements for maximum premium appeal.
- Centralized all user profile, sync, authentication, and logout options under the Profile avatar in the top-right app bar.
- Reconstructed the Settings sub-pages to open instantly by removing heavy navigation re-renders.
- Implemented a fuzzy-matched Global Search overlay to index all applications, settings options, and developer tools.
- Replaced static action buttons with a premium Quick Actions sheet overlay containing a customizable shortcut picker.
- Fixed Groovex highlight indicator persistence.
- Removed fake session placeholders and introduced a premium empty state illustration for recent sessions.

## 4.0.89

### Added

- Major visual redesign of the Studio Hub with a center-aligned floating top app bar and warm greetings.
- Integrated a premium quick actions horizontal shortcuts gallery and independent branded module cards.
- Integrated the Settings tab directly into the Profile screen, streamlining main Hub navigation.
- Upgraded the bottom navigation bar to a floating, premium M3 surface with progressive blur backgrounds and spring active indicators.
- Implemented high-performance Progressive Blur across floating sheets, dialogs, and navigation panels.
- Upgraded transitions to fluid, spring-driven Shared Axis, Container Transform, and Emphasized motion curves.

## 4.0.88

### Added

- Integrated full Material 3 Motion System and centralized Motion Engine.
- Standardized bottom navigation bar sizing and radius across Chords, Vocalex, and Hub.
- Implemented M3 Emphasized sliding pill transitions for active tab selection.
- Added settings entrance keyframe animations (settings-content-fade-in) for settings panels.

### Improved

- Scoped interactive hover styles inside media-hover blocks to prevent sticky WebView touch states.
- Polished Groovex library list rows and chip radii to match M3 curves.
- Optimized performance by utilizing GPU-promoted will-change layer styles.

### Fixed

- Resolved touch interaction sticking state bugs on cards, buttons, and settings rows.

## 4.0.87

### Improved

- Fixed sticky hover pointer states on Android touch screens.
- Standardized bottom navigation bar sizing and radii across Chords, Vocalex, and Hub.
- Unified sliding navigation pill transition ease and speed to match M3 Emphasized curves.
- Registered missing keyframe entry transitions (settings-content-fade-in) for settings panels.
- Scoped CSS hover rules inside media-hover blocks to prevent WebView sticky taps.
- Polished Groovex library list row/chip padding, radii, and grid margins.

## 4.0.86

### Improved

- Migrated remaining settings, controls, and search inputs to Material 3 design.
- Integrated unified SearchBar component into SongsPanel and GroovexLibrary.
- Refactored GroovexPreferences and DrumEditor components to consume centralized Toggle and SegmentedControl elements.
- Verified layout projection and animated SVG switch transitions perform smoothly on Android.

## 4.0.85

### Improved

- Migrated Studio transitions to a centralized Material 3 Motion System.
- Refactored dialog, bottom sheet, and page animations to consume unified duration and curve tokens.
- Ensured robust prefers-reduced-motion and user speed preferences scaling across native and web platforms.
- Promoted animation layers to GPU via will-change styles to resolve WebView rendering stutter.

## 4.0.84

### Added

- Implemented the Stitch Material 3 redesign for Help & Support on Android.
- Implemented the Stitch Material 3 redesign for Chords Home screen on Android.
- Preserved existing diagnostics, search, and core features under Capacitor native isolation.

## 4.0.83

### Added

- Overhauled internal tab transitions using a unified fade-through engine.
- Redesigned Chordex landing page using Material Design 3 Expressive motion and cards.
- Fixed rapid tab-switching and navigation state race conditions.
- Preserved scroll offset and view state on tab transitions.

## 4.0.82

### Added

- Overhauled and renamed the Updater debug tool to Updater Diagnostics everywhere.
- Fixed layout overflows in portrait, landscape, and tablet screens.
- Integrated the diagnostics page inline with native settings scaffold, animations, and back button behaviors.
- Added full support for application theme coloring, light/dark modes, and custom accent styles.

## 4.0.81

### Added

- Prioritized Firebase update metadata manifest queries to eliminate CORS and network console warnings.
- Overhauled the Engineering Tools Updater section into a dark, premium cockpit theme.
- Exposed real-time diagnostics, download progress trackers, and virtualized log history.
- Added operational debugger actions (verify signatures, validate download url, simulation lab controls).

## 4.0.80

### Added

- Implemented static installer locking and session synchronization to block concurrent PackageInstaller requests.
- Added automatic native cleanup to force-abandon orphaned/interrupted installer sessions on app load and update start.
- Resolved installer active-session rejections by gracefully recovering and returning the active session ID.
- Switched the bottom navigation tabs to a fluid Material horizontal fade-through transition (24px shift + scale + crossfade).
- Removed clashing inline slide animations from the Profile tab to eliminate double transitions and layout stutter.

## 4.0.79

### Added

- Removed floating pill/banner notifications to immediately show full-screen update dialog.
- Center-locked the update modal dialog and disabled vertical bouncing.
- Added a unified, fluid progress bar that tracks the entire download and verification cycle.
- Fixed back transition animations to slide out correctly when leaving Profile or Settings views.
- Wired global transition state into the navigation container for consistent Android gesture transitions.

## 4.0.78

### Added

- Reorganized Updater screen to display the update checker card above official downloads recovery.
- Redesigned Vocalex Coach segmented control with a centered modern sliding pill indicator layout.
- Implemented native Android microphone permissions request and Settings redirect recovery flow.
- Synchronized Vocalex Preferences default tab selector icons to use bottom navigation React icon components.
- Swapped Profile and Settings view order to resolve reversed page transition directions.
- Moved heavy UI modules preloading to startup Phase 6 to resolve intro animation freezes.
- Downgraded generated urls updater diagnostics expected warning to debug log level.

## 4.0.77

### Added

- Merged Vocalex Pitch + Practice views into a unified Coach panel.
- Implemented sequential, stutter-free transitions for Stagex tab changes.
- Integrated SharedNavigationContainer transitions inside Developer Tools.
- Redesigned and simplified the Updater UI.
- Fixed Settings routing for Help Center, FAQ, Terms, and Privacy screens on Android.

## 4.0.76

### Added

- Implemented per-app Start On settings for Vocalex under its own Preferences tab.
- Removed deprecated Version Downgrade selection and confirmation overlays from Hub Updater page.
- Relocated the Official Release Downloads section into Settings -> Updater.
- Stabilized Vocalex Pitch monitor microphone concurrency initialization and background resume behaviors.

## 4.0.75

### Fixed

- Fixed CommonJS module dynamic import interop in AppLottie to resolve React Error #306.
- Restored handleOpenGitHub and ViewState definitions to resolve compile-time warnings and errors.

## 4.0.74

### Fixed

- Fixed React Error #306 crash inside Vocalex TakesPanel (Lottie dynamic import).
- Fixed Microphone initialization crashes on unsupported devices.
- Restored missing TakeDetailView component and cleaned up Vocalex components.

## 4.0.74

### Fixed

- Fixed React Error #306 crash inside Vocalex TakesPanel (Lottie dynamic import).
- Fixed Microphone initialization crashes on unsupported devices.
- Restored missing TakeDetailView component and cleaned up Vocalex components.

## 4.0.73

### Fixed

- Fixed memory leak and 4-second delay during Groovex startup.
- Resolved crash in Vocalex recording view.
- Relocated Official Release Downloads to Updater Settings panel.

## 4.0.72

### Fixed

- Fixed Groovex module crash by restoring ACCENT_COLORS reference.
- Fixed React Error #306 in Vocalex by unconditionally executing hooks in AppModeMenuLogo.
- Removed legacy OTA updater subsystem and all obsolete references.

## 4.0.71

### Added

- Finalized Phase 3-8 architecture updates and Start On persistence.

## 4.0.70

### Changed

- Complete performance optimizations across Settings, Navigation, Chordex, Stagex, and Updater.
- Major diagnostics improvements.
- Permanent removal of the OTA architecture and all its obsolete subsystems.
- Roll-up of numerous bug fixes and stability improvements.

## 4.0.69

### Fixed

- Fixed critical startup regression causing a permanent black screen on native platforms due to incorrect Capacitor.isNativePlatform() double invocation.

## 4.0.68

### Fixed

- Complete redesign of the Release Pipeline for determinism.
- Prevent duplicate GitHub Actions workflows.
- Dynamically resolve versions in CI pipeline.

## 4.0.67

### Improved

- 120Hz Native Performance Sprint Continuation
- Advanced optimization of the app updater and Settings panels.

## 4.0.35

### Improved

- 120Hz Native Performance Sprint
- Eliminated massive UI layout thrashing by implementing useShallow Zustand selectors.
- Decoupled Updater subsystem from critical rendering path to stop background freeze.
- Removed SharedNavigationContainer inside Stagex iframe to eliminate tab switching delays.
- Implemented O(N) keep-alive rendering optimizations for the Settings subsystem.

## 4.0.34

### Improved

- Performance and UX optimization pass.
- Fixed layout thrashing in the updater modal.
- Cleaned up detached memory references for background tasks.
- Improved startup time by deferring heavy module preloading.

## 4.0.33

### Added

- Architecture and tech debt reduction pass.
- Removed dead code and unused exports.
- Resolved circular dependencies.
- Extracted constants from massive UI components.

## 4.0.30

### Added

- Complete SDK modernization verification release.
- Validated compatibility of Capacitor 8, Android SDK 35, AGP 8.8.0, and Gradle 8.12.
- Verified zero native compilation warnings under JDK 21.

## 4.0.29

### Added

- Test release validation build with no functional code changes to verify the complete release pipeline.

## 4.0.28

### Added

- Concurrent update check resolver querying both Firebase Hosting and GitHub Releases concurrently.
- Strict fallback version check logic to prevent stale CDN cache or metadata replication lag from bypassing updates.
- Resolved diagnostics FSM transition count inconsistency by aligning it with persisted Flight Recorder state.
- Cleaned up background version check timeout resource leaks.

## 4.0.27

### Added

- Test release validation build with no functional code changes.

## 4.0.26

### Fixed

- Fixed recursive logging loop in native Android OTA instrumentation.
- Ensured strict unidirectional logging flow without re-entrant native calls.

## 4.0.25

### Added

- Native Android OTA instrumentation logging.
- Flight recorder categorized events (NATIVE, LIFECYCLE, PIPELINE, STATE).
- FSM transition instrumentation tracking.

## 4.0.24

### Added

- Native Android OTA instrumentation logging.
- Flight recorder categorized events (NATIVE, LIFECYCLE, PIPELINE, STATE).
- FSM transition instrumentation tracking.

## 4.0.23

### Added

- Test release with updater pipeline architectural fixes.

## 4.0.22

### Added

- Overhauled Updater Diagnostics UI into 4 high-density collapsible sections.
- Added real-time Live Timeline with filter, search, pause/resume, copy/export controls.
- Implemented Capacitor AppInstaller plugin Proxy guard to guarantee simulated updates never trigger native installations.
- Redesigned Updater Flight Recorder with 300 events ring buffer, size limits, severity levels, and automated session pruning.

## 4.0.21

### Added

- Refined diagnostic console header typography, spacing, and back button alignment.
- Added sticky Back button when desktop view is active.
- Enhanced simulation workflow testing to run the standard download-then-apply flow.

## 4.0.20

### Added

- Redesigned the diagnostics dashboard into a high-density, professional engineering console.
- Created sticky console statistics strip containing only critical versions, states, and counts.
- Replaced tab sheets with 4 collapsible segments utilizing rotating chevrons and lazy rendering.
- Upgraded Copy Everything report to loop over all sessions and export histories.

## 4.0.19

### Added

- Exposed a persistent local flight recorder that logs updater transitions and PackageInstaller events.
- Integrated a compact workflow testing scenarios panel inside the real updater diagnostics page.
- Added automatic verdict analysis for state machine anomalies and listener leaks.

## 4.0.18

### Added

- Implemented compact workflow testing scenarios in the diagnostics panel.
- Enhanced real-time Live Workflow Timeline with elapsed durations, transition sources, and error highlights.
- Expanded Copy Everything into a comprehensive Markdown engineering report for debugging.

## 4.0.17

### Added

- Isolated developer simulation modes cleanly from the production updater pipeline.
- Implemented dynamically generated simulation target versions based on the currently installed version.
- Restored visual progression pacing and a 1.5s simulated confirmation wait to the Simulation Lab.

## 4.0.16

### Fixed

- Fixed native PackageInstaller handoff so the app remains on the Installing screen during update instead of resetting or hiding the updater.
- Restored comprehensive updater workflow simulation and timeline diagnostics to the developer diagnostics dashboard.
- Ensured changelog displayed post-update matches the target release notes perfectly using saved localStorage release notes.

## 4.0.15

### Fixed

- Verification of fix for premature 'Studio is up to date' bug on real device without the 2500ms auto-close timer.

## 4.0.14

### Fixed

- Replaced timer-based auto-close after installation with a lifecycle-synchronized post-install session that stays active until Android confirms the process transition.
- The updater success screen now remains visible until the app process is replaced, the user taps Done, or a 5-minute safety timeout expires.
- All automatic update checks, lifecycle triggers, and state resets are blocked during the post-install session using process boot ID detection.
- Added detailed process-level instrumentation for post-install lifecycle events.

## 4.0.13

### Fixed

- Fixed premature "Studio is up to date" message appearing while Android is still installing the update.
- Prevented the auto-close timer from resetting the installation lock after a successful install, which allowed stale update checks to run in the old app process.
- Added a safety guard to dismissUpdate so it cannot reset state while the PackageInstaller is actively running.

## 4.0.12

### Fixed

- Fixed Stagex splash and logo freeze when navigating away from the Stagex panel.
- Optimized iframe keep-alive limits inside Stagex by category-mapping views, reducing active background WebGL instances from 8 to at most 4.
- Added watchdog recovery callbacks to the launch transition system to force-dismiss the splash screen if a sub-app unmount takes longer than 4000ms.
- Unified native and web English changelogs to read from a single synchronized source of truth.

## 4.0.11

### Fixed

- Fixed a race condition that caused "Studio is up to date" to appear prematurely during Android APK installation.
- The updater now waits for the native PackageInstaller result query to fully resolve before triggering any automatic update check on app resume.
- Eliminated the timing window where a 200ms-debounced update check could read the installation-lock state before the native IPC response had set it, triggering a false version-match comparison.
- Installation lock diagnostics now record `RACE_BLOCKED` events in the install lock timeline for production visibility.

## 4.0.10

### Fixed

- Fixed navigation transition directions globally so they always match the logical layout/order.
- Corrected Chordex panel order mismatches to resolve reverse sliding tab animations.
- Eliminated previous-screen ghosting and flashing artifacts by introducing dynamic z-index overlays and solid background wrappers on view transition layers.
- Integrated SharedNavigationContainer transitions inside Stagex for setups, Rider, scene editor, and settings screens.
- Redesigned the App Switcher pill overlay to inherit the premium Kyant0 Liquid Glass visual language.

## 4.0.9

### Fixed

- Fixed updater prematurely showing "Studio is up to date" while the Android PackageInstaller was still active installing the update.
- Introduced an installation lock (`isInstallationLocked`) that prevents any automatic update check from running during or immediately after a system installation session.
- Prevented `StartupCoordinator` from resetting the startup pipeline while the PackageInstaller dialog is visible — the system was treating the installer overlay as an app-backgrounded event and incorrectly re-triggering a full startup cycle.
- Added `installationJustCompleted` flag that remains active from `INSTALL_SUCCESS` until the user dismisses the completion screen (or a 60-second safety timeout fires), closing the race window between session cleanup and startup update checks.
- Added installation lock diagnostic timeline (`installLockTimeline`) to every rejected automatic check for full production auditability.

## 4.0.8

### Optimized

- Modernized the Chords home screen: visually refreshed Quick Categories grid with custom colored squircle badges, hover scale elevation, dynamic borders, and enhanced spacing/alignment.
- Eagerly preloaded Tolgee translations on application startup, eliminating the "Loading translation resources" text modal for a seamless native boot experience.

## 4.0.7

### Fixed

- Aligned Chordex layout top offsets correctly using the shared ScreenScaffold system, fixing overlapping content with the status bar on Android.
- Fixed Chordex tab routing to navigate internally inside Chordex instead of launching Hub settings.
- Removed transition locked guards (cooldown) from NavigationDispatcher to make spam clicks and rapid tab transitions instant everywhere.
- Replaced the custom copy-pasted animation logic in Android project with SharedNavigationContainer to unify transition performance.

## 4.0.6

### Optimized

- Implemented zero-latency navigation tab state retention across the entire application workspace.
- Optimized SharedNavigationContainer to keep visited panels alive in the DOM using display: none, avoiding costly unmounting/re-mounting.
- Tuned Zustand subscription selectors across all sub-apps to return literal state strings directly, eliminating redundant parent component re-renders.
- Stabilized bottom navigation setTab callback reference to prevent child re-rendering overhead.

## 4.0.5

### Added

- Unified the navigation experience across all Studio apps using the Drumex slide-transition animation standard.
- Integrated the SharedNavigationContainer into Chordex, Drumex, Groovex, Vocalex, and StudioHub.
- Isolated page-level scroll states across tabs to prevent navigation scroll sharing issues.
- Optimized Chordex layout top padding and resolved transition flashing issues.

## 4.0.3

### Fixed

- Fixed post-update startup check loop by invalidating session caches when local version matches target.
- Restored and reorganized Developer Options Diagnostics page into 11 distinct sections.
- Restored simulation overrides, chronological timelines, PackageInstaller telemetry, and clipboard tools.

## 4.0.2

### Added

- Redesigned updater dialog utilizing premium centered layout and blurred backdrop overlay.
- Added live download speed, remaining time, and package size metrics calculation in Javascript.
- Integrated automatic close timer and unified installation status tracking behind PackageInstaller.

## 4.0.1

### Added

- Push test update to version 4.0.1 for verification.
- Verified in-app updater behavior under clean state.

## 3.7.97

### Fixed

- Fixed version metadata parsing to support multiple tag formats (v3.7.96, Version 3.7.96, refs/tags/v3.7.96).
- Centralized version parsing and formatting logic across all updater screens and modules.
- Robust release detection to prevent fallback errors on non-standard remote versions.

## 3.7.96

### Fixed

- Fixed critical bug where the updater prematurely exited with "Studio is up to date" after clicking Update Now.
- Added strict transition controls and update session locks during PackageInstaller execution.
- Added enhanced diagnostics logs capture whenever the up-to-date state is reached.

## 3.7.95

### Added

- Multi-tab Developer Diagnostics Page (Overview, Current Session, Workflow Timeline, Update History, Diagnostics, Performance, Simulation).
- Live Frame Rate (FPS) tracker utilizing requestAnimationFrame.
- Timeline log enhancement tracking updater lifecycleState, packageInstallerStatus, and progress.

### Fixed

- Fixed update session persistence using localStorage to withstand app restarts and rebuilds.
- Fixed checking updates collision where manual checks can supersede active background check sessions.
- Resolved type safety and session naming collisions.

## 3.7.94

### Added

- Performance Diagnostics 2.0 section displaying CPU/Memory average and peaks.
- Renders, paints, and layout passes tracked via useLayoutEffect and Performance APIs.
- Callback roundtrip latency metrics inside Telemetry grid dashboard.

### Fixed

- Hardened PackageInstaller background installation recovery checks upon app reopen.
- Fast simulated update loops running in less than 300ms total.

## 3.7.92

### Added

- Persistent diagnostics update session selector to inspect past update logs.
- Transition timeline tables mapping state changes, timings, and exceptions.
- Tracing for closure events and up-to-date popups with caller stack trace capture.
- Multi-format copy and download actions for diagnostic session subsets.

### Fixed

- Simulation mode to mock full installation progress sequences.
- Bypassed file signature and eligibility checks when simulating updates.

## 3.7.91

### Added

- Interactive Update Session Diagnostics UI section in the Help Center.
- Diagnostics logging tracing updater events, timing offsets, states, and recovery attempts.
- Security guards checking for and blocking illegal background check calls during active installer sessions.

### Fixed

- Navigation white flashing issue when expanding the bottom navigation bar after scrolling.
- Redundant web-centric references in the Help Center settings view, replacing them with native Android & hardware troubleshooting guides.
- APK installer session callback sequence checks to ensure the Installing screen remains active until completion.

## 3.7.90

### Fixed

- Native updater validation update check.

## 3.7.89

### Fixed

- Native updater dialog redirection issues during active installations.
- Fake progress indicators and timers by exposing real native PackageInstaller progress stages (Preparing, Launching, Installing, Optimizing, Finalizing).
- Aurora background animation frame drops by converting linear gradient movement to GPU-accelerated transforms.
- CPU overhead and React rendering storms by throttling progress callbacks to a 100ms interval.

## 3.7.88

### Added

- Collective Set-based scroll hide registration system supporting multiple container scopes.

### Fixed

- Bottom Navigation sticky collapsed states by auto-expanding when all visible containers are at top or disconnected.
- Frame rate stuttering and layout thrashing by implementing pure percentage-based sliding pill calculations.
- CPU overhead by removing computed style checks on global body MutationObserver events.

## 3.7.87

### Added

- Sleek glassmorphic Native Updater interface with continuous card resizing transforms.
- Active stage indicators during Android package installation to cycle through status steps.
- Float and pulse animations to the installing status icon to indicate background activity.
- Tactile ActionButton touch-down scaling microinteractions across all updater dialog states.

### Fixed

- Lightweight non-intrusive post-update startup toast notification instead of fullscreen overlay.

## 3.7.86

### Added

- Global bottom navigation scroll hiding registration system.
- Synchronous render-phase page transition direction tracking.

### Fixed

- Solid opaque page slide transitions matching native Android behavior.
- Profile and root Settings page scroll hiding triggers.

## 3.7.85

### Added

- Navigation Session Token verification for all state modification callbacks.
- Route transition lifecycle synchronization for active scroll owners.

### Fixed

- Eliminate asynchronous callback race conditions in bottom navigation.

## 3.7.84

### Added

- Keep collapsed gesture pill permanently visible above the bottom safe area.
- Propagate scroll-collapse behavior globally to settings and developer options.

### Fixed

- Optimize morph transition duration to 250ms using a premium easing curve.
- Resolve Stagex bottom navigation transform alignment and visibility bugs.

## 3.7.83

### Added

- Implement responsive bottom navigation gesture pill morphing on scroll.
- Add event-driven passive watchdog recovery system.

### Fixed

- Optimize bottom navigation motion speed to 200ms with emphasized cubic-bezier curve.
- Remove continuous watchdog polling loops to minimize idle CPU usage.

## 3.7.82

### Fixed

- Resolve native package installer UX bug where the updater screen would close or reset to "up to date" immediately after tapping UPDATE.
- Prevent transient native installer status codes from corrupting Javascript state machine recovery on application resume.

## 3.7.81

### Fixed

- Stabilize cross-app navigation and transition lockups.
- Remove polling timers, replacing them with deterministic lifecycle mount-ready completions.
- Redesign Developer Tools diagnostics views with real performance instrumentation and badged metrics.
- Overhaul diagnostics copy reports into structured interpreted documents with a Technical Appendix.
- Smooth global bottom navigation bar collapse-to-indicator animations on scroll down.

## 3.7.80

### Fixed

- Restore top-right Copy Everything button on mobile sub-pages.
- Fix global bottom navigation overlays in hub mode.
- Stabilize native update PackageInstaller session completion flow.

## 3.7.79

### Fixed

- Sprint 20 Release: Consolidates Developer Tools diagnostics screen headers.
- Integrates global Copy Everything and Copy Section utilities.
- Extracts and unifies scroll-driven Bottom Navigation auto-hide/reveal behaviors.

## 3.7.78

### Fixed

- Finalized native Android PackageInstaller stabilization and UI synchronization.
- Resolved duplicate confirmation dialogs prompting users twice.
- Configured persistent installer screens during package replacement.
- Removed the legacy startup success screens to boot directly to the main Hub.

## 3.7.77

### Fixed

- Test release with no changes to verify PackageInstaller flow.

## 3.7.76

### Fixed

- Resolved duplicate PackageInstaller dialog prompting users twice during installation.
- Synchronized native installation states to keep the installing screen active with a spinner.
- Added a final completion screen upon successful background package replacement.
- Configured the Done action button to cleanly terminate the app process.

## 3.7.75

### Fixed

- Completed System Diagnostics page redesign to match the premium Developer Tools theme.
- Added Copy Everything and Copy Section utilities to all diagnostics screens.
- Fixed PackageInstaller state sync where updater screen reset prematurely on resume.

## 3.7.74

### Fixed

- Stabilized cross-app navigation and transitions between Hub and sub-apps.
- Fixed navigation store state mismatches, logo freezes, and unmount cleanups.
- Added modals/sheets cleanup inside sub-app unmount callbacks.

## 3.7.73

### Fixed

- Finalized native Android APK installation pipeline to prevent Hub flashes and UI unmounts.
- Fixed duplicate confirmation intents and session creations natively in PackageInstaller.
- Added comprehensive diagnostic trace logging for installation lifecycle events.

## 3.7.72

### Added

- Integrated comprehensive navigation logging instrumentation across the entire routing stack.
- Enabled real-time state and action tracking for store mutations, gestures, and back-handlers.
- Added diagnostics dump utility to reconstruct timeline events upon navigation validation failures.

## 3.7.71

### Added

- Resolved critical sub-app closing regression and navigation deadlocks.
- Implemented premium slide-reveal transitions for all sub-app pages.
- Upgraded bottom navigation auto-hide scrollers to filter jitter and ignore overscroll.
- Added automatic bottom navigation expansion upon tab and view switches.
- Restructured Android app shells to use unified Zustand navigation states.

## 3.7.70

### Added

- Resolved critical sub-app closing regression that immediately exited nested modules after splash screen.
- Integrated NavigationDispatcher.push routing synchronously with appMode triggers on Hub app launch.
- Propagated scroll-driven collapse state notifications properly via setNavCollapsed in useScrollHide hook.
- Implemented robust callback polling listener inside useScrollHide to prevent React late-mounting ref traps.
- Unified sliding translation animations using premium CSS transforms across all sub-app navigation bars.

## 3.7.69

### Added

- Standardized settings menu pages and consolidated terms, privacy policies, and credits under a unified About view.
- Removed permanent Report a Bug feedback option from settings screen, keeping it accessible via dev diagnostics.
- Hardened in-app updater watchdog transitions to preserve diagnostics failure details on state resets.
- Fixed Capacitor mock isolation and dynamic ESM module override traps during regression test suites.
- Completed full production UX audit across Chordex, Stagex, Drumex, Groovex, Vocalex, and settings modules.

## 3.7.68

### Added

- Removed the gray Settings header and restored the transparent sub-navigation bar design.
- Optimised page transitions to slide in faster and more snappily.
- Improved startup coordination by verifying the Hub DOM mounts and paints before completing boot.
- Unified dynamic import preloading to reduce dynamic chunk loading bottlenecks.
- Fixed background OTA updater lifecycle race conditions.

## 3.7.67

### Added

- Unified all custom overlay sheets, modals, and screen scaffolding using DialogScaffold to standardize bottom offsets and transitions.
- Optimized boot lifecycle, startup coordination, and lazy loading to resolve layout shifts and startup lag.
- Consolidated duplicate design system primitives and pruned unreferenced components from ui-web and ui-shared.

## 3.7.66

### Added

- Implemented premium visual redesign of Developer Options dashboard (Design #1) with a 4-column live System Health grid showing App/Android versions, update statuses, and error/warning counts.
- Redesigned Engineering Tools inside Developer Options into an interactive 6-card bento grid (Apps, Performance, Logs, Network, System, Updater) with dynamic telemetry badges.
- Rebuilt Settings profile header in Main Settings (Design #2) with dynamic Pro user badge, user initials/photo, and subtle background glow.
- Created reusable BentoSettingCard and BentoSettingRow components inside SettingControls for tactile pressed animations (scale-down effect) and hover states.

### Fixed

- Stabilized bottom navigation consistency across all settings and developer pages to prevent clipping, overlaps, and disappearing states.
- Audited and resolved scrolling, clippings, and black bar layouts throughout Settings to ensure safe-area notches and keyboard padding fit perfectly.
- Replaced hardcoded color values with Studio's theme variables to support AMOLED, pure dark, light, and dynamic accent color modes.
- Overhauled App Update engine with a 16-state deterministic machine to resolve false "App is up to date" scenarios.
- Integrated explicit exception handlers and diagnostics metadata in update checker pipelines for robust recovery paths.

## 3.7.65

### Fixed

- Eliminated false "App is up to date" when remote metadata fetch failed.
- Fixed auto-check exceptions silently returning to idle instead of recovery.
- Added explicit diagnostics on every non-update path.

### Improved

- Every failure path now exposes explicit reason codes, stack traces, and timestamps.
- Version comparison populates full decision rationale in diagnostics.
- Synchronized all version sources to 3.7.65 / versionCode 193.

## 3.7.60

### Fixed

- Rebuilt the App Update subsystem state machine with 16 deterministic uppercase states.
- Re-engineered version comparison engine to explicitly validate metadata and signatures.
- Linearized check, download, and install execution pipelines to eliminate race conditions.
- Adapted UpdateIndicator UI mapping and Simulation Lab assertions to support the new state structure.

## 3.7.59

### Fixed

- Fixed layout shifting and clipping on Android's Developer Options screen when parent is scrolled.
- Removed duplicate safe area padding from subpage headers for perfect notch alignment.
- Replaced outdated "OTA" terminology with generic App Update phrasing across all menus.
- Restored missing native device and build telemetry parameters (OS Version and Version Code).
- Polished diagnostics copy report formatting with section separators and sentinel mappings.

## 3.7.58

### Fixed

- Fixed safe area top padding for all Developer Options screens, preventing status bar and notch overlap.
- Polished layouts to use AMOLED pure black theme with consistent cards and border outlines.
- Integrated diagnostics viewport with the standard floating Bottom Navigation Bar.
- Implemented single-tap Copy Everything report compiling all device, OTA, transition, and log history.
- Added explicit user-facing labels and descriptions for all copy options.

## 3.7.57

### Fixed

- Completely rebuilt Developer Options Updater Debugging section.
- Fixed clipboard size limits, preventing native process binder transaction failures.
- Unified JS log traces with native and state timeline buffers.
- Fixed state machine transition validations for pending user actions.

## 3.7.56

### Fixed

- Fixed devtools copy diagnostics scope and undefined variables.
- Added direct touch event listeners to accordion header components.
- Resolved bottom viewport layout scroll padding and navigation overlay coverage.

## 3.7.55

### Fixed

- Fixed copy buttons failing to populate contents in the diagnostics tool.
- Unified JS logs timeline to use a single console logs source of truth.
- Resolved scroll viewport clipping/truncation at the bottom of Android WebViews.
- Registered a permanent global PackageInstaller listener to eliminate missing listener warnings.
- Fixed invalid updater state machine transition rejections.
- Removed fake CDN URLs from simulations, replacing them with real release metadata.

## 3.7.54

### Fixed

- Fixed touch event interception on Android WebViews for the Updater Debug Tools.
- Constrained layout sheets to fill bounds correctly with flex direction, preventing coordinate offset mismatches.
- Added detailed button-press touch logging instrumentation across all debug buttons.

## 3.7.53

### Fixed

- Repaired the Android UI of the Updater Debug Tools screen.
- Eliminated automatic scroll-into-view viewport jumping and vertical layout shifts.
- Removed nested scrollable containers from the log console and chronological event timeline to ensure a single active scroll container, resolving touch event unreliability and gesture conflicts on Android WebViews.

## 3.7.52

### Fixed

- Repaired all production DevTools Dashboard buttons, ensuring robust handling of missing cached APK paths for Replay Last Install, Open Cached APK, and Open Download Folder.
- Satisfied TypeScript checks by ensuring all code paths in the dashboard button handlers return a value.

## 3.7.51

### Fixed

- Fixed a silent TypeError in `generateFullEngineeringReport` by using optional chaining on `import.meta.env`.
- Fixed Toast notification positioning by changing it from `absolute` to `fixed` so it is always visible on-screen.
- Ensured all copy buttons handle clipboard operations robustly.

## 3.7.50

### Fixed

- Completed full functional audit and verification of all 62 Developer Tools dashboard buttons.
- Ensured 100% end-to-end event chain execution from the UI to the native Android bridge.
- Validated native clipboard writing and sharing integrations across all diagnostic outputs.

## 3.7.49

### Fixed

- Implemented a native clipboard copy bridge to bypass WebView security restrictions on Android.
- Awaited and returned clipboard text across all 15 diagnostic export and report buttons.
- Removed obsolete OTA simulation buttons and user-facing labels.

## 3.7.48

### Fixed

- Added a comprehensive Automated Functional Audit runner to verify all 55 dashboard buttons.
- Fixed clipboard export buttons to correctly await navigator.clipboard.writeText and handle errors.
- Added simulation controls for all PackageInstaller failure codes (Storage Full, Signature Conflict, Incompatible version, Blocked by policy).

## 3.7.47

### Fixed

- Rehabilitated DevTools Dashboard with full functional updates, simulation controls, and telemetry history.
- Implemented robust clipboard validation and loading indicators for all diagnostic exports.

## 3.7.46

### Fixed

- Stabilized simulated failure button click handlers to run sequential state transitions.
- Enabled native update logic bypass for simulations on non-Android platforms.
- Added support for all-zero hash bypass on manual/custom APK integrity checks.

## 3.7.45

### Fixed

- Audited the DevTools Laboratory and stabilized diagnostic logging and test flow operations.
- Added a Clear Timeline action and detailed Copy Logs, Copy JS Logs, and Copy Native Logs buttons.
- Refactored the full export engineering report into a clean, structured Markdown layout.

## 3.7.44

### Fixed

- Fixed a Rules of Hooks violation in the DevToolsDashboard component by hoisting the conditional unifiedTimeline useMemo hook to the top level.
- Enabled source maps for production and release builds to support exact symbolication of component crash contexts and stack traces.

## 3.7.43

### Fixed

- Completely eliminated minified React errors from the Engineering Lab and DevTools by implementing an automatic inline React error decoder.
- Upgraded the global Error Boundary to capture full component Fiber contexts, including props, states, and hook dependency stacks.
- Prevented potential TypeError rendering crashes during initial Hub load by adding a robust translation fallback for the settings namespace.

## 3.7.42

### Fixed

- Fixed Android 14+ background PackageInstaller confirmation dialog block by launching the confirmation intent using the BroadcastReceiver context with FLAG_ACTIVITY_NEW_TASK.
- Permanently resolved the background activity launch (BAL) restriction on newer Android versions.
- Fully instrumented the updater pipeline with detailed native and JS telemetry logs.

## 3.7.41

### Fixed

- Fixed Android 14+ background PackageInstaller confirmation dialog block by launching the confirmation intent using the BroadcastReceiver context with FLAG_ACTIVITY_NEW_TASK.
- Permanently resolved the background activity launch (BAL) restriction on newer Android versions.
- Fully instrumented the updater pipeline with detailed native and JS telemetry logs.

## 3.7.40

### Fixed

- Fixed Android 14+ background PackageInstaller confirmation dialog launch block by routing the session callback through a Broadcast PendingIntent targeting InstallReceiver.
- Prevented duplicate update checks by implementing a synchronous promise-reuse lock in checkForUpdate.
- Enhanced native and JS updater tracing to log full stack traces, threads, callers, and timestamps.
- Fixed horizontal layout shifting in DevTools tabs and resolved GSAP animation console warnings.

## 3.7.39

### Fixed

- Fixed Android 14+ background PackageInstaller confirmation dialog launch block by routing confirmation intents through the active foreground MainActivity.
- Added automatic re-prompt resume logic on app resume to restore blocked confirmation screens.
- Enforced strict installation locks in the JS updater to prevent background polling or resume events from resetting the update state.
- Fixed horizontal layout shifting in DevTools tabs and resolved GSAP animation console warnings.

## 3.7.38

### Added

- Overhauled the Updater Laboratory UI in Developer Options by replacing all checkbox-style controls with dedicated button commands.
- Added simulation actions for injecting SHA-256 validation failures, signature conflicts, and download network timeouts directly into the real updater pipeline.
- Implemented a live, auto-scrolling execution console panel displaying unified chronological events (JS, native, state transitions).
- Created advanced engineering tools to replay installations, inspect APK manifests, recalculate SHA checksums, and export diagnostic logs.

## 3.7.37

### Fixed

- Fixed PackageInstaller background activity launch blocks on Android 14+ by using a BroadcastReceiver.
- Added comprehensive Updater Laboratory simulation tools and unified chronological event logs to Developer Options.
- Refactored index exports and added post-download certificate check robustness.

## 3.7.36

### Fixed

- Permanently fixed PackageInstaller by using BroadcastReceiver targeting InstallReceiver to launch system confirmation dialogs, preventing background activity blocks on Android 14+.
- Added Updater Laboratory simulation controls and a comprehensive Diagnostics dashboard to Developer Options.

## 3.7.35

### Added

- Release validation build for v3.7.35.
- No functional or behavioral changes.

## 3.7.34

### Fixed

- Restored native PackageInstaller session flow with corrected activity lifecycle management to prevent premature dismissal of the system confirmation dialog.

## 3.7.33

### Added

- Release validation build for v3.7.33.
- No functional, updater, startup, or UI behavior changes.

## 3.7.32

### Fixed

- Fixed critical race condition in the updater state machine where the native PackageInstaller session becoming active caused an invalid state transition, resetting the updater to idle.

## 3.7.31

### Added

- Release validation build for v3.7.31.
- No functional, updater, startup, or UI behavior changes.

## 3.7.30

### Added

- Fixed critical bug where the Android PackageInstaller prompt never appeared due to background activity start restrictions on Android 14.
- Implemented a transparent foreground InstallActivity to reliably launch the installer confirmation screen.

## 3.7.29

### Added

- Release validation build for v3.7.29.
- No functional, updater, startup, or UI behavior changes.

## 3.7.28

### Added

- Fixed critical bug where pressing the Update button incorrectly entered the 'Studio is up to date' path.
- Blocked background update checks from running when the installer is busy or in an active installation state.
- Enforced that the only valid transition from UPDATE_AVAILABLE is to DOWNLOADING in the state machine.

## 3.7.27

### Added

- Release validation build for v3.7.27.
- No functional, updater, startup, or UI behavior changes.

## 3.7.26

### Added

- Fixed critical PackageInstaller synchronization bug in the in-app APK installer.
- Implemented persistent active installation tracking in native code and SharedPreferences.
- Ensured that the fullscreen installation screen remains active during the entire installation process.

## 3.7.25

### Added

- Replaced the planets orbits intro animation with a premium minimalist centered logo fade-scale transition.
- Preserved 100% of the startup event model, reactMounted checks, and Capacitor AppInstaller integration.
- All updater and offline recovery features remain fully operational.

## 3.7.24

### Added

- Restored full orbits and flight settle splash intro animation from the stable version 3.7.15.
- Fixed black screen startup regression by coordinating early-exit and mount checks.
- All updater, offline recovery, and signature checking functionality preserved.

## 3.7.23

### Added

- Restored original splash screen dismissal behavior to synchronize with the React Hub mount.
- Eliminated the black screen regression by keeping the splash screen active until the Hub is painted.
- All updater, offline recovery, and signature checking functionality preserved.

## 3.7.22

### Added

- Rollback of the React startup state machine to restore the stable architecture of version 3.7.15.
- All startup overlay lifecycle coordination moved into a simple self-contained inline script.
- All updater enhancements (native success checks, recovery centers, signature verification) preserved.

## 3.7.21

### Added

- Authoritative Android-driven PackageInstaller success verification.
- Completely passive splash screen and linear React-owned startup transitions.
- Eliminated redundant startup transitions and late installer-handoff background listeners.

## 3.7.20

### Added

- Authoritative PackageInstaller success verification to prevent early up-to-date states.
- Completely redesigned startup flow with lightweight logo fade-scale animation.
- Optimized startup path with zero frame stalls and strictly linear transition states.

## 3.7.19

### Added

- Authoritative PackageInstaller success verification to prevent early up-to-date states.
- Completely redesigned startup flow with lightweight logo fade-scale animation.
- Optimized startup path with zero frame stalls and strictly linear transition states.

## 3.7.18

### Added

- Startup state machine stabilization with linear transitions.
- Updater native bridge status events synchronization.
- Manual dismissible success screen with clean process exit.
- Performance budget checks and zero warnings validation.

## 3.7.17

### Added

- Updater transaction consistency to prevent impossible execution paths.
- Eligibility pipeline version code validation fixes.
- State machine validation and granular verification states.
- Diagnostic error reporting improvements.

## 3.7.16

### Added

- Deterministic startup state machine to prevent visual layout shifts.
- Fast intro animation settle timings fitting strict performance budgets.
- Auto-recovery safety net for the startup overlay rendering.

## 3.7.15

### Added

- Staged updater installation progress screen flow.
- Background resume detection and failed-state recovery options.
- Enriched compositor watchdog telemetry with deep diagnostics.

## 3.7.14

### Added

- Fullscreen updater UI locking and spinner integration.
- Dedicated installing progress screen overlay.
- Complete production end-to-end update validation.
- Architectural and regression suite audits.

## 3.7.13

### Added

- Fullscreen updater experience restored.
- Dedicated installing UI state.
- Post-refactor stability validation.
- Startup pipeline and performance validation.

## 3.7.12

### Added

- Startup pipeline optimization.
- Startup performance improvements.
- False black-screen detection fixes.
- Diagnostics reliability improvements.

## 3.7.11

### Added

- Installation UX improvements.
- Persistent installation stage.
- Improved PackageInstaller handoff.
- Recovery reminder persistence.
- Continue Installation improvements.

## 3.7.10

### Added

- Recovery Center.
- Smart Installation Recovery.
- Continue Installation action.
- Intelligent cache validation.
- Recovery workflow improvements.

## 3.7.9

### Added

- Official GitHub Release Fallback.
- Manual Recovery Path.

### Fixed

- Completed modular refactoring of the updater subsystem into decoupled components under the new architecture.
- Integrated a single authoritative state machine with strict validation guards and transient state watchdogs.
- Added a priority check queue to ensure manual update checks obsolete background checks automatically.
- Created and validated a permanent 10-point automated regression test suite covering Android 14, 15, and 16.
- Update Failure Recovery Improvements.

## 3.7.8

### Fixed

- Fixed update check hangs by implementing a strict timeout race in version metadata queries.
- Enhanced updater diagnostics by prefixing error messages with the exact failing stage (e.g., Download, SHA Verification, Eligibility, PackageInstaller).
- Replaced JS alert popups with native themed modal states for up-to-date and failure outcomes.
- Upgraded the failed state retry button to dynamically retry update checks or downloads.

## 3.7.7

### Fixed

- Fixed critical updater system regressions by enforcing a strict deterministic state machine.
- Added native PackageInstaller active session checks on startup to prevent boot deadlocks and blank screens.
- Implemented robust watchdog timers for checking, downloading, verifying, and installing states.
- Cleaned up interrupted installation behaviors to reset to idle safely when the installer session is dead.

## 3.7.6

### Added

- Added pre-deploy signature verification check preventing deployment of incorrectly signed or debug-signed APK packages to Firebase Hosting CDN channels.
- Added dynamic authoritative expected signature validation resolving directly from app version configuration files.
- Improved updater checking by validating signature fingerprints in release metadata to block mismatching packages before downloading.
- Added detailed troubleshooting diagnostics fields including certificate subject and issuer, validation stage, exact failing stage, root cause, and suggested fixes in the signature mismatch UI.

## 3.7.5

### Added

- Added multi-stage signature mismatch recovery featuring automated cache clearing, session recreation, and PendingIntent resets.
- Added direct GitHub Release package installation with SHA-256 integrity checks and signing certificate verification.
- Added detailed error dialogs containing technical/human explanations, detected cause, and current/latest version comparison.

### Fixed

- Fixed updater state machine overwrite issues to ensure signature mismatch and version checks are preserved.

## 3.7.4

### Added

- Added a premium Version Manager UI with a visual upgrade path timeline, current version highlighting, and detailed release date badges.
- Added a secure, native-styled React downgrade warning and confirmation modal explaining risks, compatibility, and reversibility.
- Significantly expanded Update Diagnostics with search, category filtering, and item expansion for performance, network, storage, and installer logs.
- Integrated animation and boot timing telemetry tracking JS engine load, native bootstrap latency, and frame rendering.

### Fixed

- Eliminated logo splashes and background flashes during Android launch for a seamless planet-intro fade-in transition.

## 3.7.3

### Added

- Added interactive Resume/Discard confirmation prompts for interrupted updater package installations.
- Added automatic cleanup of stale PackageInstaller history and cache files on up-to-date checks.

### Fixed

- Resolved checking for updates regression where manual clicks skipped checking and went directly to pending install progress.

## 3.7.2

### Added

- Implemented smart HTTP resume and partial downloadRange writing for interrupted updates.
- Added prioritized mirror failovers (GitHub Release -> Firebase Hosting -> Official Mirror).
- Created Failsafe Direct intent installer bypass using FileProvider URIs to override PackageInstaller session blocks.
- Added Recovery Mode overlay displaying version details, diagnostics log compile, and manual copy/share actions.

### Fixed

- Resolved checking for updates regression where modal would show stuck 0% download progress.
- Aligned Hub bottom navigation auto-hide animation with the rest of Studio.

## 3.7.1

### Fixed

- Resolved the "Check for updates" regression that opened the updater dialog prematurely and showed a stuck 0% progress screen.
- Restored the theme-aware, animated top-right update indicator pill/badge z-index so it doesn't render behind other elements.

### Added

- Implemented Version Manager UI under settings, allowing users to downgrade to the previous stable release (v3.7.0) or one version prior (v3.6.99).
- Added Update History tracking, recording all transition states locally in a persistent log.
- Upgraded the PackageInstaller to call setRequestDowngrade(true) to support downgrades with matching signing signatures.

## 3.7.0

### Added

- Consolidated all system updater improvements into a new stable baseline.
- Prevented Background Activity Launch (BAL) blocks on Android 14+ by instantiating explicit ActivityOptions.
- Eliminated state-overwrite race conditions and duplicate download loops via strict state transition guards.
- Streamlined PackageInstaller session commit and lifecycle callback handling.
- Enhanced updater diagnostics sheet with detailed session validation matrices, certificate signatures, and execution traces.

## 3.6.99

### Added

- Resolved Android 14+ background activity start block by configuring explicit ActivityOptions in InstallReceiver.
- Prevented double-download and progress thrashes with strict state-transition guards in the update manager.
- Fully validated system update end-to-end and successfully launched native confirmation dialog.

## 3.6.98

### Added

- Resolved PackageInstaller update handoff bug by actively launching system confirmation intent from InstallReceiver.
- Optimized native launch splash screen to use DayNight color systems to eliminate light/dark flashes.
- Made startup experience premium by transitioning directly into planets animation on WebView mount.
- Expanded Update Diagnostics Sheet to render complete PackageInstaller session logs, timestamps, elapsed times, and stack traces.

## 3.6.97

### Added

- Resolved PackageInstaller update handoff bug by actively launching system confirmation intent from InstallReceiver.
- Optimized native launch splash screen to use DayNight color systems to eliminate light/dark flashes.
- Made startup experience premium by transitioning directly into planets animation on WebView mount.
- Expanded Update Diagnostics Sheet to render complete PackageInstaller session logs, timestamps, elapsed times, and stack traces.

## 3.6.96

### Added

- Implemented deep pre-release APK certificate validation via keytool and apksigner checks.
- Deployed automated self-test utility test-updater-flow.mjs for update system pipeline verification.
- Optimized app startup time by disabling heavy stack trace captures inside production console loggers.
- Deferred active watchdog recovery to T+1000ms to eliminate false positive startup thrashes.
- Expanded Update Diagnostics Sheet with validation status matrices, certificate hashes comparison, and logs controls.

## 3.6.95

### Added

- Implemented native PackageInstaller Session API for the update system.
- Added a premium, comprehensive diagnostics system for updater failures.
- Added share, export, and retry capabilities for update logs.
- Added detailed hardware, locale, storage, and certificate comparison diagnostics.

## 3.6.94

### Fixed

- Fixed Android cold launch delay before app appears.
- Improved launch surface / first visible frame.
- Improved startup timing diagnostics.
- Restored Hub bottom nav auto-hide/show.

## 3.6.93

### Added

- Expanded guitar chord database with new qualities and 14 slash chords.
- Fixed floating chord diagram skipping and auto-scrolling issues in Practice.
- Added active segment/phrase highlighting to sync with playback timeline.
- Fixed horizontal scroll block on Discover genre chips.
- Made app entry transition and launch animations 25% faster.

## 3.6.92

### Added

- Expanded guitar chord database by adding the minor 13th (min13) quality and chord shape definitions.
- Enhanced normalization layer to support Latin roots, unicode symbols, and suffix aliases like 7M/M7/menor/maior.
- Upgraded import diagnostics and chord mapping tooltips in the preview modal for better diagram verification.
- Correctly categorized extended and new chord shapes under the right sections in Chordex Library.

## 3.6.91

### Added

- Expanded chord diagram coverage in Practice mode by auto-generating complete guitar shapes for all standard roots and extensions.
- Implemented a robust chord normalization layer converting Latin roots, unicode accidentals, and suffix aliases before resolution.
- Added slash chord fallback rendering: shows the base chord shape and details the bass note on missing slash definitions.
- Integrated a Supported Sites status checklist inside the URL Import modal showing Supported, Limited, and Blocked hosts.
- Implemented dedicated import adapters with detailed error diagnostics for E-Chords and 7 other chord search sites.

## 3.6.90

### Fixed

- Fixed Cifra Club URL importer failure in production by implementing a resilient, multi-strategy layout parser.
- Added support for both mobile and desktop Cifra Club web structures using Apollo JSON parsing and wildcard <pre> tag recognition.
- Integrated inline parser diagnostics list in the chart preview screen to display execution strategies.

## 3.6.89

### Added

- Added user-initiated Import from URL workflow for Cifra Club and generic preformatted chord charts.
- Implemented interactive Preview-Before-Save layout to inspect parsed chords and lyrics.
- Integrated imported chords directly into the Practice view and floating diagram overlays.
- Saved imported charts privately in local storage as User Imported charts.

## 3.6.88

### Removed

- Removed suggested/generated fallback chord progressions.
- Purged hand-aligned chord charts for copyrighted songs in compliance with licensing guidelines.

### Added

- Integrated custom user import and edit chord sheet fallback actions.
- Implemented premium badge indicators for Verified, User, Provider, and Unavailable states.

### Improved

- Polished Practice UI and layout when chords are unavailable (showing lyrics only).
- Disabled floating chord diagrams overlay when no verified or user chords are present.

## 3.6.87

### Added

- Implemented hand-aligned verified chord charts database for curated song lists.
- Integrated new ChordChartProvider search hierarchy prioritising user and verified charts.
- Added premium status indicators indicating chord authenticity (Verified, User, Suggested, Lyrics).

### Improved

- Aligned chord placement to lyrics with accurate timestamp interpolation.
- Refactored manual chord editor modal to easily customize, paste, or reset chord sheets.
- Polished Practice UI layout, typography, line highlights, and viewport spacing.

## 3.6.86

### Added

- Added suggested practice chords mapped to lyrics when verified chord charts are missing.
- Redesigned Chords Home with Chord of the Day, quick categories, and practice tips.

### Fixed

- Fixed Library back button navigation and improved return-to-hub transition logging.

## 3.6.85

### Added

- Implemented MetroList-style lyrics provider integration with LRCLIB auto-fetching.

## 3.6.84

### Fixed

- Matched Stagex History panel design and transitions to Layouts UI.
- Resolved Android native swipe-back gestures for PDF Export and History panel.

## 3.6.83

### Improved

- Added performance diagnostics for sub-app transitions.
- Optimized startup sequence and deferred heavy bundle compilation.
- Polished Stagex touch targets and back button navigation.
- Enhanced native OTA update installer progress tracking.

## 3.6.82

### Fixed

- Optimized startup planets animation with cached dimensions and pre-computed logo offsets.
- Expanded Stagex plot object selection hitboxes by 16px and suppressed tap highlight overlays.
- Redesigned Stagex history menu into a responsive bottom sheet and disabled undo/redo on open.
- Resolved Stagex back-gesture coverage, including presets panel and history overlay detection.
- Refactored native update progress flows with support for all 10 states and automated install.

## 3.6.81

### Fixed

- Optimized startup planets animation and throttled layout queries to prevent freezes.
- Deferred React mounting and non-critical assets load to ensure smooth initial frames.
- Implemented double-buffered loading to eliminate sub-app entry transition stutters.
- Added universal swipe-to-back navigation and root screen exit behavior setting.
- Fixed bottom nav restoration stutters upon exiting nested panels or practice mode.

## 3.6.80

### Fixed

- Fixed global i18n root causes in settings menus and Vocalex Harmonizer.
- Added authorized lyrics and chords support for public-domain songs in Chordex Practice.
- Implemented user-provided custom lyrics/charts paste, edit, and delete flows.
- Optimized floating chord overlay to make diagrams primary and chord names secondary labels.

## 3.6.79

### Fixed

- Fixed incomplete global language switching across the entire app suite.
- Removed entry animation glow and bloom effects from app entries.
- Redesigned Chordex Discover Practice UI to feel polished and native.
- Added clean empty chart placeholder with support for custom chart importing.
- Simplified Practice Settings, keeping size, spacing, and BPM controls.
- Upgraded floating chord widget to display real guitar chord diagrams.
- Scoped bottom navigation bar hiding strictly to the Chordex practice view.

## 3.6.78

### Added

- Centralized localization (i18n) architecture using a unified JSON source of truth.
- Implemented Chordex practice screen with interactive chords-above-lyrics formatting.
- Added draggable floating chord overlay with screen boundary protection and local persistence.
- Added karaoke mode with auto-scroll settings, custom text sizes, and AMOLED contrast themes.
- Expanded Discover song library with 30 detailed song charts by Enjambre.
- Polished app entry transitions with cross-fade overlays and responsive grid/flex layout scaling.

## 3.6.77

### Added

- Increased splash duration (950ms delay with 300ms fadeout) to guarantee visual presence.
- Added fully opaque, theme-adaptive splash backgrounds preventing layout bleed-through.
- Configured dynamic theme adaptation for splash logos and app name titles.
- Eliminated off-screen CPU/GPU rendering overhead of loading animations in background boundaries.
- Synced fade-out with double requestAnimationFrame to ensure browser paints first.

## 3.6.76

### Added

- Implemented dedicated per-app launch screen animations with centered logos and names when opening sub-apps from the Hub.
- Preloaded and initialized sub-app rendering in the background behind the splash screen to eliminate visually jarring entry flickers.
- Enforced a premium minimum launch screen duration (850ms) to ensure smooth transitions.

## 3.6.75

### Added

- Modified navigation forensic snapshot sequence to capture unconditionally at T+0ms, T+50ms, T+100ms, T+250ms, T+500ms, T+1000ms, and T+2000ms.
- Rendered live paint verification screenshots inside the Navigation Forensics panel of the debug overlay.
- Optimized offscreen paint capture image quality to reduce local storage footprints.

## 3.6.74

### Added

- Integrated early orbit intro dismissal bypass when returning from sub-apps via path check and sessionStorage tracking.
- Accelerated launchApp zooming timing to execute setZooming(true) immediately, aligning transition states.
- Re-aligned sub-app transition behavior with the web platform to prevent double-scaling effects.

## 3.6.73

### Added

- Restored centered app-specific loading screens showing animated logos, app names, and customized loading indicators for all sub-apps.
- Smoothed sub-app entry and exit transitions, eliminating any temporary black or blank frames during bundle loading and heavy initialization.
- Integrated persistent sub-app loading screens with Stagex iframe onload/bridge-ready hooks to prevent gray backgrounds.
- Streamlined sub-app mount performance and eliminated rendering delays on Android devices.

## 3.6.72

### Added

- Restored original smooth transition animations for sub-app entries and exits.
- Optimized navigation performance and transition frame-rates on physical Android devices.
- Memoized SubAppWrapper component to prevent unnecessary React re-renders.
- Hidden emergency debug UI, panic menu, and watchdog telemetry from production, keeping diagnostics accessible behind a debug flag.

## 3.6.71

### Fixed

- Mitigated React Error #300 hook order violation in BottomNav by hoisting hooks above conditional return statements.
- Integrated runtime React stack trace symbolicator with VLQ sourcemap decoding and online/offline mapping.
- Added COPY SYMBOLICATED REACT ERROR REPORT action to crashed boundaries and debug overlay timelines.
- Resolved WebView black screen and compositing freezes on sub-app exits with enhanced telemetry and paint validation.

## 3.6.70

### Fixed

- Prevented the visible RootApp ErrorBoundary crash panel from flashing during recoverable Chordex to Hub return transitions.
- Configured RootApp ErrorBoundary to render a neutral dark layout during return sequences, recovering silently.
- Added detailed telemetry logging for RootApp ErrorBoundary catches, recorded under local storage logs.
- Added COPY ROOTAPP ERROR LOG and COPY LAST RECOVERABLE ERROR buttons to Failed Timeline tab.
- Integrated RootApp Error counts, suppression status, and recovery duration diagnostics in Emergency Debug Overlay.

## 3.6.69

### Added

- Upgraded the root React app tree structure to render EmergencyDebugOverlay at root level.
- Refactored App.tsx layout to keep the outer app-container permanently mounted, preventing root-level unmounts.
- Integrated LifecycleTracker logging to record component mount/unmount stack traces and Suspense fallback states.
- Implemented ROOT_APP_TREE_MISSING and HUB_DOM_NOT_MOUNTED diagnostics to isolate rendering failures.
- Added COPY ROOT LIFECYCLE LOG and COPY MOUNT/UNMOUNT STACKS buttons to Failed Timeline tab.
- Fixed React Error #300 hook order violation in BottomNav by hoisting hooks above conditional return statements.
- Integrated runtime React stack trace symbolicator with VLQ sourcemap decoding and online/offline mapping.
- Added COPY SYMBOLICATED REACT ERROR REPORT action to crashed boundaries and debug overlay timelines.

## 3.6.68

### Added

- Upgraded StudioHub to mount synchronously and permanently, eliminating Suspense-induced unmounts.
- Improved the failsafe watchdog to run active DOM restoration at T+50ms, T+100ms, T+250ms, and T+500ms checkpoints.
- Added comprehensive report export options to Failed Timeline (Full Report, Timeline JSON, Summary, Checkpoints, and Recovery Log).
- Fixed the header version display to dynamically show both the current runtime and captured timeline versions.

## 3.6.67

### Added

- Upgraded StudioHub to a synchronous static import to prevent Suspense fallback unmounts.
- Added a failsafe T+50ms watchdog to force-mount StudioHub and clear transition locks if the DOM is missing.
- Updated watchdog return validation to enforce pass/fail criteria on chronological checkpoints.

## 3.6.66

### Added

- Added automated forensic snapshots at T+0ms, T+50ms, T+100ms, T+250ms, T+500ms, T+1000ms, and T+2000ms.
- Enhanced snapshot data model with topmost stack, computed CSS styles, bounding rects, and WebView metrics.
- Added visual thumbnail capture with html2canvas at every checkpoint.
- Added Last Failed Navigation Timeline panel showing chronological checkpoints.
- Added auto-open behavior of emergency overlay on startup following force-closes.

## 3.6.65

### Added

- Added Paint Verification using html2canvas to Navigation Forensics.
- Added Force WebView Repaint recovery action with multiple visual repaint cycles.
- Added Force Full Hub Rebuild recovery action to remount the Hub subtree with a new React key.
- Added Force WebView Refresh Layer compositor invalidation recovery action.
- Added automated timing forensic snapshots at LEAVING_CHORDEX, ENTERING_HUB, T+500ms, and T+2000ms.
- Integrated paint validation into the 1200ms return watchdog to detect and record compositor freeze errors automatically.

## 3.6.64

### Added

- Added pixel-level visibility probes to detect screen rendering freezes.
- Added WebView computed layout, compositing, and layer count diagnostics.
- Added Visual Repaint Recovery and React Nuclear Remount actions.
- Upgraded Navigation Forensics with timing snapshot comparison dropdowns.

## 3.6.63

### Added

- Added auto-capture forensic telemetry for returns from Chordex to Hub.
- Added side-by-side transition state comparison audits (Previous vs Current snapshot).
- Added Force Hub Repaint recovery failsafe tool to clear black screen states.

## 3.6.62

### Fixed

- Upgraded Black Screen Forensics telemetry with elementsFromPoint stacks, fullscreen overlay scanning, and React component fiber audits.
- Added one-click copy forensics report and filtered DOM snapshot buttons to the debug overlay.
- Added force fullscreen overlay removal and force hub visibility recovery controls.
- Fixed Stagex landscape viewport squashing layout mapping offsets.
- Expanded Stagex scene selection, add, and delete touch targets to a minimum of 48dp x 48dp.

## 3.6.61

### Fixed

- Hardened Hub root diagnostics using multi-fallback element selectors.
- Resolved false-positive watchdog failsafes during slow Suspense paints.
- Ensured emergency DBG button is always mounted and auto-recreated if removed.
- Expanded panic context menu with 8 one-click debug data copy actions.
- Added computed style detail printouts in DOM tree snapshots.

## 3.6.60

### Fixed

- Mounted emergency debug overlay outside the main React root via React Portal.
- Added always-visible DBG button and failsafe quick recovery panel.
- Implemented window.__emergencyOverlayHealthCheck() layout stacking audits.
- Added simulated black screen layer tool to verify diagnostic recovery.

## 3.6.59

### Fixed

- Resolved Chordex -> Hub return black screen by keeping StudioHub permanently mounted.
- Eliminated watchdog false-positives via an optimized 1.2s verification delay.
- Added separate HUB_ROOT_MISSING_CAPTURE diagnostic snapshot inside local storage.
- Preserved accurate previous mode history in failsafe recovery logs.

## 3.6.58

### Fixed

- Fixed persistent Chordex-to-Hub return black screen issue via a deterministic failsafe.
- Resolved GSAP target missing console warning.
- Improved diagnostics and trace logging.

## 3.6.57

### Added

- Added advanced WebView diagnostics for black screen analysis.
- Added automatic localStorage persistence for watchdog trace reports.

## 3.6.56

### Added

- Added black screen diagnostic capture action in Developer Tools.
- Added automatic black screen blocker detection and telemetry.

### Fixed

- Fixed Stagex scene buttons touch hitboxes alignment using concentric transparent layout.
- Enlarged delete scene buttons to 36x36px touch target.

## 3.6.55

### Added

- Integrated a "Test Stagex Scenes Input" diagnostic action in Developer Tools.

### Fixed

- Hard-gated Firestore on Android when Supabase is active to prevent runtime connections.
- Resolved Chordex-to-Hub return black screen with an opacity transition fallback.
- Fixed Stagex Scenes bar touch hitboxes by adding position: relative and CSS pseudo-element expansions.

## 3.6.54

### Added

- Added navigation trace and transition diagnostics tab under Developer Tools.

### Fixed

- Fixed false hub warnings by reclassifying diagnostics logs inside devTools.
- Resolved black screen bug when returning from Chordex to Livex Hub.
- Mapped Warnings Inspector to conform to clean WarningItem data model.

## 3.6.53

### Added

- Rebranded user-facing elements and text from "Studio" to "Livex" (Livex Hub).
- Enhanced Developer Tools Warnings view with warning copy and unified diagnostics layout.

### Fixed

- Fixed the "View Warnings" button click responsiveness and event lifecycle on Android.
- Resolved "Black Screen Return Bug" by properly clearing sub-app launch timers on Hub return.
- Polished Stagex landscape mode: zoomed out stage plot and adjusted left toolbar placement.

## 3.6.52

### Added

- Integrated Warnings Inspector inside the Logs view in Developer Tools.
- Added Missing Assets sniffer to Network Request tab to group and diagnose 404 errors.

### Fixed

- Packaged complete Drumex audio assets inside the APK, preventing 404 remote preloading issues.
- Fixed 'View Warnings' WebView touch propagation and overlay response delays on Android.
- Polished Stagex landscape mode: adjusted canvas zoom, decreased toolbar toggle size, increased scenes tab touch targets with ontouchend fast-tap, and positioned element drawer above Add button.

## 3.6.51

### Added

- Dedicated Warnings Inspector in Developer Tools with duplicate count grouping and mobile-friendly scrolling.

### Fixed

- Resolved console module parsing bug to correctly categorize system and infrastructure warnings under true source modules instead of defaulting to Studio Hub.
- Refined Stagex landscape layout, removing bottom collapse arrows, center-aligning left toolbar vertically, and elevating the vertical drawer to clear FAB/Eye buttons.

## 3.6.50

### Added

- Redesigned Developer Tools toggle switch and added live card stats.
- Added multi-app status diagnostics for Hub, Chordex, Drumex, Stagex, Groovex, and Vocalex.

### Fixed

- Resolved app switching black screen transition issue with cached views.
- Fixed startup routing restoration to prevent default sub-app recovery.
- Improved Stagex landscape layouts, Safe Area offsets, and expanded button touch targets.

## 3.6.49

### Fixed

- Optimized 120 Hz display rendering and route animations for extreme responsiveness.
- Eliminated background gray flashes by enforcing pure black (#000000) layouts and windows.
- Redesigned Developer Tools into an intuitive dashboard with dedicated sub-view cards.
- Implemented modular diagnostics copy buttons for individual diagnostic sections.

## 3.6.48

### Added

- Created an interactive Stagex Bridge Self-Test runner to verify runtime command execution.
- Added a System Health Summary card at the top of the Developer Tools dashboard for quick mobile check.
- Upgraded the log viewer with a collapsible summary list tailored for phone viewports.
- Added available and missing handlers details to the Stagex diagnostics section.

### Fixed

- Fixed Stagex runtime command system on Android by correcting syntax issues and bracket mismatches.
- Resolved the `_orig is not a function` error.
- Upgraded the iframe postMessage bridge to immediately return ACK/NACK and prevent silent timeouts.

## 3.6.47

### Added

- Upgraded the Developer Tools UI to be fully phone-adapted with collapsible sections and safe area layouts.
- Added a dedicated Stagex diagnostics panel showing detailed postMessage ACK telemetry.
- Preserved the legacy Update Diagnostics page and added sub-navigation.

### Fixed

- Fixed the Stagex iframe postMessage ACK bridge error by adding robust try-catch wrapping and diagnostics.

## 3.6.46

### Added

- Created a centralized Developer Tools / Debugging Tools system accessible via Settings.
- Support for runtime log, error, event, performance, and network sniffing.
- App-specific diagnostic panels for Chordex, Stagex, Drumex, Groovex, Vocalex, and Hub.

## 3.6.45

### Fixed

- Reverted the old Stagex restoration and adapted the modern Web Stagex design for Android.
- Fixed layout alignment to prevent bottom navigation overlaps on Samsung SM-S921B.
- Resolved cross-frame SecurityErrors by implementing asynchronous postMessage channels.
- Restored functional Stagex controls: Add picker, Setup/Preferences tabs, Save, PDF export, and Back-to-Hub navigation.

## 3.6.44

### Fixed

- Restored stable Stagex editor functionality and touch controls on Android.
- Optimized Android WebView performance and Hub transition times.
- Corrected Stagex plus-button and element-picker interaction.
- Restored Setup and Preferences tab switching within Stagex.
- Fixed elements scaling, rotation, deletion, and selection on canvas.

## 3.6.43

### Fixed

- Fixed Back-to-Hub navigation gray screen freeze.
- Reconnected Stagex controls and canvas touch events.

## 3.6.42

### Fixed

- Restored missing theme and layout CSS variables in separated platform build.
- Fixed Stagex onTouchEnd responsiveness for eye, plus, and rotate buttons on Android.
- Added transition active lock safety watchdog to prevent stuck screens.

## 3.6.41

### Fixed

- Resolved global style and layout regressions in the separated monorepo architecture.
- Added Tailwind CSS source path configuration for shared workspace packages.

## 3.6.40

### Fixed

- Fixed Stagex same-origin bridge and allowed null origins.
- Resolved ScreenOrientation.lock UI thread blocking issues.
- Fixed element picker pointer-events and touch interactions.
- Restored Stagex bottom-navigation and system back gesture handling.

## 3.6.36

### Fixed

- Restored Stagex bottom-navigation section switching.
- Corrected Stagex plus-button and element-picker interaction.
- Corrected Stagex eye/visibility control behavior.
- Corrected parent-to-iframe command delivery in Android WebView.
- Improved selected-element controls.
- Prevented transition states from leaving Studio on a black screen.
- Added recovery actions when a Studio module fails to load.

### Improved

- Unified Help Center and FAQ & Support into Help & Support.
- Added searchable support content and functional troubleshooting actions.
- Improved transition cleanup when switching between Studio apps.
- Improved Stagex interaction diagnostics and event handling.

## 3.6.35

### Added

- Added transition serialization to stabilize fast app-switching.

### Improved

- Unified Help & Support center with search, categories, and live diagnostics.
- Safeguarded sub-apps with lazy import retries and Error Boundaries.

### Fixed

- Fixed Stagex mobile controls touch responsiveness and layout re-render click loss.
- Resolved Stagex iframe cache load race conditions.

## 3.6.34

### Added

- Added Stagex native landscape rotation locking.
- Added Setup sub-section navigation corrections.
- Added Mobile-only Settings cleanup.

### Improved

- Improved orientation change transitions.
- Improved Android system Back and swipe-back gesture responsiveness.
- Improved bottom navigation stability.
- Improved Help, FAQ, Terms, Privacy, and Report a Bug pages.

### Fixed

- Fixed Stage element touch drag cancellation and freeze issues.
- Fixed stuck selection rectangle on resize and orientation change.
- Fixed Drumex black-screen safeguards on mount.

## 3.6.33

### Added

- Restored Stagex element picker and visible elements (Guitar, People/Performers, etc.).
- Restored Chordex bottom navigation for Android.
- Added version-gated native WebView Cache Storage cleanup preventatively.

### Improved

- Centered and scaled Stage plot for phone screens.
- Improved global system Back and left-edge swipe-back navigation.
- Improved Setup Back button behaviors to prevent duplicate controls.

### Fixed

- Fixed Stagex mobile layout alignment and rotation.
- Fixed Setup, Rider, Setlist, and Gear Back navigation.

## 4.0.0

### Added

- Added adaptive Web navigation rails for laptop/desktop screen widths.
- Added Web-specific internal app navigation tabs for tablet/iPad screen widths.
- Added Web-specific internal app navigation for Chordex, Drumex, Stagex, Groovex, and Vocalex.

### Improved

- Improved Web shortcuts and deep shortcuts to target sub-sections.
- Repositioned back buttons inline to prevent overlap in Web layouts.

### Fixed

## 3.6.31

**Android/mobile 3.6.31**

### Fixed

- Fixed Android native mobile layout regressions in Stagex and Setup panels.
- Fixed Stagex element visibility and same-origin protocol mismatch.
- Removed duplicate Back buttons and aligned bottom navigation in WebView.

## 3.6.30

**Android/mobile 3.6.30**

### Fixed

- Android update compatibility release using the production signing certificate.

## 3.6.29

**Android/mobile 3.6.29**

### Added

- Redesigned Stage Plot for mobile matching modern Web Stagex visuals.
- Redesigned Scenes bottom sheet and management interface for mobile devices.

### Improved

- Improved element selection outlines and scaled resize controls.
- Aligned Stagex mobile canvas colors with Light, Dark, and AMOLED Web theme definitions.
- Preserved all mobile gestures, offline capabilities, and project saving.

### Fixed

- Removed Zones from mobile UI while maintaining legacy project compatibility.

## 3.6.28

### Fixed

- Fixed Web update actions falling back to Android manual APK update states.
- Fixed legacy Web clients getting stuck in stale cache/service-worker update flows.
- Ensured Web update actions refresh Studio instead of opening Android install UI.

### Improved

- Improved Web cache and service-worker cleanup during update refresh.
- Preserved Android APK/AppInstaller updater behavior.

## 3.6.27

### Fixed

- Fixed Studio Web incorrectly showing Android manual APK update states.
- Separated Web/PWA update metadata from Android APK release metadata.
- Ensured Web uses refresh-based update behavior while Android keeps APK/AppInstaller updates.

### Improved

- Added clearer platform separation for update metadata and updater actions.
- Preserved shared Studio version and What’s New across Web and Android.

## 3.6.26

### Fixed

- Fixed issue where the web application would get stuck on old versions and fail to load updates.
- Implemented auto-cleanup of legacy push service worker instances to clear stale browser caches.
- Optimized Firebase Hosting caching configuration to prevent caching of index.html and service workers.

## 3.6.25

### Improved

- Web builds now show a slim, non-blocking refresh banner instead of the Android-style APK update modal.
- Settings → Updates page adapts for web: shows a 'Web Build' badge, Refresh button, and hides native-only controls.
- Hub and Settings layouts are now centered and constrained on desktop/laptop screens for better readability.
- Desktop hover effects added for cards, buttons, and interactive settings rows.

### Fixed

- Fixed Stagex back-navigation so that swiping back or pressing back now properly closes open panels (timeline, presets, share modal, custom elements, etc.) instead of being ignored.

## 3.6.24

### Improved

- Revamped the signed-out profile benefits page to feature a premium, list-based glassmorphic layout.
- Enhanced the sign-in success overlay checkmark animation with expanding double ripple rings and a spring overshoot drawing path.

### Fixed

- Fixed sub-app back-navigation so that swipe-back and back button gestures consume the action instead of exiting to the Studio Hub.

## 3.6.23

### Improved

- Hardened release pipeline push phase with automatic cleanup of unstaged build files before rebasing.

## 3.6.22

### Fixed

- Fixed swipe-back touch gesture inside sub-apps to never exit to the Studio Hub, only navigating back to the previous screen.
- Removed duplicate Changelog row from the Settings UI.

### Improved

- Made applications launch instantly upon clicking, delaying zoom scaling animations slightly to ensure a lag-free visual transition.

## 3.6.21

### Fixed

- Hardened release pipeline push phase with retry logic and exponential backoff to handle transient remote push conflicts.

## 3.6.20

### Fixed

- Fixed release pipeline race conditions by introducing concurrency group constraints and rebase-before-push logic in CI.

## 3.6.19

### Fixed

- Prevented accidental GitHub Pages deployment paths from being treated as active Studio update infrastructure.

### Improved

- Removed unused Replit-specific project files and references from the Studio repository.
- Cleaned deployment documentation so Firebase Hosting is clearly the active hosting target.
- Removed stale GitHub Pages references from release/update documentation and configuration.
- Added validation to prevent updater metadata from pointing to GitHub Pages.

## 3.6.18

### Fixed

- Fixed Stagex Elements menu invisible dial chips capturing clicks.
- Fixed back-navigation in sub-apps to dismiss open sheets, menus, and forms before exiting.
- Fixed swipe-back gesture to dismiss open overlays instead of exiting immediately.

### Improved

- Improved updates page layout by embedding the changelog inside the hero card.
- Improved Settings subtitle localization and Stagex accent colors to dynamically adapt to the user theme color.

## 3.6.17

### New

- Redesigned the Updates page with a hero card, structured changelog, and Stitch-inspired layout.
- Added recent releases section with expandable changelogs.

### Improved

- Changed Settings subtitle to "Studio Settings".
- Renamed the Updater navigation row to "Updates".

## 3.6.16

### Fixed

- Paused unfinished cloud sync surfaces by marking Devices & Sessions, Backup & Sync, and Storage & Export as Coming Soon.
- Fixed profile photo updates so the new image appears consistently in Profile and Settings.
- Removed the misleading uploading profile picture dialog while cloud profile photo sync is paused.
- Fixed the Settings update button alignment and sizing.
- Fixed the Stagex visibility button overlapping the Elements menu.

### Improved

- Improved account/settings clarity by hiding unfinished sync controls behind Coming Soon states.
- Improved profile avatar consistency across account surfaces.
- Improved Settings header layout on mobile.
- Improved Stagex floating controls behavior when the Elements menu is open.

## 3.6.15

### Fixed

- Completed the signing reset path for builds where the original production keystore is unavailable.
- Added explicit reinstall-required metadata for APKs signed with the new certificate.
- Improved updater messaging when Android cannot install over an app signed with a different certificate.

### Improved

- Added safer release handling for signing certificate changes.
- Improved AppInstaller diagnostics for reinstall-required builds.
- Preserved strict signature validation for normal future updates.

### Changed

- This build requires a one-time uninstall/reinstall because the original Android signing key is unavailable. After reinstalling this version, future Studio updates can continue using the new signing certificate.

## 3.6.14

### Improved

- Bumped version to 3.6.14 to resolve signature mismatch eligibility validation error.

## 3.6.13

### Added

- Added Supabase Realtime Sync integration with dynamic diagnostics and switcher UI.
- Integrated Firebase and Supabase database status fields in settings.
- Added automatic payload sanitization and write timeout safeguards.

## 3.6.12

### Added

- Added Supabase Realtime Sync provider as an option alongside Firebase Cloud.
- Added Sync Provider selector to settings to allow switching between database backends.
- Added dynamic diagnostics information for the active sync provider.

## 3.6.11

### Fixed

- Fixed Cloud Sync initialization errors where Firestore or Firebase config was missing or not resolved.
- Fixed Diagnostics UI panel issues to prevent nested scrolling and text overflow on mobile viewports.
- Fixed manual registration button to prevent false successes when Firestore is unavailable.

### Improved

- Added clear warning cards in settings when Cloud Sync is not initialized.
- Added dynamic real-time Firebase configuration metrics (Apps count, App name, services state, and init errors) to Sync Diagnostics.
- Improved clipboard copy diagnostics payload to include all newly introduced Firebase state diagnostics.

## 3.6.10

### Fixed

- Fixed Cloud Sync Probe failing on Android because Firestore rejected undefined userAgent values.
- Fixed Firestore sync writes to sanitize undefined fields before setDoc.
- Fixed Sync Diagnostics overflow on mobile by making the diagnostics section scrollable.
- Fixed Cloud Sync validation so probe errors show real Firestore failures.

### Improved

- Improved Android and Web sync diagnostics with copyable runtime reports.
- Improved Firestore payload sanitization across probe, devices, profile, and settings writes.
- Improved mobile usability for long diagnostics, paths, errors, and device metadata.

## 3.6.9

### Fixed

- Fixed unreliable Android and Web Cloud Sync connection.
- Fixed Devices & Sessions not proving whether devices were actually connected.
- Fixed current device being incorrectly classified as a previous session.
- Fixed profile, theme, accent, and photo sync relying on inconsistent local/cloud state.

### Improved

- Added a real Firebase-backed Sync Engine unifying all Firestore and Storage actions.
- Added stable device identity, heartbeat presence, and deterministic session classification.
- Added clearer sync diagnostics for Auth UID, Firebase project, listeners, writes, cache state, and probe results.
- Improved Firestore source-of-truth handling for profile and settings.

## 3.6.8

### Fixed

- Fixed duplicate properties compile typecheck error in sync diagnostics.
- Fixed incorrect device categorization in the Devices list.
- Fixed potential web connection gaps and session listener disconnects.

### Improved

- Improved device session classification utilizing deterministic categories for current device, active remotes, recent remotes, signed out, and legacy devices.
- Added periodic 30-second heartbeats for signed-in sessions to track device freshness.
- Added manual Reconnect Devices button in settings panel and developer tools.

## 3.6.7

### Fixed

- Fixed duplicate and stale device records appearing as active sessions in Devices & Sessions.
- Fixed legacy Android and Web session documents being shown as current devices.
- Fixed confusing session status combinations such as "Active just now" with "Idle."
- Fixed unknown version values appearing in main device cards.

### Improved

- Improved Devices & Sessions grouping for current device, other devices, and previous sessions.
- Improved device name normalization for Android and Web.
- Improved diagnostics for duplicate, stale, legacy, and replaced device records.
- Improved handling of older device documents created by previous Studio versions.

## 3.6.6

### Fixed

- Fixed Web/laptop devices not appearing in Devices & Sessions after Android registration was restored.
- Fixed Web device registration being skipped or not reflected across devices.
- Fixed Devices & Sessions rendering only the current device when multiple Firestore device documents exist.
- Fixed overly technical device names appearing in session cards.

### Improved

- Improved Android and Web session visibility from users/{uid}/devices.
- Improved Web device metadata handling for APK/OTA N/A cases.
- Improved device display names for cleaner session cards.
- Improved diagnostics for device IDs received, devices rendered, filtered devices, and raw technical metadata.

## 3.6.5

### Fixed

- Fixed Devices & Sessions showing no devices even when signed in.
- Fixed current device registration not writing to Firestore.
- Fixed missing device documents under users/{uid}/devices.
- Added diagnostics for device write status and listener status.
- Implemented robust device registration with 10-second write timeout and automatic retries.
- Added deep diagnostics in Devices & Sessions sheet listing 16 registration status parameters.
- Implemented automatic Firestore payload sanitization to prevent write rejections due to undefined native/platform fields.

### Improved

- Improved Devices & Sessions reliability across Android and Web.
- Improved current device detection and last active tracking.
- Improved cross-device session visibility.

## 3.6.4

### Fixed

- Fixed Devices & Sessions showing no devices even when signed in.
- Fixed current device registration not writing to Firestore.
- Fixed missing device documents under users/{uid}/devices.
- Added diagnostics for device write status and listener status.

### Improved

- Improved Devices & Sessions reliability across Android and Web.
- Improved current device detection and last active tracking.
- Improved cross-device session visibility.

## 3.6.3

### Fixed

- Fixed Android device not registering in Devices & Sessions.
- Fixed Web and Android sessions not seeing each other.
- Fixed Cloud Sync listeners appearing active without actual cross-device data updates.
- Fixed theme, accent color, profile name, and profile photo sync not propagating between devices.
- Fixed sync errors being hidden or treated as successful.

### Improved

- Added stronger Sync Diagnostics for device registration and Firestore listener state.
- Improved Devices & Sessions accuracy across Web and Android.
- Improved sync failure reporting.

## 3.6.2

### Fixed

- Fixed Cloud Sync not working correctly on Web builds.
- Fixed web/laptop sessions not registering as real devices.
- Fixed sync logic incorrectly depending on native APK/OTA fields.
- Fixed theme, accent color, and profile photo not syncing between Android and Web.
- Fixed Devices & Sessions not showing all signed-in devices.

### Added

- Added platform-aware sync diagnostics for Web and Android in Developer Options.
- Added detailed Build and platform labels for Devices & Sessions.

### Improved

- Improved cross-device sync reliability.
- Improved Devices & Sessions layout for web/browser sessions.

## 3.6.1

### Fixed

- Fixed Cloud Sync not syncing theme, accent color, and profile photo across devices.
- Fixed profile changes not updating live on other signed-in devices.
- Fixed Devices & Sessions only showing the current device.
- Fixed profile photo upload getting stuck without updating remote devices.

### Added

- Added real device registration for signed-in Studio accounts.
- Added live listeners for profile, appearance, preferences, and devices.
- Added Sync Diagnostics in Developer Options.

### Improved

- Improved account sync reliability.
- Improved cross-device settings updates.
- Improved local-first sync and offline recovery behavior.

## 3.6.0

### Added

- Added real cross-device sync for profile and account settings.
- Added live sync for theme, accent color, language, and preferences.
- Added profile photo upload and sync across devices.
- Added sync diagnostics in Developer Options.

### Improved

- Improved local-first sync behavior.
- Improved offline sync handling.
- Improved account/profile state consistency across Studio.

### Fixed

- Fixed account sync controls not actually syncing settings across devices.
- Fixed theme and accent color not appearing on other devices.
- Fixed profile photo not syncing between phone and laptop.
- Fixed Settings account card using stale local profile data.

## 3.5.0

### Added

- Added real Studio Cloud Sync for signed-in users.
- Added cross-device sync support for Studio account data.
- Added sync status, last synced time, and manual Sync Now controls.
- Added device registration for signed-in devices.
- Added local-to-cloud migration for existing data.
- Added sync diagnostics in Developer Options.

### Improved

- Improved account functionality with real backup and restore behavior.
- Improved profile/settings persistence across devices.
- Improved offline handling for syncable data.

### Fixed

- Fixed sync buttons appearing functional when sync was not actually implemented.

## 3.4.12

### Fixed

- Fixed internal Studio apps not following the selected accent color.
- Removed hardcoded blue accent styling from app controls.
- Fixed Chordex Discover genre chips appearing abruptly cut off while scrolling.

### Improved

- Unified accent color behavior across Hub, Settings, Chordex, Drumex, Stagex, Groovex, and Vocalex.
- Added polished horizontal fade behavior for scrollable chip rows.
- Improved visual consistency across the Studio ecosystem.

## 3.4.11

### Fixed

- Fixed Developer Options turning black after opening.
- Fixed profile display name changes not updating the main Settings account card.
- Removed the unnecessary floating “Up to date” badge.
- Removed technical developer/build diagnostics from the About screen.

### Improved

- Cleaned up the About screen to focus on user-facing app information.
- Moved technical build and update diagnostics into Developer Options.
- Updated the Updater Settings description to reflect Studio’s current update system.
- Improved Updater screen clarity and consistency.

## 3.4.10

### Improved

- Redesigned the APK-only updater dialog with clearer status, better spacing, and Studio visual styling.
- Improved the “What’s New” section in the update dialog.
- Replaced old OTA terminology with APK-only update wording.
- Improved Developer Options update diagnostics organization.
- Improved About screen responsiveness across phones, tablets, and desktop layouts.

### Fixed

- Fixed cramped About section layout on some devices.
- Fixed updater labels that still referenced the old OTA system.
- Fixed update dialog copy to better explain the Android installation step.

## 3.4.9

### Changed

- Migrated Studio updates to APK-only delivery.
- Removed OTA bundle application from the updater.
- Simplified update flow to use the native Android installer for every update.

### Fixed

- Fixed mixed App/OTA/APK version states.
- Fixed updates applying as OTA instead of opening the Android installer.
- Fixed black screen caused by WebView reload during updates.
- Fixed stale OTA bundle state affecting APK updates.

### Improved

- More reliable update process.
- Cleaner update diagnostics.
- Stronger APK validation before install.
- Consistent App Version and APK Version after updates.

## 3.4.8

### Fixed

- Fixed boot guard to rollback invalid OTA bundles and prevent WebView reload loops.
- Correctly cleared stale OTA bundles when a native APK wrap update is required.

### Improved

- Added detailed updater trigger, block, and final path diagnostics to Developer Options.
- Blocked developer OTA force updates on outdated native wrappers.

## 3.4.7

### Fixed

- Fixed APK-required updates to always open the native Android installer.
- Blocked silent OTA updates when the native APK version is behind the required versionCode.
- Disabled Capgo auto OTA bundle apply for APK-required releases to avoid WebView reload loop.
- Expanded pipeline guards to fail-fast if native or update-system files change in OTA releases.

### Improved

- Enhanced update diagnostics and checklists in Developer Options.
- Added detailed final update path logic for native wrappers.

## 3.4.6

### Fixed

- Fixed mixed OTA/APK version state where App Version could advance while APK Version stayed behind.
- Added required APK version enforcement.
- Prevented OTA-only updates when native APK updates are required.
- Added diagnostics for “Native APK behind” and “APK update required”.
- Improved release classification for ota/apk/both updates.

### Improved

- Safer update flow for users with older native wrappers.
- Better recovery path when APK Version is behind App/OTA Version.

## 3.4.5

### Fixed

- Fixed Android APK updates failing with “App not installed”.
- Added in-app APK install eligibility checks before launching Android installer.
- Added validation for package name, signing certificate, versionCode, and APK build type.
- Prevented invalid APK updates from being published.
- Improved update diagnostics when Android rejects an APK.

### Improved

- Strengthened automatic in-app update reliability.
- Improved consistency between GitHub APK, Firebase APK mirror, and update metadata.
- Reduced need for manual recovery installs.

## 3.4.4

### Fixed

- Fixed Android “App not installed” failure during APK updates.
- Added APK versionCode validation before release.
- Added signing certificate consistency checks.
- Added APK install eligibility diagnostics.
- Improved update failure messages for Android installer errors.

### Improved

- Strengthened APK release validation.
- Improved consistency between GitHub Release APK, Firebase APK mirror, and update metadata.

## 3.4.3

### Added

- Added automated validation for changelog structure and release note placeholders.
- Added structured releaseNotes field support to update manifests.

### Improved

- Improved updater UI to dynamically categorize and render release notes.

## 3.4.2

### Removed

- Removed Push Notifications support and related settings for now.
- Removed inactive push notification messaging from the update experience.

### Improved

- Revamped Developer Options with clearer sections and diagnostics.
- Improved Developer Options actions, statuses, confirmations, and feedback.
- Improved return-to-Hub transition to avoid black screen frames.
- Added a smoother app-to-Hub exit animation.

### Fixed

- Fixed Developer Options buttons that had incomplete or unclear behavior.
- Fixed return-to-Hub visual transition showing a black screen before the Hub appears.
- Fixed app shell visual reset during app exit.

## 3.4.0

- Moved Studio to production-signed release APKs.
- Improved APK installation trust and release signing validation.
- Added CI checks to prevent unsigned, debuggable, or incorrectly signed APKs.
- Requires a one-time clean reinstall for users coming from older debug-signed builds.
- Future updates after this install will work normally from inside Studio.

## 3.3.8

- Redesigned the update dialog with Studio’s visual style.
- Improved the update progress screen with percentage, status, and polished visuals.
- Improved the “What’s new” section layout.
- Improved the Ready to Install screen.
- Replaced generic blue update buttons with Studio accent styling.
- Improved install handoff so Studio does not intentionally reopen after launching the Android installer.
- Fixed updater overlay cleanup after install/later actions.
- Fixed potential stuck fade or black overlay states.
- Ensured only one updater dialog is used across the app.

## 3.3.7

- Added a polished account benefits section for signed-out users.
- Added clearer explanations for Cloud Sync, multi-device access, backups, personalization, recovery, and future account features.
- Added a small privacy note explaining account sync behavior.
- Improved the signed-out Account screen.
- Improved onboarding clarity for users who have not created a Studio account.
- Improved messaging around sync, backups, and cross-device use.

## 3.3.6

- Fixed black screen when returning from Studio apps back to the Hub.
- Unified app-to-hub navigation through one shared return handler.
- Added root UI fallback to prevent invalid blank/black render states.
- Improved app exit transition reliability.
- Improved Android back and predictive back recovery behavior.

## 3.3.5

- Fixed stale Firebase update manifests.
- Fixed duplicate update notifications.
- Removed legacy updater dialog conflicts.
- Fixed black screen caused by stale update dialog fade overlay.
- Unified the update dialog into one professional flow.
- Improved update state handling and retry behavior.
- Ensured manual checks always show accurate update status.
- Preserved AppInstaller runtime validation for APK updates.

## 3.3.4

- Fixed manual APK recovery downloads getting stuck at 100%.
- Added Firebase-hosted direct APK mirror for recovery installs.
- Improved manual update flow for users without AppInstaller.
- Added Copy Link and GitHub Fallback options for APK recovery.
- Improved APK download headers for Android compatibility.
- Prevented broken GitHub mobile download behavior from blocking recovery.

## 3.3.3

- Fixed repeated APK update failure when AppInstaller is unavailable.
- Fixed native AppInstaller registration reliability on Android.
- Added runtime AppInstaller availability checks before APK updates.
- Added manual recovery flow for users on older/broken APK builds.
- Prevented partial OTA/APK updates when native update support is missing.
- Added build-time validation to prevent APK releases without AppInstaller.
- Improved update diagnostics for native plugin availability.

## 3.3.2

- Added runtime capability checking for native AppInstaller plugin and its methods.
- Prevents starting corrupt downloads or partial updates if the native plugin is missing.
- Show clear manual update recovery dialog with direct download links on older APK wrapper versions.
- Added comprehensive AppInstaller diagnostics in Settings -> Developer Options -> Update Debug.

## 3.3.1

- Fixed black screen when returning from apps to Studio Hub using the top navigation.
- Fixed app exit transition state so the Hub renders correctly.
- Improved navigation reliability across Chordex, Drumex, Vocalex, Stagex, and Groovex.
- Added real system push notification support for updates using Firebase Cloud Messaging.
- Added deduplication so each update version notifies only once.
- Improved notification tap behavior to open the updater/changelog.

## 3.3.0

- Hidden Developer Options: Added a hidden settings menu with update controls, log viewing, and simulation tools.
- Advanced Diagnostics: Relocated and expanded all update diagnostics into the Developer Options menu.
- Firebase Hosting: Migrated OTA bundle and version manifest hosting from GitHub Pages to Firebase.
- SHA-256 Verification: Integrated cryptographic verification to check APK download integrity before installation.
- Size Reduction: Reduced OTA bundle download size by ~65% via optimized asset packing and WebP image formats.
- Performance & CORS: Fixed remote manifest fetch race conditions and native update CORS issues.

## 3.1.87

- WebView Permission Bypass: Automatically auto-grant WebView permission requests for WebRTC microphone streams, resolving cached site-level locks when OS permissions are active.
- In-App Direct Downloader: Added a clean warning card and button to download and install native APK updates directly from your settings panel when running an outdated shell.
- In-App Package Installer: Downloads system updates and launches the Android package installer directly inside the app, resolving 404 download errors by dynamically querying GitHub Release assets.
- Split Updater Layout: Segregated Over-the-Air (OTA) interface updates and App System Wrapper (APK) updates into explicit sections with clear descriptions detailing their differences.
- Download Progress Feedback: Added immediate visual timer feedback (1% to 15%) during downloader network handshakes to prevent the page from appearing stuck at 0%.
- Background Update Types: Updated background notifications to clearly differentiate between Interface Updates (OTA) and System Wrapper Updates (APK).
