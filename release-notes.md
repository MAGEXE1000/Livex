# Version 4.6.14

Release Date: 2026-09-15

### Fixed
- Immediate Floating Header Elimination: Transformed page headers to render State A (transparent, unformed glass, centered page title resting directly on background) at scroll position 0, eliminating premature floating capsule appearance.
- Chromatic Aberration Artifact Removal: Removed hardcoded cyan/rose-red chromatic fringe overlays in favor of pure SVG turbulence glass refraction (`dpawlikowski/liquid-glass`).
- Subtitle Clutter Cleanup: Removed all secondary descriptive text beneath page titles across all screens.

### Improved
- Cross-App Canonical Header Unification: Fully standardized centered-title and scroll-formed Liquid Glass top bar across Chordex (Library, Songs, Saxophone Practice, Preferences), Drumex (Beats, Patterns, Preferences), Stagex (Setup Hub, Preferences), Groovex, and Vocalex (Takes, Preferences).
- Dead-Center Title Invariant: Relocated contextual quick-actions (Finder/Tuner in Chordex Library, Metronome/Drum Tuner in Drumex Patterns) to dedicated body rows, guaranteeing 100% mathematical dead-centering of titles with zero collision or lateral offset.
- Navigation Dispatcher Safety: Standardized on `NavigationDispatcher.canGoBack()` before popping history across all subviews.
