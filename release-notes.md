# Version 4.5.96

Release Date: 2026-09-13

### Added

- Canonical Plus &rarr; Menu Morph Primitive (`MorphMenu` / `PlusMenu`): Introduced in-place spatial container morph transitioning from a 40px circle trigger to an expanded contextual menu card with asymmetric cubic-bezier curves, coordinated plus rotation/exit, content entrance, and full Android `BackDispatcher` and `activeOverlaysRegistry` integration.
- Canonical Accordion Expand Primitive (`Accordion`): Introduced high-performance compound accordion using CSS Grid `0fr` &rarr; `1fr` row interpolation, zero JavaScript height measurement loops, hardware-accelerated chevron flipping, and complete ARIA linking.
- Professional Chromatic Guitar Tuner in Chordex: Integrated high-precision Web Audio engine using hybrid YIN / Autocorrelation pitch detection with cent-deviation needle damping, note recognition, and frequency analysis.
- Chordex Setlist Canonical Morph Adoption: Converted Setlist desktop header action controls to the canonical `PlusMenu` morphing trigger, streamlining song creation and JSON import flows.

### Fixed

- Restored Drumex Preferences Scrolling: Enforced explicit flex bounding and touch-scrolling constraints on `DrumPrefsPanel` mobile and desktop surfaces, ensuring bottom settings cards and controls are fully scrollable and clear of the bottom navigation dock.
- Drumex Navigation & Pin Stack Repair: Simplified Drumex navigation routing and repaired the pin back stack, eliminating dead-end navigation loops on Android.
- Hub FAQ Transition Polish: Migrated Hub FAQ items from abrupt React conditional mounting to the canonical `Accordion` system with smooth CSS Grid interpolation.
