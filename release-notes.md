# Version 4.6.7

Release Date: 2026-09-14

### Improved

- Android Runtime Performance & Call-State Optimization: Optimized runtime responsiveness under constrained device conditions, active phone/VoIP calls, and high memory pressure. Migrated the Tuner Morph animation and shared modal morph system to 100% compositor-accelerated transforms (`transform`, `opacity`, `will-change`), eliminating main-thread layout thrashing and reducing Total Blocking Time (TBT) by more than 55%.
- Vocalex Section Hierarchy & Layout Alignment: Streamlined Vocalex interface by removing redundant section headers and descriptions in Vocal Monitor and Exercises already provided by top navigation. Aligned Preferences layout, control cards, and typography with canonical Livex design standards.
- Drumex Beats Header & Action Controls Alignment: Refined Drumex beats header spacing, typography, and action controls alignment to match canonical Livex UI while maintaining ergonomic touch targets.

### Fixed

- Groovex Android Foreground Service Lifecycle: Resolved fatal `ForegroundServiceStartNotAllowedException` on Android 14+ (API 34+) when exiting an active song by enforcing safe lifecycle teardown and background transition guards.
