# Version 4.5.94

Release Date: 2026-09-12

### Added

- Fluid Chordex Song Action Morphs: Transformed song creation and song import flows into fluid spatial morphs using the canonical `MorphingActionSurface` system. Tapping the mobile primary FAB, secondary FAB, empty state action buttons, or desktop setlist buttons morphs directly from the button's synchronous DOM coordinates into the contextual foreground panel.
- Modular Action Surface Content: Extracted `PresetFormContent` and `ImportSongContent`, enabling full JSON song importing, chord resolution, conflict management, and song creation inside spatial surfaces with smooth reverse collapse.

### Fixed

- Normalized Navigation Selected Highlight Geometry: Standardized the selected tab indicator bounding box and centering geometry across the shared bottom bar, eliminating horizontal jitter and label overlap across Hub, Chordex, Drumex, Stagex, Groovex, and Vocalex.
- Refined Chord Finder and Chord Detail Morph Transitions: Enhanced chord detail foreground popup transitions with tactile press feedback and stable coordinate tracking.

### Removed

- Generator Subsystem Pruning: Permanently pruned obsolete chord progression generator interfaces and components, removing dormant code paths.
