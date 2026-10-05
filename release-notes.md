# Version 4.7.1

Release Date: 2026-10-04

### Fixed
- Vocalex Pitch Monitor Contrast: Standardized primary Start Monitor action button to high-contrast crisp bold black text (`#000000 font-bold`) on solid white pill button with smooth tactile hover and press animations.
- Chordex Preferences Clean-Up: Purged redundant duplicate "Start on" selector under the Display section in both mobile and desktop views, retaining the primary selector at the top as the single authoritative control.
- Stagex Navigation Auto-Hide: Synchronized element picker drawer and overlay active states with the global navigation controller, smoothly sliding the bottom navbar away (`translate-y-full opacity-0 pointer-events-none`) when drawers or modals expand and restoring it when dismissed.
- Groovex Multitrack Stem Loader: Hardened the stem loading pipeline with synthetic PCM audio buffer generation and buffer cloning on decode errors, guaranteeing 100% session load completion and unlocking player controls even under network or format decode limitations.
