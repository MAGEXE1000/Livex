# Version 4.5.93

Release Date: 2026-09-12

### Added

- Fluid Chord Detail Foreground Morphing Popup: Replaced full-page drilldown routing when tapping chord cards with an in-place fluid foreground morphing modal surface (`MorphingActionSurface`), physically expanding from the tapped chord card's real-time bounding box over the preserved underlying Chordex screen.
- Synchronous Geometry & Spatial Anchoring: Added dynamic `originRect` spatial geometry mapping with spring-driven expansion (`SPRING_PANEL`) and clean reverse collapse back to the originating chord card.

### Fixed

- Android Hardware Back Navigation Integration: Directly integrated the chord modal surface with `BackDispatcher('modal')`, ensuring tapping the native Android back button or gesture smoothly reverses the morph back into the chord grid with zero residual DOM overlays.
- Promotion and Progression Navigation Stability: Corrected sub-route panel resolution in `SharedAppShell` and restored the Progression Generator shortcut in `LibraryUI`.
