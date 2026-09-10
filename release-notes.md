# Version 4.5.85

Release Date: 2026-09-10

### Added

- Launcher Icon Freshness Manifest Architecture: Introduced `launcher-icons-manifest.json` tracking SHA-256 hashes of master assets and 20 generated target mipmaps/icons to ensure deterministic asset freshness across builds.
- Automated Device Runtime Verification Tooling: Added `scripts/verify-device-runtime-icon.mjs` (`pnpm verify:device`) for comprehensive live ADB and static 15-point verification across all 6 OS and framework layers.
- Automated Launcher Icon Regression Suite: Added `launcher-icons.test.mjs` (`pnpm test:icons`) asserting master source existence, adaptive icon XML validity, and zero legacy waveform presence.

### Fixed

- Release Pipeline CI Hardening: Embedded launcher icon integrity checks into `pnpm check:versions` (Preflight Job 1), fixed recursive subdirectory scanning in `generate-release-verification-report.mjs`, and enforced triple cross-artifact SHA-256 equality before atomic publication.
- Deterministic Cross-Platform Icon Generation: Replaced Windows GDI+ generation with Node.js `sharp` (v0.35.4) using Lanczos3 resampling and strict 108dp canvas / 66dp safe-zone compliance.
- Removed Flawed Runtime Component Mutation: Removed redundant `refreshLauncherIconCacheIfNeeded` call from `MainActivity.kt` to preserve native component immutability.
