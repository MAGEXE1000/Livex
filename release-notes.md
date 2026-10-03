# Version 4.6.90

Release Date: 2026-10-03

### Added
- Live Mode Pre-Roll Countdown & Precision Metronome: Introduced configurable count-in lead-in (`[Off] [1 Bar] [2 Bars] [3s] [5s]`) in Song Live Settings with animated visual pulse badge, paired with a synchronized Web Audio API lookahead clock scheduler for drift-free metronome clicks and accented downbeats.
- Drumex-Style Live Tempo Morph Pop-Up: Implemented an interactive frosted-glass BPM/tempo adjustment modal in Live mode with tap-tempo interval averaging, incremental steppers, and smooth tempo slider.
- Native Android Intent Filters for Direct File Ingestion: Registered `VIEW` and `SEND` intent filters in `AndroidManifest.xml` with deep-link resolution in `MainActivity.kt` and `SharedAppShell.tsx`, allowing users to open and import `.livex` files directly from WhatsApp, file managers, and cloud drives.

### Fixed
- Export MIME Type Normalization & .bin Attachment Corruption: Overhauled `.livex` bundle sharing via custom native `LivexFileProvider` mapping `.livex` directly to `application/json`, eliminating Android `application/octet-stream` fallbacks that caused WhatsApp and file managers to rename shared setlists to `DOC-xxxx.bin`.
- Resilient & Tolerant Bundle Import Pipeline: Expanded file input criteria and implemented schema-tolerant parser in `livexBundleService` supporting `.livex`, `.json`, `.bin`, and legacy raw arrays with 1-tap instant validation preview and clear error reporting.
