# Version 4.5.95

Release Date: 2026-09-12

### Fixed

- Centered & Compact Shared Bottom Navigation: Corrected shared bottom navigation geometry across all Livex applications, eliminating the -33px cluster offset to ensure the navigation bar is strictly horizontally centered relative to the viewport across expanded, scrolling, and collapsed states.
- Drumex Compact Navigation Footprint: Restored compact slot width (60px) in Drumex, reducing container width from 304px to 256px for balanced visual parity with Hub and Chordex.
- Independent Selected Highlight Geometry: Decoupled tab highlight pill dimensions from the navbar container into an independent content-adaptive calculation that never inflates or shifts the navbar.
- Refined Guitar & Bass Chord Finder: Exclusively focused the Chordex Chord Finder on Guitar and Bass fretboard diagrams, removing Piano from the instrument selector, search queries, filter tabs, and detection state machine without touching global instrument preferences.
