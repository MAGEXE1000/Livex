# Version 4.5.86

Release Date: 2026-09-10

### Added

- Native Dedicated Light-Mode Intro Assets: Added pre-rendered subpixel antialiased light-mode intro emblem partitions (`livex-form1-light.png`, `livex-form2-light.png`, `livex-symbol-light.png`) for razor-sharp visual fidelity on high-DPI displays.

### Fixed

- Intro Animation Light Mode Quality: Eliminated raster diffuse shadow halos and destructive CSS `brightness(0)` filter flattening in light mode, preventing fuzzy gray borders around the emblem.
- Repository Migration Alignment: Systematically updated all release orchestration scripts, Firebase download redirects, verification checkers, and in-app links to `MAGEXE1000/Livex`.
- Cross-Platform APK Extraction in CI: Supported AAPT2 flattened release icons and hardened APK asset extraction across Linux and Windows environments in `generate-release-verification-report.mjs`.
